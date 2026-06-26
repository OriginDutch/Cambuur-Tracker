
// ══════════════════════════════════════════════════════
// SPELERSPAGINA
// ══════════════════════════════════════════════════════

function navigateToPlayer(id) {
  // Hide all pages, show player page
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-speler').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  renderPlayerPage(id);
  window._currentPlayerId = id;
}

function renderPlayerPage(id) {
  const p = (S.players||[]).find(x=>x.id===id);
  if (!p) return;
  const el = document.getElementById('speler-content');
  if (!el) return;

  const today = new Date().toISOString().split('T')[0];
  const age = p.dob ? Math.floor((Date.now()-new Date(p.dob))/31557600000) : null;
  const allStats = calcAllPlayerStats(S.currentSeason);
  const st = allStats[id] || {};
  const latestVal = p.valueHistory?.length ? p.valueHistory[0].amount : null;
  const flag = typeof natFlag === 'function' ? natFlag(p.nationality) : '';
  const timeline = buildPlayerTimeline(p);
  const hasChart = p.valueHistory?.length >= 2;
  const chartId = `vchart-page-${id}`;
  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'}) : null;

  // Contract status color
  const contractColor = (() => {
    if (!p.contract) return null;
    const months = (new Date(p.contract) - new Date()) / (1000*60*60*24*30);
    if (months < 0) return 'var(--loss)';
    if (months < 6) return '#ff8c00';
    return 'var(--win)';
  })();

  // Attendance % this season
  const seasonMatches = (S.matches||[]).filter(m => {
    if (!m.played || m.seasonId !== S.currentSeason) return false;
    const cam = S.clubs.find(c=>c.isOwnClub);
    return cam && (m.homeClubId===cam.id || m.awayClubId===cam.id);
  });
  const attendance = seasonMatches.length > 0
    ? Math.round((st.appearances||0) / seasonMatches.length * 100) : null;

  // Personal records across all seasons
  let bestSeasonGoals = 0, bestSeasonApps = 0, bestSeasonLabel = '';
  (S.seasons||[]).forEach(s => {
    const ss = calcPlayerStats(id, s.id, null);
    if (ss.goals > bestSeasonGoals) { bestSeasonGoals = ss.goals; bestSeasonLabel = s.name; }
    if (ss.appearances > bestSeasonApps) bestSeasonApps = ss.appearances;
  });

  // Last 5 Cambuur matches with this player
  const cam = S.clubs.find(c=>c.isOwnClub);
  const recentMatches = (S.matches||[])
    .filter(m => m.played && cam && (m.homeClubId===cam.id||m.awayClubId===cam.id))
    .sort((a,b)=>(b.date||'').localeCompare(a.date||''))
    .slice(0,5);
  const formIcons = recentMatches.map(m => {
    const inLineup = (m.lineup||[]).includes(id);
    const subIn = (m.events||[]).find(e=>e.type==='sub'&&e.playerInId===id);
    if (!inLineup && !subIn) return null;
    const isCamHome = m.homeClubId === cam.id;
    const camScore = isCamHome ? m.homeScore : m.awayScore;
    const oppScore = isCamHome ? m.awayScore : m.homeScore;
    const result = camScore > oppScore ? 'W' : camScore === oppScore ? 'G' : 'V';
    const color = result==='W'?'var(--win)':result==='G'?'var(--draw)':'var(--loss)';
    const goal = (m.events||[]).some(e=>e.type==='goal'&&e.playerId===id);
    const assist = (m.events||[]).some(e=>e.type==='goal'&&e.assistId===id);
    const yc = (m.events||[]).some(e=>e.type==='card'&&e.playerId===id&&e.cardType==='geel');
    const rc = (m.events||[]).some(e=>e.type==='card'&&e.playerId===id&&(e.cardType==='rood'||e.cardType==='geel-rood'));
    const opp = isCamHome ? (S.clubs.find(c=>c.id===m.awayClubId)?.abbr||'?') : (S.clubs.find(c=>c.id===m.homeClubId)?.abbr||'?');
    return {result, color, goal, assist, yc, rc, score:`${camScore}-${oppScore}`, opp, date: m.date};
  }).filter(Boolean);

  // Stats per season HTML
  const seasons = (S.seasons||[]).filter(s=>!s.hidden);
  let statsHtml = '';
  seasons.forEach(season => {
    const ss = calcPlayerStats(id, season.id, null);
    if (!ss.appearances) return;
    const comps = (S.competitions||[]).filter(c=>c.seasonId===season.id);
    let compRows = '';
    if (comps.length > 1) {
      comps.forEach(comp => {
        const cs = calcPlayerStats(id, season.id, comp.id);
        if (!cs.appearances) return;
        compRows += `<div style="display:flex;gap:6px;padding:3px 0 3px 10px;border-left:2px solid var(--border-light);font-size:11px;color:var(--text-muted);flex-wrap:wrap">
          <span style="flex:1">${comp.name}</span>
          <span>${cs.appearances}W · ${cs.starts}S · ${cs.minutesPlayed}'</span>
          ${cs.goals?`<span style="color:var(--cambuur-geel)">⚽${cs.goals}</span>`:''}
          ${cs.assists?`<span>🎯${cs.assists}</span>`:''}
          ${cs.yellowCards?`<span>🟨${cs.yellowCards}</span>`:''}
          ${cs.redCards?`<span style="color:var(--loss)">🟥${cs.redCards}</span>`:''}
        </div>`;
      });
    }
    statsHtml += `<div style="margin-bottom:10px">
      <div style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">${season.name}</div>
      <div style="display:flex;gap:8px;font-size:13px;flex-wrap:wrap;padding-bottom:4px${compRows?';border-bottom:1px solid var(--border-light)':''}">
        <span style="font-weight:600">${ss.appearances}W</span>
        <span style="color:var(--text-muted)">${ss.starts}S · ${ss.minutesPlayed}'</span>
        ${ss.goals?`<span style="color:var(--cambuur-geel);font-weight:700">⚽ ${ss.goals}</span>`:''}
        ${ss.assists?`<span>🎯 ${ss.assists}</span>`:''}
        ${ss.yellowCards?`<span>🟨 ${ss.yellowCards}</span>`:''}
        ${ss.redCards?`<span style="color:var(--loss)">🟥 ${ss.redCards}</span>`:''}
        ${ss.motm?`<span style="color:var(--draw)">🏆 ${ss.motm}</span>`:''}
      </div>
      ${compRows}
    </div>`;
  });

  el.innerHTML = `
    <!-- Header -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <button class="btn btn-ghost" onclick="navigateBack()">← Terug</button>
      <div style="flex:1"></div>
      <button class="btn btn-secondary" onclick="openPlayerModal('${id}')">✏️ Bewerken</button>
    </div>

    <!-- HERO: foto + naam + key stats -->
    <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,var(--bg-secondary) 0%,var(--bg-tertiary) 100%)">
      <div style="display:flex;gap:24px;align-items:center">
        <!-- Foto -->
        <div style="width:110px;height:110px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--cambuur-geel);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:40px;color:var(--cambuur-blauw);box-shadow:0 4px 16px rgba(0,0,0,0.3)">
          ${p.photo?`<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover">`:`${initials(p.firstname||'',p.lastname||'')}`}
        </div>
        <!-- Naam + info -->
        <div style="flex:1;min-width:0">
          ${p.number?`<div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:16px;color:var(--cambuur-geel);letter-spacing:1px">#${p.number}</div>`:''}
          <div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:40px;line-height:1;letter-spacing:0.5px">${p.firstname||''} ${p.lastname}</div>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">
            ${(p.subpos?.length?p.subpos[0]:p.position)?`<span style="background:var(--cambuur-geel);color:var(--cambuur-blauw);font-size:11px;font-weight:800;padding:2px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:0.5px">${p.subpos?.length?p.subpos[0]:p.position}</span>`:''}
            ${p.subpos?.length>1?`<span style="font-size:11px;color:var(--text-muted)">${p.subpos.slice(1).join(' · ')}</span>`:''}
          </div>
          ${p.nationality?`<div style="margin-top:6px;display:flex;align-items:center;gap:8px"><span style="font-size:28px;line-height:1">${flag}</span><span style="font-size:15px;font-weight:700">${p.nationality}</span></div>`:''}
        </div>
        <!-- Key stats -->
        <div style="display:flex;gap:0;flex-shrink:0;background:var(--bg-primary);border-radius:12px;overflow:hidden">
          ${[
            {val: st.appearances||0, lbl:'Wedstr.', color:'var(--text-primary)'},
            {val: st.starts||0, lbl:'Starts', color:'var(--text-primary)'},
            {val: st.minutesPlayed||0, lbl:'Minuten', color:'var(--text-primary)', suffix:"'"},
            {val: st.goals||0, lbl:'Goals', color:'var(--cambuur-geel)'},
            {val: st.assists||0, lbl:'Assists', color:'var(--text-primary)'},
            ...(p.position==='Keeper'?[{val:st.cleanSheets||0,lbl:'Clean sheets',color:'var(--win)'}]:[]),
            ...(latestVal?[{val:formatEuro(latestVal),lbl:'Marktwaarde',color:'var(--text-primary)'}]:[]),
          ].map((s,i) => `<div style="padding:14px 18px;text-align:center;border-left:${i>0?'1px solid var(--border)':'none'}">
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:26px;font-weight:800;color:${s.color};line-height:1">${s.val}${s.suffix||''}</div>
            <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px">${s.lbl}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- THREE COLUMNS -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;align-items:start">

      <!-- KOLOM 1: Profiel + Vorm -->
      <div>
        <div class="card" style="margin-bottom:12px">
          <div class="card-title">Profiel</div>
          <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
            ${p.dob?`<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Geboortedatum</span><span style="font-weight:600">${fmtDate(p.dob)} (${age} jaar)</span></div>`:''}
            ${p.height?`<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Lengte</span><span style="font-weight:600">${p.height} cm</span></div>`:''}
            ${p.foot?`<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Sterkste voet</span><span style="font-weight:600">${p.foot}</span></div>`:''}
            ${p.joined?`<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">In dienst</span><span style="font-weight:600">${fmtDate(p.joined)}</span></div>`:''}
            ${p.contract?`<div style="display:flex;justify-content:space-between;align-items:center"><span style="color:var(--text-muted)">Contract t/m</span><span style="font-weight:600;color:${contractColor||'var(--text-primary)'}">${fmtDate(p.contract)}</span></div>`:''}
            ${p.youthProduct?`<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Herkomst</span><span style="font-weight:600">Eigen jeugd</span></div>`:''}
            ${p.freeTransferIn&&!p.youthProduct?`<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Aankomst</span><span style="font-weight:600">Vrije transfer</span></div>`:''}
            ${p.buyFee?`<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Aankoopbedrag</span><span style="font-weight:600">${formatEuro(p.buyFee)}</span></div>`:''}
            ${attendance!==null?`<div style="display:flex;justify-content:space-between;align-items:center"><span style="color:var(--text-muted)">Aanwezigheid</span>
              <div style="display:flex;align-items:center;gap:6px">
                <div style="width:60px;height:5px;background:var(--border);border-radius:3px;overflow:hidden"><div style="width:${attendance}%;height:100%;background:var(--cambuur-geel);border-radius:3px"></div></div>
                <span style="font-weight:600;font-size:12px">${attendance}%</span>
              </div>
            </div>`:''}
            ${p.note?`<div style="padding-top:8px;border-top:1px solid var(--border-light);font-size:12px;color:var(--text-muted);font-style:italic">${p.note}</div>`:''}
          </div>
        </div>

        <!-- Recente vorm -->
        ${formIcons.length?`<div class="card">
          <div class="card-title">Recente wedstrijden</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${formIcons.map(f=>`<div style="display:flex;align-items:center;gap:8px;font-size:12px">
              <div style="width:28px;height:28px;border-radius:6px;background:${f.color};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;color:white;flex-shrink:0">${f.result}</div>
              <span style="color:var(--text-muted);font-size:11px;flex:1">${f.opp} ${f.score}</span>
              <span style="display:flex;gap:3px">
                ${f.goal?'⚽':''}${f.assist?'🎯':''}${f.yc?'🟨':''}${f.rc?'🟥':''}
              </span>
              <span style="font-size:10px;color:var(--text-muted)">${f.date?new Date(f.date).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'}):''}</span>
            </div>`).join('')}
          </div>
        </div>`:
        `<div class="card"><div class="card-title">Recente wedstrijden</div><p style="font-size:12px;color:var(--text-muted)">Nog geen wedstrijddata.</p></div>`}
      </div>

      <!-- KOLOM 2: Statistieken + Records -->
      <div>
        ${statsHtml?`<div class="card" style="margin-bottom:12px">
          <div class="card-title">Statistieken per seizoen</div>
          ${statsHtml}
        </div>`:''}

        <!-- Persoonlijke records -->
        ${bestSeasonGoals>0||bestSeasonApps>0?`<div class="card" style="margin-bottom:12px">
          <div class="card-title">Persoonlijke records</div>
          <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
            ${bestSeasonGoals>0?`<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Meeste goals (seizoen)</span><span style="font-weight:700;color:var(--cambuur-geel)">⚽ ${bestSeasonGoals} <span style="font-size:11px;color:var(--text-muted);font-weight:400">${bestSeasonLabel}</span></span></div>`:''}
            ${bestSeasonApps>0?`<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Meeste wedstrijden</span><span style="font-weight:700">${bestSeasonApps}</span></div>`:''}
          </div>
        </div>`:''}

        <!-- Marktwaarde -->
        ${hasChart?`<div class="card">
          <div class="card-title">Marktwaarde</div>
          <div class="value-chart-wrap" id="${chartId}"></div>
        </div>`:
        p.valueHistory?.length===1?`<div class="card">
          <div class="card-title">Marktwaarde</div>
          <div style="font-size:24px;font-weight:800;color:var(--cambuur-geel)">${formatEuro(p.valueHistory[0].amount)}</div>
          <div style="font-size:11px;color:var(--text-muted)">Peildatum ${fmtDate(p.valueHistory[0].date)}</div>
        </div>`:''}
      </div>

      <!-- KOLOM 3: Transferhistorie + Coach -->
      <div>
        <div class="card" style="margin-bottom:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div class="card-title" style="margin:0">Transferhistorie</div>
            <button class="btn btn-ghost" style="font-size:11px;height:26px" onclick="openPlayerModal('${id}')">✏️ Bewerken / toevoegen</button>
          </div>
          ${timeline.length?timeline.map(t=>`
            <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border-light)">
              <div style="font-size:20px;width:28px;text-align:center;flex-shrink:0">${t.icon}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600">${t.label}${t.club?` — <span style="color:var(--text-secondary)">${t.club}</span>`:''}</div>
                ${t.note?`<div style="font-size:11px;color:var(--text-muted)">${t.note}</div>`:''}
                <div style="font-size:11px;color:var(--text-muted);margin-top:1px">${t.dateStr||''}${t.dateToStr?' → '+t.dateToStr:''}</div>
              </div>
            </div>`).join('')
          :`<p style="font-size:12px;color:var(--text-muted)">Nog geen transferdata. Voeg toe via ✏️ Bewerken.</p>`}
        </div>

        <!-- Coaches onder wie gespeeld -->
        ${(() => {
          const coaches = S.coaches || [];
          if (!coaches.length) return '';
          // Find coaches who were active during matches this player appeared in
          const playerMatches = (S.matches||[]).filter(m => {
            if (!m.played) return false;
            return (m.lineup||[]).includes(id) ||
              (m.events||[]).some(e=>e.type==='sub'&&e.playerInId===id);
          });
          if (!playerMatches.length) return '';

          const coachRows = coaches.map(coach => {
            const appts = coach.appointments||[];
            // Matches where this coach was active AND player appeared
            const sharedMatches = playerMatches.filter(m => {
              if (!m.date) return false;
              if (m.coachId === coach.id) return true;
              return appts.some(a => {
                const from = new Date(a.from||'1900-01-01');
                const to = a.to ? new Date(a.to) : new Date('2099-01-01');
                const md = new Date(m.date);
                return md >= from && md <= to;
              });
            });
            if (!sharedMatches.length) return null;
            // Goals/assists in those matches
            let goals = 0, assists = 0;
            sharedMatches.forEach(m => {
              (m.events||[]).forEach(e => {
                if (e.type==='goal' && e.playerId===id) goals++;
                if (e.type==='goal' && e.assistId===id) assists++;
              });
            });
            return {coach, matches: sharedMatches.length, goals, assists};
          }).filter(Boolean).sort((a,b)=>b.matches-a.matches);

          if (!coachRows.length) return '';
          return `<div class="card">
            <div class="card-title">Onder welke coach</div>
            ${coachRows.map(r=>`<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border-light);font-size:12px">
              <div style="flex:1;font-weight:600">${r.coach.firstname?r.coach.firstname+' ':''}${r.coach.lastname}</div>
              <span style="color:var(--text-muted)">${r.matches}W</span>
              ${r.goals?`<span style="color:var(--cambuur-geel)">⚽${r.goals}</span>`:''}
              ${r.assists?`<span>🎯${r.assists}</span>`:''}
            </div>`).join('')}
          </div>`;
        })()}
      </div>
    </div>
  `;

  if (hasChart) setTimeout(() => renderValueChart(p.valueHistory, chartId), 50);
}

function navigateBack() {
  navigate('selectie', document.querySelector('.nav-item[data-page="selectie"]'));
}

// Build automatic timeline from player fields + manual transfers
function buildPlayerTimeline(p) {
  const entries = [];
  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'}) : null;

  // Transfer in
  if (p.joined) {
    let label = 'Transfer in';
    let note = '';
    if (p.youthProduct) { label = 'Eigen jeugd'; }
    else if (p.loanIn) { label = 'Gehuurd van'; note = 'Huurspeler'; }
    else if (p.freeTransferIn) { note = 'Vrije transfer'; }
    else if (p.buyFee) { note = formatEuro(p.buyFee); }
    const icon = p.loanIn ? '⬅️' : '📥';
    entries.push({icon, label, club: p.previousClub||'', note, date: p.joined, dateStr: fmtDate(p.joined)});
  }

  // Huurling (ingehuurd)
  if (p.loanFromClub) {
    entries.push({icon:'⬅️', label:'Gehuurd van', club: p.loanFromClub, note:'', date: p.joined||'', dateStr: fmtDate(p.joined), dateToStr: fmtDate(p.loanFromReturn)});
  }

  // Manual entries
  (p.transfers||[]).forEach(t => {
    const typeObj = ALL_TRANSFER_TYPES.find(x=>x.value===t.type)||{icon:'•',label:t.type};
    const amountNote = t.amount ? formatEuro(t.amount) : '';
    entries.push({
      icon: typeObj.icon,
      label: typeObj.label.replace(/[📥📤➡️⬅️↩️📝]\s*/,''),
      club: t.club||'',
      note: [t.note, amountNote].filter(Boolean).join(' · '),
      date: t.date||'',
      dateStr: fmtDate(t.date),
      dateToStr: fmtDate(t.dateTo),
    });
    // Auto return entry for huur-uit
    if (t.type === 'huur-uit' && t.dateTo) {
      entries.push({icon:'↩️', label:'Terug van verhuur', club: t.club||'', note:'', date: t.dateTo, dateStr: fmtDate(t.dateTo)});
    }
    // Auto end entry for huur-in
    if (t.type === 'huur-in' && t.dateTo) {
      entries.push({icon:'🔚', label:'Huur afgelopen', club: t.club||'', note:'', date: t.dateTo, dateStr: fmtDate(t.dateTo)});
    }
  });

  // Transfer uit
  if (p.departureDate) {
    let note = '';
    if (p.freeTransferOut) note = 'Vrije transfer';
    else if (p.sellFee) note = formatEuro(p.sellFee);
    entries.push({icon:'📤', label:'Transfer uit', club: p.departureClub||'', note, date: p.departureDate, dateStr: fmtDate(p.departureDate)});
  }

  // Sort by date descending
  return entries.sort((a,b) => (b.date||'').localeCompare(a.date||''));
}
