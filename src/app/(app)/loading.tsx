import { PageSkeleton } from "@/components/ui/PageSkeleton"

// Streamed instantly during navigation / server auth check for any (app) route,
// so users see structure (not a blank screen) while the page resolves.
export default function AppLoading() {
  return <PageSkeleton />
}
