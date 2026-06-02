'use client'

import { RotateCcw } from 'lucide-react'

interface Filters {
  platform: string
  status: string
  urgency: string
  impact: string
  dateFrom: string
  dateTo: string
  engineer: string
  category: string
}

interface Props {
  filters: Filters
  platforms: string[]
  statuses: string[]
  urgencies: string[]
  impacts: string[]
  engineers: string[]
  categories: string[]
  onChange: (f: Filters) => void
}

function Select({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 min-w-[120px] cursor-pointer"
      >
        <option value="all">All</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

export default function FiltersBar({ filters, platforms, statuses, urgencies, impacts, engineers, categories, onChange }: Props) {
  const reset = () => onChange({
    platform: 'all', status: 'all', urgency: 'all', impact: 'all',
    dateFrom: '', dateTo: '', engineer: 'all', category: 'all',
  })

  const isFiltered = Object.values(filters).some(v => v !== 'all' && v !== '')

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-end gap-3 flex-wrap">
        <Select label="Platform" value={filters.platform} onChange={v => onChange({ ...filters, platform: v })} options={platforms} />
        <Select label="Status" value={filters.status} onChange={v => onChange({ ...filters, status: v })} options={statuses} />
        <Select label="Urgency" value={filters.urgency} onChange={v => onChange({ ...filters, urgency: v })} options={urgencies} />
        <Select label="Impact" value={filters.impact} onChange={v => onChange({ ...filters, impact: v })} options={impacts} />
        <Select label="Engineer" value={filters.engineer} onChange={v => onChange({ ...filters, engineer: v })} options={engineers} />
        <Select label="Category" value={filters.category} onChange={v => onChange({ ...filters, category: v })} options={categories} />

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">From Date</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">To Date</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => onChange({ ...filters, dateTo: e.target.value })}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          />
        </div>

        {isFiltered && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium transition-colors self-end"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>
    </div>
  )
}