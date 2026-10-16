import { useEffect, useRef, useState } from 'react';

// Counts down to `deadline` (ISO string).
// `serverTime` = the server's "now" when the data was fetched. It corrects a wrong
// device clock for display only. The backend still makes the real decision.
export default function useCountdown(deadline, serverTime, onExpire) {
  const [remaining, setRemaining] = useState(null); // milliseconds
  const expireRef = useRef(onExpire);

  useEffect(() => {
    expireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!deadline) return;
    const offset = serverTime ? new Date(serverTime).getTime() - Date.now() : 0;
    let fired = false;

    const tick = () => {
      const left = Math.max(0, new Date(deadline).getTime() - (Date.now() + offset));
      setRemaining(left);
      if (left === 0 && !fired) {
        fired = true;
        expireRef.current?.();
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadline, serverTime]);

  return remaining;
}
