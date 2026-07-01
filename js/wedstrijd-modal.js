// WEDSTRIJD-GERELATEERDE TOOLS (import, stats, instellingen)
// ══════════════════════════════
// NB: de losse 'wedstrijd invoeren'-modal (Basisself/Doelpunten/Kaarten/
// Wissels in een popup) en de veld-gebaseerde Opstelling-tab met formaties/
// loadouts zijn hier bewust verwijderd — beide waren dode code, nergens meer
// aan de live UI gekoppeld. De daadwerkelijke wedstrijdinvoer gebeurt via de
// volledige pagina in wedstrijd-page.js (navigateToMatch).


// ══════════════════════════════
// PDF / MATCH IMPORT
// ══════════════════════════════
let parsedPdfMatches = [];
let manualMatchQueue = [];

function openMatchImport(compId, defaultTab) {
  parsedPdfMatches = [];
  manualMatchQueue = [];
  document.getElementById('pdf-preview').style.display = 'none';
  document.getElementById('pdf-parse-status').textContent = '';
  document.getElementById('pdf-matches-list').innerHTML = '';
  document.getElementById('import-confirm-btn').style.display = 'none';
  document.getElementById('manual-add-btn').style.display = 'none';
  document.getElementById('manual-save-btn').style.display = 'none';
  document.getElementById('manual-matches-queue').innerHTML = '';

  // Populate comp selects
  const compOpts = S.competitions.filter(c=>c.seasonId===S.currentSeason).map(c=>
    `<option value="${c.id}" ${c.id===compId?'selected':''}>${c.name}</option>`).join('');
  document.getElementById('pdf-comp-select').innerHTML = compOpts;
  document.getElementById('manual-match-comp').innerHTML = compOpts;

  // Populate club selects for manual - filtered by competition
  function updateManualClubOpts() {
    const selCompId = document.getElementById('manual-match-comp')?.value;
    const selComp = S.competitions.find(c=>c.id===selCompId);
    const compClubs = selComp?.clubIds?.length
      ? S.clubs.filter(c=>selComp.clubIds.includes(c.id))
      : S.clubs;
    const opts = '<option value="">— Selecteer club —</option>' +
      compClubs.sort((a,b)=>a.name.localeCompare(b.name)).map(c=>
        `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('manual-match-home').innerHTML = opts;
    document.getElementById('manual-match-away').innerHTML = opts;
  }
  document.getElementById('manual-match-comp').onchange = updateManualClubOpts;
  updateManualClubOpts();

  const tabToOpen = defaultTab || 'pdf';
  const tabEl = document.querySelector(`#import-tabs .tab[onclick*="${tabToOpen}"]`) || document.querySelector('#import-tabs .tab');
  switchImportTab(tabToOpen, tabEl);
  document.getElementById('modal-match-import').classList.add('open');
}

function switchImportTab(tab, el) {
  document.getElementById('import-tab-pdf').style.display = tab==='pdf'?'block':'none';
  document.getElementById('import-tab-manual').style.display = tab==='manual'?'block':'none';
  document.getElementById('import-tab-soccer365').style.display = tab==='soccer365'?'block':'none';
  document.querySelectorAll('#import-tabs .tab').forEach(t=>t.classList.remove('active'));
  if(el) el.classList.add('active');
  document.getElementById('import-confirm-btn').style.display = tab==='pdf'&&parsedPdfMatches.length?'block':'none';
  document.getElementById('manual-add-btn').style.display = tab==='manual'?'block':'none';
  document.getElementById('manual-save-btn').style.display = tab==='manual'&&manualMatchQueue.length?'block':'none';
  if (tab==='soccer365') {
    // Populate competition dropdown
    const sel = document.getElementById('s365-comp-sel');
    if (sel) {
      const comps = (S.competitions||[]).filter(c=>c.seasonId===S.currentSeason);
      sel.innerHTML = '<option value="">— Nieuwe competitie aanmaken —</option>' +
        comps.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    }
  }
}

function parsePastedText() {
  const text = document.getElementById('pdf-paste-area').value.trim();
  const status = document.getElementById('pdf-parse-status');
  if (!text) { status.textContent = '⚠ Plak eerst tekst in het veld.'; status.style.color = 'var(--draw)'; return; }

  const result = parseKNVBSchedule(text);
  parsedPdfMatches = result.matches;

  if (parsedPdfMatches.length === 0) {
    status.textContent = '⚠ Geen wedstrijden herkend. Controleer of de tekst het KNVB-formaat heeft (ronde, datum, thuis, uit, tijd).';
    status.style.color = 'var(--draw)';
    return;
  }

  status.textContent = '✓ ' + parsedPdfMatches.length + ' wedstrijden herkend uit ' + result.rounds + ' speelronden';
  status.style.color = 'var(--win)';
  renderPdfPreview(result);
  document.getElementById('pdf-preview').style.display = 'block';
  document.getElementById('import-confirm-btn').style.display = 'block';

  if (result.unrecognized.length) {
    document.getElementById('pdf-unrecognized').style.display = 'block';
    document.getElementById('pdf-unrecognized-list').innerHTML = result.unrecognized.slice(0,20).map(l=>'<div>'+escHtml(l)+'</div>').join('');
  }
}

function loadCurrentSeasonSchedule() {
  // Full Eredivisie 2026/27 schedule embedded as fallback
  const scheduleText = `1 vrijdag 7 augustus 2026 SC Cambuur Excelsior Rotterdam 20:00
1 zaterdag 8 augustus 2026 N.E.C. Telstar 16:30
1 zaterdag 8 augustus 2026 Go Ahead Eagles Willem II 18:45
1 zaterdag 8 augustus 2026 PSV Fortuna Sittard 20:00
1 zaterdag 8 augustus 2026 AZ ADO Den Haag 21:00
1 zondag 9 augustus 2026 Sparta Rotterdam Feyenoord 12:15
1 zondag 9 augustus 2026 FC Groningen FC Utrecht 14:30
1 zondag 9 augustus 2026 PEC Zwolle Ajax 14:30
1 zondag 9 augustus 2026 sc Heerenveen FC Twente 16:45
2 vrijdag 14 augustus 2026 Telstar Sparta Rotterdam 20:00
2 zaterdag 15 augustus 2026 Willem II N.E.C. 16:30
2 zaterdag 15 augustus 2026 FC Utrecht AZ 18:45
2 zaterdag 15 augustus 2026 Excelsior Rotterdam PSV 20:00
2 zaterdag 15 augustus 2026 Fortuna Sittard SC Cambuur 21:00
2 zondag 16 augustus 2026 ADO Den Haag FC Groningen 12:15
2 zondag 16 augustus 2026 Feyenoord Go Ahead Eagles 14:30
2 zondag 16 augustus 2026 FC Twente PEC Zwolle 14:30
2 zondag 16 augustus 2026 Ajax sc Heerenveen 16:45
3 zaterdag 22 augustus 2026 Fortuna Sittard AZ 16:30
3 zaterdag 22 augustus 2026 N.E.C. Excelsior Rotterdam 18:45
3 zaterdag 22 augustus 2026 Sparta Rotterdam FC Utrecht 20:00
3 zaterdag 22 augustus 2026 sc Heerenveen PEC Zwolle 21:00
3 zondag 23 augustus 2026 Go Ahead Eagles ADO Den Haag 12:15
3 zondag 23 augustus 2026 PSV FC Groningen 14:30
3 zondag 23 augustus 2026 SC Cambuur Feyenoord 16:45
4 vrijdag 28 augustus 2026 FC Groningen Fortuna Sittard 20:00
4 zaterdag 29 augustus 2026 Excelsior Rotterdam Sparta Rotterdam 16:30
4 zaterdag 29 augustus 2026 AZ Go Ahead Eagles 18:45
4 zaterdag 29 augustus 2026 PEC Zwolle N.E.C. 21:00
4 zondag 30 augustus 2026 FC Utrecht PSV 12:15
4 zondag 30 augustus 2026 Willem II sc Heerenveen 14:30
4 zondag 30 augustus 2026 Feyenoord ADO Den Haag 14:30
4 zondag 30 augustus 2026 Telstar Ajax 16:45
4 zondag 30 augustus 2026 SC Cambuur FC Twente 20:00
5 vrijdag 4 september 2026 Sparta Rotterdam PEC Zwolle 20:00
5 zaterdag 5 september 2026 N.E.C. Feyenoord 16:30
5 zaterdag 5 september 2026 FC Utrecht Go Ahead Eagles 18:45
5 zaterdag 5 september 2026 Ajax PSV 20:00
5 zaterdag 5 september 2026 Willem II Excelsior Rotterdam 21:00
5 zondag 6 september 2026 FC Groningen FC Twente 12:15
5 zondag 6 september 2026 sc Heerenveen AZ 14:30
5 zondag 6 september 2026 Telstar SC Cambuur 14:30
5 zondag 6 september 2026 ADO Den Haag Fortuna Sittard 16:45
6 vrijdag 11 september 2026 AZ Willem II 20:00
6 zaterdag 12 september 2026 FC Twente ADO Den Haag 16:30
6 zaterdag 12 september 2026 Go Ahead Eagles FC Groningen 18:45
6 zaterdag 12 september 2026 Fortuna Sittard Ajax 20:00
6 zaterdag 12 september 2026 sc Heerenveen Telstar 21:00
6 zondag 13 september 2026 Excelsior Rotterdam FC Utrecht 12:15
6 zondag 13 september 2026 PSV Sparta Rotterdam 14:30
6 zondag 13 september 2026 SC Cambuur N.E.C. 14:30
6 zondag 13 september 2026 PEC Zwolle Feyenoord 16:45
7 vrijdag 18 september 2026 Sparta Rotterdam sc Heerenveen 20:00
7 zaterdag 19 september 2026 ADO Den Haag SC Cambuur 16:30
7 zaterdag 19 september 2026 FC Groningen PEC Zwolle 18:45
7 zaterdag 19 september 2026 Ajax Excelsior Rotterdam 20:00
7 zaterdag 19 september 2026 Willem II Fortuna Sittard 21:00
7 zondag 20 september 2026 Feyenoord FC Utrecht 12:15
7 zondag 20 september 2026 AZ Telstar 14:30
7 zondag 20 september 2026 N.E.C. Go Ahead Eagles 14:30
7 zondag 20 september 2026 FC Twente PSV 16:45
8 zaterdag 10 oktober 2026 PSV sc Heerenveen 16:30
8 zaterdag 10 oktober 2026 Feyenoord AZ 18:45
8 zaterdag 10 oktober 2026 Go Ahead Eagles Sparta Rotterdam 18:45
8 zaterdag 10 oktober 2026 Ajax N.E.C. 21:00
8 zaterdag 10 oktober 2026 Fortuna Sittard FC Twente 21:00
8 zondag 11 oktober 2026 FC Utrecht Willem II 12:15
8 zondag 11 oktober 2026 PEC Zwolle SC Cambuur 14:30
8 zondag 11 oktober 2026 Telstar ADO Den Haag 14:30
8 zondag 11 oktober 2026 Excelsior Rotterdam FC Groningen 16:45
9 vrijdag 16 oktober 2026 sc Heerenveen Excelsior Rotterdam 20:00
9 zaterdag 17 oktober 2026 ADO Den Haag PSV 16:30
9 zaterdag 17 oktober 2026 N.E.C. Fortuna Sittard 18:45
9 zaterdag 17 oktober 2026 Telstar Feyenoord 20:00
9 zaterdag 17 oktober 2026 Sparta Rotterdam Willem II 21:00
9 zondag 18 oktober 2026 PEC Zwolle Go Ahead Eagles 12:15
9 zondag 18 oktober 2026 FC Twente FC Utrecht 14:30
9 zondag 18 oktober 2026 SC Cambuur AZ 14:30
9 zondag 18 oktober 2026 FC Groningen Ajax 16:45
10 vrijdag 23 oktober 2026 Go Ahead Eagles Telstar 20:00
10 zaterdag 24 oktober 2026 FC Utrecht PEC Zwolle 16:30
10 zaterdag 24 oktober 2026 Willem II SC Cambuur 18:45
10 zaterdag 24 oktober 2026 ADO Den Haag sc Heerenveen 21:00
10 zondag 25 oktober 2026 Fortuna Sittard Excelsior Rotterdam 12:15
10 zondag 25 oktober 2026 N.E.C. FC Groningen 14:30
10 zondag 25 oktober 2026 PSV Feyenoord 14:30
10 zondag 25 oktober 2026 Sparta Rotterdam Ajax 16:45
10 zondag 25 oktober 2026 AZ FC Twente 20:00
11 zaterdag 31 oktober 2026 Feyenoord Fortuna Sittard 16:30
11 zaterdag 31 oktober 2026 PSV Willem II 18:45
11 zaterdag 31 oktober 2026 sc Heerenveen N.E.C. 18:45
11 zaterdag 31 oktober 2026 Ajax AZ 21:00
11 zaterdag 31 oktober 2026 SC Cambuur Go Ahead Eagles 21:00
11 zondag 1 november 2026 PEC Zwolle ADO Den Haag 12:15
11 zondag 1 november 2026 Excelsior Rotterdam FC Twente 14:30
11 zondag 1 november 2026 Telstar FC Utrecht 14:30
11 zondag 1 november 2026 FC Groningen Sparta Rotterdam 16:45
12 vrijdag 6 november 2026 Willem II PEC Zwolle 20:00
12 zaterdag 7 november 2026 Fortuna Sittard Telstar 16:30
12 zaterdag 7 november 2026 Excelsior Rotterdam Go Ahead Eagles 18:45
12 zaterdag 7 november 2026 SC Cambuur PSV 20:00
12 zaterdag 7 november 2026 ADO Den Haag Sparta Rotterdam 21:00
12 zondag 8 november 2026 sc Heerenveen Feyenoord 12:15
12 zondag 8 november 2026 FC Twente Ajax 14:30
12 zondag 8 november 2026 FC Utrecht N.E.C. 14:30
12 zondag 8 november 2026 AZ FC Groningen 16:45
13 21 november 2026 Ajax ADO Den Haag
13 21 november 2026 FC Groningen sc Heerenveen
13 21 november 2026 FC Twente Willem II
13 21 november 2026 FC Utrecht SC Cambuur
13 21 november 2026 Feyenoord Excelsior Rotterdam
13 21 november 2026 Go Ahead Eagles Fortuna Sittard
13 21 november 2026 N.E.C. PSV
13 21 november 2026 Sparta Rotterdam AZ
13 21 november 2026 Telstar PEC Zwolle
14 27 november 2026 ADO Den Haag FC Utrecht
14 27 november 2026 Excelsior Rotterdam Telstar
14 27 november 2026 FC Groningen Willem II
14 27 november 2026 Feyenoord Ajax
14 27 november 2026 Fortuna Sittard sc Heerenveen
14 27 november 2026 N.E.C. FC Twente
14 27 november 2026 PEC Zwolle AZ
14 27 november 2026 PSV Go Ahead Eagles
14 27 november 2026 SC Cambuur Sparta Rotterdam
15 4 december 2026 ADO Den Haag Excelsior Rotterdam
15 4 december 2026 Ajax FC Utrecht
15 4 december 2026 AZ PSV
15 4 december 2026 Fortuna Sittard PEC Zwolle
15 4 december 2026 Go Ahead Eagles FC Twente
15 4 december 2026 sc Heerenveen SC Cambuur
15 4 december 2026 Sparta Rotterdam N.E.C.
15 4 december 2026 Telstar FC Groningen
15 4 december 2026 Willem II Feyenoord
16 11 december 2026 Ajax SC Cambuur
16 11 december 2026 AZ N.E.C.
16 11 december 2026 FC Groningen Feyenoord
16 11 december 2026 FC Twente Sparta Rotterdam
16 11 december 2026 FC Utrecht Fortuna Sittard
16 11 december 2026 PEC Zwolle Excelsior Rotterdam
16 11 december 2026 PSV Telstar
16 11 december 2026 sc Heerenveen Go Ahead Eagles
16 11 december 2026 Willem II ADO Den Haag
17 18 december 2026 Excelsior Rotterdam AZ
17 18 december 2026 FC Utrecht sc Heerenveen
17 18 december 2026 Feyenoord FC Twente
17 18 december 2026 Fortuna Sittard Sparta Rotterdam
17 18 december 2026 Go Ahead Eagles Ajax
17 18 december 2026 N.E.C. ADO Den Haag
17 18 december 2026 PSV PEC Zwolle
17 18 december 2026 SC Cambuur FC Groningen
17 18 december 2026 Telstar Willem II
18 vrijdag 8 januari 2027 FC Twente Fortuna Sittard 20:00
18 zaterdag 9 januari 2027 Sparta Rotterdam Excelsior Rotterdam 16:30
18 zaterdag 9 januari 2027 PEC Zwolle FC Utrecht 18:45
18 zaterdag 9 januari 2027 Willem II Ajax 20:00
18 zaterdag 9 januari 2027 AZ sc Heerenveen 21:00
18 zondag 10 januari 2027 N.E.C. SC Cambuur 12:15
18 zondag 10 januari 2027 ADO Den Haag Telstar 14:30
18 zondag 10 januari 2027 Feyenoord PSV 14:30
18 zondag 10 januari 2027 FC Groningen Go Ahead Eagles 16:45
19 15 januari 2027 ADO Den Haag PEC Zwolle
19 15 januari 2027 Ajax FC Groningen
19 15 januari 2027 Excelsior Rotterdam Feyenoord
19 15 januari 2027 FC Utrecht FC Twente
19 15 januari 2027 Fortuna Sittard PSV
19 15 januari 2027 Go Ahead Eagles AZ
19 15 januari 2027 SC Cambuur Willem II
19 15 januari 2027 sc Heerenveen Sparta Rotterdam
19 15 januari 2027 Telstar N.E.C.
20 22 januari 2027 Ajax Telstar
20 22 januari 2027 AZ FC Utrecht
20 22 januari 2027 Excelsior Rotterdam Fortuna Sittard
20 22 januari 2027 FC Twente sc Heerenveen
20 22 januari 2027 Feyenoord PEC Zwolle
20 22 januari 2027 Go Ahead Eagles SC Cambuur
20 22 januari 2027 N.E.C. Willem II
20 22 januari 2027 PSV ADO Den Haag
20 22 januari 2027 Sparta Rotterdam FC Groningen
21 28 januari 2027 ADO Den Haag Go Ahead Eagles
21 28 januari 2027 AZ Feyenoord
21 28 januari 2027 FC Groningen N.E.C.
21 28 januari 2027 FC Twente SC Cambuur
21 28 januari 2027 FC Utrecht Excelsior Rotterdam
21 28 januari 2027 PEC Zwolle Fortuna Sittard
21 28 januari 2027 sc Heerenveen Ajax
21 28 januari 2027 Sparta Rotterdam Telstar
21 28 januari 2027 Willem II PSV
22 12 februari 2027 Excelsior Rotterdam Ajax
22 12 februari 2027 FC Groningen AZ
22 12 februari 2027 Feyenoord N.E.C.
22 12 februari 2027 Fortuna Sittard ADO Den Haag
22 12 februari 2027 Go Ahead Eagles PEC Zwolle
22 12 februari 2027 PSV FC Twente
22 12 februari 2027 SC Cambuur FC Utrecht
22 12 februari 2027 Telstar sc Heerenveen
22 12 februari 2027 Willem II Sparta Rotterdam
23 19 februari 2027 Ajax Go Ahead Eagles
23 19 februari 2027 AZ Fortuna Sittard
23 19 februari 2027 FC Twente Excelsior Rotterdam
23 19 februari 2027 FC Utrecht ADO Den Haag
23 19 februari 2027 Feyenoord Telstar
23 19 februari 2027 N.E.C. Sparta Rotterdam
23 19 februari 2027 PEC Zwolle FC Groningen
23 19 februari 2027 PSV SC Cambuur
23 19 februari 2027 sc Heerenveen Willem II
24 26 februari 2027 ADO Den Haag FC Twente
24 26 februari 2027 Ajax Feyenoord
24 26 februari 2027 Excelsior Rotterdam sc Heerenveen
24 26 februari 2027 Fortuna Sittard FC Utrecht
24 26 februari 2027 N.E.C. AZ
24 26 februari 2027 SC Cambuur PEC Zwolle
24 26 februari 2027 Sparta Rotterdam PSV
24 26 februari 2027 Telstar Go Ahead Eagles
24 26 februari 2027 Willem II FC Groningen
25 5 maart 2027 ADO Den Haag Ajax
25 5 maart 2027 FC Groningen Telstar
25 5 maart 2027 FC Twente AZ
25 5 maart 2027 Feyenoord sc Heerenveen
25 5 maart 2027 Fortuna Sittard N.E.C.
25 5 maart 2027 Go Ahead Eagles Excelsior Rotterdam
25 5 maart 2027 PEC Zwolle Willem II
25 5 maart 2027 PSV FC Utrecht
25 5 maart 2027 Sparta Rotterdam SC Cambuur
26 12 maart 2027 Ajax PEC Zwolle
26 12 maart 2027 AZ Sparta Rotterdam
26 12 maart 2027 Excelsior Rotterdam N.E.C.
26 12 maart 2027 FC Utrecht FC Groningen
26 12 maart 2027 Go Ahead Eagles Feyenoord
26 12 maart 2027 SC Cambuur ADO Den Haag
26 12 maart 2027 sc Heerenveen Fortuna Sittard
26 12 maart 2027 Telstar PSV
26 12 maart 2027 Willem II FC Twente
27 19 maart 2027 ADO Den Haag Willem II
27 19 maart 2027 AZ Excelsior Rotterdam
27 19 maart 2027 FC Groningen PSV
27 19 maart 2027 FC Twente Go Ahead Eagles
27 19 maart 2027 FC Utrecht Sparta Rotterdam
27 19 maart 2027 Feyenoord SC Cambuur
27 19 maart 2027 N.E.C. Ajax
27 19 maart 2027 PEC Zwolle sc Heerenveen
27 19 maart 2027 Telstar Fortuna Sittard
28 3 april 2027 Ajax FC Twente
28 3 april 2027 Excelsior Rotterdam PEC Zwolle
28 3 april 2027 Fortuna Sittard Feyenoord
28 3 april 2027 Go Ahead Eagles N.E.C.
28 3 april 2027 PSV AZ
28 3 april 2027 SC Cambuur Telstar
28 3 april 2027 sc Heerenveen FC Groningen
28 3 april 2027 Sparta Rotterdam ADO Den Haag
28 3 april 2027 Willem II FC Utrecht
29 9 april 2027 ADO Den Haag Feyenoord
29 9 april 2027 FC Groningen Excelsior Rotterdam
29 9 april 2027 FC Utrecht Ajax
29 9 april 2027 N.E.C. sc Heerenveen
29 9 april 2027 PEC Zwolle PSV
29 9 april 2027 SC Cambuur Fortuna Sittard
29 9 april 2027 Sparta Rotterdam Go Ahead Eagles
29 9 april 2027 Telstar FC Twente
29 9 april 2027 Willem II AZ
30 23 april 2027 AZ SC Cambuur
30 23 april 2027 Excelsior Rotterdam Willem II
30 23 april 2027 FC Twente N.E.C.
30 23 april 2027 Feyenoord Sparta Rotterdam
30 23 april 2027 Fortuna Sittard FC Groningen
30 23 april 2027 Go Ahead Eagles FC Utrecht
30 23 april 2027 PEC Zwolle Telstar
30 23 april 2027 PSV Ajax
30 23 april 2027 sc Heerenveen ADO Den Haag
31 30 april 2027 Ajax Fortuna Sittard
31 30 april 2027 Excelsior Rotterdam SC Cambuur
31 30 april 2027 FC Groningen ADO Den Haag
31 30 april 2027 Feyenoord Willem II
31 30 april 2027 Go Ahead Eagles PSV
31 30 april 2027 N.E.C. PEC Zwolle
31 30 april 2027 sc Heerenveen FC Utrecht
31 30 april 2027 Sparta Rotterdam FC Twente
31 30 april 2027 Telstar AZ
32 8 mei 2027 ADO Den Haag N.E.C.
32 8 mei 2027 AZ Ajax
32 8 mei 2027 FC Twente FC Groningen
32 8 mei 2027 FC Utrecht Feyenoord
32 8 mei 2027 Fortuna Sittard Go Ahead Eagles
32 8 mei 2027 PEC Zwolle Sparta Rotterdam
32 8 mei 2027 PSV Excelsior Rotterdam
32 8 mei 2027 SC Cambuur sc Heerenveen
32 8 mei 2027 Willem II Telstar
33 zondag 16 mei 2027 Ajax Sparta Rotterdam 14:30
33 zondag 16 mei 2027 AZ PEC Zwolle 14:30
33 zondag 16 mei 2027 Excelsior Rotterdam ADO Den Haag 14:30
33 zondag 16 mei 2027 FC Groningen SC Cambuur 14:30
33 zondag 16 mei 2027 FC Twente Feyenoord 14:30
33 zondag 16 mei 2027 FC Utrecht Telstar 14:30
33 zondag 16 mei 2027 Fortuna Sittard Willem II 14:30
33 zondag 16 mei 2027 Go Ahead Eagles sc Heerenveen 14:30
33 zondag 16 mei 2027 PSV N.E.C. 14:30
34 zondag 23 mei 2027 ADO Den Haag AZ 14:30
34 zondag 23 mei 2027 Feyenoord FC Groningen 14:30
34 zondag 23 mei 2027 N.E.C. FC Utrecht 14:30
34 zondag 23 mei 2027 PEC Zwolle FC Twente 14:30
34 zondag 23 mei 2027 SC Cambuur Ajax 14:30
34 zondag 23 mei 2027 sc Heerenveen PSV 14:30
34 zondag 23 mei 2027 Sparta Rotterdam Fortuna Sittard 14:30
34 zondag 23 mei 2027 Telstar Excelsior Rotterdam 14:30
34 zondag 23 mei 2027 Willem II Go Ahead Eagles 14:30`;

  document.getElementById('pdf-paste-area').value = scheduleText;
  parsePastedText();
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function extractPdfText(file) {
  // Try to read as text first (some PDFs are text-based)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const buffer = e.target.result;
      const bytes = new Uint8Array(buffer);
      // Extract text between stream objects in PDF
      let text = '';
      // Try UTF-8 decode
      try {
        const decoder = new TextDecoder('utf-8', {fatal:false});
        const raw = decoder.decode(bytes);
        // Extract readable text portions - look for text between parentheses and BT/ET blocks
        const matches = [];
        // Pattern 1: text in parentheses (Tj, TJ operators)
        const paren = raw.matchAll(/\(([^)]{2,80})\)\s*(?:Tj|TJ)/g);
        for (const m of paren) {
          const t = m[1].replace(/\n/g,' ').replace(/\r/g,'').replace(/\(/g,'(').replace(/\)/g,')').trim();
          if (t.length > 1) matches.push(t);
        }
        // Pattern 2: plain text lines that look like schedule data
        const lines = raw.split(/[\n\r]+/);
        for (const line of lines) {
          const clean = line.replace(/[^ -~ -ÿ ]/g,' ').replace(/\s+/g,' ').trim();
          if (clean.length > 5) matches.push(clean);
        }
        text = matches.join('\n');
      } catch(err) {
        text = '';
      }
      resolve(text);
    };
    reader.onerror = () => reject(new Error('Kon PDF niet lezen'));
    reader.readAsArrayBuffer(file);
  });
}

function parseKNVBSchedule(text) {
  const matches = [];
  const unrecognized = [];
  const roundsSeen = new Set();

  const MONTHS = {
    'januari':1,'februari':2,'maart':3,'april':4,'mei':5,'juni':6,
    'juli':7,'augustus':8,'september':9,'oktober':10,'november':11,'december':12
  };

  // Get clubs for matching — prefer clubs in the selected competition
  const compId = document.getElementById('pdf-comp-select')?.value;
  const comp = compId ? S.competitions.find(c=>c.id===compId) : null;
  const compClubIds = comp?.clubIds || [];
  // Use only comp clubs if available, fall back to all clubs
  const matchClubs = compClubIds.length
    ? compClubIds.map(id=>S.clubs.find(c=>c.id===id)).filter(Boolean)
    : S.clubs;

  const lines = text.split('\n').map(l=>l.trim()).filter(l=>l.length>3);

  for (const line of lines) {
    // Must start with round number
    const roundMatch = line.match(/^(\d{1,2})\s/);
    if (!roundMatch) continue;
    const round = parseInt(roundMatch[1]);
    if (round < 1 || round > 40) continue;

    // Must contain a month name + year
    const dateMatch = line.match(/(\d{1,2})\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+(20\d{2})/i);
    if (!dateMatch) continue;

    const month = MONTHS[dateMatch[2].toLowerCase()];
    const year = parseInt(dateMatch[3]);
    const day = parseInt(dateMatch[1]);
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

    // Time: HH:MM near end (before optional score)
    const timeScoreMatch = line.match(/(\d{1,2}:\d{2})(?:\s*\*+)?(?:\s+(\d{1,2})-(\d{1,2}))?\s*\*?\s*$/);
    const time = timeScoreMatch ? timeScoreMatch[1] : null;
    const homeScore = timeScoreMatch && timeScoreMatch[2] !== undefined ? parseInt(timeScoreMatch[2]) : null;
    const awayScore = timeScoreMatch && timeScoreMatch[3] !== undefined ? parseInt(timeScoreMatch[3]) : null;

    // Also check for score-only at end (no time): e.g. "... 5-1"
    let hs = homeScore, as_ = awayScore;
    if (hs === null) {
      const scoreOnly = line.match(/(\d{1,2})-(\d{1,2})\s*\*?\s*$/);
      if (scoreOnly && !line.match(/(\d{1,2}:\d{2})/)) {
        hs = parseInt(scoreOnly[1]); as_ = parseInt(scoreOnly[2]);
      }
    }

    // Get everything after the date string, remove day name prefix, remove time+score suffix
    let afterDate = line.slice(line.indexOf(dateMatch[0]) + dateMatch[0].length).trim();
    afterDate = afterDate.replace(/^(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\s+/i, '').trim();

    // Remove time+score from end
    let clubPart = afterDate;
    if (time) {
      clubPart = clubPart.replace(new RegExp(time.replace(':','[:]') + '(?:\\s*\\*+)?(?:\\s+\\d{1,2}-\\d{1,2})?\\s*\\*?\\s*$'), '').trim();
    } else if (hs !== null) {
      // Remove trailing score
      clubPart = clubPart.replace(/\d{1,2}-\d{1,2}\s*\*?\s*$/, '').trim();
    }
    clubPart = clubPart.replace(/\s*\*+\s*$/, '').trim();

    // Try dash separator first: "Thuis - Uit"
    let home = null, away = null, homeId = null, awayId = null;
    const dashIdx = clubPart.indexOf(' - ');
    if (dashIdx > 0) {
      const rawHome = clubPart.slice(0, dashIdx).trim();
      const rawAway = clubPart.slice(dashIdx + 3).trim();
      // Match to known clubs (exact first, then case-insensitive)
      const findClub = (name) => {
        let c = matchClubs.find(c=>c.name===name);
        if (!c) c = matchClubs.find(c=>c.name.toLowerCase()===name.toLowerCase());
        return c || null;
      };
      const hClub = findClub(rawHome);
      const aClub = findClub(rawAway);
      home = hClub?.name || rawHome;
      away = aClub?.name || rawAway;
      homeId = hClub?.id || null;
      awayId = aClub?.id || null;
    } else {
      // No dash — longest-match greedy from start
      const sortedClubs = [...matchClubs].sort((a,b)=>b.name.length-a.name.length);
      let remaining = clubPart;
      for (const club of sortedClubs) {
        if (remaining.toLowerCase().startsWith(club.name.toLowerCase())) {
          home = club.name; homeId = club.id;
          remaining = remaining.slice(club.name.length).trim();
          break;
        }
      }
      if (home) {
        for (const club of sortedClubs) {
          if (club.name !== home && remaining.toLowerCase().startsWith(club.name.toLowerCase())) {
            away = club.name; awayId = club.id; break;
          }
        }
      }
      // Final fallback: split on multiple spaces
      if (!home || !away) {
        const parts = clubPart.split(/\s{2,}/);
        if (parts.length >= 2) {
          home = parts[0].trim(); away = parts[parts.length-1].trim();
          homeId = matchClubs.find(c=>c.name.toLowerCase()===home.toLowerCase())?.id||null;
          awayId = matchClubs.find(c=>c.name.toLowerCase()===away.toLowerCase())?.id||null;
        }
      }
    }

    if (home && away && home !== away) {
      roundsSeen.add(round);
      matches.push({
        round, date: dateStr, time, homeName: home, awayName: away,
        homeClubId: homeId, awayClubId: awayId,
        homeScore: hs, awayScore: as_,
        played: hs !== null && as_ !== null
      });
    } else {
      unrecognized.push(line.slice(0,100));
    }
  }

  return { matches, rounds: roundsSeen.size, unrecognized };
}

function renderPdfPreview(result) {
  document.getElementById('pdf-match-count').textContent =
    `${result.matches.length} wedstrijden · ${result.rounds} speelronden`;

  const cam = S.clubs.find(c=>c.isOwnClub);
  const rows = result.matches.map((m,i) => {
    const isCam = m.homeName===cam?.name||m.awayName===cam?.name||
                  m.homeClubId===cam?.id||m.awayClubId===cam?.id;
    const homeOk = !!m.homeClubId;
    const awayOk = !!m.awayClubId;
    const scoreStr = m.played
      ? `<span style="font-weight:700;color:var(--win)">${m.homeScore}-${m.awayScore}</span>`
      : `<span class="text-muted">${m.time||'—'}</span>`;
    return `<div style="display:grid;grid-template-columns:36px 76px 1fr 70px 1fr 24px;gap:4px;align-items:center;padding:5px 10px;border-bottom:1px solid var(--border-light);font-size:11px;${isCam?'background:rgba(245,197,0,0.05)':''}">
      <span class="text-muted">R${m.round}</span>
      <span class="text-muted">${m.date.slice(5)}</span>
      <span style="text-align:right;font-weight:${homeOk?'600':'400'};color:${homeOk?'var(--text-primary)':'var(--draw)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(m.homeName||'?')}</span>
      <span style="text-align:center">${scoreStr}</span>
      <span style="font-weight:${awayOk?'600':'400'};color:${awayOk?'var(--text-primary)':'var(--draw)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(m.awayName||'?')}</span>
      <button class="icon-btn danger" onclick="parsedPdfMatches.splice(${i},1);renderPdfPreview({matches:parsedPdfMatches,rounds:new Set(parsedPdfMatches.map(x=>x.round)).size,unrecognized:[]})" style="font-size:11px;padding:1px 4px">✕</button>
    </div>`;
  }).join('');

  document.getElementById('pdf-matches-list').innerHTML = rows;
}

async function confirmMatchImport() {
  if (!parsedPdfMatches.length) return;
  const compId = document.getElementById('pdf-comp-select').value;
  if (!compId) { showToast('Selecteer een competitie', 'error'); return; }
  const overwrite = document.getElementById('pdf-overwrite').checked;

  let imported = 0, skipped = 0;
  for (const m of parsedPdfMatches) {
    // Check for duplicate
    const exists = S.matches.find(x=>x.competitionId===compId&&x.round===m.round&&
      (x.homeName===m.homeName||x.homeClubId===m.homeClubId)&&
      (x.awayName===m.awayName||x.awayClubId===m.awayClubId));
    if (exists && !overwrite) { skipped++; continue; }
    const id = exists?.id || 'match_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
    const obj = {
      id, competitionId: compId, seasonId: S.currentSeason,
      round: m.round, date: m.date, time: m.time||null,
      homeClubId: m.homeClubId||null, awayClubId: m.awayClubId||null,
      homeName: m.homeName, awayName: m.awayName,
      homeScore: m.homeScore !== null ? m.homeScore : (exists?.homeScore||null),
      awayScore: m.awayScore !== null ? m.awayScore : (exists?.awayScore||null),
      played: m.played || exists?.played || false,
      events: exists?.events||[], motm: exists?.motm||null, notes: exists?.notes||''
    };
    await dbPut('matches', obj);
    if (exists) { S.matches[S.matches.findIndex(x=>x.id===id)] = obj; }
    else { S.matches.push(obj); }
    imported++;
  }

  closeModal('modal-match-import');
  // Re-render competition
  renderCompDetail(compId);
  const navItem = document.querySelector(`.nav-item[data-comp="${compId}"]`);
  if (navItem) { document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active')); navItem.classList.add('active'); }
  showToast(`${imported} wedstrijden geïmporteerd${skipped?' ('+skipped+' overgeslagen)':''}`, 'success');
}

// Manual match entry
function addManualMatch() {
  const compId = document.getElementById('manual-match-comp').value;
  const round = parseInt(document.getElementById('manual-match-round').value);
  const date = document.getElementById('manual-match-date').value;
  const time = document.getElementById('manual-match-time').value;
  const homeId = document.getElementById('manual-match-home').value;
  const awayId = document.getElementById('manual-match-away').value;

  if (!compId) { showToast('Selecteer een competitie', 'error'); return; }
  if (!homeId || !awayId) { showToast('Selecteer thuis- en uitclub', 'error'); return; }
  if (homeId === awayId) { showToast('Thuis- en uitclub mogen niet hetzelfde zijn', 'error'); return; }
  if (!round || round < 1) { showToast('Voer een speelronde in', 'error'); return; }

  const homeClub = S.clubs.find(c=>c.id===homeId);
  const awayClub = S.clubs.find(c=>c.id===awayId);
  manualMatchQueue.push({ compId, round, date, time, homeId, awayId, homeName: homeClub?.name||'', awayName: awayClub?.name||'' });

  renderManualQueue();
  document.getElementById('manual-save-btn').style.display = 'block';
}

function renderManualQueue() {
  const wrap = document.getElementById('manual-matches-queue');
  if (!manualMatchQueue.length) { wrap.innerHTML=''; return; }
  wrap.innerHTML = `<div style="font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Toe te voegen (${manualMatchQueue.length})</div>` +
    manualMatchQueue.map((m,i)=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 8px;background:var(--bg-tertiary);border-radius:var(--radius-sm);margin-bottom:4px;font-size:12px">
        <span class="text-muted">R${m.round}</span>
        <span>${escHtml(m.homeName)} vs ${escHtml(m.awayName)}</span>
        <span class="text-muted">${m.date||'—'} ${m.time||''}</span>
        <button class="icon-btn danger" onclick="manualMatchQueue.splice(${i},1);renderManualQueue();if(!manualMatchQueue.length)document.getElementById('manual-save-btn').style.display='none'" style="font-size:11px">✕</button>
      </div>`).join('');
}

async function saveManualMatches() {
  if (!manualMatchQueue.length) return;
  let count = 0;
  for (const m of manualMatchQueue) {
    const id = 'match_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
    const obj = { id, competitionId: m.compId, seasonId: S.currentSeason, round: m.round, date: m.date||null, time: m.time||null, homeClubId: m.homeId, awayClubId: m.awayId, homeName: m.homeName, awayName: m.awayName, homeScore: null, awayScore: null, played: false, events: [], motm: null, notes: '' };
    await dbPut('matches', obj);
    S.matches.push(obj);
    count++;
  }
  manualMatchQueue = [];
  closeModal('modal-match-import');
  const compId = document.getElementById('manual-match-comp').value;
  if (compId) renderCompDetail(compId);
  showToast(`${count} wedstrijden toegevoegd`, 'success');
}

// ══════════════════════════════
// ARCHIEF — SEIZOENSFILTER
// ══════════════════════════════
function populateArchiefSeasonFilter() {
  const sel = document.getElementById('archief-season-filter');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">Alle seizoenen</option>';
  S.seasons.forEach(s => {
    const o = document.createElement('option');
    o.value = s.id; o.textContent = s.name;
    if (s.id === current) o.selected = true;
    sel.appendChild(o);
  });
}


// ══════════════════════════════
// SPELERSSTATISTIEKEN
// ══════════════════════════════
function calcPlayerStats(playerId, seasonId, competitionId) {
  const stats = { goals: 0, assists: 0, yellowCards: 0, redCards: 0, appearances: 0, starts: 0, minutesPlayed: 0, motm: 0, cleanSheets: 0, saves: 0 };
  const matches = (S.matches||[]).filter(m => {
    if (!m.played) return false;
    if (seasonId && m.seasonId !== seasonId) return false;
    if (competitionId && m.competitionId !== competitionId) return false;
    return true;
  });

  matches.forEach(m => {
    const events = m.events || [];
    // Goals
    events.filter(e=>e.type==='goal'&&e.playerId===playerId&&e.playerId!=='__opp__'&&e.playerId!=='__opp_own__'&&e.goalType!=='eigen doelpunt').forEach(()=>stats.goals++);
    // Assists
    events.filter(e=>e.type==='goal'&&e.assistId===playerId).forEach(()=>stats.assists++);
    // Cards
    events.filter(e=>e.type==='card'&&e.playerId===playerId).forEach(e=>{
      if(e.cardType==='geel') stats.yellowCards++;
      else if(e.cardType==='rood'||e.cardType==='geel-rood') stats.redCards++;
    });
    // Appearances & minutes — use periods if available
    const subs = events.filter(e=>e.type==='sub');
    const subIn = subs.find(s=>s.playerInId===playerId);
    const subOut = subs.find(s=>s.playerOutId===playerId);

    // Check starter status — support both old (periods) and new (lineup array) format
    const periods = m.periods;
    let isStarter = false;
    let appearsInAnyPeriod = false;

    // Prefer new lineup array if available, fall back to old periods format
    const lineup = m.lineup || [];
    if (lineup.length > 0) {
      // New format: lineup is array of starter IDs
      isStarter = lineup.includes(playerId);
      appearsInAnyPeriod = isStarter || !!subIn;
    } else if (periods && periods.length && Object.keys(periods[0].assignments||{}).length > 0) {
      // Old format: periods with assignments (no lineup set)
      const firstPeriodIds = Object.values(periods[0].assignments||{});
      isStarter = firstPeriodIds.includes(playerId);
      appearsInAnyPeriod = periods.some(p=>Object.values(p.assignments||{}).includes(playerId));
    }

    // Also count appearances from goals/assists even without lineup data
    const hasGoalOrAssist = false; // removed: caused incorrect appearances

    if (isStarter || subIn || appearsInAnyPeriod) {
      stats.appearances++;
      // Find red card for this player (direct red or geel-rood)
      const redCard = events.find(e=>e.type==='card'&&e.playerId===playerId&&(e.cardType==='rood'||e.cardType==='geel-rood'));
      const redMin = redCard?.minute ? parseMinute(redCard.minute) : null;

      if (isStarter) {
        stats.starts++;
        const et1 = m.extraTime1 || 0;
        const et2 = m.extraTime2 || 0;
        const maxMin = 90 + et1 + et2;
        const outMinStr = subOut?.minute;
        const subOutMin = outMinStr ? (parseMinute(outMinStr)||maxMin) : maxMin;
        // Use earliest of: sub out, red card, end of match
        const outMin = redMin !== null ? Math.min(subOutMin, redMin) : subOutMin;
        stats.minutesPlayed += Math.min(outMin, maxMin);
      } else if (subIn) {
        const et1 = m.extraTime1 || 0;
        const et2 = m.extraTime2 || 0;
        const maxMin = 90 + et1 + et2;
        const inMinStr = subIn.minute;
        const inMin = inMinStr ? (parseMinute(inMinStr)||0) : 0;
        const subOut2 = events.filter(e=>e.type==='sub').find(e=>e.playerOutId===playerId);
        const subOutMin2 = subOut2?.minute ? (parseMinute(subOut2.minute)||maxMin) : maxMin;
        const outMin2 = redMin !== null ? Math.min(subOutMin2, redMin) : subOutMin2;
        stats.minutesPlayed += Math.min(outMin2, maxMin) - inMin;
      }
    }
    // MOTM
    if (m.motm === playerId) stats.motm++;
    // Keeper stats: saves + clean sheets
    const p = (S.players||[]).find(x=>x.id===playerId);
    if (p?.position === 'Keeper' && (isStarter || subIn)) {
      if (m.keeperSaves?.[playerId] !== undefined) stats.saves += m.keeperSaves[playerId];
      // Clean sheet: keeper was on field and no goals conceded
      const cam = S.clubs.find(c=>c.isOwnClub);
      const isCamHome = m.homeClubId === cam?.id;
      const oppScore = isCamHome ? m.awayScore : m.homeScore;
      if (oppScore === 0) stats.cleanSheets++;
    }
  });
  return stats;
}

function calcAllPlayerStats(seasonId) {
  // Returns a map of playerId -> stats
  const result = {};
  (S.players||[]).forEach(p => { result[p.id] = calcPlayerStats(p.id, seasonId, null); });
  return result;
}

function startInlineScore(event, matchId) {
  event.stopPropagation();
  const span = event.currentTarget;
  const m = (S.matches||[]).find(x=>x.id===matchId);
  if (!m) return;
  const wrap = document.createElement('div');
  wrap.className = 'inline-score-wrap';
  wrap.onclick = e => e.stopPropagation();
  const hInput = document.createElement('input');
  hInput.className = 'inline-score-input'; hInput.type='number'; hInput.min='0'; hInput.max='99';
  hInput.value = m.homeScore !== null ? m.homeScore : '';
  hInput.placeholder = '—';
  const sep = document.createElement('span');
  sep.textContent = '-'; sep.style.cssText = 'font-weight:800;font-size:15px;color:var(--text-muted);padding:0 1px';
  const aInput = document.createElement('input');
  aInput.className = 'inline-score-input'; aInput.type='number'; aInput.min='0'; aInput.max='99';
  aInput.value = m.awayScore !== null ? m.awayScore : '';
  aInput.placeholder = '—';
  wrap.appendChild(hInput); wrap.appendChild(sep); wrap.appendChild(aInput);
  span.replaceWith(wrap);
  hInput.focus(); hInput.select();
  const rerender = () => {
    const ac = document.querySelector('.nav-item[data-comp].active');
    if (ac) renderCompDetail(ac.dataset.comp);
    else renderCompDetail(m.competitionId);
  };
  const save = async () => {
    const hs = hInput.value.trim(), as_ = aInput.value.trim();
    if (hs !== '' && as_ !== '') {
      // Both filled: save score
      m.homeScore = parseInt(hs); m.awayScore = parseInt(as_); m.played = true;
      await dbPut('matches', m);
      window._playerStats = calcAllPlayerStats(S.currentSeason);
    } else if (hs === '' && as_ === '') {
      // Both empty: clear score
      m.homeScore = null; m.awayScore = null; m.played = false;
      await dbPut('matches', m);
      window._playerStats = calcAllPlayerStats(S.currentSeason);
    }
    // If only one is filled: don't save yet, just rerender
    rerender();
  };
  const cancel = () => rerender();
  hInput.addEventListener('keydown', e => {
    if (e.key==='Enter') { e.preventDefault(); save(); }
    if (e.key==='Escape') { e.preventDefault(); cancel(); }
    if (e.key==='Tab') { e.preventDefault(); aInput.focus(); aInput.select(); }
  });
  aInput.addEventListener('keydown', e => {
    if (e.key==='Enter') { e.preventDefault(); save(); }
    if (e.key==='Escape') { e.preventDefault(); cancel(); }
    if (e.key==='Tab') { e.preventDefault(); hInput.focus(); hInput.select(); }
  });
  // Blur: only save if focus went outside BOTH inputs — use longer timer
  let bt;
  const onBlur = () => {
    bt = setTimeout(() => {
      const active = document.activeElement;
      if (active !== hInput && active !== aInput) save();
    }, 400);
  };
  hInput.addEventListener('blur', onBlur);
  aInput.addEventListener('blur', onBlur);
  hInput.addEventListener('focus', () => clearTimeout(bt));
  aInput.addEventListener('focus', () => clearTimeout(bt));
}

// ══════════════════════════════
// DELETE MATCH(ES)
// ══════════════════════════════
async function deleteMatch(matchId) {
  const m = (S.matches||[]).find(x=>x.id===matchId);
  if (!m) return;
  if (!confirm('Wedstrijd verwijderen?')) return;
  await dbDel('matches', matchId);
  S.matches = S.matches.filter(x=>x.id!==matchId);
  window._playerStats = calcAllPlayerStats(S.currentSeason);
  renderCompDetail(m.competitionId);
  showToast('Wedstrijd verwijderd', 'success');
}

async function deleteAllMatchesInComp(compId) {
  const comp = S.competitions.find(c=>c.id===compId);
  if (!comp) return;
  const count = (S.matches||[]).filter(m=>m.competitionId===compId).length;
  if (!confirm(`Alle ${count} wedstrijden in "${comp.name}" verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
  const ids = (S.matches||[]).filter(m=>m.competitionId===compId).map(m=>m.id);
  for (const id of ids) await dbDel('matches', id);
  S.matches = (S.matches||[]).filter(m=>m.competitionId!==compId);
  window._playerStats = calcAllPlayerStats(S.currentSeason);
  renderCompDetail(compId);
  showToast(`${ids.length} wedstrijden verwijderd`, 'success');
}

// ══════════════════════════════
// SUBPOSITIE SORT ORDER
// ══════════════════════════════
const SUBPOS_SORT = {
  // Verdedigers
  'Linksback':2,'Linker Wingback':3,'Centrale Verdediger':4,'Libero':5,'Sweeper':6,'Rechter Wingback':7,'Rechtsback':8,
  // Middenvelders
  'Verdedigende Middenvelder':2,'Linker Middenvelder':3,'Centrale Middenvelder':4,'Box-to-box Middenvelder':5,'Regisseur':6,'Rechter Middenvelder':7,'Aanvallende Middenvelder':8,'Nummer 10':9,
  // Aanvallers
  'Linksbuiten':2,'Schaduwspits':3,'Tweede Spits':4,'Spits':5,'Valse Negen':6,'Buitenspeler':7,'Rechtsbuiten':8,
};

function subposSortKey(p) {
  const first = p.subpos?.[0] || p.position || '';
  return SUBPOS_SORT[first] || 99;
}

// ══════════════════════════════
// AUTO-ARCHIVE DEPARTED PLAYERS
// ══════════════════════════════
async function checkDepartedPlayers() {
  if (!S.players) return;
  const today = new Date().toISOString().split('T')[0];
  const nowDeparted = S.players.filter(p =>
    p.status === 'vertrokken' && p.departureDate && p.departureDate <= today
    && !p._archiveNotified
  );
  if (!nowDeparted.length) return;

  // Show notification popup
  const names = nowDeparted.map(p => {
    const d = new Date(p.departureDate).toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'});
    return `<li><strong>${p.firstname ? p.firstname+' ' : ''}${p.lastname}</strong> — contract/vertrek per ${d}</li>`;
  }).join('');

  await new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center';
    overlay.innerHTML = `<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);padding:28px 32px;max-width:460px;width:90%">
      <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:20px;margin-bottom:16px;color:var(--cambuur-geel)">⚠ Vertrek verwerkt</div>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">De volgende speler(s) zijn automatisch naar het archief verplaatst omdat hun vertrekdatum is bereikt:</p>
      <ul style="font-size:13px;line-height:1.8;color:var(--text-primary);padding-left:18px;margin-bottom:20px">${names}</ul>
      <button class="btn btn-primary" onclick="this.closest('div').parentElement.remove();document.body.style.overflow='';" style="width:100%">Begrepen</button>
    </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    overlay.querySelector('button').addEventListener('click', resolve);
  });

  // Mark as notified (won't show again)
  for (const p of nowDeparted) {
    p._archiveNotified = true;
    await dbPut('players', p);
  }
}

const DEFAULT_PREFS = {
  coachYellowThreshold: 3,
  font: 'inter',
  fontSize: 'normal',
  formLength: 5,
  showTopscorers: true,
  showAvailability: true,
  defaultPlayerView: 'kaart',
  defaultPlayerSort: 'positie',
  contractWarnMonths: 6,
  loanWarnMonths: 3,
};

function getPrefs() {
  return Object.assign({}, DEFAULT_PREFS, S.prefs || {});
}

async function savePref(key, value) {
  if (!S.prefs) S.prefs = {};
  S.prefs[key] = value;
  await dbPut('settings', {key:'prefs', value: JSON.stringify(S.prefs)});
  applyPrefs();
}

function applyPrefs() {
  const p = getPrefs();
  // Font
  const fonts = {
    inter: "'Inter','Segoe UI',sans-serif",
    system: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    roboto: "'Roboto','Segoe UI',sans-serif",
    mono: "'JetBrains Mono','Fira Code',monospace"
  };
  document.body.style.fontFamily = fonts[p.font] || fonts.inter;
  // Font size
  const sizes = {small:'13px', normal:'14px', large:'16px'};
  document.documentElement.style.setProperty('--base-font-size', sizes[p.fontSize] || '14px');
  document.body.style.fontSize = sizes[p.fontSize] || '14px';
}

function setFont(val) { savePref('font', val); }
function setFontSize(val) { savePref('fontSize', val); }

function renderInstellingen() {
  const p = getPrefs();
  // Sync toggle states
  const dm = document.getElementById('dark-mode-toggle');
  if (dm) dm.checked = S.theme==='dark';
  const fs = document.getElementById('font-select');
  if (fs) fs.value = p.font || 'inter';
  const fss = document.getElementById('fontsize-select');
  if (fss) fss.value = p.fontSize || 'normal';
  const fls = document.getElementById('form-length-select');
  if (fls) fls.value = String(p.formLength || 5);
  const pt = document.getElementById('pref-topscorers');
  if (pt) pt.checked = p.showTopscorers !== false;
  const pa = document.getElementById('pref-availability');
  if (pa) pa.checked = p.showAvailability !== false;
  // Default to algemeen tab
  switchSettingsTab('algemeen', document.querySelector('#settings-tabs .tab'));
  renderSeasonsManage();
}

function switchSettingsTab(tab, el) {
  ['algemeen','seizoenen','selectie','gegevens'].forEach(t => {
    const d = document.getElementById('stab-'+t);
    if (d) d.style.display = t===tab ? 'block' : 'none';
  });
  document.querySelectorAll('#settings-tabs .tab').forEach(t=>t.classList.remove('active'));
  if (el) el.classList.add('active');
  if (tab === 'seizoenen') renderSeasonsManage();
  if (tab === 'selectie') renderSelectieSettings();
}

function renderSelectieSettings() {
  const p = getPrefs();
  const dv = document.getElementById('pref-default-view');
  const ds = document.getElementById('pref-default-sort');
  const cw = document.getElementById('pref-contract-warn');
  const lw = document.getElementById('pref-loan-warn');
  if (dv) dv.value = p.defaultPlayerView || 'kaart';
  if (ds) ds.value = p.defaultPlayerSort || 'positie';
  if (cw) cw.value = String(p.contractWarnMonths || 6);
  if (lw) lw.value = String(p.loanWarnMonths || 3);
}

function toggleInlineSeasonForm() {
  const f = document.getElementById('inline-season-form');
  if (f) f.style.display = f.style.display==='none'||!f.style.display ? 'block' : 'none';
}

// ── Seizoenen herordenen ──

async function moveComp(id, dir) {
  const comps = S.competitions.filter(c=>c.seasonId===S.currentSeason);
  const idx = comps.findIndex(c=>c.id===id);
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= comps.length) return;
  // Swap in S.competitions
  const ai = S.competitions.indexOf(comps[idx]);
  const bi = S.competitions.indexOf(comps[newIdx]);
  [S.competitions[ai], S.competitions[bi]] = [S.competitions[bi], S.competitions[ai]];
  // Save order via sortOrder field
  S.competitions.forEach((c,i) => c.sortOrder = i);
  for (const c of S.competitions) await dbPut('competitions', c);
  renderCompetitionsPage();
  renderCompetitionsNav();
}

async function moveSeasonUp(id) {
  const idx = S.seasons.findIndex(s=>s.id===id);
  if (idx <= 0) return;
  [S.seasons[idx-1], S.seasons[idx]] = [S.seasons[idx], S.seasons[idx-1]];
  S.seasons.forEach((s,i) => s.sortOrder = i);
  for (const s of S.seasons) await dbPut('seasons', s);
  renderSeasonsManage(); renderSeasonSelect();
}
async function moveSeasonDown(id) {
  const idx = S.seasons.findIndex(s=>s.id===id);
  if (idx < 0 || idx >= S.seasons.length-1) return;
  [S.seasons[idx], S.seasons[idx+1]] = [S.seasons[idx+1], S.seasons[idx]];
  S.seasons.forEach((s,i) => s.sortOrder = i);
  for (const s of S.seasons) await dbPut('seasons', s);
  renderSeasonsManage(); renderSeasonSelect();
}
async function moveSeasonTop(id) {
  const idx = S.seasons.findIndex(s=>s.id===id);
  if (idx <= 0) return;
  S.seasons.unshift(S.seasons.splice(idx, 1)[0]);
  S.seasons.forEach((s,i) => s.sortOrder = i);
  for (const s of S.seasons) await dbPut('seasons', s);
  renderSeasonsManage(); renderSeasonSelect();
}
async function moveSeasonBottom(id) {
  const idx = S.seasons.findIndex(s=>s.id===id);
  if (idx < 0 || idx >= S.seasons.length-1) return;
  S.seasons.push(S.seasons.splice(idx, 1)[0]);
  S.seasons.forEach((s,i) => s.sortOrder = i);
  for (const s of S.seasons) await dbPut('seasons', s);
  renderSeasonsManage(); renderSeasonSelect();
}
async function toggleSeasonVisible(id) {
  const s = S.seasons.find(x=>x.id===id);
  if (!s) return;
  s.hidden = !s.hidden;
  await dbPut('seasons', s);
  renderSeasonsManage(); renderSeasonSelect();
}

