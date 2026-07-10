
// ══════════════════════════════
// SEIZOEN DATUMHELPERS
// ══════════════════════════════

// Geeft {start, end} als Date objecten voor een seizoen
// Seizoen start 1 augustus van het startjaar, eindigt 31 juli volgend jaar
function getSeasonDateRange(season) {
  if (!season) return null;
  // Als een string (ID) wordt meegegeven, zoek het seizoensobject op
  if (typeof season === 'string') {
    season = (S?.seasons||[]).find(s => s.id === season) || null;
    if (!season) return null;
  }
  // Gebruik expliciete datums als die er zijn
  if (season.startDate && season.endDate) {
    return { start: season.startDate, end: season.endDate };
  }
  // Automatisch afleiden uit naam (bijv. "2026/2027" → start 2026-07-01, eind 2027-06-30)
  let year = null;
  if (season.name) {
    const m = season.name.match(/^(\d{4})/);
    if (m) year = parseInt(m[1]);
  }
  if (!year) year = parseInt(season.year);
  if (!year || year < 2000) return null;
  return {
    start: `${year}-07-01`,
    end:   `${year + 1}-06-30`
  };
}

// Sorteert een array van seizoenen: eerst op handmatige sortOrder,
// anders op jaartal (uit naam of year-veld), nieuwste eerst.
// Muteert de array in-place (zoals Array.sort) en geeft 'm ook terug.
function sortSeasons(seasons) {
  seasons.sort((a,b) => {
    if (a.sortOrder!=null && b.sortOrder!=null) return a.sortOrder-b.sortOrder;
    if (a.sortOrder!=null) return -1;
    if (b.sortOrder!=null) return 1;
    const ay = parseInt(a.name?.match(/^(\d{4})/)?.[1] || a.year || 0);
    const by = parseInt(b.name?.match(/^(\d{4})/)?.[1] || b.year || 0);
    return by-ay;
  });
  return seasons;
}

// ── Afgeleide transfer-info uit transfers[] ──
// Vervangen de losse legacy velden (departureDate, loanFromReturn, buyFee,
// freeTransferIn, youthProduct, previousClub, sellFee, freeTransferOut) die
// vroeger apart werden ingevuld naast de transferhistorie.
function getDepartureDate(player) {
  const t = (player.transfers||[]).filter(x=>x.type==='transfer-uit'&&x.date).sort((a,b)=>b.date.localeCompare(a.date))[0];
  return t?.date || null;
}
function getLoanInReturnDate(player) {
  const t = (player.transfers||[]).filter(x=>x.type==='huur-in'&&x.dateTo).sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0];
  return t?.dateTo || null;
}
// Vroegste inkomende ingang (transfer-in of huur-in) — voor "hoe/wanneer kwam deze speler"
function getIncomingTransferInfo(player) {
  return (player.transfers||[]).filter(x=>(x.type==='transfer-in'||x.type==='huur-in')&&x.date)
    .sort((a,b)=>a.date.localeCompare(b.date))[0] || null;
}
// Meest recente uitgaande ingang (transfer-uit) — voor "hoe/wanneer vertrok deze speler"
function getOutgoingTransferInfo(player) {
  return (player.transfers||[]).filter(x=>x.type==='transfer-uit'&&x.date)
    .sort((a,b)=>b.date.localeCompare(a.date))[0] || null;
}

// Geeft true als een speler beschikbaar was voor selectie op de gegeven datum
// (of "nu" als er geen datum is). Sluit uit: nog niet toegevoegd, al vertrokken/
// huur-in afgelopen, of actief uitgeleend (huur-uit) op dat moment.
// refDate mag null zijn — dan wordt alleen op status gefilterd (vertrokken/uitgeleend).
function isPlayerAvailableOn(player, refDate) {
  // Handmatige status-vlag sluit altijd uit, ook als er geen (betrouwbare)
  // datum bekend is — dit is meestal de meest directe/bewuste bron.
  if (['vertrokken','uitgeleend'].includes(player.status)) return false;
  if (!refDate) return true;

  const availFrom = player.availableFrom || player.joined || null;
  const departed = getDepartureDate(player);
  const loanEnd = getLoanInReturnDate(player);
  const effectiveDep = departed || loanEnd || null;

  // Nog niet beschikbaar
  if (availFrom && availFrom > refDate) return false;
  // Al vertrokken of huur (inkomend) afgelopen
  if (effectiveDep && effectiveDep < refDate) return false;

  // Uitgeleend (huur-uit) op dit moment
  const activeLoan = (player.transfers||[]).find(t => {
    if (t.type !== 'huur-uit') return false;
    const from = t.date || null;
    const to = t.dateTo || null;
    if (!from) return false;
    if (from > refDate) return false;
    if (to && to < refDate) return false;
    return true;
  });
  if (activeLoan) return false;

  return true;
}

// Geeft true als een wedstrijd verwijst naar een competitie die niet meer bestaat.
// Kan voorkomen na een bug of handmatige database-aanpassing waarbij een seizoen/
// competitie verwijderd is zonder de bijbehorende wedstrijden mee te wissen.
// Gebruikt als defensief filter bij all-time/date-based queries die niet al op
// een geldige seasonId matchen.
function isMatchOrphaned(m) {
  if (!m.competitionId) return false; // geen competitie gekoppeld is een legitieme staat, geen wees
  return !(S.competitions||[]).some(c => c.id === m.competitionId);
}

// Rondevolgorde van een knockout-competitie: uit comp.rounds als die er is,
// anders op vroegste datum per ronde. Gedeeld tussen de bracket-weergave en
// het uitschakelingsoverzicht, zodat ze nooit uit de pas kunnen lopen.
function getKnockoutRoundOrder(comp, compMatches) {
  let roundOrder = (comp.rounds||[]).filter(r => compMatches.some(m=>m.round===r));
  const roundsWithoutOrder = [...new Set(compMatches.map(m=>m.round))].filter(r => !roundOrder.includes(r));
  if (roundsWithoutOrder.length) {
    roundsWithoutOrder.sort((a,b) => {
      const da = compMatches.filter(m=>m.round===a).map(m=>m.date).filter(Boolean).sort()[0] || '9999';
      const db = compMatches.filter(m=>m.round===b).map(m=>m.date).filter(Boolean).sort()[0] || '9999';
      return da.localeCompare(db);
    });
    roundOrder = [...roundOrder, ...roundsWithoutOrder];
  }
  return roundOrder;
}

// Geeft een leesbare uitslagstring inclusief verlenging/strafschoppen-notatie
// (bijv. "2-2 n.v. (4-3 n.s.)"). Geeft '' als er nog geen uitslag is.
function formatMatchResult(m) {
  if (m.homeScore==null || m.awayScore==null) return '';
  let s = `${m.homeScore} - ${m.awayScore}`;
  if (m.wentToExtraTime) s += ' n.v.';
  if (m.penalties) s += ` (${m.penalties.home}-${m.penalties.away} n.s.)`;
  return s;
}

// Groepeert wedstrijden van een knockout-competitie (bv. beker) per duel:
// twee wedstrijden met dezelfde twee clubs in dezelfde ronde horen bij elkaar
// (heen/uit) — geen los tieId-veld nodig, wordt afgeleid uit de data zelf.
// legs staan gesorteerd op datum (leg 1 = vroegste wedstrijd).
function getKnockoutTies(compMatches) {
  const ties = [];
  const used = new Set();
  compMatches.forEach(m => {
    if (used.has(m.id)) return;
    const pairKey = [m.homeClubId, m.awayClubId].sort().join('_');
    const partner = compMatches.find(m2 => m2.id!==m.id && !used.has(m2.id) &&
      m2.round===m.round && [m2.homeClubId, m2.awayClubId].sort().join('_')===pairKey);
    if (partner) {
      used.add(m.id); used.add(partner.id);
      const legs = [m, partner].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
      ties.push({round: m.round, legs, twoLegged: true});
    } else {
      used.add(m.id);
      ties.push({round: m.round, legs: [m], twoLegged: false});
    }
  });
  return ties;
}

// Bepaalt welke club een duel wint (clubId, of null als nog niet beslist).
// Eén wedstrijd: hoogste score, bij gelijkspel na verlenging beslissen strafschoppen.
// Twee wedstrijden: hoogste opgeteld doelaantal (geen uitdoelpuntenregel), bij
// gelijke stand beslissen de strafschoppen van de laatste (tweede) wedstrijd.
function getTieWinner(tie) {
  const [legA, legB] = tie.legs;
  if (!tie.twoLegged) {
    if (legA.homeScore==null || legA.awayScore==null) return null;
    if (legA.homeScore > legA.awayScore) return legA.homeClubId;
    if (legA.homeScore < legA.awayScore) return legA.awayClubId;
    if (legA.penalties) return legA.penalties.home > legA.penalties.away ? legA.homeClubId : legA.awayClubId;
    return null;
  }
  const clubA = legA.homeClubId, clubB = legA.awayClubId;
  if (legA.homeScore==null || legB.homeScore==null) return null;
  let scoreA = 0, scoreB = 0;
  [legA, legB].forEach(leg => {
    const aIsHome = leg.homeClubId === clubA;
    scoreA += aIsHome ? leg.homeScore : leg.awayScore;
    scoreB += aIsHome ? leg.awayScore : leg.homeScore;
  });
  if (scoreA > scoreB) return clubA;
  if (scoreB > scoreA) return clubB;
  if (legB.penalties) {
    const bIsHome = legB.homeClubId === clubA;
    const penA = bIsHome ? legB.penalties.home : legB.penalties.away;
    const penB = bIsHome ? legB.penalties.away : legB.penalties.home;
    return penA > penB ? clubA : clubB;
  }
  return null;
}

// Geeft de divisie waarin een club op de gegeven datum (of nu) uitkomt,
// gebaseerd op de meest recente divisionHistory-ingang vóór die datum.
// Geeft null als er geen (relevante) historie is.
// Genereert een uniek ID met een gegeven prefix (bv. genId('player') -> 'player_1234567890_ab12').
// Vervangt de losse Date.now()+Math.random()-varianten die eerder verspreid
// door de codebase stonden — één plek, altijd met de willekeurige toevoeging
// voor het geval er meerdere records binnen dezelfde milliseconde ontstaan
// (bijv. bij bulk-imports).
// Geeft een geschikte peildatum voor "wat was actueel tijdens dit seizoen" —
// bij een reeds afgelopen seizoen het einde ervan, bij het lopende (of nog
// niet begonnen) seizoen gewoon vandaag. Gebruikt bij coach-rollen en het
// dashboard, zodat een oud seizoen bekijken niet per ongeluk de HUIDIGE
// (niet die-van-toen) rol/status laat zien.
function getSeasonRefDate(season) {
  const today = new Date();
  if (!season) return today;
  const range = getSeasonDateRange(season);
  if (!range) return today;
  const end = new Date(range.end);
  return end < today ? end : today;
}

// Head-to-head statistieken tussen twee clubs, all-time. Gedeeld tussen
// "Op deze dag", het Rivaliteiten-dashboard en (potentieel) Vergelijking.
function getHeadToHeadStats(clubAId, clubBId) {
  const matches = (S.matches||[]).filter(m => m.played && !isMatchOrphaned(m) &&
    ((m.homeClubId===clubAId && m.awayClubId===clubBId) || (m.awayClubId===clubAId && m.homeClubId===clubBId))
  ).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  let w=0,d=0,l=0,gf=0,ga=0,biggestWin=null,biggestLoss=null;
  matches.forEach(m => {
    const aIsHome = m.homeClubId===clubAId;
    const as = aIsHome?m.homeScore:m.awayScore;
    const bs = aIsHome?m.awayScore:m.homeScore;
    gf+=as; ga+=bs;
    const diff = as-bs;
    if (as>bs) { w++; if(!biggestWin || diff>biggestWin.diff) biggestWin={match:m, diff, as, bs}; }
    else if (as===bs) d++;
    else { l++; if(!biggestLoss || diff<biggestLoss.diff) biggestLoss={match:m, diff, as, bs}; }
  });
  return {played: matches.length, w, d, l, gf, ga, matches, biggestWin, biggestLoss, lastMeeting: matches[0]||null};
}

// Generieke sleep/wis-mechaniek voor de tijdlijn-achtige historielijstjes
// (transfers, blessures, divisiehistorie). Ieder houdt zijn eigen rij-opmaak
// (de velden verschillen te veel om ook dát te delen — transfers heeft
// conditionele velden per type, blessures vaste datumvelden, divisies een
// dropdown), maar delen wel exact dezelfde drag-and-drop- en wis-logica, die
// voorheen drie keer apart geïmplementeerd stond.
function makeTimelineManager(getArray, rerenderFn) {
  let dragIdx = null;
  return {
    dragStart(idx) { dragIdx = idx; },
    dragOver(ev) { ev.preventDefault(); },
    drop(idx) {
      if (dragIdx === null || dragIdx === idx) return;
      const arr = getArray();
      const [moved] = arr.splice(dragIdx, 1);
      arr.splice(idx, 0, moved);
      dragIdx = null;
      rerenderFn();
    },
    clearAll(confirmMsg) {
      const arr = getArray();
      if (!arr.length) return;
      if (!confirm(confirmMsg)) return;
      arr.length = 0; // leegmaken in-place — zelfde array-referentie blijft geldig
      rerenderFn();
    },
  };
}

// Bepaalt "de" hoofdcompetitie van een seizoen voor dashboard-doeleinden
// (positie-stat, positiegrafiek) — eerst de handmatig aangewezen hoofd-
// competitie (season.mainCompetitionId), anders een heuristiek: de eerste
// competitie van type 'competitie' waar de eigen club daadwerkelijk lid van
// is. Nodig zodra een seizoen meerdere competitie-type competities heeft
// (bijv. Eredivisie + KKD samen bijgehouden, terwijl je maar in één speelt).
function getMainCompetition(seasonId) {
  const season = (S.seasons||[]).find(s=>s.id===seasonId);
  if (season?.mainCompetitionId) {
    const comp = (S.competitions||[]).find(c=>c.id===season.mainCompetitionId);
    if (comp) return comp;
  }
  const candidates = (S.competitions||[]).filter(c=>c.seasonId===seasonId&&c.type==='competitie');
  const cam = (S.clubs||[]).find(c=>c.isOwnClub);
  if (cam) {
    const withCam = candidates.find(c=>(c.clubIds||[]).includes(cam.id));
    if (withCam) return withCam;
  }
  return candidates[0] || null;
}

// Leidt een clubafkorting af uit de naam — bij meerdere woorden de eerste
// letter van elk woord ("Newcastle United" -> "NU"), bij één woord de eerste
// 3 letters. Gedeeld tussen de opzet-wizard en de auto-clubaanmaak bij CSV/
// RSSSF-import, zodat dit niet drie keer los hoeft te staan.
function deriveClubAbbr(name) {
  const words = (name||'').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.slice(0,3).map(w=>w[0]).join('').toUpperCase();
  return (words[0]||'').slice(0,3).toUpperCase();
}

// Normaliseert een clubnaam voor matchdoeleinden: hoofdletterongevoelig,
// overtollige spaties genegeerd, accenten losgekoppeld (é -> e). Alleen voor
// vergelijking — de opgeslagen naam zelf blijft ongewijzigd.
function normalizeClubName(name) {
  return (name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
}
// Zoekt een club op naam, met de normalisatie hierboven. Gedeeld tussen de
// PDF/CSV/RSSSF-importers, die deze matchlogica eerder allemaal apart en
// beperkter (geen trimming, geen accenten) implementeerden.
function findClubFuzzy(name, clubList) {
  const target = normalizeClubName(name);
  if (!target) return null;
  return (clubList||S.clubs||[]).find(c => normalizeClubName(c.name) === target) || null;
}

// Bepaalt of een wedstrijd uitverkocht was — toeschouwersaantal exact gelijk
// aan de capaciteit van het stadion van de thuisclub. Geeft null terug als
// er te weinig gegevens zijn om iets te zeggen (geen toeschouwersaantal of
// geen bekende capaciteit), zodat dit niet per ongeluk als "niet uitverkocht"
// wordt geteld.
// Toont het clublogo (URL, handmatig ingevuld) met terugval op de afkorting
// zodra er geen logo is ingevuld, of de link een keer niet meer werkt.
// Zelfde patroon als playerAvatarHTML in selectie.js.
function clubLogoHTML(club, size) {
  if (!club) return '';
  const abbr = club.abbr || club.name?.slice(0,3).toUpperCase() || '?';
  const sz = size ? `width:${size}px;height:${size}px;font-size:${Math.floor(size*0.32)}px` : '';
  if (club.logo) return `<span class="club-logo" style="${sz}"><img src="${club.logo}" onerror="this.parentElement.textContent='${abbr}'"></span>`;
  return `<span class="club-logo" style="${sz}">${abbr}</span>`;
}

function isMatchSoldOut(m) {
  if (m.attendance == null) return null;
  const homeClub = (S.clubs||[]).find(c=>c.id===m.homeClubId);
  const stadium = homeClub ? (S.stadiums||[]).find(s=>s.id===homeClub.stadiumId) : null;
  if (!stadium?.capacity) return null;
  return m.attendance >= stadium.capacity;
}

function genId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
}

function effectiveDivision(club, refDate) {
  const hist = club.divisionHistory;
  if (!hist || !hist.length) return null;
  const ref = refDate || new Date().toISOString().split('T')[0];
  const applicable = hist.filter(h => h.startDate && h.startDate <= ref)
    .sort((a,b) => b.startDate.localeCompare(a.startDate));
  return applicable[0]?.division || null;
}

// Geeft de index van een divisie in de ingestelde volgorde (S.prefs.divisions),
// of Infinity als de divisie niet (meer) in de lijst staat — zo'n club zakt
// dan automatisch naar de "onbekend"-positie in gesorteerde lijsten.
function divisionSortIndex(divisionName) {
  const list = S.prefs?.divisions || [];
  const idx = list.indexOf(divisionName);
  return idx === -1 ? Infinity : idx;
}

// Geeft true als speler actief was tijdens het opgegeven seizoen
function isPlayerInSeason(player, season) {
  if (!season) return true;
  const range = getSeasonDateRange(season);
  if (!range) return true;

  const joined   = player.joined        || null;
  const departed = getDepartureDate(player);
  const loanEnd  = getLoanInReturnDate(player);
  // Als geen expliciete vertrekdatum maar wel een verlopen contract, gebruik contractdatum
  const contractEnd = player.contract || null;
  const effectiveDeparture = departed || loanEnd ||
    (contractEnd && contractEnd < range.start ? contractEnd : null);

  // Geen joined datum → toon in alle seizoenen tenzij al vertrokken voor dit seizoen
  if (!joined) {
    if (effectiveDeparture && effectiveDeparture <= range.start) return false;
    return true;
  }

  // Speler was er NIET als hij pas na het seizoen bijkwam
  if (joined > range.end) return false;

  // Speler was er NIET als zijn vertrek/huurperiode voor of op de eerste dag van het seizoen afliep
  if (effectiveDeparture && effectiveDeparture <= range.start) return false;

  return true;
}


// Globale effectiveStatus — gebruikt buiten renderSelectie context (dashboard etc.)
function effectiveStatus(p) {
  const today = new Date().toISOString().split('T')[0];
  const fromTimeline = effectiveStatusFromTransfers(p, today);
  if (fromTimeline) return fromTimeline;
  return p.status || 'actief';
}

// NB: statusLabel(p) leeft in selectie.js (naast statusLabelEff) — die versie
// is datum-bewust (herkent 'Vertrekt' vóór de daadwerkelijke vertrekdatum).

// ══════════════════════════════
// MISSING-DATA CHECK (alleen relevant voor gespeelde Cambuur-wedstrijden)
// ══════════════════════════════
// Centrale definitie van welke velden we bijhouden voor 'ontbrekende data'.
// Gebruikt door zowel de rode stipjes/tooltip in competitie.js als het
// dashboard-widget. m.dataIgnored (array van keys) sluit een veld bewust uit.
const MISSING_DATA_FIELDS = [
  {key:'lineup',     icon:'👕', label:'Geen basisself',    check:m => !(m.lineup||[]).length},
  {key:'coach',      icon:'🧑‍💼', label:'Geen coach',        check:m => !m.coachId},
  {key:'extraTime',  icon:'⏱', label:'Geen extra tijd',    check:m => m.extraTime1===undefined && m.extraTime2===undefined},
  {key:'motm',       icon:'🏆', label:'Geen MOTM',          check:m => !m.motm},
  {key:'matchStats', icon:'📊', label:'Geen wedstrijdstats', check:m => !m.matchStats?.home?.possession},
];

// Geeft alleen de velden die daadwerkelijk ontbreken én niet bewust genegeerd zijn
function getMissingDataFields(match) {
  const ignored = match.dataIgnored || [];
  return MISSING_DATA_FIELDS.filter(f => f.check(match) && !ignored.includes(f.key));
}

// Geeft de velden die ontbreken MAAR bewust genegeerd zijn (voor een grijs stipje i.p.v. rood)
function getIgnoredMissingFields(match) {
  const ignored = match.dataIgnored || [];
  return MISSING_DATA_FIELDS.filter(f => f.check(match) && ignored.includes(f.key));
}
