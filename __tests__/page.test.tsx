import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ProjectLibrary } from "@/components/paper-amigo/project-library"
import type { Project } from "@/lib/projects"

const project: Project = {
  schemaVersion: 1,
  id: "0f5a034d-c19a-4b77-8605-c1f3b30ad3c2",
  title: "Climate study",
  description: "Longitudinal results",
  authors: [
    {
      name: "Seyam",
      designation: "Researcher",
      university: "Example University",
    },
  ],
  files: [
    {
      key: "file-key",
      hash: "a".repeat(64),
      name: "paper.pdf",
      size: 1_024,
      uploadedAt: "2026-08-26T00:00:00.000Z",
      url: "https://example.com/paper.pdf",
    },
  ],
  createdAt: "2026-08-26T00:00:00.000Z",
  updatedAt: "2026-08-26T00:00:00.000Z",
}

afterEach(cleanup)

describe("ProjectLibrary", () => {
  it("renders the project library", () => {
    render(<ProjectLibrary projects={[project]} />)

    expect(
      screen.getByRole("heading", { level: 1, name: "Projects" })
    ).toBeDefined()
    expect(
      screen.getByRole("searchbox", { name: "Search projects" })
    ).toBeDefined()
    expect(screen.getAllByRole("article")).toHaveLength(1)
  })

  it("renders an empty library", () => {
    render(<ProjectLibrary projects={[]} />)

    expect(screen.getByText("No projects")).toBeDefined()
    expect(screen.queryAllByRole("article")).toHaveLength(0)
  })
})
