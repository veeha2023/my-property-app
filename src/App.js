// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard.jsx'; 
import ClientView from './pages/ClientView.jsx';     
import './App.css'; // Keep if you have global CSS, otherwise can remove

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Admin route - default is admin login */}
          <Route path="/admin" element={<AdminDashboard />} />
          {/* Client-specific view with dynamic ID */}
          <Route path="/client/:clientId" element={<ClientView />} />
          {/* Redirect root to admin for initial access */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;