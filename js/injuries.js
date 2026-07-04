
// ══════════════════════════════════════════════════════
// BLESSUREHISTORIE
// ══════════════════════════════════════════════════════
// Losstaand van player.status — een speler kan tegelijk een transferstatus
// (bv. 'uitgeleend') én geblesseerd zijn. Blessure is dus geen keuze meer
// in de status-dropdown, maar een eigen tijdlijn zoals transfers.

let _injuryDragIdx = null;
function injuryDragStart(idx) { _injuryDragIdx = idx; }
function injuryDragOver(ev) { ev.preventDefault(); }
function injuryDrop(idx) {
  if (_injuryDragIdx === null || _injuryDragIdx === idx) return;
  const arr = window._playerInjuries || [];
  const [moved] = arr.splice(_injuryDragIdx, 1);
  arr.splice(idx, 0, moved);
  _injuryDragIdx = null;
  renderInjuryHistory();
}

function renderInjuryHistory() {
  const el = document.getElementById('injury-history-list');
  if (!el) return;
  const entries = window._playerInjuries || [];
  if (!entries.length) {
    el.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">Nog geen blessures geregistreerd.</p>';
    return;
  }
  el.innerHTML = entries.map((inj, realIdx) => {
    const active = !inj.actualReturn;
    return `<div draggable="true" ondragstart="injuryDragStart(${realIdx})" ondragover="injuryDragOver(event)" ondrop="injuryDrop(${realIdx})"
      style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border-light);display:flex;gap:6px;${active?'background:rgba(245,158,11,0.05);border-radius:4px;padding:8px':''}">
      <div style="cursor:grab;color:var(--text-muted);padding-top:18px;user-select:none" title="Sleep om te herordenen">⠿</div>
      <div style="flex:1">
      <div style="display:grid;grid-template-columns:1fr 120px;gap:5px;align-items:end;margin-bottom:4px">
        <div>
          <label class="form-label" style="font-size:10px">Type blessure</label>
          <input class="form-input" value="${inj.type||''}" style="height:26px;font-size:12px" placeholder="Hamstring, knie..."
            oninput="window._playerInjuries[${realIdx}].type=this.value">
        </div>
        <div>
          <label class="form-label" style="font-size:10px">Startdatum</label>
          <input class="form-input" type="date" value="${inj.startDate||''}" style="height:26px;font-size:11px"
            onchange="window._playerInjuries[${realIdx}].startDate=this.value">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:120px 120px 1fr 28px;gap:5px;align-items:end">
        <div>
          <label class="form-label" style="font-size:10px">Verwachte terugkeer</label>
          <input class="form-input" type="date" value="${inj.expectedReturn||''}" style="height:26px;font-size:11px"
            onchange="window._playerInjuries[${realIdx}].expectedReturn=this.value">
        </div>
        <div>
          <label class="form-label" style="font-size:10px">Daadwerkelijke terugkeer</label>
          <input class="form-input" type="date" value="${inj.actualReturn||''}" style="height:26px;font-size:11px"
            onchange="window._playerInjuries[${realIdx}].actualReturn=this.value;renderInjuryHistory()">
        </div>
        <div>
          <label class="form-label" style="font-size:10px">Notitie</label>
          <input class="form-input" value="${inj.note||''}" style="height:26px;font-size:11px" placeholder="Optioneel..."
            oninput="window._playerInjuries[${realIdx}].note=this.value">
        </div>
        <button class="icon-btn danger" style="height:26px;margin-top:16px" onclick="window._playerInjuries.splice(${realIdx},1);renderInjuryHistory()">✕</button>
      </div>
      ${active?'<div style="font-size:10px;color:var(--draw);font-weight:700;margin-top:4px">● Actief (nog geen terugkeerdatum ingevuld)</div>':''}
      </div>
    </div>`;
  }).join('');
}

function addInjuryEntry() {
  if (!window._playerInjuries) window._playerInjuries = [];
  window._playerInjuries.unshift({type:'', startDate:new Date().toISOString().split('T')[0], expectedReturn:'', actualReturn:'', note:''});
  renderInjuryHistory();
}

function clearAllInjuries() {
  if (!(window._playerInjuries||[]).length) return;
  if (!confirm('Alle blessurehistorie van deze speler wissen? Dit kan niet ongedaan worden gemaakt.')) return;
  window._playerInjuries = [];
  renderInjuryHistory();
}

// Geeft de actieve blessure op de opgegeven datum (of nu), of null als er geen is.
// 'Actief' = startDate is verstreken en er is nog geen actualReturn, of de
// verwachte terugkeer ligt nog in de toekomst t.o.v. refDate.
function effectiveInjuryStatus(player, refDate) {
  const injuries = player.injuries;
  if (!injuries || !injuries.length) return null;
  const ref = refDate || new Date().toISOString().split('T')[0];

  const candidates = injuries.filter(inj => {
    if (!inj.startDate || inj.startDate > ref) return false;
    if (inj.actualReturn) return inj.actualReturn > ref; // al terug op refDate? dan niet actief
    return true; // geen actualReturn ingevuld = nog altijd geblesseerd
  }).sort((a,b) => b.startDate.localeCompare(a.startDate)); // meest recente eerst, ongeacht array-volgorde
  return candidates[0] || null;
}

// ══════════════════════════════════════════════════════
// MIGRATIE — legacy status:'geblesseerd' + injuryType/returnDate → injuries[]
// ══════════════════════════════════════════════════════
async function migrateInjuries() {
  const done = await dbGet('settings', 'injuries_migrated_v1');
  if (done?.value) return;

  const players = S.players || [];
  let migrated = 0;

  for (const p of players) {
    if (p.status !== 'geblesseerd') continue;

    const existing = p.injuries || [];
    p.injuries = [...existing, {
      type: p.injuryType || '',
      startDate: '', // onbekend — legacy hield geen startdatum bij
      expectedReturn: p.returnDate || '',
      actualReturn: '',
      note: '(gemigreerd vanuit oude status)',
    }];
    // Blessure is niet langer een status-waarde — val terug op 'actief'
    p.status = 'actief';
    delete p.injuryType;
    delete p.returnDate;

    await dbPut('players', p);
    migrated++;
  }

  await saveSetting('injuries_migrated_v1', true);
  if (migrated > 0) console.log(`Blessure-migratie: ${migrated} speler(s) bijgewerkt`);
}
