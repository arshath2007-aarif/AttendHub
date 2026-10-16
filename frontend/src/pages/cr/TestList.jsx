import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, Trash2 } from 'lucide-react';
import api from '../../services/api';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../hooks/useAuth';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import { Spinner, ErrorState, EmptyState } from '../../components/States';
import { fmtDateTime } from '../../utils/formatTime';

// Shared by CR (/cr/tests) and Teacher/Admin (/admin/tests). `base` is the URL prefix.
export default function TestList({ base }) {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch('/tests/manage', { interval: 30000 });
  const [toDelete, setToDelete] = useState(null);
  const canDelete = user.role === 'teacher' || user.role === 'admin';

  async function togglePublish(t) {
    try {
      await api.patch(`/tests/${t.id}/publish`, { is_published: !t.is_published });
      toast.success(t.is_published ? 'Test unpublished' : 'Test published');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function remove() {
    try {
      await api.delete(`/tests/${toDelete.id}`);
      toast.success('Test deleted');
      setToDelete(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Tests</h1>
        <Link to={`${base}/tests/new`} className="btn-primary">New test</Link>
      </div>

      {data.length === 0 ? (
        <div className="card"><EmptyState title="No tests yet" text="Create your first test, then publish it." /></div>
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Test</th><th className="th">Window</th><th className="th">Marks</th>
                <th className="th">Status</th><th className="th">Published</th><th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {data.map((t) => (
                <tr key={t.id}>
                  <td className="td"><p className="font-semibold">{t.name}</p><p className="text-xs text-black/50">{t.subject}</p></td>
                  <td className="td text-xs">{fmtDateTime(t.start_time)}<br />→ {fmtDateTime(t.expiry_time)}<br /><span className="text-black/50">{t.duration_minutes} min</span></td>
                  <td className="td">{t.total_marks} <span className="text-xs text-black/50">({t.question_count} Qs)</span></td>
                  <td className="td"><StatusBadge status={t.status} /></td>
                  <td className="td">
                    <button className="btn-ghost !py-1.5" onClick={() => togglePublish(t)}>
                      {t.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                  </td>
                  <td className="td">
                    <div className="flex gap-1">
                      <Link to={`${base}/tests/${t.id}/monitor`} className="btn-ghost !px-2.5 !py-1.5" aria-label="Monitor"><Eye size={16} /></Link>
                      {canDelete && (
                        <button className="btn-ghost !px-2.5 !py-1.5 text-rose-600" onClick={() => setToDelete(t)} aria-label="Delete"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!toDelete} title="Delete test?" onClose={() => setToDelete(null)}>
        <p className="mb-4 text-sm text-black/60">"{toDelete?.name}" and all student submissions for it will be removed.</p>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setToDelete(null)}>Cancel</button>
          <button className="btn-danger" onClick={remove}>Delete</button>
        </div>
      </Modal>
    </div>
  );
}
