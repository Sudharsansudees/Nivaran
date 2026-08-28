// Fully local, mocked auth — no external service, nothing to go down.
// A "user" here doubles as its own profile: { id, role, email, name,
// department }. Citizens sign in instantly by email (no password);
// officers use a seeded or self-created email+password pair.

const USERS_KEY = 'nivaran_mock_users'
const SESSION_KEY = 'nivaran_mock_session'

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function uid() {
  return crypto.randomUUID()
}

function allUsers() {
  return readJSON(USERS_KEY, {})
}

function saveUsers(users) {
  writeJSON(USERS_KEY, users)
}

const SEED_OFFICERS = [
  { email: 'roads.officer@nivaran.test', password: 'Nivaran#Demo1', name: 'Roads & Infrastructure Officer', department: 'Roads & Infrastructure' },
  { email: 'water.officer@nivaran.test', password: 'Nivaran#Demo1', name: 'Water Supply Officer', department: 'Water Supply' },
  { email: 'electricity.officer@nivaran.test', password: 'Nivaran#Demo1', name: 'Electricity Officer', department: 'Electricity' },
  { email: 'sanitation.officer@nivaran.test', password: 'Nivaran#Demo1', name: 'Sanitation & Waste Officer', department: 'Sanitation & Waste' },
  { email: 'health.officer@nivaran.test', password: 'Nivaran#Demo1', name: 'Public Health Officer', department: 'Public Health' },
  { email: 'education.officer@nivaran.test', password: 'Nivaran#Demo1', name: 'Education Officer', department: 'Education' },
  { email: 'police.officer@nivaran.test', password: 'Nivaran#Demo1', name: 'Police & Public Safety Officer', department: 'Police & Public Safety' },
  { email: 'other.officer@nivaran.test', password: 'Nivaran#Demo1', name: 'General Officer', department: 'Other' },
]

function ensureSeeded() {
  const users = allUsers()
  let changed = false
  for (const seed of SEED_OFFICERS) {
    if (!Object.values(users).some((u) => u.email === seed.email)) {
      const id = uid()
      users[id] = { id, role: 'officer', ...seed }
      changed = true
    }
  }
  if (changed) saveUsers(users)
}
ensureSeeded()

let listeners = []

function notify() {
  const user = getCurrentUser()
  listeners.forEach((l) => l(user))
}

export function onAuthChange(cb) {
  listeners.push(cb)
  return () => {
    listeners = listeners.filter((l) => l !== cb)
  }
}

export function getCurrentUser() {
  const session = readJSON(SESSION_KEY, null)
  if (!session) return null
  return allUsers()[session.userId] ?? null
}

// Citizens: instant sign-in by email, account created automatically on
// first use — same "nothing to register in advance" promise as before,
// just without the OTP round-trip.
export function signInAsCitizen(email) {
  const users = allUsers()
  let user = Object.values(users).find((u) => u.email === email && u.role === 'citizen')
  if (!user) {
    user = { id: uid(), role: 'citizen', email, name: email, department: null }
    users[user.id] = user
    saveUsers(users)
  }
  writeJSON(SESSION_KEY, { userId: user.id })
  notify()
  return user
}

export function signInAsOfficer(email, password) {
  const users = allUsers()
  const user = Object.values(users).find((u) => u.role === 'officer' && u.email === email)
  if (!user) throw new Error('No officer account with that email. Create one first.')
  if (user.password !== password) throw new Error('Incorrect password.')
  writeJSON(SESSION_KEY, { userId: user.id })
  notify()
  return user
}

export function signUpOfficer({ email, password, name, department }) {
  const users = allUsers()
  if (Object.values(users).some((u) => u.email === email)) {
    throw new Error('An account with that email already exists.')
  }
  const user = { id: uid(), role: 'officer', email, password, name, department }
  users[user.id] = user
  saveUsers(users)
  writeJSON(SESSION_KEY, { userId: user.id })
  notify()
  return user
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY)
  notify()
}
