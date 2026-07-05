// WEDSTRIJD-IMPORT — PDF/schema parsen en handmatige invoer


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
      compClubs.sort((a,b)=>{
        const da = divisionSortIndex(effectiveDivision(a)), db = divisionSortIndex(effectiveDivision(b));
        return da!==db ? da-db : a.name.localeCompare(b.name);
      }).map(c=>
        `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('manual-match-home').innerHTML = opts;
    document.getElementById('manual-match-away').innerHTML = opts;

    // Rondeveld: nummer voor competities, naamdropdown (uit comp.rounds) voor bekertoernooien
    const roundNumEl = document.getElementById('manual-match-round');
    const roundNameEl = document.getElementById('manual-match-round-name');
    if ((selComp?.type === 'beker' || selComp?.type === 'playoffs') && (selComp.rounds||[]).length) {
      roundNumEl.style.display = 'none';
      roundNameEl.style.display = 'block';
      roundNameEl.innerHTML = selComp.rounds.map(r=>`<option value="${r}">${r}</option>`).join('');
    } else {
      roundNumEl.style.display = 'block';
      roundNameEl.style.display = 'none';
    }
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
    const id = exists?.id || genId('match');
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
  const selComp = S.competitions.find(c=>c.id===compId);
  const isKnockout = (selComp?.type === 'beker' || selComp?.type === 'playoffs') && (selComp.rounds||[]).length;
  const round = isKnockout
    ? document.getElementById('manual-match-round-name').value
    : parseInt(document.getElementById('manual-match-round').value);
  const date = document.getElementById('manual-match-date').value;
  const time = document.getElementById('manual-match-time').value;
  const homeId = document.getElementById('manual-match-home').value;
  const awayId = document.getElementById('manual-match-away').value;

  if (!compId) { showToast('Selecteer een competitie', 'error'); return; }
  if (!homeId || !awayId) { showToast('Selecteer thuis- en uitclub', 'error'); return; }
  if (homeId === awayId) { showToast('Thuis- en uitclub mogen niet hetzelfde zijn', 'error'); return; }
  if (!round || (!isKnockout && round < 1)) { showToast('Voer een speelronde in', 'error'); return; }

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
    const id = genId('match');
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

