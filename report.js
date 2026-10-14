const ORANGE = [255, 102, 0];
const INK = [34, 36, 41];
const MUTED = [102, 108, 118];
let assetsPromise;

function loadScript(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(path, import.meta.url).href;
    script.onload = resolve;
    script.onerror = () => {
      script.remove();
      reject(new Error('Impossibile caricare il generatore PDF. Riprova.'));
    };
    document.head.appendChild(script);
  });
}

async function base64Asset(path) {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok) throw new Error('Impossibile caricare un elemento del report PDF.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function loadAssets() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      (async () => {
        if (!window.jspdf?.jsPDF) await loadScript('./vendor/jspdf-4.2.1.umd.min.js');
        if (!window.jspdf.jsPDF.API.autoTable) await loadScript('./vendor/jspdf-autotable-5.0.8.min.js');
      })(),
      base64Asset('./assets/fonts/NotoSans-Regular.ttf'),
      base64Asset('./assets/fonts/NotoSans-Bold.ttf'),
      base64Asset('./assets/icons/icon-192.png'),
    ]).catch(error => {
      assetsPromise = undefined;
      throw error;
    });
  }
  return assetsPromise;
}

export function reportRows(state) {
  return [
    ...(state.sessions || []).map(session => ({ ...session, type: 'session' })),
    ...(state.works || []).map(work => ({ ...work, type: 'work' })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(activity => [
      activity.date ? activity.date.split('-').reverse().join('/') : '—',
      activity.type === 'session' ? 'Uscita / allenamento' : 'Intervento',
      String(activity.name || (activity.type === 'session' ? 'Uscita' : 'Intervento')),
      activity.type === 'session'
        ? `+${(Number(activity.hours) || 0).toFixed(1)} h di utilizzo`
        : `${(Number(activity.meter) || 0).toFixed(1)} h contaore`,
      String(activity.notes || '—'),
    ]);
}

export function reportFilename(bike, date = new Date()) {
  const identity = [bike.brand, bike.model, bike.year].filter(Boolean).join('-') || 'moto';
  const slug = identity.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'moto';
  const day = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  return `registro-attivita-${slug.toLowerCase()}-${day}.pdf`;
}

export async function createActivityReport(state, generatedAt = new Date()) {
  const [, regular, bold, logo] = await loadAssets();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.addFileToVFS('NotoSans-Regular.ttf', regular);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.addFileToVFS('NotoSans-Bold.ttf', bold);
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
  doc.setFont('NotoSans', 'normal');
  doc.setProperties({ title: 'Attività recenti - 410 La Placa', author: '410 La Placa', subject: 'Scheda moto e cronologia completa delle attività' });

  const bike = state.bike || {};
  const rows = reportRows(state);
  const totalHours = (Number(state.baseHours) || 0) + (state.sessions || []).reduce((sum, s) => sum + (Number(s.hours) || 0), 0);
  const issued = generatedAt.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
  const left = 16;
  const right = 194;
  const width = right - left;
  const paintedPages = new Set();
  function pageBackground() {
    const page = doc.internal.getCurrentPageInfo().pageNumber;
    if (paintedPages.has(page)) return;
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, 'F');
    paintedPages.add(page);
  }
  pageBackground();

  function text(value, x, y, { size = 9, bold = false, color = INK, ...options } = {}) {
    doc.setFont('NotoSans', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(String(value), x, y, options);
  }

  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, 210, 3, 'F');
  doc.addImage(logo, 'PNG', left, 13, 18, 18);
  text('410 LA PLACA', 39, 20, { size: 15, bold: true });
  text('MOTOCROSS · REGISTRO ATTIVITÀ', 39, 26, { size: 8, color: MUTED });
  text('GENERATO IL', right, 18, { size: 7, color: MUTED, align: 'right' });
  text(issued, right, 24, { size: 8, align: 'right' });
  text('Attività recenti', left, 47, { size: 25, bold: true });
  text('Cronologia completa di interventi, allenamenti e uscite.', left, 55, { size: 9, color: MUTED });

  doc.autoTable({
    startY: 64,
    margin: { left, right: left },
    theme: 'plain',
    willDrawPage: pageBackground,
    body: [
      ['MARCA', 'MODELLO', 'ANNO', 'NUMERO / ID'],
      [bike.brand || 'Non impostata', bike.model || 'Non impostato', bike.year || '—', bike.number || '—'],
    ],
    styles: { font: 'NotoSans', fontSize: 11, textColor: INK, cellPadding: { top: 3, right: 4, bottom: 4, left: 4 }, overflow: 'linebreak', fillColor: [246, 247, 249] },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 65 }, 2: { cellWidth: 26 }, 3: { cellWidth: 47 } },
    didParseCell({ row, cell }) {
      if (row.index === 0) {
        cell.styles.fontSize = 7;
        cell.styles.textColor = MUTED;
        cell.styles.cellPadding = { top: 4, right: 4, bottom: 0, left: 4 };
      } else cell.styles.fontStyle = 'bold';
    },
  });
  const summaryY = doc.lastAutoTable.finalY + 10;
  text(`Contaore attuale: ${totalHours.toFixed(1)} h`, left, summaryY, { size: 10, bold: true });
  text(`${rows.length} attività registrate`, right, summaryY, { size: 9, color: MUTED, align: 'right' });
  doc.autoTable({
    startY: summaryY + 9,
    margin: { left, right: left, top: 28, bottom: 20 },
    head: [['DATA', 'TIPO', 'ATTIVITÀ / PISTA', 'ORE', 'NOTE']],
    body: rows.length ? rows : [[{ content: 'Nessuna attività registrata.', colSpan: 5, styles: { halign: 'center', textColor: MUTED, cellPadding: 12 } }]],
    theme: 'grid',
    willDrawPage: pageBackground,
    styles: { font: 'NotoSans', fontSize: 8, cellPadding: 3, textColor: INK, lineColor: [226, 229, 233], lineWidth: .15, overflow: 'linebreak' },
    headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [250, 250, 251] },
    columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 28 }, 2: { cellWidth: 48 }, 3: { cellWidth: 29 }, 4: { cellWidth: 48 } },
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
  });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    if (page > 1) {
      doc.setFillColor(...ORANGE);
      doc.rect(0, 0, 210, 3, 'F');
      text('410 LA PLACA / REGISTRO ATTIVITÀ', left, 16, { size: 9, bold: true });
    }
    doc.setDrawColor(226, 229, 233);
    doc.line(left, 278, left + width, 278);
    text('Registro attività', left, 291, { size: 7, color: MUTED });
    text(`Pagina ${page} / ${pages}`, right, 291, { size: 7, color: MUTED, align: 'right' });
  }
  return doc;
}

export async function downloadActivityReport(state) {
  const snapshot = structuredClone(state);
  const generatedAt = new Date();
  const doc = await createActivityReport(snapshot, generatedAt);
  doc.save(reportFilename(snapshot.bike || {}, generatedAt));
}
