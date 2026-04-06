import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getAdminPositionTypes, patchPositionType, deletePositionType, createPositionType } from '../../lib/api.js';
import AddPositionTypeModal from '../../components/AddPositionTypeModal.jsx';

export default function AdminPositionsPage() {
    const { token } = useAuth();
    const [positionTypes, setPositionTypes] = useState([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [filterVisible, setFilterVisible] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [showAddCard, setShowAddCard] = useState(false);
    const [sortName, setSortName] = useState('');
    const [sortNumQualified, setSortNumQualified] = useState('');
    const limit = 10;

    async function fetchPositionTypes() {
        setLoading(true);
        setError('');
        try {
            const data = await getAdminPositionTypes(token, {
                page,
                limit,
                ...(filterVisible !== '' ? { hidden: filterVisible } : {}),
                ...(sortName !== '' ? { name: sortName } : {}),
                ...(sortNumQualified !== '' ? { num_qualified: sortNumQualified } : {}),
            });
            setPositionTypes(data.results);
            setCount(data.count);
        } catch (err) {
            setError(err.message || 'Failed to load position types.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchPositionTypes();
    }, [page, filterVisible, sortName, sortNumQualified]);

    async function handleToggleHidden(id, hidden) {
        try {
            await patchPositionType(token, id, { hidden });
            setPositionTypes((prev) =>
                prev.map((b) => (b.id === id ? { ...b, hidden } : b))
            );
        } catch (err) {
            setError(err.message || 'Action failed.');
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('Are you sure you want to delete this position type?')) return;
        try {
            await deletePositionType(token, id);
            setPositionTypes((prev) => prev.filter((b) => b.id !== id));
            setCount((c) => c - 1);
        } catch (err) {
            if (err.status === 409) {
                setError('Cannot delete: users are qualified for this position type.');
            } else {
                setError(err.message || 'Delete failed.');
            }
        }
    }

    function handleEdit(b) {
        setEditingId(b.id);
        setEditName(b.name);
        setEditDescription(b.description);
   
    }

    async function handleEditSave(id) {
        try {
            await patchPositionType(token, id, {
                name: editName,
                description: editDescription,
            });
            setPositionTypes((prev) =>
                prev.map((b) => (b.id === id ? { ...b, name: editName, description: editDescription } : b))
            );
            setEditingId(null);
        } catch (err) {
            setError(err.message || 'Edit failed.');
        }
    }

    const totalPages = Math.ceil(count / limit);

    return (
        <div className="admin-page">
            <div className="business-jobs-browse__toolbar admin-page__toolbar admin-page__toolbar--positions">
                <div className="business-jobs-browse__toolbar-row business-jobs-browse__toolbar-row--top">
                    <div className="business-jobs-browse__sort">
                        <label htmlFor="admin-pt-sort-name">Name</label>
                        <select
                            id="admin-pt-sort-name"
                            value={sortName}
                            onChange={(e) => {
                                setSortName(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">Default</option>
                            <option value="asc">A→Z</option>
                            <option value="desc">Z→A</option>
                        </select>
                    </div>
                    <div className="business-jobs-browse__sort">
                        <label htmlFor="admin-pt-sort-qualified">Qualified</label>
                        <select
                            id="admin-pt-sort-qualified"
                            value={sortNumQualified}
                            onChange={(e) => {
                                setSortNumQualified(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">Default</option>
                            <option value="asc">Least</option>
                            <option value="desc">Most</option>
                        </select>
                    </div>
                    <div className="business-jobs-browse__sort">
                        <label htmlFor="admin-pt-filter-hidden">Visibility</label>
                        <select
                            id="admin-pt-filter-hidden"
                            value={filterVisible}
                            onChange={(e) => {
                                setFilterVisible(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All</option>
                            <option value="false">Visible</option>
                            <option value="true">Hidden</option>
                        </select>
                    </div>
                    <button
                        type="button"
                        className="admin-positions__add-btn"
                        onClick={() => setShowAddCard((v) => !v)}
                    >
                        <i className="fas fa-plus" aria-hidden /> Add position type
                    </button>
                </div>
            </div>

            {showAddCard && (
                <AddPositionTypeModal
                    onClose={() => setShowAddCard(false)}
                    onCreated={async (body) => {
                        const result = await createPositionType(token, body);
                        setPositionTypes((prev) => [result, ...prev]);
                        setCount((c) => c + 1);
                    }}
                />
            )}

            {error ? <p className="admin-page__error">{error}</p> : null}

            <div className="admin-page__table-wrap">
            <table className="admin-businesses__table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Number of Qualified Users </th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan={5} className="admin-businesses__empty">Loading…</td></tr>
                    ) : positionTypes.length === 0 ? (
                        <tr><td colSpan={5} className="admin-businesses__empty">No position types found.</td></tr>
                    ) : positionTypes.map((b) => (
                        <tr key={b.id}>
                            <td>
                                {editingId === b.id ? (
                                    <input
                                        className="admin-businesses__search-input"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                    />
                                ) : b.name}
                            </td>
                            <td>
                                {editingId === b.id ? (
                                    <input
                                        className="admin-businesses__search-input"
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                    />
                                ) : b.description}
                            </td>
                            <td>
                            { b.num_qualified}
                            </td>
                            <td>
                                <span className={`admin-businesses__badge ${b.hidden ? 'admin-businesses__badge--unverified' : 'admin-businesses__badge--verified'}`}>
                                    {b.hidden ? 'Hidden' : 'Visible'}
                                </span>
                            </td>
                            <td>
                                {editingId === b.id ? (
                                    <div className="admin-positions__actions">
                                        <button
                                            className="admin-positions__icon-btn admin-positions__icon-btn--edit"
                                            onClick={() => handleEditSave(b.id)}
                                            title="Save"
                                        >
                                            <i className="fas fa-check" />
                                        </button>
                                        <button
                                            className="admin-positions__icon-btn"
                                            onClick={() => setEditingId(null)}
                                            title="Cancel"
                                        >
                                            <i className="fas fa-times" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="admin-positions__actions">
                                        <button
                                            className="admin-positions__icon-btn"
                                            onClick={() => handleToggleHidden(b.id, !b.hidden)}
                                            title={b.hidden ? 'Unhide' : 'Hide'}
                                        >
                                            <i className={`fas ${b.hidden ? 'fa-eye' : 'fa-eye-slash'}`} />
                                        </button>
                                        <button
                                            className="admin-positions__icon-btn admin-positions__icon-btn--edit"
                                            onClick={() => handleEdit(b)}
                                            title="Edit"
                                        >
                                            <i className="fas fa-pencil-alt" />
                                        </button>
                                        <button
                                            className="admin-positions__icon-btn admin-positions__icon-btn--delete"
                                            onClick={() => handleDelete(b.id)}
                                            title="Delete"
                                        >
                                            <i className="fas fa-trash" />
                                        </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>

            {totalPages > 1 ? (
                <div className="talent-jobs__pagination admin-page__pagination">
                    <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>◀</button>
                    <span>Page {page} of {totalPages}</span>
                    <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>▶</button>
                </div>
            ) : null}
        </div>
    );
}