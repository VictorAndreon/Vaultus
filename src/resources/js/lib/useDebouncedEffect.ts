import { useEffect, type DependencyList } from 'react'

export function useDebouncedEffect(effect: () => void | (() => void), deps: DependencyList, delayMs: number) {
  useEffect(() => {
    const handle = setTimeout(() => effect(), delayMs)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delayMs])
}
