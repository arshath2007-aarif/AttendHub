import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import api from '../../services/api';
import useFetch from '../../hooks/useFetch';
import { Spinner } from '../../components/States';
import { nowLocalInput } from '../../utils/formatTime';

const blankQuestion = () => ({ question_text: '', options: ['', '', '', ''], correct_index: 0, marks: 1 });

export default function CreateTest({ base }) {
  const navigate = useNavigate();
  const options = useFetch('/cr/options');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '', subject_id: '', description: '',
    start_time: nowLocalInput(5), expiry_time: nowLocalInput(60 * 24), duration_minutes: 30, publish: false,
  });
  const [questions, setQuestions] = useState([blankQuestion()]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const updateQ = (i, patch) => setQuestions(questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const updateOpt = (i, j, val) => updateQ(i, { options: questions[i].options.map((o, k) => (k === j ? val : o)) });
  const totalMarks = questions.reduce((sum, q) => sum + Number(q.marks || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (new Date(form.expiry_time) <= new Date(form.start_time)) return toast.error('Expiry must be after start time');
    for (const [i, q] of questions.entries()) {
      if (q.options.some((o) => !o.trim())) return toast.error(`Question ${i + 1}: fill all four options`);
    }
    setBusy(true);
    try {
      await api.post('/tests', {
        ...form,
        duration_minutes: Number(form.duration_minutes),
        start_time: new Date(form.start_time).toISOString(),
        expiry_time: new Date(form.expiry_time).toISOString(),
        questions: questions.map((q, i) => ({
          type: 'mcq', // backend + DB support more types later
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.options[q.correct_index],
          marks: Number(q.marks),
          position: i,
        })),
      });
      toast.success('Test created');
      navigate(`${base}/tests`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (options.loading) return <Spinner />;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-bold">Create test</h1>

      <section className="card grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Test name</label>
          <input className="input" value={form.name} onChange={set('name')} placeholder="Java Unit Test 1" required />
        </div>
        <div>
          <label className="label">Subject</label>
          <select className="input" value={form.subject_id} onChange={set('subject_id')} required>
            <option value="">Select subject</option>
            {options.data?.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Duration (minutes)</label>
          <input type="number" min="1" className="input" value={form.duration_minutes} onChange={set('duration_minutes')} required />
        </div>
        <div>
          <label className="label">Opens at</label>
          <input type="datetime-local" className="input" value={form.start_time} onChange={set('start_time')} required />
        </div>
        <div>
          <label className="label">Expires at</label>
          <input type="datetime-local" className="input" value={form.expiry_time} onChange={set('expiry_time')} required />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description</label>
          <textarea className="input" rows={2} value={form.description} onChange={set('description')} />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={form.publish} onChange={set('publish')} /> Publish immediately
        </label>
      </section>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <section key={i} className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold">Question {i + 1}</h2>
              {questions.length > 1 && (
                <button type="button" className="text-rose-600" onClick={() => setQuestions(questions.filter((_, k) => k !== i))} aria-label="Remove question">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <input className="input" placeholder="Question text" value={q.question_text} onChange={(e) => updateQ(i, { question_text: e.target.value })} required />
            {q.options.map((opt, j) => (
              <div key={j} className="flex items-center gap-2">
                <input type="radio" name={`correct-${i}`} checked={q.correct_index === j} onChange={() => updateQ(i, { correct_index: j })} aria-label={`Mark option ${j + 1} correct`} />
                <input className="input" placeholder={`Option ${j + 1}`} value={opt} onChange={(e) => updateOpt(i, j, e.target.value)} required />
              </div>
            ))}
            <div className="flex items-center gap-3">
              <label className="label !mb-0">Marks</label>
              <input type="number" min="1" className="input !w-24" value={q.marks} onChange={(e) => updateQ(i, { marks: e.target.value })} required />
              <span className="text-xs text-black/50">Select the radio button next to the correct option.</span>
            </div>
          </section>
        ))}
        <button type="button" className="btn-ghost w-full" onClick={() => setQuestions([...questions, blankQuestion()])}>
          <Plus size={16} /> Add question
        </button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-black/60">{questions.length} questions · {totalMarks} marks</p>
        <button className="btn-primary" disabled={busy}>
          {busy && <Loader2 className="animate-spin" size={16} />} Save test
        </button>
      </div>
    </form>
  );
}
