import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Loads the Google Maps JS API script once and caches the promise.
 * Returns a promise that resolves when the API is ready.
 */
let _loadPromise = null
function loadGoogleMaps(apiKey) {
  if (_loadPromise) return _loadPromise
  _loadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) { resolve(); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })
  return _loadPromise
}

/**
 * PlacesAutocomplete
 *
 * Props:
 *   onSelect(result) — called with { name, address, latitude, longitude, types }
 *   placeholder      — input placeholder text
 *   autoFocus        — focus on mount
 *   bias             — { lat, lng } to bias results toward (e.g. trip destination)
 */
export default function PlacesAutocomplete({ onSelect, placeholder = 'Search for a place…', autoFocus = true, bias }) {
  const apiKey = process.env.REACT_APP_GOOGLE_PLACES_KEY
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const [status, setStatus] = useState(apiKey ? 'loading' : 'no-key')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!apiKey) return

    loadGoogleMaps(apiKey)
      .then(() => {
        if (!inputRef.current) return
        const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['name', 'formatted_address', 'geometry', 'types'],
        })

        // Bias results toward trip destination if provided
        if (bias?.lat && bias?.lng) {
          const circle = new window.google.maps.Circle({
            center: { lat: bias.lat, lng: bias.lng },
            radius: 50000, // 50km bias radius
          })
          ac.setBounds(circle.getBounds())
        }

        ac.addListener('place_changed', () => {
          const place = ac.getPlace()
          if (!place.geometry) return

          // Auto-detect category from Google place types
          const category = inferCategory(place.types || [])

          onSelect({
            name: place.name || '',
            address: place.formatted_address || '',
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
            category,
          })
        })

        autocompleteRef.current = ac
        setStatus('ready')
        if (autoFocus) inputRef.current?.focus()
      })
      .catch(() => setStatus('error'))

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [apiKey, bias?.lat, bias?.lng]) // eslint-disable-line

  if (status === 'no-key') {
    return <NoKeyFallback onManual={onSelect} />
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
          fontSize: 15, pointerEvents: 'none', opacity: 0.4,
        }}>🔍</span>
        <input
          ref={inputRef}
          className="input"
          placeholder={status === 'loading' ? 'Loading…' : placeholder}
          disabled={status === 'loading'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ paddingLeft: 34 }}
        />
        {status === 'loading' && (
          <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
            <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
          </div>
        )}
      </div>

      {status === 'error' && (
        <div style={{ fontSize: 11, color: '#C23A24', marginTop: 5 }}>
          Couldn't load Google Maps. Check your API key.
        </div>
      )}

      {/* Attribution required by Google ToS */}
      <div style={{ fontSize: 10, color: 'var(--ink-light)', marginTop: 4, textAlign: 'right' }}>
        Powered by Google
      </div>
    </div>
  )
}

/**
 * Fallback UI when no Google API key is configured.
 * Shows manual entry fields instead — same result shape.
 */
function NoKeyFallback({ onManual }) {
  const [f, setF] = useState({ name: '', address: '', latitude: '', longitude: '' })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  // Fire onManual whenever name changes so parent form stays in sync
  const handleChange = (k, v) => {
    const updated = { ...f, [k]: v }
    setF(updated)
    if (updated.name) {
      onManual({
        name: updated.name,
        address: updated.address,
        latitude: updated.latitude ? parseFloat(updated.latitude) : null,
        longitude: updated.longitude ? parseFloat(updated.longitude) : null,
        category: null, // user picks manually
      })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 11, background: '#FDF3E3', color: '#9A5E0E', borderRadius: 6, padding: '7px 10px' }}>
        💡 Add <code>REACT_APP_GOOGLE_PLACES_KEY</code> to your <code>.env</code> for smart address search.
        <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: '#9A5E0E', marginLeft: 4 }}>Get a key →</a>
      </div>
      <div className="field">
        <label className="label">Place name *</label>
        <input className="input" placeholder="Gyeongbokgung Palace" value={f.name} onChange={e => handleChange('name', e.target.value)} />
      </div>
      <div className="field">
        <label className="label">Address</label>
        <input className="input" placeholder="161 Sajik-ro, Jongno-gu, Seoul" value={f.address} onChange={e => handleChange('address', e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="field">
          <label className="label">Latitude</label>
          <input className="input" type="number" step="any" placeholder="37.5796" value={f.latitude} onChange={e => handleChange('latitude', e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Longitude</label>
          <input className="input" type="number" step="any" placeholder="126.9770" value={f.longitude} onChange={e => handleChange('longitude', e.target.value)} />
        </div>
      </div>
    </div>
  )
}

/**
 * Maps Google place types to Pinpoint categories.
 * https://developers.google.com/maps/documentation/places/web-service/supported_types
 */
function inferCategory(types) {
  if (!types.length) return 'sight'
  const t = types[0]
  if (['restaurant', 'cafe', 'food', 'bakery', 'bar', 'meal_takeaway', 'meal_delivery'].some(x => types.includes(x))) return 'food'
  if (['lodging', 'hotel', 'motel', 'resort', 'hostel'].some(x => types.includes(x))) return 'hotel'
  if (['airport', 'train_station', 'subway_station', 'bus_station', 'transit_station', 'light_rail_station'].some(x => types.includes(x))) return 'transport'
  if (['museum', 'art_gallery', 'zoo', 'aquarium', 'amusement_park', 'tourist_attraction', 'place_of_worship', 'church', 'temple'].some(x => types.includes(x))) return 'sight'
  if (['park', 'stadium', 'gym', 'spa', 'movie_theater', 'night_club'].some(x => types.includes(x))) return 'activity'
  if (['shopping_mall', 'store', 'department_store', 'supermarket'].some(x => types.includes(x))) return 'activity'
  return 'sight'
}
