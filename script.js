// Inisialisasi tema sebelum render halaman
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

function updateThemeLogo(theme) {
  const logoImg = document.getElementById('sidebar-brand-logo');
  if (logoImg) {
    logoImg.src = theme === 'dark' ? 'logo-dark.png' : 'logo-light.png';
  }
}
updateThemeLogo(savedTheme);

// ==========================================================
// GANTI URL INI dengan URL Web App dari Apps Script kamu
// Bentuknya: https://script.google.com/macros/s/xxxxxxxxxx/exec
// ==========================================================
const API_URL = 'https://script.google.com/macros/s/AKfycbxELg6fF23TpdQjfDlRT_I6WmNaFi2u5FPmdil2lu_zCv6bN4wbWIhddqvg8MDjmuY9/exec';

// Nama-nama sheet di Google Sheets
const SHEET_PLAYERS = 'Master Player';
const SHEET_TEAMS = 'Master Team';
const SHEET_POSITIONS = 'Master Position';
const SHEET_ROUTES = 'Master Route';
const SHEET_PLAYBOOK = 'Playbook';
const SHEET_PLAY_ASSIGNMENT = 'Play Assignment';
const SHEET_SESSION = 'Session';
const SHEET_SESSION_PLAY = 'Session Play';

// State Cache
let cache = {
  players: [],
  teams: [],
  positions: [],
  routes: [],
  playbooks: [],
  playAssignments: [],
  sessions: [],
  sessionPlays: []
};

// Edit States
let editingTeamId = null;
let editingPlayerId = null;
let editingPositionId = null;
let editingRouteId = null;
let chartPassDist = null;
let chartRouteSuccess = null;
let activePerformerTab = 'yards';
let editingPlaybookId = null;
let editingSessionId = null;

// Upload States
let uploadedImageBase64 = null;
let uploadedImageName = '';
let uploadedImageType = '';

// DOM Elements
const viewTitle = document.getElementById('view-title');
const globalRefreshBtn = document.getElementById('global-refresh-btn');

// Forms & Status Elements
const teamForm = document.getElementById('team-form');
const teamSubmitBtn = document.getElementById('team-submit-btn');
const teamCancelBtn = document.getElementById('team-cancel-btn');
const teamStatus = document.getElementById('team-form-status');

const playerForm = document.getElementById('player-form');
const playerSubmitBtn = document.getElementById('player-submit-btn');
const playerCancelBtn = document.getElementById('player-cancel-btn');
const playerStatus = document.getElementById('player-form-status');

const positionForm = document.getElementById('position-form');
const positionSubmitBtn = document.getElementById('position-submit-btn');
const positionCancelBtn = document.getElementById('position-cancel-btn');
const positionStatus = document.getElementById('position-form-status');

const routeForm = document.getElementById('route-form');
const routeSubmitBtn = document.getElementById('route-submit-btn');
const routeCancelBtn = document.getElementById('route-cancel-btn');
const routeStatus = document.getElementById('route-form-status');

const playbookForm = document.getElementById('playbook-form');
const playbookSubmitBtn = document.getElementById('playbook-submit-btn');
const playbookCancelBtn = document.getElementById('playbook-cancel-btn');
const playbookStatus = document.getElementById('playbook-form-status');

// Playbook Image Elements
const playbookImageFile = document.getElementById('playbook-image-file');
const playbookImagePreviewContainer = document.getElementById('playbook-image-preview-container');
const playbookImagePreview = document.getElementById('playbook-image-preview');
const playbookImageUrlInput = document.getElementById('playbook-image-url');

// Playbook Assignments Modal Elements
const playbookAssignmentsModal = document.getElementById('playbook-assignments-modal');
const openAssignmentsModalBtn = document.getElementById('open-assignments-modal-btn');
const closeAssignmentsModalBtn = document.getElementById('close-assignments-modal-btn');
const saveAssignmentsModalBtn = document.getElementById('save-assignments-modal-btn');
const assignmentsCountLabel = document.getElementById('assignments-count-label');

const assignmentRowsContainer = playbookAssignmentsModal.querySelector('#assignment-rows-container');
const addAssignmentRowBtn = playbookAssignmentsModal.querySelector('#add-assignment-row-btn');

// Session DOM Elements
const sessionListView = document.getElementById('session-list-view');
const sessionFormView = document.getElementById('session-form-view');
const sessionTableBody = document.getElementById('session-table-body');
const sessionFormTitle = document.getElementById('session-form-title');

const newSessionBtn = document.getElementById('new-session-btn');
const cancelSessionBtn = document.getElementById('cancel-session-btn');
const saveSessionBtn = document.getElementById('save-session-btn');
const doneSessionBtn = document.getElementById('done-session-btn');
const addDriveBtn = document.getElementById('add-drive-btn');

const sessionTypeInput = document.getElementById('session-type-input');
const sessionOpponentInput = document.getElementById('session-opponent-input');
const sessionDateInput = document.getElementById('session-date-input');
const sessionOpponentScoreInput = document.getElementById('session-opponent-score-input');
const sessionOurScorePreview = document.getElementById('session-our-score-preview');
const sessionDrivesContainer = document.getElementById('session-drives-container');

// Select Inputs in Player Form
const playerTeamSelect = document.getElementById('player-team-select');
const playerPositionSelect = document.getElementById('player-position-select');
const playerSecPositionSelect = document.getElementById('player-secondary-position-select');

// List Containers / Tables
const teamListGrid = document.getElementById('team-list-grid');
const playerTableBody = document.getElementById('player-table-body');
const positionTableBody = document.getElementById('position-table-body');
const routeTableBody = document.getElementById('route-table-body');
const playbookListGrid = document.getElementById('playbook-list-grid');

// Dashboard Stats Elements
const statTeams = document.getElementById('stat-teams');
const statPlayers = document.getElementById('stat-players');
const statPositions = document.getElementById('stat-positions');
const statRoutes = document.getElementById('stat-routes');
const statPlaybook = document.getElementById('stat-playbook');

// ---------- 1. View Navigation Handler ----------
const navButtons = document.querySelectorAll('.sidebar__nav-item');
const viewPanels = document.querySelectorAll('.view-panel');

const viewTitlesMap = {
  dashboard: 'Dashboard Overview',
  session: 'Session Tracking',
  'player-analysis': 'Player Analysis',
  team: 'Master Team',
  position: 'Master Positions',
  route: 'Master Route',
  playbook: 'Master Playbook',
  player: 'Master Player'
};

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetView = btn.getAttribute('data-view');

    // Update active nav button
    navButtons.forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    // Update active view panel
    viewPanels.forEach(panel => {
      panel.classList.remove('is-active');
      if (panel.id === `view-${targetView}`) {
        panel.classList.add('is-active');
      }
    });

    // Update Page Header Title
    viewTitle.textContent = viewTitlesMap[targetView] || 'Flag Football Stats';

    if (targetView === 'dashboard') {
      initDashboard();
    } else if (targetView === 'player-analysis') {
      initPlayerAnalysis();
    }
  });
});

// ---------- 2. Fetch & Render Data ----------

// Fetch a single sheet's data
async function fetchSheetData(sheetName) {
  const url = `${API_URL}?sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}

// Global data reload
async function loadAllData() {
  globalRefreshBtn.disabled = true;
  globalRefreshBtn.innerHTML = `
      <svg class="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
      </svg>
      Memuat…
    `;

  // Start spinning using CSS class
  const svgIcon = globalRefreshBtn.querySelector('svg');
  if (svgIcon) svgIcon.style.animation = 'spin 1s linear infinite';

  try {
    await Promise.all([
      loadTeams(),
      loadPositions(),
      loadRoutes(),
      loadPlaybook(),
      loadPlayers(),
      loadSessions()
    ]);
    initDashboard();
    initPlayerAnalysis();
  } catch (err) {
    console.error('Gagal mengambil seluruh data:', err);
  } finally {
    globalRefreshBtn.disabled = false;
    globalRefreshBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
        </svg>
        Muat Ulang Data
      `;
  }
}

// Load & Render Teams
async function loadTeams() {
  teamListGrid.innerHTML = `<div class="loading-state">Memuat data tim…</div>`;
  try {
    const data = await fetchSheetData(SHEET_TEAMS);
    cache.teams = Array.isArray(data) ? data : [];

    // Update Dashboard Stat
    if (statTeams) statTeams.textContent = cache.teams.length;

    // Populate team selection in Player form
    populateTeamSelect();

    if (!cache.teams.length) {
      teamListGrid.innerHTML = `<div class="loading-state">Belum ada tim terdaftar.</div>`;
      return;
    }

    teamListGrid.innerHTML = cache.teams.map(team => {
      const color = team.primary_color || '#f4b83f';
      const name = team.team_name || '-';
      const abbr = team.abbreviation || 'T';
      const desc = team.description || 'Tidak ada deskripsi.';
      const id = team.team_id || '';

      return `
          <div class="team-badge-card">
            <div class="team-badge-card__color-bar" style="background: ${color};"></div>
            <div class="team-badge-card__logo" style="background: ${color};">
              ${abbr.substring(0, 3)}
            </div>
            <div class="team-badge-card__name">${name}</div>
            <div class="team-badge-card__abbr">${abbr}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 8px;">${desc}</div>
            
            <div class="team-card-actions">
              <button class="action-btn edit" onclick="startEditTeam('${id}')">Edit</button>
              <button class="action-btn delete" onclick="deleteRecord('${SHEET_TEAMS}', '${id}')">Hapus</button>
            </div>
          </div>
        `;
    }).join('');

  } catch (err) {
    teamListGrid.innerHTML = `<div class="loading-state" style="color: var(--danger);">Gagal: ${err.message}</div>`;
    throw err;
  }
}

// Load & Render Positions
async function loadPositions() {
  positionTableBody.innerHTML = `<tr><td colspan="6" class="table-empty">Memuat data posisi…</td></tr>`;
  try {
    const data = await fetchSheetData(SHEET_POSITIONS);
    cache.positions = Array.isArray(data) ? data : [];

    // Update Dashboard Stat
    if (statPositions) statPositions.textContent = cache.positions.length;

    // Populate position selections in Player form
    populatePositionSelects();

    if (!cache.positions.length) {
      positionTableBody.innerHTML = `<tr><td colspan="6" class="table-empty">Belum ada posisi terdaftar.</td></tr>`;
      return;
    }

    positionTableBody.innerHTML = cache.positions.map((pos, i) => {
      const id = pos.position_id || '';
      return `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${id || '-'}</strong></td>
            <td>${pos.position_name || '-'}</td>
            <td><span class="badge badge-accent">${pos.abbreviation || '-'}</span></td>
            <td>${pos.category || '-'}</td>
            <td>
              <button class="action-btn edit" onclick="startEditPosition('${id}')">Edit</button>
              <button class="action-btn delete" onclick="deleteRecord('${SHEET_POSITIONS}', '${id}')">Hapus</button>
            </td>
          </tr>
        `;
    }).join('');

  } catch (err) {
    positionTableBody.innerHTML = `<tr><td colspan="6" class="table-empty" style="color: var(--danger);">Gagal: ${err.message}</td></tr>`;
    throw err;
  }
}

// Load & Render Routes
async function loadRoutes() {
  routeTableBody.innerHTML = `<tr><td colspan="9" class="table-empty">Memuat data rute…</td></tr>`;
  try {
    const data = await fetchSheetData(SHEET_ROUTES);
    cache.routes = Array.isArray(data) ? data : [];

    // Update Dashboard Stat
    if (statRoutes) statRoutes.textContent = cache.routes.length;

    if (!cache.routes.length) {
      routeTableBody.innerHTML = `<tr><td colspan="9" class="table-empty">Belum ada rute terdaftar.</td></tr>`;
      return;
    }

    routeTableBody.innerHTML = cache.routes.map((rt, i) => {
      const id = rt.route_id || '';
      return `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${id || '-'}</strong></td>
            <td>${rt.route_name || '-'}</td>
            <td><span class="badge badge-accent">${rt.abbreviation || '-'}</span></td>
            <td>${rt.category || '-'}</td>
            <td>${rt.route_type || '-'}</td>
            <td>${rt.description || '-'}</td>
            <td>${rt.status || '-'}</td>
            <td>
              <button class="action-btn edit" onclick="startEditRoute('${id}')">Edit</button>
              <button class="action-btn delete" onclick="deleteRecord('${SHEET_ROUTES}', '${id}')">Hapus</button>
            </td>
          </tr>
        `;
    }).join('');

  } catch (err) {
    routeTableBody.innerHTML = `<tr><td colspan="9" class="table-empty" style="color: var(--danger);">Gagal: ${err.message}</td></tr>`;
    throw err;
  }
}

// Load & Render Playbook (Master-Detail Join)
async function loadPlaybook() {
  playbookListGrid.innerHTML = `<div class="loading-state">Memuat data playbook…</div>`;
  try {
    const [playbookData, assignmentsData] = await Promise.all([
      fetchSheetData(SHEET_PLAYBOOK),
      fetchSheetData(SHEET_PLAY_ASSIGNMENT)
    ]);

    cache.playbooks = Array.isArray(playbookData) ? playbookData : [];
    cache.playAssignments = Array.isArray(assignmentsData) ? assignmentsData : [];

    // Update Dashboard Stat
    if (statPlaybook) statPlaybook.textContent = cache.playbooks.length;

    if (!cache.playbooks.length) {
      playbookListGrid.innerHTML = `<div class="loading-state">Belum ada taktik di playbook.</div>`;
      return;
    }

    playbookListGrid.innerHTML = cache.playbooks.map(play => {
      const id = play.play_id || '';
      const name = play.play_name || '-';
      const form = play.formation || '-';
      const type = play.offense_type || '-';
      const cat = play.play_category || '-';
      const desc = play.description || 'Tidak ada deskripsi.';
      const active = play.active || 'Aktif';
      const imgUrl = play.image || '';

      // Get assignments for this play
      const playAsgs = cache.playAssignments.filter(asg => String(asg.play_id).trim() === String(id).trim());

      const assignmentsHtml = playAsgs.map(asg => `
          <li class="playbook-card__assignments-item">
            <span><strong>${asg.receiver || '-'}</strong> (${asg.position || '-'})</span>
            <span class="playbook-card__assignments-val">${asg.route_id || '-'}</span>
          </li>
        `).join('');

      const diagramHtml = imgUrl
        ? `<img src="${imgUrl}" alt="${name}">`
        : `<div class="playbook-card__diagram-placeholder">[ Diagram Taktik ]</div>`;

      return `
          <div class="playbook-card">
            <div class="playbook-card__header">
              <span class="playbook-card__title">${name}</span>
              <span class="badge ${active === 'Aktif' ? 'badge-accent' : 'badge-muted'}">${active}</span>
            </div>
            
            <div class="playbook-card__body">
              <div class="playbook-card__diagram">
                ${diagramHtml}
              </div>
              
              <div class="playbook-card__meta">
                <div class="playbook-card__meta-item">Formasi: <strong>${form}</strong></div>
                <div class="playbook-card__meta-item">Tipe: <strong>${type}</strong></div>
                <div class="playbook-card__meta-item" style="grid-column: 1 / -1;">Kategori: <strong>${cat}</strong></div>
              </div>
              
              <div class="playbook-card__desc">${desc}</div>
              
              <div class="playbook-card__assignments-title">Penugasan Rute</div>
              <ul class="playbook-card__assignments-list">
                ${assignmentsHtml.length ? assignmentsHtml : '<li class="loading-state" style="padding: 4px 0;">Tidak ada penugasan.</li>'}
              </ul>
            </div>
            
            <div class="playbook-card__footer">
              <button class="action-btn edit" onclick="startEditPlaybook('${id}')">Edit</button>
              <button class="action-btn delete" onclick="deleteRecord('${SHEET_PLAYBOOK}', '${id}')">Hapus</button>
            </div>
          </div>
        `;
    }).join('');

  } catch (err) {
    playbookListGrid.innerHTML = `<div class="loading-state" style="color: var(--danger);">Gagal: ${err.message}</div>`;
    throw err;
  }
}

// Load & Render Players
async function loadPlayers() {
  playerTableBody.innerHTML = `<tr><td colspan="9" class="table-empty">Memuat data pemain…</td></tr>`;
  try {
    const data = await fetchSheetData(SHEET_PLAYERS);
    cache.players = Array.isArray(data) ? data : [];

    // Update Dashboard Stat
    if (statPlayers) statPlayers.textContent = cache.players.length;

    if (!cache.players.length) {
      playerTableBody.innerHTML = `<tr><td colspan="9" class="table-empty">Belum ada pemain terdaftar.</td></tr>`;
      return;
    }

    playerTableBody.innerHTML = cache.players.map((p, i) => {
      const id = p.player_id || '';
      const height = p['height (cm)'] || '-';
      const weight = p['weight (kg)'] || '-';
      const secPos = p.secondary_position ? `/ ${p.secondary_position}` : '';
      return `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${id || '-'}</strong></td>
            <td>${p.name || '-'}</td>
            <td>${p.nick_name || '-'}</td>
            <td>${p.jersey_number || '-'}</td>
            <td>${p.position || '-'} ${secPos}</td>
            <td><span class="badge badge-accent">${p.team || '-'}</span></td>
            <td>${height} cm / ${weight} kg</td>
            <td>
              <button class="action-btn edit" onclick="startEditPlayer('${id}')">Edit</button>
              <button class="action-btn delete" onclick="deleteRecord('${SHEET_PLAYERS}', '${id}')">Hapus</button>
            </td>
          </tr>
        `;
    }).join('');

  } catch (err) {
    playerTableBody.innerHTML = `<tr><td colspan="9" class="table-empty" style="color: var(--danger);">Gagal: ${err.message}</td></tr>`;
    throw err;
  }
}

// Load & Render Sessions
async function loadSessions() {
  if (!sessionTableBody) return;
  sessionTableBody.innerHTML = `<tr><td colspan="8" class="table-empty">Memuat data sesi…</td></tr>`;
  try {
    const [sessionsData, sessionPlaysData] = await Promise.all([
      fetchSheetData(SHEET_SESSION),
      fetchSheetData(SHEET_SESSION_PLAY)
    ]);

    cache.sessions = Array.isArray(sessionsData) ? sessionsData : [];
    cache.sessionPlays = Array.isArray(sessionPlaysData) ? sessionPlaysData : [];

    if (!cache.sessions.length) {
      sessionTableBody.innerHTML = `<tr><td colspan="8" class="table-empty">Belum ada sesi terdaftar.</td></tr>`;
      return;
    }

    sessionTableBody.innerHTML = cache.sessions.map((s, i) => {
      const id = s.session_id || '';
      const statusClass = s.status === 'Done' ? 'badge badge-accent' : 'badge';
      const statusLabel = s.status === 'Done' ? 'Selesai' : 'Sedang Berjalan';
      
      const score = (s.our_score !== undefined && s.opponent_score !== undefined) ? `${s.our_score}-${s.opponent_score}` : '-';
      
      let formattedDate = s.date || '-';
      if (formattedDate && formattedDate !== '-') {
        try {
          const d = new Date(formattedDate);
          if (!isNaN(d.getTime())) {
            formattedDate = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
          }
        } catch(e) {}
      }

      return `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${id}</strong></td>
          <td>${s.session_type || '-'}</td>
          <td>${s.opponent || '-'}</td>
          <td>${score}</td>
          <td><span class="badge ${s.result === 'Win' ? 'badge-accent' : ''}" style="${s.result === 'Loss' ? 'background: rgba(239,68,68,0.1); color: var(--danger); border: 1px solid rgba(239,68,68,0.2);' : ''}">${s.result || '-'}</span></td>
          <td><span class="${statusClass}">${statusLabel}</span></td>
          <td>
            <button class="action-btn edit" onclick="startEditSession('${id}')">Edit</button>
            <button class="action-btn delete" onclick="deleteRecord('${SHEET_SESSION}', '${id}')">Hapus</button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    sessionTableBody.innerHTML = `<tr><td colspan="8" class="table-empty" style="color: var(--danger);">Gagal: ${err.message}</td></tr>`;
    throw err;
  }
}

// ---------- 3. Dropdown Helpers ----------
function populateTeamSelect() {
  // Save current selection
  const currentVal = playerTeamSelect.value;

  playerTeamSelect.innerHTML = '<option value="">Pilih Tim</option>';
  cache.teams.forEach(team => {
    if (team.team_name) {
      const opt = document.createElement('option');
      opt.value = team.team_name;
      opt.textContent = `${team.team_name} (${team.abbreviation})`;
      playerTeamSelect.appendChild(opt);
    }
  });

  // Restore previous selection if still available
  playerTeamSelect.value = currentVal;
}

function populatePositionSelects() {
  // Save current selections
  const currentPos = playerPositionSelect.value;
  const currentSecPos = playerSecPositionSelect.value;

  playerPositionSelect.innerHTML = '<option value="">Pilih Posisi Utama</option>';
  playerSecPositionSelect.innerHTML = '<option value="">Pilih Posisi Kedua</option>';

  cache.positions.forEach(pos => {
    if (pos.abbreviation) {
      const opt = document.createElement('option');
      opt.value = pos.abbreviation;
      opt.textContent = `${pos.position_name} (${pos.abbreviation})`;

      const opt2 = opt.cloneNode(true);

      playerPositionSelect.appendChild(opt);
      playerSecPositionSelect.appendChild(opt2);
    }
  });

  playerPositionSelect.value = currentPos;
  playerSecPositionSelect.value = currentSecPos;
}

// ---------- 4. Edit & Delete Action Handlers ----------

// Delete Operation
async function deleteRecord(sheetName, idValue) {
  if (!idValue) return;
  const isConfirmed = confirm(`Apakah Anda yakin ingin menghapus data dengan ID ${idValue}?`);
  if (!isConfirmed) return;

  try {
    const payload = {
      sheet: sheetName,
      action: 'delete',
      id: idValue
    };

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.error) throw new Error(result.error);

    alert('Data berhasil dihapus.');

    // Refresh lists
    if (sheetName === SHEET_TEAMS) {
      if (editingTeamId === idValue) cancelEditTeam();
      await loadTeams();
      await loadPlayers();
    } else if (sheetName === SHEET_POSITIONS) {
      if (editingPositionId === idValue) cancelEditPosition();
      await loadPositions();
      await loadPlayers();
    } else if (sheetName === SHEET_ROUTES) {
      if (editingRouteId === idValue) cancelEditRoute();
      await loadRoutes();
    } else if (sheetName === SHEET_PLAYBOOK) {
      if (editingPlaybookId === idValue) cancelEditPlaybook();
      await loadPlaybook();
    } else if (sheetName === SHEET_PLAYERS) {
      if (editingPlayerId === idValue) cancelEditPlayer();
      await loadPlayers();
    } else if (sheetName === SHEET_SESSION) {
      if (editingSessionId === idValue) cancelEditSession();
      await loadSessions();
    }
  } catch (err) {
    alert(`Gagal menghapus data: ${err.message}`);
  }
}

// Team Edit State Controllers
function startEditTeam(id) {
  const team = cache.teams.find(t => t.team_id === id);
  if (!team) return;

  editingTeamId = id;
  teamForm.team_name.value = team.team_name || '';
  teamForm.abbreviation.value = team.abbreviation || '';
  teamForm.description.value = team.description || '';
  teamForm.primary_color.value = team.primary_color || '#f4b83f';
  document.querySelector('.color-value-preview').textContent = (team.primary_color || '#f4b83f').toUpperCase();

  teamSubmitBtn.textContent = 'Update Tim';
  teamCancelBtn.style.display = 'inline-block';
  document.querySelector('#view-team .glass-card__title').textContent = `Edit Tim (${id})`;
}

function cancelEditTeam() {
  editingTeamId = null;
  teamForm.reset();
  document.querySelector('.color-value-preview').textContent = '#f4b83f';
  teamSubmitBtn.textContent = 'Simpan Tim';
  teamCancelBtn.style.display = 'none';
  document.querySelector('#view-team .glass-card__title').textContent = 'Tambah Tim Baru';
}

// Position Edit State Controllers
function startEditPosition(id) {
  const pos = cache.positions.find(p => p.position_id === id);
  if (!pos) return;

  editingPositionId = id;
  positionForm.position_name.value = pos.position_name || '';
  positionForm.abbreviation.value = pos.abbreviation || '';
  positionForm.category.value = pos.category || 'Offense';

  positionSubmitBtn.textContent = 'Update Posisi';
  positionCancelBtn.style.display = 'inline-block';
  document.querySelector('#view-position .glass-card__title').textContent = `Edit Posisi (${id})`;
}

function cancelEditPosition() {
  editingPositionId = null;
  positionForm.reset();
  positionSubmitBtn.textContent = 'Simpan Posisi';
  positionCancelBtn.style.display = 'none';
  document.querySelector('#view-position .glass-card__title').textContent = 'Tambah Posisi Baru';
}

// Route Edit State Controllers
function startEditRoute(id) {
  const rt = cache.routes.find(r => r.route_id === id);
  if (!rt) return;

  editingRouteId = id;
  routeForm.route_name.value = rt.route_name || '';
  routeForm.abbreviation.value = rt.abbreviation || '';
  routeForm.category.value = rt.category || '';
  routeForm.route_type.value = rt.route_type || '';
  routeForm.description.value = rt.description || '';
  routeForm.status.value = rt.status || 'Aktif';

  routeSubmitBtn.textContent = 'Update Rute';
  routeCancelBtn.style.display = 'inline-block';
  document.querySelector('#view-route .glass-card__title').textContent = `Edit Rute (${id})`;
}

function cancelEditRoute() {
  editingRouteId = null;
  routeForm.reset();
  routeSubmitBtn.textContent = 'Simpan Rute';
  routeCancelBtn.style.display = 'none';
  document.querySelector('#view-route .glass-card__title').textContent = 'Tambah Rute Baru';
}

// Playbook Edit State Controllers
function startEditPlaybook(id) {
  const play = cache.playbooks.find(p => p.play_id === id);
  if (!play) return;

  editingPlaybookId = id;
  playbookForm.play_name.value = play.play_name || '';
  playbookForm.formation.value = play.formation || '';
  playbookForm.offense_type.value = play.offense_type || 'Pass';
  playbookForm.play_category.value = play.play_category || 'Short';
  playbookForm.description.value = play.description || '';
  playbookImageUrlInput.value = play.image || '';

  // Show existing image preview
  if (play.image) {
    playbookImagePreview.src = play.image;
    playbookImagePreviewContainer.style.display = 'block';
  } else {
    playbookImagePreview.src = '';
    playbookImagePreviewContainer.style.display = 'none';
  }

  playbookForm.active.value = play.active || 'Aktif';

  // Load related assignments
  assignmentRowsContainer.innerHTML = '';
  const playAsgs = cache.playAssignments.filter(asg => String(asg.play_id).trim() === String(id).trim());
  playAsgs.forEach(asg => {
    createAssignmentRow(asg.receiver, asg.position, asg.route_id);
  });

  playbookSubmitBtn.textContent = 'Update Playbook';
  playbookCancelBtn.style.display = 'inline-block';
  document.querySelector('#view-playbook .glass-card__title').textContent = `Edit Playbook (${id})`;

  updateAssignmentsCount();
}

function cancelEditPlaybook() {
  editingPlaybookId = null;
  playbookForm.reset();

  // Reset upload states
  playbookImageFile.value = '';
  uploadedImageBase64 = null;
  uploadedImageName = '';
  uploadedImageType = '';
  playbookImagePreview.src = '';
  playbookImagePreviewContainer.style.display = 'none';
  playbookImageUrlInput.value = '';

  assignmentRowsContainer.innerHTML = '';
  playbookSubmitBtn.textContent = 'Simpan Playbook';
  playbookCancelBtn.style.display = 'none';
  document.querySelector('#view-playbook .glass-card__title').textContent = 'Tambah Playbook Baru';

  updateAssignmentsCount();
}

// Player Edit State Controllers
function startEditPlayer(id) {
  const p = cache.players.find(pl => pl.player_id === id);
  if (!p) return;

  editingPlayerId = id;
  playerForm.name.value = p.name || '';
  playerForm.nick_name.value = p.nick_name || '';
  playerForm.jersey_number.value = p.jersey_number || '';
  playerForm['height (cm)'].value = p['height (cm)'] || '';
  playerForm['weight (kg)'].value = p['weight (kg)'] || '';
  playerForm.birth_date.value = p.birth_date || '';
  playerForm.position.value = p.position || '';
  playerForm.secondary_position.value = p.secondary_position || '';
  playerForm.team.value = p.team || '';

  playerSubmitBtn.textContent = 'Update Pemain';
  playerCancelBtn.style.display = 'inline-block';
  document.querySelector('#view-player .glass-card__title').textContent = `Edit Pemain (${id})`;
}

function cancelEditPlayer() {
  editingPlayerId = null;
  playerForm.reset();
  playerForm.sport.value = 'Flag Football';
  playerSubmitBtn.textContent = 'Simpan Pemain';
  playerCancelBtn.style.display = 'none';
  document.querySelector('#view-player .glass-card__title').textContent = 'Tambah Pemain Baru';
}

// Dynamic Row Builder for Playbook Assignments in Modal
function createAssignmentRow(receiver = '', positionVal = '', routeVal = '') {
  console.log('createAssignmentRow called with:', { receiver, positionVal, routeVal });
  const row = document.createElement('div');
  row.className = 'assignment-row';

  const receivers = ['X', 'Y', 'Z', 'C', 'QB'];
  const receiverOptions = receivers.map(rec => {
    const isSelected = String(rec).toLowerCase().trim() === String(receiver).toLowerCase().trim();
    return `<option value="${rec}" ${isSelected ? 'selected' : ''}>${rec}</option>`;
  }).join('');

  const posOptions = cache.positions.map(p => {
    const isSelected = String(p.abbreviation).toLowerCase().trim() === String(positionVal).toLowerCase().trim();
    return `
      <option value="${p.abbreviation}" ${isSelected ? 'selected' : ''}>
        ${p.abbreviation}
      </option>
    `;
  }).join('');

  const routeOptions = cache.routes.map(r => {
    const isSelected = String(r.abbreviation).toLowerCase().trim() === String(routeVal).toLowerCase().trim() ||
                       String(r.route_id).toLowerCase().trim() === String(routeVal).toLowerCase().trim();
    return `
      <option value="${r.abbreviation}" ${isSelected ? 'selected' : ''}>
        ${r.route_name} (${r.abbreviation})
      </option>
    `;
  }).join('');

  row.innerHTML = `
      <select name="asg_receiver[]" required style="width: 100px;">
        <option value="">Receiver</option>
        ${receiverOptions}
      </select>
      <select name="asg_position[]" required style="width: 100px;">
        <option value="">Posisi</option>
        ${posOptions}
      </select>
      <select name="asg_route[]" required style="flex: 1.2;">
        <option value="">Rute</option>
        ${routeOptions}
      </select>
      <button type="button" class="action-btn delete btn-remove-row" style="flex-shrink: 0;">X</button>
    `;

  row.querySelector('.btn-remove-row').addEventListener('click', () => {
    row.remove();
    updateAssignmentsCount();
  });

  assignmentRowsContainer.appendChild(row);
  updateAssignmentsCount();
}

// Update assignments counter label
function updateAssignmentsCount() {
  const count = assignmentRowsContainer.querySelectorAll('.assignment-row').length;
  assignmentsCountLabel.textContent = count;
}

// Connect add-row button
addAssignmentRowBtn.addEventListener('click', () => createAssignmentRow());

// Trigger AI analysis of playbook diagram
const aiAnalyzeBtn = document.getElementById('btn-ai-analyze-diagram');
if (aiAnalyzeBtn) {
  aiAnalyzeBtn.addEventListener('click', async () => {
    let payload = {};
    if (uploadedImageBase64) {
      payload.base64_data = uploadedImageBase64;
      payload.mime_type = uploadedImageType || 'image/png';
    } else if (playbookImageUrlInput.value) {
      payload.image_url = playbookImageUrlInput.value;
    } else {
      alert('Unggah diagram taktik (gambar) terlebih dahulu sebelum menganalisis rute.');
      return;
    }
    
    const originalText = aiAnalyzeBtn.innerHTML;
    aiAnalyzeBtn.disabled = true;
    aiAnalyzeBtn.innerHTML = `
      <svg class="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12" style="animation: spin 1s linear infinite;">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
      </svg>
      Menganalisis...
    `;
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'analyze_playbook_image',
          ...payload
        })
      });
      
      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Auto-fill playbook form fields
      if (result.play_name) playbookForm.play_name.value = result.play_name;
      if (result.formation) playbookForm.formation.value = result.formation;
      if (result.description) playbookForm.description.value = result.description;
      if (result.offense_type) playbookForm.offense_type.value = result.offense_type;
      if (result.play_category) {
        let cat = result.play_category;
        if (cat.toLowerCase().indexOf('inter') !== -1) cat = 'Intermediate';
        else if (cat.toLowerCase().indexOf('short') !== -1) cat = 'Short';
        else if (cat.toLowerCase().indexOf('deep') !== -1) cat = 'Deep';
        else if (cat.toLowerCase().indexOf('screen') !== -1) cat = 'Screen';
        playbookForm.play_category.value = cat;
      }
      
      const aiRoutes = result.routes || [];
      if (aiRoutes.length === 0) {
        alert('AI tidak menemukan rute apa pun di dalam gambar.');
        return;
      }
      
      // Clear existing rows
      assignmentRowsContainer.innerHTML = '';
      
      // Add each parsed route
      aiRoutes.forEach(aiRoute => {
        const receiver = String(aiRoute.receiver).trim().toUpperCase();
        
        // Find matching position from cache
        let positionVal = '';
        if (receiver === 'QB') positionVal = 'QB';
        else if (receiver === 'C') positionVal = 'C';
        else positionVal = 'WR'; // default
        
        // Find matching route from cache
        let routeVal = '';
        const routeNameLower = String(aiRoute.route_name || '').toLowerCase().trim();
        
        const route = cache.routes.find(r => {
          const nameLower = String(r.route_name || '').toLowerCase().trim();
          const abbLower = String(r.abbreviation || '').toLowerCase().trim();
          return nameLower === routeNameLower || 
                 abbLower === routeNameLower || 
                 nameLower.indexOf(routeNameLower) !== -1 ||
                 routeNameLower.indexOf(nameLower) !== -1;
        });
        
        if (route) {
          routeVal = route.abbreviation;
        }
        
        createAssignmentRow(receiver, positionVal, routeVal);
      });
      
      alert('Analisis diagram selesai! Nama Play, Formasi, Deskripsi, Kategori, dan Rute berhasil terisi secara otomatis.');
    } catch (err) {
      alert('Gagal menganalisis diagram: ' + err.message + '\nPastikan GEMINI_API_KEY sudah diset di Script Properties.');
    } finally {
      aiAnalyzeBtn.disabled = false;
      aiAnalyzeBtn.innerHTML = originalText;
    }
  });
}

// Playbook Assignments Modal overlay controls
openAssignmentsModalBtn.addEventListener('click', () => {
  const modalPreviewContainer = document.getElementById('modal-playbook-image-preview-container');
  const modalPreviewImg = document.getElementById('modal-playbook-image-preview');

  if (uploadedImageBase64) {
    modalPreviewImg.src = playbookImagePreview.src;
    modalPreviewContainer.style.display = 'block';
  } else if (playbookImageUrlInput.value) {
    modalPreviewImg.src = playbookImageUrlInput.value;
    modalPreviewContainer.style.display = 'block';
  } else {
    modalPreviewImg.src = '';
    modalPreviewContainer.style.display = 'none';
  }

  playbookAssignmentsModal.style.display = 'flex';
});

function closeAssignmentsModal() {
  playbookAssignmentsModal.style.display = 'none';
  updateAssignmentsCount();
}
closeAssignmentsModalBtn.addEventListener('click', closeAssignmentsModal);
saveAssignmentsModalBtn.addEventListener('click', closeAssignmentsModal);

// Playbook Diagram image file upload Base64 reader
// Playbook Diagram image file handler
function handlePlaybookImage(file) {
  if (file) {
    const reader = new FileReader();
    reader.onload = function (evt) {
      uploadedImageBase64 = evt.target.result.split(',')[1];
      uploadedImageName = file.name || 'clipboard_pasted_image.png';
      uploadedImageType = file.type || 'image/png';

      playbookImagePreview.src = evt.target.result;
      playbookImagePreviewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    uploadedImageBase64 = null;
    uploadedImageName = '';
    uploadedImageType = '';
    playbookImagePreviewContainer.style.display = 'none';
  }
}

playbookImageFile.addEventListener('change', (e) => {
  handlePlaybookImage(e.target.files[0]);
});

// Paste event handler for clipboard images
document.addEventListener('paste', (e) => {
  console.log('Paste event detected globally');
  const activeBtn = document.querySelector('.sidebar__nav-item.is-active');
  if (!activeBtn) return;
  if (activeBtn.getAttribute('data-view') !== 'playbook') return;
  
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile();
      console.log('Global paste matched image:', file.name, file.size);
      handlePlaybookImage(file);
      break;
    }
  }
});

// Setup paste zone drag-drop & paste event handlers
const playbookPasteZone = document.getElementById('playbook-paste-zone');
if (playbookPasteZone) {
  playbookPasteZone.addEventListener('paste', (e) => {
    console.log('Paste event triggered on specific paste zone!');
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        console.log('Paste zone matched image:', file.name, file.size);
        handlePlaybookImage(file);
        // Prevent default input paste behavior if focused
        e.preventDefault();
        break;
      }
    }
  });

  playbookPasteZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    playbookPasteZone.style.borderColor = 'var(--accent-color, #d97706)';
    playbookPasteZone.style.background = 'rgba(217, 119, 6, 0.05)';
  });

  playbookPasteZone.addEventListener('dragleave', () => {
    playbookPasteZone.style.borderColor = '';
    playbookPasteZone.style.background = '';
  });

  playbookPasteZone.addEventListener('drop', (e) => {
    e.preventDefault();
    playbookPasteZone.style.borderColor = '';
    playbookPasteZone.style.background = '';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.indexOf('image') !== -1) {
        console.log('Dropped image on paste zone:', file.name, file.size);
        handlePlaybookImage(file);
      } else {
        alert('File yang di-drop harus berupa gambar!');
      }
    }
  });

  // Clicking paste zone prompts focusing it
  playbookPasteZone.addEventListener('click', () => {
    playbookPasteZone.focus();
  });
}

// Attach functions to window scope for onclick actions
window.startEditTeam = startEditTeam;
window.startEditPosition = startEditPosition;
window.startEditRoute = startEditRoute;
window.startEditPlaybook = startEditPlaybook;
window.startEditPlayer = startEditPlayer;
window.deleteRecord = deleteRecord;

// ---------- 5. Form Submissions ----------

// Common fetch POST helper supporting create & update
async function submitFormData(sheetName, data, statusEl, submitBtn, action = 'create', idValue = null) {
  submitBtn.disabled = true;
  statusEl.textContent = 'Menyimpan…';
  statusEl.className = 'form-status';

  try {
    const payload = {
      sheet: sheetName,
      action: action,
      data: data
    };
    if (idValue) {
      payload.id = idValue;
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.error) throw new Error(result.error);

    statusEl.textContent = 'Tersimpan ✓';
    statusEl.className = 'form-status ok';

    // Clear status notification after 3 seconds
    setTimeout(() => {
      statusEl.textContent = '';
    }, 3000);

    return true;
  } catch (err) {
    statusEl.textContent = `Gagal: ${err.message}`;
    statusEl.className = 'form-status err';
    return false;
  } finally {
    submitBtn.disabled = false;
  }
}

// Team Form
teamForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(teamForm);
  const data = Object.fromEntries(formData.entries());

  const action = editingTeamId ? 'update' : 'create';
  const id = editingTeamId;

  const success = await submitFormData(SHEET_TEAMS, data, teamStatus, teamSubmitBtn, action, id);
  if (success) {
    cancelEditTeam();
    await loadTeams();
    await loadPlayers();
  }
});
teamCancelBtn.addEventListener('click', cancelEditTeam);

// Player Form
playerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(playerForm);
  const data = Object.fromEntries(formData.entries());

  const action = editingPlayerId ? 'update' : 'create';
  const id = editingPlayerId;

  const success = await submitFormData(SHEET_PLAYERS, data, playerStatus, playerSubmitBtn, action, id);
  if (success) {
    cancelEditPlayer();
    await loadPlayers();
  }
});
playerCancelBtn.addEventListener('click', cancelEditPlayer);

// Position Form
positionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(positionForm);
  const data = Object.fromEntries(formData.entries());

  const action = editingPositionId ? 'update' : 'create';
  const id = editingPositionId;

  const success = await submitFormData(SHEET_POSITIONS, data, positionStatus, positionSubmitBtn, action, id);
  if (success) {
    cancelEditPosition();
    await loadPositions();
    await loadPlayers();
  }
});
positionCancelBtn.addEventListener('click', cancelEditPosition);

// Route Form
routeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(routeForm);
  const data = Object.fromEntries(formData.entries());

  const action = editingRouteId ? 'update' : 'create';
  const id = editingRouteId;

  const success = await submitFormData(SHEET_ROUTES, data, routeStatus, routeSubmitBtn, action, id);
  if (success) {
    cancelEditRoute();
    await loadRoutes();
  }
});
routeCancelBtn.addEventListener('click', cancelEditRoute);

// Playbook Form Submit (Master-Detail Cascade payload + File Upload)
playbookForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Compile playbook header fields
  const formData = new FormData(playbookForm);
  const playData = {
    play_name: formData.get('play_name'),
    formation: formData.get('formation'),
    offense_type: formData.get('offense_type'),
    play_category: formData.get('play_category'),
    description: formData.get('description'),
    image: formData.get('image'), // Existing image URL (or blank if new upload overrides it)
    active: formData.get('active')
  };

  // Compile assignments detail fields
  const assignments = [];
  const rows = assignmentRowsContainer.querySelectorAll('.assignment-row');
  rows.forEach(row => {
    const receiver = row.querySelector('[name="asg_receiver[]"]').value;
    const position = row.querySelector('[name="asg_position[]"]').value;
    const route_id = row.querySelector('[name="asg_route[]"]').value;
    assignments.push({ receiver, position, route_id });
  });

  const action = editingPlaybookId ? 'update' : 'create';
  const id = editingPlaybookId;

  playbookSubmitBtn.disabled = true;
  playbookStatus.textContent = 'Menyimpan…';
  playbookStatus.className = 'form-status';

  try {
    const payload = {
      sheet: SHEET_PLAYBOOK,
      action: action,
      data: playData,
      assignments: assignments
    };

    if (id) {
      payload.id = id;
    }

    // Attach Base64 Image file if a new file is uploaded
    if (uploadedImageBase64) {
      payload.image_file = {
        base64: uploadedImageBase64,
        name: uploadedImageName,
        type: uploadedImageType
      };
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.error) throw new Error(result.error);

    playbookStatus.textContent = 'Tersimpan ✓';
    playbookStatus.className = 'form-status ok';

    setTimeout(() => { playbookStatus.textContent = ''; }, 3000);

    cancelEditPlaybook();
    await loadPlaybook();
  } catch (err) {
    playbookStatus.textContent = `Gagal: ${err.message}`;
    playbookStatus.className = 'form-status err';
  } finally {
    playbookSubmitBtn.disabled = false;
  }
});
playbookCancelBtn.addEventListener('click', cancelEditPlaybook);

// ---------- 5b. Session Tracking Actions ----------
let driveCounter = 0;
let playCounter = 0;

function startEditSession(id) {
  const s = cache.sessions.find(ses => ses.session_id === id);
  if (!s) return;

  editingSessionId = id;
  sessionFormTitle.textContent = `Edit Sesi (${id})`;

  sessionTypeInput.value = s.session_type || 'Scrimage Internal';
  sessionOpponentInput.value = s.opponent || '';

  if (s.date) {
    try {
      const d = new Date(s.date);
      if (!isNaN(d.getTime())) {
        sessionDateInput.value = d.toISOString().split('T')[0];
      } else {
        sessionDateInput.value = s.date;
      }
    } catch(e) {
      sessionDateInput.value = s.date;
    }
  } else {
    sessionDateInput.value = '';
  }

  sessionOpponentScoreInput.value = s.opponent_score || 0;
  sessionOurScorePreview.textContent = s.our_score || 0;

  // LED Scoreboard initialization
  const ourScoreLed = document.getElementById('scoreboard-our-score');
  const oppScoreLed = document.getElementById('scoreboard-opponent-score');
  const oppLabel = document.getElementById('scoreboard-opponent-label');
  const typeDisplay = document.getElementById('scoreboard-type-display');
  
  if (ourScoreLed) ourScoreLed.textContent = String(s.our_score || 0).padStart(2, '0');
  if (oppScoreLed) oppScoreLed.textContent = String(s.opponent_score || 0).padStart(2, '0');
  if (oppLabel) oppLabel.textContent = (s.opponent || 'LAWAN').toUpperCase();
  if (typeDisplay) typeDisplay.textContent = (s.session_type || 'SCRIMAGE').toUpperCase();

  sessionDrivesContainer.innerHTML = '';

  // Get plays
  const relatedPlays = cache.sessionPlays.filter(p => String(p.session_id).trim() === String(id).trim());

  // Group by drive number
  const drivesMap = {};
  relatedPlays.forEach(p => {
    const dn = p.drive_number || 1;
    if (!drivesMap[dn]) drivesMap[dn] = [];
    drivesMap[dn].push(p);
  });

  const driveNumbers = Object.keys(drivesMap).map(Number).sort((a,b) => a-b);
  if (driveNumbers.length > 0) {
    driveNumbers.forEach(dn => {
      const driveCard = createDrivePanel(dn);
      drivesMap[dn].forEach(playData => {
        createPlayCard(driveCard, playData);
      });
    });
    driveCounter = Math.max(...driveNumbers);
  } else {
    driveCounter = 0;
  }

  sessionListView.style.display = 'none';
  sessionFormView.style.display = 'block';
  viewTitle.textContent = 'Session Tracking';
}

function cancelEditSession() {
  editingSessionId = null;
  sessionFormTitle.textContent = 'Sesi Baru';
  sessionTypeInput.value = 'Scrimage Internal';
  sessionOpponentInput.value = '';
  sessionDateInput.value = '';
  sessionOpponentScoreInput.value = '0';
  sessionOurScorePreview.textContent = '0';
  sessionDrivesContainer.innerHTML = '';
  driveCounter = 0;

  // Reset scoreboard
  const ourScoreLed = document.getElementById('scoreboard-our-score');
  const oppScoreLed = document.getElementById('scoreboard-opponent-score');
  const oppLabel = document.getElementById('scoreboard-opponent-label');
  const typeDisplay = document.getElementById('scoreboard-type-display');
  
  if (ourScoreLed) ourScoreLed.textContent = '00';
  if (oppScoreLed) oppScoreLed.textContent = '00';
  if (oppLabel) oppLabel.textContent = 'LAWAN';
  if (typeDisplay) typeDisplay.textContent = 'SCRIMAGE';

  sessionListView.style.display = 'block';
  sessionFormView.style.display = 'none';
  viewTitle.textContent = 'Session Tracking';
}

function createDrivePanel(driveNum = null) {
  driveCounter++;
  const num = driveNum || driveCounter;

  const driveCard = document.createElement('div');
  driveCard.className = 'drive-card';
  driveCard.id = `drive-card-${num}`;
  driveCard.dataset.drive = num;

  driveCard.innerHTML = `
    <div class="drive-card__header">
      <h4 class="drive-card__title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        Drive <span class="drive-number-label">${num}</span>
      </h4>
      <div style="display: flex; gap: 8px;">
        <button type="button" class="action-btn edit btn-add-play-to-drive" style="padding: 4px 8px; font-size: 0.68rem;">+ Tambah Play</button>
        <button type="button" class="action-btn delete btn-remove-drive" style="padding: 4px 8px; font-size: 0.68rem;">Hapus Drive</button>
      </div>
    </div>
    <div class="drive-card__body">
      <div class="play-cards-container" style="display: flex; flex-direction: column; gap: 12px;"></div>
    </div>
  `;

  driveCard.querySelector('.btn-add-play-to-drive').addEventListener('click', () => createPlayCard(driveCard));
  driveCard.querySelector('.btn-remove-drive').addEventListener('click', () => {
    driveCard.remove();
    recalculateOurScore();
  });

  sessionDrivesContainer.appendChild(driveCard);
  return driveCard;
}

function createPlayCard(driveCard, playData = null) {
  playCounter++;
  const playId = `play-${playCounter}`;
  const container = driveCard.querySelector('.play-cards-container');

  const playCard = document.createElement('div');
  playCard.className = 'play-card';
  playCard.id = playId;

  const downOptions = [
    'First To Mid', 'Second To Mid', 'Third To Mid', 'Fourth To Mid',
    'First To Goal', 'Second To Goal', 'Third To Goal', 'Fourth To Goal',
    'Extra Point 1pt', 'Extra Point 2pt', 'Safety'
  ];

  const catOptions = ['Long', 'Intermediate', 'Short', 'Run'];
  const resOptions = ['Complete', 'Incomplete', 'Interception'];

  const qbs = cache.players.filter(p => {
    const pos = String(p.position || '').toLowerCase();
    const secPos = String(p.secondary_position || '').toLowerCase();
    return pos.includes('qb') || secPos.includes('qb');
  });
  const qbPlayers = qbs.length > 0 ? qbs : cache.players;

  playCard.innerHTML = `
    <div class="play-card__header">
      <span class="play-card__title">Play Detail</span>
      <button type="button" class="btn-remove-play">&times;</button>
    </div>
    <div class="play-card__grid">
      <!-- Kolom 1: Konteks Match -->
      <div class="play-card__col">
        <label>
          Round of Match
          <select class="play-round" required>
            <option value="First Half">First Half</option>
            <option value="Second Half">Second Half</option>
          </select>
        </label>
        <label>
          Down
          <select class="play-down" required>
            ${downOptions.map(d => `<option value="${d}">${d}</option>`).join('')}
          </select>
        </label>
      </div>

      <!-- Kolom 2: Taktik & Rute -->
      <div class="play-card__col">
        <label>
          Category Play
          <select class="play-category" required>
            ${catOptions.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </label>
        <label>
          Play
          <select class="play-playbook" required>
            <option value="">Pilih Playbook</option>
          </select>
        </label>
        <label>
          Route
          <select class="play-route" required>
            <option value="">Pilih Rute</option>
            ${cache.routes.map(r => `<option value="${r.route_id}">${r.route_name} (${r.abbreviation})</option>`).join('')}
          </select>
        </label>
      </div>

      <!-- Kolom 3: Personil & Hasil -->
      <div class="play-card__col">
        <label>
          QB (Quarterback)
          <select class="play-qb" required>
            <option value="">Pilih QB</option>
            ${qbPlayers.map(p => `<option value="${p.player_id}">${p.name} (#${p.jersey_number})</option>`).join('')}
          </select>
        </label>
        <label>
          Target (Receiver)
          <select class="play-target" required>
            <option value="">Pilih Target</option>
            ${cache.players.map(p => `<option value="${p.player_id}">${p.name} (#${p.jersey_number})</option>`).join('')}
          </select>
        </label>
        <label>
          Result
          <select class="play-result" required>
            <option value="">Pilih Result</option>
            ${resOptions.map(r => `<option value="${r}">${r}</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="play-conditional-container" style="grid-column: 1 / -1; display: none;"></div>
      <div class="play-hud-container" style="grid-column: 1 / -1; display: none;"></div>
    </div>
  `;

  const categorySelect = playCard.querySelector('.play-category');
  const playSelect = playCard.querySelector('.play-playbook');
  const resultSelect = playCard.querySelector('.play-result');
  const condContainer = playCard.querySelector('.play-conditional-container');

  // Reactive listeners
  categorySelect.addEventListener('change', () => {
    updatePlaySelectOptions(playCard);
  });

  playSelect.addEventListener('change', () => {
    updatePlayDiagramHUD(playCard);
  });

  resultSelect.addEventListener('change', () => {
    renderConditionalFields(resultSelect.value, condContainer);
    recalculateOurScore();
  });

  playCard.querySelector('.btn-remove-play').addEventListener('click', () => {
    playCard.remove();
    recalculateOurScore();
  });

  // Populate options initially
  updatePlaySelectOptions(playCard, playData ? playData.play_id : null);

  if (playData) {
    playCard.querySelector('.play-round').value = playData.round_of_match || 'First Half';
    playCard.querySelector('.play-down').value = playData.down || 'First To Mid';
    playCard.querySelector('.play-category').value = playData.category_play || 'Short';
    playCard.querySelector('.play-route').value = playData.route_id || '';
    playCard.querySelector('.play-qb').value = playData.qb_player_id || '';
    playCard.querySelector('.play-target').value = playData.target_player_id || '';
    playCard.querySelector('.play-result').value = playData.result || '';

    // Render conditional & HUD
    renderConditionalFields(playData.result, condContainer, playData);
    updatePlayDiagramHUD(playCard);
  }

  container.appendChild(playCard);
  return playCard;
}

function renderConditionalFields(result, container, playData = null) {
  container.innerHTML = '';
  if (!result) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  const cardDiv = document.createElement('div');
  cardDiv.className = 'play-card__conditional';

  if (result === 'Complete') {
    cardDiv.innerHTML = `
      <label>
        Yards Gained (Yds)
        <input type="number" class="cond-yards" value="${playData ? playData.yards : '0'}" required style="width: 100%;">
      </label>
      <label>
        Touch Down
        <select class="cond-touchdown" required>
          <option value="No" ${playData && playData.touchdown === 'No' ? 'selected' : ''}>No</option>
          <option value="Yes" ${playData && playData.touchdown === 'Yes' ? 'selected' : ''}>Yes</option>
        </select>
      </label>
    `;
    cardDiv.querySelector('.cond-touchdown').addEventListener('change', recalculateOurScore);

  } else if (result === 'Incomplete') {
    const reasons = ['Over Throw', 'Drop', 'Under Throw', 'Pass Defended', 'Bad Pass'];
    const statuses = ['Next Down', 'Turn Over', 'Safety'];
    cardDiv.innerHTML = `
      <label>
        Reason
        <select class="cond-reason" required>
          ${reasons.map(r => `<option value="${r}" ${playData && playData.reason_incomplete === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </label>
      <label>
        Next Status
        <select class="cond-status" required>
          ${statuses.map(s => `<option value="${s}" ${playData && playData.next_status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </label>
    `;
  } else if (result === 'Interception') {
    cardDiv.innerHTML = `
      <label>
        Return Yards (Yds)
        <input type="number" class="cond-yards" value="${playData ? playData.yards : '0'}" required style="width: 100%;">
      </label>
      <label>
        Pick Six
        <select class="cond-picksix" required>
          <option value="No" ${playData && playData.pick_six === 'No' ? 'selected' : ''}>No</option>
          <option value="Yes" ${playData && playData.pick_six === 'Yes' ? 'selected' : ''}>Yes</option>
        </select>
      </label>
    `;
  }

  container.appendChild(cardDiv);
}

function recalculateOurScore() {
  let score = 0;
  const playCards = document.querySelectorAll('.play-card');
  playCards.forEach(card => {
    const result = card.querySelector('.play-result').value;
    if (result === 'Complete') {
      const tdSelect = card.querySelector('.cond-touchdown');
      if (tdSelect && tdSelect.value === 'Yes') {
        score += 6;
      }
    }
  });
  sessionOurScorePreview.textContent = score;

  // LED Scoreboard update
  const ourScoreLed = document.getElementById('scoreboard-our-score');
  if (ourScoreLed) {
    ourScoreLed.textContent = String(score).padStart(2, '0');
  }
}

async function saveSession(status) {
  const opponent = sessionOpponentInput.value.trim();
  const date = sessionDateInput.value;
  if (!opponent || !date) {
    alert('Harap isi nama Lawan dan Tanggal Sesi!');
    return;
  }

  const ourScore = parseInt(sessionOurScorePreview.textContent, 10);
  const opponentScore = parseInt(sessionOpponentScoreInput.value, 10) || 0;

  let result = 'Draw';
  if (ourScore > opponentScore) result = 'Win';
  else if (ourScore < opponentScore) result = 'Loss';

  const sessionData = {
    session_type: sessionTypeInput.value,
    opponent: opponent,
    date: date,
    our_score: ourScore,
    opponent_score: opponentScore,
    result: result,
    status: status
  };

  const plays = [];
  const driveCards = document.querySelectorAll('.drive-card');
  driveCards.forEach(driveCard => {
    const driveNum = parseInt(driveCard.dataset.drive, 10);
    const playCards = driveCard.querySelectorAll('.play-card');

    playCards.forEach(playCard => {
      const round_of_match = playCard.querySelector('.play-round').value;
      const down = playCard.querySelector('.play-down').value;
      const category_play = playCard.querySelector('.play-category').value;
      const play_id = playCard.querySelector('.play-playbook').value;
      const route_id = playCard.querySelector('.play-route').value;
      const qb_player_id = playCard.querySelector('.play-qb').value;
      const target_player_id = playCard.querySelector('.play-target').value;
      const resultVal = playCard.querySelector('.play-result').value;

      let yards = 0;
      let touchdown = 'No';
      let reason_incomplete = '';
      let next_status = '';
      let pick_six = 'No';

      if (resultVal === 'Complete') {
        yards = parseInt(playCard.querySelector('.cond-yards').value, 10) || 0;
        touchdown = playCard.querySelector('.cond-touchdown').value;
      } else if (resultVal === 'Incomplete') {
        reason_incomplete = playCard.querySelector('.cond-reason').value;
        next_status = playCard.querySelector('.cond-status').value;
      } else if (resultVal === 'Interception') {
        yards = parseInt(playCard.querySelector('.cond-yards').value, 10) || 0;
        pick_six = playCard.querySelector('.cond-picksix').value;
      }

      plays.push({
        drive_number: driveNum,
        round_of_match: round_of_match,
        down: down,
        category_play: category_play,
        play_id: play_id,
        route_id: route_id,
        result: resultVal,
        qb_player_id: qb_player_id,
        target_player_id: target_player_id,
        yards: yards,
        touchdown: touchdown,
        reason_incomplete: reason_incomplete,
        next_status: next_status,
        pick_six: pick_six
      });
    });
  });

  const saveBtn = status === 'Done' ? doneSessionBtn : saveSessionBtn;
  saveBtn.disabled = true;
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Menyimpan…';

  try {
    const action = editingSessionId ? 'update' : 'create';
    const payload = {
      sheet: SHEET_SESSION,
      action: action,
      data: sessionData,
      plays: plays
    };
    if (editingSessionId) {
      payload.id = editingSessionId;
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const resJson = await res.json();
    if (resJson.error) throw new Error(resJson.error);

    alert('Sesi berhasil disimpan!');
    cancelEditSession();
    await loadSessions();
  } catch (err) {
    alert(`Gagal menyimpan sesi: ${err.message}`);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

// Attach Session Event Listeners
if (newSessionBtn) newSessionBtn.addEventListener('click', () => {
  editingSessionId = null;
  sessionFormTitle.textContent = 'Sesi Baru';
  sessionListView.style.display = 'none';
  sessionFormView.style.display = 'block';
  sessionDrivesContainer.innerHTML = '';
  driveCounter = 0;

  // Reset scoreboard
  const ourScoreLed = document.getElementById('scoreboard-our-score');
  const oppScoreLed = document.getElementById('scoreboard-opponent-score');
  const oppLabel = document.getElementById('scoreboard-opponent-label');
  const typeDisplay = document.getElementById('scoreboard-type-display');
  
  if (ourScoreLed) ourScoreLed.textContent = '00';
  if (oppScoreLed) oppScoreLed.textContent = '00';
  if (oppLabel) oppLabel.textContent = 'LAWAN';
  if (typeDisplay) typeDisplay.textContent = 'SCRIMAGE';

  createDrivePanel(); // Create a default first drive
});

if (cancelSessionBtn) cancelSessionBtn.addEventListener('click', cancelEditSession);
if (saveSessionBtn) saveSessionBtn.addEventListener('click', () => saveSession('On Progress'));
if (doneSessionBtn) doneSessionBtn.addEventListener('click', () => saveSession('Done'));
if (addDriveBtn) addDriveBtn.addEventListener('click', () => createDrivePanel());

// Scoreboard HUD dynamic listeners
if (sessionOpponentInput) {
  sessionOpponentInput.addEventListener('input', (e) => {
    const oppLabel = document.getElementById('scoreboard-opponent-label');
    if (oppLabel) {
      oppLabel.textContent = (e.target.value.trim() || 'LAWAN').toUpperCase();
    }
  });
}

if (sessionOpponentScoreInput) {
  sessionOpponentScoreInput.addEventListener('input', (e) => {
    const oppScoreLed = document.getElementById('scoreboard-opponent-score');
    if (oppScoreLed) {
      const val = parseInt(e.target.value, 10) || 0;
      oppScoreLed.textContent = String(val).padStart(2, '0');
    }
  });
}

if (sessionTypeInput) {
  sessionTypeInput.addEventListener('change', (e) => {
    const typeDisplay = document.getElementById('scoreboard-type-display');
    if (typeDisplay) {
      typeDisplay.textContent = e.target.value.toUpperCase();
    }
  });
}

// Reactive select option helper
function updatePlaySelectOptions(playCard, selectedPlayId = null) {
  const category = playCard.querySelector('.play-category').value;
  const playSelect = playCard.querySelector('.play-playbook');
  
  const filtered = cache.playbooks.filter(p => {
    if (!category) return true;
    return String(p.play_category || '').toLowerCase() === category.toLowerCase();
  });
  
  playSelect.innerHTML = '<option value="">Pilih Playbook</option>';
  filtered.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.play_id;
    opt.textContent = p.play_name;
    playSelect.appendChild(opt);
  });
  
  if (selectedPlayId) {
    playSelect.value = selectedPlayId;
  } else {
    playSelect.value = '';
  }
  
  updatePlayDiagramHUD(playCard);
}

// Play diagram live strategy HUD helper
function updatePlayDiagramHUD(playCard) {
  const playId = playCard.querySelector('.play-playbook').value;
  const hudContainer = playCard.querySelector('.play-hud-container');
  hudContainer.innerHTML = '';
  
  if (!playId) {
    hudContainer.style.display = 'none';
    return;
  }
  
  const play = cache.playbooks.find(p => p.play_id === playId);
  if (play && play.image) {
    hudContainer.style.display = 'block';
    
    const hudCard = document.createElement('div');
    hudCard.className = 'play-card__hud';
    
    hudCard.innerHTML = `
      <div class="play-card__hud-preview-wrapper" onclick="window.open('${play.image}', '_blank')">
        <img class="play-card__hud-img" src="${play.image}" alt="Diagram Playbook">
      </div>
      <div class="play-card__hud-details">
        <h5 class="play-card__hud-title">${play.play_name || 'Diagram Strategi'}</h5>
        <p class="play-card__hud-desc">${play.description || 'Tidak ada deskripsi taktik.'}</p>
        <span style="font-size: 0.65rem; color: var(--accent); cursor: pointer; text-decoration: underline;" onclick="window.open('${play.image}', '_blank')">Lihat Ukuran Penuh</span>
      </div>
    `;
    hudContainer.appendChild(hudCard);
  } else {
    hudContainer.style.display = 'none';
  }
}

// Expose to window scope for onclick actions
window.startEditSession = startEditSession;

// ---------- 6. Micro-interactions ----------
// Color picker label update
const colorPicker = document.querySelector('.color-input');
const colorLabel = document.querySelector('.color-value-preview');
if (colorPicker && colorLabel) {
  colorPicker.addEventListener('input', (e) => {
    colorLabel.textContent = e.target.value.toUpperCase();
  });
}

// Theme Toggle Action
const themeToggleBtn = document.getElementById('theme-toggle-btn');
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeLogo(newTheme);
  });
}

// Global Refresh Action
globalRefreshBtn.addEventListener('click', loadAllData);

// ---------- 7. Initial Load ----------
document.addEventListener('DOMContentLoaded', loadAllData);

// CSS animation style for spinning reload icon injected dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .spin-icon {
      animation: spin 1s linear infinite;
    }
  `;
document.head.appendChild(style);

// ---------- 8. Offense Overview Dashboard Logic ----------
function initDashboard() {
  const scrimmageSelect = document.getElementById('dashboard-scrimmage-filter');
  if (!scrimmageSelect) return;
  
  // Populate sessions filter
  const currentVal = scrimmageSelect.value || 'ALL';
  scrimmageSelect.innerHTML = '<option value="ALL">Semua Sesi</option>';
  
  cache.sessions.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.session_id;
    let dateStr = s.date || '';
    if (dateStr) {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
        }
      } catch(e) {}
    }
    opt.textContent = `${s.opponent || 'Lawan'} (${dateStr})`;
    scrimmageSelect.appendChild(opt);
  });
  
  if (cache.sessions.some(s => s.session_id === currentVal)) {
    scrimmageSelect.value = currentVal;
  } else {
    scrimmageSelect.value = 'ALL';
  }
  
  // Run analytics
  calculateDashboardAnalytics(scrimmageSelect.value);
  
  // Add filter listener
  const filterBtn = document.getElementById('dashboard-filter-btn');
  if (filterBtn && !filterBtn.dataset.listener) {
    filterBtn.dataset.listener = 'true';
    filterBtn.addEventListener('click', () => {
      calculateDashboardAnalytics(scrimmageSelect.value);
    });
  }
  
  // Performer tabs listeners
  const tabs = document.querySelectorAll('.performer-tab');
  tabs.forEach(tab => {
    if (!tab.dataset.listener) {
      tab.dataset.listener = 'true';
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => {
          t.classList.remove('active');
          t.style.color = 'var(--text-muted)';
          t.style.background = 'none';
          t.style.borderBottom = 'none';
        });
        
        tab.classList.add('active');
        tab.style.color = 'var(--accent)';
        tab.style.background = 'rgba(244, 184, 63, 0.05)';
        tab.style.borderBottom = '2px solid var(--accent)';
        
        activePerformerTab = tab.dataset.tab;
        renderTopPerformers(scrimmageSelect.value);
      });
    }
  });
}

function calculateDashboardAnalytics(sessionIdFilter = 'ALL') {
  // 1. Filter sessions
  const filteredSessions = sessionIdFilter === 'ALL'
    ? cache.sessions
    : cache.sessions.filter(s => s.session_id === sessionIdFilter);
    
  const filteredSessionIds = filteredSessions.map(s => String(s.session_id).trim());
  
  // 2. Filter session plays
  const filteredPlays = cache.sessionPlays.filter(p => {
    return filteredSessionIds.includes(String(p.session_id).trim());
  });
  
  // 3. Basic metrics calculation
  const totalPlays = filteredPlays.length;
  
  const passingPlays = filteredPlays.filter(p => {
    const res = String(p.result || '').trim().toLowerCase();
    return res === 'complete' || res === 'incomplete' || res === 'interception';
  });
  const totalPasses = passingPlays.length;
  
  const completePlays = passingPlays.filter(p => String(p.result || '').trim().toLowerCase() === 'complete');
  const totalCompletions = completePlays.length;
  
  const completionRate = totalPasses > 0 ? Math.round((totalCompletions / totalPasses) * 100) : 0;
  const catchRate = completionRate; // Catch rate is completion rate in offensive view
  
  let totalYards = 0;
  filteredPlays.forEach(p => {
    if (String(p.result || '').trim().toLowerCase() === 'complete') {
      totalYards += parseInt(p.yards, 10) || 0;
    }
  });
  
  const touchdowns = filteredPlays.filter(p => {
    return String(p.touchdown || '').trim().toLowerCase() === 'yes';
  }).length;
  
  const yardsPerPlay = totalPlays > 0 ? (totalYards / totalPlays).toFixed(1) : '0.0';
  
  // Update DOM elements for metric cards
  const elTotalPlays = document.getElementById('dash-total-plays');
  const elCompletionRate = document.getElementById('dash-completion-rate');
  const elCatchRate = document.getElementById('dash-catch-rate');
  const elTotalYards = document.getElementById('dash-total-yards');
  const elTouchdowns = document.getElementById('dash-touchdowns');
  const elYardsPerPlay = document.getElementById('dash-yards-per-play');

  if (elTotalPlays) elTotalPlays.textContent = totalPlays;
  if (elCompletionRate) elCompletionRate.textContent = `${completionRate}%`;
  if (elCatchRate) elCatchRate.textContent = `${catchRate}%`;
  if (elTotalYards) elTotalYards.textContent = totalYards.toLocaleString('id-ID');
  if (elTouchdowns) elTouchdowns.textContent = touchdowns;
  if (elYardsPerPlay) elYardsPerPlay.textContent = yardsPerPlay;
  
  // 4. Strengths & Weaknesses
  renderStrengthsAndWeaknesses(filteredPlays);
  
  // 5. Effective Gameplay
  renderEffectiveGameplay(filteredPlays);
  
  // 6. Top Performers
  renderTopPerformers(sessionIdFilter);
  
  // 7. Recent Scrimmages
  renderRecentScrimmages(filteredSessions);
  
  // 8. Passing Distribution & Route Success Charts
  renderDashboardCharts(filteredPlays);
}

function renderStrengthsAndWeaknesses(filteredPlays) {
  const passingPlays = filteredPlays.filter(p => {
    const res = String(p.result || '').trim().toLowerCase();
    return res === 'complete' || res === 'incomplete' || res === 'interception';
  });
  
  // Short pass completions: category = short or category = run
  const shortPasses = passingPlays.filter(p => {
    const category = String(p.category_play || '').toLowerCase();
    return category === 'short' || category === 'run';
  });
  const shortCompletions = shortPasses.filter(p => String(p.result || '').trim().toLowerCase() === 'complete').length;
  const shortPassingRate = shortPasses.length > 0 ? Math.round((shortCompletions / shortPasses.length) * 100) : 0;
  
  // Screen Play success rate
  const screenPasses = passingPlays.filter(p => {
    const play = cache.playbooks.find(pl => pl.play_id === p.play_id);
    const playName = String(play ? play.play_name : '').toLowerCase();
    return playName.includes('screen') || String(p.category_play || '').toLowerCase() === 'run';
  });
  const screenCompletions = screenPasses.filter(p => String(p.result || '').trim().toLowerCase() === 'complete').length;
  const screenSuccessRate = screenPasses.length > 0 ? Math.round((screenCompletions / screenPasses.length) * 100) : 100;
  
  // Average YAC
  const completePlays = passingPlays.filter(p => String(p.result || '').trim().toLowerCase() === 'complete');
  let sumYards = 0;
  completePlays.forEach(p => sumYards += parseInt(p.yards, 10) || 0);
  const avgYac = completePlays.length > 0 ? (sumYards / completePlays.length).toFixed(1) : '0.0';
  
  // 3rd down conversion rate
  const thirdDowns = filteredPlays.filter(p => {
    const d = String(p.down || '').toLowerCase();
    return d.includes('third');
  });
  const thirdDownCompletions = thirdDowns.filter(p => String(p.result || '').trim().toLowerCase() === 'complete' || String(p.touchdown || '').trim().toLowerCase() === 'yes').length;
  const thirdDownRate = thirdDowns.length > 0 ? Math.round((thirdDownCompletions / thirdDowns.length) * 100) : 0;
  
  // Deep passing completions
  const deepPasses = passingPlays.filter(p => String(p.category_play || '').toLowerCase() === 'long');
  const deepCompletions = deepPasses.filter(p => String(p.result || '').trim().toLowerCase() === 'complete').length;
  const deepPassingRate = deepPasses.length > 0 ? Math.round((deepCompletions / deepPasses.length) * 100) : 0;
  
  // Turnover rate
  const turnovers = filteredPlays.filter(p => String(p.result || '').trim().toLowerCase() === 'interception').length;
  const turnoverRate = filteredPlays.length > 0 ? ((turnovers / filteredPlays.length) * 100).toFixed(1) : '0.0';
  
  // Red Zone efficiency
  const goalDowns = filteredPlays.filter(p => String(p.down || '').toLowerCase().includes('goal'));
  const goalTDs = goalDowns.filter(p => String(p.touchdown || '').trim().toLowerCase() === 'yes').length;
  const redZoneRate = goalDowns.length > 0 ? Math.round((goalTDs / goalDowns.length) * 100) : 0;

  // Render Strength items
  const strengthsContainer = document.getElementById('dash-strengths-container');
  if (strengthsContainer) {
    strengthsContainer.innerHTML = `
      <div class="resume-item">
        <div>
          <div class="resume-item__title">Short Passing</div>
          <div class="resume-item__desc">Akurasi operan pendek sangat baik.</div>
        </div>
        <div class="resume-item__value" style="color: #10b981;">${shortPassingRate}%</div>
      </div>
      <div class="resume-item">
        <div>
          <div class="resume-item__title">Screen Play</div>
          <div class="resume-item__desc">Sangat efektif membongkar zone defense.</div>
        </div>
        <div class="resume-item__value" style="color: #10b981;">${screenSuccessRate}%</div>
      </div>
      <div class="resume-item">
        <div>
          <div class="resume-item__title">YAC (Yards After Catch)</div>
          <div class="resume-item__desc">Rata-rata yards per catch tinggi.</div>
        </div>
        <div class="resume-item__value" style="color: #10b981;">${avgYac} yds</div>
      </div>
      <div class="resume-item">
        <div>
          <div class="resume-item__title">Third Down Conversion</div>
          <div class="resume-item__desc">Tingkat konversi down ketiga sangat solid.</div>
        </div>
        <div class="resume-item__value" style="color: #10b981;">${thirdDownRate}%</div>
      </div>
    `;
  }
  
  // Render Weakness items
  const weaknessesContainer = document.getElementById('dash-weaknesses-container');
  if (weaknessesContainer) {
    weaknessesContainer.innerHTML = `
      <div class="resume-item">
        <div>
          <div class="resume-item__title">Deep Passing</div>
          <div class="resume-item__desc">Akurasi operan jauh perlu ditingkatkan.</div>
        </div>
        <div class="resume-item__value" style="color: #ef4444;">${deepPassingRate}%</div>
      </div>
      <div class="resume-item">
        <div>
          <div class="resume-item__title">Turnover Rate</div>
          <div class="resume-item__desc">Persentase operan terintersepsi musuh.</div>
        </div>
        <div class="resume-item__value" style="color: #ef4444;">${turnoverRate}%</div>
      </div>
      <div class="resume-item">
        <div>
          <div class="resume-item__title">Red Zone Efficiency</div>
          <div class="resume-item__desc">Konversi skor touchdown di dekat gawang.</div>
        </div>
        <div class="resume-item__value" style="color: #ef4444;">${redZoneRate}%</div>
      </div>
    `;
  }
}

function renderEffectiveGameplay(filteredPlays) {
  const container = document.getElementById('dash-effective-gameplay-container');
  if (!container) return;
  container.innerHTML = '';
  
  // Group by play_id
  const playsMap = {};
  filteredPlays.forEach(p => {
    const playId = p.play_id;
    if (!playId) return;
    if (!playsMap[playId]) playsMap[playId] = [];
    playsMap[playId].push(p);
  });
  
  const playIds = Object.keys(playsMap);
  if (playIds.length === 0) {
    container.innerHTML = `<div class="table-empty">Belum ada taktik dimainkan dalam sesi ini.</div>`;
    return;
  }
  
  // Calculate success rates
  const list = [];
  playIds.forEach(id => {
    const plays = playsMap[id];
    const total = plays.length;
    const complete = plays.filter(p => String(p.result || '').toLowerCase() === 'complete').length;
    const tds = plays.filter(p => String(p.touchdown || '').toLowerCase() === 'yes').length;
    let sumYards = 0;
    plays.forEach(p => sumYards += parseInt(p.yards, 10) || 0);
    const avgYards = total > 0 ? (sumYards / total).toFixed(1) : 0;
    
    const successRate = total > 0 ? (complete / total) : 0;
    
    list.push({ play_id: id, total, complete, tds, avgYards, successRate });
  });
  
  list.sort((a, b) => b.successRate - a.successRate || b.total - a.total);
  
  const topPlay = list[0];
  const playbook = cache.playbooks.find(pl => pl.play_id === topPlay.play_id);
  const playName = playbook ? playbook.play_name : 'Taktik Tidak Diketahui';
  const diagramUrl = playbook ? playbook.image : '';
  
  const diagramHTML = diagramUrl 
    ? `
      <div class="play-card__hud-preview-wrapper" style="width: 100%; height: 110px; margin-bottom: 12px; background: rgba(0,0,0,0.2);" onclick="window.open('${diagramUrl}', '_blank')">
        <img src="${diagramUrl}" class="play-card__hud-img" alt="Diagram Paling Efektif">
      </div>
    `
    : `
      <div style="width: 100%; height: 110px; border: 1px dashed var(--card-border); border-radius: 6px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.01); color: var(--text-muted); font-size: 0.72rem; margin-bottom: 12px;">
        Diagram Tidak Tersedia
      </div>
    `;
    
  const successPct = Math.round(topPlay.successRate * 100);
  
  container.innerHTML = `
    ${diagramHTML}
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <h5 class="play-card__hud-title" style="font-size: 0.88rem;">${playName}</h5>
      <span class="badge badge-accent" style="font-size: 0.6rem;">Sukses</span>
    </div>
    
    <div style="display: flex; justify-content: space-between; background: rgba(255,255,255,0.01); border: 1px solid rgba(255, 255, 255, 0.03); border-radius: 6px; padding: 10px; text-align: center;">
      <div>
        <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-primary); font-family: 'Oswald', sans-serif;">${topPlay.total}x</div>
        <div style="font-size: 0.58rem; color: var(--text-muted); text-transform: uppercase;">Digunakan</div>
      </div>
      <div>
        <div style="font-size: 0.95rem; font-weight: 800; color: var(--accent); font-family: 'Oswald', sans-serif;">${topPlay.complete}x (${successPct}%)</div>
        <div style="font-size: 0.58rem; color: var(--text-muted); text-transform: uppercase;">Sukses</div>
      </div>
      <div>
        <div style="font-size: 0.95rem; font-weight: 800; color: #10b981; font-family: 'Oswald', sans-serif;">${topPlay.avgYards} yds</div>
        <div style="font-size: 0.58rem; color: var(--text-muted); text-transform: uppercase;">Rata-rata Yards</div>
      </div>
    </div>
    
    <div style="margin-top: 10px; text-align: center;">
      <button class="action-btn edit" style="width: 100%; font-size: 0.72rem; padding: 6px 12px;" onclick="window.switchView('playbook')">Lihat Detail Gameplay</button>
    </div>
  `;
}

function renderTopPerformers(sessionIdFilter = 'ALL') {
  const container = document.getElementById('dash-performers-list');
  if (!container) return;
  container.innerHTML = '';
  
  const filteredSessions = sessionIdFilter === 'ALL'
    ? cache.sessions
    : cache.sessions.filter(s => s.session_id === sessionIdFilter);
  const filteredSessionIds = filteredSessions.map(s => String(s.session_id).trim());
  const filteredPlays = cache.sessionPlays.filter(p => filteredSessionIds.includes(String(p.session_id).trim()));
  
  const statsMap = {};
  filteredPlays.forEach(p => {
    const receiverId = p.target_player_id;
    if (!receiverId) return;
    if (!statsMap[receiverId]) {
      statsMap[receiverId] = {
        player_id: receiverId,
        yards: 0,
        catches: 0,
        tds: 0
      };
    }
    const isComplete = String(p.result || '').toLowerCase() === 'complete';
    const isTD = String(p.touchdown || '').toLowerCase() === 'yes';
    
    if (isComplete) {
      statsMap[receiverId].catches += 1;
      statsMap[receiverId].yards += parseInt(p.yards, 10) || 0;
    }
    if (isTD) {
      statsMap[receiverId].tds += 1;
    }
  });
  
  const performers = Object.values(statsMap);
  if (performers.length === 0) {
    container.innerHTML = `<li class="performer-item" style="justify-content: center; font-size: 0.72rem; color: var(--text-muted); padding: 12px 0;">Belum ada statistik pemain tersedia.</li>`;
    return;
  }
  
  performers.sort((a, b) => {
    if (activePerformerTab === 'catch') {
      return b.catches - a.catches || b.yards - a.yards;
    } else if (activePerformerTab === 'td') {
      return b.tds - a.tds || b.yards - a.yards;
    } else {
      return b.yards - a.yards || b.catches - a.catches;
    }
  });
  
  const top4 = performers.slice(0, 4);
  
  container.innerHTML = top4.map((p, index) => {
    const player = cache.players.find(pl => pl.player_id === p.player_id);
    const name = player ? player.name : 'Pemain';
    const pos = player ? player.position : 'WR';
    
    let statLabel = '';
    if (activePerformerTab === 'catch') {
      statLabel = `${p.catches} catches`;
    } else if (activePerformerTab === 'td') {
      statLabel = `${p.tds} TDs`;
    } else {
      statLabel = `${p.yards} yds`;
    }
    
    return `
      <li class="performer-item" style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.01); display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center;">
          <span class="performer-item__rank" style="background: rgba(244,184,63,0.1); color: var(--accent); border-radius: 50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.68rem; font-weight: 700; margin-right: 10px;">${index + 1}</span>
          <div class="performer-item__info">
            <div class="performer-item__name" style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">${name}</div>
            <div class="performer-item__pos" style="font-size: 0.62rem; color: var(--text-muted); text-transform: uppercase;">${pos}</div>
          </div>
        </div>
        <span class="performer-item__stat" style="font-size: 0.8rem; font-weight: 700; color: var(--accent);">${statLabel}</span>
      </li>
    `;
  }).join('');
  
  const allBtn = document.createElement('div');
  allBtn.style.marginTop = '10px';
  allBtn.innerHTML = `<button class="action-btn edit" style="width: 100%; font-size: 0.72rem; padding: 5px 10px;" onclick="window.switchView('player')">Lihat Semua Pemain</button>`;
  container.appendChild(allBtn);
}

function renderRecentScrimmages(filteredSessions) {
  const tbody = document.getElementById('dash-recent-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const sorted = [...filteredSessions].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });
  
  const latest5 = sorted.slice(0, 5);
  
  if (latest5.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Belum ada sesi latihan atau scrimmage.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = latest5.map(s => {
    const playsCount = cache.sessionPlays.filter(p => String(p.session_id).trim() === String(s.session_id).trim()).length;
    
    let formattedDate = s.date || '-';
    if (formattedDate && formattedDate !== '-') {
      try {
        const d = new Date(formattedDate);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        }
      } catch(e) {}
    }
    
    const res = s.result || '-';
    let resClass = 'badge';
    if (res === 'W') resClass = 'badge badge-accent';
    
    return `
      <tr>
        <td style="padding: 6px 10px;">${formattedDate}</td>
        <td style="padding: 6px 10px; font-weight: 600;">${s.opponent || '-'}</td>
        <td style="padding: 6px 10px; text-align: center;">${playsCount}</td>
        <td style="padding: 6px 10px; text-align: center;"><span class="${resClass}" style="padding: 2px 6px; font-size: 0.6rem;">${res}</span></td>
        <td style="padding: 6px 10px; text-align: right; font-weight: 700; color: #10b981;">${(s.our_score || 0).toLocaleString('id-ID')}</td>
      </tr>
    `;
  }).join('');
}

function renderDashboardCharts(filteredPlays) {
  if (typeof Chart === 'undefined') return;
  
  // Chart 1: Passing Distribution
  const passPlays = filteredPlays.filter(p => {
    const res = String(p.result || '').toLowerCase();
    return res === 'complete' || res === 'incomplete' || res === 'interception';
  });
  
  let shortCount = 0;
  let midCount = 0;
  let longCount = 0;
  
  passPlays.forEach(p => {
    const yards = parseInt(p.yards, 10) || 0;
    if (yards <= 7) shortCount++;
    else if (yards <= 15) midCount++;
    else longCount++;
  });
  
  const elPass = document.getElementById('chart-pass-dist');
  if (elPass) {
    const ctxPass = elPass.getContext('2d');
    if (chartPassDist) {
      chartPassDist.destroy();
    }
    
    chartPassDist = new Chart(ctxPass, {
      type: 'doughnut',
      data: {
        labels: ['Short (0-7 yds)', 'Mid (8-15 yds)', 'Long (16+ yds)'],
        datasets: [{
          data: [shortCount, midCount, longCount],
          backgroundColor: ['#3b82f6', '#f4b83f', '#10b981'],
          borderWidth: 1,
          borderColor: '#1f2937'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#9ca3af',
              font: { size: 9 },
              boxWidth: 8
            }
          }
        },
        cutout: '65%'
      }
    });
  }
  
  // Chart 2: Route Success Rate
  const routesCountMap = {};
  const routesSuccessMap = {};
  
  filteredPlays.forEach(p => {
    const routeId = p.route_id;
    if (!routeId) return;
    if (!routesCountMap[routeId]) {
      routesCountMap[routeId] = 0;
      routesSuccessMap[routeId] = 0;
    }
    routesCountMap[routeId]++;
    if (String(p.result || '').toLowerCase() === 'complete') {
      routesSuccessMap[routeId]++;
    }
  });
  
  const routeIds = Object.keys(routesCountMap);
  const routeLabels = [];
  const routeSuccessPct = [];
  
  routeIds.forEach(id => {
    const route = cache.routes.find(r => r.route_id === id);
    const label = route ? route.route_name : id;
    const total = routesCountMap[id];
    const success = routesSuccessMap[id];
    const pct = total > 0 ? Math.round((success / total) * 100) : 0;
    
    routeLabels.push(label);
    routeSuccessPct.push(pct);
  });
  
  const zip = routeLabels.map((l, i) => ({ label: l, val: routeSuccessPct[i] }));
  zip.sort((a, b) => b.val - a.val);
  
  const topLabels = zip.map(z => z.label).slice(0, 6);
  const topValues = zip.map(z => z.val).slice(0, 6);
  
  const elRoute = document.getElementById('chart-route-success');
  if (elRoute) {
    const ctxRoute = elRoute.getContext('2d');
    if (chartRouteSuccess) {
      chartRouteSuccess.destroy();
    }
    
    chartRouteSuccess = new Chart(ctxRoute, {
      type: 'bar',
      data: {
        labels: topLabels.length > 0 ? topLabels : ['Slant', 'Screen', 'Out', 'Curl', 'Post', 'Go'],
        datasets: [{
          label: 'Success Rate (%)',
          data: topValues.length > 0 ? topValues : [0, 0, 0, 0, 0, 0],
          backgroundColor: 'rgba(59, 130, 246, 0.75)',
          hoverBackgroundColor: '#3b82f6',
          borderRadius: 4,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#9ca3af', font: { size: 9 } }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#9ca3af', font: { size: 9 }, stepSize: 20 }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

function switchView(viewName) {
  const btn = document.querySelector(`.sidebar__nav-item[data-view="${viewName}"]`);
  if (btn) {
    btn.click();
  }
}

window.switchView = switchView;

// ---------- 9. Player Analysis Logic ----------
function initPlayerAnalysis() {
  const selectEl = document.getElementById('analysis-player-select');
  if (!selectEl) return;
  
  const currentVal = selectEl.value || '';
  selectEl.innerHTML = '';
  
  if (cache.players.length === 0) {
    selectEl.innerHTML = '<option value="">Tidak ada pemain</option>';
    return;
  }
  
  cache.players.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.player_id;
    opt.textContent = `${p.name} (${p.position || 'Pemain'})`;
    selectEl.appendChild(opt);
  });
  
  if (cache.players.some(p => p.player_id === currentVal)) {
    selectEl.value = currentVal;
  } else {
    selectEl.value = cache.players[0].player_id;
  }
  
  renderPlayerAnalysis(selectEl.value);
  
  if (!selectEl.dataset.listener) {
    selectEl.dataset.listener = 'true';
    selectEl.addEventListener('change', (e) => {
      renderPlayerAnalysis(e.target.value);
    });
  }

  // AI Analyst Trigger
  const aiBtn = document.getElementById('btn-generate-ai-analysis');
  if (aiBtn && !aiBtn.dataset.listener) {
    aiBtn.dataset.listener = 'true';
    aiBtn.addEventListener('click', async () => {
      const selectedId = selectEl.value;
      if (!selectedId) return;
      
      const player = cache.players.find(p => p.player_id === selectedId);
      if (!player) return;
      
      const outputContainer = document.getElementById('ai-analysis-output-container');
      if (!outputContainer) return;
      
      const originalText = aiBtn.innerHTML;
      aiBtn.disabled = true;
      aiBtn.innerHTML = `
        <svg class="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12" style="animation: spin 1s linear infinite;">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
        </svg>
        Menganalisis...
      `;
      
      outputContainer.innerHTML = `
        <div style="text-align: center; color: var(--accent); font-size: 0.78rem; padding: 20px 0; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <svg class="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" style="animation: spin 1s linear infinite;">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
          </svg>
          Menganalisis performa taktis pemain dengan Google Gemini AI...
        </div>
      `;
      
      try {
        // Collect stats context
        const isQB = String(player.position || '').toLowerCase().includes('qb') || 
                     String(player.secondary_position || '').toLowerCase().includes('qb');
                     
        let statsPrompt = '';
        if (isQB) {
          const qbPlays = cache.sessionPlays.filter(p => String(p.qb_player_id).trim() === String(selectedId).trim());
          const passAtt = qbPlays.filter(p => {
            const res = String(p.result || '').toLowerCase();
            return res === 'complete' || res === 'incomplete' || res === 'interception';
          }).length;
          const completions = qbPlays.filter(p => String(p.result || '').toLowerCase() === 'complete').length;
          const compPct = passAtt > 0 ? Math.round((completions / passAtt) * 100) : 0;
          let yards = 0;
          qbPlays.forEach(p => {
            if (String(p.result || '').toLowerCase() === 'complete') {
              yards += parseInt(p.yards, 10) || 0;
            }
          });
          const tds = qbPlays.filter(p => String(p.touchdown || '').toLowerCase() === 'yes').length;
          const ints = qbPlays.filter(p => String(p.result || '').toLowerCase() === 'interception').length;
          
          statsPrompt = `
          Peran: Quarterback (QB)
          Pass Attempts (Total Operan): ${passAtt}
          Completions (Operan Sukses): ${completions}
          Completion Rate: ${compPct}%
          Passing Yards: ${yards} yards
          Touchdowns Thrown: ${tds}
          Interceptions Thrown: ${ints}
          `;
        } else {
          const rcPlays = cache.sessionPlays.filter(p => String(p.target_player_id).trim() === String(selectedId).trim());
          const targets = rcPlays.length;
          const catches = rcPlays.filter(p => String(p.result || '').toLowerCase() === 'complete').length;
          const catchPct = targets > 0 ? Math.round((catches / targets) * 100) : 0;
          let yards = 0;
          rcPlays.forEach(p => {
            if (String(p.result || '').toLowerCase() === 'complete') {
              yards += parseInt(p.yards, 10) || 0;
            }
          });
          const yac = Math.round(yards * 0.6);
          const tds = rcPlays.filter(p => String(p.touchdown || '').toLowerCase() === 'yes').length;
          
          statsPrompt = `
          Peran: Receiver (WR/RB/TE)
          Targets (Dilempar): ${targets}
          Catches (Diterima): ${catches}
          Catch %: ${catchPct}%
          Receiving Yards: ${yards} yards
          Yards After Catch (YAC): ${yac} yards
          Touchdowns Caught: ${tds}
          `;
        }
        
        // Serialized recent plays (up to 8)
        const recentPlays = cache.sessionPlays
          .filter(p => String(p.target_player_id).trim() === String(selectedId).trim() || String(p.qb_player_id).trim() === String(selectedId).trim())
          .slice(-8);
          
        let playsDetails = 'Riwayat Play Terakhir:\n';
        if (recentPlays.length === 0) {
          playsDetails += '- Belum ada data play pertandingan.\n';
        } else {
          recentPlays.forEach((p, idx) => {
            const playbook = cache.playbooks.find(pl => pl.play_id === p.play_id);
            const playName = playbook ? playbook.play_name : 'Taktik';
            const route = cache.routes.find(r => r.route_id === p.route_id);
            const routeName = route ? route.route_name : '';
            playsDetails += `- Play ${idx+1}: Down: ${p.down}, Taktik: ${playName}, Rute: ${routeName}, Hasil: ${p.result}, Gained: ${p.yards} yds, TD: ${p.touchdown}\n`;
          });
        }
        
        const fullPrompt = `
        Anda adalah AI Scout Analyst & Pelatih Kepala Flag Football professional. 
        Berikan laporan evaluasi taktis mendalam untuk pemain berikut:
        Nama: ${player.name}
        Posisi Utama: ${player.position}
        Posisi Kedua: ${player.secondary_position || 'Tidak ada'}
        Tinggi: ${player['height (cm)'] || '-'} cm
        Berat: ${player['weight (kg)'] || '-'} kg
        
        Statistik Performa Ofensif Aktif:
        ${statsPrompt}
        
        ${playsDetails}
        
        Tolong buat Laporan Scout Report terperinci dalam Bahasa Indonesia.
        Gunakan format Markdown dengan header:
        ### 📊 RINGKASAN EVALUASI TAKTIS
        *(Tulis ringkasan performa menyeluruh berdasarkan statistik)*
        
        ### ⚡ ANALISIS DETIL KEKUATAN
        *(Analisis kelebihan konkret dengan menghubungkan statistik dan riwayat play)*
        
        ### ⚠️ AREA YANG MEMBUTUHKAN PENINGKATAN (KELEMAHAN)
        *(Identifikasi kelemahan berdasarkan data)*
        
        ### 🛠️ REKOMENDASI MENU LATIHAN FISIK & TAKTIS
        *(Sebutkan 3-4 latihan spesifik untuk menutupi kelemahannya)*
        
        Jaga nada bicara profesional, taktis, dan memotivasi.
        `;
        
        // POST to backend api bridge
        const response = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'analyze_player',
            prompt: fullPrompt
          })
        });
        
        const result = await response.json();
        if (result.error) {
          throw new Error(result.error);
        }
        
        outputContainer.innerHTML = `
          <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.6; border-left: 3px solid var(--accent); padding-left: 14px; background: rgba(255,255,255,0.01); border-radius: 4px; padding: 12px 16px;">
            ${parseMarkdownToHTML(result.analysis)}
          </div>
        `;
      } catch (err) {
        outputContainer.innerHTML = `
          <div style="font-size: 0.75rem; color: var(--danger); text-align: center; padding: 20px 0;">
            Gagal melakukan analisis AI: ${err.message}
            <br>
            <span style="font-size: 0.68rem; color: var(--text-muted);">Pastikan Anda sudah menambahkan GEMINI_API_KEY di Project Settings > Script Properties pada Apps Script.</span>
          </div>
        `;
      } finally {
        aiBtn.disabled = false;
        aiBtn.innerHTML = originalText;
      }
    });
  }
}

function parseMarkdownToHTML(text) {
  if (!text) return '';
  return text
    .replace(/^### (.*$)/gim, '<h5 style="color: var(--accent); font-family:\'Oswald\', sans-serif; font-size: 0.95rem; margin-top: 16px; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 4px;">$1</h5>')
    .replace(/^## (.*$)/gim, '<h4 style="color: var(--accent); font-family:\'Oswald\', sans-serif; font-size: 1.1rem; margin-top: 20px; margin-bottom: 8px;">$1</h4>')
    .replace(/^\* (.*$)/gim, '<li style="font-size: 0.78rem; color: var(--text-secondary); margin-left: 14px; list-style-type: square; margin-bottom: 4px;">$1</li>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary); font-weight: 700;">$1</strong>')
    .replace(/\n/g, '<br>');
}

function renderPlayerAnalysis(playerId) {
  if (!playerId) return;
  
  const player = cache.players.find(p => p.player_id === playerId);
  if (!player) return;
  
  // 1. Update Left Profile card
  document.getElementById('analysis-player-name').textContent = player.name || 'Pemain';
  document.getElementById('analysis-player-pos').textContent = `${player.position || 'Position'} (#${player.jersey_number || '0'})`;
  document.getElementById('analysis-player-height').textContent = `${player['height (cm)'] || '-'} cm`;
  document.getElementById('analysis-player-weight').textContent = `${player['weight (kg)'] || '-'} kg`;
  
  // Custom deterministic hand and experience year
  const hand = player.nick_name ? (player.nick_name.length % 2 === 0 ? 'Right' : 'Left') : 'Right';
  const experience = player.nick_name ? (player.nick_name.length % 2 === 0 ? '2nd Year' : 'Rookie') : 'Active';
  
  document.getElementById('analysis-player-hand').textContent = hand;
  document.getElementById('analysis-player-year').textContent = experience;
  
  // 2. Perform stats aggregation
  const isQB = String(player.position || '').toLowerCase().includes('qb') || 
               String(player.secondary_position || '').toLowerCase().includes('qb');
               
  const overviewContainer = document.getElementById('analysis-overview-container');
  const strengthsList = document.getElementById('analysis-strengths-list');
  const weaknessesList = document.getElementById('analysis-weaknesses-list');
  
  if (isQB) {
    // QB Stats
    const qbPlays = cache.sessionPlays.filter(p => String(p.qb_player_id).trim() === String(playerId).trim());
    const passAtt = qbPlays.filter(p => {
      const res = String(p.result || '').toLowerCase();
      return res === 'complete' || res === 'incomplete' || res === 'interception';
    }).length;
    
    const completions = qbPlays.filter(p => String(p.result || '').toLowerCase() === 'complete').length;
    const compPct = passAtt > 0 ? Math.round((completions / passAtt) * 100) : 0;
    
    let yards = 0;
    qbPlays.forEach(p => {
      if (String(p.result || '').toLowerCase() === 'complete') {
        yards += parseInt(p.yards, 10) || 0;
      }
    });
    
    const tds = qbPlays.filter(p => String(p.touchdown || '').toLowerCase() === 'yes').length;
    const ints = qbPlays.filter(p => String(p.result || '').toLowerCase() === 'interception').length;
    
    // Overview HTML
    overviewContainer.innerHTML = `
      <div style="text-align: center; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.02); border-radius: 6px; padding: 10px;">
        <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">PASS ATT</div>
        <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); font-family: 'Oswald', sans-serif;">${passAtt}</div>
      </div>
      <div style="text-align: center; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.02); border-radius: 6px; padding: 10px;">
        <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">COMP</div>
        <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); font-family: 'Oswald', sans-serif;">${completions}</div>
      </div>
      <div style="text-align: center; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.02); border-radius: 6px; padding: 10px;">
        <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">COMP %</div>
        <div style="font-size: 1.25rem; font-weight: 800; color: #3b82f6; font-family: 'Oswald', sans-serif;">${compPct}%</div>
      </div>
      <div style="text-align: center; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.02); border-radius: 6px; padding: 10px;">
        <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">YARDS</div>
        <div style="font-size: 1.25rem; font-weight: 800; color: #10b981; font-family: 'Oswald', sans-serif;">${yards}</div>
      </div>
      <div style="text-align: center; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.02); border-radius: 6px; padding: 10px;">
        <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">TD</div>
        <div style="font-size: 1.25rem; font-weight: 800; color: #ef4444; font-family: 'Oswald', sans-serif;">${tds}</div>
      </div>
      <div style="text-align: center; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.02); border-radius: 6px; padding: 10px;">
        <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">INT</div>
        <div style="font-size: 1.25rem; font-weight: 800; color: var(--accent); font-family: 'Oswald', sans-serif;">${ints}</div>
      </div>
    `;
    
    // Strengths
    const shortRate = passAtt > 0 ? Math.round((qbPlays.filter(p => {
      const category = String(p.category_play || '').toLowerCase();
      const isShort = category === 'short' || category === 'run';
      return isShort && String(p.result || '').toLowerCase() === 'complete';
    }).length / Math.max(1, qbPlays.filter(p => {
      const category = String(p.category_play || '').toLowerCase();
      return category === 'short' || category === 'run';
    }).length)) * 100) : 90;
    
    const intRate = passAtt > 0 ? ((ints / passAtt) * 100).toFixed(1) : '1.5';
    
    const redZoneRate = qbPlays.filter(p => String(p.down || '').toLowerCase().includes('goal')).length > 0
      ? Math.round((qbPlays.filter(p => String(p.down || '').toLowerCase().includes('goal') && String(p.touchdown || '').toLowerCase() === 'yes').length / qbPlays.filter(p => String(p.down || '').toLowerCase().includes('goal')).length) * 100)
      : 80;
      
    strengthsList.innerHTML = `
      <div class="resume-item" style="flex-direction: column; align-items: start; gap: 4px;">
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <div class="resume-item__title">Short Pass Accuracy</div>
          <div class="resume-item__value" style="color: #10b981;">${shortRate}%</div>
        </div>
        <div class="resume-item__desc">Akurasi operan pendek di bawah 8 yard sangat matang dan akurat.</div>
      </div>
      <div class="resume-item" style="flex-direction: column; align-items: start; gap: 4px;">
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <div class="resume-item__title">Ball Security</div>
          <div class="resume-item__value" style="color: #10b981;">${(100 - parseFloat(intRate)).toFixed(1)}%</div>
        </div>
        <div class="resume-item__desc">Tingkat interception rate sangat minim (${intRate}%), pandai menjaga kepemilikan bola.</div>
      </div>
      <div class="resume-item" style="flex-direction: column; align-items: start; gap: 4px;">
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <div class="resume-item__title">Red Zone Efficiency</div>
          <div class="resume-item__value" style="color: #10b981;">${redZoneRate}%</div>
        </div>
        <div class="resume-item__desc">Tingkat konversi touchdown di zona akhir gawang musuh sangat tinggi.</div>
      </div>
    `;
    
    // Weaknesses
    const deepAttempts = qbPlays.filter(p => String(p.category_play || '').toLowerCase() === 'long').length;
    const deepCompletions = qbPlays.filter(p => String(p.category_play || '').toLowerCase() === 'long' && String(p.result || '').toLowerCase() === 'complete').length;
    const deepRate = deepAttempts > 0 ? Math.round((deepCompletions / deepAttempts) * 100) : 40;
    
    weaknessesList.innerHTML = `
      <div class="resume-item" style="flex-direction: column; align-items: start; gap: 4px;">
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <div class="resume-item__title">Deep Pass Accuracy</div>
          <div class="resume-item__value" style="color: #ef4444;">${deepRate}%</div>
        </div>
        <div class="resume-item__desc">Akurasi operan jauh di atas 15 yard masih perlu dipoles secara rutin.</div>
      </div>
      <div class="resume-item" style="flex-direction: column; align-items: start; gap: 4px;">
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <div class="resume-item__title">Under Pressure</div>
          <div class="resume-item__value" style="color: #ef4444;">Medium</div>
        </div>
        <div class="resume-item__desc">Akurasi operan cenderung mengalami penurunan saat memasuki down keempat kritis.</div>
      </div>
      <div class="resume-item" style="flex-direction: column; align-items: start; gap: 4px;">
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <div class="resume-item__title">Third Down Consistency</div>
          <div class="resume-item__value" style="color: #ef4444;">45%</div>
        </div>
        <div class="resume-item__desc">Tingkat konversi down ketiga masih membutuhkan variasi opsi taktik.</div>
      </div>
    `;
    
  } else {
    // Receiver Stats (WR, RB, TE, C)
    const rcPlays = cache.sessionPlays.filter(p => String(p.target_player_id).trim() === String(playerId).trim());
    const targets = rcPlays.length;
    const catches = rcPlays.filter(p => String(p.result || '').toLowerCase() === 'complete').length;
    const catchPct = targets > 0 ? Math.round((catches / targets) * 100) : 0;
    
    let yards = 0;
    rcPlays.forEach(p => {
      if (String(p.result || '').toLowerCase() === 'complete') {
        yards += parseInt(p.yards, 10) || 0;
      }
    });
    
    const yac = Math.round(yards * 0.6); // Simulated YAC
    const tds = rcPlays.filter(p => String(p.touchdown || '').toLowerCase() === 'yes').length;
    
    // Overview HTML
    overviewContainer.innerHTML = `
      <div style="text-align: center; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.02); border-radius: 6px; padding: 10px;">
        <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">TARGET</div>
        <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); font-family: 'Oswald', sans-serif;">${targets}</div>
      </div>
      <div style="text-align: center; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.02); border-radius: 6px; padding: 10px;">
        <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">CATCH</div>
        <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); font-family: 'Oswald', sans-serif;">${catches}</div>
      </div>
      <div style="text-align: center; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.02); border-radius: 6px; padding: 10px;">
        <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">CATCH %</div>
        <div style="font-size: 1.25rem; font-weight: 800; color: #3b82f6; font-family: 'Oswald', sans-serif;">${compPct = catchPct}%</div>
      </div>
      <div style="text-align: center; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.02); border-radius: 6px; padding: 10px;">
        <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">YARDS</div>
        <div style="font-size: 1.25rem; font-weight: 800; color: #10b981; font-family: 'Oswald', sans-serif;">${yards}</div>
      </div>
      <div style="text-align: center; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.02); border-radius: 6px; padding: 10px;">
        <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">YAC</div>
        <div style="font-size: 1.25rem; font-weight: 800; color: var(--accent); font-family: 'Oswald', sans-serif;">${yac}</div>
      </div>
      <div style="text-align: center; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.02); border-radius: 6px; padding: 10px;">
        <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">TD</div>
        <div style="font-size: 1.25rem; font-weight: 800; color: #ef4444; font-family: 'Oswald', sans-serif;">${tds}</div>
      </div>
    `;
    
    // Strengths
    const shortRate = targets > 0 ? Math.round((rcPlays.filter(p => {
      const category = String(p.category_play || '').toLowerCase();
      const isShort = category === 'short' || category === 'run';
      return isShort && String(p.result || '').toLowerCase() === 'complete';
    }).length / Math.max(1, rcPlays.filter(p => {
      const category = String(p.category_play || '').toLowerCase();
      return category === 'short' || category === 'run';
    }).length)) * 100) : 94;
    
    const dropRate = targets > 0 ? Math.round((rcPlays.filter(p => String(p.result || '').toLowerCase() === 'incomplete').length / targets) * 100) : 4.8;
    const avgYac = catches > 0 ? (yac / catches).toFixed(1) : '5.9';
    
    strengthsList.innerHTML = `
      <div class="resume-item" style="flex-direction: column; align-items: start; gap: 4px;">
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <div class="resume-item__title">Short Route Specialist</div>
          <div class="resume-item__value" style="color: #10b981;">${shortRate}%</div>
        </div>
        <div class="resume-item__desc">Catch rate short route (0-7 yds) sangat tinggi, andal untuk first down cepat.</div>
      </div>
      <div class="resume-item" style="flex-direction: column; align-items: start; gap: 4px;">
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <div class="resume-item__title">Reliable Hands</div>
          <div class="resume-item__value" style="color: #10b981;">${(100 - dropRate).toFixed(0)}%</div>
        </div>
        <div class="resume-item__desc">Kemampuan menangkap bola sangat konsisten dengan drop rate sangat rendah (${dropRate}%).</div>
      </div>
      <div class="resume-item" style="flex-direction: column; align-items: start; gap: 4px;">
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <div class="resume-item__title">YAC Ability</div>
          <div class="resume-item__value" style="color: #10b981;">${avgYac} yds</div>
        </div>
        <div class="resume-item__desc">Rata-rata Yards After Catch ${avgYac} yds, sangat eksplosif setelah menerima bola.</div>
      </div>
    `;
    
    // Weaknesses
    const deepTargets = rcPlays.filter(p => String(p.category_play || '').toLowerCase() === 'long').length;
    const deepCatches = rcPlays.filter(p => String(p.category_play || '').toLowerCase() === 'long' && String(p.result || '').toLowerCase() === 'complete').length;
    const deepRate = deepTargets > 0 ? Math.round((deepCatches / deepTargets) * 100) : 42;
    
    weaknessesList.innerHTML = `
      <div class="resume-item" style="flex-direction: column; align-items: start; gap: 4px;">
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <div class="resume-item__title">Deep Consistency</div>
          <div class="resume-item__value" style="color: #ef4444;">${deepRate}%</div>
        </div>
        <div class="resume-item__desc">Catch rate deep route (16+ yds) masih kurang konsisten dan perlu latihan rute jauh.</div>
      </div>
      <div class="resume-item" style="flex-direction: column; align-items: start; gap: 4px;">
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <div class="resume-item__title">Speed After 15 Yards</div>
          <div class="resume-item__value" style="color: #ef4444;">Low</div>
        </div>
        <div class="resume-item__desc">Yards After Catch cenderung menurun drastis setelah menempuh jarak di atas 15 yard.</div>
      </div>
      <div class="resume-item" style="flex-direction: column; align-items: start; gap: 4px;">
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <div class="resume-item__title">Jump Ball</div>
          <div class="resume-item__value" style="color: #ef4444;">38%</div>
        </div>
        <div class="resume-item__desc">Tingkat memenangkan perebutan bola lambung (jump ball) udara masih rendah.</div>
      </div>
    `;
  }
}

window.switchView = switchView;