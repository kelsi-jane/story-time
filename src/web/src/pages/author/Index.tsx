import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthorLayout from '../../components/AuthorLayout';
import ProjectNewModal from '../../components/author/ProjectNewModal';
import { listProjects } from '../../api/planning';
import { useAuth } from '../../context/AuthContext';
import type { ProjectListItem } from '../../types';

export default function AuthorIndex() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    listProjects(user.username)
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  function handleCreated(projectId: string) {
    setShowModal(false);
    navigate(`/author/projects/${projectId}`);
  }

  return (
    <AuthorLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <h1 className="admin-page-heading">Author Studio</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          New project
        </button>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Loading…</p>
      ) : projects.length === 0 ? (
        <div style={{ marginTop: 48, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
            No projects yet.
          </p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Create your first project
          </button>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Created</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr
                key={p.projectId}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/author/projects/${p.projectId}`)}
              >
                <td>{p.title}</td>
                <td className="muted">{new Date(p.createdAt).toLocaleDateString()}</td>
                <td className="muted">{p.blockCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <ProjectNewModal
          onCreated={handleCreated}
          onClose={() => setShowModal(false)}
        />
      )}
    </AuthorLayout>
  );
}
