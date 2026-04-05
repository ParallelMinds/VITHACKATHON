import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { Shield, AlertTriangle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Invalid credentials or unauthorized access attempt.');
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-obsidian bg-[#F4F6F8]" // fallback background
      style={{
        backgroundImage: 'url("https://i.postimg.cc/MKJRY4Xt/Chat-GPT-Image-Apr-5-2026-12-43-04-AM.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="max-w-md w-full bg-transparent p-10 shadow-gov-md rounded">
        <div className="flex flex-col items-center mb-8">
          <div className="w-40 h-40 mb-4 flex items-center justify-center">
            <img 
              src="https://i.postimg.cc/VkH8z9ck/image-Photoroom-(39).png" 
              alt="CargoIntel Logo" 
              className="w-full h-full object-cover filter drop-shadow-md" 
            />
          </div>
          <h2 className="text-xl font-bold text-gov-navy uppercase tracking-widest text-center">
            CargoIntel
          </h2>
          <p className="text-xs font-semibold text-text-dim uppercase tracking-[0.2em] mt-2">
            Central Command Login
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-accent-red text-xs flex items-center gap-3">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label className="text-[0.65rem] font-semibold text-[#718096] uppercase tracking-widest">
              Operator Email
            </label>
            <input
              type="email"
              className="px-4 py-3 bg-[#F9FAFB] border border-[#D1D9E0] rounded text-gov-navy focus:outline-none focus:border-gov-accent transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="operator@cargointel.gov"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[0.65rem] font-semibold text-[#718096] uppercase tracking-widest">
              Passcode
            </label>
            <input
              type="password"
              className="px-4 py-3 bg-[#F9FAFB] border border-[#D1D9E0] rounded text-gov-navy focus:outline-none focus:border-gov-accent transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`mt-4 btn-protocol w-full h-12 uppercase tracking-widest text-xs font-bold ${
              loading ? 'bg-[#F4F6F8] text-text-dim border border-[#D1D9E0] cursor-not-allowed' : 'btn-protocol-primary'
            }`}
          >
            {loading ? 'Authenticating...' : 'Access Terminal'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-[#D1D9E0] pt-6">
          <p className="text-[0.55rem] font-semibold text-[#718096] uppercase tracking-widest">
            Unauthorized access is strictly prohibited
          </p>
        </div>
      </div>
    </div>
  );
}
