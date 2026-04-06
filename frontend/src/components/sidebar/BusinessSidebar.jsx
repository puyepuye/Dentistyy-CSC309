import AppSidebarLayout from './AppSidebarLayout.jsx';

const items = [
    { to: '/businesses', label: 'Overview', icon: 'fa-home', end: true },
    { to: '/businesses/profile', label: 'Practice', icon: 'fa-building' },
    { to: '/businesses/jobs', label: 'Job postings', icon: 'fa-briefcase' },
    { to: '/businesses/scheduled', label: 'Scheduled', icon: 'fa-calendar-check' },
    { to: '/businesses/negotiations', label: 'Negotiations', icon: 'fa-handshake' },
];

export default function BusinessSidebar() {
    return <AppSidebarLayout ariaLabel="Practice navigation" items={items} />;
}
