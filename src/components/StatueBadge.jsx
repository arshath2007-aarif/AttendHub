// Small coloured pill. Works for attendance, test and test-session statuses.
const STYLES = {
  present: 'bg-emerald-100 text-emerald-800',
  absent: 'bg-rose-100 text-rose-800',
  pending: 'bg-amber-100 text-amber-800',
  upcoming: 'bg-sky-100 text-sky-800',
  active: 'bg-emerald-100 text-emerald-800',
  expired: 'bg-slate-200 text-slate-700',
  completed: 'bg-indigo-100 text-indigo-800',
  in_progress: 'bg-amber-100 text-amber-800',
  submitted: 'bg-indigo-100 text-indigo-800',
  auto_submitted: 'bg-orange-100 text-orange-800',
  draft: 'bg-slate-200 text-slate-700',
  published: 'bg-emerald-100 text-emerald-800',
};

export default function StatusBadge({ status }) {
  const label = String(status || '').replace('_', ' ');
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STYLES[status] || 'bg-slate-100 text-slate-700'}`}>
      {label}
    </span>
  );
}