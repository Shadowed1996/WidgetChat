<!--
  «il pollaio» è software proprietario: le pull request si accettano solo su
  invito. Se non ne hai concordata una, apri una issue: è il canale giusto e
  viene letta. Vedi CONTRIBUTING.md.
-->

## Descrizione

<!-- Cosa cambia e, soprattutto, perché. Il cosa si legge anche dal diff; il perché no. -->

## Tipo di modifica

- [ ] `fix` — correzione di un difetto
- [ ] `feat` — funzionalità nuova
- [ ] `docs` — solo documentazione
- [ ] `style` — formattazione, senza cambi di comportamento
- [ ] `refactor` — riscrittura che non cambia il comportamento
- [ ] `perf` — prestazioni
- [ ] `test` — casi del banco di prova
- [ ] `chore` — manutenzione o configurazione

## Che parte tocca

- [ ] L'overlay (`app/pollaio.html`, `app/js/`, `app/css/`)
- [ ] La regia (`app/regia.html`, `app/js/regia.js`)
- [ ] Il launcher Windows (`avvio/Pollaio.cs`)
- [ ] Il banco di prova (`app/prove.html`, `app/js/prove.js`)
- [ ] Documentazione
- [ ] Workflow e configurazione del repository

## Issue collegata

<!-- Es. Chiude #12 -->

## Come è stato provato

<!--
  Non c'è una build e non c'è un test runner: si apre il file. Di' cosa hai
  aperto e cosa hai guardato.
-->

- [ ] `app/prove.html` è verde
- [ ] Provato con il traffico finto (`?prova=1`, e `&ostile=1` per i casi cattivi)
- [ ] Provato nella sorgente browser di OBS
- [ ] Provato nella finestra di `Pollaio.exe`
- [ ] Il launcher ricompila con `avvio\compila.cmd`

Ambiente di prova: <!-- Windows, motore (WebView2/Chrome), OBS -->

## Checklist

- [ ] Ho letto `CONTRATTO.md` e la modifica non ne viola i vincoli.
- [ ] Un solo argomento in questa PR.
- [ ] Zero dipendenze aggiunte: niente npm, niente CDN, niente framework.
- [ ] Funziona ancora aperto da `file://`.
- [ ] Indentazione rispettata: 2 spazi in JS e CSS, 4 nel C#.
- [ ] I commenti di lavoro sono stati tolti dal codice pubblicato.
- [ ] Nessun colore fuori da `tokens.css`, nessun `!important`.
- [ ] Nessun `innerHTML` su roba che arriva dalla chat.
- [ ] **Nessun segreto committato**: gettoni, chiavi API, `pollaio.ini`.
- [ ] Documentazione aggiornata (`LEGGIMI.md` per chi usa, `CONTRATTO.md` per chi scrive).
- [ ] `CHANGELOG.md` aggiornato se la modifica è visibile a chi lo usa.
- [ ] Se cambia la versione: `VERSIONE` in `avvio/Pollaio.cs` e il tag `vX.Y.Z` coincidono.

## Note per chi legge

<!-- Scelte non ovvie, alternative scartate, cose rimaste in sospeso. -->
