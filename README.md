# Codex Study Club

Codex Study Club is a Chinese learning and practice community for OpenAI Codex. It combines a Markdown-driven tutorial and case library with a homepage assistant that retrieves answers from the same local content repository.

![Codex Study Club](public/og-image.webp)

## Features

- Chat-first homepage for Codex learning questions.
- Local Markdown knowledge retrieval with optional OpenAI-generated answers.
- 20 categorized, SEO-friendly case studies with local screenshots.
- Beginner tutorial and curated community updates.
- Responsive layouts for desktop and mobile.
- Sitemap, robots metadata, Open Graph metadata, and structured data.

## Architecture

```text
content/**/*.md
      |
      v
lib/content.ts --------------------> Next.js pages
      |
      v
lib/knowledge-base.ts ------------> /api/chat
                                      |
                                      +-- local answer when no API key
                                      +-- retrieved context for OpenAI Responses API
```

Editorial content is stored under `content/`. React and Next.js code only loads, indexes, and renders these documents.

```text
content/
├── assistant/             # Homepage assistant knowledge
├── cases/
│   ├── getting-started/   # Beginner workflows
│   ├── development/       # Development and automation
│   ├── content-design/    # Content and design
│   ├── knowledge/         # Knowledge and collaboration
│   └── tools-devices/     # Tools and devices
├── community-updates/     # Curated community notes
└── tutorials/             # Structured tutorials
```

See [content/README.md](content/README.md) for frontmatter schemas and authoring rules.

## Requirements

- Node.js 20.9 or newer
- npm

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | No | Enables generated answers through the OpenAI Responses API. Without it, the assistant returns local Markdown answers and excerpts. |
| `OPENAI_MODEL` | No | Responses API model. Defaults to the value in `.env.example`. |
| `NEXT_PUBLIC_SITE_URL` | Production | Public origin used for canonical URLs, sitemap entries, and social metadata. |
| `NEXT_PUBLIC_COMMUNITY_JOIN_URL` | No | Payment or onboarding URL used by the community join action. |

Do not commit `.env.local` or any API key.

## Content Workflow

1. Add or edit a Markdown file under the appropriate `content/` directory.
2. Keep page metadata in YAML frontmatter and the full article in Markdown.
3. Put images under `public/` and reference them with root-relative paths.
4. Run the validation commands below.
5. Rebuild or restart the service so the document enters the page index and local assistant knowledge base.

Adding a case, tutorial, or community update does not require editing a TypeScript content array.

## Commands

```bash
npm run dev                 # Start the development server
npm run lint                # Run ESLint
npm run build               # Create the production build
npm run start               # Serve the production build
npm run import:codexguide   # Refresh categorized imported cases
```

## Deployment Checklist

- Set `NEXT_PUBLIC_SITE_URL` to the production HTTPS origin.
- Configure `NEXT_PUBLIC_COMMUNITY_JOIN_URL` when community enrollment is available.
- Configure `OPENAI_API_KEY` only on the server when generated answers are required.
- Run `npm run lint` and `npm run build`.
- Verify `/`, `/cases`, `/learn/getting-started`, `/sitemap.xml`, and `/api/chat`.

## Disclaimer

Codex Study Club is not an official OpenAI website. Product facts should be checked against the official OpenAI documentation.

Third-party content notices are documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
