---
name: paper-amigo
description: Create and list Paper Amigo research projects from local PDF files using the installed owner-authenticated CLI.
---

# Paper Amigo

Use the `paper-amigo` CLI for all Paper Amigo project operations. Do not call
UploadThing directly or request, read, or print owner credentials.

## Before creating a project

1. Confirm `paper-amigo` is on `PATH`.
2. Run `paper-amigo doctor --json` when login or server configuration is
   uncertain. If it reports missing credentials, ask the user to run
   `paper-amigo login` themselves.
3. Resolve only the PDF paths or directories the user placed in scope.
4. Collect a title, description, and at least one author. Each author requires a
   name, designation, and university. ORCID iD and profile URL are optional.

For large or recursive selections, run the exact create command with
`--dry-run --json` first and report any rejected paths before uploading.

## Create

```bash
paper-amigo project create <path...> \
  --title "Project title" \
  --description "Project description" \
  --author "Name|Designation|University|ORCID|Profile URL" \
  --json
```

Repeat `--author` for multiple authors. Leave optional positions empty while
retaining separators, for example:

```text
Name|Designation|University||https://example.edu/profile
```

Use `--recursive` for nested directories and `--concurrency <1-8>` only when a
different upload concurrency is useful. One command creates one project and may
attach up to ten PDFs.

Treat a nonzero exit as failure. Report `uploaded`, `skipped`, and `failed`
entries from JSON output. Do not retry validation, duplicate, authentication, or
usage errors. A network or storage failure may be retried once after confirming
the project was not created.

## List

```bash
paper-amigo project list --json
```

Use the returned project IDs and metadata as the source of truth.
