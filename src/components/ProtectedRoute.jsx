// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const ProtectedRoute = ({ children }) => {
  const session = supabase.auth.session();

  if (!session) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;