/* =============================================================================
   kick.js — «il pollaio» · la chat di Kick

   POSSIEDE: window.Kick, cioè la connessione alla chat di un canale Kick e la
   lettura del suo protocollo. Consegna a chi l'ha avviato l'oggetto già
   estratto dalla busta di Pusher, e finisce lì.

   NON POSSIEDE: la traduzione nel «messaggio» del §5, che sta in pollaio.js
   come per irc.js. Non sa cosa siano le emote, i badge, il rilievo. È la
   stessa ignoranza che rende irc.js provabile da solo, e vale qui per lo
   stesso motivo.

   PERCHÉ ESISTE, E COME FUNZIONA
   Kick non ha un IRC. La sua chat passa da Pusher, un servizio di WebSocket
   generico, su un canale pubblico: ci si iscrive senza autenticazione, senza
   token, senza firma. È l'unica delle tre piattaforme oltre a Twitch che si
   possa leggere da una pagina aperta dal disco, e per un motivo preciso —
   l'app key di Pusher è dentro il JavaScript del sito di Kick, quindi è
   pubblica per costruzione.

   TRE TRAPPOLE, tutte trovate provandolo e non leggendolo:

   1. `data` DENTRO LA BUSTA È UNA STRINGA, non un oggetto. Serve un secondo
      JSON.parse. È l'errore di implementazione più comune con Pusher.
   2. LO SCHEMA È `.v2`. In giro si trovano ancora esempi con `chatrooms.<id>`
      senza suffisso ed evento `ChatMessageSentEvent`: è la versione vecchia,
      non arriva più niente.
   3. L'APP KEY CHE CIRCOLA NEI REPOSITORY VECCHI È MORTA. Kick l'ha già
      ruotata una volta. Se un giorno arriva un `pusher:error` con codice
      4001, è successo di nuovo: la chiave qui sotto va aggiornata leggendola
      dal sito di Kick.

   NIENTE DI QUI DENTRO PUÒ PORTARSI VIA IL WIDGET (§1.9). Kick è una sorgente
   in più: se il canale non esiste, se la rete cade, se Pusher cambia idea, si
   perde la chat di Kick e la chat di Twitch continua come se niente fosse.

   INDICE
     1. Costanti e stato
     2. Gli osservatori dello stato
     3. Lo slug diventa un id di chatroom
     4. La connessione e il protocollo Pusher
     5. La riconnessione
     6. API pubblica
   ============================================================================= */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. Costanti e stato
     ------------------------------------------------------------------ */

  /* L'app key pubblica di Kick, presa dal suo bundle JavaScript. `us2` sta
     già dentro il nome dell'host, quindi non serve il parametro `cluster`.
     `protocol=7` invece conta: decide la forma di connection_established.
     `client` e `version` sono cosmetici e il server non li guarda. */
  var PUSHER =
    'wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679' +
    '?protocol=7&client=js&version=8.4.0-rc2&flash=false';

  var API_CANALE = 'https://kick.com/api/v2/channels/';

  /* Nel JSON la barra è raddoppiata; qui, in una stringa JavaScript, la
     sequenza `\\` vale una barra sola — quindi questo confronto è esatto. */
  var EVENTO_CHAT = 'App\\Events\\ChatMessageEvent';

  var TEMPO_MAX = 8000;        /* tetto per la chiamata che risolve lo slug */

  /* Pusher dichiara un activity_timeout di 120 secondi. Si tiene un margine e
     si manda un ping proprio quando il silenzio dura di più: serve sui canali
     deserti, dove nessun messaggio tiene viva la connessione. */
  var SILENZIO_MAX = 130000;

  var ATTESA_BASE = 1000;
  var ATTESA_MASSIMA = 60000;  /* il tetto fra due tentativi: si riprova sempre */
  var SCARTO = 0.2;            /* ±20%, per non ripartire tutti insieme */

  var vivo = {
    acceso: false,
    slug: '',
    chatroom: '',
    stato: 'spenta'   /* 'spenta' | 'collego' | 'accesa' | 'riprovo' */
  };

  var presa = {
    socket: null,
    tentativi: 0,
    ultimoSegnale: 0
  };

  var timer = { riprova: null, guardia: null };

  var consegna = null;
  var osservatori = [];


  /* ------------------------------------------------------------------
     2. Gli osservatori dello stato
     ------------------------------------------------------------------ */

  function avvisaUno(fn, stato) {
    try { fn(stato); } catch (err) { /* un osservatore rotto non ferma la chat */ }
  }

  function cambiaStato(nuovo) {
    if (vivo.stato === nuovo) { return; }
    vivo.stato = nuovo;
    for (var i = 0; i < osservatori.length; i++) { avvisaUno(osservatori[i], nuovo); }
  }

  function avviso(testo) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[pollaio] kick: ' + testo);
    }
  }


  /* ------------------------------------------------------------------
     3. Lo slug diventa un id di chatroom
     ------------------------------------------------------------------
     Si chiede a kick.com/api/v2/channels/<slug> e si legge `chatroom.id`.

     PERCHÉ FUNZIONA DA file://, che è la cosa che sorprende. In giro si
     legge che questo endpoint è bloccato da Cloudflare: è vero per i
     client da riga di comando, che vengono riconosciuti dall'impronta
     TLS. Un browser vero non ha quel problema, e Kick RIFLETTE l'Origin
     che riceve — compreso `null`, che è l'origine di una pagina aperta
     dal disco. Provato: risponde 200 con
     `access-control-allow-origin: null`.

     LA RICHIESTA DEVE RESTARE SEMPLICE: nessuna intestazione aggiunta,
     nessun `credentials`. Bastherebbe un header di troppo per far
     scattare la richiesta di preflight, e a quella Cloudflare potrebbe
     rispondere in tutt'altro modo.

     `chatroom.id` e NON `id`: su molti canali storici coincidono, su
     altri no. Prendere quello sbagliato porta a iscriversi a un canale
     Pusher che esiste e tace per sempre — il guasto peggiore, perché
     sembra che vada tutto bene.
     ------------------------------------------------------------------ */

  function risolviChatroom(slug) {
    return new Promise(function (risolvi) {
      var chiuso = false;
      var controllo = (typeof AbortController === 'function') ? new AbortController() : null;

      var scadenza = setTimeout(function () {
        chiuso = true;
        if (controllo) { try { controllo.abort(); } catch (err) { /* pazienza */ } }
        risolvi('');
      }, TEMPO_MAX);

      fetch(API_CANALE + encodeURIComponent(slug), controllo ? { signal: controllo.signal } : undefined)
        .then(function (risposta) {
          if (!risposta.ok) { throw new Error('HTTP ' + risposta.status); }
          return risposta.json();
        })
        .then(function (dati) {
          clearTimeout(scadenza);
          if (chiuso) { return; }

          var stanza = dati && dati.chatroom;
          var id = stanza && stanza.id;
          risolvi(id ? String(id) : '');
        }, function () {
          clearTimeout(scadenza);
          if (!chiuso) { risolvi(''); }
        });
    });
  }


  /* ------------------------------------------------------------------
     4. La connessione e il protocollo Pusher
     ------------------------------------------------------------------ */

  function manda(oggetto) {
    if (!presa.socket || presa.socket.readyState !== 1) { return; }
    try { presa.socket.send(JSON.stringify(oggetto)); }
    catch (err) { /* la chiusura arriverà da sola */ }
  }

  function iscrivi() {
    /* Canale pubblico: `auth` vuoto, nessuna firma. È tutta la ragione per
       cui Kick si può leggere da qui e TikTok no. */
    manda({
      event: 'pusher:subscribe',
      data: { auth: '', channel: 'chatrooms.' + vivo.chatroom + '.v2' }
    });
  }

  function suBusta(testo) {
    presa.ultimoSegnale = Date.now();

    var busta;
    try { busta = JSON.parse(testo); }
    catch (err) { return; }
    if (!busta || !busta.event) { return; }

    if (busta.event === 'pusher:ping') {
      manda({ event: 'pusher:pong', data: {} });
      return;
    }

    if (busta.event === 'pusher:connection_established') {
      presa.tentativi = 0;
      iscrivi();
      return;
    }

    if (busta.event === 'pusher_internal:subscription_succeeded') {
      cambiaStato('accesa');
      return;
    }

    if (busta.event === 'pusher:error') {
      /* 4001 vuol dire che l'app key non vale più: Kick l'ha ruotata. Non
         serve riprovare all'infinito una chiave morta, ma nemmeno spegnere
         il widget: si dice e si smette con Kick. */
      var codice = (busta.data && busta.data.code) || 0;
      avviso('Pusher ha risposto con l\'errore ' + codice +
        (codice === 4001 ? ' (l\'app key non vale più: va riletta dal sito di Kick)' : ''));
      if (codice === 4001) { ferma(); }
      return;
    }

    if (busta.event !== EVENTO_CHAT) { return; }

    /* LA SECONDA APERTURA. `data` è una STRINGA JSON dentro la busta, non un
       oggetto: senza questo secondo parse si consegnerebbe a pollaio.js una
       stringa dove si aspetta un oggetto, e non arriverebbe mai niente in
       pagina senza che nessuno sappia perché. */
    var dato;
    try { dato = JSON.parse(busta.data); }
    catch (err) { return; }
    if (!dato || typeof dato !== 'object') { return; }

    if (typeof consegna === 'function') {
      try { consegna(dato); }
      catch (err) { avviso('l\'ascoltatore è saltato su un messaggio: ' + err); }
    }
  }

  function apri() {
    if (!vivo.acceso || presa.socket || !vivo.chatroom) { return; }
    if (typeof WebSocket !== 'function') { return; }

    clearTimeout(timer.riprova);
    timer.riprova = null;

    var socket;
    try {
      socket = new WebSocket(PUSHER);
    } catch (err) {
      /* Alcune reti bloccano il wss e il costruttore lancia prima ancora di
         provare: non arriva nessun evento close a consolarci, quindi la
         riprova va chiamata a mano. */
      riprova();
      return;
    }

    presa.socket = socket;
    presa.ultimoSegnale = Date.now();
    cambiaStato(presa.tentativi ? 'riprovo' : 'collego');

    socket.onmessage = function (evento) { suBusta(evento.data); };

    socket.onclose = function () {
      presa.socket = null;
      riprova();
    };

    socket.onerror = function () {
      /* Non si fa niente: dopo un errore arriva sempre un close, ed è lì che
         si riprova. Facendolo in tutti e due i posti si aprirebbero due
         connessioni per una caduta sola. */
    };

    guardia();
  }

  /* Un canale deserto non manda niente per ore, e una connessione che tace
     non è distinguibile da una morta finché non si prova a usarla. Si manda
     un ping quando il silenzio supera l'activity_timeout dichiarato. */
  function guardia() {
    clearInterval(timer.guardia);
    timer.guardia = setInterval(function () {
      if (!presa.socket) { return; }
      if (Date.now() - presa.ultimoSegnale < SILENZIO_MAX) { return; }
      manda({ event: 'pusher:ping', data: {} });
      presa.ultimoSegnale = Date.now();
    }, 30000);
  }

  function chiudiPresa() {
    clearInterval(timer.guardia);
    timer.guardia = null;

    if (!presa.socket) { return; }
    var socket = presa.socket;
    presa.socket = null;

    socket.onmessage = null;
    socket.onclose = null;
    socket.onerror = null;
    try { socket.close(); } catch (err) { /* stava già andandosene */ }
  }


  /* ------------------------------------------------------------------
     5. La riconnessione
     ------------------------------------------------------------------
     Come irc.js: si riprova SEMPRE, aspettando sempre di più fino a un
     minuto. Uno scarto casuale evita che, dopo un disservizio di Pusher,
     tutti gli overlay del mondo tornino nello stesso istante.
     ------------------------------------------------------------------ */

  function riprova() {
    if (!vivo.acceso) { return; }

    cambiaStato('riprovo');
    presa.tentativi++;

    var attesa = Math.min(ATTESA_MASSIMA, ATTESA_BASE * Math.pow(2, presa.tentativi - 1));
    attesa = Math.round(attesa * (1 + (Math.random() * 2 - 1) * SCARTO));

    clearTimeout(timer.riprova);
    timer.riprova = setTimeout(apri, attesa);
  }


  /* ------------------------------------------------------------------
     6. API pubblica
     ------------------------------------------------------------------ */

  function ferma() {
    vivo.acceso = false;
    clearTimeout(timer.riprova);
    timer.riprova = null;
    chiudiPresa();
    presa.tentativi = 0;
    cambiaStato('spenta');
  }

  /* opzioni = { canale: 'slug', chatroom: '123', su: function (dato) {} }

     `chatroom` è facoltativo ed è la rete di sicurezza del §3: se un giorno
     Kick smettesse di riflettere l'Origin, l'utente può leggersi l'id
     aprendo l'indirizzo dell'API nel browser e incollarlo nella regia. In
     quel caso la chiamata di rete non si fa proprio. */
  function avvia(opzioni) {
    var opz = opzioni || {};

    if (typeof opz.su !== 'function') { return; }

    var slug = String(opz.canale || '').trim().toLowerCase();
    var stanza = String(opz.chatroom || '').replace(/[^0-9]/g, '');

    if (!slug && !stanza) { return; }

    ferma();
    consegna = opz.su;
    vivo.acceso = true;
    vivo.slug = slug;
    cambiaStato('collego');

    if (stanza) {
      vivo.chatroom = stanza;
      apri();
      return;
    }

    risolviChatroom(slug).then(function (id) {
      if (!vivo.acceso) { return; }

      if (!id) {
        /* Non si riprova a oltranza: se il canale non esiste, o Kick ha
           chiuso la porta, insistere ogni minuto per otto ore è bussare a
           casa d'altri per niente. Si dice e si sta zitti. */
        avviso('non sono riuscito a trovare la chatroom di «' + slug +
          '»: controlla il nome, oppure incolla l\'id a mano nella regia');
        ferma();
        return;
      }

      vivo.chatroom = id;
      apri();
    });
  }

  window.Kick = {
    avvia: avvia,
    ferma: ferma,

    stato: function () { return vivo.stato; },

    chatroom: function () { return vivo.chatroom; },

    suStato: function (fn) {
      if (typeof fn !== 'function') { return; }
      osservatori.push(fn);
      avvisaUno(fn, vivo.stato);
    }
  };

}());
