import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, Timer } from 'lucide-react';
import api from '../../services/api';
import Countdown from '../../components/Countdown';
import Modal from '../../components/Modal';
import { Spinner, ErrorState } from '../../components/States';

export default function TakeTest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null); // { test_session_id, test, questions, deadline, server_time, saved_answers }
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({}); // { question_id: "chosen option" }
  const [index, setIndex] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const finished = useRef(false);

  // 1) Start (or resume) the test. The backend creates the test_session and records login_time.
  useEffect(() => {
    api
      .post(`/tests/${id}/start`)
      .then(({ data }) => {
        setSession(data);
        setAnswers(data.saved_answers || {});
      })
      .catch((e) => setError(e.message));
  }, [id]);

  // 2) Save each answer to the server straight away so nothing is lost on refresh
  async function choose(questionId, option) {
    setAnswers((a) => ({ ...a, [questionId]: option }));
    try {
      await api.put(`/test-sessions/${session.test_session_id}/answer`, { question_id: questionId, answer: option });
    } catch (e) {
      toast.error(`Answer not saved: ${e.message}`);
    }
  }

  // 3) Submit. The backend decides submitted vs auto_submitted using ITS clock.
  const submit = useCallback(
    async (auto = false) => {
      if (finished.current || !session) return;
      finished.current = true;
      setBusy(true);
      try {
        const { data } = await api.post(`/test-sessions/${session.test_session_id}/submit`, { auto });
        setResult(data);
        setConfirm(false);
        if (auto) toast('Time is up. Your test was submitted automatically.', { icon: '⏰' });
      } catch (e) {
        finished.current = false;
        toast.error(e.message);
      } finally {
        setBusy(false);
      }
    },
    [session]
  );

  if (error)
    return (
      <div className="mx-auto max-w-md">
        <ErrorState message={error} />
        <div className="text-center"><Link to="/student/tests" className="btn-ghost">Back to tests</Link></div>
      </div>
    );
  if (!session) return <Spinner label="Starting test…" />;

  if (result)
    return (
      <div className="card mx-auto max-w-md space-y-3 text-center">
        <CheckCircle2 className="mx-auto text-emerald-600" size={44} />
        <h1 className="font-display text-2xl font-bold">Test submitted</h1>
        <p className="text-sm text-black/60">
          Status: <b>{result.status === 'auto_submitted' ? 'Auto-submitted (time up)' : 'Submitted'}</b>
        </p>
        <p className="text-sm text-black/60">
          {result.results_released ? <>Score: <b>{result.marks_obtained}/{result.total_marks}</b></> : 'Your teacher will release the result soon.'}
        </p>
        <button className="btn-primary" onClick={() => navigate('/student/tests')}>Back to tests</button>
      </div>
    );

  const { questions } = session;
  const q = questions[index];
  const answered = Object.keys(answers).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="card sticky top-16 z-20 flex items-center justify-between !py-3">
        <div>
          <p className="font-display font-semibold">{session.test.name}</p>
          <p className="text-xs text-black/50">{answered}/{questions.length} answered</p>
        </div>
        <div className="flex items-center gap-2 text-xl font-bold">
          <Timer size={20} />
          <Countdown deadline={session.deadline} serverTime={session.server_time} onExpire={() => submit(true)} />
        </div>
      </div>

      <div className="card space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-black/50">
          Question {index + 1} of {questions.length} · {q.marks} mark{q.marks > 1 ? 's' : ''}
        </p>
        <h2 className="text-lg font-semibold">{q.question_text}</h2>
        <div className="space-y-2">
          {q.options.map((opt) => {
            const selected = answers[q.id] === opt;
            return (
              <button
                key={opt}
                onClick={() => choose(q.id, opt)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                  selected ? 'border-brand-600 bg-brand-50 font-semibold' : 'border-black/10 hover:bg-black/5'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between pt-2">
          <button className="btn-ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</button>
          {index < questions.length - 1 ? (
            <button className="btn-primary" onClick={() => setIndex(index + 1)}>Next</button>
          ) : (
            <button className="btn-primary" onClick={() => setConfirm(true)}>Finish</button>
          )}
        </div>
      </div>

      {/* Question palette */}
      <div className="flex flex-wrap gap-2">
        {questions.map((item, i) => (
          <button
            key={item.id}
            onClick={() => setIndex(i)}
            className={`h-9 w-9 rounded-lg text-sm font-semibold ${
              i === index ? 'bg-brand-600 text-white' : answers[item.id] ? 'bg-brand-100 text-brand-700' : 'bg-white text-black/50 ring-1 ring-black/10'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <Modal open={confirm} title="Submit test?" onClose={() => setConfirm(false)}>
        <p className="mb-4 text-sm text-black/60">
          You answered {answered} of {questions.length} questions. You cannot change answers after submitting.
        </p>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setConfirm(false)}>Keep working</button>
          <button className="btn-primary" disabled={busy} onClick={() => submit(false)}>Submit now</button>
        </div>
      </Modal>
    </div>
  );
}