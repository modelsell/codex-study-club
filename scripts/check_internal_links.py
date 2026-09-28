"""Check rendered page links against a local production server, without external requests."""
import argparse
from html.parser import HTMLParser
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urljoin, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, build_opener
import xml.etree.ElementTree as ET


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag in ("a", "area"):
            self.links.extend(value for key, value in attrs if key == "href" and value)


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def internal_target(href, page_url, origins):
    url = urlsplit(urljoin(page_url, href.strip()))
    if url.scheme not in ("http", "https") or url.netloc not in origins:
        return None
    return urlunsplit(("", "", quote(url.path or "/", safe="/%:@"), url.query, ""))


class LocalClient:
    def __init__(self, base_url):
        parsed = urlsplit(base_url)
        if (parsed.scheme != "http" or parsed.hostname not in ("127.0.0.1", "localhost", "::1")
                or parsed.username or parsed.password or parsed.path not in ("", "/")
                or parsed.query or parsed.fragment):
            raise ValueError("--base-url must be a loopback HTTP origin, e.g. http://127.0.0.1:3107")
        self.base = base_url.rstrip("/")
        self.origins = {parsed.netloc}
        self.opener = build_opener(ProxyHandler({}), NoRedirect())
        self.cache = {}

    def get(self, path, seen=()):
        if path in self.cache:
            return self.cache[path]
        if path in seen or len(seen) >= 5:
            return ("REDIRECT", "redirect loop or too many redirects", "")
        try:
            with self.opener.open(self.base + path, timeout=10) as response:
                result = (response.status, response.read().decode("utf-8", errors="replace"),
                          response.headers.get("Content-Type", ""))
        except HTTPError as error:
            if error.code in (301, 302, 303, 307, 308):
                target = internal_target(error.headers.get("Location", ""), self.base + path, self.origins)
                result = (self.get(target, seen + (path,)) if target is not None
                          else ("REDIRECT", "redirect leaves the site; not followed", ""))
            else:
                result = (error.code, "", "")
            error.close()
        except (URLError, TimeoutError, OSError) as error:
            result = ("NETWORK", type(error).__name__, "")
        self.cache[path] = result
        return result


def check_site(base_url):
    client = LocalClient(base_url)
    status, body, _ = client.get("/sitemap.xml")
    if status != 200:
        raise ValueError(f"Sitemap unavailable: {status}; start the production server after npm run build")
    root = ET.fromstring(body)
    # Only page URL entries, not a sitemap index or image locations.
    locations = [entry.text for entry in root.findall("{*}url/{*}loc") if entry.text]
    if not locations:
        raise ValueError("Sitemap has no page URLs")
    site = urlsplit(locations[0])
    if site.scheme not in ("http", "https") or not site.netloc:
        raise ValueError("Sitemap must contain absolute page URLs")
    client.origins.add(site.netloc)
    targets = {}
    failures = []
    for location in locations:
        url = urlsplit(location)
        if url.scheme != site.scheme or url.netloc != site.netloc:
            raise ValueError("Sitemap mixes site origins")
        path = internal_target(location, location, client.origins)
        status, html, content_type = client.get(path)
        if status != 200 or "text/html" not in content_type:
            failures.append((location, path, status if status != 200 else "NOT_HTML"))
            continue
        parser = LinkParser()
        parser.feed(html)
        for href in parser.links:
            target = internal_target(href, location, client.origins)
            if target is not None:
                targets.setdefault(target, set()).add(path)
    for target, sources in sorted(targets.items()):
        status, _, _ = client.get(target)
        if status != 200:
            failures.extend((source, target, status) for source in sorted(sources))
    return len(locations), len(targets), failures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:3107")
    args = parser.parse_args()
    try:
        pages, links, failures = check_site(args.base_url)
    except (ValueError, ET.ParseError) as error:
        print(f"SETUP: {error}", file=sys.stderr)
        return 2
    for source, target, status in failures:
        print(f"{status}: {source} -> {target}", file=sys.stderr)
    print(f"Checked {pages} sitemap pages and {links} unique internal link targets; {len(failures)} failures.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
