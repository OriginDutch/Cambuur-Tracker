
// ══════════════════════════════════════════════════════
// TRANSFERHISTORIE
// ══════════════════════════════════════════════════════

const TRANSFER_TYPES = [
  {value:'huur-uit',  label:'➡️ Uitgeleend aan',     icon:'➡️'},
  {value:'verlenging',label:'📝 Contractverlenging', icon:'📝'},
];
// All types including auto-generated (for timeline display)
const ALL_TRANSFER_TYPES = [
  {value:'transfer-in',  label:'📥 Transfer in',      icon:'📥'},
  {value:'transfer-uit', label:'📤 Transfer uit',     icon:'📤'},
  {value:'huur-uit',     label:'➡️ Uitgeleend aan',   icon:'➡️'},
  {value:'huur-in',      label:'⬅️ Gehuurd van',      icon:'⬅️'},
  {value:'terugkeer',    label:'↩️ Terug van verhuur', icon:'↩️'},
  {value:'verlenging',   label:'📝 Contractverlenging',icon:'📝'},
];

function renderTransferHistory() {
  const el = document.getElementById('transfer-history-list');
  if (!el) return;
  const entries = window._playerTransfers || [];
  if (!entries.length) {
    el.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">Nog geen transfers toegevoegd.</p>';
    return;
  }
  const sorted = [...entries].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  el.innerHTML = sorted.map((t) => {
    const realIdx = entries.indexOf(t);
    const isHuur = t.type === 'huur-uit';
    return `<div style="display:grid;grid-template-columns:110px 1fr 80px 80px 28px;gap:5px;align-items:end;margin-bottom:6px">
      <div>
        <label class="form-label" style="font-size:10px">Type</label>
        <select class="form-select" style="height:26px;font-size:11px" onchange="window._playerTransfers[${realIdx}].type=this.value;renderTransferHistory()">
          ${TRANSFER_TYPES.map(x=>`<option value="${x.value}" ${t.type===x.value?'selected':''}>${x.label}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="form-label" style="font-size:10px">${isHuur?'Club':'Notitie'}</label>
        <input class="form-input" value="${t.club||t.note||''}" style="height:26px;font-size:12px"
          placeholder="${isHuur?'Helmond Sport':'Cluboptie gelicht...'}"
          oninput="window._playerTransfers[${realIdx}][this.dataset.field]=this.value" data-field="${isHuur?'club':'note'}">
      </div>
      <div>
        <label class="form-label" style="font-size:10px">Van</label>
        <input class="form-input" type="date" value="${t.date||''}" style="height:26px;font-size:11px"
          onchange="window._playerTransfers[${realIdx}].date=this.value">
      </div>
      <div>
        <label class="form-label" style="font-size:10px">Tot</label>
        <input class="form-input" type="date" value="${t.dateTo||''}" style="height:26px;font-size:11px"
          onchange="window._playerTransfers[${realIdx}].dateTo=this.value">
      </div>
      <button class="icon-btn danger" style="height:26px" onclick="window._playerTransfers.splice(${realIdx},1);renderTransferHistory()">✕</button>
    </div>`;
  }).join('');
}

function addTransferEntry() {
  if (!window._playerTransfers) window._playerTransfers = [];
  window._playerTransfers.unshift({type:'transfer-in', club:'', date:'', dateTo:'', note:''});
  renderTransferHistory();
}

// ── Derive effective status from transfers ──
function effectiveStatusFromTransfers(player, refDate) {
  const transfers = player.transfers;
  if (!transfers || !transfers.length) return null; // no timeline → use legacy fields

  const ref = refDate || new Date().toISOString().split('T')[0];

  // Find active huur-uit (player is currently loaned out)
  const activeHuurUit = transfers.find(t =>
    t.type === 'huur-uit' && t.date && t.date <= ref &&
    (!t.dateTo || t.dateTo > ref)
  );
  if (activeHuurUit) return 'uitgeleend';

  // Find active huur-in (player is on loan from another club)
  const activeHuurIn = transfers.find(t =>
    t.type === 'huur-in' && t.date && t.date <= ref &&
    (!t.dateTo || t.dateTo > ref)
  );
  if (activeHuurIn) return 'huurder';

  // Check for transfer-uit (departure)
  const transferUit = transfers.find(t => t.type === 'transfer-uit' && t.date);
  if (transferUit) {
    if (transferUit.date > ref) return 'vertrekt';
    if (transferUit.date <= ref) return 'vertrokken';
  }

  return 'actief';
}
