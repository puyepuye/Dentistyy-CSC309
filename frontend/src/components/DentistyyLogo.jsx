/**
 * Brand mark from /static/dentistyy-logo.png (add your file under frontend/public/static/).
 * In dev/production the URL is /static/dentistyy-logo.png
 */
import styles from './DentistyyLogo.module.css';

const LOGO_SRC = '/static/dentistyy-logo.png';

function DentistyyLogo({ size = 26, className = '' }) {
    return (
        <img
            src={LOGO_SRC}
            alt=""
            width={size}
            height={size}
            className={[styles.dentistyyLogo, className].filter(Boolean).join(' ')}
            draggable={false}
            decoding="async"
        />
    );
}

export default DentistyyLogo;
