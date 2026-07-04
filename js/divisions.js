
// ══════════════════════════════════════════════════════
// DIVISIEHISTORIE — op welk niveau komt een club uit
// ══════════════════════════════════════════════════════
// Zelfde opzet als transfers.js/injuries.js: een club blijft in een divisie
// staan tot er een nieuwe ingang wordt toegevoegd (promotie/degradatie).
// De divisielijst zelf (namen + volgorde) wordt beheerd in Instellingen.

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
  const sorted = [...entries].sort((a,b)=>(b.startDate||'').localeCompare(a.startDate||''));
  el.innerHTML = sorted.map((h) => {
    const realIdx = entries.indexOf(h);
    return `<div style="display:grid;grid-template-columns:1fr 130px 1fr 28px;gap:5px;align-items:end;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border-light)">
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
      <button class="icon-btn danger" style="height:26px;margin-top:16px" onclick="window._clubDivisions.splice(${realIdx},1);renderDivisionHistory()">✕</button>
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
