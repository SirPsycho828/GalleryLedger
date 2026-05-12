import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { LayoutGroup } from 'framer-motion'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { AuthGuard, PublicRoute } from '@/components/AuthGuard'
import { AppShell } from '@/components/AppShell'
import LandingPage from '@/pages/LandingPage'
import SignIn from '@/pages/SignIn'
import SignUp from '@/pages/SignUp'
import ResetPassword from '@/pages/ResetPassword'
import Onboarding from '@/pages/Onboarding'
import SettingsPage from '@/pages/SettingsPage'
import WorkList from '@/pages/WorkList'
import WorkIntake from '@/pages/WorkIntake'
import WorkDetail from '@/pages/WorkDetail'
import ConsignorList from '@/pages/ConsignorList'
import ConsignorNew from '@/pages/ConsignorNew'
import ConsignorDetail from '@/pages/ConsignorDetail'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/signin" element={<PublicRoute><SignIn /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

          {/* Onboarding */}
          <Route path="/onboarding" element={<AuthGuard><Onboarding /></AuthGuard>} />

          {/* Authenticated routes with app shell */}
          <Route element={<AuthGuard><LayoutGroup><AppShell /></LayoutGroup></AuthGuard>}>
            <Route path="works" element={<WorkList />} />
            <Route path="works/new" element={<WorkIntake />} />
            <Route path="works/:workId" element={<WorkDetail />} />
            <Route path="consignors" element={<ConsignorList />} />
            <Route path="consignors/new" element={<ConsignorNew />} />
            <Route path="consignors/:consignorId" element={<ConsignorDetail />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="bottom-center" />
      </AuthProvider>
    </BrowserRouter>
  )
}
