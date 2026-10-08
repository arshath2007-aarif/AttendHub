import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, GraduationCap, BookOpen, ClipboardList, CalendarCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';
import StatCard from '../../components/StatCard';
import { Spinner, ErrorState, EmptyState } from '../../components/States';
import { downloadCsv } from '../../utils/download';

export default function AdminDashboard() {
  const { data, loading, error, reload } = useFetch('/reports/summary');

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const { totals, attendance_by_subject, test_performance, low_attendance } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Reports</h1>
        <button className="btn-ghost" onClick={() => downloadCsv('/reports/attendance/export', 'attendance-report.csv').catch((e) => toast.error(e.message))}>
          <Download size={14} /> Attendance CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={totals.students} icon={GraduationCap} />
        <StatCard label="Subjects" value={totals.subjects} icon={BookOpen} tone="amber" />
        <StatCard label="Tests" value={totals.tests} icon={ClipboardList} tone="indigo" />
        <StatCard label="Sessions today" value={totals.sessions_today} icon={CalendarCheck} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-display text-lg font-semibold">Subject-wise attendance (%)</h2>
          {attendance_by_subject.length === 0 ? (
            <EmptyState title="No attendance data yet" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={attendance_by_subject}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="subject" fontSize={12} />
                  <YAxis domain={[0, 100]} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="percentage" fill="#0f7a69" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="mb-3 font-display text-lg font-semibold">Test-wise marks</h2>
          {test_performance.length === 0 ? (
            <EmptyState title="No test results yet" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={test_performance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="test" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="highest" fill="#0f7a69" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="average" fill="#e8a317" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lowest" fill="#e11d48" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="mb-3 font-display text-lg font-semibold">Students below 75% attendance</h2>
        {low_attendance.length === 0 ? (
          <EmptyState title="Everyone is above 75%" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="th">Roll no.</th><th className="th">Name</th><th className="th">Attendance</th></tr></thead>
              <tbody className="divide-y divide-black/5">
                {low_attendance.map((s) => (
                  <tr key={s.roll_number}>
                    <td className="td font-mono">{s.roll_number}</td>
                    <td className="td">{s.full_name}</td>
                    <td className="td font-semibold text-rose-600">{s.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
