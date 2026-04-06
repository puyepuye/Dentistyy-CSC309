/**
 * Shared empty-state / placeholder panel for authenticated app routes (staff, business, admin).
 */
export default function AppPlaceholderPanel({ title, description }) {
    return (
        <article className="app-panel">
            <h2 className="app-panel__heading">{title}</h2>
            <p className="app-panel__lede">{description}</p>
        </article>
    );
}
