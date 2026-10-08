import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GraduationCap, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { homeFor } from '../utils/roleRedirect';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const profile = await login(identifier, password);
      if (!profile) throw new Error('Logged in, but your profile was not found. Contact admin.');
      navigate(homeFor(profile.role), { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-2 font-display text-xl font-bold">
          <GraduationCap /> AttendHub
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight">
            Attendance and tests,
            <br />
            without the paperwork.
          </h1>
          <p className="mt-4 max-w-md text-white/70">
            The CR starts a class, shares a code, and attendance is recorded in seconds. Timed tests are checked against
            the server clock, so results stay fair.
          </p>
        </div>
        <p className="text-sm text-white/40">College project</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4 !p-7">
          <div>
            <h2 className="font-display text-2xl font-bold">Welcome back</h2>
            <p className="text-sm text-black/50">Sign in with your email or roll number.</p>
          </div>
          <div>
            <label className="label" htmlFor="identifier">Email or Roll Number</label>
            <input id="identifier" className="input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn-primary w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" size={16} />} Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
