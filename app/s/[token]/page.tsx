import { notFound } from "next/navigation"

export default async function SharedPaperPage({
  params,
}: PageProps<"/s/[token]">) {
  await params
  notFound()
}
