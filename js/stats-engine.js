// ══════════════════════════════════════════════════════
// STATS ENGINE — kernberekening van spelerstatistieken
// ══════════════════════════════════════════════════════
// Gebruikt door dashboard, vergelijkingen, coaches, seizoensverslag,
// statistiekenpagina — overal waar spelerscijfers getoond worden.

// ══════════════════════════════
// SPELERSSTATISTIEKEN
// ══════════════════════════════
function calcPlayerStats(playerId, seasonId, competitionId) {
  const stats = { goals: 0, assists: 0, yellowCards: 0, redCards: 0, appearances: 0, starts: 0, minutesPlayed: 0, motm: 0, cleanSheets: 0, saves: 0 };
  const matches = (S.matches||[]).filter(m => {
    if (!m.played) return false;
    if (seasonId && m.seasonId !== seasonId) return false;
    if (competitionId && m.competitionId !== competitionId) return false;
    return true;
  });

  matches.forEach(m => {
    const events = m.events || [];
    // Goals
    events.filter(e=>e.type==='goal'&&e.playerId===playerId&&e.playerId!=='__opp__'&&e.playerId!=='__opp_own__'&&e.goalType!=='eigen doelpunt').forEach(()=>stats.goals++);
    // Assists
    events.filter(e=>e.type==='goal'&&e.assistId===playerId).forEach(()=>stats.assists++);
    // Cards
    events.filter(e=>e.type==='card'&&e.playerId===playerId).forEach(e=>{
      if(e.cardType==='geel') stats.yellowCards++;
      else if(e.cardType==='rood'||e.cardType==='geel-rood') stats.redCards++;
    });
    // Appearances & minutes — use periods if available
    const subs = events.filter(e=>e.type==='sub');
    const subIn = subs.find(s=>s.playerInId===playerId);
    const subOut = subs.find(s=>s.playerOutId===playerId);

    // Check starter status — support both old (periods) and new (lineup array) format
    const periods = m.periods;
    let isStarter = false;
    let appearsInAnyPeriod = false;

    // Prefer new lineup array if available, fall back to old periods format
    const lineup = m.lineup || [];
    if (lineup.length > 0) {
      // New format: lineup is array of starter IDs
      isStarter = lineup.includes(playerId);
      appearsInAnyPeriod = isStarter || !!subIn;
    } else if (periods && periods.length && Object.keys(periods[0].assignments||{}).length > 0) {
      // Old format: periods with assignments (no lineup set)
      const firstPeriodIds = Object.values(periods[0].assignments||{});
      isStarter = firstPeriodIds.includes(playerId);
      appearsInAnyPeriod = periods.some(p=>Object.values(p.assignments||{}).includes(playerId));
    }

    // Also count appearances from goals/assists even without lineup data
    const hasGoalOrAssist = false; // removed: caused incorrect appearances

    if (isStarter || subIn || appearsInAnyPeriod) {
      stats.appearances++;
      // Find red card for this player (direct red or geel-rood)
      const redCard = events.find(e=>e.type==='card'&&e.playerId===playerId&&(e.cardType==='rood'||e.cardType==='geel-rood'));
      const redMin = redCard?.minute ? parseMinute(redCard.minute) : null;

      if (isStarter) {
        stats.starts++;
        const et1 = m.extraTime1 || 0;
        const et2 = m.extraTime2 || 0;
        const maxMin = 90 + et1 + et2;
        const outMinStr = subOut?.minute;
        const subOutMin = outMinStr ? (parseMinute(outMinStr)||maxMin) : maxMin;
        // Use earliest of: sub out, red card, end of match
        const outMin = redMin !== null ? Math.min(subOutMin, redMin) : subOutMin;
        stats.minutesPlayed += Math.min(outMin, maxMin);
      } else if (subIn) {
        const et1 = m.extraTime1 || 0;
        const et2 = m.extraTime2 || 0;
        const maxMin = 90 + et1 + et2;
        const inMinStr = subIn.minute;
        const inMin = inMinStr ? (parseMinute(inMinStr)||0) : 0;
        const subOut2 = events.filter(e=>e.type==='sub').find(e=>e.playerOutId===playerId);
        const subOutMin2 = subOut2?.minute ? (parseMinute(subOut2.minute)||maxMin) : maxMin;
        const outMin2 = redMin !== null ? Math.min(subOutMin2, redMin) : subOutMin2;
        stats.minutesPlayed += Math.min(outMin2, maxMin) - inMin;
      }
    }
    // MOTM
    if (m.motm === playerId) stats.motm++;
    // Keeper stats: saves + clean sheets
    const p = (S.players||[]).find(x=>x.id===playerId);
    if (p?.position === 'Keeper' && (isStarter || subIn)) {
      if (m.keeperSaves?.[playerId] !== undefined) stats.saves += m.keeperSaves[playerId];
      // Clean sheet: keeper was on field and no goals conceded
      const cam = S.clubs.find(c=>c.isOwnClub);
      const isCamHome = m.homeClubId === cam?.id;
      const oppScore = isCamHome ? m.awayScore : m.homeScore;
      if (oppScore === 0) stats.cleanSheets++;
    }
  });
  return stats;
}

function calcAllPlayerStats(seasonId) {
  // Returns a map of playerId -> stats
  const result = {};
  (S.players||[]).forEach(p => { result[p.id] = calcPlayerStats(p.id, seasonId, null); });
  return result;
}

function startInlineScore(event, matchId) {
  event.stopPropagation();
  const span = event.currentTarget;
  const m = (S.matches||[]).find(x=>x.id===matchId);
  if (!m) return;
  const wrap = document.createElement('div');
  wrap.className = 'inline-score-wrap';
  wrap.onclick = e => e.stopPropagation();
  const hInput = document.createElement('input');
  hInput.className = 'inline-score-input'; hInput.type='number'; hInput.min='0'; hInput.max='99';
  hInput.value = m.homeScore !== null ? m.homeScore : '';
  hInput.placeholder = '—';
  const sep = document.createElement('span');
  sep.textContent = '-'; sep.style.cssText = 'font-weight:800;font-size:15px;color:var(--text-muted);padding:0 1px';
  const aInput = document.createElement('input');
  aInput.className = 'inline-score-input'; aInput.type='number'; aInput.min='0'; aInput.max='99';
  aInput.value = m.awayScore !== null ? m.awayScore : '';
  aInput.placeholder = '—';
  wrap.appendChild(hInput); wrap.appendChild(sep); wrap.appendChild(aInput);
  span.replaceWith(wrap);
  hInput.focus(); hInput.select();
  const rerender = () => {
    const ac = document.querySelector('.nav-item[data-comp].active');
    if (ac) renderCompDetail(ac.dataset.comp);
    else renderCompDetail(m.competitionId);
  };
  const save = async () => {
    const hs = hInput.value.trim(), as_ = aInput.value.trim();
    if (hs !== '' && as_ !== '') {
      // Both filled: save score
      m.homeScore = parseInt(hs); m.awayScore = parseInt(as_); m.played = true;
      await dbPut('matches', m);
      window._playerStats = calcAllPlayerStats(S.currentSeason);
    } else if (hs === '' && as_ === '') {
      // Both empty: clear score
      m.homeScore = null; m.awayScore = null; m.played = false;
      await dbPut('matches', m);
      window._playerStats = calcAllPlayerStats(S.currentSeason);
    }
    // If only one is filled: don't save yet, just rerender
    rerender();
  };
  const cancel = () => rerender();
  hInput.addEventListener('keydown', e => {
    if (e.key==='Enter') { e.preventDefault(); save(); }
    if (e.key==='Escape') { e.preventDefault(); cancel(); }
    if (e.key==='Tab') { e.preventDefault(); aInput.focus(); aInput.select(); }
  });
  aInput.addEventListener('keydown', e => {
    if (e.key==='Enter') { e.preventDefault(); save(); }
    if (e.key==='Escape') { e.preventDefault(); cancel(); }
    if (e.key==='Tab') { e.preventDefault(); hInput.focus(); hInput.select(); }
  });
  // Blur: only save if focus went outside BOTH inputs — use longer timer
  let bt;
  const onBlur = () => {
    bt = setTimeout(() => {
      const active = document.activeElement;
      if (active !== hInput && active !== aInput) save();
    }, 400);
  };
  hInput.addEventListener('blur', onBlur);
  aInput.addEventListener('blur', onBlur);
  hInput.addEventListener('focus', () => clearTimeout(bt));
  aInput.addEventListener('focus', () => clearTimeout(bt));
}

// ══════════════════════════════════════════════════════
// SEIZOENSRECORD — gedeelde W/D/L/doelsaldo/PPG-berekening
// ══════════════════════════════════════════════════════
// Gebruikt door statistieken.js, vergelijking.js (seizoenstab) en
// seizoensverslag.js — voorheen berekende elk dit onafhankelijk van elkaar.
// Matcht op m.seasonId (niet op datumbereik) — consistent met hoe de rest
// van de app (dashboard, coaches) wedstrijden aan een seizoen koppelt.
function calcSeasonRecord(seasonId, cam) {
  const matches = (S.matches||[]).filter(m => m.played && !isMatchOrphaned(m) && m.seasonId===seasonId &&
    (m.homeClubId===cam?.id || m.awayClubId===cam?.id)
  );
  let w=0, d=0, l=0, gf=0, ga=0, cs=0;
  matches.forEach(m => {
    const isCamHome = m.homeClubId===cam.id;
    const cg = isCamHome ? m.homeScore : m.awayScore;
    const og = isCamHome ? m.awayScore : m.homeScore;
    gf += cg; ga += og;
    if (cg>og) w++; else if (cg===og) d++; else l++;
    if (og===0) cs++;
  });
  const played = matches.length;
  const pts = w*3+d;
  const ppg = played>0 ? (pts/played).toFixed(2) : '0.00';
  return { matches, played, w, d, l, gf, ga, cleanSheets:cs, pts, ppg };
}


