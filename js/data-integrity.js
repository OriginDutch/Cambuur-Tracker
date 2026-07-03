
// ══════════════════════════════════════════════════════
// DATA-INTEGRITEIT CONTROLE
// ══════════════════════════════════════════════════════
// Scant op weesdata (verwijzingen naar verwijderde records) die door het
// ontbreken van cascade-deletes kunnen ontstaan. Toont alleen — verandert
// niets zonder expliciete bevestiging per categorie.

function runDataIntegrityCheck() {
  const el = document.getElementById('integrity-check-result');
  if (!el) return;
  el.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">Bezig met scannen...</p>';

  const matches = S.matches||[];
  const players = S.players||[];
  const coaches = S.coaches||[];
  const clubs = S.clubs||[];
  const competitions = S.competitions||[];
  const seasons = S.seasons||[];

  const compIds = new Set(competitions.map(c=>c.id));
  const seasonIds = new Set(seasons.map(s=>s.id));
  const playerIds = new Set(players.map(p=>p.id));
  const coachIds = new Set(coaches.map(c=>c.id));
  const clubIds = new Set(clubs.map(c=>c.id));

  // 1. Weeswedstrijden — verwijzen naar een competitie die niet meer bestaat
  const orphanMatches = matches.filter(m => m.competitionId && !compIds.has(m.competitionId));

  // 2. Competities die naar een niet-bestaand seizoen verwijzen
  const orphanComps = competitions.filter(c => c.seasonId && !seasonIds.has(c.seasonId));

  // 3. Wedstrijden met een coachId die niet meer bestaat
  const danglingCoachMatches = matches.filter(m => m.coachId && !coachIds.has(m.coachId));

  // 4. Wedstrijden met een homeClubId/awayClubId die niet meer bestaat
  const danglingClubMatches = matches.filter(m =>
    (m.homeClubId && !clubIds.has(m.homeClubId)) || (m.awayClubId && !clubIds.has(m.awayClubId))
  );

  // 5. Wedstrijden met verwijzingen naar spelers die niet meer bestaan
  //    (basisself, doelpunten/assists/kaarten/wissels, MOTM, keeper-saves)
  const danglingPlayerMatches = matches.filter(m => {
    const ids = [];
    (m.lineup||[]).forEach(id=>ids.push(id));
    (m.events||[]).forEach(e=>{
      if (e.playerId && e.playerId!=='__opp__' && e.playerId!=='__opp_own__') ids.push(e.playerId);
      if (e.assistId) ids.push(e.assistId);
      if (e.playerOutId) ids.push(e.playerOutId);
      if (e.playerInId) ids.push(e.playerInId);
    });
    if (m.motm) ids.push(m.motm);
    Object.keys(m.keeperSaves||{}).forEach(id=>ids.push(id));
    return ids.some(id => id && !playerIds.has(id));
  });

  const oppName = m => {
    const cam = S.clubs.find(c=>c.isOwnClub);
    const isCamHome = m.homeClubId===cam?.id;
    const oppClub = S.clubs.find(c=>c.id===(isCamHome?m.awayClubId:m.homeClubId));
    return oppClub?.name || (isCamHome?m.awayName:m.homeName) || m.homeName || m.awayName || '?';
  };
  const matchLine = m => `${m.date||'datum onbekend'} — ${oppName(m)}`;

  const issues = [
    {
      key:'orphanMatches', icon:'👻',
      label:'Weeswedstrijden', desc:'Verwijzen naar een competitie die niet meer bestaat (vaak overgebleven na het verwijderen van een seizoen).',
      items: orphanMatches, renderItem: m => matchLine(m), linkable: false,
      fixLabel: `${orphanMatches.length} weeswedstrijd${orphanMatches.length!==1?'en':''} verwijderen`,
      fix: async () => {
        for (const m of orphanMatches) await dbDel('matches', m.id);
        S.matches = (S.matches||[]).filter(m => !orphanMatches.includes(m));
      },
    },
    {
      key:'orphanComps', icon:'👻',
      label:'Weescompetities', desc:'Verwijzen naar een seizoen dat niet meer bestaat.',
      items: orphanComps, renderItem: c => c.name||c.id, linkable: false,
      fixLabel: `${orphanComps.length} weescompetitie${orphanComps.length!==1?'s':''} verwijderen`,
      fix: async () => {
        for (const c of orphanComps) await dbDel('competitions', c.id);
        S.competitions = (S.competitions||[]).filter(c => !orphanComps.includes(c));
      },
    },
    {
      key:'danglingCoach', icon:'🧑‍💼',
      label:'Wedstrijden met een verwijderde coach', desc:'De gekoppelde coach bestaat niet meer. Kan veilig losgekoppeld worden — de wedstrijd zelf blijft intact.',
      items: danglingCoachMatches, renderItem: m => matchLine(m), linkable: true,
      fixLabel: `Coach-koppeling verwijderen bij ${danglingCoachMatches.length} wedstrijd${danglingCoachMatches.length!==1?'en':''}`,
      fix: async () => {
        for (const m of danglingCoachMatches) { m.coachId = null; await dbPut('matches', m); }
      },
    },
    {
      key:'danglingClub', icon:'🏟️',
      label:'Wedstrijden met een verwijderde club', desc:'Thuis- of uitclub bestaat niet meer. Dit los ik niet automatisch op — controleer deze wedstrijden handmatig.',
      items: danglingClubMatches, renderItem: m => matchLine(m), linkable: true,
      fixLabel: null, fix: null,
    },
    {
      key:'danglingPlayer', icon:'🏃',
      label:'Wedstrijden met verwijzingen naar verwijderde spelers', desc:'Basisself, doelpunten, kaarten, wissels, MOTM of keeper-saves verwijzen naar een speler die niet meer bestaat. Dit los ik niet automatisch op — historische gebeurtenissen wil je waarschijnlijk zelf beoordelen.',
      items: danglingPlayerMatches, renderItem: m => matchLine(m), linkable: true,
      fixLabel: null, fix: null,
    },
  ];

  const totalIssues = issues.reduce((sum,i)=>sum+i.items.length, 0);

  if (totalIssues === 0) {
    el.innerHTML = `<div style="padding:10px 12px;background:rgba(34,197,94,0.08);border:1px solid var(--win);border-radius:var(--radius-sm);font-size:13px;color:var(--win)">✓ Geen problemen gevonden — de data is consistent.</div>`;
    return;
  }

  window._integrityIssues = issues; // voor de fix-knoppen

  el.innerHTML = issues.filter(i=>i.items.length>0).map(issue => `
    <div class="card" style="margin-bottom:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div style="font-weight:700;font-size:13px">${issue.icon} ${issue.label} <span style="color:var(--loss)">(${issue.items.length})</span></div>
        ${issue.fix ? `<button class="btn btn-ghost" style="font-size:11px;color:var(--loss)" onclick="applyIntegrityFix('${issue.key}')">🧹 ${issue.fixLabel}</button>` : ''}
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${issue.desc}</div>
      <details>
        <summary style="cursor:pointer;font-size:11px;color:var(--text-secondary)">Toon details</summary>
        <div style="padding:6px 0 0 12px;display:flex;flex-direction:column;gap:3px;max-height:180px;overflow-y:auto">
          ${issue.items.slice(0,50).map(item => {
            const label = issue.renderItem(item);
            const canLink = issue.linkable && item.id;
            return `<div style="font-size:11px;color:var(--text-muted);${canLink?'cursor:pointer':''}" ${canLink?`onclick="navigateToMatch('${item.id}')"`:''}>${label}</div>`;
          }).join('')}
          ${issue.items.length>50?`<div style="font-size:11px;color:var(--text-muted);font-style:italic">... en ${issue.items.length-50} meer</div>`:''}
        </div>
      </details>
    </div>
  `).join('');
}

async function applyIntegrityFix(key) {
  const issue = (window._integrityIssues||[]).find(i => i.key === key);
  if (!issue || !issue.fix) return;
  if (!confirm(`${issue.fixLabel}?\n\nDit kan niet ongedaan worden gemaakt.`)) return;
  await issue.fix();
  showToast('Opgeschoond', 'success');
  runDataIntegrityCheck();
  renderDashboard();
}
