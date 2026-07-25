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
    statTeams.textContent = cache.teams.length;

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
    statPositions.textContent = cache.positions.length;

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
    statRoutes.textContent = cache.routes.length;

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
    statPlaybook.textContent = cache.playbooks.length;

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
    statPlayers.textContent = cache.players.length;

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
  const row = document.createElement('div');
  row.className = 'assignment-row';

  const receivers = ['X', 'Y', 'Z', 'C', 'QB'];
  const receiverOptions = receivers.map(rec => `
      <option value="${rec}" ${rec === receiver ? 'selected' : ''}>${rec}</option>
    `).join('');

  const posOptions = cache.positions.map(p => `
      <option value="${p.abbreviation}" ${p.abbreviation === positionVal ? 'selected' : ''}>
        ${p.abbreviation}
      </option>
    `).join('');

  const routeOptions = cache.routes.map(r => `
      <option value="${r.abbreviation}" ${r.abbreviation === routeVal ? 'selected' : ''}>
        ${r.route_name} (${r.abbreviation})
      </option>
    `).join('');

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
playbookImageFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (evt) {
      uploadedImageBase64 = evt.target.result.split(',')[1];
      uploadedImageName = file.name;
      uploadedImageType = file.type;

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
});

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
          ${cache.playbooks.map(p => `<option value="${p.play_id}">${p.play_name}</option>`).join('')}
        </select>
      </label>
      <label>
        Route
        <select class="play-route" required>
          <option value="">Pilih Rute</option>
          ${cache.routes.map(r => `<option value="${r.route_id}">${r.route_name} (${r.abbreviation})</option>`).join('')}
        </select>
      </label>
      <label>
        QB
        <select class="play-qb" required>
          <option value="">Pilih QB</option>
          ${qbPlayers.map(p => `<option value="${p.player_id}">${p.name} (#${p.jersey_number})</option>`).join('')}
        </select>
      </label>
      <label>
        Target
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
      <div class="play-conditional-container" style="grid-column: 1 / -1; display: none;"></div>
    </div>
  `;

  const resultSelect = playCard.querySelector('.play-result');
  const condContainer = playCard.querySelector('.play-conditional-container');

  resultSelect.addEventListener('change', () => {
    renderConditionalFields(resultSelect.value, condContainer);
    recalculateOurScore();
  });

  playCard.querySelector('.btn-remove-play').addEventListener('click', () => {
    playCard.remove();
    recalculateOurScore();
  });

  if (playData) {
    playCard.querySelector('.play-round').value = playData.round_of_match || 'First Half';
    playCard.querySelector('.play-down').value = playData.down || 'First To Mid';
    playCard.querySelector('.play-category').value = playData.category_play || 'Short';
    playCard.querySelector('.play-playbook').value = playData.play_id || '';
    playCard.querySelector('.play-route').value = playData.route_id || '';
    playCard.querySelector('.play-qb').value = playData.qb_player_id || '';
    playCard.querySelector('.play-target').value = playData.target_player_id || '';
    playCard.querySelector('.play-result').value = playData.result || '';

    renderConditionalFields(playData.result, condContainer, playData);
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
  createDrivePanel(); // Create a default first drive
});

if (cancelSessionBtn) cancelSessionBtn.addEventListener('click', cancelEditSession);
if (saveSessionBtn) saveSessionBtn.addEventListener('click', () => saveSession('On Progress'));
if (doneSessionBtn) doneSessionBtn.addEventListener('click', () => saveSession('Done'));
if (addDriveBtn) addDriveBtn.addEventListener('click', () => createDrivePanel());
if (sessionOpponentScoreInput) sessionOpponentScoreInput.addEventListener('input', recalculateOurScore);

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