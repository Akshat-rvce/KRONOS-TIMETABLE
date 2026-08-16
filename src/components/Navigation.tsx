"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Calendar, BarChart3, BookOpen, Zap, Clock, LogOut, User, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, accent: '#9333ea' },
  { label: 'Calendar',  path: '/calendar',  icon: Calendar,  accent: '#0d9488' },
  { label: 'Analytics', path: '/analytics', icon: BarChart3,  accent: '#f97316' },
  { label: 'Subjects',  path: '/subjects',  icon: BookOpen,   accent: '#ec4899' },
];

export const Navigation = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      setDate(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    update();
    const iv = setInterval(update, 1000);
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => { clearInterval(iv); window.removeEventListener('scroll', onScroll); };
  }, []);

  const isLoginPage = pathname === '/login';

  return (
    <header
      className={`sticky top-0 z-50 w-full px-6 py-3 flex items-center justify-between transition-all duration-300 ${
        scrolled ? 'backdrop-blur-xl bg-[rgba(9,9,15,0.85)] border-b border-white/[0.04]' : ''
      }`}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
        <div className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 overflow-hidden shadow-lg shadow-violet-500/20">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#9333ea,#f97316)' }} />
          <Zap className="w-5 h-5 text-white relative z-10 group-hover:scale-110 transition-transform duration-200" />
        </div>
        <span className="font-black text-xl tracking-wider grad-text-hero group-hover:opacity-80 transition-opacity duration-200 hidden sm:inline">
          KRONOS
        </span>
      </Link>

      {/* Centre floating nav (hidden on login page) */}
      {!isLoginPage && (
        <nav className="glass-panel px-2 py-1.5 flex items-center gap-0.5 border border-white/[0.06] shadow-xl shadow-black/30">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className="relative px-3.5 py-2 flex items-center gap-2 text-xs font-semibold rounded-xl transition-colors duration-200"
                style={{ color: isActive ? '#fff' : 'rgba(180,175,200,0.7)' }}
              >
                <item.icon
                  className="w-4 h-4 transition-colors duration-200"
                  style={{ color: isActive ? item.accent : undefined }}
                />
                <span className="hidden md:inline">
                  {item.label}
                </span>

                {isActive && (
                  <>
                    <motion.div
                      layoutId="nav-active-bg"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: `${item.accent}18`, border: `1px solid ${item.accent}30` }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                    <AnimatePresence>
                      <motion.div
                        key={item.path}
                        layoutId="nav-active-bar"
                        className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                        style={{ background: item.accent, boxShadow: `0 0 8px ${item.accent}` }}
                        initial={{ opacity: 0, scaleX: 0.5 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        exit={{ opacity: 0, scaleX: 0.5 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    </AnimatePresence>
                  </>
                )}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Right: Date + User Profile / Logout */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Clock */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono text-xs tracking-wider text-amber-300">{time}</span>
        </div>

        {/* User Pill / Login Link */}
        {user ? (
          <div className="flex items-center gap-2 p-1.5 pr-2.5 rounded-2xl glass-panel border border-white/[0.08] shadow-md">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-violet-600 to-pink-500 flex items-center justify-center text-white font-black text-xs shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-bold text-slate-200 hidden sm:inline max-w-[100px] truncate">
              {user.name}
            </span>
            <button
              onClick={logout}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
              title="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : !isLoginPage ? (
          <Link
            href="/login"
            className="btn-violet px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-lg"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        ) : null}
      </div>
    </header>
  );
};

export default Navigation;
