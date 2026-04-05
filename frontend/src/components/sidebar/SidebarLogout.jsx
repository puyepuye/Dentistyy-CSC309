import { useAuth } from '../../contexts/AuthContext.jsx';

export default function SidebarLogout() {
    const { logout } = useAuth();

    return (
        <div className="app-sidebar__footer">
            <button type="button" className="app-sidebar__logout" onClick={logout}>
                <span>Log out</span>
                <i className="fas fa-sign-out-alt" aria-hidden />
            </button>
        </div>
    );
}
