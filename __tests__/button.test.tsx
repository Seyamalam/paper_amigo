import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Button } from "@/components/ui/button"

afterEach(cleanup)

describe("Button", () => {
  it("renders a button with variant and caller classes", () => {
    render(
      <Button className="custom-class" variant="secondary">
        Save
      </Button>
    )

    const button = screen.getByRole("button", { name: "Save" })
    expect(button.dataset["variant"]).toBe("secondary")
    expect(button.classList.contains("custom-class")).toBe(true)
  })

  it("can pass its behavior to a child element", () => {
    render(
      <Button asChild>
        <a href="https://example.com/docs">Read the docs</a>
      </Button>
    )

    expect(screen.getByRole("link", { name: "Read the docs" })).toHaveProperty(
      "pathname",
      "/docs"
    )
  })
})
