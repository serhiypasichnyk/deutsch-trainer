Deutsch Trainer Mobile — PWA offline-first, Google Sheets sync opzionale.
Apri ISTRUZIONI_INSTALLAZIONE.txt prima della pubblicazione.
SICUREZZA: questa cartella non contiene il catalogo personale dell'utente, né token OAuth, né segreti. Non aggiungere il file DeutschTrainer_DatiPrivati.json in una cartella pubblicata.
Contenuto: index.html, boot.js, app.js, cloud-sync.js, style.css, exercises.js, extension.js, manifest.webmanifest, sw.js, icone e dati demo vuoti.
Importa il catalogo personale dalla schermata Impostazioni. Il catalogo viene salvato in IndexedDB. La sincronizzazione scrive gli eventi nel foglio Verifiche dopo autorizzazione Google OAuth.
Il progetto HTML e JS è modificabile localmente. Per la distribuzione PWA è necessario HTTPS e per la sincronizzazione Google Sheets è necessario un OAuth Client ID del tuo progetto Google Cloud.
