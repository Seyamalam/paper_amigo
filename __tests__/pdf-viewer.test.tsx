import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PdfViewer, type PdfLoader } from "@/components/paper-amigo/pdf-viewer"

const readyLoader: PdfLoader = () =>
  Promise.resolve({
    destroy: () => Promise.resolve(),
    getPage: () =>
      Promise.resolve({
        getSize: () => ({ height: 792, width: 612 }),
        render: () => ({
          cancel: () => undefined,
          promise: Promise.resolve(),
        }),
      }),
    numPages: 3,
  })

describe("PdfViewer", () => {
  it("renders every page as an in-app scrolling canvas", async () => {
    const { container, unmount } = render(
      <PdfViewer
        url="https://paper-amigo.ufs.sh/f/paper-key"
        name="paper.pdf"
        loader={readyLoader}
      />
    )

    expect(screen.getByRole("region", { name: "PDF preview" })).not.toBeNull()
    await screen.findByLabelText("PDF page 1")
    expect(container.querySelectorAll("canvas")).toHaveLength(3)
    expect(container.querySelector("object, iframe, embed")).toBeNull()
    unmount()
  })

  it("fits a whole page by default and offers width and full-page modes", async () => {
    const { unmount } = render(
      <PdfViewer
        url="https://paper-amigo.ufs.sh/f/paper-key"
        name="paper.pdf"
        loader={readyLoader}
      />
    )

    const viewer = screen.getByRole("region", { name: "PDF preview" })
    const fitPage = await screen.findByRole("button", {
      name: "Fit whole PDF page",
    })

    expect(viewer.getAttribute("data-fit")).toBe("page")
    expect(fitPage.getAttribute("aria-pressed")).toBe("true")

    fireEvent.click(
      screen.getByRole("button", { name: "Fit PDF to viewer width" })
    )
    expect(viewer.getAttribute("data-fit")).toBe("width")

    fireEvent.click(
      screen.getByRole("button", { name: "Open full-page PDF viewer" })
    )
    expect(viewer.getAttribute("data-expanded")).toBe("true")
    expect(document.body.style.overflow).toBe("hidden")

    fireEvent.keyDown(window, { key: "Escape" })
    await waitFor(() => {
      expect(viewer.getAttribute("data-expanded")).toBe("false")
    })
    expect(document.body.style.overflow).toBe("")
    unmount()
  })
})
