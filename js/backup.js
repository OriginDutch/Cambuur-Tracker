// ══════════════════════════════════════════════════════
// BACKUP — export/import JSON, lokale bestandssync (File System API)
// ══════════════════════════════════════════════════════

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
    matches:S.matches||[], coaches:S.coaches||[], prefs:S.prefs||{}, pinnedNextMatch:S.pinnedNextMatch||null};
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
    if(data.prefs){S.prefs=data.prefs;await dbPut('settings',{key:'prefs',value:JSON.stringify(S.prefs)});}
    if(data.pinnedNextMatch){S.pinnedNextMatch=data.pinnedNextMatch;await saveSetting('pinnedNextMatch',S.pinnedNextMatch);}
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

