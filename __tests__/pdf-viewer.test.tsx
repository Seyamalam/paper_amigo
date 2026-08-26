import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PdfViewer, type PdfLoader } from "@/components/paper-amigo/pdf-viewer"

const pendingLoader: PdfLoader = () => new Promise(() => undefined)

describe("PdfViewer", () => {
  it("uses an in-app canvas instead of a browser PDF plugin", () => {
    const { container } = render(
      <PdfViewer
        url="https://paper-amigo.ufs.sh/f/paper-key"
        name="paper.pdf"
        loader={pendingLoader}
      />
    )

    expect(screen.getByRole("region", { name: "PDF preview" })).not.toBeNull()
    expect(container.querySelector("canvas")).not.toBeNull()
    expect(container.querySelector("object, iframe, embed")).toBeNull()
  })
})
