import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import UploadForm from './components/UploadForm';
import ResultsDashboard from './components/ResultsDashboard';
import AlertsPage from './components/AlertsPage';
import HistoryPage from './components/HistoryPage';
import ReportsPage from './components/ReportsPage';
import SettingsPage from './components/SettingsPage';
import ComparisonPage from './components/ComparisonPage';
import ValidationPage from './components/ValidationPage';
import Login from './components/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const { currentUser, role } = useAuth();

  // If role is set, ensure activeTab is accessible for that role on initial load
  useEffect(() => {
    if (role === 'inspector' && ['history', 'alerts', 'reports', 'settings'].includes(activeTab)) {
      setActiveTab('dashboard');
    } else if (['analyst', 'auditor'].includes(role) && ['dashboard', 'comparison'].includes(activeTab)) {
      setActiveTab('history');
    }
  }, [role]);

  if (!currentUser) {
    return <Login />;
  }


  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full animate-fade-in">
            {/* Main Scanner Section */}
            <div className="xl:col-span-8 flex flex-col gap-6">
              <UploadForm 
                onResult={setAnalysisResult} 
                analyzing={analyzing} 
                setAnalyzing={setAnalyzing} 
              />
            </div>

            {/* Analysis & Risk Section */}
            <div className="xl:col-span-4 h-full">
              <ResultsDashboard result={analysisResult} analyzing={analyzing} />
            </div>
          </div>
        );
      case 'comparison':
        return <ComparisonPage />;
      case 'history':
        return <HistoryPage />;
      case 'alerts':
        return <AlertsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'validation':
        return <ValidationPage />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-obsidian overflow-hidden font-sans">
      {/* Sidebar - Persistent */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header - Persistent */}
        <Header activeTab={activeTab} />

        {/* Dynamic Content Area */}
        <main className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-obsidian">
          {renderContent()}
        </main>

        {/* System Footer Status */}
        <footer className="h-9 bg-white border-t border-[#D1D9E0] px-8 flex items-center justify-end shrink-0 text-[0.58rem] font-semibold uppercase tracking-widest text-text-dim">
          <span className="text-gov-accent font-semibold">© 2025 CargoIntel Systems</span>
        </footer>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
