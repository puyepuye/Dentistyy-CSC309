import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

/**
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {'user' | 'business' | 'admin'} props.allowedRole
 * @param {string} props.loginPath where to send unauthenticated users
 */
export default function RequireAuth({ children, allowedRole, loginPath }) {
    const { isLoggedIn, role } = useAuth();
    const location = useLocation();

    if (!isLoggedIn) {
        return <Navigate to={loginPath} state={{ from: location }} replace />;
    }

    if (role !== allowedRole) {
        return <Navigate to="/" replace />;
    }

    return children;
}
