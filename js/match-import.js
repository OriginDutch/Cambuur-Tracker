// WEDSTRIJD-IMPORT — PDF/schema parsen en handmatige invoer


// ══════════════════════════════
// PDF / MATCH IMPORT
// ══════════════════════════════
let parsedPdfMatches = [];
let manualMatchQueue = [];
let parsedCsvMatches = [];
let parsedRsssfMatches = [];

function openMatchImport(compId, defaultTab) {
  parsedPdfMatches = [];
  manualMatchQueue = [];
  parsedCsvMatches = [];
  parsedRsssfMatches = [];
  document.getElementById('pdf-preview').style.display = 'none';
  document.getElementById('pdf-parse-status').textContent = '';
  document.getElementById('pdf-matches-list').innerHTML = '';
  document.getElementById('import-confirm-btn').style.display = 'none';
  document.getElementById('manual-add-btn').style.display = 'none';
  document.getElementById('manual-save-btn').style.display = 'none';
  document.getElementById('manual-matches-queue').innerHTML = '';
  document.getElementById('csv-preview').style.display = 'none';
  document.getElementById('csv-parse-status').textContent = '';
  document.getElementById('csv-matches-list').innerHTML = '';
  document.getElementById('csv-paste-area').value = '';
  document.getElementById('csv-confirm-btn').style.display = 'none';
  document.getElementById('rsssf-preview').style.display = 'none';
  document.getElementById('rsssf-parse-status').textContent = '';
  document.getElementById('rsssf-matches-list').innerHTML = '';
  document.getElementById('rsssf-paste-area').value = '';
  document.getElementById('rsssf-known-clubs').value = '';
  document.getElementById('rsssf-start-year').value = '';
  document.getElementById('rsssf-confirm-btn').style.display = 'none';

  // Populate comp selects
  const compOpts = S.competitions.filter(c=>c.seasonId===S.currentSeason).map(c=>
    `<option value="${c.id}" ${c.id===compId?'selected':''}>${c.name}</option>`).join('');
  document.getElementById('pdf-comp-select').innerHTML = compOpts;
  document.getElementById('manual-match-comp').innerHTML = compOpts;

  // Populate club selects for manual - filtered by competition
  function updateManualClubOpts() {
    const selCompId = document.getElementById('manual-match-comp')?.value;
    const selComp = S.competitions.find(c=>c.id===selCompId);
    const compClubs = selComp?.clubIds?.length
      ? S.clubs.filter(c=>selComp.clubIds.includes(c.id))
      : S.clubs;
    const opts = '<option value="">— Selecteer club —</option>' +
      compClubs.sort((a,b)=>{
        const da = divisionSortIndex(effectiveDivision(a)), db = divisionSortIndex(effectiveDivision(b));
        return da!==db ? da-db : a.name.localeCompare(b.name);
      }).map(c=>
        `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('manual-match-home').innerHTML = opts;
    document.getElementById('manual-match-away').innerHTML = opts;

    // Rondeveld: nummer voor competities, naamdropdown (uit comp.rounds) voor bekertoernooien
    const roundNumEl = document.getElementById('manual-match-round');
    const roundNameEl = document.getElementById('manual-match-round-name');
    if ((selComp?.type === 'beker' || selComp?.type === 'playoffs') && (selComp.rounds||[]).length) {
      roundNumEl.style.display = 'none';
      roundNameEl.style.display = 'block';
      roundNameEl.innerHTML = selComp.rounds.map(r=>`<option value="${r}">${r}</option>`).join('');
    } else {
      roundNumEl.style.display = 'block';
      roundNameEl.style.display = 'none';
    }
  }
  document.getElementById('manual-match-comp').onchange = updateManualClubOpts;
  updateManualClubOpts();

  const tabToOpen = defaultTab || 'pdf';
  const tabEl = document.querySelector(`#import-tabs .tab[onclick*="${tabToOpen}"]`) || document.querySelector('#import-tabs .tab');
  switchImportTab(tabToOpen, tabEl);
  document.getElementById('modal-match-import').classList.add('open');
}

function switchImportTab(tab, el) {
  document.getElementById('import-tab-pdf').style.display = tab==='pdf'?'block':'none';
  document.getElementById('import-tab-manual').style.display = tab==='manual'?'block':'none';
  document.getElementById('import-tab-csv').style.display = tab==='csv'?'block':'none';
  document.getElementById('import-tab-rsssf').style.display = tab==='rsssf'?'block':'none';
  document.querySelectorAll('#import-tabs .tab').forEach(t=>t.classList.remove('active'));
  if(el) el.classList.add('active');
  document.getElementById('import-confirm-btn').style.display = tab==='pdf'&&parsedPdfMatches.length?'block':'none';
  document.getElementById('manual-add-btn').style.display = tab==='manual'?'block':'none';
  document.getElementById('manual-save-btn').style.display = tab==='manual'&&manualMatchQueue.length?'block':'none';
  document.getElementById('csv-confirm-btn').style.display = tab==='csv'&&parsedCsvMatches.length?'block':'none';
  document.getElementById('rsssf-confirm-btn').style.display = tab==='rsssf'&&parsedRsssfMatches.length?'block':'none';
  if (tab==='csv' || tab==='rsssf') {
    const sel = document.getElementById(tab==='csv'?'csv-comp-select':'rsssf-comp-select');
    if (sel) {
      const comps = (S.competitions||[]).filter(c=>c.seasonId===S.currentSeason);
      sel.innerHTML = comps.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    }
  }
  if (tab==='rsssf' && !document.getElementById('rsssf-start-year').value) {
    const season = (S.seasons||[]).find(s=>s.id===S.currentSeason);
    document.getElementById('rsssf-start-year').value = season?.year || new Date().getFullYear();
  }
}

function parsePastedText() {
  const text = document.getElementById('pdf-paste-area').value.trim();
  const status = document.getElementById('pdf-parse-status');
  if (!text) { status.textContent = '⚠ Plak eerst tekst in het veld.'; status.style.color = 'var(--draw)'; return; }

  const result = parseKNVBSchedule(text);
  parsedPdfMatches = result.matches;

  if (parsedPdfMatches.length === 0) {
    status.textContent = '⚠ Geen wedstrijden herkend. Controleer of de tekst het KNVB-formaat heeft (ronde, datum, thuis, uit, tijd).';
    status.style.color = 'var(--draw)';
    return;
  }

  status.textContent = '✓ ' + parsedPdfMatches.length + ' wedstrijden herkend uit ' + result.rounds + ' speelronden';
  status.style.color = 'var(--win)';
  renderPdfPreview(result);
  document.getElementById('pdf-preview').style.display = 'block';
  document.getElementById('import-confirm-btn').style.display = 'block';

  if (result.unrecognized.length) {
    document.getElementById('pdf-unrecognized').style.display = 'block';
    document.getElementById('pdf-unrecognized-list').innerHTML = result.unrecognized.slice(0,20).map(l=>'<div>'+escHtml(l)+'</div>').join('');
  }
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function extractPdfText(file) {
  // Try to read as text first (some PDFs are text-based)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const buffer = e.target.result;
      const bytes = new Uint8Array(buffer);
      // Extract text between stream objects in PDF
      let text = '';
      // Try UTF-8 decode
      try {
        const decoder = new TextDecoder('utf-8', {fatal:false});
        const raw = decoder.decode(bytes);
        // Extract readable text portions - look for text between parentheses and BT/ET blocks
        const matches = [];
        // Pattern 1: text in parentheses (Tj, TJ operators)
        const paren = raw.matchAll(/\(([^)]{2,80})\)\s*(?:Tj|TJ)/g);
        for (const m of paren) {
          const t = m[1].replace(/\n/g,' ').replace(/\r/g,'').replace(/\(/g,'(').replace(/\)/g,')').trim();
          if (t.length > 1) matches.push(t);
        }
        // Pattern 2: plain text lines that look like schedule data
        const lines = raw.split(/[\n\r]+/);
        for (const line of lines) {
          const clean = line.replace(/[^ -~ -ÿ ]/g,' ').replace(/\s+/g,' ').trim();
          if (clean.length > 5) matches.push(clean);
        }
        text = matches.join('\n');
      } catch(err) {
        text = '';
      }
      resolve(text);
    };
    reader.onerror = () => reject(new Error('Kon PDF niet lezen'));
    reader.readAsArrayBuffer(file);
  });
}

function parseKNVBSchedule(text) {
  const matches = [];
  const unrecognized = [];
  const roundsSeen = new Set();

  const MONTHS = {
    'januari':1,'februari':2,'maart':3,'april':4,'mei':5,'juni':6,
    'juli':7,'augustus':8,'september':9,'oktober':10,'november':11,'december':12
  };

  // Get clubs for matching — prefer clubs in the selected competition
  const compId = document.getElementById('pdf-comp-select')?.value;
  const comp = compId ? S.competitions.find(c=>c.id===compId) : null;
  const compClubIds = comp?.clubIds || [];
  // Use only comp clubs if available, fall back to all clubs
  const matchClubs = compClubIds.length
    ? compClubIds.map(id=>S.clubs.find(c=>c.id===id)).filter(Boolean)
    : S.clubs;

  const lines = text.split('\n').map(l=>l.trim()).filter(l=>l.length>3);

  for (const line of lines) {
    // Must start with round number
    const roundMatch = line.match(/^(\d{1,2})\s/);
    if (!roundMatch) continue;
    const round = parseInt(roundMatch[1]);
    if (round < 1 || round > 40) continue;

    // Must contain a month name + year
    const dateMatch = line.match(/(\d{1,2})\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+(20\d{2})/i);
    if (!dateMatch) continue;

    const month = MONTHS[dateMatch[2].toLowerCase()];
    const year = parseInt(dateMatch[3]);
    const day = parseInt(dateMatch[1]);
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

    // Time: HH:MM near end (before optional score)
    const timeScoreMatch = line.match(/(\d{1,2}:\d{2})(?:\s*\*+)?(?:\s+(\d{1,2})-(\d{1,2}))?\s*\*?\s*$/);
    const time = timeScoreMatch ? timeScoreMatch[1] : null;
    const homeScore = timeScoreMatch && timeScoreMatch[2] !== undefined ? parseInt(timeScoreMatch[2]) : null;
    const awayScore = timeScoreMatch && timeScoreMatch[3] !== undefined ? parseInt(timeScoreMatch[3]) : null;

    // Also check for score-only at end (no time): e.g. "... 5-1"
    let hs = homeScore, as_ = awayScore;
    if (hs === null) {
      const scoreOnly = line.match(/(\d{1,2})-(\d{1,2})\s*\*?\s*$/);
      if (scoreOnly && !line.match(/(\d{1,2}:\d{2})/)) {
        hs = parseInt(scoreOnly[1]); as_ = parseInt(scoreOnly[2]);
      }
    }

    // Get everything after the date string, remove day name prefix, remove time+score suffix
    let afterDate = line.slice(line.indexOf(dateMatch[0]) + dateMatch[0].length).trim();
    afterDate = afterDate.replace(/^(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\s+/i, '').trim();

    // Remove time+score from end
    let clubPart = afterDate;
    if (time) {
      clubPart = clubPart.replace(new RegExp(time.replace(':','[:]') + '(?:\\s*\\*+)?(?:\\s+\\d{1,2}-\\d{1,2})?\\s*\\*?\\s*$'), '').trim();
    } else if (hs !== null) {
      // Remove trailing score
      clubPart = clubPart.replace(/\d{1,2}-\d{1,2}\s*\*?\s*$/, '').trim();
    }
    clubPart = clubPart.replace(/\s*\*+\s*$/, '').trim();

    // Try dash separator first: "Thuis - Uit"
    let home = null, away = null, homeId = null, awayId = null;
    const dashIdx = clubPart.indexOf(' - ');
    if (dashIdx > 0) {
      const rawHome = clubPart.slice(0, dashIdx).trim();
      const rawAway = clubPart.slice(dashIdx + 3).trim();
      // Match to known clubs (exact first, then case-insensitive)
      const findClub = (name) => {
        let c = matchClubs.find(c=>c.name===name);
        if (!c) c = matchClubs.find(c=>c.name.toLowerCase()===name.toLowerCase());
        return c || null;
      };
      const hClub = findClub(rawHome);
      const aClub = findClub(rawAway);
      home = hClub?.name || rawHome;
      away = aClub?.name || rawAway;
      homeId = hClub?.id || null;
      awayId = aClub?.id || null;
    } else {
      // No dash — longest-match greedy from start
      const sortedClubs = [...matchClubs].sort((a,b)=>b.name.length-a.name.length);
      let remaining = clubPart;
      for (const club of sortedClubs) {
        if (remaining.toLowerCase().startsWith(club.name.toLowerCase())) {
          home = club.name; homeId = club.id;
          remaining = remaining.slice(club.name.length).trim();
          break;
        }
      }
      if (home) {
        for (const club of sortedClubs) {
          if (club.name !== home && remaining.toLowerCase().startsWith(club.name.toLowerCase())) {
            away = club.name; awayId = club.id; break;
          }
        }
      }
      // Final fallback: split on multiple spaces
      if (!home || !away) {
        const parts = clubPart.split(/\s{2,}/);
        if (parts.length >= 2) {
          home = parts[0].trim(); away = parts[parts.length-1].trim();
          homeId = matchClubs.find(c=>c.name.toLowerCase()===home.toLowerCase())?.id||null;
          awayId = matchClubs.find(c=>c.name.toLowerCase()===away.toLowerCase())?.id||null;
        }
      }
    }

    if (home && away && home !== away) {
      roundsSeen.add(round);
      matches.push({
        round, date: dateStr, time, homeName: home, awayName: away,
        homeClubId: homeId, awayClubId: awayId,
        homeScore: hs, awayScore: as_,
        played: hs !== null && as_ !== null
      });
    } else {
      unrecognized.push(line.slice(0,100));
    }
  }

  return { matches, rounds: roundsSeen.size, unrecognized };
}

function renderPdfPreview(result) {
  document.getElementById('pdf-match-count').textContent =
    `${result.matches.length} wedstrijden · ${result.rounds} speelronden`;

  const cam = S.clubs.find(c=>c.isOwnClub);
  const rows = result.matches.map((m,i) => {
    const isCam = m.homeName===cam?.name||m.awayName===cam?.name||
                  m.homeClubId===cam?.id||m.awayClubId===cam?.id;
    const homeOk = !!m.homeClubId;
    const awayOk = !!m.awayClubId;
    const scoreStr = m.played
      ? `<span style="font-weight:700;color:var(--win)">${m.homeScore}-${m.awayScore}</span>`
      : `<span class="text-muted">${m.time||'—'}</span>`;
    return `<div style="display:grid;grid-template-columns:36px 76px 1fr 70px 1fr 24px;gap:4px;align-items:center;padding:5px 10px;border-bottom:1px solid var(--border-light);font-size:11px;${isCam?'background:rgba(245,197,0,0.05)':''}">
      <span class="text-muted">R${m.round}</span>
      <span class="text-muted">${m.date.slice(5)}</span>
      <span style="text-align:right;font-weight:${homeOk?'600':'400'};color:${homeOk?'var(--text-primary)':'var(--draw)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(m.homeName||'?')}</span>
      <span style="text-align:center">${scoreStr}</span>
      <span style="font-weight:${awayOk?'600':'400'};color:${awayOk?'var(--text-primary)':'var(--draw)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(m.awayName||'?')}</span>
      <button class="icon-btn danger" onclick="parsedPdfMatches.splice(${i},1);renderPdfPreview({matches:parsedPdfMatches,rounds:new Set(parsedPdfMatches.map(x=>x.round)).size,unrecognized:[]})" style="font-size:11px;padding:1px 4px">✕</button>
    </div>`;
  }).join('');

  document.getElementById('pdf-matches-list').innerHTML = rows;
}

async function confirmMatchImport() {
  if (!parsedPdfMatches.length) return;
  const compId = document.getElementById('pdf-comp-select').value;
  if (!compId) { showToast('Selecteer een competitie', 'error'); return; }
  const overwrite = document.getElementById('pdf-overwrite').checked;

  let imported = 0, skipped = 0;
  for (const m of parsedPdfMatches) {
    // Check for duplicate
    const exists = S.matches.find(x=>x.competitionId===compId&&x.round===m.round&&
      (x.homeName===m.homeName||x.homeClubId===m.homeClubId)&&
      (x.awayName===m.awayName||x.awayClubId===m.awayClubId));
    if (exists && !overwrite) { skipped++; continue; }
    const id = exists?.id || genId('match');
    const obj = {
      id, competitionId: compId, seasonId: S.currentSeason,
      round: m.round, date: m.date, time: m.time||null,
      homeClubId: m.homeClubId||null, awayClubId: m.awayClubId||null,
      homeName: m.homeName, awayName: m.awayName,
      homeScore: m.homeScore !== null ? m.homeScore : (exists?.homeScore||null),
      awayScore: m.awayScore !== null ? m.awayScore : (exists?.awayScore||null),
      played: m.played || exists?.played || false,
      events: exists?.events||[], motm: exists?.motm||null, notes: exists?.notes||''
    };
    await dbPut('matches', obj);
    if (exists) { S.matches[S.matches.findIndex(x=>x.id===id)] = obj; }
    else { S.matches.push(obj); }
    imported++;
  }

  closeModal('modal-match-import');
  // Re-render competition
  renderCompDetail(compId);
  const navItem = document.querySelector(`.nav-item[data-comp="${compId}"]`);
  if (navItem) { document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active')); navItem.classList.add('active'); }
  showToast(`${imported} wedstrijden geïmporteerd${skipped?' ('+skipped+' overgeslagen)':''}`, 'success');
}

// Manual match entry
function addManualMatch() {
  const compId = document.getElementById('manual-match-comp').value;
  const selComp = S.competitions.find(c=>c.id===compId);
  const isKnockout = (selComp?.type === 'beker' || selComp?.type === 'playoffs') && (selComp.rounds||[]).length;
  const round = isKnockout
    ? document.getElementById('manual-match-round-name').value
    : parseInt(document.getElementById('manual-match-round').value);
  const date = document.getElementById('manual-match-date').value;
  const time = document.getElementById('manual-match-time').value;
  const homeId = document.getElementById('manual-match-home').value;
  const awayId = document.getElementById('manual-match-away').value;

  if (!compId) { showToast('Selecteer een competitie', 'error'); return; }
  if (!homeId || !awayId) { showToast('Selecteer thuis- en uitclub', 'error'); return; }
  if (homeId === awayId) { showToast('Thuis- en uitclub mogen niet hetzelfde zijn', 'error'); return; }
  if (!round || (!isKnockout && round < 1)) { showToast('Voer een speelronde in', 'error'); return; }

  const homeClub = S.clubs.find(c=>c.id===homeId);
  const awayClub = S.clubs.find(c=>c.id===awayId);
  manualMatchQueue.push({ compId, round, date, time, homeId, awayId, homeName: homeClub?.name||'', awayName: awayClub?.name||'' });

  renderManualQueue();
  document.getElementById('manual-save-btn').style.display = 'block';
}

function renderManualQueue() {
  const wrap = document.getElementById('manual-matches-queue');
  if (!manualMatchQueue.length) { wrap.innerHTML=''; return; }
  wrap.innerHTML = `<div style="font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Toe te voegen (${manualMatchQueue.length})</div>` +
    manualMatchQueue.map((m,i)=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 8px;background:var(--bg-tertiary);border-radius:var(--radius-sm);margin-bottom:4px;font-size:12px">
        <span class="text-muted">R${m.round}</span>
        <span>${escHtml(m.homeName)} vs ${escHtml(m.awayName)}</span>
        <span class="text-muted">${m.date||'—'} ${m.time||''}</span>
        <button class="icon-btn danger" onclick="manualMatchQueue.splice(${i},1);renderManualQueue();if(!manualMatchQueue.length)document.getElementById('manual-save-btn').style.display='none'" style="font-size:11px">✕</button>
      </div>`).join('');
}

async function saveManualMatches() {
  if (!manualMatchQueue.length) return;
  let count = 0;
  for (const m of manualMatchQueue) {
    const id = genId('match');
    const obj = { id, competitionId: m.compId, seasonId: S.currentSeason, round: m.round, date: m.date||null, time: m.time||null, homeClubId: m.homeId, awayClubId: m.awayId, homeName: m.homeName, awayName: m.awayName, homeScore: null, awayScore: null, played: false, events: [], motm: null, notes: '' };
    await dbPut('matches', obj);
    S.matches.push(obj);
    count++;
  }
  manualMatchQueue = [];
  closeModal('modal-match-import');
  const compId = document.getElementById('manual-match-comp').value;
  if (compId) renderCompDetail(compId);
  showToast(`${count} wedstrijden toegevoegd`, 'success');
}


// ══════════════════════════════
// CSV IMPORT — spreadsheet-resultaten plakken (bron-onafhankelijk)
// ══════════════════════════════
// Werkt met tab- of komma-gescheiden regels: datum, ronde, thuisclub, uitclub,
// thuisscore, uitscore. Bewust simpel en voorspelbaar — geen site-specifieke
// scraper, dus bruikbaar met resultaten uit welke bron dan ook (gekopieerd
// via een tussenstap in Excel/Google Sheets).
function parseCsvDate(raw) {
  raw = (raw||'').trim();
  let m = raw.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m = raw.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return null;
}

function parseCsvSchedule() {
  const text = document.getElementById('csv-paste-area').value.trim();
  const status = document.getElementById('csv-parse-status');
  if (!text) { status.textContent = '⚠ Plak eerst tekst in het veld.'; status.style.color = 'var(--draw)'; return; }

  const findClub = (name) => {
    if (!name) return null;
    name = name.trim();
    return S.clubs.find(c=>c.name===name) || S.clubs.find(c=>c.name.toLowerCase()===name.toLowerCase()) || null;
  };

  const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
  const matches = [];
  const unrecognized = [];

  lines.forEach(line => {
    const cols = (line.includes('\t') ? line.split('\t') : line.split(',')).map(c=>c.trim());
    if (cols.length < 4) { unrecognized.push(line); return; }
    const [rawDate, rawRound, rawHome, rawAway, rawHomeScore, rawAwayScore] = cols;
    const date = parseCsvDate(rawDate);
    if (!date || !rawHome || !rawAway) { unrecognized.push(line); return; }

    const homeClub = findClub(rawHome);
    const awayClub = findClub(rawAway);
    const round = parseInt(rawRound);
    const hs = (rawHomeScore!==undefined && rawHomeScore!=='') ? parseInt(rawHomeScore) : null;
    const as = (rawAwayScore!==undefined && rawAwayScore!=='') ? parseInt(rawAwayScore) : null;

    matches.push({
      date, round: isNaN(round) ? null : round,
      homeName: homeClub?.name || rawHome, awayName: awayClub?.name || rawAway,
      homeId: homeClub?.id || null, awayId: awayClub?.id || null,
      homeScore: (hs!==null && !isNaN(hs)) ? hs : null,
      awayScore: (as!==null && !isNaN(as)) ? as : null,
      selected: true,
    });
  });

  parsedCsvMatches = matches;
  if (!matches.length) {
    status.textContent = '❌ Geen geldige regels herkend — check of elke regel minimaal datum, thuisclub en uitclub bevat.';
    status.style.color = 'var(--loss)';
    document.getElementById('csv-preview').style.display = 'none';
    document.getElementById('csv-confirm-btn').style.display = 'none';
    return;
  }
  status.textContent = `✓ ${matches.length} wedstrijden herkend${unrecognized.length?`, ${unrecognized.length} regel(s) niet herkend`:''}`;
  status.style.color = 'var(--win)';
  renderCsvPreview(unrecognized);
}

function renderCsvPreview(unrecognized) {
  document.getElementById('csv-match-count').textContent = `${parsedCsvMatches.length} wedstrijden`;
  const list = document.getElementById('csv-matches-list');
  list.innerHTML = parsedCsvMatches.map((m,i) => {
    const homeWarn = !m.homeId ? ' <span style="color:var(--draw)" title="Onbekende club — wordt evt. aangemaakt">⚠️</span>' : '';
    const awayWarn = !m.awayId ? ' <span style="color:var(--draw)" title="Onbekende club — wordt evt. aangemaakt">⚠️</span>' : '';
    const scoreStr = (m.homeScore!==null && m.awayScore!==null) ? `${m.homeScore}-${m.awayScore}` : '— (nog te spelen)';
    return `<label style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid var(--border-light);cursor:pointer;font-size:12px">
      <input type="checkbox" ${m.selected?'checked':''} onchange="parsedCsvMatches[${i}].selected=this.checked">
      <span style="width:80px;color:var(--text-muted)">${m.date}</span>
      <span style="width:32px;color:var(--text-muted)">R${m.round??'?'}</span>
      <span style="flex:1">${m.homeName}${homeWarn}</span>
      <span style="width:90px;text-align:center;font-weight:700">${scoreStr}</span>
      <span style="flex:1">${m.awayName}${awayWarn}</span>
    </label>`;
  }).join('');

  const unrecEl = document.getElementById('csv-unrecognized');
  unrecEl.style.display = unrecognized.length ? 'block' : 'none';
  document.getElementById('csv-unrecognized-list').innerHTML = unrecognized.map(l=>`<div>${l}</div>`).join('');

  document.getElementById('csv-preview').style.display = 'block';
  document.getElementById('csv-confirm-btn').style.display = 'block';
}

async function confirmCsvImport() {
  const compId = document.getElementById('csv-comp-select').value;
  if (!compId) { showToast('Selecteer een competitie', 'error'); return; }
  const overwrite = document.getElementById('csv-overwrite').checked;
  const createClubs = document.getElementById('csv-create-clubs').checked;
  const selected = parsedCsvMatches.filter(m=>m.selected);
  if (!selected.length) { showToast('Selecteer minstens één wedstrijd', 'error'); return; }

  async function getOrCreateClub(name, existingId) {
    if (existingId) return existingId;
    if (!createClubs) return null;
    const newClub = {id: genId('club'), name, abbr: deriveClubAbbr(name), created: Date.now()};
    await dbPut('clubs', newClub);
    S.clubs.push(newClub);
    return newClub.id;
  }

  let imported = 0, skipped = 0;
  for (const m of selected) {
    const homeId = await getOrCreateClub(m.homeName, m.homeId);
    const awayId = await getOrCreateClub(m.awayName, m.awayId);
    if (!homeId || !awayId) { skipped++; continue; }

    const existing = (S.matches||[]).find(x=>
      x.competitionId===compId && x.homeClubId===homeId && x.awayClubId===awayId && x.date===m.date
    );
    if (existing && !overwrite) { skipped++; continue; }

    const match = {
      id: existing?.id || genId('match'),
      competitionId: compId,
      seasonId: S.currentSeason,
      round: m.round,
      date: m.date,
      time: existing?.time || null,
      homeClubId: homeId,
      awayClubId: awayId,
      played: m.homeScore !== null && m.awayScore !== null,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      events: existing?.events || [],
      lineup: existing?.lineup || [],
    };
    await dbPut('matches', match);
    if (existing) S.matches = S.matches.map(x=>x.id===match.id?match:x);
    else S.matches.push(match);
    imported++;
  }

  showToast(`${imported} wedstrijden geïmporteerd${skipped?`, ${skipped} overgeslagen`:''}`, 'success');
  closeModal('modal-match-import');
  renderCompDetail(compId);
  navigateToComp(compId);
}

// ══════════════════════════════
// RSSSF IMPORT — "Round N [Mon Day] Club score-score Club ..." tekst plakken
// ══════════════════════════════
// RSSSF's formaat is opvallend regelmatig (bevestigd over meerdere landen/
// seizoenen): expliciete rondenummers, datum-markers zonder jaar, en per
// datum een reeks "Club score-score Club" zonder scheidingsteken tussen
// matches. Dat laatste maakt een lijst van bekende clubnamen nodig om te
// bepalen waar de ene naam eindigt en de volgende begint (greedy longest-
// match, net als bij de KNVB-PDF-parser).
const RSSSF_MONTHS = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};

function parseRsssfSchedule() {
  const text = document.getElementById('rsssf-paste-area').value.trim();
  const status = document.getElementById('rsssf-parse-status');
  if (!text) { status.textContent = '⚠ Plak eerst tekst in het veld.'; status.style.color = 'var(--draw)'; return; }

  const startYear = parseInt(document.getElementById('rsssf-start-year').value) || new Date().getFullYear();
  const knownClubsRaw = document.getElementById('rsssf-known-clubs').value.trim();
  const knownClubNames = knownClubsRaw
    ? knownClubsRaw.split(',').map(s=>s.trim()).filter(Boolean)
    : (S.clubs||[]).map(c=>c.name);
  const sortedNames = [...new Set(knownClubNames)].sort((a,b)=>b.length-a.length);

  const findClubObj = (name) => (S.clubs||[]).find(c=>c.name===name) || (S.clubs||[]).find(c=>c.name.toLowerCase()===name.toLowerCase()) || null;

  const flat = text.replace(/\s+/g, ' ').trim();
  const roundParts = flat.split(/\bRound\s+(\d+)\b/);

  const matches = [];
  const unrecognized = [];

  for (let i = 1; i < roundParts.length; i += 2) {
    const roundNum = parseInt(roundParts[i]);
    const roundText = roundParts[i+1] || '';

    const dateParts = roundText.split(/\[([A-Za-z]{3})\s+(\d{1,2})\]/);
    for (let j = 1; j < dateParts.length; j += 3) {
      const monAbbr = dateParts[j];
      const day = parseInt(dateParts[j+1]);
      const matchText = (dateParts[j+2] || '').trim();
      const monthNum = RSSSF_MONTHS[monAbbr];
      if (!monthNum) { if (matchText) unrecognized.push(matchText); continue; }
      const year = monthNum >= 8 ? startYear : startYear + 1;
      const dateStr = `${year}-${String(monthNum).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

      let remaining = matchText;
      while (remaining.length) {
        const scoreMatch = remaining.match(/^(.*?)(\d+)-(\d+)\s*/);
        if (!scoreMatch || !scoreMatch[1].trim()) { if (remaining.trim()) unrecognized.push(`[${dateStr}] ${remaining.trim()}`); break; }
        const homeName = scoreMatch[1].trim();
        const homeScore = parseInt(scoreMatch[2]);
        const awayScore = parseInt(scoreMatch[3]);
        remaining = remaining.slice(scoreMatch[0].length);

        let awayName = sortedNames.find(cand => remaining.toLowerCase().startsWith(cand.toLowerCase())) || null;
        if (!awayName) {
          unrecognized.push(`[${dateStr}] ${homeName} ${homeScore}-${awayScore} <onbekende club in: "${remaining.slice(0,40)}...">`);
          break; // stop deze datum-groep, verdere splitsing zou cascaderen
        }
        remaining = remaining.slice(awayName.length).trim();

        const homeClub = findClubObj(homeName);
        const awayClub = findClubObj(awayName);
        matches.push({
          date: dateStr, round: roundNum,
          homeName: homeClub?.name || homeName, awayName: awayClub?.name || awayName,
          homeId: homeClub?.id || null, awayId: awayClub?.id || null,
          homeScore, awayScore, time: '', selected: true,
        });
      }
    }
  }

  parsedRsssfMatches = matches;
  if (!matches.length) {
    status.textContent = '❌ Geen wedstrijden herkend — check of de tekst "Round X [Mnd Dag] Club score-score Club" bevat, en of de clublijst compleet is.';
    status.style.color = 'var(--loss)';
    document.getElementById('rsssf-preview').style.display = 'none';
    document.getElementById('rsssf-confirm-btn').style.display = 'none';
    return;
  }
  status.textContent = `✓ ${matches.length} wedstrijden herkend${unrecognized.length?`, ${unrecognized.length} stuk(ken) tekst niet herkend`:''}`;
  status.style.color = 'var(--win)';
  renderRsssfPreview(unrecognized);
}

function renderRsssfPreview(unrecognized) {
  document.getElementById('rsssf-match-count').textContent = `${parsedRsssfMatches.length} wedstrijden`;
  const list = document.getElementById('rsssf-matches-list');
  list.innerHTML = parsedRsssfMatches.map((m,i) => {
    const homeWarn = !m.homeId ? ' <span style="color:var(--draw)" title="Onbekende club — wordt evt. aangemaakt">⚠️</span>' : '';
    const awayWarn = !m.awayId ? ' <span style="color:var(--draw)" title="Onbekende club — wordt evt. aangemaakt">⚠️</span>' : '';
    return `<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--border-light);font-size:12px">
      <input type="checkbox" ${m.selected?'checked':''} onchange="parsedRsssfMatches[${i}].selected=this.checked">
      <span style="width:76px;color:var(--text-muted)">${m.date}</span>
      <span style="width:30px;color:var(--text-muted)">R${m.round}</span>
      <span style="flex:1">${m.homeName}${homeWarn}</span>
      <span style="width:56px;text-align:center;font-weight:700">${m.homeScore}-${m.awayScore}</span>
      <span style="flex:1">${m.awayName}${awayWarn}</span>
      <input type="time" value="${m.time||''}" onchange="parsedRsssfMatches[${i}].time=this.value"
        style="width:90px;height:24px;font-size:11px;padding:1px 4px;border:1px solid var(--border);border-radius:3px;background:var(--bg-tertiary);color:var(--text-primary)">
    </div>`;
  }).join('');

  const unrecEl = document.getElementById('rsssf-unrecognized');
  unrecEl.style.display = unrecognized.length ? 'block' : 'none';
  document.getElementById('rsssf-unrecognized-list').innerHTML = unrecognized.map(l=>`<div>${l}</div>`).join('');

  document.getElementById('rsssf-preview').style.display = 'block';
  document.getElementById('rsssf-confirm-btn').style.display = 'block';
}

async function confirmRsssfImport() {
  const compId = document.getElementById('rsssf-comp-select').value;
  if (!compId) { showToast('Selecteer een competitie', 'error'); return; }
  const overwrite = document.getElementById('rsssf-overwrite').checked;
  const createClubs = document.getElementById('rsssf-create-clubs').checked;
  const selected = parsedRsssfMatches.filter(m=>m.selected);
  if (!selected.length) { showToast('Selecteer minstens één wedstrijd', 'error'); return; }

  async function getOrCreateClub(name, existingId) {
    if (existingId) return existingId;
    if (!createClubs) return null;
    const newClub = {id: genId('club'), name, abbr: deriveClubAbbr(name), created: Date.now()};
    await dbPut('clubs', newClub);
    S.clubs.push(newClub);
    return newClub.id;
  }

  let imported = 0, skipped = 0;
  for (const m of selected) {
    const homeId = await getOrCreateClub(m.homeName, m.homeId);
    const awayId = await getOrCreateClub(m.awayName, m.awayId);
    if (!homeId || !awayId) { skipped++; continue; }

    const existing = (S.matches||[]).find(x=>
      x.competitionId===compId && x.homeClubId===homeId && x.awayClubId===awayId && x.date===m.date
    );
    if (existing && !overwrite) { skipped++; continue; }

    const match = {
      id: existing?.id || genId('match'),
      competitionId: compId,
      seasonId: S.currentSeason,
      round: m.round,
      date: m.date,
      time: m.time || existing?.time || null,
      homeClubId: homeId,
      awayClubId: awayId,
      played: true,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      events: existing?.events || [],
      lineup: existing?.lineup || [],
    };
    await dbPut('matches', match);
    if (existing) S.matches = S.matches.map(x=>x.id===match.id?match:x);
    else S.matches.push(match);
    imported++;
  }

  showToast(`${imported} wedstrijden geïmporteerd${skipped?`, ${skipped} overgeslagen`:''}`, 'success');
  closeModal('modal-match-import');
  renderCompDetail(compId);
  navigateToComp(compId);
}
