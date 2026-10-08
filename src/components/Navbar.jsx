'use client';

import React, { useState, useEffect } from 'react';
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
  Moon,
  Maximize,
  Minimize,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

export default function Navbar({ 
  currentPage, 
  onNavigate, 
  sidebarOpen, 
  setSidebarOpen,
  sidebarMinimized,
  setSidebarMinimized,
  breadcrumbs = []
}) {
  const { user, logout } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
          await document.documentElement.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  };

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
        {/* Mobile/Tablet Menu Drawer Toggle */}
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation menu"
          title="Menu"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Desktop/Tablet Sidebar Collapse Toggle */}
        <button
          type="button"
          className="desktop-sidebar-toggle-btn"
          onClick={() => setSidebarMinimized && setSidebarMinimized(!sidebarMinimized)}
          title={sidebarMinimized ? 'Buka Sidebar' : 'Kecilkan Sidebar'}
          aria-label="Toggle Sidebar Compact"
        >
          {sidebarMinimized ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </button>

        {/* Brand Logo & Title */}
        <div 
          className="brand-badge" 
          onClick={() => onNavigate(user?.role === 'admin' ? 'admin-dashboard' : 'judge-categories')}
          role="button"
          tabIndex={0}
        >
          <div className="brand-icon-wrapper">
            <Trophy size={18} className="brand-icon" />
          </div>
          <div className="brand-text-block">
            <span className="brand-title">{t('appName')}</span>
            <span className="brand-subtitle">{t('competitionName')}</span>
          </div>
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="breadcrumbs-nav" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight size={13} className="crumb-separator" />
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
        {/* Fullscreen Toggle Button */}
        <button
          type="button"
          className="nav-action-pill-btn fullscreen-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh (Fullscreen)'}
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
          <span className="btn-label-desktop">{isFullscreen ? 'Normal' : 'Full'}</span>
        </button>

        {/* Theme Switcher Button */}
        <button
          type="button"
          className="nav-action-pill-btn theme-btn"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Beralih ke Dark Mode' : 'Beralih ke Light Mode'}
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? (
            <>
              <Moon size={17} className="theme-icon moon-icon" />
              <span className="btn-label-desktop">Dark</span>
            </>
          ) : (
            <>
              <Sun size={17} className="theme-icon sun-icon" />
              <span className="btn-label-desktop">Light</span>
            </>
          )}
        </button>

        {/* Language Switcher Button */}
        <button
          type="button"
          className="nav-action-pill-btn lang-btn"
          onClick={toggleLanguage}
          title={t('switchLanguage')}
          aria-label="Switch Language"
        >
          <Languages size={17} />
          <span className="lang-code-text">{lang.toUpperCase()}</span>
        </button>

        {/* User Info Profile Pill */}
        {user && (
          <div className="user-profile-pill" title={`${user.name} (${user.role})`}>
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
            className="nav-action-pill-btn logout-action-btn"
            onClick={handleLogout}
            title={t('logout')}
            aria-label={t('logout')}
          >
            <LogOut size={17} />
            <span className="btn-label-desktop">{t('logout')}</span>
          </button>
        )}
      </div>
    </header>
  );
}
