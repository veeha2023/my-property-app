// src/App.js - Version 1.3 (Client View Unprotected)
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './supabaseClient';
import AdminDashboard from './pages/AdminDashboard';
import ClientView from './pages/ClientView';
import Auth from './pages/Auth';
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute
import './App.css';

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/client/:clientId" element={<ClientView />} />
          <Route path="/login" element={<Auth />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminDashboard key={session ? session.user.id : 'no-session'} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;