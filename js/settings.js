
// ══════════════════════════════
// SEASONS
// ══════════════════════════════
function renderSeasonSelect(){
  const sel=document.getElementById('season-select');
  sel.innerHTML=S.seasons.length===0?'<option value="">— Geen seizoen —</option>':'';
  S.seasons.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.name;if(s.id===S.currentSeason)o.selected=true;sel.appendChild(o);});
}
async function switchSeason(id){
  S.currentSeason=id||null;
  await saveSetting('currentSeason',S.currentSeason);
  renderCompetitionsNav();
  renderDashboard();
  // Re-render whichever page is currently open
  const activePage = document.querySelector('.page.active')?.id?.replace('page-','');
  if (activePage === 'selectie') renderSelectie();
  else if (activePage === 'statistieken') renderStatistieken();
  else if (activePage === 'vergelijking') renderVergelijking();
  else if (activePage === 'coaches') renderCoachesPage();
  else if (activePage === 'competitions') renderCompetitionsPage();
  else if (activePage === 'speler' && window._currentPlayerId) renderPlayerPage(window._currentPlayerId);
  else if (activePage === 'wedstrijd') navigateBack();
  // Competition detail pages re-render via renderCompetitionsNav which updates the nav;
  // also re-render if a comp detail is visible
  const activeComp = document.querySelector('.nav-item[data-comp].active');
  if (activeComp) navigateToComp(activeComp.dataset.comp);
}

function renderSeasonsManage(){
  const el=document.getElementById('seasons-manage-list');if(!el)return;
  if(S.seasons.length===0){el.innerHTML='<p class="text-muted" style="font-size:12px;padding:8px 0">Nog geen seizoenen.</p>';return;}
  el.innerHTML=S.seasons.map((s,i)=>`
    <div class="settings-row" style="gap:6px;padding:8px 0">
      <div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0">
        <button class="icon-btn" style="height:22px;padding:0 5px" onclick="moveSeasonTop('${s.id}')" ${i===0?'disabled':''} title="Helemaal omhoog"><span style="display:flex;flex-direction:column;align-items:center;line-height:0.55;font-size:11px">▲▲</span></button>
        <button class="icon-btn" style="height:22px;padding:0 5px;font-size:11px" onclick="moveSeasonUp('${s.id}')" ${i===0?'disabled':''} title="Omhoog">▲</button>
        <button class="icon-btn" style="height:22px;padding:0 5px;font-size:11px" onclick="moveSeasonDown('${s.id}')" ${i===S.seasons.length-1?'disabled':''} title="Omlaag">▼</button>
        <button class="icon-btn" style="height:22px;padding:0 5px" onclick="moveSeasonBottom('${s.id}')" ${i===S.seasons.length-1?'disabled':''} title="Helemaal omlaag"><span style="display:flex;flex-direction:column;align-items:center;line-height:0.55;font-size:11px">▼▼</span></button>
      </div>
      <div style="flex:1;min-width:0">
        <div class="settings-row-label" style="${s.hidden?'opacity:0.45':''}">${s.name}</div>
        <div class="settings-row-desc">${s.year}${s.hidden?' · verborgen in zijbalk':''}</div>
      </div>
      <div class="action-btns" style="flex-shrink:0">
        ${s.id===S.currentSeason?'<span class="badge badge-active" style="font-size:10px">Actief</span>':`<button class="btn btn-ghost" style="font-size:11px;padding:3px 8px" onclick="setActiveSeason('${s.id}')">Activeer</button>`}
        <button class="btn btn-ghost" style="font-size:11px;padding:3px 8px" onclick="toggleSeasonVisible('${s.id}')" title="${s.hidden?'Tonen in zijbalk':'Verbergen uit zijbalk'}">${s.hidden?'👁':'🚫'}</button>
        <button class="icon-btn" onclick="openSeasonModal('${s.id}')" title="Bewerken">✏️</button>
        <button class="icon-btn danger" onclick="confirmDelete('season','${s.id}','${s.name}')" title="Verwijderen">🗑️</button>
      </div>
    </div>`).join('');
}
async function setActiveSeason(id){S.currentSeason=id;await saveSetting('currentSeason',id);document.getElementById('season-select').value=id;renderCompetitionsNav();renderSeasonsManage();renderDashboard();}


function seasonNameAutoFill() {
  const name = document.getElementById('season-name').value.trim();
  const m = name.match(/^(\d{4})/);
  if (!m) return;
  const year = parseInt(m[1]);
  // Only auto-fill if fields are empty or match previous auto-fill
  const startEl = document.getElementById('season-start');
  const endEl = document.getElementById('season-end');
  startEl.value = `${year}-07-01`;
  endEl.value = `${year + 1}-06-30`;
}
function openSeasonModal(editId){
  document.getElementById('edit-season-id').value=editId||'';
  const isEdit=!!editId;
  document.getElementById('modal-season-title').textContent=isEdit?'Seizoen bewerken':'Nieuw seizoen';
  document.getElementById('copy-squad-wrap').style.display=isEdit?'none':'block';
  if(isEdit){
    const s=S.seasons.find(x=>x.id===editId);if(!s)return;
    document.getElementById('season-name').value=s.name;
    document.getElementById('season-start').value=s.startDate||'';
    document.getElementById('season-end').value=s.endDate||'';
    if(!s.startDate) seasonNameAutoFill();
  }
  else{document.getElementById('season-name').value='';document.getElementById('season-start').value='';document.getElementById('season-end').value='';
    const sel=document.getElementById('copy-squad-from');sel.innerHTML='<option value="">— Geen (begin vers) —</option>';
    S.seasons.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.name;sel.appendChild(o);});
  }
  document.getElementById('modal-season').classList.add('open');
}

async function saveInlineSeason(){
  const name=document.getElementById('inline-season-name').value.trim();
  const year=parseInt(document.getElementById('inline-season-year').value)||new Date().getFullYear();
  if(!name){showToast('Voer een seizoensnaam in','error');return;}
  const id='season_'+Date.now();
  const season={id,name,year,created:Date.now()};
  await dbPut('seasons',season);
  S.seasons.push(season);
  if(!S.currentSeason){S.currentSeason=id;await saveSetting('currentSeason',id);}
  S.seasons.sort((a,b)=>{ if(a.sortOrder!=null&&b.sortOrder!=null)return a.sortOrder-b.sortOrder; if(a.sortOrder!=null)return -1; if(b.sortOrder!=null)return 1; const ay=parseInt(a.name?.match(/^(\d{4})/)?.[1]||a.year||0); const by=parseInt(b.name?.match(/^(\d{4})/)?.[1]||b.year||0); return by-ay; });
  document.getElementById('inline-season-name').value='';
  document.getElementById('inline-season-year').value='';
  document.getElementById('inline-season-form').style.display='none';
  renderSeasonSelect();renderSeasonsManage();renderCompetitionsNav();renderDashboard();
  showToast('Seizoen aangemaakt: '+name,'success');
}
async function saveSeason(){
  const name=document.getElementById('season-name').value.trim();
  const year=parseInt(document.getElementById('season-year').value)||new Date().getFullYear();
  if(!name){showToast('Voer een seizoensnaam in','error');return;}
  const existing=document.getElementById('edit-season-id').value;
  const id=existing||'season_'+Date.now();
  const startDate = document.getElementById('season-start').value||null;
  const endDate = document.getElementById('season-end').value||null;
  const season={id,name,year,startDate,endDate,created:existing?(S.seasons.find(s=>s.id===existing)?.created||Date.now()):Date.now()};
  await dbPut('seasons',season);
  if(existing){const i=S.seasons.findIndex(s=>s.id===existing);if(i>=0)S.seasons[i]=season;}
  else{S.seasons.push(season);if(!S.currentSeason){S.currentSeason=id;await saveSetting('currentSeason',id);}}
  S.seasons.sort((a,b)=>{ if(a.sortOrder!=null&&b.sortOrder!=null)return a.sortOrder-b.sortOrder; if(a.sortOrder!=null)return -1; if(b.sortOrder!=null)return 1; const ay=parseInt(a.name?.match(/^(\d{4})/)?.[1]||a.year||0); const by=parseInt(b.name?.match(/^(\d{4})/)?.[1]||b.year||0); return by-ay; });
  renderSeasonSelect();renderSeasonsManage();renderCompetitionsNav();renderDashboard();
  closeModal('modal-season');showToast('Seizoen opgeslagen: '+name,'success');
}

// ══════════════════════════════
// CLUBS
// ══════════════════════════════
function renderClubsPage(){renderClubsTable();renderStadiumsTable();renderDivisionsSettings();}
if (!window._clubSort) window._clubSort = {key:'name', dir:1};
function renderDivisionsSettings() {
  const el = document.getElementById('divisions-settings-list');
  if (!el) return;
  const divisions = getPrefs().divisions || [];
  const counts = {};
  divisions.forEach(d => counts[d] = 0);
  let unknownCount = 0;
  (S.clubs||[]).forEach(c => {
    const d = effectiveDivision(c);
    if (d && counts[d] !== undefined) counts[d]++;
    else unknownCount++;
  });
  el.innerHTML = divisions.map((d,i) => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg-tertiary);border-radius:var(--radius-sm);margin-bottom:4px">
      <span style="flex:1;font-size:13px">${d}</span>
      <span style="font-size:11px;color:var(--text-muted)">${counts[d]} club${counts[d]!==1?'s':''}</span>
      <button class="icon-btn" style="height:24px" onclick="moveDivision(${i},-1)" ${i===0?'disabled':''}>▲</button>
      <button class="icon-btn" style="height:24px" onclick="moveDivision(${i},1)" ${i===divisions.length-1?'disabled':''}>▼</button>
      <button class="icon-btn danger" style="height:24px" onclick="removeDivision(${i})">✕</button>
    </div>`).join('') + `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;margin-top:2px;font-size:11px;color:var(--text-muted)">
      <span style="flex:1">Onbekend niveau</span>
      <span>${unknownCount} club${unknownCount!==1?'s':''}</span>
    </div>
    <div style="display:flex;gap:6px;margin-top:12px">
      <input class="form-input" id="new-division-name" placeholder="Nieuwe divisie, bv. Eredivisie" style="flex:1"
        onkeydown="if(event.key==='Enter')addDivisionToList()">
      <button class="btn btn-secondary" onclick="addDivisionToList()">+ Toevoegen</button>
    </div>`;
}

async function addDivisionToList() {
  const input = document.getElementById('new-division-name');
  const name = input.value.trim();
  if (!name) return;
  const divisions = getPrefs().divisions || [];
  if (divisions.some(d=>d.toLowerCase()===name.toLowerCase())) { showToast('Deze divisie bestaat al', 'error'); return; }
  await savePref('divisions', [...divisions, name]);
  input.value = '';
  renderDivisionsSettings();
}

async function removeDivision(idx) {
  const divisions = [...(getPrefs().divisions||[])];
  const removed = divisions[idx];
  if (!confirm(`Divisie "${removed}" verwijderen? Clubs met deze divisie in hun historie vallen terug naar 'Onbekend niveau' in overzichten (de historie-ingang zelf blijft bestaan).`)) return;
  divisions.splice(idx, 1);
  await savePref('divisions', divisions);
  renderDivisionsSettings();
  renderClubsTable();
}

async function moveDivision(idx, dir) {
  const divisions = [...(getPrefs().divisions||[])];
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= divisions.length) return;
  [divisions[idx], divisions[newIdx]] = [divisions[newIdx], divisions[idx]];
  await savePref('divisions', divisions);
  renderDivisionsSettings();
  renderClubsTable();
}

function setClubSort(key){
  if (window._clubSort && window._clubSort.key===key) window._clubSort.dir*=-1;
  else window._clubSort = {key, dir:1};
  renderClubsTable();
}
function setClubSortManual(){
  window._clubSort = null;
  renderClubsTable();
}

// Bouwt de groepen (per divisie in ingestelde volgorde + Onbekend niveau) op basis
// van de huidige (evt. gefilterde) clublijst. Losstaande functie zodat drag-and-drop
// exact dezelfde indeling kan herberekenen als de render zelf.
function buildClubGroups(list){
  const divisions = getPrefs().divisions || [];
  const groups = divisions.map(d => ({
    key: 'div:'+d, label: d,
    clubs: list.filter(c => effectiveDivision(c) === d)
  })).filter(g => g.clubs.length);
  const unknown = list.filter(c => !divisions.includes(effectiveDivision(c)));
  if (unknown.length) groups.push({key:'unknown', label:'Onbekend niveau', clubs: unknown});
  return groups;
}

// Sorteert clubs binnen één groep: eigen club altijd eerst, daarna kolomsortering
// of (in handmatige modus) de opgeslagen sortOrder.
function sortClubsInGroup(clubs){
  const cs = window._clubSort;
  const stadName=c=>S.stadiums.find(s=>s.id===c.stadiumId)?.name||'';
  const sortVal=c=>{
    if(!cs) return 0;
    if(cs.key==='abbr')return (c.abbr||'').toLowerCase();
    if(cs.key==='city')return (c.city||'').toLowerCase();
    if(cs.key==='stadium')return stadName(c).toLowerCase();
    if(cs.key==='capacity'){const cap=S.stadiums.find(s=>s.id===c.stadiumId)?.capacity;return cap==null?-1:cap;}
    if(cs.key==='highlight')return c.highlight||'zzz';
    return (c.name||'').toLowerCase();
  };
  return [...clubs].sort((a,b)=>{
    if (a.isOwnClub && !b.isOwnClub) return -1;
    if (b.isOwnClub && !a.isOwnClub) return 1;
    if (!cs) { // handmatige modus
      const oa = a.sortOrder ?? Infinity, ob = b.sortOrder ?? Infinity;
      return oa - ob;
    }
    const va=sortVal(a), vb=sortVal(b);
    return va<vb?-1*cs.dir:va>vb?1*cs.dir:0;
  });
}

let _clubDragCtx = null;
function clubDragStart(groupKey, idx){ _clubDragCtx = {group:groupKey, idx}; }
function clubDragOver(ev){ ev.preventDefault(); }
async function clubDrop(groupKey, idx){
  if (!_clubDragCtx || _clubDragCtx.group !== groupKey || _clubDragCtx.idx === idx) { _clubDragCtx=null; return; }
  const q=(document.getElementById('club-search')?.value||'').toLowerCase();
  const list=S.clubs.filter(c=>!q||c.name.toLowerCase().includes(q)||(c.city||'').toLowerCase().includes(q));
  const group = buildClubGroups(list).find(g=>g.key===groupKey);
  if (!group) { _clubDragCtx=null; return; }
  // Eigen club telt niet mee in de sleepvolgorde (staat altijd los vast bovenaan)
  const draggable = sortClubsInGroup(group.clubs).filter(c=>!c.isOwnClub);
  const fromIdx = _clubDragCtx.idx, toIdx = idx;
  if (fromIdx<0||fromIdx>=draggable.length||toIdx<0||toIdx>=draggable.length) { _clubDragCtx=null; return; }
  const [moved] = draggable.splice(fromIdx,1);
  draggable.splice(toIdx,0,moved);
  for (let i=0;i<draggable.length;i++){
    draggable[i].sortOrder = i;
    await dbPut('clubs', draggable[i]);
  }
  _clubDragCtx=null;
  renderClubsTable();
}

function renderClubsTable(){
  const wrap=document.getElementById('clubs-table-wrap');
  const q=(document.getElementById('club-search')?.value||'').toLowerCase();
  const list=S.clubs.filter(c=>!q||c.name.toLowerCase().includes(q)||(c.city||'').toLowerCase().includes(q));
  if(!list.length){wrap.innerHTML='<div class="empty-state"><div class="empty-state-icon">🏟️</div><div class="empty-state-title">Nog geen clubs</div><div class="empty-state-desc">Voeg clubs toe om te beginnen.</div></div>';return;}
  const hl={rivaal:'<span class="badge badge-rival">🔴 Rivaal</span>',interessant:'<span class="badge badge-interesting">⭐ Interessant</span>'};

  const cs = window._clubSort; // {key,dir} of null (= handmatige modus)
  const groups = buildClubGroups(list).map(g => ({...g, clubs: sortClubsInGroup(g.clubs)}));

  const arrow = k => cs && cs.key===k ? (cs.dir===1?' ▲':' ▼') : '';
  const th = (k,label,width) => `<th style="cursor:pointer;user-select:none${width?';width:'+width:''}" onclick="setClubSort('${k}')">${label}${arrow(k)}</th>`;

  const rowsHtml = (groupKey, clubs) => {
    let dragIdx = 0; // index binnen de sleepbare (niet-eigen-club) subset
    return clubs.map(c=>{
      const stad=S.stadiums.find(s=>s.id===c.stadiumId);
      const div=effectiveDivision(c);
      const isManual = !cs;
      const canDrag = isManual && !c.isOwnClub;
      const myDragIdx = canDrag ? dragIdx++ : null;
      const dragAttrs = canDrag
        ? `draggable="true" ondragstart="clubDragStart('${groupKey}',${myDragIdx})" ondragover="clubDragOver(event)" ondrop="clubDrop('${groupKey}',${myDragIdx})"`
        : '';
      const ownBg = c.isOwnClub ? 'background:rgba(232,124,42,0.12);' : '';
      const rivalBorder = c.highlight==='rivaal'?'border-left:2px solid var(--heerenveen-rood);':c.highlight==='interessant'?'border-left:2px solid var(--interessant);':'';
      return `<tr ${dragAttrs} style="${ownBg}${rivalBorder}${canDrag?'cursor:grab;':''}">
        <td>${canDrag?'<span style="color:var(--text-muted);margin-right:4px" title="Sleep om te herordenen">⠿</span>':''}<strong>${c.name}</strong>${c.isOwnClub?' <span class="badge badge-active" style="font-size:9px">Eigen</span>':''}</td>
        <td><span class="tag">${c.abbr||'—'}</span></td>
        <td class="text-secondary">${c.city||'—'}</td>
        <td>${stad?stad.name:'<span class="text-muted">—</span>'}</td>
        <td class="num text-secondary">${stad?.capacity?stad.capacity.toLocaleString('nl-NL'):'—'}</td>
        <td class="text-secondary" style="font-size:11px">${div||'<span class="text-muted">—</span>'}</td>
        <td>${hl[c.highlight]||'<span class="text-muted">—</span>'}</td>
        <td class="text-secondary" style="font-size:11px">${c.note||''}</td>
        <td><div class="action-btns"><button class="icon-btn" onclick="openClubModal('${c.id}')">✏️</button><button class="icon-btn danger" onclick="confirmDelete('club','${c.id}','${c.name}')">🗑️</button></div></td>
      </tr>`;
    }).join('');
  };

  const groupHeader = label => `<tr><td colspan="9" style="background:var(--bg-tertiary);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);padding:6px 10px">${label}</td></tr>`;

  wrap.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div style="font-size:11px;color:var(--text-muted)">${list.length} club${list.length!==1?'s':''}${q?' gevonden':''}</div>
      <button class="btn btn-ghost" style="font-size:11px;${!cs?'color:var(--cambuur-geel);font-weight:700':''}" onclick="setClubSortManual()" title="Terug naar je eigen sleepvolgorde">🔀 Handmatig${!cs?' ✓':''}</button>
    </div>
    <table class="data-table"><thead><tr>${th('name','Club')}${th('abbr','Afk.')}${th('city','Stad')}${th('stadium','Stadion')}${th('capacity','Capaciteit','70px')}<th>Divisie</th>${th('highlight','Markering')}<th>Notitie</th><th></th></tr></thead><tbody>
    ${groups.map(g=>groupHeader(g.label+' ('+g.clubs.length+')')+rowsHtml(g.key,g.clubs)).join('')}
    </tbody></table>`;
}
function openClubModal(editId){
  populateStadSel('club-stadium');
  document.getElementById('edit-club-id').value=editId||'';
  document.getElementById('club-inline-stad').classList.remove('open');
  if(editId){const c=S.clubs.find(x=>x.id===editId);if(!c)return;
    document.getElementById('club-name').value=c.name;document.getElementById('club-abbr').value=c.abbr||'';
    document.getElementById('club-city').value=c.city||'';document.getElementById('club-stadium').value=c.stadiumId||'';
    document.getElementById('club-highlight').value=c.highlight||'';document.getElementById('club-note').value=c.note||'';
    document.getElementById('modal-club-title').textContent='Club bewerken';
    window._clubDivisions = JSON.parse(JSON.stringify(c.divisionHistory||[]));
  }else{
    ['club-name','club-abbr','club-city','club-note'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('club-stadium').value='';document.getElementById('club-highlight').value='';
    document.getElementById('modal-club-title').textContent='Club toevoegen';
    window._clubDivisions = [];
  }
  renderDivisionHistory();
  document.getElementById('modal-club').classList.add('open');
}
async function saveClub(){
  const name=document.getElementById('club-name').value.trim();
  if(!name){showToast('Clubnaam is verplicht','error');return;}
  const existing=document.getElementById('edit-club-id').value;
  if(S.clubs.find(c=>c.name.toLowerCase()===name.toLowerCase()&&c.id!==existing)){showToast('Er bestaat al een club met deze naam','error');return;}
  const id=existing||'club_'+Date.now();
  const existingClub=existing?S.clubs.find(c=>c.id===existing):null;
  const club={id,name,abbr:document.getElementById('club-abbr').value.trim().toUpperCase(),stadiumId:document.getElementById('club-stadium').value||null,city:document.getElementById('club-city').value.trim(),highlight:document.getElementById('club-highlight').value,note:document.getElementById('club-note').value.trim(),isOwnClub:existingClub?.isOwnClub||false,divisionHistory:window._clubDivisions||[],sortOrder:existingClub?.sortOrder};
  await dbPut('clubs',club);
  if(existing){const i=S.clubs.findIndex(c=>c.id===existing);if(i>=0)S.clubs[i]=club;}else S.clubs.push(club);
  renderClubsTable();renderCompetitionsNav();renderCompetitionsPage();renderDivisionsSettings();closeModal('modal-club');showToast('Club opgeslagen: '+name,'success');
}
function populateStadSel(selId){
  const sel=document.getElementById(selId);const cur=sel.value;
  sel.innerHTML='<option value="">— Geen stadion —</option>';
  S.stadiums.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.name+(s.city?` (${s.city})`:'');if(s.id===cur)o.selected=true;sel.appendChild(o);});
}
function toggleEl(id){document.getElementById(id).classList.toggle('open');}
async function saveInlineStad(){
  const name=document.getElementById('istad-name').value.trim();
  if(!name){showToast('Stadiumnaam is verplicht','error');return;}
  const id='stadium_'+Date.now();
  const stad={id,name,city:document.getElementById('istad-city').value.trim(),capacity:parseInt(document.getElementById('istad-cap').value)||null};
  await dbPut('stadiums',stad);S.stadiums.push(stad);
  populateStadSel('club-stadium');document.getElementById('club-stadium').value=id;
  document.getElementById('club-inline-stad').classList.remove('open');
  ['istad-name','istad-city','istad-cap'].forEach(i=>document.getElementById(i).value='');
  showToast('Stadion aangemaakt: '+name,'success');
}

// ══════════════════════════════
// STADIUMS
// ══════════════════════════════
function renderStadiumsTable(){
  const wrap=document.getElementById('stadions-table-wrap');
  const q=(document.getElementById('stadium-search')?.value||'').toLowerCase();
  const list=S.stadiums.filter(s=>!q||s.name.toLowerCase().includes(q)||(s.city||'').toLowerCase().includes(q));
  if(!list.length){wrap.innerHTML='<div class="empty-state"><div class="empty-state-icon">🏟️</div><div class="empty-state-title">Nog geen stadions</div><div class="empty-state-desc">Voeg een stadion toe of koppel het aan een club.</div></div>';return;}
  wrap.innerHTML=`<table class="data-table"><thead><tr><th>Stadion</th><th>Stad</th><th class="num">Capaciteit</th><th>Club(s)</th><th></th></tr></thead><tbody>${
    list.map(s=>{const linked=S.clubs.filter(c=>c.stadiumId===s.id).map(c=>c.name).join(', ');return`<tr>
      <td><strong>${s.name}</strong></td><td class="text-secondary">${s.city||'—'}</td>
      <td class="num">${s.capacity?s.capacity.toLocaleString('nl-NL'):'—'}</td>
      <td class="text-secondary" style="font-size:11px">${linked||'—'}</td>
      <td><div class="action-btns"><button class="icon-btn" onclick="openStadiumModal('${s.id}')">✏️</button><button class="icon-btn danger" onclick="confirmDelete('stadion','${s.id}','${s.name}')">🗑️</button></div></td>
    </tr>`;}).join('')
  }</tbody></table>`;
}
function openStadiumModal(editId){
  document.getElementById('edit-stadion-id').value=editId||'';
  if(editId){const s=S.stadiums.find(x=>x.id===editId);if(!s)return;
    document.getElementById('stadion-name').value=s.name;document.getElementById('stadion-city').value=s.city||'';
    document.getElementById('stadion-capacity').value=s.capacity||'';document.getElementById('stadion-note').value=s.note||'';
    document.getElementById('modal-stadion-title').textContent='Stadion bewerken';
  }else{
    ['stadion-name','stadion-city','stadion-capacity','stadion-note'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('modal-stadion-title').textContent='Stadion toevoegen';
  }
  document.getElementById('modal-stadion').classList.add('open');
}
async function saveStadion(){
  const name=document.getElementById('stadion-name').value.trim();
  if(!name){showToast('Stadiumnaam is verplicht','error');return;}
  const existing=document.getElementById('edit-stadion-id').value;
  if(S.stadiums.find(s=>s.name.toLowerCase()===name.toLowerCase()&&s.id!==existing)){showToast('Er bestaat al een stadion met deze naam','error');return;}
  const id=existing||'stadium_'+Date.now();
  const stad={id,name,city:document.getElementById('stadion-city').value.trim(),capacity:parseInt(document.getElementById('stadion-capacity').value)||null,note:document.getElementById('stadion-note').value.trim()};
  await dbPut('stadiums',stad);
  if(existing){const i=S.stadiums.findIndex(s=>s.id===existing);if(i>=0)S.stadiums[i]=stad;}else S.stadiums.push(stad);
  renderStadiumsTable();renderClubsTable();closeModal('modal-stadion');showToast('Stadion opgeslagen: '+name,'success');
}
function switchTab(page,tab,el){
  const map={clubs:['alle-clubs','stadions','divisies']};
  (map[page]||[]).forEach(t=>{const e=document.getElementById('tab-'+t);if(e)e.style.display='none';});
  const tgt=document.getElementById('tab-'+tab);if(tgt)tgt.style.display='block';
  el.closest('.tabs').querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');
}

// ══════════════════════════════
// COMPETITIONS
// ══════════════════════════════
function renderCompetitionsNav(){
  const nav=document.getElementById('competitions-nav');
  const comps=S.competitions.filter(c=>c.seasonId===S.currentSeason);
  nav.innerHTML=comps.map(c=>{const icon=c.type==='beker'?'🏆':c.type==='playoffs'?'🔼':c.type==='voorbereiding'?'⚽':'📋';
    return`<div class="nav-item" data-page="competition-detail" data-comp="${c.id}" onclick="navigateToComp('${c.id}')" style="padding-left:32px;font-size:12px">
      <span class="nav-icon">${icon}</span><span class="nav-label">${c.name}</span></div>`;}).join('');
}
function renderCompetitionsPage(){
  const list=document.getElementById('competitions-list');
  if(!S.currentSeason){list.innerHTML='<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">Geen actief seizoen</div><div class="empty-state-desc">Maak eerst een seizoen aan via Instellingen.</div></div>';return;}
  const comps=S.competitions.filter(c=>c.seasonId===S.currentSeason);
  if(!comps.length){list.innerHTML='<div class="empty-state"><div class="empty-state-icon">🏆</div><div class="empty-state-title">Nog geen competities</div><div class="empty-state-desc">Voeg een competitie toe.</div></div>';return;}
  const tl={competitie:'Competitie',beker:'Beker',voorbereiding:'Voorbereiding'};
  const tb={competitie:'badge-competitie',beker:'badge-beker',voorbereiding:'badge-voorbereiding'};
  list.innerHTML=`<table class="data-table"><thead><tr><th>Competitie</th><th>Type</th><th>Clubs</th><th></th></tr></thead><tbody>${
    comps.map((c,i)=>`<tr><td><div style="display:flex;align-items:center;gap:6px">
        <div style="display:flex;flex-direction:column;gap:1px">
          <button class="icon-btn" style="height:18px;padding:0 5px;font-size:9px" onclick="moveComp('${c.id}',-1)" ${i===0?'disabled':''}>▲</button>
          <button class="icon-btn" style="height:18px;padding:0 5px;font-size:9px" onclick="moveComp('${c.id}',1)" ${i===comps.length-1?'disabled':''}>▼</button>
        </div>
        <strong>${c.name}</strong></div></td>
      <td><span class="badge ${tb[c.type]||''}">${tl[c.type]||c.type}</span></td><td>${(c.clubIds||[]).length}</td>
      <td><div class="action-btns"><button class="icon-btn" onclick="navigateToComp('${c.id}')">👁️</button><button class="icon-btn" onclick="openCompModal('${c.id}')">✏️</button><button class="icon-btn danger" onclick="confirmDelete('competition','${c.id}','${c.name}')">🗑️</button></div></td></tr>`).join('')
  }</tbody></table>`;
}
function openCompModal(editId){
  document.getElementById('edit-comp-id').value=editId||'';
  const sel=document.getElementById('comp-season');sel.innerHTML='<option value="">— Selecteer seizoen —</option>';
  S.seasons.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.name;if(s.id===S.currentSeason)o.selected=true;sel.appendChild(o);});
  const editComp = editId ? S.competitions.find(c=>c.id===editId) : null;
  const selIds=editComp?.clubIds||[];
  const linkedDivisions=editComp?.linkedDivisions||[];
  const cbWrap=document.getElementById('comp-clubs-checkboxes');
  cbWrap.innerHTML=!S.clubs.length?'<p class="text-muted" style="font-size:11px;padding:6px">Nog geen clubs.</p>':
    S.clubs.map(c=>`<label style="display:flex;align-items:center;gap:6px;padding:5px 6px;cursor:pointer;border-radius:3px;font-size:12px" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
      <input type="checkbox" value="${c.id}" ${selIds.includes(c.id)?'checked':''} style="accent-color:var(--cambuur-geel)">
      <span>${c.name}</span>${c.isOwnClub?'<span class="badge badge-active" style="font-size:9px">Eigen</span>':''}${c.highlight==='rivaal'?'<span class="badge badge-rival" style="font-size:9px">Rivaal</span>':''}</label>`).join('');

  const divisions = getPrefs().divisions || [];
  const divWrap = document.getElementById('comp-divisions-checkboxes');
  divWrap.innerHTML = !divisions.length ? '<p class="text-muted" style="font-size:11px">Nog geen divisies ingesteld (bij Clubs → Divisies).</p>' :
    divisions.map(d=>`<label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer">
      <input type="checkbox" class="comp-division-cb" value="${d}" ${linkedDivisions.includes(d)?'checked':''} style="accent-color:var(--cambuur-geel)">
      <span>${d}</span></label>`).join('');

  if(editId){const c=editComp;if(!c)return;
    document.getElementById('comp-name').value=c.name;document.getElementById('comp-type').value=c.type;
    document.getElementById('comp-season').value=c.seasonId;document.getElementById('comp-rounds').value=(c.rounds||[]).join(', ');
    document.getElementById('modal-competition-title').textContent='Competitie bewerken';
    window._compPeriods = JSON.parse(JSON.stringify(c.periods||[]));
  }else{
    document.getElementById('comp-name').value='';document.getElementById('comp-type').value='competitie';
    document.getElementById('comp-rounds').value='Eerste Ronde, Tweede Ronde, Kwartfinale, Halve Finale, Finale';
    document.getElementById('modal-competition-title').textContent='Competitie toevoegen';
    window._compPeriods = [];
  }
  renderPeriodRows(window._compPeriods);
  updateCompTypeUI();document.getElementById('modal-competition').classList.add('open');
}

// Vinkt clubs aan waarvan de huidige divisie overeenkomt met een van de gekoppelde
// divisies — vult alleen aan, vinkt nooit iets uit.
function fillClubsFromDivisions() {
  const chosen = [...document.querySelectorAll('.comp-division-cb:checked')].map(cb=>cb.value);
  if (!chosen.length) { showToast('Vink eerst één of meer divisies aan', 'error'); return; }
  let added = 0;
  document.querySelectorAll('#comp-clubs-checkboxes input[type=checkbox]').forEach(cb => {
    if (cb.checked) return;
    const club = S.clubs.find(c=>c.id===cb.value);
    if (club && chosen.includes(effectiveDivision(club))) { cb.checked = true; added++; }
  });
  showToast(added ? `${added} club${added!==1?'s':''} toegevoegd` : 'Geen nieuwe clubs gevonden in deze divisie(s)', added?'success':'error');
}

function unselectAllCompClubs() {
  document.querySelectorAll('#comp-clubs-checkboxes input[type=checkbox]').forEach(cb => cb.checked = false);
}
function updateCompTypeUI(){
  const t=document.getElementById('comp-type').value;
  const isKnockout = t==='beker'||t==='playoffs';
  document.getElementById('comp-cup-options').style.display=isKnockout?'block':'none';
  document.getElementById('comp-periods-options').style.display=(t==='competitie')?'block':'none';
}

// ── Periodes (periodetitel-berekening) ──
function renderPeriodRows(periods) {
  const wrap = document.getElementById('comp-periods-rows');
  wrap.innerHTML = (periods||[]).map((p, i) => `
    <div style="display:grid;grid-template-columns:1fr 90px 90px 28px;gap:6px;align-items:end">
      <div>
        <label class="form-label" style="font-size:10px">Naam</label>
        <input class="form-input" style="height:28px;font-size:12px" value="${p.name||''}" placeholder="Periode ${i+1}"
          oninput="window._compPeriods[${i}].name=this.value">
      </div>
      <div>
        <label class="form-label" style="font-size:10px">Van ronde</label>
        <input class="form-input" type="number" min="1" style="height:28px;font-size:12px" value="${p.fromRound??''}"
          oninput="window._compPeriods[${i}].fromRound=parseInt(this.value)||1">
      </div>
      <div>
        <label class="form-label" style="font-size:10px">Tot ronde</label>
        <input class="form-input" type="number" min="1" style="height:28px;font-size:12px" value="${p.toRound??''}"
          oninput="window._compPeriods[${i}].toRound=parseInt(this.value)||1">
      </div>
      <button class="icon-btn danger" style="height:28px" onclick="removePeriodRow(${i})">✕</button>
    </div>`).join('');
}

function addPeriodRow() {
  if (!window._compPeriods) window._compPeriods = [];
  const n = window._compPeriods.length + 1;
  window._compPeriods.push({name: `Periode ${n}`, fromRound: 1, toRound: 1});
  renderPeriodRows(window._compPeriods);
}

function removePeriodRow(idx) {
  window._compPeriods.splice(idx, 1);
  renderPeriodRows(window._compPeriods);
}

// Verdeelt het totaal aantal rondes (uit de bestaande wedstrijden van deze
// competitie, of een gok van 38) gelijk over 4 periodes van elk ~9 rondes.
function autoGeneratePeriods() {
  const editId = document.getElementById('edit-comp-id').value;
  const comp = editId ? S.competitions.find(c=>c.id===editId) : null;
  const matches = comp ? (S.matches||[]).filter(m=>m.competitionId===comp.id) : [];
  const roundNums = matches.map(m=>parseInt(m.round)).filter(n=>!isNaN(n));
  const totalRounds = roundNums.length ? Math.max(...roundNums) : 38;
  const perPeriod = Math.ceil(totalRounds / 4);
  window._compPeriods = [1,2,3,4].map(i => ({
    name: `Periode ${i}`,
    fromRound: (i-1)*perPeriod + 1,
    toRound: Math.min(i*perPeriod, totalRounds),
  }));
  renderPeriodRows(window._compPeriods);
}
async function saveCompetition(){
  const name=document.getElementById('comp-name').value.trim();if(!name){showToast('Naam is verplicht','error');return;}
  const seasonId=document.getElementById('comp-season').value;if(!seasonId){showToast('Selecteer een seizoen','error');return;}
  const type=document.getElementById('comp-type').value;
  const existing=document.getElementById('edit-comp-id').value;
  const id=existing||'comp_'+Date.now();
  const clubIds=[...document.querySelectorAll('#comp-clubs-checkboxes input:checked')].map(cb=>cb.value);
  const linkedDivisions=[...document.querySelectorAll('.comp-division-cb:checked')].map(cb=>cb.value);
  const rounds=(type==='beker'||type==='playoffs')?document.getElementById('comp-rounds').value.split(',').map(r=>r.trim()).filter(Boolean):[];
  const periods = type==='competitie' ? (window._compPeriods||[]) : [];
  const comp={id,name,type,seasonId,clubIds,linkedDivisions,rounds,periods,created:Date.now()};
  await dbPut('competitions',comp);
  if(existing){const i=S.competitions.findIndex(c=>c.id===existing);if(i>=0)S.competitions[i]=comp;}else S.competitions.push(comp);
  refreshAll();closeModal('modal-competition');showToast('Competitie opgeslagen: '+name,'success');
}

function getCambuurMatches(competitionId) {
  const cam = S.clubs.find(c=>c.isOwnClub);
  if (!cam) return [];
  return (S.matches||[]).filter(m=>{
    if (m.seasonId !== S.currentSeason) return false;
    if (competitionId && m.competitionId !== competitionId) return false;
    return m.homeClubId===cam.id || m.awayClubId===cam.id;
  });
}

function getNextMatch() {
  // If pinned, use that
  if (S.pinnedNextMatch) {
    const pinned = (S.matches||[]).find(m=>m.id===S.pinnedNextMatch);
    if (pinned && !pinned.played) return pinned;
    // Pinned match was played, clear pin
    S.pinnedNextMatch = null;
    saveSetting('pinnedNextMatch', null);
  }
  // Auto: first unplayed Cambuur match by date
  const cam = S.clubs.find(c=>c.isOwnClub);
  if (!cam) return null;
  const today = new Date().toISOString().split('T')[0];
  const upcoming = (S.matches||[])
    .filter(m=>m.seasonId===S.currentSeason&&!m.played&&(m.homeClubId===cam.id||m.awayClubId===cam.id)&&m.date)
    .sort((a,b)=>a.date.localeCompare(b.date));
  return upcoming[0] || null;
}

function getLastCambuurMatch() {
  const cam = S.clubs.find(c=>c.isOwnClub);
  if (!cam) return null;
  return (S.matches||[])
    .filter(m=>m.seasonId===S.currentSeason&&m.played&&(m.homeClubId===cam.id||m.awayClubId===cam.id))
    .sort((a,b)=>b.date?.localeCompare(a.date||'')||0)[0] || null;
}

function getCambuurForm(n=5) {
  const cam = S.clubs.find(c=>c.isOwnClub);
  if (!cam) return [];
  const played = (S.matches||[])
    .filter(m=>m.seasonId===S.currentSeason&&m.played&&(m.homeClubId===cam.id||m.awayClubId===cam.id))
    .sort((a,b)=>b.date?.localeCompare(a.date||'')||0)
    .slice(0,n);
  return played.map(m=>{
    const isCamHome = m.homeClubId===cam.id;
    const camScore = isCamHome?m.homeScore:m.awayScore;
    const oppScore = isCamHome?m.awayScore:m.homeScore;
    if (camScore>oppScore) return {r:'W',m};
    if (camScore===oppScore) return {r:'D',m};
    return {r:'L',m};
  }).reverse();
}

function getCambuurLeaguePos() {
  const cam = S.clubs.find(c=>c.isOwnClub);
  if (!cam) return null;
  // Find the main league competition
  const leagueComp = S.competitions.find(c=>c.seasonId===S.currentSeason&&c.type==='competitie');
  if (!leagueComp) return null;
  const clubs = (leagueComp.clubIds||[]).map(cid=>S.clubs.find(c=>c.id===cid)).filter(Boolean);
  const compMatches = (S.matches||[]).filter(m=>m.competitionId===leagueComp.id&&m.played);
  const table = {};
  clubs.forEach(c=>{table[c.id]={pts:0,gf:0,ga:0,g:0};});
  compMatches.forEach(m=>{
    const h=table[m.homeClubId],a=table[m.awayClubId];
    if(!h||!a) return;
    h.g++;a.g++;h.gf+=m.homeScore;h.ga+=m.awayScore;a.gf+=m.awayScore;a.ga+=m.homeScore;
    if(m.homeScore>m.awayScore){h.pts+=3;}else if(m.homeScore<m.awayScore){a.pts+=3;}else{h.pts++;a.pts++;}
  });
  const sorted = Object.entries(table).sort(([,a],[,b])=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf);
  const pos = sorted.findIndex(([id])=>id===cam.id)+1;
  return {pos, total:sorted.length, pts:table[cam.id]?.pts||0, comp:leagueComp};
}

function fmtMatchDate(m) {
  if (!m.date) return '—';
  const d = new Date(m.date);
  const day = d.getDate();
  const month = d.toLocaleDateString('nl-NL',{month:'long'});
  const weekday = d.toLocaleDateString('nl-NL',{weekday:'long'});
  return weekday.charAt(0).toUpperCase()+weekday.slice(1)+' '+day+' '+month+(m.time?' '+m.time:'');
}



const DEFAULT_PREFS = {
  coachYellowThreshold: 3,
  font: 'inter',
  fontSize: 'normal',
  formLength: 5,
  showTopscorers: true,
  showAvailability: true,
  defaultPlayerView: 'kaart',
  defaultPlayerSort: 'positie',
  showGrayedOut: true,
  contractWarnMonths: 6,
  loanWarnMonths: 3,
  divisions: [],
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
  ['algemeen','seizoenen','selectie','gegevens'].forEach(t => {
    const d = document.getElementById('stab-'+t);
    if (d) d.style.display = t===tab ? 'block' : 'none';
  });
  document.querySelectorAll('#settings-tabs .tab').forEach(t=>t.classList.remove('active'));
  if (el) el.classList.add('active');
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

