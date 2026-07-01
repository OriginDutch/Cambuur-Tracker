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
  const camMatches=(S.matches||[]).filter(m=>m.seasonId===S.currentSeason&&(m.homeClubId===cam?.id||m.awayClubId===cam?.id));
  const played=camMatches.filter(m=>m.played);
  let wins=0,draws=0,losses=0,gf=0,ga=0,cleanSheets=0;
  played.forEach(m=>{
    const isCamHome=m.homeClubId===cam?.id;
    const cs=isCamHome?m.homeScore:m.awayScore;
    const os=isCamHome?m.awayScore:m.homeScore;
    if(cs>os)wins++; else if(cs===os)draws++; else losses++;
    gf+=cs; ga+=os;
    if(os===0) cleanSheets++;
  });

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

// ══════════════════════════════
// DELETE
// ══════════════════════════════
let pendingDel=null;
function confirmDelete(type,id,name){
  pendingDel={type,id};
  const msgs={club:`Club verwijderen: "${name}"? De club wordt ook uit alle competities verwijderd.`,stadion:`Stadion verwijderen: "${name}"?`,competition:`Competitie verwijderen: "${name}"? Alle wedstrijden in deze competitie worden ook verwijderd.`,season:`Seizoen verwijderen: "${name}"? Dit verwijdert ook alle gekoppelde competities.`};
  document.getElementById('confirm-title').textContent='Verwijdering bevestigen';
  document.getElementById('confirm-message').textContent=msgs[type]||`"${name}" verwijderen?`;
  document.getElementById('confirm-ok-btn').textContent='Verwijderen';
  document.getElementById('modal-confirm').classList.add('open');
}
function confirmDeleteAll(){
  pendingDel={type:'all'};
  document.getElementById('confirm-title').textContent='ALLE gegevens verwijderen';
  document.getElementById('confirm-message').textContent='Dit verwijdert permanent alle seizoenen, clubs, stadions, competities en wedstrijden. Dit kan niet ongedaan worden gemaakt.';
  document.getElementById('confirm-ok-btn').textContent='Alles verwijderen';
  document.getElementById('modal-confirm').classList.add('open');
}
document.getElementById('confirm-ok-btn').addEventListener('click',async()=>{
  if(!pendingDel)return;
  const{type,id}=pendingDel;
  if(type==='player'){
    await dbDel('players',id);S.players=(S.players||[]).filter(p=>p.id!==id);
    renderSelectie();renderArchief();
  } else if(type==='all'){
    for(const s of['settings','seasons','clubs','stadiums','competitions','players','matches','coaches'])await dbClr(s);
    S={lang:S.lang,theme:S.theme,currentSeason:null,seasons:[],clubs:[],stadiums:[],competitions:[]};
    renderSeasonSelect();renderCompetitionsNav();renderDashboard();renderSeasonsManage();
  }else if(type==='club'){
    await dbDel('clubs',id);S.clubs=S.clubs.filter(c=>c.id!==id);
    for(const comp of S.competitions){if((comp.clubIds||[]).includes(id)){comp.clubIds=comp.clubIds.filter(cid=>cid!==id);await dbPut('competitions',comp);}}
    renderClubsTable();renderCompetitionsNav();
  }else if(type==='stadion'){await dbDel('stadiums',id);S.stadiums=S.stadiums.filter(s=>s.id!==id);renderStadiumsTable();}
  else if(type==='competition'){await dbDel('competitions',id);S.competitions=S.competitions.filter(c=>c.id!==id);renderCompetitionsNav();renderCompetitionsPage();}
  else if(type==='season'){
    await dbDel('seasons',id);S.seasons=S.seasons.filter(s=>s.id!==id);
    const linked=S.competitions.filter(c=>c.seasonId===id);
    for(const c of linked)await dbDel('competitions',c.id);
    S.competitions=S.competitions.filter(c=>c.seasonId!==id);
    if(S.currentSeason===id){S.currentSeason=S.seasons[0]?.id||null;await saveSetting('currentSeason',S.currentSeason);}
    renderSeasonSelect();renderCompetitionsNav();renderSeasonsManage();renderDashboard();
  }
  closeModal('modal-confirm');showToast('Verwijderd','success');pendingDel=null;
});

// ══════════════════════════════
// THEME / LANG
// ══════════════════════════════
function applyTheme(t){document.documentElement.setAttribute('data-theme',t);}
async function toggleTheme(){S.theme=S.theme==='dark'?'light':'dark';applyTheme(S.theme);await saveSetting('theme',S.theme);}
async function setLanguage(lang){S.lang=lang;await saveSetting('lang',lang);}

// ══════════════════════════════
// EXPORT / IMPORT
// ══════════════════════════════
// File System Access API — permanente opslag
let _fsFileHandle = null;

async function fsPickFile() {
  if (!window.showSaveFilePicker) {
    showToast('File System API niet ondersteund in deze browser. Gebruik Chrome of Edge.', 'error');
    return;
  }
  try {
    _fsFileHandle = await window.showSaveFilePicker({
      suggestedName: 'cambuur_data.json',
      types: [{description: 'JSON', accept: {'application/json': ['.json']}}],
    });
    await saveSetting('fsFileName', _fsFileHandle.name);
    showToast('Bestand gekoppeld: ' + _fsFileHandle.name + ' — wordt automatisch opgeslagen bij wijzigingen', 'success');
    renderInstellingen();
  } catch(e) {
    if (e.name !== 'AbortError') showToast('Fout bij koppelen bestand: ' + e.message, 'error');
  }
}

async function fsWriteData() {
  if (!_fsFileHandle) return;
  try {
    const data = buildExportData();
    const writable = await _fsFileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  } catch(e) {
    console.warn('Autosave naar bestand mislukt:', e.message);
  }
}

async function fsLoadFile() {
  if (!window.showOpenFilePicker) {
    showToast('File System API niet ondersteund in deze browser.', 'error');
    return;
  }
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{description: 'JSON', accept: {'application/json': ['.json']}}],
    });
    _fsFileHandle = handle;
    const file = await handle.getFile();
    const text = await file.text();
    const input = {target: {files: [new File([text], file.name, {type:'application/json'})]}};
    await importData(input);
    showToast('Bestand geladen en gekoppeld: ' + file.name, 'success');
    renderInstellingen();
  } catch(e) {
    if (e.name !== 'AbortError') showToast('Fout: ' + e.message, 'error');
  }
}

function buildExportData() {
  return {version:1, exported:new Date().toISOString(), seasons:S.seasons, clubs:S.clubs,
    stadiums:S.stadiums, competitions:S.competitions, players:S.players||[],
    matches:S.matches||[], coaches:S.coaches||[]};
}

async function exportData(){
  const data = buildExportData();
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`cambuur_${new Date().toISOString().split('T')[0]}.json`;a.click();URL.revokeObjectURL(url);
  showToast('Gegevens geëxporteerd','success');
}
// ⚠️ LET OP — er is ook importDataObj() in gist.js. Dat is GEEN duplicaat
// dat je zomaar kunt samenvoegen: importData() hieronder is een "vervang
// alles"-restore vanaf een JSON-bestand (wist eerst seasons/clubs/stadiums/
// competitions), terwijl importDataObj() een "merge"-import is voor Gist-sync
// (wist niets vooraf). Bij wijzigen: check of beide functies nog het juiste
// gedrag hebben voor hún eigen use-case — niet automatisch synchroniseren.
async function importData(e){
  const file=e.target.files[0];if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    // Clear existing data first to avoid stale orphans
    for(const store of ['seasons','clubs','stadiums','competitions'])await dbClr(store);
    if(data.seasons){for(const s of data.seasons)await dbPut('seasons',s);S.seasons=data.seasons;}
    if(data.clubs){for(const c of data.clubs)await dbPut('clubs',c);S.clubs=data.clubs;}
    if(data.stadiums){for(const s of data.stadiums)await dbPut('stadiums',s);S.stadiums=data.stadiums;}
    if(data.competitions){for(const c of data.competitions)await dbPut('competitions',c);S.competitions=data.competitions;}
    if(data.players){for(const p of data.players)await dbPut('players',p);S.players=data.players;}
    if(data.matches){for(const m of data.matches)await dbPut('matches',m);S.matches=data.matches;}
    if(data.coaches){for(const c of data.coaches)await dbPut('coaches',c);S.coaches=data.coaches||[];}
    sortSeasons(S.seasons);
    // Always activate the first (most recent) imported season
    if(S.seasons.length>0){
      S.currentSeason=S.seasons[0].id;
      await saveSetting('currentSeason',S.currentSeason);
    }
    refreshAll();
    showToast('Import geslaagd — '+S.seasons.length+' seizoen(en), '+S.clubs.length+' clubs, '+S.competitions.length+' competitie(s)','success');
  }catch(err){console.error(err);showToast('Import mislukt: ongeldig bestand','error');}
  e.target.value='';
}

// ══════════════════════════════
// REFRESH ALL
// ══════════════════════════════
function refreshAll(){
  renderSeasonSelect();
  renderCompetitionsNav();
  renderDashboard();
  renderSeasonsManage();
  renderCompetitionsPage();
  // If we're on the clubs page, refresh that too
  if(document.getElementById('page-clubs').classList.contains('active'))renderClubsPage();
  if(document.getElementById('page-selectie').classList.contains('active'))renderSelectie();
  if(document.getElementById('page-statistieken').classList.contains('active'))renderStatistieken();
  // If we're on a competition detail, refresh it
  const activeComp=document.querySelector('.nav-item[data-comp].active');
  if(activeComp)renderCompDetail(activeComp.dataset.comp);
  // Update season select value
  document.getElementById('season-select').value=S.currentSeason||'';
}

// ══════════════════════════════
// TOAST / MODAL
// ══════════════════════════════
function showToast(msg,type='success'){
  const c=document.getElementById('toast-container');const t=document.createElement('div');
  t.className=`toast ${type}`;t.textContent=(type==='success'?'✓ ':'✕ ')+msg;
  c.appendChild(t);setTimeout(()=>t.remove(),3200);
}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));});
document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));



// ══════════════════════════════
// LANDEN LIJST
// ══════════════════════════════
// Nationaliteiten met vlaggen — {name, flag}
const LANDEN = [
  {name:'Nederlands', flag:'🇳🇱'},{name:'Belgisch', flag:'🇧🇪'},
  {name:'Duits', flag:'🇩🇪'},{name:'Frans', flag:'🇫🇷'},
  {name:'Spaans', flag:'🇪🇸'},{name:'Italiaans', flag:'🇮🇹'},
  {name:'Portugees', flag:'🇵🇹'},{name:'Engels', flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'},
  {name:'Schots', flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿'},{name:'Welsh', flag:'🏴󠁧󠁢󠁷󠁬󠁳󠁿'},
  {name:'Iers', flag:'🇮🇪'},{name:'Deens', flag:'🇩🇰'},
  {name:'Zweeds', flag:'🇸🇪'},{name:'Noors', flag:'🇳🇴'},
  {name:'Fins', flag:'🇫🇮'},{name:'IJslands', flag:'🇮🇸'},
  {name:'Oostenrijks', flag:'🇦🇹'},{name:'Zwitsers', flag:'🇨🇭'},
  {name:'Luxemburgs', flag:'🇱🇺'},{name:'Liechtensteins', flag:'🇱🇮'},
  {name:'Pools', flag:'🇵🇱'},{name:'Tsjechisch', flag:'🇨🇿'},
  {name:'Slowaaks', flag:'🇸🇰'},{name:'Hongaars', flag:'🇭🇺'},
  {name:'Roemeens', flag:'🇷🇴'},{name:'Bulgaars', flag:'🇧🇬'},
  {name:'Kroatisch', flag:'🇭🇷'},{name:'Servisch', flag:'🇷🇸'},
  {name:'Sloveens', flag:'🇸🇮'},{name:'Bosnisch', flag:'🇧🇦'},
  {name:'Montenegrijns', flag:'🇲🇪'},{name:'Macedonisch', flag:'🇲🇰'},
  {name:'Albanees', flag:'🇦🇱'},{name:'Kosovaars', flag:'🇽🇰'},
  {name:'Grieks', flag:'🇬🇷'},{name:'Cypriotisch', flag:'🇨🇾'},
  {name:'Maltees', flag:'🇲🇹'},{name:'Turks', flag:'🇹🇷'},
  {name:'Russisch', flag:'🇷🇺'},{name:'Oekraïens', flag:'🇺🇦'},
  {name:'Wit-Russisch', flag:'🇧🇾'},{name:'Moldavisch', flag:'🇲🇩'},
  {name:'Georgisch', flag:'🇬🇪'},{name:'Armeens', flag:'🇦🇲'},
  {name:'Azerbeidzjaans', flag:'🇦🇿'},{name:'Kazachs', flag:'🇰🇿'},
  {name:'Lets', flag:'🇱🇻'},{name:'Litouws', flag:'🇱🇹'},
  {name:'Ests', flag:'🇪🇪'},
  {name:'Amerikaans', flag:'🇺🇸'},{name:'Canadees', flag:'🇨🇦'},
  {name:'Mexicaans', flag:'🇲🇽'},{name:'Braziliaans', flag:'🇧🇷'},
  {name:'Argentijns', flag:'🇦🇷'},{name:'Colombiaans', flag:'🇨🇴'},
  {name:'Chileens', flag:'🇨🇱'},{name:'Uruguayaans', flag:'🇺🇾'},
  {name:'Ecuadoriaans', flag:'🇪🇨'},{name:'Venezolaans', flag:'🇻🇪'},
  {name:'Peruaans', flag:'🇵🇪'},{name:'Boliviaans', flag:'🇧🇴'},
  {name:'Paraguayaans', flag:'🇵🇾'},{name:'Costa Ricaans', flag:'🇨🇷'},
  {name:'Jamaicaans', flag:'🇯🇲'},{name:'Trinidadiaans', flag:'🇹🇹'},
  {name:'Haïtiaans', flag:'🇭🇹'},{name:'Hondurees', flag:'🇭🇳'},
  {name:'Japans', flag:'🇯🇵'},{name:'Koreaans', flag:'🇰🇷'},
  {name:'Chinees', flag:'🇨🇳'},{name:'Indonesisch', flag:'🇮🇩'},
  {name:'Australisch', flag:'🇦🇺'},{name:'Nieuw-Zeelands', flag:'🇳🇿'},
  {name:'Marokkaans', flag:'🇲🇦'},{name:'Algerijns', flag:'🇩🇿'},
  {name:'Tunesisch', flag:'🇹🇳'},{name:'Egyptisch', flag:'🇪🇬'},
  {name:'Libisch', flag:'🇱🇾'},{name:'Senegalees', flag:'🇸🇳'},
  {name:'Ivoriaans', flag:'🇨🇮'},{name:'Ghanees', flag:'🇬🇭'},
  {name:'Nigeriaans', flag:'🇳🇬'},{name:'Kameroenees', flag:'🇨🇲'},
  {name:'Congolees', flag:'🇨🇩'},{name:'Malinees', flag:'🇲🇱'},
  {name:'Guinees', flag:'🇬🇳'},{name:'Burkinabes', flag:'🇧🇫'},
  {name:'Beninees', flag:'🇧🇯'},{name:'Togolees', flag:'🇹🇬'},
  {name:'Gaboens', flag:'🇬🇦'},{name:'Zambiaans', flag:'🇿🇲'},
  {name:'Zimbabwaans', flag:'🇿🇼'},{name:'Zuid-Afrikaans', flag:'🇿🇦'},
  {name:'Mozambicaans', flag:'🇲🇿'},{name:'Angolees', flag:'🇦🇴'},
  {name:'Tanzaniaans', flag:'🇹🇿'},{name:'Keniaans', flag:'🇰🇪'},
  {name:'Ugandees', flag:'🇺🇬'},{name:'Ethiopisch', flag:'🇪🇹'},
  {name:'Somalisch', flag:'🇸🇴'},{name:'Soedanees', flag:'🇸🇩'},
  {name:'Kaapverdiaans', flag:'🇨🇻'},{name:'Surinaams', flag:'🇸🇷'},
  {name:'Curaçaos', flag:'🇨🇼'},{name:'Arubaans', flag:'🇦🇼'},
  {name:'Israëlisch', flag:'🇮🇱'},{name:'Iraans', flag:'🇮🇷'},
  {name:'Irakees', flag:'🇮🇶'},{name:'Syrisch', flag:'🇸🇾'},
  {name:'Libanees', flag:'🇱🇧'},{name:'Jordaans', flag:'🇯🇴'},
  {name:'Saoedi-Arabisch', flag:'🇸🇦'},{name:'Emiratisch', flag:'🇦🇪'},
];


function natFlag(name) {
  if (!name) return '';
  const l = LANDEN.find(x => x.name === name);
  return l?.flag ? l.flag + ' ' : '';
}
function populateNatDropdown(selected) {
  const sel = document.getElementById('player-nationality');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Selecteer —</option>';
  // Nederland eerst
  const ned = document.createElement('option');
  ned.value = 'Nederlands'; ned.textContent = '🇳🇱 Nederlands'; ned.label = 'Nederlands';
  if (selected === 'Nederlands') ned.selected = true;
  sel.appendChild(ned);
  // Scheidingslijn
  const sep = document.createElement('option'); sep.disabled = true; sep.textContent = '──────────'; sel.appendChild(sep);
  // Rest alfabetisch op naam
  const rest = LANDEN.filter(l => l.name !== 'Nederlands')
    .sort((a,b) => a.name.localeCompare(b.name,'nl'));
  rest.forEach(l => {
    const o = document.createElement('option');
    o.value = l.name;
    o.textContent = l.flag ? `${l.flag} ${l.name}` : l.name;
    o.label = l.name; // zonder emoji voor browser keyboard search
    if (l.name === selected) o.selected = true;
    sel.appendChild(o);
  });
}

// ══════════════════════════════
// SPARKLINE
// ══════════════════════════════
function renderSparkline(history, width, height) {
  if (!history || history.length < 2) return '';
  const vals = [...history].reverse().map(e => e.amount);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = vals[vals.length-1], first = vals[0];
  const color = last >= first ? 'var(--win)' : 'var(--loss)';
  return `<svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// ══════════════════════════════
// MARKTWAARDE TOTALEN
// ══════════════════════════════
function calcValueTotals(players) {
  // Seizoensgroei = verschil tussen meest recente waarde en
  // eerste waarde VOOR het huidige seizoen (of de oudste als alles binnen seizoen valt)
  const season = S.seasons.find(s => s.id === S.currentSeason);
  const seasonStart = season ? new Date(season.year + '-07-01') : null;

  let total = 0, prev = 0, count = 0;
  players.forEach(p => {
    if (!p.valueHistory?.length) return;
    total += p.valueHistory[0].amount;
    count++;
    if (p.valueHistory.length > 1 && seasonStart) {
      // Find the last value BEFORE the current season started
      const beforeSeason = p.valueHistory.find(e => new Date(e.date) < seasonStart);
      if (beforeSeason) {
        prev += beforeSeason.amount;
      } else {
        // All values are within this season — use oldest as baseline
        prev += p.valueHistory[p.valueHistory.length - 1].amount;
      }
    } else if (p.valueHistory.length > 1) {
      prev += p.valueHistory[1].amount;
    } else {
      prev += p.valueHistory[0].amount;
    }
  });
  return { total, prev, growth: total - prev, count };
}

function formatGrowth(growth) {
  if (!growth) return '<span class="value-trend-flat">—</span>';
  const sign = growth > 0 ? '+' : '';
  const cls = growth > 0 ? 'value-trend-up' : 'value-trend-down';
  const arrow = growth > 0 ? '▲' : '▼';
  return `<span class="${cls}">${arrow} ${sign}${formatEuro(growth)}</span>`;
}

function calcTransferBalance(players) {
  let inTotal = 0, outTotal = 0, inCount = 0, outCount = 0;
  players.forEach(p => {
    const bf = parseFloat(p.buyFee)||0;
    const sf = parseFloat(p.sellFee)||0;
    if (bf > 0) { inTotal += bf; inCount++; }
    if (sf > 0) { outTotal += sf; outCount++; }
  });
  return { inTotal, outTotal, profit: outTotal - inTotal, inCount, outCount };
}

// ══════════════════════════════
// CONTRACTWAARSCHUWING
// ══════════════════════════════
function contractWarning(p, seasonRange) {
  if (!p.contract) return '';
  const today = new Date().toISOString().split('T')[0];
  // Contract loopt af op of na seizoenseinde → geen waarschuwing vanuit dit seizoen
  if (seasonRange && p.contract >= seasonRange.end) return '';
  // Historisch seizoen (al voorbij): gebruik seizoenseinde als referentie
  // Huidig/toekomstig seizoen: gebruik vandaag
  const isHistorical = seasonRange && seasonRange.end < today;
  const refDate = isHistorical ? new Date(seasonRange.end) : new Date();
  const diff = new Date(p.contract) - refDate;
  const months = diff / (1000 * 60 * 60 * 24 * 30);
  if (months < 0) return '<span class="badge badge-contract-warn">⚠ Verlopen</span>';
  if (months < 6) return '<span class="badge badge-contract-warn">⚠ < 6 mnd</span>';
  return '';
}

// ══════════════════════════════
// WAARDE GRAFIEK (volledig)
// ══════════════════════════════
function renderValueChart(history, containerId) {
  const el = document.getElementById(containerId);
  if (!el || !history || history.length < 2) {
    if (el) el.innerHTML = '<p class="text-muted" style="font-size:11px">Minimaal 2 meetpunten nodig voor grafiek.</p>';
    return;
  }
  const sorted = [...history].reverse();
  const vals = sorted.map(e => e.amount);
  const dates = sorted.map(e => e.date);
  const min = Math.min(...vals) * 0.95;
  const max = Math.max(...vals) * 1.05;
  const range = max - min || 1;
  const W = 500, H = 100, PADL = 8, PADR = 8, PADT = 12, PADB = 8;
  const pts = vals.map((v, i) => {
    const x = PADL + (i / (vals.length - 1)) * (W - PADL - PADR);
    const y = PADT + (1 - (v - min) / range) * (H - PADT - PADB);
    return { x, y, v, d: dates[i] };
  });
  const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const last = vals[vals.length-1], first = vals[0];
  const color = last >= first ? '#22c55e' : '#ef4444';
  const fillPts = `${pts[0].x.toFixed(1)},${H} ` + polyline + ` ${pts[pts.length-1].x.toFixed(1)},${H}`;
  const tooltipId = containerId + '-tip';

  // Value table — newest first
  const tableRows = [...history].map((e, i) => {
    const prev = history[i + 1];
    const diff = prev ? e.amount - prev.amount : null;
    const diffStr = diff !== null
      ? `<span style="color:${diff>=0?'#22c55e':'#ef4444'};font-size:10px">${diff>=0?'+':''}${formatEuro(diff)}</span>`
      : '<span style="font-size:10px;color:var(--text-muted)">—</span>';
    const dateStr = e.date ? new Date(e.date).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'}) : '—';
    return `<tr>
      <td style="padding:3px 6px 3px 0;font-size:11px;color:var(--text-muted);white-space:nowrap">${dateStr}</td>
      <td style="padding:3px 6px;font-size:11px;font-weight:600;white-space:nowrap">${formatEuro(e.amount)}</td>
      <td style="padding:3px 0;text-align:right">${diffStr}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div style="display:flex;gap:12px;align-items:flex-start">
      <div style="flex:0 0 50%;position:relative">
        <div id="${tooltipId}" style="position:absolute;background:var(--bg-modal);border:1px solid var(--border);border-radius:4px;padding:5px 8px;font-size:11px;pointer-events:none;display:none;z-index:100;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>
        <svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="overflow:hidden;display:block;border-radius:6px;background:var(--bg-tertiary)">
          <defs>
            <linearGradient id="vgrad_${containerId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
            </linearGradient>
            <clipPath id="clip_${containerId}"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath>
          </defs>
          <polygon points="${fillPts}" fill="url(#vgrad_${containerId})" clip-path="url(#clip_${containerId})"/>
          <polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" clip-path="url(#clip_${containerId})"/>
          ${pts.map(p => `<circle
            cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${color}" stroke="var(--bg-modal)" stroke-width="1.5"
            style="cursor:pointer"
            onmouseenter="showChartTip(event,'${tooltipId}','${formatEuro(p.v)}','${p.d}')"
            onmouseleave="document.getElementById('${tooltipId}').style.display='none'"
          />`).join('')}
        </svg>
      </div>
      <div style="flex:1;max-height:120px;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse">
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>`;

  el.style.position = 'relative';
}

function showChartTip(event, tipId, val, date) {
  const tip = document.getElementById(tipId);
  if (!tip) return;
  tip.innerHTML = `<strong>${val}</strong> <span style="color:var(--text-muted)">${date}</span>`;
  tip.style.display = 'block';
  const rect = tip.parentElement.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  tip.style.left = Math.min(x + 10, rect.width - 140) + 'px';
  tip.style.top = Math.max(y - 30, 0) + 'px';
}

// ══════════════════════════════
// SUBPOSITIES
// ══════════════════════════════
const SUBPOS = {
  Keeper: ['Keeper','Uitkomende Keeper'],
  Verdediger: ['Centrale Verdediger','Libero','Linksback','Rechtsback','Linker Wingback','Rechter Wingback','Sweeper'],
  Middenvelder: ['Verdedigende Middenvelder','Centrale Middenvelder','Aanvallende Middenvelder','Linker Middenvelder','Rechter Middenvelder','Box-to-box Middenvelder','Regisseur','Nummer 10'],
  Aanvaller: ['Spits','Tweede Spits','Valse Negen','Linksbuiten','Rechtsbuiten','Schaduwspits','Buitenspeler']
};
// All subpos options grouped — free selection regardless of main position
const ALL_SUBPOS_GROUPED = [
  { group: 'Keeper', opts: SUBPOS.Keeper },
  { group: 'Verdediger', opts: SUBPOS.Verdediger },
  { group: 'Middenvelder', opts: SUBPOS.Middenvelder },
  { group: 'Aanvaller', opts: SUBPOS.Aanvaller },
];

let selectedSubpos = [];
let currentValueEntries = []; // temp storage while modal is open
let playerViewMode = 'kaart';
let playerSortMode = 'positie';
let showVertrokken = false;
let vertrokkenMixed = false; // true = gemengd met actief
let collapsedGroups = new Set();
let allGroupsCollapsed = false;

function updateSubposOptions(keepSelected) {
  const pos = document.getElementById('player-position').value;
  if (!keepSelected) selectedSubpos = [];
  const dropdown = document.getElementById('subpos-dropdown');
  const display = document.getElementById('subpos-display');
  dropdown.innerHTML = '';
  dropdown.classList.remove('open');
  if (!pos) {
    display.innerHTML = '<span style="color:var(--text-muted);font-size:13px">Selecteer hoofdpositie eerst</span>';
    return;
  }
  ALL_SUBPOS_GROUPED.forEach(group => {
    // Group header
    const hdr = document.createElement('div');
    hdr.style.cssText = 'padding:4px 10px 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);background:var(--bg-secondary);margin-top:4px';
    hdr.textContent = group.group;
    if (group.group === pos) hdr.style.color = 'var(--cambuur-geel)';
    dropdown.appendChild(hdr);
    group.opts.forEach(o => {
      const div = document.createElement('div');
      div.className = 'multiselect-option' + (selectedSubpos.includes(o) ? ' selected' : '');
      div.dataset.val = o;
      const tick = document.createElement('span');
      tick.style.cssText = 'width:14px;opacity:' + (selectedSubpos.includes(o) ? '1' : '0');
      tick.textContent = '✓';
      div.appendChild(tick);
      div.appendChild(document.createTextNode(' ' + o));
      div.onclick = () => toggleSubpos(o, div);
      dropdown.appendChild(div);
    });
  });
  renderSubposDisplay();
}

function toggleSubpos(val, el) {
  if (selectedSubpos.includes(val)) {
    selectedSubpos = selectedSubpos.filter(s => s !== val);
    el.classList.remove('selected');
    el.querySelector('span').style.opacity = '0';
  } else {
    selectedSubpos.push(val);
    el.classList.add('selected');
    el.querySelector('span').style.opacity = '1';
  }
  renderSubposDisplay();
}

function renderSubposDisplay() {
  const display = document.getElementById('subpos-display');
  if (!selectedSubpos.length) {
    display.innerHTML = '<span style="color:var(--text-muted);font-size:13px">Kies subpositie(s)...</span>';
  } else {
    display.innerHTML = selectedSubpos.map(s =>
      `<span class="subpos-tag">${s}</span>`).join('');
  }
}

function toggleSubposDropdown() {
  const dd = document.getElementById('subpos-dropdown');
  dd.classList.toggle('open');
}

document.addEventListener('click', e => {
  const wrap = document.getElementById('subpos-wrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('subpos-dropdown')?.classList.remove('open');
  }
});
