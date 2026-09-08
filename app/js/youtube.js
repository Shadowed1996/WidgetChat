(function () {
  'use strict';

  var API = 'https://www.googleapis.com/youtube/v3/';

  var TEMPO_MAX = 10000;

  var ATTESA_MINIMA = 5000;

  var ATTESA_ERRORE = 15000;
  var ERRORI_MAX = 6;

  var SOLO_ID = /^[A-Za-z0-9_-]{11}$/;

  var vivo = {
    acceso: false,
    video: '',
    chiave: '',
    chat: '',
    stato: 'spenta'
  };

  var giro = { timer: null, pagina: '', errori: 0, primoGiro: true };

  var consegna = null;
  var osservatori = [];

  function avvisaUno(fn, stato) {
    try { fn(stato); } catch (err) {  }
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
        if (controllo) { try { controllo.abort(); } catch (err) {  } }
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

      return dettagli.activeLiveChatId || '';
    });
  }

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

      if (dati.offlineAt) {
        ferma();
        return;
      }

      programma(dati.pollingIntervalMillis);
    });
  }

  function ferma() {
    vivo.acceso = false;
    clearTimeout(giro.timer);
    giro.timer = null;
    giro.pagina = '';
    giro.errori = 0;
    giro.primoGiro = true;
    cambiaStato('spenta');
  }

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

    idVideo: idVideo,

    stato: function () { return vivo.stato; },

    suStato: function (fn) {
      if (typeof fn !== 'function') { return; }
      osservatori.push(fn);
      avvisaUno(fn, vivo.stato);
    }
  };

}());
