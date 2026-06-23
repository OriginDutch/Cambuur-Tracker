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

async function loadAll(){
  const setts=await dbAll('settings');
  setts.forEach(s=>{if(s.key==='lang')S.lang=s.value;if(s.key==='theme')S.theme=s.value;if(s.key==='currentSeason')S.currentSeason=s.value;if(s.key==='defaultFormation')window._defaultFormation=s.value;if(s.key==='defaultFieldWidth'&&parseInt(s.value))window._defaultFieldWidth=parseInt(s.value);if(s.key==='loadouts'){try{if(!S.loadouts)S.loadouts=JSON.parse(s.value);}catch(e){}}
    if(s.key==='prefs'){try{S.prefs=JSON.parse(s.value);}catch(e){}}});
  S.pinnedNextMatch=null;S.seasons=await dbAll('seasons');S.clubs=await dbAll('clubs');S.stadiums=await dbAll('stadiums');S.competitions=await dbAll('competitions');S.players=await dbAll('players');S.matches=await dbAll('matches');S.coaches=await dbAll('coaches');
  S.seasons.sort((a,b)=>{
    if(a.sortOrder!=null&&b.sortOrder!=null)return a.sortOrder-b.sortOrder;
    if(a.sortOrder!=null)return -1;if(b.sortOrder!=null)return 1;
    const ay=parseInt(a.name?.match(/^(\d{4})/)?.[1]||a.year||0);
    const by=parseInt(b.name?.match(/^(\d{4})/)?.[1]||b.year||0);
    return by-ay;
  });
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
  await loadDefaultFormation();
  if (!S.prefs) S.prefs = {};
  applyPrefs();
  renderSeasonSelect();renderCompetitionsNav();renderDashboard();renderSeasonsManage();
  if(S.seasons.length===0){initWizard();document.getElementById('setup-overlay').classList.add('open');}
  // Check for players whose departure date has passed
  setTimeout(checkDepartedPlayers, 800);
}
