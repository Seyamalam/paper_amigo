# Paper Amigo

Paper Amigo is a Next.js 16 application built with React 19, TypeScript,
Tailwind CSS, and shadcn/ui.

## Requirements

- Bun 1.4.0
- Node.js 20.16.0 or newer, for Next.js, PDF.js, and Node-based development tools

## Start the app

```bash
bun install --frozen-lockfile
bun run dev
```

Open <http://localhost:3000>.

In a second terminal, keep the personal Convex development deployment synced:

```bash
bunx convex dev
```

The first run creates or selects a Convex project and writes the development URL
to the ignored `.env.local`. Set a matching local service credential with:

```bash
bunx convex env set PAPER_AMIGO_SERVICE_SECRET
```

Put that same value in `.env.local` as
`PAPER_AMIGO_CONVEX_SERVICE_SECRET`.

Without auth variables, local development opens in demo mode. To test owner
sign-in locally, copy `.env.example` to `.env`, set the auth variables, and remove
`PAPER_AMIGO_DEMO_MODE` or set it to `false`.

## Vercel environment variables

Set these as encrypted variables for the Production environment:

```text
BETTER_AUTH_SECRET
PAPER_AMIGO_OWNER_EMAIL
PAPER_AMIGO_OWNER_PASSWORD
CONVEX_URL
PAPER_AMIGO_CONVEX_SERVICE_SECRET
UPLOADTHING_TOKEN
```

- Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`.
- Set `PAPER_AMIGO_OWNER_EMAIL` to the only email allowed to sign in.
- Set `PAPER_AMIGO_OWNER_PASSWORD` to a unique password. The app accepts any
  non-empty value, but a password-manager-generated value with at least 12
  characters is recommended.
- Set `CONVEX_URL` to the production deployment's `.convex.cloud` URL.
- Generate one service credential with `openssl rand -hex 32`. Set the same
  value as `PAPER_AMIGO_CONVEX_SERVICE_SECRET` in Vercel and as
  `PAPER_AMIGO_SERVICE_SECRET` in the production Convex deployment.
- Create an UploadThing app, enable ACL overrides, and copy its v7 token into
  `UPLOADTHING_TOKEN`. PDFs use `public-read` because the free UploadThing tier
  does not provide private storage.
- Keep all of these server-only. Do not add a `NEXT_PUBLIC_` prefix.

Vercel deployments fail closed when the auth configuration is missing or invalid;
`PAPER_AMIGO_DEMO_MODE` only works outside Vercel.

There is no signup or password-reset flow. Change the owner password in Vercel
and redeploy to rotate it. Rotating `BETTER_AUTH_SECRET` signs out every browser
and changes future anonymous-visitor hashes, but does not invalidate share links
or stored critiques.
The password remains in server environment configuration; browser sessions
contain only the owner email in a seven-day encrypted JWE.

One project has a title, description, one or more structured authors, and one to
ten PDFs. Each author has a name, designation, university, and optional ORCID iD
and profile URL. Convex stores structured project metadata; UploadThing stores
only PDF bytes. The browser calculates SHA-256 before upload and rejects duplicate
content.

Public-read URLs are unlisted but not access-controlled. Anyone with a PDF URL
can open or download it; hiding download controls in the web UI is not DRM.

The owner can create labeled secret links from a project page. Recipients open
those links without signing in, switch between project PDFs, and leave a comment
on a specific PDF with an optional page number. The app counts total opens and
estimated unique browsers. Convex stores token hashes, view events, unique
visitor hashes, and critiques; raw share tokens and raw visitor identifiers are
never stored. PDF pages render in an in-app canvas instead of depending on a
browser PDF plugin.

The owner can permanently delete a project from its project page after typing
the exact project title. Deletion removes attached PDFs, project metadata, share
links, views, and critiques.

## CLI

The CLI uses the same owner email and password as the web app. On macOS,
`paper-amigo login` stores the password in Keychain and keeps the email in
`~/.config/paper-amigo/config.json`. Run `login` again to replace either value.
The production app URL is the default.

Run it from this checkout:

```bash
bun run cli login
bun run cli doctor
bun run cli project create ./research --recursive \
  --title "Project title" \
  --description "Project description" \
  --author "Name|Designation|University|ORCID|Profile URL"
bun run cli project replace <project-id> <current-file-name-or-key> \
  ./revised.pdf --json
bun run cli project delete <project-id> --confirm "Exact project title" --json
```

Install the `paper-amigo` command from this checkout with `bun link`:

```bash
bun link
paper-amigo login
paper-amigo doctor
```

The email prompt reuses the saved address when one exists. The password prompt
comes from macOS Keychain and does not echo the password. Use
`paper-amigo logout` to remove the saved email and Keychain item.

For automation or local development, environment variables still override the
saved login:

```bash
export PAPER_AMIGO_URL=http://localhost:3000
export PAPER_AMIGO_OWNER_EMAIL=owner@example.com
export PAPER_AMIGO_OWNER_PASSWORD='owner-password'
```

Use `paper-amigo project list --json` to list projects. Repeat `--author` for
multiple authors. `project create` accepts `--dry-run`, `--json`, `--recursive`,
and `--concurrency <1-8>`. The older `list` and `upload` names remain aliases.
Directory scans ignore non-PDF files. Explicit non-PDF paths and failed uploads
produce a nonzero exit code.

Use `paper-amigo project replace <project-id> <current-file-name-or-key>
<replacement.pdf> --json` to replace exactly one project file. The selector may
be an exact filename or the file key returned by `project list --json`. Existing
share links immediately resolve the new PDF metadata. The previous PDF is
removed only after that metadata is committed. The CLI never prints credentials.

Use `paper-amigo project delete <project-id> --confirm "Exact project title"
--json` to permanently delete a project and its storage records. The exact title
confirmation is required in both interactive and automated use.

The versioned agent skill is stored at `.agents/skills/paper-amigo/SKILL.md` and
delegates file discovery, hashing, authentication, upload, and replacement work
to the CLI. It also documents the confirmation rules for permanent deletion.
Install it for supported agents through the skills CLI:

```bash
npx skills add https://github.com/Seyamalam/paper_amigo \
  --skill paper-amigo --global --yes
```

The repository layout is directly discoverable by `skills.sh`; updates can be
pulled with `npx skills update paper-amigo --global --yes`.

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
the production application and standalone CLI.

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
