import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchUserStats } from '../services/api';

function StatCard({ icon, label, value, subtext }) {
  return (
    <div className="bg-bg-card border border-border-primary rounded-lg p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtext && <p className="text-xs text-text-muted mt-1">{subtext}</p>}
        </div>
        <div className="p-2 bg-accent-primary/10 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ type, description, timestamp }) {
  const getIcon = () => {
    switch (type) {
      case 'inspection':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'report':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'alert':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border-primary last:border-0">
      <div className="p-2 bg-bg-cardAlt rounded-lg text-text-muted">
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className="text-sm text-white">{description}</p>
        <p className="text-xs text-text-muted mt-1">{timestamp}</p>
      </div>
    </div>
  );
}

export default function ProfileDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      try {
        const data = await fetchUserStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load stats:', err);
        // Mock data for demo
        setStats({
          total_inspections: 127,
          reports_generated: 89,
          high_risk_detections: 12,
          active_cases: 3,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const recentActivity = [
    { type: 'inspection', description: 'Completed cargo inspection for MUMBAI EXPRESS', timestamp: '2 hours ago' },
    { type: 'report', description: 'Generated report INSP-2024-045', timestamp: '3 hours ago' },
    { type: 'alert', description: 'High-risk detection flagged on PACIFIC VOYAGER', timestamp: '5 hours ago' },
    { type: 'inspection', description: 'Completed cargo inspection for ARABIAN STAR', timestamp: '1 day ago' },
    { type: 'report', description: 'Generated report INSP-2024-044', timestamp: '1 day ago' },
  ];

  return (
    <div className="flex h-full bg-bg-secondary overflow-y-auto">
      <div className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white uppercase tracking-wider">Profile</h1>
          <p className="text-sm text-text-muted mt-1">Manage your account and view activity</p>
        </div>

        {/* Profile Card */}
        <div className="bg-bg-panel border border-border-primary rounded-lg p-6 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-accent-primary/20 flex items-center justify-center border-2 border-accent-primary/30">
              <span className="text-2xl font-bold text-accent-primary">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{user?.username || 'User'}</h2>
                  <p className="text-sm text-text-muted">{user?.email || 'user@cargointel.systems'}</p>
                </div>
                <span className="px-3 py-1 bg-accent-primary/20 text-accent-primary text-xs font-medium rounded uppercase tracking-wider border border-accent-primary/30">
                  {user?.role || 'Analyst'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-text-muted">User ID:</span>
                  <span className="text-white font-mono ml-2">{user?.id || 'USR-' + Date.now().toString(36).toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-text-muted">Department:</span>
                  <span className="text-white ml-2">Maritime Security</span>
                </div>
                <div>
                  <span className="text-text-muted">Clearance Level:</span>
                  <span className="text-white ml-2">Level 3</span>
                </div>
                <div>
                  <span className="text-text-muted">Last Login:</span>
                  <span className="text-white ml-2">{new Date().toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Statistics</h3>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-bg-card border border-border-primary rounded-lg p-5 animate-pulse">
                  <div className="h-4 bg-bg-cardAlt rounded w-24 mb-3"></div>
                  <div className="h-8 bg-bg-cardAlt rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={
                  <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
                label="Total Inspections"
                value={stats?.total_inspections || 0}
                subtext="All time"
              />
              <StatCard
                icon={
                  <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
                label="Reports Generated"
                value={stats?.reports_generated || 0}
                subtext="All time"
              />
              <StatCard
                icon={
                  <svg className="w-5 h-5 text-alert-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                }
                label="High Risk Detections"
                value={stats?.high_risk_detections || 0}
                subtext="Flagged for review"
              />
              <StatCard
                icon={
                  <svg className="w-5 h-5 text-alert-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                label="Active Cases"
                value={stats?.active_cases || 0}
                subtext="Pending review"
              />
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Recent Activity</h3>
          <div className="bg-bg-panel border border-border-primary rounded-lg p-4">
            {recentActivity.map((activity, idx) => (
              <ActivityItem
                key={idx}
                type={activity.type}
                description={activity.description}
                timestamp={activity.timestamp}
              />
            ))}
          </div>
        </div>

        {/* Account Actions */}
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Account Actions</h3>
          <div className="bg-bg-panel border border-border-primary rounded-lg p-4">
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 bg-bg-cardAlt border border-border-primary text-text-secondary text-sm rounded hover:text-white transition-colors">
                Update Profile
              </button>
              <button className="px-4 py-2 bg-bg-cardAlt border border-border-primary text-text-secondary text-sm rounded hover:text-white transition-colors">
                Change Password
              </button>
              <button className="px-4 py-2 bg-bg-cardAlt border border-border-primary text-text-secondary text-sm rounded hover:text-white transition-colors">
                Export Data
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-risk-danger/20 border border-alert-red/30 text-alert-red text-sm rounded hover:bg-risk-danger/30 transition-colors ml-auto"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="mt-8 pt-6 border-t border-border-primary">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <div className="flex items-center gap-4">
              <span>CARGO INTEL v2.4.1</span>
              <span>Build 2024.03.24</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-alert-green"></div>
                <span>API Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-alert-green"></div>
                <span>Database Synced</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
