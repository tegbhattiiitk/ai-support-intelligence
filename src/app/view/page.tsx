import type { Metadata } from 'next'
import ViewOnlyDashboard from '@/components/ViewOnlyDashboard'

export const metadata: Metadata = {
  title: 'Support Dashboard — View',
  description: 'Executive view of data platform support program health',
}

export default function ViewPage() {
  return <ViewOnlyDashboard />
}