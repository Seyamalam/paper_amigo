import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import Page from "@/app/page"

afterEach(cleanup)

describe("Page", () => {
  it("renders the starter heading and button", () => {
    render(<Page />)

    expect(
      screen.getByRole("heading", { level: 1, name: "Project ready!" })
    ).toBeDefined()
    expect(screen.getByRole("button", { name: "Button" })).toBeDefined()
  })
})
