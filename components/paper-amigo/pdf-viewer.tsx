"use client"

import { useEffect, useRef, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  FileWarning,
  LoaderCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"

const workerSource = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

type PdfPageSize = Readonly<{ height: number; width: number }>

type PdfRenderTask = Readonly<{
  cancel: () => void
  promise: Promise<void>
}>

type PdfPage = Readonly<{
  getSize: () => PdfPageSize
  render: (canvas: HTMLCanvasElement, scale: number) => PdfRenderTask
}>

export type PdfDocument = Readonly<{
  destroy: () => Promise<void>
  getPage: (pageNumber: number) => Promise<PdfPage>
  numPages: number
}>

export type PdfLoader = (url: string) => Promise<PdfDocument>

type ViewerState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "ready"; document: PdfDocument }>
  | Readonly<{ kind: "error" }>

async function loadPdfDocument(url: string): Promise<PdfDocument> {
  const pdfjs = await import("pdfjs-dist")
  pdfjs.GlobalWorkerOptions.workerSrc = workerSource
  const document = await pdfjs.getDocument({ url }).promise

  return {
    destroy: () => document.destroy(),
    getPage: async (pageNumber) => {
      const page = await document.getPage(pageNumber)

      return {
        getSize: () => {
          const viewport = page.getViewport({ scale: 1 })

          return { height: viewport.height, width: viewport.width }
        },
        render: (canvas, scale) =>
          page.render({
            canvas,
            // Display intent may wait indefinitely for animation frames in a
            // background tab. Print intent renders the same page deterministically.
            intent: "print",
            viewport: page.getViewport({ scale }),
          }),
      }
    },
    numPages: document.numPages,
  }
}

export function PdfViewer({
  url,
  name,
  loader = loadPdfDocument,
}: Readonly<{ url: string; name: string; loader?: PdfLoader }>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [viewer, setViewer] = useState<ViewerState>({ kind: "loading" })
  const [rendering, setRendering] = useState(true)

  useEffect(() => {
    let disposed = false
    let loadedDocument: PdfDocument | undefined

    async function load(): Promise<void> {
      setViewer({ kind: "loading" })
      setPageNumber(1)
      setRendering(true)

      try {
        loadedDocument = await loader(url)

        if (disposed) {
          await loadedDocument.destroy()
          return
        }

        setViewer({ kind: "ready", document: loadedDocument })
      } catch {
        if (!disposed) {
          setViewer({ kind: "error" })
          setRendering(false)
        }
      }
    }

    void load()

    return () => {
      disposed = true
      if (loadedDocument) {
        void loadedDocument.destroy()
      }
    }
  }, [loader, url])

  useEffect(() => {
    if (viewer.kind !== "ready") {
      return undefined
    }

    const canvas = canvasRef.current
    const pageContainer = pageRef.current

    if (!canvas || !pageContainer) {
      return undefined
    }

    const pdfDocument = viewer.document
    const renderCanvas = canvas
    const renderContainer = pageContainer

    const renderController = new AbortController()
    let renderTask: PdfRenderTask | undefined
    let renderSequence = 0

    async function renderPage(): Promise<void> {
      const sequence = ++renderSequence
      renderTask?.cancel()
      setRendering(true)

      try {
        const page = await pdfDocument.getPage(pageNumber)
        const naturalSize = page.getSize()
        const availableWidth = Math.max(renderContainer.clientWidth - 32, 1)
        const displayScale = Math.min(availableWidth / naturalSize.width, 2)
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
        const renderScale = displayScale * pixelRatio
        const displayWidth = naturalSize.width * displayScale
        const displayHeight = naturalSize.height * displayScale

        if (renderController.signal.aborted || sequence !== renderSequence) {
          return
        }

        renderCanvas.width = Math.ceil(naturalSize.width * renderScale)
        renderCanvas.height = Math.ceil(naturalSize.height * renderScale)
        renderCanvas.style.width = `${String(Math.ceil(displayWidth))}px`
        renderCanvas.style.height = `${String(Math.ceil(displayHeight))}px`
        const currentRender = page.render(renderCanvas, renderScale)
        renderTask = currentRender
        await currentRender.promise

        setRendering(false)
      } catch (error) {
        if (
          !renderController.signal.aborted &&
          (!(error instanceof Error) ||
            error.name !== "RenderingCancelledException")
        ) {
          setViewer({ kind: "error" })
          setRendering(false)
        }
      }
    }

    function handleResize(): void {
      void renderPage()
    }

    window.addEventListener("resize", handleResize)
    void renderPage()

    return () => {
      renderController.abort()
      renderTask?.cancel()
      window.removeEventListener("resize", handleResize)
    }
  }, [pageNumber, viewer])

  const pageCount = viewer.kind === "ready" ? viewer.document.numPages : 0

  return (
    <section
      aria-label="PDF preview"
      className="border bg-neutral-100 dark:bg-neutral-950"
    >
      <div className="flex h-11 items-center justify-between gap-3 border-b bg-background px-3">
        <p className="truncate font-mono text-[10px]">{name}</p>
        {viewer.kind === "ready" ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Previous PDF page"
              disabled={pageNumber <= 1 || rendering}
              onClick={() => {
                setPageNumber((current) => Math.max(1, current - 1))
              }}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="min-w-16 text-center font-mono text-[10px]">
              {pageNumber} / {pageCount}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Next PDF page"
              disabled={pageNumber >= pageCount || rendering}
              onClick={() => {
                setPageNumber((current) => Math.min(pageCount, current + 1))
              }}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </div>

      <div
        ref={pageRef}
        className="relative grid h-[70svh] min-h-96 place-items-start justify-center overflow-auto p-4 sm:min-h-[32rem]"
      >
        <canvas
          ref={canvasRef}
          aria-label={`${name}, page ${String(pageNumber)}`}
          className="max-w-full bg-white shadow-sm"
        >
          {name}, page {pageNumber}
        </canvas>

        {viewer.kind === "loading" || rendering ? (
          <output className="absolute inset-0 grid place-items-center bg-background/80">
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
            <span className="sr-only">Loading PDF</span>
          </output>
        ) : null}

        {viewer.kind === "error" ? (
          <div
            role="alert"
            className="absolute inset-0 grid place-items-center"
          >
            <div className="text-center">
              <FileWarning aria-hidden="true" className="mx-auto size-5" />
              <p className="mt-3 text-xs">Preview unavailable</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
