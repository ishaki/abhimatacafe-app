// Skeleton loading components for better visual feedback

export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const CardSkeleton = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse mr-3"></div>
            <div className="h-6 bg-gray-200 rounded animate-pulse flex-1"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export const StatsSkeleton = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse mr-3"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-8 bg-gray-200 rounded animate-pulse w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export const FormSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
        <div className="flex space-x-3">
          <div className="h-10 bg-gray-200 rounded animate-pulse flex-1"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse flex-1"></div>
        </div>
      </div>
    </div>
  )
}

export const ListSkeleton = ({ count = 5 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
            </div>
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Shimmer effect for enhanced skeleton loading
export const ShimmerEffect = () => {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
    </div>
  )
}

// Add shimmer animation to CSS
const shimmerCSS = `
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
`

// Inject shimmer CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = shimmerCSS
  document.head.appendChild(style)
}
