'use client'

import { useEffect, useState } from 'react'
import { parseCsv } from '@/lib/csvParser'
import type { ParsedRow } from '@/lib/csvParser'
import { computeMetrics } from '@/lib/metrics'
import type { KPIMetrics } from '@/lib/metrics'
import KPIGrid from '@/components/KPIGrid'
import ChartsSection from '@/components/ChartsSection'

export default function ViewOnlyDashboard() {
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [metrics, setMetrics] = useState<KPIMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/raw_support_threads.csv')
      .then(r => r.text())
      .then(text => {
        const result = parseCsv(text)
        setRows(result.rows)
        const m = computeMetrics(result.rows)
        setMetrics(m)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/30">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
                Data Platform Support Program
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                Executive Support Dashboard
              </h1>
              <p className="text-indigo-200 text-sm mt-1">View-only · {rows.length} tickets</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-indigo-300 uppercase tracking-wider">View Only</div>
              <div className="text-xs text-indigo-400 mt-1">Read-only access</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {metrics && <KPIGrid metrics={metrics} />}
        {metrics && <ChartsSection metrics={metrics} />}
      </div>
    </div>
  )
}