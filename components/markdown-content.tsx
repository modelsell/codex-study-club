import MarkdownIt, { type PluginWithParams } from "markdown-it";
import markdownItContainer from "markdown-it-container";
import type Token from "markdown-it/lib/token.mjs";

// The container typings still depend on markdown-it 13, while this app uses 14.
const containerPlugin = markdownItContainer as unknown as PluginWithParams;

function rewriteContentLink(href: string) {
  const startMatch = href.match(/^(?:\.\/|\.\.\/start\/|\/start\/)([^?#]+?)\.md([?#].*)?$/);
  if (startMatch) return `/start/${startMatch[1]}${startMatch[2] || ""}`;

  const advancedMatch = href.match(/^(?:\.\.\/advanced\/|\/advanced\/)([^?#]+?)\.md([?#].*)?$/);
  if (advancedMatch) {
    const page = advancedMatch[1] === "00-index" ? "" : `${advancedMatch[1]}.html`;
    return `https://codexguide.ai/advanced/${page}${advancedMatch[2] || ""}`;
  }

  return href;
}

function createRenderer() {
  const markdown = new MarkdownIt({ html: true, linkify: true, typographer: false });

  for (const type of ["tip", "warning"]) {
    markdown.use(containerPlugin, type, {
      render(tokens: Token[], index: number) {
        if (tokens[index].nesting === 1) {
          const title = tokens[index].info.trim().replace(type, "").trim();
          return `<aside class="markdown-callout markdown-callout-${type}">${
            title ? `<strong>${markdown.utils.escapeHtml(title)}</strong>` : ""
          }`;
        }
        return "</aside>";
      },
    });
  }

  const defaultLinkOpen = markdown.renderer.rules.link_open;
  markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const hrefIndex = token.attrIndex("href");
    if (hrefIndex >= 0) {
      const href = rewriteContentLink(token.attrs?.[hrefIndex]?.[1] || "");
      token.attrSet("href", href);
      if (href.startsWith("/recipes/")) {
        const local = href.replace("/recipes/", "/cases/").replace(/\.html$/, "");
        token.attrSet("href", local);
      } else if (/^https?:\/\//.test(href)) {
        token.attrSet("target", "_blank");
        token.attrSet("rel", "noreferrer noopener");
      }
    }
    return defaultLinkOpen
      ? defaultLinkOpen(tokens, index, options, env, self)
      : self.renderToken(tokens, index, options);
  };

  const defaultImage = markdown.renderer.rules.image;
  markdown.renderer.rules.image = (tokens, index, options, env, self) => {
    tokens[index].attrSet("loading", "lazy");
    tokens[index].attrSet("decoding", "async");
    return defaultImage
      ? defaultImage(tokens, index, options, env, self)
      : self.renderToken(tokens, index, options);
  };

  return markdown;
}

const renderer = createRenderer();

export function MarkdownContent({ content }: { content: string }) {
  return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: renderer.render(content) }} />;
}
