import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import authService from '../../services/authService';

export default function ProtectedRoute() {
  const token = authService.getToken();

  if (!token) {
    // Redirect to login if token is missing
    return <Navigate to="/login" replace />;
  }

  // If token exists, allow access to child routes
  return <Outlet />;
}
