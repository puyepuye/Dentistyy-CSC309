import AppSidebarLayout from './AppSidebarLayout.jsx';

const items = [
    { to: '/admin', label: 'Dashboard', icon: 'fa-tachometer-alt', end: true },
    { to: '/admin/users', label: 'Users', icon: 'fa-users' },
    { to: '/admin/businesses', label: 'Businesses', icon: 'fa-store' },
    { to: '/admin/positions', label: 'Position types', icon: 'fa-tags' },
    { to: '/admin/qualifications', label: 'Qualifications', icon: 'fa-clipboard-check' },
    { to: '/admin/system', label: 'System', icon: 'fa-cog' },
];

export default function AdminSidebar() {
    return <AppSidebarLayout ariaLabel="Admin navigation" items={items} />;
}
