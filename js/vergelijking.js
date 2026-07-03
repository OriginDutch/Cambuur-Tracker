// ══════════════════════════════════════════════════════
// VERGELIJKING — Seizoen, Transfer & Speler
// ══════════════════════════════════════════════════════

function renderVergelijking() {
  const el = document.getElementById('vergelijking-content');
  if (!el) return;

  const seasons = (S.seasons||[]).filter(s=>!s.hidden);
  const players = (S.players||[]);
  const cam = S.clubs.find(c=>c.isOwnClub);

  // ── Tab state ──
  if (!window._vergTab) window._vergTab = 'seizoen';

  const tabs = [
    {id:'seizoen', label:'📅 Seizoenen'},
    {id:'transfer', label:'💸 Transferbalans'},
    {id:'speler',  label:'👤 Spelers'},
    {id:'clubs',   label:'🆚 Clubs'},
  ];

  el.innerHTML = `
    <div style="margin-bottom:16px">
      <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:22px;margin-bottom:12px">⚖️ Vergelijking</div>
      <div style="display:flex;gap:6px;margin-bottom:16px">
        ${tabs.map(t=>`<button class="btn ${window._vergTab===t.id?'btn-primary':'btn-ghost'}"
          onclick="window._vergTab='${t.id}';renderVergelijking()">${t.label}</button>`).join('')}
      </div>
      <div id="verg-body"></div>
    </div>
  `;

  const body = document.getElementById('verg-body');
  if (window._vergTab === 'seizoen') renderVergSeizoen(body, seasons, cam);
  else if (window._vergTab === 'transfer') renderVergTransfer(body, seasons, players);
  else if (window._vergTab === 'speler') renderVergSpeler(body, players);
  else if (window._vergTab === 'clubs') renderVergClubs(body, cam);
}

// ── SEIZOENSVERGELIJKING ──
function renderVergSeizoen(el, seasons, cam) {
  if (seasons.length < 2) {
    el.innerHTML = '<p class="text-muted">Minimaal 2 seizoenen nodig voor vergelijking.</p>';
    return;
  }

  // Compute stats per season
  const rows = seasons.map(s => {
    const matches = (S.matches||[]).filter(m=>m.played && !isMatchOrphaned(m) && (m.homeClubId===cam?.id||m.awayClubId===cam?.id));
    const seasonMatches = matches.filter(m => {
      const r = getSeasonDateRange(s.id);
      if (!r || !m.date) return false;
      return m.date >= r.start && m.date <= r.end;
    });
    let w=0,d=0,l=0,gf=0,ga=0,cs=0,possession=[];
    seasonMatches.forEach(m=>{
      const isCamHome = m.homeClubId===cam?.id;
      const camG = isCamHome?m.homeScore:m.awayScore;
      const oppG = isCamHome?m.awayScore:m.homeScore;
      gf+=camG; ga+=oppG;
      if(camG>oppG) w++; else if(camG===oppG) d++; else l++;
      if(oppG===0) cs++;
      const pos = isCamHome?m.matchStats?.home?.possession:m.matchStats?.away?.possession;
      if(pos!==undefined) possession.push(pos);
    });
    const played = seasonMatches.length;
    const pts = w*3+d;
    const ppg = played>0?(pts/played).toFixed(2):'—';
    const avgPoss = possession.length>0?Math.round(possession.reduce((a,b)=>a+b,0)/possession.length):null;

    // Top scorer this season
    const allStats = calcAllPlayerStats(s.id);
    const topScorer = players_().filter(p=>allStats[p.id]?.goals>0)
      .sort((a,b)=>(allStats[b.id]?.goals||0)-(allStats[a.id]?.goals||0))[0];

    return {s, played, w, d, l, gf, ga, pts, ppg, cs, avgPoss, topScorer, allStats};
  }).filter(r=>r.played>0);

  if (!rows.length) {
    el.innerHTML = '<p class="text-muted">Nog geen wedstrijddata per seizoen.</p>';
    return;
  }

  // Find best/worst for coloring
  const bestPPG = Math.max(...rows.map(r=>parseFloat(r.ppg)||0));
  const bestCS = Math.max(...rows.map(r=>r.cs));
  const bestGF = Math.max(...rows.map(r=>r.gf));
  const worstGA = Math.min(...rows.map(r=>r.ga));

  el.innerHTML = `
    <div class="card" style="overflow-x:auto">
      <table class="data-table" style="min-width:600px">
        <thead><tr>
          <th>Seizoen</th>
          <th class="num">G</th>
          <th class="num" style="color:var(--win)">W</th>
          <th class="num" style="color:var(--draw)">G</th>
          <th class="num" style="color:var(--loss)">V</th>
          <th class="num">Pnt</th>
          <th class="num">PPG</th>
          <th class="num">Voor</th>
          <th class="num">Tegen</th>
          <th class="num">Saldo</th>
          <th class="num">CS</th>
          <th class="num">Bezit%</th>
          <th>Topscorer</th>
        </tr></thead>
        <tbody>
          ${rows.map(r=>`<tr style="${r.s.id===S.currentSeason?'background:rgba(245,197,0,0.05);font-weight:600':''}">
            <td>${r.s.name}</td>
            <td class="num">${r.played}</td>
            <td class="num" style="color:var(--win)">${r.w}</td>
            <td class="num" style="color:var(--draw)">${r.d}</td>
            <td class="num" style="color:var(--loss)">${r.l}</td>
            <td class="num" style="font-weight:700">${r.pts}</td>
            <td class="num" style="font-weight:700;color:${parseFloat(r.ppg)>=bestPPG?'var(--win)':'var(--text-primary)'}">${r.ppg}</td>
            <td class="num" style="color:${r.gf>=bestGF?'var(--win)':'var(--text-primary)'}">${r.gf}</td>
            <td class="num" style="color:${r.ga<=worstGA?'var(--win)':'var(--text-primary)'}">${r.ga}</td>
            <td class="num" style="font-weight:600;color:${r.gf-r.ga>0?'var(--win)':r.gf-r.ga<0?'var(--loss)':'var(--text-primary)'}">${r.gf-r.ga>0?'+':''}${r.gf-r.ga}</td>
            <td class="num" style="color:${r.cs>=bestCS?'var(--win)':'var(--text-primary)'}">${r.cs}</td>
            <td class="num">${r.avgPoss!==null?r.avgPoss+'%':'—'}</td>
            <td style="font-size:12px">${r.topScorer?`${r.topScorer.lastname} (${r.allStats[r.topScorer.id]?.goals}⚽)`:'—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function players_() { return S.players||[]; }

// ── TRANSFERBALANS PER SEIZOEN ──
function renderVergTransfer(el, seasons, players) {
  const rows = seasons.map(s => {
    const range = getSeasonDateRange(s.id);
    if (!range) return null;

    // Players who joined this season
    const joined = players.filter(p => {
      const j = p.joined||'';
      return j >= range.start && j <= range.end;
    });
    // Players who left this season
    const departed = players.filter(p => {
      const d = p.departureDate||'';
      return d >= range.start && d <= range.end;
    });

    const spent = joined.reduce((sum,p)=>sum+(parseFloat(p.buyFee)||0),0);
    const received = departed.reduce((sum,p)=>sum+(parseFloat(p.sellFee)||0),0);
    const net = received - spent;

    return {s, joined: joined.length, departed: departed.length, spent, received, net, joinedPlayers: joined, departedPlayers: departed};
  }).filter(Boolean).filter(r=>r.joined>0||r.departed>0);

  if (!rows.length) {
    el.innerHTML = '<p class="text-muted">Nog geen transferdata beschikbaar.</p>';
    return;
  }

  el.innerHTML = rows.map(r=>`
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="card-title" style="margin:0">${r.s.name}</div>
        <div style="display:flex;gap:16px;font-size:13px">
          <span style="color:var(--loss)">−${formatEuro(r.spent)} <span style="color:var(--text-muted);font-size:11px">uitgegeven</span></span>
          <span style="color:var(--win)">+${formatEuro(r.received)} <span style="color:var(--text-muted);font-size:11px">ontvangen</span></span>
          <span style="font-weight:700;color:${r.net>=0?'var(--win)':'var(--loss)'}">${r.net>=0?'+':''}${formatEuro(r.net)} <span style="color:var(--text-muted);font-size:11px">netto</span></span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${r.joinedPlayers.length?`<div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--win);margin-bottom:6px">Binnengekomen (${r.joinedPlayers.length})</div>
          ${r.joinedPlayers.map(p=>`<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px">
            ${playerAvatarHTML(p,'player-avatar',22)}
            <span style="flex:1">${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</span>
            <span style="color:var(--text-muted)">${p.youthProduct?'Eigen jeugd':p.freeTransferIn?'Vrije transfer':p.buyFee?formatEuro(parseFloat(p.buyFee)):'—'}</span>
          </div>`).join('')}
        </div>`:'<div></div>'}
        ${r.departedPlayers.length?`<div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--loss);margin-bottom:6px">Vertrokken (${r.departedPlayers.length})</div>
          ${r.departedPlayers.map(p=>`<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px">
            ${playerAvatarHTML(p,'player-avatar',22)}
            <span style="flex:1">${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</span>
            <span style="color:var(--text-muted)">${p.freeTransferOut?'Vrije transfer':p.sellFee?'+'+formatEuro(parseFloat(p.sellFee)):'—'}</span>
          </div>`).join('')}
        </div>`:'<div></div>'}
      </div>
    </div>
  `).join('');
}

// ── SPELERSVERGELIJKING ──
function renderVergSpeler(el, players) {
  if (!window._vergP1) window._vergP1 = '';
  if (!window._vergP2) window._vergP2 = '';

  const opts = players.map(p=>`<option value="${p.id}" ${window._vergP1===p.id?'selected':''}>${p.number?'#'+p.number+' ':''}${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</option>`).join('');
  const opts2 = players.map(p=>`<option value="${p.id}" ${window._vergP2===p.id?'selected':''}>${p.number?'#'+p.number+' ':''}${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</option>`).join('');

  const p1 = players.find(p=>p.id===window._vergP1);
  const p2 = players.find(p=>p.id===window._vergP2);

  let comparisonHtml = '';
  if (p1 && p2) {
    const allStats = calcAllPlayerStats(S.currentSeason);
    const s1 = allStats[p1.id]||{};
    const s2 = allStats[p2.id]||{};

    const metrics = [
      {label:'Wedstrijden',   k:'appearances'},
      {label:'Starts',        k:'starts'},
      {label:'Minuten',       k:'minutesPlayed'},
      {label:'Goals',         k:'goals',   color:'var(--cambuur-geel)'},
      {label:'Assists',       k:'assists'},
      {label:'Gele kaarten',  k:'yellowCards', lower:true},
      {label:'Rode kaarten',  k:'redCards',    lower:true, color:'var(--loss)'},
      {label:'MOTM',          k:'motm',    color:'var(--draw)'},
      {label:'Clean sheets',  k:'cleanSheets', color:'var(--win)'},
      {label:'Reddingen',     k:'saves'},
    ];

    comparisonHtml = `
      <div class="card" style="margin-top:16px">
        <!-- Player headers -->
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border)">
          <div style="text-align:center;cursor:pointer" onclick="navigateToPlayer('${p1.id}')">
            <div style="width:64px;height:64px;border-radius:50%;overflow:hidden;background:var(--cambuur-geel);margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:var(--cambuur-blauw)">
              ${p1.photo?`<img src="${p1.photo}" style="width:100%;height:100%;object-fit:cover">`:`${initials(p1.firstname||'',p1.lastname||'')}`}
            </div>
            <div style="font-weight:700;font-size:14px">${p1.firstname?p1.firstname[0]+'. ':''}${p1.lastname}</div>
            <div style="font-size:11px;color:var(--text-muted)">${p1.position||''}</div>
          </div>
          <div style="font-size:18px;font-weight:800;color:var(--text-muted)">VS</div>
          <div style="text-align:center;cursor:pointer" onclick="navigateToPlayer('${p2.id}')">
            <div style="width:64px;height:64px;border-radius:50%;overflow:hidden;background:var(--cambuur-geel);margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:var(--cambuur-blauw)">
              ${p2.photo?`<img src="${p2.photo}" style="width:100%;height:100%;object-fit:cover">`:`${initials(p2.firstname||'',p2.lastname||'')}`}
            </div>
            <div style="font-weight:700;font-size:14px">${p2.firstname?p2.firstname[0]+'. ':''}${p2.lastname}</div>
            <div style="font-size:11px;color:var(--text-muted)">${p2.position||''}</div>
          </div>
        </div>

        <!-- Metrics -->
        ${metrics.filter(m=>(s1[m.k]||0)>0||(s2[m.k]||0)>0).map(m=>{
          const v1 = s1[m.k]||0, v2 = s2[m.k]||0;
          const max = Math.max(v1,v2,1);
          const w1 = Math.round(v1/max*100);
          const w2 = Math.round(v2/max*100);
          const better1 = m.lower ? v1<=v2 : v1>=v2;
          const better2 = m.lower ? v2<=v1 : v2>=v1;
          const barColor = m.color||'var(--cambuur-geel)';
          return `<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-light)">
            <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end">
              <div style="text-align:right">
                <div style="font-size:18px;font-weight:800;color:${better1&&v1>0?barColor:'var(--text-primary)'}">${v1}</div>
              </div>
              <div style="width:80px;height:6px;background:var(--border);border-radius:3px;overflow:hidden;transform:scaleX(-1)">
                <div style="width:${w1}%;height:100%;background:${better1&&v1>0?barColor:'var(--border)'};border-radius:3px"></div>
              </div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);text-align:center;white-space:nowrap;min-width:100px">${m.label}</div>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="width:80px;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
                <div style="width:${w2}%;height:100%;background:${better2&&v2>0?barColor:'var(--border)'};border-radius:3px"></div>
              </div>
              <div style="font-size:18px;font-weight:800;color:${better2&&v2>0?barColor:'var(--text-primary)'}">${v2}</div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }

  el.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">
      <select class="form-select" style="flex:1" onchange="window._vergP1=this.value;renderVergelijking()">
        <option value="">— Speler 1 —</option>${opts}
      </select>
      <span style="font-weight:700;color:var(--text-muted)">VS</span>
      <select class="form-select" style="flex:1" onchange="window._vergP2=this.value;renderVergelijking()">
        <option value="">— Speler 2 —</option>${opts2}
      </select>
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Statistieken gebaseerd op huidig geselecteerd seizoen</div>
    ${comparisonHtml||'<p class="text-muted" style="margin-top:16px">Selecteer twee spelers om te vergelijken.</p>'}
  `;
}

// ── HEAD-TO-HEAD PER CLUB (all-time, alle seizoenen) ──
function renderVergClubs(el, cam) {
  if (!window._vergClub) window._vergClub = '';

  const otherClubs = (S.clubs||[]).filter(c=>!c.isOwnClub && c.id!==cam?.id)
    .sort((a,b)=>a.name.localeCompare(b.name));
  const opts = otherClubs.map(c=>`<option value="${c.id}" ${window._vergClub===c.id?'selected':''}>${c.name}${c.highlight==='rivaal'?' 🔥':''}</option>`).join('');

  const club = otherClubs.find(c=>c.id===window._vergClub);
  let recordHtml = '';

  if (club) {
    const matches = (S.matches||[]).filter(m=>m.played && !isMatchOrphaned(m) &&
      ((m.homeClubId===cam?.id && m.awayClubId===club.id) || (m.awayClubId===cam?.id && m.homeClubId===club.id))
    ).sort((a,b)=>(b.date||'').localeCompare(a.date||''));

    if (!matches.length) {
      recordHtml = `<p class="text-muted" style="margin-top:16px">Nog geen gespeelde wedstrijden tegen ${club.name} gevonden.</p>`;
    } else {
      let w=0,d=0,l=0,gf=0,ga=0;
      matches.forEach(m=>{
        const isCamHome = m.homeClubId===cam?.id;
        const cs = isCamHome?m.homeScore:m.awayScore;
        const os = isCamHome?m.awayScore:m.homeScore;
        gf+=cs; ga+=os;
        if(cs>os) w++; else if(cs===os) d++; else l++;
      });
      const played = matches.length;
      const winPct = played ? Math.round(w/played*100) : 0;

      recordHtml = `
        <div class="card" style="margin-top:16px;margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:center;gap:24px;margin-bottom:16px;padding-bottom:16px;border-top:${club.highlight==='rivaal'?'3px solid var(--heerenveen-rood)':'none'}">
            <div style="text-align:center">
              <div style="font-family:'Barlow Condensed',sans-serif;font-size:28px;font-weight:800;color:var(--cambuur-geel)">SC Cambuur</div>
            </div>
            <div style="text-align:center;font-size:13px;color:var(--text-muted)">all-time</div>
            <div style="text-align:center">
              <div style="font-family:'Barlow Condensed',sans-serif;font-size:28px;font-weight:800">${club.name}</div>
              ${club.highlight==='rivaal'?'<span class="badge badge-rival" style="font-size:9px">Rivaal</span>':''}
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;text-align:center;border-top:1px solid var(--border);padding-top:14px">
            <div><div style="font-size:20px;font-weight:800">${played}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Gespeeld</div></div>
            <div><div style="font-size:20px;font-weight:800;color:var(--win)">${w}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Winst</div></div>
            <div><div style="font-size:20px;font-weight:800;color:var(--draw)">${d}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Gelijk</div></div>
            <div><div style="font-size:20px;font-weight:800;color:var(--loss)">${l}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Verlies</div></div>
            <div><div style="font-size:20px;font-weight:800;color:${gf-ga>0?'var(--win)':gf-ga<0?'var(--loss)':'var(--text-primary)'}">${gf}-${ga}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Doelsaldo</div></div>
            <div><div style="font-size:20px;font-weight:800;color:var(--cambuur-geel)">${winPct}%</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Winratio</div></div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Alle onderlinge wedstrijden (${played})</div>
          <table class="data-table">
            <thead><tr><th>Seizoen</th><th>Datum</th><th>Thuis</th><th class="num">Score</th><th>Uit</th></tr></thead>
            <tbody>${matches.map(m=>{
              const season = (S.seasons||[]).find(s=>s.id===m.seasonId);
              const homeClub = S.clubs.find(c=>c.id===m.homeClubId);
              const awayClub = S.clubs.find(c=>c.id===m.awayClubId);
              const isCamHome = m.homeClubId===cam?.id;
              const cs = isCamHome?m.homeScore:m.awayScore;
              const os = isCamHome?m.awayScore:m.homeScore;
              const resultColor = cs>os?'var(--win)':cs===os?'var(--draw)':'var(--loss)';
              const dateStr = m.date ? new Date(m.date).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'}) : '—';
              return `<tr style="cursor:pointer" onclick="navigateToMatch('${m.id}')">
                <td style="font-size:12px;color:var(--text-muted)">${season?.name||'—'}</td>
                <td style="font-size:12px">${dateStr}</td>
                <td style="${isCamHome?'font-weight:700;color:var(--cambuur-geel)':''}">${homeClub?.name||m.homeName||'?'}</td>
                <td class="num" style="font-weight:700;color:${resultColor}">${m.homeScore}-${m.awayScore}</td>
                <td style="${!isCamHome?'font-weight:700;color:var(--cambuur-geel)':''}">${awayClub?.name||m.awayName||'?'}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>`;
    }
  }

  el.innerHTML = `
    <select class="form-select" style="margin-bottom:8px" onchange="window._vergClub=this.value;renderVergelijking()">
      <option value="">— Kies een club —</option>${opts}
    </select>
    <div style="font-size:11px;color:var(--text-muted)">Statistieken over alle seizoenen heen, niet alleen het huidige</div>
    ${recordHtml||(window._vergClub?'':'<p class="text-muted" style="margin-top:16px">Selecteer een club om het onderlinge record te bekijken.</p>')}
  `;
}
