(function () {
  'use strict';

  const INDIRIZZO = 'wss://irc-ws.chat.twitch.tv:443';

  const CAPACITA = 'CAP REQ :twitch.tv/tags twitch.tv/commands';

  const NICK_BASE = 10000;
  const NICK_ARCO = 80000;

  const TENTATIVI_MAX = 5;
  const ATTESA_MASSIMA = 60000;
  const ATTESA_BASE = 1000;
  const SCARTO = 0.2;
  const SESSIONE_BUONA = 60000;
  const RIENTRO_SUBITO = 300;

  const ATTESA_NASCOSTA = 60000;
  const SILENZIO = 360000;
  const GIRO_GUARDIA = 30000;

  const NOME_CANALE = /^[a-z0-9_]{1,25}$/;

  const UTILI = {
    PRIVMSG: true,
    USERNOTICE: true,
    CLEARCHAT: true,
    CLEARMSG: true,
    ROOMSTATE: true,
    NOTICE: true
  };

  const vivo = {
    acceso: false,
    canale: '',
    sospendi: false,
    stato: 'spenta'
  };

  const presa = {
    socket: null,
    tentativi: 0,
    apertaIl: 0,
    sospesa: false,
    ultimoSegnale: 0
  };

  const timer = { riprova: null, nascosta: null, guardia: null };

  let consegna = null;
  let sentinelle = false;
  const osservatori = [];

  function avviso(testo) {
    try {
      if (window.console && typeof console.warn === 'function') {
        console.warn('[pollaio] ' + testo);
      }
    } catch (err) {  }
  }

  function disescapa(valore) {
    if (valore.indexOf('\\') === -1) { return valore; }

    let fuori = '';
    for (let i = 0; i < valore.length; i++) {
      const c = valore.charAt(i);
      if (c !== '\\') { fuori += c; continue; }

      const dopo = valore.charAt(i + 1);
      i++;
      if (dopo === 's') { fuori += ' '; }
      else if (dopo === ':') { fuori += ';'; }
      else if (dopo === '\\') { fuori += '\\'; }
      else if (dopo === 'r' || dopo === 'n') {  }
      else if (dopo === '') {  }
      else { fuori += dopo; }
    }
    return fuori;
  }

  function leggiTag(pezzo) {
    const tag = Object.create(null);
    const coppie = pezzo.split(';');

    for (let i = 0; i < coppie.length; i++) {
      const coppia = coppie[i];
      if (!coppia) { continue; }

      const uguale = coppia.indexOf('=');
      if (uguale === 0) { continue; }

      if (uguale === -1) { tag[coppia] = ''; continue; }

      tag[coppia.slice(0, uguale)] = disescapa(coppia.slice(uguale + 1));
    }
    return tag;
  }

  function analizza(testo) {
    let resto = testo;
    let tag = {};
    let prefisso = '';

    if (resto.charAt(0) === '@') {
      const spazio = resto.indexOf(' ');
      if (spazio === -1) { return null; }
      tag = leggiTag(resto.slice(1, spazio));
      resto = resto.slice(spazio + 1);
    }

    if (resto.charAt(0) === ':') {
      const spazio = resto.indexOf(' ');
      if (spazio === -1) { return null; }
      prefisso = resto.slice(1, spazio);
      resto = resto.slice(spazio + 1);
    }

    const spazio = resto.indexOf(' ');
    return {
      tag: tag,
      prefisso: prefisso,
      comando: spazio === -1 ? resto : resto.slice(0, spazio),
      parametri: spazio === -1 ? '' : resto.slice(spazio + 1)
    };
  }

  function nickDa(prefisso) {
    if (!prefisso) { return ''; }
    const taglio = prefisso.indexOf('!');
    if (taglio > 0) { return prefisso.slice(0, taglio).toLowerCase(); }
    if (prefisso.indexOf('.') === -1) { return prefisso.toLowerCase(); }
    return '';
  }

  function canaleDa(parametri) {
    if (parametri.charAt(0) !== '#') { return ''; }
    const spazio = parametri.indexOf(' ');
    return spazio === -1 ? parametri : parametri.slice(0, spazio);
  }

  function manda(testo) {
    try {

      if (presa.socket && presa.socket.readyState === 1) {
        presa.socket.send(testo + '\r\n');
      }
    } catch (err) {  }
  }

  function collega() {
    if (!vivo.acceso || presa.socket || presa.sospesa) { return; }
    if (typeof WebSocket !== 'function') { return; }

    clearTimeout(timer.riprova);
    timer.riprova = null;

    let socket;
    try {
      socket = new WebSocket(INDIRIZZO);
    } catch (err) {

      riprova();
      return;
    }

    presa.socket = socket;
    presa.apertaIl = 0;

    presa.ultimoSegnale = Date.now();
    cambiaStato('collego');

    socket.addEventListener('open', function () {
      if (socket !== presa.socket) { return; }

      presa.apertaIl = Date.now();
      presa.ultimoSegnale = Date.now();

      manda(CAPACITA);
      manda('NICK justinfan' + (NICK_BASE + Math.floor(Math.random() * NICK_ARCO)));
      manda('JOIN #' + vivo.canale);

      cambiaStato('accesa');
    });

    socket.addEventListener('message', function (e) {
      if (socket !== presa.socket) { return; }
      ricevi(e);
    });

    socket.addEventListener('close', function () {
      if (socket !== presa.socket) { return; }

      const durata = presa.apertaIl ? Date.now() - presa.apertaIl : 0;
      presa.socket = null;
      presa.apertaIl = 0;

      if (durata > SESSIONE_BUONA) { presa.tentativi = 0; }
      riprova();
    });

    socket.addEventListener('error', function () {  });
  }

  function chiudiPresa() {
    clearTimeout(timer.riprova);
    timer.riprova = null;

    const socket = presa.socket;
    presa.socket = null;
    presa.apertaIl = 0;
    if (!socket) { return; }

    try { socket.close(); } catch (err) {  }
  }

  function ricevi(e) {
    presa.ultimoSegnale = Date.now();

    const righe = String(e.data).split(/\r\n|\r|\n/);
    for (let i = 0; i < righe.length; i++) { riga(righe[i]); }
  }

  function riga(testo) {
    if (!testo) { return; }

    const m = analizza(testo);
    if (!m) { return; }

    if (m.comando === 'PING') { manda('PONG :tmi.twitch.tv'); return; }

    if (m.comando === 'RECONNECT') { rientroSubito(); return; }

    if (!UTILI[m.comando]) { return; }
    porta(m);
  }

  function porta(m) {
    if (!consegna) { return; }

    const stacco = m.parametri.indexOf(' :');

    const messaggio = {
      comando: m.comando,
      tag: m.tag,
      prefisso: m.prefisso,
      nick: nickDa(m.prefisso),
      canale: canaleDa(m.parametri),
      testo: stacco === -1 ? '' : m.parametri.slice(stacco + 2),
      parametri: m.parametri
    };

    try {
      consegna(messaggio);
    } catch (err) {

      avviso('Irc: chi legge i messaggi si è impuntato su ' + m.comando + '.');
    }
  }

  function conScarto(base) {
    const scarto = base * SCARTO * (Math.random() * 2 - 1);
    return Math.max(100, Math.round(base + scarto));
  }

  function riprova() {
    if (!vivo.acceso || presa.sospesa) { return; }

    const attesa = conScarto(Math.min(ATTESA_MASSIMA, ATTESA_BASE * Math.pow(2, presa.tentativi)));
    presa.tentativi++;

    clearTimeout(timer.riprova);
    timer.riprova = setTimeout(collega, attesa);

    cambiaStato(presa.tentativi > TENTATIVI_MAX ? 'resa' : 'riprovo');
  }

  function rientroSubito() {
    chiudiPresa();
    presa.tentativi = 0;
    if (!vivo.acceso || presa.sospesa) { return; }

    clearTimeout(timer.riprova);
    timer.riprova = setTimeout(collega, conScarto(RIENTRO_SUBITO));
    cambiaStato('riprovo');
  }

  function montaSentinelle() {
    if (sentinelle) { return; }
    sentinelle = true;

    try {
      if (document && document.addEventListener) {
        document.addEventListener('visibilitychange', suVisibilita);
      }
      if (window.addEventListener) {
        window.addEventListener('pagehide', suUscita);
      }
    } catch (err) {  }
  }

  function suVisibilita() {
    if (!vivo.acceso || !vivo.sospendi) { return; }

    clearTimeout(timer.nascosta);
    timer.nascosta = null;

    if (document.visibilityState === 'hidden') {
      timer.nascosta = setTimeout(sospendiOra, ATTESA_NASCOSTA);
      return;
    }

    if (presa.sospesa) {
      presa.sospesa = false;
      presa.tentativi = 0;
      collega();
    }
  }

  function sospendiOra() {
    timer.nascosta = null;
    if (!vivo.acceso || !vivo.sospendi) { return; }

    presa.sospesa = true;
    chiudiPresa();

    cambiaStato('spenta');
  }

  function guardiaSilenzio() {
    if (!vivo.acceso || presa.sospesa || !presa.socket) { return; }
    if (Date.now() - presa.ultimoSegnale <= SILENZIO) { return; }

    avviso('Irc: sei minuti senza un segnale, nemmeno un PING. Riapro la connessione.');
    chiudiPresa();
    presa.tentativi = 0;
    riprova();
  }

  function suUscita() {
    if (!vivo.acceso) { return; }
    ferma();
  }

  function avvisaUno(fn, stato) {
    try {
      fn(stato);
    } catch (err) {
      avviso('Irc: un osservatore dello stato si è impuntato.');
    }
  }

  function cambiaStato(nuovo) {
    if (nuovo === vivo.stato) { return; }
    vivo.stato = nuovo;
    for (let i = 0; i < osservatori.length; i++) { avvisaUno(osservatori[i], nuovo); }
  }

  function avvia(opzioni) {
    const scelte = opzioni || {};

    ferma();

    const canale = String(scelte.canale || '').trim().toLowerCase().replace(/^#/, '');

    if (!NOME_CANALE.test(canale)) {
      avviso('Irc: «' + canale.slice(0, 25) + '» non è un nome di canale Twitch. Non mi collego.');
      return;
    }
    if (typeof scelte.su !== 'function') {
      avviso('Irc: nessuno legge i messaggi (manca `su`). Non mi collego.');
      return;
    }
    if (typeof WebSocket !== 'function') {
      avviso('Irc: questo browser non ha le WebSocket. La chat resta spenta.');
      return;
    }

    vivo.canale = canale;
    vivo.sospendi = scelte.sospendi === true;
    vivo.acceso = true;
    consegna = scelte.su;

    presa.tentativi = 0;
    presa.sospesa = false;
    presa.ultimoSegnale = Date.now();

    montaSentinelle();
    clearInterval(timer.guardia);
    timer.guardia = setInterval(guardiaSilenzio, GIRO_GUARDIA);

    collega();
  }

  function ferma() {
    vivo.acceso = false;
    consegna = null;

    clearTimeout(timer.riprova);
    clearTimeout(timer.nascosta);
    clearInterval(timer.guardia);
    timer.riprova = null;
    timer.nascosta = null;
    timer.guardia = null;

    presa.sospesa = false;
    presa.tentativi = 0;

    chiudiPresa();
    cambiaStato('spenta');
  }

  window.Irc = {
    avvia: avvia,
    ferma: ferma,

    stato: function () {
      return vivo.stato;
    },

    suStato: function (fn) {
      if (typeof fn !== 'function') { return; }
      osservatori.push(fn);
      avvisaUno(fn, vivo.stato);
    },

    analizza: analizza,
    disescapa: disescapa
  };
}());
