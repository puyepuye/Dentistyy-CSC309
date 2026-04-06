import { Outlet } from 'react-router-dom';
import BusinessJobSubnav from '../components/business/BusinessJobSubnav.jsx';

export default function BusinessJobSectionLayout() {
    return (
        <div className="talent-profile">
            <BusinessJobSubnav />
            <Outlet />
        </div>
    );
}
