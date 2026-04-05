/**
 * Mint strip under the top bar — matches reference layout (sidebar + tinted header band).
 */
export default function AppShellHeader({ title }) {
    return (
        <header className="app-shell__top">
            <div className="app-shell__top-inner">
                <h1 className="app-shell__title">{title}</h1>
            </div>
        </header>
    );
}
