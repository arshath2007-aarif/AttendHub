import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { homeFor } from './utils/roleRedirect';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import { Spinner } from './components/States';

import Login from './pages/Login';
import StudentDashboard from './pages/student/Dashboard';
import StudentAttendance from './pages/student/Attendance';
import StudentTests from './pages/student/Tests';
import TakeTest from './pages/student/TakeTest';
import CRDashboard from './pages/cr/Dashboard';
import TestList from './pages/cr/TestList';
import CreateTest from './pages/cr/CreateTest';
import TestMonitor from './pages/cr/TestMonitor';
import AdminDashboard from './pages/admin/Dashboard';

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Student only */}
      <Route element={<ProtectedRoute roles={['student']} />}>
        <Route path="/student" element={<DashboardLayout group="student" />}>
          <Route index element={<StudentDashboard />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="tests" element={<StudentTests />} />
          <Route path="tests/:id/take" element={<TakeTest />} />
        </Route>
      </Route>

      {/* CR only */}
      <Route element={<ProtectedRoute roles={['cr']} />}>
        <Route path="/cr" element={<DashboardLayout group="cr" />}>
          <Route index element={<CRDashboard />} />
          <Route path="tests" element={<TestList base="/cr" />} />
          <Route path="tests/new" element={<CreateTest base="/cr" />} />
          <Route path="tests/:id/monitor" element={<TestMonitor base="/cr" />} />
        </Route>
      </Route>

      {/* Teacher / Admin only */}
      <Route element={<ProtectedRoute roles={['teacher', 'admin']} />}>
        <Route path="/admin" element={<DashboardLayout group="admin" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="tests" element={<TestList base="/admin" />} />
          <Route path="tests/new" element={<CreateTest base="/admin" />} />
          <Route path="tests/:id/monitor" element={<TestMonitor base="/admin" />} />
        </Route>
      </Route>

      {/* Anything else: go to the right home */}
      <Route
        path="*"
        element={loading ? <Spinner /> : <Navigate to={user ? homeFor(user.role) : '/login'} replace />}
      />
    </Routes>
  );
}