export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-7 bg-gray-200 rounded w-56 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-40 mb-8" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <div className="h-3 bg-gray-200 rounded w-28 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, j) => (
              <div key={j}>
                <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
                <div className="h-10 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
