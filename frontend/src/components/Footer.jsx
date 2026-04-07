import AppFooterLayout from '../components/AppFooterLayout'


const links = {
    Platform: [
        { to: '/jobs', label: 'Find Jobs' },
        { to: '/directory', label: 'Browse Businesses' },
        { to: '/businesses/jobs/new', label: 'Post a Job' },
    ],
    Company: [
        { to: '/', label: 'About' },
        { to: '/', label: 'Contact us' },
        { to: '/directory', label: 'Careers' },
    ],
    Support: [
        { to: 'https://youtu.be/ZbZSe6N_BXs?si=4T2JjG07MoqPWTlC', label: 'Help Centre' },
        { to: 'https://youtu.be/ZbZSe6N_BXs?si=4T2JjG07MoqPWTlC', label: 'Privacy Policy' },
        { to: 'https://youtu.be/ZbZSe6N_BXs?si=4T2JjG07MoqPWTlC', label: 'Terms of Service' },
    ],
};

export default function Footer() {
    return <AppFooterLayout links={links} copyright="Dentistyy" />;
}