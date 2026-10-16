// Where each role lands after login
export function homeFor(role) {
  if (role === 'student') return '/student';
  if (role === 'cr') return '/cr';
  return '/admin'; // teacher + admin
}
