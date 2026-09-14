<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Paired API repo

The backend is `sondresjolyst/altinnendata-api`, checked out beside this repo at `../altinnendata-api`.

- A change spanning both repos goes on one branch per repo, with focused commits on it.
- Open the API PR first. The app PR body starts with `Depends on sondresjolyst/altinnendata-api#N.`

## Running locally

- API: `dotnet run --launch-profile https` in `../altinnendata-api`. `NEXT_PUBLIC_API_URL` in `.env.local` points at that profile's https port.
- The API applies pending EF migrations on startup, against `ConnectionStrings:DefaultConnection` in its user secrets. Before starting it, check the target with this, run in `../altinnendata-api`. Never run `dotnet user-secrets list` unfiltered: it prints the database password and API keys.

  ```powershell
  $line = dotnet user-secrets list | Where-Object { $_ -like 'ConnectionStrings:DefaultConnection*' }
  $b = [System.Data.Common.DbConnectionStringBuilder]::new()
  $b.set_ConnectionString(($line -split '\s*=\s*', 2)[1])
  'Host', 'Port', 'Database' | Where-Object { $b.ContainsKey($_) } | ForEach-Object { "$_=$($b[$_])" }
  ```

  Keep `set_ConnectionString(...)`: `$b.ConnectionString = ...` adds a key named `ConnectionString` instead of parsing, and nothing prints.
- `npm run build` prerenders pages against the API and fails when it is unreachable. Run the local API, or set `NEXT_PUBLIC_API_URL` to the dev API as the build step in `.github/workflows/docker.yml` does.

## Gotchas

- `src/proxy.ts` redirects every path without a locale prefix. Its matcher skips paths containing a dot, so a route without a file extension (such as `/icon`) needs its own exclusion there.
- Admin saves clear ISR pages through `revalidateTarget` and the targets in `src/lib/cacheTags.ts`. A public fetch without a tag keeps serving the old value until its revalidate window passes.

## Commits and PRs

- Conventional Commits: release-please builds the version and changelog from them.
- Ask before committing. Build and run the tests first, report the results in chat, then ask. Push and open PRs only when asked.
- Commit and PR bodies are empty by default. Add a line only for what the title and diff do not show, such as a new env var or a non-obvious constraint.
- No test counts or build status in bodies. CI reports them on every PR.
- English prose, even when the UI strings are Norwegian: "Classes: new admin page", not "Klasser: new admin page".
- In PowerShell, `gh pr create --body '""'` posts a literal `""`. Pass `--body-file` with an empty file instead.

## Writing

- No em dashes in PR bodies, commit messages, docs, code comments or chat. Use a colon, a comma, parentheses or a new sentence.
