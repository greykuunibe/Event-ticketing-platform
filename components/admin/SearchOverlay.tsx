'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MagnifyingGlassIcon, XIcon, ClockIcon, ArrowRightIcon, CheckCircleIcon, TicketIcon } from '@phosphor-icons/react'
import { useSearchStore } from '@/stores/searchStore'
import { searchRoutes, SearchableRoute } from '@/lib/searchRoutes'
import { searchDataItems } from '@/lib/searchData'

export default function SearchOverlay() {
  const { isOpen, searchQuery, setSearchQuery, closeSearch } = useSearchStore()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const { searchableData } = useSearchStore()

  // Search results - routes and data items
  const routeResults = useMemo(() => {
    return searchRoutes(searchQuery)
  }, [searchQuery])

  const dataResults = useMemo(() => {
    return searchDataItems(searchableData, searchQuery)
  }, [searchQuery, searchableData])

  const hasResults = routeResults.length > 0 || dataResults.length > 0

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches')
    if (stored) {
      setRecentSearches(JSON.parse(stored))
    }
  }, [])

  // Save search to recent searches
  const saveToRecent = (query: string) => {
    if (!query.trim()) return
    const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }

  // Trigger search handler when query changes
  useEffect(() => {
    // The SearchContext will automatically trigger registered handlers
    // when the Zustand store updates
  }, [searchQuery])

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        useSearchStore.getState().openSearch()
      }
      if (e.key === 'Escape' && isOpen) {
        closeSearch()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeSearch])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      saveToRecent(query)
    }
  }

  const handleRecentClick = (query: string) => {
    handleSearch(query)
    inputRef.current?.focus()
  }

  const handleRouteClick = (route: SearchableRoute) => {
    saveToRecent(route.name)
    closeSearch()
    router.push(route.href)
  }

  const handleDataItemClick = (item: any) => {
    if (item.href) {
      saveToRecent(item.title)
      closeSearch()
      router.push(item.href)
    } else if (item.action) {
      item.action.onClick()
      // Don't close overlay for actions, let user see the result
    }
  }

  const removeRecent = (query: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = recentSearches.filter((s) => s !== query)
    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            onClick={closeSearch}
          />

          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl mx-4 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
              {/* Search Input */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <MagnifyingGlassIcon
                    size={20}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search pages and routes..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('')
                          inputRef.current?.focus()
                        }}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <XIcon size={16} />
                      </button>
                    )}
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">esc</span>
                  </div>
                </div>
              </div>

              {/* Recent Searches */}
              {!searchQuery && recentSearches.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Recent</h3>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((query, index) => (
                      <button
                        key={index}
                        onClick={() => handleRecentClick(query)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <ClockIcon size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-700">{query}</span>
                        </div>
                        <button
                          onClick={(e) => removeRecent(query, e)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-all"
                        >
                          <XIcon size={14} />
                        </button>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results */}
              {searchQuery && (
                <div className="max-h-96 overflow-y-auto border-t border-gray-200">
                  {hasResults ? (
                    <div className="p-2">
                      {/* Routes Section */}
                      {routeResults.length > 0 && (
                        <>
                          <div className="px-2 py-2 mb-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase">
                              Pages ({routeResults.length})
                            </p>
                          </div>
                          <div className="space-y-1 mb-4">
                            {routeResults.map((route) => {
                              const Icon = route.icon
                              return (
                                <button
                                  key={route.href}
                                  onClick={() => handleRouteClick(route)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group text-left"
                                >
                                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 group-hover:bg-orange-100 transition-colors">
                                    <Icon size={18} className="text-gray-600 group-hover:text-orange-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-gray-900">{route.name}</p>
                                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                        {route.category}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                      {route.description}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1 font-mono">
                                      {route.href}
                                    </p>
                                  </div>
                                  <ArrowRightIcon size={16} className="text-gray-400 group-hover:text-orange-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              )
                            })}
                          </div>
                        </>
                      )}

                      {/* Data Items Section */}
                      {dataResults.length > 0 && (
                        <>
                          <div className="px-2 py-2 mb-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase">
                              {dataResults[0]?.category || 'Items'} ({dataResults.length})
                            </p>
                          </div>
                          <div className="space-y-1">
                            {dataResults.map((item) => {
                              const ActionIcon = item.action?.icon || ArrowRightIcon
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => handleDataItemClick(item)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group text-left"
                                >
                                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 group-hover:bg-orange-100 transition-colors">
                                    <TicketIcon size={18} className="text-gray-600 group-hover:text-orange-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                      {(item as any).admitted !== undefined && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                                          (item as any).admitted
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-orange-100 text-orange-800'
                                        }`}>
                                          {(item as any).admitted ? 'Admitted' : 'Not Admitted'}
                                        </span>
                                      )}
                                    </div>
                                    {item.subtitle && (
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        {item.subtitle}
                                      </p>
                                    )}
                                    {item.description && (
                                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                                        {item.description}
                                      </p>
                                    )}
                                  </div>
                                  {item.action ? (
                                    <div className="flex-shrink-0">
                                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-600 text-white rounded-lg group-hover:bg-green-700 transition-colors">
                                        {item.action.icon && <item.action.icon size={12} weight="fill" />}
                                        {item.action.label}
                                      </span>
                                    </div>
                                  ) : (
                                    <ArrowRightIcon size={16} className="text-gray-400 group-hover:text-orange-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-sm text-gray-500">
                        No results found for &quot;{searchQuery}&quot;
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Try searching for pages, participant names, ticket IDs, or payment references
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500 text-right">
                  Press <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">Esc</kbd> to close
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

