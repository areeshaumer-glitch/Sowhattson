import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { useAuthStore } from './store/authStore';

import LoginPage from './pages/Login';
import ForgotPasswordEmailPage from './pages/ForgotPassword/EmailPage';
import ForgotPasswordOtpPage from './pages/ForgotPassword/OtpPage';
import ForgotPasswordResetPage from './pages/ForgotPassword/ResetPage';
import DashboardPage from './pages/Dashboard';
import ExperiencesPage from './pages/Experiences/index.jsx';
import TicketsPage from './pages/Tickets';
import ProvidersPage from './pages/Providers';
import ProviderDetailPage from './pages/Providers/ProviderDetailPage';
import ExplorersPage from './pages/Explorers';
import TagsPage from './pages/Tags';
import VibesPage from './pages/Vibes';
import ReviewsPage from './pages/Reviews';
import PaymentsPage from './pages/Payments';
import SettingsLayout from './pages/Settings/SettingsLayout';
import SettingsProfilePage from './pages/Settings/SettingsProfilePage';
import SettingsNotificationsPage from './pages/Settings/SettingsNotificationsPage';
import SettingsPasswordPage from './pages/Settings/SettingsPasswordPage';

function RequireAuth({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function RedirectIfAuth({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
        <Route path="/forgot-password" element={<RedirectIfAuth><ForgotPasswordEmailPage /></RedirectIfAuth>} />
        <Route path="/forgot-password/otp" element={<RedirectIfAuth><ForgotPasswordOtpPage /></RedirectIfAuth>} />
        <Route path="/forgot-password/reset" element={<RedirectIfAuth><ForgotPasswordResetPage /></RedirectIfAuth>} />

        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/experiences" element={<ExperiencesPage />} />
          <Route path="/events" element={<Navigate to="/experiences" replace />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/providers" element={<ProvidersPage />} />
          <Route path="/providers/:providerId" element={<ProviderDetailPage />} />
          <Route path="/explorers" element={<ExplorersPage />} />
          <Route path="/users" element={<Navigate to="/explorers" replace />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/vibes" element={<VibesPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<SettingsProfilePage />} />
            <Route path="notifications" element={<SettingsNotificationsPage />} />
            <Route path="password" element={<SettingsPasswordPage />} />
          </Route>
          <Route path="/profile" element={<Navigate to="/settings/profile" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
