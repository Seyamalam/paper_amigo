import { ProjectLibrary } from "@/components/paper-amigo/project-library"
import { getProjectLibrary } from "@/lib/project-storage"

export default async function Page() {
  const library = await getProjectLibrary()

  return <ProjectLibrary projects={library.projects} />
}
