export default function StatisticsSkeleton() {
  return (
    <div className="grid grid-cols-1 border shadow-xs rounded-lg bg-white border-gray-200 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-6 border-r border-gray-200 last:border-r-0">
          <div className="animate-pulse">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-40"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

