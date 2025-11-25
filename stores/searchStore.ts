import { create } from 'zustand'

export interface SearchableDataItem {
  id: string
  title: string
  subtitle?: string
  description?: string
  keywords: string[]
  category: string
  href?: string
  action?: {
    label: string
    onClick: () => void
    icon?: any
  }
  metadata?: Record<string, any>
}

interface SearchStore {
  searchQuery: string
  isOpen: boolean
  searchableData: SearchableDataItem[]
  setSearchQuery: (query: string) => void
  openSearch: () => void
  closeSearch: () => void
  toggleSearch: () => void
  registerData: (items: SearchableDataItem[]) => void
  clearData: () => void
}

export const useSearchStore = create<SearchStore>((set) => ({
  searchQuery: '',
  isOpen: false,
  searchableData: [],
  setSearchQuery: (query) => set({ searchQuery: query }),
  openSearch: () => set({ isOpen: true }),
  closeSearch: () => set({ isOpen: false, searchQuery: '' }),
  toggleSearch: () => set((state) => ({ isOpen: !state.isOpen })),
  registerData: (items) => set({ searchableData: items }),
  clearData: () => set({ searchableData: [] }),
}))

