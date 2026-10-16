export default function StatCard({ label, value, hint, icon: Icon, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    indigo: 'bg-indigo-50 text-indigo-700',
  };
  return (
    <div className="card flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-black/50">{label}</p>
        <p className="mt-1 font-display text-3xl font-bold">{value}</p>
        {hint && <p className="mt-1 text-xs text-black/50">{hint}</p>}
      </div>
      {Icon && (
        <span className={`rounded-xl p-2.5 ${tones[tone]}`}>
          <Icon size={20} />
        </span>
      )}
    </div>
  );
}
