import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportRows, reportFilename } from '../report.js';

test('report completo: include interventi, allenamenti e uscite dal più recente', () => {
  const state = {
    sessions: [
      { id: 'same', date: '2026-10-12', name: 'Uscita libera', hours: 1, notes: 'Terreno asciutto' },
      { id: 'training', date: '2026-10-14', name: 'Allenamento pista', hours: 1.5 },
    ],
    works: [{ id: 'same', date: '2026-10-13', name: 'Cambio olio', meter: 12, notes: 'Filtro nuovo', time: '09:00' }],
  };
  const original = structuredClone(state);
  const rows = reportRows(state);
  assert.deepEqual(rows.map(row => row[2]), ['Allenamento pista', 'Cambio olio', 'Uscita libera']);
  assert.equal(rows[0][0], '14/10/2026');
  assert.equal(rows[0][1], 'Uscita / allenamento');
  assert.equal(rows[1][1], 'Intervento');
  assert.equal(rows[0][3], '+1.5 h di utilizzo');
  assert.equal(rows[1][3], '12.0 h contaore');
  assert.equal(rows[2][4], 'Terreno asciutto');
  assert.deepEqual(state, original);
});

test('orari preesistenti non compaiono nel PDF; note e accenti sono preservati', () => {
  const note = 'Sostituzione filtro: qualità verificata.\nSecondo controllo eseguito.';
  const rows = reportRows({ works: [{ date: '2026-01-03', name: 'Manutenzione', meter: 3.5, notes: note, time: '09:00' }] });
  assert.equal(rows[0][4], note);
  assert(!rows.flat().some(value => value.includes('09:00') || value.includes('Non registrato')));
});

test('report con sole uscite e allenamenti contiene tutte le attività', () => {
  const rows = reportRows({ sessions: [{ date: '2026-10-14', name: 'Allenamento', hours: 2 }] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0][2], 'Allenamento');
  assert.deepEqual(reportRows({}), []);
});

test('nome PDF: attività, dati moto, data locale e caratteri validi', () => {
  const date = new Date(2026, 9, 14, 12);
  assert.equal(reportFilename({ brand: 'KTM', model: '250 SX-F', year: '2023' }, date), 'registro-attivita-ktm-250-sx-f-2023-2026-10-14.pdf');
  assert.equal(reportFilename({}, date), 'registro-attivita-moto-2026-10-14.pdf');
  assert.match(reportFilename({ brand: '../Moto è / speciale' }, date), /^registro-attivita-moto-e-speciale-/);
});
