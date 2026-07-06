// ══════════════════════════════════════════════════════
// WEDSTRIJDDAGBOEK — alle wedstrijdnotities centraal en doorzoekbaar
// ══════════════════════════════════════════════════════
// Geen nieuw datamodel: leunt volledig op het bestaande vrije notitieveld
// (m.notes) per wedstrijd. Dit is puur een verzamelde, doorzoekbare weergave.

function renderDagboekPage() {
  const el = document.getElementById('dagboek-content');
  if (!el) return;
  const q = (document.getElementById('dagboek-search')?.value||'').toLowerCase().trim();

  const withNotes = (S.matches||[]).filter(m => m.notes && m.notes.trim());
  if (!withNotes.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📔</div><div class="empty-state-title">Nog geen notities</div><div class="empty-state-desc">Vul bij een wedstrijd het notitieveld in — die verschijnt dan hier terug.</div></div>';
    return;
  }

  const filtered = withNotes.filter(m => {
    if (!q) return true;
    const home = S.clubs.find(c=>c.id===m.homeClubId)?.name||'';
    const away = S.clubs.find(c=>c.id===m.awayClubId)?.name||'';
    return m.notes.toLowerCase().includes(q) || home.toLowerCase().includes(q) || away.toLowerCase().includes(q);
  }).sort((a,b)=>(b.date||'').localeCompare(a.date||''));

  if (!filtered.length) {
    el.innerHTML = '<p class="text-muted" style="font-size:13px">Geen notities gevonden voor deze zoekopdracht.</p>';
    return;
  }

  el.innerHTML = filtered.map(m => {
    const home = S.clubs.find(c=>c.id===m.homeClubId), away = S.clubs.find(c=>c.id===m.awayClubId);
    const score = m.played && m.homeScore!=null ? `${m.homeScore}-${m.awayScore}` : 'nog te spelen';
    const comp = S.competitions.find(c=>c.id===m.competitionId);
    return `<div class="card mb-8" style="cursor:pointer" onclick="navigateToMatch('${m.id}')">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;gap:8px;flex-wrap:wrap">
        <strong style="font-size:13px">${home?.name||'?'} — ${away?.name||'?'}</strong>
        <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">${m.date?new Date(m.date).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'}):'?'} · ${score}${comp?' · '+comp.name:''}</span>
      </div>
      <p style="font-size:13px;color:var(--text-secondary);white-space:pre-wrap;margin:0;line-height:1.5">${m.notes}</p>
    </div>`;
  }).join('');
}
