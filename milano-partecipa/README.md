# Milano Partecipa

Applicazione civica «La nostra città, il nostro futuro», per Insieme per Milano.

## Funzionalità implementate
- Consultazione, ricerca, filtri per tema/municipio/stato e ordinamento per voti.
- Account con autenticazione gestita dalla piattaforma ChatGPT, profilo personale e controllo della maggiore età sul server.
- Registrazione con nome, cognome, email dell'account, codice fiscale, nascita, residenza; caricamento riservato fronte/retro del documento e verifica manuale del comitato.
- Proposte con allegato obbligatorio, modifica dell'autore, discussioni e voto unico imposto dalla chiave primaria del database.
- Pannello comitato: approvazione identità, revisione proposte, modifica/rimozione commenti, richiesta informazioni e invio al Comune come stato del processo (non spedisce email).
- Registro delle operazioni, storico pubblico delle fasi e cancellazione/anominizzazione dell'account con rimozione dei documenti.
- Dati persistenti D1 e file privati R2. Query parametrizzate, controllo server di ruoli e proprietà, blocco richieste cross-origin, controllo firma dei formati e limite file 8 MB.

## Prima configurazione
Il sito nasce privato, accessibile solo al proprietario. Il primo profilo può attivarsi come gestore. Questa inizializzazione deve essere completata PRIMA di ampliare l'accesso. Il ruolo gestore è operativo: non equivale a un'identità civile verificata e non viene presentato come verifica SPID.

Le sei schede iniziali sono esempi esplicitamente contrassegnati e non consentono interazioni. I contatori rappresentano solo dati effettivamente presenti. Per provare il flusso, attivare il gestore con dati di test, creare una proposta con un allegato di prova, poi aprire Il comitato e pubblicarla.

## Limiti della versione pilota
L'integrazione SPID non è attiva: richiede un gestore autorizzato e configurazioni esterne. L'accesso ChatGPT non sostituisce SPID. Il controllo automatico del codice fiscale verifica solo formato e lunghezza; il comitato deve verificare corrispondenza e validità dei dati sul documento. La verifica della residenza è manuale.

NLP, classificazione IA, EXIF e visione artificiale non sono attivi. Categoria e moderazione sono manuali. Le notifiche sono consultabili nella scheda, senza invio email. I contenuti ritirati rimangono nello storico con stato Respinta, visibili al proprio autore e al comitato.

Prima dell'apertura ai cittadini: definire titolare, informativa e politica di conservazione; completare gestione del trasferimento dei privilegi; audit di sicurezza/accessibilità; scansione antivirus, quote/rate limiting e controllo durate video; integrazione SPID se scelta. Usare dati e documenti di prova nella versione pilota. Nessuna conformità normativa è dichiarata.

## Sviluppo e verifica
Stack: React/Vinext, TypeScript, Cloudflare Workers, D1/SQLite e R2. Gli schemi sono in db/schema.ts, le migrazioni in drizzle, gli endpoint in app/api e l'interfaccia in app/page.tsx.

Comandi: `node node_modules/typescript/bin/tsc --noEmit`, `node tests/security.mjs`. Il test usa un database/file storage isolati e identità sintetiche, mai incluse nel prodotto. Le migrazioni sono applicate dalla piattaforma in pubblicazione.

WebMCP espone un filtro di ricerca (nessuna mutazione). Verifica nel browser non disponibile nell'ambiente di creazione; validato tramite compilazione, controllo tipi e test API locali.
