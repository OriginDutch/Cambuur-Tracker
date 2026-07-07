// ══════════════════════════════════════════════════════
// KALENDER — alle wedstrijden van het geselecteerde seizoen in maandoverzicht
// ══════════════════════════════════════════════════════
// Toont de eigen club se wedstrijden (niet alle wedstrijden van alle clubs
// in alle competities — dat zou per dag al snel te veel worden). Werkt voor
// elk seizoen dat je selecteert, dus ook prima als terugkijkfunctie.

function renderKalenderPage() {
  const el = document.getElementById('kalender-content');
  if (!el) return;
  const season = S.seasons.find(s=>s.id===S.currentSeason);
  const cam = S.clubs.find(c=>c.isOwnClub);
  if (!season || !cam) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📆</div><div class="empty-state-title">Geen seizoen geselecteerd</div><div class="empty-state-desc">Kies een seizoen om de kalender te zien.</div></div>';
    return;
  }
  const matches = (S.matches||[]).filter(m=>m.seasonId===S.currentSeason && m.date && (m.homeClubId===cam.id||m.awayClubId===cam.id));
  if (!matches.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📆</div><div class="empty-state-title">Nog geen wedstrijden met datum</div><div class="empty-state-desc">Zodra wedstrijden een datum hebben, verschijnen ze hier.</div></div>';
    return;
  }

  const byMonth = {};
  matches.forEach(m => {
    const ym = m.date.slice(0,7);
    if (!byMonth[ym]) byMonth[ym] = [];
    byMonth[ym].push(m);
  });
  const months = Object.keys(byMonth).sort();
  const dayNames = ['Ma','Di','Wo','Do','Vr','Za','Zo'];
  const monthNames = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];

  el.innerHTML = months.map(ym => {
    const [y,mo] = ym.split('-').map(Number);
    const firstDay = new Date(y, mo-1, 1);
    const daysInMonth = new Date(y, mo, 0).getDate();
    const startOffset = (firstDay.getDay()+6)%7; // maandag=0

    const matchByDay = {};
    byMonth[ym].forEach(m => { matchByDay[parseInt(m.date.slice(8,10))] = m; });

    let cells = '';
    for (let i=0;i<startOffset;i++) cells += '<div></div>';
    for (let d=1; d<=daysInMonth; d++) {
      const m = matchByDay[d];
      if (m) {
        const isCamHome = m.homeClubId===cam.id;
        const opp = S.clubs.find(c=>c.id===(isCamHome?m.awayClubId:m.homeClubId));
        const oppLabel = opp?.abbr || opp?.name?.slice(0,3) || '?';
        const resultLabel = m.played && m.homeScore!=null ? `${m.homeScore}-${m.awayScore}` : (m.time||'—');
        const resultColor = !m.played ? 'var(--text-muted)' : (() => {
          const cs = isCamHome?m.homeScore:m.awayScore, os = isCamHome?m.awayScore:m.homeScore;
          return cs>os?'var(--win)':cs<os?'var(--loss)':'var(--draw)';
        })();
        cells += `<div onclick="navigateToMatch('${m.id}')" style="cursor:pointer;background:var(--bg-tertiary);border-radius:6px;padding:4px;min-height:56px;border:1px solid var(--border-light)">
          <div style="font-size:10px;color:var(--text-muted)">${d}</div>
          <div style="font-size:11px;font-weight:700;margin-top:2px">${isCamHome?'🏠':'🚌'} ${oppLabel}</div>
          <div style="font-size:11px;font-weight:700;color:${resultColor}">${resultLabel}</div>
        </div>`;
      } else {
        cells += `<div style="padding:4px;min-height:56px"><div style="font-size:10px;color:var(--text-muted)">${d}</div></div>`;
      }
    }

    return `<div class="card mb-12">
      <div class="card-title" style="text-transform:capitalize">${monthNames[mo-1]} ${y}</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:8px">
        ${dayNames.map(d=>`<div style="text-align:center;font-size:10px;color:var(--text-muted);font-weight:700;padding-bottom:2px">${d}</div>`).join('')}
        ${cells}
      </div>
    </div>`;
  }).join('');
}
