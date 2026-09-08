(function () {
  'use strict';

  var PUSHER =
    'wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679' +
    '?protocol=7&client=js&version=8.4.0-rc2&flash=false';

  var API_CANALE = 'https://kick.com/api/v2/channels/';

  var EVENTO_CHAT = 'App\\Events\\ChatMessageEvent';

  var TEMPO_MAX = 8000;

  var SILENZIO_MAX = 130000;

  var ATTESA_BASE = 1000;
  var ATTESA_MASSIMA = 60000;
  var SCARTO = 0.2;

  var vivo = {
    acceso: false,
    slug: '',
    chatroom: '',
    stato: 'spenta'
  };

  var presa = {
    socket: null,
    tentativi: 0,
    ultimoSegnale: 0
  };

  var timer = { riprova: null, guardia: null };

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
      console.warn('[pollaio] kick: ' + testo);
    }
  }

  function risolviChatroom(slug) {
    return new Promise(function (risolvi) {
      var chiuso = false;
      var controllo = (typeof AbortController === 'function') ? new AbortController() : null;

      var scadenza = setTimeout(function () {
        chiuso = true;
        if (controllo) { try { controllo.abort(); } catch (err) {  } }
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

  function manda(oggetto) {
    if (!presa.socket || presa.socket.readyState !== 1) { return; }
    try { presa.socket.send(JSON.stringify(oggetto)); }
    catch (err) {  }
  }

  function iscrivi() {

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

      var codice = (busta.data && busta.data.code) || 0;
      avviso('Pusher ha risposto con l\'errore ' + codice +
        (codice === 4001 ? ' (l\'app key non vale più: va riletta dal sito di Kick)' : ''));
      if (codice === 4001) { ferma(); }
      return;
    }

    if (busta.event !== EVENTO_CHAT) { return; }

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

    };

    guardia();
  }

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
    try { socket.close(); } catch (err) {  }
  }

  function riprova() {
    if (!vivo.acceso) { return; }

    cambiaStato('riprovo');
    presa.tentativi++;

    var attesa = Math.min(ATTESA_MASSIMA, ATTESA_BASE * Math.pow(2, presa.tentativi - 1));
    attesa = Math.round(attesa * (1 + (Math.random() * 2 - 1) * SCARTO));

    clearTimeout(timer.riprova);
    timer.riprova = setTimeout(apri, attesa);
  }

  function ferma() {
    vivo.acceso = false;
    clearTimeout(timer.riprova);
    timer.riprova = null;
    chiudiPresa();
    presa.tentativi = 0;
    cambiaStato('spenta');
  }

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
