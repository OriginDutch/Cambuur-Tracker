// WEDSTRIJD INVOEREN MODAL
// ══════════════════════════════
let currentMatchId = null;
let matchGoals = [], matchCards = [], matchSubs = [];

function openMatchModal(matchId) {
  currentMatchId = matchId;
  const m = (S.matches||[]).find(x=>x.id===matchId);
  if (!m) return;
  const homeClub = S.clubs.find(c=>c.id===m.homeClubId);
  const awayClub = S.clubs.find(c=>c.id===m.awayClubId);
  const cam = S.clubs.find(c=>c.isOwnClub);
  const isCamHome = m.homeClubId === cam?.id;
  const oppName = isCamHome ? (awayClub?.name||m.awayName) : (homeClub?.name||m.homeName);
  const homeLabel = homeClub?.name || m.homeName;
  const awayLabel = awayClub?.name || m.awayName;

  matchGoals = JSON.parse(JSON.stringify(m.events?.filter(e=>e.type==='goal')||[]));
  matchCards = JSON.parse(JSON.stringify(m.events?.filter(e=>e.type==='card')||[]));
  matchSubs = JSON.parse(JSON.stringify(m.events?.filter(e=>e.type==='sub')||[]));
  initLineupPeriods(m);

  document.getElementById('match-modal-title').textContent = `${homeLabel} vs ${awayLabel}`;
  document.getElementById('mm-home-label').textContent = homeLabel;
  document.getElementById('mm-away-label').textContent = awayLabel;
  document.getElementById('mm-home-score').value = m.homeScore ?? '';
  document.getElementById('mm-away-score').value = m.awayScore ?? '';
  document.getElementById('mm-date').value = m.date || '';
  document.getElementById('mm-time').value = m.time || '';
  document.getElementById('mm-motm').value = m.motm || '';
  const notesEl = document.getElementById('mm-notes'); if(notesEl) notesEl.value = m.notes || '';


  // Populate player selects
  const players = (S.players||[]).filter(p=>!['vertrokken','uitgeleend'].includes(p.status));
  const playerOpts = `<option value="">— Speler —</option>` + players.map(p=>`<option value="${p.id}">${p.number?'#'+p.number+' ':''}${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</option>`).join('');
  ['mm-motm'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) sel.innerHTML = `<option value="">— Geen —</option>` + players.map(p=>`<option value="${p.id}">${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</option>`).join('');
  });
  if (m.motm) document.getElementById('mm-motm').value = m.motm;

  // Store player opts globally for dynamic adds
  window._matchPlayerOpts = playerOpts;
  window._matchIsCamHome = isCamHome;
  window._matchOppName = oppName;

  renderGoalsList();
  renderCardsList();
  renderSubsList();

  renderLineupList();
  document.getElementById('modal-match').classList.add('open');
}

function renderGoalsList() {
  const wrap = document.getElementById('mm-goals-list');
  const players = (S.players||[]).filter(p=>!['vertrokken','uitgeleend'].includes(p.status));
  const pOpts = window._matchPlayerOpts || '';
  const oppName = window._matchOppName || 'Tegenstander';

  // Get opponent clubs from the current match competition
  const m = (S.matches||[]).find(x=>x.id===currentMatchId);
  const comp = m ? S.competitions.find(c=>c.id===m.competitionId) : null;
  const compClubs = comp ? (comp.clubIds||[]).map(cid=>S.clubs.find(c=>c.id===cid)).filter(Boolean) : S.clubs;
  const cam2 = S.clubs.find(c=>c.isOwnClub);
  // Determine the opponent club for this specific match
  const oppClub = m ? S.clubs.find(c=>c.id===(m.homeClubId===cam2?.id ? m.awayClubId : m.homeClubId)) : null;
  const oppClubName = oppClub?.name || m?.awayName || m?.homeName || 'Tegenstander';
  // Auto-set oppClubId on opponent goals if not set
  matchGoals.forEach(g => { if(g.playerId==='__opp__' && !g.oppClubId && oppClub) g.oppClubId = oppClub.id; });

  // Sort by minute before rendering
  matchGoals.sort((a,b)=>(a.minute||999)-(b.minute||999));

  wrap.innerHTML = matchGoals.map((g,i) => {
    const isOpp = g.playerId==='__opp__'||g.playerId==='__opp_own__';
    return `<div class="goal-block" draggable="true"
      ondragstart="goalDragStart(event,${i})"
      ondragover="goalDragOver(event)"
      ondrop="goalDrop(event,${i})"
      ondragend="goalDragEnd(event)"
      style="background:var(--bg-tertiary);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;margin-bottom:6px">
      <div style="display:grid;grid-template-columns:16px 60px 1fr 1fr 90px auto;gap:6px;align-items:center;margin-bottom:${isOpp?'6px':'0'}">
        <span class="drag-handle" title="Versleep om volgorde te wijzigen">⠿</span>
        <input class="form-input" value="${g.minute||''}" placeholder="Min" type="number" min="1" max="120"
          oninput="matchGoals[${i}].minute=parseInt(this.value)||null;setTimeout(()=>{renderGoalsList();recalcScore();},600)" style="font-size:12px;padding:5px 6px;height:32px">
        <select class="form-select" onchange="matchGoals[${i}].playerId=this.value;renderGoalsList();recalcScore()" style="font-size:12px;padding:5px 6px;height:32px">
          <option value="">— Cambuur speler —</option>
          ${players.map(p=>`<option value="${p.id}" ${p.id===g.playerId?'selected':''}>${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</option>`).join('')}
          <option value="__opp__" ${g.playerId==='__opp__'?'selected':''}>⚽ Tegendoelpunt</option>
        </select>
        <select class="form-select" oninput="matchGoals[${i}].assistId=this.value" style="font-size:12px;padding:5px 6px;height:32px;${isOpp?'opacity:0.3;pointer-events:none':''}">
          <option value="">— Assist —</option>
          ${players.map(p=>`<option value="${p.id}" ${p.id===g.assistId?'selected':''}>${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</option>`).join('')}
        </select>
        <select class="form-select" oninput="matchGoals[${i}].goalType=this.value;recalcScore()" style="font-size:12px;padding:5px 6px;height:32px">
          <option value="normaal" ${!g.goalType||g.goalType==='normaal'?'selected':''}>Normaal</option>
          <option value="penalty" ${g.goalType==='penalty'?'selected':''}>Penalty</option>
          <option value="vrije trap" ${g.goalType==='vrije trap'?'selected':''}>Vrije trap</option>
          <option value="eigen doelpunt" ${g.goalType==='eigen doelpunt'?'selected':''}>Eigen doel</option>
        </select>
        <button class="remove-row-btn" onclick="matchGoals.splice(${i},1);renderGoalsList();recalcScore()">✕</button>
      </div>
      ${isOpp ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px;align-items:center">
        <div style="font-size:11px;color:var(--text-muted);padding:4px 0">
          Club: <strong style="color:var(--text-primary)">${oppClubName}</strong>
        </div>
        <input class="form-input" value="${g.oppName||''}" placeholder="Naam scorer (optioneel)"
          oninput="matchGoals[${i}].oppName=this.value"
          style="font-size:11px;padding:4px 6px;height:28px">
      </div>` : ''}
    </div>`;
  }).join('') || '<p class="text-muted" style="font-size:11px;padding:4px 0">Nog geen doelpunten.</p>';
}

function recalcScore() {
  const m = (S.matches||[]).find(x=>x.id===currentMatchId);
  if (!m) return;
  const cam = S.clubs.find(c=>c.isOwnClub);
  const isCamHome = m.homeClubId === cam?.id;

  // Count goals per side
  let camGoals = 0, oppGoals = 0;
  matchGoals.forEach(g => {
    if (!g.playerId) return;
    if (g.playerId === '__opp__' || (g.oppClubId && g.goalType !== 'eigen doelpunt')) {
      // Opponent scored (tegendoelpunt) OR own goal by Cambuur player
      oppGoals++;
    } else if (g.goalType === 'eigen doelpunt') {
      // Cambuur player scored own goal = counts for opponent
      oppGoals++;
    } else {
      // Cambuur player scored
      camGoals++;
    }
  });

  const homeScore = isCamHome ? camGoals : oppGoals;
  const awayScore = isCamHome ? oppGoals : camGoals;
  document.getElementById('mm-home-score').value = homeScore;
  document.getElementById('mm-away-score').value = awayScore;
}

function renderCardsList() {
  const wrap = document.getElementById('mm-cards-list');
  const players = (S.players||[]).filter(p=>!['vertrokken','uitgeleend'].includes(p.status));
  wrap.innerHTML = matchCards.map((c,i) => `
    <div class="card-entry">
      <input class="form-input" value="${c.minute||''}" placeholder="Min" type="number" min="1" max="120" oninput="matchCards[${i}].minute=parseInt(this.value)||null" style="font-size:12px;padding:5px 6px;height:32px">
      <select class="form-select" oninput="matchCards[${i}].playerId=this.value" style="font-size:12px;padding:5px 6px;height:32px">
        <option value="">— Speler —</option>
        ${players.map(p=>`<option value="${p.id}" ${p.id===c.playerId?'selected':''}>${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</option>`).join('')}
      </select>
      <select class="form-select" oninput="matchCards[${i}].cardType=this.value" style="font-size:12px;padding:5px 6px;height:32px">
        <option value="geel" ${!c.cardType||c.cardType==='geel'?'selected':''}>🟨 Geel</option>
        <option value="rood" ${c.cardType==='rood'?'selected':''}>🟥 Rood</option>
        <option value="geel-rood" ${c.cardType==='geel-rood'?'selected':''}>🟨🟥 Geel-Rood</option>
      </select>
      <button class="remove-row-btn" onclick="matchCards.splice(${i},1);renderCardsList()">✕</button>
    </div>`).join('') || '<p class="text-muted" style="font-size:11px;padding:4px 0">Nog geen kaarten.</p>';
}

function renderSubsList() {
  const wrap = document.getElementById('mm-subs-list');
  if (!wrap) return;
  const players = (S.players||[]).filter(p=>!['vertrokken','uitgeleend'].includes(p.status));
  // Sort ATT→MID→DEF→GK
  const groupOrder = {ATT:0,MID:1,DEF:2,GK:3,OTHER:4};
  const sorted = [...players].sort((a,b)=>{
    const ag=groupOrder[getPosGroup(a.subpos?.[0]||a.position||'')]??4;
    const bg=groupOrder[getPosGroup(b.subpos?.[0]||b.position||'')]??4;
    return ag-bg || (a.number||99)-(b.number||99);
  });

  const playerOpts = (excludeId, selectedId) => sorted.map(p => {
    const disabled = p.id === excludeId ? 'disabled style="opacity:0.4"' : '';
    const sel = p.id === selectedId ? 'selected' : '';
    const subp = p.subpos?.[0]||p.position||'';
    return `<option value="${p.id}" ${sel} ${disabled}>${p.number?'#'+p.number+' ':''}${p.firstname?p.firstname[0]+'. ':''}${p.lastname} — ${subp}</option>`;
  }).join('');

  wrap.innerHTML = matchSubs.map((s,i) => `
    <div class="sub-entry">
      <input class="form-input" value="${s.minute||''}" placeholder="Min" type="number" min="1" max="120"
        oninput="matchSubs[${i}].minute=parseInt(this.value)||null"
        style="font-size:12px;padding:5px 6px;height:32px">
      <select class="form-select" onchange="matchSubs[${i}].playerOutId=this.value;renderSubsList()" style="font-size:12px;padding:5px 6px;height:32px">
        <option value="">— Speler eraf —</option>
        ${playerOpts(s.playerInId, s.playerOutId)}
      </select>
      <select class="form-select" onchange="matchSubs[${i}].playerInId=this.value;renderSubsList()" style="font-size:12px;padding:5px 6px;height:32px">
        <option value="">— Speler erin —</option>
        ${playerOpts(s.playerOutId, s.playerInId)}
      </select>
      <button class="remove-row-btn" onclick="matchSubs.splice(${i},1);renderSubsList()">✕</button>
    </div>`).join('') || '<p class="text-muted" style="font-size:11px;padding:4px 0">Nog geen wissels.</p>';
}

async function saveMatch() {
  const m = (S.matches||[]).find(x=>x.id===currentMatchId);
  if (!m) return;
  const homeScore = document.getElementById('mm-home-score').value;
  const awayScore = document.getElementById('mm-away-score').value;
  const played = homeScore !== '' && awayScore !== '';
  m.homeScore = played ? parseInt(homeScore) : null;
  m.awayScore = played ? parseInt(awayScore) : null;
  m.played = played;
  m.date = document.getElementById('mm-date').value;
  m.time = document.getElementById('mm-time').value;
  m.motm = document.getElementById('mm-motm').value;
  m.notes = document.getElementById('mm-notes').value;
  m.events = [
    ...matchGoals.map(g=>({...g,type:'goal'})),
    ...matchCards.map(c=>({...c,type:'card'})),
    ...matchSubs.map(s=>({...s,type:'sub'})),
  ];
  m.periods = JSON.parse(JSON.stringify(matchPeriods));
  // Derive lineup from first period for backwards compat
  m.lineup = Object.values(matchPeriods[0]?.assignments || []);
  await dbPut('matches', m);
  const idx = S.matches.findIndex(x=>x.id===currentMatchId);
  if (idx>=0) S.matches[idx]=m;
  closeModal('modal-match');
  // Re-render current competition
  const activeComp = document.querySelector('.nav-item[data-comp].active');
  if (activeComp) renderCompDetail(activeComp.dataset.comp);
  else { const detailEl = document.getElementById('competition-detail-content'); if(detailEl&&detailEl.innerHTML) renderCompDetail(m.competitionId); }
  // Refresh player stats cache
  window._playerStats = calcAllPlayerStats(S.currentSeason);
  showToast(played ? `Resultaat opgeslagen: ${m.homeScore}-${m.awayScore}` : 'Wedstrijd bijgewerkt', 'success');
}


// ══════════════════════════════
// PDF / MATCH IMPORT
// ══════════════════════════════
let parsedPdfMatches = [];
let manualMatchQueue = [];

function openMatchImport(compId, defaultTab) {
  parsedPdfMatches = [];
  manualMatchQueue = [];
  document.getElementById('pdf-preview').style.display = 'none';
  document.getElementById('pdf-parse-status').textContent = '';
  document.getElementById('pdf-matches-list').innerHTML = '';
  document.getElementById('import-confirm-btn').style.display = 'none';
  document.getElementById('manual-add-btn').style.display = 'none';
  document.getElementById('manual-save-btn').style.display = 'none';
  document.getElementById('manual-matches-queue').innerHTML = '';

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
      compClubs.sort((a,b)=>a.name.localeCompare(b.name)).map(c=>
        `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('manual-match-home').innerHTML = opts;
    document.getElementById('manual-match-away').innerHTML = opts;
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
  document.getElementById('import-tab-soccer365').style.display = tab==='soccer365'?'block':'none';
  document.querySelectorAll('#import-tabs .tab').forEach(t=>t.classList.remove('active'));
  if(el) el.classList.add('active');
  document.getElementById('import-confirm-btn').style.display = tab==='pdf'&&parsedPdfMatches.length?'block':'none';
  document.getElementById('manual-add-btn').style.display = tab==='manual'?'block':'none';
  document.getElementById('manual-save-btn').style.display = tab==='manual'&&manualMatchQueue.length?'block':'none';
  if (tab==='soccer365') {
    // Populate competition dropdown
    const sel = document.getElementById('s365-comp-sel');
    if (sel) {
      const comps = (S.competitions||[]).filter(c=>c.seasonId===S.currentSeason);
      sel.innerHTML = '<option value="">— Nieuwe competitie aanmaken —</option>' +
        comps.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    }
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

function loadCurrentSeasonSchedule() {
  // Full Eredivisie 2026/27 schedule embedded as fallback
  const scheduleText = `1 vrijdag 7 augustus 2026 SC Cambuur Excelsior Rotterdam 20:00
1 zaterdag 8 augustus 2026 N.E.C. Telstar 16:30
1 zaterdag 8 augustus 2026 Go Ahead Eagles Willem II 18:45
1 zaterdag 8 augustus 2026 PSV Fortuna Sittard 20:00
1 zaterdag 8 augustus 2026 AZ ADO Den Haag 21:00
1 zondag 9 augustus 2026 Sparta Rotterdam Feyenoord 12:15
1 zondag 9 augustus 2026 FC Groningen FC Utrecht 14:30
1 zondag 9 augustus 2026 PEC Zwolle Ajax 14:30
1 zondag 9 augustus 2026 sc Heerenveen FC Twente 16:45
2 vrijdag 14 augustus 2026 Telstar Sparta Rotterdam 20:00
2 zaterdag 15 augustus 2026 Willem II N.E.C. 16:30
2 zaterdag 15 augustus 2026 FC Utrecht AZ 18:45
2 zaterdag 15 augustus 2026 Excelsior Rotterdam PSV 20:00
2 zaterdag 15 augustus 2026 Fortuna Sittard SC Cambuur 21:00
2 zondag 16 augustus 2026 ADO Den Haag FC Groningen 12:15
2 zondag 16 augustus 2026 Feyenoord Go Ahead Eagles 14:30
2 zondag 16 augustus 2026 FC Twente PEC Zwolle 14:30
2 zondag 16 augustus 2026 Ajax sc Heerenveen 16:45
3 zaterdag 22 augustus 2026 Fortuna Sittard AZ 16:30
3 zaterdag 22 augustus 2026 N.E.C. Excelsior Rotterdam 18:45
3 zaterdag 22 augustus 2026 Sparta Rotterdam FC Utrecht 20:00
3 zaterdag 22 augustus 2026 sc Heerenveen PEC Zwolle 21:00
3 zondag 23 augustus 2026 Go Ahead Eagles ADO Den Haag 12:15
3 zondag 23 augustus 2026 PSV FC Groningen 14:30
3 zondag 23 augustus 2026 SC Cambuur Feyenoord 16:45
4 vrijdag 28 augustus 2026 FC Groningen Fortuna Sittard 20:00
4 zaterdag 29 augustus 2026 Excelsior Rotterdam Sparta Rotterdam 16:30
4 zaterdag 29 augustus 2026 AZ Go Ahead Eagles 18:45
4 zaterdag 29 augustus 2026 PEC Zwolle N.E.C. 21:00
4 zondag 30 augustus 2026 FC Utrecht PSV 12:15
4 zondag 30 augustus 2026 Willem II sc Heerenveen 14:30
4 zondag 30 augustus 2026 Feyenoord ADO Den Haag 14:30
4 zondag 30 augustus 2026 Telstar Ajax 16:45
4 zondag 30 augustus 2026 SC Cambuur FC Twente 20:00
5 vrijdag 4 september 2026 Sparta Rotterdam PEC Zwolle 20:00
5 zaterdag 5 september 2026 N.E.C. Feyenoord 16:30
5 zaterdag 5 september 2026 FC Utrecht Go Ahead Eagles 18:45
5 zaterdag 5 september 2026 Ajax PSV 20:00
5 zaterdag 5 september 2026 Willem II Excelsior Rotterdam 21:00
5 zondag 6 september 2026 FC Groningen FC Twente 12:15
5 zondag 6 september 2026 sc Heerenveen AZ 14:30
5 zondag 6 september 2026 Telstar SC Cambuur 14:30
5 zondag 6 september 2026 ADO Den Haag Fortuna Sittard 16:45
6 vrijdag 11 september 2026 AZ Willem II 20:00
6 zaterdag 12 september 2026 FC Twente ADO Den Haag 16:30
6 zaterdag 12 september 2026 Go Ahead Eagles FC Groningen 18:45
6 zaterdag 12 september 2026 Fortuna Sittard Ajax 20:00
6 zaterdag 12 september 2026 sc Heerenveen Telstar 21:00
6 zondag 13 september 2026 Excelsior Rotterdam FC Utrecht 12:15
6 zondag 13 september 2026 PSV Sparta Rotterdam 14:30
6 zondag 13 september 2026 SC Cambuur N.E.C. 14:30
6 zondag 13 september 2026 PEC Zwolle Feyenoord 16:45
7 vrijdag 18 september 2026 Sparta Rotterdam sc Heerenveen 20:00
7 zaterdag 19 september 2026 ADO Den Haag SC Cambuur 16:30
7 zaterdag 19 september 2026 FC Groningen PEC Zwolle 18:45
7 zaterdag 19 september 2026 Ajax Excelsior Rotterdam 20:00
7 zaterdag 19 september 2026 Willem II Fortuna Sittard 21:00
7 zondag 20 september 2026 Feyenoord FC Utrecht 12:15
7 zondag 20 september 2026 AZ Telstar 14:30
7 zondag 20 september 2026 N.E.C. Go Ahead Eagles 14:30
7 zondag 20 september 2026 FC Twente PSV 16:45
8 zaterdag 10 oktober 2026 PSV sc Heerenveen 16:30
8 zaterdag 10 oktober 2026 Feyenoord AZ 18:45
8 zaterdag 10 oktober 2026 Go Ahead Eagles Sparta Rotterdam 18:45
8 zaterdag 10 oktober 2026 Ajax N.E.C. 21:00
8 zaterdag 10 oktober 2026 Fortuna Sittard FC Twente 21:00
8 zondag 11 oktober 2026 FC Utrecht Willem II 12:15
8 zondag 11 oktober 2026 PEC Zwolle SC Cambuur 14:30
8 zondag 11 oktober 2026 Telstar ADO Den Haag 14:30
8 zondag 11 oktober 2026 Excelsior Rotterdam FC Groningen 16:45
9 vrijdag 16 oktober 2026 sc Heerenveen Excelsior Rotterdam 20:00
9 zaterdag 17 oktober 2026 ADO Den Haag PSV 16:30
9 zaterdag 17 oktober 2026 N.E.C. Fortuna Sittard 18:45
9 zaterdag 17 oktober 2026 Telstar Feyenoord 20:00
9 zaterdag 17 oktober 2026 Sparta Rotterdam Willem II 21:00
9 zondag 18 oktober 2026 PEC Zwolle Go Ahead Eagles 12:15
9 zondag 18 oktober 2026 FC Twente FC Utrecht 14:30
9 zondag 18 oktober 2026 SC Cambuur AZ 14:30
9 zondag 18 oktober 2026 FC Groningen Ajax 16:45
10 vrijdag 23 oktober 2026 Go Ahead Eagles Telstar 20:00
10 zaterdag 24 oktober 2026 FC Utrecht PEC Zwolle 16:30
10 zaterdag 24 oktober 2026 Willem II SC Cambuur 18:45
10 zaterdag 24 oktober 2026 ADO Den Haag sc Heerenveen 21:00
10 zondag 25 oktober 2026 Fortuna Sittard Excelsior Rotterdam 12:15
10 zondag 25 oktober 2026 N.E.C. FC Groningen 14:30
10 zondag 25 oktober 2026 PSV Feyenoord 14:30
10 zondag 25 oktober 2026 Sparta Rotterdam Ajax 16:45
10 zondag 25 oktober 2026 AZ FC Twente 20:00
11 zaterdag 31 oktober 2026 Feyenoord Fortuna Sittard 16:30
11 zaterdag 31 oktober 2026 PSV Willem II 18:45
11 zaterdag 31 oktober 2026 sc Heerenveen N.E.C. 18:45
11 zaterdag 31 oktober 2026 Ajax AZ 21:00
11 zaterdag 31 oktober 2026 SC Cambuur Go Ahead Eagles 21:00
11 zondag 1 november 2026 PEC Zwolle ADO Den Haag 12:15
11 zondag 1 november 2026 Excelsior Rotterdam FC Twente 14:30
11 zondag 1 november 2026 Telstar FC Utrecht 14:30
11 zondag 1 november 2026 FC Groningen Sparta Rotterdam 16:45
12 vrijdag 6 november 2026 Willem II PEC Zwolle 20:00
12 zaterdag 7 november 2026 Fortuna Sittard Telstar 16:30
12 zaterdag 7 november 2026 Excelsior Rotterdam Go Ahead Eagles 18:45
12 zaterdag 7 november 2026 SC Cambuur PSV 20:00
12 zaterdag 7 november 2026 ADO Den Haag Sparta Rotterdam 21:00
12 zondag 8 november 2026 sc Heerenveen Feyenoord 12:15
12 zondag 8 november 2026 FC Twente Ajax 14:30
12 zondag 8 november 2026 FC Utrecht N.E.C. 14:30
12 zondag 8 november 2026 AZ FC Groningen 16:45
13 21 november 2026 Ajax ADO Den Haag
13 21 november 2026 FC Groningen sc Heerenveen
13 21 november 2026 FC Twente Willem II
13 21 november 2026 FC Utrecht SC Cambuur
13 21 november 2026 Feyenoord Excelsior Rotterdam
13 21 november 2026 Go Ahead Eagles Fortuna Sittard
13 21 november 2026 N.E.C. PSV
13 21 november 2026 Sparta Rotterdam AZ
13 21 november 2026 Telstar PEC Zwolle
14 27 november 2026 ADO Den Haag FC Utrecht
14 27 november 2026 Excelsior Rotterdam Telstar
14 27 november 2026 FC Groningen Willem II
14 27 november 2026 Feyenoord Ajax
14 27 november 2026 Fortuna Sittard sc Heerenveen
14 27 november 2026 N.E.C. FC Twente
14 27 november 2026 PEC Zwolle AZ
14 27 november 2026 PSV Go Ahead Eagles
14 27 november 2026 SC Cambuur Sparta Rotterdam
15 4 december 2026 ADO Den Haag Excelsior Rotterdam
15 4 december 2026 Ajax FC Utrecht
15 4 december 2026 AZ PSV
15 4 december 2026 Fortuna Sittard PEC Zwolle
15 4 december 2026 Go Ahead Eagles FC Twente
15 4 december 2026 sc Heerenveen SC Cambuur
15 4 december 2026 Sparta Rotterdam N.E.C.
15 4 december 2026 Telstar FC Groningen
15 4 december 2026 Willem II Feyenoord
16 11 december 2026 Ajax SC Cambuur
16 11 december 2026 AZ N.E.C.
16 11 december 2026 FC Groningen Feyenoord
16 11 december 2026 FC Twente Sparta Rotterdam
16 11 december 2026 FC Utrecht Fortuna Sittard
16 11 december 2026 PEC Zwolle Excelsior Rotterdam
16 11 december 2026 PSV Telstar
16 11 december 2026 sc Heerenveen Go Ahead Eagles
16 11 december 2026 Willem II ADO Den Haag
17 18 december 2026 Excelsior Rotterdam AZ
17 18 december 2026 FC Utrecht sc Heerenveen
17 18 december 2026 Feyenoord FC Twente
17 18 december 2026 Fortuna Sittard Sparta Rotterdam
17 18 december 2026 Go Ahead Eagles Ajax
17 18 december 2026 N.E.C. ADO Den Haag
17 18 december 2026 PSV PEC Zwolle
17 18 december 2026 SC Cambuur FC Groningen
17 18 december 2026 Telstar Willem II
18 vrijdag 8 januari 2027 FC Twente Fortuna Sittard 20:00
18 zaterdag 9 januari 2027 Sparta Rotterdam Excelsior Rotterdam 16:30
18 zaterdag 9 januari 2027 PEC Zwolle FC Utrecht 18:45
18 zaterdag 9 januari 2027 Willem II Ajax 20:00
18 zaterdag 9 januari 2027 AZ sc Heerenveen 21:00
18 zondag 10 januari 2027 N.E.C. SC Cambuur 12:15
18 zondag 10 januari 2027 ADO Den Haag Telstar 14:30
18 zondag 10 januari 2027 Feyenoord PSV 14:30
18 zondag 10 januari 2027 FC Groningen Go Ahead Eagles 16:45
19 15 januari 2027 ADO Den Haag PEC Zwolle
19 15 januari 2027 Ajax FC Groningen
19 15 januari 2027 Excelsior Rotterdam Feyenoord
19 15 januari 2027 FC Utrecht FC Twente
19 15 januari 2027 Fortuna Sittard PSV
19 15 januari 2027 Go Ahead Eagles AZ
19 15 januari 2027 SC Cambuur Willem II
19 15 januari 2027 sc Heerenveen Sparta Rotterdam
19 15 januari 2027 Telstar N.E.C.
20 22 januari 2027 Ajax Telstar
20 22 januari 2027 AZ FC Utrecht
20 22 januari 2027 Excelsior Rotterdam Fortuna Sittard
20 22 januari 2027 FC Twente sc Heerenveen
20 22 januari 2027 Feyenoord PEC Zwolle
20 22 januari 2027 Go Ahead Eagles SC Cambuur
20 22 januari 2027 N.E.C. Willem II
20 22 januari 2027 PSV ADO Den Haag
20 22 januari 2027 Sparta Rotterdam FC Groningen
21 28 januari 2027 ADO Den Haag Go Ahead Eagles
21 28 januari 2027 AZ Feyenoord
21 28 januari 2027 FC Groningen N.E.C.
21 28 januari 2027 FC Twente SC Cambuur
21 28 januari 2027 FC Utrecht Excelsior Rotterdam
21 28 januari 2027 PEC Zwolle Fortuna Sittard
21 28 januari 2027 sc Heerenveen Ajax
21 28 januari 2027 Sparta Rotterdam Telstar
21 28 januari 2027 Willem II PSV
22 12 februari 2027 Excelsior Rotterdam Ajax
22 12 februari 2027 FC Groningen AZ
22 12 februari 2027 Feyenoord N.E.C.
22 12 februari 2027 Fortuna Sittard ADO Den Haag
22 12 februari 2027 Go Ahead Eagles PEC Zwolle
22 12 februari 2027 PSV FC Twente
22 12 februari 2027 SC Cambuur FC Utrecht
22 12 februari 2027 Telstar sc Heerenveen
22 12 februari 2027 Willem II Sparta Rotterdam
23 19 februari 2027 Ajax Go Ahead Eagles
23 19 februari 2027 AZ Fortuna Sittard
23 19 februari 2027 FC Twente Excelsior Rotterdam
23 19 februari 2027 FC Utrecht ADO Den Haag
23 19 februari 2027 Feyenoord Telstar
23 19 februari 2027 N.E.C. Sparta Rotterdam
23 19 februari 2027 PEC Zwolle FC Groningen
23 19 februari 2027 PSV SC Cambuur
23 19 februari 2027 sc Heerenveen Willem II
24 26 februari 2027 ADO Den Haag FC Twente
24 26 februari 2027 Ajax Feyenoord
24 26 februari 2027 Excelsior Rotterdam sc Heerenveen
24 26 februari 2027 Fortuna Sittard FC Utrecht
24 26 februari 2027 N.E.C. AZ
24 26 februari 2027 SC Cambuur PEC Zwolle
24 26 februari 2027 Sparta Rotterdam PSV
24 26 februari 2027 Telstar Go Ahead Eagles
24 26 februari 2027 Willem II FC Groningen
25 5 maart 2027 ADO Den Haag Ajax
25 5 maart 2027 FC Groningen Telstar
25 5 maart 2027 FC Twente AZ
25 5 maart 2027 Feyenoord sc Heerenveen
25 5 maart 2027 Fortuna Sittard N.E.C.
25 5 maart 2027 Go Ahead Eagles Excelsior Rotterdam
25 5 maart 2027 PEC Zwolle Willem II
25 5 maart 2027 PSV FC Utrecht
25 5 maart 2027 Sparta Rotterdam SC Cambuur
26 12 maart 2027 Ajax PEC Zwolle
26 12 maart 2027 AZ Sparta Rotterdam
26 12 maart 2027 Excelsior Rotterdam N.E.C.
26 12 maart 2027 FC Utrecht FC Groningen
26 12 maart 2027 Go Ahead Eagles Feyenoord
26 12 maart 2027 SC Cambuur ADO Den Haag
26 12 maart 2027 sc Heerenveen Fortuna Sittard
26 12 maart 2027 Telstar PSV
26 12 maart 2027 Willem II FC Twente
27 19 maart 2027 ADO Den Haag Willem II
27 19 maart 2027 AZ Excelsior Rotterdam
27 19 maart 2027 FC Groningen PSV
27 19 maart 2027 FC Twente Go Ahead Eagles
27 19 maart 2027 FC Utrecht Sparta Rotterdam
27 19 maart 2027 Feyenoord SC Cambuur
27 19 maart 2027 N.E.C. Ajax
27 19 maart 2027 PEC Zwolle sc Heerenveen
27 19 maart 2027 Telstar Fortuna Sittard
28 3 april 2027 Ajax FC Twente
28 3 april 2027 Excelsior Rotterdam PEC Zwolle
28 3 april 2027 Fortuna Sittard Feyenoord
28 3 april 2027 Go Ahead Eagles N.E.C.
28 3 april 2027 PSV AZ
28 3 april 2027 SC Cambuur Telstar
28 3 april 2027 sc Heerenveen FC Groningen
28 3 april 2027 Sparta Rotterdam ADO Den Haag
28 3 april 2027 Willem II FC Utrecht
29 9 april 2027 ADO Den Haag Feyenoord
29 9 april 2027 FC Groningen Excelsior Rotterdam
29 9 april 2027 FC Utrecht Ajax
29 9 april 2027 N.E.C. sc Heerenveen
29 9 april 2027 PEC Zwolle PSV
29 9 april 2027 SC Cambuur Fortuna Sittard
29 9 april 2027 Sparta Rotterdam Go Ahead Eagles
29 9 april 2027 Telstar FC Twente
29 9 april 2027 Willem II AZ
30 23 april 2027 AZ SC Cambuur
30 23 april 2027 Excelsior Rotterdam Willem II
30 23 april 2027 FC Twente N.E.C.
30 23 april 2027 Feyenoord Sparta Rotterdam
30 23 april 2027 Fortuna Sittard FC Groningen
30 23 april 2027 Go Ahead Eagles FC Utrecht
30 23 april 2027 PEC Zwolle Telstar
30 23 april 2027 PSV Ajax
30 23 april 2027 sc Heerenveen ADO Den Haag
31 30 april 2027 Ajax Fortuna Sittard
31 30 april 2027 Excelsior Rotterdam SC Cambuur
31 30 april 2027 FC Groningen ADO Den Haag
31 30 april 2027 Feyenoord Willem II
31 30 april 2027 Go Ahead Eagles PSV
31 30 april 2027 N.E.C. PEC Zwolle
31 30 april 2027 sc Heerenveen FC Utrecht
31 30 april 2027 Sparta Rotterdam FC Twente
31 30 april 2027 Telstar AZ
32 8 mei 2027 ADO Den Haag N.E.C.
32 8 mei 2027 AZ Ajax
32 8 mei 2027 FC Twente FC Groningen
32 8 mei 2027 FC Utrecht Feyenoord
32 8 mei 2027 Fortuna Sittard Go Ahead Eagles
32 8 mei 2027 PEC Zwolle Sparta Rotterdam
32 8 mei 2027 PSV Excelsior Rotterdam
32 8 mei 2027 SC Cambuur sc Heerenveen
32 8 mei 2027 Willem II Telstar
33 zondag 16 mei 2027 Ajax Sparta Rotterdam 14:30
33 zondag 16 mei 2027 AZ PEC Zwolle 14:30
33 zondag 16 mei 2027 Excelsior Rotterdam ADO Den Haag 14:30
33 zondag 16 mei 2027 FC Groningen SC Cambuur 14:30
33 zondag 16 mei 2027 FC Twente Feyenoord 14:30
33 zondag 16 mei 2027 FC Utrecht Telstar 14:30
33 zondag 16 mei 2027 Fortuna Sittard Willem II 14:30
33 zondag 16 mei 2027 Go Ahead Eagles sc Heerenveen 14:30
33 zondag 16 mei 2027 PSV N.E.C. 14:30
34 zondag 23 mei 2027 ADO Den Haag AZ 14:30
34 zondag 23 mei 2027 Feyenoord FC Groningen 14:30
34 zondag 23 mei 2027 N.E.C. FC Utrecht 14:30
34 zondag 23 mei 2027 PEC Zwolle FC Twente 14:30
34 zondag 23 mei 2027 SC Cambuur Ajax 14:30
34 zondag 23 mei 2027 sc Heerenveen PSV 14:30
34 zondag 23 mei 2027 Sparta Rotterdam Fortuna Sittard 14:30
34 zondag 23 mei 2027 Telstar Excelsior Rotterdam 14:30
34 zondag 23 mei 2027 Willem II Go Ahead Eagles 14:30`;

  document.getElementById('pdf-paste-area').value = scheduleText;
  parsePastedText();
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
    const id = exists?.id || 'match_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
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
  const round = parseInt(document.getElementById('manual-match-round').value);
  const date = document.getElementById('manual-match-date').value;
  const time = document.getElementById('manual-match-time').value;
  const homeId = document.getElementById('manual-match-home').value;
  const awayId = document.getElementById('manual-match-away').value;

  if (!compId) { showToast('Selecteer een competitie', 'error'); return; }
  if (!homeId || !awayId) { showToast('Selecteer thuis- en uitclub', 'error'); return; }
  if (homeId === awayId) { showToast('Thuis- en uitclub mogen niet hetzelfde zijn', 'error'); return; }
  if (!round || round < 1) { showToast('Voer een speelronde in', 'error'); return; }

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
    const id = 'match_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
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
// ARCHIEF — SEIZOENSFILTER
// ══════════════════════════════
function populateArchiefSeasonFilter() {
  const sel = document.getElementById('archief-season-filter');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">Alle seizoenen</option>';
  S.seasons.forEach(s => {
    const o = document.createElement('option');
    o.value = s.id; o.textContent = s.name;
    if (s.id === current) o.selected = true;
    sel.appendChild(o);
  });
}


// ══════════════════════════════
// SPELERSSTATISTIEKEN
// ══════════════════════════════
function calcPlayerStats(playerId, seasonId, competitionId) {
  const stats = { goals: 0, assists: 0, yellowCards: 0, redCards: 0, appearances: 0, starts: 0, minutesPlayed: 0, motm: 0, cleanSheets: 0, saves: 0 };
  const matches = (S.matches||[]).filter(m => {
    if (!m.played) return false;
    if (seasonId && m.seasonId !== seasonId) return false;
    if (competitionId && m.competitionId !== competitionId) return false;
    return true;
  });

  matches.forEach(m => {
    const events = m.events || [];
    // Goals
    events.filter(e=>e.type==='goal'&&e.playerId===playerId&&e.playerId!=='__opp__'&&e.playerId!=='__opp_own__'&&e.goalType!=='eigen doelpunt').forEach(()=>stats.goals++);
    // Assists
    events.filter(e=>e.type==='goal'&&e.assistId===playerId).forEach(()=>stats.assists++);
    // Cards
    events.filter(e=>e.type==='card'&&e.playerId===playerId).forEach(e=>{
      if(e.cardType==='geel') stats.yellowCards++;
      else if(e.cardType==='rood'||e.cardType==='geel-rood') stats.redCards++;
    });
    // Appearances & minutes — use periods if available
    const subs = events.filter(e=>e.type==='sub');
    const subIn = subs.find(s=>s.playerInId===playerId);
    const subOut = subs.find(s=>s.playerOutId===playerId);

    // Check starter status — support both old (periods) and new (lineup array) format
    const periods = m.periods;
    let isStarter = false;
    let appearsInAnyPeriod = false;

    // Prefer new lineup array if available, fall back to old periods format
    const lineup = m.lineup || [];
    if (lineup.length > 0) {
      // New format: lineup is array of starter IDs
      isStarter = lineup.includes(playerId);
      appearsInAnyPeriod = isStarter || !!subIn;
    } else if (periods && periods.length && Object.keys(periods[0].assignments||{}).length > 0) {
      // Old format: periods with assignments (no lineup set)
      const firstPeriodIds = Object.values(periods[0].assignments||{});
      isStarter = firstPeriodIds.includes(playerId);
      appearsInAnyPeriod = periods.some(p=>Object.values(p.assignments||{}).includes(playerId));
    }

    // Also count appearances from goals/assists even without lineup data
    const hasGoalOrAssist = false; // removed: caused incorrect appearances

    if (isStarter || subIn || appearsInAnyPeriod) {
      stats.appearances++;
      // Find red card for this player (direct red or geel-rood)
      const redCard = events.find(e=>e.type==='card'&&e.playerId===playerId&&(e.cardType==='rood'||e.cardType==='geel-rood'));
      const redMin = redCard?.minute ? parseMinute(redCard.minute) : null;

      if (isStarter) {
        stats.starts++;
        const et1 = m.extraTime1 || 0;
        const et2 = m.extraTime2 || 0;
        const maxMin = 90 + et1 + et2;
        const outMinStr = subOut?.minute;
        const subOutMin = outMinStr ? (parseMinute(outMinStr)||maxMin) : maxMin;
        // Use earliest of: sub out, red card, end of match
        const outMin = redMin !== null ? Math.min(subOutMin, redMin) : subOutMin;
        stats.minutesPlayed += Math.min(outMin, maxMin);
      } else if (subIn) {
        const et1 = m.extraTime1 || 0;
        const et2 = m.extraTime2 || 0;
        const maxMin = 90 + et1 + et2;
        const inMinStr = subIn.minute;
        const inMin = inMinStr ? (parseMinute(inMinStr)||0) : 0;
        const subOut2 = events.filter(e=>e.type==='sub').find(e=>e.playerOutId===playerId);
        const subOutMin2 = subOut2?.minute ? (parseMinute(subOut2.minute)||maxMin) : maxMin;
        const outMin2 = redMin !== null ? Math.min(subOutMin2, redMin) : subOutMin2;
        stats.minutesPlayed += Math.min(outMin2, maxMin) - inMin;
      }
    }
    // MOTM
    if (m.motm === playerId) stats.motm++;
    // Keeper stats: saves + clean sheets
    const p = (S.players||[]).find(x=>x.id===playerId);
    if (p?.position === 'Keeper' && (isStarter || subIn)) {
      if (m.keeperSaves?.[playerId] !== undefined) stats.saves += m.keeperSaves[playerId];
      // Clean sheet: keeper was on field and no goals conceded
      const cam = S.clubs.find(c=>c.isOwnClub);
      const isCamHome = m.homeClubId === cam?.id;
      const oppScore = isCamHome ? m.awayScore : m.homeScore;
      if (oppScore === 0) stats.cleanSheets++;
    }
  });
  return stats;
}

function calcAllPlayerStats(seasonId) {
  // Returns a map of playerId -> stats
  const result = {};
  (S.players||[]).forEach(p => { result[p.id] = calcPlayerStats(p.id, seasonId, null); });
  return result;
}


// ══════════════════════════════
// GOAL DRAG & DROP
// ══════════════════════════════
let _dragGoalIdx = null;

function goalDragStart(event, idx) {
  _dragGoalIdx = idx;
  event.currentTarget.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
}
function goalDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}
function goalDrop(event, idx) {
  event.preventDefault();
  if (_dragGoalIdx === null || _dragGoalIdx === idx) return;
  const moved = matchGoals.splice(_dragGoalIdx, 1)[0];
  matchGoals.splice(idx, 0, moved);
  _dragGoalIdx = null;
  renderGoalsList();
}
function goalDragEnd(event) {
  event.currentTarget.classList.remove('dragging');
  _dragGoalIdx = null;
}

// ══════════════════════════════
// INLINE SCORE EDITING
// ══════════════════════════════
function startInlineScore(event, matchId) {
  event.stopPropagation();
  const span = event.currentTarget;
  const m = (S.matches||[]).find(x=>x.id===matchId);
  if (!m) return;
  const wrap = document.createElement('div');
  wrap.className = 'inline-score-wrap';
  wrap.onclick = e => e.stopPropagation();
  const hInput = document.createElement('input');
  hInput.className = 'inline-score-input'; hInput.type='number'; hInput.min='0'; hInput.max='99';
  hInput.value = m.homeScore !== null ? m.homeScore : '';
  hInput.placeholder = '—';
  const sep = document.createElement('span');
  sep.textContent = '-'; sep.style.cssText = 'font-weight:800;font-size:15px;color:var(--text-muted);padding:0 1px';
  const aInput = document.createElement('input');
  aInput.className = 'inline-score-input'; aInput.type='number'; aInput.min='0'; aInput.max='99';
  aInput.value = m.awayScore !== null ? m.awayScore : '';
  aInput.placeholder = '—';
  wrap.appendChild(hInput); wrap.appendChild(sep); wrap.appendChild(aInput);
  span.replaceWith(wrap);
  hInput.focus(); hInput.select();
  const rerender = () => {
    const ac = document.querySelector('.nav-item[data-comp].active');
    if (ac) renderCompDetail(ac.dataset.comp);
    else renderCompDetail(m.competitionId);
  };
  const save = async () => {
    const hs = hInput.value.trim(), as_ = aInput.value.trim();
    if (hs !== '' && as_ !== '') {
      // Both filled: save score
      m.homeScore = parseInt(hs); m.awayScore = parseInt(as_); m.played = true;
      await dbPut('matches', m);
      window._playerStats = calcAllPlayerStats(S.currentSeason);
    } else if (hs === '' && as_ === '') {
      // Both empty: clear score
      m.homeScore = null; m.awayScore = null; m.played = false;
      await dbPut('matches', m);
      window._playerStats = calcAllPlayerStats(S.currentSeason);
    }
    // If only one is filled: don't save yet, just rerender
    rerender();
  };
  const cancel = () => rerender();
  hInput.addEventListener('keydown', e => {
    if (e.key==='Enter') { e.preventDefault(); save(); }
    if (e.key==='Escape') { e.preventDefault(); cancel(); }
    if (e.key==='Tab') { e.preventDefault(); aInput.focus(); aInput.select(); }
  });
  aInput.addEventListener('keydown', e => {
    if (e.key==='Enter') { e.preventDefault(); save(); }
    if (e.key==='Escape') { e.preventDefault(); cancel(); }
    if (e.key==='Tab') { e.preventDefault(); hInput.focus(); hInput.select(); }
  });
  // Blur: only save if focus went outside BOTH inputs — use longer timer
  let bt;
  const onBlur = () => {
    bt = setTimeout(() => {
      const active = document.activeElement;
      if (active !== hInput && active !== aInput) save();
    }, 400);
  };
  hInput.addEventListener('blur', onBlur);
  aInput.addEventListener('blur', onBlur);
  hInput.addEventListener('focus', () => clearTimeout(bt));
  aInput.addEventListener('focus', () => clearTimeout(bt));
}

// ══════════════════════════════
// DELETE MATCH(ES)
// ══════════════════════════════
async function deleteMatch(matchId) {
  const m = (S.matches||[]).find(x=>x.id===matchId);
  if (!m) return;
  if (!confirm('Wedstrijd verwijderen?')) return;
  await dbDel('matches', matchId);
  S.matches = S.matches.filter(x=>x.id!==matchId);
  window._playerStats = calcAllPlayerStats(S.currentSeason);
  renderCompDetail(m.competitionId);
  showToast('Wedstrijd verwijderd', 'success');
}

async function deleteAllMatchesInComp(compId) {
  const comp = S.competitions.find(c=>c.id===compId);
  if (!comp) return;
  const count = (S.matches||[]).filter(m=>m.competitionId===compId).length;
  if (!confirm(`Alle ${count} wedstrijden in "${comp.name}" verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
  const ids = (S.matches||[]).filter(m=>m.competitionId===compId).map(m=>m.id);
  for (const id of ids) await dbDel('matches', id);
  S.matches = (S.matches||[]).filter(m=>m.competitionId!==compId);
  window._playerStats = calcAllPlayerStats(S.currentSeason);
  renderCompDetail(compId);
  showToast(`${ids.length} wedstrijden verwijderd`, 'success');
}

// ══════════════════════════════
// SUBPOSITIE SORT ORDER
// ══════════════════════════════
const SUBPOS_SORT = {
  // Verdedigers
  'Linksback':2,'Linker Wingback':3,'Centrale Verdediger':4,'Libero':5,'Sweeper':6,'Rechter Wingback':7,'Rechtsback':8,
  // Middenvelders
  'Verdedigende Middenvelder':2,'Linker Middenvelder':3,'Centrale Middenvelder':4,'Box-to-box Middenvelder':5,'Regisseur':6,'Rechter Middenvelder':7,'Aanvallende Middenvelder':8,'Nummer 10':9,
  // Aanvallers
  'Linksbuiten':2,'Schaduwspits':3,'Tweede Spits':4,'Spits':5,'Valse Negen':6,'Buitenspeler':7,'Rechtsbuiten':8,
};

function subposSortKey(p) {
  const first = p.subpos?.[0] || p.position || '';
  return SUBPOS_SORT[first] || 99;
}

// ══════════════════════════════
// AUTO-ARCHIVE DEPARTED PLAYERS
// ══════════════════════════════
async function checkDepartedPlayers() {
  if (!S.players) return;
  const today = new Date().toISOString().split('T')[0];
  const nowDeparted = S.players.filter(p =>
    p.status === 'vertrokken' && p.departureDate && p.departureDate <= today
    && !p._archiveNotified
  );
  if (!nowDeparted.length) return;

  // Show notification popup
  const names = nowDeparted.map(p => {
    const d = new Date(p.departureDate).toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'});
    return `<li><strong>${p.firstname ? p.firstname+' ' : ''}${p.lastname}</strong> — contract/vertrek per ${d}</li>`;
  }).join('');

  await new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center';
    overlay.innerHTML = `<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);padding:28px 32px;max-width:460px;width:90%">
      <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:20px;margin-bottom:16px;color:var(--cambuur-geel)">⚠ Vertrek verwerkt</div>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">De volgende speler(s) zijn automatisch naar het archief verplaatst omdat hun vertrekdatum is bereikt:</p>
      <ul style="font-size:13px;line-height:1.8;color:var(--text-primary);padding-left:18px;margin-bottom:20px">${names}</ul>
      <button class="btn btn-primary" onclick="this.closest('div').parentElement.remove();document.body.style.overflow='';" style="width:100%">Begrepen</button>
    </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    overlay.querySelector('button').addEventListener('click', resolve);
  });

  // Mark as notified (won't show again)
  for (const p of nowDeparted) {
    p._archiveNotified = true;
    await dbPut('players', p);
  }
}

// ══════════════════════════════
// MATCH MODAL TABS
// ══════════════════════════════
function switchMatchTab(tab, el) {
  ['info','events','lineup'].forEach(t => {
    const div = document.getElementById('mm-tab-'+t);
    if (div) div.style.display = t===tab ? 'block' : 'none';
  });
  document.querySelectorAll('#match-modal-tabs .tab').forEach(t=>t.classList.remove('active'));
  if (el) el.classList.add('active');
  if (tab === 'lineup') renderLineupTab();
}

// ══════════════════════════════
// FORMATION DEFINITIONS
// ══════════════════════════════
const FORMATIONS = {
  '4-3-3 (vlak)':  [{pos:'GK',x:50,y:88},{pos:'RB',x:82,y:72},{pos:'RCB',x:63,y:72},{pos:'LCB',x:37,y:72},{pos:'LB',x:18,y:72},{pos:'RM',x:75,y:50},{pos:'CM',x:50,y:50},{pos:'LM',x:25,y:50},{pos:'RW',x:80,y:26},{pos:'ST',x:50,y:20},{pos:'LW',x:20,y:26}],
  '4-3-3 (6-8-8)': [{pos:'GK',x:50,y:88},{pos:'RB',x:82,y:72},{pos:'RCB',x:63,y:72},{pos:'LCB',x:37,y:72},{pos:'LB',x:18,y:72},{pos:'DM',x:50,y:60},{pos:'RCM',x:68,y:48},{pos:'LCM',x:32,y:48},{pos:'RW',x:80,y:26},{pos:'ST',x:50,y:20},{pos:'LW',x:20,y:26}],
  '4-2-3-1':       [{pos:'GK',x:50,y:88},{pos:'RB',x:82,y:72},{pos:'RCB',x:63,y:72},{pos:'LCB',x:37,y:72},{pos:'LB',x:18,y:72},{pos:'RDM',x:63,y:60},{pos:'LDM',x:37,y:60},{pos:'RAM',x:76,y:40},{pos:'CAM',x:50,y:38},{pos:'LAM',x:24,y:40},{pos:'ST',x:50,y:20}],
  '4-1-4-1':       [{pos:'GK',x:50,y:88},{pos:'RB',x:82,y:72},{pos:'RCB',x:63,y:72},{pos:'LCB',x:37,y:72},{pos:'LB',x:18,y:72},{pos:'DM',x:50,y:62},{pos:'RM',x:82,y:46},{pos:'RCM',x:63,y:44},{pos:'LCM',x:37,y:44},{pos:'LM',x:18,y:46},{pos:'ST',x:50,y:20}],
  '4-4-2 (vlak)':  [{pos:'GK',x:50,y:88},{pos:'RB',x:82,y:72},{pos:'RCB',x:63,y:72},{pos:'LCB',x:37,y:72},{pos:'LB',x:18,y:72},{pos:'RM',x:82,y:50},{pos:'RCM',x:63,y:50},{pos:'LCM',x:37,y:50},{pos:'LM',x:18,y:50},{pos:'RST',x:65,y:20},{pos:'LST',x:35,y:20}],
  '4-4-2 (ruit)':  [{pos:'GK',x:50,y:88},{pos:'RB',x:82,y:72},{pos:'RCB',x:63,y:72},{pos:'LCB',x:37,y:72},{pos:'LB',x:18,y:72},{pos:'DM',x:50,y:62},{pos:'RM',x:76,y:50},{pos:'LM',x:24,y:50},{pos:'CAM',x:50,y:38},{pos:'RST',x:65,y:20},{pos:'LST',x:35,y:20}],
  '4-3-1-2':       [{pos:'GK',x:50,y:88},{pos:'RB',x:82,y:72},{pos:'RCB',x:63,y:72},{pos:'LCB',x:37,y:72},{pos:'LB',x:18,y:72},{pos:'RM',x:72,y:58},{pos:'CM',x:50,y:56},{pos:'LM',x:28,y:58},{pos:'CAM',x:50,y:40},{pos:'RST',x:65,y:20},{pos:'LST',x:35,y:20}],
  '4-5-1':         [{pos:'GK',x:50,y:88},{pos:'RB',x:82,y:72},{pos:'RCB',x:63,y:72},{pos:'LCB',x:37,y:72},{pos:'LB',x:18,y:72},{pos:'RM',x:88,y:50},{pos:'RCM',x:68,y:48},{pos:'CM',x:50,y:46},{pos:'LCM',x:32,y:48},{pos:'LM',x:12,y:50},{pos:'ST',x:50,y:20}],
  '4-2-2-2':       [{pos:'GK',x:50,y:88},{pos:'RB',x:82,y:72},{pos:'RCB',x:63,y:72},{pos:'LCB',x:37,y:72},{pos:'LB',x:18,y:72},{pos:'RDM',x:63,y:60},{pos:'LDM',x:37,y:60},{pos:'RAM',x:72,y:42},{pos:'LAM',x:28,y:42},{pos:'RST',x:65,y:20},{pos:'LST',x:35,y:20}],
  '3-5-2':         [{pos:'GK',x:50,y:88},{pos:'RCB',x:72,y:76},{pos:'CB',x:50,y:76},{pos:'LCB',x:28,y:76},{pos:'RWB',x:88,y:54},{pos:'RCM',x:68,y:52},{pos:'CM',x:50,y:50},{pos:'LCM',x:32,y:52},{pos:'LWB',x:12,y:54},{pos:'RST',x:65,y:20},{pos:'LST',x:35,y:20}],
  '3-4-3':         [{pos:'GK',x:50,y:88},{pos:'RCB',x:72,y:76},{pos:'CB',x:50,y:76},{pos:'LCB',x:28,y:76},{pos:'RM',x:82,y:52},{pos:'RCM',x:63,y:52},{pos:'LCM',x:37,y:52},{pos:'LM',x:18,y:52},{pos:'RW',x:80,y:24},{pos:'ST',x:50,y:18},{pos:'LW',x:20,y:24}],
  '3-4-1-2':       [{pos:'GK',x:50,y:88},{pos:'RCB',x:72,y:76},{pos:'CB',x:50,y:76},{pos:'LCB',x:28,y:76},{pos:'RM',x:82,y:56},{pos:'RCM',x:63,y:56},{pos:'LCM',x:37,y:56},{pos:'LM',x:18,y:56},{pos:'CAM',x:50,y:38},{pos:'RST',x:65,y:20},{pos:'LST',x:35,y:20}],
  '4-3-3 (punt)':  [{pos:'GK',x:50,y:88},{pos:'RB',x:82,y:72},{pos:'RCB',x:63,y:72},{pos:'LCB',x:37,y:72},{pos:'LB',x:18,y:72},{pos:'RCM',x:68,y:56},{pos:'LCM',x:32,y:56},{pos:'CAM',x:50,y:44},{pos:'RW',x:78,y:26},{pos:'ST',x:50,y:20},{pos:'LW',x:22,y:26}],
  '3-4-3 (vlak)':  [{pos:'GK',x:50,y:88},{pos:'RCB',x:72,y:76},{pos:'CB',x:50,y:76},{pos:'LCB',x:28,y:76},{pos:'RWB',x:86,y:56},{pos:'RCM',x:63,y:52},{pos:'LCM',x:37,y:52},{pos:'LWB',x:14,y:56},{pos:'RW',x:80,y:24},{pos:'ST',x:50,y:18},{pos:'LW',x:20,y:24}],
  '3-3-3-1':       [{pos:'GK',x:50,y:88},{pos:'RCB',x:72,y:76},{pos:'CB',x:50,y:76},{pos:'LCB',x:28,y:76},{pos:'RM',x:72,y:62},{pos:'CM',x:50,y:62},{pos:'LM',x:28,y:62},{pos:'RW',x:72,y:40},{pos:'CAM',x:50,y:40},{pos:'LW',x:28,y:40},{pos:'ST',x:50,y:18}],
  '4-2-4':          [{pos:'GK',x:50,y:88},{pos:'RB',x:82,y:72},{pos:'RCB',x:63,y:72},{pos:'LCB',x:37,y:72},{pos:'LB',x:18,y:72},{pos:'RDM',x:63,y:58},{pos:'LDM',x:37,y:58},{pos:'RW',x:82,y:26},{pos:'RST',x:62,y:20},{pos:'LST',x:38,y:20},{pos:'LW',x:18,y:26}],
  '5-3-2':          [{pos:'GK',x:50,y:88},{pos:'RWB',x:88,y:68},{pos:'RCB',x:70,y:76},{pos:'CB',x:50,y:76},{pos:'LCB',x:30,y:76},{pos:'LWB',x:12,y:68},{pos:'RM',x:70,y:50},{pos:'CM',x:50,y:50},{pos:'LM',x:30,y:50},{pos:'RST',x:65,y:20},{pos:'LST',x:35,y:20}],
  '5-4-1':          [{pos:'GK',x:50,y:88},{pos:'RWB',x:88,y:68},{pos:'RCB',x:70,y:76},{pos:'CB',x:50,y:76},{pos:'LCB',x:30,y:76},{pos:'LWB',x:12,y:68},{pos:'RM',x:78,y:48},{pos:'RCM',x:60,y:48},{pos:'LCM',x:40,y:48},{pos:'LM',x:22,y:48},{pos:'ST',x:50,y:20}],
  '5-2-3':          [{pos:'GK',x:50,y:88},{pos:'RWB',x:88,y:68},{pos:'RCB',x:70,y:76},{pos:'CB',x:50,y:76},{pos:'LCB',x:30,y:76},{pos:'LWB',x:12,y:68},{pos:'RDM',x:63,y:54},{pos:'LDM',x:37,y:54},{pos:'RW',x:80,y:26},{pos:'ST',x:50,y:20},{pos:'LW',x:20,y:26}],
  '5-3-1-1':        [{pos:'GK',x:50,y:88},{pos:'RWB',x:88,y:68},{pos:'RCB',x:70,y:76},{pos:'CB',x:50,y:76},{pos:'LCB',x:30,y:76},{pos:'LWB',x:12,y:68},{pos:'RM',x:70,y:52},{pos:'CM',x:50,y:52},{pos:'LM',x:30,y:52},{pos:'SS',x:50,y:34},{pos:'ST',x:50,y:18}],
  '3-3-3-1':       [{pos:'GK',x:50,y:88},{pos:'RCB',x:72,y:76},{pos:'CB',x:50,y:76},{pos:'LCB',x:28,y:76},{pos:'RM',x:72,y:62},{pos:'CM',x:50,y:62},{pos:'LM',x:28,y:62},{pos:'RW',x:72,y:40},{pos:'CAM',x:50,y:40},{pos:'LW',x:28,y:40},{pos:'ST',x:50,y:18}],
  '5-3-2':         [{pos:'GK',x:50,y:88},{pos:'RWB',x:88,y:68},{pos:'RCB',x:70,y:76},{pos:'CB',x:50,y:76},{pos:'LCB',x:30,y:76},{pos:'LWB',x:12,y:68},{pos:'RM',x:70,y:50},{pos:'CM',x:50,y:50},{pos:'LM',x:30,y:50},{pos:'RST',x:65,y:20},{pos:'LST',x:35,y:20}],
  '5-4-1':         [{pos:'GK',x:50,y:88},{pos:'RWB',x:88,y:68},{pos:'RCB',x:70,y:76},{pos:'CB',x:50,y:76},{pos:'LCB',x:30,y:76},{pos:'LWB',x:12,y:68},{pos:'RM',x:78,y:48},{pos:'RCM',x:60,y:48},{pos:'LCM',x:40,y:48},{pos:'LM',x:22,y:48},{pos:'ST',x:50,y:20}],
  '5-2-3':         [{pos:'GK',x:50,y:88},{pos:'RWB',x:88,y:68},{pos:'RCB',x:70,y:76},{pos:'CB',x:50,y:76},{pos:'LCB',x:30,y:76},{pos:'LWB',x:12,y:68},{pos:'RDM',x:63,y:54},{pos:'LDM',x:37,y:54},{pos:'RW',x:80,y:26},{pos:'ST',x:50,y:20},{pos:'LW',x:20,y:26}],
};

// Lineup state: array of periods [{formation, minute, assignments:{posIdx->playerId}, viewMode}]
let matchPeriods = [];

function initLineupPeriods(m) {
  if (m.periods && m.periods.length) {
    matchPeriods = JSON.parse(JSON.stringify(m.periods));
  } else {
    matchPeriods = [{formation:window._defaultFormation||Object.keys(FORMATIONS)[0], minute:0, assignments:{}, viewMode:'field'}]; activeLineupPeriod = 0;
  }
}

// Active period index for tab UI
let activeLineupPeriod = 0;
let activeLoadoutIdx = -1; // -1 = geen loadout actief

function renderLineupTab() {
  const wrap = document.getElementById('mm-lineup-content');
  if (!wrap) return;
  if (activeLineupPeriod >= matchPeriods.length) activeLineupPeriod = 0;
  // All players for display (incl. vertrokken — loadout may reference them)
  const players = (S.players||[]);
  // Only active players for the picker
  const activePlayers = (S.players||[]).filter(p=>!['vertrokken','uitgeleend'].includes(p.status));

  // ── LOADOUT BAR ──
  const loadouts = S.loadouts || [];
  const loadoutBar = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap">
    <span style="font-size:11px;color:var(--text-muted);font-weight:600;flex-shrink:0">Loadout:</span>
    ${loadouts.length ? `<select class="form-select" id="loadout-select" style="height:28px;padding:2px 8px;font-size:12px;flex:1;min-width:0;max-width:240px"
      onchange="if(this.value!==''){applyLoadout(parseInt(this.value))}">
      <option value="">— Selecteer loadout —</option>
      ${loadouts.map((l,i)=>`<option value="${i}" ${i===activeLoadoutIdx?'selected':''}>${l.name} (${l.formation})</option>`).join('')}
    </select>` : '<span style="font-size:11px;color:var(--text-muted);font-style:italic">Nog geen loadouts</span>'}
    ${activeLoadoutIdx>=0 ? `<button class="btn btn-ghost" style="font-size:11px;height:28px;padding:1px 8px;color:var(--loss);flex-shrink:0"
      onclick="activeLoadoutIdx=-1;renderLineupTab()" title="Ontkoppel loadout">✕</button>` : ''}
    <button class="btn btn-primary" style="font-size:11px;height:28px;padding:1px 10px;margin-left:auto;flex-shrink:0"
      onclick="saveLoadout()">${activeLoadoutIdx>=0?'💾 Bijwerken':'💾 Loadout opslaan'}</button>
  </div>`;

  // ── PERIOD TABS ──
  const tabLabels = matchPeriods.map((p, i) =>
    i===0 ? 'Basisopstelling' : `Wissel ${i} (${p.minute||'?'}')`
  );
  const tabs = `<div style="display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:12px;overflow-x:auto">
    ${tabLabels.map((lbl, i) => `
      <div onclick="activeLineupPeriod=${i};renderLineupTab()"
        style="padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;
          border-bottom:2px solid ${i===activeLineupPeriod?'var(--cambuur-geel)':'transparent'};
          margin-bottom:-2px;color:${i===activeLineupPeriod?'var(--cambuur-geel)':'var(--text-muted)'};
          transition:color 0.15s">${lbl}</div>`).join('')}
    <div onclick="addFormationChange()"
      style="padding:7px 12px;font-size:12px;cursor:pointer;color:var(--text-muted);white-space:nowrap;margin-left:auto">
      + Wissel toevoegen</div>
  </div>`;

  // ── ACTIVE PERIOD CONTENT ──
  const pi = activeLineupPeriod;
  const period = matchPeriods[pi];
  const isFirst = pi === 0;
  const formation = FORMATIONS[period.formation] || FORMATIONS[Object.keys(FORMATIONS)[0]];
  const assignedIds = Object.values(period.assignments);

  const periodControls = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
    ${!isFirst ? `<div style="display:flex;align-items:center;gap:6px">
      <span style="font-size:11px;color:var(--text-muted)">Wisselmoment:</span>
      <input class="form-input" type="number" min="1" max="120" value="${period.minute||45}"
        oninput="matchPeriods[${pi}].minute=parseInt(this.value)||45;renderLineupTab()"
        style="width:56px;height:28px;font-size:12px;padding:3px 6px">
      <span style="font-size:11px;color:var(--text-muted)">'</span>
    </div>` : ''}
    <select class="form-select" style="height:28px;padding:3px 8px;font-size:12px;width:150px"
      onchange="matchPeriods[${pi}].formation=this.value;renderLineupTab()">
      ${getActiveFormations().map(f=>`<option value="${f}" ${f===period.formation?'selected':''}>${f}</option>`).join('')}
    </select>
    <button class="btn btn-ghost" style="font-size:11px;height:28px;padding:2px 8px"
      onclick="matchPeriods[${pi}].viewMode=matchPeriods[${pi}].viewMode==='field'?'list':'field';renderLineupTab()">
      ${period.viewMode==='field'?'☰ Lijst':'⊞ Veld'}
    </button>
    <button class="btn btn-ghost" style="font-size:11px;height:28px;padding:2px 8px" onclick="clearLineup(${pi})">🗑 Leeg</button>
    ${!isFirst?`<button class="icon-btn danger" style="height:28px" onclick="matchPeriods.splice(${pi},1);activeLineupPeriod=Math.max(0,${pi}-1);renderLineupTab()">✕</button>`:''}
  </div>`;

  let periodContent = '';
  if (period.viewMode === 'field') {
    periodContent = `<div class="field-wrap">${renderField(formation, period.assignments, pi, players)}</div>`;
  } else {
    // List uses activePlayers for clicking, but field uses all players for display
    periodContent = renderLineupList(activePlayers, period.assignments, pi, assignedIds);
  }

  // ── BENCH ──
  const allAssigned = new Set(Object.values(matchPeriods[0]?.assignments || {}));
  const bench = activePlayers.filter(p=>!allAssigned.has(p.id));
  const benchHtml = allAssigned.size > 0 ? `<div style="margin-top:12px">
    <div style="font-size:11px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Bank / niet geselecteerd (${bench.length})</div>
    <div style="display:flex;gap:4px;flex-wrap:wrap">
      ${bench.map(p=>`<div style="padding:3px 8px;font-size:11px;border:1px solid var(--border);border-radius:4px;color:var(--text-muted)">
        ${p.number?'#'+p.number+' ':''}${p.firstname?p.firstname[0]+'. ':''}${p.lastname}
      </div>`).join('')}
    </div>
  </div>` : '';

  wrap.innerHTML = loadoutBar + tabs + periodControls + periodContent + benchHtml;
}


function renderField(formation, assignments, pi, players) {
  const slots = formation.map((pos, idx) => {
    const pid = assignments[idx];
    const p = pid ? players.find(pl=>pl.id===pid) : null;
    const filled = !!p;
    const numStr = filled && p.number ? '#'+p.number : '';
    const rawName = filled ? p.lastname : pos.pos;
    const nameStr = rawName.length > 7 ? rawName.slice(0,7) : rawName;
    const bg = filled ? 'var(--cambuur-geel)' : 'rgba(255,255,255,0.12)';
    const border = filled ? '2px solid var(--cambuur-geel)' : '2px solid rgba(255,255,255,0.3)';
    const col = filled ? '#000' : 'rgba(255,255,255,0.85)';
    return `<div onclick="cycleFieldPos(${pi},${idx})"
      style="position:absolute;left:${pos.x}%;top:${pos.y}%;transform:translate(-50%,-50%);
        width:13%;padding-bottom:13%;border-radius:50%;background:${bg};border:${border};
        cursor:pointer;box-sizing:border-box;transition:opacity 0.15s"
      onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:2px">
        ${numStr ? `<span style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:16px;color:${col};line-height:1">${numStr}</span>` : ''}
        <div style="max-width:92%;overflow:hidden;padding:0 2px">
          <span class="${rawName.length>7?'marquee-inner':''}" style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:13px;color:${col};line-height:1.1;white-space:nowrap;display:inline-block">${rawName}</span>
        </div>
      </div>
    </div>`;
  }).join('');

  return `<div style="position:relative;width:100%;padding-bottom:135%;background:#1a4a2a;border-radius:8px;overflow:hidden;flex-shrink:0">
    <div style="position:absolute;inset:3.5%;border:2px solid rgba(255,255,255,0.3);border-radius:2px;pointer-events:none"></div>
    <div style="position:absolute;left:3.5%;right:3.5%;top:50%;height:1px;background:rgba(255,255,255,0.2);pointer-events:none"></div>
    <div style="position:absolute;left:50%;top:50%;width:22%;padding-bottom:22%;border-radius:50%;border:1px solid rgba(255,255,255,0.2);transform:translate(-50%,-50%);pointer-events:none"></div>
    <div style="position:absolute;left:22%;right:22%;top:3.5%;height:19%;border:1px solid rgba(255,255,255,0.2);pointer-events:none"></div>
    <div style="position:absolute;left:22%;right:22%;bottom:3.5%;height:19%;border:1px solid rgba(255,255,255,0.2);pointer-events:none"></div>
    <div style="position:absolute;left:35%;right:35%;top:3.5%;height:7%;border:1px solid rgba(255,255,255,0.15);pointer-events:none"></div>
    <div style="position:absolute;left:35%;right:35%;bottom:3.5%;height:7%;border:1px solid rgba(255,255,255,0.15);pointer-events:none"></div>
    ${slots}
  </div>`;
}


function cycleFieldPos(pi, posIdx) {
  const period = matchPeriods[pi];
  const players = (S.players||[]).filter(p=>!['vertrokken','uitgeleend'].includes(p.status));
  const assignedIds = new Set(Object.values(period.assignments));
  const current = period.assignments[posIdx];

  // Build list of available players (not yet assigned in this period, + current)
  const available = players.filter(p => !assignedIds.has(p.id) || p.id===current);

  // Show a quick picker popup
  showPositionPicker(pi, posIdx, available, current);
}

function showPositionPicker(pi, posIdx, players, currentId) {
  document.getElementById('pos-picker')?.remove();
  const period = matchPeriods[pi];
  const formation = FORMATIONS[period.formation] || FORMATIONS[Object.keys(FORMATIONS)[0]];
  const slotPos = formation[posIdx]?.pos || '';
  const assignedIds = new Set(Object.values(period.assignments));
  if (currentId) assignedIds.delete(currentId);

  const rows = buildPickerRowsLabeled(players, slotPos, currentId, assignedIds,
    `assignFieldPos(${pi},${posIdx},`);

  const picker = document.createElement('div');
  picker.id = 'pos-picker';
  picker.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  picker.innerHTML = `<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);width:340px;max-height:480px;display:flex;flex-direction:column;overflow:hidden">
    <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
      <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:17px">Speler voor ${slotPos}</div>
      <button class="icon-btn" onclick="document.getElementById('pos-picker').remove()" style="font-size:14px">✕</button>
    </div>
    <div style="overflow-y:auto;flex:1">
      <div onclick="assignFieldPos(${pi},${posIdx},null);document.getElementById('pos-picker')?.remove()"
        style="display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;color:var(--text-muted);border-bottom:1px solid var(--border-light)"
        onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
        <span style="font-size:13px">— Leeg laten —</span>
      </div>
      ${rows}
    </div>
  </div>`;
  document.body.appendChild(picker);
  picker.addEventListener('click', e => { if(e.target===picker) picker.remove(); });
}

function assignFieldPos(pi, posIdx, playerId) {
  document.getElementById('pos-picker')?.remove();
  const period = matchPeriods[pi];
  // Remove player from other positions first
  if (playerId) {
    Object.keys(period.assignments).forEach(k => {
      if (period.assignments[k] === playerId) delete period.assignments[k];
    });
    period.assignments[posIdx] = playerId;
  } else {
    delete period.assignments[posIdx];
  }
  renderLineupTab();
}

function renderLineupList(players, assignments, pi, assignedIds) {
  const groupOrder = {ATT:0,MID:1,DEF:2,GK:3,OTHER:4};
  const starters = players.filter(p=>assignedIds.includes(p.id))
    .sort((a,b)=>(groupOrder[getPosGroup(a.subpos?.[0]||a.position||'')]??4)-(groupOrder[getPosGroup(b.subpos?.[0]||b.position||'')]??4)||(a.number||99)-(b.number||99));
  const bench = players.filter(p=>!assignedIds.includes(p.id))
    .sort((a,b)=>(groupOrder[getPosGroup(a.subpos?.[0]||a.position||'')]??4)-(groupOrder[getPosGroup(b.subpos?.[0]||b.position||'')]??4)||(a.number||99)-(b.number||99));

  const row = (p, role) => `<div class="lineup-player-row ${role}" onclick="toggleLineupRole(${pi},'${p.id}')">
    <span style="font-weight:800;color:var(--cambuur-geel);min-width:28px;font-size:12px">${p.number?'#'+p.number:''}</span>
    <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</span>
    <span style="font-size:11px;color:var(--text-secondary);margin-left:4px">${p.subpos?.[0]||p.position||''}</span>
    <span class="lineup-role-badge ${role==='starter'?'role-starter':'role-bench'}">${role==='starter'?'BASIS':'BANK'}</span>
  </div>`;

  return `<div>
    <div style="font-size:10px;font-weight:700;color:var(--cambuur-geel);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Basiself (${starters.length}/11)</div>
    <div class="lineup-list">${starters.map(p=>row(p,'starter')).join('') || '<p class="text-muted" style="font-size:11px">Klik spelers aan om ze toe te voegen</p>'}</div>
    <div style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin:8px 0 4px">Niet geselecteerd (${bench.length})</div>
    <div class="lineup-list">${bench.map(p=>row(p,'bench')).join('')}</div>
  </div>`;
}

function toggleLineupRole(pi, playerId) {
  const period = matchPeriods[pi];
  const assignedIds = Object.values(period.assignments);
  // In list mode, use positional slots sequentially
  if (assignedIds.includes(playerId)) {
    // Remove from starters
    const key = Object.keys(period.assignments).find(k=>period.assignments[k]===playerId);
    if (key !== undefined) delete period.assignments[key];
  } else {
    // Add to next available slot
    const formation = FORMATIONS[period.formation] || FORMATIONS[Object.keys(FORMATIONS)[0]];
    for (let i=0; i<formation.length; i++) {
      if (!period.assignments[i]) {
        period.assignments[i] = playerId;
        break;
      }
    }
  }
  renderLineupTab();
}

// ══════════════════════════════
// SQUAD FIELD PICKER
// ══════════════════════════════
let squadManualAssignments = {};

function showSquadPicker(posIdx) {
  document.getElementById('pos-picker')?.remove();
  const formation = window._squadFormation || [];
  const players = window._squadPlayers || [];
  const assigned = window._squadAssigned || new Map();
  const currentPlayer = assigned.get(posIdx);
  const currentId = currentPlayer?.id || null;
  const slotPos = formation[posIdx]?.pos || '';
  const usedIds = new Set();
  assigned.forEach((p, i) => { if (i !== posIdx && p) usedIds.add(p.id); });

  const rows = buildPickerRowsLabeled(players, slotPos, currentId, usedIds, `assignSquadPos(${posIdx},`);

  const picker = document.createElement('div');
  picker.id = 'pos-picker';
  picker.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  picker.innerHTML = `<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);width:340px;max-height:480px;display:flex;flex-direction:column;overflow:hidden">
    <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
      <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:17px">Positie: ${slotPos}</div>
      <button class="icon-btn" onclick="document.getElementById('pos-picker').remove()" style="font-size:14px">✕</button>
    </div>
    <div style="overflow-y:auto;flex:1">
      <div onclick="assignSquadPos(${posIdx},null);document.getElementById('pos-picker')?.remove()"
        style="display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;color:var(--text-muted);border-bottom:1px solid var(--border-light)"
        onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
        <span style="font-size:13px">— Leeg laten —</span>
      </div>
      ${rows}
    </div>
  </div>`;
  document.body.appendChild(picker);
  picker.addEventListener('click', e => { if(e.target===picker) picker.remove(); });
}

function assignSquadPos(posIdx, playerId) {
  document.getElementById('pos-picker')?.remove();
  if (!playerId || playerId === 'null') { delete squadManualAssignments[posIdx]; }
  else { squadManualAssignments[posIdx] = playerId; }
  renderSelectie();
}

function addFormationChange() {
  const last = matchPeriods[matchPeriods.length-1];
  matchPeriods.push({
    formation: last.formation,
    minute: 60,
    assignments: {...last.assignments},
    viewMode: 'field'
  });
  activeLineupPeriod = matchPeriods.length - 1;
  renderLineupTab();
}

function clearLineup(pi) {
  matchPeriods[pi].assignments = {};
  renderLineupTab();
}


// ══════════════════════════════
// STANDAARD FORMATIE
// ══════════════════════════════

let activeSquadLoadoutIdx = -1;

function applySquadLoadout(idx) {
  const l = (S.loadouts||[])[idx];
  if (!l) return;
  squadFieldFormation = l.formation;
  squadManualAssignments = loadoutToAssignments(l);
  activeSquadLoadoutIdx = idx;
  renderSelectie();

  const allPlayers = new Set((S.players||[]).map(p=>p.id));
  const missing = (l.playerIds||[]).filter(pid => !allPlayers.has(pid)).length;
  if (missing > 0) showToast(`Loadout geladen — ${missing} speler(s) niet meer in selectie`, 'error');
  else showToast('Loadout "' + l.name + '" ingeladen', 'success');
}

async function saveSquadFieldAsLoadout() {
  const assigned = window._squadAssigned;
  if (!assigned || assigned.size === 0) {
    showToast('Wijs eerst spelers toe aan posities', 'error');
    return;
  }
  const name = prompt('Naam voor deze opstelling:');
  if (!name) return;
  const formation = FORMATIONS[squadFieldFormation] || [];
  // Sla op als array: [{posIdx, posCode, playerId}]
  const slots = [];
  assigned.forEach((p, idx) => {
    if (p) slots.push({posIdx: idx, posCode: formation[idx]?.pos || '', playerId: p.id});
  });
  const playerIds = slots.map(s=>s.playerId);
  if (!S.loadouts) S.loadouts = [];
  S.loadouts.push({
    id: 'lo_' + Date.now(),
    name,
    formation: squadFieldFormation,
    playerIds,
    slots, // nieuw formaat
    posMap: {}, // legacy leeg houden
    createdAt: new Date().toISOString()
  });
  await dbPut('settings', {key:'loadouts', value: JSON.stringify(S.loadouts)});
  showToast('Loadout "' + name + '" opgeslagen', 'success');
}

async function saveDefaultFormation() {
  await saveSetting('defaultFormation', squadFieldFormation);
  await saveSetting('defaultFieldWidth', String(squadFieldWidth));
  showToast('Standaard opgeslagen: ' + squadFieldFormation + ' (' + squadFieldWidth + 'px)', 'success');
}

async function loadDefaultFormation() {
  const val = window._defaultFormation;
  if (val && FORMATIONS[val]) squadFieldFormation = val;
  if (window._defaultFieldWidth) squadFieldWidth = window._defaultFieldWidth;
}


// ══════════════════════════════
// LOADOUTS
// ══════════════════════════════
async function saveLoadout() {
  if (!S.loadouts) S.loadouts = [];
  const period = matchPeriods[0];
  const formation = period.formation;
  const playerIds = Object.values(period.assignments).filter(Boolean);
  const formation2 = FORMATIONS[period.formation] || [];
  const slots = [];
  Object.entries(period.assignments).forEach(([idx, pid]) => {
    if (pid) slots.push({posIdx: parseInt(idx), posCode: formation2[parseInt(idx)]?.pos || '', playerId: pid});
  });
  const posMap = {}; // legacy

  if (activeLoadoutIdx >= 0 && S.loadouts[activeLoadoutIdx]) {
    // Update bestaande loadout
    const existing = S.loadouts[activeLoadoutIdx];
    const newName = prompt('Naam:', existing.name);
    if (!newName) return;
    existing.name = newName;
    existing.formation = formation;
    existing.playerIds = playerIds;
    existing.posMap = posMap;
    existing.updatedAt = new Date().toISOString();
    await dbPut('settings', {key:'loadouts', value: JSON.stringify(S.loadouts)});
    showToast('Loadout "' + newName + '" bijgewerkt', 'success');
  } else {
    // Nieuwe loadout
    const name = prompt('Naam voor deze opstelling:');
    if (!name) return;
    const loadout = {id:'lo_'+Date.now(), name, formation, playerIds, slots, posMap:{}, createdAt:new Date().toISOString()};
    S.loadouts.push(loadout);
    activeLoadoutIdx = S.loadouts.length - 1;
    await dbPut('settings', {key:'loadouts', value: JSON.stringify(S.loadouts)});
    showToast('Loadout "' + name + '" opgeslagen', 'success');
  }
  renderLineupTab();
}

async function deleteLoadout(idx) {
  const l = S.loadouts[idx];
  if (!l) return;
  if (!confirm('Loadout "' + l.name + '" verwijderen?')) return;
  S.loadouts.splice(idx, 1);
  await dbPut('settings', {key:'loadouts', value: JSON.stringify(S.loadouts)});
  // Reset active loadout idx if needed
  if (activeLoadoutIdx === idx) activeLoadoutIdx = -1;
  else if (activeLoadoutIdx > idx) activeLoadoutIdx--;
  // Only re-render lineup tab if modal is open
  if (document.getElementById('modal-match')?.classList.contains('open')) renderLineupTab();
  // Re-render settings if open
  if (document.getElementById('stab-formaties')?.style.display !== 'none') renderFormationsSettings();
  showToast('Loadout verwijderd', 'success');
}

function loadoutToAssignments(l) {
  const allPlayers = new Set((S.players||[]).map(p=>p.id));
  const assignments = {};

  if (l.slots && l.slots.length) {
    const formation = FORMATIONS[l.formation] || [];
    const usedPids = new Set();
    const usedSlotIdxs = new Set();

    // For each saved slot: find the matching slot in the CURRENT formation
    // using posCode first, posIdx as fallback if posCode doesn't match
    l.slots.forEach(s => {
      if (!allPlayers.has(s.playerId)) return; // speler bestaat niet meer
      if (usedPids.has(s.playerId)) return; // geen duplicaten

      // Find slot in current formation by posCode
      // There may be multiple slots with same posCode (e.g. LCB/RCB both 'CB')
      // so find the first UNUSED one
      let targetIdx = -1;

      // First: find unused slot with exact posCode match
      for (let i = 0; i < formation.length; i++) {
        if (!usedSlotIdxs.has(i) && formation[i].pos === s.posCode) {
          targetIdx = i;
          break;
        }
      }

      // Fallback: use posIdx if posCode not found (different formation)
      if (targetIdx === -1 && s.posIdx < formation.length && !usedSlotIdxs.has(s.posIdx)) {
        targetIdx = s.posIdx;
      }

      if (targetIdx >= 0) {
        assignments[targetIdx] = s.playerId;
        usedPids.add(s.playerId);
        usedSlotIdxs.add(targetIdx);
      }
    });
    return assignments;
  }

  // Legacy: posMap format
  if (!l.posMap || !Object.keys(l.posMap).length) return assignments;

  const formation = FORMATIONS[l.formation] || [];
  const keys = Object.keys(l.posMap);
  const hasPosCode = keys.some(k => isNaN(parseInt(k)));

  if (!hasPosCode) {
    keys.forEach(i => {
      const pid = l.posMap[i];
      if (pid && allPlayers.has(pid)) assignments[parseInt(i)] = pid;
    });
    return assignments;
  }

  // posCode→playerId legacy: match per slot, geen duplicaten
  const assignedPids = new Set();
  formation.forEach((slot, slotIdx) => {
    const pid = l.posMap[slot.pos];
    if (pid && allPlayers.has(pid) && !assignedPids.has(pid)) {
      assignments[slotIdx] = pid;
      assignedPids.add(pid);
    }
  });
  return assignments;
}

function applyLoadout(idx) {
  const l = S.loadouts[idx];
  if (!l) return;
  matchPeriods[0].formation = l.formation;
  matchPeriods[0].assignments = loadoutToAssignments(l);
  activeLineupPeriod = 0;
  activeLoadoutIdx = idx;
  renderLineupTab();

  const allPlayers = new Set((S.players||[]).map(p=>p.id));
  const missing = (l.playerIds||[]).filter(pid => !allPlayers.has(pid)).length;
  if (missing > 0) showToast(`Loadout geladen — ${missing} speler(s) niet meer in selectie`, 'error');
  else showToast('Loadout "' + l.name + '" ingeladen', 'success');
}


// ══════════════════════════════
// VOORKEUREN / INSTELLINGEN
// ══════════════════════════════
const DEFAULT_PREFS = {
  coachYellowThreshold: 3,
  font: 'inter',
  fontSize: 'normal',
  formLength: 5,
  showTopscorers: true,
  showAvailability: true,
  defaultPlayerView: 'kaart',
  defaultPlayerSort: 'positie',
  contractWarnMonths: 6,
  loanWarnMonths: 3,
  activeFormations: null, // null = all active
  customFormations: [],
};

function getPrefs() {
  return Object.assign({}, DEFAULT_PREFS, S.prefs || {});
}

async function savePref(key, value) {
  if (!S.prefs) S.prefs = {};
  S.prefs[key] = value;
  await dbPut('settings', {key:'prefs', value: JSON.stringify(S.prefs)});
  applyPrefs();
}

function applyPrefs() {
  const p = getPrefs();
  // Font
  const fonts = {
    inter: "'Inter','Segoe UI',sans-serif",
    system: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    roboto: "'Roboto','Segoe UI',sans-serif",
    mono: "'JetBrains Mono','Fira Code',monospace"
  };
  document.body.style.fontFamily = fonts[p.font] || fonts.inter;
  // Font size
  const sizes = {small:'13px', normal:'14px', large:'16px'};
  document.documentElement.style.setProperty('--base-font-size', sizes[p.fontSize] || '14px');
  document.body.style.fontSize = sizes[p.fontSize] || '14px';
}

function setFont(val) { savePref('font', val); }
function setFontSize(val) { savePref('fontSize', val); }

function getActiveFormations() {
  const p = getPrefs();
  const customs = (p.customFormations||[]).map(c=>c.name);
  const builtinKeys = Object.keys(FORMATIONS).filter(k=>!customs.includes(k));
  // Active built-in formations
  const activeBuiltin = p.activeFormations
    ? p.activeFormations.filter(k => builtinKeys.includes(k))
    : builtinKeys;
  // Custom formations are ALWAYS active
  return [...activeBuiltin, ...customs.filter(n => FORMATIONS[n])];
}


function renderInstellingen() {
  const p = getPrefs();
  // Sync toggle states
  const dm = document.getElementById('dark-mode-toggle');
  if (dm) dm.checked = S.theme==='dark';
  const fs = document.getElementById('font-select');
  if (fs) fs.value = p.font || 'inter';
  const fss = document.getElementById('fontsize-select');
  if (fss) fss.value = p.fontSize || 'normal';
  const fls = document.getElementById('form-length-select');
  if (fls) fls.value = String(p.formLength || 5);
  const pt = document.getElementById('pref-topscorers');
  if (pt) pt.checked = p.showTopscorers !== false;
  const pa = document.getElementById('pref-availability');
  if (pa) pa.checked = p.showAvailability !== false;
  // Default to algemeen tab
  switchSettingsTab('algemeen', document.querySelector('#settings-tabs .tab'));
  renderSeasonsManage();
}

function switchSettingsTab(tab, el) {
  ['algemeen','seizoenen','formaties','selectie','gegevens'].forEach(t => {
    const d = document.getElementById('stab-'+t);
    if (d) d.style.display = t===tab ? 'block' : 'none';
  });
  document.querySelectorAll('#settings-tabs .tab').forEach(t=>t.classList.remove('active'));
  if (el) el.classList.add('active');
  if (tab === 'formaties') renderFormationsSettings();
  if (tab === 'seizoenen') renderSeasonsManage();
  if (tab === 'selectie') renderSelectieSettings();
}

function renderSelectieSettings() {
  const p = getPrefs();
  const dv = document.getElementById('pref-default-view');
  const ds = document.getElementById('pref-default-sort');
  const cw = document.getElementById('pref-contract-warn');
  const lw = document.getElementById('pref-loan-warn');
  if (dv) dv.value = p.defaultPlayerView || 'kaart';
  if (ds) ds.value = p.defaultPlayerSort || 'positie';
  if (cw) cw.value = String(p.contractWarnMonths || 6);
  if (lw) lw.value = String(p.loanWarnMonths || 3);
}

function renderFormationsSettings() {
  const p = getPrefs();
  const customs = p.customFormations || [];

  // Zorg dat eigen formaties altijd in FORMATIONS staan
  customs.forEach(cf => {
    if (cf.name && cf.slots?.length && !FORMATIONS[cf.name]) {
      FORMATIONS[cf.name] = cf.slots.map(s=>({pos:s.pos, x:s.x, y:s.y}));
    }
  });

  const customNames = new Set(customs.map(c=>c.name));
  // active = only built-in formations that are active; custom formations always shown separately
  const activeRaw = p.activeFormations;
  const builtinKeys = Object.keys(FORMATIONS).filter(k => !customNames.has(k));
  const active = activeRaw || builtinKeys;

  // Built-in formations checklist
  const cl = document.getElementById('formations-checklist');
  if (cl) {
    const groups = [
      {label:'4 achteraan', keys: builtinKeys.filter(k=>k.startsWith('4-'))},
      {label:'3 achteraan', keys: builtinKeys.filter(k=>k.startsWith('3-'))},
      {label:'5 achteraan', keys: builtinKeys.filter(k=>k.startsWith('5-'))},
    ];

    cl.innerHTML = groups.map(g => g.keys.length === 0 ? '' : `
      <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;padding:8px 0 4px">${g.label}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px;margin-bottom:8px">
        ${g.keys.map(k => `
          <label style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg-tertiary);border-radius:4px;cursor:pointer">
            <input type="checkbox" ${active.includes(k)?'checked':''} onchange="toggleFormationActive('${k}',this.checked)" style="accent-color:var(--cambuur-geel)">
            <span style="font-size:12px;flex:1">${k}</span>
          </label>`).join('')}
      </div>`).join('');
  }

  // Custom formations list — always shown, always active
  const cfl = document.getElementById('custom-formations-list');
  if (cfl) {
    if (!customs.length) {
      cfl.innerHTML = '<p class="text-muted" style="font-size:12px">Nog geen eigen formaties.</p>';
    } else {
      cfl.innerHTML = customs.map((f,i)=>`
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-tertiary);border-radius:4px;margin-bottom:4px">
          <span style="flex:1;font-size:13px;font-weight:600">${f.name}</span>
          <span class="text-muted" style="font-size:11px">${f.slots?.length||0} posities · altijd actief</span>
          <button class="btn btn-ghost" style="font-size:11px;height:28px" onclick="openCustomFormationEditor(${i})">✏️ Bewerken</button>
          <button class="icon-btn danger" style="height:28px" onclick="deleteCustomFormation(${i})">🗑️</button>
        </div>`).join('');
    }
  }

  // Loadouts list
  const ll = document.getElementById('loadouts-settings-list');
  if (ll) {
    const loadouts = S.loadouts || [];
    if (!loadouts.length) {
      ll.innerHTML = '<p class="text-muted" style="font-size:12px">Nog geen loadouts opgeslagen.</p>';
    } else {
      ll.innerHTML = loadouts.map((l,i)=>`
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-tertiary);border-radius:4px;margin-bottom:4px">
          <span style="flex:1;font-size:13px;font-weight:600">${l.name}</span>
          <span class="text-muted" style="font-size:11px">${l.formation} · ${l.playerIds?.length||0} spelers</span>
          <button class="btn btn-ghost" style="font-size:11px;height:28px" onclick="renameLoadout(${i})">✏️</button>
          <button class="icon-btn danger" style="height:28px" onclick="deleteLoadout(${i})">🗑️</button>
        </div>`).join('');
    }
  }
}

async function toggleFormationActive(name, isActive) {
  const p = getPrefs();
  let af = p.activeFormations ? [...p.activeFormations] : Object.keys(FORMATIONS);
  if (isActive) { if (!af.includes(name)) af.push(name); }
  else { af = af.filter(k=>k!==name); }
  await savePref('activeFormations', af);
  // Re-render any open formation dropdowns
  if (document.getElementById('selectie-content')) renderSelectie();
}

async function renameLoadout(idx) {
  const l = S.loadouts[idx];
  if (!l) return;
  const name = prompt('Nieuwe naam:', l.name);
  if (!name) return;
  l.name = name;
  await dbPut('settings', {key:'loadouts', value: JSON.stringify(S.loadouts)});
  renderFormationsSettings();
  showToast('Naam gewijzigd', 'success');
}

function toggleInlineSeasonForm() {
  const f = document.getElementById('inline-season-form');
  if (f) f.style.display = f.style.display==='none'||!f.style.display ? 'block' : 'none';
}

// ── Seizoenen herordenen ──

async function moveComp(id, dir) {
  const comps = S.competitions.filter(c=>c.seasonId===S.currentSeason);
  const idx = comps.findIndex(c=>c.id===id);
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= comps.length) return;
  // Swap in S.competitions
  const ai = S.competitions.indexOf(comps[idx]);
  const bi = S.competitions.indexOf(comps[newIdx]);
  [S.competitions[ai], S.competitions[bi]] = [S.competitions[bi], S.competitions[ai]];
  // Save order via sortOrder field
  S.competitions.forEach((c,i) => c.sortOrder = i);
  for (const c of S.competitions) await dbPut('competitions', c);
  renderCompetitionsPage();
  renderCompetitionsNav();
}

async function moveSeasonUp(id) {
  const idx = S.seasons.findIndex(s=>s.id===id);
  if (idx <= 0) return;
  [S.seasons[idx-1], S.seasons[idx]] = [S.seasons[idx], S.seasons[idx-1]];
  S.seasons.forEach((s,i) => s.sortOrder = i);
  for (const s of S.seasons) await dbPut('seasons', s);
  renderSeasonsManage(); renderSeasonSelect();
}
async function moveSeasonDown(id) {
  const idx = S.seasons.findIndex(s=>s.id===id);
  if (idx < 0 || idx >= S.seasons.length-1) return;
  [S.seasons[idx], S.seasons[idx+1]] = [S.seasons[idx+1], S.seasons[idx]];
  S.seasons.forEach((s,i) => s.sortOrder = i);
  for (const s of S.seasons) await dbPut('seasons', s);
  renderSeasonsManage(); renderSeasonSelect();
}
async function moveSeasonTop(id) {
  const idx = S.seasons.findIndex(s=>s.id===id);
  if (idx <= 0) return;
  S.seasons.unshift(S.seasons.splice(idx, 1)[0]);
  S.seasons.forEach((s,i) => s.sortOrder = i);
  for (const s of S.seasons) await dbPut('seasons', s);
  renderSeasonsManage(); renderSeasonSelect();
}
async function moveSeasonBottom(id) {
  const idx = S.seasons.findIndex(s=>s.id===id);
  if (idx < 0 || idx >= S.seasons.length-1) return;
  S.seasons.push(S.seasons.splice(idx, 1)[0]);
  S.seasons.forEach((s,i) => s.sortOrder = i);
  for (const s of S.seasons) await dbPut('seasons', s);
  renderSeasonsManage(); renderSeasonSelect();
}
async function toggleSeasonVisible(id) {
  const s = S.seasons.find(x=>x.id===id);
  if (!s) return;
  s.hidden = !s.hidden;
  await dbPut('seasons', s);
  renderSeasonsManage(); renderSeasonSelect();
}


// ══════════════════════════════
// EIGEN FORMATIES EDITOR
// ══════════════════════════════

// Zone boundaries (y% ranges for each positional zone)
const ZONE_POSITIONS = {
  'GK':  {yMin:80, yMax:100, label:'Keeper', opts:['GK']},
  'DEF': {yMin:62, yMax:82,  label:'Verdedigers', opts:['LB','LCB','CB','RCB','RB','LWB','RWB','SW','LIB']},
  'DM':  {yMin:52, yMax:68,  label:'Verdedigende middenvelders', opts:['DM','LDM','RDM','CDM']},
  'CM':  {yMin:38, yMax:58,  label:'Centrale middenvelders', opts:['CM','LCM','RCM','B2B','REG']},
  'AM':  {yMin:26, yMax:46,  label:'Aanvallende middenvelders / Buitenspelers', opts:['CAM','LAM','RAM','LW','RW','LM','RM','SS']},
  'ATT': {yMin:8,  yMax:32,  label:'Aanvallers', opts:['ST','LST','RST','CF','V9','2S']},
};

let editingCustomFormation = null; // {name, slots:[{x,y,pos}]}
let editingCustomIdx = -1;

function openCustomFormationEditor(idx) {
  editingCustomIdx = idx !== undefined ? idx : -1;
  const p = getPrefs();
  const customs = p.customFormations || [];
  if (editingCustomIdx >= 0 && customs[editingCustomIdx]) {
    editingCustomFormation = JSON.parse(JSON.stringify(customs[editingCustomIdx]));
  } else {
    editingCustomFormation = {name:'', slots:[]};
  }
  // Note: built-in formations cannot be edited here

  const overlay = document.createElement('div');
  overlay.id = 'custom-formation-editor';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);width:700px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden">
    <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px">
      <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:20px">${editingCustomIdx>=0?'Formatie bewerken':'Nieuwe formatie'}</div>
      <input class="form-input" id="cfe-name" placeholder="Naam (bijv. 4-3-3 aangepast)" value="${editingCustomFormation.name}"
        style="flex:1;height:32px;font-size:13px" oninput="editingCustomFormation.name=this.value">
      <button class="icon-btn" onclick="document.getElementById('custom-formation-editor').remove()" style="font-size:16px">✕</button>
    </div>
    <div style="flex:1;overflow-y:auto;display:flex;gap:0">
      <!-- Field -->
      <div style="flex:0 0 300px;padding:16px;border-right:1px solid var(--border)">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">Klik op het veld om een positie te plaatsen</div>
        <div id="cfe-field" style="position:relative;width:100%;padding-bottom:140%;background:#1a4a2a;border-radius:8px;overflow:hidden;cursor:crosshair" onclick="cfeFieldClick(event)">
          <!-- Pitch lines -->
          <div style="position:absolute;inset:3.5%;border:2px solid rgba(255,255,255,0.3);border-radius:2px;pointer-events:none"></div>
          <div style="position:absolute;left:3.5%;right:3.5%;top:50%;height:1px;background:rgba(255,255,255,0.2);pointer-events:none"></div>
          <div style="position:absolute;left:50%;top:50%;width:22%;padding-bottom:22%;border-radius:50%;border:1px solid rgba(255,255,255,0.2);transform:translate(-50%,-50%);pointer-events:none"></div>
          <div style="position:absolute;left:22%;right:22%;top:3.5%;height:19%;border:1px solid rgba(255,255,255,0.2);pointer-events:none"></div>
          <div style="position:absolute;left:22%;right:22%;bottom:3.5%;height:19%;border:1px solid rgba(255,255,255,0.2);pointer-events:none"></div>
          <!-- Zone labels (faint) -->
          <div style="position:absolute;left:2px;top:9%;font-size:9px;color:rgba(255,255,255,0.25);pointer-events:none">ATT</div>
          <div style="position:absolute;left:2px;top:36%;font-size:9px;color:rgba(255,255,255,0.25);pointer-events:none">MID</div>
          <div style="position:absolute;left:2px;top:65%;font-size:9px;color:rgba(255,255,255,0.25);pointer-events:none">DEF</div>
          <div style="position:absolute;left:2px;top:87%;font-size:9px;color:rgba(255,255,255,0.25);pointer-events:none">GK</div>
          <div id="cfe-slots"></div>
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--text-muted)" class="cfe-slot-count">${editingCustomFormation.slots.length} / 11 posities</div>
      </div>
      <!-- Slot list -->
      <div style="flex:1;padding:16px;overflow-y:auto">
        <div style="font-size:12px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">Geplaatste posities</div>
        <div id="cfe-slot-list"></div>
      </div>
    </div>
    <div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="document.getElementById('custom-formation-editor').remove()">Annuleren</button>
      <button class="btn btn-secondary" onclick="cfeClearAll()">🗑 Alles wissen</button>
      <button class="btn btn-primary" onclick="cfeSave()">✓ Opslaan</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  cfeRender();
}

function cfeFieldClick(event) {
  if (editingCustomFormation.slots.length >= 11) { showToast('Maximum 11 posities bereikt', 'error'); return; }
  const rect = event.currentTarget.getBoundingClientRect();
  const xPct = Math.round(((event.clientX - rect.left) / rect.width) * 100);
  const yPct = Math.round(((event.clientY - rect.top) / rect.height) * 100);

  // Determine zone
  let zone = null;
  for (const [z, def] of Object.entries(ZONE_POSITIONS)) {
    if (yPct >= def.yMin && yPct <= def.yMax) { zone = {key:z,...def}; break; }
  }
  if (!zone) { showToast('Klik binnen het veld', 'error'); return; }

  // Show position picker for this zone
  showZonePicker(xPct, yPct, zone);
}

function showZonePicker(x, y, zone) {
  document.getElementById('cfe-zone-picker')?.remove();
  const picker = document.createElement('div');
  picker.id = 'cfe-zone-picker';
  picker.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:10000;display:flex;align-items:center;justify-content:center';
  picker.innerHTML = `<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);padding:16px;min-width:240px">
    <div style="font-size:13px;font-weight:700;margin-bottom:10px;color:var(--cambuur-geel)">${zone.label}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">
      ${zone.opts.map(o=>`<button class="btn btn-secondary" style="font-size:12px;height:30px;padding:2px 10px" onclick="cfeAddSlot(${x},${y},'${o}')">${o}</button>`).join('')}
    </div>
    <button class="btn btn-ghost" style="width:100%;margin-top:10px;font-size:12px" onclick="document.getElementById('cfe-zone-picker').remove()">Annuleren</button>
  </div>`;
  document.body.appendChild(picker);
  picker.addEventListener('click', e => { if(e.target===picker) picker.remove(); });
}

function cfeAddSlot(x, y, pos) {
  document.getElementById('cfe-zone-picker')?.remove();
  editingCustomFormation.slots.push({x, y, pos});
  cfeRender();
}

function cfeRemoveSlot(idx) {
  editingCustomFormation.slots.splice(idx, 1);
  cfeRender();
}

function cfeClearAll() {
  editingCustomFormation.slots = [];
  cfeRender();
}

function cfeRender() {
  // Update slot count
  const field = document.getElementById('cfe-field');
  if (!field) return;

  // Remove old slot divs
  document.querySelectorAll('.cfe-slot-div').forEach(d=>d.remove());

  // Render slots on field
  editingCustomFormation.slots.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'cfe-slot-div';
    div.style.cssText = `position:absolute;left:${s.x}%;top:${s.y}%;transform:translate(-50%,-50%);
      width:11%;padding-bottom:11%;border-radius:50%;background:var(--cambuur-geel);
      border:2px solid var(--cambuur-geel);cursor:pointer;box-sizing:border-box`;
    div.innerHTML = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
      <span style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:10px;color:#000">${s.pos}</span>
    </div>`;
    div.onclick = (e) => { e.stopPropagation(); cfeRemoveSlot(i); };
    div.title = 'Klik om te verwijderen';
    field.appendChild(div);
  });

  // Slot list
  const list = document.getElementById('cfe-slot-list');
  if (list) {
    list.innerHTML = editingCustomFormation.slots.length
      ? editingCustomFormation.slots.map((s,i)=>`
        <div style="display:flex;align-items:center;gap:8px;padding:5px 8px;background:var(--bg-tertiary);border-radius:4px;margin-bottom:3px">
          <span style="font-weight:700;font-size:13px;color:var(--cambuur-geel);min-width:36px">${s.pos}</span>
          <span style="font-size:11px;color:var(--text-muted)">x:${s.x}% y:${s.y}%</span>
          <button class="icon-btn danger" style="height:24px;padding:0 5px;font-size:10px;margin-left:auto" onclick="cfeRemoveSlot(${i})">✕</button>
        </div>`).join('')
      : '<p class="text-muted" style="font-size:12px">Klik op het veld om posities toe te voegen.</p>';
  }

  // Update count
  // Update slot count in footer
  const countDisplays = document.querySelectorAll('.cfe-slot-count');
  countDisplays.forEach(el => el.textContent = editingCustomFormation.slots.length + ' / 11');
}

async function cfeSave() {
  const fName = editingCustomFormation.name.trim();
  if (!fName) { showToast('Geef de formatie een naam', 'error'); return; }
  if (editingCustomFormation.slots.length < 2) { showToast('Voeg minimaal 2 posities toe', 'error'); return; }

  const p2 = getPrefs();
  const existingIdx = (p2.customFormations||[]).findIndex((c,i) => c.name === fName && i !== editingCustomIdx);
  if (existingIdx >= 0) {
    const overwrite = confirm(`Er bestaat al een eigen formatie met de naam "${fName}". Wil je deze overschrijven?`);
    if (!overwrite) return;
    // Remove the existing duplicate first
    p2.customFormations.splice(existingIdx, 1);
    delete FORMATIONS[fName];
    if (editingCustomIdx > existingIdx) editingCustomIdx--;
  }

  const p = getPrefs();
  if (!p.customFormations) p.customFormations = [];

  const formationDef = editingCustomFormation.slots.map(s=>({pos:s.pos, x:s.x, y:s.y}));

  if (editingCustomIdx >= 0) {
    // Editing existing: remove old name from FORMATIONS if renamed
    const oldName = p.customFormations[editingCustomIdx]?.name;
    if (oldName && oldName !== fName) {
      delete FORMATIONS[oldName];
    }
    p.customFormations[editingCustomIdx] = {name:fName, slots:editingCustomFormation.slots};
  } else {
    // New custom formation
    p.customFormations.push({name:fName, slots:editingCustomFormation.slots});
  }

  // Add/update in FORMATIONS object for immediate use
  FORMATIONS[fName] = formationDef;

  // Voeg toe aan actieve formaties als nog niet aanwezig
  const af = p.activeFormations ? [...p.activeFormations] : Object.keys(FORMATIONS).filter(k => !fName || k !== fName);
  if (!af.includes(fName)) af.push(fName);
  p.activeFormations = af;

  await savePref('customFormations', p.customFormations);
  await savePref('activeFormations', af);
  document.getElementById('custom-formation-editor').remove();
  showToast('Formatie "' + fName + '" opgeslagen en direct actief', 'success');
  renderFormationsSettings();
}

async function deleteCustomFormation(idx) {
  const p = getPrefs();
  const formation = p.customFormations[idx];
  if (!formation) return;

  // Check for linked loadouts
  const linkedLoadouts = (S.loadouts||[]).filter(l=>l.formation===formation.name);
  if (linkedLoadouts.length > 0) {
    const names = linkedLoadouts.map(l=>'"'+l.name+'"').join(', ');
    const choice = confirm(
      `De formatie "${formation.name}" is gekoppeld aan ${linkedLoadouts.length} loadout(s): ${names}.

` +
      `Klik OK om de formatie én de gekoppelde loadouts te verwijderen.
` +
      `Klik Annuleren om te stoppen.`
    );
    if (!choice) return;
    // Remove linked loadouts
    S.loadouts = (S.loadouts||[]).filter(l=>l.formation!==formation.name);
    await dbPut('settings', {key:'loadouts', value: JSON.stringify(S.loadouts)});
  } else {
    if (!confirm(`Formatie "${formation.name}" verwijderen?`)) return;
  }

  delete FORMATIONS[formation.name];
  p.customFormations.splice(idx, 1);
  await savePref('customFormations', p.customFormations);
  renderFormationsSettings();
  showToast('Formatie verwijderd', 'success');
}


// ══════════════════════════════
