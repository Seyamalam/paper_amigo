# Paper Amigo requirements

## Product

Paper Amigo is a single-owner research-project library. A project is the unit of
organization and sharing. It contains:

- A required title and description.
- One or more authors.
- One to ten PDF files.

Each author has a required name, designation, and university. ORCID iD and a
profile URL are optional.

## Storage

- Do not use an application database.
- Store PDFs and versioned project JSON manifests in UploadThing.
- Use `public-read` because the selected free tier does not support private
  storage.
- Treat public URLs as unlisted, not private. The product does not display a
  download action but cannot prevent saving a publicly readable PDF.
- Preserve original PDF filenames and validate every manifest file reference
  against UploadThing before creating a project.
- Calculate a SHA-256 hash before upload and reject duplicate PDF content.
- Roll back uploaded PDFs when project creation is incomplete.
- Commit a replacement project manifest before deleting the prior PDF, and keep
  the replacement upload when deletion of the prior PDF fails.
- Delete sharing records and project files before deleting every versioned
  manifest so an interrupted project deletion can be retried.
- Encrypt share-link, view, and critique records before placing them in
  public-read storage.

## Owner authentication

- Support one server-configured email and password.
- Do not provide registration, password reset, OAuth, roles, or organizations.
- Use Better Auth cryptography for encrypted stateless browser sessions.
- Accept the same credential through HTTP Basic authentication over HTTPS for
  the CLI.
- Store CLI passwords in macOS Keychain and never print them.

## Web application

- Provide a fast responsive sidebar layout with mobile bottom navigation.
- Use a minimal black/white interface with light and dark modes.
- List and search projects by title, description, or author.
- Create projects with repeatable author fields and multi-PDF upload progress.
- Open a project and switch between its PDF files.
- Permanently delete a project only after its exact title is entered.

## CLI and skill

Required commands:

```text
paper-amigo login
paper-amigo logout
paper-amigo doctor [--json]
paper-amigo project list [--json]
paper-amigo project create <path...> --title <title> --description <text> \
  --author "Name|Designation|University|ORCID|Profile URL"
paper-amigo project replace <project-id> <current-file-name-or-key> \
  <replacement.pdf> [--json]
paper-amigo project delete <project-id> --confirm <project-title> [--json]
```

Project creation supports repeated `--author`, `--recursive`, `--dry-run`,
`--json`, and `--concurrency <1-8>`. It accepts relative or absolute files and
directories from any working directory. The agent skill calls the CLI rather
than reimplementing storage or authentication.

Project replacement accepts one local PDF and identifies the current project
file by exact filename or storage key. It rejects duplicate content, preserves
the file's project position, updates existing share links, and removes the prior
PDF only after the replacement manifest is durable.

Project deletion requires the exact current project title. It permanently
removes attached PDFs, all project-manifest revisions, share links, views, and
critiques. Retrying the authenticated API after a completed deletion is safe.

## Sharing and critiques

- A project can have multiple labeled secret links.
- Recipients do not sign in.
- Track total opens and estimated distinct browsers without storing raw IPs.
- Allow recipients to submit a display name, optional email, critique text, and
  optional page number.
- Owners can read critiques globally and filter them by project file.
- Tie every critique to one project file.
- Rate limit critique submissions per browser and reject honeypot submissions.

## Local quality gate

Run `bun run ci`. GitHub Actions are intentionally not used.
