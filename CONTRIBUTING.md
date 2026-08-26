# Contributing

Thanks for working on Paper Amigo. Keep changes focused, tested, and small
enough for another person to review without guessing at the intent.

## Set up your checkout

Install Bun 1.4.0 and Node.js 20.9.0 or newer, then run:

```bash
bun install --frozen-lockfile
bun run dev
```

Do not commit secrets. Local `.env*` files are ignored. If the project gains
required environment variables, document safe placeholder values in
`.env.example`.

## Make a change

1. Create a short-lived branch from `master`.
2. Add or update tests with the implementation.
3. Run `bun run check` while developing.
4. Run `bun run ci` before opening a pull request.
5. Explain the user-visible result and how you tested it in the pull request.

Husky runs staged formatting, type checking, both linters, and unit tests before
each commit. Do not bypass the hook to merge code that fails the same checks.

## Commit messages

Use this format:

```text
type(optional-scope): short description
```

Common types are `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`,
`ci`, and `chore`.

Examples:

```text
feat(search): add saved paper filters
fix(auth): reject expired session cookies
docs: explain local database setup
```

Use `feat` for a minor release and `fix` for a patch release. Add a
`BREAKING CHANGE:` footer for a major release.

## Pull requests

A pull request is ready when:

- `bun run ci` passes.
- New behavior has tests at the right boundary.
- UI changes include screenshots or a short recording.
- API, configuration, and environment changes are documented.
- The change contains no unrelated formatting or dependency churn.

Reviewers may ask for smaller commits or a narrower pull request when a change
mixes unrelated concerns.

## Releases

Release Please reads Conventional Commits merged into `master`. It keeps one
release pull request updated with the next version and changelog. Merging that
pull request creates the GitHub release and a `vX.Y.Z` tag.

For release pull requests to trigger other workflows, add a fine-grained token
as the `RELEASE_PLEASE_TOKEN` repository secret. Grant it repository Contents
and Pull requests read/write access. Without that secret, the workflow uses the
built-in `GITHUB_TOKEN`.

## Reporting problems

Use the bug or feature issue form for normal work. Follow [SECURITY.md](SECURITY.md)
for vulnerabilities and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for conduct
reports.
