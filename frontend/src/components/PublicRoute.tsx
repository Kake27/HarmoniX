import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function PublicRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Checking your session...</p>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}