
// ══════════════════════════════
// NAVIGATION
// ══════════════════════════════
function navigate(page,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const tgt=document.getElementById('page-'+page);if(tgt)tgt.classList.add('active');
  if(el)el.classList.add('active');
  const titles={dashboard:'Dashboard',competitions:'Competities beheren',clubs:'Clubs & Stadions',selectie:'Selectie',statistieken:'Statistieken',vergelijking:'Vergelijking',instellingen:'Instellingen',coaches:'Technische Staf'};
  document.getElementById('topbar-title').textContent=titles[page]||page;
  if(page==='clubs')renderClubsPage();
  if(page==='selectie'){
    if(!S.players)S.players=[];
    window._playerStats = calcAllPlayerStats(S.currentSeason);
    renderSelectie();
  }
  if(page==='statistieken')renderStatistieken();
  if(page==='vergelijking')renderVergelijking();
  if(page==='competitions')renderCompetitionsPage();
  if(page==='instellingen'){renderInstellingen();}
  if(page==='coaches'){renderCoachesPage();}
}
function navigateToComp(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-competition-detail').classList.add('active');
  const ni=document.querySelector(`.nav-item[data-comp="${id}"]`);if(ni)ni.classList.add('active');
  renderCompDetail(id);
}
let collapsed=false;
function toggleSidebar(){collapsed=!collapsed;document.getElementById('sidebar').classList.toggle('collapsed',collapsed);document.getElementById('collapse-btn').textContent=collapsed?'▶':'◀';}
