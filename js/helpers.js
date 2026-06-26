
// ══════════════════════════════
// SEIZOEN DATUMHELPERS
// ══════════════════════════════

// Geeft {start, end} als Date objecten voor een seizoen
// Seizoen start 1 augustus van het startjaar, eindigt 31 juli volgend jaar
function getSeasonDateRange(season) {
  if (!season) return null;
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

// Geeft true als speler actief was tijdens het opgegeven seizoen
function isPlayerInSeason(player, season) {
  if (!season) return true;
  const range = getSeasonDateRange(season);
  if (!range) return true;

  const joined   = player.joined        || null;
  const departed = player.departureDate || null;
  // Huurlingen: gebruik loanFromReturn als effectieve einddatum als departureDate ontbreekt
  const loanEnd  = player.loanFromReturn || null;
  const effectiveDeparture = departed || loanEnd || null;

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
