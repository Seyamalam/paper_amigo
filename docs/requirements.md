# Paper Amigo V1 requirements

Status: confirmed product requirements. The responsive product shell and
stateless owner-auth boundary are implemented. Storage, durable records, CLI,
and skill integrations have not started.

## Product boundary

Paper Amigo is a private web library for research-paper PDFs. The owner manages
the library in a browser. Agents add papers from arbitrary local folders by
following an agent skill that calls a deterministic CLI.

V1 has one owner library and one environment-configured owner credential. There
are no separate personal libraries or per-owner records.

## Technical constraints

- Use the existing Next.js application.
- Use Better Auth cryptography for an encrypted stateless owner session.
- Use UploadThing for private PDF storage.
- Use a small managed key-value store only for share links, view tracking, and
  critiques.
- Do not use a relational, document, or authentication database.
- Use a CLI and agent skill for agent ingestion. Do not build an MCP server.
- Run all quality checks locally through `bun run ci`.

The key-value provider remains an implementation decision.

## Owner authentication

- Only the server-configured owner email and password are supported.
- There is no registration, password reset, or stored user account.
- Better Auth cryptography must provide encrypted stateless sessions.
- Every library, upload, sharing, tracking, and critique-management route requires
  an owner session.
- The sign-in page must show a generic error for invalid credentials.
- The application must provide sign-out.
- V1 does not support password login, public registration, roles, organizations,
  or centrally revoking individual browser sessions.

## Paper library

The owner can:

- View every stored paper in a paginated list or grid.
- Search by filename.
- Sort by filename, upload date, and file size.
- Open a paper in an embedded viewer.
- Upload one or more PDFs from the browser.
- Delete a paper after explicit confirmation.
- See upload progress and per-file failures.
- See the share links and critiques attached to a paper.

Each paper displays its original filename, size, and upload date. V1 does not
store custom titles, authors, abstracts, DOI values, tags, collections, notes,
favorites, or reading status.

## PDF ingestion

- Accept PDF files only.
- Default to a 64 MB maximum per file unless the storage plan requires a lower
  limit.
- Preserve the original filename.
- Calculate a SHA-256 content hash before upload.
- Use the content hash to make ingestion idempotent.
- Skip duplicate content by default and report it as skipped.
- Upload batches with bounded concurrency.
- A failed file must not cancel the rest of its batch.
- Store every PDF with private access.
- Upload directly to storage through a short-lived upload authorization. Do not
  proxy the entire PDF through the application server.

## CLI

The command name is `paper-amigo`. It must work from any current directory and
accept absolute or relative filesystem paths.

Required commands:

```text
paper-amigo upload <path...>
paper-amigo upload <directory> --recursive
paper-amigo list
paper-amigo doctor
```

CLI requirements:

- Accept files, directories, and several paths in one invocation.
- Ignore non-PDF files when scanning directories.
- Support recursive discovery.
- Support `--dry-run`, `--json`, and configurable concurrency.
- Print uploaded, skipped, and failed results.
- Return a nonzero exit code when any requested upload fails.
- Use stable machine-readable error codes in JSON mode.
- Read the application URL and ingestion credential from environment variables.
- Never require or expose the UploadThing server token.
- Never print ingestion credentials in output or logs.

## Agent skill

The agent skill is the only agent-facing integration in V1. It must:

- Check that the `paper-amigo` command is available.
- Run `paper-amigo doctor` before the first ingestion when configuration is
  uncertain.
- Resolve the paths the user placed in scope.
- Use `--dry-run --json` before a large recursive ingestion.
- Call the CLI rather than reimplementing uploads or storage requests.
- Interpret structured CLI results and report uploaded, skipped, and failed
  papers.
- Retry only failures marked as retryable.
- Never read, request, or echo the ingestion credential.
- Explain how to install or configure the CLI when `doctor` fails.

The skill contains instructions and recovery guidance. The CLI contains all file
discovery, hashing, validation, authentication, upload, and retry behavior.

## Machine authentication

- CLI requests use a dedicated bearer ingestion credential.
- The credential is separate from the owner login and the UploadThing token.
- It grants ingestion and paper-listing access only.
- The server reads it from environment configuration.
- Operators rotate it manually.
- Individually issued or remotely revoked agent credentials are out of scope for
  V1.

## Share links

The owner can create several share links for one paper. Each share link has:

- A required recipient label.
- A high-entropy secret.
- An optional expiration time.
- An optional maximum view count.
- Active or revoked status.
- Creation, first-view, and most-recent-view timestamps.
- Total views and estimated unique visitors.

The owner can copy, inspect, revoke, and replace a share link. The server stores
only a hash of the secret. A share link grants access to one paper and never
reveals the library.

The recipient label is not verified identity. If a recipient forwards a link,
subsequent activity remains attributed to that label.

## Recipient paper view

- Recipients do not sign in.
- A valid share link opens a focused paper-viewing page.
- The application validates the share secret before granting access.
- The application creates a short-lived signed URL for the private PDF.
- The PDF is displayed inline.
- The page has no download button.
- The response uses inline content disposition where supported.
- Expired, revoked, and exhausted links show a clear unavailable state.

Once a browser can render a PDF, the application cannot guarantee that the
recipient will not save, print, capture, or copy it. "No downloads" means the
product does not offer a download action. It is not digital-rights management.

## View tracking

- Record a view only after a valid share page loads and requests paper access.
- Avoid counting known crawlers, unfurlers, and failed requests.
- Count every successful view for the total.
- Assign a privacy-preserving browser identifier for estimated unique visitors.
- Do not store raw IP addresses.
- Track first and most recent view times per link.
- Present distinct-browser counts as estimates, never as verified people.
- The owner can see tracking data. Recipients cannot.

## Critiques

Each recipient page contains a critique form with:

- Required display name.
- Optional email address.
- Required critique text.
- Optional PDF page number.
- Clear submission success and failure states.

Critiques are visible only to the owner. Recipients cannot see their own previous
submissions or another recipient's submissions.

The owner can:

- Read critiques from the relevant paper.
- Filter critiques by share link and recipient label.
- Mark critiques as read or unread.
- Delete critiques.
- Export critiques as JSON or Markdown.

The form must enforce input limits, validate on the server, reject HTML, rate
limit submissions, and use a honeypot or equivalent low-friction spam check.

## Durable key-value records

The managed key-value store holds only:

- Share-link hashes, paper references, recipient labels, limits, and status.
- Per-link aggregate view counts and timestamps.
- Privacy-preserving visitor identifiers used for unique estimates.
- Critiques and their read state.

PDF bytes remain in UploadThing. The owner credential remains in server environment
configuration, and browser sessions remain stateless. Share secrets must never be
stored in plaintext.

## Security and privacy

- Keep owner-auth, UploadThing, key-value, and ingestion secrets on the server.
- Use secure, HTTP-only, same-site cookies where applicable.
- Rate limit share-link validation, ingestion, and critique submission.
- Do not include share secrets in analytics events or application logs.
- Use short-lived signed PDF URLs.
- A revoked share link must stop producing signed PDF URLs immediately.
- Validate all API inputs and outputs at runtime.
- Provide a documented retention and deletion policy before production use.

## Local acceptance gate

Every implementation change must pass:

```bash
bun install --frozen-lockfile
bun run ci
```

The gate includes formatting, Oxlint, typed ESLint, Next.js route generation,
strict TypeScript, unit tests, a production dependency audit, and a production
build.

## V1 non-goals

- MCP server.
- Public paper pages.
- Recipient accounts or verified recipient identity.
- Download prevention through DRM.
- Full-text search or OCR.
- Citation extraction.
- Custom paper metadata.
- Public comment threads or recipient-to-recipient discussion.
- Multiple isolated owner libraries.
- Individually managed agent credentials.
