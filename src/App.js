import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Nav from './components/Nav'
import Dashboard from './pages/Dashboard'
import Builder from './pages/Builder'
import SharedView from './pages/SharedView'
import Auth from './pages/Auth'
import './styles/global.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-loader"><div className="spinner" /></div>
  if (!user) return <Navigate to="/auth" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <>
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
        <Route path="/share/:token" element={<SharedView />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Nav />
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/trip/:tripId" element={
          <ProtectedRoute>
            <Nav />
            <Builder />
          </ProtectedRoute>
        } />
      </Routes>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#1A1814',
            color: 'white',
            fontSize: '13px',
            fontFamily: 'DM Sans, system-ui, sans-serif',
            borderRadius: '20px',
            padding: '10px 20px',
          },
        }}
      />
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
