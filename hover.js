
// ══════════════════════════════════════════════════════
// HOVER POPUP
// ══════════════════════════════════════════════════════

let _hoverTimer = null;
const _popup = () => document.getElementById('player-hover-popup');

function playerHoverShow(event, id) {
  clearTimeout(_hoverTimer);
  // Capture position BEFORE setTimeout (event.currentTarget becomes null after)
  const anchor = event.currentTarget || event.target;
  const rect = anchor.getBoundingClientRect();
  _hoverTimer = setTimeout(() => {
    const p = (S.players||[]).find(x=>x.id===id);
    if (!p) return;
    const allStats = window._playerStats || calcAllPlayerStats(S.currentSeason);
    const st = allStats[id] || {};
    const age = p.dob ? Math.floor((Date.now()-new Date(p.dob))/31557600000) : null;
    const latestVal = p.valueHistory?.length ? p.valueHistory[0].amount : null;
    const pop = _popup();
    if (!pop) return;
    const flag = typeof natFlag === 'function' ? natFlag(p.nationality) : '';
    pop.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
        <div style="width:44px;height:44px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--cambuur-geel);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:16px;color:var(--cambuur-blauw)">
          ${p.photo?`<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover">`:`${initials(p.firstname||'',p.lastname||'')}`}
        </div>
        <div>
          <div style="font-weight:700;font-size:13px">${p.number?'#'+p.number+' ':''} ${p.firstname?p.firstname[0]+'. ':''}${p.lastname}</div>
          <div style="font-size:11px;color:var(--text-muted)">${p.position||''}${age?' · '+age+' jaar':''}</div>
          ${p.nationality?`<div style="font-size:11px;color:var(--text-muted)">${flag}${p.nationality}</div>`:''}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;text-align:center;border-top:1px solid var(--border-light);padding-top:8px">
        <div><div style="font-size:16px;font-weight:800">${st.appearances||0}</div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase">Wedstr.</div></div>
        <div><div style="font-size:16px;font-weight:800;color:var(--cambuur-geel)">${st.goals||0}</div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase">Goals</div></div>
        <div><div style="font-size:16px;font-weight:800">${st.assists||0}</div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase">Assists</div></div>
        ${p.position==='Keeper'?`<div style="grid-column:1/-1"><div style="font-size:13px;font-weight:700">${st.cleanSheets||0}</div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase">Clean sheets</div></div>`:''}
      </div>
      ${latestVal?`<div style="border-top:1px solid var(--border-light);margin-top:8px;padding-top:6px;font-size:11px;color:var(--text-muted)">Marktwaarde: <strong style="color:var(--text-primary)">${formatEuro(latestVal)}</strong></div>`:''}
    `;
    // Position popup
    let left = rect.right + 10;
    let top = rect.top;
    if (left + 260 > window.innerWidth) left = rect.left - 268;
    if (top + 220 > window.innerHeight) top = window.innerHeight - 228;
    pop.style.left = Math.max(8, left) + 'px';
    pop.style.top = Math.max(8, top) + 'px';
    pop.style.opacity = '1';
  }, 400);
}

function playerHoverHide() {
  clearTimeout(_hoverTimer);
  const pop = _popup();
  if (pop) pop.style.opacity = '0';
}

