/* =============================================================================
   youtube.js — «il pollaio» · la chat di una diretta YouTube

   POSSIEDE: window.Youtube, cioè la risoluzione della diretta in una chat, il
   giro di letture e la consegna dei messaggi grezzi dell'API. Finisce lì.

   NON POSSIEDE: la traduzione nel «messaggio» del §5, che sta in pollaio.js
   come per irc.js e kick.js. Qui dentro non si sa cosa siano le emote, i
   badge o il rilievo.

   PERCHÉ SERVE UNA CHIAVE, E PERCHÉ NON SI PUÒ FARE DIVERSAMENTE
   Twitch ha una chat anonima, Kick ha un canale Pusher pubblico. YouTube non
   ha niente del genere. L'unica via da una pagina aperta dal disco è l'API
   ufficiale con una chiave che l'utente si crea da sé. La strada non
   ufficiale — l'endpoint interno che usa la pagina live_chat di YouTube — è
   chiusa dal browser, non dal server: non manda nessuna intestazione CORS,
   quindi la risposta arriva e il browser si rifiuta di consegnarla. Le
   librerie che ci riescono girano fuori dal browser, dove quella regola non
   esiste. Non è portabile qui, e non è una questione di impegno.

   QUATTRO COSE DA SAPERE, tutte verificate e non dedotte:

   1. LA SOLA CHIAVE BASTA. `liveChatMessages.list` non chiede nessuno scope
      OAuth: leggere la chat di una diretta pubblica è leggere un dato
      pubblico. Serve OAuth solo per scrivere, moderare, o per leggere le
      PROPRIE dirette da `liveBroadcasts.list` — ed è la trappola in cui
      cascano quasi tutte le guide in giro, che partono da lì e quindi
      funzionano solo sul proprio canale.
   2. IL CORS DA `file://` FUNZIONA. Google riflette l'Origin che riceve, e
      con `Origin: null` risponde `null`, che è esattamente ciò che il
      browser pretende per una pagina aperta dal disco. La chiave va in
      querystring apposta: così la richiesta resta «semplice» e si risparmia
      il giro di preflight.
   3. LA QUOTA È IL VERO LIMITE, non l'autenticazione. Sono 10.000 unità al
      giorno e Google NON pubblica quanto costi una lettura della chat — la
      voce manca dalla tabella dei costi da sempre. Se costasse 5 unità, a
      una lettura ogni 5 secondi si copre meno di tre ore di diretta. Per
      questo qui c'è un pavimento all'attesa (ATTESA_MINIMA) oltre a quella
      chiesta dal server: raddoppiare l'attesa raddoppia le ore coperte, ed è
      l'unica leva che abbiamo.
   4. NON ESISTONO LE ISCRIZIONI. L'API non espone chi si iscrive
      gratuitamente al canale: non c'è proprio un evento. Ci sono solo le
      membership a pagamento (`newSponsorEvent` e parenti). Un overlay che
      promettesse «nuovo iscritto» starebbe mentendo.

   COME OGNI SORGENTE IN PIÙ: se qualcosa non va, si perde YouTube e basta
   (§1.9). La chat di Twitch non se ne accorge.

   INDICE
     1. Costanti e stato
     2. Gli osservatori dello stato
     3. La chiamata, con il tetto di tempo
     4. Dalla diretta alla chat
     5. Il giro delle letture
     6. API pubblica
   ============================================================================= */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. Costanti e stato
     ------------------------------------------------------------------ */

  var API = 'https://www.googleapis.com/youtube/v3/';

  var TEMPO_MAX = 10000;

  /* Il pavimento dell'attesa fra due letture. Il server ne chiede una sua
     (`pollingIntervalMillis`) e la si rispetta sempre, ma mai scendendo sotto
     questa: la quota giornaliera è il collo di bottiglia, e cinque secondi di
     ritardo su un messaggio non li nota nessuno mentre un overlay muto alle
     tre del pomeriggio lo notano tutti. */
  var ATTESA_MINIMA = 5000;

  /* Quando la risposta non arriva: si allunga, senza arrendersi subito. Una
     diretta dura ore e la rete di casa fa quello che vuole. */
  var ATTESA_ERRORE = 15000;
  var ERRORI_MAX = 6;

  /* Undici caratteri di quell'alfabeto: è la forma di un id di video. La
     regola è ancorata apposta — senza ancore troverebbe undici caratteri
     buoni dentro qualunque stringa lunga e restituirebbe un pezzo a caso. */
  var SOLO_ID = /^[A-Za-z0-9_-]{11}$/;

  var vivo = {
    acceso: false,
    video: '',
    chiave: '',
    chat: '',
    stato: 'spenta'   /* 'spenta' | 'collego' | 'accesa' | 'riprovo' */
  };

  var giro = { timer: null, pagina: '', errori: 0, primoGiro: true };

  var consegna = null;
  var osservatori = [];


  /* ------------------------------------------------------------------
     2. Gli osservatori dello stato
     ------------------------------------------------------------------ */

  function avvisaUno(fn, stato) {
    try { fn(stato); } catch (err) { /* un osservatore rotto non ferma niente */ }
  }

  function cambiaStato(nuovo) {
    if (vivo.stato === nuovo) { return; }
    vivo.stato = nuovo;
    for (var i = 0; i < osservatori.length; i++) { avvisaUno(osservatori[i], nuovo); }
  }

  function avviso(testo) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[pollaio] youtube: ' + testo);
    }
  }


  /* ------------------------------------------------------------------
     3. La chiamata, con il tetto di tempo
     ------------------------------------------------------------------
     Risolve SEMPRE, con l'oggetto oppure con null. Nessun reject: chi
     chiama non deve avere un catch per far vivere la chat.

     La chiave viaggia in querystring e non in un'intestazione: così la
     richiesta resta «semplice» per il browser e non parte il preflight.
     L'intestazione `x-goog-api-key` funzionerebbe, ma costerebbe un giro
     in più a ogni lettura per un guadagno che qui non c'è — da una
     pagina aperta dal disco la chiave è comunque in chiaro nel link.
     ------------------------------------------------------------------ */

  function chiedi(percorso, parametri) {
    return new Promise(function (risolvi) {
      var chiuso = false;
      var controllo = (typeof AbortController === 'function') ? new AbortController() : null;

      var pezzi = [];
      var chiave;
      for (chiave in parametri) {
        if (Object.prototype.hasOwnProperty.call(parametri, chiave) && parametri[chiave]) {
          pezzi.push(encodeURIComponent(chiave) + '=' + encodeURIComponent(parametri[chiave]));
        }
      }

      var scadenza = setTimeout(function () {
        chiuso = true;
        if (controllo) { try { controllo.abort(); } catch (err) { /* pazienza */ } }
        risolvi(null);
      }, TEMPO_MAX);

      fetch(API + percorso + '?' + pezzi.join('&'), controllo ? { signal: controllo.signal } : undefined)
        .then(function (risposta) {
          return risposta.json().then(function (dati) {
            return { ok: risposta.ok, stato: risposta.status, dati: dati };
          });
        })
        .then(function (esito) {
          clearTimeout(scadenza);
          if (chiuso) { return; }

          if (!esito.ok) {
            /* Le risposte di errore di Google portano anch'esse le
               intestazioni CORS, quindi il motivo si può LEGGERE invece di
               ritrovarsi un opaco «Failed to fetch». È la differenza fra
               capire in trenta secondi che la chiave è sbagliata e passarci
               una serata. */
            var motivo = (esito.dati && esito.dati.error && esito.dati.error.message) || ('HTTP ' + esito.stato);
            risolvi({ errore: true, stato: esito.stato, motivo: motivo });
            return;
          }

          risolvi(esito.dati);
        }, function () {
          clearTimeout(scadenza);
          if (!chiuso) { risolvi(null); }
        });
    });
  }


  /* ------------------------------------------------------------------
     4. Dalla diretta alla chat
     ------------------------------------------------------------------
     Si parte dall'id del video, non dal canale. È una scelta, e ha una
     ragione di quota: risalire dal nome del canale al video in onda
     vorrebbe dire passare da `search.list`, che ha un tetto SEPARATO di
     cento chiamate al giorno. Una manciata di riavvii dell'overlay e la
     giornata è finita, senza che nessuno capisca perché.

     Con l'id del video si spende una unità sola, una volta.
     ------------------------------------------------------------------ */

  function trovaChat() {
    return chiedi('videos', {
      part: 'liveStreamingDetails',
      id: vivo.video,
      key: vivo.chiave
    }).then(function (dati) {
      if (!dati) { return ''; }

      if (dati.errore) {
        avviso('non riesco a leggere la diretta: ' + dati.motivo);
        return '';
      }

      var voci = dati.items || [];
      if (!voci.length) { return ''; }

      var dettagli = voci[0].liveStreamingDetails || {};

      /* Il campo NON è null quando il video non è in diretta: manca proprio.
         Quindi «non c'è» qui vuol dire una cosa sola — questo video non è una
         diretta accesa con la chat aperta. */
      return dettagli.activeLiveChatId || '';
    });
  }


  /* ------------------------------------------------------------------
     5. Il giro delle letture
     ------------------------------------------------------------------ */

  function programma(attesa) {
    clearTimeout(giro.timer);
    if (!vivo.acceso) { return; }
    giro.timer = setTimeout(leggi, Math.max(ATTESA_MINIMA, attesa || 0));
  }

  function leggi() {
    if (!vivo.acceso || !vivo.chat) { return; }

    chiedi('liveChat/messages', {
      liveChatId: vivo.chat,
      part: 'snippet,authorDetails',
      pageToken: giro.pagina,
      key: vivo.chiave
    }).then(function (dati) {
      if (!vivo.acceso) { return; }

      if (!dati) {
        giro.errori++;
        if (giro.errori >= ERRORI_MAX) {
          avviso('la chat non risponde da un po\', smetto di chiedere');
          ferma();
          return;
        }
        cambiaStato('riprovo');
        programma(ATTESA_ERRORE);
        return;
      }

      if (dati.errore) {
        /* 403 con la chat finita non è un guasto: è una diretta che è
           terminata. Ci si ferma e basta, senza scrivere niente di allarmante
           in un log che qualcuno leggerà pensando che il widget sia rotto. */
        if (dati.stato === 403 || dati.stato === 404) {
          avviso('la chat non è più leggibile (' + dati.motivo + ')');
          ferma();
          return;
        }

        giro.errori++;
        cambiaStato('riprovo');
        programma(ATTESA_ERRORE);
        return;
      }

      giro.errori = 0;
      cambiaStato('accesa');
      giro.pagina = dati.nextPageToken || '';

      /* LA PRIMA LETTURA SI BUTTA. Senza `pageToken` l'API consegna gli
         ultimi messaggi già scritti: senza questo salto, all'avvio
         dell'overlay comparirebbero di colpo venti messaggi vecchi di
         mezz'ora, tutti insieme, come se fossero appena arrivati. In OBS,
         all'accensione della scena, è esattamente lo sfarfallio che non si
         vuole. */
      if (giro.primoGiro) {
        giro.primoGiro = false;
      } else {
        var voci = dati.items || [];
        for (var i = 0; i < voci.length; i++) {
          if (typeof consegna === 'function') {
            try { consegna(voci[i]); }
            catch (err) { avviso('l\'ascoltatore è saltato su un messaggio: ' + err); }
          }
        }
      }

      /* `offlineAt` compare solo quando la diretta è finita: è il segnale di
         chiusura pulito, e vale più di qualunque tentativo di indovinarlo. */
      if (dati.offlineAt) {
        ferma();
        return;
      }

      programma(dati.pollingIntervalMillis);
    });
  }


  /* ------------------------------------------------------------------
     6. API pubblica
     ------------------------------------------------------------------ */

  function ferma() {
    vivo.acceso = false;
    clearTimeout(giro.timer);
    giro.timer = null;
    giro.pagina = '';
    giro.errori = 0;
    giro.primoGiro = true;
    cambiaStato('spenta');
  }

  /* L'id di una diretta sta in tre posti diversi a seconda di dove si copia
     l'indirizzo — `watch?v=ID`, `youtu.be/ID`, `live/ID` — e chi incolla non
     deve saperlo. Si accetta anche l'id nudo.

     Questa pulizia sta QUI e non nello schema delle impostazioni per una
     ragione precisa: `ripulisciTesto` mette in minuscolo tutto ciò che ha un
     `modello`, e un id di video distingue maiuscole e minuscole. Passandoci
     `dQw4w9WgXcQ` ne uscirebbe `dqw4w9wgxcq`, che è un video diverso o
     nessuno — e il guasto sarebbe muto. */
  function idVideo(grezzo) {
    var testo = String(grezzo || '').trim();
    if (!testo) { return ''; }

    var v = /[?&]v=([A-Za-z0-9_-]{11})/.exec(testo);
    if (v) { return v[1]; }

    if (testo.indexOf('/') !== -1) {
      var pezzi = testo.split('?')[0].split('/');
      for (var i = pezzi.length - 1; i >= 0; i--) {
        if (SOLO_ID.test(pezzi[i])) { return pezzi[i]; }
      }
      return '';
    }

    return SOLO_ID.test(testo) ? testo : '';
  }

  /* opzioni = { video: 'ID o indirizzo', chiave: 'API KEY', su: function (voce) {} } */
  function avvia(opzioni) {
    var opz = opzioni || {};
    if (typeof opz.su !== 'function') { return; }

    var video = idVideo(opz.video);
    var chiave = String(opz.chiave || '').trim();
    if (!video || !chiave) { return; }

    ferma();
    consegna = opz.su;
    vivo.acceso = true;
    vivo.video = video;
    vivo.chiave = chiave;
    cambiaStato('collego');

    trovaChat().then(function (chat) {
      if (!vivo.acceso) { return; }

      if (!chat) {
        /* Non si riprova all'infinito: se il video non è in diretta, o la
           chiave è sbagliata, insistere ogni quindici secondi per otto ore
           brucia quota e non cambia niente. */
        avviso('nessuna chat aperta su questo video: controlla l\'id, la chiave, ' +
          'e che la diretta sia davvero in onda');
        ferma();
        return;
      }

      vivo.chat = chat;
      leggi();
    });
  }

  window.Youtube = {
    avvia: avvia,
    ferma: ferma,

    /* Esposta per il banco di prova (prove.html), come analizza e disescapa
       di irc.js. È pura e la sbaglia chi la tocca senza pensarci: basta un
       toLowerCase di troppo per far puntare l'overlay a un video che non
       esiste, e il guasto è muto — nessun errore, solo una chat che non
       arriva mai. Chi legge la chat non la chiama. */
    idVideo: idVideo,

    stato: function () { return vivo.stato; },

    suStato: function (fn) {
      if (typeof fn !== 'function') { return; }
      osservatori.push(fn);
      avvisaUno(fn, vivo.stato);
    }
  };

}());
