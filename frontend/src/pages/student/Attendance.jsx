import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Loader2 } from 'lucide-react';
import api from '../../services/api';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../hooks/useAuth';
import StatusBadge from '../../components/StatusBadge';
import { Spinner, ErrorState, EmptyState } from '../../components/States';
import { fmtDate, fmtTime } from '../../utils/formatTime';

export default function StudentAttendance() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch('/student/attendance');
  const [roll, setRoll] = useState(user.roll_number || '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);

  async function handleMark(e) {
    e.preventDefault();
    setBusy(true);
    setSuccess(null);
    try {
      // Backend checks: student exists, roll matches, session active, code correct, not duplicate
      const { data: res } = await api.post('/attendance/mark', { roll_number: roll.trim(), session_code: code.trim().toUpperCase() });
      setSuccess(res);
      setCode('');
      toast.success('Attendance marked!');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="card">
        <h1 className="font-display text-xl font-bold">Mark attendance</h1>
        <p className="mb-4 text-sm text-black/50">
          Connect to the CR's hotspot if asked, then enter the code shown on the CR's screen.
        </p>
        <form onSubmit={handleMark} className="space-y-4">
          <div>
            <label className="label" htmlFor="roll">Roll number</label>
            <input id="roll" className="input" value={roll} onChange={(e) => setRoll(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="code">Session code</label>
            <input
              id="code"
              className="input text-center font-mono text-2xl uppercase tracking-[0.4em]"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={8}
              placeholder="K7P2QX"
              autoComplete="off"
              required
            />
          </div>
          <button className="btn-primary w-full" disabled={busy || code.length < 4}>
            {busy && <Loader2 className="animate-spin" size={16} />} Mark me present
          </button>
        </form>

        {success && (
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-900">
            <CheckCircle2 className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Attendance recorded</p>
              <p className="text-sm">{success.subject} · {fmtTime(success.marked_time)}</p>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-display text-lg font-semibold">History</h2>
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data.records.length === 0 ? (
          <EmptyState title="No attendance yet" text="Your records will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr><th className="th">Date</th><th className="th">Subject</th><th className="th">Time</th><th className="th">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {data.records.map((r, i) => (
                  <tr key={i}>
                    <td className="td">{fmtDate(r.date)}</td>
                    <td className="td">{r.subject}</td>
                    <td className="td">{fmtTime(r.marked_time)}</td>
                    <td className="td"><StatusBadge status={r.status} /></td>
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
