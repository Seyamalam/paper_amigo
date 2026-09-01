# Changelog

This file records notable changes to Paper Amigo. Releases follow
[Semantic Versioning](https://semver.org/), and commit messages follow
[Conventional Commits](https://www.conventionalcommits.org/).

## Unreleased

### Features

- Add continuous, full-page PDF viewing with an explicit download action.
- Add an authenticated CLI command for appending PDFs to existing projects up
  to the ten-file limit.
- Add `paper-amigo update` for safely fast-forwarding a linked CLI checkout.

## 0.5.0 (2026-08-27)

### Features

- Add Convex as the transactional store for projects, authors, PDF metadata,
  share links, view analytics, unique visitors, and critiques.
- Preserve existing project IDs, share tokens, analytics, critiques, and
  UploadThing PDF keys through an idempotent migration.
- Add bounded background cleanup for deleted project records.

### Changed

- Keep only public-read PDF bytes in UploadThing; structured data now lives in
  Convex.
- Add an authenticated server-to-server boundary between Next.js and Convex.
- Add in-memory Convex tests for authorization, projects, analytics, critique
  rate limits, and scheduled deletion.

## 0.4.0 (2026-08-27)

### Features

- Add exact-title-confirmed project deletion to the owner UI and CLI.
- Remove attached PDFs, manifest revisions, share links, views, and critiques
  when deleting a project.
- Add an authenticated, retry-safe project deletion API.

## 0.3.0 (2026-08-27)

### Features

- Add an authenticated project-file replacement API and CLI command.
- Preserve project file order and existing share links when replacing a PDF.
- Add a responsive PDF.js canvas viewer with built-in page navigation.

### Fixed

- Replace browser PDF-plugin embeds that failed to preview on some browsers and
  mobile devices.

## 0.2.0 (2026-08-27)

### Features

- Add unauthenticated labeled share links for projects.
- Add per-PDF recipient comments with optional page numbers and email addresses.
- Track total share-link views and estimated unique browsers.
- Add owner dashboards for share links and critiques.

### Security

- Encrypt append-only share, view, and critique records stored in public-read
  UploadThing storage.

## 0.1.0 (2026-08-26)

### Features

- Add projects with titles, descriptions, structured authors, optional ORCID and
  profile links, and multiple PDF files.
- Add an owner-authenticated CLI for project creation and listing, recursive PDF
  discovery, duplicate detection, and direct uploads.
- Add macOS Keychain-backed CLI login and logout commands.
- Add an agent skill that uses the CLI for project ingestion.

### Changed

- Remove seeded papers, share links, critiques, and the public demo review.
- Use public-read UploadThing storage and versioned project manifests without a
  database.

## 0.0.1 (2026-08-26)

### Features

- Add the initial Next.js application.
- Add private UploadThing PDF uploads, SHA-256 duplicate checks, storage-backed
  library listing, and owner PDF previews.
- Accept any non-empty configured owner password.
