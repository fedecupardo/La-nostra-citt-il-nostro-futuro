# Milano Partecipa

Applicazione civica «La nostra città, il nostro futuro», per Insieme per Milano.

## Funzionalità implementate
- Consultazione, ricerca, filtri per tema/municipio/stato e ordinamento per voti.
- Account autonomi con email/password, profilo personale e controllo della maggiore età sul server. Password protette con scrypt; sessioni revocabili in cookie HttpOnly, Secure e SameSite=Lax.
- Registrazione con nome, cognome, email dell'account, codice fiscale, nascita, residenza; caricamento riservato fronte/retro del documento e verifica manuale del comitato.
- Proposte con allegato obbligatorio, modifica dell'autore, discussioni e voto unico imposto dalla chiave primaria del database.
- Pannello comitato: approvazione identità, revisione proposte, rifiuto, eliminazione definitiva riservata agli amministratori, modifica/rimozione commenti, richiesta informazioni e invio al Comune come stato del processo (non spedisce email).
- Registro delle operazioni, storico pubblico delle fasi e cancellazione/anominizzazione dell'account con rimozione dei documenti.
- Dati persistenti su MySQL Aiven e file privati su Vercel Blob. Query parametrizzate, controllo server di ruoli e proprietà, blocco richieste cross-origin, controllo firma dei formati e limite file 8 MB.

## Prima configurazione
Il sito è pubblico. Le nuove registrazioni creano esclusivamente cittadini, mai gestori. Il gestore esistente conserva il proprio ruolo collegando una password dal browser con la sua sessione precedente ancora attiva. Nessun collegamento viene effettuato sulla sola corrispondenza dell'email. Dopo l'attivazione, accesso, uscita e recupero funzionano senza ChatGPT. Il ruolo gestore non equivale a una verifica SPID.

Le sei schede iniziali sono esempi esplicitamente contrassegnati e non consentono interazioni. I contatori rappresentano solo dati effettivamente presenti. Per provare il flusso, attivare il gestore con dati di test, creare una proposta con un allegato di prova, poi aprire Il comitato e pubblicarla.

## Limiti della versione pilota
L'integrazione SPID non è attiva: richiede un gestore autorizzato e configurazioni esterne. L'accesso con email/password non sostituisce SPID. Non è configurato un servizio di invio email: il possesso dell'indirizzo non viene verificato automaticamente e l'identità civile resta soggetta a verifica manuale. Il recupero password avviene mediante un codice casuale personale, mostrato una volta e salvabile dall'utente. Il codice è monouso, ruota dopo ogni recupero/cambio password e revoca le sessioni precedenti. Nessuna password o codice di recupero viene salvato in chiaro. Il controllo automatico del codice fiscale verifica solo formato e lunghezza; il comitato deve verificare corrispondenza e validità dei dati sul documento. La verifica della residenza è manuale.

NLP, classificazione IA, EXIF e visione artificiale non sono attivi. Categoria e moderazione sono manuali. Le notifiche sono consultabili nella scheda, senza invio email. I contenuti ritirati rimangono nello storico con stato Respinta, visibili al proprio autore e al comitato.

Prima dell'apertura ai cittadini: definire titolare, informativa e politica di conservazione; completare gestione del trasferimento dei privilegi; audit di sicurezza/accessibilità; scansione antivirus, quote/rate limiting e controllo durate video; integrazione SPID se scelta. Usare dati e documenti di prova nella versione pilota. Nessuna conformità normativa è dichiarata.

## Sviluppo e verifica
Stack di produzione: Next.js, TypeScript, MySQL Aiven e Vercel Blob. Gli endpoint sono in app/api e l'interfaccia in app/page.tsx.

Comandi: `node node_modules/typescript/bin/tsc --noEmit`, `node tests/security.mjs`. Il test usa un database/file storage isolati e identità sintetiche, mai incluse nel prodotto. Le migrazioni sono applicate dalla piattaforma in pubblicazione.

### Aiven MySQL

Tutte le API di produzione usano esclusivamente l'adapter MySQL in [`lib/mysql.ts`](./lib/mysql.ts). Se una variabile Aiven manca, o `AIVEN_MYSQL_SSL` non è `true`, l'applicazione fallisce esplicitamente: non esiste un fallback a database locale.

Per creare il database in Aiven con MySQL Workbench, aprire [`db/mysql-workbench.sql`](./db/mysql-workbench.sql), collegarsi al servizio Aiven usando host, porta, utente e SSL indicati nella console Aiven, quindi eseguire tutto lo script. Lo script crea `la_nostra_citta`, le tabelle e le sei proposte dimostrative; è ripetibile e non contiene password né comandi `DROP`.

La distribuzione Vercel usa MySQL Aiven e Vercel Blob. In Vercel configurare `AIVEN_MYSQL_HOST`, `AIVEN_MYSQL_PORT`, `AIVEN_MYSQL_DATABASE`, `AIVEN_MYSQL_USER`, `AIVEN_MYSQL_PASSWORD`, `AIVEN_MYSQL_SSL=true` e `BLOB_READ_WRITE_TOKEN`. Per Aiven, `AIVEN_MYSQL_SSL_VERIFY` può restare `false` (il traffico resta cifrato); per verificare la catena TLS impostare `AIVEN_MYSQL_SSL_VERIFY=true` e fornire `AIVEN_MYSQL_CA_CERT` con il certificato CA Aiven, usando `\n` per gli a capo.

### Moderazione automatica

Le segnalazioni e i commenti vengono controllati server-side tramite OpenRouter prima del salvataggio. Configurare `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (default `google/gemini-2.5-flash`) e, facoltativamente, `OPENROUTER_SITE_URL`. Se OpenRouter non è configurato o non risponde, il contenuto viene rifiutato: non esiste un fallback che pubblichi testo non controllato.

Le immagini allegate alle segnalazioni vengono inviate allo stesso modello multimodale e controllate per pubblicabilità e pertinenza rispetto a titolo e descrizione. I PDF e i video seguono i controlli di formato e dimensione già esistenti, ma non vengono classificati come immagini.

Vercel Blob è configurato come privato: gli allegati passano sempre dall'endpoint autenticato dell'applicazione e non sono pubblici. Il database relazionale resta MySQL Aiven; Vercel ospita l'app e lo storage degli allegati.

La password Aiven non va mai committata. Se è stata già condivisa o inserita in un luogo non sicuro, revocarla e generarne una nuova dalla console Aiven.

### Ruoli amministrativi e migrazioni MySQL

I ruoli applicativi sono `cittadino`, `moderatore`, `admin` e `comitato` (quest'ultimo resta compatibile con il gestore storico). Gli account staff vedono nella navigazione le sezioni **Moderazione** e, per admin/comitato, **Amministrazione**. Moderatori possono revisionare proposte e commenti; amministratori possono inoltre verificare identità, consultare il registro, gestire tutti gli utenti e assegnare o rimuovere ruoli. Nella scheda di ogni proposta l'admin può modificare anche tema, municipio e tipo. Ogni controllo viene ripetuto sul server.

La migrazione MySQL incrementale in [`db/mysql-migrations/0002_sessions_and_staff.sql`](./db/mysql-migrations/0002_sessions_and_staff.sql) crea la tabella delle sessioni e il registro delle migrazioni. Per promuovere il primo amministratore dopo che l'utente ha completato la registrazione, con le variabili Aiven già presenti nell'ambiente, usare `pnpm db:promote-admin -- email@example.com`. Il comando modifica solo un profilo esistente e non accetta dati di autenticazione.

Per creare due account di test completi direttamente in Aiven, usare `pnpm db:create-users -- admin@example.com "password-admin-12" cittadino@example.com "password-cittadino-12"`. Il primo viene creato come `admin`, il secondo come `cittadino`; entrambi sono verificati. Le password sono solo argomenti locali del comando e non vengono salvate in chiaro.

WebMCP espone un filtro di ricerca (nessuna mutazione). Verifica nel browser non disponibile nell'ambiente di creazione; validato tramite compilazione, controllo tipi e test API locali.

## Autenticazione autonoma

`lib/local-auth.ts` gestisce scrypt (N=32768, r=8, p=3), sessioni opache salvate solo come hash, controlli origine e limitazione dei tentativi per IP/email. `app/api/auth/route.ts` espone registrazione, login, logout, migrazione del vecchio profilo, cambio password e recupero. `components/account-access.tsx` contiene i moduli. Le nuove tabelle sono aggiunte dalla migrazione 0001; i dati precedenti non sono alterati. I vecchi header di identità sono usati esclusivamente per collegare un profilo già esistente, mai per autorizzare le normali operazioni del sito.
