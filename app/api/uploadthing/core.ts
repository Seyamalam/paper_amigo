import { UploadThingError } from "uploadthing/server"
import { createUploadthing, UTFiles, type FileRouter } from "uploadthing/next"

import type { OwnerAccess } from "@/lib/owner-access"
import { getOwnerRequestAccess } from "@/lib/owner-request-access"
import {
  findDuplicatePaperHashes,
  isPaperStorageConfigured,
} from "@/lib/paper-storage"
import { paperUploadInputSchema } from "@/lib/paper-upload"

const uploadThing = createUploadthing()

function isGrantedAccess(
  access: OwnerAccess
): access is Extract<OwnerAccess, { kind: "demo" } | { kind: "owner" }> {
  return access.kind === "demo" || access.kind === "owner"
}

function rejectUpload(
  code: "BAD_REQUEST" | "FORBIDDEN" | "MISSING_ENV",
  message: string
): never {
  // UploadThing uses an Effect error class that its handler serializes.
  throw new UploadThingError({ code, message })
}

export const paperFileRouter = {
  paperPdf: uploadThing({
    pdf: {
      acl: "public-read",
      contentDisposition: "inline",
      maxFileCount: 10,
      maxFileSize: "64MB",
    },
  })
    .input(paperUploadInputSchema)
    .middleware(async ({ files, input, req }) => {
      const access = await getOwnerRequestAccess(req)

      if (!isGrantedAccess(access)) {
        rejectUpload("FORBIDDEN", "Sign in required")
      }

      if (!isPaperStorageConfigured()) {
        rejectUpload("MISSING_ENV", "UploadThing is not configured")
      }

      if (
        files.length !== input.hashes.length ||
        new Set(input.hashes).size !== input.hashes.length
      ) {
        rejectUpload("BAD_REQUEST", "Each PDF needs one unique SHA-256 hash")
      }

      const duplicates = await findDuplicatePaperHashes(input.hashes)

      if (duplicates.length > 0) {
        rejectUpload("BAD_REQUEST", "A selected PDF is already in the library")
      }

      const filesWithIds = files.map((file, index) => {
        const customId = input.hashes[index]

        if (!customId) {
          rejectUpload("BAD_REQUEST", "Missing PDF hash")
        }

        return {
          customId,
          lastModified: file.lastModified,
          name: file.name,
          size: file.size,
          type: file.type,
        }
      })

      return {
        owner: access.kind === "owner" ? access.email : "demo",
        [UTFiles]: filesWithIds,
      }
    })
    .onUploadComplete(({ file }) => ({
      id: file.customId ?? file.key,
      name: file.name,
    })),
} satisfies FileRouter

export type PaperFileRouter = typeof paperFileRouter
