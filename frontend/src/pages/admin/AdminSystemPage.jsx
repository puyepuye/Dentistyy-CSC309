import AppPlaceholderPanel from '../../components/AppPlaceholderPanel.jsx';

export default function AdminSystemPage() {
    return (
        <div className="admin-page admin-page--narrow">
            <AppPlaceholderPanel
                title="System configuration"
                description="Reset cooldown, negotiation window, job start window, availability timeout."
            />
        </div>
    );
}
