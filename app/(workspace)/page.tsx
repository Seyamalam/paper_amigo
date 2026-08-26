import { PaperLibrary } from "@/components/paper-amigo/paper-library"
import { getPaperLibrary } from "@/lib/paper-storage"

export default async function Page() {
  const library = await getPaperLibrary()

  return <PaperLibrary papers={library.papers} />
}
