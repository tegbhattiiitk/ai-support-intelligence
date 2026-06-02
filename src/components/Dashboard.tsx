'use client'

import { useState, useCallback, useEffect } from 'react'
import { parseCsv, computeSchemaDiff, EXPECTED_COLUMNS } from '@/lib/csvParser'
import type { ParsedRow, SchemaField } from '@/lib/csvParser'
import { computeMetrics, buildDataContext } from '@/lib/metrics'
import type { KPIMetrics } from '@/lib/metrics'
import Header from '@/components/Header'
import KPIGrid from '@/components/KPIGrid'
import ChartsSection from '@/components/ChartsSection'
import FiltersBar from '@/components/FiltersBar'
import TicketTable from '@/components/TicketTable'
import ChatBot from '@/components/ChatBot'
import SchemaReconciliation from '@/components/SchemaReconciliation'
import { Download, Upload, Share2, MessageSquare, X, Table } from 'lucide-react'

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

const DEFAULT_FILTERS: Filters = {
  platform: 'all',
  status: 'all',
  urgency: 'all',
  impact: 'all',
  dateFrom: '',
  dateTo: '',
  engineer: 'all',
  category: 'all',
}

export default function Dashboard() {
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [metrics, setMetrics] = useState<KPIMetrics | null>(null)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [filteredRows, setFilteredRows] = useState<ParsedRow[]>([])
  const [dataContext, setDataContext] = useState<string>('')
  const [chatOpen, setChatOpen] = useState(false)
  const [tableOpen, setTableOpen] = useState(false)
  const [shareToast, setShareToast] = useState(false)
  const [loading, setLoading] = useState(false)
  const [colMap, setColMap] = useState<Record<string, string>>({})
  const [pendingSchema, setPendingSchema] = useState<{
    rawCsv: string
    schema: SchemaField[]
    diff: { added: string[]; removed: string[]; unchanged: string[] }
  } | null>(null)

  // Load default CSV on mount
  useEffect(() => {
    fetch('/raw_support_threads.csv')
      .then(r => r.text())
      .then(text => {
        const result = parseCsv(text, {})
        setRows(result.rows)
        setFilteredRows(result.rows)
        const m = computeMetrics(result.rows)
        setMetrics(m)
        setDataContext(buildDataContext(result.rows, m))
      })
      .catch(() => {/* silent */})
  }, [])

  const applyFilters = useCallback((allRows: ParsedRow[], f: Filters) => {
    return allRows.filter(r => {
      if (f.platform !== 'all' && r.platform_name !== f.platform) return false
      if (f.status !== 'all' && r.resolution_status !== f.status) return false
      if (f.urgency !== 'all' && r.urgency_level !== f.urgency) return false
      if (f.impact !== 'all' && r.business_impact_level !== f.impact) return false
      if (f.engineer !== 'all' && r.resolving_engineer_name !== f.engineer) return false
      if (f.category !== 'all' && r.category !== f.category) return false
      if (f.dateFrom && r.date_str < f.dateFrom) return false
      if (f.dateTo && r.date_str > f.dateTo) return false
      return true
    })
  }, [])

  const handleFilterChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters)
    const filtered = applyFilters(rows, newFilters)
    setFilteredRows(filtered)
    const m = computeMetrics(rows, filtered)
    setMetrics(m)
    setDataContext(buildDataContext(filtered, m))
  }, [rows, applyFilters])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      // Quick parse to detect schema
      const quickResult = parseCsv(text, {})
      const incoming = quickResult.columnNames
      const diff = computeSchemaDiff(incoming, EXPECTED_COLUMNS)

      if (diff.added.length > 0 || diff.removed.length > 0) {
        // Show reconciliation UI
        setPendingSchema({ rawCsv: text, schema: quickResult.schema, diff })
      } else {
        // Direct load
        const result = parseCsv(text, colMap)
        setRows(result.rows)
        const filtered = applyFilters(result.rows, DEFAULT_FILTERS)
        setFilters(DEFAULT_FILTERS)
        setFilteredRows(filtered)
        const m = computeMetrics(result.rows, filtered)
        setMetrics(m)
        setDataContext(buildDataContext(filtered, m))
      }
      setLoading(false)
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [colMap, applyFilters])

  const handleReconciliationConfirm = useCallback((newColMap: Record<string, string>, rawCsv: string) => {
    setColMap(newColMap)
    const result = parseCsv(rawCsv, newColMap)
    setRows(result.rows)
    const filtered = applyFilters(result.rows, DEFAULT_FILTERS)
    setFilters(DEFAULT_FILTERS)
    setFilteredRows(filtered)
    const m = computeMetrics(result.rows, filtered)
    setMetrics(m)
    setDataContext(buildDataContext(filtered, m))
    setPendingSchema(null)
  }, [applyFilters])

  const handleShare = () => {
    const url = `${window.location.origin}/view`
    navigator.clipboard.writeText(url).then(() => {
      setShareToast(true)
      setTimeout(() => setShareToast(false), 3000)
    })
  }

  const handlePdfExport = async () => {
    const { default: jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')
    const element = document.getElementById('dashboard-content')
    if (!element) return

    const canvas = await html2canvas(element, { scale: 1.5, useCORS: true, backgroundColor: '#f8fafc' })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] })
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
    pdf.save('support-dashboard.pdf')
  }

  const platforms = [...new Set(rows.map(r => r.platform_name).filter(Boolean))]
  const statuses = [...new Set(rows.map(r => r.resolution_status).filter(Boolean))]
  const urgencies = [...new Set(rows.map(r => r.urgency_level).filter(Boolean))]
  const impacts = [...new Set(rows.map(r => r.business_impact_level).filter(Boolean))]
  const engineers = [...new Set(rows.map(r => r.resolving_engineer_name).filter(Boolean))]
  const categories = [...new Set(rows.map(r => r.category).filter(Boolean))].sort()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/30">
      {/* Schema Reconciliation Modal */}
      {pendingSchema && (
        <SchemaReconciliation
          schema={pendingSchema.schema}
          diff={pendingSchema.diff}
          rawCsv={pendingSchema.rawCsv}
          onConfirm={handleReconciliationConfirm}
          onCancel={() => setPendingSchema(null)}
        />
      )}

      <Header />

      {/* Toolbar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider mr-2">
            {filteredRows.length} tickets
            {filteredRows.length !== rows.length && ` / ${rows.length} total`}
          </span>
          <div className="flex-1" />

          {/* Upload CSV */}
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            {loading ? 'Loading...' : 'Upload CSV'}
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>

          {/* View Table */}
          <button
            onClick={() => setTableOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
          >
            <Table className="w-4 h-4" />
            <span className="hidden sm:inline">Raw Data</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* PDF Export */}
          <button
            onClick={handlePdfExport}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>

          {/* Chat */}
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-medium transition-all shadow-sm"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </div>
      </div>

      {/* Share toast */}
      {shareToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-pulse">
          ✓ Share link copied to clipboard!
        </div>
      )}

      {/* Main content */}
      <div id="dashboard-content" className="max-w-screen-2xl mx-auto px-4 sm:px-6 pb-12 pt-6 space-y-6">
        {/* Filters */}
        <FiltersBar
          filters={filters}
          platforms={platforms}
          statuses={statuses}
          urgencies={urgencies}
          impacts={impacts}
          engineers={engineers}
          categories={categories}
          onChange={handleFilterChange}
        />

        {/* KPIs */}
        {metrics && <KPIGrid metrics={metrics} />}

        {/* Charts */}
        {metrics && <ChartsSection metrics={metrics} />}
      </div>

      {/* Ticket Table Drawer */}
      {tableOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Raw Ticket Data ({filteredRows.length} rows)</h2>
            <button onClick={() => setTableOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <TicketTable rows={filteredRows} />
          </div>
        </div>
      )}

      {/* ChatBot */}
      {chatOpen && (
        <ChatBot
          dataContext={dataContext}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  )
}