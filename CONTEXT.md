# Paper Amigo

Paper Amigo is a private research-paper library. It lets an owner collect papers,
share individual papers with labeled recipients, and receive private critiques.

## Language

**Paper**:
A research PDF held in the library.
_Avoid_: Document, file, item

**Library**:
The owner's complete collection of papers.
_Avoid_: Repository, archive, folder

**Owner**:
A Google-authenticated person allowed to manage the library, sharing, and critiques.
_Avoid_: Admin, user

**Ingestion**:
The act of adding one or more papers from a local filesystem to the library.
_Avoid_: Import, sync

**Share link**:
A revocable secret link that grants recipient access to one paper.
_Avoid_: Public link, download link

**Recipient label**:
The owner's private name for the intended recipient of a share link. It identifies
the link's purpose, not the person who actually opens it.
_Avoid_: Recipient identity, account

**Recipient**:
A person who possesses a valid share link and can view its paper without signing in.
_Avoid_: Guest, anonymous user

**View**:
A successful recipient access to a paper through a share link.
_Avoid_: Click, impression

**Estimated unique visitor**:
A browser-level estimate of distinct recipients based on a privacy-preserving
identifier. It is not proof of a person's identity.
_Avoid_: Unique person, verified viewer

**Critique**:
Private feedback that a recipient submits to the owner about a shared paper.
_Avoid_: Public comment, review
