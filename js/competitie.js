// WEDSTRIJDEN — COMPETITIE DETAIL
// ══════════════════════════════
function renderCompDetail(compId) {
  const comp = S.competitions.find(c=>c.id===compId);
  const el = document.getElementById('competition-detail-content');
  if (!comp) { el.innerHTML='<p class="text-muted">Niet gevonden.</p>'; return; }
  document.getElementById('topbar-title').textContent = comp.name;
  const clubs = (comp.clubIds||[]).map(cid=>S.clubs.find(c=>c.id===cid)).filter(Boolean);
  const typeBadge = {competitie:'badge-competitie',beker:'badge-beker',voorbereiding:'badge-voorbereiding'};
  const typeLabel = {competitie:'Competitie',beker:'Bekertoernooi',voorbereiding:'Voorbereiding'};

  const compMatches = (S.matches||[]).filter(m=>m.competitionId===compId);
  const rounds = [...new Set(compMatches.map(m=>m.round))].sort((a,b)=>a-b);
  const today = new Date().toISOString().split('T')[0];

  let standingsHtml = '';
  if (comp.type === 'competitie' && clubs.length) {
    standingsHtml = renderLeagueTable(comp, clubs, compMatches);
  }

  let roundsHtml = '';
  if (rounds.length) {
    roundsHtml = rounds.map(r => {
      const rMatches = compMatches.filter(m=>m.round===r);
      const cambuurMatch = rMatches.find(m=>isCambuurMatch(m));
      const playedCount = rMatches.filter(m=>m.played).length;
      const firstDate = rMatches.map(m=>m.date).filter(Boolean).sort()[0];
      const dateStr = firstDate ? fmtShortDate(firstDate) : 'Datum n.t.b.';
      const isPast = firstDate && firstDate < today;
      return `<div class="round-accordion">
        <div class="round-header" id="rh-${compId}-${r}" onclick="toggleRound('${compId}',${r})">
          <div class="flex-center gap-8">
            <span class="round-title">Speelronde ${r}</span>
            ${cambuurMatch ? `<span class="badge ${cambuurMatch.played?(cambuurMatch.homeClubId===S.clubs.find(c=>c.isOwnClub)?.id?(cambuurMatch.homeScore>cambuurMatch.awayScore?'badge-active':cambuurMatch.homeScore===cambuurMatch.awayScore?'badge-draw':'badge-rival'):(cambuurMatch.awayScore>cambuurMatch.homeScore?'badge-active':cambuurMatch.awayScore===cambuurMatch.homeScore?'badge-draw':'badge-rival')):'badge-competitie'}" style="font-size:9px">Cambuur</span>` : ''}
          </div>
          <div class="flex-center gap-8">
            <span class="round-meta">${dateStr} · ${playedCount}/${rMatches.length} gespeeld</span>
            <span class="round-chevron">▼</span>
          </div>
        </div>
        <div class="round-body" id="rb-${compId}-${r}">
          ${rMatches.sort((a,b)=>(a.date||'')+(a.time||'')>(b.date||'')+(b.time||'')?1:-1).map(m=>renderMatchRow(m,comp)).join('')}
        </div>
      </div>`;
    }).join('');
  }

  el.innerHTML = `
    <div class="flex-center gap-8 mb-12" style="flex-wrap:wrap">
      <span class="badge ${typeBadge[comp.type]||''}">${typeLabel[comp.type]||comp.type}</span>
      <span class="text-secondary" style="font-size:12px">${clubs.length} clubs · ${compMatches.length} wedstrijden</span>
      <button class="btn btn-secondary" onclick="openCompModal('${comp.id}')">✏️ Bewerken</button>
      <button class="btn btn-ghost" onclick="openMatchImport('${comp.id}','manual')">+ Wedstrijd toevoegen</button>
      <button class="btn btn-primary" onclick="openMatchImport('${comp.id}','pdf')">📅 Schema importeren</button>
      <button class="btn btn-ghost" style="font-size:11px;color:var(--loss)" onclick="deleteAllMatchesInComp('${comp.id}')">🗑️ Alle wedstrijden wissen</button>
    </div>
    ${standingsHtml}
    <div class="section-header mb-8 mt-16">
      <div class="section-title">Speelschema</div>
      <div class="flex-center gap-8">
        <button class="btn btn-ghost" style="font-size:11px" onclick="expandAllRounds('${compId}')">Alles uitklappen</button>
        <button class="btn btn-ghost" style="font-size:11px" onclick="collapseAllRounds('${compId}')">Alles inklappen</button>
      </div>
    </div>
    ${roundsHtml || '<p class="text-muted" style="font-size:12px">Nog geen wedstrijden. Voeg wedstrijden toe of genereer een schema.</p>'}
  `;

  // Restore previously open rounds, or auto-open current round on first visit
  if (window._openRounds?.[compId]?.size > 0) {
    window._openRounds[compId].forEach(r => {
      document.getElementById(`rb-${compId}-${r}`)?.classList.add('open');
      document.getElementById(`rh-${compId}-${r}`)?.classList.add('open');
    });
  } else {
    autoOpenCurrentRound(compId, today);
  }
}

function isCambuurMatch(m) {
  const cam = S.clubs.find(c=>c.isOwnClub);
  return cam && (m.homeClubId===cam.id||m.awayClubId===cam.id);
}

function fmtShortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.getDate() + ' ' + d.toLocaleDateString('nl-NL',{month:'short'});
}

function renderMatchRow(m, comp) {
  const cam = S.clubs.find(c=>c.isOwnClub);
  const isCam = isCambuurMatch(m);
  const homeClub = S.clubs.find(c=>c.id===m.homeClubId);
  const awayClub = S.clubs.find(c=>c.id===m.awayClubId);
  const homeName = homeClub?.name || m.homeName || '?';
  const awayName = awayClub?.name || m.awayName || '?';
  const isRival = homeClub?.highlight==='rivaal'||awayClub?.highlight==='rivaal';
  const stad = m.homeClubId ? S.stadiums.find(s=>s.id===homeClub?.stadiumId) : null;

  let scoreHtml = '';
  const camIsHome = m.homeClubId === cam?.id;
  if (m.played && m.homeScore !== null) {
    const camScore = camIsHome ? m.homeScore : m.awayScore;
    const oppScore = camIsHome ? m.awayScore : m.homeScore;
    const cls = isCam ? (camScore > oppScore ? 'won' : camScore === oppScore ? 'draw' : 'lost') : '';
    scoreHtml = `<span class="match-score ${cls}" onclick="startInlineScore(event,'${m.id}')" style="cursor:pointer" title="Klik om aan te passen">${m.homeScore} - ${m.awayScore}</span>`;
  } else {
    scoreHtml = `<span class="match-score upcoming" onclick="startInlineScore(event,'${m.id}')" style="cursor:pointer" title="Klik om score in te voeren">${m.time||'—'}</span>`;
  }

  const dateStr = m.date ? fmtShortDate(m.date) : '';

  // Tooltip inhoud
  const evts = m.events||[];
  const pName = id => { const p=(S.players||[]).find(x=>x.id===id); return p?(p.number?'#'+p.number+' ':'')+p.lastname:'?'; };
  let tipHtml = '';
  if (m.played) {
    const gls = evts.filter(e=>e.type==='goal');
    const cds = evts.filter(e=>e.type==='card');
    const sbs = evts.filter(e=>e.type==='sub');
    if (gls.length) tipHtml += gls.map(g=>`<div>⚽ <b>${g.minute||'?'}'</b> ${g.playerId==='__opp__'?'Tegendoelpunt':g.playerId==='__opp_own__'?'Eigen doel tegenstander':pName(g.playerId)}${g.assistId?' <span style="opacity:0.6">('+pName(g.assistId)+')</span>':''}</div>`).join('');
    if (sbs.length) tipHtml += sbs.map(s=>`<div style="color:var(--text-muted)">↕ <b>${s.minute||'?'}'</b> ${pName(s.playerOutId)} → ${pName(s.playerInId)}</div>`).join('');
    if (cds.length) tipHtml += cds.map(c=>`<div style="color:var(--text-muted)">${c.cardType==='rood'?'🟥':'🟨'} <b>${c.minute||'?'}'</b> ${pName(c.playerId)}</div>`).join('');
    const starters = (m.lineup||[]).slice(0,5).map(id=>{ const p=(S.players||[]).find(x=>x.id===id); return p?p.lastname:'?'; });
    if (starters.length) tipHtml += `<div style="margin-top:4px;padding-top:4px;border-top:1px solid var(--border-light);opacity:0.6;font-size:11px">👕 ${starters.join(', ')}${(m.lineup||[]).length>5?' +'+ ((m.lineup||[]).length-5):''}</div>`;
    if (!tipHtml) tipHtml = '<span style="opacity:0.5">Geen gebeurtenissen</span>';

    // Missing data warnings for Cambuur matches
    if (isCam) {
      const missing = getMissingDataFields(m);
      const ignoredMissing = getIgnoredMissingFields(m);
      if (missing.length) {
        tipHtml += `<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border-light)">
          <div style="font-size:10px;font-weight:700;color:var(--loss);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">Ontbreekt</div>
          ${missing.map(f=>`<div style="font-size:11px;color:var(--text-muted)">${f.icon} ${f.label}</div>`).join('')}
        </div>`;
      }
      if (ignoredMissing.length) {
        tipHtml += `<div style="margin-top:${missing.length?'4px':'6px'};${missing.length?'':'padding-top:6px;border-top:1px solid var(--border-light);'}">
          <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">Bewust leeg gelaten</div>
          ${ignoredMissing.map(f=>`<div style="font-size:11px;color:var(--text-muted);opacity:0.6">${f.icon} ${f.label}</div>`).join('')}
        </div>`;
      }
    }
  } else {
    tipHtml = `<div style="opacity:0.6">${m.date?fmtShortDate(m.date)+(m.time?' · '+m.time:''):'Datum onbekend'}</div><div style="opacity:0.5;font-size:11px">Klik om in te voeren</div>`;
  }

  // Missing data dot for played Cambuur matches — grijs als alles ontbrekende alleen bewust genegeerd is
  const missingCount = isCam && m.played ? getMissingDataFields(m).length : 0;
  const ignoredCount = isCam && m.played ? getIgnoredMissingFields(m).length : 0;
  const missingDot = missingCount > 0
    ? `<div title="Ontbrekende data" style="width:7px;height:7px;border-radius:50%;background:var(--loss);flex-shrink:0;margin-left:2px"></div>`
    : (ignoredCount > 0
      ? `<div title="Bewust leeg gelaten" style="width:7px;height:7px;border-radius:50%;background:var(--text-muted);flex-shrink:0;margin-left:2px;opacity:0.5"></div>`
      : '');

  return `<div class="match-row ${isCam?'cambuur-match':''} ${isRival&&isCam?'rival-match':''}"
    data-match-id="${m.id}"
    style="${isRival&&isCam?'border-left:2px solid var(--heerenveen-rood)':''}"
    onclick="navigateToMatch('${m.id}')">
    <div class="match-date">${dateStr}${m.time&&!m.played?' '+m.time:''}</div>
    <div class="match-home" style="${isCam&&m.homeClubId===cam?.id?'color:var(--cambuur-geel)':''}">${homeName}</div>
    ${scoreHtml}
    <div class="match-away" style="${isCam&&m.awayClubId===cam?.id?'color:var(--cambuur-geel)':''}">${awayName}</div>
    <div class="match-actions" style="display:flex;gap:4px;align-items:center" onclick="event.stopPropagation()">
      ${missingDot}
      <button class="icon-btn danger" style="height:26px;padding:2px 6px;font-size:11px"
        onclick="event.stopPropagation();deleteMatch('${m.id}')" title="Verwijderen">🗑️</button>
    </div>
    <div class="match-tooltip">${tipHtml}</div>
  </div>`;
}

function toggleRound(compId, round) {
  const hdr = document.getElementById(`rh-${compId}-${round}`);
  const body = document.getElementById(`rb-${compId}-${round}`);
  if (!hdr||!body) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  hdr.classList.toggle('open', !isOpen);
  // Persist open state
  if (!window._openRounds) window._openRounds = {};
  if (!window._openRounds[compId]) window._openRounds[compId] = new Set();
  if (!isOpen) window._openRounds[compId].add(round);
  else window._openRounds[compId].delete(round);
}

function expandAllRounds(compId) {
  const rounds = [...new Set((S.matches||[]).filter(m=>m.competitionId===compId).map(m=>m.round))];
  if (!window._openRounds) window._openRounds = {};
  window._openRounds[compId] = new Set(rounds);
  rounds.forEach(r => {
    document.getElementById(`rb-${compId}-${r}`)?.classList.add('open');
    document.getElementById(`rh-${compId}-${r}`)?.classList.add('open');
  });
}

function collapseAllRounds(compId) {
  const rounds = [...new Set((S.matches||[]).filter(m=>m.competitionId===compId).map(m=>m.round))];
  if (!window._openRounds) window._openRounds = {};
  window._openRounds[compId] = new Set();
  rounds.forEach(r => {
    document.getElementById(`rb-${compId}-${r}`)?.classList.remove('open');
    document.getElementById(`rh-${compId}-${r}`)?.classList.remove('open');
  });
}

function autoOpenCurrentRound(compId, today) {
  const compMatches = (S.matches||[]).filter(m=>m.competitionId===compId);
  const rounds = [...new Set(compMatches.map(m=>m.round))].sort((a,b)=>a-b);
  // Find first unplayed round or last played round
  let targetRound = null;
  for (const r of rounds) {
    const rMatches = compMatches.filter(m=>m.round===r);
    const hasUnplayed = rMatches.some(m=>!m.played);
    const hasFuture = rMatches.some(m=>m.date && m.date >= today);
    if (hasUnplayed || hasFuture) { targetRound = r; break; }
  }
  if (!targetRound && rounds.length) targetRound = rounds[rounds.length-1];
  if (targetRound) {
    setTimeout(() => {
      document.getElementById(`rb-${compId}-${targetRound}`)?.classList.add('open');
      document.getElementById(`rh-${compId}-${targetRound}`)?.classList.add('open');
    }, 50);
  }
}

// ══════════════════════════════
// STANDINGS — met live berekening
// ══════════════════════════════
function renderLeagueTable(comp, clubs, compMatches) {
  const cam = S.clubs.find(c=>c.isOwnClub);
  // Build standings from played matches
  const table = {};
  clubs.forEach(c => { table[c.id] = {id:c.id,name:c.name,isOwn:c.isOwnClub,highlight:c.highlight,g:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}; });
  compMatches.filter(m=>m.played&&m.homeScore!==null).forEach(m => {
    // Match by ID first, fall back to name matching
    let h = table[m.homeClubId];
    let a = table[m.awayClubId];
    if (!h) h = Object.values(table).find(t=>t.name===m.homeName||t.name.toLowerCase()===m.homeName?.toLowerCase());
    if (!a) a = Object.values(table).find(t=>t.name===m.awayName||t.name.toLowerCase()===m.awayName?.toLowerCase());
    if (!h||!a) return;
    h.g++; a.g++; h.gf+=m.homeScore; h.ga+=m.awayScore; a.gf+=m.awayScore; a.ga+=m.homeScore;
    if (m.homeScore>m.awayScore) { h.w++;h.pts+=3;a.l++; }
    else if (m.homeScore<m.awayScore) { a.w++;a.pts+=3;h.l++; }
    else { h.d++;a.d++;h.pts++;a.pts++; }
  });
  const sorted = Object.values(table).sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.name.localeCompare(b.name));

  return `<div class="card mb-12">
    <div class="card-title">Ranglijst</div>
    <table class="data-table"><thead><tr>
      <th class="num">#</th><th>Club</th>
      <th class="num">G</th><th class="num">W</th><th class="num">G</th><th class="num">V</th>
      <th class="num">+</th><th class="num">-</th><th class="num">V.S.</th><th class="num">Pnt</th>
    </tr></thead><tbody>${sorted.map((c,i)=>`
      <tr style="${c.isOwn?'background:rgba(245,197,0,0.07);font-weight:600':''}${c.highlight==='rivaal'?';border-left:2px solid var(--heerenveen-rood)':''}">
        <td class="num text-muted">${i+1}</td>
        <td>${c.isOwn?'▶ ':''}${c.name}${c.highlight==='rivaal'?' <span class="badge badge-rival" style="font-size:9px">Rivaal</span>':''}</td>
        <td class="num">${c.g}</td><td class="num">${c.w}</td><td class="num">${c.d}</td><td class="num">${c.l}</td>
        <td class="num">${c.gf}</td><td class="num">${c.ga}</td><td class="num">${c.gf-c.ga>0?'+':''}${c.gf-c.ga}</td>
        <td class="num" style="font-weight:700">${c.pts}</td>
      </tr>`).join('')}</tbody></table>
  </div>`;
}

// ══════════════════════════════


// ══════════════════════════════
// DELETE MATCH(ES)
// ══════════════════════════════
async function deleteMatch(matchId) {
  const m = (S.matches||[]).find(x=>x.id===matchId);
  if (!m) return;
  if (!confirm('Wedstrijd verwijderen?')) return;
  await dbDel('matches', matchId);
  S.matches = S.matches.filter(x=>x.id!==matchId);
  window._playerStats = calcAllPlayerStats(S.currentSeason);
  renderCompDetail(m.competitionId);
  showToast('Wedstrijd verwijderd', 'success');
}

async function deleteAllMatchesInComp(compId) {
  const comp = S.competitions.find(c=>c.id===compId);
  if (!comp) return;
  const count = (S.matches||[]).filter(m=>m.competitionId===compId).length;
  if (!confirm(`Alle ${count} wedstrijden in "${comp.name}" verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
  const ids = (S.matches||[]).filter(m=>m.competitionId===compId).map(m=>m.id);
  for (const id of ids) await dbDel('matches', id);
  S.matches = (S.matches||[]).filter(m=>m.competitionId!==compId);
  window._playerStats = calcAllPlayerStats(S.currentSeason);
  renderCompDetail(compId);
  showToast(`${ids.length} wedstrijden verwijderd`, 'success');
}

