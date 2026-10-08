import { Loader2, Inbox, AlertTriangle } from 'lucide-react';

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-black/50">
      <Loader2 className="animate-spin" size={20} /> {label}
    </div>
  );
}

export function EmptyState({ title, text }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <Inbox className="text-black/25" size={36} />
      <p className="font-semibold">{title}</p>
      {text && <p className="max-w-xs text-sm text-black/50">{text}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <AlertTriangle className="text-rose-500" size={32} />
      <p className="text-sm text-rose-700">{message}</p>
      {onRetry && (
        <button className="btn-ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}