interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export default function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
      <div className="animate-pulse">
        {/* Table Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-24"></div>
            ))}
          </div>
        </div>
        {/* Table Rows */}
        <div className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="px-6 py-4">
              <div className="flex gap-4">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <div key={colIndex} className="h-4 bg-gray-200 rounded flex-1"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

