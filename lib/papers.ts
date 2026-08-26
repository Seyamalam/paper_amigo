export type Paper = Readonly<{
  id: string
  fileName: string
  size: string
  uploadedAt: string
  shareCount: number
  critiqueCount: number
}>

export type ShareLink = Readonly<{
  id: string
  paperId: string
  label: string
  status: "active" | "expires-soon" | "revoked"
  views: number
  visitors: number
  lastOpened: string
  expires: string
}>

export type Critique = Readonly<{
  id: string
  paperId: string
  author: string
  linkLabel: string
  page: number
  excerpt: string
  receivedAt: string
  unread: boolean
}>

export const papers: readonly Paper[] = [
  {
    id: "neural-operators",
    fileName: "neural-operators-for-pde-surrogates.pdf",
    size: "8.4 MB",
    uploadedAt: "Aug 24, 2026",
    shareCount: 3,
    critiqueCount: 5,
  },
  {
    id: "diffusion-policy",
    fileName: "diffusion-policy-visuomotor-learning.pdf",
    size: "14.1 MB",
    uploadedAt: "Aug 21, 2026",
    shareCount: 1,
    critiqueCount: 2,
  },
  {
    id: "constitutional-ai",
    fileName: "constitutional-ai-harmlessness-from-ai-feedback.pdf",
    size: "3.7 MB",
    uploadedAt: "Aug 18, 2026",
    shareCount: 2,
    critiqueCount: 0,
  },
  {
    id: "attention-heads",
    fileName: "interpreting-specialized-attention-heads.pdf",
    size: "6.2 MB",
    uploadedAt: "Aug 14, 2026",
    shareCount: 0,
    critiqueCount: 1,
  },
  {
    id: "mechanistic-anomaly",
    fileName: "mechanistic-anomaly-detection-transformers.pdf",
    size: "11.9 MB",
    uploadedAt: "Aug 09, 2026",
    shareCount: 2,
    critiqueCount: 3,
  },
  {
    id: "retrieval-context",
    fileName: "retrieval-augmented-long-context-reasoning.pdf",
    size: "4.8 MB",
    uploadedAt: "Aug 02, 2026",
    shareCount: 1,
    critiqueCount: 0,
  },
]

export const shareLinks: readonly ShareLink[] = [
  {
    id: "lab-review",
    paperId: "neural-operators",
    label: "Lab review group",
    status: "active",
    views: 18,
    visitors: 6,
    lastOpened: "12 min ago",
    expires: "Sep 12, 2026",
  },
  {
    id: "professor-rahman",
    paperId: "diffusion-policy",
    label: "Professor Rahman",
    status: "expires-soon",
    views: 7,
    visitors: 2,
    lastOpened: "Yesterday",
    expires: "Aug 29, 2026",
  },
  {
    id: "reading-circle",
    paperId: "mechanistic-anomaly",
    label: "Reading circle — week 34",
    status: "active",
    views: 31,
    visitors: 11,
    lastOpened: "2 days ago",
    expires: "No expiry",
  },
]

export const critiques: readonly Critique[] = [
  {
    id: "critique-1",
    paperId: "neural-operators",
    author: "Mira K.",
    linkLabel: "Lab review group",
    page: 7,
    excerpt:
      "The boundary-condition comparison needs a stronger baseline. Could the same gain come from the sampling schedule?",
    receivedAt: "18 min ago",
    unread: true,
  },
  {
    id: "critique-2",
    paperId: "diffusion-policy",
    author: "A. Rahman",
    linkLabel: "Professor Rahman",
    page: 12,
    excerpt:
      "Please separate the latency introduced by receding-horizon inference from the policy network itself.",
    receivedAt: "Yesterday",
    unread: true,
  },
  {
    id: "critique-3",
    paperId: "mechanistic-anomaly",
    author: "Jon Bell",
    linkLabel: "Reading circle — week 34",
    page: 4,
    excerpt:
      "The probe is compelling, though the threshold selection seems sensitive to the clean reference distribution.",
    receivedAt: "Aug 23",
    unread: false,
  },
]

export function getPaper(paperId: string): Paper | undefined {
  return papers.find((paper) => paper.id === paperId)
}
