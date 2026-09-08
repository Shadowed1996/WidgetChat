(function () {
  'use strict';

  var INDIRIZZO = 'https://gql.twitch.tv/gql';

  var CLIENTE = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

  var DOMANDA =
    'query($n:String!){channel(name:$n){hypeTrain{' +
      'approaching{goal expiresAt participants}' +
      'execution{id startedAt expiresAt endedAt isGoldenKappaTrain' +
        'progress{goal total remainingSeconds level{value goal}}}' +
    '}}}';

  var TETTO_TEMPO = 8000;

  var RITMO_FERMO   = 60000;
  var RITMO_ARRIVO  =  6000;
  var RITMO_CORSA   =  5000;

  var ERRORI_MAX = 5;

  var CODA_FINE = 12000;

  var conf = { canale: '', su: null };
  var timer = null;
  var acceso = false;
  var errori = 0;
  var inVolo = false;

  var ultimo = null;
  var ultimaFirma = '';
  var timerCoda = null;

  function daRisposta(dati) {
    var canale = dati && dati.data && dati.data.channel;
    var treno = canale && canale.hypeTrain;
    if (!treno) { return { fase: 'niente' }; }

    var e = treno.execution;
    if (e && !e.endedAt) {
      var p = e.progress || {};
      var meta = p.goal || 0;
      var punti = p.total || 0;

      return {
        fase: 'corsa',
        livello: (p.level && p.level.value) || 1,
        punti: punti,
        meta: meta,

        percento: meta > 0 ? Math.min(100, Math.round(punti / meta * 100)) : 0,
        restano: p.remainingSeconds || 0,
        golden: e.isGoldenKappaTrain === true,
        partecipanti: 0,
        mancano: 0
      };
    }

    var a = treno.approaching;
    if (a) {
      var quanti = (a.participants && a.participants.length) || 0;
      var obiettivo = a.goal || 0;

      return {
        fase: 'arrivo',
        livello: 0,
        punti: quanti,
        meta: obiettivo,
        percento: obiettivo > 0 ? Math.min(100, Math.round(quanti / obiettivo * 100)) : 0,
        restano: secondiA(a.expiresAt),
        golden: false,
        partecipanti: quanti,

        mancano: Math.max(0, obiettivo - quanti)
      };
    }

    return { fase: 'niente' };
  }

  function secondiA(quando) {
    if (!quando) { return 0; }
    var t = Date.parse(quando);
    if (isNaN(t)) { return 0; }
    return Math.max(0, Math.round((t - Date.now()) / 1000));
  }

  function firma(s) {
    return s.fase + '|' + s.livello + '|' + s.punti + '|' + s.meta + '|' +
           s.golden + '|' + s.mancano;
  }

  function prossimoRitmo(stato) {
    if (!stato) { return RITMO_FERMO; }
    if (stato.fase === 'corsa')  { return RITMO_CORSA; }
    if (stato.fase === 'arrivo') { return RITMO_ARRIVO; }
    return RITMO_FERMO;
  }

  function riarma(attesa) {
    clearTimeout(timer);
    if (!acceso) { return; }
    timer = setTimeout(guarda, attesa);
  }

  function guarda() {
    if (!acceso || inVolo) { return; }
    if (typeof fetch !== 'function') { return; }

    inVolo = true;
    ultimaLettura = Date.now();

    var taglio = null;
    var opzioni = {
      method: 'POST',
      headers: { 'Client-Id': CLIENTE, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: DOMANDA, variables: { n: conf.canale } })
    };

    try {
      if (typeof AbortController === 'function') {
        var ctrl = new AbortController();
        opzioni.signal = ctrl.signal;
        taglio = setTimeout(function () { try { ctrl.abort(); } catch (err) {  } }, TETTO_TEMPO);
      }
    } catch (err) {  }

    fetch(INDIRIZZO, opzioni).then(function (r) {
      clearTimeout(taglio);
      if (!r || !r.ok) { throw new Error('risposta ' + (r && r.status)); }
      return r.json();
    }).then(function (dati) {

      if (dati && dati.errors) { throw new Error("la domanda non e piaciuta"); }

      inVolo = false;
      errori = 0;

      if (!acceso) { return; }

      var stato = daRisposta(dati);
      consegna(stato);
      riarma(prossimoRitmo(stato));

    })['catch'](function () {

      clearTimeout(taglio);
      inVolo = false;
      errori++;

      if (errori >= ERRORI_MAX) {
        console.warn('[pollaio] rinuncio all’hype train dopo ' + errori + ' tentativi andati male.');
        ferma();
        return;
      }

      riarma(RITMO_FERMO * errori);
    });
  }

  function consegna(stato) {

    if (stato.fase === 'niente' && ultimo && ultimo.fase === 'corsa') {
      var fine = {
        fase: 'finito',
        livello: ultimo.livello,
        punti: ultimo.punti,
        meta: ultimo.meta,
        percento: ultimo.percento,
        restano: 0,
        golden: ultimo.golden,
        partecipanti: 0,
        mancano: 0
      };
      avvisa(fine);
      ultimo = stato;
      ultimaFirma = firma(stato);

      clearTimeout(timerCoda);
      timerCoda = setTimeout(function () { avvisa({ fase: 'niente' }); }, CODA_FINE);
      return;
    }

    clearTimeout(timerCoda);

    var f = firma(stato);
    if (f === ultimaFirma) { return; }

    ultimo = stato;
    ultimaFirma = f;
    avvisa(stato);
  }

  function avvisa(stato) {
    if (typeof conf.su !== 'function') { return; }
    try { conf.su(stato); }
    catch (err) { console.warn('[pollaio] chi ascolta il treno è andato in errore:', err); }
  }

  function avvia(opzioni) {
    var o = opzioni || {};
    var canale = String(o.canale || '').toLowerCase().trim();

    if (!/^[a-z0-9_]{1,25}$/.test(canale)) { return false; }
    if (typeof o.su !== 'function') { return false; }
    if (typeof fetch !== 'function') { return false; }

    conf.canale = canale;
    conf.su = o.su;
    acceso = true;
    errori = 0;
    ultimo = null;
    ultimaFirma = '';

    guarda();
    return true;
  }

  function ferma() {
    var eraAcceso = acceso;
    acceso = false;
    clearTimeout(timer);
    clearTimeout(timerCoda);
    timer = null;
    timerCoda = null;

    inVolo = false;

    if (eraAcceso && ultimo && ultimo.fase !== 'niente') {
      ultimo = { fase: 'niente' };
      ultimaFirma = 'niente|0|0|0|false|0';
      avvisa({ fase: 'niente' });
    }
  }

  var RITMO_MINIMO = 3000;
  var ultimaLettura = 0;

  function sveglia() {
    if (!acceso || inVolo) { return; }

    var passato = Date.now() - ultimaLettura;
    clearTimeout(timer);

    if (passato >= RITMO_MINIMO) { guarda(); return; }
    timer = setTimeout(guarda, RITMO_MINIMO - passato);
  }

  window.Treno = {
    avvia: avvia,
    ferma: ferma,
    sveglia: sveglia,
    stato: function () { return ultimo ? ultimo.fase : 'spento'; }
  };

}());
