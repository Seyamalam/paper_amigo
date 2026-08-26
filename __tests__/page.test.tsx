import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { PaperLibrary } from "@/components/paper-amigo/paper-library"
import type { Paper } from "@/lib/papers"

const paper: Paper = {
  id: "hash",
  fileName: "paper.pdf",
  size: "1 MB",
  uploadedAt: "26 Aug 2026",
  shareCount: 0,
  critiqueCount: 0,
}

afterEach(cleanup)

describe("Page", () => {
  it("renders the research library", () => {
    render(<PaperLibrary papers={[paper]} />)

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Papers",
      })
    ).toBeDefined()
    expect(
      screen.getByRole("searchbox", { name: "Search papers" })
    ).toBeDefined()
    expect(screen.getAllByRole("article")).toHaveLength(1)
  })

  it("renders an empty library without seeded records", () => {
    render(<PaperLibrary papers={[]} />)

    expect(screen.getByText("No papers")).toBeDefined()
    expect(screen.queryAllByRole("article")).toHaveLength(0)
  })
})
