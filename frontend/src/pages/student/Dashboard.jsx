import { Link } from 'react-router-dom';
import { CalendarCheck, CalendarX, Percent, Trophy } from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../hooks/useAuth';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import Countdown from '../../components/Countdown';
import { Spinner, ErrorState, EmptyState } from '../../components/States';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch('/student/dashboard', { interval: 30000 });

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const { attendance, average_score, today, active_tests } = data;
  const low = attendance.percentage < 75;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Hi, {user.full_name.split(' ')[0]} 👋</h1>
        <p className="text-sm text-black/50">Roll No. {user.roll_number}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Attendance" value={`${attendance.percentage}%`} hint={low ? 'Below 75% — be careful' : 'Good standing'} icon={Percent} tone={low ? 'rose' : 'brand'} />
        <StatCard label="Attended" value={attendance.attended} hint={`of ${attendance.total} classes`} icon={CalendarCheck} />
        <StatCard label="Missed" value={attendance.missed} icon={CalendarX} tone="rose" />
        <StatCard label="Avg. score" value={average_score != null ? `${average_score}%` : '—'} icon={Trophy} tone="indigo" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Today's classes</h2>
            <Link to="/student/attendance" className="text-sm font-semibold text-brand-600">Mark attendance →</Link>
          </div>
          {today.length === 0 ? (
            <EmptyState title="No classes today" text="Sessions appear here once your CR starts them." />
          ) : (
            <ul className="divide-y divide-black/5">
              {today.map((c, i) => (
                <li key={i} className="flex items-center justify-between py-3">
                  <span className="font-medium">{c.subject}</span>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="mb-3 font-display text-lg font-semibold">Active tests</h2>
          {active_tests.length === 0 ? (
            <EmptyState title="No active tests" text="Published tests show up here during their window." />
          ) : (
            <ul className="divide-y divide-black/5">
              {active_tests.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-black/50">
                      {t.subject} · closes in <Countdown deadline={t.expiry_time} serverTime={data.server_time} />
                    </p>
                  </div>
                  <Link to={`/student/tests/${t.id}/take`} className="btn-primary !py-1.5">
                    {t.in_progress ? 'Resume' : 'Start'}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
