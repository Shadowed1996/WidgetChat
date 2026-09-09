# CONTRATTO — «il pollaio», widget chat per OBS

Documento vincolante. Chi scrive un file di questo progetto lo legge prima, e non
inventa niente che non sia scritto qui.

---

## 0. Cos'è, in una riga

Una pagina HTML autonoma che si collega alla chat Twitch di **slayer_beard**, la
disegna con la grafica del canale, e si cattura da OBS come sorgente browser.

**Non è** un pezzo del sito. Il sito in `Desktop\sito` è **solo riferimento
visivo**: da lì si prende la palette, il carattere, la grammatica dei componenti.
Non si importa un file, non si dipende da niente che stia là fuori.

## 1. Vincoli non negoziabili

1. **Zero dipendenze.** Niente npm, niente build, niente framework, niente CDN di
   librerie. Solo HTML, CSS e JavaScript scritti a mano. I caratteri stanno nel
   progetto (`app/font/`, dichiarati da `css/font.css`): dalla rete arrivano
   solo le **immagini di emote e badge** e le risposte delle sorgenti di §7.
2. **Deve funzionare da `file://`.** OBS punta al file locale sul disco. Niente
   `type="module"` (i moduli ES sono bloccati da `file://` per via della CORS),
   niente `fetch` di file locali, niente percorsi assoluti. Solo `<script src>`
   classici e percorsi relativi.
3. **La lettura è anonima sempre, la scrittura si accende apposta.** La chat si
   legge con la connessione anonima a IRC (`justinfan`): nessun login, nessuna
   credenziale, in nessuna condizione — questa metà non è negoziabile. Chi non
   collega niente ha il pollaio di sempre: guarda, non parla, non può essere
   bannato.

   La scrittura è una cosa in più che l'utente accende da sé: è **il suo**
   account Twitch, collegato con un clic dalla regia oppure dal bottone che sta
   nella barra sotto la chat (§18), e i messaggi partono da
   `helix/chat/messages`. La connessione IRC **non** si tocca: resta anonima e
   di sola lettura anche quando un account c'è, e il messaggio appena mandato
   torna indietro di lì come quello di chiunque altro.

   **Gli scopi: da uno a sedici.** Qui c'era scritto «un solo scopo
   (`user:write:chat`)», e non è più vero: la costante `SCOPI` di
   `app/js/conto.js` oggi ne chiede sedici, perché accanto al campo per
   scrivere sono nati i ventisette comandi di Twitch, il menù che si apre
   cliccando un nome, l'elenco di chi c'è in chat (§19) e le live congiunte
   (§17).

   **La regola che sopravvive non è il numero: è che si chiede solo ciò che
   serve a una funzione che c'è davvero.** Ogni permesso di questo elenco è
   legato a un comando che si vede e che si può premere; nessuno è chiesto «per
   il futuro», «per comodità» o perché stava nella stessa famiglia di un altro.
   Uno scopo che non ha dietro una funzione non entra, e una funzione che ne
   vorrebbe uno nuovo si discute qui dentro prima che nel codice — che è
   esattamente la frase di prima, scritta quando la funzione era una sola.

   L'elenco, e accanto a ognuno la funzione che lo giustifica:

   - `user:write:chat` — il campo sotto la chat, `helix/chat/messages` (§18)
   - `user:read:emotes` — le tue emote native dentro il suggeritore (§18)
   - `user:manage:whispers` — `/w`, il sussurro
   - `moderator:read:chatters` — chi c'è in chat, l'elenco della barra (§19)
   - `moderator:manage:banned_users` — `/ban`, `/timeout`, `/unban`,
     `/untimeout`
   - `moderator:manage:chat_messages` — `/clear`
   - `moderator:manage:chat_settings` — `/slow`, `/followers`, `/subscribers`,
     `/emoteonly`, `/uniquechat` e i loro `off`
   - `moderator:manage:announcements` — `/announce`
   - `moderator:manage:shoutouts` — `/shoutout`
   - `channel:manage:raids` — `/raid`, `/unraid`
   - `channel:manage:polls` — `/poll`
   - `channel:manage:predictions` — `/prediction`
   - `channel:manage:broadcast` — `/marker`
   - `channel:manage:moderators` — `/mod`, `/unmod`, e i moderatori dentro
     l'elenco di chi c'è
   - `channel:manage:vips` — `/vip`, `/unvip`, e i VIP nello stesso elenco
   - `user:read:chat` — le tre iscrizioni EventSub delle live congiunte (§17):
     sapere chi partecipa prima che scriva, e sapere quando la sessione
     finisce. **Non serve a leggere la chat**, che resta anonima: i messaggi
     continuano ad arrivare tutti dall'IRC di `justinfan`. È il solo scopo
     dell'elenco che, se manca, non spegne una funzione ma la lascia zoppa —
     la live congiunta si riconosce comunque dai tag dei messaggi

   **Il costo si paga una volta, e va detto perché è il prezzo della
   decisione**: chi aveva già collegato l'account quando lo scopo era uno solo
   **deve rifare il collegamento**. Un gettone non si allarga — i permessi si
   fissano nel momento in cui l'utente dice di sì, e per averne di più bisogna
   tornare a chiederglielo. Il pollaio però non lo scopre al momento sbagliato:
   `Conto.puo(scopo)` guarda i permessi **prima** di chiamare Twitch (§19),
   quindi la voce che non può si spegne e lo dice, invece di partire e
   schiantarsi contro un 401. E un conto salvato da una versione vecchia non ha
   nemmeno il campo `scopi`, quindi **non può niente**: è voluto, ed è il modo
   di obbligare a riconnettere invece di lasciar credere che qualcosa si sia
   rotto.

   **Il gettone sta in `localStorage` e da nessun'altra parte**: mai nella
   querystring, mai in `avvio\pollaio.ini`, mai in un file, mai dentro
   l'indirizzo che si incolla in OBS. In una sorgente browser di OBS il gettone
   non arriva e il campo per scrivere non compare: è voluto (§18).

   Il vincolo che sopravvive intatto è quello di sempre: **nessun segreto dentro
   i file del progetto**. La riga di confine, però, passa fra due cose che si
   somigliano e non sono la stessa, e va detta chiaramente: è quella distinzione
   che regge tutto il vincolo.

   Il **Client ID è un nome, non un segreto**. Viaggia in chiaro dentro ogni
   richiesta, chiunque guardi la rete lo legge, e da solo non apre niente: senza
   il sì dell'utente su Twitch non vale nulla. Quindi **può stare nel sorgente**,
   ed è la costante `CLIENTE_PREDEFINITO` in cima a `app/js/conto.js`, il Client
   ID dell'applicazione del canale, registrata su `dev.twitch.tv` come
   **Public**. Gli scopi lì non si registrano: si chiedono a ogni collegamento,
   e sono quelli dell'elenco qui sopra. Se un giorno la costante la si svuota,
   il Client ID torna a metterlo l'utente dal campo della regia; chi si porta
   via il progetto ci mette il suo.

   `Conto.cliente()` guarda in ordine il conto collegato, poi il Client ID messo
   da parte in `localStorage` (`sb-pollaio-cliente`), poi la costante;
   `Conto.serveClientId()` dice se dopo tutti e tre manca ancora. **Perché una
   costante e non soltanto il campo della regia**: registrare un'applicazione su
   `dev.twitch.tv` era l'unico passaggio che si frapponeva fra l'utente e
   qualsiasi cosa, ed è un passaggio che non protegge niente.

   Il **gettone** è esattamente ciò che il Client ID non è: apre davvero, vale
   per l'account di chi l'ha dato, e **non deve finire in nessun file, mai** —
   `localStorage` e basta, come sopra. Il client secret non serve, non si chiede
   e non si scrive da nessuna parte.
4. **Niente `innerHTML` con roba che arriva dalla chat.** Mai, in nessun caso,
   per nessuna scorciatoia. Si costruisce con `document.createElement` e si
   scrive con `textContent`. Gli URL delle immagini si validano con
   `/^https:\/\//` prima di finire in un attributo `src`.
5. **Niente esadecimali fuori da `css/tokens.css`.** Serve una tinta che non è un
   token? Si ricava con `color-mix()` da un token. Sempre.
6. **Niente `!important`.**
7. **Niente `TODO`, niente segnaposto, niente funzioni a metà.** Quello che c'è,
   funziona.
8. **Tutto in italiano**: nomi di file, classi, funzioni, variabili, commenti,
   testi a schermo. I nomi dei tag del protocollo IRC restano quelli di Twitch.
9. **Ogni file si disinnesca da solo** se manca il suo elemento nel DOM o se una
   richiesta di rete fallisce. Un provider di emote irraggiungibile fa perdere
   quelle emote, non il widget.

## 2. Stile del codice — si imita il sito, che è già scritto così

- **Un file = un IIFE = un globale.** Nessun `import`/`export`.

  ```js
  (function () {
    'use strict';
    /* ... */
    window.NomeModulo = { /* API pubblica, e solo quella */ };
  }());
  ```

- **ES5-ish**: `function` anonime, niente arrow function, niente classi, niente
  `async`/`await` nei file del widget (si usano le Promise con `.then`).
- **Costanti in MAIUSCOLO** in cima al file: `CANALE`, `MAX_MESSAGGI`, `FINESTRA`.
- **Accesso a `localStorage` sempre dentro `try/catch`**, anche in lettura.
  Chiavi con prefisso `sb-pollaio-`.
- **Il codice pubblicato non porta commenti.** È una decisione presa a progetto
  già scritto: i sorgenti erano commentati fittamente — cappello per ogni file,
  il perché di ogni scelta accanto alla riga che la mette in pratica,
  l'alternativa scartata quando serviva — e sono stati spogliati prima di
  pubblicarli.

  **Quelle spiegazioni non sono perdute: stanno nella storia di git**, nel primo
  commit. Chi deve capire perché una riga è come è, la cerca lì:

  ```
  git log -p --reverse -- app/js/kick.js
  ```

  Vale la pena sapere cosa c'era scritto, perché sono difetti già pagati una
  volta: che il campo `data` di Kick è una stringa JSON e va aperto due volte,
  che l'app key che circola nei repository è morta, che `ripulisciTesto` mette
  in minuscolo e distruggerebbe un id YouTube, che DWM non arrotonda le
  finestre senza cornice, che `Spaziato` è alla terza versione perché le prime
  due sbagliavano in due modi diversi.

  Chi aggiunge codice nuovo lo scriva pure commentato mentre lavora: è il modo
  di non ripetere gli stessi errori. I commenti si tolgono alla fine, non
  all'inizio.
- **Proprietà logiche nel CSS**: `inline-size`, `block-size`,
  `inset-inline-start`, `padding-block`, `border-block-end`. Mai `width`/`left`/
  `top` se esiste il corrispettivo logico.

## 3. Nome del blocco CSS

Il blocco è **`.pollaio`**. Sul sito la chat si chiama così da anni («in chat il
posto si chiama pollaio da così tanto tempo che la mascotte ha finito per farci il
verso»), e `.chat__*` è già occupato dal foglio del player del sito.

Convenzione: **BEM leggero in italiano**.

- blocco `.pollaio`
- elemento `.pollaio__riga`, `.pollaio__nome`, `.pollaio__corpo`
- secondo livello con **trattino singolo**: `.pollaio__riga-testa`, mai un secondo `__`
- modificatore `.pollaio--nudo`
- **stato `.is-*`**: `.is-mod`, `.is-nuovo`, `.is-cancellato`
- **stati enumerati su `data-*`**, non su classi: `[data-tema="notte"]`,
  `[data-rilievo="alto"]`

## 4. I file e chi possiede cosa

Ogni file possiede **solo** il proprio blocco. Nessuno scrive le classi di un altro.

```
chat/
├─ Pollaio.exe       ← il launcher: apre l'overlay nella sua finestra
├─ Regia.exe         ← lo stesso eseguibile copiato: apre la regia
│                       (e Installa.exe, terzo nome, sta nelle release:
│                       scarica e installa. Un solo sorgente, tre nomi:
│                       il programma guarda come si chiama)
├─ LEGGIMI.md        ← per chi lo usa
├─ CONTRATTO.md      ← questo documento, per chi ci mette mano
├─ lib/              ← le tre librerie di WebView2 (§1.1, deroga dichiarata).
│                       Stanno qui e non accanto agli eseguibili: la radice
│                       contiene le cose che si aprono e nient'altro. Il
│                       launcher le trova da sé (classe Librerie).
├─ avvio/            ← il launcher: sorgente, compila.cmd, icona, pollaio.ini
└─ app/              ← IL WIDGET. È questa la radice del dominio finto della
   │                    Vetrina, ed è la cartella che si punta da OBS.
   ├─ pollaio.html   ← l'overlay. È QUESTA la sorgente browser di OBS.
   ├─ regia.html     ← il configuratore: anteprima dal vivo e indirizzo da copiare
   ├─ prove.html     ← il banco di prova (§16)
   ├─ css/
   │  ├─ tokens.css     ← la palette. L'UNICO file con esadecimali.
   │  ├─ pollaio.css    ← l'overlay
   │  ├─ regia.css      ← il configuratore
   │  ├─ menu.css       ← il menu del tasto destro. Foglio SUO perché serve a
   │  │                    tutte e due le pagine, che per il resto non
   │  │                    condividono niente (la regia non carica pollaio.css)
   │  ├─ prove.css      ← il banco di prova
   │  └─ font.css       ← i tre caratteri, presi da `font/` e non dalla rete
   ├─ font/             ← i .woff2 e la loro licenza
   ├─ js/
   │  ├─ impostazioni.js  window.Impostazioni  — legge la querystring
   │  ├─ irc.js           window.Irc           — protocollo e connessione (Twitch)
   │  ├─ kick.js          window.Kick          — la chat di Kick, via Pusher (§17)
   │  ├─ youtube.js       window.Youtube       — la chat di una diretta YouTube (§17)
   │  ├─ emote.js         window.Emote         — Twitch, 7TV, BTTV, FFZ, cheermote
   │  ├─ badge.js         window.Badge         — badge globali e di canale
   │  ├─ rilievo.js       window.Rilievo       — cosa merita di essere evidenziato
   │  ├─ eventi.js        window.Eventi        — abbonamenti, raid, bits, moderazione
   │  ├─ treno.js         window.Treno         — l'Hype Train (vedi §15)
   │  ├─ stormo.js        window.Stormo        — le live congiunte: chi sono gli altri canali (§17)
   │  ├─ resa.js          window.Resa          — dal messaggio al DOM
   │  ├─ conto.js         window.Conto         — l'account Twitch: gettone, permessi, e il tramite verso Helix (§18)
   │  ├─ comandi.js       window.Comandi       — i ventisette comandi di Twitch, uno per endpoint (§19)
   │  ├─ gente.js         window.Gente         — quanti guardano e chi c'è in chat (§19)
   │  ├─ azioni.js        window.Azioni        — il menù che si apre cliccando un nome (§19)
   │  ├─ barra.js         window.Barra         — la striscia sotto la chat (§18)
   │  ├─ prova.js         window.Prova         — traffico finto per sistemare in OBS
   │  ├─ menu.js          window.Menu          — il tasto destro, il trascinamento e il bordo che ridimensiona, nella finestra del launcher (§20)
   │  ├─ regia.js         window.Regia         — il configuratore
   │  ├─ prove.js         window.Prove         — i casi del banco (§16)
   │  └─ pollaio.js       window.Pollaio       — mette insieme i pezzi
   └─ img/                mascot.png, avatar.png, favicon.png
```

Ordine di caricamento in `pollaio.html`, **è un contratto**: chi espone un globale
viene prima di chi lo consuma.

```html
<script src="js/impostazioni.js"></script>
<script src="js/irc.js"></script>
<script src="js/kick.js"></script>
<script src="js/youtube.js"></script>
<script src="js/emote.js"></script>
<script src="js/badge.js"></script>
<script src="js/rilievo.js"></script>
<script src="js/eventi.js"></script>
<script src="js/treno.js"></script>
<script src="js/stormo.js"></script>
<script src="js/resa.js"></script>
<script src="js/conto.js"></script>
<script src="js/comandi.js"></script>
<script src="js/gente.js"></script>
<script src="js/azioni.js"></script>
<script src="js/barra.js"></script>
<script src="js/prova.js"></script>
<script src="js/menu.js"></script>
<script src="js/pollaio.js"></script>
```

`barra.js` viene dopo `resa.js` e `conto.js` perché li consuma tutti e due, e
`pollaio.js` resta ultimo perché monta l'una e l'altra.

I tre nuovi stanno **fra `conto.js` e `barra.js`**, e non è un posto qualunque.
Tutti e tre passano da `Conto` — `Comandi` e `Gente` per parlare con Helix,
`Azioni` per sapere cosa l'account ha il permesso di fare — quindi vengono dopo
di lui; e nessuno dei tre si monta da sé: è `barra.js` che accende `Gente`,
monta `Azioni` e chiama `Comandi.esegui`, quindi devono esistere prima di lui.
`azioni.js` sta dopo `comandi.js` perché è a `Comandi.esegui` che consegna la
riga che ha composto: il globale lo guarda al momento del clic e non al
caricamento, ma l'ordine dichiara chi dipende da chi, ed è per questo che
questo elenco è un contratto e non una comodità.

Anche `regia.html` ha il suo ordine, ed è un contratto per lo stesso motivo:

```html
<script src="js/impostazioni.js"></script>
<script src="js/conto.js"></script>
<script src="js/menu.js"></script>
<script src="js/regia.js"></script>
```

La regia carica `conto.js` e non `barra.js`: là l'account si **collega**, non si
scrive in chat.

## 5. L'oggetto «messaggio» — la moneta unica del progetto

Tutti i moduli parlano questa lingua. Nessuno ne inventa un'altra.

```js
{
  id:        '',      // tag `id` di Twitch (UUID). Serve per CLEARMSG. '' se assente.
  tipo:      'messaggio',  // 'messaggio' | 'azione' | 'evento' | 'sistema'
  ts:        0,       // millisecondi, da `tmi-sent-ts` oppure Date.now()
  utenteId:  '',      // tag `user-id`
  nick:      '',      // login, minuscolo
  nome:      '',      // display-name ripulito, max 25 caratteri
  colore:    '',      // '#rrggbb' GIÀ corretto per il fondo scuro (vedi §9)
  badge:     [],      // [{chiave, versione, titolo, url, url2}]
  ruoli:     { capo:false, mod:false, vip:false, abbonato:false, artista:false, staff:false, bot:false },
  pezzi:     [],      // il corpo del messaggio, già spezzettato — vedi sotto
  bits:      0,       // totale bits del messaggio
  risposta:  null,    // {nome, testo} dai tag reply-parent-*, oppure null
  primo:     false,   // first-msg=1 → è il primo messaggio di sempre di questa persona
  ritorno:   false,   // returning-chatter=1
  rilievo:   null,    // lo scrive Rilievo — {livello, motivo, etichetta} | null
  evento:    null,    // lo scrive Eventi — vedi §11 | null
  cancellato:false,   // messo a true da CLEARMSG/CLEARCHAT
  piattaforma: 'twitch', // da quale chat arriva: 'twitch'|'youtube'|'kick'|'tiktok' (§17)
  stanza:    '',      // id numerico del canale Twitch in cui è stato SCRITTO (§17)
  mirrorato: false    // true se `stanza` non è il nostro canale
}
```

### `stanza` e `mirrorato` — le live congiunte

`piattaforma` dice **da quale chat** arriva un messaggio. Non basta più: nelle
live congiunte di Twitch (§17) i canali sono fino a sei e la piattaforma è la
stessa per tutti, quindi serve un secondo campo che dica **da quale stanza**.

- `stanza` è l'id numerico del canale in cui il messaggio è stato scritto. Su
  Twitch è sempre valorizzato — quando non c'è nessuna sessione in corso vale
  l'id del nostro canale. Su Kick e YouTube è `''`: quelle chat non hanno
  niente di simile, e un id finto sarebbe peggio di un campo vuoto.
- `mirrorato` è vero soltanto quando `stanza` **non** è il nostro canale, cioè
  quando il messaggio ci è arrivato di rimbalzo da un altro streamer.

La regola che ne discende, e che vale ovunque: **su un messaggio mirrorato i
tag della nostra stanza non raccontano più chi scrive.** `badges`, `mod`, `vip`
e `subscriber` descrivono la stanza di arrivo; quelli buoni sono i `source-*`
(§8). Chi legge il messaggio deve usare `stanza` per scegliere il catalogo dei
badge e delle emote, e `mirrorato` per sapere se fidarsi dei tag semplici.

`primo` e `ritorno` restano sempre falsi sui messaggi mirrorati: Twitch non
valorizza `first-msg` e `returning-chatter` sulle copie, e un «primo messaggio»
inventato accenderebbe un rilievo per una cosa che non è successa.

### I pezzi (il corpo, già analizzato)

```js
{ tipo: 'testo',    testo: 'ciao a tutti ' }
{ tipo: 'emote',    nome: 'Sadge', url: '', url2: '', fonte: 'twitch'|'7tv'|'bttv'|'ffz',
                    animata: false, sovrapposta: false }
{ tipo: 'cheer',    nome: 'Cheer', bits: 100, url: '', livello: 100 }
{ tipo: 'link',     testo: 'twitch.tv/slayer_beard', url: 'https://twitch.tv/slayer_beard' }
{ tipo: 'menzione', nome: '@slayer_beard', nostra: true }
```

`sovrapposta: true` è l'emote a larghezza zero di 7TV: si disegna **sopra**
l'emote che la precede, non accanto. Se non c'è un'emote prima, si disegna normale.

`url` è la misura 2x, `url2` la 4x per gli schermi densi (`srcset`).

## 6. Le impostazioni — `window.Impostazioni`

Tutte arrivano dalla querystring di `pollaio.html`. Tutte hanno un valore
predefinito sensato: **`pollaio.html` aperto senza nessun parametro deve
funzionare** e mostrare la chat di slayer_beard.

| chiave | tipo | predefinito | cosa fa |
|---|---|---|---|
| `canale` | testo | `slayer_beard` | il canale da seguire |
| `id` | testo | `47738247` | id numerico, per emote e badge di canale |
| `tema` | voce | `notte` | `notte` (vetro scuro) · `nudo` (solo testo, per il gameplay) · `insegna` (schede piene) |
| `larghezza` | numero | `420` | px della colonna |
| `scala` | numero | `100` | % del corpo del testo, 60–200 |
| `max` | numero | `40` | quanti messaggi si tengono in pagina |
| `svanisci` | numero | `0` | secondi dopo cui il messaggio sparisce. `0` = mai |
| `verso` | voce | `su` | `su` (i nuovi in basso) · `giu` (i nuovi in alto) |
| `fondo` | voce | `trasparente` | `trasparente` (sorgente browser OBS) · `scuro` (finestra vera) · `verde` · `magenta` (chroma key) |
| `spazio` | numero | `130` | aria fra i messaggi, in % da 40 a 400. Le vecchie parole `compatto`, `normale` e `arioso` restano leggibili e valgono 60, 115 e 220 |
| `emote` | sìno | `1` | disegna le emote |
| `sette` | sìno | `1` | emote 7TV |
| `bttv` | sìno | `1` | emote BetterTTV |
| `ffz` | sìno | `1` | emote FrankerFaceZ |
| `anima` | sìno | `1` | lascia animate le emote animate (gif/webp) |
| `badge` | sìno | `1` | disegna i badge |
| `orario` | sìno | `0` | mostra l'ora del messaggio |
| `bot` | testo | `nightbot,streamelements,streamlabs,moobot,fossabot,sery_bot,wizebot,own3d` | nick da nascondere |
| `comandi` | sìno | `1` | nascondi i messaggi che iniziano per `!` |
| `parole` | testo | *(vuoto)* | parole che accendono l'evidenziazione, separate da virgola |
| `menzioni` | sìno | `1` | evidenzia chi nomina il canale |
| `primo` | sìno | `1` | evidenzia il primo messaggio di una persona |
| `eventi` | sìno | `1` | disegna abbonamenti, raid e bits come schede |
| `treno` | sìno | `1` | la fascia dell'Hype Train (§15) |
| `effetto` | voce | `scivola` | come entra un messaggio: `scivola` · `bagliore` · `sfoca` · `glitch` · `matrix` · `insegna` · `scatto` · `niente` |
| `velocita` | numero | `100` | velocità dell'animazione d'ingresso, in % da 25 a 300. Moltiplica tutte e otto |
| `movimento` | voce | `auto` | quando animare: `auto` obbedisce a `prefers-reduced-motion` del sistema · `sempre` anima comunque. Serve dentro OBS, dove la preferenza è di chi trasmette ma l'immagine la guardano gli spettatori (§12) |
| `moderazione` | voce | `sbarra` | cosa fare a un messaggio cancellato: `sbarra` · `togli` · `tieni` |
| `pollo` | sìno | `0` | mostra la mascotte accanto alla chat |
| `barra` | sìno | `1` | la striscia sotto la chat: filtri, pausa e — con un account collegato — i pannelli dei comandi e l'elenco di chi c'è (§18, §19). In OBS non compare comunque |
| `scrivi` | sìno | `1` | dentro la barra, il campo per scrivere in chat e per dare i comandi (§19) con l'account collegato — e, se non c'è ancora un account, il bottone che lo collega (§18) |
| `prova` | sìno | `0` | modalità prova: traffico finto, per sistemare l'inquadratura in OBS |
| `ostile` | sìno | `0` | vale solo con `prova=1`: mescola al traffico finto i casi cattivi — zalgo, scavalchi RTL, nick lunghissimi, muri di testo |
| `finestra` | sìno | `0` | **lo mette `Pollaio.exe` da sé**, non si scrive a mano: dice alla pagina che sta girando nella finestra senza barra del titolo, e accende il menu del tasto destro, il trascinamento e il bordo che ridimensiona (§20). Nello SCHEMA è `nascosta`, quindi fra i comandi della regia non compare |

API:

```js
window.Impostazioni = {
  SCHEMA: [ /* [{chiave, tipo, predefinito, etichetta, aiuto, voci}] — lo consuma regia.js */ ],
  valori: { /* i valori letti, già del tipo giusto */ },
  leggi: function (querystring) { /* → nuovo oggetto valori */ },
  indirizzo: function (valori) { /* → 'pollaio.html?...' con SOLO ciò che differisce dai predefiniti */ }
};
```

`tipo` è uno di: `testo`, `numero`, `sìno`, `voce`. `sìno` si scrive `1`/`0` nella
querystring e diventa `true`/`false` nei valori.

## 7. Le sorgenti in rete — tutte verificate

**Due elenchi, e la differenza conta.** Il primo è tutto quello che serve a
leggere e a disegnare la chat: nessuna autenticazione, nessun account, e così
deve restare. Il secondo sono gli indirizzi che vogliono un gettone: quelli del
conto (§18) e quelli dei comandi, del menù sul nome e di chi c'è in chat (§19).
Erano sei, adesso sono **ventuno**, e la cosa che conta non è cambiata:
**nessuno dei ventuno serve a leggere la chat**, che si legge in anonimo come il
giorno prima.

Questa sezione si intitolava «tutte verificate, tutte senza autenticazione». La
seconda metà non è più vera per tutte, e il titolo l'ha persa: meglio saperlo
leggendo il titolo che scoprirlo in fondo alla tabella.

| cosa | indirizzo | note |
|---|---|---|
| chat | `wss://irc-ws.chat.twitch.tv:443` | anonima: `NICK justinfan<10000-90000>` |
| emote Twitch | `https://static-cdn.jtvnw.net/emoticons/v2/<id>/default/dark/2.0` (e `3.0`) | l'id arriva dal tag `emotes` |
| cheermote | `https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/animated/<livello>/2.gif` | livelli: 1, 100, 1000, 5000, 10000, 100000 |
| badge globali | `https://api.ivr.fi/v2/twitch/badges/global` | l'endpoint storico `badges.twitch.tv` è morto |
| badge di canale | `https://api.ivr.fi/v2/twitch/badges/channel?login=<canale>` | |
| badge di un canale ospite | `https://api.ivr.fi/v2/twitch/badges/channel?id=<id>` | live congiunte (§17): dell'altro canale si conosce solo l'id |
| anagrafica di un canale ospite | `https://api.ivr.fi/v2/twitch/user?id=<id>` | live congiunte: nome e faccia da mettere sulla targhetta. Stesso host dei badge |
| 7TV globali | `https://7tv.io/v3/emote-sets/global` | |
| 7TV del canale | `https://7tv.io/v3/users/twitch/<id>` | slayer_beard ce le ha. Lo stesso indirizzo serve i canali ospiti |
| BTTV globali | `https://api.betterttv.net/3/cached/emotes/global` | |
| BTTV del canale | `https://api.betterttv.net/3/cached/users/twitch/<id>` | oggi risponde con le liste vuote: è normale. Lo stesso indirizzo serve i canali ospiti |
| FFZ globali | `https://api.frankerfacez.com/v1/set/global` | |
| FFZ del canale | `https://api.frankerfacez.com/v1/room/<canale>` | oggi risponde **404**: è normale, si tace |
| FFZ di un canale ospite | `https://api.frankerfacez.com/v1/room/id/<id>` | la stessa stanza, indicizzata per id invece che per nome |

**Le live congiunte non hanno spostato la riga di §1.3.** Le quattro righe qui
sopra che dicono «ospite» non chiedono niente a nessuno: partono tutte dall'id
numerico che il tag `source-room-id` regala dentro il messaggio, e sono gli
stessi host che il pollaio interroga già per il proprio canale. Chi non collega
l'account vede una live congiunta esattamente come chi l'ha collegato — badge,
emote, faccia e nome dell'altro streamer compresi.

I quattro del **collegamento**, su `id.twitch.tv`. Li tocca soltanto
`js/conto.js`, e in chat non fanno niente: prendono un gettone e lo tengono
vivo.

| cosa | indirizzo | note |
|---|---|---|
| codice del dispositivo | `POST https://id.twitch.tv/oauth2/device` | `client_id` + `scopes`. Torna `user_code` (otto caratteri), `device_code` e `verification_uri`, che è già `twitch.tv/activate?device-code=<codice>`: si usa, ma **validato prima di essere aperto** (§18). Nessuna autenticazione |
| gettone | `POST https://id.twitch.tv/oauth2/token` | `grant_type=urn:ietf:params:oauth:grant-type:device_code` finché l'utente non conferma, poi `refresh_token`. Nessun client secret |
| controllo | `GET https://id.twitch.tv/oauth2/validate` | `Authorization: OAuth <gettone>`. Dice chi è, se il gettone vale ancora, e **quali permessi porta**: il campo `scopes` è la sorgente degli `scopi` salvati nel conto, che poi `Conto.puo` interroga prima di ogni comando (§1.3) |
| revoca | `POST https://id.twitch.tv/oauth2/revoke` | `client_id` + `token`. La chiama **Revoca account**, che quindi revoca davvero |

I due di Helix che `js/conto.js` chiama **da sé**, perché sono il conto:

| cosa | indirizzo | note |
|---|---|---|
| id del canale | `GET https://api.twitch.tv/helix/users?login=<canale>` | `Bearer` + `Client-Id`. Dà il `broadcaster_id`, che si tiene in cache. Lo usano anche i comandi, per tradurre in id il nome di chi si banna o si saluta |
| invio | `POST https://api.twitch.tv/helix/chat/messages` | `Bearer` + `Client-Id`, corpo `broadcaster_id`, `sender_id`, `message` |

I quindici che passano da `Conto.verso`. Sono relativi a
`https://api.twitch.tv/helix`, e ognuno ha il suo permesso: **il permesso si
controlla prima di chiamare**, non dopo aver preso un 403 (§19).

| cosa | indirizzo | chi lo chiama, e con quale permesso |
|---|---|---|
| ban e panchina | `POST` e `DELETE /moderation/bans` | `/ban` `/timeout` `/unban` `/untimeout` — `moderator:manage:banned_users` |
| svuota la chat | `DELETE /moderation/chat` | `/clear` — `moderator:manage:chat_messages` |
| i modi della chat | `PATCH /chat/settings` | `/slow` `/followers` `/subscribers` `/emoteonly` `/uniquechat` e i cinque `off` — `moderator:manage:chat_settings` |
| annuncio | `POST /chat/announcements` | `/announce` — `moderator:manage:announcements` |
| shoutout | `POST /chat/shoutouts` | `/shoutout` — `moderator:manage:shoutouts` |
| raid | `POST` e `DELETE /raids` | `/raid` `/unraid` — `channel:manage:raids` |
| segnalibro | `POST /streams/markers` | `/marker` — `channel:manage:broadcast` |
| sondaggio | `POST /polls` | `/poll` da solo apre il pannello — `channel:manage:polls` |
| pronostico | `POST /predictions` | `/prediction` da solo apre il pannello — `channel:manage:predictions` |
| dare e togliere il mod | `POST` e `DELETE /moderation/moderators` | `/mod` `/unmod` — `channel:manage:moderators` |
| dare e togliere il VIP | `POST` e `DELETE /channels/vips` | `/vip` `/unvip` — `channel:manage:vips` |
| sussurro | `POST /whispers` | `/w` — `user:manage:whispers` |
| quanti guardano | `GET /streams?user_id=<id>` | `gente.js`, il contatore. Non chiede nessun permesso in più; a canale spento la risposta è vuota, e vuota vuol dire spento, non rotto |
| chi c'è in chat | `GET /chat/chatters` | `gente.js`, e **solo a pannello aperto** — `moderator:read:chatters` |
| i moderatori e i VIP del canale | `GET /moderation/moderators`, `GET /channels/vips` | `gente.js`, e solo sul proprio canale: servono a dividere la lista in scomparti. Sono gli stessi due indirizzi di sopra, letti invece che scritti |
| le tue emote native | `GET /chat/emotes/user?user_id=<tuo>&broadcaster_id=<canale>` | `barra.js`, per il suggeritore — `user:read:emotes`. Risponde con le emote che **quell'utente** può usare **in quel canale** |
| le emote del canale | `GET /chat/emotes?broadcaster_id=<canale>` | `barra.js`, per il suggeritore. **Nessuno scope**: basta un gettone qualunque. Sono le emote di **quel canale**, e non dipendono da chi ha fatto login |
| iscrizione a EventSub | `POST /eventsub/subscriptions` | `stormo.js`, tre volte: `channel.shared_chat.begin`, `.update`, `.end` — `user:read:chat`. Serve a sapere **in anticipo** chi partecipa a una live congiunta e **quando finisce**: i messaggi continuano ad arrivare dall'IRC anonimo, questo non li tocca |

E una presa in più, che non è né Helix né IRC:

| cosa | indirizzo | note |
|---|---|---|
| EventSub | `wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30` | la apre `stormo.js` **solo** con un account collegato che porti `user:read:chat`. La socket in sé non si autentica: il gettone viaggia nel `POST` di iscrizione qui sopra, che ha dieci secondi di tempo dal `session_welcome`. Senza account non si apre affatto, e la sessione si scopre dai tag dei messaggi (§17) |

Le righe sono sedici e gli indirizzi quindici, perché due compaiono due volte:
`/moderation/moderators` e `/channels/vips` si scrivono per dare e togliere un
ruolo, e si leggono per sapere chi ce l'ha.

### `Conto.verso` — il tramite unico verso Helix

Tutte e quindici passano da una funzione sola, ed è una regola:

```js
Conto.verso(metodo, percorso, corpo, su)
// percorso relativo a https://api.twitch.tv/helix
// su(guaio, dati, scollegato)
```

Mette `Authorization: Bearer` e `Client-Id`, e `Content-Type: application/json`
soltanto quando c'è un corpo da mandare; se Twitch risponde **401 rinnova il
gettone e riprova una volta sola** — una, non a ciclo, perché un rinnovo che non
è servito non serve nemmeno al secondo giro; traduce **401**, **403** e **429**
in una frase italiana che si può leggere in una barra larga quattrocento pixel;
e consegna a chi ha chiamato un terzo argomento, `scollegato`, che dice se il
guasto è di quelli che si riparano solo ricollegando l'account.

**Il perché va dichiarato, perché è il motivo per cui esiste.** Senza un tramite
unico, `comandi.js`, `gente.js` e la richiesta delle emote si riscriverebbero
ciascuno l'autenticazione, il rinnovo del gettone e la traduzione degli errori.
Tre copie della stessa cosa non restano uguali per molto, e **la quarta copia
sarebbe quella sbagliata** — quella che non riprova sul 401, o che sul 403
scrive «errore 403» a chi voleva solo mettere in panchina un molestatore. Un
modulo nuovo che debba parlare con Helix non apre un `fetch`: chiama `verso`.

Le due chiamate che restano fuori — `helix/users` e `helix/chat/messages` — sono
dentro `conto.js`, cioè dentro il tramite stesso, e sono più vecchie di lui.

Accanto a `verso`, `conto.js` espone i due che guardano i permessi.
**`Conto.puo(scopo)`** dice se il gettone porta quel permesso, e la risposta
viene dagli `scopi` che `oauth2/validate` ha consegnato al momento del
collegamento: è la funzione che ogni comando interroga prima di partire e ogni
bottone prima di offrirsi (§1.3, §19). Un conto senza `scopi` — cioè uno salvato
prima che questi permessi esistessero — non può niente, che è il comportamento
voluto. **`Conto.mancano()`** restituisce l'elenco degli scopi che il conto non
ha, cioè la differenza fra quello che `SCOPI` chiede e quello che l'utente ha
concesso: oggi non la chiama nessuno, ed è dichiarata qui perché serve a dire
*quali* permessi mancano invece che soltanto *se* ne manca uno — il giorno che
la regia lo vorrà scrivere, il conto è già in grado di farlo e non va
riscritto.

`id.twitch.tv` e `api.twitch.tv` mandano `Access-Control-Allow-Origin: *` sia
sulla richiesta sia sul preflight, anche con `Origin: null`: **verificato sul
campo prima di scrivere il modulo**, cioè anche da una pagina aperta dal disco.
Senza quello il §1.2 non reggeva e il conto non si sarebbe potuto fare.

**Regola**: ogni chiamata ha un tetto di tempo, e il fallimento è silenzioso.
Niente `console.error` che intasa il log di OBS: al massimo un `console.warn` col
prefisso `[pollaio]`.

Gli indirizzi col gettone sono la deroga dichiarata alla seconda metà della
regola: il tetto di tempo ce l'hanno (12 secondi), ma **lì un guasto si dice**,
con una frase in chiaro nella barra o nella regia. Non è la stessa situazione:
là c'è un'emote che non arriva, qui c'è qualcuno che ha appena premuto Invia, o
Banna, e sta aspettando di sapere se è successo.

### La cache delle emote — un ricordo parziale non è mai «fresco»

Il catalogo si mette da parte in `localStorage` (`sb-pollaio-emote`, con dentro
il numero di formato `FORMATO_RICORDO` e un'impronta di canale e manopole),
perché sei richieste a ogni avvio, per un widget che parte insieme a Windows,
sono sei richieste sprecate a server che non sono nostri. Il ricordo è **fresco**
per mezz'ora (`RICORDO_FRESCO`) e **stanco** fino a dodici ore
(`RICORDO_SCADUTO`), e la differenza è tutta qui: `fresco` **salta del tutto il
giro di rete**; `stanco` usa il ricordo subito **e** rifà il giro sotto, così la
chat non parte spoglia e il catalogo si rimette in pari da solo.

**Regola: un giro parziale non diventa mai «fresco».** `ricorda()` salvava anche
quando una sola sorgente su sei aveva risposto, e `ripescaRicordo` guardava
soltanto l'età: un avvio con 7TV in timeout congelava per mezz'ora un catalogo di
poche decine di emote, in silenzio, e ogni riavvio dentro quella finestra si
riprendeva il catalogo storpio senza nemmeno provare la rete. Il caso non è raro
— è il pollaio che parte insieme al computer, con la rete ancora fredda.

Come si tiene: `giroDiRete` segna anche **quante sorgenti ha interrogato**
(`fontiChieste`; non è sempre sei, perché dipende da `id`, da `canale` e dalle
manopole `sette`, `bttv`, `ffz`), `ricorda()` lo salva come `chieste` accanto a
`sorgenti`, che è quante ne sono riuscite, e `ripescaRicordo` ritorna `'fresco'`
**solo se `sorgenti >= chieste`**; altrimenti `'stanco'`. `FORMATO_RICORDO` è
passato da 1 a 2 apposta, per buttare via le cache monche già scritte sui
computer che ce l'hanno: alzare il formato è il modo onesto di invalidare dei
dati salvati con una regola sbagliata.

Il principio, che vale oltre le emote: **una cache può ricordare un risultato
parziale, non può dichiararlo completo.** Se lo dichiara completo smette di
essere una cache e diventa un guasto che si ripete da solo.

## 8. Il protocollo — cosa si chiede e cosa si legge

```
CAP REQ :twitch.tv/tags twitch.tv/commands
NICK justinfan<numero>
JOIN #<canale minuscolo>
```

`twitch.tv/commands` è **obbligatorio**: senza, non arrivano `USERNOTICE`
(abbonamenti, raid), `CLEARCHAT`, `CLEARMSG`, `ROOMSTATE`, `NOTICE`.
Non si chiede `twitch.tv/membership`: sarebbe un diluvio di JOIN/PART inutili.

Comandi da gestire: `PING` (→ `PONG :tmi.twitch.tv`), `PRIVMSG`, `USERNOTICE`,
`CLEARCHAT`, `CLEARMSG`, `ROOMSTATE`, `NOTICE`, `RECONNECT`.

Il `/me` è un `PRIVMSG` il cui corpo è `\x01ACTION ...\x01`: va riconosciuto e
diventa `tipo: 'azione'`.

### I tag `source-*` — le live congiunte

Quando il canale entra in una live congiunta (§17), Twitch **duplica da sé**
nella nostra stanza i `PRIVMSG` e gli `USERNOTICE` degli altri canali. Non c'è
niente da fare per riceverli: arrivano sul `JOIN` che c'è già. Quello che
cambia sono i tag.

| tag | cosa dice |
|---|---|
| `source-room-id` | l'id del canale **da cui** il messaggio è partito |
| `source-id` | l'id del messaggio nella stanza di partenza |
| `source-badges` | i distintivi di chi scrive **nel suo canale**, stesso formato di `badges` |
| `source-badge-info` | i metadati di quei distintivi, es. i mesi di abbonamento |
| `source-msg-id` | su `USERNOTICE`: il tipo di avviso nella stanza di partenza |
| `source-only` | il messaggio è stato mandato solo al canale di partenza |

Due regole, e non ce ne sono altre:

1. **I tag `source-*` ci sono → la stanza è in una live congiunta.** Non
   servono API per accorgersene.
2. **`source-room-id` uguale a `room-id` → il messaggio è nato qui.** Diverso →
   è la copia di un messaggio scritto altrove, e allora comandano i `source-*`
   (§5).

Non si deduplica niente: si entra in una stanza sola, e ogni messaggio ci
arriva una volta. La deduplica su `source-id` servirebbe a chi fa `JOIN` su più
canali della stessa sessione, che non è questo caso.

Le emote native non hanno bisogno di niente: il tag `emotes` dà gli id, e il
CDN di Twitch non sa nemmeno da quale canale arrivi la richiesta.

## 9. Il colore del nick

Il tag `color` può essere vuoto (chi non l'ha mai scelto) e può essere illeggibile
sul fondo scuro (blu scuro, marrone). Regola:

- **vuoto** → si assegna un colore stabile derivato dal nick, pescato da una
  tavolozza fissa che sta in `tokens.css`. Stabile significa: la stessa persona ha
  sempre lo stesso colore, anche fra una sessione e l'altra.
- **troppo scuro** → si alza la luminosità finché il contrasto sul fondo non
  arriva a **4.5:1**, tenendo tinta e saturazione. Non si sostituisce il colore:
  si schiarisce.

## 10. Il rilievo — «highlight su cose importanti»

Quattro livelli. `livello` è un numero perché va confrontato, `etichetta` è quello
che si legge a schermo.

| livello | quando | etichetta | tinta |
|---|---|---|---|
| `3` alto | riscatto punti canale (`msg-id=highlighted-message`), annuncio dello streamer, bits ≥ 1000 | `MESSAGGIO IN EVIDENZA`, `ANNUNCIO`, `BITS` | `--magenta` |
| `2` medio | menziona il canale, contiene una parola chiave, bits ≥ 100 | `TI HANNO NOMINATO`, `PAROLA CHIAVE`, `BITS` | `--ciano` |
| `1` basso | primo messaggio di sempre, chi torna dopo tanto, risposta a un messaggio | `PRIMO MESSAGGIO`, `BENTORNATO`, `RISPOSTA` | `--viola-chiaro` |
| `0` | tutto il resto | — | — |

Vince il livello più alto. A parità, vince il primo della lista.

I ruoli (mod, VIP, capo) **non** sono un rilievo: sono un badge e un colore di
nome. Un moderatore che scrive «ok» non è una cosa importante.

## 11. Gli eventi — `messaggio.evento`

Da `USERNOTICE`, tag `msg-id`:

```js
{
  genere: 'abbonamento',         // vedi tabella
  titolo: 'Nuovo abbonato',      // riga grande della scheda
  dettaglio: '3 mesi di fila',   // riga piccola, può essere ''
  quantita: 0,                   // regali, spettatori del raid, bits
  livello: '1000',               // piano dell'abbonamento: Prime, 1000, 2000, 3000
  tinta: 'viola'                 // 'viola' | 'ciano' | 'magenta' | 'live' | 'ok'
}
```

| `msg-id` | genere | titolo |
|---|---|---|
| `sub` | `abbonamento` | Nuovo abbonato |
| `resub` | `riabbonamento` | Si è riabbonato |
| `subgift` | `regalo` | Ha regalato un abbonamento |
| `submysterygift` | `regali` | Ha regalato N abbonamenti |
| `giftpaidupgrade`, `anongiftpaidupgrade` | `conferma` | Continua l'abbonamento regalato |
| `raid` | `raid` | Raid in arrivo |
| `unraid` | `raid-annullato` | Raid annullato |
| `announcement` | `annuncio` | Annuncio |
| `bitsbadgetier` | `bits` | Nuovo distintivo bits |
| `viewermilestone` | `traguardo` | Traguardo |

Il piano dell'abbonamento si legge da `msg-param-sub-plan`: `Prime`, `1000`,
`2000`, `3000` → si mostra `PRIME`, `TIER 1`, `TIER 2`, `TIER 3`.

Moderazione, da `CLEARCHAT` e `CLEARMSG`:

```js
{ genere: 'ban',      nick: 'tizio', motivo: '' }
{ genere: 'pausa',    nick: 'tizio', durata: 600 }   // secondi
{ genere: 'svuota' }                                  // tutta la chat
{ genere: 'cancella', id: '<uuid del messaggio>' }
```

## 12. Il disegno

Tre temi, stesso markup: cambia solo l'attributo `data-tema` sulla radice.

- **`notte`** — vetro scuro: `--pannello` con `backdrop-filter`, bordo `--linea`,
  raggio `--raggio-s`. È il default e sta bene su qualsiasi gameplay. Il vetro
  sta su **ogni messaggio**, non dietro la colonna: con una lastra sola l'aria
  fra due righe mostrava ancora vetro, quindi aumentarla non li separava e la
  chat restava un blocco unico. Il prezzo è una superficie sfocata per
  messaggio invece di una: chi perde fotogrammi in OBS abbassa `max`.
- **`nudo`** — nessun fondo, solo testo con un'ombra netta che lo stacca da
  qualunque cosa ci sia sotto. Per chi non vuole il riquadro sopra il gioco.
  L'ombra è obbligatoria: testo chiaro su fondo chiaro sparirebbe.
- **`insegna`** — ogni messaggio è una scheda piena col gradiente del marchio.
  Più invadente, per le chat lente.

Il fondo della pagina è **sempre trasparente** (`background: transparent` su `html`
e `body`): lo sfondo lo mette il tema sui singoli messaggi, mai la pagina. In OBS
un fondo opaco coprirebbe il gameplay.

Regole di misura:
- I messaggi entrano dal basso e spingono in su (con `verso=su`). L'animazione di
  entrata è **breve** (180ms per `scivola`, il predefinito) e traslata di pochi
  pixel: in un overlay una comparsa lenta si legge come un ritardo. L'unica
  deroga è `glitch`, che dura 800ms perché è l'unico effetto che deve farsi
  guardare invece di accompagnare l'ingresso.
- **Le durate d'ingresso stanno in un punto solo** e non sparse dentro le
  regole: le custom property `--t-*` in cima al §14 di `pollaio.css`, tutte
  moltiplicate per `--tempo`. `--tempo` e `--aria` le scrive `js/pollaio.js`
  sulla radice, ed è l'inverso della manopola `velocita` (al 200% di velocità
  vale 0.5). Chi allunga una `@keyframes` deve allungare anche la finestra di
  `.is-nuovo` in `DURATE_ENTRATA` di `js/resa.js`, o l'animazione viene
  troncata a metà: sono due metà dello stesso numero, letto da due file.
- Il testo non deve mai far scorrere l'overlay in orizzontale:
  `overflow-wrap: anywhere` sul corpo, `min-inline-size: 0` su ogni figlio flex.
- Le emote sono alte `1.6em` e allineate al testo con `vertical-align: middle`.
- Un messaggio con `svanisci` attivo esce con una dissolvenza di 400ms.

Accessibilità, anche se è un overlay (la pagina si apre anche in un browser):
- focus visibile `2px solid var(--ciano)` con `outline-offset: 3px`, con una
  deroga sul solo **offset**: dove i controlli stanno stretti dentro un
  pannello — le voci del menù sul nome, i campi dei pannelli Sondaggio e
  Pronostico — l’anello va **all’interno** (`outline-offset: -2px`). Tinta e
  spessore non cambiano mai. A 3px in fuori l’anello di un campo finisce sopra
  il campo vicino, e un segno di fuoco che sconfina si legge come un bordo
  sbagliato invece che come «sono qui».
- `prefers-reduced-motion: reduce` spegne **tutte** le animazioni, e ogni foglio
  spegne a mano le proprie `@keyframes` in un paragrafo finale dedicato — con
  una sola deroga, dichiarata qui sotto: la manopola `movimento`
- l'elenco dei messaggi **non** ha `aria-live`: sarebbe uno sproloquio continuo
- le emote hanno `alt` col loro nome; i badge hanno `alt=""` e il titolo va su
  `title`, perché il nome della persona basta già a identificarla

### Il movimento — l'obbedienza resta il predefinito, ma diventa una manopola

Il paragrafo finale di `app/css/pollaio.css` spegne davvero tutto, e conviene
scriverlo per esteso, perché «tutte le animazioni» suona più piccolo di quello
che è: **tutti e sette gli effetti d'ingresso** (`scivola`, `bagliore`, `sfoca`,
`glitch`, `matrix`, `insegna`, `scatto`, più la variante di `scatto` con
`verso=giu`), le scie `::after` di `bagliore`, `glitch` e `matrix` e il carattere
da terminale di `matrix`, la **dissolvenza in uscita** di `svanisci`, il
**battito della spia**, il **respiro della fascia del treno** col suo lampo
dorato — transizione del riempimento compresa — e il **dondolio del pollo**.

Non è un caso di laboratorio, ed è **più facile di così che sembri**, perché
l'interruttore non sta in un posto solo. Su Windows 11 è Impostazioni →
Accessibilità → Effetti visivi → **Effetti di animazione**; su Windows 10 è
Impostazioni → Accessibilità → **Schermo** → **Mostra animazioni in Windows**; e
lo spegne anche **«Regola per ottenere le prestazioni migliori»** nelle opzioni
prestazioni di sistema, che è la prima spunta che si tocca su un computer da
gioco. Chromium li legge tutti e tre allo stesso modo e riporta
`prefers-reduced-motion: reduce`, e da lì l'overlay si muove su una macchina e
sta fermo sull'altra senza che niente lo dica. Dimostrato con
`--force-prefers-reduced-motion`: stessa pagina, stesso indirizzo,
`animation-name` che passa da `entra-glitch` a `none`.

**I tre posti si nominano tutti e tre, ogni volta che se ne parla** — in
`DETTO_CALMA` di `regia.js` e nell'aiuto della manopola `movimento`. Nominarne
uno solo non è una mezza risposta, è una risposta sbagliata: chi sta su Windows
10 legge il percorso di Windows 11, non lo trova, e conclude che il suo caso è
un altro — e a quel punto l'avviso ha fatto danno invece di servire.

**Il predefinito resta l'obbedienza.** `pollaio.html` si guarda anche con gli
occhi — nella finestra di `Pollaio.exe`, nell'anteprima della regia, in un
browser qualunque — e lì chi ha espresso la preferenza è esattamente chi sta
guardando. È l'impegno preso qui sopra, e non si butta.

**Ma dentro una sorgente browser di OBS il computer non è un lettore: è un
motore di rendering.** La preferenza è di chi trasmette; l'immagine la guardano
gli spettatori, che non l'hanno espressa e non hanno modo di esprimerla. Il
browser sta rispondendo bene alla domanda sbagliata, e rispondere bene alla
domanda sbagliata resta un guasto.

Quindi l'obbedienza non si butta e non si scavalca di nascosto: **diventa una
manopola dichiarata**, `movimento` (§6), `auto` oppure `sempre`. È la stessa
forma che ha già `anima` con le emote animate — una preferenza che il progetto
rispetta finché nessuno la contraddice, e che chi trasmette può contraddire
apposta, sapendo perché.

Come è fatto:

- `js/pollaio.js`, dentro `vestiRadice()`, scrive `data-movimento` su `<html>` —
  sulla radice del documento e non sul blocco `.pollaio`, perché il blocco
  `@media` deve poter guardare un antenato di tutto;
- **ogni** selettore dentro `@media (prefers-reduced-motion: reduce)` di
  `pollaio.css` è prefissato con `html:not([data-movimento="sempre"])`. Il blocco
  resta uno solo: non nasce una seconda copia delle regole da tenere allineata;
- `js/resa.js` non tiene più la variabile `menoMovimento`, letta una volta sola
  al caricamento, ma `sistemaChiedeCalma` più una **funzione** `menoMovimento()`
  che mette insieme il sistema e la manopola (`Resa.monta` riceve `movimento`).
  Senza, `matrix` sarebbe uscito a metà: l'animazione CSS riaccesa dalla manopola
  e lo scombinamento dei caratteri — che è JavaScript, non CSS — ancora spento.

Il blocco `prefers-reduced-motion` di `regia.css` **non** è prefissato, ed è
giusto così: la regia è un'interfaccia, si guarda con gli occhi e basta, e in una
scena di OBS non ci finisce mai.

### La riga che usciva invisibile ma ingombrante

Nello stesso blocco c'era un difetto di contorno, ed è il tipo di difetto che
nasce dallo spegnere un'animazione guardando solo la sua trasparenza. La riga in
uscita faceva `animation: none; opacity: 0`, ma `@keyframes esce` non fa soltanto
dissolvenza: porta anche `max-block-size` a 0 e azzera padding, margini e bordo.
Spenta l'animazione, la riga restava **invisibile ma ingombrante** per tutti i
400 ms di `DURATA_USCITA`, e poi il buco si richiudeva di colpo — cioè uno scatto
peggiore dell'animazione che si voleva risparmiare. Adesso la regola porta la
riga dove le keyframes l'avrebbero lasciata: trasparente **e** collassata.

La regola generale: **chi spegne un'animazione deve arrivare dove l'animazione
sarebbe arrivata**, non fermarsi alla proprietà che gli era venuta in mente.

## 13. La modalità prova

`?prova=1` non si collega a niente e genera traffico finto: nomi, colori, badge,
emote vere prese dai provider, un abbonamento ogni tanto, un raid, dei bits, un
messaggio in evidenza, un ban. Serve a inquadrare il widget in OBS quando il
canale è spento, che è **sempre** il momento in cui si sistema un overlay.

Deve essere ovvio che è una prova: una spia in alto che dice `PROVA`, che non si
confonde con la chat vera.

**Le emote devono vedersi davvero**, ed è una regola e non un dettaglio grafico.
Un overlay si inquadra guardandolo, e una prova fatta di solo testo mente
esattamente sulle misure per cui la si è accesa: l'altezza di una riga, quanto
cresce un messaggio pieno di emote, quanta chat entra nel riquadro. Chi aggiunge
un caso a `js/prova.js` lo scrive con dentro delle emote vere.

Vere vuol dire: nomi che stanno nel catalogo di `Emote`, cioè emote di 7TV, BTTV
o FFZ — quelle di `FRASI_EMOTE` in `prova.js`, `KEKW`, `Sadge`, `monkaS`,
`catJAM`. **`Kappa` non va bene**: è un'emote nativa di Twitch, e le native non
stanno in nessuno dei tre cataloghi. Arrivano messaggio per messaggio dal tag
`emotes` (§8), che in prova non riempie nessuno, quindi un `Kappa` in prova esce
testo.

Il difetto stava proprio lì, e vale la pena ricordarlo perché non si vedeva: in
`prova.js` c'erano **due funzioni `soloEmote` nello stesso scope** dell'IIFE. Per
hoisting vinceva la seconda — quella dei casi ostili, dodici `Kappa` di fila — e
`FRASI_EMOTE` era codice morto che non leggeva nessuno, compreso il `COPIONE`
d'apertura, che chiamava `soloEmote` credendo di chiamare l'altra. Adesso la
seconda si chiama `muroDiEmote` e resta dov'è giusto, fra i `CASI_OSTILI`; il
copione chiama `soloEmote`, e le emote si vedono.

## 14. Il configuratore — `regia.html`

Una pagina sola, con la grafica del sito (questa **non** è trasparente: è
un'interfaccia, si guarda in un browser).

- **in cima**, dentro `<main>` e prima delle due colonne (`grid-column: 1 / -1`),
  la sezione **«Il tuo account Twitch»**: una riga che dice a che punto sta, il
  codice di otto caratteri quando c'è, e i bottoni **Connetti account**
  (**Riconnetti account** se un account c'è già), **Riapri Twitch**, **Copia il
  codice**, **Lascia stare** e **Revoca account**. Il campo del Client ID non
  sta lì in mezzo: sta piegato dentro un `<details class="regia__conto-app">`
  chiuso, che si apre da sé **solo** quando `Conto.serveClientId()` è vero. La
  pagina lo dice per prima, ed è la metà del confine che non si tocca: **per
  leggere la chat l'account non serve e non servirà mai**. L'altra metà è
  cresciuta — l'account adesso serve a scrivere *e a comandare* (§19) — e il
  testo della regia è rimasto a «serve a una cosa sola: scrivere»: dice meno di
  quello che l'account fa, il che è il verso giusto in cui sbagliare, ma resta
  da rimettere in pari.
- a sinistra i comandi, uno per ogni voce di `Impostazioni.SCHEMA`
- a destra l'anteprima dal vivo dentro un `<iframe>` che punta a `pollaio.html`
  con i parametri correnti, su uno sfondo a scacchi che rende evidente la
  trasparenza
- in basso l'indirizzo completo, in monospazio, con un bottone **Copia**
- le scelte si ricordano in `localStorage` (`sb-pollaio-regia`)
- un bottone **Ripristina** che rimette tutto ai predefiniti

### I due indirizzi della regia — quello che apre qui e quello che si incolla

Non sono lo stesso, e per un po' lo sono stati per sbaglio.

L'anteprima e il bottone **Apri** vogliono un indirizzo che funzioni **nel
contesto in cui la regia sta girando adesso**: dentro `Pollaio.exe` la pagina
vive su `https://pollaio.locale`, il nome che `SetVirtualHostNameToFolderMapping`
mappa sulla cartella dell'app. Lo dà `indirizzoQui()`, che risolve contro
`location.href` come si è sempre fatto.

Il bottone **Copia** vuole tutt'altro: un indirizzo che apra **in un altro
programma**, cioè in OBS. E `pollaio.locale` esiste solo dentro quella WebView:
fuori non lo risolve nessuno. Risolvendo contro `location.href` anche lì, il
Copia consegnava `https://pollaio.locale/pollaio.html?…` — una riga che in OBS
dà una sorgente bianca senza dire perché, e che a leggerla sembra giusta.

Quindi il launcher **dice alla pagina dove sta davvero**:
`AddScriptToExecuteOnDocumentCreatedAsync` scrive `window.POLLAIO_CARTELLA` con
la cartella dell'app, prima che parta qualunque script della pagina, passata per
`PerJs` che scappa rovesce, virgolette e tutto ciò che non è ASCII (un percorso
di Windows è pieno delle prime, e il nome dell'utente può avere le terze). Da lì
`indirizzoDaIncollare()` scrive il `file:///` vero, con `encodeURI` e non
`encodeURIComponent`: le barre e i due punti del percorso devono restare quelli
che sono, uno spazio nel nome dell'utente no.

Aperta in un browser normale la regia sta già su `file:///`, `POLLAIO_CARTELLA`
non c'è, e allora `indirizzoDaIncollare()` ricade su `indirizzoQui()`, che lì
dava già la risposta giusta. **La cosa da non rifare è la scorciatoia**: un solo
indirizzo per due domande diverse — «dove sono» e «dove sarà chi lo aprirà» — ed
è la seconda quella che conta per il bottone che si chiama Copia.

`apri()` usa `indirizzoQui()` apposta: un `file:///` aperto da una pagina `https`
lo blocca Chromium, e la finestra resterebbe bianca a raccontare un guasto che
non c'è.

### Il server in casa — `Servente`, e perché ce n'è uno solo

Il `file:///` funziona ma si sbaglia: è lungo, si rompe se sposti la cartella,
non si può usare da un secondo computer, e quando è sbagliato OBS non lo dice —
lascia una sorgente bianca. Dalla 1.2.3 il launcher tiene acceso un piccolo
server e la regia consegna quell'indirizzo: `http://<ip di casa>:4747/pollaio.html?…`.

**Resta dentro il vincolo delle zero dipendenze** (§1.1): un `TcpListener` e
l'HTTP scritto a mano, quel tanto che serve a rispondere a una `GET` di un file
sul disco. Non è un server web e non deve diventarlo.

**Il `file://` non va in pensione.** Il vincolo §1.2 resta intatto: la pagina
deve continuare ad aprirsi dal disco, e continua. Il server è una strada in più,
non una sostituzione — se è spento (`rete=0`) o se la regia si apre senza un
pollaio acceso, l'indirizzo torna a essere il `file:///` di prima.

**Tre difese, e sono tre righe.** Un server che consegna file su richiesta è
esattamente il posto dove si sbaglia:
- **solo `GET` e `HEAD`**, tutto il resto è 405;
- **solo le estensioni dell'elenco `TIPI`** — non è una comodità per non
  scrivere un altro `if`, è ciò che tiene il server incapace di consegnare
  qualcosa che non sia il widget, anche il giorno che dentro `app/` finisse per
  sbaglio un file che non c'entra;
- **il confine si controlla dopo aver risolto il percorso**, non prima. Cercare
  i due punti dentro la richiesta è una gara che si perde, fra codifiche
  percentuali e barre doppie: si compone il percorso, si fa `GetFullPath`, e se
  non comincia per la cartella di `app/` non esce niente. Provato con
  `..%2f..%2f`, `....//` e `%2e%2e/`: tutti 404.

Fuori da `app/` non si consegna nulla, e `app/` non contiene segreti — il
gettone sta in `localStorage` e non in un file (§1.3), quindi non c'è niente da
esporre nemmeno servendo la regia.

**Il server lo accende soltanto la chat, mai la regia.** La regia gira in un
altro processo (`--regia`): se accendesse un secondo server sarebbero due porte,
e quella scritta in OBS morirebbe il giorno che chiudi la regia. Quindi
`AccendiLaRete` si biforca — la chat chiama `Accendi`, la regia chiama
`CercaInCasa`, che bussa alle porte da `porta` in poi e usa la prima che
risponde. Se non risponde nessuno l'indirizzo resta vuoto, e la regia scrive il
`file:///`: **meglio un indirizzo scomodo che uno che non apre niente.**

**La porta si sceglie e sta ferma.** Se è occupata se ne provano dodici, ma non
è la strada buona: un indirizzo che cambia da un avvio all'altro smetterebbe di
valere in OBS senza dire perché. Per questo `porta=` sta nel `.ini`.

**L'ip è quello della scheda col gateway**, non il primo dell'elenco: fra schede
virtuali, VPN e Hyper-V il primo è quasi sempre quello sbagliato, e un ip
sbagliato qui non si riconosce guardandolo — si scopre in OBS, con una sorgente
vuota, quando la diretta è già cominciata.

**`Cache-Control: no-store` su tutto.** I file sotto non cambiano mai da soli:
l'unica volta che cambiano è quando li cambiamo noi, e in quel momento
«ricarica la sorgente» deve rileggere davvero, invece di far credere che una
correzione non sia arrivata.

### L'unico avviso della regia — `.regia__allarme`

Sotto la manopola **«Quando animare»** compare un riquadro in `--allerta` quando
il computer chiede `prefers-reduced-motion: reduce` **e** la scelta è ancora
«come dice il computer». Lo decide `chiedeCalma()` in `regia.js`, che interroga
`matchMedia` per conto suo: l'anteprima è un `<iframe>`, quindi `resa.js` è in
un altro contesto e non c'è niente da condividere.

**Perché esiste, e perché sta lì e non altrove.** Rispettare quell'interruttore
è giusto, ma farlo **in silenzio** produce il peggior tipo di guasto: non si
rompe niente, semplicemente non succede più niente, e il widget non ha modo di
scagionarsi. Chi lo subisce dà la colpa al programma e lo reinstalla, che è la
sola cosa che non può funzionare, visto che la causa è nel sistema operativo.
La manopola che governa il comportamento è l'unico posto in cui uno andrebbe a
cercare, quindi è lì che va detto.

**Nell'overlay non ci va.** Un avviso sopra al gameplay è esattamente ciò che
l'overlay non deve fare: la regia si guarda, l'overlay si trasmette.

L'avviso si aggiorna da solo su `change` del `matchMedia`, perché il gesto
naturale è andare a girare l'interruttore in Windows e tornare indietro: se
trovasse ancora il riquadro giallo, direbbe una cosa non più vera.

Nota di confine, per non ricadere nell'errore: `menoMovimento()` in `resa.js`
sembra codice morto e **non lo è** — la usa l'effetto `matrix`, che scombina le
lettere da JavaScript e va fermato a mano quando le animazioni sono spente. Il
resto degli effetti è tutto CSS, e lì basta la media query.

**Perché in cima, e perché il Client ID è piegato via.** Prima la sezione stava
in fondo alla pagina e il campo del Client ID stava davanti al bottone: l'ordine
della pagina raccontava che la prima cosa da fare fosse registrare
un'applicazione su Twitch. Non lo è. Il Client ID è una cosa che si fa una volta
nella vita — zero volte finché `CLIENTE_PREDEFINITO` è pieno, come è oggi (§1.3)
— e **una cosa che si fa una volta nella vita non deve stare davanti a quella
che si fa tutti i giorni**. Quindi il bottone in vista e in alto, il campo
dentro un `<details>` che si apre da solo quando manca davvero.

**La regia non è più l'unico posto da cui si collega un account**: lo stesso
bottone sta nella barra sotto la chat (§18) e fa partire lo stesso device flow.
Qui c'è in più quello che nella barra non entrerebbe — il codice grande da
leggere, i bottoni per riaprire Twitch o copiarlo, il campo del Client ID — e
c'è la calma di leggere cosa si sta autorizzando prima di dire di sì.

Il testo del configuratore parla come il sito: prima persona, discorsivo, spiega
il perché. Mai «Errore:». Esempi del registro giusto, presi dal sito:
«Non ci riesco più. Ricarica la pagina.» · «Controllo il canale» · «Fatto: il
messaggio è in chat.» · «Il browser ha bloccato la riproduzione: tocca il player
per farlo partire.»

## 15. L'Hype Train

L'Hype Train **non passa dalla chat**. Su IRC arrivano abbonamenti, regali,
raid, bits e annunci, ma dell'Hype Train non c'è traccia: non è difficile da
leggere, proprio non viene trasmesso. Il vecchio canale che lo esponeva
(PubSub) Twitch l'ha spento. L'API pubblica documentata (EventSub) lo espone
ma pretende un token OAuth del proprietario del canale. **Il conto di §18 non
serve a questo e non va allargato per questo**, e adesso che gli scopi sono
quindici la frase vale più di prima, non di meno: ognuno di quei quindici sta lì
perché dietro ha un comando che si preme (§1.3), mentre
`channel:read:hype_train` non ne avrebbe nessuno — servirebbe soltanto a
disegnare un po' meglio una fascia che si disegna già. Chi collega l'account,
poi, non è per forza il padrone del canale. **Un permesso senza una funzione
dietro non entra nemmeno quando fa comodo**: è la regola di §1.3, e una regola
che si scavalca la prima volta che dà fastidio non era una regola.

`js/treno.js` usa quindi l'**API GraphQL interna** di Twitch, la stessa che usa
il sito di Twitch per disegnare la sua barra:

```
POST https://gql.twitch.tv/gql
Client-Id: kimne78kx3ncx6brgo4mv6wki5h1ko
{"query":"query($n:String!){channel(name:$n){hypeTrain{
   approaching{goal expiresAt participants}
   execution{id startedAt expiresAt endedAt isGoldenKappaTrain
             progress{goal total remainingSeconds level{value goal}}}}}}"}
```

Verificato sul campo prima di scrivere il modulo, su un treno vero in corso:
risponde in anonimo, e manda `Access-Control-Allow-Origin: *` sia sulla
richiesta sia sul preflight, quindi si può chiamare da un browser e anche da
una pagina aperta con `file://`.

**È una scelta, e va dichiarata**: non è l'API pubblica documentata. Funziona,
la usa mezzo ecosistema Twitch, ma nessuno la garantisce e un giorno può
cambiare. Per questo il treno è costruito come **un di più**: qualunque cosa
vada storta — la domanda cambia forma, il server risponde picche, la rete cade
— `treno.js` si spegne da solo dopo cinque errori e la chat continua come se
niente fosse. Non esiste un percorso in cui un guasto lì possa fermare il
pollaio.

Se un giorno smettesse di funzionare, la strada di ricambio è **EventSub col
token del proprietario** (scope `channel:read:hype_train`): cambierebbe solo il
modo di leggere, perché lo stato consegnato è già modellato per reggere
entrambe le sorgenti.

## 16. Il banco di prova — `prove.html`

Doppio clic e basta: nessuna dipendenza, nessun comando, gira da `file://` come
tutto il resto. Verde vuol dire che le cose che devono restare vere lo sono
ancora.

**Si prova solo ciò che è puro**: testo dentro, valore fuori, nessuno stato di
mezzo. `Impostazioni` (tipi, ritagli, sinonimi, andata e ritorno
dell'indirizzo), `Irc.analizza` e `Irc.disescapa`, `Badge.leggi` e
`Badge.ruoli`, `Eventi.leggi` e `Eventi.moderazione`, `Emote.pezzi`,
`Rilievo.valuta`, `Conto.ripulisci`, `Comandi.analizza`.

`Conto.ripulisci` è l'unica parte pura di `conto.js` — testo dentro, testo
fuori, nessuna rete — e ci sono i casi apposta: i caratteri di controllo, gli
scavalchi di direzione, gli a capo che diventano una riga sola, e il taglio a
`Conto.LIMITE` che **conta i caratteri veri e non le unità UTF-16**, così
un'emoji sul taglio esce intera invece che a metà. `prove.html` carica quindi
anche `js/conto.js`, che di rete non ne apre nessuna finché non gliela si chiede.

`Comandi.analizza(testo)` è la stessa cosa per `comandi.js`: **riga dentro,
`{nome, argomenti}` fuori, oppure `null`** se quella riga non è un comando che
il pollaio sappia fare. Non tocca la rete, non guarda il conto, non sa niente
del DOM: decide soltanto se una riga è un comando e come si spezza. È la parte
che vale la pena tenere ferma con dei casi, perché è quella che sta fra un
utente che batte una barra e un `POST` su Helix — la ripulitura dei caratteri di
controllo, la barra che deve stare in testa, il nome del comando in minuscolo,
il resto spezzato sugli spazi, e soprattutto il `null` per tutto ciò che non è
in tavola, che è quello che tiene un comando sconosciuto fuori dalla chat (§19).

**Nota onesta**: `prove.html` oggi non carica `js/comandi.js` e in `prove.js`
non c'è ancora nessun caso per `analizza`. Il modulo la espone apposta — è
dichiarata qui, come `irc.js` dichiara le sue — ma finché quei casi non ci sono,
questa riga dell'elenco è un impegno e non un fatto. Chi ci mette mano per primo
aggiunge lo `<script>` e i casi, e questa nota sparisce.
**Non si prova la rete, il DOM, il tempo.** Non perché non contino: perché un
banco che simula una risposta di 7TV verifica il simulatore. `prove.html` non
carica `resa.js` (vuole il DOM montato), `barra.js` e `azioni.js` (vogliono il
DOM e qualcuno che clicchi), `treno.js` e `gente.js` (sono rete e orologio, e
partono da soli), `prova.js` e `pollaio.js` (mettono in moto il widget vero), e
nessun caso chiama `carica()`. Il banco deve poter dire verde col cavo staccato, o nei
giorni in cui 7TV è giù direbbe rosso e lo si smetterebbe di guardare.

**Un modulo che espone una funzione per il banco lo dichiara nel commento**,
come fa `irc.js` con `analizza` e `disescapa`. Non è un'API pubblica: è la
parte pura, esposta perché sia provabile, e chi disegna la chat non la chiama.

**Un caso che fallisce non è per forza un difetto del codice.** Può essere
sbagliata l'aspettativa: prima di correggere il modulo si va a leggere il
cappello del file, che in questo progetto dichiara le decisioni. Se il
comportamento è dichiarato, si corregge il caso — e a quel punto quel caso vale
doppio, perché tiene ferma una decisione invece di descrivere un accidente.

## 17. Più chat in una sola — la targhetta della piattaforma

Ogni messaggio porta `piattaforma` (§5). La targhetta si disegna **solo quando
le chat collegate sono più d'una**: «Twitch» sopra ogni riga in una chat di
solo Twitch non aggiunge niente, ruba una riga a testa e insegna all'occhio a
ignorare proprio l'elemento che dovrà saltare fuori il giorno che serve. Chi lo
decide è `pollaio.js`, che passa `multi` a `Resa.monta`.

**In modalità prova la targhetta è sempre accesa** e il traffico finto mescola
tutte e quattro le piattaforme, anche quelle non collegate. Un overlay si
sistema prima che serva, e una targhetta si regola solo guardandola.

**Le quattro tinte in `tokens.css` sono l'unica eccezione alla palette del
canale.** Il verde di Kick e il rosso di YouTube sono già in testa a chi
guarda: ridisegnarli in viola butterebbe via l'unica cosa che rende una
targhetta più veloce di una parola. L'eccezione è stretta: quattro
riempimenti, mai testo, mai bordi di qualcos'altro.

### Le live congiunte — più canali dentro la stessa piattaforma

Twitch chiama **Stream Together** l'invitare altri streamer nella propria
diretta, e **Shared Chat** la chat che ne esce: fino a sei canali che diventano
uno, con la moderazione valida per tutta la sessione. Il pollaio la riceve
gratis — i messaggi degli altri arrivano nella nostra stanza, duplicati da
Twitch, coi tag `source-*` di §8 — e li riconosce da quei tag soli, senza
account e senza API.

**Qui la regola delle quattro tinte non basta, e cede.** Due canali Twitch
hanno lo stesso `data-fonte`: un riempimento viola sopra entrambi non
distinguerebbe niente, che è esattamente il difetto contro cui la regola era
stata scritta. Quindi la targhetta di una live congiunta **ha del testo**: la
faccia del canale, presa dalla sua anagrafica (§7), e il suo nome. La tinta la
ricava `resa.js` dall'id, girando la ruota dei colori, con carica e luminosità
fissate in `tokens.css` (`--stormo-carica`, `--stormo-buio`) perché sei schede
diverse restino tutte leggibili. Nessun esadecimale nuovo, e §1.5 tiene.

**La targhetta di canale la prende solo chi arriva da un'altra stanza.** Le
righe di casa restano nude, come in una chat qualunque: sono la maggioranza,
sono già identificate dal fatto di non avere niente sopra, e riempirle di
«Twitch» rifarebbe lo spreco di prima. Se invece è collegata anche Kick o
YouTube, le righe di casa tornano ad avere la loro targhetta di piattaforma —
lì la distinzione serve davvero, ed è la stessa regola di sempre.

**Le pastiglie dei filtri seguono i canali** (§18): durante una sessione ne
compare una per ogni canale unito, `data-filtro="canale:<id>"`, e spariscono da
sole quando la sessione finisce. Un filtro rimasto senza canale torna a
«Tutto». Come per le piattaforme, compaiono soltanto quando i canali sono più
d'uno.

**Chi sa cosa, e quando:**

| | come lo si sa | quando |
|---|---|---|
| che c'è una sessione | i tag `source-*` di un messaggio | al primo messaggio che arriva da un altro canale |
| chi sono gli altri canali | `channel.shared_chat.begin` / `.update` su EventSub | **prima** che scrivano, ma solo con l'account collegato |
| quando la sessione finisce | `channel.shared_chat.end` | idem |

Il modo passivo non è un ripiego: è la strada principale, e regge da sola tutto
quello che si vede in chat. EventSub aggiunge le due cose che i messaggi non
possono dire — chi c'è prima che parli, e quando si smette — e `stormo.js` si
disinnesca da sé se l'account non c'è o se il gettone non porta
`user:read:chat` (§1.9).

**In modalità prova la live congiunta c'è sempre**: due canali finti oltre al
nostro, con la faccia disegnata sul posto e i badge che ripiegano, perché una
sessione vera capita quando capita e un overlay si sistema prima.

### Cosa si può collegare davvero

I vincoli §1.1 e §1.2 (zero dipendenze, tutto da `file://`) e la lettura
anonima di §1.3 non trattano le piattaforme allo stesso modo, e va detto invece
che scoprirlo dopo:

| | come | stato |
|---|---|---|
| **Twitch** | IRC anonimo su WebSocket | funziona |
| **Kick** | WebSocket Pusher pubblico | l'id della chatroom lo incolla l'utente: l'API di Kick da `file://` è dietro Cloudflare |
| **YouTube** | Data API v3 con chiave dell'utente | la chiave finisce nella querystring: va limitata dal pannello di Google |
| | | si parte dall'**id del video**, non dal canale: risalire dal canale passa da `search.list`, che ha un tetto separato di 100 chiamate al giorno |
| | | si traduce **solo** `textMessageEvent`. SuperChat, adesioni e regali vorrebbero un secondo vocabolario in Eventi, e mezzo vocabolario è peggio di nessuno (§1.7) |
| | | **le iscrizioni gratuite non esistono nell'API.** Non c'è l'evento. Solo le membership a pagamento |
| **TikTok** | — | **non si può** dal browser: la sua chat pretende una firma calcolata da un server |

Una sorgente che tace fa perdere quella chat, mai il widget (§1.9). Twitch non
dipende da nessuna delle altre.

### Lo stato consegnato

```js
{
  fase: 'arrivo' | 'corsa' | 'finito' | 'niente',
  livello: 3, punti: 2100, meta: 5300, percento: 40,
  restano: 278,        // secondi
  golden: false,       // il Golden Kappa Train
  partecipanti: 2,     // solo in 'arrivo'
  mancano: 1           // eventi che mancano per farlo partire
}
```

`arrivo` è la fase che interessa di più: è l'avviso **prima** che il treno
parta, e nella fascia diventa «TRENO IN ARRIVO — MANCANO 2».

### Il ritmo delle letture

Non è fisso, ed è una questione di educazione oltre che di risorse: una lettura
ogni cinque secondi per otto ore sono seimila richieste a un server non nostro.
Quindi a riposo si guarda **una volta al minuto**, e si stringe a cinque-sei
secondi solo quando c'è un treno in arrivo o in corso.

Soprattutto: **la chat fa da campanello.** Quando in IRC passa un abbonamento,
un regalo o dei bits — cioè esattamente le cose che fanno partire e salire un
treno — `pollaio.js` chiama `Treno.sveglia()` e la lettura parte subito.
`treno.js` si difende dalle raffiche, quindi venti regali di fila non diventano
venti richieste.

## 18. La barra sotto la chat — guardare, fermare, scrivere

Sotto l'elenco dei messaggi c'è una striscia: le pastiglie dei filtri, il tasto
che ferma la chat, il campo da cui si scrive in chat con il proprio account, e
— quando l'account c'è e ha i permessi — le pastiglie **Sondaggio** e
**Pronostico**. Sopra l'elenco dei messaggi, ma montato da lei, sta anche il
bottone che dice quanti guardano e apre l'elenco di chi c'è. La possiede
`js/barra.js`
(`window.Barra`), la monta `js/pollaio.js` con `Barra.monta(radice, opzioni)`
come fa con `Resa.monta`, e la governano due manopole nel gruppo `barra`:
`barra` e `scrivi` (§6).

Qui c'è la striscia; **cosa ci si fa con un account collegato — i comandi, il
menù sul nome, l'elenco di chi c'è — sta in §19**, perché è cresciuto fino a
essere una cosa sua.

### Dove compare, e dove non compare mai

Compare dove qualcuno la può usare: la finestra di `Pollaio.exe`, l'anteprima
dentro la regia, `pollaio.html` aperto a mano in un browser.

**In una sorgente browser di OBS non compare mai**, e non è una manopola da
ricordarsi di spegnere: lo decide `barra.js` da sé, riconoscendo
`window.obsstudio`. In OBS non c'è nessuno che clicca — la pagina è un'immagine
dentro una scena — e una striscia di comandi sarebbe soltanto gameplay coperto.
`barra=0` la toglie anche dove si potrebbe usare, per chi la finestra la vuole
nuda.

### I filtri

Le pastiglie sono `Tutto`, una per ogni chat collegata (`Twitch`, `Kick`,
`YouTube`) e `Eventi`. Quelle delle chat **compaiono solo quando le chat
collegate sono più d'una**: è la regola della targhetta di §17, e per lo stesso
motivo — con la sola Twitch, «Tutto» e «Twitch» sarebbero lo stesso bottone
scritto due volte.

Durante una live congiunta (§17) se ne aggiunge una **per ogni canale unito**,
il nostro compreso, con `data-filtro="canale:<id>"`: è l'unico modo di isolare
la chat di un solo streamer quando la piattaforma è la stessa per tutti. Le
crea `barra.js` quando `Stormo` annuncia la sessione, le toglie quando finisce,
e un filtro rimasto senza canale torna a `Tutto` da sé. Vale la stessa regola
di sopra: compaiono solo quando i canali sono più d'uno.

Come è fatto, e conta perché è la parte che gira a ogni messaggio: ogni riga
porta `data-piattaforma`, `data-stanza` quando il messaggio viene da Twitch, e
`data-evento` se è un evento o ha dei bits; la radice porta `data-filtro`; le
righe che non combaciano prendono `.is-fuori`, che è `display: none`.
**Cambiare filtro non rifà il DOM**: rimette una classe su righe che ci sono
già.

`Eventi` prende le schede di `tipo: 'evento'` — abbonamenti, raid, annunci — e
ogni messaggio con `bits > 0`. Le righe di moderazione **non** sono eventi: un
ban è una cosa che succede in chat, non una cosa che si guarda apposta, e chi
accende «Eventi» vuole vedere chi ha appena regalato venti abbonamenti.

**Con un filtro acceso `max` conta solo le righe visibili**, e il totale tenuto
in pagina ha per tetto sei volte `max`. Senza questo, filtrare per «Eventi»
avrebbe mostrato due righe su quaranta: un filtro che mostra quasi niente è un
filtro che si prova una volta. Con `filtro === 'tutto'` la potatura è
esattamente quella di prima, riga per riga — quindi in OBS, dove la barra non
c'è e il filtro resta `tutto`, il comportamento non cambia di un messaggio.

Nota onesta: la modalità prova mescola anche messaggi TikTok, e una pastiglia
TikTok non esiste perché TikTok non si può collegare (§17). In prova quei
messaggi si vedono solo sotto «Tutto». È un difetto piccolo e dichiarato: la
pastiglia mentirebbe, promettendo una chat che non c'è.

### La pausa

`Resa.pausa(true)` smette di appendere. I messaggi che intanto arrivano non si
buttano: vanno in una coda a parte con tetto 200, e nella barra compare
«N messaggi in attesa — riparti», che è anche il bottone per ripartire.

**Mentre è ferma i messaggi non svaniscono.** I timer di `svanisci` si congelano
registrando quanto restava a ciascuno, e ripartono da lì. Un messaggio che
sparisce mentre lo stai leggendo apposta è il contrario di quello che il bottone
promette.

Dove c'è la barra l'elenco diventa scorrevole (`.is-scorrevole`), e **la rotella
girata all'indietro ferma la chat da sé**: se stai risalendo, la chat che
continua a spingere ti porta via il punto che stavi guardando. Si ascolta
`wheel` e **non** `scroll`: `scroll` non distingue lo scorrimento dell'utente da
quello che facciamo noi per restare incollati al fondo, e distinguerli con una
bandierina è una gara che si perde. Ripartire, invece, è sempre un clic apposta:
si ferma da sola, non riparte da sola.

### Scrivere in chat — `window.Conto`

Il campo dentro la barra manda i messaggi con l'account dell'utente. Se `scrivi`
è spento non c'è; se è acceso ma nessun account è collegato, al suo posto c'è
**un bottone solo, centrato, «Connetti account»**, che fa partire il device flow
**da qui**, senza passare dalla regia.

Lì prima c'era la riga «Per scrivere in chat devo sapere chi sei» più un rimando
alla regia: spiegava una cosa che si capisce da sé, e per farla mandava da
un'altra parte. Adesso c'è il bottone e basta, e il bottone la fa.

**Collegare è un clic.** `Conto.chiedi(id, su)` chiamato senza `id` usa
`Conto.cliente()` (§1.3), quindi il bottone non ha niente da chiedere prima di
partire: domanda il codice a Twitch, apre la pagina di attivazione **con il
codice già dentro**, e resta ad aspettare il sì. L'unico caso in cui la barra
non può fare da sé è `Conto.serveClientId()` vero: allora lo dice e manda in
cima alla regia (§14), che è l'unico posto dove quel campo esiste. In modalità
prova il bottone c'è ma non collega niente per davvero, e lo dice (§13).

**OAuth Device Code Flow**, ed è l'unico che si poteva usare. `POST /oauth2/device`
con `client_id` e `scopes` dà un `user_code` di otto caratteri, un `device_code`
e un `verification_uri`; poi si interroga `POST /oauth2/token` con
`grant_type=urn:ietf:params:oauth:grant-type:device_code` finché l'utente non
conferma su `twitch.tv/activate`. Le risposte intermedie sono
`authorization_pending` (si continua), `slow_down` (si allunga il passo),
`access_denied` e `expired_token` (si smette, e si dice perché).

**Perché questo flusso e non gli altri**: l'implicit grant e l'authorization
code vogliono un *redirect URI*, cioè un server che riceva la risposta. Qui non
c'è nessun server: c'è una pagina aperta da `file://` o da un host virtuale di
WebView2. Il device flow non ha redirect URI e non ha client secret, quindi è
l'unico che regge il §1.2. Che lo si potesse chiamare da lì è stato **verificato
sul campo prima di scrivere il modulo** (§7).

**L'indirizzo di attivazione arriva dalla rete, quindi non gli si crede.** Nella
risposta del device endpoint Twitch manda `verification_uri`, che è già
`https://www.twitch.tv/activate?device-code=<codice>`: usarlo vuol dire che a chi
collega non tocca ricopiare otto caratteri a mano. Prima veniva buttato via e si
apriva l'indirizzo nudo. Adesso `Conto` lo consegna in `passo.indirizzo`, **ma
solo dopo averlo confrontato con `MODELLO_ATTIVAZIONE`**: deve essere esattamente
`https://www.twitch.tv/activate`, con al più un `?device-code=` di 4-16 caratteri
alfanumerici, e nient'altro. Se non combacia, `Conto` se lo ricostruisce da sé
dalla propria costante `ATTIVAZIONE` più il codice.

**Il perché va dichiarato, perché è tutto il punto**: quell'indirizzo finisce in
`window.open` e nel comando `attiva` del launcher, cioè è un indirizzo che
arriva dalla rete e che poi **si apre**. Un `verification_uri` diverso da quello
atteso non sarebbe una comodità in meno: sarebbe una pagina qualunque aperta a
nome nostro, su un gesto che l'utente ha chiesto per Twitch. L'unica risposta è
non fidarsene e ricostruirlo.

**Il Client ID di norma c'è già.** `Conto.cliente()` guarda in ordine il conto
collegato, il Client ID messo da parte in `localStorage` e la costante
`CLIENTE_PREDEFINITO` di `conto.js` (§1.3); solo se dopo tutti e tre manca
ancora — `Conto.serveClientId()` — lo mette l'utente, registrando
un'applicazione sua su `dev.twitch.tv/console/apps` (tipo **Public**, redirect
`http://localhost`). Non è un segreto: è un nome, e viaggia in chiaro in ogni
richiesta. Il *client secret* non serve, non si chiede e non si salva — se un
giorno una schermata lo chiede, è quella schermata a essere sbagliata.

**Gli scopi sono quindici, e questo campo ne usa uno: `user:write:chat`.**
Mandare messaggi a nome proprio. Qui c'era scritto «uno scopo solo», e per il
campo è ancora vero: gli altri quattordici non servono a lui, servono ai
comandi, al menù sul nome, all'elenco di chi c'è e alle tue emote nel
suggeritore, e stanno tutti in §1.3 con accanto la funzione che li giustifica.
Quello che non è cambiato è il confine: **niente di tutto questo serve a
leggere la chat**, che si legge in anonimo come sempre. Uno scopo in più si
discute qui dentro prima che nel codice.

Il gettone si controlla con `GET /oauth2/validate`, si rinnova da solo col
`refresh_token` quando mancano meno di dieci minuti alla scadenza, e su
**Revoca account** si revoca davvero con `POST /oauth2/revoke`: dimenticarlo e
basta lascerebbe in giro un gettone vivo che l'utente crede morto. Il Client ID
messo da parte resta, così riconnettersi torna a essere un clic.

Si manda con `POST /helix/chat/messages` (`broadcaster_id`, `sender_id`,
`message`), **non via IRC**: la connessione IRC resta anonima e di sola lettura,
e non la si tocca. Il messaggio appena mandato **torna indietro da lì** come
quello di chiunque altro, e si disegna con lo stesso codice: non esiste un
percorso separato per i propri messaggi, e non deve nascerne uno.

**Il `broadcaster_id` non è la manopola `id`.** Si chiede a
`GET /helix/users?login=<canale>` e si tiene in cache. La manopola `id` serve a
7TV, BTTV e FFZ, e uno può cambiarla senza cambiare `canale` — o il contrario:
fidarsene per decidere *dove finisce un messaggio* vuol dire scrivere nel canale
sbagliato senza accorgersene, che è il tipo di guasto che non si vede finché non
è tardi.

**Dove sta il gettone**: `localStorage`, chiavi `sb-pollaio-conto` e
`sb-pollaio-cliente`. Mai nella querystring, mai in `avvio\pollaio.ini`, mai in
un file (§1.3). `Pollaio.exe` e `Regia.exe` sono due finestre WebView2 con lo
stesso `UserDataFolder` (`%LocalAppData%\Pollaio\vetrina`) e lo stesso host
virtuale `https://pollaio.locale`: stessa origine, stesso `localStorage`. È per
questo che l'account collegato in una delle due finestre lo trova subito anche
l'altra, tramite l'evento `storage`, senza riavviare niente — e adesso vale nei
due sensi, perché si collega tanto dalla regia quanto dalla chat. La sorgente
browser di OBS è un altro browser con la sua memoria: **lì il gettone non
arriva, ed è voluto.**

Due incroci con le manopole di §6, e vanno detti perché altrimenti sembrano
guasti. Con `comandi=1` i messaggi che iniziano per `!` si nascondono: se ne
mandi uno, parte davvero, ma in pagina non compare — e la barra lo dice, invece
di lasciarti pensare che non sia partito. In modalità prova il campo c'è ma non
manda niente, e anche questo lo dice: `prova=1` non si collega a nessuna chat
vera (§13), e mandare per davvero da una chat finta sarebbe l'unico modo di fare
un danno con una prova.

La parte pura è `Conto.ripulisci(testo)`, dichiarata per il banco (§16): toglie
i caratteri di controllo e gli scavalchi di direzione, riduce ogni spazio a uno
solo, e taglia a 500 **contando i caratteri veri**, non le unità UTF-16.

### Il suggeritore delle emote — i due punti aprono, il nome resta nudo

Nel campo si battono i due punti più almeno una lettera e **sopra** il campo
compare un elenco — `.pollaio__suggeriti`, un `<ul role="listbox">` con voci
`role="option"` e `aria-selected` — fino a **otto** emote, ognuna con
l'anteprima accanto al nome. Le frecce scorrono e girano in tondo, Invio o Tab
confermano, Esc chiude, il `blur` del campo chiude, il mouse sceglie passandoci
sopra e conferma al `mousedown`: `mousedown` e non `click`, perché il `click`
arriverebbe dopo il `blur` che ha già chiuso l'elenco.

Il punto d'innesco lo riconosce `TROVA_CHIAVE` in `barra.js`,
`/(?:^|\s):([A-Za-z0-9_+-]*)$/`. I due punti contano solo a inizio messaggio o
dopo uno spazio, e solo in coda a quello che sta prima del cursore: i due punti
in mezzo a `https://` non aprono niente.

**Nel messaggio finisce il nome nudo, non `:nome:`**, ed è la decisione da
dichiarare. `:nome:` è la sintassi di **Discord**. Su Twitch i due punti servono
soltanto ad aprire il suggeritore e non fanno parte del testo: quello che parte,
e quello che Twitch e 7TV disegnano, è `KEKW`. Il pollaio fa **esattamente
quello che fa Twitch**.

Per lo stesso motivo **non è stato aggiunto nessun riconoscimento di `:nome:` in
`Emote.pezzi`**, e non va aggiunto. Vorrebbe dire disegnare un'emote dove Twitch
e 7TV mostrano testo, cioè far divergere l'overlay da quello che vedono gli
spettatori: loro leggerebbero `:kekw:` e nell'overlay ci sarebbe una faccina. Un
overlay che mostra una chat diversa da quella vera è un overlay rotto, anche
quando è più carino.

L'elenco lo riempie `Emote.cerca`, API pubblica di `js/emote.js` accanto a
`carica`, `pezzi`, `pezziKick`, `aggiungiTwitch`, `quanteMie`, `pronto` e
`quante`:

```js
Emote.cerca(prefisso, tetto)
// → [{nome, url, url2, fonte, animata, sovrapposta, peso}], al più `tetto` (8)
```

Cerca per **sottostringa**, senza distinzione fra maiuscole e minuscole. Ordina
prima chi **comincia** col prefisso e poi chi lo contiene; dentro ogni gruppo
prima il **peso** più alto, poi il nome più **corto**, poi l'alfabeto. Il peso
non è inventato per l'occasione: è quello che il catalogo usa già per decidere
chi vince quando due provider hanno la stessa emote, e `PESO_CANALE` vale 100
contro il 3, 2 e 1 di 7TV, BTTV e FFZ. Quindi **le emote del canale escono prima
di tutte le globali**, che è l'ordine giusto: sono quelle che questa chat usa
davvero.

### Le native di Twitch nel suggeritore — un elenco a parte, e il perché

Qui c'era scritto che le native di Twitch non si potevano suggerire, perché non
esiste un elenco da cui prenderle senza autenticazione. La seconda metà è caduta
insieme al conto: `helix/chat/emotes/user` (§7) risponde con le emote che
**quell'utente** può usare **in quel canale**, ed è esattamente l'elenco che
mancava. Le chiede `barra.js` appena l'account è collegato, se ha
`user:read:emotes`, e le passa a `Emote.aggiungiTwitch(voci)`.

**La decisione sta in dove finiscono, e non è un dettaglio di implementazione.**
Non entrano nel `catalogo`: vanno in un elenco loro, e `Emote.cerca` guarda
tutti e due. Il motivo è la regola già dichiarata due volte, qui sopra per
`:nome:` e in §13 per la modalità prova, detta una terza: **il `catalogo`
decide cosa si disegna nei messaggi degli altri**, e lì un'emote nativa deve
continuare ad arrivare messaggio per messaggio dal tag `emotes` di Twitch (§8).
Metterla nel catalogo vorrebbe dire disegnare l'emote anche a chi, in quel
messaggio, su Twitch legge testo — cioè far divergere l'overlay dalla chat vera,
che è il difetto da non introdurre nemmeno quando è più carino.

Nel suggeritore, invece, **pesano più di tutte**: il loro peso vale 400 contro i
100 del `PESO_CANALE`, quindi le tue native escono prima delle emote del canale
e molto prima delle globali. È l'ordine giusto per lo stesso motivo per cui le
emote del canale battono le globali — sono quelle che tu, in questo campo, stai
per scrivere davvero.

`Emote.cerca` fonde i due elenchi per nome tenendo il peso più alto, quindi un
nome che sta in tutti e due esce una volta sola. Il resto dell'ordinamento è
quello di prima, e resta quello: chi comincia col prefisso davanti a chi lo
contiene, poi il peso, poi il nome più corto, poi l'alfabeto.

**Le emote di un canale non sono di chi lo guarda: sono del canale.** Per un po'
qui c'è stata una sola richiesta, `chat/emotes/user`, e legava l'elenco a chi ha
fatto login: con un bot moderatore collegato uscivano le emote del bot, e quelle
dello streamer no. Ma il pollaio deve poter stare addosso a **qualunque canale**,
ognuno con le sue — è il motivo per cui esiste — e quell'elenco non può dipendere
da quale account ha in mano il gettone.

Quindi le richieste sono **due, e rispondono a due domande diverse**:

- `chat/emotes?broadcaster_id=<canale>` — «quali emote ha questo canale».
  **Nessuno scope**: le basta un gettone qualunque e l'id del canale.
- `chat/emotes/user?user_id=<tuo>&broadcaster_id=<canale>` — «quali posso usare
  io». Serve ancora, e non è un doppione: ci mette dentro le globali e le emote
  degli altri canali a cui sei abbonato, che il canale non conosce.

Finiscono tutte e due in `Emote.aggiungiTwitch`, cioè nell'elenco separato di
qui sotto, mai nel `catalogo` — e il perché è la regola che viene subito dopo.

**Le pagine si seguono tutte.** `helix/chat/emotes/user` risponde a pagine, con
un `pagination.cursor` da rimettere in `after`: leggerne una sola lasciava fuori
tutto il resto proprio a chi di emote ne ha tante, cioè a chi le usa. `barra.js`
segue il cursore fino a quando finisce, con un tetto di `PAGINE_MIE` giri —
perché un cursore che non finisce mai è un guasto di Twitch, e non un buon
motivo per girare a vuoto qui dentro.

**I modi di restare senza le proprie emote sono quattro, e a chi guarda l'elenco
sembrano tutti la stessa cosa** — l'elenco mostra le 7TV e tace. Sono: la
modalità prova, l'account scollegato, il permesso `user:read:emotes` che manca
(un gettone più vecchio dello scope: sembra un difetto del widget ed è un
collegamento da rifare), e la richiesta che va male, dove un 401 dopo un rinnovo
e un 400 sull'id da fuori si vedono uguali.

Per questo `barra.js` non tiene un sì o un no ma **il perché**: `nienteMie(perche)`
lo mette da parte, il primo che capita se lo tiene, e `mancanoPerche` è quello
che il suggeritore racconta. Dirne uno giusto vale più che dirli tutti.

**Si dice la prima volta che il suggeritore si apre**, una volta sola, perché è
lì che uno guarda l'elenco e non ci trova le sue — e non all'avvio, dove nessuno
ha chiesto niente e un avviso è solo rumore. È la stessa disciplina delle
pastiglie Sondaggio e Pronostico, spostata di un momento: **non si tace su una
cosa che non può funzionare, ma la si dice quando è la risposta a una domanda
che qualcuno si è appena fatto.**

**Il percorso dei messaggi è un'altra cosa e non c'entra**, ed è stato messo
sotto prova apposta perché i due si confondono: le native nei messaggi arrivano
dal tag `emotes` (§8) e non chiedono nessun permesso. Il banco adesso copre gli
id `emotesv2_`, lo stesso id con due intervalli nella stessa riga, e un'emoji
prima dell'emote — che è il caso in cui contare le unità UTF-16 invece dei
caratteri farebbe slittare il taglio di uno.

### `attiva`, il comando del launcher

Nella finestra del launcher il bottone «Connetti account» — quello della regia e
quello della barra sotto la chat, che fanno la stessa cosa — apre
`twitch.tv/activate` nel **browser di sistema**, dove l'utente è già loggato su
Twitch: la WebView2 di `Pollaio.exe` ha un profilo suo, vuoto, e là dentro
toccherebbe rifare il login solo per confermare un codice. Lo fa il comando
`attiva` di `avvio/Pollaio.cs` (`Vetrina.Messaggio`).

**Il comando adesso porta il codice**: `pollaio:attiva:<codice>`. Il launcher lo
passa a `CodiceBuono()` — da 4 a 16 caratteri, soltanto lettere e cifre, niente
altro — e solo se passa apre `ATTIVAZIONE + "?device-code=" + codice`; se non
passa apre `ATTIVAZIONE` nudo, cioè esattamente quello che faceva prima. Il
guadagno è tutto lì: prima, arrivato sulla pagina appena aperta, l'utente doveva
ricopiare otto caratteri a mano; adesso non deve fare altro che dire di sì.

**La proprietà che si voleva tenere è intatta: l'indirizzo di base resta una
costante dentro il launcher, e dalla pagina non arriva mai un indirizzo.** Arriva
un codice alfanumerico corto, e viene verificato prima di essere concatenato. Un
comando che accetta un indirizzo qualsiasi da chi sta nella WebView è un comando
che può far aprire qualunque cosa, e questo non ne ha bisogno né allora né
adesso: la pagina chiede di aprire *quella* pagina, e dice soltanto con quale
codice.

## 19. I comandi, il menù sul nome, e chi c'è in chat

Con un account collegato la barra smette di essere soltanto un posto da cui
parlare e diventa il posto da cui si modera. Sono tre moduli nuovi, e nessuno
dei tre si monta da sé: li accende `barra.js` (§4). Quindi **dove non c'è la
barra non c'è niente di tutto questo** — in una sorgente browser di OBS, con
`barra=0`, e in modalità prova, dove il menù sul nome non si monta apposta e a
Twitch non arriva niente (§13).

| file | globale | cosa fa |
|---|---|---|
| `app/js/comandi.js` | `window.Comandi` | i ventisette comandi di Twitch: ognuno sul suo endpoint Helix, ognuno col suo permesso. Non tocca il DOM |
| `app/js/gente.js` | `window.Gente` | quanti guardano e chi c'è in chat, divisi in streamer, moderatori, VIP e utenti. Non tocca il DOM: consegna uno stato, e a disegnarlo è la barra |
| `app/js/azioni.js` | `window.Azioni` | il menù che si apre cliccando un nome. È l'unico dei tre che disegna qualcosa |

### La strada è una sola: la riga del comando

`Comandi` espone quattro cose, e la forma dice già la decisione:

```js
Comandi.ELENCO             // [{nome: '/timeout <utente> [secondi] [motivo]', aiuto}]
Comandi.e(testo)           // è un comando che so fare?
Comandi.analizza(testo)    // → {nome, argomenti} | null — pura, per il banco (§16)
Comandi.esegui(testo, {canale, canaleId}, su)
```

**Chi vuole dare un comando compone la riga e la passa a `Comandi.esegui`.** Non
chiama Helix, non costruisce un corpo JSON, non si guarda i permessi per conto
proprio. Oggi le porte sono tre:

- il **campo** sotto la chat, dove la riga la batte l'utente;
- il **menù sul nome**, che da un clic compone `/timeout tizio 600`;
- i **pannelli** Sondaggio e Pronostico, che compongono
  `/poll la domanda | a | b / 120`.

**Tre porte, una stanza sola.** Il controllo del permesso, i ritagli sui limiti
di Twitch, la traduzione degli errori e le frasi che si leggono stanno scritti
**una volta sola**, dentro `comandi.js`: quello che vale per il comando battuto
a mano vale identico per il menù e per i pannelli, senza che nessuno debba
ricordarsi di tenerli allineati. **Chi aggiungerà la quarta porta compone una
riga**, e questa regola conta più di ognuna delle tre porte che ci sono adesso.

Cosa fa `esegui`, in ordine, e ogni passo è un cancello:

1. `analizza` la riga. Se non è un comando in tavola, si ferma qui e lo dice.
2. deve esserci un `Conto` che sappia fare `verso`, `chi`, `puo` e `canale`.
3. deve esserci il `canaleId`, e deve essere un id numerico: **non si danno
   comandi al buio**, perché un comando dato nel canale sbagliato non si annulla.
4. deve esserci un account collegato, con un `utenteId` numerico.
5. `Conto.puo(voce.scopo)`: **il permesso si controlla prima di chiamare.**
6. solo allora il comando costruisce il suo percorso e chiama `Conto.verso` (§7).

**Un comando che non conosco non finisce in chat, ed è il motivo per cui `e()`
esiste.** Da `helix/chat/messages` Twitch **non esegue** i comandi: li scrive.
Una riga come `/bam tizio`, battuta di fretta, non sarebbe un comando fallito:
sarebbe un messaggio pubblico che dice `/bam tizio` davanti a tutti. Quindi la
barra, davanti a una riga che comincia per barra, chiede prima a `Comandi.e` se
è roba conosciuta, e se non lo è **non manda niente** e spiega perché.

I ventisette, con il permesso che ciascuno pretende:

| comando | cosa fa | permesso |
|---|---|---|
| `/ban <utente> [motivo]` | fuori dal canale per sempre | `moderator:manage:banned_users` |
| `/timeout <utente> [secondi] [motivo]` | in panchina: senza numero dieci minuti, al massimo due settimane | idem |
| `/unban <utente>` · `/untimeout <utente>` | gli riaprono la porta | idem |
| `/clear` | svuota la chat per tutti | `moderator:manage:chat_messages` |
| `/slow [secondi]` · `/slowoff` | il rallentatore: senza numero trenta secondi, da 3 a 120 | `moderator:manage:chat_settings` |
| `/followers [minuti]` · `/followersoff` | scrivono solo i follower, e da quanto devono seguire | idem |
| `/subscribers` · `/subscribersoff` | scrivono solo gli abbonati | idem |
| `/emoteonly` · `/emoteonlyoff` | si parla solo a emote | idem |
| `/uniquechat` · `/uniquechatoff` | niente messaggi copiati e incollati uguali | idem |
| `/announce [blue\|green\|orange\|purple] <testo>` | annuncio in evidenza, fino a 500 caratteri | `moderator:manage:announcements` |
| `/shoutout <utente>` | manda la chat a vedere un altro canale | `moderator:manage:shoutouts` |
| `/raid <utente>` · `/unraid` | il raid e il suo annullamento | `channel:manage:raids` |
| `/marker [descrizione]` | un segnalibro nella diretta, per ritrovare il punto | `channel:manage:broadcast` |
| `/poll <domanda> \| <scelta> \| <scelta> [/ secondi]` | apre un sondaggio | `channel:manage:polls` |
| `/prediction <domanda> \| <esito> \| <esito> [/ secondi]` | apre un pronostico | `channel:manage:predictions` |
| `/mod <utente>` · `/unmod <utente>` | dà e toglie la spada | `channel:manage:moderators` |
| `/vip <utente>` · `/unvip <utente>` | dà e toglie il VIP | `channel:manage:vips` |
| `/w <utente> <testo>` | un sussurro: lo legge solo lui, e in chat non compare | `user:manage:whispers` |

Tre regole di forma, uguali per tutti e ventisette:

- **un numero fuori scala si ritaglia, non si rifiuta.** `/timeout tizio 99999999`
  diventa due settimane, che è il massimo che Twitch accetta. Far ribattere la
  riga per un limite che il pollaio conosce già è farsi dire due volte la stessa
  cosa. Quello che invece si rifiuta è un numero che non è un numero: là non c'è
  niente da ritagliare, e la risposta è la riga d'uso del comando.
- **il nome di chi si comanda passa da `/^[a-z0-9_]{1,25}$/`**, con la
  chiocciola tolta se c'è, e poi si traduce in id con `helix/users`: si comanda
  sugli id, mai sui nomi.
- **la risposta dice cosa è successo, in italiano e al passato**: «Fatto: tizio
  sta in panchina per dieci minuti», «Fatto: il sondaggio è aperto, tre scelte,
  si vota per due minuti». Un «OK» non si può controllare; una frase sì.

### I pannelli Sondaggio e Pronostico

Nella striscia dei filtri stanno due pastiglie, **Sondaggio** e **Pronostico**,
che aprono lo stesso pannello (`.pollaio__sondaggio`) in due modi: la costante
`MODI` di `barra.js` tiene i due profili, e `alternaSondaggio` cambia
segnaposto, limiti dei campi, numero di righe e testo del bottone.

**Il pannello non chiama Helix**: compone la riga e la passa a `Comandi.esegui`,
esattamente come il menù sul nome. È la stessa decisione, e presa due volte di
fila è un principio: **le porte compongono righe, la stanza è una sola.**

**Le pastiglie compaiono solo se il gettone ha il permesso**
(`channel:manage:polls`, `channel:manage:predictions`), controllato in
`apriSondaggio`, prima di aprire: senza il permesso il pannello **non si apre**
e l'eco dice quale manca. È la stessa disciplina delle voci spente nel menù sul
nome: **non si offre una cosa che non può funzionare.**

**Il pannello non ha un bottone suo in nessuna fila, e non è una dimenticanza.**
Si apre battendo `/poll` o `/prediction` da soli nel campo per scrivere — è
`SOLO_PANNELLO` in `barra.js` — e compare in sovrimpressione sopra la chat. La
fila dei filtri è una cosa che si guarda di sfuggita mentre la chat scorre, e
ogni bottone che ci si aggiunge ruba attenzione a quelli che ci stanno per
mestiere; un sondaggio invece si fa apposta, ed è giusto che si chieda.

Il comando scritto per intero resta un comando: `SOLO_PANNELLO` scatta **solo**
se dopo non c'è niente, quindi chi incolla `/poll domanda | a | b` lo vede
partire com'è. Digitando si apre il pannello, incollando parte il comando — e
nessuna delle due strade toglie l'altra.

I limiti sono quelli veri di Twitch, **verificati sulla documentazione e non a
memoria** (`dev.twitch.tv/docs/api/reference`):

| | titolo | scelte | ciascuna | durata |
|---|---|---|---|---|
| sondaggio | 60 caratteri | da 2 a 5 | 25 caratteri | da 15 a 1800 secondi |
| pronostico | 45 caratteri | da 2 a 10 | 25 caratteri | da 1 a 1800 secondi |

Vale la pena dire che la verifica **ha corretto un numero**: la finestra del
pronostico parte da **1** secondo, non da 30, e `PREDIZIONE_MINIMA` in
`comandi.js` è stata corretta di conseguenza. Un limite ricordato a memoria è un
limite inventato, e un limite inventato più stretto del vero è una funzione che
si rifiuta di fare una cosa che si poteva fare.

Il pannello si difende da una cosa sola prima di comporre: **una barra verticale
dentro la domanda**, che è il carattere con cui la riga separa le scelte. Lì non
si ritaglia, si dice — perché ritagliare vorrebbe dire cambiare la domanda che
l'utente ha scritto.

**Il pannello respira come gli altri riquadri, non più stretto.** I campi si
impilano con `calc(var(--passo) * 0.5)` fra l’uno e l’altro e le parti del
pannello con `calc(var(--passo) * 0.75)`, che sono i due passi già usati dalla
fila dei filtri e dal corpo del pollaio: un pannello che si apre in
sovrimpressione sopra la chat non può essere l’unico posto con una misura sua.
A `0.4` e `0.35` — le misure di prima — i campi si toccavano, e l’anello di
fuoco di uno finiva dentro quello accanto.

### Il menù sul nome

Si apre cliccando un nome, e i nomi cliccabili sono due: `.pollaio__nome` dentro
una `.pollaio__riga[data-nick]`, cioè chi ha scritto un messaggio, e
`.pollaio__lista-nome[data-nick]`, cioè un nome dentro l'elenco di chi c'è. Il
nick si legge dal `data-nick`, e prima che si apra qualsiasi cosa deve passare
per `/^[a-z0-9_]{1,25}$/`.

Le voci sono dieci: **Sussurra**, **Shoutout**, **Timeout 10 minuti**, **Timeout
un'ora**, **Togli il timeout**, **Fallo VIP**, **Togli il VIP**, **Fallo
moderatore**, **Togli il moderatore**, **Banna**.

**Il menù non chiama Helix.** «Timeout 10 minuti» su `tizio` diventa la riga
`/timeout tizio 600`, e la riga va a `Comandi.esegui`: una strada sola, due modi
di imboccarla. Non è un risparmio di righe, è che **quello che vale per il
comando scritto vale per il menù senza che nessuno lo riscriva** — il controllo
del permesso, il ritaglio dei limiti, la frase che torna indietro, il rinnovo
del gettone sul 401. Un menù che avesse chiamato Helix per conto suo sarebbe
stato la seconda copia di cui parla §7, e la seconda copia è quella che invecchia.

**Le voci senza permesso sono spente, non nascoste**, con il perché nel `title`:
«Serve un permesso che il collegamento non ha: riconnetti l'account.» Nasconderle
avrebbe fatto un menù diverso su ogni computer, senza dire mai perché; spegnerle
racconta cosa esiste e cosa manca, che è l'informazione che serve a chi deve
decidere se vale la pena riconnettere (§1.3).

**«Banna» chiede due volte.** Il primo clic non banna: la voce diventa «Sicuro?
Banno tizio» e ha **quattro secondi** per farsi ripensare, dopo i quali torna
com'era da sé. È l'unica voce a due tempi, ed è voluto che sia l'unica: il ban è
la sola che faccia un danno che non si ripara — `/unban` riapre la porta, ma
quello che è successo in chat è già successo, e chi se n'è andato se n'è andato.
Un menù che chiede conferma per tutto insegna a dire di sì senza leggere, e a
quel punto non protegge più niente.

**«Sussurra» non manda: riempie il campo** con `/w tizio ` e ci porta dentro il
cursore. Un sussurro è un messaggio, e i messaggi si scrivono; il menù arriva
fino a dove può arrivare un clic e lascia il resto a chi deve dire qualcosa.
È anche l'unica voce che compare sempre accesa, perché il permesso dei sussurri
lo controlla `comandi.js` quando la riga parte davvero.

Il menù si chiude con Esc, con un `mousedown` fuori, e quando la finestra perde
il fuoco.

**`menu.js` ha dovuto imparare tre selettori.** `afferrabile()` adesso esclude
`.pollaio__nome`, `.pollaio__lista` e `.pollaio__azioni`, oltre ai comandi e a
`.pollaio__barra` che escludeva già: senza, nella finestra senza cornice (§20)
cliccare un nome trascinava la finestra invece di aprire il menù. La regola fin
qui era rimasta implicita, e conviene scriverla: **dove si clicca non si
trascina.** Ogni parte cliccabile che nasce fuori dalla barra va aggiunta a
quell'elenco, o il trascinamento se la mangia.

### Chi c'è in chat

Il bottone sopra l'elenco dei messaggi dice quanti sono — «130 in chat · 42
guardano», «Chi c'è» finché non si sa ancora niente — e apre il pannello. Lo
stato lo tiene `gente.js`:

```js
Gente.avvia({canale, canaleId, su, visibile})   // su(stato) a ogni cambiamento
Gente.aggiorna()                                 // lo chiama chi apre il pannello
Gente.stato()
Gente.ferma()
```

```js
{
  spettatori: 42,        // -1 = canale spento, null = non lo so ancora
  inChat: 130,
  streamer: [{nick, nome}], moderatori: [], vip: [], utenti: [],
  quando: 0,             // ms dell'ultima lettura riuscita
  guaio: ''              // in chiaro, già in italiano
}
```

**`spettatori` parte a `null` e non a `0`**, e non è pignoleria: uno zero qui
vuol dire «in diretta, e non guarda nessuno», che è una cosa vera e diversa da
«Twitch non ha ancora risposto». Chi legge questo campo ci scrive una targhetta
in faccia a qualcuno, e su un dubbio non deve scrivere niente.

Lo stato si consegna **solo quando cambia davvero**: una firma mette in fila i
numeri, il guasto e i nick, e se è uguale a quella di prima non si avvisa
nessuno. Ridisegnare ogni minuto una lista identica costa e fa lampeggiare.

**Il ritmo sta nelle costanti in cima al file, ed è la disciplina del §15 detta
una seconda volta**: il contatore ogni **60 s**, la lista di chi c'è ogni
**120 s**, mai due letture a meno di **5 s** l'una dall'altra — che è la difesa
dalle raffiche, perché chi apre e chiude il pannello cinque volte di fila non
deve diventare cinque richieste — e dopo **5 giri andati male di fila**
`gente.js` **si spegne da sé** con un `console.warn`, e la chat continua come se
niente fosse. È la forma di `treno.js`: lento a riposo, una scorciatoia quando
serve, e una resa dichiarata invece di un modulo che continua a bussare a vuoto.

**La lista si legge solo a pannello aperto.** `visibile()` dice a `gente.js` se
l'elenco è sullo schermo; se non lo è, il giro chiede soltanto il contatore. La
risposta di `chat/chatters` è pesante — mille voci per pagina, fino a cinque
pagine — e a pannello chiuso non serve a niente: il numero che si vede sul
bottone sta già nella risposta di `streams`. Chiedere tutto per mostrare una
cifra è lo spreco che non si nota finché non lo si fa per otto ore di fila.

**`moderator:read:chatters` vale solo se sei lo streamer o un suo moderatore di
quel canale.** Su un canale altrui Twitch risponde **403, e quel 403 non è un
guasto**: è la risposta giusta a una domanda che non avevi il diritto di fare.
Quindi non diventa un errore, diventa una frase dentro l'elenco — «Chi c'è in
chat lo vedono soltanto lo streamer e i suoi moderatori, e qui non lo sei: ti
resta il conto degli spettatori». Per lo stesso motivo i moderatori e i VIP del
canale si chiedono **solo se il canale è il tuo** (l'`utenteId` del conto è
uguale al `canaleId`); se non lo è non si chiedono affatto, la lista non si
divide, e lo dice: «Questo canale non è il tuo, quindi non so chi è moderatore e
chi è VIP: li trovi tutti fra gli utenti».

**Un permesso che manca e un canale che non è il tuo sono due cose diverse, e il
pollaio le dice diverse.** Confonderle avrebbe fatto sembrare rotta la
situazione più normale che ci sia: guardare la chat di qualcun altro.

Gli scomparti sono quattro — **Streamer**, **Moderatori**, **VIP**, **Utenti** —
ordinati per nome dentro ciascuno, e ognuno porta il suo numero nel titolo. Lo
streamer è sempre il primo e c'è anche quando non ha ancora scritto: è il suo
canale. Ogni nome è cliccabile e apre il menù di qui sopra.

`Gente` **non parte senza un account collegato**, e non è una scorciatoia: senza
gettone `Conto.verso` non ha niente da mettere in `Authorization`, e sia
`streams` sia `chatters` vogliono un `Bearer`. Chi non collega niente ha il
pollaio di sempre (§1.3): il bottone di chi c'è non compare, e la chat si legge
uguale.

### La spia dice due cose, e il collegamento viene prima

«canale spento» stava nella pastiglia del conteggio, e da lì è stato tolto: una
pastiglia che di solito conta persone e all'improvviso annuncia che qualcosa è
spento **si legge come un guasto**, non come una notizia. Il conteggio conta, e
quando non c'è niente da contare non scrive niente.

La notizia sta nella spia, che adesso porta due informazioni diverse sullo
stesso pezzo di schermo:

| stato | tinta | quando |
|---|---|---|
| `collego` `riprovo` `resa` | allerta, allerta, `--live` | il **collegamento** alla chat |
| `accesa` | `--ok` | collegato, e della diretta non si sa niente |
| `live` | `--ok` | collegato, e il canale è in diretta |
| `offline` | `--live` | collegato, e il canale è spento |

**Il collegamento viene prima.** `Resa.diretta(accesa)` scrive la targhetta solo
se la spia è in uno stato calmo (`accesa`, `spenta`, `live`, `offline`): se la
linea è caduta, quella è la notizia, e «OFFLINE» aspetta invece di coprirla —
altrimenti si direbbe «il canale è spento» a chi in realtà ha la rete giù, che è
la diagnosi sbagliata detta con sicurezza. Appena il collegamento torna
`accesa`, `spia()` rimette la targhetta da sé.

**«IN LIVE» sparisce al primo messaggio, «OFFLINE» resta.** Sono due frasi con
due lavori diversi: la prima è una conferma, e una conferma ha finito appena la
chat comincia a scorrere — se ne va come faceva «Sono nel pollaio». La seconda
dice che non arriverà niente, ed è vera finché dura, quindi non se ne va: a
canale spento si chiacchiera lo stesso, e proprio lì la targhetta serve.

**In una sorgente browser di OBS non compare, e non c'è una riga che lo
imponga.** Lo stato della diretta lo sa solo `barra.js`, che è l'unico posto che
chiede `/streams`, e `barra.js` in OBS non parte nemmeno (`avvia` esce subito su
`inObs()`). La cosa giusta capita da sé perché il dato nasce dove serve: è
meglio di un `html[data-finestra]` in più da ricordarsi.

**Senza account collegato la targhetta non c'è**, e la spia resta a «Sono nel
pollaio». Lo stato della diretta si sa solo chiedendolo a Helix, e leggere la
chat senza account resta la promessa del §1: meglio non dire niente che dire
«OFFLINE» a un canale che sta trasmettendo.

## 20. Il bordo che ridimensiona — la finestra senza cornice

La finestra di `Pollaio.exe` si ridimensiona tirandone i bordi, come qualunque
altra finestra. Il gesto è quello di sempre; quello che non è di sempre è **chi
lo riconosce**.

### Perché `WS_THICKFRAME` da solo non basta

La `Vetrina` è una finestra **senza area non-client**: `FormBorderStyle.None`,
`WS_THICKFRAME` rimesso a mano nei `CreateParams`, e `WM_NCCALCSIZE` che ritorna
zero per mangiarsi la cornice. Sopra al client c'è la WebView2 in `Dock = Fill`,
che lo copre tutto.

Le maniglie di ridimensionamento di Windows **stanno nell'area non-client**, e
qui l'area non-client non esiste: il frame non vede mai il mouse. **Lo stile da
solo quindi non basta.** Serve lo stesso — senza `WS_THICKFRAME` la finestra non
è ridimensionabile e il gesto qui sotto non avrebbe effetto — ma non è lui a far
partire niente.

Quindi **il bordo lo riconosce la pagina**, ed è la stessa strada già presa per
lo spostamento: la pagina guarda il puntatore, il launcher esegue il gesto.

### Le otto zone

`app/js/menu.js` guarda il puntatore su `mousemove`: entro **6 px** (`MARGINE`)
da un lato, **16 px** (`ANGOLO`) per gli angoli, e scrive su `<html>`
l'attributo `data-bordo`. `app/css/pollaio.css`, in fondo, ci attacca il
puntatore giusto.

| zona | `data-bordo` | codice di Windows | puntatore |
|---|---|---|---|
| alto | `n` | `HTTOP` | `ns-resize` |
| basso | `s` | `HTBOTTOM` | `ns-resize` |
| destra | `e` | `HTRIGHT` | `ew-resize` |
| sinistra | `o` | `HTLEFT` | `ew-resize` |
| alto a sinistra | `no` | `HTTOPLEFT` | `nwse-resize` |
| alto a destra | `ne` | `HTTOPRIGHT` | `nesw-resize` |
| basso a sinistra | `so` | `HTBOTTOMLEFT` | `nesw-resize` |
| basso a destra | `se` | `HTBOTTOMRIGHT` | `nwse-resize` |

Le sigle sono i punti cardinali in italiano: `o` è ovest, `no` è nord-ovest.

Tre regole di contorno, e tutte e tre hanno un motivo:

- sotto i `3 × ANGOLO` di lato **non c'è nessuna zona**: in una finestra così
  piccola le fasce si toccherebbero e non resterebbe un punto da cui trascinare;
- il bordo è spento mentre il menu del tasto destro è aperto: là si sceglie una
  voce, non si tira un lato;
- si spegne su `mouseleave` e sul `blur` della finestra, perché un puntatore di
  ridimensionamento acceso su una finestra che non ha il fuoco promette una cosa
  che al clic non succede.

Il puntatore si mette **sulla radice**, e `html[data-bordo]` rimette a
`cursor: inherit` `body`, `.pollaio` e i suoi discendenti, `:active` e barra
compresi. È così che si scavalca il `grab` di `html[data-finestra]` **per
ereditarietà invece che con un `!important`** (§1.6).

### Il gesto lo finisce Windows

Al `mousedown`, se una zona è accesa, la pagina manda
`pollaio:ridimensiona:<zona>` **invece** di `pollaio:trascina`. Sul bordo si
ridimensiona, dentro si trascina, mai tutti e due. In coda al comando va il
contatore che `Menu.comanda` aggiunge a tutti: serve al canale del titolo, dove
due comandi uguali di fila non si distinguerebbero.

Il launcher traduce la sigla in un codice `HT*` (`Vetrina.ZonaDiBordo`) e
risponde col gesto standard di Windows:

```cs
Nativo.ReleaseCapture();
Nativo.SendMessageW(Handle, Nativo.WM_NCLBUTTONDOWN, zona, IntPtr.Zero);
```

**Da lì in poi ridimensiona Windows, non noi**: anteprima dal vivo, aggancio ai
bordi dello schermo, Esc che annulla — tutto gratis, e nessun ciclo di
trascinamento scritto a mano da mantenere e da sbagliare. Una sigla che non è
fra le otto non fa niente; con la finestra non in stato `Normal` il comando si
ignora.

### Il minimo è 160 × 160

`MinimumSize` vale `160 × scala` per lato, cioè 160 logici. È **lo stesso minimo
che accettano la regia** (i campi `min="160"`, `MISURA_MIN` in `regia.js`), **il
comando `misura` e `avvio\pollaio.ini`**, dove `larghezza` e `altezza` si
ritagliano a 160–4000. Una finestra che si può stringere a una riga è una
finestra che non si riafferra più.

### La misura nuova viene ricordata

`Vetrina.WndProc` intercetta `WM_EXITSIZEMOVE` e chiama `RicordaMisura()`, che
riporta la misura da pixel fisici a logici dividendo per `scala`, la ritaglia a
160–4000 e la scrive in `avvio\pollaio.ini`:

| finestra | righe scritte |
|---|---|
| la chat | `larghezza`, `altezza` |
| la regia | `regialarghezza`, `regiaaltezza` |

Per la chat **sono esattamente le righe che scrive il bottone «Salva la misura»
della regia** (il comando `misura`): la misura della finestra ha **una sorgente
di verità sola**, e i due modi di cambiarla ci scrivono dentro insieme invece di
litigare. Le due righe della regia, invece, non le tocca nessun bottone: le
scrive solo questo.

Se la finestra non è in stato `Normal` non si scrive niente: la misura di una
finestra ridotta a icona non è la misura che si vuole ritrovare al prossimo
avvio.

### Solo la finestra della chat

Nella regia il riconoscimento del bordo è spento (`dentroLaRegia()` in
`menu.js`). **La regia è una pagina che scorre, e il suo bordo destro è dove sta
la barra di scorrimento**: una striscia di sei pixel che ridimensiona la finestra
invece di far scorrere la pagina è un guasto peggiore della funzione che
aggiunge. Là la misura resta quella dei campi numerici, che è anche il posto dove
la si salva.

### Due cose da sapere, per chi ci mette mano

**`WM_EXITSIZEMOVE` arriva anche alla fine di uno spostamento**, non solo di un
ridimensionamento: `RicordaMisura()` gira anche quando la finestra è stata solo
trascinata, e riscrive gli stessi numeri. Va bene così — costa la scrittura di un
file di poche righe e toglie un ramo condizionale che prima o poi si
sbaglierebbe. Nella regia, dove il bordo è spento, è l'unico momento in cui
`regialarghezza` e `regiaaltezza` si riscrivono.

**Nel ripiego senza WebView2 il bordo non si accende affatto.** Quando WebView2
manca, il launcher apre la pagina in Chrome o Edge con `--app`, le toglie la
cornice (`Cornice.Togli`, che fra gli altri **leva proprio `WS_THICKFRAME`**) e
riceve i comandi leggendo il titolo della finestra (`Ponte`). `Ponte` non ha il
ramo `ridimensiona`, e quella finestra non ha più lo stile che servirebbe.

Per questo `guardaIlBordo` parte da `dentroLaVetrina()`: senza
`chrome.webview.postMessage` non scrive `data-bordo`, il puntatore resta quello
di prima e i sei pixel del perimetro tornano al trascinamento. **Una funzione
che non può funzionare non deve nemmeno farsi vedere**: un puntatore che promette
un ridimensionamento e poi non fa niente — e che per giunta si mangia anche il
trascinamento, perché il ramo del bordo esce prima di `trascina` — è peggio della
funzione mancante, che almeno non mente.
