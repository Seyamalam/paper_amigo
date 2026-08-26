# Paper Amigo

Paper Amigo is a Next.js 16 application built with React 19, TypeScript,
Tailwind CSS, and shadcn/ui.

## Requirements

- Bun 1.4.0
- Node.js 20.9.0 or newer, for Next.js and Node-based development tools

## Start the app

```bash
bun install --frozen-lockfile
bun run dev
```

Open <http://localhost:3000>.

Without auth variables, local development opens in demo mode. To test owner
sign-in locally, copy `.env.example` to `.env`, set the auth variables, and remove
`PAPER_AMIGO_DEMO_MODE` or set it to `false`.

## Vercel environment variables

Set these as encrypted variables for the Production environment:

```text
BETTER_AUTH_SECRET
PAPER_AMIGO_OWNER_EMAIL
PAPER_AMIGO_OWNER_PASSWORD
UPLOADTHING_TOKEN
PAPER_AMIGO_INGESTION_TOKEN
```

- Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`.
- Set `PAPER_AMIGO_OWNER_EMAIL` to the only email allowed to sign in.
- Set `PAPER_AMIGO_OWNER_PASSWORD` to a unique password with at least 12
  characters. A password-manager-generated value is recommended.
- Keep all of these server-only. Do not add a `NEXT_PUBLIC_` prefix.

The managed KV variables will be added after its provider is selected. Vercel
deployments fail closed when the auth configuration is missing or invalid;
`PAPER_AMIGO_DEMO_MODE` only works outside Vercel.

There is no signup or password-reset flow. Change the owner password in Vercel
and redeploy to rotate it. Rotating `BETTER_AUTH_SECRET` signs out every browser.
The password remains in server environment configuration; browser sessions
contain only the owner email in a seven-day encrypted JWE.

## Quality checks

```bash
bun run check          # formatting, both linters, types, and unit tests
bun run ci             # local CI: checks, audit, and production build
bun run lint           # Oxlint followed by typed ESLint
bun run lint:fix       # apply safe lint fixes
bun run format         # format the repository
bun run typecheck      # generate Next.js route types and run TypeScript
bun run test:coverage  # run tests and enforce coverage thresholds
bun run audit          # check production dependencies for advisories
```

Oxlint runs type-aware rules and the project-local anti-slop plugin. ESLint
adds strict type-checked TypeScript rules and Next.js, React, accessibility,
and Core Web Vitals checks. Warnings fail local and CI checks.

Husky formats staged files and runs types, lint, and tests before each commit.
Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/).

## Add shadcn/ui components

```bash
bunx shadcn@latest add button
```

Import components through the `@/` alias:

```tsx
import { Button } from "@/components/ui/button"
```

## Local CI

The project does not use GitHub Actions. Run the complete gate on your machine:

```bash
bun install --frozen-lockfile
bun run ci
```

`bun run ci` checks formatting, runs Oxlint and ESLint, generates Next.js route
types, runs TypeScript and unit tests, audits production dependencies, and builds
the production application.

## Releases

Releases are manual for now. Update `CHANGELOG.md` and the version in
`package.json`, refresh `bun.lock`, run `bun run ci`, commit, then create and push
an annotated `vX.Y.Z` tag. See [CONTRIBUTING.md](CONTRIBUTING.md) for the commands.

## Project policies

- [Contributing](CONTRIBUTING.md)
- [Code of conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)
- [Support](SUPPORT.md)
- [Governance](GOVERNANCE.md)

The repository does not declare a software license yet. Until the owner chooses
one and adds a `LICENSE` file, copyright law reserves reuse and redistribution
rights.
