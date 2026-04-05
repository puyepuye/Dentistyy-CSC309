import AppSidebarLayout from './AppSidebarLayout.jsx';

const items = [
    { to: '/businesses/profile', label: 'Practice', icon: 'fa-building' },
    { to: '/businesses/jobs', label: 'Job postings', icon: 'fa-briefcase' },
    { to: '/businesses/candidates', label: 'Candidates', icon: 'fa-user-md' },
    { to: '/businesses/negotiations', label: 'Negotiations', icon: 'fa-handshake' },
];

export default function BusinessSidebar() {
    return <AppSidebarLayout ariaLabel="Practice navigation" items={items} />;
}
