// BASISELF — simpele aanvinklijst
// ══════════════════════════════
let matchStarters = new Set(); // set of playerIds

function renderLineupList() {
  const el = document.getElementById('mm-lineup-list');
  if (!el) return;
  const players = (S.players||[]);
  const groups = [
    {label:'Aanvallers', key:'Aanvaller'},
    {label:'Middenvelders', key:'Middenvelder'},
    {label:'Verdedigers', key:'Verdediger'},
    {label:'Keepers', key:'Keeper'},
  ];
  const groupOrder = {Aanvaller:0, Middenvelder:1, Verdediger:2, Keeper:3};
  let html = '';
  groups.forEach(g => {
    const gPlayers = players
      .filter(p => p.position === g.key)
      .sort((a,b) => (a.number||99)-(b.number||99));
    if (!gPlayers.length) return;
    html += `<div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;padding:6px 0 3px;border-bottom:1px solid var(--border-light);margin-bottom:4px">${g.label}</div>`;
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:10px">`;
    gPlayers.forEach(p => {
      const isStarter = matchStarters.has(p.id);
      const count = matchStarters.size;
      html += `<label style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:4px;cursor:pointer;
        background:${isStarter?'rgba(245,197,0,0.08)':'transparent'};
        border:1px solid ${isStarter?'var(--cambuur-geel)':'var(--border)'};
        transition:all 0.1s">
        <input type="checkbox" ${isStarter?'checked':''} ${!isStarter&&count>=11?'disabled':''} style="accent-color:var(--cambuur-geel);flex-shrink:0"
          onchange="toggleStarter('${p.id}',this.checked)">
        <span style="font-weight:700;color:var(--cambuur-geel);min-width:24px;font-size:12px">${p.number?'#'+p.number:''}</span>
        <span style="font-size:13px;color:var(--text-primary);font-weight:${isStarter?'600':'400'}">${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</span>
      </label>`;
    });
    html += '</div>';
  });
  el.innerHTML = html;
  const cnt = document.getElementById('mm-starter-count');
  if (cnt) cnt.textContent = `(${matchStarters.size}/11)`;
}

function toggleStarter(playerId, checked) {
  if (checked && matchStarters.size >= 11) return;
  if (checked) matchStarters.add(playerId);
  else matchStarters.delete(playerId);
  renderLineupList();
}

async function saveDefaultXI() {
  if (matchStarters.size === 0) { showToast('Selecteer eerst spelers', 'error'); return; }
  await dbPut('settings', {key:'defaultXI', value: JSON.stringify([...matchStarters])});
  showToast('Standaard XI opgeslagen', 'success');
}

async function loadDefaultXI() {
  try {
    const row = await dbGet('settings', 'defaultXI');
    if (!row?.value) { showToast('Nog geen standaard XI opgeslagen', 'error'); return; }
    const ids = JSON.parse(row.value);
    matchStarters = new Set(ids);
    renderLineupList();
    showToast('Standaard XI geladen', 'success');
  } catch(e) { showToast('Fout bij laden', 'error'); }
}

// ══════════════════════════════
// WISSELS — ketenweergave
// ══════════════════════════════
function addSub() {
  matchSubs.push({minute:null, playerOutId:'', playerInId:''});
  renderSubsList();
}

function renderSubsList() {
  const wrap = document.getElementById('mm-subs-list');
  if (!wrap) return;
  if (!matchSubs.length) {
    wrap.innerHTML = '<p style="font-size:12px;color:var(--text-muted);padding:4px 0">Nog geen wissels.</p>';
    return;
  }

  const players = (S.players||[]);
  const groupOrder = {Aanvaller:0, Middenvelder:1, Verdediger:2, Keeper:3};
  const sorted = [...players].sort((a,b) => {
    const ag = groupOrder[a.position]??4, bg = groupOrder[b.position]??4;
    return ag-bg || (a.number||99)-(b.number||99);
  });

  const playerOpts = (excludeId, selectedId) =>
    `<option value="">— Speler —</option>` +
    sorted.map(p => `<option value="${p.id}"
      ${p.id===selectedId?'selected':''}
      ${p.id===excludeId?'disabled style="opacity:0.4"':''}>
      ${p.number?'#'+p.number+' ':''}${p.firstname?p.firstname[0]+'. ':''}${p.lastname}
    </option>`).join('');

  // Build substitution chains
  // For each sub, show: out → in, with chain if in was later subbed out
  wrap.innerHTML = matchSubs.map((s, i) => {
    const outPlayer = players.find(p=>p.id===s.playerOutId);
    const inPlayer  = players.find(p=>p.id===s.playerInId);
    return `<div style="display:grid;grid-template-columns:56px 1fr auto 1fr 32px;gap:6px;align-items:center;margin-bottom:6px">
      <input class="form-input" type="number" min="1" max="120" value="${s.minute||''}" placeholder="Min"
        oninput="matchSubs[${i}].minute=parseInt(this.value)||null;renderTimeline()"
        style="height:32px;font-size:12px;padding:3px 6px;-moz-appearance:textfield">
      <select class="form-select" onchange="matchSubs[${i}].playerOutId=this.value;renderSubsList()"
        style="height:32px;font-size:12px">
        ${playerOpts(s.playerInId, s.playerOutId)}
      </select>
      <span style="color:var(--text-muted);font-size:14px;text-align:center">→</span>
      <select class="form-select" onchange="matchSubs[${i}].playerInId=this.value;renderSubsList()"
        style="height:32px;font-size:12px">
        ${playerOpts(s.playerOutId, s.playerInId)}
      </select>
      <button class="icon-btn danger" style="height:32px" onclick="matchSubs.splice(${i},1);renderSubsList()">✕</button>
    </div>`;
  }).join('');

  renderTimeline();
}

// ══════════════════════════════
// TIJDLIJN
// ══════════════════════════════
let showTimeline = false;

function toggleTimeline() {
  showTimeline = !showTimeline;
  const wrap = document.getElementById('mm-timeline-wrap');
  if (wrap) wrap.style.display = showTimeline ? 'block' : 'none';
  if (showTimeline) renderTimeline();
}

function renderTimeline() {
  if (!showTimeline) return;
  const el = document.getElementById('mm-timeline');
  if (!el) return;
  const players = S.players||[];
  const pName = id => {
    const p = players.find(x=>x.id===id);
    return p ? (p.number?'#'+p.number+' ':'')+(p.firstname?p.firstname[0]+'. ':'')+p.lastname : '?';
  };

  const events = [
    ...matchGoals.filter(g=>g.minute).map(g=>({
      min:g.minute, type:'goal',
      label:`⚽ ${g.minute}' ${pName(g.playerId)}${g.assistId?' (assist: '+pName(g.assistId)+')':''}${g.goalType==='eigen'?' (eigen doelpunt)':''}`
    })),
    ...matchCards.filter(c=>c.minute).map(c=>({
      min:c.minute, type:'card',
      label:`${c.cardType==='rood'?'🟥':'🟨'} ${c.minute}' ${pName(c.playerId)}`
    })),
    ...matchSubs.filter(s=>s.minute).map(s=>({
      min:s.minute, type:'sub',
      label:`↕ ${s.minute}' ${pName(s.playerOutId)} → ${pName(s.playerInId)}`
    })),
  ].sort((a,b)=>a.min-b.min);

  if (!events.length) {
    el.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">Nog geen gebeurtenissen met minuten.</p>';
    return;
  }

  el.innerHTML = events.map(e=>`
    <div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid var(--border-light)">
      <span style="font-size:12px;color:var(--text-muted);min-width:32px">${e.min}'</span>
      <span style="font-size:13px">${e.label}</span>
    </div>`).join('');
}


// ══════════════════════════════
