import { z } from "zod"

export const maxProjectFiles = 10

const requiredText = (label: string, maximum: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(maximum, `${label} is too long`)

export const orcidSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{4}-\d{4}-[\dX]{4}$/u, "Invalid ORCID iD")

export const projectAuthorSchema = z.object({
  name: requiredText("Author name", 160),
  designation: requiredText("Designation", 160),
  university: requiredText("University", 240),
  orcid: orcidSchema.optional(),
  profileUrl: z.url("Invalid profile URL").max(2_048).optional(),
})

export const projectFileSchema = z.object({
  key: z.string().min(1).max(512),
  hash: z.string().regex(/^[a-f\d]{64}$/u, "Invalid PDF hash"),
  name: z.string().trim().min(1).max(255),
  size: z.number().int().positive(),
  uploadedAt: z.iso.datetime(),
  url: z.url(),
})

export const uploadedProjectFileSchema = projectFileSchema.omit({
  uploadedAt: true,
})

export const createProjectInputSchema = z.object({
  id: z.uuid(),
  title: requiredText("Title", 240),
  description: requiredText("Description", 10_000),
  authors: z.array(projectAuthorSchema).min(1).max(50),
  files: z.array(uploadedProjectFileSchema).min(1).max(maxProjectFiles),
})

export const appendProjectFilesInputSchema = z.object({
  files: z.array(uploadedProjectFileSchema).min(1).max(maxProjectFiles),
})

export const replaceProjectFileInputSchema = z.object({
  file: uploadedProjectFileSchema,
})

export const deleteProjectInputSchema = z.object({
  confirmation: requiredText("Project title confirmation", 240),
})

export const projectSchema = createProjectInputSchema
  .omit({ files: true })
  .extend({
    schemaVersion: z.literal(1),
    files: z.array(projectFileSchema).min(1).max(maxProjectFiles),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })

export const projectsResponseSchema = z.object({
  projects: z.array(projectSchema),
})

export const replaceProjectFileResponseSchema = z.object({
  project: projectSchema,
  previousFileDeleted: z.boolean(),
})

export const appendProjectFilesResponseSchema = z.object({
  project: projectSchema,
})

export const deleteProjectResponseSchema = z.object({
  deleted: z.boolean(),
  deletedManifests: z.number().int().nonnegative(),
  deletedProjectFiles: z.number().int().nonnegative(),
  deletedSharingRecords: z.number().int().nonnegative(),
  projectId: z.uuid(),
})

export function withReplacedProjectFile(
  project: Project,
  targetFileKey: string,
  replacement: UploadedProjectFile,
  uploadedAt: string,
  updatedAt: string
): Project {
  if (!project.files.some((file) => file.key === targetFileKey)) {
    throw new Error("Project file not found")
  }

  return projectSchema.parse({
    ...project,
    files: project.files.map((file) =>
      file.key === targetFileKey ? { ...replacement, uploadedAt } : file
    ),
    updatedAt,
  })
}

export function withAppendedProjectFiles(
  project: Project,
  files: readonly UploadedProjectFile[],
  uploadedAtByKey: ReadonlyMap<string, string>,
  updatedAt: string
): Project {
  return projectSchema.parse({
    ...project,
    files: [
      ...project.files,
      ...files.map((file) => ({
        ...file,
        uploadedAt: uploadedAtByKey.get(file.key),
      })),
    ],
    updatedAt,
  })
}

export type ProjectAuthor = z.infer<typeof projectAuthorSchema>
export type ProjectFile = z.infer<typeof projectFileSchema>
export type UploadedProjectFile = z.infer<typeof uploadedProjectFileSchema>
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>
export type AppendProjectFilesInput = z.infer<
  typeof appendProjectFilesInputSchema
>
export type AppendProjectFilesResponse = z.infer<
  typeof appendProjectFilesResponseSchema
>
export type ReplaceProjectFileInput = z.infer<
  typeof replaceProjectFileInputSchema
>
export type ReplaceProjectFileResponse = z.infer<
  typeof replaceProjectFileResponseSchema
>
export type DeleteProjectInput = z.infer<typeof deleteProjectInputSchema>
export type DeleteProjectResponse = z.infer<typeof deleteProjectResponseSchema>
export type Project = z.infer<typeof projectSchema>
