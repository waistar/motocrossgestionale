/** Convert duration or a final meter reading into the session's motor hours. */
export function calculateSessionHours(value, mode, currentHours) {
  if (String(value).trim() === '') throw new Error('Inserisci un valore in ore.');
  const entered = Number(value);
  const current = Number(currentHours);
  if (!Number.isFinite(entered) || entered < 0 || !Number.isFinite(current)) {
    throw new Error('Inserisci un valore in ore valido.');
  }
  if (mode !== 'duration' && mode !== 'meter') throw new Error('Modalità di inserimento non valida.');
  if (mode === 'meter' && entered <= current) {
    throw new Error('Il contaore finale deve essere maggiore del contaore attuale.');
  }
  // The form uses tenths of an hour; avoid subtraction artifacts such as 0.29999.
  const duration = Math.round((mode === 'meter' ? entered - current : entered) * 10) / 10;
  if (duration < 0.1 || duration > 1000) {
    throw new Error('La durata dell’uscita deve essere compresa tra 0,1 e 1000 ore.');
  }
  return duration;
}
