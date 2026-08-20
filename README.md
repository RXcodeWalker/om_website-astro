# Om — Personal site (Astro)

A fast, content-driven personal website and blog built with Astro. It includes an archive, client-side search and filters, an in-browser article reader (TTS), and Vercel serverless functions for AI summarization and view counting.

## Features

- Static site generated with Astro for blog pages and site content.
- Content managed via `astro:content` collection (`src/content/config.ts`).
- Client-side blog index with search, category filters, and bookmarks (`public/js/blog.js`).
- In-browser audio reader using the Web Speech API with paragraph-level highlighting and controls (`public/js/reader.js`).
- AI-powered post summarizer: client UI calls a Vercel serverless function which proxies Anthropic (Claude) (`public/js/summarizer.js`, `api/summarize.js`). NOTE: THIS DOESN'T WORK RIGHT NOW AS I DON'T HAVE ACCESS TO THE API KEY.
- View counter backed by Supabase via a Vercel function (`api/incrementViews.js`).
- Utilities for estimating read time and extracting key ideas from Markdown (`src/utils/postInsights.ts`).

## Installation

Requirements:

- Node.js (v20 recommended by `.nvmrc`)
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

Vercel deployment notes:

- `vercel.json` is configured to build with `npm run build`, publish `dist`, and serve serverless functions from `api/`.
- Set environment variables in Vercel for serverless integrations (see Configuration below).
- A rewrite maps `/.netlify/functions/:path*` to `/api/:path*` so older function URLs still resolve.

## Project Structure

- `src/` — Astro source code
  - `pages/` — site routes and page templates (index, blog, blog post pages)
  - `components/` — reusable UI components
  - `content/` — `astro:content` collections and Markdown blog posts
  - `utils/` — helper utilities (e.g., `postInsights.ts`)
- `public/` — static assets and client-side JS
  - `js/` — interactive scripts: `blog.js`, `reader.js`, `summarizer.js`, etc.
- `api/` — Vercel serverless functions
  - `summarize.js` — Anthropic proxy for post summarization
  - `incrementViews.js` — logs views to Supabase and returns counts
- `astro.config.mjs`, `package.json`, `vercel.json` — project and deployment config

## Technologies Used

- Astro (Static site generator)
- JavaScript/TypeScript (Astro pages and utilities)
- Vercel Serverless Functions
- Anthropic API (Claude) — proxied server-side in `api/summarize.js`
- Supabase — used for view counting (`api/incrementViews.js`) via service role key
- Web Speech API — in-browser TTS in `reader.js`

## Configuration

Required environment variables for full functionality (set in Vercel → Project → Settings → Environment Variables, for Production, Preview, and Development):

- `ANTHROPIC_API_KEY` — required by `api/summarize.js` to call Anthropic.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — required by `api/incrementViews.js` for view tracking.

Copy these from the old Netlify site config if they are already set there. Do not commit them.

Local testing of Vercel functions:

- Use `npx vercel dev` so `/api/summarize` and `/api/incrementViews` run locally. If omitted, summarizer and view counter endpoints will fail with clear error messages.

If any of the above environment variables are not set, the repository will still build and the static site will work, but serverless behaviors (AI summary, view tracking) will return errors.

## Future Improvements

- Add automated tests for the utility functions (`postInsights.ts`) and serverless functions.
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

This project is a personal site and writing archive focused on fast static delivery with a handful of progressive enhancements: an accessible in-browser reader, client-side discovery features, and experimentations with AI-assisted summarization. The Vercel functions keep sensitive API keys server-side while enabling richer UX on the client.

## Challenges Solved

- Safely calling an LLM from the web without leaking API keys — solved by `api/summarize.js`.
- Extracting useful preview metadata (read time, key ideas, striking lines) from Markdown without a heavy NLP dependency (`src/utils/postInsights.ts`).
- Providing resilient audio playback across browsers using the Web Speech API, with keep-alive handling for Chrome (`public/js/reader.js`).

## Contributing

1. Fork the repository.
2. Create a topic branch: `git checkout -b fix/feature-name`.
3. Make changes, run `npm run dev` to test locally.
4. Open a pull request describing your changes.

Please raise issues for bugs or proposals before large changes.

---

Credit: This README file was enhanced and properly formatted using ChatGPT.
