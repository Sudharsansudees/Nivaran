import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, onAuthChange, signOut as mockSignOut } from '../lib/mockAuth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser())

  useEffect(() => {
    return onAuthChange(setUser)
  }, [])

  // The mocked user object doubles as its own "session" and "profile" —
  // every page already reads user.id/user.email and profile.role/department,
  // so exposing the same object under all three keeps them unchanged.
  const value = {
    session: user,
    user,
    profile: user,
    loading: false,
    signOut: async () => mockSignOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
