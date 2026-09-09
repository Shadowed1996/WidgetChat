# Changelog

Tutte le modifiche degne di nota di questo progetto sono annotate qui.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it-IT/1.1.0/) e
il progetto aderisce al [Versionamento semantico](https://semver.org/lang/it/).

Le voci sono ricavate dalla storia di git e dai tag pubblicati nelle
[Releases](https://github.com/Shadowed1996/WidgetChat/releases). Il numero di
versione vive nella costante `VERSIONE` di `avvio/Pollaio.cs` e deve sempre
coincidere col tag: il workflow di release si ferma se i due non combaciano.

## [Non rilasciato]

## [1.2.16] — 2026-09-10

### Aggiunto
- Manopola **«Il fondo dei messaggi»** (`tinta`): il riquadro di ogni messaggio
  può restare quello del tema oppure diventare trasparente, viola o ciano — le
  due tinte sono quelle della fascia dell'Hype Train. Col tema «Nudo» non fa
  niente, perché lì il riquadro non esiste.
- Nel campo per scrivere, **freccia su richiama l'ultima riga mandata**, e da lì
  si risale; giù torna avanti fino al campo vuoto. Le ultime venti righe, tenute
  solo in memoria e mai scritte su disco.
- Documentazione standard del repository: `README.md`, `LICENSE`, `SECURITY.md`,
  `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`.
- Template per issue e pull request, `CODEOWNERS`, `dependabot.yml` e un
  workflow di verifica non bloccante.
- `.editorconfig` allineato all'indentazione realmente usata nel progetto.

### Modificato
- `.gitattributes` e `.gitignore` estesi: `lib/` marcata come libreria di terzi,
  binari dichiarati come tali, esclusi gli artefatti di compilazione mancanti.

### Corretto
- L'anteprima della regia non si allunga più oltre la finestra quando si alza il
  cursore dell'altezza: la scena diventa una finestrella che scorre e il righello
  col cursore resta in vista. L'anteprima non si rimpicciolisce — sarebbe una
  misura falsa proprio dove serve quella vera — e quando è tagliata lo dice.
- Nel tema «Notte» la sbarretta colorata del rilievo torna visibile: il bordo del
  tema le passava sopra, e non si era mai vista.

## [1.2.15] — 2026-09-09

### Modificato
- Premuto **Salva**, si aggiorna da sola anche la sorgente in OBS: la pagina
  chiede al server se la configurazione è cambiata e si ricarica sopra la nuova,
  senza toccare OBS.

## [1.2.14] — 2026-09-09

### Modificato
- L'indirizzo da incollare in OBS è soltanto indirizzo e porta: la coda di
  configurazione la attacca il server.

## [1.2.13] — 2026-09-09

### Modificato
- L'indirizzo per OBS si incolla una volta sola e non va più rifatto a ogni
  modifica.
- La finestra della regia si sposta afferrandola da qualunque punto libero.

## [1.2.12] — 2026-09-09

### Corretto
- La striscia dei filtri sotto la chat ha ritrovato le sue spaziature.

### Modificato
- Documentazione riallineata al codice.

## [1.2.11] — 2026-09-09

### Corretto
- In OBS i riquadri dei messaggi tornano visibili: sistemate le tre trappole
  della trasparenza che li facevano sparire.

## [1.2.10] — 2026-09-09

### Modificato
- Il pannello di «chi c'è» mostra le persone invece di spiegare cosa farebbe.

## [1.2.9] — 2026-09-09

### Corretto
- «Chi c'è» guarda il canale che stai seguendo, non quello di chi ha fatto il
  login.

## [1.2.8] — 2026-09-09

### Modificato
- La regia è organizzata a cassetti.

### Corretto
- Il bottone **Salva** salva davvero tutto quello che hai girato.

## [1.2.7] — 2026-09-09

### Corretto
- Le righe di moderazione non fanno più l'effetto glitch: lì non c'è niente da
  raccontare.

## [1.2.6] — 2026-09-09

### Aggiunto
- Due code di configurazione invece di una: una per la finestra del launcher,
  una per la sorgente browser di OBS, perché «trasparente» vuol dire due cose
  diverse nei due posti.

### Corretto
- Il bottone che applica le impostazioni le applica davvero.

## [1.2.5] — 2026-09-09

### Aggiunto
- La regia avvisa quando `Pollaio.exe` è rimasto indietro rispetto al widget.

## [1.2.4] — 2026-09-09

### Corretto
- Le emote proposte dal suggeritore sono quelle del canale, non quelle di chi ha
  fatto il login.

## [1.2.3] — 2026-09-09

### Aggiunto
- Il launcher serve la chat sulla rete di casa: in OBS si incolla un indirizzo
  `http://`, e funziona anche da un secondo computer. Si spegne con `rete=0`,
  la porta si sceglie con `porta=`.

### Modificato
- OBS non ha più bisogno di un percorso su disco.

## [1.2.2] — 2026-09-09

### Aggiunto
- La spia dice se sei in diretta: «IN LIVE» verde, «OFFLINE» rossa, così
  «canale spento» smette di sembrare un guasto.
- Il bottone **Copia** della regia dà un indirizzo che OBS apre davvero.

### Corretto
- Quattro difetti minori, e i pannelli hanno ritrovato le spaziature.

## [1.2.1] — 2026-09-09

### Aggiunto
- La regia dice quando è Windows a spegnere le animazioni, e come chiederle
  comunque con `movimento=sempre` — che è quello che serve in una sorgente
  browser di OBS.

## [1.2.0] — 2026-09-09

### Aggiunto
- **Le live congiunte di Twitch**: chi scrive da un altro canale si vede per
  quello che è, con la sua faccia, i suoi badge e le sue emote. Senza collegare
  alcun account.

## [1.1.5] — 2026-09-09

### Aggiunto
- Il pannellino del sondaggio si apre digitando `/poll` nel campo della chat.

### Corretto
- La fila dei filtri è tornata a fare i filtri.

## [1.1.4] — 2026-09-09

### Aggiunto
- Il menù che si apre cliccando un nome, e i pannellini di sondaggio e
  pronostico.

### Corretto
- Un 401 che raccontava una cosa per un'altra.

## [1.1.3] — 2026-09-09

### Aggiunto
- I comandi di Twitch dal campo della chat.
- Il pannello di chi c'è in chat.
- Le emote del canale nel suggeritore che si apre coi due punti.

### Corretto
- Un comando scritto nel campo finiva in chat in chiaro invece di essere
  eseguito.

## [1.1.2] — 2026-09-08

### Corretto
- Le emote mancavano per tre motivi diversi, e nessuno era quello che sembrava.

### Modificato
- Documentazione riallineata al codice.

## [1.1.1] — 2026-09-08

### Corretto
- Senza WebView2 il bottone diceva una bugia: ora dichiara il ripiego su Chrome.

### Modificato
- `CONTRATTO.md` riallineato al codice.
- **Connetti account** in un clic: il Client ID esce di mezzo.

## [1.1.0] — 2026-09-08

### Aggiunto
- **Scrivere in chat** dal campo in fondo alla finestra, con l'account Twitch
  collegato.
- I filtri e la pausa nella striscia sotto la chat.
- La finestra senza cornice si ridimensiona tirandola dai bordi.

## [1.0.6] — 2026-09-08

### Aggiunto
- Le impostazioni scelte nella regia arrivano fino a `Pollaio.exe`.
- I tre caratteri stanno nel progetto: se la rete tossisce proprio mentre parte
  la diretta, l'overlay non ripiega più sui caratteri di sistema.

## [1.0.5] — 2026-09-08

### Modificato
- La misura della finestra nella regia su due colonne, coi bottoni sotto ai
  campi.

## [1.0.4] — 2026-09-08

### Modificato
- La misura della finestra si applica subito, e la chat si adatta a quanto è
  grande.
- Ripassata alla regia: tolto un numero scritto due volte, raddrizzati due
  allineamenti.

### Corretto
- Il workflow di release usa `actions/checkout@v5`: la v4 girava su Node 20, che
  GitHub sta spegnendo.

## [1.0.3] — 2026-09-08

### Corretto
- Il controllo sulla versione nel workflow non compilava: `$dentro` seguito da
  due punti veniva letto da PowerShell come un qualificatore di drive.

## [1.0.2] — 2026-09-08

### Aggiunto
- Il pollaio si aggiorna da solo all'avvio, e lo fa vedere sullo splash.
- La misura della finestra si cambia dalla regia.

### Modificato
- La chat vuota dice su quale canale sta ascoltando, invece di restare muta.

## [1.0.1] — 2026-09-08

### Corretto
- Il workflow saltava la generazione dell'icona: PowerShell non aspetta
  un'applicazione con finestre, e la ricompilazione con l'icona veniva saltata
  in silenzio.

## [1.0.0] — 2026-09-08

Prima release pubblica.

### Aggiunto
- **Il widget**: overlay della chat di Twitch per OBS, in HTML, CSS e JavaScript
  scritti a mano, senza dipendenze e funzionante anche da `file://`.
- Emote di Twitch, 7TV, BetterTTV e FrankerFaceZ, cheermote, badge, colori dei
  nomi, `/me`, risposte.
- Eventi: abbonamenti, riabbonamenti, regali, raid, annunci, bits, moderazione.
- L'hype train.
- Il rilievo su menzioni, parole scelte e primo messaggio di chi non ha mai
  scritto.
- **La regia** (`app/regia.html`), il configuratore con l'anteprima dal vivo.
- **Il banco di prova** (`app/prove.html`) e la diagnostica per OBS
  (`app/prova-obs.html`).
- **Il launcher C#** (`avvio/Pollaio.cs`), con finestra senza cornice, splash e
  menu sul tasto destro; si ricompila con `avvio/compila.cmd`.
- **`Installa.exe`**: scarica dalla release, scompatta e crea il collegamento sul
  desktop, senza permessi di amministratore e senza toccare il registro.
- Il workflow di release che compila il launcher, prepara `pollaio.zip` e
  pubblica il tutto.

[Non rilasciato]: https://github.com/Shadowed1996/WidgetChat/compare/v1.2.16...HEAD
[1.2.16]: https://github.com/Shadowed1996/WidgetChat/compare/v1.2.15...v1.2.16
[1.2.15]: https://github.com/Shadowed1996/WidgetChat/compare/v1.2.14...v1.2.15
[1.2.14]: https://github.com/Shadowed1996/WidgetChat/compare/v1.2.13...v1.2.14
[1.2.13]: https://github.com/Shadowed1996/WidgetChat/compare/v1.2.12...v1.2.13
[1.2.12]: https://github.com/Shadowed1996/WidgetChat/compare/v1.2.11...v1.2.12
[1.2.11]: https://github.com/Shadowed1996/WidgetChat/compare/v1.2.10...v1.2.11
[1.2.10]: https://github.com/Shadowed1996/WidgetChat/compare/v1.2.9...v1.2.10
[1.2.9]: https://github.com/Shadowed1996/WidgetChat/compare/v1.2.8...v1.2.9
[1.2.8]: https://github.com/Shadowed1996/WidgetChat/compare/v1.2.7...v1.2.8
[1.2.7]: https://github.com/Shadowed1996/WidgetChat/compare/v1.2.6...v1.2.7
[1.2.6]: https://github.com/Shadowed1996/WidgetChat/compare/v1.2.5...v1.2.6
[1.2.5]: https://github.com/Shadowed1996/WidgetChat/compare/v1.2.4...v1.2.5
[1.2.4]: https://github.com/Shadowed1996/WidgetChat/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/Shadowed1996/WidgetChat/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/Shadowed1996/WidgetChat/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/Shadowed1996/WidgetChat/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/Shadowed1996/WidgetChat/compare/v1.1.5...v1.2.0
[1.1.5]: https://github.com/Shadowed1996/WidgetChat/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/Shadowed1996/WidgetChat/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/Shadowed1996/WidgetChat/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/Shadowed1996/WidgetChat/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/Shadowed1996/WidgetChat/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/Shadowed1996/WidgetChat/compare/v1.0.6...v1.1.0
[1.0.6]: https://github.com/Shadowed1996/WidgetChat/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/Shadowed1996/WidgetChat/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/Shadowed1996/WidgetChat/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/Shadowed1996/WidgetChat/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/Shadowed1996/WidgetChat/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/Shadowed1996/WidgetChat/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Shadowed1996/WidgetChat/releases/tag/v1.0.0
