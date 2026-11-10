// src/pages/Auth.jsx - Version 1.0 (New Component)
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.error_description || error.message);
    } else {
      navigate('/'); // Redirect to dashboard on successful login
    }
    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-[100dvh] px-4 bg-ink text-ink font-brand">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-3xl shadow-xl border-t-8 border-brand">
        <h2 className="text-3xl font-bold text-center text-ink">Admin Login</h2>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="text-sm font-semibold text-gray-600">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-4 py-2.5 mt-1 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-ink focus:border-ink bg-white text-ink"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-sm font-semibold text-gray-600"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full px-4 py-2.5 mt-1 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-ink focus:border-ink bg-white text-ink"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] px-4 py-2.5 text-base font-bold text-white bg-pop rounded-full shadow-sm hover:bg-pop/90 cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pop disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;
