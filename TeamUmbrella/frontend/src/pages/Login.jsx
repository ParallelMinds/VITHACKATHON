import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createDemoSession } from '../services/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, setDemoUser } = useAuth();
  const navigate = useNavigate();

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Create demo session
      const demoUser = {
        username: 'demo_user',
        email: 'demo@example.com',
        role: 'analyst'
      };
      createDemoSession(demoUser);
      setDemoUser(demoUser);
      navigate('/dashboard');
    } catch (err) {
      console.error('Demo login error:', err);
      setError('Demo mode failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      {/* Background grid pattern */}
      <div className="fixed inset-0 grid-bg opacity-30"></div>

      {/* Ambient glow */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-accent-primary/5 rounded-full blur-3xl"></div>
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-intel-cyan/5 rounded-full blur-3xl"></div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        {/* Corner decorations */}
        <div className="absolute -top-px -left-px w-8 h-8 border-t-2 border-l-2 border-accent-primary/50"></div>
        <div className="absolute -top-px -right-px w-8 h-8 border-t-2 border-r-2 border-accent-primary/50"></div>
        <div className="absolute -bottom-px -left-px w-8 h-8 border-b-2 border-l-2 border-accent-primary/50"></div>
        <div className="absolute -bottom-px -right-px w-8 h-8 border-b-2 border-r-2 border-accent-primary/50"></div>

        <div className="bg-bg-panel border border-border-primary rounded-lg p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-accent-primary/20 rounded-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wider">RED QUEEN</h1>
              <p className="text-xs text-text-muted uppercase tracking-widest">Intelligence Platform</p>
            </div>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-1">Secure Access</h2>
            <p className="text-sm text-text-secondary">Enter your credentials to access the system</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-risk-danger/30 border border-alert-red/50 rounded flex items-start gap-3">
              <svg className="w-5 h-5 text-alert-red flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-alert-red">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-bg-card border border-border-primary rounded text-white placeholder-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/50 transition-all font-mono text-sm"
                placeholder="Enter email"
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-bg-card border border-border-primary rounded text-white placeholder-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/50 transition-all font-mono text-sm"
                placeholder="Enter password"
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-accent-primary hover:bg-accent-dark text-white font-medium rounded border border-accent-dark/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Access System</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-border-primary">
            <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>256-bit Encrypted Connection</span>
            </div>
          </div>

          {/* Demo Access */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-primary"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-bg-panel px-4 text-text-muted">Demo Access</span>
              </div>
            </div>

            <button
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="w-full mt-4 py-3 bg-bg-cardAlt hover:bg-[#1a1a1a] text-text-secondary font-medium rounded border border-border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Quick Demo Access</span>
            </button>

            <p className="text-[10px] text-text-muted text-center mt-3">
              Bypass authentication for demo purposes
            </p>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-alert-green animate-pulse"></div>
            <span>API Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-alert-green animate-pulse"></div>
            <span>Database Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
