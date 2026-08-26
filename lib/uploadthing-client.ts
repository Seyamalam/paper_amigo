import { generateReactHelpers } from "@uploadthing/react"

import type { PaperFileRouter } from "@/app/api/uploadthing/core"

export const { uploadFiles } = generateReactHelpers<PaperFileRouter>()
