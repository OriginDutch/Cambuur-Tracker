// ══════════════════════════════════════════════════════
// RIVALITEITEN — head-to-head-overzicht specifiek voor gemarkeerde rivalen
// ══════════════════════════════════════════════════════
// Hergebruikt getHeadToHeadStats() (helpers.js) — dezelfde berekening als de
// Clubs-tab in Vergelijking, hier alleen gefilterd tot rivalen en allemaal
// tegelijk zichtbaar i.p.v. één voor één via een dropdown.

function renderRivaliteitenPage() {
  const el = document.getElementById('rivaliteiten-content');
  if (!el) return;
  const cam = S.clubs.find(c=>c.isOwnClub);
  const rivals = (S.clubs||[]).filter(c=>c.highlight==='rivaal' && !c.isOwnClub)
    .sort((a,b)=>a.name.localeCompare(b.name));

  if (!cam || !rivals.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔥</div><div class="empty-state-title">Nog geen rivalen gemarkeerd</div><div class="empty-state-desc">Markeer een club als "Rivaal" bij Clubs &amp; Stadions om die hier te zien verschijnen.</div></div>';
    return;
  }

  el.innerHTML = rivals.map(club => {
    const h2h = getHeadToHeadStats(cam.id, club.id);
    if (!h2h.played) {
      return `<div class="card mb-12">
        <div class="card-title" style="display:flex;align-items:center;gap:6px">${clubLogoHTML(club,25)}🔥 ${club.name}</div>
        <p class="text-muted" style="font-size:12px">Nog geen onderlinge wedstrijden gevonden.</p>
      </div>`;
    }
    const winPct = Math.round(h2h.w/h2h.played*100);
    const last = h2h.lastMeeting;
    const lastIsCamHome = last.homeClubId===cam.id;
    const lastCs = lastIsCamHome?last.homeScore:last.awayScore, lastOs = lastIsCamHome?last.awayScore:last.homeScore;
    const lastResultColor = lastCs>lastOs?'var(--win)':lastCs<lastOs?'var(--loss)':'var(--draw)';
    return `<div class="card mb-12" style="cursor:pointer" onclick="navigateToClubComparison('${club.id}')">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="card-title" style="margin:0;display:flex;align-items:center;gap:6px">${clubLogoHTML(club,25)}🔥 ${club.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${h2h.played} ontmoetingen all-time</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;text-align:center">
        <div><div style="font-size:18px;font-weight:800;color:var(--win)">${h2h.w}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Winst</div></div>
        <div><div style="font-size:18px;font-weight:800;color:var(--draw)">${h2h.d}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Gelijk</div></div>
        <div><div style="font-size:18px;font-weight:800;color:var(--loss)">${h2h.l}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Verlies</div></div>
        <div><div style="font-size:18px;font-weight:800">${h2h.gf}-${h2h.ga}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Saldo</div></div>
        <div><div style="font-size:18px;font-weight:800;color:var(--accent-primary)">${winPct}%</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Winratio</div></div>
      </div>
      <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border-light);font-size:11px;color:var(--text-muted)">
        Laatste ontmoeting: ${new Date(last.date).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'})} — <span style="color:${lastResultColor};font-weight:600">${lastCs}-${lastOs}</span>
      </div>
    </div>`;
  }).join('');
}
