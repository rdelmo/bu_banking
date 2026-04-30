import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Subscriptions from './pages/Subscriptions'
import BankOverview from './pages/BankOverview'

/**
 * PrivateRoute — wraps a page that requires the user to be logged in.
 * If no access_token is in localStorage the user is sent back to /login.
 */
function PrivateRoute({ children }) {
  const token = localStorage.getItem('access_token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/transactions/:accountId"
          element={
            <PrivateRoute>
              <Transactions />
            </PrivateRoute>
          }
        />
        <Route
          path="/subscriptions"
          element={
            <PrivateRoute>
              <Subscriptions />
            </PrivateRoute>
          }
        />
        <Route
          path="/bank-overview"
          element={
            <PrivateRoute>
              <BankOverview />
            </PrivateRoute>
          }
        />

        {/* Catch-all → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
