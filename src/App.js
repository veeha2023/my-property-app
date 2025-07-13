// src/App.js - Version 1.2 (Simplified Router)
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './supabaseClient';
import AdminDashboard from './pages/AdminDashboard';
import ClientView from './pages/ClientView';
import Auth from './pages/Auth';
import './App.css';

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    
    // Check for initial session
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
          <Route path="/" element={<AdminDashboard key={session ? session.user.id : 'no-session'} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
