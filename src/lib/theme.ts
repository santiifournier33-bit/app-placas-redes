"use client"

export type Theme = "light" | "dark"

export function getTheme(): Theme {
  if (typeof window === "undefined") return "dark"
  return document.documentElement.classList.contains("light") ? "light" : "dark"
}

export function setTheme(theme: Theme) {
  if (typeof window === "undefined") return
  if (theme === "light") {
    document.documentElement.classList.add("light")
    localStorage.setItem("theme", "light")
  } else {
    document.documentElement.classList.remove("light")
    localStorage.setItem("theme", "dark")
  }
  window.dispatchEvent(new Event("theme-change"))
}

export function toggleTheme() {
  const current = getTheme()
  setTheme(current === "light" ? "dark" : "light")
}

export function initTheme() {
  if (typeof window === "undefined") return
  const saved = localStorage.getItem("theme") as Theme | null
  // default is dark
  if (saved === "light") {
    document.documentElement.classList.add("light")
  } else {
    document.documentElement.classList.remove("light")
  }
}
