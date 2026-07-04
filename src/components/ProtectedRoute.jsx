import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const ProtectedRoute = ({ allowedRoles }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect to their respective dashboard if they don't have access to this route
    if (profile.role === "member") return <Navigate to="/member" replace />;
    if (profile.role === "trainer") return <Navigate to="/trainer" replace />;
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};

// Route Redirector to send user to correct home based on role
export const RootRedirect = () => {
  const { user, profile, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  if (profile?.role === "owner" || profile?.role === "manager") {
    return <Navigate to="/admin" replace />;
  } else if (profile?.role === "trainer") {
    return <Navigate to="/trainer" replace />;
  } else {
    return <Navigate to="/member" replace />;
  }
};
