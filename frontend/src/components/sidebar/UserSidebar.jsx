import AppSidebarLayout from './AppSidebarLayout.jsx';

const items = [
    { to: '/talent/profile', label: 'Profile', icon: 'fa-user' },
    { to: '/talent/businesses', label: 'Business', icon: 'fa-building' },
    { to: '/talent/jobs', label: 'Jobs', icon: 'fa-briefcase' },
    { to: '/talent/negotiations', label: 'Negotiations', icon: 'fa-handshake' },
    { to: '/talent/scheduled', label: 'Scheduled', icon: 'fa-calendar-check' },
];

export default function UserSidebar() {
    return <AppSidebarLayout ariaLabel="Staff navigation" items={items} />;
}
