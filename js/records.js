// ══════════════════════════════════════════════════════
// CLUBRECORDS — all-time markante feiten, afgeleid uit bestaande data
// ══════════════════════════════════════════════════════
// Geen nieuwe data nodig — puur een andere blik op transfers, leeftijden en
// statistieken die al worden bijgehouden.

function renderRecordsPage() {
  const el = document.getElementById('records-content');
  if (!el) return;
  const players = S.players || [];
  const cam = S.clubs.find(c=>c.isOwnClub);
  if (!players.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏆</div><div class="empty-state-title">Nog geen records</div><div class="empty-state-desc">Voeg spelers en wedstrijden toe om records te zien ontstaan.</div></div>';
    return;
  }

  // Best bezochte wedstrijd — alle wedstrijden met een ingevuld toeschouwersaantal
  let bestAttended = null;
  (S.matches||[]).forEach(m => {
    if (m.attendance && (!bestAttended || m.attendance > bestAttended.attendance)) bestAttended = m;
  });

  // Meeste doelpunten door één speler in één wedstrijd (eigen doelpunten tellen niet mee)
  let bestSingleMatchGoals = null;
  (S.matches||[]).forEach(m => {
    const goalCounts = {};
    (m.events||[]).forEach(e => {
      if (e.type!=='goal' || !e.playerId) return;
      if (e.playerId==='__opp__'||e.playerId==='__opp_own__') return;
      if (e.goalType==='eigen doelpunt') return;
      goalCounts[e.playerId] = (goalCounts[e.playerId]||0)+1;
    });
    Object.entries(goalCounts).forEach(([pid,count]) => {
      if (!bestSingleMatchGoals || count > bestSingleMatchGoals.count) {
        const p = players.find(x=>x.id===pid);
        if (p) bestSingleMatchGoals = {player:p, count, match:m};
      }
    });
  });

  // Grootste comeback — grootste achterstand die alsnog eindigde in winst/gelijkspel.
  // Vereist minuten bij alle doelpunten in die wedstrijd om de volgorde
  // betrouwbaar te reconstrueren; zonder minuten wordt de wedstrijd overgeslagen.
  let biggestComeback = null;
  if (cam) {
    (S.matches||[]).forEach(m => {
      if (!m.played || m.homeScore==null) return;
      if (!(m.homeClubId===cam.id || m.awayClubId===cam.id)) return;
      const isCamHome = m.homeClubId===cam.id;
      const finalCam = isCamHome?m.homeScore:m.awayScore;
      const finalOpp = isCamHome?m.awayScore:m.homeScore;
      if (finalCam < finalOpp) return; // verloren, dus geen comeback
      const goals = (m.events||[]).filter(e=>e.type==='goal').sort((a,b)=>(a.minute??999)-(b.minute??999));
      if (!goals.length || goals.some(g=>g.minute==null)) return;
      let camG=0, oppG=0, maxDeficit=0;
      goals.forEach(g => {
        const isOppGoal = g.playerId==='__opp__';
        const isOppOwn = g.playerId==='__opp_own__';
        const isCamOwnGoal = g.goalType==='eigen doelpunt' && !isOppGoal && !isOppOwn;
        if (isOppGoal || isCamOwnGoal) oppG++; else camG++;
        maxDeficit = Math.max(maxDeficit, oppG-camG);
      });
      if (maxDeficit>0 && (!biggestComeback || maxDeficit>biggestComeback.deficit)) {
        biggestComeback = {deficit: maxDeficit, match: m, finalCam, finalOpp};
      }
    });
  }

  let biggestBuy=null, biggestSell=null;
  players.forEach(p => {
    const incoming = getIncomingTransferInfo(p);
    if (incoming?.amount && (!biggestBuy || incoming.amount > biggestBuy.amount)) biggestBuy = {player:p, amount:incoming.amount, info:incoming};
    const outgoing = getOutgoingTransferInfo(p);
    if (outgoing?.amount && (!biggestSell || outgoing.amount > biggestSell.amount)) biggestSell = {player:p, amount:outgoing.amount, info:outgoing};
  });

  let youngestDebut=null, oldestDebut=null;
  players.forEach(p => {
    if (!p.dob) return;
    const firstMatch = getPlayerFirstAppearance(p.id);
    if (!firstMatch) return;
    const ageAtDebut = (new Date(firstMatch.date) - new Date(p.dob)) / 31557600000;
    if (!youngestDebut || ageAtDebut < youngestDebut.age) youngestDebut = {player:p, age:ageAtDebut, match:firstMatch};
    if (!oldestDebut || ageAtDebut > oldestDebut.age) oldestDebut = {player:p, age:ageAtDebut, match:firstMatch};
  });

  let longestServing=null;
  players.forEach(p => {
    if (!p.joined) return;
    const dep = getDepartureDate(p);
    const end = dep ? new Date(dep) : new Date();
    const start = new Date(p.joined);
    if (end < start) return;
    const years = (end - start) / 31557600000;
    if (!longestServing || years > longestServing.years) longestServing = {player:p, years};
  });

  let mostAppearances=null, mostGoals=null, mostAssists=null;
  players.forEach(p => {
    const stats = calcPlayerStats(p.id, null, null); // null = alle seizoenen samen
    if (!mostAppearances || stats.appearances > mostAppearances.stats.appearances) mostAppearances = {player:p, stats};
    if (!mostGoals || stats.goals > mostGoals.stats.goals) mostGoals = {player:p, stats};
    if (!mostAssists || stats.assists > mostAssists.stats.assists) mostAssists = {player:p, stats};
  });

  const playerLink = p => `<span style="cursor:pointer;text-decoration:underline;text-decoration-style:dotted" onclick="navigateToPlayer('${p.id}')">${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</span>`;
  const fmtYears = y => y>=1 ? `${y.toFixed(1)} jaar` : `${Math.round(y*12)} maanden`;

  const card = (icon, title, valueHtml, subHtml) => `<div class="card">
    <div class="card-title">${icon} ${title}</div>
    ${valueHtml ? `<div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;margin:4px 0">${valueHtml}</div>` : ''}
    <div style="font-size:12px;color:var(--text-muted)">${subHtml}</div>
  </div>`;

  const cards = [];
  cards.push(card('💰','Duurste aankoop', biggestBuy?formatEuro(biggestBuy.amount):'—',
    biggestBuy?`${playerLink(biggestBuy.player)}${biggestBuy.info.club?' van '+biggestBuy.info.club:''}`:'Nog geen aankoopbedragen bekend'));
  cards.push(card('💸','Duurste verkoop', biggestSell?formatEuro(biggestSell.amount):'—',
    biggestSell?`${playerLink(biggestSell.player)}${biggestSell.info.club?' naar '+biggestSell.info.club:''}`:'Nog geen verkoopbedragen bekend'));
  cards.push(card('👶','Jongste debutant', youngestDebut?youngestDebut.age.toFixed(1)+' jaar':'—',
    youngestDebut?`${playerLink(youngestDebut.player)} op ${new Date(youngestDebut.match.date).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'})}`:'Nog geen debuten bekend'));
  cards.push(card('👴','Oudste debutant', oldestDebut?oldestDebut.age.toFixed(1)+' jaar':'—',
    oldestDebut?`${playerLink(oldestDebut.player)} op ${new Date(oldestDebut.match.date).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'})}`:'Nog geen debuten bekend'));
  cards.push(card('⏳','Langst actief', longestServing?fmtYears(longestServing.years):'—',
    longestServing?playerLink(longestServing.player):'Nog geen dienstverbanden bekend'));
  cards.push(card('🎽','Meeste wedstrijden', mostAppearances&&mostAppearances.stats.appearances>0?mostAppearances.stats.appearances+'x':'—',
    mostAppearances&&mostAppearances.stats.appearances>0?playerLink(mostAppearances.player):'Nog geen wedstrijddata'));
  cards.push(card('⚽','Meeste doelpunten', mostGoals&&mostGoals.stats.goals>0?mostGoals.stats.goals+'x':'—',
    mostGoals&&mostGoals.stats.goals>0?playerLink(mostGoals.player):'Nog geen doelpunten bekend'));
  cards.push(card('🎯','Meeste assists', mostAssists&&mostAssists.stats.assists>0?mostAssists.stats.assists+'x':'—',
    mostAssists&&mostAssists.stats.assists>0?playerLink(mostAssists.player):'Nog geen assists bekend'));
  cards.push((() => {
    if (!bestAttended) return card('🎟️','Best bezochte wedstrijd', '—', 'Nog geen toeschouwersaantallen ingevuld');
    const home = S.clubs.find(c=>c.id===bestAttended.homeClubId), away = S.clubs.find(c=>c.id===bestAttended.awayClubId);
    return `<div class="card" style="cursor:pointer" onclick="navigateToMatch('${bestAttended.id}')">
      <div class="card-title">🎟️ Best bezochte wedstrijd</div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;margin:4px 0">${bestAttended.attendance.toLocaleString('nl-NL')}</div>
      <div style="font-size:12px;color:var(--text-muted)">${home?.name||'?'} - ${away?.name||'?'} (${new Date(bestAttended.date).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'})})</div>
    </div>`;
  })());
  cards.push((() => {
    if (!bestSingleMatchGoals) return card('⚽','Meeste doelpunten in 1 wedstrijd', '—', 'Nog geen doelpunten geregistreerd');
    const home = S.clubs.find(c=>c.id===bestSingleMatchGoals.match.homeClubId), away = S.clubs.find(c=>c.id===bestSingleMatchGoals.match.awayClubId);
    return `<div class="card" style="cursor:pointer" onclick="navigateToMatch('${bestSingleMatchGoals.match.id}')">
      <div class="card-title">⚽ Meeste doelpunten in 1 wedstrijd</div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;margin:4px 0">${bestSingleMatchGoals.count}</div>
      <div style="font-size:12px;color:var(--text-muted)">${playerLink(bestSingleMatchGoals.player)} · ${home?.name||'?'} - ${away?.name||'?'} (${bestSingleMatchGoals.match.date?new Date(bestSingleMatchGoals.match.date).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'}):'?'})</div>
    </div>`;
  })());
  cards.push((() => {
    if (!biggestComeback) return card('🔄','Grootste comeback', '—', 'Nog geen wedstrijd met minuutregistratie waarin een achterstand werd rechtgezet');
    const home = S.clubs.find(c=>c.id===biggestComeback.match.homeClubId), away = S.clubs.find(c=>c.id===biggestComeback.match.awayClubId);
    return `<div class="card" style="cursor:pointer" onclick="navigateToMatch('${biggestComeback.match.id}')">
      <div class="card-title">🔄 Grootste comeback</div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;margin:4px 0">-${biggestComeback.deficit} → ${biggestComeback.finalCam}-${biggestComeback.finalOpp}</div>
      <div style="font-size:12px;color:var(--text-muted)">${home?.name||'?'} - ${away?.name||'?'} (${biggestComeback.match.date?new Date(biggestComeback.match.date).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'}):'?'})</div>
    </div>`;
  })());

  el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">${cards.join('')}</div>`;
}
