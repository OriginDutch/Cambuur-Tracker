
// ══════════════════════════════
// SPELER MODAL
// ══════════════════════════════
function openPlayerModal(editId) {
  // Reset tabs
  switchPlayerModalTab('basis', document.querySelector('#player-modal-tabs .tab'));
  document.getElementById('edit-player-id').value = editId || '';
  currentValueEntries = [];

  populateNatDropdown('');
  if (editId) {
    const p = (S.players || []).find(x => x.id === editId);
    if (!p) return;
    document.getElementById('modal-player-title').textContent = 'Speler bewerken';
    document.getElementById('player-photo').value = p.photo || '';
    document.getElementById('player-firstname').value = p.firstname || '';
    document.getElementById('player-lastname').value = p.lastname || '';
    document.getElementById('player-number').value = p.number || '';
    document.getElementById('player-dob').value = p.dob || '';
    populateNatDropdown(p.nationality || '');
    document.getElementById('player-position').value = p.position || '';
    document.getElementById('player-joined').value = p.joined || '';
    document.getElementById('player-contract').value = p.contract || '';
    document.getElementById('player-available-from').value = p.availableFrom || '';
    document.getElementById('player-note').value = p.note || '';
    document.getElementById('player-buy-fee').value = p.buyFee || '';
    document.getElementById('player-free-transfer-in').checked = p.freeTransferIn || false;
    document.getElementById('player-youth-product').checked = p.youthProduct || false;
    document.getElementById('player-loan-in').checked = p.loanIn || false;
    document.getElementById('player-previous-club').value = p.previousClub || '';
    document.getElementById('player-previous-club-wrap').style.display = p.loanIn ? 'block' : 'none';
    window._playerTransfers = JSON.parse(JSON.stringify(p.transfers||[]));
    renderTransferHistory();
    switchPlayerModalTab('basis', null);
    document.getElementById('player-foot') && (document.getElementById('player-foot').value = p.foot || '');
    document.getElementById('player-height') && (document.getElementById('player-height').value = p.height || '');
    document.getElementById('player-status').value = p.status || 'actief';
    updateSubposOptions();
    // Restore selected subpos
    selectedSubpos = p.subpos || [];
    selectedSubpos.forEach(sv => {
      const opt = document.querySelector(`#subpos-dropdown [data-val="${sv}"]`);
      if (opt) { opt.classList.add('selected'); opt.querySelector('span').style.opacity = '1'; }
    });
    renderSubposDisplay();
    currentValueEntries = JSON.parse(JSON.stringify(p.valueHistory || []));
    updateStatusFields();
    // Fill status-specific fields
    const sf = document.getElementById('status-fields');
    if (p.status === 'huurder') { document.getElementById('sf-loan-from-club') && (document.getElementById('sf-loan-from-club').value = p.loanFromClub || ''); document.getElementById('sf-loan-from-return') && (document.getElementById('sf-loan-from-return').value = p.loanFromReturn || ''); document.getElementById('sf-buy-option') && (document.getElementById('sf-buy-option').value = p.buyOption || ''); }
    if (p.status === 'geblesseerd') { document.getElementById('sf-injury-type') && (document.getElementById('sf-injury-type').value = p.injuryType || ''); document.getElementById('sf-return-date') && (document.getElementById('sf-return-date').value = p.returnDate || ''); }
    if (p.status === 'geschorst') { document.getElementById('sf-suspension-end') && (document.getElementById('sf-suspension-end').value = p.suspensionEnd || ''); }
    if (p.status === 'uitgeleend') { document.getElementById('sf-loan-club') && (document.getElementById('sf-loan-club').value = p.loanClub || ''); document.getElementById('sf-loan-return') && (document.getElementById('sf-loan-return').value = p.loanReturn || ''); }
    if (p.status === 'vertrokken') { document.getElementById('sf-departure-date') && (document.getElementById('sf-departure-date').value = p.departureDate || ''); document.getElementById('sf-departure-club') && (document.getElementById('sf-departure-club').value = p.departureClub || ''); }
  } else {
    document.getElementById('modal-player-title').textContent = 'Speler toevoegen';
    ['player-photo','player-firstname','player-lastname','player-number','player-dob',
     'player-joined','player-contract','player-available-from','player-note','player-buy-fee'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('player-free-transfer-in').checked = false;
    document.getElementById('player-youth-product').checked = false;
    document.getElementById('player-loan-in').checked = false;
    document.getElementById('player-previous-club').value = '';
    document.getElementById('player-previous-club-wrap').style.display = 'none';
    window._playerTransfers = [];
    renderTransferHistory();
    document.getElementById('player-foot') && (document.getElementById('player-foot').value = '');
    document.getElementById('player-height') && (document.getElementById('player-height').value = '');
    populateNatDropdown('');
    document.getElementById('player-position').value = '';
    document.getElementById('player-status').value = 'actief';
    selectedSubpos = [];
    updateSubposOptions();
    updateStatusFields();
  }
  renderValueEntriesList();
  previewAvatar();
  document.getElementById('modal-player').classList.add('open');
}

function switchPlayerModalTab(tab, el) {
  ['basis','waarde','status','transfers'].forEach(t => {
    const el2 = document.getElementById('pmt-' + t);
    if (el2) el2.style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('#player-modal-tabs .tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  else document.querySelector('#player-modal-tabs .tab')?.classList.add('active');
  if (tab === 'basis') renderTransferHistory();
}

function previewAvatar() {
  const url = document.getElementById('player-photo').value.trim();
  const ln = document.getElementById('player-lastname').value.trim();
  const fn = document.getElementById('player-firstname').value.trim();
  const preview = document.getElementById('player-avatar-preview');
  if (url) {
    preview.innerHTML = `<img src="${url}" onerror="this.parentElement.textContent='${initials(fn,ln)}'">`;
  } else {
    preview.textContent = initials(fn, ln) || '?';
  }
}

function initials(fn, ln) {
  const f = fn ? fn[0].toUpperCase() : '';
  const l = ln ? ln[0].toUpperCase() : '';
  return f + l || '?';
}

function formatEuro(val) {
  if (!val) return '—';
  if (val >= 1000000) return '€' + (val/1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (val >= 1000) return '€' + (val/1000).toFixed(0) + 'K';
  return '€' + val;
}

function updateStatusFields() {
  const status = document.getElementById('player-status').value;
  const sf = document.getElementById('status-fields');
  const fields = {
    huurder: `<div class="form-row cols-2">
      <div class="form-group"><label class="form-label">Moederclub</label><input class="form-input" id="sf-loan-from-club" placeholder="Club van herkomst"></div>
      <div class="form-group"><label class="form-label">Huur loopt tot</label><input class="form-input" id="sf-loan-from-return" type="date"></div>
    </div>
    <div class="form-group"><label class="form-label">Koopoptie</label>
      <select class="form-select" id="sf-buy-option">
        <option value="">Geen koopoptie</option>
        <option value="optie">Koopoptie aanwezig</option>
        <option value="verplicht">Verplichte doorkoop</option>
      </select>
    </div>`,
    geblesseerd: `<div class="form-row cols-2">
      <div class="form-group"><label class="form-label">Blessuretype</label><input class="form-input" id="sf-injury-type" placeholder="Hamstring, knie..."></div>
      <div class="form-group"><label class="form-label">Verwachte terugkeer</label><input class="form-input" id="sf-return-date" type="date"></div>
    </div>`,
    geschorst: `<div class="form-group"><label class="form-label">Geschorst tot</label><input class="form-input" id="sf-suspension-end" type="date"></div>`,
    uitgeleend: `<div class="form-row cols-2">
      <div class="form-group"><label class="form-label">Uitleenclub</label><input class="form-input" id="sf-loan-club" placeholder=""></div>
      <div class="form-group"><label class="form-label">Terugkeer datum</label><input class="form-input" id="sf-loan-return" type="date"></div>
    </div>`,
    vertrokken: `<div class="form-row cols-2">
      <div class="form-group"><label class="form-label">Vertrekdatum</label><input class="form-input" id="sf-departure-date" type="date"></div>
      <div class="form-group"><label class="form-label">Naar club (optioneel)</label><input class="form-input" id="sf-departure-club" placeholder=""></div>
    </div>
    <div class="form-row cols-2">
      <div class="form-group"><label class="form-label">Verkoopbedrag (optioneel)</label><input class="form-input" id="sf-sell-fee" type="number" placeholder="0"><div class="form-hint">Laat leeg als onbekend</div></div>
      <div class="form-group" style="display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:20px"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px"><input type="checkbox" id="sf-free-transfer-out" style="accent-color:var(--cambuur-geel)"><span>Vrije transfer</span></label></div>
    </div>`,
  };
  sf.innerHTML = fields[status] || '<p class="text-muted" style="font-size:12px;padding:8px 0">Geen extra velden nodig.</p>';
}

// ── WAARDEHISTORIE ──
function addValueEntry() {
  document.getElementById('value-entry-form').style.display = 'block';
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('ve-date').value = today;
  document.getElementById('ve-amount').value = '';
  document.getElementById('ve-note').value = '';
}

function saveValueEntry() {
  const date = document.getElementById('ve-date').value;
  const amount = parseInt(document.getElementById('ve-amount').value);
  const note = document.getElementById('ve-note').value.trim();
  if (!date || !amount) { showToast('Datum en waarde zijn verplicht', 'error'); return; }
  currentValueEntries.push({ date, amount, note });
  currentValueEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
  document.getElementById('value-entry-form').style.display = 'none';
  renderValueEntriesList();
}

function renderValueEntriesList() {
  const wrap = document.getElementById('value-entries-list');
  if (!currentValueEntries.length) {
    wrap.innerHTML = '<p class="text-muted" style="font-size:12px;padding:8px 0">Nog geen waardes ingevoerd. Voeg de huidige (of historische) marktwaarde toe.</p>';
    return;
  }
  wrap.innerHTML = currentValueEntries.map((e, i) => {
    if (e._editing) {
      return `<div class="value-history-row" style="flex-wrap:wrap;gap:6px;background:var(--bg-hover);padding:10px 12px">
        <div style="display:grid;grid-template-columns:120px 130px 1fr auto;gap:6px;width:100%;align-items:center">
          <input class="form-input" id="ve-edit-date-${i}" type="date" value="${e.date}" style="height:30px;font-size:11px;padding:4px 6px">
          <input class="form-input" id="ve-edit-amount-${i}" type="number" value="${e.amount}" placeholder="Bedrag" style="height:30px;font-size:11px;padding:4px 6px">
          <input class="form-input" id="ve-edit-note-${i}" value="${e.note||''}" placeholder="Notitie" style="height:30px;font-size:11px;padding:4px 6px">
          <div style="display:flex;gap:4px">
            <button class="btn btn-primary" style="font-size:11px;padding:3px 8px;height:30px" onclick="saveValueEdit(${i})">✓</button>
            <button class="btn btn-secondary" style="font-size:11px;padding:3px 6px;height:30px" onclick="cancelValueEdit(${i})">✕</button>
          </div>
        </div>
      </div>`;
    }
    const prev = currentValueEntries[i + 1];
    let trend = '';
    if (prev && !prev._editing) {
      const diff = e.amount - prev.amount;
      const pct = ((diff / prev.amount) * 100).toFixed(0);
      if (diff > 0) trend = `<span class="value-trend-up">▲ ${formatEuro(diff)} (+${pct}%)</span>`;
      else if (diff < 0) trend = `<span class="value-trend-down">▼ ${formatEuro(Math.abs(diff))} (${pct}%)</span>`;
      else trend = `<span class="value-trend-flat">— gelijk</span>`;
    }
    return `<div class="value-history-row">
      <div>
        <span style="font-weight:600">${formatEuro(e.amount)}</span>
        ${trend}
        ${e.note ? `<span class="text-muted" style="font-size:11px;margin-left:8px">${e.note}</span>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <span class="text-muted" style="font-size:11px">${e.date}</span>
        <button class="icon-btn" onclick="editValueEntry(${i})" title="Bewerken">✏️</button>
        <button class="icon-btn danger" onclick="removeValueEntry(${i})">✕</button>
      </div>
    </div>`;
  }).join('');
}

function removeValueEntry(i) {
  currentValueEntries.splice(i, 1);
  renderValueEntriesList();
}
function editValueEntry(i) {
  currentValueEntries[i]._editing = true;
  renderValueEntriesList();
}
function saveValueEdit(i) {
  const date = document.getElementById('ve-edit-date-'+i)?.value;
  const amount = parseInt(document.getElementById('ve-edit-amount-'+i)?.value);
  const note = document.getElementById('ve-edit-note-'+i)?.value.trim();
  if (!date || !amount) { showToast('Datum en bedrag zijn verplicht', 'error'); return; }
  currentValueEntries[i] = { date, amount, note: note || '' };
  currentValueEntries.sort((a,b) => new Date(b.date) - new Date(a.date));
  renderValueEntriesList();
}
function cancelValueEdit(i) {
  delete currentValueEntries[i]._editing;
  renderValueEntriesList();
}

// ── OPSLAAN ──
async function savePlayer() {
  const fn = document.getElementById('player-firstname').value.trim();
  const ln = document.getElementById('player-lastname').value.trim();
  if (!ln) { showToast('Achternaam is verplicht', 'error'); return; }
  const pos = document.getElementById('player-position').value;
  if (!pos) { showToast('Selecteer een positie', 'error'); return; }

  const existing = document.getElementById('edit-player-id').value;
  const id = existing || 'player_' + Date.now();
  const status = document.getElementById('player-status').value;

  const player = {
    id,
    firstname: fn,
    lastname: ln,
    photo: document.getElementById('player-photo').value.trim(),
    number: parseInt(document.getElementById('player-number').value) || null,
    dob: document.getElementById('player-dob').value,
    nationality: document.getElementById('player-nationality').value.trim(),
    position: pos,
    subpos: [...selectedSubpos],
    joined: document.getElementById('player-joined').value,
    contract: document.getElementById('player-contract').value,
    availableFrom: document.getElementById('player-available-from').value || null,
    note: document.getElementById('player-note').value.trim(),
    foot: document.getElementById('player-foot')?.value || '',
    height: parseInt(document.getElementById('player-height')?.value) || null,
    status,
    valueHistory: [...currentValueEntries],
    // Status-specific fields
    injuryType: status === 'geblesseerd' ? (document.getElementById('sf-injury-type')?.value || '') : '',
    returnDate: status === 'geblesseerd' ? (document.getElementById('sf-return-date')?.value || '') : '',
    suspensionEnd: status === 'geschorst' ? (document.getElementById('sf-suspension-end')?.value || '') : '',
    loanFromClub: status === 'huurder' ? (document.getElementById('sf-loan-from-club')?.value || '') : '',
    loanFromReturn: status === 'huurder' ? (document.getElementById('sf-loan-from-return')?.value || '') : '',
    buyOption: status === 'huurder' ? (document.getElementById('sf-buy-option')?.value || '') : '',
    loanClub: status === 'uitgeleend' ? (document.getElementById('sf-loan-club')?.value || '') : '',
    loanReturn: status === 'uitgeleend' ? (document.getElementById('sf-loan-return')?.value || '') : '',
    departureDate: status === 'vertrokken' ? (document.getElementById('sf-departure-date')?.value || '') : '',
    departureClub: status === 'vertrokken' ? (document.getElementById('sf-departure-club')?.value || '') : '',
    createdAt: existing ? ((S.players||[]).find(p=>p.id===existing)?.createdAt || Date.now()) : Date.now(),
    buyFee: parseInt(document.getElementById('player-buy-fee').value) || 0,
    freeTransferIn: document.getElementById('player-free-transfer-in').checked,
    youthProduct: document.getElementById('player-youth-product').checked,
    loanIn: document.getElementById('player-loan-in').checked,
    previousClub: document.getElementById('player-previous-club').value || null,
    transfers: window._playerTransfers || [],
    sellFee: status === 'vertrokken' ? (parseInt(document.getElementById('sf-sell-fee')?.value) || 0) : (existing ? ((S.players||[]).find(p=>p.id===existing)?.sellFee || 0) : 0),
    freeTransferOut: status === 'vertrokken' ? (document.getElementById('sf-free-transfer-out')?.checked || false) : false,
  };

  if (!S.players) S.players = [];

  // Sync legacy fields into transfers array
  const existingTransfers = window._playerTransfers || [];
  const syncedTransfers = syncLegacyToTransfers(player, existingTransfers);
  player.transfers = syncedTransfers;

  await dbPut('players', player);
  if (existing) {
    const idx = S.players.findIndex(p => p.id === existing);
    if (idx >= 0) S.players[idx] = player; else S.players.push(player);
  } else {
    S.players.push(player);
  }
  closeModal('modal-player');
  renderSelectie();
  showToast('Speler opgeslagen: ' + (fn ? fn + ' ' : '') + ln, 'success');
}

// ══════════════════════════════
// SELECTIE RENDEREN
// ══════════════════════════════
function switchSelectieTab(tab, el) {
  document.getElementById('selectie-actief').style.display = tab === 'actief' ? 'block' : 'none';
  document.getElementById('selectie-archief').style.display = tab === 'archief' ? 'block' : 'none';
  document.querySelectorAll('#selectie-tabs .tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  if (tab === 'archief') renderArchief();
}

function setPlayerView(mode) {
  if (mode === 'veld') mode = 'kaart'; // veld view removed
  playerViewMode = mode;
  document.getElementById('view-btn-kaart').classList.toggle('active', mode === 'kaart');
  document.getElementById('view-btn-lijst').classList.toggle('active', mode === 'lijst');
  renderSelectie();
}

function renderSelectie() {
  if (!S.players) S.players = [];
  const today = new Date().toISOString().split('T')[0];

  // Effective status: if vertrokken but departureDate in future → treat as 'vertrekt'
  // Huidige seizoen object
  const currentSeason = (S.seasons||[]).find(s=>s.id===S.currentSeason);
  const seasonRange = currentSeason ? getSeasonDateRange(currentSeason) : null;
  window._currentSeasonRange = seasonRange; // expose for playerCard badges

  const effectiveStatus = (p) => {
    const refDate = seasonRange ? seasonRange.end : today;
    // Try transfers timeline first
    const fromTimeline = effectiveStatusFromTransfers(p, refDate);
    if (fromTimeline) {
      // For historical seasons: hide future departures
      if (fromTimeline === 'vertrokken' || fromTimeline === 'vertrekt') {
        const t = (p.transfers||[]).find(x=>x.type==='transfer-uit');
        if (t && seasonRange && t.date >= seasonRange.end) return 'actief';
      }
      return fromTimeline;
    }
    // Fallback: legacy fields
    if (seasonRange && p.departureDate && p.departureDate >= seasonRange.end) {
      const baseStatus = p.status === 'vertrokken' || p.status === 'vertrekt'
        ? 'actief' : (p.status || 'actief');
      return baseStatus;
    }
    if (p.status === 'vertrokken' && p.departureDate && p.departureDate > today) return 'vertrekt';
    return p.status || 'actief';
  };
  // Search filter
  const searchQ = (document.getElementById('selectie-search')?.value||'').toLowerCase().trim();

  const active = S.players.filter(p => {
    if (!currentSeason) {
      const es = effectiveStatus(p);
      if (['vertrokken','uitgeleend'].includes(es)) return false;
    } else {
      if (!isPlayerInSeason(p, currentSeason)) return false;
    }
    if (!searchQ) return true;
    return (p.firstname||'').toLowerCase().includes(searchQ) ||
           (p.lastname||'').toLowerCase().includes(searchQ) ||
           (p.number?.toString()||'').includes(searchQ) ||
           (p.position||'').toLowerCase().includes(searchQ) ||
           (p.nationality||'').toLowerCase().includes(searchQ) ||
           (p.subpos||[]).some(s=>s.toLowerCase().includes(searchQ));
  });

  const groups = [
    { key: 'Aanvaller', label: 'Aanvallers' },
    { key: 'Middenvelder', label: 'Middenvelders' },
    { key: 'Verdediger', label: 'Verdedigers' },
    { key: 'Keeper', label: 'Keepers' },
  ];
  // Position mapping: subpositions used as main position → parent group
  const posGroup = p => {
    const pos = p.position || '';
    if (['Aanvaller','Linksbuiten','Rechtsbuiten','Spits','Tweede Spits','Schaduwspits'].includes(pos)) return 'Aanvaller';
    if (['Middenvelder','Defensieve Middenvelder','Centrale Middenvelder','Aanvallende Middenvelder','Controleur'].includes(pos)) return 'Middenvelder';
    if (['Verdediger','Centrale Verdediger','Linksback','Rechtsback','Linker Wingback','Rechter Wingback','Libero','Stopper'].includes(pos)) return 'Verdediger';
    if (['Keeper','Uitkomende Keeper'].includes(pos)) return 'Keeper';
    return pos; // fallback: show as-is
  };
  // Uitgeleende spelers apart
  const refDate = seasonRange ? seasonRange.end : today;
  const uitgeleend = active.filter(p => effectiveStatus(p) === 'uitgeleend');

  // Vertrokken spelers dit seizoen (departureDate valt binnen het seizoen)
  const vertrokken = currentSeason ? active.filter(p => {
    const dep = p.departureDate || null;
    if (!dep) return false;
    const range = getSeasonDateRange(currentSeason);
    if (!range) return false;
    return dep > range.start && dep <= range.end;
  }) : [];
  const vertrokkenIds = new Set(vertrokken.map(p => p.id));

  // Actieve selectie: niet uitgeleend, niet vertrokken dit seizoen
  const activeInSquad = active.filter(p =>
    effectiveStatus(p) !== 'uitgeleend' && !vertrokkenIds.has(p.id)
  );
  const el = document.getElementById('selectie-content');
  if (!active.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">Nog geen spelers</div><div class="empty-state-desc">Voeg spelers toe via de knop rechtsboven.</div></div>';
    return;
  }

  // Sort function based on mode
  const stats = window._playerStats || {};
  const sortFn = (a, b) => {
    switch (playerSortMode) {
      case 'rugnummer': return (a.number||99) - (b.number||99);
      case 'naam': return a.lastname.localeCompare(b.lastname);
      case 'waarde': return (b.valueHistory?.[0]?.amount||0) - (a.valueHistory?.[0]?.amount||0);
      case 'goals': return (stats[b.id]?.goals||0) - (stats[a.id]?.goals||0);
      case 'assists': return (stats[b.id]?.assists||0) - (stats[a.id]?.assists||0);
      case 'leeftijd': return (a.dob||'9999') < (b.dob||'0000') ? -1 : 1;
      default: // positie
        const sk = subposSortKey(a) - subposSortKey(b);
        return sk !== 0 ? sk : (a.number||99) - (b.number||99);
    }
  };

  // Totale selectiewaarde balk
  const displayPlayers = showVertrokken ? [...activeInSquad, ...vertrokken] : activeInSquad;
  const totals = calcValueTotals(displayPlayers);
  let summaryHtml = '';
  if (totals.count > 0) {
    summaryHtml = `<div class="value-summary-bar">
      <div class="value-summary-item"><div class="value-summary-val">${formatEuro(totals.total)}</div><div class="value-summary-lbl">Totale selectiewaarde</div></div>
      <div class="value-summary-divider"></div>
      <div class="value-summary-item"><div class="value-summary-val" style="font-size:16px">${formatGrowth(totals.growth)}</div><div class="value-summary-lbl">Seizoensgroei</div></div>
      <div class="value-summary-divider"></div>
      <div class="value-summary-item"><div class="value-summary-val" style="font-size:16px;color:var(--text-secondary)">${displayPlayers.length}</div><div class="value-summary-lbl">${showVertrokken?"Seizoen":"Spelers"}</div></div>
    </div>`;
  }

  let html = summaryHtml;

  if (playerSortMode !== 'positie') {
    // Flat sorted list across all groups
    const sorted = [...activeInSquad, ...(showVertrokken?vertrokken:[])].sort(sortFn);
    if (playerViewMode === 'kaart') {
      html += `<div class="player-grid">${sorted.map(p => playerCard(p, effectiveStatus(p))).join('')}</div>`;
    } else {
      html += playerListView(sorted, effectiveStatus);
    }
  } else {
    groups.forEach(g => {
      const activePl = activeInSquad.filter(p => posGroup(p) === g.key).sort(sortFn);
      const vertrokkenPl = showVertrokken ? vertrokken.filter(p => posGroup(p) === g.key).sort(sortFn) : [];
      if (!activePl.length && !vertrokkenPl.length) return;
      const total = activePl.length + vertrokkenPl.length;
      const gTotals = calcValueTotals(activePl);
      const gValStr = gTotals.count > 0 ? `${formatEuro(gTotals.total)} ${formatGrowth(gTotals.growth)}` : '';
      const isCollapsed = collapsedGroups.has(g.key);
      html += `<div class="posgroup-header" style="cursor:pointer" onclick="collapsedGroups.has('${g.key}')?collapsedGroups.delete('${g.key}'):collapsedGroups.add('${g.key}');renderSelectie()">
        <span class="position-group-title" style="margin:0;border:none;padding:0">${g.label} <span style="font-size:13px;font-weight:400;color:var(--text-muted)">(${total})</span></span>
        <div style="display:flex;align-items:center;gap:8px">
          ${gValStr ? `<span class="posgroup-total">${gValStr}</span>` : ''}
          <span style="font-size:12px;color:var(--text-muted)">${isCollapsed?'▼':'▲'}</span>
        </div>
      </div>`;
      if (!isCollapsed) {
        if (playerViewMode === 'kaart') {
          html += `<div class="player-grid">${activePl.map(p => playerCard(p, effectiveStatus(p))).join('')}</div>`;
          if (vertrokkenPl.length) {
            if (!vertrokkenMixed) {
              html += `<div style="border-top:1px dashed var(--border-light);margin:6px 0"></div>`;
              html += `<div class="player-grid" style="opacity:0.55;filter:grayscale(30%)">${vertrokkenPl.map(p => playerCard(p, 'vertrokken')).join('')}</div>`;
            } else {
              html += `<div class="player-grid">${vertrokkenPl.map(p => playerCard(p, effectiveStatus(p))).join('')}</div>`;
            }
          }
        } else {
          html += playerListView(activePl, effectiveStatus);
          if (vertrokkenPl.length) {
            if (!vertrokkenMixed) {
              html += `<table class="data-table" style="margin-bottom:8px;opacity:0.6"><tbody>`;
              vertrokkenPl.forEach(p => {
                const depDate = p.departureDate ? new Date(p.departureDate).toLocaleDateString('nl-NL',{day:'numeric',month:'short'}) : '—';
                html += `<tr onclick="navigateToPlayer('${p.id}')" onmouseenter="playerHoverShow(event,'${p.id}')" onmouseleave="playerHoverHide()" style="cursor:pointer">
                  <td class="text-muted">${p.number||'—'}</td>
                  <td><div style="display:flex;align-items:center;gap:8px">${playerAvatarHTML(p,'player-avatar',26)}<strong style="color:var(--text-muted)">${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</strong></div></td>
                  <td style="font-size:12px;color:var(--text-muted)">${posGroup(p)||'—'}</td>
                  <td style="font-size:12px;color:var(--text-muted)">${p.departureClub?'→ '+p.departureClub:''}</td>
                  <td style="font-size:11px;font-weight:600;color:var(--loss);white-space:nowrap">📤 ${depDate}</td>
                </tr>`;
              });
              html += `</tbody></table>`;
            } else {
              html += playerListView(vertrokkenPl, effectiveStatus);
            }
          }
        }
      }
    });

    // Uitgeleend sectie
    if (uitgeleend.length) {
      const isCollapsedUit = collapsedGroups.has('Uitgeleend');
      html += `<div class="posgroup-header" style="margin-top:16px;border-top:2px solid var(--border);cursor:pointer" onclick="collapsedGroups.has('Uitgeleend')?collapsedGroups.delete('Uitgeleend'):collapsedGroups.add('Uitgeleend');renderSelectie()">
        <span class="position-group-title" style="margin:0;border:none;padding:0;color:var(--text-muted)">Uitgeleend <span style="font-size:13px;font-weight:400">(${uitgeleend.length})</span></span>
        <span style="font-size:12px;color:var(--text-muted)">${isCollapsedUit?'▼':'▲'}</span>
      </div>`;
      if (!isCollapsedUit) {
        if (playerViewMode === 'kaart') {
          html += `<div class="player-grid">${uitgeleend.map(p => playerCard(p, 'uitgeleend')).join('')}</div>`;
        } else {
          html += `<table class="data-table" style="margin-bottom:12px;opacity:0.75"><tbody>`;
          uitgeleend.forEach(p => {
            const loan = (p.transfers||[]).find(t =>
              t.type==='huur-uit' && t.date && t.date <= refDate && (!t.dateTo || t.dateTo > refDate)
            );
            const loanClub = loan?.club || p.loanClub || '—';
            const loanTo = loan?.dateTo ? new Date(loan.dateTo).toLocaleDateString('nl-NL',{day:'numeric',month:'short'}) : (p.loanReturn || '—');
            html += `<tr onclick="navigateToPlayer('${p.id}')" onmouseenter="playerHoverShow(event,'${p.id}')" onmouseleave="playerHoverHide()" style="cursor:pointer">
              <td class="text-muted">${p.number||'—'}</td>
              <td><div style="display:flex;align-items:center;gap:8px">${playerAvatarHTML(p,'player-avatar',26)}<strong>${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</strong></div></td>
              <td style="font-size:12px;color:var(--text-muted)">${p.position||'—'}</td>
              <td style="font-size:12px">➡️ ${loanClub}</td>
              <td style="font-size:11px;color:var(--text-muted)">t/m ${loanTo}</td>
            </tr>`;
          });
          html += `</tbody></table>`;
        }
      }
    }
  }
  el.innerHTML = html;
  // Update toggle button labels
  const toggleBtn = document.getElementById('toggle-vertrokken-btn');
  if (toggleBtn) {
    toggleBtn.textContent = showVertrokken ? '👥 Huidig' : '📅 Volledig seizoen';
    toggleBtn.classList.toggle('active', showVertrokken);
  }
  const mixedBtn = document.getElementById('toggle-mixed-btn');
  if (mixedBtn) {
    mixedBtn.style.display = showVertrokken ? 'block' : 'none';
    mixedBtn.textContent = vertrokkenMixed ? '⊟ Gescheiden' : '⊞ Gemengd';
    mixedBtn.classList.toggle('active', vertrokkenMixed);
  }
}



function playerCard(p, effStatus) {
  effStatus = effStatus || p.status || 'actief';
  const av = playerAvatarHTML(p, 'player-avatar');
  const currentVal = p.valueHistory?.length ? formatEuro(p.valueHistory[0].amount) : '—';
  const trendArrow = (() => {
    if (!p.valueHistory || p.valueHistory.length < 2) return '<span style="color:var(--text-muted)">—</span>';
    const diff = p.valueHistory[0].amount - p.valueHistory[1].amount;
    if (diff > 0) return '<span style="color:var(--win);font-size:16px;font-weight:800">▲</span>';
    if (diff < 0) return '<span style="color:var(--loss);font-size:16px;font-weight:800">▼</span>';
    return '<span style="color:var(--draw);font-size:14px;font-weight:800">=</span>';
  })();
  // Verberg geblesseerd/geschorst badge als de datum al voorbij het seizoen is
  const _sr = window._currentSeasonRange || null;
  const _hideTimedStatus = _sr && (
    (effStatus === 'geblesseerd' && p.returnDate && p.returnDate > _sr.end) ||
    (effStatus === 'geschorst' && p.suspensionEnd && p.suspensionEnd > _sr.end)
  );
  const statusBadge = (effStatus && effStatus !== 'actief' && !_hideTimedStatus)
    ? `<span class="badge badge-status-${effStatus}" style="font-size:9px;margin-top:2px;display:inline-block">${statusLabelEff(p, effStatus)}</span>` : '';
  const contractWarn = contractWarning(p, _sr);
  const subposLine = p.subpos?.length
    ? p.subpos.slice(0,2).join(' · ') + (p.subpos.length > 2 ? ` +${p.subpos.length-2}` : '')
    : (p.position || '—');
  const age = p.dob ? Math.floor((Date.now() - new Date(p.dob)) / 31557600000) : null;
  const numBadge = p.number ? `<span class="player-num-badge">${p.number}</span>` : '';
  const nameLine = `${p.firstname ? p.firstname[0]+'.\u00a0' : ''}${p.lastname}`;
  const loanBadge = ''; // removed: statusBadge already shows huurder status
  const isLeaving = effStatus === 'vertrekt';

  // Club duration — end: departureDate → expired contract → today
  const clubStart = p.joined || null;
  const _today = new Date().toISOString().split('T')[0];
  const clubEnd = p.departureDate || (p.contract && p.contract < _today ? p.contract : null);
  const clubDur = (() => {
    if (!clubStart) return null;
    const from = new Date(clubStart);
    const to = clubEnd ? new Date(clubEnd) : new Date();
    if (from > to) return null; // joined in future
    let years = to.getFullYear() - from.getFullYear();
    let months = to.getMonth() - from.getMonth();
    if (months < 0) { years--; months += 12; }
    if (years === 0 && months === 0) return '< 1 mnd';
    if (years === 0) return `${months} mnd`;
    if (months === 0) return `${years} jr`;
    return `${years} jr ${months} mnd`;
  })();
  return `<div class="player-card${isLeaving ? ' player-card-leaving' : ''}" data-player-id="${p.id}" onclick="navigateToPlayer('${p.id}')" onmouseenter="playerHoverShow(event,'${p.id}')" onmouseleave="playerHoverHide()">
    <div class="player-card-top">
      ${av}
      <div style="flex:1;min-width:0;overflow:hidden">
        <div class="player-card-name" style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
          ${numBadge}
          <span style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nameLine}</span>
        </div>
        <div style="font-size:11px;color:var(--cambuur-geel);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:3px">${subposLine}</div>
        <div style="font-size:11px;color:var(--text-secondary);display:flex;gap:6px;margin-bottom:3px">
          ${age ? `<span>${age} jr</span>` : ''}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.nationality||'—'}</span>
        </div>
        <div style="display:flex;gap:3px;flex-wrap:wrap">${statusBadge}${loanBadge}${contractWarn}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0;align-self:flex-start">
        <button class="icon-btn" style="padding:2px 5px" onclick="event.stopPropagation();openPlayerModal('${p.id}')" title="Bewerken">✏️</button>
        <button class="icon-btn danger" style="padding:2px 5px" onclick="event.stopPropagation();confirmDelete('player','${p.id}','${p.lastname}')" title="Verwijderen">🗑️</button>
      </div>
    </div>
    <div class="player-card-stats">
      <div class="player-card-stat">
        <div class="player-card-stat-val" style="font-size:12px">${currentVal}</div>
        <div class="player-card-stat-lbl">Waarde</div>
      </div>
      <div style="width:1px;background:var(--border-light);margin:0 4px"></div>
      <div class="player-card-stat">
        <div class="player-card-stat-val">${trendArrow}</div>
        <div class="player-card-stat-lbl">Trend</div>
      </div>
      <div style="width:1px;background:var(--border-light);margin:0 4px"></div>
      <div class="player-card-stat">
        <div class="player-card-stat-val">${window._playerStats?.[p.id]?.goals??'—'}</div>
        <div class="player-card-stat-lbl">Goals</div>
      </div>
      <div style="width:1px;background:var(--border-light);margin:0 4px"></div>
      <div class="player-card-stat">
        <div class="player-card-stat-val">${window._playerStats?.[p.id]?.assists??'—'}</div>
        <div class="player-card-stat-lbl">Assists</div>
      </div>

    </div>
  </div>`;
}

function playerListView(players, effectiveStatus) {
  effectiveStatus = effectiveStatus || (p => p.status || 'actief');
  return `<table class="data-table" style="margin-bottom:12px;table-layout:fixed;width:100%"><thead><tr>
    <th style="width:40px">#</th><th style="width:180px">Naam</th><th style="width:160px">Positie</th>
    <th style="width:70px">Leeftijd</th><th style="width:90px">Nat.</th>
    <th style="width:110px">Marktwaarde</th><th style="width:120px">Status</th>
    <th style="width:60px">Goals</th><th style="width:60px">Assists</th><th style="width:70px"></th>
  </tr></thead><tbody>${players.map(p => {
    const age = p.dob ? Math.floor((Date.now()-new Date(p.dob))/31557600000) : '—';
    const val = p.valueHistory?.length ? formatEuro(p.valueHistory[0].amount) : '—';
    const es = effectiveStatus(p);
    return `<tr onclick="navigateToPlayer('${p.id}')" onmouseenter="playerHoverShow(event,'${p.id}')" onmouseleave="playerHoverHide()" style="cursor:pointer${es==='vertrekt'?';border-left:2px solid #ff8c00':''}">
      <td class="text-muted">${p.number||'—'}</td>
      <td><div style="display:flex;align-items:center;gap:8px">${playerAvatarHTML(p,'player-avatar',28)}<strong>${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</strong></div></td>
      <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.subpos?.length ? p.subpos.join(', ') : (p.position||'')}">${p.subpos?.length ? p.subpos[0] : (p.position||'—')}</td>
      <td>${age}</td>
      <td>${p.nationality||'—'}</td>
      <td>${val} ${getValueTrend(p)}</td>
      <td><span class="badge badge-status-${es}">${statusLabelEff(p,es)}</span></td>
      <td class="num">${window._playerStats?.[p.id]?.goals??'—'}</td>
      <td class="num">${window._playerStats?.[p.id]?.assists??'—'}</td>
      <td><div class="action-btns">
        <button class="icon-btn" onclick="event.stopPropagation();openPlayerModal('${p.id}')">✏️</button>
        <button class="icon-btn danger" onclick="event.stopPropagation();confirmDelete('player','${p.id}','${p.lastname}')">🗑️</button>
      </div></td>
    </tr>`;
  }).join('')}</tbody></table>`;
}

function playerAvatarHTML(p, cls, size) {
  const ini = initials(p.firstname||'', p.lastname||'');
  const sz = size ? `width:${size}px;height:${size}px;font-size:${Math.floor(size*0.35)}px` : '';
  if (p.photo) return `<div class="${cls}" style="${sz}"><img src="${p.photo}" onerror="this.parentElement.textContent='${ini}'"></div>`;
  return `<div class="${cls}" style="${sz}">${ini}</div>`;
}

function getValueTrend(p) {
  if (!p.valueHistory || p.valueHistory.length < 2) return '<span class="value-trend-flat">—</span>';
  const diff = p.valueHistory[0].amount - p.valueHistory[1].amount;
  if (diff > 0) return `<span class="value-trend-up">▲</span>`;
  if (diff < 0) return `<span class="value-trend-down">▼</span>`;
  return `<span class="value-trend-flat">—</span>`;
}

function statusLabel(p) {
  const today = new Date().toISOString().split('T')[0];
  if (p.status === 'vertrokken' && p.departureDate && p.departureDate > today) return 'Vertrekt';
  const labels = {actief:'Actief',huurder:'Huurling',geblesseerd:'Geblesseerd',geschorst:'Geschorst',uitgeleend:'Uitgeleend',vertrokken:'Vertrokken',vertrekt:'Vertrekt'};
  return labels[p.status||'actief'] || p.status;
}

function statusLabelEff(p, effStatus) {
  if (effStatus === 'vertrekt') {
    const d = p.departureDate ? new Date(p.departureDate).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'}) : '';
    return 'Vertrekt' + (d ? ' ' + d : '');
  }
  return statusLabel(p);
}

// ── SPELERSPROFIEL DETAIL ──
// ── ARCHIEF ──
function renderArchief() {
  if (!S.players) { document.getElementById('archief-content').innerHTML = ''; return; }
  populateArchiefSeasonFilter();
  const q = (document.getElementById('archief-search')?.value||'').toLowerCase();
  const seasonFilter = document.getElementById('archief-season-filter')?.value||'';
  const season = seasonFilter ? S.seasons.find(s=>s.id===seasonFilter) : null;

  // Determine season date range for filtering
  const range = season ? getSeasonDateRange(season) : null;
  const seasonStart = range?.start || null;
  const seasonEnd = range?.end || null;

  const today = new Date().toISOString().split('T')[0];

  // Helper: is this player effectively no longer at the club?
  const isGone = p => {
    if (['vertrokken','uitgeleend'].includes(p.status)) return true;
    // Contract verlopen en geen actieve status update
    if (p.contract && p.contract < today && p.status === 'actief') return true;
    return false;
  };

  // Helper: contract label
  const goneLabel = p => {
    if (p.status === 'vertrokken') return {label: 'Vertrokken', cls: 'badge-status-vertrokken'};
    if (p.status === 'uitgeleend') return {label: 'Uitgeleend', cls: 'badge-status-uitgeleend'};
    if (p.contract && p.contract < today) return {label: 'Contract afgelopen', cls: 'badge-status-vertrokken'};
    return {label: p.status||'—', cls: ''};
  };

  const archived = S.players.filter(p => {
    if (!isGone(p)) return false;
    // Season filter
    if (seasonFilter && range) {
      const joinedInSeason = p.joined && p.joined >= seasonStart && p.joined <= seasonEnd;
      const leftInSeason = (p.departureDate && p.departureDate >= seasonStart && p.departureDate <= seasonEnd)
        || (p.contract && p.contract >= seasonStart && p.contract <= seasonEnd);
      const loanInSeason = p.loanReturn && p.loanReturn >= seasonStart && p.loanReturn <= seasonEnd;
      // Also include if player was active during that season
      const activeInSeason = isPlayerInSeason(p, season) ||
        (p.joined && p.joined <= seasonEnd && (!p.departureDate || p.departureDate >= seasonStart));
      if (!joinedInSeason && !leftInSeason && !loanInSeason && !activeInSeason) return false;
    }
    if (!q) return true;
    return (p.lastname+' '+p.firstname+' '+p.position+' '+(p.departureClub||'')+' '+(p.loanClub||'')).toLowerCase().includes(q);
  });

  // Transfer stats — filtered by season if selected
  const playersForStats = seasonFilter && season
    ? (S.players||[]).filter(p=>{
        const joinedInSeason = p.joined && p.joined >= seasonStart && p.joined <= seasonEnd;
        const leftInSeason = p.departureDate && p.departureDate >= seasonStart && p.departureDate <= seasonEnd;
        return joinedInSeason || leftInSeason;
      })
    : (S.players||[]);

  const tf = calcTransferBalance(playersForStats);
  let tfHtml = '';
  const seasonLabel = season ? season.name : 'alle seizoenen';
  if (tf.inCount > 0 || tf.outCount > 0) {
    const netColor = tf.profit >= 0 ? 'var(--win)' : 'var(--loss)';
    tfHtml = `<div class="transfer-stat-bar">
      <div class="transfer-stat"><div class="transfer-stat-val text-loss">−${formatEuro(tf.inTotal)}</div><div class="transfer-stat-lbl">Uitgegeven (${tf.inCount})</div></div>
      <div class="transfer-stat"><div class="transfer-stat-val text-win">+${formatEuro(tf.outTotal)}</div><div class="transfer-stat-lbl">Ontvangen (${tf.outCount})</div></div>
      <div class="transfer-stat"><div class="transfer-stat-val" style="color:${netColor}">${tf.profit>=0?'+':''}${formatEuro(tf.profit)}</div><div class="transfer-stat-lbl">Netto transfersom</div></div>
      <div style="font-size:10px;color:var(--text-muted);align-self:flex-end;padding-bottom:2px">excl. bijkomende kosten · ${seasonLabel}</div>
    </div>`;
  } else if (seasonFilter) {
    tfHtml = `<p class="text-muted mb-12" style="font-size:12px">Geen transfergegevens bekend voor ${seasonLabel}.</p>`;
  }

  if (!archived.length) {
    document.getElementById('archief-content').innerHTML = tfHtml +
      '<div class="empty-state"><div class="empty-state-icon">📁</div><div class="empty-state-title">Archief is leeg</div><div class="empty-state-desc">Vertrokken en uitgeleende spelers verschijnen hier automatisch.</div></div>';
    return;
  }

  // Helper: seasons a player was at the club (date-based, not match-based)
  const playerSeasons = p => {
    const today = new Date().toISOString().split('T')[0];
    const joined = p.joined || null;
    const dep = p.departureDate || null;
    const effectiveEnd = dep || (p.contract && p.contract < today ? p.contract : null);
    return (S.seasons||[]).filter(s => {
      if (s.hidden) return false;
      const r = getSeasonDateRange(s);
      if (!r) return false;
      if (joined && joined > r.end) return false;
      if (effectiveEnd && effectiveEnd < r.start) return false;
      return true;
    }).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  };

  // Helper: season range string "2015/16 – 2025/26 (10 seizoenen)"
  const seasonRangeStr = seasons => {
    if (!seasons.length) return '—';
    if (seasons.length === 1) return `${seasons[0].name} (1 seizoen)`;
    return `${seasons[0].name} – ${seasons[seasons.length-1].name} (${seasons.length} seizoenen)`;
  };

  // Helper: total career stats at club
  const careerStats = p => {
    return (S.seasons||[]).reduce((acc, s) => {
      const st = calcPlayerStats(p.id, s.id, null);
      acc.appearances += st.appearances||0;
      acc.goals += st.goals||0;
      acc.assists += st.assists||0;
      return acc;
    }, {appearances:0, goals:0, assists:0});
  };

  // Helper: duration at club
  // End: departureDate → expired contract → today (for active players)
  const clubDuration = p => {
    const start = p.joined || null;
    if (!start) return '—';
    const today = new Date().toISOString().split('T')[0];
    const end = p.departureDate || (p.contract && p.contract < today ? p.contract : null);
    const from = new Date(start);
    const to = end ? new Date(end) : new Date();
    if (from > to) return '—'; // joined in future
    let years = to.getFullYear() - from.getFullYear();
    let months = to.getMonth() - from.getMonth();
    if (months < 0) { years--; months += 12; }
    if (years === 0 && months === 0) return '< 1 mnd';
    if (years === 0) return `${months} mnd`;
    if (months === 0) return `${years} jr`;
    return `${years} jr ${months} mnd`;
  };

  document.getElementById('archief-content').innerHTML = tfHtml +
    `<table class="data-table"><thead><tr>
      <th>Speler</th><th>Positie</th><th>Status</th><th>Seizoenen</th><th>Totaal</th><th>Duur</th><th>Aankoop</th><th>Verkoop</th><th></th>
    </tr></thead><tbody>${archived.map(p=>{
      const gl = goneLabel(p);
      const depDate = p.departureDate||p.contract||'';
      const seasons = playerSeasons(p);
      const stats = careerStats(p);
      return `<tr style="cursor:pointer" onclick="navigateToPlayer('${p.id}')">
        <td><div style="display:flex;align-items:center;gap:8px">${playerAvatarHTML(p,'player-avatar',28)}<strong>${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</strong></div></td>
        <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.subpos?.length?p.subpos[0]:p.position||'—'}</td>
        <td><span class="badge ${gl.cls}">${gl.label}</span>${depDate?` <span style="font-size:10px;color:var(--text-muted)">${new Date(depDate).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'})}</span>`:''}</td>
        <td style="font-size:11px;color:var(--text-secondary);white-space:nowrap">${seasonRangeStr(seasons)}</td>
        <td style="font-size:12px;white-space:nowrap">
          ${stats.appearances?`<span>${stats.appearances}W</span> `:''}
          ${stats.goals?`<span style="color:var(--cambuur-geel)">⚽${stats.goals}</span> `:''}
          ${stats.assists?`<span>🎯${stats.assists}</span>`:''}
          ${!stats.appearances?'<span class="text-muted">—</span>':''}
        </td>
        <td style="font-size:11px;color:var(--text-muted);white-space:nowrap">${clubDuration(p)}</td>
        <td class="text-secondary" style="font-size:11px">${p.youthProduct?'Jeugd':p.loanIn?'Huurspeler':p.freeTransferIn?'Vrije transfer':p.buyFee?formatEuro(p.buyFee):'—'}</td>
        <td class="text-secondary" style="font-size:11px">${p.freeTransferOut?'Vrije transfer':p.sellFee?formatEuro(p.sellFee):'—'}</td>
        <td><div class="action-btns"><button class="icon-btn" onclick="event.stopPropagation();openPlayerModal('${p.id}')">✏️</button></div></td>
      </tr>`;
    }).join('')}</tbody></table>`;
}


// ══════════════════════════════
