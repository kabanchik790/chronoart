import { Route, Routes } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import AdminOrderDetailPage from './pages/AdminOrderDetailPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminProjectsPage from './pages/AdminProjectsPage';
import AuthLoginPage from './pages/AuthLoginPage';
import AuthRegisterPage from './pages/AuthRegisterPage';
import ContactsPage from './pages/ContactsPage';
import HomePage from './pages/HomePage';
import MyOrdersPage from './pages/MyOrdersPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProjectsPage from './pages/ProjectsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/project/:id" element={<ProjectDetailPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/auth" element={<AuthLoginPage />} />
        <Route path="/auth/register" element={<AuthRegisterPage />} />
        <Route path="/my-orders" element={<MyOrdersPage />} />
        <Route path="/admin/orders" element={<AdminOrdersPage />} />
        <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
        <Route path="/admin/projects" element={<AdminProjectsPage />} />
      </Route>
    </Routes>
  );
}
