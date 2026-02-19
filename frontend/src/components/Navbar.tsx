/**
 * Top navigation bar component
 */
export function Navbar() {
  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
              UC
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                SD City Nature Challenge Optimizer
              </h1>
              <p className="text-sm text-gray-600">
                UC San Diego Natural Reserve System
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">2026 Analysis</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
