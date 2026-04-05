import React from 'react';
import { 
  LayoutDashboard, 
  History, 
  AlertTriangle, 
  BarChart3, 
  Shield, 
  GitCompare,
  CheckSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { role } = useAuth();
  
  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'comparison', label: 'Comparison', icon: GitCompare },
    { id: 'history', label: 'History', icon: History },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'validation', label: 'Validation (FP / FN)', icon: CheckSquare },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (role === 'admin') return true;
    if (role === 'inspector') return ['dashboard', 'comparison'].includes(item.id);
    if (['analyst', 'auditor'].includes(role)) return ['history', 'alerts', 'reports'].includes(item.id);
    return false;
  });

  return (
    <div className="w-[260px] bg-sidebar flex flex-col shrink-0 h-screen border-r border-[#0a1a30]">
      {/* Brand Header */}
      <div className="px-6 py-7 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 flex items-center justify-center">
            <img 
              src="https://i.postimg.cc/VkH8z9ck/image-Photoroom-(39).png" 
              alt="Logo" 
              className="w-full h-full object-cover filter drop-shadow-md scale-125 origin-left" 
            />
          </div>
          <h1 className="text-sm font-bold tracking-widest text-white uppercase">CargoIntel</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-2 py-2">
        <p className="px-6 pt-4 pb-2 text-[0.55rem] font-semibold text-white/30 uppercase tracking-[0.2em]">Navigation</p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10">
        <p className="text-[0.55rem] text-white/30 uppercase tracking-widest">Dept. of Customs & Border Security</p>
      </div>
    </div>
  );
}
