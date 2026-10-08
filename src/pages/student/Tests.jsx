import { Link } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import StatusBadge from '../../components/StatusBadge';
import { Spinner, ErrorState, EmptyState } from '../../components/States';
import { fmtDateTime } from '../../utils/formatTime';

// status from backend (server time): upcoming | active | expired | completed
export default function StudentTests() {
  const { data, loading, error, reload } = useFetch('/tests', { interval: 30000 });

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (data.length === 0) return <EmptyState title="No tests yet" text="Published tests for your class will show here." />;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Tests</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((t) => (
          <div key={t.id} className="card space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-semibold">{t.name}</h2>
                <p className="text-sm text-black/50">{t.subject}</p>
              </div>
              <StatusBadge status={t.status} />
            </div>
            {t.description && <p className="text-sm text-black/70">{t.description}</p>}
            <dl className="grid grid-cols-2 gap-2 text-xs text-black/60">
              <div><dt className="font-semibold">Opens</dt><dd>{fmtDateTime(t.start_time)}</dd></div>
              <div><dt className="font-semibold">Closes</dt><dd>{fmtDateTime(t.expiry_time)}</dd></div>
              <div><dt className="font-semibold">Duration</dt><dd>{t.duration_minutes} min</dd></div>
              <div><dt className="font-semibold">Marks</dt><dd>{t.total_marks} ({t.question_count} Qs)</dd></div>
            </dl>
            {t.status === 'completed' && (
              <p className="rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                {t.results_released ? <>Your score: <b>{t.marks_obtained}/{t.total_marks}</b></> : 'Submitted. Result not released yet.'}
              </p>
            )}
            {t.status === 'active' && (
              <Link to={`/student/tests/${t.id}/take`} className="btn-primary w-full">
                {t.in_progress ? 'Resume test' : 'Start test'}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
