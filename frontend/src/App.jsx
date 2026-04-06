import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import RequireAuth from './components/auth/RequireAuth.jsx';
import UserAppLayout from './layouts/UserAppLayout.jsx';
import BusinessAppLayout from './layouts/BusinessAppLayout.jsx';
import AdminAppLayout from './layouts/AdminAppLayout.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import BusinessesPage from './pages/BusinessesPage.jsx';
import BusinessSignupPage from './pages/BusinessSignupPage.jsx';
import ActivateAccountPage from './pages/ActivateAccountPage.jsx';
import StaffProfilePage from './pages/staff/StaffProfilePage.jsx';
import StaffJobsPage from './pages/staff/StaffJobsPage.jsx';
import StaffNegotiationsPage from './pages/staff/StaffNegotiationsPage.jsx';
import StaffScheduledPage from './pages/staff/StaffScheduledPage.jsx';
import EmployerDashboardPage from './pages/employer/EmployerDashboardPage.jsx';
import EmployerProfilePage from './pages/employer/EmployerProfilePage.jsx';
import EmployerJobsPage from './pages/employer/EmployerJobsPage.jsx';
import EmployerCandidatesPage from './pages/employer/EmployerCandidatesPage.jsx';
import EmployerNegotiationsPage from './pages/employer/EmployerNegotiationsPage.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import AdminBusinessesPage from './pages/admin/AdminBusinessesPage.jsx';
import AdminPositionsPage from './pages/admin/AdminPositionsPage.jsx';
import AdminQualificationsPage from './pages/admin/AdminQualificationsPage.jsx';
import AdminSystemPage from './pages/admin/AdminSystemPage.jsx';
import marketingLayoutStyles from './styles/MarketingLayout.module.css';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';

function MarketingLayout() {
    const { pathname } = useLocation();
    const isMarketingHome = pathname === '/';
    const isLogin = pathname === '/login';
    let mainClassName = marketingLayoutStyles.pageContainer;
    if (isMarketingHome) mainClassName = marketingLayoutStyles.mainLanding;
    if (isLogin) mainClassName = 'main--login';

    return (
        <>
            <Navbar />
            <main className={mainClassName}>
                <Outlet />
            </main>
        </>
    );
}

function App() {
    return (
        <div className="site-shell">
            <Routes>
                <Route element={<MarketingLayout />}>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/directory" element={<BusinessesPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/signup/business" element={<BusinessSignupPage />} />
                    <Route path="/activate" element={<ActivateAccountPage />} />
                </Route>

                <Route
                    path="/talent"
                    element={
                        <RequireAuth allowedRole="user" loginPath="/login">
                            <UserAppLayout />
                        </RequireAuth>
                    }
                >
                    <Route index element={<Navigate to="/talent/jobs" replace />} />
                    <Route path="profile" element={<StaffProfilePage />} />
                    <Route path="jobs" element={<StaffJobsPage />} />
                    <Route path="negotiations" element={<StaffNegotiationsPage />} />
                    <Route path="scheduled" element={<StaffScheduledPage />} />
                </Route>

                <Route
                    path="/businesses"
                    element={
                        <RequireAuth allowedRole="business" loginPath="/login?tab=business">
                            <BusinessAppLayout />
                        </RequireAuth>
                    }
                >
                    <Route index element={<EmployerDashboardPage />} />
                    <Route path="profile" element={<EmployerProfilePage />} />
                    <Route path="jobs" element={<EmployerJobsPage />} />
                    <Route path="candidates" element={<EmployerCandidatesPage />} />
                    <Route path="negotiations" element={<EmployerNegotiationsPage />} />
                </Route>

                <Route
                    path="/admin"
                    element={
                        <RequireAuth allowedRole="admin" loginPath="/login">
                            <AdminAppLayout />
                        </RequireAuth>
                    }
                >
                    <Route index element={<AdminDashboardPage />} />
                    <Route path="users" element={<AdminUsersPage />} />
                    <Route path="businesses" element={<AdminBusinessesPage />} />
                    <Route path="positions" element={<AdminPositionsPage />} />
                    <Route path="qualifications" element={<AdminQualificationsPage />} />
                    <Route path="system" element={<AdminSystemPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

export default App;
