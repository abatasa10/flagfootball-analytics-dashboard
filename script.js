// Inisialisasi tema sebelum render halaman
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

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

// State Cache
let cache = {
  players: [],
  teams: [],
  positions: [],
  routes: [],
  playbooks: [],
  playAssignments: []
};

// Edit States
let editingTeamId = null;
let editingPlayerId = null;
let editingPositionId = null;
let editingRouteId = null;
let editingPlaybookId = null;

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
      loadPlayers()
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