import { CheckCircle2, FileUp, LockKeyhole } from "lucide-react"

import { PageHeading } from "@/components/paper-amigo/page-heading"
import { PaperUploadQueue } from "@/components/paper-amigo/paper-upload-queue"
import { isPaperStorageConfigured } from "@/lib/paper-storage"

const checks: readonly string[] = [
  "PDF files only, up to 64 MB each",
  "SHA-256 duplicate detection before upload",
  "Direct transfer to private storage",
]

export default function UploadPage() {
  const storageConfigured = isPaperStorageConfigured()

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow={
          storageConfigured ? "Private storage" : "Storage not connected"
        }
        title="Upload papers"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(17rem,0.75fr)]">
        <section
          className="border bg-card p-5 sm:p-8"
          aria-labelledby="browser-upload-heading"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center bg-foreground text-background">
              <FileUp aria-hidden="true" className="size-4" />
            </span>
            <div>
              <h2 id="browser-upload-heading" className="font-semibold">
                Browser upload
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {storageConfigured ? "PDF only" : "UploadThing not connected"}
              </p>
            </div>
          </div>

          <PaperUploadQueue enabled={storageConfigured} />
        </section>

        <aside className="space-y-5">
          <section className="border bg-foreground p-5 text-background">
            <p className="font-mono text-[9px] tracking-[0.12em] uppercase opacity-60">
              CLI
            </p>
            <h2 className="mt-3 text-lg font-semibold">Upload a folder</h2>
            <pre className="mt-5 overflow-x-auto border border-background/30 p-3 font-mono text-[11px] leading-5">
              <code>paper-amigo upload ./papers --recursive</code>
            </pre>
            <p className="mt-4 text-xs leading-5 opacity-60">
              The agent skill runs this command and reads its JSON result.
            </p>
          </section>

          <section className="border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <LockKeyhole aria-hidden="true" className="size-4" />
              Ingestion guarantees
            </div>
            <ul className="mt-4 space-y-3">
              {checks.map((check) => (
                <li
                  key={check}
                  className="flex gap-2.5 text-xs leading-5 text-muted-foreground"
                >
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0"
                  />
                  {check}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
