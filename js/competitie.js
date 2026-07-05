// WEDSTRIJDEN — COMPETITIE DETAIL
// ══════════════════════════════
function renderCompDetail(compId) {
  const comp = S.competitions.find(c=>c.id===compId);
  const el = document.getElementById('competition-detail-content');
  if (!comp) { el.innerHTML='<p class="text-muted">Niet gevonden.</p>'; return; }
  document.getElementById('topbar-title').textContent = comp.name;
  const clubs = (comp.clubIds||[]).map(cid=>S.clubs.find(c=>c.id===cid)).filter(Boolean);
  const typeBadge = {competitie:'badge-competitie',beker:'badge-beker',playoffs:'badge-playoffs',voorbereiding:'badge-voorbereiding'};
  const typeLabel = {competitie:'Competitie',beker:'Bekertoernooi',playoffs:'Play-offs',voorbereiding:'Voorbereiding'};

  const compMatches = (S.matches||[]).filter(m=>m.competitionId===compId);
  const today = new Date().toISOString().split('T')[0];
  const isKnockout = comp.type === 'beker' || comp.type === 'playoffs';

  let standingsHtml = '';
  if (comp.type === 'competitie' && clubs.length) {
    standingsHtml = renderLeagueTable(comp, clubs, compMatches) + renderPeriodStandings(comp, clubs, compMatches);
  } else if (isKnockout) {
    standingsHtml = renderKnockoutSummary(comp, compMatches);
  }

  let roundsHtml = '';
  if (isKnockout) {
    roundsHtml = renderKnockoutRounds(comp, compMatches);
  } else {
    const rounds = [...new Set(compMatches.map(m=>m.round))].sort((a,b)=>a-b);
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
      <div class="section-title">${isKnockout ? 'Bracket' : 'Speelschema'}</div>
      ${isKnockout ? '' : `<div class="flex-center gap-8">
        <button class="btn btn-ghost" style="font-size:11px" onclick="expandAllRounds('${compId}')">Alles uitklappen</button>
        <button class="btn btn-ghost" style="font-size:11px" onclick="collapseAllRounds('${compId}')">Alles inklappen</button>
      </div>`}
    </div>
    ${roundsHtml || '<p class="text-muted" style="font-size:12px">Nog geen wedstrijden. Voeg wedstrijden toe of genereer een schema.</p>'}
  `;

  if (isKnockout) return; // knockout-rondes staan altijd open, geen state-restore nodig

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

// ══════════════════════════════
// KNOCKOUT-WEERGAVE (bekertoernooien, play-offs)
// ══════════════════════════════
// Uitschakelingsoverzicht: per ronde welke clubs afvielen, plus een
// winnaar-banner zodra de laatste ronde (Finale) een winnaar heeft.
function renderKnockoutSummary(comp, compMatches) {
  const roundOrder = getKnockoutRoundOrder(comp, compMatches);
  if (!roundOrder.length) return '';

  const clubName = id => S.clubs.find(c=>c.id===id)?.name || '?';
  const eliminationRows = [];
  let winner = null;

  roundOrder.forEach((r, idx) => {
    const rMatches = compMatches.filter(m=>m.round===r);
    const ties = getKnockoutTies(rMatches);
    const eliminated = [];
    ties.forEach(tie => {
      const w = getTieWinner(tie);
      if (!w) return;
      const [legA] = tie.legs;
      const loser = legA.homeClubId===w ? legA.awayClubId : legA.homeClubId;
      eliminated.push(loser);
      if (idx === roundOrder.length-1) winner = w;
    });
    if (eliminated.length) eliminationRows.push({round:r, clubs:eliminated});
  });

  if (!eliminationRows.length && !winner) return '';

  return `<div class="card mb-12">
    <div class="card-title">📋 Uitschakelingen</div>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${eliminationRows.map(row=>`<div style="display:flex;gap:8px;align-items:baseline;font-size:12px">
        <span style="min-width:110px;color:var(--text-muted);font-weight:600">${row.round}</span>
        <span>${row.clubs.map(clubName).join(', ')}</span>
      </div>`).join('')}
    </div>
    ${winner?`<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border-light);text-align:center;font-size:14px;font-weight:800;color:var(--cambuur-geel)">🏆 Winnaar: ${clubName(winner)}</div>`:''}
  </div>`;
}

function renderKnockoutRounds(comp, compMatches) {
  const roundOrder = getKnockoutRoundOrder(comp, compMatches);

  return roundOrder.map(r => {
    const rMatches = compMatches.filter(m=>m.round===r);
    const ties = getKnockoutTies(rMatches);
    const cambuurTie = ties.find(t => t.legs.some(isCambuurMatch));
    return `<div class="round-accordion open" style="margin-bottom:12px">
      <div class="round-header open" style="cursor:default">
        <div class="flex-center gap-8">
          <span class="round-title">${r}</span>
          ${cambuurTie ? `<span class="badge badge-competitie" style="font-size:9px">Cambuur</span>` : ''}
        </div>
        <span class="round-meta">${ties.length} duel${ties.length!==1?'len':''}</span>
      </div>
      <div class="round-body open">
        ${ties.map(tie => renderKnockoutTie(tie, comp)).join('')}
      </div>
    </div>`;
  }).join('');
}

function renderKnockoutTie(tie, comp) {
  const clubName = id => S.clubs.find(c=>c.id===id)?.name || '?';
  const winner = getTieWinner(tie);
  const [legA] = tie.legs;
  const clubA = legA.homeClubId, clubB = legA.awayClubId;
  const cam = S.clubs.find(c=>c.isOwnClub);
  const isCamTie = cam && (clubA===cam.id || clubB===cam.id);

  let aggHtml = '';
  if (tie.twoLegged) {
    let scoreA=0, scoreB=0, allPlayed=true;
    tie.legs.forEach(leg => {
      if (leg.homeScore==null || leg.awayScore==null) { allPlayed=false; return; }
      const aIsHome = leg.homeClubId===clubA;
      scoreA += aIsHome?leg.homeScore:leg.awayScore;
      scoreB += aIsHome?leg.awayScore:leg.homeScore;
    });
    if (allPlayed) {
      const lastLeg = tie.legs[1];
      aggHtml = `<div style="text-align:center;font-size:11px;color:var(--text-muted);padding:4px 0">Totaalstand: <strong>${scoreA}-${scoreB}</strong>${lastLeg.penalties?` (${lastLeg.penalties.home}-${lastLeg.penalties.away} n.s.)`:''}</div>`;
    }
  }

  return `<div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;margin-bottom:8px;${isCamTie?'border-color:var(--cambuur-geel)':''}">
    <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:6px;padding:0 4px">
      <span style="${winner===clubA?'color:var(--win)':winner?'color:var(--text-muted);font-weight:400':''}">${winner===clubA?'✓ ':''}${clubName(clubA)}</span>
      <span style="color:var(--text-muted);font-weight:400;font-size:10px">${tie.twoLegged?'heen/uit':'vs'}</span>
      <span style="${winner===clubB?'color:var(--win)':winner?'color:var(--text-muted);font-weight:400':''}">${clubName(clubB)}${winner===clubB?' ✓':''}</span>
    </div>
    ${tie.legs.map(m=>renderMatchRow(m,comp)).join('')}
    ${aggHtml}
  </div>`;
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
    let cls = isCam ? (camScore > oppScore ? 'won' : camScore === oppScore ? 'draw' : 'lost') : '';
    // Bij gelijkspel na verlenging beslissen strafschoppen wie 'wint' (voor de kleur)
    if (isCam && m.penalties && camScore === oppScore) {
      const camPen = camIsHome ? m.penalties.home : m.penalties.away;
      const oppPen = camIsHome ? m.penalties.away : m.penalties.home;
      cls = camPen > oppPen ? 'won' : 'lost';
    }
    scoreHtml = `<span class="match-score ${cls}" onclick="startInlineScore(event,'${m.id}')" style="cursor:pointer" title="Klik om aan te passen">${formatMatchResult(m)}</span>`;
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
function calcStandings(clubs, compMatches, deductions) {
  const table = {};
  clubs.forEach(c => { table[c.id] = {id:c.id,name:c.name,isOwn:c.isOwnClub,highlight:c.highlight,g:0,w:0,d:0,l:0,gf:0,ga:0,pts:0,ded:0}; });
  compMatches.filter(m=>m.played&&m.homeScore!==null).forEach(m => {
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
  // Puntenaftrek — puur handmatig ingevoerd (licentie-overtredingen e.d.),
  // telt op in de eindstand maar NIET mee in de periodestanden (dat is een
  // aparte, op zichzelf staande vorm-momentopname).
  (deductions||[]).forEach(d => {
    if (table[d.clubId]) { table[d.clubId].pts -= d.points; table[d.clubId].ded += d.points; }
  });
  return Object.values(table).sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.name.localeCompare(b.name));
}

// Bepaalt de winnaar van een bekertoernooi (type 'beker') binnen hetzelfde
// seizoen als de meegegeven competitie — voor het bekerwinnaar-icoon in de
// ranglijst van een gewone competitie (ED+KKD gecombineerd bijgehouden).
function getCupWinner(seasonId) {
  const cupComp = (S.competitions||[]).find(c => c.seasonId === seasonId && c.type === 'beker');
  if (!cupComp) return null;
  const cupMatches = (S.matches||[]).filter(m => m.competitionId === cupComp.id);
  const roundOrder = getKnockoutRoundOrder(cupComp, cupMatches);
  if (!roundOrder.length) return null;
  const finalRound = roundOrder[roundOrder.length-1];
  const finalMatches = cupMatches.filter(m => m.round === finalRound);
  const ties = getKnockoutTies(finalMatches);
  if (ties.length !== 1) return null; // finale zou precies één duel moeten zijn
  return getTieWinner(ties[0]);
}

function renderLeagueTable(comp, clubs, compMatches) {
  const sorted = calcStandings(clubs, compMatches, comp.pointDeductions);
  const zones = comp.rankZones || [];
  const { winners: periodWinners } = getPeriodWinners(comp, clubs, compMatches);
  const cupWinnerId = getCupWinner(comp.seasonId);

  const isExcluded = clubId => !!S.clubs.find(c=>c.id===clubId)?.promotionExcluded;
  // Positie "als je uitgesloten clubs niet meetelt" — voor zones die dat vinkje aan hebben
  const eligibleOnly = sorted.filter(c => !isExcluded(c.id));
  const eligiblePosById = {};
  eligibleOnly.forEach((c, idx) => { eligiblePosById[c.id] = idx + 1; });

  // Zone-bepaling: eerst-gedefinieerde zone wint (volgorde = prioriteit).
  // Een zone geldt voor een club als de positie binnen het bereik valt, ÓF
  // als de zone gekoppeld is aan periodetitel-winnaars en deze club een
  // periodetitel heeft gewonnen — ongeacht positie. Staat "uitgesloten clubs
  // overslaan" aan voor die zone, dan telt een uitgesloten club (bijv. een
  // Jong-team) via GEEN van beide routes mee — noch op positie, noch via een
  // periodetitel — en wordt voor de positie-telling de eerstvolgende
  // niet-uitgesloten club gebruikt.
  const zoneForClub = (clubId, rawPos, wonPeriod) => zones.find(z => {
    if (z.excludeIneligible && isExcluded(clubId)) return false;
    const posToCheck = z.excludeIneligible ? eligiblePosById[clubId] : rawPos;
    const posMatches = posToCheck != null && posToCheck >= z.fromPos && posToCheck <= z.toPos;
    const periodMatches = z.linkPeriodWinners && wonPeriod;
    return posMatches || periodMatches;
  });

  return `<div class="card mb-12">
    <div class="card-title">Ranglijst</div>
    <table class="data-table"><thead><tr>
      <th style="width:6px;padding:0"></th><th class="num">#</th><th>Club</th>
      <th class="num">G</th><th class="num">W</th><th class="num">G</th><th class="num">V</th>
      <th class="num">+</th><th class="num">-</th><th class="num">V.S.</th><th class="num">Pnt</th>
    </tr></thead><tbody>${sorted.map((c,i)=>{
      const pos = i+1;
      const wonPeriods = periodWinners[c.id] || [];
      const zone = zoneForClub(c.id, pos, wonPeriods.length > 0);
      const periodBadge = wonPeriods.length
        ? ` <span style="font-size:10px;color:var(--cambuur-geel)" title="Periodetitel: ${wonPeriods.join(', ')}">🏆${wonPeriods.length>1?'×'+wonPeriods.length:''}</span>`
        : '';
      const cupBadge = c.id === cupWinnerId
        ? ` <span style="font-size:10px" title="Bekerwinnaar dit seizoen">🛡️</span>`
        : '';
      const excludedBadge = isExcluded(c.id)
        ? ` <span style="font-size:10px;color:var(--text-muted)" title="Uitgesloten van promotie/degradatie">🚫</span>`
        : '';
      return `<tr style="${c.isOwn?'background:rgba(245,197,0,0.07);font-weight:600':''}${c.highlight==='rivaal'?';border-left:2px solid var(--heerenveen-rood)':''}">
        <td style="width:6px;padding:0;${zone?'background:'+zone.color:''}" title="${zone?.label||''}"></td>
        <td class="num text-muted">${pos}</td>
        <td>${c.isOwn?'▶ ':''}${c.name}${c.highlight==='rivaal'?' <span class="badge badge-rival" style="font-size:9px">Rivaal</span>':''}${periodBadge}${cupBadge}${excludedBadge}</td>
        <td class="num">${c.g}</td><td class="num">${c.w}</td><td class="num">${c.d}</td><td class="num">${c.l}</td>
        <td class="num">${c.gf}</td><td class="num">${c.ga}</td><td class="num">${c.gf-c.ga>0?'+':''}${c.gf-c.ga}</td>
        <td class="num" style="font-weight:700">${c.pts}${c.ded>0?` <span style="font-size:9px;color:var(--loss);font-weight:400" title="${c.ded} punt(en) in mindering gebracht">(-${c.ded})</span>`:''}</td>
      </tr>`;
    }).join('')}</tbody></table>
    ${zones.length ? `<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-light)">
      ${zones.map(z=>`<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-muted)">
        <span style="width:10px;height:10px;border-radius:2px;background:${z.color};display:inline-block"></span>${z.label||('pos. '+z.fromPos+'-'+z.toPos)}${z.linkPeriodWinners?' <span style="opacity:0.7">(+ periodetitel)</span>':''}
      </div>`).join('')}
    </div>` : ''}
  </div>`;
}

// Periodestanden — puur informatief, geen automatische play-off-toewijzing.
// Elke periode is een rondebereik (bv. ronde 1 t/m 9); de "winnaar" hier is
// gewoon wie de meeste punten had binnen dat bereik, niets meer.
// Bepaalt per periode of die compleet is en wie 'm gewonnen heeft. Gedeeld
// tussen de periodestanden-kaart en de badges in de hoofdranglijst, zodat
// beide altijd exact hetzelfde tonen.
function getPeriodWinners(comp, clubs, compMatches) {
  const periods = comp.periods || [];
  // clubId -> [periodenaam, ...]
  const winners = {};
  const details = periods.map(period => {
    const periodMatches = compMatches.filter(m => {
      const rn = parseInt(m.round);
      return !isNaN(rn) && rn >= period.fromRound && rn <= period.toRound;
    });
    const played = periodMatches.filter(m=>m.played).length;
    const total = periodMatches.length;
    const complete = total>0 && played===total;
    const standings = calcStandings(clubs, periodMatches);
    const leader = standings[0];
    if (complete && leader && leader.g > 0) {
      if (!winners[leader.id]) winners[leader.id] = [];
      winners[leader.id].push(period.name);
    }
    return { period, periodMatches, played, total, complete, standings, leader };
  });
  return { winners, details };
}

function renderPeriodStandings(comp, clubs, compMatches) {
  const periods = comp.periods || [];
  if (!periods.length) return '';
  const { details } = getPeriodWinners(comp, clubs, compMatches);
  return `<div class="card mb-12">
    <div class="card-title">Periodestanden</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
      ${details.map(({period, played, total, complete, standings, leader}) => {
        return `<div style="background:var(--bg-tertiary);border-radius:var(--radius-sm);padding:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-weight:700;font-size:12px">${period.name}</span>
            <span style="font-size:10px;color:var(--text-muted)">${played}/${total}${complete?' ✓':''}</span>
          </div>
          ${standings.filter(c=>c.g>0).slice(0,5).map((c,i)=>`<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;${i===0?'font-weight:700;color:var(--cambuur-geel)':''}">
            <span>${i+1}. ${c.name}</span><span>${c.pts} pt</span>
          </div>`).join('') || '<div style="font-size:11px;color:var(--text-muted)">Nog geen wedstrijden</div>'}
          ${complete&&leader?`<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border-light);font-size:11px;color:var(--cambuur-geel);font-weight:700">🏆 ${leader.name}</div>`:''}
        </div>`;
      }).join('')}
    </div>
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

