
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
    document.getElementById('player-is-youth').checked = p.squadLevel === 'jeugd';
    document.getElementById('player-joined').value = p.joined || '';
    document.getElementById('player-contract').value = p.contract || '';
    document.getElementById('player-available-from').value = p.availableFrom || '';
    document.getElementById('player-note').value = p.note || '';
    window._playerTransfers = JSON.parse(JSON.stringify(p.transfers||[]));
    renderTransferHistory();
    window._playerInjuries = JSON.parse(JSON.stringify(p.injuries||[]));
    renderInjuryHistory();
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
    if (p.status === 'geschorst') { document.getElementById('sf-suspension-end') && (document.getElementById('sf-suspension-end').value = p.suspensionEnd || ''); }
  } else {
    document.getElementById('modal-player-title').textContent = 'Speler toevoegen';
    document.getElementById('player-is-youth').checked = false;
    ['player-photo','player-firstname','player-lastname','player-number','player-dob',
     'player-joined','player-contract','player-available-from','player-note'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    window._playerTransfers = [];
    renderTransferHistory();
    window._playerInjuries = [];
    renderInjuryHistory();
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
  if (tab === 'status') renderInjuryHistory();
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
    geschorst: `<div class="form-group"><label class="form-label">Geschorst tot</label><input class="form-input" id="sf-suspension-end" type="date"></div>`,
  };
  sf.innerHTML = fields[status] || '<p class="text-muted" style="font-size:12px;padding:8px 0">Geen extra velden nodig — huur/vertrek/transfer regel je via het tabblad "Transfers".</p>';
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
    squadLevel: document.getElementById('player-is-youth').checked ? 'jeugd' : 'eerste-elftal',
    joined: document.getElementById('player-joined').value,
    contract: document.getElementById('player-contract').value,
    availableFrom: document.getElementById('player-available-from').value || null,
    note: document.getElementById('player-note').value.trim(),
    foot: document.getElementById('player-foot')?.value || '',
    height: parseInt(document.getElementById('player-height')?.value) || null,
    status,
    valueHistory: [...currentValueEntries],
    // Status-specifiek: alleen geschorst is nog een handmatige status.
    // Huurling/uitgeleend/vertrokken worden afgeleid uit de Transfers-tab.
    suspensionEnd: status === 'geschorst' ? (document.getElementById('sf-suspension-end')?.value || '') : '',
    createdAt: existing ? ((S.players||[]).find(p=>p.id===existing)?.createdAt || Date.now()) : Date.now(),
    transfers: window._playerTransfers || [],
    injuries: window._playerInjuries || [],
  };

  if (!S.players) S.players = [];

  // Promotie naar eerste elftal: leg het moment zelf vast als transfer-ingang,
  // net als bij een gewone transfer — puur als je hem daadwerkelijk overzet
  // (was jeugd, wordt nu eerste elftal), niet omgekeerd.
  const oldPlayer = existing ? (S.players||[]).find(p=>p.id===existing) : null;
  if (oldPlayer && oldPlayer.squadLevel === 'jeugd' && player.squadLevel === 'eerste-elftal') {
    player.transfers = [...player.transfers, {type:'promotie', club:'', date:new Date().toISOString().split('T')[0], dateTo:null, note:'', amount:null}];
  }

  // "In dienst sinds" volgt de vroegste inkomende transfer-ingang, als die er is
  // (anders blijft staan wat handmatig is ingevuld — bv. voor spelers zonder
  // volledige transferhistorie).
  const incoming = getIncomingTransferInfo(player);
  if (incoming?.date) player.joined = incoming.date;

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
  document.getElementById('selectie-jeugd').style.display = tab === 'jeugd' ? 'block' : 'none';
  document.getElementById('selectie-archief').style.display = tab === 'archief' ? 'block' : 'none';
  document.querySelectorAll('#selectie-tabs .tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  if (tab === 'archief') renderArchief();
  if (tab === 'jeugd') renderJeugd();
}

function setPlayerView(mode) {
  if (mode === 'veld') mode = 'kaart'; // veld view removed
  playerViewMode = mode;
  savePref('defaultPlayerView', mode);
  document.getElementById('view-btn-kaart').classList.toggle('active', mode === 'kaart');
  document.getElementById('view-btn-lijst').classList.toggle('active', mode === 'lijst');
  renderSelectie();
}

// Positiegroep van een speler — leunt op de canonieke SUBPOS-indeling (zie
// verderop in dit bestand) i.p.v. een eigen, losse kopie van positienamen.
function posGroup(p) {
  const pos = p.position || '';
  if (pos === 'Aanvaller' || SUBPOS.Aanvaller.includes(pos)) return 'Aanvaller';
  if (pos === 'Middenvelder' || SUBPOS.Middenvelder.includes(pos)) return 'Middenvelder';
  if (pos === 'Verdediger' || SUBPOS.Verdediger.includes(pos)) return 'Verdediger';
  if (pos === 'Keeper' || SUBPOS.Keeper.includes(pos)) return 'Keeper';
  return pos; // fallback: toon als eigen groepje
}

function renderSelectie() {
  if (!S.players) S.players = [];
  applySelectiePrefsOnce();
  const today = new Date().toISOString().split('T')[0];

  const currentSeason = (S.seasons||[]).find(s=>s.id===S.currentSeason);
  const seasonRange = currentSeason ? getSeasonDateRange(currentSeason) : null;
  window._currentSeasonRange = seasonRange; // expose for playerCard badges

  // Seizoen-bewuste status — apart van de globale effectiveStatus() in helpers.js,
  // die kijkt naar "nu". Deze houdt rekening met het geselecteerde seizoen.
  const getSeasonStatus = (p) => {
    const refDate = seasonRange ? seasonRange.end : today;
    const fromTimeline = effectiveStatusFromTransfers(p, refDate);
    if (fromTimeline) {
      if (fromTimeline === 'vertrokken' || fromTimeline === 'vertrekt') {
        // Meest recente transfer-uit is leidend (niet afhankelijk van array-volgorde)
        const t = (p.transfers||[]).filter(x=>x.type==='transfer-uit' && x.date).sort((a,b)=>b.date.localeCompare(a.date))[0];
        // Alleen 'actief' als het vertrek ná het einde van dit seizoen valt — een
        // vertrek op exact de laatste dag van het seizoen telt als vertrokken.
        if (t && seasonRange && t.date > seasonRange.end) return 'actief';
      }
      return fromTimeline;
    }
    return p.status || 'actief';
  };

  // ── 1. FILTEREN ── alle spelers die dit seizoen bij de club hoorden + zoekfilter
  const searchQ = (document.getElementById('selectie-search')?.value||'').toLowerCase().trim();
  const active = S.players.filter(p => {
    if (p.squadLevel === 'jeugd') return false;
    if (!currentSeason) {
      const es = getSeasonStatus(p);
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

  const el = document.getElementById('selectie-content');
  if (!active.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">Nog geen spelers</div><div class="empty-state-desc">Voeg spelers toe via de knop rechtsboven.</div></div>';
    return;
  }

  // Spelers die niet meer "actief in de wedstrijdselectie" zijn (vertrokken dit
  // seizoen, of uitgeleend) tellen niet mee in de waardetotalen, maar worden wel
  // gewoon getoond — inline, gegroepeerd op positie, alleen visueel gedempt.
  const isSquadValue = p => {
    const es = getSeasonStatus(p);
    if (es === 'uitgeleend') return false;
    if (currentSeason) {
      const range = getSeasonDateRange(currentSeason);
      const dep = getDepartureDate(p);
      if (range && dep && dep > range.start && dep <= range.end) return false;
    }
    return true;
  };

  const groups = [
    { key: 'Aanvaller', label: 'Aanvallers' },
    { key: 'Middenvelder', label: 'Middenvelders' },
    { key: 'Verdediger', label: 'Verdedigers' },
    { key: 'Keeper', label: 'Keepers' },
  ];

  // ── 2. SORTEREN ──
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

  // ── 3. RENDEREN ──
  // Totale selectiewaarde balk — alleen spelers die nog echt "in de selectie" zitten
  const squadValuePlayers = active.filter(isSquadValue);
  const totals = calcValueTotals(squadValuePlayers);
  let summaryHtml = '';
  if (totals.count > 0) {
    summaryHtml = `<div class="value-summary-bar">
      <div class="value-summary-item"><div class="value-summary-val">${formatEuro(totals.total)}</div><div class="value-summary-lbl">Totale selectiewaarde</div></div>
      <div class="value-summary-divider"></div>
      <div class="value-summary-item"><div class="value-summary-val" style="font-size:16px">${formatGrowth(totals.growth)}</div><div class="value-summary-lbl">Seizoensgroei</div></div>
      <div class="value-summary-divider"></div>
      <div class="value-summary-item"><div class="value-summary-val" style="font-size:16px;color:var(--text-secondary)">${active.length}</div><div class="value-summary-lbl">Spelers dit seizoen</div></div>
    </div>`;
  }

  // Eén functie die een groep spelers rendert (kaart of lijst) — gebruikt door
  // zowel het per-positie pad als het platte (niet-positie-sortering) pad.
  const renderGroup = (players) => playerViewMode === 'kaart'
    ? `<div class="player-grid">${players.map(p => playerCard(p, getSeasonStatus(p))).join('')}</div>`
    : playerListView(players, getSeasonStatus);

  let html = summaryHtml;

  if (playerSortMode !== 'positie') {
    html += renderGroup([...active].sort(sortFn));
  } else {
    groups.forEach(g => {
      const groupPlayers = active.filter(p => posGroup(p) === g.key).sort(sortFn);
      if (!groupPlayers.length) return;
      const gTotals = calcValueTotals(groupPlayers.filter(isSquadValue));
      const gValStr = gTotals.count > 0 ? `${formatEuro(gTotals.total)} ${formatGrowth(gTotals.growth)}` : '';
      const isCollapsed = collapsedGroups.has(g.key);
      html += `<div class="posgroup-header" style="cursor:pointer" onclick="collapsedGroups.has('${g.key}')?collapsedGroups.delete('${g.key}'):collapsedGroups.add('${g.key}');renderSelectie()">
        <span class="position-group-title" style="margin:0;border:none;padding:0">${g.label} <span style="font-size:13px;font-weight:400;color:var(--text-muted)">(${groupPlayers.length})</span></span>
        <div style="display:flex;align-items:center;gap:8px">
          ${gValStr ? `<span class="posgroup-total">${gValStr}</span>` : ''}
          <span style="font-size:12px;color:var(--text-muted)">${isCollapsed?'▼':'▲'}</span>
        </div>
      </div>`;
      if (!isCollapsed) html += renderGroup(groupPlayers);
    });
  }
  el.innerHTML = html;
  const grayBtn = document.getElementById('toggle-gray-btn');
  if (grayBtn) grayBtn.classList.toggle('active', showGrayedOut);
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
  // Verberg geschorst-badge als de datum al voorbij het seizoen is
  const _sr = window._currentSeasonRange || null;
  const _hideTimedStatus = _sr && (
    (effStatus === 'geschorst' && p.suspensionEnd && p.suspensionEnd > _sr.end)
  );
  const statusBadge = (effStatus && effStatus !== 'actief' && !_hideTimedStatus)
    ? `<span class="badge badge-status-${effStatus}" style="font-size:9px;margin-top:2px;display:inline-block">${statusLabelEff(p, effStatus)}</span>` : '';
  // Blessure staat los van status — kan naast elke andere status getoond worden
  const activeInjury = effectiveInjuryStatus(p);
  const _hideInjuryBadge = _sr && activeInjury?.expectedReturn && activeInjury.expectedReturn > _sr.end;
  const injuryBadge = (activeInjury && !_hideInjuryBadge)
    ? `<span class="badge badge-status-geblesseerd" style="font-size:9px;margin-top:2px;display:inline-block" title="${activeInjury.type||'Blessure'}${activeInjury.expectedReturn?' · terug rond '+new Date(activeInjury.expectedReturn).toLocaleDateString('nl-NL',{day:'numeric',month:'short'}):''}">🩹 Geblesseerd</span>` : '';
  const contractWarn = contractWarning(p, _sr);
  const subposLine = p.subpos?.length
    ? p.subpos.slice(0,2).join(' · ') + (p.subpos.length > 2 ? ` +${p.subpos.length-2}` : '')
    : (p.position || '—');
  const age = p.dob ? Math.floor((Date.now() - new Date(p.dob)) / 31557600000) : null;
  const numBadge = p.number ? `<span class="player-num-badge">${p.number}</span>` : '';
  const nameLine = `${p.firstname ? p.firstname[0]+'.\u00a0' : ''}${p.lastname}`;
  const loanBadge = ''; // removed: statusBadge already shows huurder status
  const isLeaving = effStatus === 'vertrekt';
  const isInactive = showGrayedOut && (effStatus === 'vertrokken' || effStatus === 'uitgeleend');

  // Club duration — end: departureDate → expired contract → today
  const clubStart = p.joined || null;
  const _today = new Date().toISOString().split('T')[0];
  const clubEnd = getDepartureDate(p) || (p.contract && p.contract < _today ? p.contract : null);
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
  return `<div class="player-card${isLeaving ? ' player-card-leaving' : ''}" style="${isInactive?'opacity:0.55;filter:grayscale(30%);':''}" data-player-id="${p.id}" onclick="navigateToPlayer('${p.id}')" onmouseenter="playerHoverShow(event,'${p.id}')" onmouseleave="playerHoverHide()">
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
        <div style="display:flex;gap:3px;flex-wrap:wrap">${statusBadge}${injuryBadge}${loanBadge}${contractWarn}</div>
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
    const isInactive = showGrayedOut && (es === 'vertrokken' || es === 'uitgeleend');
    return `<tr onclick="navigateToPlayer('${p.id}')" onmouseenter="playerHoverShow(event,'${p.id}')" onmouseleave="playerHoverHide()" style="cursor:pointer${es==='vertrekt'?';border-left:2px solid #ff8c00':''}${isInactive?';opacity:0.6;filter:grayscale(25%)':''}">
      <td class="text-muted">${p.number||'—'}</td>
      <td><div style="display:flex;align-items:center;gap:8px">${playerAvatarHTML(p,'player-avatar',28)}<strong>${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</strong></div></td>
      <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.subpos?.length ? p.subpos.join(', ') : (p.position||'')}">${p.subpos?.length ? p.subpos[0] : (p.position||'—')}</td>
      <td>${age}</td>
      <td>${p.nationality||'—'}</td>
      <td>${val} ${getValueTrend(p)}</td>
      <td><span class="badge badge-status-${es}">${statusLabelEff(p,es)}</span>${effectiveInjuryStatus(p)?' <span title="Geblesseerd" style="font-size:11px">🩹</span>':''}</td>
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
  const labels = {actief:'Actief',huurder:'Huurling',geblesseerd:'Geblesseerd',geschorst:'Geschorst',uitgeleend:'Uitgeleend',vertrokken:'Vertrokken',vertrekt:'Vertrekt'};
  return labels[p.status||'actief'] || p.status;
}

function statusLabelEff(p, effStatus) {
  if (effStatus === 'vertrekt' || effStatus === 'vertrokken') {
    const out = getOutgoingTransferInfo(p);
    const d = out?.date ? new Date(out.date).toLocaleDateString('nl-NL',{day:'numeric',month:'short'}) : '';
    const club = out?.club ? ' → '+out.club : '';
    return (effStatus === 'vertrekt' ? 'Vertrekt' : 'Vertrokken') + (d ? ' '+d : '') + club;
  }
  if (effStatus === 'uitgeleend') {
    const today = new Date().toISOString().split('T')[0];
    const loan = (p.transfers||[]).find(t => t.type==='huur-uit' && t.date && t.date<=today && (!t.dateTo||t.dateTo>today));
    if (loan) {
      const to = loan.dateTo ? ' t/m '+new Date(loan.dateTo).toLocaleDateString('nl-NL',{day:'numeric',month:'short'}) : '';
      return 'Uitgeleend' + (loan.club ? ' → '+loan.club : '') + to;
    }
  }
  return statusLabel(p);
}

// ── SPELERSPROFIEL DETAIL ──
// ── ARCHIEF ──
// ── JEUGD ──
// Spelers met squadLevel:'jeugd' staan hier apart, niet tussen de hoofdselectie.
// Blijven gewoon gegroepeerd op positie, net als de hoofdselectie — puur een
// andere "laag", geen ander soort overzicht.
function renderJeugd() {
  if (!S.players) S.players = [];
  const currentSeason = (S.seasons||[]).find(s=>s.id===S.currentSeason);
  const searchQ = (document.getElementById('jeugd-search')?.value||'').toLowerCase().trim();

  const players = S.players.filter(p => {
    if (p.squadLevel !== 'jeugd') return false;
    if (currentSeason && !isPlayerInSeason(p, currentSeason)) return false;
    if (!searchQ) return true;
    return (p.firstname||'').toLowerCase().includes(searchQ) ||
           (p.lastname||'').toLowerCase().includes(searchQ) ||
           (p.number?.toString()||'').includes(searchQ) ||
           (p.position||'').toLowerCase().includes(searchQ);
  });

  const el = document.getElementById('jeugd-content');
  if (!players.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🌱</div><div class="empty-state-title">Geen jeugdspelers</div><div class="empty-state-desc">Vink "Jeugdspeler" aan bij een speler om die hier te tonen.</div></div>';
    return;
  }

  const groups = [
    { key: 'Aanvaller', label: 'Aanvallers' },
    { key: 'Middenvelder', label: 'Middenvelders' },
    { key: 'Verdediger', label: 'Verdedigers' },
    { key: 'Keeper', label: 'Keepers' },
  ];
  const sortFn = (a,b) => {
    const sk = subposSortKey(a) - subposSortKey(b);
    return sk !== 0 ? sk : (a.number||99) - (b.number||99);
  };
  const renderGroup = pl => playerViewMode === 'kaart'
    ? `<div class="player-grid">${pl.map(p => playerCard(p, effectiveStatus(p))).join('')}</div>`
    : playerListView(pl, effectiveStatus);

  let html = '';
  groups.forEach(g => {
    const groupPlayers = players.filter(p => posGroup(p) === g.key).sort(sortFn);
    if (!groupPlayers.length) return;
    html += `<div class="posgroup-header">
      <span class="position-group-title" style="margin:0;border:none;padding:0">${g.label} <span style="font-size:13px;font-weight:400;color:var(--text-muted)">(${groupPlayers.length})</span></span>
    </div>`;
    html += renderGroup(groupPlayers);
  });
  el.innerHTML = html;
}

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
    const es = effectiveStatus(p);
    if (['vertrokken','uitgeleend'].includes(es)) return true;
    // Contract verlopen en geen actieve status update
    if (p.contract && p.contract < today && es === 'actief') return true;
    return false;
  };

  // Helper: contract label
  const goneLabel = p => {
    const es = effectiveStatus(p);
    if (es === 'vertrokken') return {label: 'Vertrokken', cls: 'badge-status-vertrokken'};
    if (es === 'uitgeleend') return {label: 'Uitgeleend', cls: 'badge-status-uitgeleend'};
    if (p.contract && p.contract < today) return {label: 'Contract afgelopen', cls: 'badge-status-vertrokken'};
    return {label: es||'—', cls: ''};
  };

  const archived = S.players.filter(p => {
    if (!isGone(p)) return false;
    const dep = getDepartureDate(p);
    const loanEnd = getLoanInReturnDate(p);
    // Season filter
    if (seasonFilter && range) {
      const joinedInSeason = p.joined && p.joined >= seasonStart && p.joined <= seasonEnd;
      const leftInSeason = (dep && dep >= seasonStart && dep <= seasonEnd)
        || (p.contract && p.contract >= seasonStart && p.contract <= seasonEnd);
      const loanInSeason = loanEnd && loanEnd >= seasonStart && loanEnd <= seasonEnd;
      // Also include if player was active during that season
      const activeInSeason = isPlayerInSeason(p, season) ||
        (p.joined && p.joined <= seasonEnd && (!dep || dep >= seasonStart));
      if (!joinedInSeason && !leftInSeason && !loanInSeason && !activeInSeason) return false;
    }
    if (!q) return true;
    const outClub = getOutgoingTransferInfo(p)?.club || '';
    return (p.lastname+' '+p.firstname+' '+p.position+' '+outClub).toLowerCase().includes(q);
  });

  // Transfer stats — filtered by season if selected
  const playersForStats = seasonFilter && season
    ? (S.players||[]).filter(p=>{
        const joinedInSeason = p.joined && p.joined >= seasonStart && p.joined <= seasonEnd;
        const dep = getDepartureDate(p);
        const leftInSeason = dep && dep >= seasonStart && dep <= seasonEnd;
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
    const dep = getDepartureDate(p);
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
    const end = getDepartureDate(p) || (p.contract && p.contract < today ? p.contract : null);
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
      const depDate = getDepartureDate(p)||p.contract||'';
      const incoming = getIncomingTransferInfo(p);
      const outgoing = getOutgoingTransferInfo(p);
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
        <td class="text-secondary" style="font-size:11px">${incoming?.note || (incoming?.amount?formatEuro(incoming.amount):'—')}</td>
        <td class="text-secondary" style="font-size:11px">${outgoing?.note || (outgoing?.amount?formatEuro(outgoing.amount):'—')}</td>
        <td><div class="action-btns"><button class="icon-btn" onclick="event.stopPropagation();openPlayerModal('${p.id}')">✏️</button></div></td>
      </tr>`;
    }).join('')}</tbody></table>`;
}


// ══════════════════════════════




// ══════════════════════════════
// LANDEN LIJST
// ══════════════════════════════
// Nationaliteiten met vlaggen — {name, flag}
const LANDEN = [
  {name:'Nederlands', flag:'🇳🇱'},{name:'Belgisch', flag:'🇧🇪'},
  {name:'Duits', flag:'🇩🇪'},{name:'Frans', flag:'🇫🇷'},
  {name:'Spaans', flag:'🇪🇸'},{name:'Italiaans', flag:'🇮🇹'},
  {name:'Portugees', flag:'🇵🇹'},{name:'Engels', flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'},
  {name:'Schots', flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿'},{name:'Welsh', flag:'🏴󠁧󠁢󠁷󠁬󠁳󠁿'},
  {name:'Iers', flag:'🇮🇪'},{name:'Deens', flag:'🇩🇰'},
  {name:'Zweeds', flag:'🇸🇪'},{name:'Noors', flag:'🇳🇴'},
  {name:'Fins', flag:'🇫🇮'},{name:'IJslands', flag:'🇮🇸'},
  {name:'Oostenrijks', flag:'🇦🇹'},{name:'Zwitsers', flag:'🇨🇭'},
  {name:'Luxemburgs', flag:'🇱🇺'},{name:'Liechtensteins', flag:'🇱🇮'},
  {name:'Pools', flag:'🇵🇱'},{name:'Tsjechisch', flag:'🇨🇿'},
  {name:'Slowaaks', flag:'🇸🇰'},{name:'Hongaars', flag:'🇭🇺'},
  {name:'Roemeens', flag:'🇷🇴'},{name:'Bulgaars', flag:'🇧🇬'},
  {name:'Kroatisch', flag:'🇭🇷'},{name:'Servisch', flag:'🇷🇸'},
  {name:'Sloveens', flag:'🇸🇮'},{name:'Bosnisch', flag:'🇧🇦'},
  {name:'Montenegrijns', flag:'🇲🇪'},{name:'Macedonisch', flag:'🇲🇰'},
  {name:'Albanees', flag:'🇦🇱'},{name:'Kosovaars', flag:'🇽🇰'},
  {name:'Grieks', flag:'🇬🇷'},{name:'Cypriotisch', flag:'🇨🇾'},
  {name:'Maltees', flag:'🇲🇹'},{name:'Turks', flag:'🇹🇷'},
  {name:'Russisch', flag:'🇷🇺'},{name:'Oekraïens', flag:'🇺🇦'},
  {name:'Wit-Russisch', flag:'🇧🇾'},{name:'Moldavisch', flag:'🇲🇩'},
  {name:'Georgisch', flag:'🇬🇪'},{name:'Armeens', flag:'🇦🇲'},
  {name:'Azerbeidzjaans', flag:'🇦🇿'},{name:'Kazachs', flag:'🇰🇿'},
  {name:'Lets', flag:'🇱🇻'},{name:'Litouws', flag:'🇱🇹'},
  {name:'Ests', flag:'🇪🇪'},
  {name:'Amerikaans', flag:'🇺🇸'},{name:'Canadees', flag:'🇨🇦'},
  {name:'Mexicaans', flag:'🇲🇽'},{name:'Braziliaans', flag:'🇧🇷'},
  {name:'Argentijns', flag:'🇦🇷'},{name:'Colombiaans', flag:'🇨🇴'},
  {name:'Chileens', flag:'🇨🇱'},{name:'Uruguayaans', flag:'🇺🇾'},
  {name:'Ecuadoriaans', flag:'🇪🇨'},{name:'Venezolaans', flag:'🇻🇪'},
  {name:'Peruaans', flag:'🇵🇪'},{name:'Boliviaans', flag:'🇧🇴'},
  {name:'Paraguayaans', flag:'🇵🇾'},{name:'Costa Ricaans', flag:'🇨🇷'},
  {name:'Jamaicaans', flag:'🇯🇲'},{name:'Trinidadiaans', flag:'🇹🇹'},
  {name:'Haïtiaans', flag:'🇭🇹'},{name:'Hondurees', flag:'🇭🇳'},
  {name:'Japans', flag:'🇯🇵'},{name:'Koreaans', flag:'🇰🇷'},
  {name:'Chinees', flag:'🇨🇳'},{name:'Indonesisch', flag:'🇮🇩'},
  {name:'Australisch', flag:'🇦🇺'},{name:'Nieuw-Zeelands', flag:'🇳🇿'},
  {name:'Marokkaans', flag:'🇲🇦'},{name:'Algerijns', flag:'🇩🇿'},
  {name:'Tunesisch', flag:'🇹🇳'},{name:'Egyptisch', flag:'🇪🇬'},
  {name:'Libisch', flag:'🇱🇾'},{name:'Senegalees', flag:'🇸🇳'},
  {name:'Ivoriaans', flag:'🇨🇮'},{name:'Ghanees', flag:'🇬🇭'},
  {name:'Nigeriaans', flag:'🇳🇬'},{name:'Kameroenees', flag:'🇨🇲'},
  {name:'Congolees', flag:'🇨🇩'},{name:'Malinees', flag:'🇲🇱'},
  {name:'Guinees', flag:'🇬🇳'},{name:'Burkinabes', flag:'🇧🇫'},
  {name:'Beninees', flag:'🇧🇯'},{name:'Togolees', flag:'🇹🇬'},
  {name:'Gaboens', flag:'🇬🇦'},{name:'Zambiaans', flag:'🇿🇲'},
  {name:'Zimbabwaans', flag:'🇿🇼'},{name:'Zuid-Afrikaans', flag:'🇿🇦'},
  {name:'Mozambicaans', flag:'🇲🇿'},{name:'Angolees', flag:'🇦🇴'},
  {name:'Tanzaniaans', flag:'🇹🇿'},{name:'Keniaans', flag:'🇰🇪'},
  {name:'Ugandees', flag:'🇺🇬'},{name:'Ethiopisch', flag:'🇪🇹'},
  {name:'Somalisch', flag:'🇸🇴'},{name:'Soedanees', flag:'🇸🇩'},
  {name:'Kaapverdiaans', flag:'🇨🇻'},{name:'Surinaams', flag:'🇸🇷'},
  {name:'Curaçaos', flag:'🇨🇼'},{name:'Arubaans', flag:'🇦🇼'},
  {name:'Israëlisch', flag:'🇮🇱'},{name:'Iraans', flag:'🇮🇷'},
  {name:'Irakees', flag:'🇮🇶'},{name:'Syrisch', flag:'🇸🇾'},
  {name:'Libanees', flag:'🇱🇧'},{name:'Jordaans', flag:'🇯🇴'},
  {name:'Saoedi-Arabisch', flag:'🇸🇦'},{name:'Emiratisch', flag:'🇦🇪'},
];


function natFlag(name) {
  if (!name) return '';
  const l = LANDEN.find(x => x.name === name);
  return l?.flag ? l.flag + ' ' : '';
}
function populateNatDropdown(selected) {
  const sel = document.getElementById('player-nationality');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Selecteer —</option>';
  // Nederland eerst
  const ned = document.createElement('option');
  ned.value = 'Nederlands'; ned.textContent = '🇳🇱 Nederlands'; ned.label = 'Nederlands';
  if (selected === 'Nederlands') ned.selected = true;
  sel.appendChild(ned);
  // Scheidingslijn
  const sep = document.createElement('option'); sep.disabled = true; sep.textContent = '──────────'; sel.appendChild(sep);
  // Rest alfabetisch op naam
  const rest = LANDEN.filter(l => l.name !== 'Nederlands')
    .sort((a,b) => a.name.localeCompare(b.name,'nl'));
  rest.forEach(l => {
    const o = document.createElement('option');
    o.value = l.name;
    o.textContent = l.flag ? `${l.flag} ${l.name}` : l.name;
    o.label = l.name; // zonder emoji voor browser keyboard search
    if (l.name === selected) o.selected = true;
    sel.appendChild(o);
  });
}

// ══════════════════════════════
// SPARKLINE
// ══════════════════════════════
function renderSparkline(history, width, height) {
  if (!history || history.length < 2) return '';
  const vals = [...history].reverse().map(e => e.amount);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = vals[vals.length-1], first = vals[0];
  const color = last >= first ? 'var(--win)' : 'var(--loss)';
  return `<svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// ══════════════════════════════
// MARKTWAARDE TOTALEN
// ══════════════════════════════
function calcValueTotals(players) {
  // Seizoensgroei = verschil tussen meest recente waarde en
  // eerste waarde VOOR het huidige seizoen (of de oudste als alles binnen seizoen valt)
  const season = S.seasons.find(s => s.id === S.currentSeason);
  const seasonStart = season ? new Date(season.year + '-07-01') : null;

  let total = 0, prev = 0, count = 0;
  players.forEach(p => {
    if (!p.valueHistory?.length) return;
    total += p.valueHistory[0].amount;
    count++;
    if (p.valueHistory.length > 1 && seasonStart) {
      // Find the last value BEFORE the current season started
      const beforeSeason = p.valueHistory.find(e => new Date(e.date) < seasonStart);
      if (beforeSeason) {
        prev += beforeSeason.amount;
      } else {
        // All values are within this season — use oldest as baseline
        prev += p.valueHistory[p.valueHistory.length - 1].amount;
      }
    } else if (p.valueHistory.length > 1) {
      prev += p.valueHistory[1].amount;
    } else {
      prev += p.valueHistory[0].amount;
    }
  });
  return { total, prev, growth: total - prev, count };
}

function formatGrowth(growth) {
  if (!growth) return '<span class="value-trend-flat">—</span>';
  const sign = growth > 0 ? '+' : '';
  const cls = growth > 0 ? 'value-trend-up' : 'value-trend-down';
  const arrow = growth > 0 ? '▲' : '▼';
  return `<span class="${cls}">${arrow} ${sign}${formatEuro(growth)}</span>`;
}

function calcTransferBalance(players) {
  let inTotal = 0, outTotal = 0, inCount = 0, outCount = 0;
  players.forEach(p => {
    const bf = parseFloat(getIncomingTransferInfo(p)?.amount)||0;
    const sf = parseFloat(getOutgoingTransferInfo(p)?.amount)||0;
    if (bf > 0) { inTotal += bf; inCount++; }
    if (sf > 0) { outTotal += sf; outCount++; }
  });
  return { inTotal, outTotal, profit: outTotal - inTotal, inCount, outCount };
}

// ══════════════════════════════
// CONTRACTWAARSCHUWING
// ══════════════════════════════
function contractWarning(p, seasonRange) {
  if (!p.contract) return '';
  const today = new Date().toISOString().split('T')[0];
  // Contract loopt af op of na seizoenseinde → geen waarschuwing vanuit dit seizoen
  if (seasonRange && p.contract >= seasonRange.end) return '';
  // Historisch seizoen (al voorbij): gebruik seizoenseinde als referentie
  // Huidig/toekomstig seizoen: gebruik vandaag
  const isHistorical = seasonRange && seasonRange.end < today;
  const refDate = isHistorical ? new Date(seasonRange.end) : new Date();
  const diff = new Date(p.contract) - refDate;
  const months = diff / (1000 * 60 * 60 * 24 * 30);
  if (months < 0) return '<span class="badge badge-contract-warn">⚠ Verlopen</span>';
  if (months < 6) return '<span class="badge badge-contract-warn">⚠ < 6 mnd</span>';
  return '';
}

// ══════════════════════════════
// WAARDE GRAFIEK (volledig)
// ══════════════════════════════
function renderValueChart(history, containerId) {
  const el = document.getElementById(containerId);
  if (!el || !history || history.length < 2) {
    if (el) el.innerHTML = '<p class="text-muted" style="font-size:11px">Minimaal 2 meetpunten nodig voor grafiek.</p>';
    return;
  }
  const sorted = [...history].reverse();
  const vals = sorted.map(e => e.amount);
  const dates = sorted.map(e => e.date);
  const min = Math.min(...vals) * 0.95;
  const max = Math.max(...vals) * 1.05;
  const range = max - min || 1;
  const W = 500, H = 100, PADL = 8, PADR = 8, PADT = 12, PADB = 8;
  const pts = vals.map((v, i) => {
    const x = PADL + (i / (vals.length - 1)) * (W - PADL - PADR);
    const y = PADT + (1 - (v - min) / range) * (H - PADT - PADB);
    return { x, y, v, d: dates[i] };
  });
  const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const last = vals[vals.length-1], first = vals[0];
  const color = last >= first ? '#22c55e' : '#ef4444';
  const fillPts = `${pts[0].x.toFixed(1)},${H} ` + polyline + ` ${pts[pts.length-1].x.toFixed(1)},${H}`;
  const tooltipId = containerId + '-tip';

  // Value table — newest first
  const tableRows = [...history].map((e, i) => {
    const prev = history[i + 1];
    const diff = prev ? e.amount - prev.amount : null;
    const diffStr = diff !== null
      ? `<span style="color:${diff>=0?'#22c55e':'#ef4444'};font-size:10px">${diff>=0?'+':''}${formatEuro(diff)}</span>`
      : '<span style="font-size:10px;color:var(--text-muted)">—</span>';
    const dateStr = e.date ? new Date(e.date).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'}) : '—';
    return `<tr>
      <td style="padding:3px 6px 3px 0;font-size:11px;color:var(--text-muted);white-space:nowrap">${dateStr}</td>
      <td style="padding:3px 6px;font-size:11px;font-weight:600;white-space:nowrap">${formatEuro(e.amount)}</td>
      <td style="padding:3px 0;text-align:right">${diffStr}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div style="display:flex;gap:12px;align-items:flex-start">
      <div style="flex:0 0 50%;position:relative">
        <div id="${tooltipId}" style="position:absolute;background:var(--bg-modal);border:1px solid var(--border);border-radius:4px;padding:5px 8px;font-size:11px;pointer-events:none;display:none;z-index:100;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>
        <svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="overflow:hidden;display:block;border-radius:6px;background:var(--bg-tertiary)">
          <defs>
            <linearGradient id="vgrad_${containerId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
            </linearGradient>
            <clipPath id="clip_${containerId}"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath>
          </defs>
          <polygon points="${fillPts}" fill="url(#vgrad_${containerId})" clip-path="url(#clip_${containerId})"/>
          <polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" clip-path="url(#clip_${containerId})"/>
          ${pts.map(p => `<circle
            cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${color}" stroke="var(--bg-modal)" stroke-width="1.5"
            style="cursor:pointer"
            onmouseenter="showChartTip(event,'${tooltipId}','${formatEuro(p.v)}','${p.d}')"
            onmouseleave="document.getElementById('${tooltipId}').style.display='none'"
          />`).join('')}
        </svg>
      </div>
      <div style="flex:1;max-height:120px;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse">
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>`;

  el.style.position = 'relative';
}

function showChartTip(event, tipId, val, date) {
  const tip = document.getElementById(tipId);
  if (!tip) return;
  tip.innerHTML = `<strong>${val}</strong> <span style="color:var(--text-muted)">${date}</span>`;
  tip.style.display = 'block';
  const rect = tip.parentElement.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  tip.style.left = Math.min(x + 10, rect.width - 140) + 'px';
  tip.style.top = Math.max(y - 30, 0) + 'px';
}

// ══════════════════════════════
// SUBPOSITIES
// ══════════════════════════════
const SUBPOS = {
  Keeper: ['Keeper','Uitkomende Keeper'],
  Verdediger: ['Centrale Verdediger','Libero','Linksback','Rechtsback','Linker Wingback','Rechter Wingback','Sweeper'],
  Middenvelder: ['Verdedigende Middenvelder','Centrale Middenvelder','Aanvallende Middenvelder','Linker Middenvelder','Rechter Middenvelder','Box-to-box Middenvelder','Regisseur','Nummer 10'],
  Aanvaller: ['Spits','Tweede Spits','Valse Negen','Linksbuiten','Rechtsbuiten','Schaduwspits','Buitenspeler']
};
// All subpos options grouped — free selection regardless of main position
const ALL_SUBPOS_GROUPED = [
  { group: 'Keeper', opts: SUBPOS.Keeper },
  { group: 'Verdediger', opts: SUBPOS.Verdediger },
  { group: 'Middenvelder', opts: SUBPOS.Middenvelder },
  { group: 'Aanvaller', opts: SUBPOS.Aanvaller },
];

let selectedSubpos = [];
let currentValueEntries = []; // temp storage while modal is open
let playerViewMode = 'kaart';
let showGrayedOut = true; // vertrokken/uitgeleende spelers grijs tonen (aan/uit)
let playerSortMode = 'positie';
let _selectiePrefsApplied = false;

// Past de opgeslagen weergavevoorkeuren één keer toe (bij de eerste keer dat
// de Selectie-pagina gerenderd wordt) — daarna blijft de keuze binnen de
// sessie gewoon in de live variabelen staan, zoals voorheen.
function applySelectiePrefsOnce() {
  if (_selectiePrefsApplied) return;
  _selectiePrefsApplied = true;
  const p = getPrefs();
  playerViewMode = p.defaultPlayerView || 'kaart';
  playerSortMode = p.defaultPlayerSort || 'positie';
  showGrayedOut = p.showGrayedOut !== false;
  document.getElementById('view-btn-kaart')?.classList.toggle('active', playerViewMode==='kaart');
  document.getElementById('view-btn-lijst')?.classList.toggle('active', playerViewMode==='lijst');
  const sortSel = document.getElementById('player-sort-select');
  if (sortSel) sortSel.value = playerSortMode;
}

function setPlayerSortMode(mode) {
  playerSortMode = mode;
  savePref('defaultPlayerSort', mode);
  renderSelectie();
}

function toggleGrayedOut() {
  showGrayedOut = !showGrayedOut;
  savePref('showGrayedOut', showGrayedOut);
  renderSelectie();
}
let collapsedGroups = new Set();
let allGroupsCollapsed = false;

function updateSubposOptions(keepSelected) {
  const pos = document.getElementById('player-position').value;
  if (!keepSelected) selectedSubpos = [];
  const dropdown = document.getElementById('subpos-dropdown');
  const display = document.getElementById('subpos-display');
  dropdown.innerHTML = '';
  dropdown.classList.remove('open');
  if (!pos) {
    display.innerHTML = '<span style="color:var(--text-muted);font-size:13px">Selecteer hoofdpositie eerst</span>';
    return;
  }
  ALL_SUBPOS_GROUPED.forEach(group => {
    // Group header
    const hdr = document.createElement('div');
    hdr.style.cssText = 'padding:4px 10px 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);background:var(--bg-secondary);margin-top:4px';
    hdr.textContent = group.group;
    if (group.group === pos) hdr.style.color = 'var(--cambuur-geel)';
    dropdown.appendChild(hdr);
    group.opts.forEach(o => {
      const div = document.createElement('div');
      div.className = 'multiselect-option' + (selectedSubpos.includes(o) ? ' selected' : '');
      div.dataset.val = o;
      const tick = document.createElement('span');
      tick.style.cssText = 'width:14px;opacity:' + (selectedSubpos.includes(o) ? '1' : '0');
      tick.textContent = '✓';
      div.appendChild(tick);
      div.appendChild(document.createTextNode(' ' + o));
      div.onclick = () => toggleSubpos(o, div);
      dropdown.appendChild(div);
    });
  });
  renderSubposDisplay();
}

function toggleSubpos(val, el) {
  if (selectedSubpos.includes(val)) {
    selectedSubpos = selectedSubpos.filter(s => s !== val);
    el.classList.remove('selected');
    el.querySelector('span').style.opacity = '0';
  } else {
    selectedSubpos.push(val);
    el.classList.add('selected');
    el.querySelector('span').style.opacity = '1';
  }
  renderSubposDisplay();
}

function renderSubposDisplay() {
  const display = document.getElementById('subpos-display');
  if (!selectedSubpos.length) {
    display.innerHTML = '<span style="color:var(--text-muted);font-size:13px">Kies subpositie(s)...</span>';
  } else {
    display.innerHTML = selectedSubpos.map(s =>
      `<span class="subpos-tag">${s}</span>`).join('');
  }
}

function toggleSubposDropdown() {
  const dd = document.getElementById('subpos-dropdown');
  dd.classList.toggle('open');
}

document.addEventListener('click', e => {
  const wrap = document.getElementById('subpos-wrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('subpos-dropdown')?.classList.remove('open');
  }
});


// ══════════════════════════════
// ARCHIEF — SEIZOENSFILTER
// ══════════════════════════════
function populateArchiefSeasonFilter() {
  const sel = document.getElementById('archief-season-filter');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">Alle seizoenen</option>';
  S.seasons.forEach(s => {
    const o = document.createElement('option');
    o.value = s.id; o.textContent = s.name;
    if (s.id === current) o.selected = true;
    sel.appendChild(o);
  });
}




// ══════════════════════════════
// SUBPOSITIE SORT ORDER
// ══════════════════════════════
const SUBPOS_SORT = {
  // Verdedigers
  'Linksback':2,'Linker Wingback':3,'Centrale Verdediger':4,'Libero':5,'Sweeper':6,'Rechter Wingback':7,'Rechtsback':8,
  // Middenvelders
  'Verdedigende Middenvelder':2,'Linker Middenvelder':3,'Centrale Middenvelder':4,'Box-to-box Middenvelder':5,'Regisseur':6,'Rechter Middenvelder':7,'Aanvallende Middenvelder':8,'Nummer 10':9,
  // Aanvallers
  'Linksbuiten':2,'Schaduwspits':3,'Tweede Spits':4,'Spits':5,'Valse Negen':6,'Buitenspeler':7,'Rechtsbuiten':8,
};

function subposSortKey(p) {
  const first = p.subpos?.[0] || p.position || '';
  return SUBPOS_SORT[first] || 99;
}

// ══════════════════════════════
// AUTO-ARCHIVE DEPARTED PLAYERS
// ══════════════════════════════
async function checkDepartedPlayers() {
  if (!S.players) return;
  const today = new Date().toISOString().split('T')[0];
  const nowDeparted = S.players.filter(p => {
    if (p._archiveNotified) return false;
    const dep = getDepartureDate(p);
    return effectiveStatus(p) === 'vertrokken' && dep && dep <= today;
  });
  if (!nowDeparted.length) return;

  // Show notification popup
  const names = nowDeparted.map(p => {
    const d = new Date(getDepartureDate(p)).toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'});
    return `<li><strong>${p.firstname ? p.firstname+' ' : ''}${p.lastname}</strong> — contract/vertrek per ${d}</li>`;
  }).join('');

  await new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center';
    overlay.innerHTML = `<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);padding:28px 32px;max-width:460px;width:90%">
      <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:20px;margin-bottom:16px;color:var(--cambuur-geel)">⚠ Vertrek verwerkt</div>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">De volgende speler(s) zijn automatisch naar het archief verplaatst omdat hun vertrekdatum is bereikt:</p>
      <ul style="font-size:13px;line-height:1.8;color:var(--text-primary);padding-left:18px;margin-bottom:20px">${names}</ul>
      <button class="btn btn-primary" onclick="this.closest('div').parentElement.remove();document.body.style.overflow='';" style="width:100%">Begrepen</button>
    </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    overlay.querySelector('button').addEventListener('click', resolve);
  });

  // Mark as notified (won't show again)
  for (const p of nowDeparted) {
    p._archiveNotified = true;
    await dbPut('players', p);
  }
}

