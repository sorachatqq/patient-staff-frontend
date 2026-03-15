export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-7 bg-gray-200 rounded w-40 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-56 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex justify-between mb-4">
              <div className="h-4 bg-gray-200 rounded w-28" />
              <div className="h-5 bg-gray-200 rounded w-16" />
            </div>
            <div className="space-y-2.5">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="flex gap-2">
                  <div className="h-3 bg-gray-100 rounded w-28" />
                  <div className="h-3 bg-gray-200 rounded w-20" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
