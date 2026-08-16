import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAuthenticated } from "../api/authService";

const ProtectedRoute = () => {
  const location = useLocation();
  return isAuthenticated() ? <Outlet /> : <Navigate to="/auth/signin" replace state={{ from: location.pathname }} />;
};

export default ProtectedRoute;
