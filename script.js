// ==========================================================
// GANTI URL INI dengan URL Web App dari Apps Script kamu
// Bentuknya: https://script.google.com/macros/s/xxxxxxxxxx/exec
// ==========================================================
const API_URL = 'https://script.google.com/macros/s/AKfycbyFYjZdhlOZQJf7ua9mIVE_jo2NNbfrm38faP3itaIODyQbhsHIMfuB0xpaCJ0yuMFv/exec';

// Nama-nama sheet di Google Sheets
const SHEET_PLAYERS = 'Master Player';
const SHEET_TEAMS = 'Master Team';
const SHEET_POSITIONS = 'Master Position';

// State Cache
let cache = {
  players: [],
  teams: [],
  positions: []
};

// DOM Elements
const viewTitle = document.getElementById('view-title');
const globalRefreshBtn = document.getElementById('global-refresh-btn');

// Forms & Status Elements
const teamForm = document.getElementById('team-form');
const teamSubmitBtn = document.getElementById('team-submit-btn');
const teamStatus = document.getElementById('team-form-status');

const playerForm = document.getElementById('player-form');
const playerSubmitBtn = document.getElementById('player-submit-btn');
const playerStatus = document.getElementById('player-form-status');

const positionForm = document.getElementById('position-form');
const positionSubmitBtn = document.getElementById('position-submit-btn');
const positionStatus = document.getElementById('position-form-status');

// Select Inputs in Player Form
const playerTeamSelect = document.getElementById('player-team-select');
const playerPositionSelect = document.getElementById('player-position-select');
const playerSecPositionSelect = document.getElementById('player-secondary-position-select');

// List Containers / Tables
const teamListGrid = document.getElementById('team-list-grid');
const playerTableBody = document.getElementById('player-table-body');
const positionTableBody = document.getElementById('position-table-body');

// Dashboard Stats Elements
const statTeams = document.getElementById('stat-teams');
const statPlayers = document.getElementById('stat-players');
const statPositions = document.getElementById('stat-positions');

// ---------- 1. View Navigation Handler ----------
const navButtons = document.querySelectorAll('.sidebar__nav-item');
const viewPanels = document.querySelectorAll('.view-panel');

const viewTitlesMap = {
  dashboard: 'Dashboard Overview',
  team: 'Master Team',
  player: 'Master Player',
  position: 'Master Positions'
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
      
      return `
        <div class="team-badge-card">
          <div class="team-badge-card__color-bar" style="background: ${color};"></div>
          <div class="team-badge-card__logo" style="background: ${color};">
            ${abbr.substring(0, 3)}
          </div>
          <div class="team-badge-card__name">${name}</div>
          <div class="team-badge-card__abbr">${abbr}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 8px;">${desc}</div>
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
  positionTableBody.innerHTML = `<tr><td colspan="5" class="table-empty">Memuat data posisi…</td></tr>`;
  try {
    const data = await fetchSheetData(SHEET_POSITIONS);
    cache.positions = Array.isArray(data) ? data : [];
    
    // Update Dashboard Stat
    statPositions.textContent = cache.positions.length;

    // Populate position selections in Player form
    populatePositionSelects();

    if (!cache.positions.length) {
      positionTableBody.innerHTML = `<tr><td colspan="5" class="table-empty">Belum ada posisi terdaftar.</td></tr>`;
      return;
    }

    positionTableBody.innerHTML = cache.positions.map((pos, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${pos.position_id || '-'}</strong></td>
        <td>${pos.position_name || '-'}</td>
        <td><span class="badge badge-accent">${pos.abbreviation || '-'}</span></td>
        <td>${pos.category || '-'}</td>
      </tr>
    `).join('');

  } catch (err) {
    positionTableBody.innerHTML = `<tr><td colspan="5" class="table-empty" style="color: var(--danger);">Gagal: ${err.message}</td></tr>`;
    throw err;
  }
}

// Load & Render Players
async function loadPlayers() {
  playerTableBody.innerHTML = `<tr><td colspan="8" class="table-empty">Memuat data pemain…</td></tr>`;
  try {
    const data = await fetchSheetData(SHEET_PLAYERS);
    cache.players = Array.isArray(data) ? data : [];

    // Update Dashboard Stat
    statPlayers.textContent = cache.players.length;

    if (!cache.players.length) {
      playerTableBody.innerHTML = `<tr><td colspan="8" class="table-empty">Belum ada pemain terdaftar.</td></tr>`;
      return;
    }

    playerTableBody.innerHTML = cache.players.map((p, i) => {
      const height = p['height (cm)'] || '-';
      const weight = p['weight (kg)'] || '-';
      const secPos = p.secondary_position ? `/ ${p.secondary_position}` : '';
      return `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${p.player_id || '-'}</strong></td>
          <td>${p.name || '-'}</td>
          <td>${p.nick_name || '-'}</td>
          <td>${p.jersey_number || '-'}</td>
          <td>${p.position || '-'} ${secPos}</td>
          <td><span class="badge badge-accent">${p.team || '-'}</span></td>
          <td>${height} cm / ${weight} kg</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    playerTableBody.innerHTML = `<tr><td colspan="8" class="table-empty" style="color: var(--danger);">Gagal: ${err.message}</td></tr>`;
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

// ---------- 4. Form Submissions ----------

// Common fetch POST helper
async function submitFormData(sheetName, data, statusEl, submitBtn) {
  submitBtn.disabled = true;
  statusEl.textContent = 'Menyimpan…';
  statusEl.className = 'form-status';

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ sheet: sheetName, data })
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

  const success = await submitFormData(SHEET_TEAMS, data, teamStatus, teamSubmitBtn);
  if (success) {
    teamForm.reset();
    document.querySelector('.color-value-preview').textContent = '#f4b83f';
    await loadTeams();
    await loadPlayers(); // Reload players to reflect team name mappings if needed
  }
});

// Player Form
playerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(playerForm);
  const data = Object.fromEntries(formData.entries());

  const success = await submitFormData(SHEET_PLAYERS, data, playerStatus, playerSubmitBtn);
  if (success) {
    playerForm.reset();
    document.querySelector('input[name="sport"]').value = 'Flag Football';
    await loadPlayers();
  }
});

// Position Form
positionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(positionForm);
  const data = Object.fromEntries(formData.entries());

  const success = await submitFormData(SHEET_POSITIONS, data, positionStatus, positionSubmitBtn);
  if (success) {
    positionForm.reset();
    await loadPositions();
  }
});

// ---------- 5. Micro-interactions ----------
// Color picker label update
const colorPicker = document.querySelector('.color-input');
const colorLabel = document.querySelector('.color-value-preview');
if (colorPicker && colorLabel) {
  colorPicker.addEventListener('input', (e) => {
    colorLabel.textContent = e.target.value.toUpperCase();
  });
}

// Global Refresh Action
globalRefreshBtn.addEventListener('click', loadAllData);

// ---------- 6. Initial Load ----------
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
