
// ══════════════════════════════════════════════════════
// SOCCER365 IMPORTER — KKD wedstrijden ophalen
// ══════════════════════════════════════════════════════

let s365Matches = []; // parsed matches from soccer365
let s365Selected = new Set(); // selected match indices

// Soccer365 competition IDs per season
// URL pattern: https://soccer365.net/competitions/595/results/
//              https://soccer365.net/competitions/595/2024-2025/results/
function s365Url(season) {
  // Current season (2025-2026) has no year in URL
  if (season === '2025-2026') return 'https://soccer365.net/competitions/595/results/';
  return `https://soccer365.net/competitions/595/${season}/results/`;
}

function s365LoadFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('s365-json-paste').value = e.target.result;
    s365ParseJson();
  };
  reader.readAsText(file);
  input.value = '';
}

function s365ParseJson() {
  const statusEl = document.getElementById('s365-status');
  const preview = document.getElementById('s365-preview');
  const raw = document.getElementById('s365-json-paste').value.trim();
  if (!raw) { statusEl.textContent = 'Geen data ingevoerd'; statusEl.style.color='var(--loss)'; return; }
  try {
    const data = JSON.parse(raw);
    const matches = data.matches || (Array.isArray(data) ? data : null);
    if (!matches || !matches.length) throw new Error('Geen wedstrijden gevonden in JSON');
    s365Matches = matches;
    s365Selected = new Set(matches.map((_,i)=>i));
    statusEl.textContent = `✓ ${matches.length} wedstrijden geladen${data.season?' voor '+data.season:''}`;
    statusEl.style.color = 'var(--win)';
    s365RenderPreview();
    preview.style.display = 'block';
  } catch(e) {
    statusEl.textContent = '❌ ' + e.message;
    statusEl.style.color = 'var(--loss)';
  }
}

function s365RenderPreview() {
  const el = document.getElementById('s365-matches-list');
  const countEl = document.getElementById('s365-count');
  if (!el) return;

  countEl.textContent = `${s365Selected.size} van ${s365Matches.length} geselecteerd`;

  // Group by round
  const byRound = {};
  s365Matches.forEach((m, i) => {
    const r = m.round || 0;
    if (!byRound[r]) byRound[r] = [];
    byRound[r].push({...m, idx: i});
  });

  let html = '';
  Object.keys(byRound).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(round => {
    html += `<div style="padding:6px 10px;background:var(--bg-tertiary);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);border-bottom:1px solid var(--border)">
      Speelronde ${round}
    </div>`;
    byRound[round].forEach(m => {
      const sel = s365Selected.has(m.idx);
      const score = m.homeScore !== null && m.awayScore !== null
        ? `<span style="font-weight:700;color:var(--cambuur-geel)">${m.homeScore} - ${m.awayScore}</span>`
        : '<span style="color:var(--text-muted)">— - —</span>';
      html += `<label style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid var(--border-light);cursor:pointer;${sel?'background:rgba(245,197,0,0.03)':''}">
        <input type="checkbox" ${sel?'checked':''} style="accent-color:var(--cambuur-geel);flex-shrink:0"
          onchange="s365ToggleMatch(${m.idx},this.checked)">
        <span style="font-size:11px;color:var(--text-muted);min-width:70px">${m.date||''}${m.time?' '+m.time:''}</span>
        <span style="flex:1;font-size:12px">${m.home}</span>
        ${score}
        <span style="flex:1;font-size:12px;text-align:right">${m.away}</span>
      </label>`;
    });
  });
  el.innerHTML = html;
}

function s365ToggleMatch(idx, checked) {
  if (checked) s365Selected.add(idx);
  else s365Selected.delete(idx);
  document.getElementById('s365-count').textContent = `${s365Selected.size} van ${s365Matches.length} geselecteerd`;
}

function s365ToggleAll() {
  if (s365Selected.size === s365Matches.length) s365Selected.clear();
  else s365Matches.forEach((_,i)=>s365Selected.add(i));
  s365RenderPreview();
}

async function s365Import() {
  const compId = document.getElementById('s365-comp-sel').value;
  const overwrite = document.getElementById('s365-overwrite').checked;
  const createClubs = document.getElementById('s365-create-clubs').checked;
  const season = document.getElementById('s365-season-sel').value || '2025-2026';
  const statusEl = document.getElementById('s365-status');

  if (!S.currentSeason) { showToast('Selecteer eerst een actief seizoen', 'error'); return; }

  // Find or create competition
  let targetCompId = compId;
  if (!targetCompId) {
    const seasonParts = season.split('-');
    const compName = `Keuken Kampioen Divisie ${seasonParts[0]}/${seasonParts[1]}`;
    const existing = (S.competitions||[]).find(c=>c.name===compName&&c.seasonId===S.currentSeason);
    if (existing) {
      targetCompId = existing.id;
    } else {
      const newComp = {
        id: 'comp_'+Date.now(),
        name: compName,
        type: 'competitie',
        seasonId: S.currentSeason,
        rounds: 38,
        clubIds: [],
        created: Date.now()
      };
      await dbPut('competitions', newComp);
      S.competitions.push(newComp);
      targetCompId = newComp.id;
      showToast(`Competitie "${compName}" aangemaakt`, 'success');
    }
  }

  // Club name → ID cache
  const clubCache = {};
  (S.clubs||[]).forEach(c => { clubCache[c.name.toLowerCase()] = c.id; });

  // Normalize club name (soccer365 may use short names)
  const knownAliases = {
    'cambuur': 'SC Cambuur', 'den haag': 'ADO Den Haag', 'ado den haag': 'ADO Den Haag',
    'graafschap': 'De Graafschap', 'den bosch': 'FC Den Bosch', 'oss': 'TOP Oss',
    'almere city': 'Almere City FC', 'jong ajax': 'Jong Ajax', 'jong psv': 'Jong PSV',
    'jong az alkmaar': 'Jong AZ', 'jong az': 'Jong AZ', 'jong utrecht': 'Jong FC Utrecht',
    'vvv venlo': 'VVV-Venlo', 'rkc waalwijk': 'RKC Waalwijk', 'roda': 'Roda JC',
    'dordrecht': 'FC Dordrecht', 'eindhoven': 'FC Eindhoven', 'emmen': 'FC Emmen',
    'vitesse': 'Vitesse', 'helmond sport': 'Helmond Sport', 'mvv maastricht': 'MVV Maastricht',
    'willem ii': 'Willem II',
  };

  async function getOrCreateClub(name) {
    const key = name.toLowerCase().trim();
    // Try cache
    if (clubCache[key]) return clubCache[key];
    // Try alias
    const alias = knownAliases[key];
    if (alias && clubCache[alias.toLowerCase()]) return clubCache[alias.toLowerCase()];
    const resolvedName = alias || name;
    // Try resolved name in cache
    if (clubCache[resolvedName.toLowerCase()]) return clubCache[resolvedName.toLowerCase()];
    // Create new club
    if (!createClubs) return null;
    const newClub = {id:'club_'+Date.now()+'_'+Math.random().toString(36).slice(2,6), name:resolvedName, abbr:resolvedName.slice(0,3).toUpperCase(), created:Date.now()};
    await dbPut('clubs', newClub);
    S.clubs.push(newClub);
    clubCache[resolvedName.toLowerCase()] = newClub.id;
    return newClub.id;
  }

  const toImport = s365Matches.filter((_,i)=>s365Selected.has(i));
  let imported = 0, skipped = 0;
  statusEl.textContent = `Importeren... 0/${toImport.length}`;
  statusEl.style.color = 'var(--text-muted)';

  for (const m of toImport) {
    const homeId = await getOrCreateClub(m.home);
    const awayId = await getOrCreateClub(m.away);
    if (!homeId || !awayId) { skipped++; continue; }

    // Check for existing match
    const existing = (S.matches||[]).find(x=>
      x.competitionId===targetCompId &&
      x.homeClubId===homeId && x.awayClubId===awayId &&
      x.date===m.date
    );
    if (existing && !overwrite) { skipped++; continue; }

    const match = {
      id: existing?.id || 'match_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
      competitionId: targetCompId,
      seasonId: S.currentSeason,
      homeClubId: homeId,
      awayClubId: awayId,
      date: m.date,
      time: m.time||null,
      round: m.round||null,
      played: m.homeScore !== null && m.awayScore !== null,
      homeScore: m.homeScore ?? null,
      awayScore: m.awayScore ?? null,
      events: existing?.events||[],
      lineup: existing?.lineup||[],
    };

    await dbPut('matches', match);
    if (existing) {
      S.matches = S.matches.map(x=>x.id===match.id?match:x);
    } else {
      S.matches.push(match);
    }
    imported++;
    if (imported % 10 === 0) statusEl.textContent = `Importeren... ${imported}/${toImport.length}`;
  }

  statusEl.textContent = `✓ ${imported} wedstrijden geïmporteerd, ${skipped} overgeslagen`;
  statusEl.style.color = 'var(--win)';
  window._playerStats = calcAllPlayerStats(S.currentSeason);
  showToast(`${imported} wedstrijden geïmporteerd van Soccer365`, 'success');
  closeModal('modal-match-import');
  renderCompDetail(targetCompId);
  navigateToComp(targetCompId);
}

