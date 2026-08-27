# Encrypt sharing events in public-read storage

Status: Superseded by ADR-0003

Paper Amigo stores share links, views, and critiques as append-only UploadThing
objects because the product has no database and the selected storage tier is
public-read. The server encrypts every record with a key derived from
`BETTER_AUTH_SECRET`, so public object URLs expose ciphertext rather than labels,
visitor identifiers, or critique text. Rotating that secret makes existing
sharing records unreadable and invalidates existing share links.
