import styles from '../../styles/MarketingForms.module.css';

/**
 * Primary / secondary marketing buttons (same styles as signup CTAs). Use `as={Link}` for router links.
 */
export default function MarketingButton({ as: Component = 'button', variant = 'primary', className = '', children, ...rest }) {
    const variantClass = variant === 'secondary' ? styles.btnSecondary : styles.btnPrimary;
    const combined = `${styles.btn} ${variantClass}${className ? ` ${className}` : ''}`;
    return (
        <Component className={combined} {...rest}>
            {children}
        </Component>
    );
}
