"use client"

import { useEffect } from "react"

export function ShareViewTracker({ token }: Readonly<{ token: string }>) {
  useEffect(() => {
    void fetch(`/api/public/shares/${token}/view`, {
      method: "POST",
      keepalive: true,
    })
  }, [token])

  return null
}
