// ── DASHBOARD ──
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
  const form=getCambuurForm(5);
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

  // Warnings
  const warnings=(S.players||[]).filter(p=>['geblesseerd','geschorst'].includes(p.status));

  // Coach samenvatting huidig seizoen
  const currentCoach = (() => {
    const today = new Date().toISOString().split('T')[0];
    for (const coach of (S.coaches||[])) {
      const active = (coach.appointments||[]).find(a => {
        const from = a.from||'1900-01-01';
        const to = a.to||'2099-01-01';
        return today >= from && today <= to && a.role === 'Hoofdtrainer';
      });
      if (active) return coach;
    }
    return null;
  })();
  const coachStats = currentCoach ? calcCoachStats(currentCoach.id, S.currentSeason, null) : null;

  // Stand per speelronde (positie door het seizoen)
  const standPerRonde = (() => {
    const comps = (S.competitions||[]).filter(c=>c.seasonId===S.currentSeason&&c.type==='competitie');
    if (!comps.length) return null;
    const comp = comps[0];
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
    const color = lastPos<=3?'var(--win)':lastPos<=8?'var(--cambuur-geel)':'var(--loss)';

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
    nextMatchHtml=`<div class="card" style="${isRival?'border-left:3px solid var(--heerenveen-rood)':''}" >
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>Volgende wedstrijd${isPinned?' <span style="font-size:10px;color:var(--text-muted)">📌 vastgepind</span>':''}</span>
        <button class="btn btn-ghost" style="font-size:10px;padding:2px 8px" onclick="openPinMatchModal()">📌 Aanwijzen</button>
      </div>
      <div style="text-align:center;padding:8px 0 4px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${fmtMatchDate(nextMatch)}${nextMatch.time?' · <strong style=color:var(--text-primary)>'+nextMatch.time+'</strong>':''}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:8px">
          <span style="font-weight:700;font-size:16px;text-align:right;flex:1;${hc?.isOwnClub?'color:var(--cambuur-geel)':''}">${hn}</span>
          <span style="background:var(--bg-input);border:1px solid var(--border);border-radius:6px;padding:6px 14px;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:20px;color:var(--text-muted);min-width:60px;text-align:center">${nextMatch.time||'vs'}</span>
          <span style="font-weight:700;font-size:16px;text-align:left;flex:1;${ac?.isOwnClub?'color:var(--cambuur-geel)':''}">${an}</span>
        </div>
        ${stad?`<div style="font-size:11px;color:var(--text-muted)">📍 ${stad.name}${stad.city?' · '+stad.city:''}</div>`:''}
        ${comp?`<div style="margin-top:6px"><span class="badge badge-${comp.type==='beker'?'beker':comp.type==='voorbereiding'?'voorbereiding':'competitie'}" style="font-size:9px">${comp.name}</span></div>`:''}
        ${isRival?`<div style="margin-top:6px;font-size:11px;font-weight:700;color:var(--heerenveen-rood)">🔴 DE FRIESE DERBY</div>`:''}
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
          <span style="font-weight:700;font-size:14px;flex:1;text-align:right;${hc?.isOwnClub?'color:var(--cambuur-geel)':''}">${hn}</span>
          <span style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:26px;color:${rc}">${lastMatch.homeScore} - ${lastMatch.awayScore}</span>
          <span style="font-weight:700;font-size:14px;flex:1;text-align:left;${ac?.isOwnClub?'color:var(--cambuur-geel)':''}">${an}</span>
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
        ${camName} — <span style="color:var(--cambuur-geel)">${season.name}</span>
      </div>
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
        <div class="stat-big" style="color:${gf>ga?'var(--win)':gf<ga?'var(--loss)':'var(--cambuur-geel)'}">${gf}-${ga}</div>
        <div class="stat-label">Doelen voor-tegen</div>
      </div>
      <div class="card" style="text-align:center">
        <div class="stat-big" style="${warnings.length?'color:var(--draw)':''}">${warnings.length||'✓'}</div>
        <div class="stat-label">${warnings.length?'Gebless./Gesch.':'Iedereen fit'}</div>
      </div>
    </div>

    <!-- Next + Last -->
    <div class="grid-2 mb-12">${nextMatchHtml}${lastMatchHtml}</div>

    <!-- Stand grafiek + Coach -->
    ${standGrafiekHtml||coachStats?`<div class="grid-2 mb-12">
      ${standGrafiekHtml?`<div class="card">
        <div class="card-title">Positie door het seizoen${standPerRonde?.compName?' · '+standPerRonde.compName:''}</div>
        <div style="margin-top:4px">${standGrafiekHtml}</div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-top:4px">
          <span>Speelronde 1</span><span>Speelronde ${standPerRonde.data.length}</span>
        </div>
      </div>`:'<div></div>'}
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
                {v:coachStats.ppg, l:'PPG', c:'var(--cambuur-geel)'},
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
                <span style="font-size:13px;font-weight:800;color:var(--cambuur-geel);width:20%;flex-shrink:0">${coachStats.maxUnbeaten}${coachStats.bestUnbeatStart&&coachStats.bestUnbeatEnd?` <span style="font-size:13px;color:var(--text-muted);font-weight:400">R${coachStats.bestUnbeatStart}–R${coachStats.bestUnbeatEnd}</span>`:''}</span>
              </div>`:''}
            </div>
          </div>
          <!-- Coach foto -->
          <div style="flex-shrink:0;width:68px;height:68px;border-radius:50%;overflow:hidden;background:var(--cambuur-geel);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:22px;color:var(--cambuur-blauw)">
            ${currentCoach.photo?`<img src="${currentCoach.photo}" style="width:100%;height:100%;object-fit:cover">`:`${(currentCoach.firstname?currentCoach.firstname[0]:'')+(currentCoach.lastname?currentCoach.lastname[0]:'')}`}
          </div>
        </div>
      </div>`:'<div></div>'}
    </div>`:''}

    <!-- Form + Topscorers + Top assisters -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
      <div class="card">
        <div class="card-title">Recente vorm${form.length?' (laatste '+form.length+')':''}</div>
        ${form.length
          ? `<div style="display:flex;gap:8px;align-items:flex-start;margin-top:6px;flex-wrap:wrap">${formDots}</div>`
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
              <span style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:20px;color:var(--cambuur-geel)">${stats[p.id].goals}</span>
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
        ${warnings.map(p=>`<div style="display:flex;align-items:center;gap:8px;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;cursor:pointer" onclick="navigateToPlayer('${p.id}')">
          ${playerAvatarHTML(p,'player-avatar',30)}
          <div>
            <div style="font-weight:600;font-size:13px">${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</div>
            <span class="badge badge-status-${p.status}" style="font-size:9px">${statusLabel(p)}${p.returnDate?' t/m '+new Date(p.returnDate).toLocaleDateString('nl-NL',{day:'numeric',month:'short'}):p.suspensionEnd?' t/m '+new Date(p.suspensionEnd).toLocaleDateString('nl-NL',{day:'numeric',month:'short'}):''}</span>
          </div>
        </div>`).join('')}
      </div>
    </div>`:''}
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
          <div style="font-weight:600;font-size:13px">${m.homeClubId===cam.id?'<span style=color:var(--cambuur-geel)>Thuis</span>':'Uit'} vs ${opp?.name||m.awayName||m.homeName||'?'}</div>
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

