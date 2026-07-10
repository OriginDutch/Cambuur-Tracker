// ── OP DEZE DAG ──
// Historisch moment van vandaag (zelfde dag/maand, ander jaar). Geen moment
// gevonden? Dan trivia over de eerstvolgende tegenstander i.p.v. niets tonen.
function renderOnThisDayCard(cam) {
  if (!cam) return '';
  const today = new Date();
  const mm = today.getMonth(), dd = today.getDate();
  const historicMatches = (S.matches||[]).filter(m => {
    if (!m.played || !m.date || m.homeScore==null) return false;
    if (!(m.homeClubId===cam.id || m.awayClubId===cam.id)) return false;
    const d = new Date(m.date);
    return d.getMonth()===mm && d.getDate()===dd && d.getFullYear()!==today.getFullYear();
  }).sort((a,b)=>new Date(b.date)-new Date(a.date));

  if (historicMatches.length) {
    const m = historicMatches[0];
    const yearsAgo = today.getFullYear() - new Date(m.date).getFullYear();
    const isCamHome = m.homeClubId===cam.id;
    const opp = S.clubs.find(c=>c.id===(isCamHome?m.awayClubId:m.homeClubId));
    const cs = isCamHome?m.homeScore:m.awayScore, os = isCamHome?m.awayScore:m.homeScore;
    const resultWord = cs>os?'won van':cs<os?'verloor van':'speelde gelijk tegen';
    const resultColor = cs>os?'var(--win)':cs<os?'var(--loss)':'var(--draw)';
    return `<div class="card mb-12">
      <div class="card-title">📅 Op deze dag</div>
      <p style="font-size:13px;line-height:1.6">${yearsAgo} jaar geleden <span style="color:${resultColor};font-weight:600">${resultWord}</span> ${cam.name} van ${opp?.name||'?'} met <strong>${cs}-${os}</strong>${m.round?` (ronde ${m.round})`:''}.</p>
      <button class="btn btn-ghost" style="font-size:11px;margin-top:2px" onclick="navigateToMatch('${m.id}')">Bekijk wedstrijd →</button>
    </div>`;
  }

  // Geen historisch moment — trivia over de eerstvolgende tegenstander
  const nextMatch = getNextMatch();
  if (!nextMatch) return '';
  const oppId = nextMatch.homeClubId===cam.id ? nextMatch.awayClubId : nextMatch.homeClubId;
  const opp = S.clubs.find(c=>c.id===oppId);
  if (!opp) return '';
  const h2h = getHeadToHeadStats(cam.id, opp.id);
  let triviaLine;
  if (!h2h.played) {
    triviaLine = `Nog nooit eerder tegen ${opp.name} gespeeld.`;
  } else {
    const lastYear = h2h.lastMeeting?.date ? new Date(h2h.lastMeeting.date).getFullYear() : '?';
    triviaLine = `${h2h.played}x eerder tegen ${opp.name} gespeeld: ${h2h.w}W ${h2h.d}G ${h2h.l}V (${h2h.gf}-${h2h.ga}). Laatste ontmoeting: ${lastYear}.`;
  }
  return `<div class="card mb-12">
    <div class="card-title">📅 Op deze dag</div>
    <p style="font-size:13px;line-height:1.6;color:var(--text-secondary)">Geen historisch moment gevonden voor vandaag — maar wel alvast wat trivia over de volgende tegenstander, <strong>${opp.name}</strong>:</p>
    <p style="font-size:13px;line-height:1.6;margin-top:6px">${triviaLine}</p>
  </div>`;
}

// ── MIJLPALEN ──
// Spelers die dicht bij een rond getal zitten (wedstrijden/goals/assists),
// puur afgeleid uit bestaande statistieken — geen nieuwe data nodig.
function renderMilestonesCard() {
  const thresholds = [10,25,50,100,150,200,250,300,350,400];
  const milestones = [];
  (S.players||[]).forEach(p => {
    if (effectiveStatus(p) !== 'actief') return; // vertrokken/uitgeleend gaat deze mijlpaal niet meer voor déze club halen
    const stats = calcPlayerStats(p.id, null, null); // all-time
    [
      {key:'appearances', label:'wedstrijden', val:stats.appearances},
      {key:'goals', label:'goals', val:stats.goals},
      {key:'assists', label:'assists', val:stats.assists},
    ].forEach(({label, val}) => {
      if (!val) return;
      const next = thresholds.find(t => t > val);
      if (next && (next - val) <= 5) milestones.push({player:p, label, val, next, remaining: next-val});
    });
  });
  if (!milestones.length) return '';
  milestones.sort((a,b)=>a.remaining-b.remaining);
  return `<div class="card mb-12">
    <div class="card-title">🎯 Naderende mijlpalen</div>
    ${milestones.slice(0,5).map(m=>`<div style="font-size:13px;padding:4px 0;cursor:pointer" onclick="navigateToPlayer('${m.player.id}')">
      <strong>${m.player.number?'#'+m.player.number+' ':''}${m.player.firstname?m.player.firstname+' ':''}${m.player.lastname}</strong>
      <span style="color:var(--text-secondary)"> staat op ${m.val} ${m.label} — nog ${m.remaining} tot ${m.next}.</span>
    </div>`).join('')}
  </div>`;
}

// ── DASHBOARD ──
// Kleine lijngrafiek van de vorm over de laatste wedstrijden — W boven,
// G in het midden, V onderaan, verbonden met een lijn zodat de trend in
// één oogopslag zichtbaar is naast de losse W/G/V-stippen.
function renderFormGraph(formData) {
  if (formData.length < 2) return '';
  const W = 100, H = 36, PAD = 6;
  const innerW = W - PAD*2, innerH = H - PAD*2;
  const yFor = r => r==='W' ? PAD : r==='D' ? PAD+innerH/2 : PAD+innerH;
  const xs = formData.map((_,i) => PAD + (i/(formData.length-1))*innerW);
  const colorFor = r => r==='W'?'var(--win)':r==='D'?'var(--draw)':'var(--loss)';
  const points = formData.map((f,i) => `${xs[i]},${yFor(f.r)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;display:block;margin-bottom:8px">
    <polyline points="${points}" fill="none" stroke="var(--text-muted)" stroke-width="1.2" opacity="0.5"/>
    ${formData.map((f,i)=>`<circle cx="${xs[i]}" cy="${yFor(f.r)}" r="3" fill="${colorFor(f.r)}"/>`).join('')}
  </svg>`;
}

// Kleine lijngrafiek van de bezettingsgraad (%) per wedstrijd — alleen
// wedstrijden met een ingevuld toeschouwersaantal ÉN een bekende
// stadioncapaciteit tellen mee, de rest wordt gewoon overgeslagen i.p.v.
// als 0% meegerekend (zou het gemiddelde anders onterecht verlagen).
function renderOccupancyGraph(data) {
  if (data.length < 2) return '';
  const W = 100, H = 36, PAD = 6;
  const innerW = W-PAD*2, innerH = H-PAD*2;
  const xs = data.map((_,i)=>PAD+(i/(data.length-1))*innerW);
  const yFor = pct => PAD + innerH - (Math.min(pct,100)/100)*innerH;
  const points = data.map((d,i)=>`${xs[i]},${yFor(d.pct)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;display:block">
    <polyline points="${points}" fill="none" stroke="var(--accent-primary)" stroke-width="1.5"/>
    ${data.map((d,i)=>`<circle cx="${xs[i]}" cy="${yFor(d.pct)}" r="2.5" fill="var(--accent-primary)"/>`).join('')}
  </svg>`;
}

function renderAttendanceCard(cam) {
  if (!cam) return '';
  const matches = (S.matches||[]).filter(m=>m.seasonId===S.currentSeason&&m.played&&m.attendance!=null&&(m.homeClubId===cam.id||m.awayClubId===cam.id))
    .sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  if (!matches.length) return '';

  const occupancyData = matches.map(m => {
    const homeClub = S.clubs.find(c=>c.id===m.homeClubId);
    const stadium = homeClub ? S.stadiums.find(s=>s.id===homeClub.stadiumId) : null;
    if (!stadium?.capacity) return null;
    return {pct: Math.round(m.attendance/stadium.capacity*100)};
  }).filter(Boolean);
  if (!occupancyData.length) return '';

  const soldOutCount = matches.filter(m=>isMatchSoldOut(m)===true).length;
  const avgPct = Math.round(occupancyData.reduce((s,o)=>s+o.pct,0)/occupancyData.length);

  return `<div class="card mb-12">
    <div class="card-title">🎟️ Bezettingsgraad</div>
    ${renderOccupancyGraph(occupancyData)||'<p class="text-muted" style="font-size:12px">Nog te weinig wedstrijden met bekende capaciteit.</p>'}
    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);margin-top:6px">
      <span>Gemiddeld: <strong>${avgPct}%</strong></span>
      <span>Keren uitverkocht: <strong>${soldOutCount}</strong></span>
    </div>
  </div>`;
}

function renderDashboard(){
  const el=document.getElementById('dashboard-content');
  const season=S.seasons.find(s=>s.id===S.currentSeason);
  if(!season){
    el.innerHTML='<div class="empty-state"><div class="empty-state-icon">🏟️</div><div class="empty-state-title">Welkom bij de tracker</div><div class="empty-state-desc">Maak een seizoen aan om te beginnen.</div></div>';
    return;
  }

  const cam=S.clubs.find(c=>c.isOwnClub);
  const camName=cam?.name||'Eigen club';
  const nextMatch=getNextMatch();
  const lastMatch=getLastCambuurMatch();
  const form=getCambuurForm(parseInt(getPrefs().formLength)||5);
  const formLong=getCambuurForm(10); // iets meer geschiedenis, specifiek voor de vormgrafiek
  const leaguePos=getCambuurLeaguePos();
  const camMatches=(S.matches||[]).filter(m=>m.seasonId===S.currentSeason&&(m.homeClubId===cam?.id||m.awayClubId===cam?.id));
  const played=camMatches.filter(m=>m.played);
  const stats=calcAllPlayerStats(S.currentSeason);

  // Win/draw/loss
  let wins=0,draws=0,losses=0,gf=0,ga=0;
  played.forEach(m=>{
    const isCamHome=m.homeClubId===cam?.id;
    const cs=isCamHome?m.homeScore:m.awayScore;
    const os=isCamHome?m.awayScore:m.homeScore;
    if(cs>os)wins++; else if(cs===os)draws++; else losses++;
    gf+=cs; ga+=os;
  });

  // Top assisters
  const topAssisters=(S.players||[]).filter(p=>stats[p.id]?.assists>0)
    .sort((a,b)=>stats[b.id].assists-stats[a.id].assists).slice(0,5);

  // Topscorers
  const topScorers=(S.players||[]).filter(p=>stats[p.id]?.goals>0)
    .sort((a,b)=>stats[b.id].goals-stats[a.id].goals).slice(0,5);

  // Warnings — geschorst (status) + geblesseerd (losse tijdlijn, ongeacht status)
  const warnings=(S.players||[]).filter(p=>p.status==='geschorst'||effectiveInjuryStatus(p));

  // Coach samenvatting huidig seizoen
  const currentCoach = (() => {
    const seasonObj = S.seasons.find(s=>s.id===S.currentSeason);
    const refDate = getSeasonRefDate(seasonObj).toISOString().split('T')[0];
    for (const coach of (S.coaches||[])) {
      const active = (coach.appointments||[]).find(a => {
        const from = a.from||'1900-01-01';
        const to = a.to||'2099-01-01';
        return refDate >= from && refDate <= to && a.role === 'Hoofdtrainer';
      });
      if (active) return coach;
    }
    return null;
  })();
  const coachStats = currentCoach ? calcCoachStats(currentCoach.id, S.currentSeason, null) : null;

  // Stand per speelronde (positie door het seizoen)
  const standPerRonde = (() => {
    const comp = getMainCompetition(S.currentSeason);
    if (!comp || comp.type !== 'competitie') return null;
    const allClubIds = comp.clubIds||[];
    if (!allClubIds.length || !cam) return null;
    const compMatches = (S.matches||[])
      .filter(m=>m.competitionId===comp.id&&m.played&&m.date)
      .sort((a,b)=>a.date.localeCompare(b.date));
    if (compMatches.length < 2) return null;

    // Calculate position after each Cambuur match
    const camMatchesOnly = compMatches.filter(m=>m.homeClubId===cam.id||m.awayClubId===cam.id);
    const points = {};
    allClubIds.forEach(id=>points[id]={pts:0,gd:0});

    const posAfterMatch = [];
    let camMatchIdx = 0;
    compMatches.forEach(m => {
      const h=m.homeClubId, a=m.awayClubId;
      if (!points[h]) points[h]={pts:0,gd:0};
      if (!points[a]) points[a]={pts:0,gd:0};
      const gd=m.homeScore-m.awayScore;
      if(gd>0){points[h].pts+=3;points[h].gd+=gd;points[a].gd-=gd;}
      else if(gd===0){points[h].pts+=1;points[a].pts+=1;}
      else{points[a].pts+=3;points[a].gd+=Math.abs(gd);points[h].gd+=gd;}

      if(m.homeClubId===cam.id||m.awayClubId===cam.id){
        const sorted=Object.entries(points).sort((a,b)=>b[1].pts-a[1].pts||b[1].gd-a[1].gd);
        const pos=sorted.findIndex(([id])=>id===cam.id)+1;
        posAfterMatch.push({pos, pts: points[cam.id]?.pts||0, match: ++camMatchIdx});
      }
    });
    return {data: posAfterMatch, total: allClubIds.length, compName: comp.name};
  })();

  // Stand-per-ronde SVG
  const standGrafiekHtml = (() => {
    if (!standPerRonde || standPerRonde.data.length < 2) return '';
    const {data, total} = standPerRonde;
    const W=460, H=130, PADL=34, PADR=28, PADT=12, PADB=22;
    const innerW = W-PADL-PADR, innerH = H-PADT-PADB;
    const xs = data.map((_,i)=>PADL+(i/(data.length-1))*innerW);
    const ys = data.map(d=>PADT+(d.pos-1)/(total-1)*innerH);
    const pts = xs.map((x,i)=>`${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
    const fill = `${xs[0].toFixed(1)},${(PADT+innerH).toFixed(1)} ` + pts + ` ${xs[xs.length-1].toFixed(1)},${(PADT+innerH).toFixed(1)}`;
    const lastPos = data[data.length-1].pos;
    const lastPts = data[data.length-1].pts;
    const prevPos = data.length > 1 ? data[data.length-2].pos : lastPos;
    const trend = lastPos < prevPos ? `↑${prevPos-lastPos}` : lastPos > prevPos ? `↓${lastPos-prevPos}` : '=';
    const trendColor = lastPos < prevPos ? 'var(--win)' : lastPos > prevPos ? 'var(--loss)' : 'var(--text-muted)';
    const color = lastPos<=3?'var(--win)':lastPos<=8?'var(--accent-primary)':'var(--loss)';

    const yLabels = [1, Math.round(total/2), total].map(pos => {
      const y = PADT+(pos-1)/(total-1)*innerH;
      return `<text x="${PADL-3}" y="${y+3}" text-anchor="end" font-size="6" fill="var(--text-muted)">${pos}</text>
              <line x1="${PADL}" y1="${y}" x2="${PADL+innerW}" y2="${y}" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="3,3"/>`;
    }).join('');

    const xLabels = [0, Math.floor((data.length-1)/2), data.length-1].map(i => {
      return `<text x="${xs[i].toFixed(1)}" y="${PADT+innerH+13}" text-anchor="middle" font-size="6" fill="var(--text-muted)">R${data[i].match}</text>`;
    }).join('');

    const circles = xs.map((x,i)=>`
      <circle cx="${x.toFixed(1)}" cy="${ys[i].toFixed(1)}" r="3.5" fill="${color}" stroke="var(--bg-secondary)" stroke-width="1.5" style="cursor:pointer"
        onmouseenter="this.setAttribute('r','5.5')"
        onmouseleave="this.setAttribute('r','3.5')">
        <title>${data[i].pos}e · R${data[i].match} · ${data[i].pts} pnt</title>
      </circle>`).join('');

    const lastX = xs[xs.length-1];
    const lastY = ys[ys.length-1];

    return `<div>
      <svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;border-radius:4px;background:var(--bg-tertiary)">
        <defs>
          <linearGradient id="sggrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
          </linearGradient>
        </defs>
        ${yLabels}
        ${xLabels}
        <text x="5" y="${PADT+innerH/2}" text-anchor="middle" font-size="6" fill="var(--text-muted)" transform="rotate(-90,5,${PADT+innerH/2})">Positie</text>
        <polygon points="${fill}" fill="url(#sggrad)"/>
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${circles}
        <text x="${(lastX+8).toFixed(1)}" y="${(lastY+3).toFixed(1)}" text-anchor="start" font-size="8" fill="${color}" font-weight="600">${lastPos}e</text>
      </svg>
      <div style="display:flex;gap:16px;margin-top:6px;font-size:11px;color:var(--text-muted)">
        <span>Huidig: <strong style="color:${color}">${lastPos}e</strong></span>
        <span>Punten: <strong style="color:var(--text-primary)">${lastPts}</strong></span>
        <span>Trend: <strong style="color:${trendColor}">${trend}</strong></span>
        <span>Speelronden: <strong style="color:var(--text-primary)">${data.length}</strong></span>
      </div>
    </div>`;
  })();

// Next match html
  let nextMatchHtml='';
  if(nextMatch){
    const hc=S.clubs.find(c=>c.id===nextMatch.homeClubId);
    const ac=S.clubs.find(c=>c.id===nextMatch.awayClubId);
    const hn=hc?.name||nextMatch.homeName||'?';
    const an=ac?.name||nextMatch.awayName||'?';
    const stad=S.stadiums.find(s=>s.id===hc?.stadiumId);
    const isRival=hc?.highlight==='rivaal'||ac?.highlight==='rivaal';
    const comp=S.competitions.find(c=>c.id===nextMatch.competitionId);
    const isPinned=S.pinnedNextMatch===nextMatch.id;
    const opp=hc?.isOwnClub?ac:hc;
    nextMatchHtml=`<div class="card" style="${isRival?'border-left:3px solid var(--rival-accent)':''}" >
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>Volgende wedstrijd${isPinned?' <span style="font-size:10px;color:var(--text-muted)">📌 vastgepind</span>':''}</span>
        <button class="btn btn-ghost" style="font-size:10px;padding:2px 8px" onclick="openPinMatchModal()">📌 Aanwijzen</button>
      </div>
      <div style="text-align:center;padding:8px 0 4px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${fmtMatchDate(nextMatch)}${nextMatch.time?' · <strong style=color:var(--text-primary)>'+nextMatch.time+'</strong>':''}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:8px">
          <span style="font-weight:700;font-size:16px;text-align:right;flex:1;display:flex;align-items:center;justify-content:flex-end;gap:8px;${hc?.isOwnClub?'color:var(--accent-primary)':''}"><span>${hn}</span>${clubLogoHTML(hc,32)}</span>
          <span style="background:var(--bg-input);border:1px solid var(--border);border-radius:6px;padding:6px 14px;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:20px;color:var(--text-muted);min-width:60px;text-align:center">${nextMatch.time||'vs'}</span>
          <span style="font-weight:700;font-size:16px;text-align:left;flex:1;display:flex;align-items:center;justify-content:flex-start;gap:8px;${ac?.isOwnClub?'color:var(--accent-primary)':''}">${clubLogoHTML(ac,32)}<span>${an}</span></span>
        </div>
        ${stad?`<div style="font-size:11px;color:var(--text-muted)">📍 ${stad.name}${stad.city?' · '+stad.city:''}</div>`:''}
        ${comp?`<div style="margin-top:6px"><span class="badge badge-${comp.type==='beker'?'beker':comp.type==='playoffs'?'playoffs':comp.type==='voorbereiding'?'voorbereiding':'competitie'}" style="font-size:9px">${comp.name}</span></div>`:''}
        ${isRival?`<div style="margin-top:6px;font-size:11px;font-weight:700;color:var(--rival-accent)">🔴 DE FRIESE DERBY</div>`:''}
      </div>
    </div>`;
  } else {
    nextMatchHtml=`<div class="card"><div class="card-title">Volgende wedstrijd <button class="btn btn-ghost" style="font-size:10px;padding:2px 8px;margin-left:4px" onclick="openPinMatchModal()">📌 Aanwijzen</button></div><p class="text-muted" style="font-size:12px">Geen geplande wedstrijden gevonden.</p></div>`;
  }

  // Last match html
  let lastMatchHtml='';
  if(lastMatch){
    const hc=S.clubs.find(c=>c.id===lastMatch.homeClubId);
    const ac=S.clubs.find(c=>c.id===lastMatch.awayClubId);
    const hn=hc?.name||lastMatch.homeName||'?';
    const an=ac?.name||lastMatch.awayName||'?';
    const isCamHome=lastMatch.homeClubId===cam?.id;
    const cs=isCamHome?lastMatch.homeScore:lastMatch.awayScore;
    const os=isCamHome?lastMatch.awayScore:lastMatch.homeScore;
    const rc=cs>os?'var(--win)':cs===os?'var(--draw)':'var(--loss)';
    const rl=cs>os?'Gewonnen':cs===os?'Gelijkgespeeld':'Verloren';
    const goals=(lastMatch.events||[]).filter(e=>e.type==='goal');
    const scorerHtml=goals.map(e=>{
      if(e.playerId==='__opp__'){
        const oppN=e.oppName||(S.clubs.find(c=>c.id===e.oppClubId)?.name)||'Tegenstander';
        return `<span style="font-size:11px;color:var(--text-muted)">${e.minute?e.minute+"' ":''}${oppN} (⚽)</span>`;
      }
      const p=S.players?.find(x=>x.id===e.playerId);
      const n=p?(p.firstname?p.firstname[0]+'. ':'')+p.lastname:'?';
      return `<span style="font-size:11px;color:var(--text-secondary)">${e.minute?e.minute+"' ":''}<strong>${n}</strong>${e.goalType&&e.goalType!=='normaal'?' ('+e.goalType+')':''}</span>`;
    }).join(' · ');
    lastMatchHtml=`<div class="card" style="border-left:3px solid ${rc}">
      <div class="card-title" style="display:flex;justify-content:space-between">
        Laatste wedstrijd
        <span style="font-size:11px;font-weight:700;color:${rc}">${rl}</span>
      </div>
      <div style="text-align:center;padding:4px 0">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">${fmtMatchDate(lastMatch)}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:12px">
          <span style="font-weight:700;font-size:14px;flex:1;text-align:right;display:flex;align-items:center;justify-content:flex-end;gap:6px;${hc?.isOwnClub?'color:var(--accent-primary)':''}"><span>${hn}</span>${clubLogoHTML(hc,30)}</span>
          <span style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:26px;color:${rc}">${lastMatch.homeScore} - ${lastMatch.awayScore}</span>
          <span style="font-weight:700;font-size:14px;flex:1;text-align:left;display:flex;align-items:center;justify-content:flex-start;gap:6px;${ac?.isOwnClub?'color:var(--accent-primary)':''}">${clubLogoHTML(ac,30)}<span>${an}</span></span>
        </div>
        ${scorerHtml?`<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;justify-content:center">${scorerHtml}</div>`:''}
      </div>
    </div>`;
  } else {
    lastMatchHtml=`<div class="card"><div class="card-title">Laatste wedstrijd</div><p class="text-muted" style="font-size:12px">Nog geen gespeelde wedstrijden.</p></div>`;
  }

  // Form row
  const formDots=form.map(f=>{
    const col=f.r==='W'?'var(--win)':f.r==='D'?'var(--draw)':'var(--loss)';
    const opp=S.clubs.find(c=>c.id===(f.m.homeClubId===cam?.id?f.m.awayClubId:f.m.homeClubId));
    const isHome=f.m.homeClubId===cam?.id;
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;min-width:42px" onclick="navigateToComp('${f.m.competitionId}')" title="${opp?.name||'?'} (${isHome?'Thuis':'Uit'})">
      <div style="width:32px;height:32px;border-radius:50%;background:${col};display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:14px;color:#000">${f.r}</div>
      <span style="font-size:9px;color:var(--text-muted);text-align:center">${opp?.abbr||opp?.name?.slice(0,3)||'?'}</span>
      <span style="font-size:9px;color:var(--text-muted)">${isHome?'T':'U'}</span>
    </div>`;
  }).join('');

  el.innerHTML=`
    <div style="margin-bottom:14px;display:flex;align-items:baseline;justify-content:space-between">
      <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:22px;letter-spacing:0.5px">
        ${camName} — <span style="color:var(--accent-primary)">${season.name}</span>
      </div>
      ${played.length ? `<button class="btn btn-ghost" style="font-size:12px" onclick="navigateToSeizoensverslag('${season.id}')">📋 Seizoensverslag</button>` : ''}
    </div>

    <!-- Stats bar -->
    <div class="grid-4 mb-12">
      <div class="card" style="text-align:center">
        <div class="stat-big">${leaguePos?leaguePos.pos+'e':'—'}</div>
        <div class="stat-label">Positie${leaguePos?' · '+leaguePos.pts+' pnt':''}</div>
      </div>
      <div class="card" style="text-align:center">
        <div class="stat-big">${played.length}</div>
        <div class="stat-label">${wins}W ${draws}G ${losses}V</div>
      </div>
      <div class="card" style="text-align:center">
        <div class="stat-big" style="color:${gf>ga?'var(--win)':gf<ga?'var(--loss)':'var(--accent-primary)'}">${gf}-${ga}</div>
        <div class="stat-label">Doelen voor-tegen</div>
      </div>
      <div class="card" style="text-align:center">
        <div class="stat-big" style="${warnings.length?'color:var(--draw)':''}">${warnings.length||'✓'}</div>
        <div class="stat-label">${warnings.length?'Gebless./Gesch.':'Iedereen fit'}</div>
      </div>
    </div>

    <!-- Next + Last -->
    <div class="grid-2 mb-12">${nextMatchHtml}${lastMatchHtml}</div>
    ${renderOnThisDayCard(cam)}
    ${renderMilestonesCard()}
    ${renderAttendanceCard(cam)}

    <!-- Stand grafiek + Coach -->
    <div class="grid-2 mb-12">
      <div class="card">
        <div class="card-title">Positie door het seizoen${standPerRonde?.compName?' · '+standPerRonde.compName:''}</div>
        ${standGrafiekHtml?`<div style="margin-top:4px">${standGrafiekHtml}</div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-top:4px">
          <span>Speelronde 1</span><span>Speelronde ${standPerRonde.data.length}</span>
        </div>`:`<p class="text-muted" style="font-size:12px;margin-top:8px">Nog niet genoeg gespeelde wedstrijden dit seizoen om een positieverloop te tonen.</p>`}
      </div>
      ${coachStats?`<div class="card">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="flex:1;min-width:0">
            <div class="card-title" style="margin-bottom:8px">Coach — ${currentCoach.firstname?currentCoach.firstname+' ':''}${currentCoach.lastname}</div>
            <!-- Hoofdstatistieken -->
            <div style="display:flex;gap:0;margin-bottom:6px;background:var(--bg-primary);border-radius:8px;overflow:hidden">
              ${[
                {v:coachStats.matches, l:'Wedstr.', c:'var(--text-primary)'},
                {v:coachStats.wins, l:'Gewonnen', c:'var(--win)'},
                {v:coachStats.draws, l:'Gelijk', c:'var(--draw)'},
                {v:coachStats.losses, l:'Verloren', c:'var(--loss)'},
                {v:coachStats.ppg, l:'PPG', c:'var(--accent-primary)'},
              ].map((s,i)=>`<div style="flex:1;text-align:center;padding:8px 4px;border-left:${i>0?'1px solid var(--border)':'none'}">
                <div style="font-size:18px;font-weight:800;color:${s.c}">${s.v}</div>
                <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;margin-top:1px">${s.l}</div>
              </div>`).join('')}
            </div>
            <!-- Thuis & Uit + Series als één blok -->
            <div style="border-radius:6px;overflow:hidden">
              <div style="display:flex;align-items:center;background:var(--bg-tertiary);padding:5px 10px;border-bottom:1px solid var(--border-light)">
                <span style="font-size:11px;font-weight:600;color:var(--text-primary);width:20%;flex-shrink:0">Thuis</span>
                <span style="font-size:13px;font-weight:700;width:20%;flex-shrink:0">
                  <span style="color:var(--win)">${coachStats.homeW}W</span><span style="color:var(--text-muted);margin:0 3px">·</span><span style="color:var(--draw)">${coachStats.homeD}G</span><span style="color:var(--text-muted);margin:0 3px">·</span><span style="color:var(--loss)">${coachStats.homeL}V</span>
                </span>
              </div>
              <div style="display:flex;align-items:center;background:var(--bg-tertiary);padding:5px 10px;${coachStats.maxWinStreak>0||coachStats.maxUnbeaten>0?'border-bottom:1px solid var(--border-light)':''}">
                <span style="font-size:11px;font-weight:600;color:var(--text-primary);width:20%;flex-shrink:0">Uit</span>
                <span style="font-size:13px;font-weight:700;width:20%;flex-shrink:0">
                  <span style="color:var(--win)">${coachStats.awayW}W</span><span style="color:var(--text-muted);margin:0 3px">·</span><span style="color:var(--draw)">${coachStats.awayD}G</span><span style="color:var(--text-muted);margin:0 3px">·</span><span style="color:var(--loss)">${coachStats.awayL}V</span>
                </span>
              </div>
              ${coachStats.maxWinStreak>0?`<div style="display:flex;align-items:center;background:var(--bg-tertiary);padding:5px 10px;border-bottom:1px solid var(--border-light)">
                <span style="font-size:11px;font-weight:600;color:var(--text-primary);width:20%;flex-shrink:0">🔥 Winstserie</span>
                <span style="font-size:13px;font-weight:800;color:var(--win);width:20%;flex-shrink:0">${coachStats.maxWinStreak}W${coachStats.bestWinStart&&coachStats.bestWinEnd?` <span style="font-size:13px;color:var(--text-muted);font-weight:400">R${coachStats.bestWinStart}–R${coachStats.bestWinEnd}</span>`:''}</span>
              </div>`:''}
              ${coachStats.maxUnbeaten>0?`<div style="display:flex;align-items:center;background:var(--bg-tertiary);padding:5px 10px">
                <span style="font-size:11px;font-weight:600;color:var(--text-primary);width:20%;flex-shrink:0">🛡 Ongeslagen</span>
                <span style="font-size:13px;font-weight:800;color:var(--accent-primary);width:20%;flex-shrink:0">${coachStats.maxUnbeaten}${coachStats.bestUnbeatStart&&coachStats.bestUnbeatEnd?` <span style="font-size:13px;color:var(--text-muted);font-weight:400">R${coachStats.bestUnbeatStart}–R${coachStats.bestUnbeatEnd}</span>`:''}</span>
              </div>`:''}
            </div>
          </div>
          <!-- Coach foto -->
          <div style="flex-shrink:0;width:68px;height:68px;border-radius:50%;overflow:hidden;background:var(--accent-primary);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:22px;color:var(--accent-secondary)">
            ${currentCoach.photo?`<img src="${currentCoach.photo}" style="width:100%;height:100%;object-fit:cover">`:`${(currentCoach.firstname?currentCoach.firstname[0]:'')+(currentCoach.lastname?currentCoach.lastname[0]:'')}`}
          </div>
        </div>
      </div>`:`<div class="card">
        <div class="card-title">Coach</div>
        <p class="text-muted" style="font-size:12px;margin-top:8px">Nog geen hoofdtrainer-aanstelling of wedstrijddata bekend voor dit seizoen.</p>
      </div>`}
    </div>

    <!-- Form + Topscorers + Top assisters -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
      <div class="card">
        <div class="card-title">Recente vorm${form.length?' (laatste '+form.length+')':''}</div>
        ${form.length
          ? `${renderFormGraph(formLong)}<div style="display:flex;gap:8px;align-items:flex-start;margin-top:6px;flex-wrap:wrap">${formDots}</div>`
          : '<p class="text-muted" style="font-size:12px">Nog geen gespeelde wedstrijden.</p>'}
      </div>
      <div class="card">
        <div class="card-title">Topscorers</div>
        ${topScorers.length
          ? topScorers.map((p,i)=>`<div class="settings-row" style="cursor:pointer" onclick="navigateToPlayer('${p.id}')">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:16px;color:var(--text-muted);width:18px;text-align:center">${i+1}</span>
                ${playerAvatarHTML(p,'player-avatar',28)}
                <div>
                  <div style="font-weight:600;font-size:13px">${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</div>
                  <div style="font-size:10px;color:var(--text-muted)">${stats[p.id].assists>0?stats[p.id].assists+' assist'+(stats[p.id].assists>1?'s':''):''}</div>
                </div>
              </div>
              <span style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:20px;color:var(--accent-primary)">${stats[p.id].goals}</span>
            </div>`).join('')
          : '<p class="text-muted" style="font-size:12px">Nog geen doelpunten geregistreerd.</p>'}
      </div>
      <div class="card">
        <div class="card-title">Top assisters</div>
        ${topAssisters.length
          ? topAssisters.map((p,i)=>`<div class="settings-row" style="cursor:pointer" onclick="navigateToPlayer('${p.id}')">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:16px;color:var(--text-muted);width:18px;text-align:center">${i+1}</span>
                ${playerAvatarHTML(p,'player-avatar',28)}
                <div>
                  <div style="font-weight:600;font-size:13px">${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</div>
                  <div style="font-size:10px;color:var(--text-muted)">${stats[p.id].goals>0?stats[p.id].goals+' goal'+(stats[p.id].goals>1?'s':''):''}</div>
                </div>
              </div>
              <span style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:20px;color:var(--text-primary)">${stats[p.id].assists}</span>
            </div>`).join('')
          : '<p class="text-muted" style="font-size:12px">Nog geen assists geregistreerd.</p>'}
      </div>
    </div>

    <!-- Blessures/Schorsingen -->
    ${warnings.length?`<div class="card">
      <div class="card-title">⚠ Beschikbaarheid</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${warnings.map(p=>{
          const inj = effectiveInjuryStatus(p);
          const statusBadge = p.status==='geschorst'
            ? `<span class="badge badge-status-geschorst" style="font-size:9px">Geschorst${p.suspensionEnd?' t/m '+new Date(p.suspensionEnd).toLocaleDateString('nl-NL',{day:'numeric',month:'short'}):''}</span>`
            : '';
          const injBadge = inj
            ? `<span class="badge badge-status-geblesseerd" style="font-size:9px">🩹 ${inj.type||'Geblesseerd'}${inj.expectedReturn?' t/m '+new Date(inj.expectedReturn).toLocaleDateString('nl-NL',{day:'numeric',month:'short'}):''}</span>`
            : '';
          return `<div style="display:flex;align-items:center;gap:8px;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;cursor:pointer" onclick="navigateToPlayer('${p.id}')">
          ${playerAvatarHTML(p,'player-avatar',30)}
          <div>
            <div style="font-weight:600;font-size:13px">${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</div>
            <div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:2px">${statusBadge}${injBadge}</div>
          </div>
        </div>`;
        }).join('')}
      </div>
    </div>`:''}

    <!-- Ontbrekende wedstrijddata (alleen gespeelde Cambuur-wedstrijden dit seizoen) -->
    ${(()=>{
      const withMissing = played.filter(m => getMissingDataFields(m).length > 0);
      if (!withMissing.length) return '';
      const oppName = m => {
        const isCamHome = m.homeClubId===cam?.id;
        const oppClub = S.clubs.find(c=>c.id===(isCamHome?m.awayClubId:m.homeClubId));
        return oppClub?.name || (isCamHome?m.awayName:m.homeName) || '?';
      };
      const byField = MISSING_DATA_FIELDS.map(f => ({
        field: f,
        matches: withMissing.filter(m => getMissingDataFields(m).some(mf=>mf.key===f.key))
      })).filter(x => x.matches.length > 0);
      return `<div class="card">
        <div class="card-title">⚠️ Ontbrekende wedstrijddata</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${withMissing.length} van ${played.length} gespeelde wedstrijden mist data dit seizoen</div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${byField.map(({field,matches})=>`<details>
            <summary style="cursor:pointer;font-size:12px;color:var(--text-secondary);padding:4px 0">${field.icon} ${matches.length}x ${field.label}</summary>
            <div style="padding:2px 0 6px 22px;display:flex;flex-direction:column;gap:3px">
              ${matches.map(m=>`<div style="font-size:11px;color:var(--text-muted);cursor:pointer" onclick="navigateToMatch('${m.id}')" onmouseover="this.style.color='var(--accent-primary)'" onmouseout="this.style.color='var(--text-muted)'">${fmtShortDate(m.date)} — vs ${oppName(m)}</div>`).join('')}
            </div>
          </details>`).join('')}
        </div>
      </div>`;
    })()}

    <!-- Contractwaarschuwingen -->
    ${(()=>{
      const today = new Date();
      const in6m = new Date(today); in6m.setMonth(in6m.getMonth()+6);
      const effStatus = typeof effectiveStatus === 'function' ? effectiveStatus : (p => p.status || 'actief');
      const expiring = (S.players||[]).filter(p=>{
        if (!p.contract) return false;
        const d = new Date(p.contract);
        return d >= today && d <= in6m && effStatus(p) === 'actief';
      }).sort((a,b)=>new Date(a.contract)-new Date(b.contract));
      if (!expiring.length) return '';
      return `<div class="card">
        <div class="card-title">📋 Contracten verlopen binnenkort</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${expiring.map(p=>{
            const d = new Date(p.contract);
            const months = Math.round((d-today)/(1000*60*60*24*30));
            const color = months<=2?'var(--loss)':months<=4?'#ff8c00':'var(--draw)';
            return `<div style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:4px 0" onclick="navigateToPlayer('${p.id}')">
              ${playerAvatarHTML(p,'player-avatar',28)}
              <div style="flex:1;font-size:13px;font-weight:600">${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</div>
              <div style="font-size:12px;color:var(--text-muted)">${p.position||''}</div>
              <div style="font-size:12px;font-weight:700;color:${color}">${new Date(p.contract).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'})}</div>
              <div style="font-size:11px;color:${color};min-width:50px;text-align:right">${months}m</div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    })()}

    <!-- Seizoensgemiddelden: balbezit + keepersreddingen -->
    ${(()=>{
      const cam = S.clubs.find(c=>c.isOwnClub);
      if (!cam) return '';
      const camMatches = played.filter(m=>m.matchStats?.home?.possession!==undefined);
      if (!camMatches.length) return '';

      const isCamHome = m => m.homeClubId===cam.id;
      const possessions = camMatches.map(m=>isCamHome(m)?m.matchStats.home.possession:m.matchStats.away.possession);
      const avgPoss = Math.round(possessions.reduce((a,b)=>a+b,0)/possessions.length);

      // Keeper save percentage (hergebruikt 'stats', al bovenaan renderDashboard berekend)
      const allStats = stats;
      const keepers = (S.players||[]).filter(p=>p.position==='Keeper'&&(allStats[p.id]?.appearances||0)>0);
      const keeperRows = keepers.map(p=>{
        const st = allStats[p.id]||{};
        const saves = st.saves||0;
        const conceded = played.reduce((sum,m)=>{
          const inLineup = (m.lineup||[]).includes(p.id)||(m.events||[]).some(e=>e.type==='sub'&&e.playerInId===p.id);
          if (!inLineup) return sum;
          return sum + (isCamHome(m)?m.awayScore:m.homeScore)||0;
        },0);
        const total = saves + conceded;
        const pct = total>0 ? Math.round(saves/total*100) : null;
        return {p, saves, conceded, pct, apps: st.appearances||0};
      }).filter(k=>k.apps>0);

      return `<div class="card">
        <div class="card-title">📊 Seizoensgemiddelden</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
          <div style="text-align:center;padding:8px 16px;background:var(--bg-tertiary);border-radius:6px">
            <div style="font-size:28px;font-weight:800;color:var(--accent-primary)">${avgPoss}%</div>
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;margin-top:2px">Gem. balbezit</div>
            <div style="font-size:10px;color:var(--text-muted)">${camMatches.length} wedstrijden</div>
          </div>
          ${keeperRows.map(k=>`<div style="text-align:center;padding:8px 16px;background:var(--bg-tertiary);border-radius:6px">
            <div style="font-size:28px;font-weight:800;color:${(k.pct||0)>=70?'var(--win)':'var(--text-primary)'}">${k.pct!==null?k.pct+'%':'—'}</div>
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;margin-top:2px">Reddingen% ${k.p.lastname}</div>
            <div style="font-size:10px;color:var(--text-muted)">${k.saves}R / ${k.conceded}T</div>
          </div>`).join('')}
        </div>
      </div>`;
    })()}
  `;
;
}

// ── PIN NEXT MATCH MODAL ──
async function setPinnedMatch(matchId) {
  S.pinnedNextMatch = matchId || null;
  await saveSetting('pinnedNextMatch', S.pinnedNextMatch);
  closeModal('modal-pin-match');
  renderDashboard();
  showToast(matchId ? 'Volgende wedstrijd vastgepind' : 'Pin verwijderd', 'success');
}

function openPinMatchModal() {
  const cam = S.clubs.find(c=>c.isOwnClub);
  if (!cam) return;
  const upcoming = (S.matches||[])
    .filter(m=>m.seasonId===S.currentSeason&&!m.played&&(m.homeClubId===cam.id||m.awayClubId===cam.id)&&m.date)
    .sort((a,b)=>a.date.localeCompare(b.date))
    .slice(0,10);

  const list = document.getElementById('pin-match-list');
  if (!upcoming.length) {
    list.innerHTML = '<p class="text-muted" style="font-size:12px">Geen aankomende Cambuur wedstrijden gevonden.</p>';
  } else {
    list.innerHTML = upcoming.map(m=>{
      const opp = S.clubs.find(c=>c.id===(m.homeClubId===cam.id?m.awayClubId:m.homeClubId));
      const comp = S.competitions.find(c=>c.id===m.competitionId);
      const isPinned = S.pinnedNextMatch===m.id;
      return `<div class="settings-row" style="cursor:pointer" onclick="setPinnedMatch('${m.id}')">
        <div>
          <div style="font-weight:600;font-size:13px">${m.homeClubId===cam.id?'<span style=color:var(--accent-primary)>Thuis</span>':'Uit'} vs ${opp?.name||m.awayName||m.homeName||'?'}</div>
          <div style="font-size:11px;color:var(--text-muted)">${fmtMatchDate(m)} · ${comp?.name||''}</div>
        </div>
        ${isPinned?'<span class="badge badge-active">📌 Huidig</span>':'<span style="font-size:11px;color:var(--text-muted)">→ Kiezen</span>'}
      </div>`;
    }).join('');
  }

  // Add "auto" option
  const autoBtn = document.createElement('div');
  autoBtn.className = 'settings-row';
  autoBtn.style.cursor = 'pointer';
  autoBtn.innerHTML = `<div><div style="font-weight:600;font-size:13px">🔄 Automatisch (op datum)</div><div style="font-size:11px;color:var(--text-muted)">App kiest de eerstvolgende wedstrijd zelf</div></div>${!S.pinnedNextMatch?'<span class="badge badge-active">Actief</span>':'<span style="font-size:11px;color:var(--text-muted)">→ Kiezen</span>'}`;
  autoBtn.onclick = () => setPinnedMatch(null);
  list.prepend(autoBtn);

  document.getElementById('modal-pin-match').classList.add('open');
}

