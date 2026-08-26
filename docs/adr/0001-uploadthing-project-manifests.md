# Store project manifests in UploadThing

Paper Amigo has no database, but projects need durable metadata and references to
several PDFs. Store each project as a small versioned JSON manifest in
UploadThing alongside its `public-read` PDF files, then delete the previous
manifest only after the replacement uploads successfully. This keeps the
no-database constraint and works on UploadThing's free tier, at the cost of
public object URLs and slower project listing than an indexed database.
