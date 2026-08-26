import { FilePlus2 } from "lucide-react"

import { PageHeading } from "@/components/paper-amigo/page-heading"
import { ProjectCreateForm } from "@/components/paper-amigo/project-create-form"
import { isProjectStorageConfigured } from "@/lib/project-storage"

export default function UploadPage() {
  const storageConfigured = isProjectStorageConfigured()

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow={
          storageConfigured ? "Public PDF storage" : "Storage not connected"
        }
        title="Create project"
      />

      <section
        className="border bg-card p-5 sm:p-8"
        aria-labelledby="create-heading"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center bg-foreground text-background">
            <FilePlus2 aria-hidden="true" className="size-4" />
          </span>
          <div>
            <h2 id="create-heading" className="font-semibold">
              Project details
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {storageConfigured
                ? "PDF files are public-read"
                : "UploadThing not connected"}
            </p>
          </div>
        </div>

        <div className="mt-7">
          <ProjectCreateForm enabled={storageConfigured} />
        </div>
      </section>
    </div>
  )
}
