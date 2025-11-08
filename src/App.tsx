import { Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { Overview } from './pages/Overview'
import { MenuManagement } from './pages/MenuManagement'
import { CouponManagement } from './pages/CouponManagement'
import { NotificationsManagement } from './pages/NotificationsManagement'
import { TenantSettings } from './pages/TenantSettings'
import { LocationsManagement } from './pages/LocationsManagement'
import { RewardsManagement } from './pages/RewardsManagement'

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="menu" element={<MenuManagement />} />
        <Route path="coupons" element={<CouponManagement />} />
        <Route path="notifications" element={<NotificationsManagement />} />
        <Route path="locations" element={<LocationsManagement />} />
        <Route path="rewards" element={<RewardsManagement />} />
        <Route path="settings" element={<TenantSettings />} />
      </Route>
    </Routes>
  )
}

export default App

