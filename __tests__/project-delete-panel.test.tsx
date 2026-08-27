import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ProjectDeleteForm } from "@/components/paper-amigo/project-delete-panel"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("ProjectDeleteForm", () => {
  it("requires the exact project title before enabling deletion", () => {
    render(
      <ProjectDeleteForm
        projectId="416d1b34-b331-4f18-8224-39f8a149908f"
        projectTitle="Effects of Urban Heat"
        onDeleted={vi.fn<() => void>()}
      />
    )
    const input = screen.getByRole("textbox", {
      name: "Project title confirmation",
    })
    const button = screen.getByRole("button", { name: "Delete project" })

    expect(button.hasAttribute("disabled")).toBe(true)

    fireEvent.change(input, { target: { value: "Effects of urban heat" } })
    expect(button.hasAttribute("disabled")).toBe(true)

    fireEvent.change(input, { target: { value: "Effects of Urban Heat" } })
    expect(button.hasAttribute("disabled")).toBe(false)
  })

  it("deletes the project and completes navigation", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        deleted: true,
        deletedManifests: 1,
        deletedProjectFiles: 2,
        deletedSharingRecords: 3,
        projectId: "416d1b34-b331-4f18-8224-39f8a149908f",
      })
    )
    const onDeleted = vi.fn<() => void>()
    vi.stubGlobal("fetch", fetchMock)
    render(
      <ProjectDeleteForm
        projectId="416d1b34-b331-4f18-8224-39f8a149908f"
        projectTitle="Effects of Urban Heat"
        onDeleted={onDeleted}
      />
    )

    fireEvent.change(
      screen.getByRole("textbox", { name: "Project title confirmation" }),
      { target: { value: "Effects of Urban Heat" } }
    )
    fireEvent.click(screen.getByRole("button", { name: "Delete project" }))

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledOnce()
    })
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/projects/416d1b34-b331-4f18-8224-39f8a149908f",
      {
        body: JSON.stringify({ confirmation: "Effects of Urban Heat" }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      }
    )
  })
})
