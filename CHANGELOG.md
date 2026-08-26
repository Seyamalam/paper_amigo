# Changelog

This file records notable changes to Paper Amigo. Releases follow
[Semantic Versioning](https://semver.org/), and commit messages follow
[Conventional Commits](https://www.conventionalcommits.org/).

## Unreleased

### Features

- Add an owner-authenticated CLI for diagnostics, listing, recursive PDF
  discovery, duplicate detection, and direct private uploads.
- Add macOS Keychain-backed CLI login, update, and logout commands.

### Changed

- Remove seeded papers, share links, critiques, and the public demo review.

## 0.0.1 (2026-08-26)

### Features

- Add the initial Next.js application.
- Add private UploadThing PDF uploads, SHA-256 duplicate checks, storage-backed
  library listing, and owner PDF previews.
- Accept any non-empty configured owner password.
