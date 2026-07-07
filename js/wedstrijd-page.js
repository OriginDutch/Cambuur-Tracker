// WEDSTRIJD PAGINA
// ══════════════════════════════
let wpCurrentId = null;
let wpStarters = new Set();
let wpGoals = [], wpCards = [], wpSubs = [];
let wpOriginalRound = null; // om te detecteren of de ronde/datum wijzigde (rij moet dan structureel verplaatsen)

// Markeert een 'missing data'-veld als bewust leeg gelaten (of haalt de markering weg).
// Slaat meteen op, los van de 'Opslaan'-knop, zodat het niet verloren gaat bij wegnavigeren.
async function wpToggleDataIgnored(key, el) {
  const m = (S.matches||[]).find(x=>x.id===wpCurrentId);
  if (!m) return;
  if (!m.dataIgnored) m.dataIgnored = [];
  if (el.checked) {
    if (!m.dataIgnored.includes(key)) m.dataIgnored.push(key);
  } else {
    m.dataIgnored = m.dataIgnored.filter(k=>k!==key);
  }
  await dbPut('matches', m);
}

// Kleine checkbox-HTML voor 'bewust leeg' — te gebruiken naast een sectietitel
function wpDataIgnoredToggle(m, key) {
  const ignored = (m.dataIgnored||[]).includes(key);
  return `<label style="font-size:10px;color:var(--text-muted);display:flex;align-items:center;gap:4px;cursor:pointer;font-weight:400;white-space:nowrap">
    <input type="checkbox" ${ignored?'checked':''} onchange="wpToggleDataIgnored('${key}',this)" style="accent-color:var(--text-muted)">
    Bewust leeg
  </label>`;
}

function navigateToMatch(matchId) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-wedstrijd').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  wpCurrentId = matchId;
  renderWedstrijdPage(matchId);
}

function wpBack() {
  const m = (S.matches||[]).find(x=>x.id===wpCurrentId);
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-competition-detail').classList.add('active');
  if (m) {
    const nav = document.querySelector(`.nav-item[data-comp="${m.competitionId}"]`);
    if (nav) { nav.classList.add('active'); document.getElementById('topbar-title').textContent = S.competitions.find(c=>c.id===m.competitionId)?.name||''; }
    // Only re-render the specific match row, not the whole page
    _refreshMatchRow(m.id);
  }
}

// Refresh only the single match row in the competition view — of forceer een
// volledige herrender als de ronde is gewijzigd (de rij hoort dan ergens anders)
function _refreshMatchRow(matchId, forceFullRefresh) {
  const m = (S.matches||[]).find(x=>x.id===matchId);
  if (!m) return;
  if (forceFullRefresh) { renderCompDetail(m.competitionId); return; }
  // Find the existing match row and replace it
  const existing = document.querySelector(`.match-row[data-match-id="${matchId}"]`);
  if (existing) {
    const tmp = document.createElement('div');
    tmp.innerHTML = renderMatchRow(m);
    const newRow = tmp.firstElementChild;
    if (newRow) existing.replaceWith(newRow);
  } else {
    // Fallback: full re-render
    renderCompDetail(m.competitionId);
  }
}

function renderWedstrijdPage(matchId) {
  const m = (S.matches||[]).find(x=>x.id===matchId);
  const el = document.getElementById('wedstrijd-content');
  if (!m||!el) return;

  const cam = S.clubs.find(c=>c.isOwnClub);
  const isCamHome = m.homeClubId===cam?.id;
  const isCamAway = m.awayClubId===cam?.id;
  const isCamPlaying = isCamHome || isCamAway;
  const homeName = S.clubs.find(c=>c.id===m.homeClubId)?.name || m.homeName || 'Thuis';
  const awayName = S.clubs.find(c=>c.id===m.awayClubId)?.name || m.awayName || 'Uit';
  const comp = S.competitions.find(c=>c.id===m.competitionId);
  const dateStr = m.date ? new Date(m.date).toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : 'Datum onbekend';
  const hs = m.homeScore??'', as = m.awayScore??'';
  const camScore = isCamHome?m.homeScore:m.awayScore, oppScore = isCamHome?m.awayScore:m.homeScore;
  const result = m.played ? (camScore>oppScore?'GEWONNEN':camScore===oppScore?'GELIJK':'VERLOREN') : '';
  const resultColor = {GEWONNEN:'var(--win)',GELIJK:'var(--draw)',VERLOREN:'var(--loss)'}[result]||'';

  // Init state
  wpStarters = new Set(m.lineup||[]);
  wpOriginalRound = m.round;
  wpGoals = JSON.parse(JSON.stringify(m.events?.filter(e=>e.type==='goal')||[]));
  wpCards = JSON.parse(JSON.stringify(m.events?.filter(e=>e.type==='card')||[]));
  wpSubs  = JSON.parse(JSON.stringify(m.events?.filter(e=>e.type==='sub')||[]));

  el.innerHTML = `
  <!-- Sticky header -->
  <div class="wp-sticky">
    <button class="btn btn-ghost" onclick="wpBack()" style="font-size:13px">← Terug</button>
    <div style="flex:1">
      <div style="font-size:12px;color:var(--text-muted)">${comp?.name||''} · ${dateStr}${m.time?' · '+m.time:''}</div>
    </div>
    <button class="btn btn-primary" onclick="wpSave()">✓ Opslaan</button>
  </div>

  <!-- Wedstrijdgegevens: datum/tijd/ronde -->
  <div class="wp-section" style="margin-bottom:12px">
    <div style="display:flex;gap:10px;align-items:end;flex-wrap:wrap">
      <div class="form-group" style="margin:0">
        <label class="form-label" style="font-size:10px">Datum</label>
        <input class="form-input" id="wp-match-date" type="date" value="${m.date||''}" style="height:32px;font-size:12px">
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label" style="font-size:10px">Tijd</label>
        <input class="form-input" id="wp-match-time" type="time" value="${m.time||''}" style="height:32px;font-size:12px">
      </div>
      <div class="form-group" style="margin:0;flex:1;min-width:140px">
        <label class="form-label" style="font-size:10px">Ronde</label>
        ${(comp?.type==='beker'||comp?.type==='playoffs') && (comp?.rounds||[]).length
          ? `<select class="form-select" id="wp-match-round" style="height:32px;font-size:12px">${comp.rounds.map(r=>`<option value="${r}" ${m.round===r?'selected':''}>${r}</option>`).join('')}</select>`
          : `<input class="form-input" id="wp-match-round" type="number" min="1" value="${m.round||''}" style="height:32px;font-size:12px">`}
      </div>
      <div class="form-group" style="margin:0;width:120px">
        <label class="form-label" style="font-size:10px">Toeschouwers</label>
        <input class="form-input" id="wp-attendance" type="number" min="0" value="${m.attendance??''}" placeholder="—" style="height:32px;font-size:12px">
      </div>
    </div>
  </div>

  <!-- Score -->
  <div class="wp-section" style="text-align:center;margin-bottom:16px">
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:8px">
      <div style="flex:1;text-align:right;font-size:18px;font-weight:700;color:${isCamHome?'var(--accent-primary)':'var(--text-primary)'}">${homeName}</div>
      <div style="display:flex;align-items:center;gap:8px">
        <input id="wp-hs" type="number" min="0" placeholder="—" value="${hs}"
          class="form-input" style="width:60px;text-align:center;font-size:26px;font-weight:800;font-family:'Barlow Condensed',sans-serif;height:48px;padding:2px;-moz-appearance:textfield" onwheel="this.blur()">
        <span style="font-size:26px;font-weight:800;color:var(--text-muted)">-</span>
        <input id="wp-as" type="number" min="0" placeholder="—" value="${as}"
          class="form-input" style="width:60px;text-align:center;font-size:26px;font-weight:800;font-family:'Barlow Condensed',sans-serif;height:48px;padding:2px;-moz-appearance:textfield" onwheel="this.blur()">
      </div>
      <div style="flex:1;text-align:left;font-size:18px;font-weight:700;color:${!isCamHome?'var(--accent-primary)':'var(--text-primary)'}">${awayName}</div>
    </div>
    ${result?`<div style="font-size:12px;font-weight:700;color:${resultColor}">${result}</div>`:''}
    <button class="btn btn-ghost" style="font-size:11px;margin-top:6px" onclick="wpRecalcScore()">📊 Herbereken uit doelpunten</button>
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-light);font-size:12px;color:var(--text-muted)">
      <span>🔮 Voorspelling:</span>
      <input id="wp-pred-hs" type="number" min="0" placeholder="—" value="${m.prediction?.homeScore??''}"
        class="form-input" style="width:40px;height:26px;text-align:center;font-size:13px;padding:2px;-moz-appearance:textfield" onwheel="this.blur()">
      <span>-</span>
      <input id="wp-pred-as" type="number" min="0" placeholder="—" value="${m.prediction?.awayScore??''}"
        class="form-input" style="width:40px;height:26px;text-align:center;font-size:13px;padding:2px;-moz-appearance:textfield" onwheel="this.blur()">
      ${(() => {
        if (!m.played || m.homeScore==null || m.prediction?.homeScore==null || m.prediction?.awayScore==null) return '';
        const exact = m.prediction.homeScore===m.homeScore && m.prediction.awayScore===m.awayScore;
        const predDiff = m.prediction.homeScore - m.prediction.awayScore;
        const actualDiff = m.homeScore - m.awayScore;
        const sameOutcome = (predDiff>0&&actualDiff>0)||(predDiff<0&&actualDiff<0)||(predDiff===0&&actualDiff===0);
        if (exact) return '<span style="color:var(--win);font-weight:700">✅ Exact goed!</span>';
        if (sameOutcome) return '<span style="color:var(--draw);font-weight:700">🟡 Juiste uitslag</span>';
        return '<span style="color:var(--loss);font-weight:700">❌ Mis</span>';
      })()}
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-light);flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted)">
        <span>1e helft: 45 +</span>
        <input id="wp-et1" type="number" min="0" max="20" value="${m.extraTime1||''}" placeholder="0"
          class="form-input" style="width:44px;height:28px;text-align:center;font-size:12px;padding:2px 4px;-moz-appearance:textfield" onwheel="this.blur()">
        <span>min</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted)">
        <span>2e helft: 90 +</span>
        <input id="wp-et2" type="number" min="0" max="20" value="${m.extraTime2||''}" placeholder="0"
          class="form-input" style="width:44px;height:28px;text-align:center;font-size:12px;padding:2px 4px;-moz-appearance:textfield" onwheel="this.blur()">
        <span>min</span>
      </div>
      ${(comp?.type==='beker'||comp?.type==='playoffs') ? `
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);cursor:pointer">
        <input type="checkbox" id="wp-went-et" ${m.wentToExtraTime?'checked':''} onchange="wpToggleExtraTimeFields()" style="accent-color:var(--accent-primary)">
        Verlenging
      </label>
      <div id="wp-penalties-wrap" style="display:${m.wentToExtraTime?'flex':'none'};align-items:center;gap:6px;font-size:12px;color:var(--text-muted)">
        <span>Strafschoppen:</span>
        <input id="wp-pen-h" type="number" min="0" value="${m.penalties?.home??''}" placeholder="—"
          class="form-input" style="width:36px;height:28px;text-align:center;font-size:12px;padding:2px 4px;-moz-appearance:textfield" onwheel="this.blur()">
        <span>-</span>
        <input id="wp-pen-a" type="number" min="0" value="${m.penalties?.away??''}" placeholder="—"
          class="form-input" style="width:36px;height:28px;text-align:center;font-size:12px;padding:2px 4px;-moz-appearance:textfield" onwheel="this.blur()">
      </div>` : ''}
      ${m.played && isCamPlaying ? wpDataIgnoredToggle(m, 'extraTime') : ''}
    </div>
  </div>

  <!-- Layout: basiself alleen als Cambuur speelt -->
  <div style="display:grid;grid-template-columns:${isCamPlaying?'1fr 1fr':'1fr'};gap:12px;align-items:start">

    ${isCamPlaying ? `<!-- LINKS: Basiself -->
    <div class="wp-section">
      <div class="wp-section-title">
        <span>👕 Basiself <span id="wp-cnt" style="color:var(--text-muted);font-weight:400">(${wpStarters.size}/11)</span></span>
        <div style="display:flex;gap:8px;align-items:center">
          ${m.played ? wpDataIgnoredToggle(m, 'lineup') : ''}
          <div style="display:flex;gap:4px">
            <button class="btn btn-ghost" style="font-size:10px;height:24px" onclick="wpLoadXI()" title="Standaard XI laden">📂</button>
            <button class="btn btn-ghost" style="font-size:10px;height:24px" onclick="wpSaveXI()" title="Opslaan als standaard">💾</button>
            <button class="btn btn-ghost" style="font-size:10px;height:24px;color:var(--loss)" onclick="wpClearXI()" title="Alles wissen">✕</button>
          </div>
        </div>
      </div>
      <div id="wp-lineup"></div>
    </div>` : ''}

    <!-- Gebeurtenissen -->
    <div style="display:flex;flex-direction:column;gap:10px">

      <!-- Doelpunten -->
      <div class="wp-section">
        <div class="wp-section-title">
          ⚽ Doelpunten
          <button class="btn btn-ghost" style="font-size:10px;height:22px" onclick="wpGoals.push({minute:null,playerId:'',assistId:'',goalType:'normaal'});wpRenderGoals()">+ Toevoegen</button>
        </div>
        <div id="wp-goals"></div>
      </div>

      <!-- Wissels -->
      <div class="wp-section">
        <div class="wp-section-title">
          ↕ Wissels
          <button class="btn btn-ghost" style="font-size:10px;height:22px" onclick="wpSubs.push({minute:null,playerOutId:'',playerInId:''});wpRenderSubs()">+ Toevoegen</button>
        </div>
        <div id="wp-subs"></div>
      </div>

      <!-- Kaarten -->
      <div class="wp-section">
        <div class="wp-section-title">
          🟨 Kaarten
          <button class="btn btn-ghost" style="font-size:10px;height:22px" onclick="wpCards.push({minute:null,playerId:'',cardType:'geel'});wpRenderCards()">+ Toevoegen</button>
        </div>
        <div id="wp-cards"></div>
      </div>

      <!-- Coach + MOTM (alleen als Cambuur speelt) + Notities -->
      <div class="wp-section">
        ${isCamPlaying ? `
        <div class="form-group" style="margin-bottom:10px">
          <label class="form-label" style="display:flex;align-items:center;justify-content:space-between">
            <span>🧑‍💼 Coach</span>
            ${m.played ? wpDataIgnoredToggle(m, 'coach') : ''}
          </label>
          <div style="display:flex;gap:6px;align-items:center">
            <select class="form-select" id="wp-coach" style="flex:1" onchange="wpCoachChanged()"></select>
            <div id="wp-coach-warning" style="display:none;font-size:11px;color:var(--loss);white-space:nowrap">⚠️ Geschorst</div>
          </div>
          <div id="wp-coach-cards-section" style="margin-top:8px"></div>
        </div>
        <div class="form-group" style="margin-bottom:10px">
          <label class="form-label" style="display:flex;align-items:center;justify-content:space-between">
            <span>🏆 Man of the Match</span>
            ${m.played ? wpDataIgnoredToggle(m, 'motm') : ''}
          </label>
          <select class="form-select" id="wp-motm" style="width:100%"></select>
        </div>` : ''}
        <div class="form-group" style="margin:0">
          <label class="form-label">📝 Notities</label>
          <textarea class="form-input" id="wp-notes" rows="3"
            style="resize:vertical;min-height:60px;font-size:13px;width:100%"
            placeholder="Vrije aantekeningen...">${m.notes||''}</textarea>
        </div>
      </div>
    </div>
  </div>

  <!-- Wedstrijdstatistieken — volle breedte, alleen als Cambuur speelt -->
  ${isCamPlaying ? `<div class="wp-section" style="margin-top:12px">
    <div class="wp-section-title">
      <span>📊 Wedstrijdstatistieken</span>
      ${m.played ? wpDataIgnoredToggle(m, 'matchStats') : ''}
    </div>
    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center">
      <!-- Header -->
      <div style="font-size:11px;font-weight:700;color:var(--accent-primary);text-align:center">${isCamHome?homeName:awayName}</div>
      <div></div>
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-align:center">${isCamHome?awayName:homeName}</div>
      ${[
        {key:'possession', label:'Balbezit %', type:'number', min:0, max:100},
        {key:'shots', label:'Schoten', type:'number', min:0},
        {key:'shotsOnTarget', label:'Schoten op doel', type:'number', min:0},
        {key:'corners', label:'Corners', type:'number', min:0},
        {key:'fouls', label:'Overtredingen gemaakt', type:'number', min:0},
      ].map(s=>`
        <input class="form-input" type="${s.type}" min="${s.min||0}" ${s.max?'max="'+s.max+'"':''} id="wp-ms-home-${s.key}"
          value="${m.matchStats?.home?.[s.key]??''}" placeholder="—"
          style="text-align:center;height:30px;padding:2px 6px;font-size:13px">
        <div style="font-size:11px;color:var(--text-muted);text-align:center;white-space:nowrap;padding:0 8px">${s.label}</div>
        <input class="form-input" type="${s.type}" min="${s.min||0}" ${s.max?'max="'+s.max+'"':''} id="wp-ms-away-${s.key}"
          value="${m.matchStats?.away?.[s.key]??''}" placeholder="—"
          style="text-align:center;height:30px;padding:2px 6px;font-size:13px">
      `).join('')}
    </div>
  </div>` : ''}

  <!-- Tijdlijn — volle breedte -->
  <div class="wp-section" style="margin-top:12px">
    <div class="wp-section-title">🕐 Tijdlijn</div>
    <div id="wp-timeline"></div>
  </div>

  <!-- Verwijderen — onderaan, subtiel -->
  <div style="text-align:right;margin:16px 0 8px;opacity:0.5">
    <button class="btn btn-ghost" style="font-size:11px;color:var(--loss)"
      onclick="if(confirm('Wedstrijd verwijderen?')){deleteMatch('${m.id}');wpBack()}">🗑️ Wedstrijd verwijderen</button>
  </div>`;

  // Populate MOTM
  const allPlayers = S.players||[];
  const motmEl = document.getElementById('wp-motm');
  if (motmEl) {
    // Only players who actually played (starters + subs in)
    const subInIds = new Set(wpSubs.filter(s=>s.playerInId).map(s=>s.playerInId));
    const played = wpStarters.size > 0
      ? allPlayers.filter(p => wpStarters.has(p.id) || subInIds.has(p.id))
      : allPlayers; // fallback: show all if no lineup entered
    const sorted = wpSortedPlayers(played);
    motmEl.innerHTML = '<option value="">— Geen —</option>' +
      sorted.map(p=>`<option value="${p.id}" ${p.id===m.motm?'selected':''}>${p.number?'#'+p.number+' ':''}${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</option>`).join('');
  }

  wpRenderLineup();
  wpRenderGoals();
  wpRenderSubs();
  wpRenderCards();
  wpRenderTimeline();
  wpInitCoach(m);
}

function wpInitCoach(m) {
  const coachSel = document.getElementById('wp-coach');
  if (!coachSel) return;
  const coaches = S.coaches||[];
  // Get active coaches for this match date
  const mDate = m.date ? new Date(m.date) : new Date();
  const apptOnDate = c => (c.appointments||[]).find(a => {
    const from = new Date(a.from||'1900-01-01');
    const to = a.to ? new Date(a.to) : new Date('2099-01-01');
    return mDate >= from && mDate <= to;
  });
  const activeCoaches = coaches.filter(c => apptOnDate(c))
  .sort((a,b) => {
    // Sorteer op de order-waarde van de aanstelling die gold op déze wedstrijddatum
    // (niet de laagste order over de hele carrière — een oude hoofdtrainer-order
    // mag een huidige assistent-order niet blijven overstemmen)
    const aOrder = apptOnDate(a)?.order ?? 99;
    const bOrder = apptOnDate(b)?.order ?? 99;
    return aOrder - bOrder;
  });

  if (!activeCoaches.length) {
    coachSel.innerHTML = '<option value="">— Geen staf geconfigureerd —</option>';
    return;
  }

  coachSel.innerHTML = '<option value="">— Selecteer coach —</option>' +
    activeCoaches.map(c => {
      const appt = (c.appointments||[]).find(a => {
        const from = new Date(a.from||'1900-01-01');
        const to = a.to ? new Date(a.to) : new Date('2099-01-01');
        return mDate >= from && mDate <= to;
      });
      return `<option value="${c.id}" ${(m.coachId||'')==c.id?'selected':''}>${c.firstname?c.firstname+' ':''}${c.lastname} (${appt?.role||''})</option>`;
    }).join('');

  // Auto-select head coach if not set
  if (!m.coachId && activeCoaches.length) {
    const head = activeCoaches[0];
    coachSel.value = head.id;
    wpCheckCoachSuspension(head.id, m);
  } else if (m.coachId) {
    wpCheckCoachSuspension(m.coachId, m);
  }
  wpRenderCoachCards(m);
}

function wpCoachChanged() {
  const id = document.getElementById('wp-coach')?.value;
  const m = (S.matches||[]).find(x=>x.id===wpCurrentId);
  if (id && m) wpCheckCoachSuspension(id, m);
  wpRenderCoachCards(m);
}

function wpCheckCoachSuspension(coachId, m) {
  const warn = document.getElementById('wp-coach-warning');
  if (!warn) return;
  const coach = (S.coaches||[]).find(c=>c.id===coachId);
  if (!coach) { warn.style.display='none'; return; }
  // Check red card in previous match
  const prevMatches = (S.matches||[])
    .filter(x=>x.played&&x.seasonId===m.seasonId&&x.date&&x.date<m.date)
    .sort((a,b)=>new Date(b.date)-new Date(a.date));
  const prevMatch = prevMatches[0];
  const hasRed = prevMatch?.events?.some(e=>e.type==='coachCard'&&e.coachId===coachId&&(e.cardType==='rood'||e.cardType==='geel-rood'));
  // Check yellow card threshold
  const prefs = getPrefs();
  const threshold = prefs.coachYellowThreshold || 3;
  let yellows = 0;
  prevMatches.forEach(pm => {
    (pm.events||[]).forEach(e => {
      if (e.type==='coachCard'&&e.coachId===coachId&&e.cardType==='geel') yellows++;
    });
  });
  const thresholdHit = yellows > 0 && yellows % threshold === 0;
  if (hasRed || thresholdHit) {
    warn.style.display='flex';
    warn.textContent = hasRed
      ? '⚠️ Rode kaart vorige wedstrijd — mogelijk geschorst'
      : `⚠️ ${yellows} gele kaarten — drempel (${threshold}) bereikt`;
  } else {
    warn.style.display='none';
  }
}

function wpRenderCoachCards(m) {
  const el = document.getElementById('wp-coach-cards-section');
  if (!el) return;
  const coachId = document.getElementById('wp-coach')?.value;
  if (!coachId) { el.innerHTML=''; return; }
  const coachCards = (m?.events||[]).filter(e=>e.type==='coachCard'&&e.coachId===coachId);
  const coachCardIdx = (m?.events||[]).map((e,i)=>({e,i})).filter(({e})=>e.type==='coachCard'&&e.coachId===coachId);
  el.innerHTML = `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Kaarten deze wedstrijd:</div>
    ${coachCards.length?coachCards.map((card,ci)=>`
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
        <span>${card.cardType==='rood'?'🟥':card.cardType==='geel-rood'?'🟨🟥':'🟨'}</span>
        <span style="font-size:11px">${card.minute||'?'}'</span>
        <button class="icon-btn danger" style="height:22px;padding:0 6px;font-size:10px" onclick="wpRemoveCoachCard(${ci})">✕</button>
      </div>`).join(''):'<span style="font-size:11px;color:var(--text-muted)">Geen kaarten</span>'}
    <div style="display:flex;gap:4px;margin-top:6px">
      <input id="wp-coach-card-min" class="form-input" type="text" placeholder="Min" style="width:52px;height:26px;font-size:11px;padding:2px 5px">
      <button class="btn btn-ghost" style="font-size:10px;height:26px;padding:1px 8px" onclick="wpAddCoachCard('geel')">🟨 Geel</button>
      <button class="btn btn-ghost" style="font-size:10px;height:26px;padding:1px 8px" onclick="wpAddCoachCard('rood')">🟥 Rood</button>
    </div>`;
}

function wpAddCoachCard(cardType) {
  const coachId = document.getElementById('wp-coach')?.value;
  const min = document.getElementById('wp-coach-card-min')?.value?.trim()||null;
  if (!coachId) { showToast('Selecteer eerst een coach','error'); return; }
  const m = (S.matches||[]).find(x=>x.id===wpCurrentId);
  if (!m) return;
  if (!m.events) m.events = [];
  m.events.push({type:'coachCard', coachId, cardType, minute:min});
  wpRenderCoachCards(m);
  wpCheckCoachSuspension(coachId, m);
  if (document.getElementById('wp-coach-card-min')) document.getElementById('wp-coach-card-min').value='';
}

function wpRemoveCoachCard(cardIdx) {
  const m = (S.matches||[]).find(x=>x.id===wpCurrentId);
  if (!m) return;
  const coachId = document.getElementById('wp-coach')?.value;
  const coachCardEvents = m.events?.map((e,i)=>({e,i})).filter(({e})=>e.type==='coachCard'&&e.coachId===coachId)||[];
  if (coachCardEvents[cardIdx]) m.events.splice(coachCardEvents[cardIdx].i, 1);
  wpRenderCoachCards(m);
  wpCheckCoachSuspension(coachId, m);
}

// ── Helpers ──
function wpSortedPlayers(players, onlyStarters, onlyBench) {
  const go = {Aanvaller:0,Middenvelder:1,Verdediger:2,Keeper:3};
  let list = players||[];
  if (onlyStarters) list = list.filter(p=>wpStarters.has(p.id));
  if (onlyBench) list = list.filter(p=>!wpStarters.has(p.id));
  return list.sort((a,b)=>{
    const ay = a.squadLevel==='jeugd'?1:0, by = b.squadLevel==='jeugd'?1:0;
    if (ay !== by) return ay - by; // jeugd altijd onderaan
    return (go[a.position]??4)-(go[b.position]??4)||(a.number||99)-(b.number||99);
  });
}

function wpPlayerOpts(excludeId, selectedId, onlyStarters, onlyBench, groupFirst) {
  const m = (S.matches||[]).find(x=>x.id===wpCurrentId);
  const matchDate = m?.date || null;

  // Filter op wedstrijddatum — zelfde logica als isPlayerAvailableOn() in helpers.js
  const all = (S.players||[]).filter(p => isPlayerAvailableOn(p, matchDate));

  let pool = wpSortedPlayers(all, onlyStarters, onlyBench).filter(p=>p.id!==excludeId);

  if (groupFirst) {
    const inGroup = pool.filter(p=>p.position===groupFirst);
    const outGroup = pool.filter(p=>p.position!==groupFirst);
    pool = [...inGroup, ...outGroup];
  }

  return '<option value="">— Speler —</option>' + pool.map(p=>
    `<option value="${p.id}" ${p.id===selectedId?'selected':''}>${p.number?'#'+p.number+' ':''}${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</option>`
  ).join('');
}

// ── Basiself ──
function wpRenderLineup() {
  const el = document.getElementById('wp-lineup');
  if (!el) return;
  const m = (S.matches||[]).find(x=>x.id===wpCurrentId);
  const matchDate = m?.date || null;

  // Filter players active on match date — zelfde logica als isPlayerAvailableOn() in helpers.js
  const activePlayers = (S.players||[]).filter(p => isPlayerAvailableOn(p, matchDate));

  // Remove any starters who are no longer in the active player list
  const activeIds = new Set(activePlayers.map(p => p.id));
  for (const id of [...wpStarters]) {
    if (!activeIds.has(id)) wpStarters.delete(id);
  }

  const posGroupWp = p => {
    const pos = p.position || '';
    if (['Aanvaller','Linksbuiten','Rechtsbuiten','Spits','Tweede Spits','Schaduwspits'].includes(pos)) return 'Aanvaller';
    if (['Middenvelder','Defensieve Middenvelder','Centrale Middenvelder','Aanvallende Middenvelder','Controleur'].includes(pos)) return 'Middenvelder';
    if (['Verdediger','Centrale Verdediger','Linksback','Rechtsback','Linker Wingback','Rechter Wingback','Libero','Stopper'].includes(pos)) return 'Verdediger';
    if (['Keeper','Uitkomende Keeper'].includes(pos)) return 'Keeper';
    return pos;
  };

  const groups = [{l:'Aanvallers',k:'Aanvaller'},{l:'Middenvelders',k:'Middenvelder'},{l:'Verdedigers',k:'Verdediger'},{l:'Keepers',k:'Keeper'}];
  let html = '';
  groups.forEach(g => {
    const gp = activePlayers.filter(p=>posGroupWp(p)===g.k).sort((a,b)=>(a.number||99)-(b.number||99));
    if (!gp.length) return;
    html += `<div class="starter-pos-group">${g.l}</div>`;
    gp.forEach(p => {
      const isS = wpStarters.has(p.id);
      const maxed = wpStarters.size>=11 && !isS;
      const isKeeper = p.position === 'Keeper';
      const savesVal = m?.keeperSaves?.[p.id] ?? '';
      html += `<div class="starter-row" style="${isS?'background:rgba(245,197,0,0.05)':''}">
        <input type="checkbox" ${isS?'checked':''} ${maxed?'disabled':''} style="accent-color:var(--accent-primary);width:15px;height:15px"
          onchange="wpToggleStarter('${p.id}',this.checked)">
        <span style="font-weight:700;color:var(--accent-primary);min-width:26px;font-size:12px">${p.number?'#'+p.number:''}</span>
        <span style="flex:1;font-size:13px;font-weight:${isS?'600':'400'};color:${isS?'var(--text-primary)':'var(--text-secondary)'}">${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</span>
        <span style="font-size:11px;color:var(--text-muted)">${p.subpos?.[0]||p.position||''}</span>
        ${isKeeper&&isS?`<input type="number" min="0" id="wp-saves-${p.id}" value="${savesVal}"
          placeholder="Red." title="Reddingen"
          style="width:52px;height:24px;font-size:11px;padding:2px 4px;text-align:center;margin-left:6px;border-radius:4px;border:1px solid var(--border);background:var(--bg-input);color:var(--text-primary)">`:''}
      </div>`;
    });
  });
  el.innerHTML = html;
  const cnt = document.getElementById('wp-cnt');
  if (cnt) cnt.textContent = `(${wpStarters.size}/11)`;
}

function wpToggleStarter(id, checked) {
  if (checked && wpStarters.size>=11) return;
  if (checked) wpStarters.add(id); else wpStarters.delete(id);
  wpRenderLineup();
  wpRenderGoals(); wpRenderSubs(); wpRenderCards();
}

async function wpSaveXI() {
  if (!wpStarters.size) { showToast('Selecteer eerst spelers','error'); return; }
  await dbPut('settings',{key:'defaultXI',value:JSON.stringify([...wpStarters])});
  showToast('Standaard XI opgeslagen','success');
}

function wpClearXI() {
  wpStarters.clear();
  wpRenderLineup();
  wpRenderGoals(); wpRenderSubs(); wpRenderCards();
}
async function wpLoadXI() {
  try {
    const row = await dbGet('settings','defaultXI');
    if (!row?.value) { showToast('Nog geen standaard XI opgeslagen','error'); return; }
    wpStarters = new Set(JSON.parse(row.value));
    wpRenderLineup(); wpRenderGoals(); wpRenderSubs(); wpRenderCards();
    showToast('Standaard XI geladen','success');
  } catch(e) { showToast('Fout bij laden','error'); }
}

// ── Doelpunten ──
function wpRenderGoals() {
  const el = document.getElementById('wp-goals');
  if (!el) return;
  const hasStarters = wpStarters.size > 0;
  if (!wpGoals.length) { el.innerHTML='<p style="font-size:12px;color:var(--text-muted)">Nog geen doelpunten.</p>'; wpRenderTimeline(); return; }
  const m = (S.matches||[]).find(x=>x.id===wpCurrentId);
  const allP = (S.players||[]).filter(p => isPlayerAvailableOn(p, m?.date || null));
  const cam = S.clubs.find(c=>c.isOwnClub);
  const isCamMatch = m && (m.homeClubId===cam?.id || m.awayClubId===cam?.id);
  el.innerHTML = wpGoals.map((g,i)=>{
    // Minute-aware: who is on field at this minute?
    const state = parseMinute(g.minute) !== null ? wpMatchStateAt(g.minute) : null;

    // Build pool: if minute known + starters set → field players at that minute
    // This correctly includes subs-in who came on before this minute
    let pool;
    if (state && hasStarters) {
      pool = wpSortedPlayers(allP.filter(p => state.onField.has(p.id) || p.id===g.playerId || p.id===g.assistId));
    } else if (hasStarters) {
      // No minute yet: show appeared players (starters + all subs-in so far)
      const appeared = wpGetAllAppeared();
      pool = wpSortedPlayers(allP.filter(p => appeared.has(p.id) || p.id===g.playerId || p.id===g.assistId));
    } else {
      pool = wpSortedPlayers(allP);
    }

    // Build optgroup options
    const grpDefs = [{l:'Aanvallers',k:'Aanvaller'},{l:'Middenvelders',k:'Middenvelder'},{l:'Verdedigers',k:'Verdediger'},{l:'Keepers',k:'Keeper'}];
    const buildGroupedOpts = (selectedId, emptyLabel, includeOpp) => {
      let html = `<option value="">${emptyLabel}</option>`;
      grpDefs.forEach(g2 => {
        const gp = pool.filter(p=>p.position===g2.k);
        if (!gp.length) return;
        html += `<optgroup label="${g2.l}">${gp.map(p=>
          `<option value="${p.id}" ${p.id===selectedId?'selected':''}>${p.number?'#'+p.number+' ':''}${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</option>`
        ).join('')}</optgroup>`;
      });
      if (includeOpp) html += `<option value="__opp__" ${selectedId==='__opp__'?'selected':''}>⚽ Tegendoelpunt</option><option value="__opp_own__" ${selectedId==='__opp_own__'?'selected':''}>↩ Eigen doel tegenstander</option>`;
      return html;
    };

    const scorerPool = buildGroupedOpts(g.playerId, '— Scorer —', true);
    const assistPool = buildGroupedOpts(g.assistId, '— Assist (optioneel) —', false);
    const isOpp = g.playerId==='__opp__'||g.playerId==='__opp_own__';
    const scorerField = isCamMatch
      ? `<select class="form-select wp-sel" style="flex:1.2" onchange="wpGoals[${i}].playerId=this.value;if(this.value==='__opp__')wpGoals[${i}].goalType='normaal';if(this.value==='__opp_own__'){wpGoals[${i}].goalType='eigen doelpunt';}wpRenderGoals()">${scorerPool}</select>`
      : `<input class="form-input wp-sel" style="flex:1.2" value="${g.scorerName||''}" placeholder="Naam scorer"
          oninput="wpGoals[${i}].scorerName=this.value">`;
    const assistField = isOpp
      ? `<div class="form-input wp-sel" style="flex:1;opacity:0.3;display:flex;align-items:center;font-size:12px;color:var(--text-muted)">—</div>`
      : isCamMatch
        ? `<select class="form-select wp-sel" style="flex:1" oninput="wpGoals[${i}].assistId=this.value">${assistPool}</select>`
        : `<input class="form-input wp-sel" style="flex:1" value="${g.assistName||''}" placeholder="Assist (optioneel)"
            oninput="wpGoals[${i}].assistName=this.value">`;
    return `<div class="wp-event-row">
      <input class="form-input wp-min-input" type="text" inputmode="numeric" value="${displayMinute(g.minute)}" placeholder="67"
        onchange="wpGoals[${i}].minute=this.value;wpRenderGoals()" style="font-variant-numeric:tabular-nums">
      ${scorerField}
      ${assistField}
      <select class="form-select wp-sel" style="flex:0.8" oninput="wpGoals[${i}].goalType=this.value">
        <option value="normaal" ${!g.goalType||g.goalType==='normaal'?'selected':''}>Normaal</option>
        <option value="penalty" ${g.goalType==='penalty'?'selected':''}>Penalty</option>
        <option value="vrije trap" ${g.goalType==='vrije trap'?'selected':''}>Vrije trap</option>
        <option value="eigen doelpunt" ${g.goalType==='eigen doelpunt'?'selected':''}>Eigen doel</option>
      </select>
      <button class="icon-btn danger" style="height:30px;flex-shrink:0" onclick="wpGoals.splice(${i},1);wpRenderGoals()">✕</button>
    </div>`;
  }).join('');
  wpRenderTimeline();
}

function wpToggleExtraTimeFields() {
  const checked = document.getElementById('wp-went-et')?.checked;
  const wrap = document.getElementById('wp-penalties-wrap');
  if (wrap) wrap.style.display = checked ? 'flex' : 'none';
}

function wpRecalcScore() {
  const camClub = S.clubs.find(c=>c.isOwnClub);
  const m = (S.matches||[]).find(x=>x.id===wpCurrentId);
  if (!m||!camClub) return;
  const isCamHome = m.homeClubId===camClub.id;
  let camG=0, oppG=0;
  wpGoals.forEach(g => {
    if (g.playerId==='__opp__') { isCamHome?oppG++:oppG++; return; }
    // Cambuur goal
    if (g.goalType==='eigen doelpunt') { isCamHome?oppG++:camG++; return; }
    isCamHome?camG++:camG++;
  });
  // actually: own goals go to opponent
  camG=0; oppG=0;
  wpGoals.forEach(g => {
    const isOppGoal = g.playerId==='__opp__';          // tegenstander scoort normaal
    const isOppOwn  = g.playerId==='__opp_own__';      // tegenstander scoort eigen doelpunt → punt voor Cambuur
    const isCamOwn  = g.goalType==='eigen doelpunt' && !isOppGoal && !isOppOwn; // Cambuur eigen doelpunt
    if (isOppGoal || isCamOwn) oppG++;
    else camG++; // normaal Cambuur doelpunt of eigen doel van tegenstander
  });
  const hsEl = document.getElementById('wp-hs');
  const asEl = document.getElementById('wp-as');
  if (isCamHome) { if(hsEl) hsEl.value=camG; if(asEl) asEl.value=oppG; }
  else { if(hsEl) hsEl.value=oppG; if(asEl) asEl.value=camG; }
  showToast(`Score bijgewerkt: ${isCamHome?camG+'-'+oppG:oppG+'-'+camG}`,'success');
}

// ── Wissels ──
function wpGetFieldPlayers() {
  // Players currently on the field: starters minus subbed out, plus subbed in
  // Build chain: process subs in order of minute
  const sortedSubs = [...wpSubs].filter(s=>s.playerOutId&&s.playerInId).sort((a,b)=>(a.minute||0)-(b.minute||0));
  const onField = new Set(wpStarters);
  sortedSubs.forEach(s => {
    onField.delete(s.playerOutId);
    onField.add(s.playerInId);
  });
  return onField;
}

function wpGetAllAppeared() {
  // All players who have appeared at any point: starters + all subs-in
  const appeared = new Set(wpStarters);
  wpSubs.forEach(s => { if(s.playerInId) appeared.add(s.playerInId); });
  return appeared;
}

function wpRenderSubs() {
  const el = document.getElementById('wp-subs');
  if (!el) return;
  const hasStarters = wpStarters.size > 0;
  if (!wpSubs.length) { el.innerHTML='<p style="font-size:12px;color:var(--text-muted)">Nog geen wissels.</p>'; wpRenderTimeline(); return; }
  const m = (S.matches||[]).find(x=>x.id===wpCurrentId);
  const allP = (S.players||[]).filter(p => isPlayerAvailableOn(p, m?.date || null));
  const go = {Aanvaller:0,Middenvelder:1,Verdediger:2,Keeper:3};

  // Track which players are already used as subs-in across ALL subs
  const allSubsIn = new Set(wpSubs.map(s=>s.playerInId).filter(Boolean));

  el.innerHTML = wpSubs.map((s,i)=>{
    const otherSubsIn = new Set(wpSubs.filter((_,j)=>j!==i).map(x=>x.playerInId).filter(Boolean));
    const otherSubsOut = new Set(wpSubs.filter((_,j)=>j!==i).map(x=>x.playerOutId).filter(Boolean));
    const inPos = allP.find(p=>p.id===s.playerInId)?.position;
    const outPos = allP.find(p=>p.id===s.playerOutId)?.position;

    // Use minute-aware state for "eraf" candidates
    const subState = parseMinute(s.minute) !== null ? wpMatchStateAt(s.minute) : null;
    const onFieldAtMin = subState ? subState.onField : (() => {
      const f = new Set(wpStarters);
      wpSubs.filter((_,j)=>j!==i).forEach(x=>{ if(x.playerInId) f.add(x.playerInId); if(x.playerOutId) f.delete(x.playerOutId); });
      return f;
    })();
    const redAtMin = subState ? subState.redCards : new Set();
    if (s.playerOutId) onFieldAtMin.add(s.playerOutId);

    let outCandidates = allP.filter(p =>
      p.id!==s.playerInId &&
      !redAtMin.has(p.id) && // can't sub out player with red card (already off)
      (hasStarters ? onFieldAtMin.has(p.id) : true)
    );
    // Sort: group of inPos first, then ATT→MID→DEF→GK, then number
    outCandidates.sort((a,b)=>{
      if (inPos) { const am=a.position===inPos?0:1,bm=b.position===inPos?0:1; if(am!==bm) return am-bm; }
      return (go[a.position]??4)-(go[b.position]??4)||(a.number||99)-(b.number||99);
    });

    // "Erin": not yet on field, not subbed in elsewhere, not same as "eraf"
    let inCandidates = allP.filter(p => {
      if (p.id === s.playerOutId) return false;
      if (p.id === s.playerInId) return true; // always include current
      if (otherSubsIn.has(p.id)) return false; // already used as sub-in elsewhere
      if (hasStarters && wpStarters.has(p.id) && !otherSubsOut.has(p.id)) return false; // already starter (unless subbed out)
      return true;
    });
    inCandidates.sort((a,b)=>{
      if (outPos) { const am=a.position===outPos?0:1,bm=b.position===outPos?0:1; if(am!==bm) return am-bm; }
      return (go[a.position]??4)-(go[b.position]??4)||(a.number||99)-(b.number||99);
    });

    // Build grouped options with optgroup
    const buildGroupedOpts = (candidates, selectedId, emptyLabel) => {
      const groups = [{l:'Aanvallers',k:'Aanvaller'},{l:'Middenvelders',k:'Middenvelder'},{l:'Verdedigers',k:'Verdediger'},{l:'Keepers',k:'Keeper'}];
      let html = `<option value="">${emptyLabel}</option>`;
      groups.forEach(g => {
        const gp = candidates.filter(p=>p.position===g.k);
        if (!gp.length) return;
        html += `<optgroup label="${g.l}">${gp.map(p=>
          `<option value="${p.id}" ${p.id===selectedId?'selected':''}>${p.number?'#'+p.number+' ':''}${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</option>`
        ).join('')}</optgroup>`;
      });
      return html;
    };

    return `<div class="wp-event-row" style="align-items:center;gap:5px">
      <input class="form-input wp-min-input" type="text" inputmode="numeric" value="${displayMinute(s.minute)}" placeholder="67"
        onchange="wpSubs[${i}].minute=this.value;wpRenderSubs()" style="font-variant-numeric:tabular-nums">
      <select class="form-select wp-sel" style="flex:1" onchange="wpSubs[${i}].playerOutId=this.value;wpRenderSubs()">
        ${buildGroupedOpts(outCandidates, s.playerOutId, '— Eraf —')}
      </select>
      <span style="color:var(--text-muted);flex-shrink:0;font-size:14px">→</span>
      <select class="form-select wp-sel" style="flex:1" onchange="wpSubs[${i}].playerInId=this.value;wpRenderSubs()">
        ${buildGroupedOpts(inCandidates, s.playerInId, '— Erin —')}
      </select>
      <button class="icon-btn danger" style="height:30px;flex-shrink:0" onclick="wpSubs.splice(${i},1);wpRenderSubs()">✕</button>
    </div>`;
  }).join('');
  wpRenderTimeline();
  // Update MOTM options and cards after sub change
  wpRenderCards();
  if (m) {
    const subInIds = new Set(wpSubs.filter(s=>s.playerInId).map(s=>s.playerInId));
    const played = wpStarters.size>0 ? (S.players||[]).filter(p=>wpStarters.has(p.id)||subInIds.has(p.id)) : S.players||[];
    const motmEl = document.getElementById('wp-motm');
    if (motmEl) {
      const sorted = wpSortedPlayers(played);
      const cur = motmEl.value;
      const motmGroups2 = [{l:'Aanvallers',k:'Aanvaller'},{l:'Middenvelders',k:'Middenvelder'},{l:'Verdedigers',k:'Verdediger'},{l:'Keepers',k:'Keeper'}];
      let motmHtml2 = '<option value="">— Geen —</option>';
      motmGroups2.forEach(g2 => {
        const gp = sorted.filter(p=>p.position===g2.k);
        if (!gp.length) return;
        motmHtml2 += `<optgroup label="${g2.l}">${gp.map(p=>`<option value="${p.id}" ${p.id===cur?'selected':''}>${p.number?'#'+p.number+' ':''}${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</option>`).join('')}</optgroup>`;
      });
      motmEl.innerHTML = motmHtml2;
    }
  }
}

// ── Kaarten ──
function wpRenderCards() {
  const el = document.getElementById('wp-cards');
  if (!el) return;
  const hasStarters = wpStarters.size > 0;
  if (!wpCards.length) { el.innerHTML='<p style="font-size:12px;color:var(--text-muted)">Nog geen kaarten.</p>'; return; }
  // Include starters + all subs-in (invallers can also get cards)
  const appeared = wpGetAllAppeared();
  const m = (S.matches||[]).find(x=>x.id===wpCurrentId);
  const allP = (S.players||[]).filter(p => isPlayerAvailableOn(p, m?.date || null));
  const cardCandidates = hasStarters
    ? wpSortedPlayers(allP.filter(p=>appeared.has(p.id)))
    : wpSortedPlayers(allP);

  el.innerHTML = wpCards.map((c,i)=>{
    const groups = [{l:'Aanvallers',k:'Aanvaller'},{l:'Middenvelders',k:'Middenvelder'},{l:'Verdedigers',k:'Verdediger'},{l:'Keepers',k:'Keeper'}];
    let pool = '<option value="">— Speler —</option>';
    groups.forEach(g2 => {
      const gp = cardCandidates.filter(p=>p.position===g2.k);
      if (!gp.length) return;
      pool += `<optgroup label="${g2.l}">${gp.map(p=>`<option value="${p.id}" ${p.id===c.playerId?'selected':''}>${p.number?'#'+p.number+' ':''}${p.lastname}</option>`).join('')}</optgroup>`;
    });
    return `<div class="wp-event-row">
      <input class="form-input wp-min-input" type="text" inputmode="numeric" value="${displayMinute(c.minute)}" placeholder="67"
        onchange="wpCards[${i}].minute=this.value;wpRenderCards()" style="font-variant-numeric:tabular-nums">
      <select class="form-select wp-sel" style="flex:1" onchange="wpCards[${i}].playerId=this.value">${pool}</select>
      <select class="form-select wp-sel" style="flex:0.7" onchange="wpCards[${i}].cardType=this.value">
        <option value="geel" ${c.cardType==='geel'?'selected':''}>🟨 Geel</option>
        <option value="rood" ${c.cardType==='rood'?'selected':''}>🟥 Rood</option>
        <option value="geel-rood" ${c.cardType==='geel-rood'?'selected':''}>🟨🟥 G-R</option>
      </select>
      <button class="icon-btn danger" style="height:30px;flex-shrink:0" onclick="wpCards.splice(${i},1);wpRenderCards()">✕</button>
    </div>`;
  }).join('');
}

// ── Tijdlijn ──
function wpRenderTimeline() {
  const el = document.getElementById('wp-timeline');
  if (!el) return;
  const pName = id => {
    if (id==='__opp__') return 'Tegendoelpunt';
    const p=(S.players||[]).find(x=>x.id===id);
    return p?(p.number?'#'+p.number+' ':'')+(p.firstname?p.firstname[0]+'. ':'')+p.lastname:'?';
  };
  const events = [
    ...wpGoals.filter(g=>g.minute).map(g=>({
      sortMin: sortMinute(g.minute), dispMin: displayMinute(g.minute),
      icon:g.playerId==='__opp__'?'↩':'⚽',
      text:`${pName(g.playerId)}${g.assistId?' <span style="color:var(--text-muted);font-size:11px">(assist: '+pName(g.assistId)+')</span>':''}${g.goalType&&g.goalType!=='normaal'?' <span style="color:var(--text-muted);font-size:11px">['+g.goalType+']</span>':''}`})),
    ...wpSubs.filter(s=>s.minute).map(s=>({
      sortMin: sortMinute(s.minute), dispMin: displayMinute(s.minute),
      icon:'↕', text:`${pName(s.playerOutId)} <span style="color:var(--text-muted)">→</span> ${pName(s.playerInId)}`})),
    ...wpCards.filter(c=>c.minute).map(c=>({
      sortMin: sortMinute(c.minute), dispMin: displayMinute(c.minute),
      icon:c.cardType==='rood'?'🟥':c.cardType==='geel-rood'?'🟨🟥':'🟨', text:pName(c.playerId)})),
  ].sort((a,b)=>a.sortMin-b.sortMin);

  if (!events.length) { el.innerHTML='<p style="font-size:12px;color:var(--text-muted)">Voeg gebeurtenissen met minuten toe.</p>'; return; }
  el.innerHTML = events.map(e=>`
    <div class="timeline-item">
      <span class="timeline-min">${e.dispMin}'</span>
      <span style="margin-right:6px">${e.icon}</span>
      <span>${e.text}</span>
    </div>`).join('');
}

// ── Opslaan ──
async function wpSave() {
  const m = (S.matches||[]).find(x=>x.id===wpCurrentId);
  if (!m) return;

  // Validate events
  const errors = wpValidateEvents();
  if (errors.length > 0) {
    const proceed = confirm(
      'Let op: er zijn ' + errors.length + ' probleem(en):\n\n' +
      errors.slice(0,5).map((e,i)=>`${i+1}. ${e}`).join('\n') +
      (errors.length>5?`\n... en ${errors.length-5} meer`:'') +
      '\n\nToch opslaan?'
    );
    if (!proceed) return;
  }

  // Always recalc score from goals if any goals present
  if (wpGoals.length > 0) wpRecalcScore();

  // Wedstrijdgegevens: datum/tijd/ronde
  const newDate = document.getElementById('wp-match-date')?.value;
  if (newDate) m.date = newDate;
  const newTime = document.getElementById('wp-match-time')?.value;
  m.time = newTime || null;
  const newRound = document.getElementById('wp-match-round')?.value;
  if (newRound) {
    const savComp = S.competitions.find(c=>c.id===m.competitionId);
    const isKnockoutComp = savComp?.type==='beker'||savComp?.type==='playoffs';
    m.round = isKnockoutComp ? newRound : (parseInt(newRound)||m.round);
  }
  const attRaw = document.getElementById('wp-attendance')?.value;
  m.attendance = attRaw ? parseInt(attRaw) : null;
  const predHs = document.getElementById('wp-pred-hs')?.value;
  const predAs = document.getElementById('wp-pred-as')?.value;
  m.prediction = (predHs!==''&&predHs!=null && predAs!==''&&predAs!=null)
    ? {homeScore: parseInt(predHs), awayScore: parseInt(predAs)}
    : null;

  const hs = document.getElementById('wp-hs')?.value?.trim();
  const as = document.getElementById('wp-as')?.value?.trim();
  if (hs!==''&&as!=='') { m.homeScore=parseInt(hs); m.awayScore=parseInt(as); m.played=true; }
  else if (hs===''&&as==='') { m.homeScore=null; m.awayScore=null; m.played=false; }
  m.lineup = [...wpStarters];
  m.periods = null; // clear old format
  m.notes  = document.getElementById('wp-notes')?.value?.trim()||'';
  const et1 = document.getElementById('wp-et1')?.value?.trim();
  const et2 = document.getElementById('wp-et2')?.value?.trim();
  if (et1 !== '' && et1 !== undefined) m.extraTime1 = parseInt(et1)||0;
  if (et2 !== '' && et2 !== undefined) m.extraTime2 = parseInt(et2)||0;
  const wentEtEl = document.getElementById('wp-went-et');
  if (wentEtEl) {
    m.wentToExtraTime = wentEtEl.checked;
    const penH = document.getElementById('wp-pen-h')?.value?.trim();
    const penA = document.getElementById('wp-pen-a')?.value?.trim();
    if (wentEtEl.checked && penH!=='' && penA!=='' && penH!==undefined && penA!==undefined) {
      m.penalties = {home: parseInt(penH)||0, away: parseInt(penA)||0};
    } else {
      m.penalties = null;
    }
  }
  m.coachId = document.getElementById('wp-coach')?.value||null;
  m.motm   = document.getElementById('wp-motm')?.value||'';
  m.events = [
    ...wpGoals.map(g=>({...g,type:'goal'})),
    ...wpCards.map(c=>({...c,type:'card'})),
    ...wpSubs.map(s=>({...s,type:'sub'})),
    ...(m.events||[]).filter(e=>e.type==='coachCard'),
  ];

  // Save match stats
  const msKeys = ['possession','shots','shotsOnTarget','corners','fouls'];
  const msHome = {}, msAway = {};
  msKeys.forEach(k => {
    const h = document.getElementById(`wp-ms-home-${k}`)?.value?.trim();
    const a = document.getElementById(`wp-ms-away-${k}`)?.value?.trim();
    if (h !== '' && h !== undefined) msHome[k] = parseInt(h);
    if (a !== '' && a !== undefined) msAway[k] = parseInt(a);
  });
  if (Object.keys(msHome).length || Object.keys(msAway).length) {
    m.matchStats = {home: msHome, away: msAway};
  }

  // Save keeper saves
  const keeperSaves = {};
  (S.players||[]).filter(p=>p.position==='Keeper'&&wpStarters.has(p.id)).forEach(p => {
    const val = document.getElementById(`wp-saves-${p.id}`)?.value?.trim();
    if (val !== '' && val !== undefined) keeperSaves[p.id] = parseInt(val)||0;
  });
  if (Object.keys(keeperSaves).length) m.keeperSaves = keeperSaves;

  await dbPut('matches',m);
  window._playerStats = calcAllPlayerStats(S.currentSeason);
  showToast('Wedstrijd opgeslagen ✓','success');
  // Update the match row in the background without navigating away
  // (volledige herrender als de ronde is gewijzigd — de rij hoort dan elders)
  _refreshMatchRow(m.id, m.round !== wpOriginalRound);
  wpOriginalRound = m.round;
}


// ══════════════════════════════
// MINUUT HULPFUNCTIES
// ══════════════════════════════

// Parse "67" → 67, "45+2" → 47, "90+4" → 94
function parseMinute(str) {
  if (!str && str !== 0) return null;
  const s = String(str).trim();
  const plus = s.match(/^(\d+)\+(\d+)$/);
  if (plus) return parseInt(plus[1]) + parseInt(plus[2]);
  const n = parseInt(s);
  return isNaN(n) ? null : n;
}

// Display: keep as-is (show "45+2" not "47")
function displayMinute(str) {
  return str ? String(str).trim() : '';
}

// Sort value for timeline ordering
function sortMinute(str) {
  return parseMinute(str) ?? 999;
}

// Get state of the match at a given minute string
// Returns: { onField: Set<id>, redCards: Set<id>, usedSubs: Set<id> }
function wpMatchStateAt(atMinuteStr) {
  const atMin = parseMinute(atMinuteStr);

  // Build chronological list of events
  const events = [];
  wpSubs.forEach(s => {
    const m = parseMinute(s.minute);
    if (m !== null) events.push({ min: m, type: 'sub', out: s.playerOutId, in: s.playerInId });
  });
  wpCards.forEach(c => {
    const m = parseMinute(c.minute);
    if (m !== null && (c.cardType === 'rood' || c.cardType === 'geel-rood')) {
      events.push({ min: m, type: 'red', player: c.playerId });
    }
  });
  events.sort((a, b) => a.min - b.min);

  const onField = new Set(wpStarters);
  const redCards = new Set();
  const usedSubsIn = new Set();

  for (const ev of events) {
    // Only process events BEFORE (strictly less than) atMin
    // Events AT atMin are the one being entered — don't include them
    if (atMin !== null && ev.min >= atMin) break;
    if (ev.type === 'sub') {
      onField.delete(ev.out);
      onField.add(ev.in);
      usedSubsIn.add(ev.in);
    } else if (ev.type === 'red') {
      onField.delete(ev.player);
      redCards.add(ev.player);
    }
  }

  return { onField, redCards, usedSubsIn };
}

// Validate all events — returns array of error strings
function wpValidateEvents() {
  const errors = [];

  // Check all events have minutes
  wpGoals.forEach((g, i) => {
    if (!g.minute && g.minute !== 0) errors.push(`Doelpunt ${i+1}: geen minuut ingevuld`);
    if (!g.playerId) errors.push(`Doelpunt ${i+1}: geen speler geselecteerd`);
  });
  wpCards.forEach((c, i) => {
    if (!c.minute && c.minute !== 0) errors.push(`Kaart ${i+1}: geen minuut ingevuld`);
    if (!c.playerId) errors.push(`Kaart ${i+1}: geen speler geselecteerd`);
  });
  wpSubs.forEach((s, i) => {
    if (!s.minute && s.minute !== 0) errors.push(`Wissel ${i+1}: geen minuut ingevuld`);
    if (!s.playerOutId) errors.push(`Wissel ${i+1}: geen speler eraf geselecteerd`);
    if (!s.playerInId) errors.push(`Wissel ${i+1}: geen speler erin geselecteerd`);
  });

  // Check logical consistency
  const allEvents = [
    ...wpGoals.map(g => ({ min: parseMinute(g.minute), type: 'goal', player: g.playerId })),
    ...wpCards.map(c => ({ min: parseMinute(c.minute), type: 'card', card: c.cardType, player: c.playerId })),
    ...wpSubs.map(s => ({ min: parseMinute(s.minute), type: 'sub', out: s.playerOutId, in: s.playerInId })),
  ].filter(e => e.min !== null).sort((a, b) => a.min - b.min);

  const onField = new Set(wpStarters);
  const redCards = new Set();
  const appeared = new Set(wpStarters);

  for (const ev of allEvents) {
    const pName = id => { const p = (S.players||[]).find(x=>x.id===id); return p ? (p.number?'#'+p.number+' ':'')+p.lastname : '?'; };

    if (ev.type === 'sub') {
      if (ev.out && redCards.has(ev.out)) errors.push(`${ev.min}': ${pName(ev.out)} heeft rood en kan niet gewisseld worden`);
      if (ev.out && !onField.has(ev.out) && wpStarters.size > 0) errors.push(`${ev.min}': ${pName(ev.out)} staat niet op het veld`);
      if (ev.in && appeared.has(ev.in)) errors.push(`${ev.min}': ${pName(ev.in)} heeft al gespeeld`);
      onField.delete(ev.out);
      onField.add(ev.in);
      if (ev.in) appeared.add(ev.in);
    } else if (ev.type === 'goal') {
      if (ev.player && ev.player !== '__opp__' && ev.player !== '__opp_own__' && redCards.has(ev.player)) errors.push(`${ev.min}': ${pName(ev.player)} heeft rood en kan niet scoren`);
      if (ev.player && ev.player !== '__opp__' && ev.player !== '__opp_own__' && wpStarters.size > 0 && !appeared.has(ev.player)) errors.push(`${ev.min}': ${pName(ev.player)} staat niet op het veld`);
    } else if (ev.type === 'card') {
      if (ev.player && redCards.has(ev.player)) errors.push(`${ev.min}': ${pName(ev.player)} heeft al een rode kaart`);
      if (ev.card === 'rood' || ev.card === 'geel-rood') redCards.add(ev.player);
    }
  }

  return errors;
}

