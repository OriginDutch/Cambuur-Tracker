
// ══════════════════════════════════════════════════════
// GITHUB GIST SYNC
// ══════════════════════════════════════════════════════

const GIST_FILENAME = 'cambuur_tracker_data.json';
// Cloudflare Worker proxy URL — vul in na setup
// Leeg laten = direct naar GitHub API (werkt lokaal maar niet via GitHub Pages)
let GIST_WORKER_URL = localStorage.getItem('gist_worker_url') || '';

function gistApiUrl(gistId) {
  const base = (GIST_WORKER_URL || '').replace(/\/+$/, '');
  if (base) {
    return gistId ? `${base}/gist/${gistId}` : `${base}/gist`;
  }
  return gistId ? `https://api.github.com/gists/${gistId}` : 'https://api.github.com/gists';
}
let _gistToken = null;
let _gistId = null;
let _gistSyncing = false;
let _gistPushTimer = null;
let _gistLastPushed = null;

// Load saved token/id from localStorage on startup
async function gistInit() {
  _gistToken = localStorage.getItem('gist_token') || null;
  _gistId    = localStorage.getItem('gist_id')    || null;
  GIST_WORKER_URL = localStorage.getItem('gist_worker_url') || '';
  const tokenInput  = document.getElementById('gist-token-input');
  const idInput     = document.getElementById('gist-id-input');
  const workerInput = document.getElementById('gist-worker-input');
  if (tokenInput  && _gistToken)      tokenInput.value  = _gistToken;
  if (idInput     && _gistId)         idInput.value     = _gistId;
  if (workerInput && GIST_WORKER_URL) workerInput.value = GIST_WORKER_URL;
  gistUpdateStatus();
  if (_gistToken && _gistId) await gistPull(false);
  // Pas nu, ná een eventuele eerste pull, mogen dbPut-aanroepen (bijv. van
  // latere eigen bewerkingen) weer automatisch een push plannen. Dit
  // voorkomt dat verouderde lokale data (nog niet bijgewerkt door de pull)
  // per ongeluk teruggeschreven wordt naar Gist vlak na het opstarten.
  window._isImporting = false;
}

function gistSaveToken(val) {
  _gistToken = val.trim() || null;
  if (_gistToken) localStorage.setItem('gist_token', _gistToken);
  else localStorage.removeItem('gist_token');
  gistUpdateStatus();
}

function gistSaveId(val) {
  _gistId = val.trim() || null;
  if (_gistId) localStorage.setItem('gist_id', _gistId);
  else localStorage.removeItem('gist_id');
  gistUpdateStatus();
}

function gistUpdateStatus() {
  const el = document.getElementById('gist-sync-status');
  const tokenEl = document.getElementById('gist-token-status');
  const idEl = document.getElementById('gist-id-status');
  if (!el) return;
  // Worker status
  const workerEl = document.getElementById('gist-worker-status');
  if (workerEl) { workerEl.textContent = GIST_WORKER_URL ? '✓ Worker geconfigureerd' : '⚠️ Niet ingesteld — sync werkt alleen lokaal'; workerEl.style.color = GIST_WORKER_URL ? 'var(--win)' : 'var(--draw)'; }
  if (!_gistToken) {
    el.textContent = '⚠️ Geen token ingesteld';
    el.style.color = 'var(--text-muted)';
    if (tokenEl) { tokenEl.textContent = 'Vereist'; tokenEl.style.color = 'var(--loss)'; }
    return;
  }
  if (tokenEl) { tokenEl.textContent = '✓ Opgeslagen'; tokenEl.style.color = 'var(--win)'; }
  if (!_gistId) {
    el.textContent = 'Klaar — nog geen Gist gekoppeld. Klik "Nu opslaan" om een nieuwe aan te maken.';
    el.style.color = 'var(--text-muted)';
    if (idEl) { idEl.textContent = 'Wordt aangemaakt bij eerste opslaan'; idEl.style.color = 'var(--text-muted)'; }
    return;
  }
  if (idEl) { idEl.textContent = '✓ Gekoppeld'; idEl.style.color = 'var(--win)'; }
  const lastStr = _gistLastPushed
    ? 'Laatst gesynchroniseerd: ' + new Date(_gistLastPushed).toLocaleTimeString('nl-NL')
    : 'Geconfigureerd — nog niet gesynchroniseerd';
  el.textContent = '✓ ' + lastStr;
  el.style.color = 'var(--win)';
}

// Schedule auto-push 3s after last change
function gistSchedulePush() {
  if (!_gistToken) return;
  clearTimeout(_gistPushTimer);
  _gistPushTimer = setTimeout(() => gistPush(false), 3000);
}

// Push data to Gist
async function gistPush(manual = false) {
  if (!_gistToken) {
    if (manual) showToast('Stel eerst een GitHub token in bij Instellingen → Gegevens', 'error');
    return;
  }
  if (_gistSyncing) return;
  _gistSyncing = true;
  const statusEl = document.getElementById('gist-sync-status');
  if (statusEl) { statusEl.textContent = '⬆️ Opslaan naar Gist...'; statusEl.style.color = 'var(--text-muted)'; }

  try {
    const data = JSON.stringify(buildExportData(), null, 2);
    const body = {
      description: 'Seizoenstracker data — automatisch gesynchroniseerd',
      public: false,
      files: { [GIST_FILENAME]: { content: data } }
    };

    let url = gistApiUrl(_gistId);
    let method = _gistId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${_gistToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || res.statusText);
    }

    const json = await res.json();

    // Save gist ID if newly created
    if (!_gistId) {
      _gistId = json.id;
      localStorage.setItem('gist_id', _gistId);
      const idInput = document.getElementById('gist-id-input');
      if (idInput) idInput.value = _gistId;
    }

    _gistLastPushed = new Date().toISOString();
    localStorage.setItem('gist_last_pushed', _gistLastPushed);
    gistUpdateStatus();
    if (manual) showToast('✓ Data opgeslagen in GitHub Gist', 'success');

  } catch(e) {
    console.error('Gist push error:', e);
    if (statusEl) { statusEl.textContent = '❌ Fout: ' + e.message; statusEl.style.color = 'var(--loss)'; }
    if (manual) showToast('Gist fout: ' + e.message, 'error');
  } finally {
    _gistSyncing = false;
  }
}

// Pull data from Gist
async function gistPull(manual = false) {
  if (!_gistToken || !_gistId) {
    if (manual) showToast('Configureer eerst token en Gist ID', 'error');
    return;
  }
  const statusEl = document.getElementById('gist-sync-status');
  if (statusEl) { statusEl.textContent = '⬇️ Ophalen uit Gist...'; statusEl.style.color = 'var(--text-muted)'; }

  try {
    const res = await fetch(gistApiUrl(_gistId), {
      headers: {
        'Authorization': `Bearer ${_gistToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    if (!res.ok) throw new Error(res.statusText);
    const json = await res.json();
    const fileContent = json.files?.[GIST_FILENAME]?.content;
    if (!fileContent) throw new Error('Geen data gevonden in Gist');

    const data = JSON.parse(fileContent);
    const gistUpdated = new Date(json.updated_at);

    // Only import if Gist is newer than local last push
    const localLastPushed = localStorage.getItem('gist_last_pushed');
    if (!manual && localLastPushed && new Date(localLastPushed) >= gistUpdated) {
      gistUpdateStatus();
      return; // Local is up to date
    }

    // Import the data
    await importDataObj(data);
    _gistLastPushed = gistUpdated.toISOString();
    localStorage.setItem('gist_last_pushed', _gistLastPushed);
    gistUpdateStatus();
    if (manual) showToast('✓ Meest recente data geladen uit GitHub Gist', 'success');

  } catch(e) {
    console.error('Gist pull error:', e);
    if (statusEl) { statusEl.textContent = '❌ Fout: ' + e.message; statusEl.style.color = 'var(--loss)'; }
    if (manual) showToast('Gist fout: ' + e.message, 'error');
  }
}

// Setup wizard: restore from JSON file
async function setupJsonRestore(input) {
  const file = input.files[0];
  if (!file) return;
  const statusEl = document.getElementById('setup-json-status');
  if (statusEl) { statusEl.textContent = '⏳ Laden...'; statusEl.style.color = 'var(--text-muted)'; }
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.seasons && !data.players && !data.matches) throw new Error('Ongeldig bestandsformaat');
    await importDataObj(data);
    document.getElementById('setup-overlay').classList.remove('open');
    // Als Gist al geconfigureerd is op deze computer, direct pushen
    if (_gistToken && _gistId) {
      gistPush(false);
      showToast('✓ Data geladen en gesynchroniseerd met Gist', 'success');
    } else {
      showToast('✓ Data geladen — stel Gist sync in via Instellingen → Gegevens voor automatische backup', 'success');
    }
  } catch(e) {
    if (statusEl) { statusEl.textContent = '❌ ' + e.message; statusEl.style.color = 'var(--loss)'; }
  }
  input.value = '';
}

// Setup wizard: restore from Gist
async function setupGistRestore() {
  const token = document.getElementById('setup-gist-token')?.value?.trim();
  const id    = document.getElementById('setup-gist-id')?.value?.trim();
  const statusEl = document.getElementById('setup-gist-status');
  if (!token || !id) {
    if (statusEl) { statusEl.textContent = '⚠️ Vul beide velden in'; statusEl.style.color = 'var(--loss)'; }
    return;
  }
  if (statusEl) { statusEl.textContent = '⬇️ Laden...'; statusEl.style.color = 'var(--text-muted)'; }
  try {
    const res = await fetch(gistApiUrl(id), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    if (!res.ok) throw new Error('Ongeldige token of Gist ID');
    const json = await res.json();
    const fileContent = json.files?.[GIST_FILENAME]?.content;
    if (!fileContent) throw new Error('Geen seizoenstracker-data gevonden in deze Gist');
    const data = JSON.parse(fileContent);

    // Save credentials
    localStorage.setItem('gist_token', token);
    localStorage.setItem('gist_id', id);
    _gistToken = token;
    _gistId = id;

    // Import data and close wizard
    await importDataObj(data);
    document.getElementById('setup-overlay').classList.remove('open');
    showToast('✓ Data geladen vanuit GitHub Gist', 'success');
    if (statusEl) { statusEl.textContent = '✓ Gelukt!'; statusEl.style.color = 'var(--win)'; }
  } catch(e) {
    if (statusEl) { statusEl.textContent = '❌ ' + e.message; statusEl.style.color = 'var(--loss)'; }
  }
}

// Import data object directly (used by gistPull)
// ⚠️ LET OP — er is ook importData() in statistieken.js. Dat is GEEN
// duplicaat dat je zomaar kunt samenvoegen: importDataObj() hieronder is
// een "merge"-import voor Gist-sync (wist niets vooraf, roept gistPull()
// aan), terwijl importData() een "vervang alles"-restore is vanaf een
// JSON-bestand (wist eerst seasons/clubs/stadiums/competitions). Bij
// wijzigen: check of beide functies nog het juiste gedrag hebben voor
// hún eigen use-case — niet automatisch synchroniseren.
async function importDataObj(data) {
  window._isImporting = true;
  try {
    if (data.seasons)      { for (const s of data.seasons)      await dbPut('seasons', s); }
    if (data.clubs)        { for (const s of data.clubs)         await dbPut('clubs', s); }
    if (data.stadiums)     { for (const s of data.stadiums)      await dbPut('stadiums', s); }
    if (data.competitions) { for (const s of data.competitions)  await dbPut('competitions', s); }
    if (data.players)      { for (const s of data.players)       await dbPut('players', s); }
    if (data.matches)      { for (const s of data.matches)       await dbPut('matches', s); }
    if (data.coaches)      { for (const s of data.coaches)       await dbPut('coaches', s); }
    if (data.prefs)        { S.prefs = data.prefs; await dbPut('settings', {key:'prefs', value: JSON.stringify(S.prefs)}); }
    if (data.pinnedNextMatch !== undefined) { S.pinnedNextMatch = data.pinnedNextMatch; await saveSetting('pinnedNextMatch', S.pinnedNextMatch); }
  } finally {
    window._isImporting = false;
  }
  await loadAll();
  renderSeasonSelect();
  renderCompetitionsNav();
  renderDashboard();
}

init().then(() => gistInit()).catch(console.error);
