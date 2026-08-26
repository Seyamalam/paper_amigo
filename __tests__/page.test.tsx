import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { PaperLibrary } from "@/components/paper-amigo/paper-library"
import { papers } from "@/lib/papers"

afterEach(cleanup)

describe("Page", () => {
  it("renders the research library", () => {
    render(<PaperLibrary papers={papers} showPreviewNotice />)

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Papers",
      })
    ).toBeDefined()
    expect(
      screen.getByRole("searchbox", { name: "Search papers" })
    ).toBeDefined()
    expect(screen.getAllByRole("article")).toHaveLength(6)
  })
})
