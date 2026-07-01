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
  renderSeasonSelect();renderCompetitionsNav();renderDashboard();renderSeasonsManage();
  if(S.seasons.length===0){initWizard();document.getElementById('setup-overlay').classList.add('open');}
  setTimeout(checkDepartedPlayers, 800);
}
