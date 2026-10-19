import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSessionHours } from '../session-hours.js';

test('la lettura finale diventa la durata e porta il contatore al totale indicato', () => {
  assert.equal(calculateSessionHours('26', 'meter', 24.5), 1.5);
  assert.equal(24.5 + calculateSessionHours('26', 'meter', 24.5), 26);
  assert.equal(calculateSessionHours('5102', 'meter', 5100), 2);
});
test('durata diretta e differenze decimali preservano gli incrementi di un decimo', () => {
  assert.equal(calculateSessionHours('1.5', 'duration', 24.5), 1.5);
  assert.equal(calculateSessionHours('25.3', 'meter', 25), 0.3);
  assert.equal(calculateSessionHours('24.6', 'meter', 24.5), 0.1);
});
test('non vengono accettate letture finali uguali o inferiori al contatore', () => {
  for (const value of ['24.5', '24', '0']) {
    assert.throws(() => calculateSessionHours(value, 'meter', 24.5), /maggiore/);
  }
});
test('valori mancanti, non numerici, durate nulle ed eccessive non vengono salvati', () => {
  for (const [value,mode,current] of [['','meter',0],['abc','duration',0],['Infinity','duration',0],['-1','duration',0],['0','duration',0],['1001','duration',0],['5020','meter',4000],['1','invalid',0]]) {
    assert.throws(() => calculateSessionHours(value, mode, current));
  }
});
