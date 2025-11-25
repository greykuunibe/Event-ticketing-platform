export default function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="animate-pulse">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          </div>
          <div className="h-20 w-20 bg-gray-200 rounded"></div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 bg-gray-200 rounded w-24"></div>
          <div className="h-9 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    </div>
  )
}

