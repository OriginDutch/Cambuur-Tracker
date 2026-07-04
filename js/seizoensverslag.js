
// ══════════════════════════════════════════════════════
// SEIZOENSVERSLAG
// ══════════════════════════════════════════════════════
// Samenvattend overzicht van een seizoen — leunt volledig op bestaande
// data/functies (calcAllPlayerStats, matches), geen nieuw datamodel nodig.

function navigateToSeizoensverslag(seasonId) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-seizoensverslag').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  renderSeizoensverslag(seasonId);
}

function svBack() {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-dashboard').classList.add('active');
}

function renderSeizoensverslag(seasonId) {
  const el = document.getElementById('seizoensverslag-content');
  if (!el) return;
  const season = (S.seasons||[]).find(s=>s.id===seasonId);
  const cam = S.clubs.find(c=>c.isOwnClub);
  if (!season || !cam) { el.innerHTML = '<p class="text-muted">Seizoen niet gevonden.</p>'; return; }

  const seasonRecord = calcSeasonRecord(seasonId, cam);
  const matches = seasonRecord.matches.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));

  if (!matches.length) {
    el.innerHTML = `<button class="btn btn-ghost" onclick="svBack()" style="font-size:13px;margin-bottom:12px">← Terug</button>
      <p class="text-muted">Nog geen gespeelde wedstrijden dit seizoen — nog geen verslag beschikbaar.</p>`;
    return;
  }

  // ── Eindstand ──
  const {w, d, l, gf, ga, cleanSheets:cs, played, pts, ppg} = seasonRecord;

  // ── Thuis/uit record ──
  const splitRecord = ms => {
    let rw=0,rd=0,rl=0,rgf=0,rga=0;
    ms.forEach(m=>{
      const isCamHome = m.homeClubId===cam.id;
      const cg = isCamHome?m.homeScore:m.awayScore;
      const og = isCamHome?m.awayScore:m.homeScore;
      rgf+=cg; rga+=og;
      if (cg>og) rw++; else if (cg===og) rd++; else rl++;
    });
    return {w:rw,d:rd,l:rl,gf:rgf,ga:rga,played:ms.length};
  };
  const homeRec = splitRecord(matches.filter(m=>m.homeClubId===cam.id));
  const awayRec = splitRecord(matches.filter(m=>m.awayClubId===cam.id));

  // ── Grootste overwinning / zwaarste nederlaag ──
  let biggestWin=null, biggestLoss=null;
  matches.forEach(m=>{
    const isCamHome = m.homeClubId===cam.id;
    const cg = isCamHome?m.homeScore:m.awayScore;
    const og = isCamHome?m.awayScore:m.homeScore;
    const diff = cg-og;
    if (diff>0 && (!biggestWin || diff>biggestWin.diff)) biggestWin = {m,diff,cg,og,isCamHome};
    if (diff<0 && (!biggestLoss || diff<biggestLoss.diff)) biggestLoss = {m,diff,cg,og,isCamHome};
  });

  // ── Langste reeksen ──
  let curUnbeaten=0, maxUnbeaten=0, curWin=0, maxWin=0;
  matches.forEach(m=>{
    const isCamHome = m.homeClubId===cam.id;
    const cg = isCamHome?m.homeScore:m.awayScore;
    const og = isCamHome?m.awayScore:m.homeScore;
    curUnbeaten = cg>=og ? curUnbeaten+1 : 0;
    curWin = cg>og ? curWin+1 : 0;
    maxUnbeaten = Math.max(maxUnbeaten, curUnbeaten);
    maxWin = Math.max(maxWin, curWin);
  });

  // ── Spelerhoogtepunten ──
  const stats = calcAllPlayerStats(seasonId);
  const players = S.players||[];
  const topOf = (key, filterFn) => players
    .filter(p => (!filterFn || filterFn(p)) && (stats[p.id]?.[key]||0) > 0)
    .sort((a,b) => (stats[b.id][key]||0) - (stats[a.id][key]||0))[0];
  const topScorer = topOf('goals');
  const topAssist = topOf('assists');
  const topMotm = topOf('motm');
  const topKeeper = topOf('cleanSheets', p=>p.position==='Keeper');
  const mostCarded = players
    .filter(p => ((stats[p.id]?.yellowCards||0)+(stats[p.id]?.redCards||0)) > 0)
    .sort((a,b) => ((stats[b.id].yellowCards||0)+(stats[b.id].redCards||0)) - ((stats[a.id].yellowCards||0)+(stats[a.id].redCards||0)))[0];
  let totalYellow=0, totalRed=0;
  players.forEach(p => { totalYellow += stats[p.id]?.yellowCards||0; totalRed += stats[p.id]?.redCards||0; });

  // ── Transferbalans dit seizoen ──
  const range = getSeasonDateRange(season);
  let transferSpent=0, transferReceived=0, joinedCount=0, departedCount=0;
  if (range) {
    players.forEach(p => {
      if (p.joined && p.joined>=range.start && p.joined<=range.end) { joinedCount++; transferSpent += parseFloat(getIncomingTransferInfo(p)?.amount)||0; }
      const depDate = getDepartureDate(p);
      if (depDate && depDate>=range.start && depDate<=range.end) { departedCount++; transferReceived += parseFloat(getOutgoingTransferInfo(p)?.amount)||0; }
    });
  }
  const transferNet = transferReceived - transferSpent;

  const oppName = m => {
    const isCamHome = m.homeClubId===cam.id;
    const oppClub = S.clubs.find(c=>c.id===(isCamHome?m.awayClubId:m.homeClubId));
    return oppClub?.name || (isCamHome?m.awayName:m.homeName) || '?';
  };
  const playerLine = p => p ? `${p.firstname?p.firstname[0]+'. ':''}${p.lastname}` : '—';
  const matchLine = mo => mo ? `${mo.cg}-${mo.og} ${mo.isCamHome?'vs':'@'} ${oppName(mo.m)}` : '—';

  el.innerHTML = `
    <button class="btn btn-ghost" onclick="svBack()" style="font-size:13px;margin-bottom:12px">← Terug</button>

    <div style="margin-bottom:20px">
      <div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:28px">📋 Seizoensverslag</div>
      <div style="font-size:16px;color:var(--cambuur-geel);font-weight:700">${cam.name} — ${season.name}</div>
    </div>

    <!-- Eindstand -->
    <div class="card mb-12">
      <div class="card-title">Eindstand</div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;text-align:center">
        <div><div style="font-size:22px;font-weight:800">${played}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Gespeeld</div></div>
        <div><div style="font-size:22px;font-weight:800;color:var(--win)">${w}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Winst</div></div>
        <div><div style="font-size:22px;font-weight:800;color:var(--draw)">${d}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Gelijk</div></div>
        <div><div style="font-size:22px;font-weight:800;color:var(--loss)">${l}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Verlies</div></div>
        <div><div style="font-size:22px;font-weight:800;color:${gf-ga>0?'var(--win)':gf-ga<0?'var(--loss)':'var(--text-primary)'}">${gf}-${ga}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Doelsaldo</div></div>
        <div><div style="font-size:22px;font-weight:800;color:var(--cambuur-geel)">${ppg}</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Punten/wedstrijd</div></div>
      </div>
      <div style="text-align:center;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-light);font-size:12px;color:var(--text-muted)">
        ${pts} punten · ${cs} clean sheets
      </div>
    </div>

    <!-- Thuis/uit split -->
    <div class="grid-2 mb-12">
      <div class="card">
        <div class="card-title">🏠 Thuis</div>
        <div style="font-size:13px">${homeRec.w}W ${homeRec.d}G ${homeRec.l}V · ${homeRec.gf}-${homeRec.ga}</div>
      </div>
      <div class="card">
        <div class="card-title">✈️ Uit</div>
        <div style="font-size:13px">${awayRec.w}W ${awayRec.d}G ${awayRec.l}V · ${awayRec.gf}-${awayRec.ga}</div>
      </div>
    </div>

    <!-- Records & reeksen -->
    <div class="card mb-12">
      <div class="card-title">Records & reeksen</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px">
        <div>
          <div style="color:var(--text-muted);font-size:11px;text-transform:uppercase;margin-bottom:2px">Grootste overwinning</div>
          <div style="cursor:${biggestWin?'pointer':'default'};color:${biggestWin?'var(--win)':'var(--text-muted)'};font-weight:700" ${biggestWin?`onclick="navigateToMatch('${biggestWin.m.id}')"`:''}>${matchLine(biggestWin)}</div>
        </div>
        <div>
          <div style="color:var(--text-muted);font-size:11px;text-transform:uppercase;margin-bottom:2px">Zwaarste nederlaag</div>
          <div style="cursor:${biggestLoss?'pointer':'default'};color:${biggestLoss?'var(--loss)':'var(--text-muted)'};font-weight:700" ${biggestLoss?`onclick="navigateToMatch('${biggestLoss.m.id}')"`:''}>${matchLine(biggestLoss)}</div>
        </div>
        <div>
          <div style="color:var(--text-muted);font-size:11px;text-transform:uppercase;margin-bottom:2px">Langste ongeslagen reeks</div>
          <div style="font-weight:700">${maxUnbeaten} wedstrijden</div>
        </div>
        <div>
          <div style="color:var(--text-muted);font-size:11px;text-transform:uppercase;margin-bottom:2px">Langste winstreeks</div>
          <div style="font-weight:700">${maxWin} wedstrijden</div>
        </div>
      </div>
    </div>

    <!-- Spelerhoogtepunten -->
    <div class="card mb-12">
      <div class="card-title">Spelerhoogtepunten</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
        ${[
          {label:'⚽ Topscorer', p:topScorer, val:topScorer?stats[topScorer.id].goals+' goals':''},
          {label:'🎯 Meeste assists', p:topAssist, val:topAssist?stats[topAssist.id].assists+' assists':''},
          {label:'🏆 Meeste MOTM', p:topMotm, val:topMotm?stats[topMotm.id].motm+'x':''},
          {label:'🧤 Meeste clean sheets', p:topKeeper, val:topKeeper?stats[topKeeper.id].cleanSheets+'x':''},
          {label:'🟨 Meest bestraft', p:mostCarded, val:mostCarded?((stats[mostCarded.id].yellowCards||0)+(stats[mostCarded.id].redCards||0))+' kaarten':''},
        ].map(x=>`<div style="text-align:center;background:var(--bg-tertiary);border-radius:var(--radius-sm);padding:10px;cursor:${x.p?'pointer':'default'}" ${x.p?`onclick="navigateToPlayer('${x.p.id}')"`:''}>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">${x.label}</div>
          <div style="font-weight:700;font-size:13px">${playerLine(x.p)}</div>
          <div style="font-size:11px;color:var(--cambuur-geel)">${x.val}</div>
        </div>`).join('')}
      </div>
      <div style="text-align:center;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-light);font-size:12px;color:var(--text-muted)">
        🟨 ${totalYellow} gele kaarten · 🟥 ${totalRed} rode kaarten (heel team)
      </div>
    </div>

    <!-- Transferbalans -->
    ${range ? `<div class="card">
      <div class="card-title">Transferbalans</div>
      <div style="display:flex;gap:16px;font-size:13px;flex-wrap:wrap">
        <span style="color:var(--win)">${joinedCount} binnengekomen</span>
        <span style="color:var(--loss)">${departedCount} vertrokken</span>
        <span style="color:var(--loss)">−${formatEuro(transferSpent)} uitgegeven</span>
        <span style="color:var(--win)">+${formatEuro(transferReceived)} ontvangen</span>
        <span style="font-weight:700;color:${transferNet>=0?'var(--win)':'var(--loss)'}">${transferNet>=0?'+':''}${formatEuro(transferNet)} netto</span>
      </div>
    </div>` : ''}
  `;
}
