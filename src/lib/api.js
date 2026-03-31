import { supabase } from '../lib/supabase'
import { addDays, differenceInDays, format } from 'date-fns'

// ── Trips ────────────────────────────────────────────────────

export async function fetchTrips(userId) {
  const { data, error } = await supabase
    .from('trips')
    .select('*, days(count), places(count, completed)')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('start_date', { ascending: true })
  if (error) throw error
  return data
}

export async function fetchTrip(tripId) {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single()
  if (error) throw error
  return data
}

export async function createTrip({ userId, name, destination, startDate, endDate, coverColor }) {
  // Create the trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .insert({ user_id: userId, name, destination, start_date: startDate, end_date: endDate, cover_color: coverColor })
    .select()
    .single()
  if (tripError) throw tripError

  // Auto-generate Day records
  const numDays = differenceInDays(new Date(endDate), new Date(startDate)) + 1
  const dayRows = Array.from({ length: numDays }, (_, i) => ({
    trip_id: trip.id,
    date: format(addDays(new Date(startDate), i), 'yyyy-MM-dd'),
    day_number: i + 1,
    label: null,
  }))
  const { error: daysError } = await supabase.from('days').insert(dayRows)
  if (daysError) throw daysError

  return trip
}

export async function updateTrip(tripId, updates) {
  const { data, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', tripId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function archiveTrip(tripId) {
  return updateTrip(tripId, { is_archived: true })
}

// ── Days ────────────────────────────────────────────────────

export async function fetchDays(tripId) {
  const { data, error } = await supabase
    .from('days')
    .select('*')
    .eq('trip_id', tripId)
    .order('day_number')
  if (error) throw error
  return data
}

export async function updateDayLabel(dayId, label) {
  const { error } = await supabase
    .from('days')
    .update({ label })
    .eq('id', dayId)
  if (error) throw error
}

// ── Places ───────────────────────────────────────────────────

export async function fetchPlacesForTrip(tripId) {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order')
  if (error) throw error
  return data
}

export async function addPlace({ tripId, dayId, name, address, latitude, longitude, category, notes }) {
  // Get current max sort_order for this day
  const { data: existing } = await supabase
    .from('places')
    .select('sort_order')
    .eq('day_id', dayId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = existing?.length ? (existing[0].sort_order + 1) : 0

  const { data, error } = await supabase
    .from('places')
    .insert({ trip_id: tripId, day_id: dayId, name, address, latitude, longitude, category, notes, sort_order: nextOrder })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePlace(placeId, updates) {
  const { data, error } = await supabase
    .from('places')
    .update(updates)
    .eq('id', placeId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function togglePlaceComplete(placeId, completed) {
  return updatePlace(placeId, {
    completed,
    completed_at: completed ? new Date().toISOString() : null,
  })
}

export async function deletePlace(placeId) {
  const { error } = await supabase.from('places').delete().eq('id', placeId)
  if (error) throw error
}

export async function reorderPlaces(dayId, orderedIds) {
  // Batch update sort_order
  const updates = orderedIds.map((id, i) =>
    supabase.from('places').update({ sort_order: i }).eq('id', id)
  )
  await Promise.all(updates)
}

// ── Shared view (anon, via RPC) ──────────────────────────────

export async function fetchSharedTrip(token) {
  const [tripRes, daysRes, placesRes] = await Promise.all([
    supabase.rpc('get_trip_by_token', { token }),
    supabase.rpc('get_days_by_token', { token }),
    supabase.rpc('get_places_by_token', { token }),
  ])
  if (tripRes.error) throw tripRes.error
  if (!tripRes.data?.length) throw new Error('Trip not found')
  return {
    trip: tripRes.data[0],
    days: daysRes.data ?? [],
    places: placesRes.data ?? [],
  }
}
