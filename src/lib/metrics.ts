import type { ParsedRow } from './csvParser'

export interface KPIMetrics {
  totalTickets: number
  resolvedCount: number
  resolutionRate: number
  escalatedCount: number
  escalationRate: number
  medianTTA: number | null
  medianTTR: number | null
  avgConversationLength: number
  ticketsByPlatform: { name: string; count: number }[]
  ticketsByStatus: { name: string; count: number; color: string }[]
  ticketsByUrgency: { name: string; count: number; color: string }[]
  ticketsByImpact: { name: string; count: number; color: string }[]
  dailyVolume: { date: string; count: number; resolved: number }[]
  ttrTrend: { date: string; medianTTR: number | null }[]
  engineerLoad: { name: string; count: number }[]
  topIssueTypes: { name: string; count: number }[]
  slaCompliance: number // % resolved within 4 hours
  weeklyTrend: { week: string; count: number }[]
  resolutionOwner: { name: string; count: number }[]
}

function median(arr: number[]): number | null {
  if (arr.length === 0) return null
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

const STATUS_COLORS: Record<string, string> = {
  Resolved: '#22c55e',
  Redirected: '#f59e0b',
  'No Response': '#ef4444',
  Duplicate: '#8b5cf6',
  'Partially Resolved': '#3b82f6',
  Other: '#94a3b8',
}

const URGENCY_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#22c55e',
}

const IMPACT_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#22c55e',
}

export function computeMetrics(rows: ParsedRow[], filtered?: ParsedRow[]): KPIMetrics {
  const data = filtered ?? rows

  const totalTickets = data.length
  const resolvedCount = data.filter(r => r.resolution_status === 'Resolved').length
  const resolutionRate = totalTickets > 0 ? Math.round((resolvedCount / totalTickets) * 100) : 0

  const escalatedCount = data.filter(r => r.was_escalated).length
  const escalationRate = totalTickets > 0 ? Math.round((escalatedCount / totalTickets) * 100) : 0

  const ttaValues = data.map(r => r.tta_minutes).filter((v): v is number => v !== null)
  const ttrValues = data.map(r => r.ttr_minutes).filter((v): v is number => v !== null)
  const convLengths = data.map(r => r.conversation_length_comments).filter(v => v > 0)

  const medianTTA = median(ttaValues)
  const medianTTR = median(ttrValues)
  const avgConversationLength =
    convLengths.length > 0
      ? Math.round(convLengths.reduce((a, b) => a + b, 0) / convLengths.length)
      : 0

  // Tickets by platform
  const platformMap = new Map<string, number>()
  for (const r of data) {
    const key = r.platform_name || 'Unknown'
    platformMap.set(key, (platformMap.get(key) ?? 0) + 1)
  }
  const ticketsByPlatform = Array.from(platformMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // By status
  const statusMap = new Map<string, number>()
  for (const r of data) {
    const key = r.resolution_status || 'Other'
    statusMap.set(key, (statusMap.get(key) ?? 0) + 1)
  }
  const ticketsByStatus = Array.from(statusMap.entries())
    .map(([name, count]) => ({ name, count, color: STATUS_COLORS[name] ?? STATUS_COLORS.Other }))
    .sort((a, b) => b.count - a.count)

  // By urgency
  const urgencyMap = new Map<string, number>()
  for (const r of data) {
    const key = r.urgency_level || 'Unknown'
    urgencyMap.set(key, (urgencyMap.get(key) ?? 0) + 1)
  }
  const urgencyOrder = ['Critical', 'High', 'Medium', 'Low']
  const ticketsByUrgency = Array.from(urgencyMap.entries())
    .map(([name, count]) => ({ name, count, color: URGENCY_COLORS[name] ?? '#94a3b8' }))
    .sort((a, b) => urgencyOrder.indexOf(a.name) - urgencyOrder.indexOf(b.name))

  // By impact
  const impactMap = new Map<string, number>()
  for (const r of data) {
    const key = r.business_impact_level || 'Unknown'
    impactMap.set(key, (impactMap.get(key) ?? 0) + 1)
  }
  const ticketsByImpact = Array.from(impactMap.entries())
    .map(([name, count]) => ({ name, count, color: IMPACT_COLORS[name] ?? '#94a3b8' }))
    .sort((a, b) => urgencyOrder.indexOf(a.name) - urgencyOrder.indexOf(b.name))

  // Daily volume
  const dailyMap = new Map<string, { count: number; resolved: number }>()
  for (const r of data) {
    if (!r.date_str) continue
    const existing = dailyMap.get(r.date_str) ?? { count: 0, resolved: 0 }
    existing.count++
    if (r.resolution_status === 'Resolved') existing.resolved++
    dailyMap.set(r.date_str, existing)
  }
  const dailyVolume = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // TTR Trend by day
  const ttrByDay = new Map<string, number[]>()
  for (const r of data) {
    if (!r.date_str || r.ttr_minutes === null) continue
    const arr = ttrByDay.get(r.date_str) ?? []
    arr.push(r.ttr_minutes)
    ttrByDay.set(r.date_str, arr)
  }
  const ttrTrend = Array.from(ttrByDay.entries())
    .map(([date, vals]) => ({ date, medianTTR: median(vals) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Engineer load
  const engMap = new Map<string, number>()
  for (const r of data) {
    const key = r.resolving_engineer_name || 'Unknown'
    if (key === 'Unknown') continue
    engMap.set(key, (engMap.get(key) ?? 0) + 1)
  }
  const engineerLoad = Array.from(engMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // Top issue types
  const issueMap = new Map<string, number>()
  for (const r of data) {
    const key = r.ticket_title || 'Other'
    issueMap.set(key, (issueMap.get(key) ?? 0) + 1)
  }
  const topIssueTypes = Array.from(issueMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // SLA compliance: resolved within 4 hours (240 min)
  const slaWindow = 240
  const slaResolved = data.filter(
    r => r.ttr_minutes !== null && r.ttr_minutes <= slaWindow && r.resolution_status === 'Resolved'
  ).length
  const slaCompliance =
    resolvedCount > 0 ? Math.round((slaResolved / resolvedCount) * 100) : 0

  // Weekly trend
  const weekMap = new Map<string, number>()
  for (const r of data) {
    if (!r.first_message_timestamp) continue
    const d = r.first_message_timestamp
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().slice(0, 10)
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1)
  }
  const weeklyTrend = Array.from(weekMap.entries())
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => a.week.localeCompare(b.week))

  // Resolution owner type
  const ownerMap = new Map<string, number>()
  for (const r of data) {
    const key = r.resolution_owner_type || 'Unknown'
    ownerMap.set(key, (ownerMap.get(key) ?? 0) + 1)
  }
  const resolutionOwner = Array.from(ownerMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalTickets,
    resolvedCount,
    resolutionRate,
    escalatedCount,
    escalationRate,
    medianTTA,
    medianTTR,
    avgConversationLength,
    ticketsByPlatform,
    ticketsByStatus,
    ticketsByUrgency,
    ticketsByImpact,
    dailyVolume,
    ttrTrend,
    engineerLoad,
    topIssueTypes,
    slaCompliance,
    weeklyTrend,
    resolutionOwner,
  }
}

export function buildDataContext(rows: ParsedRow[], metrics: KPIMetrics): string {
  const platforms = metrics.ticketsByPlatform.map(p => `${p.name}: ${p.count}`).join(', ')
  const statuses = metrics.ticketsByStatus.map(s => `${s.name}: ${s.count}`).join(', ')
  const urgencies = metrics.ticketsByUrgency.map(u => `${u.name}: ${u.count}`).join(', ')
  const impacts = metrics.ticketsByImpact.map(i => `${i.name}: ${i.count}`).join(', ')
  const topEngineers = metrics.engineerLoad.slice(0, 5).map(e => `${e.name}: ${e.count} tickets`).join(', ')
  const topIssues = metrics.topIssueTypes.slice(0, 5).map(i => `${i.name}: ${i.count}`).join(', ')
  const dailySummary = metrics.dailyVolume.map(d => `${d.date}: ${d.count} tickets`).join(', ')

  return `
SUPPORT PROGRAM OVERVIEW (${rows.length} total tickets):
- Date range: ${rows.map(r => r.date_str).filter(Boolean).sort()[0]} to ${rows.map(r => r.date_str).filter(Boolean).sort().at(-1)}
- Total Tickets: ${metrics.totalTickets}
- Resolution Rate: ${metrics.resolutionRate}%
- Escalation Rate: ${metrics.escalationRate}%
- Median Time to Acknowledge: ${metrics.medianTTA !== null ? metrics.medianTTA + ' minutes' : 'N/A'}
- Median Time to Resolve: ${metrics.medianTTR !== null ? Math.round((metrics.medianTTR / 60) * 10) / 10 + ' hours' : 'N/A'}
- SLA Compliance (resolved ≤4h): ${metrics.slaCompliance}%
- Avg Conversation Length: ${metrics.avgConversationLength} messages

BY PLATFORM: ${platforms}
BY STATUS: ${statuses}
BY URGENCY: ${urgencies}
BY BUSINESS IMPACT: ${impacts}
TOP ENGINEERS: ${topEngineers}
TOP ISSUE TYPES: ${topIssues}
DAILY VOLUME: ${dailySummary}

RAW TICKET SUMMARY (key fields):
${rows.slice(0, 28).map(r =>
  `${r.conversation_id} | ${r.platform_name} | ${r.ticket_title} | ${r.resolution_status} | TTR: ${r.ttr_hours !== null ? r.ttr_hours + 'h' : 'N/A'} | TTA: ${r.tta_minutes !== null ? r.tta_minutes + 'min' : 'N/A'} | Urgency: ${r.urgency_level} | Impact: ${r.business_impact_level} | Date: ${r.date_str}`
).join('\n')}
`.trim()
}