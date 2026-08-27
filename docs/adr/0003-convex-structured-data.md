# Store structured data in Convex and PDF bytes in UploadThing

Status: Accepted

## Context

UploadThing object manifests and encrypted append-only events made project reads
slow, forced full object listings for common queries, and made aggregate updates
and bounded deletion difficult. Paper Amigo needs indexed projects, multi-file
metadata, labeled share links, open tracking, unique-browser estimates, and
critiques. The selected UploadThing tier remains public-read and is suitable for
PDF bytes, but not as the application's query layer.

## Decision

Convex is the system of record for projects, authors, PDF metadata, share links,
view events, distinct visitor hashes, and critiques. Existing public project UUIDs,
share-link UUIDs, token hashes, event UUIDs, and UploadThing file keys are retained
during migration so existing project and secret-link URLs remain stable.

PDF bytes remain in UploadThing with `public-read` ACL. The Next.js server is the
only Convex client: owner and public-link authorization stay in the existing
backend-for-frontend routes, and every public Convex function also requires a
server-only service credential. Convex functions use indexed, bounded reads.
Project deletion hides the project transactionally and schedules bounded cleanup
of dependent records after its PDF objects have been removed.

## Consequences

Project and sharing reads are indexed and updates are transactional. Share view
totals and distinct-browser counts are maintained when events are inserted rather
than recomputed by scanning all events. UploadThing contains only PDFs after the
legacy migration is verified and cleaned up.

Deployments now require a Convex deployment URL and a matching service credential
in both Vercel and Convex. The application still cannot prevent recipients from
saving public-read PDF URLs. Cross-provider PDF replacement and deletion remain
ordered operations and may require an idempotent retry after a network failure.
