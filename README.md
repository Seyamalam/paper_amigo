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

## Quality checks

```bash
bun run check          # formatting, both linters, types, and unit tests
bun run ci             # all checks plus a production build
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

## Releases

Release Please reads Conventional Commits on `master`. It opens a release pull
request that updates `CHANGELOG.md` and `package.json`. Merging that pull request
creates a GitHub release and a `vX.Y.Z` tag. See [CONTRIBUTING.md](CONTRIBUTING.md)
for commit types and the full workflow.

## Project policies

- [Contributing](CONTRIBUTING.md)
- [Code of conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)
- [Support](SUPPORT.md)
- [Governance](GOVERNANCE.md)

The repository does not declare a software license yet. Until the owner chooses
one and adds a `LICENSE` file, copyright law reserves reuse and redistribution
rights.
