(function () {
  'use strict';

  const INDIRIZZO = 'wss://eventsub.wss.twitch.tv/ws';
  const RESPIRO = 30;

  const ANAGRAFE = 'https://api.ivr.fi/v2/twitch/user';

  const INIZIO = 'channel.shared_chat.begin';
  const CAMBIO = 'channel.shared_chat.update';
  const FINE   = 'channel.shared_chat.end';

  const SCOPO = 'user:read:chat';

  const TETTO_RETE = 8000;

  const TENTATIVI_MAX = 5;
  const ATTESA_BASE = 1000;
  const ATTESA_MASSIMA = 60000;
  const SCARTO = 0.2;
  const SESSIONE_BUONA = 60000;

  const SILENZIO = 90000;
  const GIRO_GUARDIA = 15000;

  const ISCRIZIONE_ENTRO = 8000;

  const SOLO_HTTPS = /^https:\/\//;
  const SOLO_CIFRE = /^[0-9]{1,12}$/;
  const NOME_CANALE = /^[a-z0-9_]{1,25}$/;

  const MAX_CANALI = 6;

  const vivo = {
    acceso: false,
    id: '',
    canale: '',
    host: '',
    stato: 'spenta'
  };

  const canali = Object.create(null);
  let quanti = 0;

  const presa = {
    socket: null,
    ricambio: null,
    tentativi: 0,
    apertaIl: 0,
    ultimoSegnale: 0,
    iscritta: false
  };

  const timer = { riprova: null, guardia: null, iscrizione: null };

  let consegna = null;
  const osservatori = [];

  function avviso(testo) {
    try {
      if (window.console && typeof console.warn === 'function') {
        console.warn('[pollaio] ' + testo);
      }
    } catch (err) {  }
  }

  function cifre(valore) {
    const testo = String(valore === undefined || valore === null ? '' : valore).trim();
    return SOLO_CIFRE.test(testo) ? testo : '';
  }

  function nick(valore) {
    const testo = String(valore === undefined || valore === null ? '' : valore)
      .trim().toLowerCase();
    return NOME_CANALE.test(testo) ? testo : '';
  }

  function sicuro(valore) {
    return (typeof valore === 'string' && SOLO_HTTPS.test(valore)) ? valore : '';
  }

  function annuncia() {
    const chi = elenco();

    if (consegna) {
      try { consegna(chi); }
      catch (err) { avviso('Stormo: chi guarda la sessione si è impuntato.'); }
    }
    for (let i = 0; i < osservatori.length; i++) {
      try { osservatori[i](chi); }
      catch (err) { avviso('Stormo: chi guarda la sessione si è impuntato.'); }
    }
  }

  function attiva() {
    return quanti > 1;
  }

  function elenco() {
    const fuori = [];
    const nostro = canali[vivo.id];

    if (nostro) { fuori.push(copia(nostro)); }

    let chiave;
    for (chiave in canali) {
      if (Object.prototype.hasOwnProperty.call(canali, chiave) && chiave !== vivo.id) {
        fuori.push(copia(canali[chiave]));
      }
    }
    return fuori;
  }

  function copia(voce) {
    return {
      id: voce.id,
      nick: voce.nick,
      nome: voce.nome,
      pfp: voce.pfp,
      ospite: voce.id !== vivo.id,
      host: voce.id === vivo.host
    };
  }

  function chiedi(indirizzo) {
    return new Promise(function (risolvi) {
      if (typeof fetch !== 'function') { risolvi(null); return; }

      let controllo = null;
      try { controllo = new AbortController(); } catch (err) { controllo = null; }

      const taglio = setTimeout(function () {
        if (controllo) { try { controllo.abort(); } catch (err) {  } }
        risolvi(null);
      }, TETTO_RETE);

      fetch(indirizzo, controllo ? { signal: controllo.signal } : undefined)
        .then(function (risposta) {
          if (!risposta.ok) { throw new Error('HTTP ' + risposta.status); }
          return risposta.json();
        })
        .then(function (dati) { clearTimeout(taglio); risolvi(dati); },
              function () { clearTimeout(taglio); risolvi(null); });
    });
  }

  function anagrafe(id) {
    const voce = canali[id];
    if (!voce || voce.cercata) { return; }
    voce.cercata = true;

    chiedi(ANAGRAFE + '?id=' + encodeURIComponent(id)).then(function (dati) {
      const uno = Array.isArray(dati) ? dati[0] : dati;
      if (!uno || typeof uno !== 'object') { return; }

      const login = nick(uno.login);
      if (login) { voce.nick = login; }

      const mostrato = String(uno.displayName || uno.display_name || '').trim();
      voce.nome = mostrato || voce.nick || voce.nome;

      voce.pfp = sicuro(uno.logo) || sicuro(uno.profileImageURL) || voce.pfp;

      annuncia();
    });
  }

  function iscrivi(id, comeNick) {
    const pulito = cifre(id);
    if (!pulito) { return false; }

    if (Object.prototype.hasOwnProperty.call(canali, pulito)) {
      const gia = canali[pulito];
      if (comeNick && !gia.nick) { gia.nick = nick(comeNick); gia.nome = gia.nome || gia.nick; }
      return false;
    }

    if (quanti >= MAX_CANALI) { return false; }

    const battesimo = nick(comeNick);
    canali[pulito] = {
      id: pulito,
      nick: battesimo,
      nome: battesimo,
      pfp: '',
      cercata: false
    };
    quanti++;

    // Del nostro canale sappiamo già tutto: l'anagrafica si chiede solo per
    // gli altri, e solo quando ce ne sono.
    if (pulito !== vivo.id) { anagrafe(pulito); }
    return true;
  }

  function dimentica() {
    let chiave;
    for (chiave in canali) {
      if (Object.prototype.hasOwnProperty.call(canali, chiave) && chiave !== vivo.id) {
        delete canali[chiave];
        quanti--;
      }
    }
    vivo.host = '';
  }

  function osserva(id) {
    if (!vivo.acceso) { return false; }

    const pulito = cifre(id);
    if (!pulito || pulito === vivo.id) { return false; }

    const nuovo = iscrivi(pulito, '');
    if (nuovo) { annuncia(); }
    return nuovo;
  }

  function canale(id) {
    const pulito = cifre(id);
    if (!pulito) { return null; }
    const voce = canali[pulito];
    return voce ? copia(voce) : null;
  }

  function conScarto(base) {
    const scarto = base * SCARTO * (Math.random() * 2 - 1);
    return Math.max(100, Math.round(base + scarto));
  }

  function segnaStato(nuovo) {
    if (vivo.stato === nuovo) { return; }
    vivo.stato = nuovo;
  }

  function chiudiPresa(quale) {
    const socket = quale || presa.socket;
    if (!socket) { return; }

    try {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.close();
    } catch (err) {  }

    if (socket === presa.socket) { presa.socket = null; }
    if (socket === presa.ricambio) { presa.ricambio = null; }
  }

  function riprova() {
    if (!vivo.acceso) { return; }

    if (presa.tentativi >= TENTATIVI_MAX) {
      segnaStato('sola');
      avviso('Stormo: EventSub non risponde. Le live congiunte si riconoscono lo stesso dai messaggi.');
      return;
    }

    const attesa = conScarto(Math.min(ATTESA_MASSIMA, ATTESA_BASE * Math.pow(2, presa.tentativi)));
    presa.tentativi++;

    clearTimeout(timer.riprova);
    timer.riprova = setTimeout(collega, attesa);
  }

  function condizione(conUtente) {
    const cond = { broadcaster_user_id: vivo.id };
    if (conUtente) {
      const chi = window.Conto && window.Conto.chi ? window.Conto.chi() : null;
      cond.user_id = (chi && chi.utenteId) || vivo.id;
    }
    return cond;
  }

  function domanda(tipo, sessione, conUtente) {
    if (!window.Conto || typeof window.Conto.verso !== 'function') { return; }

    window.Conto.verso('POST', '/eventsub/subscriptions', {
      type: tipo,
      version: '1',
      condition: condizione(conUtente),
      transport: { method: 'websocket', session_id: sessione }
    }, function (guaio) {
      if (!guaio) { return; }

      // Le pagine di Twitch non concordano su quali campi voglia la `condition`
      // di queste tre iscrizioni: qui lo si chiede a Twitch, che nel rifiuto
      // dice quale gli manca, e si ritenta una volta sola con l'altra forma.
      if (!conUtente && /user_id/i.test(String(guaio))) {
        domanda(tipo, sessione, true);
        return;
      }

      avviso('Stormo: Twitch non ha accettato l’iscrizione a ' + tipo + ' (' + guaio + ')');
    });
  }

  function iscriviti(sessione) {
    if (presa.iscritta) { return; }
    presa.iscritta = true;

    domanda(INIZIO, sessione, false);
    domanda(CAMBIO, sessione, false);
    domanda(FINE, sessione, false);
  }

  function partecipanti(dati) {
    if (!dati || typeof dati !== 'object') { return; }

    vivo.host = cifre(dati.host_broadcaster_user_id);

    let cambiato = false;
    const gente = Array.isArray(dati.participants) ? dati.participants : [];

    for (let i = 0; i < gente.length; i++) {
      const uno = gente[i] || {};
      if (iscrivi(uno.broadcaster_user_id, uno.broadcaster_user_login)) { cambiato = true; }
    }

    if (cambiato || gente.length) { annuncia(); }
  }

  function notifica(busta) {
    const meta = busta.metadata || {};
    const carico = busta.payload || {};
    const tipo = String(meta.subscription_type || '');

    if (tipo === FINE) {
      dimentica();
      annuncia();
      return;
    }

    if (tipo === INIZIO || tipo === CAMBIO) {
      partecipanti(carico.event);
    }
  }

  function ricevi(e, socket) {
    presa.ultimoSegnale = Date.now();

    let busta;
    try { busta = JSON.parse(String(e.data || '')); }
    catch (err) { return; }
    if (!busta || typeof busta !== 'object') { return; }

    const meta = busta.metadata || {};
    const carico = busta.payload || {};
    const genere = String(meta.message_type || '');

    if (genere === 'session_welcome') {
      const sessione = String((carico.session && carico.session.id) || '');
      if (!sessione) { return; }

      clearTimeout(timer.iscrizione);

      if (socket === presa.ricambio) {
        // Il ricambio è in piedi: la vecchia presa può andarsene senza
        // che si perda un solo messaggio.
        chiudiPresa(presa.socket);
        presa.socket = socket;
        presa.ricambio = null;
        return;
      }

      presa.tentativi = 0;
      presa.iscritta = false;
      segnaStato('viva');
      iscriviti(sessione);
      return;
    }

    if (genere === 'session_keepalive') { return; }

    if (genere === 'notification') { notifica(busta); return; }

    if (genere === 'session_reconnect') {
      const dove = String((carico.session && carico.session.reconnect_url) || '');
      if (dove.indexOf('wss://') === 0) { cambiaPresa(dove); }
      return;
    }

    if (genere === 'revocation') {
      avviso('Stormo: Twitch ha revocato l’iscrizione. Restano i tag dei messaggi.');
      ferma();
    }
  }

  function apri(indirizzo, ricambio) {
    let socket;
    try { socket = new WebSocket(indirizzo); }
    catch (err) { return null; }

    socket.onopen = function () {
      presa.apertaIl = Date.now();
      presa.ultimoSegnale = Date.now();

      if (!ricambio) {
        clearTimeout(timer.iscrizione);
        timer.iscrizione = setTimeout(function () {
          if (!presa.iscritta) {
            avviso('Stormo: Twitch non ha mandato il benvenuto in tempo. Riprovo.');
            chiudiPresa(socket);
            riprova();
          }
        }, ISCRIZIONE_ENTRO);
      }
    };

    socket.onmessage = function (e) { ricevi(e, socket); };

    socket.onerror = function () {  };

    socket.onclose = function () {
      if (socket === presa.ricambio) { presa.ricambio = null; return; }
      if (socket !== presa.socket) { return; }

      presa.socket = null;
      presa.iscritta = false;
      if (!vivo.acceso) { return; }

      if (Date.now() - presa.apertaIl > SESSIONE_BUONA) { presa.tentativi = 0; }
      segnaStato('spenta');
      riprova();
    };

    return socket;
  }

  function cambiaPresa(dove) {
    chiudiPresa(presa.ricambio);
    presa.ricambio = apri(dove, true);
  }

  function collega() {
    if (!vivo.acceso || presa.socket) { return; }

    presa.iscritta = false;
    presa.socket = apri(INDIRIZZO + '?keepalive_timeout_seconds=' + RESPIRO, false);

    if (!presa.socket) {
      segnaStato('sola');
      return;
    }
    segnaStato('collego');
  }

  function guardiaSilenzio() {
    if (!vivo.acceso || !presa.socket) { return; }
    if (Date.now() - presa.ultimoSegnale < SILENZIO) { return; }

    avviso('Stormo: EventSub è muto da troppo. Riapro.');
    chiudiPresa(presa.socket);
  }

  function puoParlare() {
    if (!window.Conto) { return false; }
    if (typeof window.Conto.collegato !== 'function' || !window.Conto.collegato()) { return false; }
    if (typeof window.Conto.puo !== 'function') { return false; }

    if (window.Conto.puo(SCOPO)) { return true; }

    // Un account c'è ma è di prima di questa funzione: vale la pena dirlo, o
    // uno si chiede perché gli altri canali compaiono solo quando scrivono.
    avviso('Stormo: al collegamento manca «' + SCOPO + '». Le live congiunte si ' +
           'vedono lo stesso, ma un canale compare al suo primo messaggio. ' +
           'Si rimedia con «Riconnetti account».');
    return false;
  }

  function avvia(opzioni) {
    ferma();

    const o = (opzioni && typeof opzioni === 'object') ? opzioni : {};

    vivo.id = cifre(o.id);
    vivo.canale = nick(o.canale);
    if (!vivo.id) { return false; }

    vivo.acceso = true;
    quanti = 0;
    iscrivi(vivo.id, vivo.canale);

    consegna = typeof o.su === 'function' ? o.su : null;

    if (!puoParlare() || typeof WebSocket !== 'function') {
      // Senza account collegato (o senza il permesso di leggere la chat) la
      // sessione si scopre lo stesso: al primo messaggio che arriva da un
      // altro canale ci pensa `osserva`.
      segnaStato('sola');
      return true;
    }

    clearInterval(timer.guardia);
    timer.guardia = setInterval(guardiaSilenzio, GIRO_GUARDIA);

    collega();
    return true;
  }

  function ferma() {
    vivo.acceso = false;

    clearTimeout(timer.riprova);
    clearTimeout(timer.iscrizione);
    clearInterval(timer.guardia);
    timer.riprova = null;
    timer.iscrizione = null;
    timer.guardia = null;

    chiudiPresa(presa.ricambio);
    chiudiPresa(presa.socket);

    presa.tentativi = 0;
    presa.iscritta = false;

    let chiave;
    for (chiave in canali) {
      if (Object.prototype.hasOwnProperty.call(canali, chiave)) { delete canali[chiave]; }
    }
    quanti = 0;
    vivo.host = '';
    consegna = null;
    segnaStato('spenta');
  }

  function suStato(fn) {
    if (typeof fn === 'function') { osservatori.push(fn); }
  }

  window.Stormo = {
    avvia: avvia,
    ferma: ferma,
    osserva: osserva,
    canale: canale,
    elenco: elenco,
    attiva: attiva,
    stato: function () { return vivo.stato; },
    suStato: suStato
  };
}());
