"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { Menu, Pause, Play, X } from "lucide-react"

/* ---------- Triptych collage: sets crossfade every 2.8s, pausable ---------- */

type Piece = Readonly<{
  style: CSSProperties
  children: React.ReactNode
  dark?: boolean
}>

function PieceCard({ style, children, dark }: Piece) {
  return (
    <div className={`lp-piece${dark ? "lp-piece--dark" : ""}`} style={style}>
      {children}
    </div>
  )
}

function Lines({ n = 5 }: Readonly<{ n?: number }>) {
  return (
    <div className="lp-lines" style={{ padding: "10px 12px" }}>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  )
}

const setOne = (
  <>
    <PieceCard style={{ left: "0%", top: "0%", width: "46%" }}>
      <p className="lp-piece__h">
        Semantic-Guided Adaptive Dataframe Execution
      </p>
      <Lines n={4} />
      <div className="lp-row lp-row--on">paper-v3.pdf</div>
      <div className="lp-row">supplement.pdf</div>
    </PieceCard>
    <PieceCard style={{ left: "54%", top: "8%", width: "42%" }} dark>
      <p className="lp-piece__h">paper-v3.pdf</p>
      <div className="lp-pdf">
        <Lines n={7} />
      </div>
    </PieceCard>
    <PieceCard style={{ left: "6%", top: "52%", width: "40%" }}>
      <p className="lp-piece__h">Share links</p>
      <div className="lp-row">Prof. Osei · 4 views</div>
      <div className="lp-row">Dr. Lindqvist · 1 view</div>
    </PieceCard>
    <PieceCard style={{ left: "56%", top: "66%", width: "40%" }}>
      <p className="lp-piece__h">Critique · p. 12</p>
      <p className="lp-piece__t">
        The ablation drops the cold-cache case; worth restoring it in v4.
      </p>
    </PieceCard>
  </>
)

const setTwo = (
  <>
    <PieceCard style={{ left: "4%", top: "4%", width: "44%" }} dark>
      <p className="lp-piece__h">Trust under Distribution Shift</p>
      <Lines n={5} />
    </PieceCard>
    <PieceCard style={{ left: "56%", top: "0%", width: "40%" }}>
      <div className="lp-row lp-row--on">calibration.pdf</div>
      <div className="lp-row">fairness-audit.pdf</div>
      <div className="lp-row">consistency.pdf</div>
    </PieceCard>
    <PieceCard style={{ left: "0%", top: "58%", width: "46%" }}>
      <p className="lp-piece__h">/s/8xk2… · Dr. Lindqvist</p>
      <div className="lp-stat">
        <span>views</span>
        <span>7</span>
      </div>
      <div className="lp-stat">
        <span>unique</span>
        <span>2</span>
      </div>
    </PieceCard>
    <PieceCard style={{ left: "54%", top: "48%", width: "44%" }}>
      <p className="lp-piece__h">Critique · p. 4</p>
      <p className="lp-piece__t">
        Table 2 conflates ECE with Brier in the marine cohort.
      </p>
    </PieceCard>
  </>
)

export function Triptych() {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    if (!playing) {
      return undefined
    }
    const id = window.setInterval(() => {
      setIndex((i) => (i === 0 ? 1 : 0))
    }, 2800)
    return () => {
      window.clearInterval(id)
    }
  }, [playing])

  return (
    <>
      <div className={`lp-set first${index === 0 ? "on" : ""}`}>{setOne}</div>
      <div className={`lp-set${index === 1 ? "on" : ""}`}>{setTwo}</div>
      <button
        type="button"
        className="lp-pause"
        aria-label={playing ? "Pause the preview" : "Play the preview"}
        aria-pressed={!playing}
        onClick={() => {
          setPlaying((p) => !p)
        }}
      >
        {playing ? (
          <Pause aria-hidden="true" className="size-3.5" />
        ) : (
          <Play aria-hidden="true" className="size-3.5" />
        )}
      </button>
    </>
  )
}

/* ---------- Word-highlight moment ---------- */

export function WordHighlight({
  text,
  strong,
}: Readonly<{ text: string; strong: string }>) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [progress, setProgress] = useState(0)
  const words = text.split(" ")

  useEffect(() => {
    const el = ref.current
    if (!el) {
      return undefined
    }
    const onScroll = () => {
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      // words light up as the statement crosses the middle of the screen
      const t = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.6)))
      setProgress(t)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  const lit = Math.round(progress * words.length)

  return (
    <p ref={ref} className="lp-statement">
      {words.map((w, i) => (
        <span
          key={`${w}-${String(i)}`}
          className={`w${i < lit ? "on" : ""}${w === strong ? "strong" : ""}`}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  )
}

/* ---------- Mobile menu ---------- */

export function MobileMenu({
  links,
}: Readonly<{ links: readonly { href: string; label: string }[] }>) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="lp-mobile-menu"
        aria-label={open ? "Close the menu" : "Open the menu"}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o)
        }}
      >
        {open ? (
          <X aria-hidden="true" className="size-5" />
        ) : (
          <Menu aria-hidden="true" className="size-5" />
        )}
      </button>
      {open ? (
        <nav className="lp-sheet-nav" aria-label="Menu">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => {
                setOpen(false)
              }}
            >
              {l.label}
            </a>
          ))}
        </nav>
      ) : null}
    </>
  )
}
