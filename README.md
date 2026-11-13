# Milano Partecipa

Applicazione civica «La nostra città, il nostro futuro», per Insieme per Milano.

## Funzionalità implementate
- Consultazione, ricerca, filtri per tema/municipio/stato e ordinamento per voti.
- Account autonomi con email/password, profilo personale e controllo della maggiore età sul server. Password protette con scrypt; sessioni revocabili in cookie HttpOnly, Secure e SameSite=Lax.
- Registrazione con nome, cognome, email dell'account, codice fiscale, nascita, residenza; caricamento riservato fronte/retro del documento e verifica manuale del comitato.
- Proposte con allegato obbligatorio, modifica dell'autore, discussioni e voto unico imposto dalla chiave primaria del database.
- Pannello comitato: approvazione identità, revisione proposte, modifica/rimozione commenti, richiesta informazioni e invio al Comune come stato del processo (non spedisce email).
- Registro delle operazioni, storico pubblico delle fasi e cancellazione/anominizzazione dell'account con rimozione dei documenti.
- Dati persistenti D1 e file privati R2. Query parametrizzate, controllo server di ruoli e proprietà, blocco richieste cross-origin, controllo firma dei formati e limite file 8 MB.

## Prima configurazione
Il sito è pubblico. Le nuove registrazioni creano esclusivamente cittadini, mai gestori. Il gestore esistente conserva il proprio ruolo collegando una password dal browser con la sua sessione precedente ancora attiva. Nessun collegamento viene effettuato sulla sola corrispondenza dell'email. Dopo l'attivazione, accesso, uscita e recupero funzionano senza ChatGPT. Il ruolo gestore non equivale a una verifica SPID.

Le sei schede iniziali sono esempi esplicitamente contrassegnati e non consentono interazioni. I contatori rappresentano solo dati effettivamente presenti. Per provare il flusso, attivare il gestore con dati di test, creare una proposta con un allegato di prova, poi aprire Il comitato e pubblicarla.

## Limiti della versione pilota
L'integrazione SPID non è attiva: richiede un gestore autorizzato e configurazioni esterne. L'accesso con email/password non sostituisce SPID. Non è configurato un servizio di invio email: il possesso dell'indirizzo non viene verificato automaticamente e l'identità civile resta soggetta a verifica manuale. Il recupero password avviene mediante un codice casuale personale, mostrato una volta e salvabile dall'utente. Il codice è monouso, ruota dopo ogni recupero/cambio password e revoca le sessioni precedenti. Nessuna password o codice di recupero viene salvato in chiaro. Il controllo automatico del codice fiscale verifica solo formato e lunghezza; il comitato deve verificare corrispondenza e validità dei dati sul documento. La verifica della residenza è manuale.

NLP, classificazione IA, EXIF e visione artificiale non sono attivi. Categoria e moderazione sono manuali. Le notifiche sono consultabili nella scheda, senza invio email. I contenuti ritirati rimangono nello storico con stato Respinta, visibili al proprio autore e al comitato.

Prima dell'apertura ai cittadini: definire titolare, informativa e politica di conservazione; completare gestione del trasferimento dei privilegi; audit di sicurezza/accessibilità; scansione antivirus, quote/rate limiting e controllo durate video; integrazione SPID se scelta. Usare dati e documenti di prova nella versione pilota. Nessuna conformità normativa è dichiarata.

## Sviluppo e verifica
Stack: React/Vinext, TypeScript, Cloudflare Workers, D1/SQLite e R2. Gli schemi sono in db/schema.ts, le migrazioni in drizzle, gli endpoint in app/api e l'interfaccia in app/page.tsx.

Comandi: `node node_modules/typescript/bin/tsc --noEmit`, `node tests/security.mjs`. Il test usa un database/file storage isolati e identità sintetiche, mai incluse nel prodotto. Le migrazioni sono applicate dalla piattaforma in pubblicazione.

### Database locale

In sviluppo il database è un D1 locale esposto dal binding `DB` e gli allegati sono salvati nel bucket R2 locale `BUCKET`; non vanno configurati come URL o password in `.env.local`. Dopo una build, per inizializzare lo schema nel percorso usato da `pnpm start`:

```bash
node node_modules/wrangler/bin/wrangler.js d1 execute site-creator-d1 --local --persist-to .wrangler/state --file drizzle/0000_curly_molecule_man.sql --config dist/server/wrangler.json
node node_modules/wrangler/bin/wrangler.js d1 execute site-creator-d1 --local --persist-to .wrangler/state --file drizzle/0001_clammy_lockheed.sql --config dist/server/wrangler.json
```

Le migrazioni locali non modificano il database remoto: per quello è necessario usare esplicitamente `--remote`.

### Aiven MySQL

`.env.local` contiene i parametri Aiven ricevuti, ma l'applicazione attuale non li usa ancora: gli endpoint importano il binding D1 `DB` e sono eseguiti come Worker Cloudflare. Per usare davvero Aiven MySQL su un VPS Node.js occorre completare la migrazione dell'adapter database da D1/SQLite a MySQL e sostituire il binding R2 con un client compatibile S3 per gli allegati, oppure mantenere R2 tramite un client HTTP/S3. Inserire la password solo in `AIVEN_MYSQL_PASSWORD` nel file locale o nel gestore dei segreti del VPS; non committarla.

Per creare il database in Aiven con MySQL Workbench, aprire [`db/mysql-workbench.sql`](./db/mysql-workbench.sql), collegarsi al servizio Aiven usando host, porta, utente e SSL indicati nella console Aiven, quindi eseguire tutto lo script. Lo script crea `la_nostra_citta`, le tabelle e le sei proposte dimostrative; è ripetibile e non contiene password né comandi `DROP`.

La distribuzione Vercel usa l'adapter MySQL in [`lib/mysql.ts`](./lib/mysql.ts) e Vercel Blob per gli allegati in [`lib/civic.ts`](./lib/civic.ts). I comandi standard sono `pnpm dev`, `pnpm build` e `pnpm start`; i comandi Cloudflare precedenti restano disponibili con suffisso `:cloudflare`. In Vercel configurare `AIVEN_MYSQL_HOST`, `AIVEN_MYSQL_PORT`, `AIVEN_MYSQL_DATABASE`, `AIVEN_MYSQL_USER`, `AIVEN_MYSQL_PASSWORD`, `AIVEN_MYSQL_SSL=true` e `BLOB_READ_WRITE_TOKEN`. Per disabilitare esplicitamente la verifica del certificato TLS, impostare anche `AIVEN_MYSQL_SSL_VERIFY=false` (sconsigliato su reti non fidate). Creare uno store Blob dal progetto Vercel e aggiungere il token generato alle variabili d'ambiente del progetto. Se una variabile manca, l'app restituisce un errore esplicito invece di usare un database locale.

Vercel Blob è configurato come privato: gli allegati passano sempre dall'endpoint autenticato dell'applicazione e non sono pubblici. Il database relazionale resta MySQL Aiven; Vercel ospita l'app e lo storage degli allegati.

La password Aiven non va mai committata. Se è stata già condivisa o inserita in un luogo non sicuro, revocarla e generarne una nuova dalla console Aiven.

WebMCP espone un filtro di ricerca (nessuna mutazione). Verifica nel browser non disponibile nell'ambiente di creazione; validato tramite compilazione, controllo tipi e test API locali.

## Autenticazione autonoma

`lib/local-auth.ts` gestisce scrypt (N=32768, r=8, p=3), sessioni opache salvate solo come hash, controlli origine e limitazione dei tentativi per IP/email. `app/api/auth/route.ts` espone registrazione, login, logout, migrazione del vecchio profilo, cambio password e recupero. `components/account-access.tsx` contiene i moduli. Le nuove tabelle sono aggiunte dalla migrazione 0001; i dati precedenti non sono alterati. I vecchi header di identità sono usati esclusivamente per collegare un profilo già esistente, mai per autorizzare le normali operazioni del sito.
