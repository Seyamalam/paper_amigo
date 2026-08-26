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

## CLI and skill

Required commands:

```text
paper-amigo login
paper-amigo logout
paper-amigo doctor [--json]
paper-amigo project list [--json]
paper-amigo project create <path...> --title <title> --description <text> \
  --author "Name|Designation|University|ORCID|Profile URL"
```

Project creation supports repeated `--author`, `--recursive`, `--dry-run`,
`--json`, and `--concurrency <1-8>`. It accepts relative or absolute files and
directories from any working directory. The agent skill calls the CLI rather
than reimplementing storage or authentication.

## Sharing and critiques

- A project can have multiple labeled secret links.
- Recipients do not sign in.
- Track total opens and estimated distinct browsers without storing raw IPs.
- Allow recipients to submit a display name, optional email, critique text, and
  optional page number.
- Owners can read, filter, mark, delete, and export critiques.

Share-link persistence remains unimplemented until a non-database durable store
is selected.

## Local quality gate

Run `bun run ci`. GitHub Actions are intentionally not used.
