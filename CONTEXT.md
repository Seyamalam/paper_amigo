# Paper Amigo

Paper Amigo is a research-project library. It lets an owner group PDFs and
researcher details into projects, share projects with labeled recipients, and
receive private critiques.

## Language

**Project**:
A titled research work with a description, one or more authors, and one or more
PDF files.
_Avoid_: Paper, item, folder

**Project file**:
A PDF attached to exactly one project.
_Avoid_: Paper, document, attachment

**Author**:
A project contributor identified by name, designation, and university, with an
optional ORCID iD and profile URL.
_Avoid_: User, owner, recipient

**Library**:
The owner's complete collection of projects.
_Avoid_: Repository, archive, folder

**Owner**:
A person authenticated with the configured owner email and password who can manage
the library, sharing, and critiques.
_Avoid_: Admin, user

**Ingestion**:
The act of creating a project and attaching one or more project files from a
local filesystem.
_Avoid_: Import, sync

**Replacement**:
Substituting one project file with a newer PDF. The prior file stops being part
of the project, while the project and its share links remain the same.
_Avoid_: Edit, overwrite

**Share link**:
A revocable secret link that grants recipient access to one project.
_Avoid_: Public link, download link

**Recipient label**:
The owner's private name for the intended recipient of a share link. It identifies
the link's purpose, not the person who actually opens it.
_Avoid_: Recipient identity, account

**Recipient**:
A person who possesses a valid share link and can view its project files without
signing in.
_Avoid_: Guest, anonymous user

**View**:
A successful recipient access to a project through a share link.
_Avoid_: Click, impression

**Estimated unique visitor**:
A browser-level estimate of distinct recipients based on a privacy-preserving
identifier. It is not proof of a person's identity.
_Avoid_: Unique person, verified viewer

**Critique**:
Private feedback that a recipient submits to the owner about one project file.
_Avoid_: Public comment, review
