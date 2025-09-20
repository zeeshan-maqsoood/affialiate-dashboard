import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has allowed roles for this route
  if (
    allowedRoles.length > 0 &&
    !user?.groups?.some((group) => allowedRoles.includes(group))
  ) {
    // Determine redirect path based on user's group
    let redirectPath = "/login"; // Default fallback

    if (user?.groups?.includes("admin")) {
      redirectPath = "/admin";
    } else if (user?.groups?.includes("affiliate")) {
      redirectPath = "/affiliate";
    }

    return <Navigate to={redirectPath} replace />;
  }

  // User is authenticated and has allowed role, render the protected component
  return children;
};

export default ProtectedRoute;
