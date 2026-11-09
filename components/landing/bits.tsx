"use client"

import { useEffect, useRef, useState } from "react"
import { Menu, X } from "lucide-react"

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
