/**
 * Thick mint band for /talent/*: greeting + optional status line.
 * @param {string} [statusLineClassName] e.g. negotiation intro (single line on wide viewports)
 */
export default function TalentWorkspaceHeader({ greeting, statusLine, statusLineClassName }) {
    const statusClass = ['talent-workspace-header__status', statusLineClassName].filter(Boolean).join(' ');
    return (
        <header className="talent-workspace-header">
            <div className="talent-workspace-header__inner">
                <h1 className="talent-workspace-header__greeting">{greeting}</h1>
                {statusLine ? <p className={statusClass}>{statusLine}</p> : null}
            </div>
        </header>
    );
}
