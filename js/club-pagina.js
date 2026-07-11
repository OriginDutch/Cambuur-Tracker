// ══════════════════════════════════════════════════════
// CLUBPAGINA — info, divisiehistorie en head-to-head per club
// ══════════════════════════════════════════════════════
// Bereikbaar door op een clubnaam/logo te klikken, overal in de app.
// Bewerken (naam/stad/logo/etc.) blijft via het bestaande potlood-icoon en
// bewerkscherm lopen — deze pagina is puur ter inzage.

let clubPageCurrentId = null;
let clubPageCompareId = null;

function navigateToClub(clubId) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-club-detail').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  clubPageCurrentId = clubId;
  const cam = S.clubs.find(c=>c.isOwnClub);
  clubPageCompareId = (cam && cam.id!==clubId) ? cam.id : null;
  renderClubPage(clubId);
}

function clubPageBack() {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-clubs').classList.add('active');
  document.querySelector('.nav-item[data-page="clubs"]')?.classList.add('active');
  renderClubsPage();
}

function setClubPageCompare(id) {
  clubPageCompareId = id || null;
  renderClubPage(clubPageCurrentId);
}

function renderClubPage(clubId) {
  const club = S.clubs.find(c=>c.id===clubId);
  const el = document.getElementById('club-detail-content');
  if (!club || !el) return;
  const stadium = (S.stadiums||[]).find(s=>s.id===club.stadiumId);

  // Divisiehistorie als leesbare tijdlijn, nieuwste eerst
  const history = (club.divisionHistory||[]).slice().sort((a,b)=>(b.startDate||'').localeCompare(a.startDate||''));
  const historyHtml = history.length
    ? history.map(h => `<div style="display:flex;gap:10px;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--border-light)">
        <div style="font-size:11px;color:var(--text-muted);width:90px;flex-shrink:0">${h.startDate ? new Date(h.startDate).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'}) : '—'}</div>
        <div style="font-weight:600;font-size:13px">${h.division||'—'}</div>
        ${h.note?`<div style="font-size:12px;color:var(--text-muted)">— ${h.note}</div>`:''}
      </div>`).join('')
    : '<p class="text-muted" style="font-size:12px">Nog geen divisiehistorie bekend voor deze club.</p>';

  // Head-to-head tegenover een zelf te kiezen andere club
  const otherClubs = S.clubs.filter(c=>c.id!==clubId).sort((a,b)=>a.name.localeCompare(b.name));
  const compareOptions = `<option value="">— Kies een club —</option>` + otherClubs.map(c=>
    `<option value="${c.id}" ${clubPageCompareId===c.id?'selected':''}>${c.name}${c.isOwnClub?' (eigen club)':''}</option>`).join('');

  let h2hHtml = '<p class="text-muted" style="font-size:12px">Kies hierboven een club om de onderlinge historie te zien.</p>';
  if (clubPageCompareId) {
    const compareClub = S.clubs.find(c=>c.id===clubPageCompareId);
    const h2h = getHeadToHeadStats(clubId, clubPageCompareId);
    if (!h2h.played) {
      h2hHtml = `<p class="text-muted" style="font-size:12px">Nog geen onderlinge wedstrijden gevonden tegen ${compareClub?.name||'?'}.</p>`;
    } else {
      const winPct = Math.round(h2h.w/h2h.played*100);
      const last = h2h.lastMeeting;
      const lastIsHome = last.homeClubId===clubId;
      const lastCs = lastIsHome?last.homeScore:last.awayScore, lastOs = lastIsHome?last.awayScore:last.homeScore;
      const lastColor = lastCs>lastOs?'var(--win)':lastCs<lastOs?'var(--loss)':'var(--draw)';
      h2hHtml = `
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;text-align:center;margin-bottom:10px">
          <div><div style="font-size:18px;font-weight:800;color:var(--win)">${h2h.w}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Winst</div></div>
          <div><div style="font-size:18px;font-weight:800;color:var(--draw)">${h2h.d}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Gelijk</div></div>
          <div><div style="font-size:18px;font-weight:800;color:var(--loss)">${h2h.l}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Verlies</div></div>
          <div><div style="font-size:18px;font-weight:800">${h2h.gf}-${h2h.ga}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Saldo</div></div>
          <div><div style="font-size:18px;font-weight:800;color:var(--accent-primary)">${winPct}%</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Winratio</div></div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);padding-top:8px;border-top:1px solid var(--border-light)">
          Laatste ontmoeting: ${new Date(last.date).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'})} — <span style="color:${lastColor};font-weight:600">${lastCs}-${lastOs}</span>
        </div>`;
    }
  }

  el.innerHTML = `
    <button class="btn btn-ghost" style="font-size:13px;margin-bottom:12px" onclick="clubPageBack()">← Terug naar Clubs</button>
    <div class="card mb-12" style="display:flex;align-items:center;gap:16px">
      ${clubLogoHTML(club, 56)}
      <div style="flex:1">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:26px;font-weight:800">${club.name}${club.isOwnClub?' <span class="badge badge-active" style="font-size:10px;vertical-align:middle">Eigen club</span>':''}${club.highlight==='rivaal'?' <span class="badge badge-rival" style="font-size:10px;vertical-align:middle">Rivaal</span>':''}</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-top:2px">
          ${club.city||'Stad onbekend'}${stadium?` · ${stadium.name}${stadium.capacity?` (${stadium.capacity.toLocaleString('nl-NL')} plaatsen)`:''}`:''}
        </div>
      </div>
      <button class="btn btn-ghost" onclick="openClubModal('${club.id}')">✏️ Bewerken</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start">
      <div class="card">
        <div class="card-title">📊 Divisiehistorie</div>
        ${historyHtml}
      </div>
      <div class="card">
        <div class="card-title">🆚 Head-to-head</div>
        <select class="form-select" style="margin-bottom:10px" onchange="setClubPageCompare(this.value)">
          ${compareOptions}
        </select>
        ${h2hHtml}
      </div>
    </div>
  `;
}
