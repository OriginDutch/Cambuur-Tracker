
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
  const departed = player.departureDate || null;
  const loanEnd = player.loanFromReturn || null;
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

// Geeft true als speler actief was tijdens het opgegeven seizoen
function isPlayerInSeason(player, season) {
  if (!season) return true;
  const range = getSeasonDateRange(season);
  if (!range) return true;

  const joined   = player.joined        || null;
  const departed = player.departureDate || null;
  const loanEnd  = player.loanFromReturn || null;
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
  if (p.status === 'vertrokken' && p.departureDate && p.departureDate > today) return 'vertrekt';
  return p.status || 'actief';
}

function statusLabel(p) {
  const s = p.status || 'actief';
  const labels = { actief:'Actief', geblesseerd:'Geblesseerd', geschorst:'Geschorst',
    vertrokken:'Vertrokken', vertrekt:'Vertrekt', uitgeleend:'Uitgeleend', huurder:'Huurder' };
  return labels[s] || s;
}

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
