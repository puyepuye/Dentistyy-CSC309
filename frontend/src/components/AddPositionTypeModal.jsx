import { useState } from 'react';

export default function AddPositionTypeModal({ onClose, onCreated }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        if (!name.trim()) { setError('Name is required.'); return; }
        if (!description.trim()) { setError('Description is required.'); return; }
        setLoading(true);
        try {
            await onCreated({ name: name.trim(), description: description.trim(), hidden: true });
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to create position type.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="admin-positions__add-card">
            <h2 className="admin-positions__add-card-title">New Position Type</h2>
            <form onSubmit={handleSubmit} className="admin-positions__add-form">
                <label className="admin-positions__add-label">
                    Name
                    <input
                        className="admin-businesses__search-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Position name"
                        required
                    />
                </label>
                <label className="admin-positions__add-label">
                    Description
                    <textarea
                        className="admin-businesses__search-input admin-positions__add-textarea"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Position description"
                        required
                    />
                </label>
                {error && <p className="admin-businesses__error">{error}</p>}
                <div className="admin-positions__add-actions">
                    <button
                        type="submit"
                        className="admin-positions__add-submit"
                        disabled={loading}
                    >
                        {loading ? 'Creating…' : 'Create'}
                    </button>
                    <button
                        type="button"
                        className="admin-positions__add-cancel"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}