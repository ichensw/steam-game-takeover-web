import { lazy, Suspense } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { getToken } from './auth';

const AdminLayout = lazy(() => import('./layout/AdminLayout'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Feedbacks = lazy(() => import('./pages/Feedbacks'));
const KookChannels = lazy(() => import('./pages/KookChannels'));
const KookMembers = lazy(() => import('./pages/KookMembers'));
const KookRoles = lazy(() => import('./pages/KookRoles'));
const KookUsers = lazy(() => import('./pages/KookUsers'));
const KookVoiceStats = lazy(() => import('./pages/KookVoiceStats'));
const Login = lazy(() => import('./pages/Login'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Takeovers = lazy(() => import('./pages/Takeovers'));
const Users = lazy(() => import('./pages/Users'));
const WechatDatabase = lazy(() => import('./pages/WechatDatabase'));
const WechatMessages = lazy(() => import('./pages/WechatMessages'));
const WechatSummary = lazy(() => import('./pages/WechatSummary'));
const WechatStats = lazy(() => import('./pages/WechatStats'));
const WechatWxbotControl = lazy(() => import('./pages/WechatWxbotControl'));

function RequireAuth({ children }: { children: React.ReactNode }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

function RouteFallback() {
  return (
    <div className="route-fallback">
      <span className="route-loader" aria-label="加载中" />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="takeovers" element={<Takeovers />} />
            <Route path="users" element={<Users />} />
            <Route path="admin-users" element={<AdminUsers />} />
            <Route path="reports" element={<Reports />} />
            <Route path="kook-channels" element={<KookChannels />} />
            <Route path="kook-roles" element={<KookRoles />} />
            <Route path="kook-members" element={<KookMembers />} />
            <Route path="kook-users" element={<KookUsers />} />
            <Route path="kook-voice-stats" element={<KookVoiceStats />} />
            <Route path="feedbacks" element={<Feedbacks />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="settings" element={<Settings />} />
            <Route path="wechat-messages" element={<WechatMessages />} />
            <Route path="wechat-summary" element={<WechatSummary />} />
            <Route path="wechat-stats" element={<WechatStats />} />
            <Route path="wechat-database" element={<WechatDatabase />} />
            <Route path="wechat-wxbots" element={<WechatWxbotControl />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
