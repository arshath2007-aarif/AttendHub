// Creates demo accounts + one sample Java test.  Run once:  npm run seed
require('dotenv').config();
const supabase = require('../config/supabase');

const PASSWORD = process.env.SEED_PASSWORD;
if (!PASSWORD || PASSWORD.length < 8) {
  console.error('Set SEED_PASSWORD (at least 8 characters) in backend/.env first.');
  process.exit(1);
}

const check = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

// Returns the Supabase Auth user id, creating the account if needed
async function authUser(email) {
  const list = check(await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }));
  const found = list.users.find((u) => u.email === email);
  if (found) return found.id;
  const created = check(await supabase.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true }));
  return created.user.id;
}

async function main() {
  // section + subjects (schema.sql already inserts these; this makes the script safe to re-run)
  let section = check(await supabase.from('class_sections').select('id').eq('name', 'CSE-A').eq('year', 3).maybeSingle());
  if (!section) section = check(await supabase.from('class_sections').insert({ name: 'CSE-A', year: 3 }).select('id').single());

  const subjectDefs = [['CS301', 'Java'], ['CS302', 'DBMS'], ['CS303', 'Operating Systems']];
  for (const [code, name] of subjectDefs) {
    check(await supabase.from('subjects').upsert({ code, name }, { onConflict: 'code' }));
  }

  // staff
  const adminId = await authUser('admin@example.com');
  check(await supabase.from('users').upsert({ id: adminId, email: 'admin@example.com', full_name: 'Admin User', role: 'admin' }));

  const teacherId = await authUser('teacher@example.com');
  check(await supabase.from('users').upsert({ id: teacherId, email: 'teacher@example.com', full_name: 'Prof. Meera Nair', role: 'teacher' }));
  const teacher = check(await supabase.from('teachers').upsert({ user_id: teacherId, department: 'CSE' }, { onConflict: 'user_id' }).select('id').single());
  check(await supabase.from('subjects').update({ teacher_id: teacher.id }).in('code', subjectDefs.map((s) => s[0])));

  // students: 22CS001 is the CR
  const people = [
    ['22CS001', 'Arjun Menon', true],
    ['22CS002', 'Priya Sharma'], ['22CS003', 'Rahul Verma'], ['22CS004', 'Sneha Iyer'],
    ['22CS005', 'Karthik Reddy'], ['22CS006', 'Ananya Das'], ['22CS007', 'Mohammed Faiz'],
    ['22CS008', 'Divya Nair'], ['22CS009', 'Vikram Singh'], ['22CS010', 'Lakshmi Priya'],
  ];
  for (const [roll, name, isCr] of people) {
    const email = `${roll.toLowerCase()}@example.com`;
    const id = await authUser(email);
    check(await supabase.from('users').upsert({ id, email, full_name: name, role: isCr ? 'cr' : 'student' }));
    check(
      await supabase
        .from('students')
        .upsert({ user_id: id, roll_number: roll, section_id: section.id, is_cr: !!isCr }, { onConflict: 'user_id' })
    );
  }

  // sample test (published, open for 7 days)
  const existing = check(await supabase.from('tests').select('id').eq('name', 'Java Unit Test 1').maybeSingle());
  if (!existing) {
    const java = check(await supabase.from('subjects').select('id').eq('code', 'CS301').single());
    const questions = [
      ['Which keyword is used to inherit a class in Java?', ['extends', 'implements', 'inherits', 'super'], 'extends'],
      ['What is the default value of an int instance variable?', ['0', 'null', '1', 'undefined'], '0'],
      ['Which collection does not allow duplicate elements?', ['ArrayList', 'LinkedList', 'HashSet', 'Vector'], 'HashSet'],
      ['Which is the correct signature of the main method?', ['public static void main(String[] args)', 'public void main(String args)', 'static main()', 'void start()'], 'public static void main(String[] args)'],
      ['Which of these is NOT a primitive type?', ['int', 'boolean', 'String', 'char'], 'String'],
    ];
    const test = check(
      await supabase
        .from('tests')
        .insert({
          name: 'Java Unit Test 1',
          subject_id: java.id,
          description: 'Basics of Java: inheritance, collections and data types.',
          created_by: teacherId,
          start_time: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          expiry_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 20,
          total_marks: questions.length * 2,
          is_published: true,
        })
        .select('id')
        .single()
    );
    check(
      await supabase.from('questions').insert(
        questions.map(([question_text, options, correct_answer], i) => ({
          test_id: test.id, type: 'mcq', question_text, options, correct_answer, marks: 2, position: i,
        }))
      )
    );
  }

  console.log('Seed complete. All demo accounts use the password from SEED_PASSWORD.');
  console.log('  Admin:    admin@example.com');
  console.log('  Teacher:  teacher@example.com');
  console.log('  CR:       22CS001  (or 22cs001@example.com)');
  console.log('  Students: 22CS002 ... 22CS010');
}

main().catch((e) => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});
