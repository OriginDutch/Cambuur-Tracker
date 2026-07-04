// ══════════════════════════════
// DB
// ══════════════════════════════
const DB_NAME='CambuurTracker', DB_VER=2;
let db;
function initDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VER);r.onupgradeneeded=e=>{const d=e.target.result;['seasons','clubs','stadiums','competitions','players','matches','matchevents','coaches'].forEach(s=>{if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'id'});});if(!d.objectStoreNames.contains('settings'))d.createObjectStore('settings',{keyPath:'key'});};r.onsuccess=e=>{db=e.target.result;res();};r.onerror=()=>rej(r.error);});}
const dbGet=(s,k)=>new Promise((r,j)=>{const q=db.transaction(s,'readonly').objectStore(s).get(k);q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error);});
const dbPut=(s,o)=>new Promise((r,j)=>{const q=db.transaction(s,'readwrite').objectStore(s).put(o);q.onsuccess=()=>{r(q.result);_scheduleAutosave();};q.onerror=()=>j(q.error);});
let _autosaveTimer=null;
function _scheduleAutosave(){clearTimeout(_autosaveTimer);_autosaveTimer=setTimeout(()=>fsWriteData(),2000);gistSchedulePush();}
const dbDel=(s,k)=>new Promise((r,j)=>{const q=db.transaction(s,'readwrite').objectStore(s).delete(k);q.onsuccess=()=>r();q.onerror=()=>j(q.error);});
const dbAll=(s)=>new Promise((r,j)=>{const q=db.transaction(s,'readonly').objectStore(s).getAll();q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error);});
const dbClr=(s)=>new Promise((r,j)=>{const q=db.transaction(s,'readwrite').objectStore(s).clear();q.onsuccess=()=>r();q.onerror=()=>j(q.error);});
const saveSetting=(k,v)=>dbPut('settings',{key:k,value:v});

// ══════════════════════════════
// STATE
// ══════════════════════════════
let S={lang:'nl',theme:'dark',currentSeason:null,seasons:[],clubs:[],stadiums:[],competitions:[]};

// ══════════════════════════════
// UI — sessie-/scherm-state (geen data, geen persistence)
// ══════════════════════════════
// AFSPRAAK: nieuwe tijdelijke UI-state (actieve tab, open/dicht-status,
// modal-selecties, filters, e.d.) hoort hier onder UI, niet als losse
// window._xxx variabele of losse `let` bovenaan een bestand.
//
// Er staan nog bestaande losse globals verspreid door de app heen
// (o.a. window._playerTransfers, window._vergTab, window._vergP1/P2,
// window._openRounds, swStep/swStadCount/swClubCount, s365Matches/s365Selected).
// Die hoeven niet in één keer gemigreerd te worden — verplaats ze
// gewoon naar UI zodra je toch al in dat bestand aan het werk bent
// voor iets anders. Zo groeit de opruiming organisch mee zonder een
// risicovolle refactor in één keer over de hele codebase.
let UI={};

async function loadAll(){
  const setts=await dbAll('settings');
  setts.forEach(s=>{if(s.key==='lang')S.lang=s.value;if(s.key==='theme')S.theme=s.value;if(s.key==='currentSeason')S.currentSeason=s.value;if(s.key==='prefs'){try{S.prefs=JSON.parse(s.value);}catch(e){}}});
  S.pinnedNextMatch=null;S.seasons=await dbAll('seasons');S.clubs=await dbAll('clubs');S.stadiums=await dbAll('stadiums');S.competitions=await dbAll('competitions');S.players=await dbAll('players');S.matches=await dbAll('matches');S.coaches=await dbAll('coaches');
  sortSeasons(S.seasons);
  S.competitions.sort((a,b)=>{
    if(a.sortOrder!=null&&b.sortOrder!=null)return a.sortOrder-b.sortOrder;
    if(a.sortOrder!=null)return -1;if(b.sortOrder!=null)return 1;
    return 0;
  });
  if(!S.currentSeason&&S.seasons.length>0)S.currentSeason=S.seasons[0].id;
}

// ══════════════════════════════
// INIT
// ══════════════════════════════
async function init(){
  await initDB();await loadAll();
  applyTheme(S.theme);
  document.getElementById('dark-mode-toggle').checked=S.theme==='dark';
  document.getElementById('lang-select').value=S.lang;
  if (!S.prefs) S.prefs = {};
  applyPrefs();
  // Migrate legacy transfer fields to transfers array (runs once)
  await migrateTransfers();
  // Migrate legacy status:'geblesseerd' to injuries array (runs once)
  await migrateInjuries();
  // Migrate remaining legacy transfer/status velden (huurder/uitgeleend/vertrokken
  // + aankoop/verkoop/vrije-transfer/eigen-jeugd) volledig naar transfers[] (runs once)
  await migrateLegacyPlayerFieldsV2();
  renderSeasonSelect();renderCompetitionsNav();renderDashboard();renderSeasonsManage();
  if(S.seasons.length===0){initWizard();document.getElementById('setup-overlay').classList.add('open');}
  setTimeout(checkDepartedPlayers, 800);
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
  else if(type==='competition'){
    await dbDel('competitions',id);S.competitions=S.competitions.filter(c=>c.id!==id);
    const compMatches=(S.matches||[]).filter(m=>m.competitionId===id);
    for(const m of compMatches)await dbDel('matches',m.id);
    S.matches=(S.matches||[]).filter(m=>m.competitionId!==id);
    renderCompetitionsNav();renderCompetitionsPage();
  }
  else if(type==='season'){
    await dbDel('seasons',id);S.seasons=S.seasons.filter(s=>s.id!==id);
    const linked=S.competitions.filter(c=>c.seasonId===id);
    for(const c of linked)await dbDel('competitions',c.id);
    S.competitions=S.competitions.filter(c=>c.seasonId!==id);
    // Cascade: ook alle wedstrijden van dit seizoen verwijderen (anders blijven ze als weesdata staan)
    const linkedCompIds=new Set(linked.map(c=>c.id));
    const seasonMatches=(S.matches||[]).filter(m=>m.seasonId===id||linkedCompIds.has(m.competitionId));
    for(const m of seasonMatches)await dbDel('matches',m.id);
    S.matches=(S.matches||[]).filter(m=>m.seasonId!==id&&!linkedCompIds.has(m.competitionId));
    if(S.currentSeason===id){S.currentSeason=S.seasons[0]?.id||null;await saveSetting('currentSeason',S.currentSeason);}
    renderSeasonSelect();renderCompetitionsNav();renderSeasonsManage();renderDashboard();
  }
  closeModal('modal-confirm');showToast('Verwijderd','success');pendingDel=null;
});

