import styles from '../../styles/MarketingForms.module.css';

/**
 * Marketing signup layout: card section with title, optional intro, form body, optional footer.
 */
export default function AuthFormSection({ title, intro, children, footer }) {
    return (
        <section className={styles.formSection}>
            <h1>{title}</h1>
            {intro ? <p className={styles.formHint}>{intro}</p> : null}
            {children}
            {footer}
        </section>
    );
}
