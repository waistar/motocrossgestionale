# MotoLog - Gestionale Motocross

Applicazione web statica, gratuita, senza backend e senza tracciamento spese.

## Funzioni
- Scheda moto (marca, modello, anno, numero)
- Contaore motore e registro delle uscite
- Impostazione manuale del contaore anche su moto già utilizzate
- Storico interventi con data, ore motore e note
- Scadenze per ore motore, giorni o entrambi, con indicazioni *in regola / in arrivo / da fare*
- Ricalcolo automatico delle scadenze quando si registra un intervento collegato
- Dashboard riepilogativa
- Esportazione/importazione di backup JSON
- Responsive: utilizzabile da smartphone, tablet e computer

## Pubblicazione su GitHub Pages
1. Crea un repository GitHub, ad esempio `motolog`.
2. Carica nella radice del repository `index.html`, `style.css`, `app.js`, `manifest.webmanifest` e `README.md`.
3. Apri **Settings → Pages → Build and deployment**, imposta **Deploy from a branch**, poi **main** e **/(root)**.
4. Accedi all'indirizzo `https://TUO-USERNAME.github.io/motolog/` una volta completata la pubblicazione.

In alternativa, apri `index.html` sul computer per un utilizzo locale.

## Importante: dove finiscono i dati?
I dati sono salvati esclusivamente nel `localStorage` del browser utilizzato, non su GitHub. **Non sono sincronizzati fra dispositivi**. Esporta periodicamente il backup JSON dalla sezione **Moto e dati** e conservalo in luogo sicuro. Importalo su un altro browser/dispositivo se necessario. Cancellare i dati di navigazione può eliminare l'archivio.

## Logica contaore
`ore totali = ore iniziali + somma delle ore di tutte le uscite`. La funzione **Imposta contaore** modifica il punto di partenza in modo che il totale corrisponda al valore richiesto.

## Logica manutenzione
Per una scadenza ogni N ore, il termine è `ore dell'ultimo intervento collegato + N`, oppure `ore di partenza + N` se mai eseguita. Per una scadenza ogni N giorni, il termine parte dalla data dell'ultimo intervento collegato o dalla data iniziale. Se entrambe le soglie sono presenti, la prima raggiunta determina lo stato. Gli avvisi sono interni all'app (non notifiche push).

## Personalizzazione
Modifica il codice HTML, CSS e JavaScript. Nessuna dipendenza esterna; nessun server necessario.
