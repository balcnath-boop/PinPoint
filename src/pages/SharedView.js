import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { fetchSharedTrip } from '../lib/api'
import { CATEGORIES } from '../lib/supabase'

export default function SharedView() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [activeDayId, setActiveDayId] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const result = await fetchSharedTrip(token)
      setData(result)
      if (!activeDayId && result.days.length) setActiveDayId(result.days[0].id)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [token]) // eslint-disable-line

  // Auto-refresh every 60s so family sees real-time updates
  useEffect(() => {
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [token]) // eslint-disable-line

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#1A1814', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white' }} />
    </div>
  )

  if (error || !data) return (
    <div style={{ minHeight: '100vh', background: '#1A1814', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'white' }}>
      <div style={{ fontSize: 32 }}>📍</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 24 }}>Trip not found</div>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>This link may be invalid or the trip has been removed.</div>
    </div>
  )

  const { trip, days, places } = data
  const activeDay = days.find(d => d.id === activeDayId) || days[0]
  const dayPlaces = places.filter(p => p.day_id === activeDay?.id)
  const totalCompleted = places.filter(p => p.completed).length
  const pct = places.length ? Math.round((totalCompleted / places.length) * 100) : 0

  const fmtDT = (v) => v ? format(new Date(v), 'MMM d · h:mm aa') : null

  const hasFlightOut = trip.flight_out_number || trip.flight_out_airline
  const hasFlightRet = trip.flight_ret_number || trip.flight_ret_airline
  const hasHotel = trip.hotel_name

  return (
    <div style={{ minHeight: '100vh', background: '#1A1814', color: 'white', display: 'flex', flexDirection: 'column', fontFamily: 'var(--sans)' }}>

      {/* Header */}
      <div style={{ padding: '28px 28px 0', flexShrink: 0 }}>

        {/* Logo + live badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 18, height: 18, background: 'var(--accent)', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', position: 'relative', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 6, height: 6, background: '#1A1814', borderRadius: '50%', transform: 'translate(-50%,-50%)' }} />
            </div>
            Pinpoint
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s ease infinite' }} />
            Live · Read only
          </div>
        </div>

        {/* Trip name */}
        <div style={{ fontFamily: 'var(--serif)', fontSize: 38, lineHeight: 1.15, marginBottom: 4 }}>
          {trip.trip_name}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>
          {format(parseISO(trip.start_date), 'MMM d')} – {format(parseISO(trip.end_date), 'MMM d, yyyy')} · {trip.destination}
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
            <div style={{ height: '100%', borderRadius: 2, background: '#4ade80', width: `${pct}%`, transition: 'width 0.6s ease' }} />
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
            {totalCompleted} of {places.length} places visited
          </span>
        </div>

        {/* Logistics grid */}
        {(hasFlightOut || hasFlightRet || hasHotel) && (
          <div style={{ display: 'grid', gridTemplateColumns: hasHotel && (hasFlightOut || hasFlightRet) ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 20 }}>
            {(hasFlightOut || hasFlightRet) && (
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(74,101,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✈</div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Flights</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {hasFlightOut && <>
                    {trip.flight_out_number && <SharedLogRow label="Outbound" value={trip.flight_out_number} code />}
                    {trip.flight_out_arrives && <SharedLogRow label="Arrives" value={fmtDT(trip.flight_out_arrives)} />}
                  </>}
                  {hasFlightRet && <>
                    {trip.flight_ret_number && <SharedLogRow label="Return" value={trip.flight_ret_number} code />}
                    {trip.flight_ret_departs && <SharedLogRow label="Departs" value={fmtDT(trip.flight_ret_departs)} />}
                  </>}
                </div>
              </div>
            )}
            {hasHotel && (
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(91,79,207,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⌂</div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Hotel</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <SharedLogRow label="Staying at" value={trip.hotel_name} />
                  {trip.hotel_checkin && <SharedLogRow label="Check-in" value={fmtDT(trip.hotel_checkin)} />}
                  {trip.hotel_checkout && <SharedLogRow label="Check-out" value={fmtDT(trip.hotel_checkout)} />}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Day tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 0 }}>
          {days.map(d => (
            <button key={d.id} onClick={() => setActiveDayId(d.id)} style={{
              padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
              fontFamily: 'var(--sans)', transition: 'all 0.15s',
              background: activeDayId === d.id ? 'white' : 'none',
              color: activeDayId === d.id ? '#1A1814' : 'rgba(255,255,255,0.5)',
              border: `1px solid ${activeDayId === d.id ? 'white' : 'rgba(255,255,255,0.12)'}`,
            }}>
              Day {d.day_number}{d.label ? ` — ${d.label}` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', marginTop: 0 }}>

        {/* Places list */}
        <div style={{ width: 360, flexShrink: 0, overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ padding: '20px 24px' }}>
            {activeDay && (
              <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                {format(parseISO(activeDay.date), 'EEEE, MMM d')}
              </div>
            )}
            {dayPlaces.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                No places planned for this day yet.
              </div>
            )}
            {dayPlaces.map((place, i) => {
              const c = CATEGORIES[place.category] || CATEGORIES.other
              return (
                <div key={place.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 500,
                    background: place.completed ? '#4ade80' : 'transparent',
                    border: `1px solid ${place.completed ? '#4ade80' : 'rgba(255,255,255,0.2)'}`,
                    color: place.completed ? '#1A1814' : 'rgba(255,255,255,0.4)',
                  }}>
                    {place.completed
                      ? <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="#1A1814" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,4 3.5,6.5 9,1" /></svg>
                      : i + 1
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3, color: place.completed ? 'rgba(255,255,255,0.4)' : 'white', textDecoration: place.completed ? 'line-through' : 'none', textDecorationColor: 'rgba(255,255,255,0.2)' }}>
                      {place.name}
                    </div>
                    {place.address && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{place.address}</div>}
                    {place.notes && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', marginTop: 4 }}>"{place.notes}"</div>}
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 10, marginTop: 5, display: 'inline-block', background: place.completed ? 'rgba(74,222,128,0.15)' : c.bg, color: place.completed ? '#4ade80' : c.text }}>
                      {place.completed ? 'Visited' : c.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Dark map placeholder */}
        <div style={{ flex: 1, background: '#1E1C1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 28 }}>🗺</div>
          <div style={{ fontSize: 12 }}>Map view</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>Powered by Mapbox</div>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}

function SharedLogRow({ label, value, code }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{label}</span>
      {code
        ? <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 3, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)' }}>{value}</span>
        : <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>{value}</span>
      }
    </div>
  )
}
