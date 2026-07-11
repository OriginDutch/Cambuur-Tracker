// ══════════════════════════════════════════════════════
// CLUBPAGINA — info, divisiehistorie-analyse, head-to-head en
// transferverbindingen per club
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

function analyzeDivisionHistory(club) {
  const hierarchy = S.prefs?.divisions || [];
  const history = (club.divisionHistory||[]).filter(h=>h.startDate).slice().sort((a,b)=>(a.startDate||'').localeCompare(b.startDate||''));
  if (!history.length) return null;

  const today = new Date().toISOString().split('T')[0];
  const stints = history.map((h, i) => ({
    division: h.division,
    start: h.startDate,
    end: history[i+1]?.startDate || today,
    isOngoing: i === history.length-1,
  }));

  const countSeasons = (start, end) => (S.seasons||[]).filter(s => {
    const r = getSeasonDateRange(s);
    return r && r.start < end && r.end >= start;
  }).length;
  stints.forEach(s => { s.seasons = countSeasons(s.start, s.end); });

  const promotions = {}, relegations = {};
  let lastTransitionYear = null, lastTransitionType = null;
  for (let i=1; i<history.length; i++) {
    const prevIdx = hierarchy.indexOf(history[i-1].division);
    const newIdx = hierarchy.indexOf(history[i].division);
    if (prevIdx===-1 || newIdx===-1 || prevIdx===newIdx) continue;
    const year = history[i].startDate ? new Date(history[i].startDate).getFullYear() : null;
    if (newIdx < prevIdx) {
      promotions[history[i].division] = (promotions[history[i].division]||0)+1;
      lastTransitionYear = year; lastTransitionType = 'promotie';
    } else {
      relegations[history[i].division] = (relegations[history[i].division]||0)+1;
      lastTransitionYear = year; lastTransitionType = 'degradatie';
    }
  }

  const longest = stints.slice().sort((a,b)=>b.seasons-a.seasons)[0];
  const withIdx = history.map(h=>({division:h.division, idx:hierarchy.indexOf(h.division)})).filter(x=>x.idx!==-1);
  const highest = withIdx.length ? withIdx.reduce((a,b)=>a.idx<b.idx?a:b) : null;
  const lowest = withIdx.length ? withIdx.reduce((a,b)=>a.idx>b.idx?a:b) : null;
  const current = stints[stints.length-1];

  return {stints, promotions, relegations, longest, highest, lowest, current, lastTransitionYear, lastTransitionType};
}

function getClubTransferConnections(clubName) {
  const bought = [], sold = [];
  (S.players||[]).forEach(p => {
    (p.transfers||[]).forEach(t => {
      if (!t.club || t.club.trim().toLowerCase()!==clubName.trim().toLowerCase()) return;
      if (t.type==='transfer-in') bought.push({player:p, transfer:t});
      if (t.type==='transfer-uit') sold.push({player:p, transfer:t});
    });
  });
  bought.sort((a,b)=>(b.transfer.date||'').localeCompare(a.transfer.date||''));
  sold.sort((a,b)=>(b.transfer.date||'').localeCompare(a.transfer.date||''));
  return {bought, sold};
}

function renderClubPage(clubId) {
  const club = S.clubs.find(c=>c.id===clubId);
  const el = document.getElementById('club-detail-content');
  if (!club || !el) return;
  const stadium = (S.stadiums||[]).find(s=>s.id===club.stadiumId);

  const analysis = analyzeDivisionHistory(club);
  let divisionSummaryHtml = '<p class="text-muted" style="font-size:12px">Nog geen divisiehistorie bekend voor deze club.</p>';
  if (analysis) {
    const promoLines = Object.entries(analysis.promotions).map(([div,n])=>`<div>up ${n}x gepromoveerd naar <strong>${div}</strong></div>`).join('');
    const relLines = Object.entries(analysis.relegations).map(([div,n])=>`<div>down ${n}x gedegradeerd naar <strong>${div}</strong></div>`).join('');
    divisionSummaryHtml = `
      <div style="font-size:13px;line-height:1.9">
        <div>Momenteel actief in <strong>${analysis.current.division}</strong>, al ${analysis.current.seasons} seizoen${analysis.current.seasons!==1?'en':''}</div>
        ${promoLines}${relLines}
        ${analysis.longest?`<div>Langste periode: <strong>${analysis.longest.seasons} seizoenen</strong> in ${analysis.longest.division}</div>`:''}
        ${analysis.highest?`<div>Hoogst bereikt: <strong>${analysis.highest.division}</strong></div>`:''}
        ${analysis.lowest && analysis.lowest.division!==analysis.highest?.division?`<div>Laagst bereikt: <strong>${analysis.lowest.division}</strong></div>`:''}
        ${analysis.lastTransitionYear?`<div>Laatste ${analysis.lastTransitionType}: <strong>${analysis.lastTransitionYear}</strong></div>`:''}
      </div>`;
  }
  const history = (club.divisionHistory||[]).slice().sort((a,b)=>(b.startDate||'').localeCompare(a.startDate||''));
  const historyHtml = history.length
    ? history.map(h => `<div style="display:flex;gap:10px;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--border-light)">
        <div style="font-size:11px;color:var(--text-muted);width:90px;flex-shrink:0">${h.startDate ? new Date(h.startDate).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'}) : '—'}</div>
        <div style="font-weight:600;font-size:13px">${h.division||'—'}</div>
        ${h.note?`<div style="font-size:12px;color:var(--text-muted)">— ${h.note}</div>`:''}
      </div>`).join('')
    : '';

  const otherClubs = S.clubs.filter(c=>c.id!==clubId).sort((a,b)=>a.name.localeCompare(b.name));
  const compareOptions = `<option value="">— Kies een club —</option>` + otherClubs.map(c=>
    `<option value="${c.id}" ${clubPageCompareId===c.id?'selected':''}>${c.name}${c.isOwnClub?' (eigen club)':''}</option>`).join('');

  let h2hHtml = '<p class="text-muted" style="font-size:12px">Kies hierboven een club om de onderlinge historie te zien.</p>';
  let h2hMatchListHtml = '';
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
      const fmtBig = (rec, label, color) => {
        if (!rec) return '';
        const m = rec.match;
        const homeC = S.clubs.find(c=>c.id===m.homeClubId), awayC = S.clubs.find(c=>c.id===m.awayClubId);
        return `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">${label}: <span style="color:${color};font-weight:700">${m.homeScore}-${m.awayScore}</span> (${homeC?.name||'?'} - ${awayC?.name||'?'}, ${m.date?new Date(m.date).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'}):'?'})</div>`;
      };
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
        </div>
        ${fmtBig(h2h.biggestWin, 'Grootste zege', 'var(--win)')}
        ${fmtBig(h2h.biggestLoss, 'Grootste nederlaag', 'var(--loss)')}`;

      h2hMatchListHtml = `<div class="card mt-12">
        <div class="card-title">Alle onderlinge wedstrijden (${h2h.played})</div>
        <div style="max-height:280px;overflow-y:auto">
          ${h2h.matches.map(m => {
            const home = S.clubs.find(c=>c.id===m.homeClubId), away = S.clubs.find(c=>c.id===m.awayClubId);
            const comp = S.competitions.find(c=>c.id===m.competitionId);
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-light);cursor:pointer;font-size:12px" onclick="navigateToMatch('${m.id}')">
              <span style="color:var(--text-muted);width:90px;flex-shrink:0">${m.date?new Date(m.date).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'}):'?'}</span>
              <span style="flex:1;text-align:right">${home?.name||'?'}</span>
              <span style="font-weight:700;padding:0 10px">${m.homeScore}-${m.awayScore}</span>
              <span style="flex:1">${away?.name||'?'}</span>
              <span style="color:var(--text-muted);font-size:10px;width:100px;text-align:right;flex-shrink:0">${comp?.name||''}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }
  }

  const { bought, sold } = getClubTransferConnections(club.name);
  const fmtTransferRow = ({player, transfer}) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border-light);cursor:pointer;font-size:12px" onclick="navigateToPlayer('${player.id}')">
    <span>${player.firstname?player.firstname[0]+'. ':''}${player.lastname}</span>
    <span style="color:var(--text-muted)">${transfer.amount?formatEuro(transfer.amount):'—'} · ${transfer.date?new Date(transfer.date).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'}):'?'}</span>
  </div>`;
  const transfersHtml = (bought.length || sold.length) ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Gekocht van deze club (${bought.length})</div>
        ${bought.length?bought.map(fmtTransferRow).join(''):'<p class="text-muted" style="font-size:12px">Geen bekend.</p>'}
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Verkocht aan deze club (${sold.length})</div>
        ${sold.length?sold.map(fmtTransferRow).join(''):'<p class="text-muted" style="font-size:12px">Geen bekend.</p>'}
      </div>
    </div>` : '<p class="text-muted" style="font-size:12px">Geen bekende transfers tussen jullie clubs.</p>';

  el.innerHTML = `
    <button class="btn btn-ghost" style="font-size:13px;margin-bottom:12px" onclick="clubPageBack()">← Terug naar Clubs</button>
    <div class="card mb-12" style="display:flex;align-items:center;gap:16px">
      ${clubLogoHTML(club, 56)}
      <div style="flex:1">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:26px;font-weight:800">${club.name}${club.isOwnClub?' <span class="badge badge-active" style="font-size:10px;vertical-align:middle">Eigen club</span>':''}${club.highlight==='rivaal'?' <span class="badge badge-rival" style="font-size:10px;vertical-align:middle">Rivaal</span>':''}</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-top:2px">
          ${club.city||'Stad onbekend'}${stadium?` · ${stadium.name}${stadium.capacity?` (${stadium.capacity.toLocaleString('nl-NL')} plaatsen)`:''}`:''}
        </div>
        ${club.note?`<div style="font-size:12px;color:var(--text-muted);margin-top:4px;font-style:italic">"${club.note}"</div>`:''}
      </div>
      <button class="btn btn-ghost" onclick="openClubModal('${club.id}')">Bewerken</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start">
      <div class="card">
        <div class="card-title">Divisiehistorie</div>
        ${divisionSummaryHtml}
        ${historyHtml?`<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border-light)">${historyHtml}</div>`:''}
      </div>
      <div class="card">
        <div class="card-title">Head-to-head</div>
        <select class="form-select" style="margin-bottom:10px" onchange="setClubPageCompare(this.value)">
          ${compareOptions}
        </select>
        ${h2hHtml}
      </div>
    </div>

    ${h2hMatchListHtml}

    <div class="card mt-12">
      <div class="card-title">Transferverbindingen</div>
      ${transfersHtml}
    </div>
  `;
}
