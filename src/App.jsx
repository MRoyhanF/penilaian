'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './i18n/LanguageContext';
import { api } from './services/api';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';

import LoginPage from './views/LoginPage';
import JudgeCategoriesPage from './views/JudgeCategoriesPage';
import JudgeParticipantsPage from './views/JudgeParticipantsPage';
import JudgeScoringPage from './views/JudgeScoringPage';
import AdminDashboardPage from './views/AdminDashboardPage';
import AdminResultsPage from './views/AdminResultsPage';
import AdminJudgesPage from './views/AdminJudgesPage';

export default function App() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  const [currentPage, setCurrentPage] = useState('login');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [judgeCategories, setJudgeCategories] = useState([]);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar_minimized');
      if (saved === 'true') setSidebarMinimized(true);
    } catch {
      // Ignore
    }
  }, []);

  const handleToggleMinimize = (val) => {
    setSidebarMinimized(val);
    try {
      localStorage.setItem('sidebar_minimized', String(val));
    } catch {
      // Ignore
    }
  };

  // Toast Helper
  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((tItem) => tItem.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((tItem) => tItem.id !== id));
  };

  // Sync user state with default landing page
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') {
        if (currentPage === 'login' || !currentPage.startsWith('admin')) {
          setCurrentPage('admin-dashboard');
        }
      } else {
        if (currentPage === 'login' || !currentPage.startsWith('judge')) {
          setCurrentPage('judge-categories');
        }
        fetchJudgeCategories();
      }
    }
  }, [user, loading]);

  const fetchJudgeCategories = async () => {
    try {
      const cats = await api.getJudgeCategories();
      setJudgeCategories(Array.isArray(cats) ? cats : []);
    } catch {
      setJudgeCategories([]);
    }
  };

  const handleLoginSuccess = (loggedInUser) => {
    showToast(t('loginSuccess'), 'success');
    if (loggedInUser.role === 'admin') {
      setCurrentPage('admin-dashboard');
    } else {
      setCurrentPage('judge-categories');
      fetchJudgeCategories();
    }
  };

  // Navigation handlers
  const handleSelectCategory = (catId) => {
    setSelectedCategoryId(catId);
    setCurrentPage('judge-participants');
  };

  const handleSelectParticipant = (pId) => {
    setSelectedParticipantId(pId);
    setCurrentPage('judge-scoring');
  };

  const handleBackToCategories = () => {
    fetchJudgeCategories();
    setCurrentPage('judge-categories');
    setSelectedCategoryId(null);
  };

  const handleBackToParticipants = () => {
    fetchJudgeCategories();
    setCurrentPage('judge-participants');
    setSelectedParticipantId(null);
  };

  const handleAdminSelectCategoryResults = (catCode) => {
    setSelectedCategoryCode(catCode);
    setCurrentPage('admin-results');
  };

  if (loading) {
    return (
      <div className="page-loading-state" style={{ minHeight: '100vh' }}>
        <div className="spinner-icon text-accent" style={{ fontSize: '2rem' }}>⏳</div>
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage onLoginSuccess={handleLoginSuccess} />
        <Toast toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  // Derive active page safely to prevent any flash/glitch on login
  const activePage = (currentPage === 'login' || (user.role === 'admin' && !currentPage.startsWith('admin')) || (user.role === 'judge' && !currentPage.startsWith('judge')))
    ? (user.role === 'admin' ? 'admin-dashboard' : 'judge-categories')
    : currentPage;

  // Generate breadcrumbs
  const breadcrumbs = [];
  if (user.role === 'judge') {
    breadcrumbs.push({
      label: t('navCategories'),
      action: activePage !== 'judge-categories' ? handleBackToCategories : null,
    });
    if (activePage === 'judge-participants' || activePage === 'judge-scoring') {
      const activeCat = judgeCategories.find((c) => c.id === selectedCategoryId);
      breadcrumbs.push({
        label: activeCat ? activeCat.name : t('navParticipants'),
        action: activePage === 'judge-scoring' ? handleBackToParticipants : null,
      });
    }
    if (activePage === 'judge-scoring') {
      breadcrumbs.push({
        label: t('navScoring'),
      });
    }
  } else if (user.role === 'admin') {
    if (activePage === 'admin-dashboard') {
      breadcrumbs.push({ label: t('navDashboard') });
    } else if (activePage === 'admin-results') {
      breadcrumbs.push({
        label: t('navDashboard'),
        action: () => setCurrentPage('admin-dashboard'),
      });
      breadcrumbs.push({ label: t('navResults') });
    } else if (activePage === 'admin-judges') {
      breadcrumbs.push({
        label: t('navDashboard'),
        action: () => setCurrentPage('admin-dashboard'),
      });
      breadcrumbs.push({ label: t('navJudges') });
    }
  }

  return (
    <div className="app-container">
      <Navbar
        currentPage={activePage}
        onNavigate={setCurrentPage}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={handleToggleMinimize}
        breadcrumbs={breadcrumbs}
      />

      <div className="app-body">
        <Sidebar
          currentPage={activePage}
          onNavigate={setCurrentPage}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarMinimized={sidebarMinimized}
          setSidebarMinimized={handleToggleMinimize}
          judgeCategories={judgeCategories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={handleSelectCategory}
        />

        <main className={`app-main-content ${sidebarMinimized ? 'sidebar-minimized' : ''}`}>
          {activePage === 'judge-categories' && (
            <JudgeCategoriesPage onSelectCategory={handleSelectCategory} />
          )}

          {activePage === 'judge-participants' && (
            <JudgeParticipantsPage
              categoryId={selectedCategoryId}
              onBack={handleBackToCategories}
              onSelectParticipant={handleSelectParticipant}
            />
          )}

          {activePage === 'judge-scoring' && (
            <JudgeScoringPage
              participantId={selectedParticipantId}
              onBack={handleBackToParticipants}
              onNavigateParticipant={handleSelectParticipant}
              showToast={showToast}
            />
          )}

          {activePage === 'admin-dashboard' && (
            <AdminDashboardPage
              onNavigate={setCurrentPage}
              onSelectCategoryResults={handleAdminSelectCategoryResults}
              showToast={showToast}
            />
          )}

          {activePage === 'admin-results' && (
            <AdminResultsPage 
              initialCategoryCode={selectedCategoryCode} 
              showToast={showToast}
            />
          )}

          {activePage === 'admin-judges' && (
            <AdminJudgesPage showToast={showToast} />
          )}
        </main>
      </div>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
