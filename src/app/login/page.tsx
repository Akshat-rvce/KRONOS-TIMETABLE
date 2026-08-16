"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, Lock, Mail, User, ArrowRight, ShieldCheck, Flame, Zap, BarChart3, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (tab === 'register') {
      if (!name.trim()) {
        setError('Please enter your name');
        setLoading(false);
        return;
      }
      const res = await register(name, email, password);
      if (!res.success) {
        setError(res.error || 'Failed to create account');
        setLoading(false);
      }
    } else {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error || 'Invalid credentials');
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left column: Brand & Feature Highlights */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-card border border-violet-500/30 text-xs text-violet-300 font-semibold shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
            <span>KRONOS Multi-Tenant Cloud v2.0</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Your Private <br />
            <span className="grad-text-hero">Study Command Center</span>
          </h1>

          <p className="text-sm text-slate-400 leading-relaxed max-w-md">
            Log study sessions, track consistency with GitHub-style heatmaps, discover productivity patterns, and crush your academic goals.
          </p>

          {/* Feature Badges */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-2xl glass-panel border border-white/[0.05] shadow-sm">
              <div className="p-2 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">100% Private Cloud Database</div>
                <div className="text-[10px] text-slate-400">Your courses, targets, and logs are isolated to your account.</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl glass-panel border border-white/[0.05] shadow-sm">
              <div className="p-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">Interactive Pomodoro & Streaks</div>
                <div className="text-[10px] text-slate-400">Integrated focus timer, streak flame tracker & today checklist.</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl glass-panel border border-white/[0.05] shadow-sm">
              <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">Heuristic AI Copilot & Matrices</div>
                <div className="text-[10px] text-slate-400">Uncover your peak hours and target variance in real time.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Futuristic 3D Auth Card */}
        <div className="lg:col-span-6">
          <div
            className="glass-panel card-3d p-8 rounded-3xl border border-white/[0.08] relative overflow-hidden"
            style={{
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(147,51,234,0.15)',
            }}
          >
            {/* Background ambient glow */}
            <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-orange-600/15 blur-3xl pointer-events-none" />

            {/* Tab switchers */}
            <div className="flex items-center p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-6">
              <button
                type="button"
                onClick={() => { setTab('login'); setError(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  tab === 'login'
                    ? 'btn-violet text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setTab('register'); setError(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  tab === 'register'
                    ? 'btn-violet text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Form Title */}
            <div className="mb-5">
              <h2 className="text-xl font-black text-white tracking-tight">
                {tab === 'login' ? 'Welcome Back!' : 'Start Your Academic Journey'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {tab === 'login'
                  ? 'Enter your credentials to access your study dashboard.'
                  : 'Get your private account with pre-loaded starter courses.'}
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
                <span>⚠️ {error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-violet-400" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Akshat"
                    className="glass-input text-sm"
                    required={tab === 'register'}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-violet-400" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="glass-input text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-violet-400" />
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input text-sm"
                  minLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-violet glow-border py-3 rounded-2xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 mt-6 shadow-xl"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{tab === 'login' ? 'Sign In to Dashboard' : 'Create Free Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-white/[0.05] text-center text-xs text-slate-500">
              {tab === 'login' ? (
                <p>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setTab('register'); setError(null); }}
                    className="text-violet-400 hover:text-violet-300 font-bold ml-1 transition-colors"
                  >
                    Register here
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setTab('login'); setError(null); }}
                    className="text-violet-400 hover:text-violet-300 font-bold ml-1 transition-colors"
                  >
                    Sign in here
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
