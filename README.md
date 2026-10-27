# Motocross Gestionale — Vercel + Supabase

Gestionale statico per motocross: contaore, uscite, manutenzioni eseguite e programmate, moto, export/import backup JSON. **Nessuna gestione spese**.

## 1. Crea Supabase
1. Vai su https://supabase.com/dashboard > New project. Usa il piano Free (se adatto alle tue esigenze), crea una password robusta per il database e attendi la preparazione.
2. Apri **SQL Editor** > New query; incolla il contenuto di `schema.sql` e premi **Run**. Questa configurazione abilita RLS: ogni utente può leggere/modificare solo la propria riga.
3. Da **Project Settings > API** o **Connect > API Keys** (il menu varia), copia **Project URL** e **publishable key** (oppure vecchia `anon` key). **Non usare mai la secret key o service_role.**
4. Inserisci i due valori in `config.js` (sostituisci le stringhe segnaposto, mantenendo gli apici). URL e chiave pubblica sono pensati per stare nel frontend; la sicurezza dei dati è garantita dalle policy RLS e dalle sessioni autenticati.
5. In **Authentication > Providers > Email** lascia abilitato il provider Email. In **Authentication > URL Configuration**, imposta Site URL sull'indirizzo Vercel, quando disponibile. Se abiliti conferma email, usa un account email reale, controlla la cartella spam e configura eventuali redirect email verso il sito Vercel.

## 2. GitHub e Vercel
1. In GitHub apri il repository `waistar/motocrossgestionale`. Se hai già i file della vecchia app, **sostituiscili** con quelli di questo pacchetto. Mantieni `index.html`, `app.js`, `style.css`, `config.js`, `schema.sql`, `manifest.webmanifest`, `vercel.json` nella **cartella principale** (root). Non caricare lo ZIP intero.
2. Su https://vercel.com/new accedi con GitHub, seleziona il repository e premi **Import**.
3. Framework Preset: **Other**; Root Directory: **./**; nessun comando Build; premi **Deploy**.
4. Apri il link `https://NOME-PROGETTO.vercel.app` assegnato da Vercel. Se hai impostato correttamente Supabase, apparirà la schermata di accesso.
5. Premi **Registrati**; se la conferma email è attiva, apri il link inviato per email; poi **Accedi**.

## 3. Usa e salva
- In **Moto e dati** configura la moto. In **Contaore** imposta il contatore iniziale e aggiungi le uscite. In **Scadenze** programma gli intervalli in ore/giorni. In **Interventi** segna la manutenzione completata, associandola alla regola.
- Dopo ogni modifica verifica l'indicatore **● Salvato nel cloud** prima di chiudere il sito. La sincronizzazione richiede internet: questa versione **non supporta le modifiche offline**. Se la rete non funziona, non chiudere la pagina ed esporta un backup JSON.
- Per recuperare i dati su Mac/iPhone, apri **lo stesso URL Vercel** e accedi con **la stessa email e password**.
- **Backup**: Moto e dati > Esporta backup JSON; conserva il file in un luogo sicuro. Per ripristinare: Importa backup JSON (sostituisce l'archivio dell'account).

## Registra uscita: durata o contaore finale

Nel modulo **Registra uscita** puoi scegliere **Durata dell’uscita**, inserendo le
ore di utilizzo, oppure **Contaore finale della moto**, inserendo le ore totali
lette sulla moto dopo l’uscita. Il riepilogo mostra la durata calcolata e il nuovo
contaore prima del salvataggio. Ad esempio, con un contaore attuale di 24,5 h e una
lettura finale di 26 h, vengono registrate 1,5 h di uscita.

Il calcolo usa il contaore attuale del gestionale; la lettura finale deve essere
maggiore di questo valore. Se il contatore di partenza non è corretto, aggiornalo
prima con **Contaore → Imposta contaore**. Sono supportati incrementi di 0,1 h;
la durata viene salvata come prima, mantenendo compatibili storico, scadenze e PDF.

## Sicurezza e limiti
- Non pubblicare segreti Supabase, database password, `service_role` o chiavi secret. È normale che l'URL e la chiave anon/publishable siano pubblici; RLS è indispensabile.
- I dati sono associati al singolo account, non condivisi automaticamente tra account diversi. La pagina Vercel è pubblica, **ma le informazioni salvate sono protette dall'autenticazione e da RLS**.
- Le modifiche da due dispositivi aperti contemporaneamente potrebbero sovrascriversi (ultima scrittura). Evita inserimenti simultanei e ricarica la pagina prima di modificare da un altro dispositivo.
- Il piano gratuito di Supabase può sospendere progetti inattivi. Non promette attività 24/7 né backup automatici garantiti; conserva backup JSON periodici.
- I dati del vecchio gestionale localStorage **non migrano automaticamente**. Esporta il backup JSON dalla versione precedente, quindi importalo in questa dopo l'accesso.
- Le email di conferma dipendono dalla configurazione di Supabase; il servizio di posta predefinito ha limitazioni.
- Le scadenze sono visualizzate nell'app: non inviano notifiche push/email automatiche.

## Heartbeat automatico con GitHub Actions

Il workflow `.github/workflows/supabase-heartbeat.yml` esegue una query `SELECT 1`
su Supabase due volte al giorno (06:17 e 18:17 UTC). Usa una funzione dedicata,
`garage_heartbeat`, che non legge né modifica gli archivi degli utenti.
L'accesso al gestionale e le policy sui dati del garage restano privati.

Per attivarlo:

1. Nel progetto Supabase, apri **SQL Editor**, incolla `heartbeat.sql` e premi **Run**.
2. Carica su GitHub `heartbeat.sql`, `scripts/supabase_heartbeat.py` e la cartella
   `.github/workflows` sul branch predefinito del repository.
3. Apri **Actions → Supabase heartbeat → Run workflow** per il primo controllo.
   Se GitHub chiede di abilitare Actions, abilitalo prima dell'esecuzione.
4. Un'esecuzione riuscita scrive `Heartbeat OK` nei log; un errore fa fallire il job.
   Per ricevere gli avvisi, abilita le notifiche GitHub Actions per le esecuzioni fallite.

URL e chiave pubblica vengono letti da `config.js`, senza nuove dipendenze,
credenziali utente o chiavi amministrative. Non servono GitHub Secrets aggiuntivi.
In locale puoi verificare la stessa query con `python3 scripts/supabase_heartbeat.py`.
Gli errori temporanei di rete, HTTP 429 e HTTP 5xx vengono ritentati fino a tre volte.
Se il progetto è già sospeso, ripristinalo prima dal dashboard Supabase.

Il heartbeat genera attività, ma non garantisce che Supabase escluda un progetto
Free dalla sospensione. Inoltre GitHub può ritardare le esecuzioni pianificate e,
nei repository pubblici, disabilitarle dopo 60 giorni senza attività nel repository:
controlla periodicamente la scheda Actions. Riferimenti:
[Supabase Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
e [GitHub Actions: schedule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Report PDF delle attività recenti

In **Attività recenti → Esporta attività PDF** scarichi un documento A4 con marchio
410 La Placa, marca, modello, anno, numero identificativo, contaore attuale e storico
completo di interventi, allenamenti e uscite. La tabella riporta data, tipo,
attività o pista, ore e note, dal più recente al meno recente. Per le uscite e gli
allenamenti mostra le ore di utilizzo aggiunte; per gli interventi mostra il
contaore al momento della manutenzione. La ricerca attiva sullo schermo non limita
il contenuto del PDF. I report lunghi continuano su più pagine, con intestazioni
e numeri di pagina.

Il modulo degli interventi richiede la data, senza campo orario. Il PDF non mostra
orari né avvisi per orari mancanti. Eventuali orari presenti nei vecchi backup
rimangono conservati nei dati originali.

La generazione avviene nel browser, usando file inclusi nel repository. I dati del
report non vengono inviati a servizi di conversione esterni. Librerie incluse:
jsPDF 4.2.1 e jsPDF-AutoTable 5.0.8 (MIT, licenze in `vendor/`); font Noto Sans
(SIL Open Font License, licenza in `assets/fonts/`).

Test della preparazione del report: `node --test tests/report.test.mjs`
(con Node.js 22.18 o successivo).
