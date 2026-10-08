import useCountdown from '../hooks/useCountdown';
import { fmtCountdown } from '../utils/formatTime';

// Shows mm:ss left until `deadline`. Turns red in the last minute.
export default function Countdown({ deadline, serverTime, onExpire, className = '' }) {
  const ms = useCountdown(deadline, serverTime, onExpire);
  if (ms === null) return <span className={className}>--:--</span>;
  const urgent = ms < 60000;
  return <span className={`font-mono tabular-nums ${urgent ? 'text-rose-600' : ''} ${className}`}>{fmtCountdown(ms)}</span>;
}