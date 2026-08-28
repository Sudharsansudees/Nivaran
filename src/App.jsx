import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

const Landing = lazy(() => import('./pages/Landing'))
const CitizenLogin = lazy(() => import('./pages/CitizenLogin'))
const OfficerLogin = lazy(() => import('./pages/OfficerLogin'))
const OfficerSignup = lazy(() => import('./pages/OfficerSignup'))
const CitizenDashboard = lazy(() => import('./pages/CitizenDashboard'))
const FileGrievance = lazy(() => import('./pages/FileGrievance'))
const GrievanceDetail = lazy(() => import('./pages/GrievanceDetail'))
const OfficerDashboard = lazy(() => import('./pages/OfficerDashboard'))
const OfficerGrievanceDetail = lazy(() => import('./pages/OfficerGrievanceDetail'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageLoading() {
  return <div className="loading-state" role="status"><span className="spinner" aria-hidden="true" /> <span>Loading page…</span></div>
}

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<CitizenLogin />} />
          <Route path="/officer/login" element={<OfficerLogin />} />
          <Route path="/officer/signup" element={<OfficerSignup />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="citizen">
                <CitizenDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/file"
            element={
              <ProtectedRoute role="citizen">
                <FileGrievance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grievances/:id"
            element={
              <ProtectedRoute role="citizen">
                <GrievanceDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/officer"
            element={
              <ProtectedRoute role="officer">
                <OfficerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/grievances/:id"
            element={
              <ProtectedRoute role="officer">
                <OfficerGrievanceDetail />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </Layout>
    </AuthProvider>
  )
}
