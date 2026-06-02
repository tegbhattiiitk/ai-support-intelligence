import Papa from 'papaparse'

export interface RawRow {
  [key: string]: string
}

export interface ParsedRow {
  conversation_id: string
  channel_name: string
  platform_name: string
  ticket_title: string
  initial_user_name: string
  initial_user_role: string
  thread_participants: string
  first_message_timestamp: Date | null
  acknowledgment_timestamp: Date | null
  resolution_timestamp: Date | null
  acknowledging_engineer_name: string
  resolving_engineer_name: string
  resolution_owner_type: string
  support_tier_involved: string
  was_escalated: boolean
  conversation_length_comments: number
  user_count_in_thread: number
  engineer_count_in_thread: number
  business_impact_level: string
  urgency_level: string
  resolution_status: string
  resolution_summary: string
  slack_thread_link: string
  raw_thread_conversation: string
  category: string
  // Derived
  tta_minutes: number | null
  ttr_minutes: number | null
  ttr_hours: number | null
  date_str: string
}

export interface SchemaField {
  name: string
  detectedType: 'timestamp' | 'boolean' | 'number' | 'string'
  sampleValues: string[]
}

export interface ParseResult {
  rows: ParsedRow[]
  rawRows: RawRow[]
  schema: SchemaField[]
  columnNames: string[]
}

const EXPECTED_COLUMNS = [
  'conversation_id', 'channel_name', 'platform_name', 'ticket_title',
  'initial_user_name', 'initial_user_role', 'thread_participants',
  'first_message_timestamp', 'acknowledgment_timestamp', 'resolution_timestamp',
  'acknowledging_engineer_name', 'resolving_engineer_name', 'resolution_owner_type',
  'support_tier_involved', 'was_escalated', 'conversation_length_comments',
  'user_count_in_thread', 'engineer_count_in_thread', 'business_impact_level',
  'urgency_level', 'resolution_status', 'resolution_summary', 'slack_thread_link',
  'raw_thread_conversation', 'category',
]

export function parseTimestamp(val: string): Date | null {
  if (!val || val.trim() === '') return null
  const d = new Date(val.trim())
  return isNaN(d.getTime()) ? null : d
}

export function diffMinutes(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null
  const diff = (b.getTime() - a.getTime()) / 60000
  return diff < 0 ? null : Math.round(diff)
}

export function detectType(values: string[]): SchemaField['detectedType'] {
  const nonEmpty = values.filter(v => v && v.trim() !== '').slice(0, 5)
  if (nonEmpty.length === 0) return 'string'
  const tsHits = nonEmpty.filter(v => /\d{4}-\d{2}-\d{2}/.test(v))
  if (tsHits.length >= nonEmpty.length * 0.6) return 'timestamp'
  const boolHits = nonEmpty.filter(v => /^(yes|no|true|false)$/i.test(v.trim()))
  if (boolHits.length >= nonEmpty.length * 0.8) return 'boolean'
  const numHits = nonEmpty.filter(v => !isNaN(Number(v.trim())))
  if (numHits.length >= nonEmpty.length * 0.8) return 'number'
  return 'string'
}

export function detectSchema(rawRows: RawRow[]): SchemaField[] {
  if (rawRows.length === 0) return []
  const cols = Object.keys(rawRows[0])
  return cols.map(col => {
    const values = rawRows.slice(0, 10).map(r => r[col] ?? '')
    return {
      name: col,
      detectedType: detectType(values),
      sampleValues: values.slice(0, 3),
    }
  })
}

export function computeSchemaDiff(
  incoming: string[],
  expected: string[]
): { added: string[]; removed: string[]; unchanged: string[] } {
  const inSet = new Set(incoming)
  const exSet = new Set(expected)
  return {
    added: incoming.filter(c => !exSet.has(c)),
    removed: expected.filter(c => !inSet.has(c)),
    unchanged: incoming.filter(c => exSet.has(c)),
  }
}

function mapRow(raw: RawRow, colMap: Record<string, string>): ParsedRow {
  const get = (field: string) => raw[colMap[field] ?? field] ?? ''

  const firstMsg = parseTimestamp(get('first_message_timestamp'))
  const ackMsg = parseTimestamp(get('acknowledgment_timestamp'))
  const resMsg = parseTimestamp(get('resolution_timestamp'))
  const ttaMin = diffMinutes(firstMsg, ackMsg)
  const ttrMin = diffMinutes(firstMsg, resMsg)

  const dateStr = firstMsg
    ? firstMsg.toISOString().slice(0, 10)
    : ''

  return {
    conversation_id: get('conversation_id'),
    channel_name: get('channel_name'),
    platform_name: get('platform_name'),
    ticket_title: get('ticket_title'),
    initial_user_name: get('initial_user_name'),
    initial_user_role: get('initial_user_role'),
    thread_participants: get('thread_participants'),
    first_message_timestamp: firstMsg,
    acknowledgment_timestamp: ackMsg,
    resolution_timestamp: resMsg,
    acknowledging_engineer_name: get('acknowledging_engineer_name'),
    resolving_engineer_name: get('resolving_engineer_name'),
    resolution_owner_type: get('resolution_owner_type'),
    support_tier_involved: get('support_tier_involved'),
    was_escalated: /^yes$/i.test(get('was_escalated').trim()),
    conversation_length_comments: parseInt(get('conversation_length_comments')) || 0,
    user_count_in_thread: parseInt(get('user_count_in_thread')) || 0,
    engineer_count_in_thread: parseInt(get('engineer_count_in_thread')) || 0,
    business_impact_level: get('business_impact_level'),
    urgency_level: get('urgency_level'),
    resolution_status: get('resolution_status'),
    resolution_summary: get('resolution_summary'),
    slack_thread_link: get('slack_thread_link'),
    raw_thread_conversation: get('raw_thread_conversation'),
    category: get('category'),
    tta_minutes: ttaMin,
    ttr_minutes: ttrMin,
    ttr_hours: ttrMin !== null ? Math.round((ttrMin / 60) * 10) / 10 : null,
    date_str: dateStr,
  }
}

export function parseCsv(csvText: string, colMap: Record<string, string> = {}): ParseResult {
  const result = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  })

  const rawRows = result.data as RawRow[]
  const schema = detectSchema(rawRows)
  const columnNames = rawRows.length > 0 ? Object.keys(rawRows[0]) : []

  // Fill in identity mapping for unmapped columns
  const fullMap: Record<string, string> = { ...colMap }
  for (const expected of EXPECTED_COLUMNS) {
    if (!fullMap[expected]) fullMap[expected] = expected
  }

  const rows = rawRows
    .filter(r => r.conversation_id || r[fullMap['conversation_id']])
    .map(r => mapRow(r, fullMap))

  return { rows, rawRows, schema, columnNames }
}

export { EXPECTED_COLUMNS }