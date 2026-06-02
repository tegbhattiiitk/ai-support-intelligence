import type { KPIMetrics } from '@/lib/metrics'
import { TrendingUp, Clock, AlertTriangle, CheckCircle, BarChart2, Zap } from 'lucide-react'
import { clsx } from 'clsx'

interface Props {
  metrics: KPIMetrics
}

function formatMinutes(min: number | null): string {
  if (min === null) return 'N/A'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  trend,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
  trend?: 'good' | 'bad' | 'neutral'
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <div>
        <div className="text-3xl font-bold text-slate-800 leading-none">{value}</div>
        {sub && (
          <div className={clsx('text-xs mt-1.5 font-medium', {
            'text-emerald-500': trend === 'good',
            'text-red-500': trend === 'bad',
            'text-slate-400': trend === 'neutral' || !trend,
          })}>
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}

export default function KPIGrid({ metrics }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <KPICard
        label="Total Tickets"
        value={metrics.totalTickets}
        sub={`${metrics.escalatedCount} escalated`}
        icon={BarChart2}
        color="bg-indigo-50 text-indigo-600"
        trend="neutral"
      />
      <KPICard
        label="Resolution Rate"
        value={`${metrics.resolutionRate}%`}
        sub={`${metrics.resolvedCount} resolved`}
        icon={CheckCircle}
        color={metrics.resolutionRate >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}
        trend={metrics.resolutionRate >= 80 ? 'good' : 'bad'}
      />
      <KPICard
        label="SLA ≤4h"
        value={`${metrics.slaCompliance}%`}
        sub="Resolved within 4 hours"
        icon={Zap}
        color={metrics.slaCompliance >= 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}
        trend={metrics.slaCompliance >= 70 ? 'good' : 'bad'}
      />
      <KPICard
        label="Median TTA"
        value={formatMinutes(metrics.medianTTA)}
        sub="Time to Acknowledge"
        icon={Clock}
        color="bg-blue-50 text-blue-600"
        trend="neutral"
      />
      <KPICard
        label="Median TTR"
        value={formatMinutes(metrics.medianTTR)}
        sub="Time to Resolve"
        icon={TrendingUp}
        color="bg-violet-50 text-violet-600"
        trend="neutral"
      />
      <KPICard
        label="Escalation Rate"
        value={`${metrics.escalationRate}%`}
        sub={`${metrics.escalatedCount} escalated`}
        icon={AlertTriangle}
        color={metrics.escalationRate <= 20 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}
        trend={metrics.escalationRate <= 20 ? 'good' : 'bad'}
      />
    </div>
  )
}