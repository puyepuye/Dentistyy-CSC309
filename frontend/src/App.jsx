import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
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
import BusinessDashboardPage from './pages/business/BusinessDashboardPage.jsx';
import BusinessProfilePage from './pages/business/BusinessProfilePage.jsx';
import BusinessJobsPage from './pages/business/BusinessJobsPage.jsx';
import BusinessJobNewPage from './pages/business/BusinessJobNewPage.jsx';
import BusinessJobDetailPage from './pages/business/BusinessJobDetailPage.jsx';
import BusinessJobCandidatesListPage from './pages/business/BusinessJobCandidatesListPage.jsx';
import BusinessNegotiationsPage from './pages/business/BusinessNegotiationsPage.jsx';
import BusinessJobSectionLayout from './layouts/BusinessJobSectionLayout.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import AdminBusinessesPage from './pages/admin/AdminBusinessesPage.jsx';
import AdminPositionsPage from './pages/admin/AdminPositionsPage.jsx';
import AdminQualificationsPage from './pages/admin/AdminQualificationsPage.jsx';
import AdminSystemPage from './pages/admin/AdminSystemPage.jsx';
import marketingLayoutStyles from './styles/MarketingLayout.module.css';

function BusinessJobInterestsRedirect() {
    const { jobId } = useParams();
    return <Navigate to={`/businesses/jobs/${jobId}/candidates?view=manage`} replace />;
}

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
                    <Route index element={<BusinessDashboardPage />} />
                    <Route path="profile" element={<BusinessProfilePage />} />
                    <Route path="jobs/new" element={<BusinessJobNewPage />} />
                    <Route path="jobs" element={<BusinessJobsPage />} />
                    <Route path="jobs/:jobId" element={<BusinessJobSectionLayout />}>
                        <Route index element={<BusinessJobDetailPage />} />
                        <Route path="candidates" element={<BusinessJobCandidatesListPage />} />
                        <Route path="interests" element={<BusinessJobInterestsRedirect />} />
                    </Route>
                    <Route path="negotiations" element={<BusinessNegotiationsPage />} />
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
