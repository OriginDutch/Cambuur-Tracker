// ── STATISTIEKEN PAGINA ──
function renderStatistieken(){
  const el=document.getElementById('statistieken-content');
  if(!el) return;
  const season=S.seasons.find(s=>s.id===S.currentSeason);
  if(!season){el.innerHTML='<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-title">Geen seizoen actief</div></div>';return;}

  const cam=S.clubs.find(c=>c.isOwnClub);
  const allStats=calcAllPlayerStats(S.currentSeason);
  const currentSeasonObj = (S.seasons||[]).find(s=>s.id===S.currentSeason);
  const players=(S.players||[]).filter(p=>{
    if (!currentSeasonObj) return !['vertrokken','uitgeleend'].includes(p.status);
    return isPlayerInSeason(p, currentSeasonObj);
  });
  const comps=S.competitions.filter(c=>c.seasonId===S.currentSeason);

  // Season aggregate
  const record = calcSeasonRecord(S.currentSeason, cam);
  const played = record.matches;
  const wins = record.w, draws = record.d, losses = record.l, gf = record.gf, ga = record.ga, cleanSheets = record.cleanSheets;

  // Per-comp breakdown
  const compBreakdown=comps.map(comp=>{
    const cMatches=(S.matches||[]).filter(m=>m.competitionId===comp.id&&(m.homeClubId===cam?.id||m.awayClubId===cam?.id)&&m.played);
    if(!cMatches.length) return null;
    let cw=0,cd=0,cl=0,cgf=0,cga=0;
    cMatches.forEach(m=>{
      const isCamHome=m.homeClubId===cam?.id;
      const cs=isCamHome?m.homeScore:m.awayScore;
      const os=isCamHome?m.awayScore:m.homeScore;
      if(cs>os)cw++; else if(cs===os)cd++; else cl++;
      cgf+=cs; cga+=os;
    });
    return {comp,played:cMatches.length,w:cw,d:cd,l:cl,gf:cgf,ga:cga};
  }).filter(Boolean);

  // Player stats table row
  const pRow=(p,st,showApps)=>`<tr style="cursor:pointer" onclick="navigateToPlayer('${p.id}')">
    <td><div style="display:flex;align-items:center;gap:8px">
      ${playerAvatarHTML(p,'player-avatar',26)}
      <span style="font-weight:600">${p.number?'<span class="text-muted" style="font-size:10px">#'+p.number+'</span> ':''}${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</span>
    </div></td>
    ${showApps?`<td class="num" title="Wedstrijden">${st.appearances||0}</td>`:''}
    ${showApps?`<td class="num" title="Starts">${st.starts||0}</td>`:''}
    ${showApps?`<td class="num" title="Speelminuten">${st.minutesPlayed||0}'</td>`:''}
    <td class="num" style="${st.goals>0?'font-weight:700;color:var(--cambuur-geel)':''}">${st.goals||0}</td>
    <td class="num">${st.assists||0}</td>
    <td class="num">${st.yellowCards||0}</td>
    <td class="num" style="${st.redCards>0?'color:var(--loss)':''}">${st.redCards||0}</td>
    <td class="num" style="${st.motm>0?'color:var(--draw)':''}">${st.motm||0}</td>
  </tr>`;

  const activeWithStats=players.filter(p=>Object.values(allStats[p.id]||{}).some(v=>v>0))
    .sort((a,b)=>allStats[b.id].goals-allStats[a.id].goals||allStats[b.id].assists-allStats[a.id].assists);

  el.innerHTML=`
    <div style="margin-bottom:14px;display:flex;align-items:baseline;justify-content:space-between">
      <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:22px">
        Statistieken — <span style="color:var(--cambuur-geel)">${season.name}</span>
      </div>
    </div>

    <!-- Seizoenssamenvatting -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      ${[
        {v:played.length,l:'Gespeeld'},
        {v:wins,l:'Gewonnen',c:'var(--win)'},
        {v:draws,l:'Gelijk',c:'var(--draw)'},
        {v:losses,l:'Verloren',c:'var(--loss)'},
        {v:gf,l:'Goals voor',c:'var(--cambuur-geel)'},
        {v:ga,l:'Goals tegen'},
        {v:(gf-ga>=0?'+':'')+( gf-ga),l:'Doelsaldo',c:gf>ga?'var(--win)':gf<ga?'var(--loss)':''},
        {v:cleanSheets,l:'Clean sheets',c:'var(--win)'},
      ].map(x=>`<div class="card" style="flex:1;min-width:72px;text-align:center;padding:10px 8px">
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:24px;color:${x.c||'var(--text-primary)'}">${x.v}</div>
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px">${x.l}</div>
      </div>`).join('')}
    </div>

    <!-- Per competitie breakdown -->
    ${compBreakdown.length>1?`<div class="card mb-12">
      <div class="card-title">Per competitie</div>
      <table class="data-table"><thead><tr>
        <th>Competitie</th><th class="num">G</th><th class="num">W</th><th class="num">G</th><th class="num">V</th>
        <th class="num">Voor</th><th class="num">Tegen</th><th class="num">Saldo</th>
      </tr></thead><tbody>
        ${compBreakdown.map(b=>`<tr>
          <td><span class="badge badge-${b.comp.type==='beker'?'beker':b.comp.type==='voorbereiding'?'voorbereiding':'competitie'}" style="font-size:9px">${b.comp.name}</span></td>
          <td class="num">${b.played}</td><td class="num" style="color:var(--win)">${b.w}</td>
          <td class="num" style="color:var(--draw)">${b.d}</td><td class="num" style="color:var(--loss)">${b.l}</td>
          <td class="num">${b.gf}</td><td class="num">${b.ga}</td>
          <td class="num" style="font-weight:700;color:${b.gf>b.ga?'var(--win)':b.gf<b.ga?'var(--loss)':''}">${b.gf-b.ga>=0?'+':''}${b.gf-b.ga}</td>
        </tr>`).join('')}
      </tbody></table>
    </div>`:''}

    <!-- Spelersstatistieken -->
    <div class="card mb-12" id="stats-player-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <div class="card-title" style="margin:0">Spelersstatistieken</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:11px;color:var(--text-muted)">Sorteren op:</span>
          <select class="form-select" id="stats-sort" style="height:28px;font-size:11px;padding:2px 8px" onchange="window._statsSortKey=this.value;renderStatsGroups(window._lastStatsPlayers,window._lastStatsAll)">
            <option value="appearances">W Wedstrijden</option>
            <option value="minutesPlayed">⏱ Minuten</option>
            <option value="goals">⚽ Goals</option>
            <option value="assists">🎯 Assists</option>
            <option value="yellowCards">🟨 Gele kaarten</option>
            <option value="redCards">🟥 Rode kaarten</option>
          </select>
        </div>
      </div>
      <div id="stats-groups-container">
        <p class="text-muted" style="font-size:12px;padding:8px 0">Nog geen statistieken — voer wedstrijdresultaten in.</p>
      </div>
    </div>
  `;

  // Save for re-use by sort dropdown
  window._lastStatsPlayers = players;
  window._lastStatsAll = allStats;
  if (!window._statsSortKey) window._statsSortKey = 'appearances';
  renderStatsGroups(players, allStats);
}

function renderStatsGroups(players, allStats) {
  const container = document.getElementById('stats-groups-container');
  if (!container) return;

  const sortKey = window._statsSortKey || 'appearances';
  const sortEl = document.getElementById('stats-sort');
  if (sortEl && sortEl.value !== sortKey) sortEl.value = sortKey;

  const posGroups = [
    {label:'Aanvallers', key:'Aanvaller'},
    {label:'Middenvelders', key:'Middenvelder'},
    {label:'Verdedigers', key:'Verdediger'},
    {label:'Keepers', key:'Keeper'},
  ];

  // Icons for filter options
  const icons = {appearances:'W', minutesPlayed:'⏱', goals:'⚽', assists:'🎯', yellowCards:'🟨', redCards:'🟥', motm:'🏆'};

  let rows = '';
  let anyData = false;

  posGroups.forEach(g => {
    let gPlayers = players.filter(p => p.position === g.key);
    if (!gPlayers.length) return;

    // Sort: primary = sortKey desc, secondary = appearances desc (so 0-stat players go below)
    gPlayers = gPlayers.sort((a,b) => {
      const av = allStats[a.id]?.[sortKey] || 0;
      const bv = allStats[b.id]?.[sortKey] || 0;
      if (bv !== av) return bv - av;
      // Tiebreak: more appearances first
      return (allStats[b.id]?.appearances||0) - (allStats[a.id]?.appearances||0);
    });

    const open = !window._statsGroupsClosed?.has(g.key);
    anyData = true;

    // Group header row
    rows += `<tr class="stats-group-header" onclick="toggleStatsGroup('${g.key}')" style="cursor:pointer;background:var(--bg-tertiary)">
      <td colspan="9" style="padding:7px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-secondary);user-select:none">
        ${g.label} <span style="color:var(--text-muted);font-weight:400">(${gPlayers.length})</span>
        <span style="float:right;transition:transform 0.15s;display:inline-block;${open?'':'transform:rotate(-90deg)'}" id="chevron-${g.key}">▾</span>
      </td>
    </tr>`;

    // Player rows
    gPlayers.forEach(p => {
      const st = allStats[p.id] || {};
      const noApps = !st.appearances;
      rows += `<tr class="stats-player-row-${g.key}" onclick="navigateToPlayer('${p.id}')"
        style="cursor:pointer;display:${open?'table-row':'none'};opacity:${noApps?'0.45':'1'}">
        <td><div style="display:flex;align-items:center;gap:8px">
          ${playerAvatarHTML(p,'player-avatar',24)}
          <span style="font-weight:600">${p.number?'<span class="text-muted" style="font-size:10px">#'+p.number+'</span> ':''}${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</span>
        </div></td>
        <td class="num">${st.appearances||0}</td>
        <td class="num">${st.starts||0}</td>
        <td class="num">${st.minutesPlayed||0}'</td>
        <td class="num" style="${(st.goals||0)>0?'font-weight:700;color:var(--cambuur-geel)':''}">${st.goals||0}</td>
        <td class="num">${st.assists||0}</td>
        <td class="num">${st.yellowCards||0}</td>
        <td class="num" style="${(st.redCards||0)>0?'color:var(--loss)':''}">${st.redCards||0}</td>
        <td class="num" style="${(st.motm||0)>0?'color:var(--draw)':''}">${st.motm||0}</td>
      </tr>`;
    });
  });

  if (!anyData) {
    container.innerHTML = '<p class="text-muted" style="font-size:12px;padding:8px 0">Nog geen statistieken — voer wedstrijdresultaten in.</p>';
    return;
  }

  container.innerHTML = `<table class="data-table" style="width:100%">
    <colgroup>
      <col style="width:auto">
      <col style="width:44px"><col style="width:44px"><col style="width:52px">
      <col style="width:44px"><col style="width:44px">
      <col style="width:44px"><col style="width:44px"><col style="width:44px">
    </colgroup>
    <thead><tr>
      <th>Speler</th>
      <th class="num" title="Wedstrijden gespeeld">W</th>
      <th class="num" title="Starts">S</th>
      <th class="num" title="Speelminuten">Min</th>
      <th class="num" title="Goals">⚽</th>
      <th class="num" title="Assists">🎯</th>
      <th class="num" title="Gele kaarten">🟨</th>
      <th class="num" title="Rode kaarten">🟥</th>
      <th class="num" title="Man of the Match">🏆</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function toggleStatsGroup(key) {
  if (!window._statsGroupsClosed) window._statsGroupsClosed = new Set();
  const isOpen = !window._statsGroupsClosed.has(key);
  const chevron = document.getElementById('chevron-' + key);
  document.querySelectorAll('.stats-player-row-' + key).forEach(r => {
    r.style.display = isOpen ? 'none' : 'table-row';
  });
  if (chevron) chevron.style.transform = isOpen ? 'rotate(-90deg)' : '';
  if (isOpen) window._statsGroupsClosed.add(key);
  else window._statsGroupsClosed.delete(key);
}

