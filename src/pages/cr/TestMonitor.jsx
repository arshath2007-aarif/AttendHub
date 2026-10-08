import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, Megaphone } from 'lucide-react';
import api from '../../services/api';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../hooks/useAuth';
import StatusBadge from '../../components/StatusBadge';
import { Spinner, ErrorState, EmptyState } from '../../components/States';
import { fmtDuration, fmtTime } from '../../utils/formatTime';
import { downloadCsv } from '../../utils/download';

export default function TestMonitor({ base }) {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(`/tests/${id}/monitor`, { interval: 5000 });
  const canRelease = user.role === 'teacher' || user.role === 'admin';

  async function release() {
    try {
      await api.post(`/tests/${id}/release`);
      toast.success('Results released to students');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const { test, rows } = data;
  const scored = rows.filter((r) => r.marks_obtained != null).map((r) => r.marks_obtained);

  return (
    <div className="space-y-4">
      <Link to={`${base}/tests`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
        <ArrowLeft size={14} /> All tests
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{test.name}</h1>
          <p className="text-sm text-black/50">
            {rows.length} attempted
            {scored.length > 0 && ` · avg ${(scored.reduce((a, b) => a + b, 0) / scored.length).toFixed(1)} · high ${Math.max(...scored)} · low ${Math.min(...scored)} (out of ${test.total_marks})`}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => downloadCsv(`/tests/${id}/export`, `${test.name}-results.csv`).catch((e) => toast.error(e.message))}>
            <Download size={14} /> CSV
          </button>
          {canRelease && !test.results_released && (
            <button className="btn-primary" onClick={release}><Megaphone size={14} /> Release results</button>
          )}
          {test.results_released && <StatusBadge status="published" />}
        </div>
      </div>

      <div className="card overflow-x-auto !p-0">
        {rows.length === 0 ? (
          <EmptyState title="No one has started yet" text="This page refreshes every few seconds." />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Student</th><th className="th">Roll no.</th><th className="th">Login</th>
                <th className="th">Status</th><th className="th">Submitted</th><th className="th">Time spent</th><th className="th">Marks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {rows.map((r) => (
                <tr key={r.roll_number}>
                  <td className="td font-medium">{r.full_name}</td>
                  <td className="td font-mono">{r.roll_number}</td>
                  <td className="td">{fmtTime(r.login_time)}</td>
                  <td className="td"><StatusBadge status={r.status} /></td>
                  <td className="td">{fmtTime(r.submitted_time)}</td>
                  <td className="td">{fmtDuration(r.time_spent_seconds)}</td>
                  <td className="td font-semibold">{r.marks_obtained != null ? `${r.marks_obtained}/${test.total_marks}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}