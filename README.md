<p align="center">
  The Altinnendata website — PC builds on show, in Norwegian and English, with an admin console to run the whole site.
</p>

---

altinnendata-app is the public website for **Altinnendata** — local building and
installation of desktop PCs. It shows the machines that have been built, takes
enquiries, and includes an admin console for managing the site's content.
Backed by [altinnendata-api](https://github.com/sondresjolyst/altinnendata-api).

Live at **[altinnendata.no](https://www.altinnendata.no)**.

## What's on the site

- **Home** — built from composable sections (hero, stats, images, calls to
  action) edited live from the admin console, per language.
- **Builds** — each machine with its price, availability, parts list, photos and
  a page body of its own.
- **Contact** — an enquiry form (use case, budget, which build) that emails
  Altinnendata.
- **Legal** — terms, privacy and cookies, written from the admin console.
- **Admin console** — front page, builds, component catalog, legal pages,
  branding, settings, statistics, and user invitations.

Sign-in is admin-only; there is no public registration. The public pages are
server-rendered for speed and SEO.

## Languages

Every page lives under a locale segment — `/no/...` and `/en/...` — and `/`
redirects to Norwegian; visitors switch language themselves. UI strings come from
`src/i18n/locales/*.json`; content written by an admin (front page, builds,
legal pages) is stored per language in the API.

To add a language: add its tag to `LOCALES` in `src/i18n/config.ts`, drop in a
dictionary file next to the others, add the same tag to `Locales.Supported` in
the API, and fill in the new tab in the admin console.

---

## For developers

<details>
<summary>Run, build, and test from source</summary>

### Stack

Next.js (App Router) · TypeScript · Tailwind CSS · next-auth · Axios · Vitest.

### Run locally

```bash
npm install
cp .env.example .env   # set NEXTAUTH_SECRET and ALTINNENDATA_API_JWT_SECRET (= the API's Jwt__Key)
npm run dev            # http://localhost:3000
```

[altinnendata-api](https://github.com/sondresjolyst/altinnendata-api) must be running and
reachable at `NEXT_PUBLIC_API_URL`.

### Environment

| Variable                  | What it's for                                           |
| ------------------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`     | Base URL of the API (e.g. `http://localhost:7297/api`). |
| `NEXTAUTH_URL`            | This app's URL (e.g. `http://localhost:3000`).          |
| `NEXTAUTH_SECRET`         | next-auth session secret.                               |
| `ALTINNENDATA_API_JWT_SECRET` | Must match the API's `Jwt__Key` (verifies its tokens).  |

### Scripts

```bash
npm run dev     # dev server (Turbopack)
npm run build   # production build
npm start       # serve the production build
npm run lint    # ESLint
npm test        # Vitest
```

### Layout

```
src/
├── app/[locale]/ # routes — public pages, (auth), (protected)/admin
├── app/api/      # route handlers (next-auth, revalidation)
├── components/   # shared UI
├── i18n/         # locale config, dictionaries, client provider
├── services/     # API clients (one per domain)
├── lib/          # helpers (company info, fetch wrappers, cache tags, formatting)
├── types/        # shared types
└── proxy.ts      # locale redirect for unprefixed paths
```

</details>
