---
name: paper-amigo
description: Create, list, replace files in, and permanently delete Paper Amigo research projects using the installed owner-authenticated CLI.
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

## Replace a project file

List projects first when the project ID, filename, or storage key is uncertain:

```bash
paper-amigo project list --json
```

Replace exactly one current project file with one local PDF:

```bash
paper-amigo project replace <project-id> <current-file-name-or-key> \
  <replacement.pdf> --json
```

The selector accepts an exact filename or storage key. If a project contains
duplicate filenames, use the key returned by `project list`. The command rejects
an identical PDF and PDF content already present anywhere in the library.

Treat `replacement-status-unknown` specially: run `project list --json` and
inspect the target project before retrying. A timed-out request may already have
committed the replacement. Do not upload or delete files through UploadThing
directly.

## Delete a project

Deletion is permanent. It removes the project's PDFs, metadata, share links,
views, and critiques. Only run deletion when the user explicitly
requests removal of the identified project; a request to add or explain the
capability is not authorization to delete live data.

List projects first and use the returned title as the confirmation:

```bash
paper-amigo project list --json
paper-amigo project delete <project-id> --confirm "Exact project title" --json
```

Do not weaken or infer the exact-title confirmation. Treat
`deletion-status-unknown` specially: run `project list --json` and confirm the
project is still present before retrying. Do not delete files or records through
UploadThing directly.
