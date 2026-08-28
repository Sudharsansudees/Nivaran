import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import Landing from './pages/Landing'
import CitizenLogin from './pages/CitizenLogin'
import OfficerLogin from './pages/OfficerLogin'
import OfficerSignup from './pages/OfficerSignup'
import CitizenDashboard from './pages/CitizenDashboard'
import FileGrievance from './pages/FileGrievance'
import GrievanceDetail from './pages/GrievanceDetail'
import OfficerDashboard from './pages/OfficerDashboard'
import OfficerGrievanceDetail from './pages/OfficerGrievanceDetail'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <Layout>
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
      </Layout>
    </AuthProvider>
  )
}