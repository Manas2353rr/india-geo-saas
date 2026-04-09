import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./store/authStore";
import Login          from "./pages/Login";
import Register       from "./pages/Register";
import UserDashboard  from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import DemoForm       from "./pages/DemoForm";

function PrivateRoute({ children, adminOnly = false }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" />;
  if (adminOnly && user?.role !== "ADMIN") return <Navigate to="/dashboard" />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<Navigate to="/login" />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/demo"     element={<DemoForm />} />
        <Route path="/dashboard" element={
          <PrivateRoute><UserDashboard /></PrivateRoute>
        } />
        <Route path="/admin" element={
          <PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}