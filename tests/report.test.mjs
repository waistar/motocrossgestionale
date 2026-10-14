import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportRows, reportFilename } from '../report.js';

test('cronologia: date e orari decrescenti senza alterare lo storico', () => {
  const works = [
    { date: '2026-10-13', name: 'Filtro aria', time: '18:00', meter: 10 },
    { date: '2026-10-14', name: 'Olio', time: '09:00', meter: 12 },
    { date: '2026-10-14', name: 'Catena', time: '15:30', meter: 13 },
  ];
  const original = structuredClone(works);
  const rows = reportRows(works);
  assert.deepEqual(rows.map(row => row[2]), ['Catena', 'Olio', 'Filtro aria']);
  assert.equal(rows[0][0], '14/10/2026');
  assert.equal(rows[0][1], '15:30');
  assert.equal(rows[0][3], '13.0 h');
  assert.deepEqual(works, original);
});

test('vecchi interventi: nessun orario inventato; note integrali e accenti preservati', () => {
  const note = 'Sostituzione filtro: qualità verificata.\nSecondo controllo eseguito.';
  const rows = reportRows([{ date: '2026-01-03', name: 'Manutenzione', meter: 3.5, notes: note }]);
  assert.equal(rows[0][1], 'Non registrato');
  assert.equal(rows[0][4], note);
  assert.deepEqual(reportRows([]), []);
});

test('orari non validi non vengono presentati come orari reali', () => {
  for (const time of ['25:00', '12:70', 'ieri']) {
    assert.equal(reportRows([{ date: '2026-01-03', time }])[0][1], 'Non registrato');
  }
});

test('nome PDF: dati moto, data locale e caratteri validi', () => {
  const date = new Date(2026, 9, 14, 12);
  assert.equal(reportFilename({ brand: 'KTM', model: '250 SX-F', year: '2023' }, date), 'registro-interventi-ktm-250-sx-f-2023-2026-10-14.pdf');
  assert.equal(reportFilename({}, date), 'registro-interventi-moto-2026-10-14.pdf');
  assert.match(reportFilename({ brand: '../Moto è / speciale' }, date), /^registro-interventi-moto-e-speciale-/);
});
