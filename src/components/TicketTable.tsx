'use client'

import { useState } from 'react'
import type { ParsedRow } from '@/lib/csvParser'
import { ExternalLink, ChevronUp, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'

interface Props {
  rows: ParsedRow[]
}

const STATUS_STYLES: Record<string, string> = {
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Redirected: 'bg-amber-50 text-amber-700 border-amber-200',
  'No Response': 'bg-red-50 text-red-700 border-red-200',
  Duplicate: 'bg-violet-50 text-violet-700 border-violet-200',
  'Partially Resolved': 'bg-blue-50 text-blue-700 border-blue-200',
}

const URGENCY_STYLES: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700',
  High: 'bg-orange-100 text-orange-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-green-100 text-green-700',
}

type SortKey = 'date_str' | 'ttr_hours' | 'tta_minutes' | 'platform_name' | 'resolution_status' | 'urgency_level'

export default function TicketTable({ rows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('date_str')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? ''
    const bv = b[sortKey] ?? ''
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv))
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronUp className="w-3 h-3 text-slate-300" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-indigo-600" />
      : <ChevronDown className="w-3 h-3 text-indigo-600" />
  }

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50 select-none whitespace-nowrap"
      onClick={() => handleSort(k)}
    >
      <span className="flex items-center gap-1">{label}<SortIcon k={k} /></span>
    </th>
  )

  function formatTTR(hours: number | null): string {
    if (hours === null) return '—'
    if (hours < 1) return `${Math.round(hours * 60)}m`
    return `${hours}h`
  }

  function formatTTA(min: number | null): string {
    if (min === null) return '—'
    if (min < 60) return `${min}m`
    return `${Math.round(min / 60)}h`
  }

  return (
    <div className="overflow-auto scrollbar-thin">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 sticky top-0 z-10">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">ID</th>
            <Th k="date_str" label="Date" />
            <Th k="platform_name" label="Platform" />
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue</th>
            <Th k="urgency_level" label="Urgency" />
            <Th k="resolution_status" label="Status" />
            <Th k="ttr_hours" label="TTR" />
            <Th k="tta_minutes" label="TTA" />
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Engineer</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Escalated</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Link</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {paginated.map(row => (
            <tr key={row.conversation_id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{row.conversation_id}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{row.date_str}</td>
              <td className="px-4 py-3 text-slate-700 whitespace-nowrap text-xs font-medium">{row.platform_name}</td>
              <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate" title={row.ticket_title}>{row.ticket_title}</td>
              <td className="px-4 py-3">
                <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold', URGENCY_STYLES[row.urgency_level] ?? 'bg-slate-100 text-slate-600')}>
                  {row.urgency_level}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={clsx('px-2 py-0.5 rounded-md text-xs font-semibold border', STATUS_STYLES[row.resolution_status] ?? 'bg-slate-100 text-slate-600 border-slate-200')}>
                  {row.resolution_status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs font-mono">{formatTTR(row.ttr_hours)}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs font-mono">{formatTTA(row.tta_minutes)}</td>
              <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{row.resolving_engineer_name}</td>
              <td className="px-4 py-3 text-center">
                {row.was_escalated ? (
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500" title="Escalated" />
                ) : (
                  <span className="inline-block w-2 h-2 rounded-full bg-slate-200" />
                )}
              </td>
              <td className="px-4 py-3 text-center">
                {row.slack_thread_link && (
                  <a href={row.slack_thread_link} target="_blank" rel="noopener noreferrer"
                    className="text-indigo-500 hover:text-indigo-700 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 p-4 border-t border-slate-100">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}