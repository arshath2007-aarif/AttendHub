import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Loader2, Play, Square, Users, UserX, Radio, ClipboardList } from 'lucide-react';
import api from '../../services/api';
import useFetch from '../../hooks/useFetch';
import StatCard from '../../components/StatCard';
import Countdown from '../../components/Countdown';
import Modal from '../../components/Modal';
import { Spinner, ErrorState, EmptyState } from '../../components/States';
import { fmtTime } from '../../utils/formatTime';
import { downloadCsv } from '../../utils/download';

const today = () => new Date().toISOString().slice(0, 10);

export default function CRDashboard() {
  const dash = useFetch('/cr/dashboard', { interval: 10000 });
  const options = useFetch('/cr/options'); // { subjects, sections }
  const [form, setForm] = useState({ subject_id: '', section_id: '', session_date: today(), minutes: 10 });
  const [busy, setBusy] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);

  const active = dash.data?.active_session;
  // live list refreshes every 5 seconds while a session is active
  const live = useFetch(active ? `/sessions/${active.id}/attendance` : null, { interval: 5000, enabled: !!active });

  async function start(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/sessions', { ...form, minutes: Number(form.minutes) });
      toast.success('Attendance started');
      dash.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    try {
      await api.post(`/sessions/${active.id}/stop`);
      toast.success('Session closed');
      setStopOpen(false);
      dash.reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (dash.loading || options.loading) return <Spinner />;
  if (dash.error) return <ErrorState message={dash.error} onRetry={dash.reload} />;

  const d = dash.data;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">CR dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Present today" value={d.today.present} icon={Users} />
        <StatCard label="Absent today" value={d.today.absent} icon={UserX} tone="rose" />
        <StatCard label="Active tests" value={d.active_tests} icon={Radio} tone="amber" />
        <StatCard label="Pending submissions" value={d.pending_submissions} icon={ClipboardList} tone="indigo" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Start / active session */}
        <section className="card lg:col-span-2">
          {active ? (
            <div className="space-y-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-black/50">
                {active.subject} · {active.section}
              </p>
              <p className="font-mono text-6xl font-bold tracking-[0.3em] text-brand-700">{active.session_code}</p>
              <p className="text-sm text-black/60">
                Expires in <Countdown deadline={active.expiry_time} serverTime={d.server_time} onExpire={dash.reload} className="font-semibold" />
              </p>
              <button className="btn-danger w-full" onClick={() => setStopOpen(true)}>
                <Square size={16} /> Stop attendance
              </button>
            </div>
          ) : (
            <form onSubmit={start} className="space-y-4">
              <h2 className="font-display text-lg font-semibold">Start attendance</h2>
              <div>
                <label className="label">Subject</label>
                <select className="input" value={form.subject_id} onChange={set('subject_id')} required>
                  <option value="">Select subject</option>
                  {options.data?.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Class / section</label>
                <select className="input" value={form.section_id} onChange={set('section_id')} required>
                  <option value="">Select section</option>
                  {options.data?.sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={form.session_date} onChange={set('session_date')} required />
                </div>
                <div>
                  <label className="label">Code valid (min)</label>
                  <input type="number" min="1" max="60" className="input" value={form.minutes} onChange={set('minutes')} required />
                </div>
              </div>
              <button className="btn-primary w-full" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />} Start & generate code
              </button>
            </form>
          )}
        </section>

        {/* Live attendance */}
        <section className="card lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Live attendance</h2>
            {active && (
              <button className="btn-ghost !py-1.5" onClick={() => downloadCsv(`/sessions/${active.id}/export`, 'attendance.csv').catch((e) => toast.error(e.message))}>
                <Download size={14} /> CSV
              </button>
            )}
          </div>
          {!active ? (
            <EmptyState title="No active session" text="Start attendance to see students join live." />
          ) : live.loading ? (
            <Spinner />
          ) : live.data?.present.length === 0 ? (
            <EmptyState title="Waiting for students…" text="Share the code with your class." />
          ) : (
            <>
              <p className="mb-2 text-sm text-black/60">
                <b>{live.data.present.length}</b> of {live.data.total} present
              </p>
              <div className="max-h-96 overflow-auto">
                <table className="w-full">
                  <thead><tr><th className="th">Roll no.</th><th className="th">Name</th><th className="th">Marked at</th></tr></thead>
                  <tbody className="divide-y divide-black/5">
                    {live.data.present.map((s) => (
                      <tr key={s.roll_number}>
                        <td className="td font-mono">{s.roll_number}</td>
                        <td className="td">{s.full_name}</td>
                        <td className="td">{fmtTime(s.marked_time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      <Modal open={stopOpen} title="Stop attendance?" onClose={() => setStopOpen(false)}>
        <p className="mb-4 text-sm text-black/60">Students will no longer be able to use this code.</p>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setStopOpen(false)}>Cancel</button>
          <button className="btn-danger" onClick={stop}>Stop session</button>
        </div>
      </Modal>
    </div>
  );
}
