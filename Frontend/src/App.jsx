import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import './styles/components.css';

import { AuthProvider, FavoritesProvider, ToastProvider } from './context/providers';
import AppLayout from './layouts/AppLayout';
import { AdminRoute, ProtectedRoute } from './components/RouteGuards';

import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import ServiceDetails from './pages/ServiceDetails';
import Students from './pages/Students';
import StudentProfile from './pages/StudentProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import Verify from './pages/Verify';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ProfileEdit from './pages/ProfileEdit';
import Portfolio from './pages/Portfolio';
import MyServices from './pages/MyServices';
import ServiceForm from './pages/ServiceForm';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import Saved from './pages/Saved';
import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCategories from './pages/admin/AdminCategories';
import AdminServices from './pages/admin/AdminServices';
import AdminReviews from './pages/admin/AdminReviews';
import AdminReports from './pages/admin/AdminReports';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <FavoritesProvider>
            <Routes>
              <Route element={<AppLayout />}>
                {/* Public */}
                <Route path="/" element={<Home />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/services/:id" element={<ServiceDetails />} />
                <Route path="/students" element={<Students />} />
                <Route path="/students/:id" element={<StudentProfile />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Student (UI-level guard; backend must enforce the same) */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/verify" element={<Verify />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/edit" element={<ProfileEdit />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/my-services" element={<MyServices />} />
                  <Route path="/create-service" element={<ServiceForm />} />
                  <Route path="/services/:id/edit" element={<ServiceForm />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/orders/:id" element={<OrderDetails />} />
                  <Route path="/saved" element={<Saved />} />
                  <Route path="/notifications" element={<Notifications />} />
                </Route>

                {/* Admin */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/categories" element={<AdminCategories />} />
                  <Route path="/admin/services" element={<AdminServices />} />
                  <Route path="/admin/reviews" element={<AdminReviews />} />
                  <Route path="/admin/reports" element={<AdminReports />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </FavoritesProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
