import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { fetchTrips, createTrip } from '../lib/api'
import { COVER_COLORS } from '../lib/supabase'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips', user.id],
    queryFn: () => fetchTrips(user.id),
  })

  const createMutation = useMutation({
    mutationFn: createTrip,
    onSuccess: (trip) => {
      qc.invalidateQueries(['trips'])
      setShowCreate(false)
      navigate(`/trip/${trip.id}`)
      toast.success('Trip created!')
    },
    onError: (e) => toast.error(e.message),
  })

  const totalCompleted = trips.reduce((acc, t) => {
    const places = t.places || []
    return acc + places.filter(p => p.completed).length
  }, 0)

  return (
    <div style={{ paddingTop: 'var(--nav-h)' }}>
      {/* Hero */}
      <div style={{ padding: '40px 32px 28px' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 32, lineHeight: 1.2, marginBottom: 6 }}>
          Good to see you.<br />
          <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Where to next?</em>
        </div>
        <div style={{ color: 'var(--ink-light)', fontSize: 14 }}>
          {trips.length} trip{trips.length !== 1 ? 's' : ''} · {totalCompleted} places visited
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))',
        gap: 16, padding: '0 24px 40px',
      }}>
        {isLoading ? (
          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" />
          </div>
        ) : (
          <>
            {trips.map(trip => <TripCard key={trip.id} trip={trip} />)}
            <NewTripCard onClick={() => setShowCreate(true)} />
          </>
        )}
      </div>

      {showCreate && (
        <CreateTripModal
          userId={user.id}
          onClose={() => setShowCreate(false)}
          onSubmit={createMutation.mutate}
          loading={createMutation.isPending}
        />
      )}
    </div>
  )
}

function TripCard({ trip }) {
  const navigate = useNavigate()
  const places = trip.places || []
  const completed = places.filter(p => p.completed).length
  const pct = places.length ? Math.round((completed / places.length) * 100) : 0

  return (
    <div
      onClick={() => navigate(`/trip/${trip.id}`)}
      style={{
        background: 'white', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)', overflow: 'hidden',
        cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      {/* Cover */}
      <div style={{
        height: 130, background: `linear-gradient(135deg, ${trip.cover_color} 0%, ${trip.cover_color}99 100%)`,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 40%, rgba(26,24,20,0.4))',
        }} />
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: 'white', borderRadius: 20,
          padding: '3px 10px', fontSize: 11, fontWeight: 500, color: 'var(--ink-mid)',
        }}>
          ✈ {format(parseISO(trip.start_date), 'MMM d')} – {format(parseISO(trip.end_date), 'MMM d, yyyy')}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          {trip.destination}
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 20, marginBottom: 12 }}>{trip.name}</div>
        <div style={{ height: 3, background: 'var(--sand-dark)', borderRadius: 2, marginBottom: 6 }}>
          <div style={{ height: '100%', borderRadius: 2, background: 'var(--teal)', width: `${pct}%`, transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-light)' }}>
          {completed} of {places.length} places visited
        </div>
      </div>
    </div>
  )
}

function NewTripCard({ onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: `1.5px dashed ${hover ? 'var(--accent)' : 'var(--border-med)'}`,
        borderRadius: 'var(--radius)', minHeight: 210,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', gap: 10,
        background: hover ? 'var(--accent-soft)' : 'transparent',
        color: hover ? 'var(--accent)' : 'var(--ink-light)',
        transition: 'all 0.2s',
      }}>
      <div style={{
        width: 40, height: 40, border: '1.5px dashed currentColor',
        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}>+</div>
      <span style={{ fontSize: 13, fontWeight: 500 }}>New trip</span>
    </div>
  )
}

function CreateTripModal({ userId, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    name: '', destination: '', startDate: '', endDate: '',
    coverColor: COVER_COLORS[0],
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handle = (e) => {
    e.preventDefault()
    onSubmit({ userId, name: form.name, destination: form.destination, startDate: form.startDate, endDate: form.endDate, coverColor: form.coverColor })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">New trip</div>
        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label className="label">Trip name</label>
            <input className="input" placeholder="Seoul Adventure" required
              value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Destination</label>
            <input className="input" placeholder="South Korea" required
              value={form.destination} onChange={e => set('destination', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field">
              <label className="label">Start date</label>
              <input className="input" type="date" required
                value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div className="field">
              <label className="label">End date</label>
              <input className="input" type="date" required min={form.startDate}
                value={form.endDate} onChange={e => set('endDate', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="label">Cover colour</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COVER_COLORS.map(c => (
                <div key={c} onClick={() => set('coverColor', c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c,
                    cursor: 'pointer', border: form.coverColor === c ? '2px solid var(--ink)' : '2px solid transparent',
                    boxShadow: form.coverColor === c ? '0 0 0 2px white inset' : 'none',
                    transition: 'all 0.15s',
                  }} />
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" style={{ width: 15, height: 15, borderWidth: 2, borderTopColor: 'white' }} /> : 'Create trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
