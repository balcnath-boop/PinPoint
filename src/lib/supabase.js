import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Types ────────────────────────────────────────────────────

export const CATEGORIES = {
  sight:     { label: 'Sight',     color: '#E8533A', bg: '#FCEAE7', text: '#C23A24', emoji: '🏛' },
  food:      { label: 'Food',      color: '#C97B1A', bg: '#FDF3E3', text: '#9A5E0E', emoji: '🍜' },
  hotel:     { label: 'Hotel',     color: '#5B4FCF', bg: '#EFEDFC', text: '#3D33A8', emoji: '🏨' },
  activity:  { label: 'Activity',  color: '#2A7B6F', bg: '#E4F2EF', text: '#1A5A50', emoji: '🎯' },
  transport: { label: 'Transport', color: '#4A6580', bg: '#EBF0F5', text: '#334860', emoji: '🚇' },
  other:     { label: 'Other',     color: '#8C8780', bg: '#F5F1EB', text: '#4A4640', emoji: '📍' },
}

export const COVER_COLORS = [
  '#2A4A6B', '#1B4332', '#7B2D8B', '#B5451B',
  '#1A3550', '#2D4739', '#4A1861', '#6B3A2A',
]
