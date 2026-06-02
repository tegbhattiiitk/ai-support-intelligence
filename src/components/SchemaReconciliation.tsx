'use client'

import { useState } from 'react'
import type { SchemaField } from '@/lib/csvParser'
import { EXPECTED_COLUMNS } from '@/lib/csvParser'
import { AlertTriangle, CheckCircle, X, ArrowRight } from 'lucide-react'

interface Props {
  schema: SchemaField[]
  diff: { added: string[]; removed: string[]; unchanged: string[] }
  rawCsv: string
  onConfirm: (colMap: Record<string, string>, rawCsv: string) => void
  onCancel: () => void
}

export default function SchemaReconciliation({ schema, diff, rawCsv, onConfirm, onCancel }: Props) {
  const incomingCols = schema.map(s => s.name)
  
  // Build initial mapping: for removed expected cols, try to suggest a match from added cols
  const initialMap: Record<string, string> = {}
  for (const expected of EXPECTED_COLUMNS) {
    if (diff.unchanged.includes(expected)) {
      initialMap[expected] = expected
    } else {
      // Try fuzzy match from added cols
      const match = diff.added.find(a =>
        a.toLowerCase().replace(/[^a-z0-9]/g, '').includes(expected.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6))
      )
      initialMap[expected] = match ?? '__skip__'
    }
  }

  const [mapping, setMapping] = useState<Record<string, string>>(initialMap)

  const handleConfirm = () => {
    const colMap: Record<string, string> = {}
    for (const [expected, incoming] of Object.entries(mapping)) {
      if (incoming && incoming !== '__skip__') {
        colMap[expected] = incoming
      }
    }
    onConfirm(colMap, rawCsv)
  }

  const affectedFields = EXPECTED_COLUMNS.filter(
    c => diff.removed.includes(c) || diff.added.length > 0
  )
  const removedFields = diff.removed

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800">Schema Change Detected</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              The uploaded CSV has different columns. Map them to the expected fields below.
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Diff Summary */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex gap-4 flex-wrap text-xs font-medium">
          {diff.added.length > 0 && (
            <span className="text-emerald-600">
              +{diff.added.length} new column{diff.added.length > 1 ? 's' : ''}: {diff.added.join(', ')}
            </span>
          )}
          {diff.removed.length > 0 && (
            <span className="text-red-500">
              -{diff.removed.length} removed: {diff.removed.join(', ')}
            </span>
          )}
          <span className="text-slate-400">{diff.unchanged.length} unchanged</span>
        </div>

        {/* Mapping UI */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <p className="text-xs text-slate-500 mb-2">
            For each expected field that is missing or renamed, select the incoming column it maps to (or skip if not available):
          </p>

          {removedFields.map(expected => (
            <div key={expected} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-700">{expected}</div>
                <div className="text-xs text-red-500 mt-0.5">Expected column — not found in new CSV</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              <select
                value={mapping[expected] ?? '__skip__'}
                onChange={e => setMapping(m => ({ ...m, [expected]: e.target.value }))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[180px]"
              >
                <option value="__skip__">— Skip this field —</option>
                {incomingCols.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          ))}

          {diff.added.length > 0 && removedFields.length === 0 && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-emerald-700">All existing columns found</div>
                <div className="text-xs text-emerald-600 mt-0.5">
                  New columns ({diff.added.join(', ')}) will be available but not mapped to standard fields.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            Confirm & Reload Data
          </button>
        </div>
      </div>
    </div>
  )
}