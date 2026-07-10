// ══════════════════════════════════════════════════════
// UI-CORE — generieke, overal gebruikte UI-primitieven
// ══════════════════════════════════════════════════════
// showToast/closeModal/applyTheme/refreshAll etc. — gebruikt door
// vrijwel elk ander bestand. Vroeg geladen, geen afhankelijkheden.

// ══════════════════════════════
// THEME / LANG
// ══════════════════════════════
function applyTheme(t){document.documentElement.setAttribute('data-theme',t);}
async function setTheme(t){S.theme=t;applyTheme(t);await saveSetting('theme',t);}

// Past de paginatitel en het zijbalk-logo aan op de ingestelde eigen club —
// zodat de clubnaam nergens hardgecodeerd hoeft te blijven staan voor wie de
// tracker voor een andere club gebruikt.
function applyClubBranding() {
  const club = (S.clubs||[]).find(c=>c.isOwnClub);
  const name = club?.name || 'Club';
  const abbr = (club?.abbr || name).slice(0,2).toUpperCase();
  document.title = club ? `${name} — Seizoenstracker` : 'Seizoenstracker';
  const sidebarBadge = document.getElementById('sidebar-badge');
  const sidebarTitleClub = document.getElementById('sidebar-title-club');
  if (sidebarBadge) sidebarBadge.textContent = abbr;
  if (sidebarTitleClub) sidebarTitleClub.textContent = name;
}

async function setLanguage(lang){S.lang=lang;await saveSetting('lang',lang);}


// ══════════════════════════════
// REFRESH ALL
// ══════════════════════════════
function refreshAll(){
  renderSeasonSelect();
  renderCompetitionsNav();
  renderDashboard();
  renderSeasonsManage();
  renderCompetitionsPage();
  // If we're on the clubs page, refresh that too
  if(document.getElementById('page-clubs').classList.contains('active'))renderClubsPage();
  if(document.getElementById('page-selectie').classList.contains('active')){
    renderSelectie();
    if(document.getElementById('selectie-jeugd')?.style.display==='block')renderJeugd();
    if(document.getElementById('selectie-archief')?.style.display==='block')renderArchief();
  }
  if(document.getElementById('page-statistieken').classList.contains('active'))renderStatistieken();
  if(document.getElementById('page-coaches')?.classList.contains('active'))renderCoachesPage();
  if(document.getElementById('page-vergelijking')?.classList.contains('active'))renderVergelijking();
  // If we're on a competition detail, refresh it
  const activeComp=document.querySelector('.nav-item[data-comp].active');
  if(activeComp)renderCompDetail(activeComp.dataset.comp);
  // Update season select value
  document.getElementById('season-select').value=S.currentSeason||'';
}

// ══════════════════════════════
// TOAST / MODAL
// ══════════════════════════════
function showToast(msg,type='success'){
  const c=document.getElementById('toast-container');const t=document.createElement('div');
  t.className=`toast ${type}`;t.textContent=(type==='success'?'✓ ':'✕ ')+msg;
  c.appendChild(t);setTimeout(()=>t.remove(),3200);
}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));});
document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));
