import { redirect } from "next/navigation"

export default async function PaperPage({
  params,
}: PageProps<"/papers/[paperId]">) {
  const { paperId } = await params
  redirect(`/projects/${paperId}`)
}
