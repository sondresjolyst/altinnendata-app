# altinnendata-app

Website for Altinnendata, backed by
[altinnendata-api](https://github.com/sondresjolyst/altinnendata-api).

## Stack

Next.js 16 App Router, TypeScript, Tailwind CSS 4, next-auth, Vitest.

## Quick start

```bash
npm ci
cp .env.example .env
npm run dev
```

altinnendata-api must be running and reachable at `NEXT_PUBLIC_API_URL`.
Translation needs a LibreTranslate instance, which downloads its models on first
boot:

```bash
docker run -d --name libretranslate -p 5055:5000 -e LT_LOAD_ONLY=en,nb libretranslate/libretranslate
```

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Production build |
| `npm start` | Serves the production build |
| `npm test` | Vitest |
| `npm run lint` | ESLint |

## Environment

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the API, for example `http://localhost:7297/api` |
| `NEXTAUTH_URL` | URL of this app |
| `NEXTAUTH_SECRET` | next-auth session secret |
| `ALTINNENDATA_API_JWT_SECRET` | Must match the API's `Jwt__Key` |
| `LIBRETRANSLATE_URL` | LibreTranslate instance. Unset turns translation off |
| `LIBRETRANSLATE_API_KEY` | Only for an instance that requires a key |

## Languages

Every page lives under a locale segment, `/no/...` and `/en/...`, and `/`
redirects to Norwegian. UI strings come from `src/i18n/locales/*.json`. Content
written by an admin is stored per language in the API, and a build's text is
machine translated on FINN import or from the Translate button.

To add a language: add its tag to `LOCALES` in `src/i18n/config.ts`, add a
dictionary file next to the others, add the same tag to `Locales.Supported` in
the API, then fill in the new tab in the admin console.

## Layout

```
src/
├── app/[locale]/ # routes: public pages, (auth), (protected)/admin
├── app/api/      # route handlers (next-auth, revalidation)
├── components/   # shared UI
├── i18n/         # locale config, dictionaries, client provider
├── services/     # API clients, one per domain
├── lib/          # company info, fetch wrappers, cache tags, formatting
├── types/        # shared types
└── proxy.ts      # locale redirect for unprefixed paths
```

## Deployment

Image [`sondresjo/altinnendata-app`](https://hub.docker.com/r/sondresjo/altinnendata-app)
on Docker Hub, chart `altinnendata-app` in
[tumogroup-charts](https://github.com/sondresjolyst/tumogroup-charts), applied by
Flux from [tumo-flux](https://github.com/sondresjolyst/tumo-flux) to
`altinnendata-dev` and `altinnendata-prod`.

The container runs as the non-root `node` user with a read-only root filesystem,
so anything written at runtime needs a volume. The incremental cache is kept in
memory for that reason.

A push to `main` builds the `dev` tag. A release-please release builds `vX.Y.Z`,
tags it `latest` and opens a chart bump against
[tumogroup-charts](https://github.com/sondresjolyst/tumogroup-charts). Cluster
secrets are created by
[`scripts/altinnendata/bootstrap.sh`](https://github.com/sondresjolyst/tumo-platform/blob/main/scripts/altinnendata/bootstrap.sh)
in [tumo-platform](https://github.com/sondresjolyst/tumo-platform).

## License

Proprietary. Copyright (c) 2026 Sondre Sjølyst.
