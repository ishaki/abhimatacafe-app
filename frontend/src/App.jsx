import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MenuManagement from './pages/MenuManagement'
import OrderCreation from './pages/OrderCreation'
import OrderEdit from './pages/OrderEdit'
import OrderList from './pages/OrderList'
import KitchenDisplay from './pages/KitchenDisplay'
import Billing from './pages/Billing'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import UserManagement from './pages/UserManagement'
import Settings from './pages/Settings'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/menu" element={
                <ProtectedRoute>
                  <MenuManagement />
                </ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute>
                  <OrderList />
                </ProtectedRoute>
              } />
              <Route path="/orders/create" element={
                <ProtectedRoute>
                  <OrderCreation />
                </ProtectedRoute>
              } />
              <Route path="/orders/:orderId/edit" element={
                <ProtectedRoute>
                  <OrderEdit />
                </ProtectedRoute>
              } />
              <Route path="/kitchen" element={
                <ProtectedRoute>
                  <KitchenDisplay />
                </ProtectedRoute>
              } />
              <Route path="/billing" element={
                <ProtectedRoute>
                  <Billing />
                </ProtectedRoute>
              } />
              <Route path="/expenses" element={
                <ProtectedRoute>
                  <Expenses />
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              } />
              <Route path="/users" element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
            <Toaster position="top-right" />
          </div>
        </Router>
      </SettingsProvider>
    </AuthProvider>
  )
}

export default App
