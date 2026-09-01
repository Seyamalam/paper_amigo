"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  FileWarning,
  LoaderCircle,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  Scan,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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

type FitMode = "page" | "width"
type PageRenderState = "waiting" | "rendering" | "ready" | "error"

const fallbackPageSize: PdfPageSize = { height: 792, width: 612 }

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

function getDisplaySize(
  naturalSize: PdfPageSize,
  viewerSize: PdfPageSize,
  fitMode: FitMode,
  isExpanded: boolean
): PdfPageSize {
  const widthScale = viewerSize.width / naturalSize.width
  const heightScale = viewerSize.height / naturalSize.height
  const maximumScale = isExpanded ? 2.5 : 2
  const displayScale = Math.min(
    fitMode === "page" ? Math.min(widthScale, heightScale) : widthScale,
    maximumScale
  )

  return {
    height: Math.max(1, Math.ceil(naturalSize.height * displayScale)),
    width: Math.max(1, Math.ceil(naturalSize.width * displayScale)),
  }
}

function PdfPageCanvas({
  document,
  fitMode,
  isExpanded,
  pageNumber,
  viewerSize,
}: Readonly<{
  document: PdfDocument
  fitMode: FitMode
  isExpanded: boolean
  pageNumber: number
  viewerSize: PdfPageSize
}>) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [naturalSize, setNaturalSize] = useState<PdfPageSize>(fallbackPageSize)
  const [shouldRender, setShouldRender] = useState(false)
  const [renderState, setRenderState] = useState<PageRenderState>("waiting")
  const displaySize = getDisplaySize(
    naturalSize,
    viewerSize,
    fitMode,
    isExpanded
  )

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) {
      return undefined
    }

    if (!Object.hasOwn(window, "IntersectionObserver")) {
      const fallbackTimer = window.setTimeout(() => {
        setShouldRender(true)
      }, 0)
      return () => {
        window.clearTimeout(fallbackTimer)
      }
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true)
          observer.disconnect()
        }
      },
      { rootMargin: "100% 0px" }
    )
    observer.observe(wrapper)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!shouldRender) {
      return undefined
    }

    const canvas = canvasRef.current
    if (!canvas) {
      return undefined
    }

    const renderCanvas = canvas
    const renderController = new AbortController()
    let renderTask: PdfRenderTask | undefined

    async function renderPage(): Promise<void> {
      setRenderState("rendering")

      try {
        const page = await document.getPage(pageNumber)
        const pageSize = page.getSize()
        const nextDisplaySize = getDisplaySize(
          pageSize,
          viewerSize,
          fitMode,
          isExpanded
        )
        const displayScale = nextDisplaySize.width / pageSize.width
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
        const renderScale = displayScale * pixelRatio

        if (renderController.signal.aborted) {
          return
        }

        setNaturalSize(pageSize)
        renderCanvas.width = Math.ceil(pageSize.width * renderScale)
        renderCanvas.height = Math.ceil(pageSize.height * renderScale)
        renderCanvas.style.width = `${String(nextDisplaySize.width)}px`
        renderCanvas.style.height = `${String(nextDisplaySize.height)}px`
        renderTask = page.render(renderCanvas, renderScale)
        await renderTask.promise
        setRenderState("ready")
      } catch (error) {
        if (
          !renderController.signal.aborted &&
          (!(error instanceof Error) ||
            error.name !== "RenderingCancelledException")
        ) {
          setRenderState("error")
        }
      }
    }

    void renderPage()

    return () => {
      renderController.abort()
      renderTask?.cancel()
    }
  }, [document, fitMode, isExpanded, pageNumber, shouldRender, viewerSize])

  return (
    <div
      ref={wrapperRef}
      data-pdf-page={pageNumber}
      className="relative shrink-0"
      style={{ height: displaySize.height, width: displaySize.width }}
    >
      <canvas
        ref={canvasRef}
        aria-label={`PDF page ${String(pageNumber)}`}
        className="bg-white shadow-sm ring-1 ring-black/5"
      >
        PDF page {pageNumber}
      </canvas>

      {renderState === "waiting" || renderState === "rendering" ? (
        <output className="absolute inset-0 grid place-items-center bg-white text-neutral-500">
          <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
          <span className="sr-only">Loading PDF page {pageNumber}</span>
        </output>
      ) : null}

      {renderState === "error" ? (
        <div
          role="alert"
          className="absolute inset-0 grid place-items-center bg-white text-neutral-800"
        >
          <div className="text-center">
            <FileWarning aria-hidden="true" className="mx-auto size-5" />
            <p className="mt-3 text-xs">Page {pageNumber} unavailable</p>
          </div>
        </div>
      ) : null}

      <span className="absolute right-2 bottom-2 bg-black/75 px-1.5 py-1 font-mono text-[9px] text-white">
        {pageNumber}
      </span>
    </div>
  )
}

export function PdfViewer({
  url,
  name,
  loader = loadPdfDocument,
}: Readonly<{ url: string; name: string; loader?: PdfLoader }>) {
  const pageContainerRef = useRef<HTMLDivElement>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [viewer, setViewer] = useState<ViewerState>({ kind: "loading" })
  const [fitMode, setFitMode] = useState<FitMode>("page")
  const [isExpanded, setIsExpanded] = useState(false)
  const [viewerSize, setViewerSize] = useState<PdfPageSize>(fallbackPageSize)

  useEffect(() => {
    let disposed = false
    let loadedDocument: PdfDocument | undefined

    async function load(): Promise<void> {
      setViewer({ kind: "loading" })
      setPageNumber(1)

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
    const pageContainer = pageContainerRef.current
    if (!pageContainer) {
      return undefined
    }

    const renderContainer = pageContainer

    function measureViewer(): void {
      setViewerSize({
        height: Math.max(renderContainer.clientHeight - 32, 1),
        width: Math.max(renderContainer.clientWidth - 32, 1),
      })
    }

    const resizeObserver =
      "ResizeObserver" in window
        ? new window.ResizeObserver(measureViewer)
        : undefined

    if (resizeObserver) {
      resizeObserver.observe(pageContainer)
    } else {
      window.addEventListener("resize", measureViewer)
    }
    measureViewer()

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener("resize", measureViewer)
    }
  }, [])

  useEffect(() => {
    if (!isExpanded) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isExpanded])

  const pageCount = viewer.kind === "ready" ? viewer.document.numPages : 0

  const scrollToPage = useCallback((nextPage: number): void => {
    const pageContainer = pageContainerRef.current
    const page = pageContainer?.querySelector<HTMLElement>(
      `[data-pdf-page="${String(nextPage)}"]`
    )

    if (!pageContainer || !page) {
      return
    }

    pageContainer.scrollTo({
      behavior: "smooth",
      top: Math.max(page.offsetTop - 16, 0),
    })
    setPageNumber(nextPage)
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return
      }

      if (event.key === "Escape" && isExpanded) {
        event.preventDefault()
        setIsExpanded(false)
        return
      }

      if (viewer.kind !== "ready") {
        return
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault()
        scrollToPage(Math.max(1, pageNumber - 1))
      }

      if (event.key === "ArrowRight") {
        event.preventDefault()
        scrollToPage(Math.min(viewer.document.numPages, pageNumber + 1))
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isExpanded, pageNumber, scrollToPage, viewer])

  function handlePageScroll(): void {
    const pageContainer = pageContainerRef.current
    if (!pageContainer) {
      return
    }

    const viewportCenter =
      pageContainer.scrollTop + pageContainer.clientHeight / 2
    let closestPage = pageNumber
    let closestDistance = Number.POSITIVE_INFINITY

    for (const page of pageContainer.querySelectorAll<HTMLElement>(
      "[data-pdf-page]"
    )) {
      const pageCenter = page.offsetTop + page.offsetHeight / 2
      const distance = Math.abs(pageCenter - viewportCenter)
      if (distance < closestDistance) {
        closestDistance = distance
        closestPage = Number(page.dataset["pdfPage"])
      }
    }

    if (Number.isSafeInteger(closestPage) && closestPage !== pageNumber) {
      setPageNumber(closestPage)
    }
  }

  return (
    <section
      aria-label="PDF preview"
      data-expanded={isExpanded ? "true" : "false"}
      data-fit={fitMode}
      className={cn(
        "flex flex-col border bg-neutral-200 dark:bg-neutral-950",
        isExpanded &&
          "fixed inset-0 z-[100] h-svh border-0 bg-neutral-300 dark:bg-neutral-950"
      )}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-2 sm:px-3">
        <p className="hidden min-w-0 flex-1 truncate font-mono text-[10px] sm:block">
          {name}
        </p>
        {viewer.kind === "ready" ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Previous PDF page"
              disabled={pageNumber <= 1}
              onClick={() => {
                scrollToPage(Math.max(1, pageNumber - 1))
              }}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span
              aria-live="polite"
              className="min-w-16 text-center font-mono text-[10px]"
            >
              {pageNumber} / {pageCount}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Next PDF page"
              disabled={pageNumber >= pageCount}
              onClick={() => {
                scrollToPage(Math.min(pageCount, pageNumber + 1))
              }}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-1 border-l pl-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Fit whole PDF page"
            aria-pressed={fitMode === "page"}
            className={cn(
              "px-2",
              fitMode === "page" &&
                "bg-foreground text-background hover:bg-foreground/90 hover:text-background"
            )}
            onClick={() => {
              setFitMode("page")
            }}
          >
            <Scan aria-hidden="true" />
            <span className="hidden lg:inline">Page</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Fit PDF to viewer width"
            aria-pressed={fitMode === "width"}
            className={cn(
              "px-2",
              fitMode === "width" &&
                "bg-foreground text-background hover:bg-foreground/90 hover:text-background"
            )}
            onClick={() => {
              setFitMode("width")
            }}
          >
            <MoveHorizontal aria-hidden="true" />
            <span className="hidden lg:inline">Width</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={
              isExpanded
                ? "Close full-page PDF viewer"
                : "Open full-page PDF viewer"
            }
            aria-pressed={isExpanded}
            onClick={() => {
              setIsExpanded((current) => !current)
            }}
          >
            {isExpanded ? (
              <Minimize2 aria-hidden="true" />
            ) : (
              <Maximize2 aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      <div
        ref={pageContainerRef}
        className={cn(
          "relative flex items-center overflow-auto p-4",
          isExpanded ? "min-h-0 flex-1" : "h-[70svh] min-h-96 sm:min-h-[32rem]",
          viewer.kind === "ready" ? "flex-col gap-5" : "justify-center"
        )}
        onScroll={handlePageScroll}
      >
        {viewer.kind === "ready"
          ? Array.from({ length: viewer.document.numPages }, (_, index) => (
              <PdfPageCanvas
                key={index + 1}
                document={viewer.document}
                fitMode={fitMode}
                isExpanded={isExpanded}
                pageNumber={index + 1}
                viewerSize={viewerSize}
              />
            ))
          : null}

        {viewer.kind === "loading" ? (
          <output className="grid place-items-center">
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
            <span className="sr-only">Loading PDF</span>
          </output>
        ) : null}

        {viewer.kind === "error" ? (
          <div role="alert" className="text-center">
            <FileWarning aria-hidden="true" className="mx-auto size-5" />
            <p className="mt-3 text-xs">Preview unavailable</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
