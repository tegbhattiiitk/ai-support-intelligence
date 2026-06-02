export default function Header() {
  return (
    <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-400/30 flex items-center justify-center">
                <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
                  <rect x="4" y="7" width="24" height="4" rx="2" fill="white" />
                  <rect x="4" y="14" width="16" height="4" rx="2" fill="#a5b8fc" />
                  <rect x="4" y="21" width="20" height="4" rx="2" fill="white" opacity="0.7" />
                </svg>
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
                Data Platform Support Program
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Executive Support Dashboard
            </h1>
            <p className="text-indigo-200 text-sm mt-1">
              Real-time program health · KPIs · Trends · Interactive analysis
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-indigo-300 uppercase tracking-wider font-medium">Program Period</div>
            <div className="text-sm font-semibold text-white mt-0.5">March 2026</div>
          </div>
        </div>
      </div>
    </div>
  )
}