import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { UsersPage } from './pages/UsersPage'
import { SchoolsPage } from './pages/SchoolsPage'
import { SubjectsPage } from './pages/SubjectsPage'
import { ClassesPage } from './pages/ClassesPage'
import { ClassDetailsPage } from './pages/ClassDetailsPage'
import { RolesPage } from './pages/RolesPage'
import { PermissionsPage } from './pages/PermissionsPage'
import { EnrollmentsPage } from './pages/EnrollmentsPage'
import { TeachingMaterialsPage } from './pages/TeachingMaterialsPage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="schools" element={<SchoolsPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="materials" element={<TeachingMaterialsPage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="classes/:external_id" element={<ClassDetailsPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="permissions" element={<PermissionsPage />} />
        <Route path="enrollments" element={<EnrollmentsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
