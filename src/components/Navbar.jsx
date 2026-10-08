'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Trophy, 
  Languages, 
  LogOut, 
  User, 
  Menu, 
  X, 
  ShieldCheck, 
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';

export default function Navbar({ 
  currentPage, 
  onNavigate, 
  sidebarOpen, 
  setSidebarOpen,
  breadcrumbs = []
}) {
  const { user, logout } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    if (window.confirm(t('logoutConfirm'))) {
      try {
        await logout();
      } catch (err) {
        console.error('Logout error:', err);
      }
      if (onNavigate) onNavigate('login');
      window.location.reload();
    }
  };

  return (
    <header className="navbar-container">
      <div className="navbar-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation menu"
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className="brand-badge" onClick={() => onNavigate(user?.role === 'admin' ? 'admin-dashboard' : 'judge-categories')}>
          <div className="brand-icon-wrapper">
            <Trophy size={20} className="brand-icon" />
          </div>
          <div className="brand-text-block">
            <span className="brand-title">{t('appName')}</span>
            <span className="brand-subtitle">{t('competitionName')}</span>
          </div>
        </div>

        {breadcrumbs.length > 0 && (
          <nav className="breadcrumbs-nav" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight size={14} className="crumb-separator" />
                {crumb.action ? (
                  <button 
                    type="button" 
                    className="crumb-item crumb-link" 
                    onClick={crumb.action}
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="crumb-item crumb-active">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
      </div>

      <div className="navbar-right">
        {/* Theme Switcher Button */}
        <button
          type="button"
          className="theme-switch-btn"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Beralih ke Dark Mode' : 'Beralih ke Light Mode'}
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? (
            <>
              <Moon size={17} className="theme-icon moon-icon" />
              <span className="theme-label">Dark</span>
            </>
          ) : (
            <>
              <Sun size={17} className="theme-icon sun-icon" />
              <span className="theme-label">Light</span>
            </>
          )}
        </button>

        {/* Language Switcher Pill */}
        <button
          type="button"
          className="lang-switch-btn"
          onClick={toggleLanguage}
          title={t('switchLanguage')}
        >
          <Languages size={17} className="lang-icon" />
          <span className="lang-badge active">{lang.toUpperCase()}</span>
          <span className="lang-toggle-indicator">
            {lang === 'id' ? 'ID' : 'EN'}
          </span>
        </button>

        {/* User Info Pill */}
        {user && (
          <div className="user-profile-pill">
            <div className="user-avatar">
              {user.role === 'admin' ? <ShieldCheck size={16} /> : <User size={16} />}
            </div>
            <div className="user-meta">
              <span className="user-display-name">{user.name}</span>
              <span className={`user-role-badge ${user.role}`}>
                {user.role === 'admin' ? t('admin') : t('judge')}
              </span>
            </div>
          </div>
        )}

        {/* Logout Button */}
        {user && (
          <button
            type="button"
            className="logout-action-btn"
            onClick={handleLogout}
            title={t('logout')}
            aria-label={t('logout')}
          >
            <LogOut size={18} />
            <span className="btn-text-tablet">{t('logout')}</span>
          </button>
        )}
      </div>
    </header>
  );
}
