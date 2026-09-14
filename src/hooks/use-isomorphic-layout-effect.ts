import { useEffect, useLayoutEffect } from "react"

/** useLayoutEffect без SSR-варнинга. */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect
