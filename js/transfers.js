
// ══════════════════════════════════════════════════════
// TRANSFERHISTORIE
// ══════════════════════════════════════════════════════

const TRANSFER_TYPES = [
  {value:'huur-in',     label:'⬅️ Gehuurd van',       icon:'⬅️', hasClub:true,  hasDates:true,  hasAmount:false},
  {value:'huur-uit',    label:'➡️ Uitgeleend aan',     icon:'➡️', hasClub:true,  hasDates:true,  hasAmount:false},
  {value:'transfer-in', label:'📥 Transfer in',        icon:'📥', hasClub:true,  hasDates:false, hasAmount:true},
  {value:'transfer-uit',label:'📤 Transfer uit',       icon:'📤', hasClub:true,  hasDates:false, hasAmount:true},
  {value:'verlenging',  label:'📝 Contractverlenging', icon:'📝', hasClub:false, hasDates:true,  hasAmount:false},
];

const ALL_TRANSFER_TYPES = TRANSFER_TYPES;

let _transferDragIdx = null;
function transferDragStart(idx) { _transferDragIdx = idx; }
function transferDragOver(ev) { ev.preventDefault(); }
function transferDrop(idx) {
  if (_transferDragIdx === null || _transferDragIdx === idx) return;
  const arr = window._playerTransfers || [];
  const [moved] = arr.splice(_transferDragIdx, 1);
  arr.splice(idx, 0, moved);
  _transferDragIdx = null;
  renderTransferHistory();
}

function renderTransferHistory() {
  const el = document.getElementById('transfer-history-list');
  if (!el) return;
  const entries = window._playerTransfers || [];
  if (!entries.length) {
    el.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">Nog geen transfers toegevoegd.</p>';
    return;
  }
  el.innerHTML = entries.map((t, realIdx) => {
    const typeDef = TRANSFER_TYPES.find(x=>x.value===t.type) || TRANSFER_TYPES[0];
    const clubLabel = t.type==='huur-in'?'Van club':t.type==='huur-uit'?'Aan club':t.type==='transfer-in'?'Van club':t.type==='transfer-uit'?'Naar club':null;
    const clubPlaceholder = t.type==='huur-in'?'FC Utrecht':t.type==='huur-uit'?'Helmond Sport':t.type==='transfer-in'?'FC Utrecht':'SC Heerenveen';
    return `<div draggable="true" ondragstart="transferDragStart(${realIdx})" ondragover="transferDragOver(event)" ondrop="transferDrop(${realIdx})"
      style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border-light);display:flex;gap:6px">
      <div style="cursor:grab;color:var(--text-muted);padding-top:18px;user-select:none" title="Sleep om te herordenen">⠿</div>
      <div style="flex:1">
      <!-- Rij 1: Type · Club · Van -->
      <div style="display:grid;grid-template-columns:130px ${typeDef.hasClub?'1fr ':''} 120px;gap:5px;align-items:end;margin-bottom:4px">
        <div>
          <label class="form-label" style="font-size:10px">Type</label>
          <select class="form-select" style="height:26px;font-size:11px" onchange="window._playerTransfers[${realIdx}].type=this.value;renderTransferHistory()">
            ${TRANSFER_TYPES.map(x=>`<option value="${x.value}" ${t.type===x.value?'selected':''}>${x.label}</option>`).join('')}
          </select>
        </div>
        ${typeDef.hasClub?`<div>
          <label class="form-label" style="font-size:10px">${clubLabel}</label>
          <input class="form-input" value="${t.club||''}" style="height:26px;font-size:12px" placeholder="${clubPlaceholder}"
            oninput="window._playerTransfers[${realIdx}].club=this.value">
        </div>`:''}
        <div>
          <label class="form-label" style="font-size:10px">${typeDef.hasDates?'Van':'Datum'}</label>
          <input class="form-input" type="date" value="${t.date||''}" style="height:26px;font-size:11px"
            onchange="window._playerTransfers[${realIdx}].date=this.value">
        </div>
      </div>
      <!-- Rij 2: Tot · Bedrag · Notitie · Verwijder -->
      <div style="display:grid;grid-template-columns:${typeDef.hasDates?'120px ':''}${typeDef.hasAmount?'100px ':''}1fr 28px;gap:5px;align-items:end">
        ${typeDef.hasDates?`<div>
          <label class="form-label" style="font-size:10px">Tot</label>
          <input class="form-input" type="date" value="${t.dateTo||''}" style="height:26px;font-size:11px"
            onchange="window._playerTransfers[${realIdx}].dateTo=this.value">
        </div>`:''}
        ${typeDef.hasAmount?`<div>
          <label class="form-label" style="font-size:10px">Bedrag (opt.)</label>
          <input class="form-input" type="number" min="0" value="${t.amount||''}" placeholder="0"
            style="height:26px;font-size:11px"
            oninput="window._playerTransfers[${realIdx}].amount=parseFloat(this.value)||null">
        </div>`:''}
        <div>
          <label class="form-label" style="font-size:10px">Notitie</label>
          <input class="form-input" value="${t.note||''}" style="height:26px;font-size:11px" placeholder="Optioneel..."
            oninput="window._playerTransfers[${realIdx}].note=this.value">
        </div>
        <button class="icon-btn danger" style="height:26px;margin-top:16px" onclick="window._playerTransfers.splice(${realIdx},1);renderTransferHistory()">✕</button>
      </div>
      </div>
    </div>`;
  }).join('');
}

function addTransferEntry() {
  if (!window._playerTransfers) window._playerTransfers = [];
  window._playerTransfers.unshift({type:'huur-in', club:'', date:'', dateTo:'', note:'', amount:null});
  renderTransferHistory();
}

function clearAllTransfers() {
  if (!(window._playerTransfers||[]).length) return;
  if (!confirm('Alle transferhistorie van deze speler wissen? Dit kan niet ongedaan worden gemaakt.')) return;
  window._playerTransfers = [];
  renderTransferHistory();
}

// ── Derive effective status from transfers ──
function effectiveStatusFromTransfers(player, refDate) {
  const transfers = player.transfers;
  if (!transfers || !transfers.length) return null; // no timeline → use legacy fields

  const ref = refDate || new Date().toISOString().split('T')[0];

  // Find active huur-uit (player is currently loaned out) — meest recente bij meerdere matches
  const activeHuurUit = transfers.filter(t =>
    t.type === 'huur-uit' && t.date && t.date <= ref &&
    (!t.dateTo || t.dateTo > ref)
  ).sort((a,b)=>b.date.localeCompare(a.date))[0];
  if (activeHuurUit) return 'uitgeleend';

  // Find active huur-in (player is on loan from another club)
  const activeHuurIn = transfers.filter(t =>
    t.type === 'huur-in' && t.date && t.date <= ref &&
    (!t.dateTo || t.dateTo > ref)
  ).sort((a,b)=>b.date.localeCompare(a.date))[0];
  if (activeHuurIn) return 'huurder';

  // Check for transfer-uit (departure) — meest recente vertrek is leidend
  const transferUit = transfers.filter(t => t.type === 'transfer-uit' && t.date)
    .sort((a,b)=>b.date.localeCompare(a.date))[0];
  if (transferUit) {
    if (transferUit.date > ref) return 'vertrekt';
    if (transferUit.date <= ref) return 'vertrokken';
  }

  return 'actief';
}

// ══════════════════════════════════════════════════════
// TRANSFER MIGRATIE — legacy velden → transfers array
// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
// MIGRATIE v2 — resterende legacy velden (huurder/uitgeleend/vertrokken +
// aankoop/verkoop/vrije-transfer/eigen-jeugd) volledig naar transfers[]
// ══════════════════════════════════════════════════════
// migrateTransfers() (hierboven) deed dit al gedeeltelijk voor joined/departureDate.
// Deze ronde vangt ook de status-tab-specifieke velden (loanFromClub/loanClub/
// departureClub/buyOption) die niet via syncLegacyToTransfers liepen, brengt
// status terug tot alleen actief/geschorst, en ruimt alle legacy velden op.
async function migrateLegacyPlayerFieldsV2() {
  const done = await dbGet('settings', 'legacy_player_fields_v2_migrated');
  if (done?.value) return;

  const players = S.players || [];
  let migrated = 0;

  for (const p of players) {
    let transfers = syncLegacyToTransfers(p, p.transfers || []);
    let changed = transfers.length !== (p.transfers||[]).length;

    // Huurder-status zonder huur-in ingang (status-tab, los van het join-moment)
    if (p.status === 'huurder' && p.loanFromClub && !transfers.some(t=>t.type==='huur-in')) {
      transfers.push({type:'huur-in', club:p.loanFromClub, date:p.joined||new Date().toISOString().split('T')[0],
        dateTo:p.loanFromReturn||null, note:p.buyOption?('Koopoptie: '+p.buyOption):'', amount:null});
      changed = true;
    }
    // Uitgeleend-status zonder huur-uit ingang — startdatum is bij benadering
    // (dat werd in het oude model nergens vastgelegd)
    if (p.status === 'uitgeleend' && p.loanClub && !transfers.some(t=>t.type==='huur-uit')) {
      transfers.push({type:'huur-uit', club:p.loanClub, date:p.joined||new Date().toISOString().split('T')[0],
        dateTo:p.loanReturn||null, note:'(gemigreerd, startdatum bij benadering)', amount:null});
      changed = true;
    }

    if (changed) {
      transfers = transfers.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
      p.transfers = transfers;
    }

    // Check vóórdat we opruimen: komt de afgeleide status (uit transfers[]) nog
    // overeen met de oude, handmatige status? Zo niet: iets is niet meer actueel
    // (bv. een huur-einddatum die al verstreken is) — dat lossen we niet
    // stilzwijgend op, we melden het zodat je de transferhistorie kunt nakijken.
    if (['huurder','uitgeleend','vertrokken'].includes(p.status)) {
      const today = new Date().toISOString().split('T')[0];
      const derived = effectiveStatusFromTransfers(p, today);
      if (derived !== p.status) {
        window._migrationMismatches = window._migrationMismatches || [];
        window._migrationMismatches.push({name: `${p.firstname||''} ${p.lastname}`.trim(), oldStatus: p.status, derived: derived||'actief'});
      }
    }

    // Status terugbrengen tot alleen actief/geschorst
    if (['huurder','uitgeleend','vertrokken'].includes(p.status)) {
      p.status = 'actief';
      changed = true;
    }

    // 'In dienst sinds' bijwerken op basis van de vroegste inkomende ingang
    const incoming = (p.transfers||[]).filter(t=>(t.type==='transfer-in'||t.type==='huur-in')&&t.date)
      .sort((a,b)=>a.date.localeCompare(b.date))[0];
    if (incoming?.date && incoming.date !== p.joined) { p.joined = incoming.date; changed = true; }

    // Legacy velden opruimen — alles zit nu in transfers[]/injuries[]
    ['loanFromClub','loanFromReturn','buyOption','loanClub','loanReturn','departureDate',
     'departureClub','buyFee','freeTransferIn','youthProduct','loanIn','previousClub',
     'freeTransferOut','sellFee','injuryType','returnDate'].forEach(f => { if (f in p) { delete p[f]; changed = true; } });

    if (changed) { await dbPut('players', p); migrated++; }
  }

  await saveSetting('legacy_player_fields_v2_migrated', true);
  if (migrated > 0) console.log(`Legacy speler-velden v2 migratie: ${migrated} speler(s) bijgewerkt`);

  if (window._migrationMismatches?.length) {
    const names = window._migrationMismatches.map(m => `${m.name} (was "${m.oldStatus}", nu "${m.derived}")`).join(', ');
    console.warn('Let op — status kwam niet overeen met de transferhistorie bij:', names);
    showToast(`Let op: bij ${window._migrationMismatches.length} speler(s) klopte de status niet meer met de transferhistorie (bv. verlopen huurperiode) — check de console voor details`, 'error');
  }
}

async function migrateTransfers() {

  // Only run once
  const done = await dbGet('settings', 'transfers_migrated_v1');
  if (done?.value) return;

  const players = S.players || [];
  let migrated = 0;

  for (const p of players) {
    const existing = p.transfers || [];
    const newEntries = [];

    // ── Binnenkomst ──
    if (p.joined) {
      // Check if we already have a transfer-in or huur-in around the joined date
      const hasIncoming = existing.some(t =>
        ['transfer-in','huur-in'].includes(t.type) &&
        t.date && Math.abs(new Date(t.date) - new Date(p.joined)) < 1000*60*60*24*30
      );
      if (!hasIncoming) {
        if (p.loanIn) {
          newEntries.push({
            type: 'huur-in',
            club: p.previousClub || p.loanFromClub || '',
            date: p.joined,
            dateTo: p.loanFromReturn || null,
            note: '',
            amount: null,
          });
        } else {
          newEntries.push({
            type: 'transfer-in',
            club: p.previousClub || '',
            date: p.joined,
            dateTo: null,
            note: p.freeTransferIn ? 'Vrije transfer' : p.youthProduct ? 'Eigen jeugd' : '',
            amount: p.buyFee ? parseFloat(p.buyFee) : null,
          });
        }
      }
    }

    // ── Vertrek ──
    if (p.departureDate) {
      const hasDeparture = existing.some(t =>
        t.type === 'transfer-uit' &&
        t.date && Math.abs(new Date(t.date) - new Date(p.departureDate)) < 1000*60*60*24*30
      );
      if (!hasDeparture) {
        newEntries.push({
          type: 'transfer-uit',
          club: p.departureClub || '',
          date: p.departureDate,
          dateTo: null,
          note: p.freeTransferOut ? 'Vrije transfer' : '',
          amount: p.sellFee ? parseFloat(p.sellFee) : null,
        });
      }
    }

    // ── Huur-in via loanFromClub (legacy) ──
    if (p.loanFromClub && !p.loanIn) {
      const hasLoanIn = existing.some(t => t.type === 'huur-in');
      if (!hasLoanIn) {
        newEntries.push({
          type: 'huur-in',
          club: p.loanFromClub,
          date: p.joined || '',
          dateTo: p.loanFromReturn || null,
          note: '',
          amount: null,
        });
      }
    }

    if (newEntries.length) {
      p.transfers = [...existing, ...newEntries];
      await dbPut('players', p);
      migrated++;
    }
  }

  // Update S.players in memory
  S.players = await (async () => { const {dbAll} = window; return dbAll ? dbAll('players') : S.players; })()
    .catch(() => S.players);

  await saveSetting('transfers_migrated_v1', true);
  if (migrated > 0) console.log(`Transfer migratie: ${migrated} spelers bijgewerkt`);
}

// ── Sync legacy player fields into transfers array ──
// Called on every save — ensures transfers[] stays in sync with profile fields
function syncLegacyToTransfers(player, existing) {
  const result = [...existing];

  const hasType = (type, date) => result.some(t =>
    t.type === type &&
    (!date || (t.date && Math.abs(new Date(t.date) - new Date(date)) < 1000*60*60*24*32))
  );

  // Incoming transfer
  if (player.joined && !hasType('transfer-in', player.joined) && !hasType('huur-in', player.joined)) {
    if (player.loanIn) {
      result.push({type:'huur-in', club: player.previousClub||player.loanFromClub||'', date: player.joined, dateTo: player.loanFromReturn||null, note:'', amount:null});
    } else {
      result.push({type:'transfer-in', club: player.previousClub||'', date: player.joined, dateTo:null,
        note: player.freeTransferIn?'Vrije transfer':player.youthProduct?'Eigen jeugd':'',
        amount: player.buyFee ? parseFloat(player.buyFee) : null});
    }
  }

  // Departure
  if (player.departureDate && !hasType('transfer-uit', player.departureDate)) {
    result.push({type:'transfer-uit', club: player.departureClub||'', date: player.departureDate, dateTo:null,
      note: player.freeTransferOut?'Vrije transfer':'',
      amount: player.sellFee ? parseFloat(player.sellFee) : null});
  }

  return result.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
}
