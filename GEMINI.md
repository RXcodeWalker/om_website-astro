# Gemini CLI Context: om-website-astro

This file provides persistent instructions and project-specific context for Gemini CLI.

## 🚀 Tech Stack
- **Framework:** Astro (v5+)
- **Language:** TypeScript / JavaScript
- **Styling:** CSS (Modularized in `src/styles/`)
- **Backend/Functions:** Netlify Functions (`netlify/functions/`)
- **Database/Dynamic Features:** Supabase (`@supabase/supabase-js`)
- **Deployment:** Netlify

## 📁 Project Structure
- `src/pages/`: Astro routing and page components.
- `src/content/blog/`: Markdown files for blog posts.
- `src/components/`: Reusable Astro components.
- `src/layouts/`: Base layouts (e.g., `BaseLayout.astro`).
- `src/styles/`: Global and page-specific CSS files.
- `public/js/`: Client-side JavaScript utilities.
- `netlify/functions/`: Serverless functions for dynamic behavior.

## 📝 Content Management
- **Blog Schema:** Defined in `src/content/config.ts`.
- **Fields:** `title`, `description`, `pubDate`, `updatedDate`, `heroImage`, `category`, `excerpt`, `author`, `readingTime`.
- **Drafts:** Supported via `draft: true` in frontmatter.

## 🛠️ Commands
- `npm run dev`: Start development server.
- `npm run build`: Build for production.
- `npm run preview`: Preview production build locally.
- `npm run astro`: Access Astro CLI directly.

## 📋 Coding Standards & Conventions
- **Components:** Prefer Astro components (`.astro`) for UI and layouts.
- **Client-side JS:** Keep logic in `public/js` and import in Astro components where needed.
- **Styling:** Use standard CSS in `src/styles/`. Follow existing naming conventions in `global.css` and `pages.css`.
- **Functions:** Netlify functions use standard Node.js/JavaScript.
- **Type Safety:** Use TypeScript for `src/` files and content configurations.

## 🔒 Security & Safety
- **Environment Variables:** All secrets (Supabase keys, API tokens) must be stored in `.env` and accessed via `process.env` (Netlify) or `import.meta.env` (Astro).
- **Sensitive Data:** Never commit `.env` files or hardcode credentials.
