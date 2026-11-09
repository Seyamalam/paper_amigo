import type { Metadata } from "next"
import Link from "next/link"

import "./landing.css"
import { MobileMenu, WordHighlight } from "@/components/landing/bits"

export const metadata: Metadata = {
  title: "Paper Amigo: a research-paper library for authors",
  description:
    "Group PDFs into projects, send each project a labeled link, and read the critiques beside the file they mean.",
}

const navLinks = [
  { href: "#product", label: "Project" },
  { href: "#sharing", label: "Sharing" },
  { href: "#faq", label: "Questions" },
] as const

export default function LandingPage() {
  return (
    <div className="lp" data-type="software">
      <script
        dangerouslySetInnerHTML={{
          __html: "document.documentElement.classList.add('m-enter')",
        }}
      />

      <header className="lp-nav" data-enter="">
        <div className="wrap">
          <Link href="/" className="lp-brand">
            <svg
              aria-hidden="true"
              width="26"
              height="26"
              viewBox="0 0 32 32"
              style={{ flex: "none" }}
            >
              <rect width="32" height="32" fill="#0b0b0b" />
              <path d="M4 20 L28 4 L13.5 15 Z" fill="#f7f7f6" />
              <path
                d="M13.5 15 L28 4 L11.5 28 Z"
                fill="#f7f7f6"
                opacity=".55"
              />
            </svg>
            Paper Amigo
          </Link>
          <nav className="lp-nav__links" aria-label="Page">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="lp-word">
                {l.label}
              </a>
            ))}
          </nav>
          <Link href="/sign-in" className="lp-btn lp-btn--primary lp-nav__act">
            Sign in
          </Link>
          <MobileMenu links={navLinks} />
        </div>
      </header>

      <main id="top">
        {/* hero: statement left, product window right, enters on load */}
        <section
          className="lp-hero"
          style={{ paddingTop: 0, paddingBottom: 0 }}
          data-enter=""
        >
          <div className="wrap">
            <div className="lp-hero__text">
              <p className="lp-eyebrow">1 owner · no recipient accounts</p>
              <h1 className="lp-h1">A research-paper library</h1>
              <p className="lp-lead">
                For authors who share drafts. Group PDFs into projects, send
                each project a labeled link, and read the critiques beside the
                file they mean.
              </p>
              <div className="lp-hero__cta">
                <Link
                  href="/sign-in"
                  className="lp-btn lp-btn--primary lp-btn--xl"
                >
                  Sign in
                </Link>
                <a href="#product" className="lp-btn lp-btn--ghost lp-btn--xl">
                  See the product
                </a>
              </div>
            </div>
            <div className="lp-hero__art" aria-hidden="true">
              <div className="lp-window">
                <div className="lp-window__bar">
                  <i /> <i /> <i />
                  <span>paper amigo · project</span>
                </div>
                <div className="lp-window__body lp-window__body--hero">
                  <div className="lp-pane">
                    <p className="lp-pane__h">Files</p>
                    <div className="lp-row lp-row--on">paper-v3.pdf</div>
                    <div className="lp-row">supplement.pdf</div>
                    <div className="lp-row">figures.pdf</div>
                  </div>
                  <div className="lp-pane lp-pane--mid">
                    <div className="lp-sheet">
                      <div className="lp-lines">
                        <i style={{ width: "60%" }} />
                        <i />
                        <i />
                        <i />
                        <i style={{ width: "45%" }} />
                        <i />
                        <i />
                        <i style={{ width: "72%" }} />
                      </div>
                    </div>
                  </div>
                  <div className="lp-pane">
                    <p className="lp-pane__h">Share links</p>
                    <div className="lp-sharechip">paper-amigo.app/s/8xk2</div>
                    <div className="lp-stat">
                      <span>views</span>
                      <span>7</span>
                    </div>
                    <div className="lp-stat">
                      <span>unique</span>
                      <span>2</span>
                    </div>
                    <p className="lp-pane__h" style={{ marginTop: 14 }}>
                      Critiques
                    </p>
                    <div className="lp-row">p. 12 · restore ablation</div>
                    <div className="lp-row">p. 4 · table 2 metric</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* app-frame: the product, big */}
        <section id="product">
          <div className="wrap">
            <h2 className="lp-h2">The project page</h2>
            <p className="lp-sub">
              Files on the left, the open PDF in the middle, its links and
              critiques on the right.
            </p>
            <div className="lp-window" aria-hidden="true">
              <div className="lp-window__bar">
                <i /> <i /> <i />
                <span>paper amigo · project</span>
              </div>
              <div className="lp-window__body">
                <div className="lp-pane">
                  <p className="lp-pane__h">Files</p>
                  <div className="lp-row lp-row--on">paper-v3.pdf</div>
                  <div className="lp-row">supplement.pdf</div>
                  <div className="lp-row">figures.pdf</div>
                  <p className="lp-pane__h" style={{ marginTop: 18 }}>
                    Authors
                  </p>
                  <div className="lp-row">T. A. Seyam</div>
                  <div className="lp-row">ORCID 0000-0002</div>
                </div>
                <div className="lp-pane lp-pane--mid">
                  <div className="lp-sheet">
                    <div className="lp-lines">
                      <i style={{ width: "60%" }} />
                      <i />
                      <i />
                      <i />
                      <i style={{ width: "45%" }} />
                      <i />
                      <i />
                      <i style={{ width: "72%" }} />
                    </div>
                  </div>
                </div>
                <div className="lp-pane">
                  <p className="lp-pane__h">Share links</p>
                  <div className="lp-sharechip">paper-amigo.app/s/8xk2</div>
                  <div className="lp-stat">
                    <span>views</span>
                    <span>7</span>
                  </div>
                  <div className="lp-stat">
                    <span>unique</span>
                    <span>2</span>
                  </div>
                  <p className="lp-pane__h" style={{ marginTop: 14 }}>
                    Critiques
                  </p>
                  <div className="lp-row">p. 12 · restore ablation</div>
                  <div className="lp-row">p. 4 · table 2 metric</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* features */}
        <section id="sharing">
          <div className="wrap">
            <h2 className="lp-h2">
              Share links that stay under your name.{" "}
              <span className="muted">Recipients sign nothing.</span>
            </h2>
            <p className="lp-sub">
              A link is a labeled secret: you know who it was meant for, they
              just open it.
            </p>
            <div className="lp-cards">
              <article className="lp-card">
                <div className="lp-card__frag" aria-hidden="true">
                  <div
                    className="lp-frag"
                    style={{
                      left: 12,
                      top: 12,
                      right: 12,
                      padding: "8px 10px",
                    }}
                  >
                    Prof. Osei
                  </div>
                  <div
                    className="lp-frag"
                    style={{
                      left: 12,
                      top: 44,
                      right: 40,
                      padding: "8px 10px",
                    }}
                  >
                    Dr. Lindqvist
                  </div>
                  <div
                    className="lp-frag lp-frag--dark"
                    style={{ left: 12, bottom: 10, padding: "4px 8px" }}
                  >
                    + new link
                  </div>
                </div>
                <h3>Creates labeled links</h3>
                <p>
                  Name the recipient for yourself; the link opens the project,
                  nothing else.
                </p>
              </article>
              <article className="lp-card">
                <div className="lp-card__frag" aria-hidden="true">
                  <div
                    className="lp-frag"
                    style={{ left: 12, top: 14, padding: "8px 10px" }}
                  >
                    views · 7
                  </div>
                  <div
                    className="lp-frag lp-frag--dark"
                    style={{ left: 12, top: 44, padding: "8px 10px" }}
                  >
                    unique · 2
                  </div>
                </div>
                <h3>Counts views privately</h3>
                <p>
                  Total views plus an estimate of unique visitors. No accounts
                  tracked.
                </p>
              </article>
              <article className="lp-card">
                <div className="lp-card__frag" aria-hidden="true">
                  <div
                    className="lp-frag"
                    style={{
                      left: 12,
                      top: 12,
                      right: 12,
                      padding: "8px 10px",
                    }}
                  >
                    p. 12 · “restore the cold-cache case”
                  </div>
                  <div
                    className="lp-frag"
                    style={{
                      left: 12,
                      top: 52,
                      right: 30,
                      padding: "8px 10px",
                    }}
                  >
                    p. 4 · “table 2 conflates…”
                  </div>
                </div>
                <h3>Collects critiques per file</h3>
                <p>
                  A recipient comments on one file, optionally to a page number.
                </p>
              </article>
              <article className="lp-card">
                <div className="lp-card__frag" aria-hidden="true">
                  <div
                    className="lp-frag"
                    style={{
                      left: 12,
                      top: 12,
                      right: 12,
                      padding: "8px 10px",
                    }}
                  >
                    paper-v3.pdf → v4.pdf
                  </div>
                  <div
                    className="lp-frag lp-frag--dark"
                    style={{
                      left: 12,
                      top: 52,
                      right: 50,
                      padding: "8px 10px",
                    }}
                  >
                    links unchanged
                  </div>
                </div>
                <h3>Replaces files, keeps links</h3>
                <p>
                  A new PDF swaps in; the project and its share links stay put.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* dealt moment: word-highlight */}
        <section className="lp-moment" aria-label="Statement">
          <div className="wrap">
            <WordHighlight
              text="A paper deserves a reader, not an audience."
              strong="reader,"
            />
          </div>
        </section>

        {/* faq */}
        <section id="faq">
          <div className="wrap">
            <h2 className="lp-h2">Questions</h2>
            <div className="lp-faq">
              <div>
                <h3>Who can sign in?</h3>
                <p>
                  The owner only. Paper Amigo holds one account, set in the
                  server’s environment.
                </p>
              </div>
              <div>
                <h3>Do recipients need an account?</h3>
                <p>
                  No. A share link opens the project files on its own, in the
                  reader.
                </p>
              </div>
              <div>
                <h3>Can a share link be revoked?</h3>
                <p>
                  Yes. Remove the link; the project and its other links are
                  untouched.
                </p>
              </div>
              <div>
                <h3>What does deleting a project remove?</h3>
                <p>
                  Its files, links, views and critiques, permanently. It cannot
                  be undone.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-foot section">
        <div className="wrap">
          <h2 className="lp-h2">Sign in and open the library.</h2>
          <Link
            href="/sign-in"
            className="lp-btn lp-btn--primary lp-btn--xl"
            style={{ marginTop: 24 }}
          >
            Sign in
          </Link>
          <p className="lp-foot__word" aria-hidden="true">
            Paper Amigo
          </p>
          <div className="lp-foot__links">
            <div>
              <h4>Page</h4>
              {navLinks.map((l) => (
                <a key={l.href} href={l.href}>
                  {l.label}
                </a>
              ))}
            </div>
            <div>
              <h4>Workspace</h4>
              <Link href="/library">Library</Link>
              <Link href="/settings">Settings</Link>
            </div>
          </div>
          <p className="lp-foot__legal">© 2026 Paper Amigo</p>
        </div>
      </footer>
    </div>
  )
}
