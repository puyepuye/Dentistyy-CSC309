/**
 * Thick mint band for /talent/* — greeting + optional status line.
 */
export default function TalentWorkspaceHeader({ greeting, statusLine }) {
    return (
        <header className="talent-workspace-header">
            <div className="talent-workspace-header__inner">
                <h1 className="talent-workspace-header__greeting">{greeting}</h1>
                {statusLine ? <p className="talent-workspace-header__status">{statusLine}</p> : null}
            </div>
        </header>
    );
}
