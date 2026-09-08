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
   librerie. Solo HTML, CSS e JavaScript scritti a mano. L'unica cosa che si
   scarica dalla rete sono i **font Google** e le **immagini di emote e badge**.
2. **Deve funzionare da `file://`.** OBS punta al file locale sul disco. Niente
   `type="module"` (i moduli ES sono bloccati da `file://` per via della CORS),
   niente `fetch` di file locali, niente percorsi assoluti. Solo `<script src>`
   classici e percorsi relativi.
3. **Sola lettura.** Connessione anonima a IRC (`justinfan`). Nessun token,
   nessun login, nessun segreto dentro il file. Il widget non può scrivere in
   chat e non può essere bannato.
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
   │  └─ prove.css      ← il banco di prova
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
   │  ├─ resa.js          window.Resa          — dal messaggio al DOM
   │  ├─ prova.js         window.Prova         — traffico finto per sistemare in OBS
   │  ├─ menu.js          window.Menu          — il tasto destro nella finestra del launcher
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
<script src="js/emote.js"></script>
<script src="js/badge.js"></script>
<script src="js/rilievo.js"></script>
<script src="js/eventi.js"></script>
<script src="js/treno.js"></script>
<script src="js/resa.js"></script>
<script src="js/prova.js"></script>
<script src="js/menu.js"></script>
<script src="js/pollaio.js"></script>
```

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
  piattaforma: 'twitch'  // da quale chat arriva: 'twitch'|'youtube'|'kick'|'tiktok' (§17)
}
```

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
| `moderazione` | voce | `sbarra` | cosa fare a un messaggio cancellato: `sbarra` · `togli` · `tieni` |
| `pollo` | sìno | `0` | mostra la mascotte accanto alla chat |
| `prova` | sìno | `0` | modalità prova: traffico finto, per sistemare l'inquadratura in OBS |
| `ostile` | sìno | `0` | vale solo con `prova=1`: mescola al traffico finto i casi cattivi — zalgo, scavalchi RTL, nick lunghissimi, muri di testo |

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

## 7. Le sorgenti in rete — tutte verificate, tutte senza autenticazione

| cosa | indirizzo | note |
|---|---|---|
| chat | `wss://irc-ws.chat.twitch.tv:443` | anonima: `NICK justinfan<10000-90000>` |
| emote Twitch | `https://static-cdn.jtvnw.net/emoticons/v2/<id>/default/dark/2.0` (e `3.0`) | l'id arriva dal tag `emotes` |
| cheermote | `https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/animated/<livello>/2.gif` | livelli: 1, 100, 1000, 5000, 10000, 100000 |
| badge globali | `https://api.ivr.fi/v2/twitch/badges/global` | l'endpoint storico `badges.twitch.tv` è morto |
| badge di canale | `https://api.ivr.fi/v2/twitch/badges/channel?login=<canale>` | |
| 7TV globali | `https://7tv.io/v3/emote-sets/global` | |
| 7TV del canale | `https://7tv.io/v3/users/twitch/<id>` | slayer_beard ce le ha |
| BTTV globali | `https://api.betterttv.net/3/cached/emotes/global` | |
| BTTV del canale | `https://api.betterttv.net/3/cached/users/twitch/<id>` | oggi risponde con le liste vuote: è normale |
| FFZ globali | `https://api.frankerfacez.com/v1/set/global` | |
| FFZ del canale | `https://api.frankerfacez.com/v1/room/<canale>` | oggi risponde **404**: è normale, si tace |

**Regola**: ogni chiamata ha un tetto di tempo, e il fallimento è silenzioso.
Niente `console.error` che intasa il log di OBS: al massimo un `console.warn` col
prefisso `[pollaio]`.

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
- focus visibile `2px solid var(--ciano)` con `outline-offset: 3px`
- `prefers-reduced-motion: reduce` spegne **tutte** le animazioni, e ogni foglio
  spegne a mano le proprie `@keyframes` in un paragrafo finale dedicato
- l'elenco dei messaggi **non** ha `aria-live`: sarebbe uno sproloquio continuo
- le emote hanno `alt` col loro nome; i badge hanno `alt=""` e il titolo va su
  `title`, perché il nome della persona basta già a identificarla

## 13. La modalità prova

`?prova=1` non si collega a niente e genera traffico finto: nomi, colori, badge,
emote vere prese dai provider, un abbonamento ogni tanto, un raid, dei bits, un
messaggio in evidenza, un ban. Serve a inquadrare il widget in OBS quando il
canale è spento, che è **sempre** il momento in cui si sistema un overlay.

Deve essere ovvio che è una prova: una spia in alto che dice `PROVA`, che non si
confonde con la chat vera.

## 14. Il configuratore — `regia.html`

Una pagina sola, con la grafica del sito (questa **non** è trasparente: è
un'interfaccia, si guarda in un browser).

- a sinistra i comandi, uno per ogni voce di `Impostazioni.SCHEMA`
- a destra l'anteprima dal vivo dentro un `<iframe>` che punta a `pollaio.html`
  con i parametri correnti, su uno sfondo a scacchi che rende evidente la
  trasparenza
- in basso l'indirizzo completo, in monospazio, con un bottone **Copia**
- le scelte si ricordano in `localStorage` (`sb-pollaio-regia`)
- un bottone **Ripristina** che rimette tutto ai predefiniti

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
ma pretende un token OAuth del proprietario del canale.

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
`Rilievo.valuta`.

**Non si prova la rete, il DOM, il tempo.** Non perché non contino: perché un
banco che simula una risposta di 7TV verifica il simulatore. `prove.html` non
carica `resa.js` (vuole il DOM montato), `treno.js` (apre una connessione
appena parte), `prova.js` e `pollaio.js` (mettono in moto il widget vero), e
nessun caso chiama `carica()`. Il banco deve poter dire verde col cavo
staccato, o nei giorni in cui 7TV è giù direbbe rosso e lo si smetterebbe di
guardare.

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

### Cosa si può collegare davvero

Il vincolo §1.1 (zero dipendenze, tutto da `file://`, nessun token) non tratta
le piattaforme allo stesso modo, e va detto invece che scoprirlo dopo:

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
