// ══════════════════════════════════════════════════════
// JEUGD & ARCHIEF — de twee secundaire tabbladen naast de hoofdselectie
// ══════════════════════════════════════════════════════
// Uit selectie.js gehaald toen dat bestand het grootste van de codebase werd.
// Leunt op functies/state uit selectie.js (playerCard, playerViewMode,
// posGroup, subposSortKey, calcValueTotals, calcTransferBalance, etc.) en
// uit helpers.js (isPlayerInSeason, getDepartureDate, effectiveStatus, etc.)
// — geen eigen state, puur rendering van deze twee tabbladen.

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

  const totals = calcValueTotals(players);
  let html = '';
  if (totals.count > 0) {
    html += `<div class="value-summary-bar">
      <div class="value-summary-item"><div class="value-summary-val">${formatEuro(totals.total)}</div><div class="value-summary-lbl">Totale waarde</div></div>
      <div class="value-summary-divider"></div>
      <div class="value-summary-item"><div class="value-summary-val" style="font-size:16px">${formatGrowth(totals.growth)}</div><div class="value-summary-lbl">Seizoensgroei</div></div>
      <div class="value-summary-divider"></div>
      <div class="value-summary-item"><div class="value-summary-val" style="font-size:16px;color:var(--text-secondary)">${players.length}</div><div class="value-summary-lbl">Jeugdspelers</div></div>
    </div>`;
  }
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

// ── ARCHIEF ──
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
