import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Map, { Marker, Popup } from 'react-map-gl'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
  fetchTrip, fetchDays, fetchPlacesForTrip,
  addPlace, updatePlace, deletePlace, togglePlaceComplete,
  reorderPlaces, updateTrip,
} from '../lib/api'
import { CATEGORIES } from '../lib/supabase'
import PlacesAutocomplete from '../components/PlacesAutocomplete'

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN

export default function Builder() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeDayId, setActiveDayId] = useState(null)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [showAddPlace, setShowAddPlace] = useState(false)
  const [showLogistics, setShowLogistics] = useState(false)
  const [showEditLogistics, setShowEditLogistics] = useState(false)
  const [mapViewState, setMapViewState] = useState({ longitude: 126.9780, latitude: 37.5665, zoom: 11 })

  const { data: trip } = useQuery({ queryKey: ['trip', tripId], queryFn: () => fetchTrip(tripId) })
  const { data: days = [] } = useQuery({
    queryKey: ['days', tripId], queryFn: () => fetchDays(tripId),
    onSuccess: (d) => { if (d.length && !activeDayId) setActiveDayId(d[0].id) }
  })
  const { data: allPlaces = [] } = useQuery({ queryKey: ['places', tripId], queryFn: () => fetchPlacesForTrip(tripId) })

  useEffect(() => { if (days.length && !activeDayId) setActiveDayId(days[0].id) }, [days, activeDayId])

  const dayPlaces = allPlaces.filter(p => p.day_id === activeDayId)
  const activeDay = days.find(d => d.id === activeDayId)

  const invalidate = () => qc.invalidateQueries(['places', tripId])

  const addMut = useMutation({
    mutationFn: addPlace, onSuccess: () => { invalidate(); setShowAddPlace(false); toast.success('Place added!') },
    onError: e => toast.error(e.message),
  })
  const toggleMut = useMutation({
    mutationFn: ({ id, completed }) => togglePlaceComplete(id, completed),
    onSuccess: invalidate,
  })
  const deleteMut = useMutation({
    mutationFn: deletePlace,
    onSuccess: () => { invalidate(); setSelectedPlace(null); toast.success('Place removed') },
  })
  const updateLogisticsMut = useMutation({
    mutationFn: (updates) => updateTrip(tripId, updates),
    onSuccess: () => { qc.invalidateQueries(['trip', tripId]); setShowEditLogistics(false); toast.success('Logistics saved!') },
    onError: e => toast.error(e.message),
  })

  const copyShareLink = () => {
    const url = `${window.location.origin}/share/${trip?.share_token}`
    navigator.clipboard.writeText(url)
    toast.success('Share link copied!')
  }

  // Fit map to day's places
  useEffect(() => {
    if (dayPlaces.length && dayPlaces[0].latitude) {
      setMapViewState(v => ({ ...v, latitude: dayPlaces[0].latitude, longitude: dayPlaces[0].longitude, zoom: 13 }))
    }
  }, [activeDayId]) // eslint-disable-line

  if (!trip) return <div className="page-loader" style={{ paddingTop: 'var(--nav-h)' }}><div className="spinner" /></div>

  return (
    <div style={{ display: 'flex', height: '100vh', paddingTop: 'var(--nav-h)' }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: 380, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', background: 'white',
      }}>

        {/* Logistics strip */}
        <div style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={() => setShowLogistics(v => !v)} style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '11px 16px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--sans)', transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--sand)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 10, background: '#EBF0F5', color: '#334860' }}>✈ Flight</span>
                <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 10, background: '#EFEDFC', color: '#3D33A8' }}>⌂ Hotel</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-mid)' }}>Trip logistics</span>
            </div>
            <span style={{ color: 'var(--ink-light)', fontSize: 10, transform: showLogistics ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>▼</span>
          </button>

          {showLogistics && (
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <LogisticsCard trip={trip} />
              <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setShowEditLogistics(true)}>
                Edit logistics
              </button>
            </div>
          )}
        </div>

        {/* Trip header */}
        <div style={{ padding: '16px 20px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
            {trip.destination}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 22, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {trip.name}
            <button className="btn btn-ghost btn-sm" onClick={copyShareLink} style={{ fontFamily: 'var(--sans)', fontSize: 12 }}>
              Share ↗
            </button>
          </div>

          {/* Day tabs */}
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {days.map(d => (
              <button key={d.id} onClick={() => setActiveDayId(d.id)} style={{
                padding: '8px 14px', fontSize: 12, fontWeight: 500,
                color: activeDayId === d.id ? 'var(--accent)' : 'var(--ink-light)',
                borderBottom: `2px solid ${activeDayId === d.id ? 'var(--accent)' : 'transparent'}`,
                background: 'none', border: 'none',
                borderBottom: `2px solid ${activeDayId === d.id ? 'var(--accent)' : 'transparent'}`,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                fontFamily: 'var(--sans)', transition: 'all 0.15s',
              }}>
                Day {d.day_number}
              </button>
            ))}
          </div>
        </div>

        {/* Day label */}
        {activeDay && (
          <div style={{ padding: '10px 16px 0', fontSize: 11, fontWeight: 500, color: 'var(--ink-light)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {format(parseISO(activeDay.date), 'EEEE, MMM d')}
            {activeDay.label && <span style={{ color: 'var(--ink-mid)', textTransform: 'none', marginLeft: 6 }}>— {activeDay.label}</span>}
          </div>
        )}

        {/* Places list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {dayPlaces.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-light)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📍</div>
              <div style={{ fontSize: 13 }}>No places yet.<br />Add your first stop below.</div>
            </div>
          )}
          {dayPlaces.map(place => (
            <PlaceItem
              key={place.id}
              place={place}
              active={selectedPlace?.id === place.id}
              onSelect={() => setSelectedPlace(place)}
              onToggle={() => toggleMut.mutate({ id: place.id, completed: !place.completed })}
            />
          ))}
        </div>

        {/* Add button */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={() => setShowAddPlace(true)} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: 10, border: '1.5px dashed var(--border-med)', borderRadius: 'var(--radius-sm)',
            background: 'none', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500,
            color: 'var(--ink-light)', cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-soft)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-med)'; e.currentTarget.style.color = 'var(--ink-light)'; e.currentTarget.style.background = 'none' }}
          >
            <span style={{ fontSize: 16 }}>+</span> Add a place
          </button>
        </div>
      </div>

      {/* ── Map ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        {MAPBOX_TOKEN ? (
          <Map
            {...mapViewState}
            onMove={e => setMapViewState(e.viewState)}
            mapStyle="mapbox://styles/mapbox/light-v11"
            mapboxAccessToken={MAPBOX_TOKEN}
            style={{ width: '100%', height: '100%' }}
          >
            {allPlaces.filter(p => p.latitude).map((place, i) => {
              const c = CATEGORIES[place.category] || CATEGORIES.other
              return (
                <Marker key={place.id} longitude={place.longitude} latitude={place.latitude} anchor="bottom">
                  <div onClick={() => setSelectedPlace(place)} style={{
                    width: 30, height: 30, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)',
                    background: place.completed ? '#6b8f7e' : c.color,
                    border: '2px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    opacity: place.day_id !== activeDayId ? 0.35 : 1,
                    transition: 'opacity 0.2s',
                  }}>
                    <span style={{ transform: 'rotate(45deg)', fontSize: 11, color: 'white', fontWeight: 600 }}>
                      {place.completed ? '✓' : (dayPlaces.indexOf(place) + 1 || '·')}
                    </span>
                  </div>
                </Marker>
              )
            })}

            {selectedPlace && selectedPlace.latitude && (
              <Popup
                longitude={selectedPlace.longitude}
                latitude={selectedPlace.latitude}
                anchor="bottom" offset={36}
                onClose={() => setSelectedPlace(null)}
                closeOnClick={false}
              >
                <PlacePopup
                  place={selectedPlace}
                  onToggle={() => { toggleMut.mutate({ id: selectedPlace.id, completed: !selectedPlace.completed }); setSelectedPlace({ ...selectedPlace, completed: !selectedPlace.completed }) }}
                  onDelete={() => deleteMut.mutate(selectedPlace.id)}
                />
              </Popup>
            )}
          </Map>
        ) : (
          <MapFallback allPlaces={allPlaces} activeDayId={activeDayId} dayPlaces={dayPlaces} selectedPlace={selectedPlace} onSelect={setSelectedPlace} onToggle={(p) => toggleMut.mutate({ id: p.id, completed: !p.completed })} onDelete={(id) => deleteMut.mutate(id)} />
        )}
      </div>

      {/* Modals */}
      {showAddPlace && (
        <AddPlaceModal
          tripId={tripId}
          dayId={activeDayId}
          onClose={() => setShowAddPlace(false)}
          onSubmit={addMut.mutate}
          loading={addMut.isPending}
        />
      )}
      {showEditLogistics && (
        <LogisticsModal
          trip={trip}
          onClose={() => setShowEditLogistics(false)}
          onSubmit={updateLogisticsMut.mutate}
          loading={updateLogisticsMut.isPending}
        />
      )}
    </div>
  )
}

// ── Place item in sidebar ────────────────────────────────────
function PlaceItem({ place, active, onSelect, onToggle }) {
  const c = CATEGORIES[place.category] || CATEGORIES.other
  return (
    <div onClick={onSelect} style={{
      background: active ? 'white' : 'var(--sand)',
      border: `1px solid ${active ? 'var(--border-med)' : 'transparent'}`,
      boxShadow: active ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
      borderRadius: 'var(--radius-sm)', padding: '10px 10px 10px 8px',
      display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer',
      opacity: place.completed ? 0.65 : 1, transition: 'all 0.15s',
    }}>
      <div onClick={e => { e.stopPropagation(); onToggle() }} style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
        border: `1.5px solid ${place.completed ? 'var(--teal)' : 'var(--border-med)'}`,
        background: place.completed ? 'var(--teal)' : 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.2s',
      }}>
        {place.completed && <svg viewBox="0 0 10 8" width="10" height="8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,4 3.5,6.5 9,1" /></svg>}
      </div>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0, marginTop: 5 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{place.name}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{place.address}</div>
        <span className="cat-badge" style={{ background: c.bg, color: c.text, marginTop: 4 }}>{c.label}</span>
      </div>
    </div>
  )
}

// ── Map popup ────────────────────────────────────────────────
function PlacePopup({ place, onToggle, onDelete }) {
  const c = CATEGORIES[place.category] || CATEGORIES.other
  return (
    <div style={{ minWidth: 220, fontFamily: 'var(--sans)' }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 16, marginBottom: 4 }}>{place.name}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 8 }}>{place.address}</div>
      {place.notes && <div style={{ fontSize: 12, color: 'var(--ink-mid)', background: 'var(--sand)', borderRadius: 6, padding: '6px 8px', marginBottom: 10, fontStyle: 'italic' }}>"{place.notes}"</div>}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span className="cat-badge" style={{ background: c.bg, color: c.text }}>{c.label}</span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={onToggle}>
          {place.completed ? '↩ Unmark' : '✓ Visited'}
        </button>
        <button className="btn btn-danger btn-sm" onClick={onDelete}>✕</button>
      </div>
    </div>
  )
}

// ── Map fallback (no token) ──────────────────────────────────
function MapFallback({ allPlaces, activeDayId, dayPlaces, selectedPlace, onSelect, onToggle, onDelete }) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#E8E4DC', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--ink-light)', padding: 40 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🗺</div>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Map not configured</div>
        <div style={{ fontSize: 12 }}>Add <code>REACT_APP_MAPBOX_TOKEN</code> to your <code>.env</code> file</div>
      </div>
      {selectedPlace && (
        <div style={{
          position: 'absolute', bottom: 20, left: 20,
          background: 'white', borderRadius: 'var(--radius)', padding: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)', minWidth: 260,
        }}>
          <PlacePopup place={selectedPlace} onToggle={() => onToggle(selectedPlace)} onDelete={() => onDelete(selectedPlace.id)} />
        </div>
      )}
    </div>
  )
}

// ── Logistics display card ───────────────────────────────────
function LogisticsCard({ trip }) {
  const Row = ({ label, value, mono }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 11, color: 'var(--ink-light)' }}>{label}</span>
      {mono
        ? <span style={{ fontSize: 11, letterSpacing: '0.04em', background: 'white', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border)', color: 'var(--ink-mid)' }}>{value}</span>
        : <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{value}</span>
      }
    </div>
  )
  const fmtDT = (v) => v ? format(new Date(v), 'MMM d · h:mm aa') : '—'

  const hasFlightOut = trip.flight_out_number || trip.flight_out_airline
  const hasFlightRet = trip.flight_ret_number || trip.flight_ret_airline
  const hasHotel = trip.hotel_name

  if (!hasFlightOut && !hasFlightRet && !hasHotel) {
    return <div style={{ fontSize: 12, color: 'var(--ink-light)', fontStyle: 'italic' }}>No logistics added yet.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {hasFlightOut && (
        <div style={{ background: 'var(--sand)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>✈</span> {trip.flight_out_airline || 'Outbound flight'} · {trip.flight_out_number}
          </div>
          {trip.flight_out_confirmation && <Row label="Confirmation" value={trip.flight_out_confirmation} mono />}
          {trip.flight_out_departs && <Row label="Departs" value={fmtDT(trip.flight_out_departs)} />}
          {trip.flight_out_arrives && <Row label="Arrives" value={fmtDT(trip.flight_out_arrives)} />}
        </div>
      )}
      {hasFlightRet && (
        <div style={{ background: 'var(--sand)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, display: 'inline-block', transform: 'scaleX(-1)' }}>✈</span> {trip.flight_ret_airline || 'Return flight'} · {trip.flight_ret_number}
          </div>
          {trip.flight_ret_confirmation && <Row label="Confirmation" value={trip.flight_ret_confirmation} mono />}
          {trip.flight_ret_departs && <Row label="Departs" value={fmtDT(trip.flight_ret_departs)} />}
          {trip.flight_ret_arrives && <Row label="Arrives" value={fmtDT(trip.flight_ret_arrives)} />}
        </div>
      )}
      {hasHotel && (
        <div style={{ background: 'var(--sand)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>⌂</span> {trip.hotel_name}
          </div>
          {trip.hotel_address && <Row label="Address" value={trip.hotel_address} />}
          {trip.hotel_confirmation && <Row label="Confirmation" value={trip.hotel_confirmation} mono />}
          {trip.hotel_checkin && <Row label="Check-in" value={fmtDT(trip.hotel_checkin)} />}
          {trip.hotel_checkout && <Row label="Check-out" value={fmtDT(trip.hotel_checkout)} />}
        </div>
      )}
    </div>
  )
}

// ── Add place modal (Google Places autocomplete) ─────────────
function AddPlaceModal({ tripId, dayId, onClose, onSubmit, loading, tripDestination }) {
  const [form, setForm] = useState({
    name: '', address: '', latitude: null, longitude: null,
    category: 'sight', notes: '',
  })
  const [placeSelected, setPlaceSelected] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Called by PlacesAutocomplete when user picks a result
  const handlePlaceSelect = ({ name, address, latitude, longitude, category }) => {
    setForm(f => ({
      ...f,
      name: name || f.name,
      address: address || f.address,
      latitude: latitude ?? f.latitude,
      longitude: longitude ?? f.longitude,
      // Only override category if we got a good inference
      category: category || f.category,
    }))
    setPlaceSelected(true)
  }

  const handle = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSubmit({ tripId, dayId, ...form })
  }

  // Rough lat/lng bias from destination name — good enough for autocomplete ranking
  // In a real app you'd geocode the destination on trip creation and store it
  const bias = null // pass { lat, lng } here if you have destination coordinates

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Add a place</div>
        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Smart search — the main input */}
          <div className="field">
            <label className="label">Search</label>
            <PlacesAutocomplete
              onSelect={handlePlaceSelect}
              placeholder="Search for a place…"
              autoFocus
              bias={bias}
            />
          </div>

          {/* Preview card — shown once a place is selected */}
          {placeSelected && (
            <div style={{
              background: 'var(--sand)', borderRadius: 'var(--radius-sm)',
              padding: '12px 14px', border: '1px solid var(--border)',
              animation: 'fadeIn 0.2s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{form.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-light)' }}>{form.address}</div>
                  {form.latitude && (
                    <div style={{ fontSize: 10, color: 'var(--ink-light)', marginTop: 3, fontFamily: 'monospace' }}>
                      {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => { setPlaceSelected(false); setForm(f => ({ ...f, name: '', address: '', latitude: null, longitude: null })) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-light)', fontSize: 14, padding: '2px 4px' }}>
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Category — auto-filled but overrideable */}
          <div className="field">
            <label className="label">Category</label>
            <select className="select" value={form.category} onChange={e => set('category', e.target.value)}>
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {v.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="field">
            <label className="label">Notes</label>
            <textarea
              className="input" rows={3}
              placeholder="Tips, opening hours, things to remember…"
              value={form.notes} onChange={e => set('notes', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.name.trim()}>
              {loading
                ? <div className="spinner" style={{ width: 15, height: 15, borderWidth: 2, borderTopColor: 'white' }} />
                : 'Add place'
              }
            </button>
          </div>
        </form>
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }`}</style>
      </div>
    </div>
  )
}

// ── Logistics edit modal ─────────────────────────────────────
function LogisticsModal({ trip, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    flight_out_airline: trip.flight_out_airline || '',
    flight_out_number: trip.flight_out_number || '',
    flight_out_confirmation: trip.flight_out_confirmation || '',
    flight_out_departs: trip.flight_out_departs ? trip.flight_out_departs.slice(0, 16) : '',
    flight_out_arrives: trip.flight_out_arrives ? trip.flight_out_arrives.slice(0, 16) : '',
    flight_ret_airline: trip.flight_ret_airline || '',
    flight_ret_number: trip.flight_ret_number || '',
    flight_ret_confirmation: trip.flight_ret_confirmation || '',
    flight_ret_departs: trip.flight_ret_departs ? trip.flight_ret_departs.slice(0, 16) : '',
    flight_ret_arrives: trip.flight_ret_arrives ? trip.flight_ret_arrives.slice(0, 16) : '',
    hotel_name: trip.hotel_name || '',
    hotel_address: trip.hotel_address || '',
    hotel_confirmation: trip.hotel_confirmation || '',
    hotel_checkin: trip.hotel_checkin ? trip.hotel_checkin.slice(0, 16) : '',
    hotel_checkout: trip.hotel_checkout ? trip.hotel_checkout.slice(0, 16) : '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const Field = ({ label, k, type = 'text', placeholder }) => (
    <div className="field">
      <label className="label">{label}</label>
      <input className="input" type={type} placeholder={placeholder} value={form[k]} onChange={e => set(k, e.target.value)} />
    </div>
  )

  const SectionHead = ({ icon, title }) => (
    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-mid)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
      <span>{icon}</span> {title}
    </div>
  )

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Trip logistics</div>
        <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionHead icon="✈" title="Outbound flight" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Airline" k="flight_out_airline" placeholder="Air Canada" />
            <Field label="Flight number" k="flight_out_number" placeholder="AC063" />
          </div>
          <Field label="Confirmation code" k="flight_out_confirmation" placeholder="XK84PQ" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Departs" k="flight_out_departs" type="datetime-local" />
            <Field label="Arrives" k="flight_out_arrives" type="datetime-local" />
          </div>

          <SectionHead icon="↩✈" title="Return flight" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Airline" k="flight_ret_airline" placeholder="Air Canada" />
            <Field label="Flight number" k="flight_ret_number" placeholder="AC064" />
          </div>
          <Field label="Confirmation code" k="flight_ret_confirmation" placeholder="XK84PQ" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Departs" k="flight_ret_departs" type="datetime-local" />
            <Field label="Arrives" k="flight_ret_arrives" type="datetime-local" />
          </div>

          <SectionHead icon="⌂" title="Hotel" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Hotel name" k="hotel_name" placeholder="Hamilton Hotel Seoul" />
            <Field label="Confirmation" k="hotel_confirmation" placeholder="HTL-882941" />
          </div>
          <Field label="Address" k="hotel_address" placeholder="119-25 Itaewon-ro, Yongsan-gu" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Check-in" k="hotel_checkin" type="datetime-local" />
            <Field label="Check-out" k="hotel_checkout" type="datetime-local" />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" style={{ width: 15, height: 15, borderWidth: 2, borderTopColor: 'white' }} /> : 'Save logistics'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
