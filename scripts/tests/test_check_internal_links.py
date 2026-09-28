import importlib.util
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import subprocess
import sys
import threading
import unittest
from unittest.mock import patch
from urllib.error import URLError

sys.dont_write_bytecode = True
SCRIPT = Path(__file__).resolve().parents[1] / "check_internal_links.py"
spec = importlib.util.spec_from_file_location("checker", SCRIPT)
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class LinkCheckTest(unittest.TestCase):
    def test_rendered_links_and_url_resolution(self):
        parser = checker.LinkParser()
        parser.feed('''<a href="/start/06-first-task">converted Markdown</a>
          <A HREF='../advanced/missing.html?x=1&amp;y=2#part'>raw HTML</A>
          <script>const example = '<a href="/not-a-link">';</script>
          &lt;a href="/also-not-a-link"&gt;
          <a href="https://external.example/path">external</a>''')
        self.assertEqual(len(parser.links), 3)
        targets = [checker.internal_target(href, "https://site.example/start/08-task-execution",
                   {"site.example"}) for href in parser.links]
        self.assertEqual(targets, ["/start/06-first-task", "/advanced/missing.html?x=1&y=2", None])
        self.assertEqual(checker.internal_target("/中文#段落", "https://site.example/", {"site.example"}),
                         "/%E4%B8%AD%E6%96%87")

    def test_local_server_detects_broken_raw_html_and_checks_redirects(self):
        broken = [False]
        requested = []

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                requested.append(self.path)
                status, kind = 200, "text/html"
                if self.path == "/sitemap.xml":
                    kind = "application/xml"
                    body = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://site.example/start/08</loc></url></urlset>'
                elif self.path == "/start/08":
                    body = '<a href="/start/06">Markdown output</a><a href="/redirect">redirect</a><a href="https://external.example/not-requested">external</a>'
                    if broken[0]:
                        body += '<a href="../advanced/missing.html">old HTML link</a><a href="/external-redirect">redirect</a>'
                elif self.path in ("/redirect", "/external-redirect"):
                    self.send_response(302)
                    self.send_header("Location", "/start/06" if self.path == "/redirect" else "https://external.example/not-requested")
                    self.end_headers()
                    return
                elif self.path == "/start/06":
                    body = "valid destination"
                else:
                    status, body = 404, "not found"
                self.send_response(status)
                self.send_header("Content-Type", kind)
                self.end_headers()
                self.wfile.write(body.encode())

            def log_message(self, *args):
                pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{server.server_port}"
        try:
            self.assertEqual(checker.check_site(base)[2], [])
            broken[0] = True
            failures = checker.check_site(base)[2]
            self.assertIn(("/start/08", "/advanced/missing.html", 404), failures)
            self.assertIn(("/start/08", "/external-redirect", "REDIRECT"), failures)
            result = subprocess.run([sys.executable, str(SCRIPT), "--base-url", base],
                                    capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode, 1)
            self.assertIn("404:", result.stderr)
            self.assertNotIn("/not-requested", requested)
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_network_failure_is_not_reported_as_404(self):
        client = checker.LocalClient("http://127.0.0.1:3107")
        with patch.object(client.opener, "open", side_effect=URLError("offline")):
            self.assertEqual(client.get("/")[0], "NETWORK")
        with self.assertRaises(ValueError):
            checker.LocalClient("https://site.example")


if __name__ == "__main__":
    unittest.main()
