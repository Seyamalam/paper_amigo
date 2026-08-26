# Changelog

This file records notable changes to Paper Amigo. Releases follow
[Semantic Versioning](https://semver.org/), and commit messages follow
[Conventional Commits](https://www.conventionalcommits.org/).

## Unreleased

## 0.1.0 (2026-08-26)

### Features

- Add projects with titles, descriptions, structured authors, optional ORCID and
  profile links, and multiple PDF files.
- Add an owner-authenticated CLI for project creation and listing, recursive PDF
  discovery, duplicate detection, and direct uploads.
- Add macOS Keychain-backed CLI login, update, and logout commands.
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
