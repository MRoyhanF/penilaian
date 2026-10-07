// =============================================
// SISTEM PENJURIAN - SPA Application
// =============================================

const App = {
  state: {
    user: null,
    currentPage: 'login',
    selectedCategory: null,
    selectedParticipant: null,
    categories: [],
    participants: [],
    criteria: [],
    adminData: {},
    adminSelectedCategory: null,
  },

  // ==================== INIT ====================
  async init() {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        this.state.user = data.user;
        if (data.user.role === 'admin') {
          this.state.currentPage = 'admin-dashboard';
        } else {
          this.state.currentPage = 'judge-categories';
        }
      }
    } catch (e) {
      // Not logged in
    }
    this.render();
  },

  // ==================== RENDER ====================
  render() {
    const app = document.getElementById('app');
    switch (this.state.currentPage) {
      case 'login':
        app.innerHTML = this.renderLogin();
        this.bindLoginEvents();
        break;
      case 'judge-categories':
        app.innerHTML = this.renderAppLayout(this.renderJudgeCategories());
        this.bindSidebarEvents();
        this.loadJudgeCategories();
        break;
      case 'judge-participants':
        app.innerHTML = this.renderAppLayout(this.renderJudgeParticipants());
        this.bindSidebarEvents();
        this.loadParticipants();
        break;
      case 'judge-scoring':
        app.innerHTML = this.renderAppLayout(this.renderJudgeScoring());
        this.bindSidebarEvents();
        this.loadScoringForm();
        break;
      case 'admin-dashboard':
        app.innerHTML = this.renderAppLayout(this.renderAdminDashboard());
        this.bindSidebarEvents();
        this.loadAdminDashboard();
        break;
      case 'admin-results':
        app.innerHTML = this.renderAppLayout(this.renderAdminResults());
        this.bindSidebarEvents();
        this.loadAdminResults();
        break;
      default:
        app.innerHTML = this.renderLogin();
        this.bindLoginEvents();
    }
  },

  // ==================== LOGIN PAGE ====================
  renderLogin() {
    return `
      <div class="login-page">
        <div class="login-container">
          <div class="login-logo">
            <div class="logo-icon">🏆</div>
            <h1>Sistem Penjurian</h1>
            <p>Coding Competition Judging System</p>
          </div>
          <div class="login-card">
            <h2>Masuk ke Akun</h2>
            <div class="login-error" id="loginError"></div>
            <form id="loginForm">
              <div class="form-group">
                <label>Username</label>
                <input type="text" id="username" placeholder="Masukkan username" autocomplete="username" required>
              </div>
              <div class="form-group">
                <label>Password</label>
                <input type="password" id="password" placeholder="Masukkan password" autocomplete="current-password" required>
              </div>
              <button type="submit" class="btn btn-primary" id="loginBtn">
                <span>Masuk</span>
                <span>→</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  bindLoginEvents() {
    const form = document.getElementById('loginForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('loginError');
        const btn = document.getElementById('loginBtn');

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;"></span>';

        try {
          const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });

          const data = await res.json();

          if (!res.ok) {
            errorEl.textContent = data.error;
            errorEl.classList.add('show');
            btn.disabled = false;
            btn.innerHTML = '<span>Masuk</span><span>→</span>';
            return;
          }

          this.state.user = data.user;
          if (data.user.role === 'admin') {
            this.state.currentPage = 'admin-dashboard';
          } else {
            this.state.currentPage = 'judge-categories';
          }
          this.render();
        } catch (err) {
          errorEl.textContent = 'Terjadi kesalahan koneksi';
          errorEl.classList.add('show');
          btn.disabled = false;
          btn.innerHTML = '<span>Masuk</span><span>→</span>';
        }
      });
    }
  },

  // ==================== APP LAYOUT ====================
  renderAppLayout(content) {
    const isAdmin = this.state.user?.role === 'admin';
    return `
      <div class="app-layout">
        ${this.renderSidebar(isAdmin)}
        <main class="main-content fade-in">
          ${content}
        </main>
        <button class="mobile-menu-btn" id="mobileMenuBtn">☰</button>
      </div>
      <div class="toast-container" id="toastContainer"></div>
    `;
  },

  renderSidebar(isAdmin) {
    const page = this.state.currentPage;
    if (isAdmin) {
      return `
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <div class="logo">
              <div class="logo-icon">🏆</div>
              <div class="logo-text">
                <h2>Penjurian</h2>
                <span>Admin Panel</span>
              </div>
            </div>
          </div>
          <nav class="sidebar-nav">
            <div class="nav-section-title">Menu</div>
            <div class="nav-item ${page === 'admin-dashboard' ? 'active' : ''}" data-page="admin-dashboard">
              <span class="nav-icon">📊</span>
              <span>Dashboard</span>
            </div>
            <div class="nav-item ${page === 'admin-results' ? 'active' : ''}" data-page="admin-results">
              <span class="nav-icon">📋</span>
              <span>Hasil Penilaian</span>
            </div>
          </nav>
          <div class="sidebar-footer">
            <div class="user-info">
              <div class="user-avatar">${this.state.user?.name?.[0] || 'A'}</div>
              <div class="user-details">
                <div class="user-name">${this.state.user?.name || ''}</div>
                <div class="user-role">${this.state.user?.role || ''}</div>
              </div>
              <button class="logout-btn" id="logoutBtn" title="Logout">⏻</button>
            </div>
          </div>
        </aside>
      `;
    }

    return `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="logo">
            <div class="logo-icon">🏆</div>
            <div class="logo-text">
              <h2>Penjurian</h2>
              <span>Judge Panel</span>
            </div>
          </div>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-section-title">Kategori</div>
          <div class="nav-item ${page === 'judge-categories' ? 'active' : ''}" data-page="judge-categories">
            <span class="nav-icon">🏠</span>
            <span>Semua Kategori</span>
          </div>
          ${this.state.categories.map(c => `
            <div class="nav-item ${this.state.selectedCategory?.id === c.id && page !== 'judge-categories' ? 'active' : ''}" 
                 data-page="judge-participants" data-category-id="${c.id}">
              <span class="nav-icon">${this.getCategoryIcon(c.code)}</span>
              <span>${c.name}</span>
            </div>
          `).join('')}
        </nav>
        <div class="sidebar-footer">
          <div class="user-info">
            <div class="user-avatar">${this.state.user?.name?.[0] || 'J'}</div>
            <div class="user-details">
              <div class="user-name">${this.state.user?.name || ''}</div>
              <div class="user-role">Juri</div>
            </div>
            <button class="logout-btn" id="logoutBtn" title="Logout">⏻</button>
          </div>
        </div>
      </aside>
    `;
  },

  bindSidebarEvents() {
    // Navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        const categoryId = item.dataset.categoryId;
        
        if (categoryId) {
          this.state.selectedCategory = this.state.categories.find(c => c.id == categoryId) || { id: parseInt(categoryId) };
        }
        
        this.state.currentPage = page;
        this.render();
      });
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        this.state.user = null;
        this.state.currentPage = 'login';
        this.state.categories = [];
        this.state.selectedCategory = null;
        this.state.selectedParticipant = null;
        this.render();
      });
    }

    // Mobile menu
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    if (mobileBtn && sidebar) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }
  },

  // ==================== JUDGE: CATEGORIES ====================
  renderJudgeCategories() {
    return `
      <div class="page-header">
        <h1>Selamat Datang, ${this.state.user?.name} 👋</h1>
        <p>Pilih kategori untuk mulai penilaian</p>
      </div>
      <div class="category-grid" id="categoryGrid">
        <div class="loading"><div class="spinner"></div><span>Memuat kategori...</span></div>
      </div>
    `;
  },

  async loadJudgeCategories() {
    try {
      const res = await fetch('/api/judge/categories');
      const categories = await res.json();
      this.state.categories = categories;

      const grid = document.getElementById('categoryGrid');
      if (!grid) return;

      if (categories.length === 0) {
        grid.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <h3>Tidak ada kategori</h3>
            <p>Anda belum ditugaskan ke kategori manapun</p>
          </div>
        `;
        return;
      }

      // Load participant counts for each category
      let html = '';
      for (const cat of categories) {
        const pRes = await fetch(`/api/judge/participants/${cat.id}`);
        const participants = await pRes.json();
        const scored = participants.filter(p => p.scored).length;
        const total = participants.length;
        const pct = total > 0 ? Math.round((scored / total) * 100) : 0;

        html += `
          <div class="category-card" data-category-id="${cat.id}">
            <div class="cat-icon">${this.getCategoryIcon(cat.code)}</div>
            <h3>${cat.name}</h3>
            <div class="cat-count">${total} peserta</div>
            <div class="cat-progress">
              <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${pct}%"></div>
              </div>
              <span>${scored}/${total}</span>
            </div>
          </div>
        `;
      }

      grid.innerHTML = html;

      // Bind click events
      grid.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
          const catId = parseInt(card.dataset.categoryId);
          this.state.selectedCategory = categories.find(c => c.id === catId);
          this.state.currentPage = 'judge-participants';
          this.render();
        });
      });

      // Re-render sidebar with categories
      const sidebar = document.getElementById('sidebar');
      if (sidebar) {
        sidebar.outerHTML = this.renderSidebar(false);
        this.bindSidebarEvents();
      }
    } catch (e) {
      console.error(e);
    }
  },

  // ==================== JUDGE: PARTICIPANTS ====================
  renderJudgeParticipants() {
    const cat = this.state.selectedCategory;
    return `
      <div class="breadcrumb">
        <span class="breadcrumb-item" data-page="judge-categories">Kategori</span>
        <span class="breadcrumb-separator">›</span>
        <span class="breadcrumb-current">${cat?.name || ''}</span>
      </div>
      <div class="page-header">
        <h1>${cat?.name || 'Peserta'} ${this.getCategoryIcon(cat?.code)}</h1>
        <p>Klik peserta untuk memberikan penilaian</p>
      </div>
      <div class="participants-list" id="participantsList">
        <div class="loading"><div class="spinner"></div><span>Memuat peserta...</span></div>
      </div>
    `;
  },

  async loadParticipants() {
    const cat = this.state.selectedCategory;
    if (!cat) return;

    try {
      const res = await fetch(`/api/judge/participants/${cat.id}`);
      const participants = await res.json();
      this.state.participants = participants;

      const list = document.getElementById('participantsList');
      if (!list) return;

      if (participants.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">👤</div>
            <h3>Belum ada peserta</h3>
            <p>Kategori ini belum memiliki peserta</p>
          </div>
        `;
        return;
      }

      list.innerHTML = participants.map(p => `
        <div class="participant-card" data-participant-id="${p.id}">
          <div class="participant-number">${p.number}</div>
          <div class="participant-info">
            <h4>${p.name}</h4>
            <div class="meta">
              <span>🏫 ${p.school}</span>
              <span>💻 ${p.project}</span>
            </div>
          </div>
          <div class="participant-status">
            <span class="status-badge ${p.scored ? 'scored' : 'pending'}">
              ${p.scored ? '✓ Dinilai' : '⏳ Belum'}
            </span>
          </div>
        </div>
      `).join('');

      // Bind click events
      list.querySelectorAll('.participant-card').forEach(card => {
        card.addEventListener('click', () => {
          const pId = parseInt(card.dataset.participantId);
          this.state.selectedParticipant = participants.find(p => p.id === pId);
          this.state.currentPage = 'judge-scoring';
          this.render();
        });
      });

      // Breadcrumb navigation
      document.querySelectorAll('.breadcrumb-item').forEach(item => {
        item.addEventListener('click', () => {
          this.state.currentPage = item.dataset.page;
          this.render();
        });
      });
    } catch (e) {
      console.error(e);
    }
  },

  // ==================== JUDGE: SCORING ====================
  renderJudgeScoring() {
    const p = this.state.selectedParticipant;
    const cat = this.state.selectedCategory;
    return `
      <div class="breadcrumb">
        <span class="breadcrumb-item" data-page="judge-categories">Kategori</span>
        <span class="breadcrumb-separator">›</span>
        <span class="breadcrumb-item" data-page="judge-participants">${cat?.name || ''}</span>
        <span class="breadcrumb-separator">›</span>
        <span class="breadcrumb-current">Penilaian</span>
      </div>
      <div class="scoring-page">
        <div class="scoring-header">
          <button class="back-btn" id="backBtn">←</button>
          <div class="participant-detail">
            <h2>#${p?.number} — ${p?.name}</h2>
            <p>🏫 ${p?.school} &nbsp;|&nbsp; 💻 ${p?.project}</p>
          </div>
        </div>
        <div id="scoringForm">
          <div class="loading"><div class="spinner"></div><span>Memuat rubrik penilaian...</span></div>
        </div>
      </div>
    `;
  },

  async loadScoringForm() {
    const p = this.state.selectedParticipant;
    if (!p) return;

    try {
      const [criteriaRes, scoresRes] = await Promise.all([
        fetch('/api/criteria'),
        fetch(`/api/judge/scores/${p.id}`)
      ]);

      const criteria = await criteriaRes.json();
      const existingScores = await scoresRes.json();
      this.state.criteria = criteria;

      const scoreMap = {};
      for (const s of existingScores) {
        scoreMap[s.sub_criteria_id] = s.score;
      }

      const formEl = document.getElementById('scoringForm');
      if (!formEl) return;

      let html = '';

      for (const c of criteria) {
        html += `
          <div class="criteria-section">
            <div class="criteria-header">
              <h3>${c.name}</h3>
              <span class="weight-badge">Bobot ${c.weight}%</span>
            </div>
            <div class="sub-criteria-list">
              ${c.sub_criteria.map(sc => `
                <div class="sub-criteria-item">
                  <div class="sub-criteria-info">
                    <h4>${sc.name}</h4>
                    <p>${sc.detail}</p>
                  </div>
                  <div class="score-input-group">
                    <input type="number" class="score-input" 
                           data-sub-id="${sc.id}" 
                           data-criteria-id="${c.id}"
                           data-min="${sc.min_score}" 
                           data-max="${sc.max_score}"
                           min="${sc.min_score}" 
                           max="${sc.max_score}" 
                           value="${scoreMap[sc.id] !== undefined ? scoreMap[sc.id] : ''}"
                           placeholder="0">
                    <span class="score-max">/ ${sc.max_score}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      html += `
        <div class="scoring-summary" id="scoringSummary">
          <h3>Ringkasan Nilai</h3>
          <div class="summary-grid" id="summaryGrid"></div>
          <div class="scoring-actions">
            <button class="btn btn-secondary" id="resetBtn">↺ Reset</button>
            <button class="btn btn-primary" id="saveBtn" style="width:auto;">
              💾 Simpan Nilai
            </button>
          </div>
        </div>
      `;

      formEl.innerHTML = html;

      // Calculate summary on input change
      const updateSummary = () => {
        const summaryGrid = document.getElementById('summaryGrid');
        if (!summaryGrid) return;

        let totalWeighted = 0;
        let summaryHtml = '';

        for (const c of criteria) {
          let rawTotal = 0;
          c.sub_criteria.forEach(sc => {
            const input = document.querySelector(`input[data-sub-id="${sc.id}"]`);
            if (input) rawTotal += parseInt(input.value) || 0;
          });

          const weighted = (rawTotal / c.max_score) * c.weight;
          totalWeighted += weighted;

          summaryHtml += `
            <div class="summary-item">
              <div class="label">${c.name} (${c.weight}%)</div>
              <div class="value">${rawTotal}/${c.max_score}</div>
            </div>
          `;
        }

        summaryHtml += `
          <div class="summary-item">
            <div class="label">Total Tertimbang</div>
            <div class="value total">${totalWeighted.toFixed(2)}</div>
          </div>
        `;

        summaryGrid.innerHTML = summaryHtml;
      };

      // Input validation and summary update
      document.querySelectorAll('.score-input').forEach(input => {
        input.addEventListener('input', () => {
          const min = parseInt(input.dataset.min);
          const max = parseInt(input.dataset.max);
          const val = parseInt(input.value);

          if (input.value !== '' && (val < min || val > max || isNaN(val))) {
            input.classList.add('invalid');
          } else {
            input.classList.remove('invalid');
          }

          updateSummary();
        });
      });

      updateSummary();

      // Save button
      document.getElementById('saveBtn')?.addEventListener('click', async () => {
        const inputs = document.querySelectorAll('.score-input');
        const scores = [];
        let valid = true;

        inputs.forEach(input => {
          const val = parseInt(input.value);
          const min = parseInt(input.dataset.min);
          const max = parseInt(input.dataset.max);

          if (input.value === '' || isNaN(val) || val < min || val > max) {
            input.classList.add('invalid');
            valid = false;
          } else {
            scores.push({
              sub_criteria_id: parseInt(input.dataset.subId),
              score: val
            });
          }
        });

        if (!valid) {
          this.showToast('Pastikan semua nilai terisi dengan benar', 'error');
          return;
        }

        try {
          const res = await fetch('/api/judge/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              participant_id: p.id,
              scores
            })
          });

          if (res.ok) {
            this.showToast('Nilai berhasil disimpan! ✓', 'success');
            // Go back to participants list after 1 second
            setTimeout(() => {
              this.state.currentPage = 'judge-participants';
              this.render();
            }, 1000);
          } else {
            const err = await res.json();
            this.showToast(err.error || 'Gagal menyimpan nilai', 'error');
          }
        } catch (e) {
          this.showToast('Terjadi kesalahan koneksi', 'error');
        }
      });

      // Reset button
      document.getElementById('resetBtn')?.addEventListener('click', () => {
        document.querySelectorAll('.score-input').forEach(input => {
          input.value = '';
          input.classList.remove('invalid');
        });
        updateSummary();
      });

      // Back button
      document.getElementById('backBtn')?.addEventListener('click', () => {
        this.state.currentPage = 'judge-participants';
        this.render();
      });

      // Breadcrumb navigation
      document.querySelectorAll('.breadcrumb-item').forEach(item => {
        item.addEventListener('click', () => {
          this.state.currentPage = item.dataset.page;
          this.render();
        });
      });
    } catch (e) {
      console.error(e);
    }
  },

  // ==================== ADMIN: DASHBOARD ====================
  renderAdminDashboard() {
    return `
      <div class="page-header">
        <h1>Dashboard Admin 📊</h1>
        <p>Overview penilaian seluruh kategori</p>
      </div>
      <div class="stats-grid" id="statsGrid">
        <div class="loading"><div class="spinner"></div></div>
      </div>
      <div class="progress-section" id="progressSection" style="display:none;">
        <h3>📈 Progress per Kategori</h3>
        <div id="categoryProgress"></div>
      </div>
    `;
  },

  async loadAdminDashboard() {
    try {
      const res = await fetch('/api/admin/dashboard');
      const data = await res.json();

      const statsGrid = document.getElementById('statsGrid');
      if (!statsGrid) return;

      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon purple">👥</div>
          <div class="stat-value">${data.totalParticipants}</div>
          <div class="stat-label">Total Peserta</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">⚖️</div>
          <div class="stat-value">${data.totalJudges}</div>
          <div class="stat-label">Total Juri</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">📁</div>
          <div class="stat-value">${data.totalCategories}</div>
          <div class="stat-label">Kategori</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">📊</div>
          <div class="stat-value">${data.completionRate}%</div>
          <div class="stat-label">Penyelesaian</div>
        </div>
      `;

      // Category progress
      const progressSection = document.getElementById('progressSection');
      const categoryProgress = document.getElementById('categoryProgress');
      if (progressSection && categoryProgress && data.categoryStats) {
        progressSection.style.display = 'block';
        categoryProgress.innerHTML = data.categoryStats.map(cat => {
          const pct = cat.expected_count > 0 ? Math.round((cat.scored_count / cat.expected_count) * 100) : 0;
          return `
            <div class="progress-bar-container">
              <div class="progress-bar-label">
                <span>${this.getCategoryIcon(cat.code)} ${cat.name} (${cat.participant_count} peserta)</span>
                <span>${cat.scored_count}/${cat.expected_count} dinilai — ${pct}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${pct}%"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (e) {
      console.error(e);
    }
  },

  // ==================== ADMIN: RESULTS ====================
  renderAdminResults() {
    return `
      <div class="page-header">
        <h1>Hasil Penilaian 📋</h1>
        <p>Lihat hasil penilaian per kategori</p>
      </div>
      <div class="results-section">
        <div class="results-header">
          <h3>Ranking Peserta</h3>
          <div class="tab-group" id="categoryTabs">
            <div class="loading"><div class="spinner" style="width:20px;height:20px;"></div></div>
          </div>
        </div>
        <div id="resultsContent">
          <div class="loading"><div class="spinner"></div><span>Memuat data...</span></div>
        </div>
      </div>
    `;
  },

  async loadAdminResults() {
    try {
      // Load categories
      const catRes = await fetch('/api/admin/categories');
      const categories = await catRes.json();

      const tabs = document.getElementById('categoryTabs');
      if (!tabs) return;

      if (!this.state.adminSelectedCategory && categories.length > 0) {
        this.state.adminSelectedCategory = categories[0].id;
      }

      tabs.innerHTML = categories.map(c => `
        <button class="tab-btn ${this.state.adminSelectedCategory === c.id ? 'active' : ''}" 
                data-category-id="${c.id}">
          ${c.name}
        </button>
      `).join('');

      tabs.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.state.adminSelectedCategory = parseInt(btn.dataset.categoryId);
          tabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.loadCategoryResults();
        });
      });

      this.loadCategoryResults();
    } catch (e) {
      console.error(e);
    }
  },

  async loadCategoryResults() {
    const catId = this.state.adminSelectedCategory;
    if (!catId) return;

    const content = document.getElementById('resultsContent');
    if (!content) return;
    content.innerHTML = '<div class="loading"><div class="spinner"></div><span>Memuat hasil...</span></div>';

    try {
      const res = await fetch(`/api/admin/results/${catId}`);
      const data = await res.json();

      if (!data.participants || data.participants.length === 0) {
        content.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <h3>Belum ada data</h3>
            <p>Belum ada peserta dalam kategori ini</p>
          </div>
        `;
        return;
      }

      const judges = data.judges || [];

      let tableHtml = `
        <div class="results-table-wrapper">
          <table class="results-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>No</th>
                <th>Nama</th>
                <th>Sekolah</th>
                <th>Project</th>
                ${judges.map(j => `<th style="text-align:center;">${j.name}</th>`).join('')}
                <th style="text-align:center;">Rata-rata</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
      `;

      for (const p of data.participants) {
        const rankClass = p.rank <= 3 && p.rank !== '-' ? `rank-${p.rank}` : '';
        tableHtml += `
          <tr>
            <td class="rank-cell ${rankClass}">${p.rank <= 3 && p.rank !== '-' ? ['🥇','🥈','🥉'][p.rank-1] : p.rank}</td>
            <td>${p.number}</td>
            <td class="name-cell" title="${p.name}">${p.name}</td>
            <td>${p.school}</td>
            <td title="${p.project}">${p.project.length > 25 ? p.project.substring(0, 25) + '...' : p.project}</td>
            ${p.judge_scores.map(js => `
              <td class="score-cell">
                ${js.has_scored ? `<span style="font-weight:700;color:var(--text-primary);">${js.total_weighted}</span>` : '<span style="color:var(--text-muted);">—</span>'}
              </td>
            `).join('')}
            <td class="total-cell">${p.average_score > 0 ? p.average_score : '—'}</td>
            <td>
              <span class="status-badge ${p.is_complete ? 'scored' : 'pending'}">
                ${p.is_complete ? '✓ Lengkap' : '⏳ Proses'}
              </span>
            </td>
          </tr>
        `;
      }

      tableHtml += '</tbody></table></div>';

      // Detail section - expandable per participant
      let detailsHtml = '<div style="padding: 24px;">';
      detailsHtml += '<h3 style="margin-bottom: 16px; font-size: 16px; font-weight: 700;">📝 Detail Nilai per Peserta</h3>';

      for (const p of data.participants) {
        const hasAnyScore = p.judge_scores.some(js => js.has_scored);
        if (!hasAnyScore) continue;

        detailsHtml += `
          <div class="detail-card" style="margin-bottom: 16px;">
            <h4>#${p.number} — ${p.name} (${p.project})</h4>
            <div class="detail-grid">
              ${p.judge_scores.filter(js => js.has_scored).map(js => `
                <div style="margin-bottom: 12px;">
                  <div style="font-weight: 600; color: var(--accent-primary-hover); margin-bottom: 8px;">${js.judge_name}</div>
                  ${Object.entries(js.criteria_scores).map(([code, cs]) => `
                    <div style="margin-bottom: 8px;">
                      <div style="font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">${cs.name} (${cs.weight}%)</div>
                      ${cs.subs.map(sub => `
                        <div class="detail-row">
                          <span class="label">${sub.name}</span>
                          <span class="value">${sub.score}/25</span>
                        </div>
                      `).join('')}
                      <div class="detail-row" style="border-top: 1px solid var(--border-color); padding-top: 4px; margin-top: 4px;">
                        <span class="label" style="font-weight: 600;">Subtotal</span>
                        <span class="value" style="color: var(--accent-primary-hover);">${cs.raw_total}/${cs.max}</span>
                      </div>
                    </div>
                  `).join('')}
                  <div class="detail-row" style="border-top: 2px solid var(--border-color); padding-top: 8px; margin-top: 8px;">
                    <span class="label" style="font-weight: 700; font-size: 14px;">Total Tertimbang</span>
                    <span class="value" style="font-size: 18px; color: var(--accent-primary-hover);">${js.total_weighted}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      detailsHtml += '</div>';

      content.innerHTML = tableHtml + detailsHtml;
    } catch (e) {
      console.error(e);
      content.innerHTML = '<div class="empty-state"><p>Gagal memuat data</p></div>';
    }
  },

  // ==================== UTILS ====================
  getCategoryIcon(code) {
    const icons = {
      'starter': '🌱',
      'beginner': '🔰',
      'intermediate': '⚡',
      'senior': '🚀'
    };
    return icons[code] || '📁';
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => App.init());
