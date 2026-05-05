import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { getAdmins, addAdmin, removeAdmin, transferPrimary, getAuthors, updateAuthor } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { AdminUser, Author } from '../../types';

export default function Admins() {
  const { isPrimary } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [authors, setAuthors] = useState<Author[]>([]);
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', penName: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPrimary) { navigate('/admin'); return; }
    Promise.all([getAdmins(), getAuthors()]).then(([a, auth]) => {
      setAdmins(a);
      setAuthors(auth);
    });
  }, [isPrimary, navigate]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const admin = await addAdmin(newUsername.trim());
      setAdmins((prev) => [...prev, admin]);
      setAuthors((prev) => [...prev, { githubUsername: newUsername.trim(), fullName: '', penName: newUsername.trim() }]);
      setNewUsername('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add admin');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Remove this admin?')) return;
    const target = admins.find((a) => a.id === id);
    await removeAdmin(id);
    setAdmins((prev) => prev.filter((a) => a.id !== id));
    if (target) {
      setAuthors((prev) => prev.filter((a) => a.githubUsername.toLowerCase() !== target.username.toLowerCase()));
    }
  }

  async function handleTransfer(id: string, username: string) {
    if (!confirm(`Transfer primary to ${username}? You will lose primary access.`)) return;
    await transferPrimary(id);
    setAdmins((prev) => prev.map((a) => ({ ...a, isPrimary: a.id === id })));
  }

  function startEdit(author: Author) {
    setEditingUsername(author.githubUsername);
    setEditForm({ fullName: author.fullName, penName: author.penName });
    setEditError(null);
  }

  function cancelEdit() {
    setEditingUsername(null);
    setEditError(null);
  }

  async function handleSaveAuthor(username: string) {
    if (!editForm.fullName.trim()) {
      setEditError('Full name is required.');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await updateAuthor(username, editForm);
      setAuthors((prev) => prev.map((a) => (a.githubUsername === username ? updated : a)));
      setEditingUsername(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <AdminLayout breadcrumb="Manage admins">
      <h1 className="admin-page-heading" style={{ marginBottom: 32 }}>Admins</h1>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Added</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <tr key={admin.id}>
              <td style={{ fontWeight: 500 }}>@{admin.username}</td>
              <td>
                <span className={`badge ${admin.isPrimary ? 'badge-accent' : ''}`}>
                  {admin.isPrimary ? 'Primary' : 'Admin'}
                </span>
              </td>
              <td className="muted">{new Date(admin.addedAt).toLocaleDateString()}</td>
              <td className="actions">
                {!admin.isPrimary && (
                  <>
                    <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => handleTransfer(admin.id, admin.username)}>
                      Make primary
                    </button>
                    <button className="btn btn-danger" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => handleRemove(admin.id)}>
                      Remove
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="admin-divider" />

      <h2 className="admin-subheading" style={{ marginBottom: 20 }}>Add admin</h2>
      <form onSubmit={handleAdd} style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div className="field" style={{ flex: 1, maxWidth: 300 }}>
          <label htmlFor="newUsername">GitHub username</label>
          <input
            id="newUsername"
            className="input"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="e.g. octocat"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={adding || !newUsername.trim()}>
          {adding ? 'Adding…' : 'Add admin'}
        </button>
      </form>
      {error && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--color-danger)', marginTop: 8 }}>{error}</p>}

      <hr className="admin-divider" />

      <h2 className="admin-subheading" style={{ marginBottom: 4 }}>Author profiles</h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
        Used as the byline on published stories. Pen name defaults to full name if left blank.
      </p>

      <table className="admin-table">
        <thead>
          <tr>
            <th>GitHub</th>
            <th>Full name</th>
            <th>Pen name</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {authors.map((author) => (
            <tr key={author.githubUsername}>
              {editingUsername === author.githubUsername ? (
                <>
                  <td className="muted">@{author.githubUsername}</td>
                  <td>
                    <input
                      className="input"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Full name"
                      style={{ minWidth: 160 }}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      value={editForm.penName}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, penName: e.target.value }))}
                      placeholder={editForm.fullName || author.githubUsername}
                      style={{ minWidth: 160 }}
                    />
                  </td>
                  <td className="actions">
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: 12, padding: '5px 10px' }}
                      disabled={editSaving}
                      onClick={() => handleSaveAuthor(author.githubUsername)}
                    >
                      {editSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={cancelEdit}>
                      Cancel
                    </button>
                  </td>
                </>
              ) : (
                <>
                  <td className="muted">@{author.githubUsername}</td>
                  <td>
                    {author.fullName || <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Not set</span>}
                  </td>
                  <td>{author.penName}</td>
                  <td className="actions">
                    <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => startEdit(author)}>
                      Edit
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {editError && <p style={{ fontSize: 13, color: 'var(--color-danger)', marginTop: 8 }}>{editError}</p>}
    </AdminLayout>
  );
}
