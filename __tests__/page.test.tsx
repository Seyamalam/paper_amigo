import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import Page from "@/app/(workspace)/page"

afterEach(cleanup)

describe("Page", () => {
  it("renders the research library", () => {
    render(<Page />)

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
