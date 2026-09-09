(function () {
  'use strict';

  var CHIAVE = 'sb-pollaio-conto';

  var CHIAVE_CLIENTE = 'sb-pollaio-cliente';

  var CLIENTE_PREDEFINITO = 'az1lnikuqdah3fxa3ee70kakjp5ptz';

  var LIMITE = 500;

  var SCOPO_SCRIVERE = 'user:write:chat';

  var SCOPI_COMANDI = [
    'moderator:read:chatters',
    'moderator:manage:banned_users',
    'moderator:manage:chat_messages',
    'moderator:manage:chat_settings',
    'moderator:manage:announcements',
    'moderator:manage:shoutouts',
    'channel:manage:raids',
    'channel:manage:polls',
    'channel:manage:predictions',
    'channel:manage:broadcast',
    'channel:manage:moderators',
    'channel:manage:vips',
    'user:read:emotes',
    'user:manage:whispers',
    'user:read:chat'
  ];

  var SCOPI = [SCOPO_SCRIVERE].concat(SCOPI_COMANDI).join(' ');

  var DISPOSITIVO = 'https://id.twitch.tv/oauth2/device';
  var GETTONE     = 'https://id.twitch.tv/oauth2/token';
  var CONTROLLO   = 'https://id.twitch.tv/oauth2/validate';
  var REVOCA      = 'https://id.twitch.tv/oauth2/revoke';
  var UTENTI      = 'https://api.twitch.tv/helix/users';
  var MESSAGGI    = 'https://api.twitch.tv/helix/chat/messages';

  var TETTO_TEMPO = 12000;

  var MARGINE = 600000;

  var RITMO_MINIMO = 5000;

  var RALLENTA = 5000;

  var MODELLO_CLIENT = /^[a-z0-9]{20,40}$/;

  var MODELLO_CANALE = /^[a-z0-9_]{1,25}$/;

  var ATTIVAZIONE = 'https://www.twitch.tv/activate';

  var MODELLO_CODICE = /^[A-Za-z0-9]{4,16}$/;

  var MODELLO_ATTIVAZIONE = /^https:\/\/www\.twitch\.tv\/activate(\?device-code=[A-Za-z0-9]{4,16})?$/;

  var SPORCO = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

  var conto = null;
  var letto = false;

  var attesa = null;

  var canali = Object.create(null);

  function ripulisci(testo) {
    var s = String(testo === undefined || testo === null ? '' : testo)
      .replace(SPORCO, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    var lettere = Array.from(s);
    if (lettere.length <= LIMITE) { return s; }
    return lettere.slice(0, LIMITE).join('').trim();
  }

  function buono(dato) {
    if (!dato || typeof dato !== 'object') { return null; }
    if (!MODELLO_CLIENT.test(String(dato.cliente || ''))) { return null; }
    if (typeof dato.gettone !== 'string' || !dato.gettone) { return null; }

    return {
      cliente:  String(dato.cliente),
      gettone:  String(dato.gettone),
      rinnovo:  typeof dato.rinnovo === 'string' ? dato.rinnovo : '',
      nick:     String(dato.nick || ''),
      nome:     String(dato.nome || dato.nick || ''),
      utenteId: String(dato.utenteId || ''),
      scopi:    Array.isArray(dato.scopi) ? dato.scopi.map(String) : [],
      scade:    isFinite(dato.scade) ? Number(dato.scade) : 0
    };
  }

  function puo(scopo) {
    var c = leggi();
    if (!c || !c.scopi.length) { return false; }
    return c.scopi.indexOf(String(scopo)) !== -1;
  }

  function mancano() {
    var c = leggi();
    if (!c) { return SCOPI.split(' '); }

    var fuori = [];
    var tutti = SCOPI.split(' ');
    var i;

    for (i = 0; i < tutti.length; i++) {
      if (c.scopi.indexOf(tutti[i]) === -1) { fuori.push(tutti[i]); }
    }
    return fuori;
  }

  function leggi() {
    if (letto) { return conto; }
    letto = true;

    try {
      var grezzo = localStorage.getItem(CHIAVE);
      if (!grezzo) { return null; }
      conto = buono(JSON.parse(grezzo));
    } catch (err) {
      conto = null;
    }
    return conto;
  }

  function rileggi() {
    letto = false;
    conto = null;
    canali = Object.create(null);
    return leggi();
  }

  function scrivi(dato) {
    conto = buono(dato);
    letto = true;
    if (!conto) { return false; }

    try {
      localStorage.setItem(CHIAVE, JSON.stringify(conto));
      return true;
    } catch (err) {
      return false;
    }
  }

  function dimentica() {
    conto = null;
    letto = true;
    canali = Object.create(null);
    try { localStorage.removeItem(CHIAVE); } catch (err) {  }
  }

  function cliente() {
    var c = leggi();
    if (c) { return c.cliente; }

    var messo = '';
    try { messo = String(localStorage.getItem(CHIAVE_CLIENTE) || ''); }
    catch (err) { messo = ''; }

    if (MODELLO_CLIENT.test(messo)) { return messo; }
    return MODELLO_CLIENT.test(CLIENTE_PREDEFINITO) ? CLIENTE_PREDEFINITO : '';
  }

  function serveClientId() {
    return !MODELLO_CLIENT.test(cliente());
  }

  function ricorda(id) {
    var pulito = String(id || '').trim().toLowerCase();
    if (!MODELLO_CLIENT.test(pulito)) { return false; }

    try { localStorage.setItem(CHIAVE_CLIENTE, pulito); return true; }
    catch (err) { return false; }
  }

  function chi() {
    var c = leggi();
    if (!c) { return null; }
    return { nick: c.nick, nome: c.nome, utenteId: c.utenteId, scade: c.scade };
  }

  function scaduto() {
    var c = leggi();
    return !!c && c.scade > 0 && c.scade <= Date.now();
  }

  function collegato() {
    return !!leggi() && !scaduto();
  }

  function leggiJson(testo) {
    try { return JSON.parse(testo); }
    catch (err) { return null; }
  }

  function chiama(indirizzo, opzioni, su) {
    if (typeof fetch !== 'function') {
      su('Questo browser non sa parlare con Twitch.');
      return;
    }

    var taglio = null;
    try {
      if (typeof AbortController === 'function') {
        var ctrl = new AbortController();
        opzioni.signal = ctrl.signal;
        taglio = setTimeout(function () { try { ctrl.abort(); } catch (err) {  } }, TETTO_TEMPO);
      }
    } catch (err) {  }

    fetch(indirizzo, opzioni).then(function (r) {
      clearTimeout(taglio);
      var stato = r.status;
      return r.text().then(function (testo) {
        return { stato: stato, dati: leggiJson(testo) };
      });
    }).then(function (esito) {
      su(null, esito);
    })['catch'](function () {
      clearTimeout(taglio);
      su('Twitch non risponde. Controlla la rete e riprova.');
    });
  }

  function modulo(campi) {
    var pezzi = [];
    var chiave;
    for (chiave in campi) {
      if (Object.prototype.hasOwnProperty.call(campi, chiave)) {
        pezzi.push(encodeURIComponent(chiave) + '=' + encodeURIComponent(campi[chiave]));
      }
    }
    return pezzi.join('&');
  }

  function posta(indirizzo, campi, su) {
    chiama(indirizzo, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: modulo(campi)
    }, su);
  }

  function guaioDi(esito, ripiego) {
    var detto = esito && esito.dati && (esito.dati.message || esito.dati.error_description);
    return detto ? String(detto) : ripiego;
  }

  function controlla(gettone, su) {
    chiama(CONTROLLO, {
      method: 'GET',
      headers: { Authorization: 'OAuth ' + gettone }
    }, function (guaio, esito) {
      if (guaio) { su(guaio); return; }

      if (!esito || esito.stato !== 200 || !esito.dati || !esito.dati.user_id) {
        su('Twitch non riconosce questo collegamento.');
        return;
      }
      su(null, esito.dati);
    });
  }

  function inciampo(su, detto) {
    if (typeof su === 'function') { su({ fase: 'errore', detto: detto }); }
  }

  function attivazione(proposto, codice) {
    var suo = String(proposto || '');
    if (MODELLO_ATTIVAZIONE.test(suo)) { return suo; }

    if (MODELLO_CODICE.test(codice)) {
      return ATTIVAZIONE + '?device-code=' + encodeURIComponent(codice);
    }
    return ATTIVAZIONE;
  }

  function ferma() {
    if (!attesa) { return; }
    clearTimeout(attesa.timer);
    attesa.vivo = false;
    attesa = null;
  }

  function chiedi(clienteGrezzo, su) {
    ferma();

    var id = String(clienteGrezzo || cliente() || '').trim().toLowerCase();
    if (!MODELLO_CLIENT.test(id)) {
      inciampo(su, 'Questo non somiglia a un Client ID: sono una trentina di lettere e numeri, senza spazi.');
      return;
    }

    posta(DISPOSITIVO, { client_id: id, scopes: SCOPI }, function (guaio, esito) {
      if (guaio) { inciampo(su, guaio); return; }

      if (!esito || esito.stato !== 200 || !esito.dati || !esito.dati.device_code) {
        inciampo(su, guaioDi(esito,
          'Twitch non accetta questo Client ID. Controlla di averlo copiato tutto e che l’applicazione sia di tipo «Public».'));
        return;
      }

      var dati = esito.dati;
      var ritmo = Math.max(RITMO_MINIMO, (parseInt(dati.interval, 10) || 5) * 1000);
      var scadenza = Date.now() + (parseInt(dati.expires_in, 10) || 1800) * 1000;

      attesa = { vivo: true, timer: null, ritmo: ritmo };

      var codice = String(dati.user_code || '');

      if (typeof su === 'function') {
        su({
          fase: 'codice',
          codice: codice,
          indirizzo: attivazione(dati.verification_uri, codice),
          scadenza: scadenza
        });
      }

      function batti() {
        if (!attesa || !attesa.vivo) { return; }

        if (Date.now() > scadenza) {
          ferma();
          inciampo(su, 'Il codice è scaduto senza che nessuno lo confermasse. Ricomincio quando vuoi.');
          return;
        }

        posta(GETTONE, {
          client_id: id,
          scopes: SCOPI,
          device_code: String(dati.device_code),
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        }, function (guaioDue, risposta) {
          if (!attesa || !attesa.vivo) { return; }

          if (guaioDue) {
            attesa.timer = setTimeout(batti, attesa.ritmo);
            return;
          }

          if (risposta.stato === 200 && risposta.dati && risposta.dati.access_token) {
            ferma();
            concludi(id, risposta.dati, su);
            return;
          }

          var detto = String((risposta.dati && risposta.dati.message) || '');

          if (detto === 'authorization_pending' || detto === '') {
            attesa.timer = setTimeout(batti, attesa.ritmo);
            return;
          }
          if (detto === 'slow_down') {
            attesa.ritmo += RALLENTA;
            attesa.timer = setTimeout(batti, attesa.ritmo);
            return;
          }

          ferma();

          if (detto === 'access_denied') {
            inciampo(su, 'Su Twitch hai detto di no. Va bene: senza il tuo sì non scrivo niente.');
            return;
          }
          inciampo(su, 'Twitch ha chiuso la porta: ' + detto);
        });
      }

      attesa.timer = setTimeout(batti, ritmo);
    });
  }

  function concludi(id, dati, su) {
    var gettone = String(dati.access_token);
    var rinnovo = String(dati.refresh_token || '');
    var dura = (parseInt(dati.expires_in, 10) || 14400) * 1000;

    controlla(gettone, function (guaio, chiave) {
      if (guaio) { inciampo(su, guaio); return; }

      var salvato = scrivi({
        cliente: id,
        gettone: gettone,
        rinnovo: rinnovo,
        nick: String(chiave.login || ''),
        nome: String(chiave.login || ''),
        utenteId: String(chiave.user_id || ''),
        scopi: Array.isArray(chiave.scopes) ? chiave.scopes : [],
        scade: Date.now() + dura
      });

      if (!salvato) {
        inciampo(su, 'Il collegamento è andato bene ma non riesco a ricordarmelo: questo browser non mi lascia mettere niente da parte.');
        return;
      }

      if (typeof su === 'function') { su({ fase: 'fatto', chi: chi() }); }
    });
  }

  function rinnova(su) {
    var c = leggi();
    if (!c) { su('Non sei collegato.', null, true); return; }

    if (!c.rinnovo) {
      su('Il collegamento è scaduto: si rifà con «Connetti account».', null, true);
      return;
    }

    posta(GETTONE, {
      client_id: c.cliente,
      grant_type: 'refresh_token',
      refresh_token: c.rinnovo
    }, function (guaio, esito) {
      if (guaio) { su(guaio); return; }

      if (esito.stato !== 200 || !esito.dati || !esito.dati.access_token) {
        su('Il collegamento è scaduto e Twitch non me lo rinnova: si rifà con «Connetti account».', null, true);
        return;
      }

      c.gettone = String(esito.dati.access_token);
      if (esito.dati.refresh_token) { c.rinnovo = String(esito.dati.refresh_token); }
      c.scade = Date.now() + (parseInt(esito.dati.expires_in, 10) || 14400) * 1000;

      if (!scrivi(c)) {
        su('Twitch mi ha rinnovato il collegamento ma non riesco a ricordarmelo.');
        return;
      }
      su(null, leggi());
    });
  }

  function pronto(su) {
    var c = leggi();
    if (!c) { su('Non sei collegato: si parte da «Connetti account».', null, true); return; }

    if (c.scade === 0 || c.scade - Date.now() > MARGINE) { su(null, c); return; }
    rinnova(su);
  }

  function canale(nome, su) {
    var pulito = String(nome || '').trim().toLowerCase();
    if (!MODELLO_CANALE.test(pulito)) { su('Il nome del canale non va bene.'); return; }

    if (canali[pulito]) { su(null, canali[pulito]); return; }

    pronto(function (guaio, c) {
      if (guaio) { su(guaio, null, true); return; }

      chiama(UTENTI + '?login=' + encodeURIComponent(pulito), {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + c.gettone, 'Client-Id': c.cliente }
      }, function (guaioDue, esito) {
        if (guaioDue) { su(guaioDue); return; }

        var voce = esito.dati && esito.dati.data && esito.dati.data[0];
        if (!voce || !voce.id) {
          su('Twitch non conosce nessun canale che si chiami «' + pulito + '».');
          return;
        }

        canali[pulito] = String(voce.id);
        su(null, canali[pulito]);
      });
    });
  }

  function spedisci(c, canaleId, testo, riprova, su) {
    chiama(MESSAGGI, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + c.gettone,
        'Client-Id': c.cliente,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        broadcaster_id: canaleId,
        sender_id: c.utenteId,
        message: testo
      })
    }, function (guaio, esito) {
      if (guaio) { su(guaio); return; }

      if (esito.stato === 401 && riprova) {
        rinnova(function (guaioTre, nuovo) {
          if (guaioTre) { su(guaioTre, null, true); return; }
          spedisci(nuovo, canaleId, testo, false, su);
        });
        return;
      }

      if (esito.stato === 401) {
        su('Twitch non mi riconosce più: si rifà con «Connetti account».', null, true);
        return;
      }
      if (esito.stato === 403) {
        su('Twitch non mi lascia scrivere in questo canale.');
        return;
      }
      if (esito.stato === 429) {
        su('Sto andando troppo forte per Twitch. Aspetto qualche secondo e riprovo.');
        return;
      }
      if (esito.stato !== 200) {
        su(guaioDi(esito, 'Twitch ha risposto ' + esito.stato + ' e non l’ha mandato.'));
        return;
      }

      var voce = esito.dati && esito.dati.data && esito.dati.data[0];
      if (!voce) { su('Twitch ha risposto senza dire se l’ha mandato.'); return; }

      if (voce.is_sent === false) {
        var motivo = voce.drop_reason && voce.drop_reason.message;
        su(motivo ? 'Twitch non l’ha fatto passare: ' + motivo
                  : 'Twitch non l’ha fatto passare.');
        return;
      }

      su(null, true);
    });
  }

  var HELIX = 'https://api.twitch.tv/helix';

  function bussa(c, metodo, percorso, corpo, riprova, su) {
    var opzioni = {
      method: metodo,
      headers: {
        Authorization: 'Bearer ' + c.gettone,
        'Client-Id': c.cliente
      }
    };

    if (corpo) {
      opzioni.headers['Content-Type'] = 'application/json';
      opzioni.body = JSON.stringify(corpo);
    }

    chiama(HELIX + percorso, opzioni, function (guaio, esito) {
      if (guaio) { su(guaio); return; }

      if (esito.stato === 401) {
        var detto = String((esito.dati && esito.dati.message) || '');

        if (/scope/i.test(detto)) {
          su('A Twitch manca un permesso per questa cosa: ' + detto +
             '. Si rimedia con «Connetti account», che li richiede tutti.');
          return;
        }

        if (riprova) {
          rinnova(function (guaioDue, nuovo) {
            if (guaioDue) { su(guaioDue, null, true); return; }
            bussa(nuovo, metodo, percorso, corpo, false, su);
          });
          return;
        }

        su(detto
          ? 'Twitch non l’ha accettata: ' + detto
          : 'Twitch non mi riconosce più: si rifà con «Connetti account».', null, !detto);
        return;
      }

      if (esito.stato === 403) {
        su(guaioDi(esito, 'Twitch dice di no: per questa cosa servono i permessi di moderatore sul canale.'));
        return;
      }
      if (esito.stato === 429) {
        su('Sto andando troppo forte per Twitch. Aspetto qualche secondo e riprovo.');
        return;
      }
      if (esito.stato < 200 || esito.stato > 299) {
        su(guaioDi(esito, 'Twitch ha risposto ' + esito.stato + '.'));
        return;
      }

      su(null, esito.dati);
    });
  }

  function verso(metodo, percorso, corpo, su) {
    pronto(function (guaio, c) {
      if (guaio) { su(guaio, null, true); return; }
      bussa(c, metodo, percorso, corpo, true, su);
    });
  }

  function manda(opzioni, su) {
    var o = opzioni || {};
    var testo = ripulisci(o.testo);

    if (!testo) { su('Non c’è niente da mandare.'); return; }

    canale(o.canale, function (guaio, canaleId, scollegato) {
      if (guaio) { su(guaio, null, scollegato); return; }

      pronto(function (guaioDue, c) {
        if (guaioDue) { su(guaioDue, null, true); return; }
        spedisci(c, canaleId, testo, true, su);
      });
    });
  }

  function scollega() {
    var c = leggi();

    if (c) {
      posta(REVOCA, { client_id: c.cliente, token: c.gettone }, function () {  });
    }
    ferma();
    dimentica();
  }

  window.Conto = {
    LIMITE: LIMITE,
    SCOPI: SCOPI,
    MODELLO_CLIENT: MODELLO_CLIENT,
    MODELLO_CODICE: MODELLO_CODICE,
    serveClientId: serveClientId,

    ripulisci: ripulisci,

    leggi: leggi,
    rileggi: rileggi,
    chi: chi,
    cliente: cliente,
    puo: puo,
    mancano: mancano,
    verso: verso,
    ricorda: ricorda,
    collegato: collegato,
    scaduto: scaduto,

    chiedi: chiedi,
    ferma: ferma,
    scollega: scollega,

    canale: canale,
    manda: manda
  };
}());
