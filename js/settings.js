
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
    <div class="settings-row" draggable="true" ondragstart="seasonDragStart(${i})" ondragover="seasonDragOver(event)" ondrop="seasonDrop(${i})" style="gap:6px;padding:8px 0;cursor:grab">
      <span style="color:var(--text-muted);user-select:none;flex-shrink:0" title="Sleep om te herordenen">⠿</span>
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
  const id=genId('season');
  const season={id,name,year,created:Date.now()};
  await dbPut('seasons',season);
  S.seasons.push(season);
  if(!S.currentSeason){S.currentSeason=id;await saveSetting('currentSeason',id);}
  sortSeasons(S.seasons);
  document.getElementById('inline-season-name').value='';
  document.getElementById('inline-season-year').value='';
  document.getElementById('inline-season-form').style.display='none';
  renderSeasonSelect();renderSeasonsManage();renderCompetitionsNav();renderDashboard();
  showToast('Seizoen aangemaakt: '+name,'success');
}
async function saveSeason(){
  const name=document.getElementById('season-name').value.trim();
  if(!name){showToast('Voer een seizoensnaam in','error');return;}
  const year=parseInt(name.match(/^(\d{4})/)?.[1])||new Date().getFullYear();
  const existing=document.getElementById('edit-season-id').value;
  const id=existing||genId('season');
  const startDate = document.getElementById('season-start').value||null;
  const endDate = document.getElementById('season-end').value||null;
  const season={id,name,year,startDate,endDate,created:existing?(S.seasons.find(s=>s.id===existing)?.created||Date.now()):Date.now()};
  await dbPut('seasons',season);
  if(existing){const i=S.seasons.findIndex(s=>s.id===existing);if(i>=0)S.seasons[i]=season;}
  else{S.seasons.push(season);if(!S.currentSeason){S.currentSeason=id;await saveSetting('currentSeason',id);}}
  sortSeasons(S.seasons);
  renderSeasonSelect();renderSeasonsManage();renderCompetitionsNav();renderDashboard();
  closeModal('modal-season');showToast('Seizoen opgeslagen: '+name,'success');
}

// ══════════════════════════════
// CLUBS
// ══════════════════════════════
function renderClubsPage(){renderClubsTable();renderStadiumsTable();renderDivisionsSettings();}
let _clubSortPrefApplied = false;
function applyClubSortPrefOnce() {
  if (_clubSortPrefApplied) return;
  _clubSortPrefApplied = true;
  window._clubSort = getPrefs().clubSortState;
}
let _divisionSettingsDragIdx = null;
function divisionSettingsDragStart(idx) { _divisionSettingsDragIdx = idx; }
function divisionSettingsDragOver(ev) { ev.preventDefault(); }
async function divisionSettingsDrop(idx) {
  if (_divisionSettingsDragIdx === null || _divisionSettingsDragIdx === idx) return;
  const divisions = [...(getPrefs().divisions||[])];
  const [moved] = divisions.splice(_divisionSettingsDragIdx, 1);
  divisions.splice(idx, 0, moved);
  await savePref('divisions', divisions);
  _divisionSettingsDragIdx = null;
  renderDivisionsSettings();
  renderClubsTable();
}

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
    <div draggable="true" ondragstart="divisionSettingsDragStart(${i})" ondragover="divisionSettingsDragOver(event)" ondrop="divisionSettingsDrop(${i})"
      style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg-tertiary);border-radius:var(--radius-sm);margin-bottom:4px;cursor:grab">
      <span style="color:var(--text-muted);user-select:none" title="Sleep om te herordenen">⠿</span>
      <span style="flex:1;font-size:13px">${d}</span>
      <span style="font-size:11px;color:var(--text-muted)">${counts[d]} club${counts[d]!==1?'s':''}</span>
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

function setClubSort(key){
  if (window._clubSort && window._clubSort.key===key) window._clubSort.dir*=-1;
  else window._clubSort = {key, dir:1};
  savePref('clubSortState', window._clubSort);
  renderClubsTable();
}
function setClubSortManual(){
  window._clubSort = null;
  savePref('clubSortState', null);
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
  applyClubSortPrefOnce();
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
      const rivalBorder = c.highlight==='rivaal'?'border-left:2px solid var(--rival-accent);':c.highlight==='interessant'?'border-left:2px solid var(--interessant);':'';
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
      <button class="btn btn-ghost" style="font-size:11px;${!cs?'color:var(--accent-primary);font-weight:700':''}" onclick="setClubSortManual()" title="Terug naar je eigen sleepvolgorde">🔀 Handmatig${!cs?' ✓':''}</button>
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
    document.getElementById('club-promotion-excluded').checked=c.promotionExcluded||false;
    document.getElementById('modal-club-title').textContent='Club bewerken';
    window._clubDivisions = JSON.parse(JSON.stringify(c.divisionHistory||[]));
  }else{
    ['club-name','club-abbr','club-city','club-note'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('club-stadium').value='';document.getElementById('club-highlight').value='';
    document.getElementById('club-promotion-excluded').checked=false;
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
  const id=existing||genId('club');
  const existingClub=existing?S.clubs.find(c=>c.id===existing):null;
  const club={id,name,abbr:document.getElementById('club-abbr').value.trim().toUpperCase(),stadiumId:document.getElementById('club-stadium').value||null,city:document.getElementById('club-city').value.trim(),highlight:document.getElementById('club-highlight').value,note:document.getElementById('club-note').value.trim(),isOwnClub:existingClub?.isOwnClub||false,promotionExcluded:document.getElementById('club-promotion-excluded').checked,divisionHistory:window._clubDivisions||[],sortOrder:existingClub?.sortOrder};
  await dbPut('clubs',club);
  if(existing){const i=S.clubs.findIndex(c=>c.id===existing);if(i>=0)S.clubs[i]=club;}else S.clubs.push(club);
  renderClubsTable();renderCompetitionsNav();renderCompetitionsPage();renderDivisionsSettings();applyClubBranding();closeModal('modal-club');showToast('Club opgeslagen: '+name,'success');
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
  const id=genId('stadium');
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
  const id=existing||genId('stadium');
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
let _compDragIdx = null;
function compDragStart(idx) { _compDragIdx = idx; }
function compDragOver(ev) { ev.preventDefault(); }
async function compDrop(idx) {
  if (_compDragIdx === null || _compDragIdx === idx) return;
  const comps = S.competitions.filter(c=>c.seasonId===S.currentSeason);
  const [moved] = comps.splice(_compDragIdx, 1);
  comps.splice(idx, 0, moved);
  for (let i=0;i<comps.length;i++) { comps[i].sortOrder = i; await dbPut('competitions', comps[i]); }
  S.competitions.sort((a,b)=>{
    if(a.seasonId!==b.seasonId) return (a.seasonId||'').localeCompare(b.seasonId||'');
    return (a.sortOrder??Infinity)-(b.sortOrder??Infinity);
  });
  _compDragIdx = null;
  renderCompetitionsPage();
  renderCompetitionsNav();
}

function renderCompetitionsPage(){
  const list=document.getElementById('competitions-list');
  if(!S.currentSeason){list.innerHTML='<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">Geen actief seizoen</div><div class="empty-state-desc">Maak eerst een seizoen aan via Instellingen.</div></div>';return;}
  const comps=S.competitions.filter(c=>c.seasonId===S.currentSeason);
  if(!comps.length){list.innerHTML='<div class="empty-state"><div class="empty-state-icon">🏆</div><div class="empty-state-title">Nog geen competities</div><div class="empty-state-desc">Voeg een competitie toe.</div></div>';return;}
  const tl={competitie:'Competitie',beker:'Beker',voorbereiding:'Voorbereiding'};
  const tb={competitie:'badge-competitie',beker:'badge-beker',voorbereiding:'badge-voorbereiding'};
  const season = S.seasons.find(s=>s.id===S.currentSeason);
  list.innerHTML=`<div class="settings-row-desc" style="margin-bottom:8px">⭐ Wijs bij meerdere "Competitie"-type competities in hetzelfde seizoen (bijv. Eredivisie + KKD samen bijgehouden) aan welke voor het dashboard leidend is — anders raadt de app het zelf op basis van waar je club in speelt.</div>
    <table class="data-table"><thead><tr><th style="width:34px"></th><th>Competitie</th><th>Type</th><th>Clubs</th><th></th></tr></thead><tbody>${
    comps.map((c,i)=>{
      const isMain = season?.mainCompetitionId===c.id;
      const starBtn = c.type==='competitie'
        ? `<button class="icon-btn" style="${isMain?'color:var(--accent-primary)':''}" onclick="setMainCompetition('${c.id}')" title="${isMain?'Hoofdcompetitie voor dit seizoen':'Maak hoofdcompetitie voor dit seizoen'}">${isMain?'⭐':'☆'}</button>`
        : '';
      return `<tr draggable="true" ondragstart="compDragStart(${i})" ondragover="compDragOver(event)" ondrop="compDrop(${i})" style="cursor:grab">
      <td>${starBtn}</td>
      <td><div style="display:flex;align-items:center;gap:6px">
        <span style="color:var(--text-muted);user-select:none" title="Sleep om te herordenen">⠿</span>
        <strong>${c.name}</strong></div></td>
      <td><span class="badge ${tb[c.type]||''}">${tl[c.type]||c.type}</span></td><td>${(c.clubIds||[]).length}</td>
      <td><div class="action-btns"><button class="icon-btn" onclick="navigateToComp('${c.id}')">👁️</button><button class="icon-btn" onclick="openCompModal('${c.id}')">✏️</button><button class="icon-btn danger" onclick="confirmDelete('competition','${c.id}','${c.name}')">🗑️</button></div></td></tr>`;
    }).join('')
  }</tbody></table>`;
}

async function setMainCompetition(compId) {
  const season = S.seasons.find(s=>s.id===S.currentSeason);
  if (!season) return;
  season.mainCompetitionId = (season.mainCompetitionId===compId) ? null : compId; // nogmaals klikken = uitzetten
  await dbPut('seasons', season);
  renderCompetitionsPage();
  renderDashboard();
  showToast(season.mainCompetitionId ? 'Hoofdcompetitie ingesteld' : 'Hoofdcompetitie-markering verwijderd', 'success');
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
      <input type="checkbox" value="${c.id}" ${selIds.includes(c.id)?'checked':''} style="accent-color:var(--accent-primary)">
      <span>${c.name}</span>${c.isOwnClub?'<span class="badge badge-active" style="font-size:9px">Eigen</span>':''}${c.highlight==='rivaal'?'<span class="badge badge-rival" style="font-size:9px">Rivaal</span>':''}</label>`).join('');

  const divisions = getPrefs().divisions || [];
  const divWrap = document.getElementById('comp-divisions-checkboxes');
  divWrap.innerHTML = !divisions.length ? '<p class="text-muted" style="font-size:11px">Nog geen divisies ingesteld (bij Clubs → Divisies).</p>' :
    divisions.map(d=>`<label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer">
      <input type="checkbox" class="comp-division-cb" value="${d}" ${linkedDivisions.includes(d)?'checked':''} style="accent-color:var(--accent-primary)">
      <span>${d}</span></label>`).join('');

  if(editId){const c=editComp;if(!c)return;
    document.getElementById('comp-name').value=c.name;document.getElementById('comp-type').value=c.type;
    document.getElementById('comp-season').value=c.seasonId;document.getElementById('comp-rounds').value=(c.rounds||[]).join(', ');
    document.getElementById('modal-competition-title').textContent='Competitie bewerken';
    window._compPeriods = JSON.parse(JSON.stringify(c.periods||[]));
    window._compRankZones = JSON.parse(JSON.stringify(c.rankZones||[]));
    window._compDeductions = JSON.parse(JSON.stringify(c.pointDeductions||[]));
  }else{
    document.getElementById('comp-name').value='';document.getElementById('comp-type').value='competitie';
    document.getElementById('comp-rounds').value='Eerste Ronde, Tweede Ronde, Kwartfinale, Halve Finale, Finale';
    document.getElementById('modal-competition-title').textContent='Competitie toevoegen';
    window._compPeriods = [];
    window._compRankZones = [];
    window._compDeductions = [];
  }
  renderPeriodRows(window._compPeriods);
  renderRankZoneRows(window._compRankZones);
  renderDeductionRows(window._compDeductions);
  switchCompModalTab('clubs', document.querySelector('#comp-modal-tabs .tab[data-tab="clubs"]'));
  updateCompTypeUI();document.getElementById('modal-competition').classList.add('open');
}

// Vinkt clubs aan waarvan de huidige divisie overeenkomt met een van de gekoppelde
// divisies — vult alleen aan, vinkt nooit iets uit.
function fillClubsFromDivisions() {
  const chosen = [...document.querySelectorAll('.comp-division-cb:checked')].map(cb=>cb.value);
  if (!chosen.length) { showToast('Vink eerst één of meer divisies aan', 'error'); return; }
  const seasonId = document.getElementById('comp-season').value;
  const season = seasonId ? S.seasons.find(s=>s.id===seasonId) : null;
  const range = season ? getSeasonDateRange(season) : null;
  const refDate = range?.start || null; // divisie bij de start van dít seizoen, niet 'vandaag'
  let added = 0;
  document.querySelectorAll('#comp-clubs-checkboxes input[type=checkbox]').forEach(cb => {
    if (cb.checked) return;
    const club = S.clubs.find(c=>c.id===cb.value);
    if (club && chosen.includes(effectiveDivision(club, refDate))) { cb.checked = true; added++; }
  });
  renderDeductionRows(window._compDeductions);
  showToast(added ? `${added} club${added!==1?'s':''} toegevoegd` : 'Geen nieuwe clubs gevonden in deze divisie(s) voor het gekozen seizoen', added?'success':'error');
}

function unselectAllCompClubs() {
  document.querySelectorAll('#comp-clubs-checkboxes input[type=checkbox]').forEach(cb => cb.checked = false);
  renderDeductionRows(window._compDeductions);
}
function switchCompModalTab(tab, el) {
  ['clubs','rounds','periods','deductions'].forEach(t => {
    document.getElementById('comp-modal-tab-'+t).style.display = t===tab ? 'block' : 'none';
  });
  document.querySelectorAll('#comp-modal-tabs .tab').forEach(t=>t.classList.remove('active'));
  if (el) el.classList.add('active');
}

function updateCompTypeUI(){
  const t=document.getElementById('comp-type').value;
  const isKnockout = t==='beker'||t==='playoffs';
  const isLeague = t==='competitie';
  document.getElementById('comp-tab-btn-rounds').style.display = isKnockout ? '' : 'none';
  document.getElementById('comp-tab-btn-periods').style.display = isLeague ? '' : 'none';
  document.getElementById('comp-tab-btn-deductions').style.display = isLeague ? '' : 'none';
  // Als het actieve tabblad door de typewissel verdwenen is, terug naar Clubs
  const activeBtn = document.querySelector('#comp-modal-tabs .tab.active');
  if (activeBtn && activeBtn.style.display === 'none') {
    switchCompModalTab('clubs', document.querySelector('#comp-modal-tabs .tab[data-tab="clubs"]'));
  }
}

// ── Periodes (periodetitel-berekening) ──
let _periodRowDragIdx = null;
function periodRowDragStart(idx) { _periodRowDragIdx = idx; }
function periodRowDragOver(ev) { ev.preventDefault(); }
function periodRowDrop(idx) {
  if (_periodRowDragIdx === null || _periodRowDragIdx === idx) return;
  const arr = window._compPeriods || [];
  const [moved] = arr.splice(_periodRowDragIdx, 1);
  arr.splice(idx, 0, moved);
  _periodRowDragIdx = null;
  renderPeriodRows(arr);
}

function renderPeriodRows(periods) {
  const wrap = document.getElementById('comp-periods-rows');
  wrap.innerHTML = (periods||[]).map((p, i) => `
    <div draggable="true" ondragstart="periodRowDragStart(${i})" ondragover="periodRowDragOver(event)" ondrop="periodRowDrop(${i})"
      style="display:grid;grid-template-columns:20px 1fr 90px 90px 28px;gap:6px;align-items:end;cursor:grab">
      <div style="color:var(--text-muted);padding-bottom:6px;user-select:none" title="Sleep om te herordenen">⠿</div>
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

// ── Ranglijst-zones (promotie/play-offs/degradatie) ──
// Bewust handmatig i.p.v. berekend: regels wijzigen per seizoen/competitie,
// dus geen hardgecodeerde "top 2 = promotie"-logica die bij een regelwijziging
// weer aangepast moet worden. Puur visueel, telt nergens in mee.
const RANKZONE_PRESET_COLORS = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#a855f7'];

let _rankZoneDragIdx = null;
function rankZoneDragStart(idx) { _rankZoneDragIdx = idx; }
function rankZoneDragOver(ev) { ev.preventDefault(); }
function rankZoneDrop(idx) {
  if (_rankZoneDragIdx === null || _rankZoneDragIdx === idx) return;
  const arr = window._compRankZones || [];
  const [moved] = arr.splice(_rankZoneDragIdx, 1);
  arr.splice(idx, 0, moved);
  _rankZoneDragIdx = null;
  renderRankZoneRows(arr);
}

// Overlappende positiebereiken opsporen — bij overlap wint de eerst-
// gedefinieerde zone stilzwijgend, dus we waarschuwen zodat dat niet
// per ongeluk onopgemerkt blijft.
function findRankZoneOverlaps(zones) {
  const warnings = [];
  for (let i = 0; i < zones.length; i++) {
    for (let j = i+1; j < zones.length; j++) {
      const a = zones[i], b = zones[j];
      const overlaps = a.fromPos <= b.toPos && b.fromPos <= a.toPos;
      if (overlaps) {
        warnings.push(`Positie ${Math.max(a.fromPos,b.fromPos)}-${Math.min(a.toPos,b.toPos)} valt in zowel "${a.label||('zone '+(i+1))}" als "${b.label||('zone '+(j+1))}" — "${a.label||('zone '+(i+1))}" krijgt voorrang (staat hoger).`);
      }
    }
  }
  return warnings;
}

function renderRankZoneRows(zones) {
  const wrap = document.getElementById('comp-rankzones-rows');
  const overlaps = findRankZoneOverlaps(zones||[]);
  const overlapHtml = overlaps.length
    ? `<div style="background:rgba(245,158,11,0.1);border:1px solid var(--draw);border-radius:var(--radius-sm);padding:8px 10px;margin-bottom:8px;font-size:11px;color:var(--draw)">
        ${overlaps.map(w=>`⚠ ${w}`).join('<br>')}
      </div>`
    : '';
  wrap.innerHTML = overlapHtml + (zones||[]).map((z, i) => `
    <div draggable="true" ondragstart="rankZoneDragStart(${i})" ondragover="rankZoneDragOver(event)" ondrop="rankZoneDrop(${i})"
      style="display:grid;grid-template-columns:20px 22px 64px 64px 1fr 40px 28px;gap:6px;align-items:end;margin-bottom:2px;cursor:grab">
      <div style="color:var(--text-muted);padding-bottom:6px;user-select:none" title="Sleep om voorrang te wijzigen">⠿</div>
      <div style="font-size:10px;color:var(--text-muted);padding-bottom:8px;white-space:nowrap" title="Voorrang: eerste wint bij overlap">${i+1}e</div>
      <div>
        <label class="form-label" style="font-size:10px">Positie van</label>
        <input class="form-input" type="number" min="1" style="height:28px;font-size:12px" value="${z.fromPos??''}"
          oninput="window._compRankZones[${i}].fromPos=parseInt(this.value)||1">
      </div>
      <div>
        <label class="form-label" style="font-size:10px">tot</label>
        <input class="form-input" type="number" min="1" style="height:28px;font-size:12px" value="${z.toPos??''}"
          oninput="window._compRankZones[${i}].toPos=parseInt(this.value)||1">
      </div>
      <div>
        <label class="form-label" style="font-size:10px">Label</label>
        <input class="form-input" style="height:28px;font-size:12px" value="${z.label||''}" placeholder="Directe promotie"
          oninput="window._compRankZones[${i}].label=this.value">
      </div>
      <div>
        <label class="form-label" style="font-size:10px">Kleur</label>
        <input type="color" value="${z.color||'#22c55e'}" style="height:28px;width:100%;padding:0;border:1px solid var(--border);border-radius:4px;background:none"
          onchange="window._compRankZones[${i}].color=this.value">
      </div>
      <button class="icon-btn danger" style="height:28px" onclick="removeRankZoneRow(${i})">✕</button>
    </div>
    <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-muted);margin-bottom:2px;margin-left:42px;cursor:pointer">
      <input type="checkbox" ${z.linkPeriodWinners?'checked':''} onchange="window._compRankZones[${i}].linkPeriodWinners=this.checked" style="accent-color:var(--accent-primary)">
      Geldt ook voor periodetitel-winnaars, ongeacht positie
    </label>
    <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-muted);margin-bottom:8px;margin-left:42px;cursor:pointer">
      <input type="checkbox" ${z.excludeIneligible?'checked':''} onchange="window._compRankZones[${i}].excludeIneligible=this.checked" style="accent-color:var(--accent-primary)">
      Uitgesloten clubs overslaan voor deze zone
    </label>`).join('');
}

// Kopieert de ranglijst-zones van dezelfde competitie (op naam) uit het meest
// recente eerdere seizoen — promotie/degradatieregels veranderen zelden per
// jaar, dus dit scheelt steeds opnieuw hetzelfde intypen.
function copyRankZonesFromPreviousSeason() {
  const name = document.getElementById('comp-name').value.trim();
  if (!name) { showToast('Vul eerst een competitienaam in', 'error'); return; }
  const currentSeasonId = document.getElementById('comp-season').value;
  const currentSeason = S.seasons.find(s=>s.id===currentSeasonId);
  const currentYear = currentSeason?.year ?? Infinity;

  const candidates = S.competitions.filter(c => {
    if (c.name.trim().toLowerCase() !== name.toLowerCase()) return false;
    if (!(c.rankZones||[]).length) return false;
    const s = S.seasons.find(x=>x.id===c.seasonId);
    return s && (s.year ?? -Infinity) < currentYear;
  }).sort((a,b) => {
    const ya = S.seasons.find(s=>s.id===a.seasonId)?.year ?? -Infinity;
    const yb = S.seasons.find(s=>s.id===b.seasonId)?.year ?? -Infinity;
    return yb - ya;
  });

  if (!candidates.length) { showToast('Geen eerder seizoen met zones gevonden voor deze competitienaam', 'error'); return; }
  window._compRankZones = JSON.parse(JSON.stringify(candidates[0].rankZones));
  renderRankZoneRows(window._compRankZones);
  showToast(`${window._compRankZones.length} zone(s) gekopieerd`, 'success');
}

// ── Puntenaftrek (bv. licentie-overtredingen) ──
// Puur handmatig, meerdere aftrekken per club mogelijk (net als bij Vitesse
// 2024/25, die meerdere keren binnen één seizoen punten inleverde).
let _deductionRowDragIdx = null;
function deductionRowDragStart(idx) { _deductionRowDragIdx = idx; }
function deductionRowDragOver(ev) { ev.preventDefault(); }
function deductionRowDrop(idx) {
  if (_deductionRowDragIdx === null || _deductionRowDragIdx === idx) return;
  const arr = window._compDeductions || [];
  const [moved] = arr.splice(_deductionRowDragIdx, 1);
  arr.splice(idx, 0, moved);
  _deductionRowDragIdx = null;
  renderDeductionRows(arr);
}

function renderDeductionRows(deductions) {
  const wrap = document.getElementById('comp-deductions-rows');
  const clubIds = [...document.querySelectorAll('#comp-clubs-checkboxes input:checked')].map(cb=>cb.value);
  const clubOpts = clubIds.map(id => S.clubs.find(c=>c.id===id)).filter(Boolean);
  wrap.innerHTML = (deductions||[]).map((d, i) => `
    <div draggable="true" ondragstart="deductionRowDragStart(${i})" ondragover="deductionRowDragOver(event)" ondrop="deductionRowDrop(${i})"
      style="display:grid;grid-template-columns:20px 1fr 70px 1fr 110px 28px;gap:6px;align-items:end;cursor:grab">
      <div style="color:var(--text-muted);padding-bottom:6px;user-select:none" title="Sleep om te herordenen">⠿</div>
      <div>
        <label class="form-label" style="font-size:10px">Club</label>
        <select class="form-select" style="height:28px;font-size:12px" onchange="window._compDeductions[${i}].clubId=this.value">
          ${clubOpts.map(c=>`<option value="${c.id}" ${d.clubId===c.id?'selected':''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="form-label" style="font-size:10px">Punten</label>
        <input class="form-input" type="number" min="0" style="height:28px;font-size:12px" value="${d.points??''}"
          oninput="window._compDeductions[${i}].points=parseInt(this.value)||0">
      </div>
      <div>
        <label class="form-label" style="font-size:10px">Reden</label>
        <input class="form-input" style="height:28px;font-size:12px" value="${d.reason||''}" placeholder="Licentie-overtreding"
          oninput="window._compDeductions[${i}].reason=this.value">
      </div>
      <div>
        <label class="form-label" style="font-size:10px">Datum (opt.)</label>
        <input class="form-input" type="date" style="height:28px;font-size:12px" value="${d.date||''}"
          onchange="window._compDeductions[${i}].date=this.value">
      </div>
      <button class="icon-btn danger" style="height:28px" onclick="removeDeductionRow(${i})">✕</button>
    </div>`).join('') || '<p class="text-muted" style="font-size:11px">Vink eerst clubs aan hierboven om een aftrek te kunnen koppelen.</p>';
}

function addDeductionRow() {
  const clubIds = [...document.querySelectorAll('#comp-clubs-checkboxes input:checked')].map(cb=>cb.value);
  if (!clubIds.length) { showToast('Vink eerst clubs aan voordat je een aftrek toevoegt', 'error'); return; }
  if (!window._compDeductions) window._compDeductions = [];
  window._compDeductions.push({clubId: clubIds[0], points: 0, reason: '', date: ''});
  renderDeductionRows(window._compDeductions);
}

function removeDeductionRow(idx) {
  window._compDeductions.splice(idx, 1);
  renderDeductionRows(window._compDeductions);
}

function addRankZoneRow() {
  if (!window._compRankZones) window._compRankZones = [];
  const color = RANKZONE_PRESET_COLORS[window._compRankZones.length % RANKZONE_PRESET_COLORS.length];
  window._compRankZones.push({fromPos: 1, toPos: 1, label: '', color, linkPeriodWinners: false, excludeIneligible: false});
  renderRankZoneRows(window._compRankZones);
}

function removeRankZoneRow(idx) {
  window._compRankZones.splice(idx, 1);
  renderRankZoneRows(window._compRankZones);
}

async function saveCompetition(){
  const name=document.getElementById('comp-name').value.trim();if(!name){showToast('Naam is verplicht','error');return;}
  const seasonId=document.getElementById('comp-season').value;if(!seasonId){showToast('Selecteer een seizoen','error');return;}
  const type=document.getElementById('comp-type').value;
  const existing=document.getElementById('edit-comp-id').value;
  const id=existing||genId('comp');
  const clubIds=[...document.querySelectorAll('#comp-clubs-checkboxes input:checked')].map(cb=>cb.value);
  const linkedDivisions=[...document.querySelectorAll('.comp-division-cb:checked')].map(cb=>cb.value);
  const rounds=(type==='beker'||type==='playoffs')?document.getElementById('comp-rounds').value.split(',').map(r=>r.trim()).filter(Boolean):[];
  const periods = type==='competitie' ? (window._compPeriods||[]) : [];
  const rankZones = type==='competitie' ? (window._compRankZones||[]) : [];
  const pointDeductions = type==='competitie' ? (window._compDeductions||[]).filter(d=>d.clubId) : [];
  const existingComp = existing ? S.competitions.find(c=>c.id===existing) : null;
  const comp={id,name,type,seasonId,clubIds,linkedDivisions,rounds,periods,rankZones,pointDeductions,created:existingComp?.created||Date.now()};
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
  const leagueComp = getMainCompetition(S.currentSeason);
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
  clubSortState: {key:'name', dir:1}, // null = handmatige sleepvolgorde, anders {key,dir}
  coachArchiefOpen: false,
  contentWidth: 'compact', // 'compact' = gecentreerd op 1080px, 'full' = volledige breedte
  tableDensity: 'comfortabel', // 'comfortabel' of 'compact'
  defaultPage: 'dashboard',
  colorAccentPrimary: '#F5C500',
  colorAccentSecondary: '#003A8C',
  colorRivalAccent: '#C8102E',
  colorWin: '#22c55e',
  colorDraw: '#f59e0b',
  colorLoss: '#ef4444',
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
  // Paginabreedte
  document.body.classList.remove('cw-medium', 'cw-full');
  if (p.contentWidth === 'medium') document.body.classList.add('cw-medium');
  else if (p.contentWidth === 'full') document.body.classList.add('cw-full');
  // Tabeldichtheid
  document.body.classList.toggle('table-compact', p.tableDensity === 'compact');
  // Accentkleuren
  const root = document.documentElement.style;
  root.setProperty('--accent-primary', p.colorAccentPrimary || '#F5C500');
  root.setProperty('--accent-secondary', p.colorAccentSecondary || '#003A8C');
  root.setProperty('--rival-accent', p.colorRivalAccent || '#C8102E');
  // Win/Gelijk/Verlies — inclusief bijpassende, licht getinte achtergrondversie
  const win = p.colorWin || '#22c55e', draw = p.colorDraw || '#f59e0b', loss = p.colorLoss || '#ef4444';
  root.setProperty('--win', win);
  root.setProperty('--draw', draw);
  root.setProperty('--loss', loss);
  root.setProperty('--win-bg', hexToRgba(win, 0.12));
  root.setProperty('--draw-bg', hexToRgba(draw, 0.12));
  root.setProperty('--loss-bg', hexToRgba(loss, 0.12));
}

// Zet #RRGGBB om naar rgba(...) met de gevraagde dekking — nodig om de
// getinte win/gelijk/verlies-achtergronden mee te laten bewegen met een
// aangepaste hoofdkleur, in plaats van een vaste kleur te laten staan die
// niet meer bij de nieuwe accentkleur past.
function hexToRgba(hex, alpha) {
  const h = hex.replace('#','');
  const r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16);
  if (isNaN(r)||isNaN(g)||isNaN(b)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

async function resetColorPrefs() {
  const keys = ['colorAccentPrimary','colorAccentSecondary','colorRivalAccent','colorWin','colorDraw','colorLoss'];
  for (const k of keys) { S.prefs[k] = DEFAULT_PREFS[k]; }
  await dbPut('settings', {key:'prefs', value: JSON.stringify(S.prefs)});
  applyPrefs();
  renderInstellingen();
  showToast('Standaardkleuren hersteld', 'success');
}

function setFont(val) { savePref('font', val); }
function setFontSize(val) { savePref('fontSize', val); }

function renderInstellingen() {
  const p = getPrefs();
  // Sync toggle states
  const dm = document.getElementById('theme-select');
  if (dm) dm.value = S.theme || 'dark';
  const fs = document.getElementById('font-select');
  if (fs) fs.value = p.font || 'inter';
  const cw = document.getElementById('pref-content-width');
  if (cw) cw.value = p.contentWidth || 'compact';
  const td = document.getElementById('pref-table-density');
  if (td) td.value = p.tableDensity || 'comfortabel';
  const dp = document.getElementById('pref-default-page');
  if (dp) dp.value = p.defaultPage || 'dashboard';
  ['colorAccentPrimary','colorAccentSecondary','colorRivalAccent','colorWin','colorDraw','colorLoss'].forEach(k => {
    const el = document.getElementById('pref-'+k);
    if (el) el.value = p[k] || DEFAULT_PREFS[k];
  });
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

let _seasonDragIdx = null;
function seasonDragStart(idx) { _seasonDragIdx = idx; }
function seasonDragOver(ev) { ev.preventDefault(); }
async function seasonDrop(idx) {
  if (_seasonDragIdx === null || _seasonDragIdx === idx) return;
  const [moved] = S.seasons.splice(_seasonDragIdx, 1);
  S.seasons.splice(idx, 0, moved);
  S.seasons.forEach((s,i) => s.sortOrder = i);
  for (const s of S.seasons) await dbPut('seasons', s);
  _seasonDragIdx = null;
  renderSeasonsManage(); renderSeasonSelect();
}
async function toggleSeasonVisible(id) {
  const s = S.seasons.find(x=>x.id===id);
  if (!s) return;
  s.hidden = !s.hidden;
  await dbPut('seasons', s);
  renderSeasonsManage(); renderSeasonSelect();
}

