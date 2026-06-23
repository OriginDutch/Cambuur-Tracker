
// ══════════════════════════════
// SETUP WIZARD
// ══════════════════════════════
let swStep=1,swStadCount=0,swClubCount=0;
function initWizard(){
  swStep=1;swStadCount=0;swClubCount=0;
  document.getElementById('sw-stad-rows').innerHTML='';
  document.getElementById('sw-club-rows').innerHTML='';
  swAddStadRow();swAddStadRow();
  swAddClubRow();swAddClubRow();swAddClubRow();
  swUpdateTabs();
}
function swUpdateTabs(){
  document.querySelectorAll('.setup-step-content').forEach((e,i)=>e.classList.toggle('active',i+1===swStep));
  document.querySelectorAll('.setup-step-tab').forEach((e,i)=>{e.classList.remove('active','done');if(i+1===swStep)e.classList.add('active');else if(i+1<swStep)e.classList.add('done');});
}
function swNext(step){
  if(step===1){const n=document.getElementById('sw-season-name').value.trim();if(!n){showToast('Voer een seizoensnaam in','error');return;}swStep=2;}
  else if(step===2){const n=document.getElementById('sw-own-stad-name').value.trim();if(!n){showToast('Voer de naam van jullie stadion in','error');return;}swStep=3;swRefreshStadSelects();}
  else if(step===3){swStep=4;swPopulateCompClubs();}
  swUpdateTabs();
}
function swBack(step){swStep=step-1;swUpdateTabs();}

function swAddStadRow(){
  swStadCount++;
  const id='swr-'+swStadCount;
  const d=document.createElement('div');d.id=id;d.className='stad-row';
  d.innerHTML=`<input placeholder="" data-role="sname" style="background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);padding:5px 8px;border-radius:var(--radius-sm);font-size:12px;font-family:'Inter',sans-serif;width:100%">
    <input placeholder="" data-role="scity" style="background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);padding:5px 8px;border-radius:var(--radius-sm);font-size:12px;font-family:'Inter',sans-serif;width:100%">
    <input type="number" placeholder="" data-role="scap" style="background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);padding:5px 8px;border-radius:var(--radius-sm);font-size:12px;font-family:'Inter',sans-serif;width:100%">
    <button class="remove-row-btn" onclick="document.getElementById('${id}').remove();swRefreshStadSelects()">✕</button>`;
  d.querySelector('[data-role="sname"]').addEventListener('input',swRefreshStadSelects);
  document.getElementById('sw-stad-rows').appendChild(d);
}
function swAddClubRow(){
  swClubCount++;
  const id='cwr-'+swClubCount;
  const d=document.createElement('div');d.id=id;d.className='club-row';
  d.innerHTML=`<input placeholder="" data-role="cname" style="background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);padding:5px 8px;border-radius:var(--radius-sm);font-size:12px;font-family:'Inter',sans-serif;width:100%">
    <input placeholder="" data-role="cabbr" maxlength="4" style="background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);padding:5px 8px;border-radius:var(--radius-sm);font-size:12px;font-family:'Inter',sans-serif;width:100%">
    <input placeholder="" data-role="ccity" style="background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);padding:5px 8px;border-radius:var(--radius-sm);font-size:12px;font-family:'Inter',sans-serif;width:100%">
    <select data-role="cstad" style="background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);padding:5px 8px;border-radius:var(--radius-sm);font-size:12px;font-family:'Inter',sans-serif;width:100%"><option value="">— Later —</option></select>
    <button class="remove-row-btn" onclick="document.getElementById('${id}').remove()">✕</button>`;
  document.getElementById('sw-club-rows').appendChild(d);
  swRefreshStadSelects();
}
function swRefreshStadSelects(){
  const ownName=document.getElementById('sw-own-stad-name').value.trim();
  const stadNames=[...document.querySelectorAll('#sw-stad-rows [data-role="sname"]')].map(i=>i.value.trim()).filter(Boolean);
  document.querySelectorAll('[data-role="cstad"]').forEach(sel=>{
    const cur=sel.value;
    sel.innerHTML='<option value="">— Later —</option>';
    if(ownName){const o=document.createElement('option');o.value='__own__';o.textContent=ownName+' (eigen stadion)';sel.appendChild(o);}
    stadNames.forEach(n=>{const o=document.createElement('option');o.value=n;o.textContent=n;sel.appendChild(o);});
    if([...sel.options].some(o=>o.value===cur))sel.value=cur;
  });
}
function swPopulateCompClubs(){
  const names=['SC Cambuur',...[...document.querySelectorAll('#sw-club-rows [data-role="cname"]')].map(i=>i.value.trim()).filter(Boolean)];
  document.getElementById('sw-comp-clubs').innerHTML=names.map(n=>`
    <label style="display:flex;align-items:center;gap:6px;padding:5px 6px;cursor:pointer;border-radius:3px;font-size:12px" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
      <input type="checkbox" value="${n}" checked style="accent-color:var(--cambuur-geel)">
      <span>${n}</span>${n==='SC Cambuur'?'<span class="badge badge-active" style="font-size:9px">Eigen</span>':''}
    </label>`).join('');
}
function swUpdateCompType(){
  const t=document.getElementById('sw-comp-type').value;
  document.getElementById('sw-comp-clubs-wrap').style.display=t==='beker'?'none':'block';
  document.getElementById('sw-comp-rounds-wrap').style.display=t==='beker'?'block':'none';
}

async function swFinish(){
  const compName=document.getElementById('sw-comp-name').value.trim();
  if(!compName){showToast('Voer een competitienaam in','error');return;}
  const ts=()=>Date.now()+'_'+Math.random().toString(36).slice(2,6);

  // Own stadium
  const ownStadId='stadium_own_'+ts();
  const ownStad={id:ownStadId,name:document.getElementById('sw-own-stad-name').value.trim(),city:document.getElementById('sw-own-stad-city').value.trim(),capacity:parseInt(document.getElementById('sw-own-stad-cap').value)||null};
  await dbPut('stadiums',ownStad);S.stadiums.push(ownStad);

  // Extra stadiums
  const stadMap={'__own__':ownStadId};
  for(const row of document.querySelectorAll('#sw-stad-rows .stad-row')){
    const name=row.querySelector('[data-role="sname"]')?.value.trim();if(!name)continue;
    const sid='stadium_'+ts();
    const stad={id:sid,name,city:row.querySelector('[data-role="scity"]')?.value.trim()||'',capacity:parseInt(row.querySelector('[data-role="scap"]')?.value)||null};
    await dbPut('stadiums',stad);S.stadiums.push(stad);stadMap[name]=sid;
  }

  // Cambuur club
  const cambuurId='club_cambuur';
  const cambuurClub={id:cambuurId,name:'SC Cambuur',abbr:'CAM',city:ownStad.city||'',stadiumId:ownStadId,highlight:'',note:'',isOwnClub:true};
  await dbPut('clubs',cambuurClub);S.clubs=S.clubs.filter(c=>c.id!==cambuurId);S.clubs.push(cambuurClub);
  const savedIds=[cambuurId];

  // Opponent clubs
  for(const row of document.querySelectorAll('#sw-club-rows .club-row')){
    const name=row.querySelector('[data-role="cname"]').value.trim();if(!name)continue;
    const stadVal=row.querySelector('[data-role="cstad"]').value;
    const cid='club_'+ts();
    const club={id:cid,name,abbr:row.querySelector('[data-role="cabbr"]').value.trim().toUpperCase(),city:row.querySelector('[data-role="ccity"]').value.trim(),stadiumId:stadMap[stadVal]||null,highlight:'',note:'',isOwnClub:false};
    await dbPut('clubs',club);S.clubs.push(club);savedIds.push(cid);
  }

  // Season
  const seasonId='season_'+ts();
  const season={id:seasonId,name:document.getElementById('sw-season-name').value.trim(),year:parseInt(document.getElementById('sw-season-year').value)||2026,created:Date.now()};
  await dbPut('seasons',season);S.seasons.push(season);
  S.currentSeason=seasonId;await saveSetting('currentSeason',seasonId);

  // Competition
  const compType=document.getElementById('sw-comp-type').value;
  const compId='comp_'+ts();
  let clubIds=savedIds;
  if(compType!=='beker'){
    // Map checked names to club IDs, deduplicate
    const checkedIds=[...document.querySelectorAll('#sw-comp-clubs input:checked')].map(cb=>{const club=S.clubs.find(c=>c.name===cb.value);return club?.id;}).filter(Boolean);
    clubIds=[...new Set(checkedIds)];
  }
  const rounds=compType==='beker'?document.getElementById('sw-comp-rounds').value.split(',').map(r=>r.trim()).filter(Boolean):[];
  await dbPut('competitions',{id:compId,name:compName,type:compType,seasonId,clubIds,rounds,created:Date.now()});
  S.competitions.push({id:compId,name:compName,type:compType,seasonId,clubIds,rounds,created:Date.now()});

  S.seasons.sort((a,b)=>{ if(a.sortOrder!=null&&b.sortOrder!=null)return a.sortOrder-b.sortOrder; if(a.sortOrder!=null)return -1; if(b.sortOrder!=null)return 1; const ay=parseInt(a.name?.match(/^(\d{4})/)?.[1]||a.year||0); const by=parseInt(b.name?.match(/^(\d{4})/)?.[1]||b.year||0); return by-ay; });
  renderSeasonSelect();renderCompetitionsNav();renderDashboard();renderSeasonsManage();
  document.getElementById('setup-overlay').classList.remove('open');
  showToast('Welkom bij Cambuur Tracker! 🎉','success');
}
