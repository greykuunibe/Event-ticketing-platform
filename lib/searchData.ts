import { SearchableDataItem } from '@/stores/searchStore'

export function searchDataItems(
  items: SearchableDataItem[],
  query: string
): SearchableDataItem[] {
  if (!query.trim() || items.length === 0) return []

  const lowerQuery = query.toLowerCase().trim()

  return items
    .map((item) => {
      let score = 0

      // Exact title match (highest priority)
      if (item.title.toLowerCase() === lowerQuery) {
        score += 100
      } else if (item.title.toLowerCase().startsWith(lowerQuery)) {
        score += 50
      } else if (item.title.toLowerCase().includes(lowerQuery)) {
        score += 30
      }

      // Subtitle match
      if (item.subtitle?.toLowerCase().includes(lowerQuery)) {
        score += 25
      }

      // Description match
      if (item.description?.toLowerCase().includes(lowerQuery)) {
        score += 20
      }

      // Keywords match
      const keywordMatches = item.keywords.filter((keyword) =>
        keyword.toLowerCase().includes(lowerQuery)
      ).length
      score += keywordMatches * 10

      // Metadata search (for phone, email, etc.)
      if (item.metadata) {
        Object.values(item.metadata).forEach((value) => {
          if (typeof value === 'string' && value.toLowerCase().includes(lowerQuery)) {
            score += 15
          }
        })
      }

      return { item, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
    .slice(0, 10) // Limit to top 10 results
}

