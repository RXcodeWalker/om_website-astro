# Om — Personal site (Astro)

A fast, content-driven personal website and blog built with Astro. It includes an archive, client-side search and filters, an in-browser article reader (TTS), and Netlify serverless functions for AI summarization and view counting.

## Features

- Static site generated with Astro for blog pages and site content.
- Content managed via `astro:content` collection (`src/content/config.ts`).
- Client-side blog index with search, category filters, and bookmarks (`public/js/blog.js`).
- In-browser audio reader using the Web Speech API with paragraph-level highlighting and controls (`public/js/reader.js`).
- AI-powered post summarizer: client UI calls a Netlify serverless function which proxies Anthropic (Claude) (`public/js/summarizer.js`, `netlify/functions/summarize.js`).
- View counter backed by Supabase via a Netlify function (`netlify/functions/incrementViews.js`).
- Utilities for estimating read time and extracting key ideas from Markdown (`src/utils/postInsights.ts`).

## Demo / Example

Example: visiting a blog post and generating an AI summary

1. Open a post at `/blog/<slug>` in the built site.
2. Click the `Listen` button to play audio (browser TTS).
3. Click the `Summarize` button to open the AI summary panel — it calls `/.netlify/functions/summarize` and shows TL;DR, key points, and tone.

Expected summarizer response shape (JSON returned by the Netlify function):

```
{
  "tldr": "One punchy sentence",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "tone": "Reflective",
  "wordCount": 820
}
```

## Installation

Requirements:

- Node.js (v20 recommended by `netlify.toml` build environment)
- npm

Local setup:

```bash
git clone <repo>
cd om-website-astro
npm install
npm run dev
```

This runs Astro in dev mode (see `package.json` scripts).

## Usage

- Development: `npm run dev` — starts the Astro dev server.
- Build: `npm run build` — generates the `dist/` output for static hosting.
- Preview production build locally: `npm run preview`.

Netlify deployment notes:

- `netlify.toml` is configured to publish `dist` and serve serverless functions from `netlify/functions`.
- Set environment variables in Netlify for serverless integrations (see Configuration below).

## Project Structure

- `src/` — Astro source code
  - `pages/` — site routes and page templates (index, blog, blog post pages)
  - `components/` — reusable UI components
  - `content/` — `astro:content` collections and Markdown blog posts
  - `utils/` — helper utilities (e.g., `postInsights.ts`)
- `public/` — static assets and client-side JS
  - `js/` — interactive scripts: `blog.js`, `reader.js`, `summarizer.js`, etc.
- `netlify/functions/` — serverless functions
  - `summarize.js` — Anthropic proxy for post summarization
  - `incrementViews.js` — logs views to Supabase and returns counts
- `astro.config.mjs`, `package.json`, `netlify.toml` — project and deployment config

## Technologies Used

- Astro (Static site generator)
- JavaScript/TypeScript (Astro pages and utilities)
- Netlify Functions (serverless endpoints)
- Anthropic API (Claude) — proxied server-side in `summarize.js`
- Supabase — used for view counting (`incrementViews.js`) via service role key
- Web Speech API — in-browser TTS in `reader.js`

## Configuration

Required environment variables for full functionality (set in Netlify or local environment when testing functions):

- `ANTHROPIC_API_KEY` — required by `netlify/functions/summarize.js` to call Anthropic.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — required by `netlify/functions/incrementViews.js` for view tracking.

Local testing of Netlify functions:

- You can use Netlify CLI or a compatible runner to invoke functions locally. If omitted, summarizer and view counter endpoints will fail with clear error messages.

If any of the above environment variables are not set, the repository will still build and the static site will work, but serverless behaviors (AI summary, view tracking) will return errors.

## Future Improvements

- Add automated tests for the utility functions (`postInsights.ts`) and Netlify functions.
- Add CI configuration for linting and build checks.
- Provide optional server-side rendering or edge functions for summarization to reduce latency.
- Add authentication for bookmarking syncing across devices (current bookmarks use `localStorage`).
- Add a lightweight admin/editing interface for creating posts instead of editing Markdown files.

## Learning Outcomes

- Building an Astro static site with content collections and Markdown-driven pages.
- Implementing client-side interactivity for search, filtering, and TTS playback.
- Integrating serverless functions to safely proxy third-party APIs (Anthropic) and to interact with a remote DB (Supabase).
- Text-processing techniques for extracting summaries and read-time estimation from Markdown.

## Why I Built This

This project is a personal site and writing archive focused on fast static delivery with a handful of progressive enhancements: an accessible in-browser reader, client-side discovery features, and experimentations with AI-assisted summarization. The Netlify functions keep sensitive API keys server-side while enabling richer UX on the client.

## Challenges Solved

- Safely calling an LLM from the web without leaking API keys — solved by `netlify/functions/summarize.js`.
- Extracting useful preview metadata (read time, key ideas, striking lines) from Markdown without a heavy NLP dependency (`src/utils/postInsights.ts`).
- Providing resilient audio playback across browsers using the Web Speech API, with keep-alive handling for Chrome (`public/js/reader.js`).

## Contributing

1. Fork the repository.
2. Create a topic branch: `git checkout -b fix/feature-name`.
3. Make changes, run `npm run dev` to test locally.
4. Open a pull request describing your changes.

Please raise issues for bugs or proposals before large changes.

## License

No license file detected. Add a `LICENSE` if you want to make this project public under a chosen license.

---

If you want, I can also add a short CONTRIBUTING.md or CI workflow. What would you like next?
