
// ══════════════════════════════════════════════════════
// TECHNISCHE STAF — Coach systeem
// ══════════════════════════════════════════════════════

const COACH_ROLES = ['Hoofdtrainer','Assistent-trainer','Keeperstrainer','Fysiektrainer','Analist','Overig'];

// ── COACHES OVERZICHT PAGINA ──
function renderCoachesPage() {
  const el = document.getElementById('coaches-content');
  if (!el) return;
  const coaches = S.coaches || [];
  if (!coaches.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">🧑‍💼</div>
      <div class="empty-state-title">Nog geen stafmedewerkers</div>
      <div class="empty-state-desc">Voeg de technische staf toe via de knop rechtsboven.</div>
    </div>`;
    return;
  }

  // Group by role
  const byRole = {};
  COACH_ROLES.forEach(r => byRole[r] = []);
  coaches.forEach(c => {
    // Vind de aanstelling die vandaag actief is (from <= vandaag <= to, of geen to).
    // Val terug op de meest recente aanstelling (op startdatum) als er geen actieve is.
    const today = new Date();
    const appts = (c.appointments||[]).slice().sort((a,b)=>new Date(b.from)-new Date(a.from));
    const currentAppt = appts.find(a => {
      const from = a.from ? new Date(a.from) : null;
      const to = a.to ? new Date(a.to) : null;
      if (!from) return false;
      return from <= today && (!to || to >= today);
    });
    const appt = currentAppt || appts[0];
    const role = appt?.role || 'Overig';
    if (!byRole[role]) byRole[role] = [];
    byRole[role].push({coach:c, appt, isActive:!!currentAppt});
  });

  let html = '';
  COACH_ROLES.forEach(role => {
    const group = (byRole[role] || []).slice().sort((a,b) => {
      const oa = a.appt?.order ?? 999, ob = b.appt?.order ?? 999;
      if (oa !== ob) return oa - ob;
      return (a.coach.lastname||'').localeCompare(b.coach.lastname||'');
    });
    if (!group.length) return;
    html += `<div style="margin-bottom:20px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);padding:6px 0;border-bottom:2px solid var(--border);margin-bottom:8px">${role}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">
        ${group.map(({coach:c, appt, isActive}) => {
          const age = c.dob ? Math.floor((Date.now()-new Date(c.dob))/31557600000) : null;
          const stats = calcCoachStats(c.id, S.currentSeason);
          return `<div class="card" style="cursor:pointer;padding:14px" onclick="openCoachDetail('${c.id}')">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
              <div style="width:48px;height:48px;border-radius:50%;overflow:hidden;background:var(--bg-tertiary);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px">
                ${c.photo ? `<img src="${c.photo}" style="width:100%;height:100%;object-fit:cover">` : '🧑‍💼'}
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;font-size:14px">${c.firstname||''} ${c.lastname}</div>
                <div style="font-size:11px;color:var(--text-muted)">${appt?.role||''}${isActive?'':' <span style="color:var(--loss)">(inactief)</span>'}</div>
                ${age?`<div style="font-size:11px;color:var(--text-muted)">${age} jaar${c.nationality?' · '+natFlag(c.nationality)+c.nationality:''}</div>`:''}
              </div>
            </div>
            ${stats.matches>0?`<div style="display:flex;gap:8px;font-size:12px;border-top:1px solid var(--border-light);padding-top:8px">
              <span style="color:var(--text-muted)">${stats.matches}W</span>
              <span style="color:var(--win)">W ${stats.wins}</span>
              <span style="color:var(--draw)">G ${stats.draws}</span>
              <span style="color:var(--loss)">V ${stats.losses}</span>
              <span style="margin-left:auto;font-weight:700">${stats.ppg} PPG</span>
            </div>`:'<div style="font-size:11px;color:var(--text-muted);border-top:1px solid var(--border-light);padding-top:8px">Nog geen wedstrijddata</div>'}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  });
  el.innerHTML = html;
}

// ── COACH STATISTIEKEN BEREKENING ──
function calcCoachStats(coachId, seasonId, compId) {
  const coach = (S.coaches||[]).find(c=>c.id===coachId);
  if (!coach) return {matches:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0,cleanSheets:0,ppg:0,yellowCards:0,redCards:0};

  // Get appointment periods for this coach
  const appointments = coach.appointments||[];

  // Filter matches — only Cambuur matches during appointment period
  const cam = S.clubs.find(c=>c.isOwnClub);
  let matches = (S.matches||[]).filter(m => {
    if (!m.played) return false;
    if (isMatchOrphaned(m)) return false;
    if (seasonId && m.seasonId !== seasonId) return false;
    if (compId && m.competitionId !== compId) return false;
    // Only count matches where Cambuur plays
    if (cam && m.homeClubId !== cam.id && m.awayClubId !== cam.id) return false;
    // Check if this coach was active for this match
    const mDate = m.date ? new Date(m.date) : null;
    if (!mDate) return false;
    // Check if explicitly assigned
    if (m.coachId === coachId) return true;
    // Auto-match: check appointment period
    return appointments.some(a => {
      const from = new Date(a.from||'1900-01-01');
      const to = a.to ? new Date(a.to) : new Date('2099-01-01');
      return mDate >= from && mDate <= to;
    });
  });
  let wins=0,draws=0,losses=0,goalsFor=0,goalsAgainst=0,cleanSheets=0,yellowCards=0,redCards=0;
  let winStreak=0,unbeatenStreak=0,maxWinStreak=0,maxUnbeaten=0;
  let homeW=0,homeD=0,homeL=0,awayW=0,awayD=0,awayL=0;
  // Track streak rounds
  let winStreakStart=null,winStreakEnd=null,bestWinStart=null,bestWinEnd=null;
  let unbeatStreakStart=null,unbeatStreakEnd=null,bestUnbeatStart=null,bestUnbeatEnd=null;

  matches.forEach(m => {
    const isCamHome = m.homeClubId === cam?.id;
    const camScore = isCamHome ? m.homeScore : m.awayScore;
    const oppScore = isCamHome ? m.awayScore : m.homeScore;
    if (camScore == null || oppScore == null) return;
    goalsFor += camScore; goalsAgainst += oppScore;
    if (oppScore === 0) cleanSheets++;
    if (camScore > oppScore) {
      wins++;
      if (winStreak===0) winStreakStart=m.round;
      winStreak++; winStreakEnd=m.round;
      if (winStreak>maxWinStreak) { maxWinStreak=winStreak; bestWinStart=winStreakStart; bestWinEnd=winStreakEnd; }
      if (unbeatenStreak===0) unbeatStreakStart=m.round;
      unbeatenStreak++; unbeatStreakEnd=m.round;
      if (unbeatenStreak>maxUnbeaten) { maxUnbeaten=unbeatenStreak; bestUnbeatStart=unbeatStreakStart; bestUnbeatEnd=unbeatStreakEnd; }
      if (isCamHome) homeW++; else awayW++;
    } else if (camScore === oppScore) {
      draws++; winStreak=0; winStreakStart=null;
      if (unbeatenStreak===0) unbeatStreakStart=m.round;
      unbeatenStreak++; unbeatStreakEnd=m.round;
      if (unbeatenStreak>maxUnbeaten) { maxUnbeaten=unbeatenStreak; bestUnbeatStart=unbeatStreakStart; bestUnbeatEnd=unbeatStreakEnd; }
      if (isCamHome) homeD++; else awayD++;
    } else {
      losses++; winStreak=0; winStreakStart=null; unbeatenStreak=0; unbeatStreakStart=null;
      if (isCamHome) homeL++; else awayL++;
    }
    // Count cards
    (m.events||[]).forEach(e => {
      if (e.type==='coachCard' && e.coachId===coachId) {
        if (e.cardType==='geel') yellowCards++;
        else if (e.cardType==='rood'||e.cardType==='geel-rood') redCards++;
      }
    });
  });

  const total = wins+draws+losses;
  const ppg = total > 0 ? ((wins*3+draws)/total).toFixed(2) : '0.00';
  return {matches:total,wins,draws,losses,goalsFor,goalsAgainst,cleanSheets,ppg,yellowCards,redCards,
    maxWinStreak,maxUnbeaten,homeW,homeD,homeL,awayW,awayD,awayL,
    bestWinStart,bestWinEnd,bestUnbeatStart,bestUnbeatEnd};
}

// ── COACH DETAIL MODAL ──
function openCoachDetail(id) {
  const c = (S.coaches||[]).find(x=>x.id===id);
  if (!c) return;
  document.getElementById('coach-detail-title').textContent = (c.firstname||'')+' '+c.lastname;
  document.getElementById('coach-detail-edit-btn').onclick = () => { closeModal('modal-coach-detail'); openCoachModal(id); };

  const age = c.dob ? Math.floor((Date.now()-new Date(c.dob))/31557600000) : null;
  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'}) : '—';

  // Appointments
  const appts = (c.appointments||[]).sort((a,b)=>new Date(a.from)-new Date(b.from));
  const apptsHtml = appts.map(a => `
    <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border-light)">
      <div style="flex:1">
        <span style="font-weight:600;font-size:13px">${a.role}</span>
        ${a.order?`<span style="font-size:11px;color:var(--text-muted);margin-left:6px">Stafvolgorde: ${a.order}</span>`:''}
      </div>
      <span style="font-size:12px;color:var(--text-muted)">${fmtDate(a.from)} – ${a.to?fmtDate(a.to):'heden'}</span>
    </div>`).join('');

  // Stats per seizoen
  const seasons = (S.seasons||[]).filter(s=>!s.hidden);
  let statsHtml = '';
  seasons.forEach(season => {
    const st = calcCoachStats(id, season.id, null);
    // Check manual history
    // Match manual entry by seasonId (legacy) or season name
    const manualEntry = (c.history||[]).find(h=>
      h.seasonId===season.id || h.seasonName===season.name
    );
    const hasAppData = st.matches > 0;
    const hasManual = manualEntry && !hasAppData;

    if (!hasAppData && !hasManual) return;

    const data = hasAppData ? st : {
      matches: manualEntry.matches||0, wins: manualEntry.wins||0,
      draws: manualEntry.draws||0, losses: manualEntry.losses||0,
      goalsFor: manualEntry.goalsFor||0, goalsAgainst: manualEntry.goalsAgainst||0,
      ppg: manualEntry.matches ? ((manualEntry.wins*3+manualEntry.draws)/manualEntry.matches).toFixed(2) : '0.00'
    };

    const comps = (S.competitions||[]).filter(comp=>comp.seasonId===season.id);
    let compRows = '';
    if (comps.length>1 && hasAppData) {
      comps.forEach(comp => {
        const cs = calcCoachStats(id, season.id, comp.id);
        if (!cs.matches) return;
        compRows += `<div style="display:flex;align-items:center;gap:8px;padding:3px 0 3px 12px;border-left:2px solid var(--border-light);font-size:11px;color:var(--text-muted)">
          <span style="flex:1">${comp.name}</span>
          <span>${cs.matches}W · ${cs.wins}W ${cs.draws}G ${cs.losses}V</span>
          <span style="font-weight:700">${cs.ppg} PPG</span>
        </div>`;
      });
    }

    statsHtml += `<div style="margin-bottom:10px">
      <div style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">
        ${season.name} ${!hasAppData?'<span style="color:var(--text-muted);font-weight:400">(handmatig)</span>':''}
      </div>
      <div style="display:flex;align-items:center;gap:10px;font-size:13px;flex-wrap:wrap;padding-bottom:4px;border-bottom:${compRows?'1px solid var(--border-light)':'none'}">
        <span style="color:var(--text-secondary)">${data.matches} wedstrijden</span>
        <span style="color:var(--win)">W ${data.wins}</span>
        <span style="color:var(--draw)">G ${data.draws}</span>
        <span style="color:var(--loss)">V ${data.losses}</span>
        <span style="font-weight:700;margin-left:4px">${data.ppg} PPG</span>
        ${data.goalsFor!==undefined?`<span style="color:var(--text-muted);font-size:11px">${data.goalsFor}–${data.goalsAgainst}</span>`:''}
      </div>
      ${compRows}
    </div>`;
  });

  // Also show manual entries for seasons NOT in the app
  (c.history||[]).forEach(h => {
    const seasonName = h.seasonName || h.seasonId;
    if (!seasonName) return;
    // Check if this season is already shown via S.seasons
    const inApp = (S.seasons||[]).find(s => s.id===h.seasonId || s.name===h.seasonName);
    if (inApp) return; // already handled above
    const data = {
      matches: h.matches||0, wins: h.wins||0, draws: h.draws||0, losses: h.losses||0,
      goalsFor: h.goalsFor||0, goalsAgainst: h.goalsAgainst||0,
      ppg: h.matches ? ((h.wins*3+h.draws)/h.matches).toFixed(2) : '0.00'
    };
    if (!data.matches) return;
    statsHtml += `<div style="margin-bottom:10px">
      <div style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">
        ${seasonName} <span style="color:var(--text-muted);font-weight:400">(handmatig)</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;font-size:13px;flex-wrap:wrap">
        <span style="color:var(--text-secondary)">${data.matches} wedstrijden</span>
        <span style="color:var(--win)">W ${data.wins}</span>
        <span style="color:var(--draw)">G ${data.draws}</span>
        <span style="color:var(--loss)">V ${data.losses}</span>
        <span style="font-weight:700;margin-left:4px">${data.ppg} PPG</span>
        <span style="color:var(--text-muted);font-size:11px">${data.goalsFor}–${data.goalsAgainst}</span>
      </div>
    </div>`;
  });

  // Overall stats (include all manual seasons not in app)
  const overall = calcCoachStats(id, null, null);
  // Add manual history where no season data
  let manualMatches=0,manualWins=0,manualDraws=0,manualLosses=0;
  (c.history||[]).forEach(h => {
    const matchedSeason = seasons.find(s=>s.id===h.seasonId||s.name===h.seasonName);
    const seasonHasData = matchedSeason &&
      calcCoachStats(id, matchedSeason.id, null).matches > 0;
    if (!seasonHasData) {
      manualMatches+=(h.matches||0); manualWins+=(h.wins||0);
      manualDraws+=(h.draws||0); manualLosses+=(h.losses||0);
    }
  });
  const totalMatches = overall.matches + manualMatches;
  const totalWins = overall.wins + manualWins;
  const totalDraws = overall.draws + manualDraws;
  const totalLosses = overall.losses + manualLosses;
  const totalPPG = totalMatches ? ((totalWins*3+totalDraws)/totalMatches).toFixed(2) : '0.00';

  const careerHtml = (c.career||[]).map(e=>`
    <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border-light);font-size:12px">
      <span style="flex:1;font-weight:600">${e.club||'—'}</span>
      <span style="color:var(--text-muted)">${e.role||''}</span>
      <span style="color:var(--text-muted)">${e.from||''}${e.to?' – '+e.to:' – heden'}</span>
    </div>`).join('');

  document.getElementById('coach-detail-body').innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:16px">
      <div style="width:72px;height:72px;border-radius:50%;overflow:hidden;background:var(--bg-tertiary);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:32px">
        ${c.photo?`<img src="${c.photo}" style="width:100%;height:100%;object-fit:cover">`:'🧑‍💼'}
      </div>
      <div style="flex:1">
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:26px">${c.firstname||''} ${c.lastname}</div>
        ${age?`<div style="font-size:12px;color:var(--text-muted)">${age} jaar${c.nationality?' · '+natFlag(c.nationality)+c.nationality:''}</div>`:''}
        ${totalMatches>0?`<div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap">
          <div style="text-align:center"><div style="font-size:20px;font-weight:800">${totalMatches}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Wedstrijden</div></div>
          <div style="text-align:center"><div style="font-size:20px;font-weight:800;color:var(--win)">${totalWins}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Gewonnen</div></div>
          <div style="text-align:center"><div style="font-size:20px;font-weight:800;color:var(--draw)">${totalDraws}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Gelijk</div></div>
          <div style="text-align:center"><div style="font-size:20px;font-weight:800;color:var(--loss)">${totalLosses}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Verloren</div></div>
          <div style="text-align:center"><div style="font-size:20px;font-weight:800;color:var(--cambuur-geel)">${totalPPG}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">PPG</div></div>
          ${overall.cleanSheets>0?`<div style="text-align:center"><div style="font-size:20px;font-weight:800">${overall.cleanSheets}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Clean sheets</div></div>`:''}
        </div>`:''}
      </div>
    </div>

    ${apptsHtml?`<div class="card" style="margin-bottom:12px">
      <div class="card-title">Aanstellingen bij Cambuur</div>
      ${apptsHtml}
    </div>`:''}

    ${statsHtml?`<div class="card" style="margin-bottom:12px">
      <div class="card-title">Statistieken per seizoen</div>
      ${statsHtml}
    </div>`:''}

    ${overall.matches>0?`<div class="card" style="margin-bottom:12px">
      <div class="card-title">Uitgebreide statistieken (berekend)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
        <div style="padding:8px;background:var(--bg-tertiary);border-radius:4px"><div style="color:var(--text-muted);margin-bottom:2px">Langste winstserie</div><div style="font-weight:700">${overall.maxWinStreak} wedstrijden</div></div>
        <div style="padding:8px;background:var(--bg-tertiary);border-radius:4px"><div style="color:var(--text-muted);margin-bottom:2px">Langste ongeslagen serie</div><div style="font-weight:700">${overall.maxUnbeaten} wedstrijden</div></div>
        <div style="padding:8px;background:var(--bg-tertiary);border-radius:4px"><div style="color:var(--text-muted);margin-bottom:2px">Thuisrecord</div><div style="font-weight:700">${overall.homeW}W ${overall.homeD}G ${overall.homeL}V</div></div>
        <div style="padding:8px;background:var(--bg-tertiary);border-radius:4px"><div style="color:var(--text-muted);margin-bottom:2px">Uitrecord</div><div style="font-weight:700">${overall.awayW}W ${overall.awayD}G ${overall.awayL}V</div></div>
        <div style="padding:8px;background:var(--bg-tertiary);border-radius:4px"><div style="color:var(--text-muted);margin-bottom:2px">Goals voor/tegen</div><div style="font-weight:700">${overall.goalsFor} – ${overall.goalsAgainst}</div></div>
        <div style="padding:8px;background:var(--bg-tertiary);border-radius:4px"><div style="color:var(--text-muted);margin-bottom:2px">Kaarten</div><div style="font-weight:700">🟨 ${overall.yellowCards} &nbsp; 🟥 ${overall.redCards}</div></div>
      </div>
    </div>`:''}

    ${careerHtml?`<div class="card">
      <div class="card-title">Carrière buiten Cambuur</div>
      ${careerHtml}
    </div>`:''}
  `;
  document.getElementById('modal-coach-detail').classList.add('open');
}

// ── COACH MODAL (aanmaken/bewerken) ──
function openCoachModal(editId) {
  document.getElementById('coach-modal-title').textContent = editId ? 'Stafmedewerker bewerken' : 'Stafmedewerker toevoegen';
  document.getElementById('coach-edit-id').value = editId||'';

  const c = editId ? (S.coaches||[]).find(x=>x.id===editId) : null;
  document.getElementById('coach-firstname').value = c?.firstname||'';
  document.getElementById('coach-lastname').value = c?.lastname||'';
  document.getElementById('coach-dob').value = c?.dob||'';
  document.getElementById('coach-nationality').value = c?.nationality||'';
  document.getElementById('coach-photo').value = c?.photo||'';

  // Render appointments
  window._coachAppts = JSON.parse(JSON.stringify(c?.appointments||[]));
  window._coachHistory = JSON.parse(JSON.stringify(c?.history||[]));
  window._coachCareer = JSON.parse(JSON.stringify(c?.career||[]));
  renderCoachAppointments();
  renderCoachHistory();
  renderCoachCareer();
  document.getElementById('modal-coach').classList.add('open');
}

function renderCoachAppointments() {
  const el = document.getElementById('coach-appointments-list');
  if (!el) return;
  if (!window._coachAppts.length) {
    el.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">Nog geen aanstellingen.</p>';
    return;
  }
  el.innerHTML = window._coachAppts.map((a,i) => `
    <div style="display:grid;grid-template-columns:1fr 1fr 80px 90px 90px 28px;gap:6px;align-items:end;margin-bottom:6px">
      <div><label class="form-label" style="font-size:10px">Rol</label>
        <select class="form-select" style="height:30px;font-size:12px" onchange="window._coachAppts[${i}].role=this.value">
          ${COACH_ROLES.map(r=>`<option value="${r}" ${a.role===r?'selected':''}>${r}</option>`).join('')}
        </select></div>
      <div><label class="form-label" style="font-size:10px">Seizoen/staf</label>
        <select class="form-select" style="height:30px;font-size:12px" onchange="window._coachAppts[${i}].seasonId=this.value">
          <option value="">— Alle —</option>
          ${(S.seasons||[]).map(s=>`<option value="${s.id}" ${a.seasonId===s.id?'selected':''}>${s.name}</option>`).join('')}
        </select></div>
      <div><label class="form-label" style="font-size:10px">Volgorde</label>
        <input class="form-input" type="number" min="1" max="10" value="${a.order||1}" style="height:30px;font-size:12px"
          oninput="window._coachAppts[${i}].order=parseInt(this.value)||1"></div>
      <div><label class="form-label" style="font-size:10px">Van</label>
        <input class="form-input" type="date" value="${a.from||''}" style="height:30px;font-size:12px"
          onchange="window._coachAppts[${i}].from=this.value"></div>
      <div><label class="form-label" style="font-size:10px">Tot</label>
        <input class="form-input" type="date" value="${a.to||''}" style="height:30px;font-size:12px" placeholder="heden"
          onchange="window._coachAppts[${i}].to=this.value"></div>
      <button class="icon-btn danger" style="height:30px" onclick="window._coachAppts.splice(${i},1);renderCoachAppointments()">✕</button>
    </div>`).join('');
}

function addCoachAppointment() {
  window._coachAppts.push({role:'Hoofdtrainer', from:'', to:'', order:1});
  renderCoachAppointments();
}

function renderCoachHistory() {
  const el = document.getElementById('coach-history-list');
  if (!el) return;
  if (!window._coachHistory.length) {
    el.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">Nog geen historische stats.</p>';
    return;
  }
  el.innerHTML = window._coachHistory.map((h,i) => `
    <div style="display:grid;grid-template-columns:1fr 60px 50px 50px 50px 70px 70px 28px;gap:5px;align-items:end;margin-bottom:5px">
      <div><label class="form-label" style="font-size:10px">Seizoen</label>
        <input class="form-input" value="${h.seasonName||''}" style="height:28px;font-size:11px;padding:2px 6px" placeholder="2015/16"
          oninput="window._coachHistory[${i}].seasonName=this.value"></div>
      ${['matches','wins','draws','losses'].map((k,ki)=>`<div><label class="form-label" style="font-size:10px">${['W','Win','Gel','Ver'][ki]}</label>
        <input class="form-input" type="number" min="0" value="${h[k]||0}" style="height:28px;font-size:11px;padding:2px 4px"
          oninput="window._coachHistory[${i}].${k}=parseInt(this.value)||0"></div>`).join('')}
      <div><label class="form-label" style="font-size:10px">Goals v</label>
        <input class="form-input" type="number" min="0" value="${h.goalsFor||0}" style="height:28px;font-size:11px;padding:2px 4px"
          oninput="window._coachHistory[${i}].goalsFor=parseInt(this.value)||0"></div>
      <div><label class="form-label" style="font-size:10px">Goals t</label>
        <input class="form-input" type="number" min="0" value="${h.goalsAgainst||0}" style="height:28px;font-size:11px;padding:2px 4px"
          oninput="window._coachHistory[${i}].goalsAgainst=parseInt(this.value)||0"></div>
      <button class="icon-btn danger" style="height:28px" onclick="window._coachHistory.splice(${i},1);renderCoachHistory()">✕</button>
    </div>`).join('');
}

function addCoachHistoryRow() {
  window._coachHistory.push({seasonId:'',matches:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0});
  renderCoachHistory();
}

function renderCoachCareer() {
  const el = document.getElementById('coach-career-list');
  if (!el) return;
  if (!window._coachCareer.length) {
    el.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">Nog geen carrièredata.</p>';
    return;
  }
  el.innerHTML = window._coachCareer.map((e,i) => `
    <div style="display:grid;grid-template-columns:1fr 1fr 80px 80px 28px;gap:6px;align-items:end;margin-bottom:5px">
      <div><label class="form-label" style="font-size:10px">Club</label>
        <input class="form-input" value="${e.club||''}" style="height:28px;font-size:12px" placeholder="FC Groningen"
          oninput="window._coachCareer[${i}].club=this.value"></div>
      <div><label class="form-label" style="font-size:10px">Rol</label>
        <input class="form-input" value="${e.role||''}" style="height:28px;font-size:12px" placeholder="Hoofdtrainer"
          oninput="window._coachCareer[${i}].role=this.value"></div>
      <div><label class="form-label" style="font-size:10px">Van</label>
        <input class="form-input" value="${e.from||''}" style="height:28px;font-size:12px" placeholder="2010"
          oninput="window._coachCareer[${i}].from=this.value"></div>
      <div><label class="form-label" style="font-size:10px">Tot</label>
        <input class="form-input" value="${e.to||''}" style="height:28px;font-size:12px" placeholder="2015"
          oninput="window._coachCareer[${i}].to=this.value"></div>
      <button class="icon-btn danger" style="height:28px" onclick="window._coachCareer.splice(${i},1);renderCoachCareer()">✕</button>
    </div>`).join('');
}

function addCoachCareerRow() {
  window._coachCareer.push({club:'',role:'',from:'',to:''});
  renderCoachCareer();
}

async function saveCoach() {
  const fn = document.getElementById('coach-firstname').value.trim();
  const ln = document.getElementById('coach-lastname').value.trim();
  if (!ln) { showToast('Vul minimaal een achternaam in','error'); return; }
  const editId = document.getElementById('coach-edit-id').value;
  const id = editId || 'coach_'+Date.now();
  const coach = {
    id, firstname:fn, lastname:ln,
    dob: document.getElementById('coach-dob').value||null,
    nationality: document.getElementById('coach-nationality').value.trim()||null,
    photo: document.getElementById('coach-photo').value.trim()||null,
    appointments: window._coachAppts||[],
    history: window._coachHistory||[],
    career: window._coachCareer||[],
    created: editId ? ((S.coaches||[]).find(c=>c.id===editId)?.created||Date.now()) : Date.now()
  };
  await dbPut('coaches', coach);
  if (editId) S.coaches = (S.coaches||[]).map(c=>c.id===editId?coach:c);
  else (S.coaches=S.coaches||[]).push(coach);
  closeModal('modal-coach');
  renderCoachesPage();
  showToast((fn?fn+' ':'')+ln+' opgeslagen','success');
}

async function deleteCoach(id) {
  const c = (S.coaches||[]).find(x=>x.id===id);
  if (!c || !confirm(`${c.firstname||''} ${c.lastname} verwijderen?`)) return;
  await dbDel('coaches',id);
  S.coaches = (S.coaches||[]).filter(x=>x.id!==id);
  closeModal('modal-coach-detail');
  renderCoachesPage();
  showToast('Stafmedewerker verwijderd','success');
}

