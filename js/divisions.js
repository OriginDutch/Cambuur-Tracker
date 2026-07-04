
// ══════════════════════════════════════════════════════
// DIVISIEHISTORIE — op welk niveau komt een club uit
// ══════════════════════════════════════════════════════
// Zelfde opzet als transfers.js/injuries.js: een club blijft in een divisie
// staan tot er een nieuwe ingang wordt toegevoegd (promotie/degradatie).
// De divisielijst zelf (namen + volgorde) wordt beheerd in Instellingen.

let _divisionDragIdx = null;
function divisionDragStart(idx) { _divisionDragIdx = idx; }
function divisionDragOver(ev) { ev.preventDefault(); }
function divisionDrop(idx) {
  if (_divisionDragIdx === null || _divisionDragIdx === idx) return;
  const arr = window._clubDivisions || [];
  const [moved] = arr.splice(_divisionDragIdx, 1);
  arr.splice(idx, 0, moved);
  _divisionDragIdx = null;
  renderDivisionHistory();
}

function renderDivisionHistory() {
  const el = document.getElementById('division-history-list');
  if (!el) return;
  const entries = window._clubDivisions || [];
  const divisions = S.prefs?.divisions || [];
  if (!divisions.length) {
    el.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">Nog geen divisies ingesteld — voeg die eerst toe bij Instellingen → Divisies.</p>';
    return;
  }
  if (!entries.length) {
    el.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">Nog geen divisiehistorie geregistreerd.</p>';
    return;
  }
  el.innerHTML = entries.map((h, realIdx) => {
    return `<div draggable="true" ondragstart="divisionDragStart(${realIdx})" ondragover="divisionDragOver(event)" ondrop="divisionDrop(${realIdx})"
      style="display:flex;gap:6px;align-items:end;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border-light)">
      <div style="cursor:grab;color:var(--text-muted);padding-bottom:6px;user-select:none" title="Sleep om te herordenen">⠿</div>
      <div style="display:grid;grid-template-columns:1fr 130px 1fr;gap:5px;align-items:end;flex:1">
        <div>
          <label class="form-label" style="font-size:10px">Divisie</label>
          <select class="form-select" style="height:26px;font-size:12px" onchange="window._clubDivisions[${realIdx}].division=this.value">
            ${divisions.map(d=>`<option value="${d}" ${h.division===d?'selected':''}>${d}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="form-label" style="font-size:10px">Vanaf</label>
          <input class="form-input" type="date" value="${h.startDate||''}" style="height:26px;font-size:11px"
            onchange="window._clubDivisions[${realIdx}].startDate=this.value">
        </div>
        <div>
          <label class="form-label" style="font-size:10px">Notitie</label>
          <input class="form-input" value="${h.note||''}" style="height:26px;font-size:11px" placeholder="bv. kampioen, gedegradeerd..."
            oninput="window._clubDivisions[${realIdx}].note=this.value">
        </div>
      </div>
      <button class="icon-btn danger" style="height:26px" onclick="window._clubDivisions.splice(${realIdx},1);renderDivisionHistory()">✕</button>
    </div>`;
  }).join('');
}

function addDivisionEntry() {
  const divisions = S.prefs?.divisions || [];
  if (!divisions.length) { showToast('Stel eerst divisies in bij Instellingen', 'error'); return; }
  if (!window._clubDivisions) window._clubDivisions = [];
  window._clubDivisions.unshift({division: divisions[0], startDate: new Date().toISOString().split('T')[0], note:''});
  renderDivisionHistory();
}

function clearAllDivisionHistory() {
  if (!(window._clubDivisions||[]).length) return;
  if (!confirm('Alle divisiehistorie van deze club wissen? Dit kan niet ongedaan worden gemaakt.')) return;
  window._clubDivisions = [];
  renderDivisionHistory();
}
