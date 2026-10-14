# MotoLog MX Cloud — Vercel + Supabase

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

## Sicurezza e limiti
- Non pubblicare segreti Supabase, database password, `service_role` o chiavi secret. È normale che l'URL e la chiave anon/publishable siano pubblici; RLS è indispensabile.
- I dati sono associati al singolo account, non condivisi automaticamente tra account diversi. La pagina Vercel è pubblica, **ma le informazioni salvate sono protette dall'autenticazione e da RLS**.
- Le modifiche da due dispositivi aperti contemporaneamente potrebbero sovrascriversi (ultima scrittura). Evita inserimenti simultanei e ricarica la pagina prima di modificare da un altro dispositivo.
- Il piano gratuito di Supabase può sospendere progetti inattivi. Non promette attività 24/7 né backup automatici garantiti; conserva backup JSON periodici.
- I dati del vecchio gestionale localStorage **non migrano automaticamente**. Esporta il backup JSON dalla versione precedente, quindi importalo in questa dopo l'accesso.
- Le email di conferma dipendono dalla configurazione di Supabase; il servizio di posta predefinito ha limitazioni.
- Le scadenze sono visualizzate nell'app: non inviano notifiche push/email automatiche.
