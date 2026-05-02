import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { getAdmins, addAdmin, removeAdmin, transferPrimary } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { AdminUser } from '../../types';

export default function Admins() {
  const { isPrimary } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPrimary) { navigate('/admin'); return; }
    getAdmins().then(setAdmins);
  }, [isPrimary, navigate]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const admin = await addAdmin(newUsername.trim());
      setAdmins((prev) => [...prev, admin]);
      setNewUsername('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add admin');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Remove this admin?')) return;
    await removeAdmin(id);
    setAdmins((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleTransfer(id: string, username: string) {
    if (!confirm(`Transfer primary to ${username}? You will lose primary access.`)) return;
    await transferPrimary(id);
    setAdmins((prev) => prev.map((a) => ({ ...a, isPrimary: a.id === id })));
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
    </AdminLayout>
  );
}
