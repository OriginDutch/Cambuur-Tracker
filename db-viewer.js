
// ══════════════════════════════════════════════════════
// DATABASE VIEWER — SQL.js powered
// ══════════════════════════════════════════════════════

let _sqlDb = null;
let _sqlJS = null;
let _dbCurrentTable = 'players';
const DB_STORES = ['seasons','clubs','stadiums','competitions','players','matches','coaches','settings'];

// Flatten a record for SQL storage — nested objects become JSON strings
function flattenRecord(obj) {
  const flat = {};
  Object.entries(obj).forEach(([k,v]) => {
    if (v === null || v === undefined) flat[k] = null;
    else if (typeof v === 'object') flat[k] = JSON.stringify(v);
    else flat[k] = v;
  });
  return flat;
}

// Build CREATE TABLE statement from records
function buildCreateTable(name, records) {
  if (!records.length) return `CREATE TABLE IF NOT EXISTS ${name} (id TEXT PRIMARY KEY, _raw TEXT)`;
  // Collect all keys
  const keys = new Set();
  records.forEach(r => Object.keys(flattenRecord(r)).forEach(k => keys.add(k)));
  const cols = [...keys].map(k => {
    if (k === 'id' || k === 'key') return `"${k}" TEXT PRIMARY KEY`;
    return `"${k}" TEXT`;
  });
  return `CREATE TABLE IF NOT EXISTS "${name}" (${cols.join(', ')})`;
}

async function openDbViewer() {
  document.getElementById('modal-db-viewer').classList.add('open');
  document.getElementById('db-status').textContent = 'SQL.js laden...';
  document.getElementById('db-result-table').innerHTML = '';
  document.getElementById('db-error').style.display = 'none';

  try {
    // Load sql.js
    if (!_sqlJS) {
      _sqlJS = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
      });
    }

    document.getElementById('db-status').textContent = 'Data laden...';
    _sqlDb = new _sqlJS.Database();

    // Load all stores into SQLite tables
    for (const store of DB_STORES) {
      try {
        const records = store === 'settings'
          ? await dbAll('settings')
          : (S[store] || await dbAll(store));

        if (!records || !records.length) {
          _sqlDb.run(`CREATE TABLE IF NOT EXISTS "${store}" ("id" TEXT PRIMARY KEY)`);
          continue;
        }

        // Create table
        _sqlDb.run(buildCreateTable(store, records));

        // Insert records
        const flat0 = flattenRecord(records[0]);
        const cols = Object.keys(flat0);
        const placeholders = cols.map(()=>'?').join(',');
        const stmt = _sqlDb.prepare(
          `INSERT OR REPLACE INTO "${store}" (${cols.map(c=>'"'+c+'"').join(',')}) VALUES (${placeholders})`
        );
        records.forEach(r => {
          const flat = flattenRecord(r);
          stmt.run(cols.map(c => flat[c] ?? null));
        });
        stmt.free();
      } catch(e) {
        console.warn('Error loading store', store, e);
      }
    }

    // Build table tabs
    const tabsEl = document.getElementById('db-table-tabs');
    tabsEl.innerHTML = DB_STORES.map(s => `
      <div onclick="dbSwitchTable('${s}')" id="dbtab-${s}"
        style="padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;
          border-bottom:2px solid ${s===_dbCurrentTable?'var(--cambuur-geel)':'transparent'};
          margin-bottom:-1px;color:${s===_dbCurrentTable?'var(--cambuur-geel)':'var(--text-muted)'};
          transition:color 0.15s">
        ${s}
      </div>`).join('');

    document.getElementById('db-status').textContent = 'Klaar';
    dbSwitchTable(_dbCurrentTable);

  } catch(e) {
    document.getElementById('db-status').textContent = 'Fout bij laden';
    showDbError('Kon SQL.js niet laden: ' + e.message);
  }
}

function dbSwitchTable(table) {
  _dbCurrentTable = table;
  // Update tab styles
  DB_STORES.forEach(s => {
    const tab = document.getElementById('dbtab-'+s);
    if (!tab) return;
    tab.style.borderBottomColor = s===table ? 'var(--cambuur-geel)' : 'transparent';
    tab.style.color = s===table ? 'var(--cambuur-geel)' : 'var(--text-muted)';
  });
  // Auto run SELECT for this table
  document.getElementById('db-sql-input').value = `SELECT * FROM "${table}" LIMIT 100`;
  dbRunQuery();
}

const DB_INSERT_TEMPLATES = {
  'seasons': `INSERT INTO seasons (id, name, year, created) VALUES ('season_NEW', '2027/2028', 2027, strftime('%s','now'))`,
  'clubs': `INSERT INTO clubs (id, name, abbr, city, isOwnClub, highlight) VALUES ('club_NEW', 'Club Naam', 'CLB', 'Stad', 0, '')`,
  'stadiums': `INSERT INTO stadiums (id, name, city, capacity) VALUES ('stadium_NEW', 'Stadionnaam', 'Stad', 15000)`,
  'competitions': `INSERT INTO competitions (id, name, type, seasonId, rounds) VALUES ('comp_NEW', 'Competitienaam', 'competitie', 'season_xxx', 34)`,
  'players': `INSERT INTO players (id, firstname, lastname, position, number, status, nationality, joined, contract) VALUES ('player_NEW', 'Voornaam', 'Achternaam', 'Middenvelder', '10', 'actief', 'Nederlands', '2026-07-01', '2027-06-30')`,
  'matches': `INSERT INTO matches (id, competitionId, seasonId, homeClubId, awayClubId, date, played) VALUES ('match_NEW', 'comp_xxx', 'season_xxx', 'club_xxx', 'club_yyy', '2027-08-01', 0)`,
  'coaches': `INSERT INTO coaches (id, firstname, lastname, created) VALUES ('coach_NEW', 'Voornaam', 'Achternaam', strftime('%s','now'))`,
  'settings': `INSERT INTO settings (key, value) VALUES ('myKey', 'myValue')`,
};

function dbInsertTemplate() {
  const tmpl = DB_INSERT_TEMPLATES[_dbCurrentTable];
  if (tmpl) {
    document.getElementById('db-sql-input').value = tmpl;
  } else {
    document.getElementById('db-sql-input').value =
      `INSERT INTO "${_dbCurrentTable}" (id) VALUES ('NEW_ID')`;
  }
}

function dbRunQuery() {
  if (!_sqlDb) { showDbError('Database niet geladen'); return; }
  let sql = document.getElementById('db-sql-input').value.trim();
  if (!sql) return;

  document.getElementById('db-error').style.display = 'none';
  document.getElementById('db-result-table').innerHTML = '';
  document.getElementById('db-result-info').textContent = '';

  try {
    const isWrite = /^(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i.test(sql);

    // Auto-replace *_NEW placeholder IDs with unique timestamp-based IDs
    if (/INSERT/i.test(sql) && sql.includes('_NEW')) {
      let counter = 0;
      sql = sql.replace(/'(\w+)_NEW'/g, (match, prefix) => {
        const unique = `'${prefix}_${Date.now()}${(counter++).toString().padStart(3,'0')}'`;
        return unique;
      });
      document.getElementById('db-sql-input').value = sql;
    }

    if (isWrite) {
      _sqlDb.run(sql);
      const affected = _sqlDb.getRowsModified();
      document.getElementById('db-result-info').textContent = `✓ Query uitgevoerd — ${affected} rij(en) gewijzigd`;
      // Write back to IndexedDB
      dbSyncBackToIndexedDB(sql);
      // Re-run SELECT to show updated data
      const tableMatch = sql.match(/(?:FROM|INTO|UPDATE)\s+"?(\w+)"?/i);
      if (tableMatch) {
        setTimeout(() => {
          document.getElementById('db-sql-input').value = `SELECT * FROM "${tableMatch[1]}" LIMIT 100`;
          dbRunQuery();
        }, 300);
      }
    } else {
      const results = _sqlDb.exec(sql);
      if (!results.length) {
        document.getElementById('db-result-info').textContent = 'Geen resultaten';
        return;
      }
      const {columns, values} = results[0];
      document.getElementById('db-result-info').textContent =
        `${values.length} rij${values.length!==1?'en':''} · ${columns.length} kolom${columns.length!==1?'men':''}`;
      renderDbTable(columns, values);
    }
  } catch(e) {
    showDbError(e.message);
  }
}

function renderDbTable(columns, values) {
  const el = document.getElementById('db-result-table');
  const th = columns.map(c => `<th style="padding:6px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text-secondary);white-space:nowrap;border-bottom:2px solid var(--border)">${c}</th>`).join('');
  const rows = values.map((row, ri) =>
    `<tr style="cursor:pointer" onclick="dbSelectRow(${ri})" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
      ${row.map(v => {
        const display = v === null ? '<span style="color:var(--text-muted);font-style:italic">null</span>'
          : String(v).length > 60 ? `<span title="${String(v).replace(/"/g,'&quot;')}">${String(v).slice(0,60)}…</span>`
          : String(v);
        const isMono = v !== null && (String(v||'').startsWith('{') || String(v||'').startsWith('['));
        return `<td style="padding:5px 10px;font-size:12px;border-bottom:1px solid var(--border-light);font-family:${isMono?'monospace':'inherit'};max-width:300px;overflow:hidden;white-space:nowrap">${display}</td>`;
      }).join('')}
    </tr>`
  ).join('');

  // Store values for row selection
  window._dbLastResults = {columns, values};

  el.innerHTML = `<table style="border-collapse:collapse;width:100%;font-size:12px">
    <thead><tr>${th}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function dbSelectRow(rowIdx) {
  if (!window._dbLastResults) return;
  const {columns, values} = window._dbLastResults;
  const row = values[rowIdx];
  const obj = {};
  columns.forEach((c,i) => obj[c] = row[i]);
  // Put as UPDATE query with all fields
  const table = _dbCurrentTable;
  const id = obj.id || obj.key;
  if (!id) return;
  const sets = columns
    .filter(c => c!=='id' && c!=='key')
    .map(c => { const val=obj[c]; const esc=val===null?'NULL':"'"+String(val||'').replace(/'/g,"''")+"'"; return '  "'+c+'" = '+esc; })
    .join(',\n');
  document.getElementById('db-sql-input').value = `UPDATE "${table}" SET\n${sets}\nWHERE id = '${id}'`;
}

function dbQuickQuery(template) {
  const sql = template.replace('{table}', _dbCurrentTable);
  document.getElementById('db-sql-input').value = sql;
  if (!sql.includes("''")) dbRunQuery();
}

function dbShowSchema() {
  if (!_sqlDb) return;
  document.getElementById('db-sql-input').value =
    `SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name`;
  dbRunQuery();
}

function dbFormatQuery() {
  const el = document.getElementById('db-sql-input');
  let sql = el.value.trim();
  // Basic formatting: newline before keywords
  sql = sql.replace(/(SELECT|FROM|WHERE|AND|OR|ORDER BY|GROUP BY|HAVING|LIMIT|INSERT INTO|VALUES|UPDATE|SET|DELETE FROM|JOIN|LEFT JOIN|INNER JOIN)/gi,
    '\n$1');
  el.value = sql.trim();
}

function dbClearQuery() {
  document.getElementById('db-sql-input').value = '';
  document.getElementById('db-result-table').innerHTML = '';
  document.getElementById('db-result-info').textContent = '';
  document.getElementById('db-error').style.display = 'none';
}

function showDbError(msg) {
  const el = document.getElementById('db-error');
  el.textContent = '❌ ' + msg;
  el.style.display = 'block';
}

// ── Sync writes back to IndexedDB ──
async function dbSyncBackToIndexedDB(sql) {
  try {
    // Determine which table was affected
    const tableMatch = sql.match(/(?:FROM|INTO|UPDATE)\s+"?(\w+)"?/i);
    if (!tableMatch) return;
    const table = tableMatch[1];
    if (!DB_STORES.includes(table)) return;

    // Read all records from SQLite for this table
    const results = _sqlDb.exec(`SELECT * FROM "${table}"`);
    if (!results.length) return;
    const {columns, values} = results[0];

    // Parse and write each record back to IndexedDB
    for (const row of values) {
      const obj = {};
      columns.forEach((c,i) => {
        let v = row[i];
        // Try to parse JSON strings back to objects
        if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
          try { v = JSON.parse(v); } catch(e) {}
        }
        obj[c] = v;
      });
      if (obj.id || obj.key) {
        const storeKey = table === 'settings' ? 'settings' : table;
        await dbPut(storeKey, obj);
        // Update S state
        if (S[table] && Array.isArray(S[table])) {
          const idx = S[table].findIndex(x=>x.id===obj.id);
          if (idx>=0) S[table][idx] = obj;
          else S[table].push(obj);
        }
      }
    }
    document.getElementById('db-status').textContent = `✓ Gesynchroniseerd naar IndexedDB`;
    setTimeout(()=>{ document.getElementById('db-status').textContent='Klaar'; }, 2000);
  } catch(e) {
    console.error('Sync error:', e);
    document.getElementById('db-status').textContent = '⚠️ Sync mislukt: ' + e.message;
  }
}

// Keyboard shortcut: Ctrl+Enter to run query
document.addEventListener('keydown', e => {
  if ((e.ctrlKey||e.metaKey) && e.key==='Enter') {
    const modal = document.getElementById('modal-db-viewer');
    if (modal?.classList.contains('open')) { e.preventDefault(); dbRunQuery(); }
  }
});

