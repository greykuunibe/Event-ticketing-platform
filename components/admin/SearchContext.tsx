'use client'

import { createContext, useContext, useCallback, useRef, ReactNode, useEffect } from 'react'
import { useSearchStore } from '@/stores/searchStore'

interface SearchContextType {
  searchQuery: string
  setSearchQuery: (query: string) => void
  registerSearchHandler: (handler: (query: string) => void) => void
}

const SearchContext = createContext<SearchContextType | null>(null)

export function SearchProvider({ children }: { children: ReactNode }) {
  const { searchQuery, setSearchQuery: setZustandQuery } = useSearchStore()
  const searchHandlerRef = useRef<((query: string) => void) | null>(null)

  const registerSearchHandler = useCallback((handler: (query: string) => void) => {
    searchHandlerRef.current = handler
  }, [])

  const handleSetSearchQuery = useCallback((query: string) => {
    setZustandQuery(query)
    if (searchHandlerRef.current) {
      searchHandlerRef.current(query)
    }
  }, [setZustandQuery])

  // Trigger handler when search query changes
  useEffect(() => {
    if (searchHandlerRef.current && searchQuery) {
      searchHandlerRef.current(searchQuery)
    }
  }, [searchQuery])

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery: handleSetSearchQuery,
        registerSearchHandler,
      }}
    >
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider')
  }
  return context
}

