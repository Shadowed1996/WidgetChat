(function () {
  'use strict';

  const CANALE_PREDEFINITO = 'slayer_beard';

  const BITS_ALTO  = 1000;
  const BITS_MEDIO = 100;

  const MIN_PAROLA = 2;
  const MIN_RADICE = 4;

  const ID_EVIDENZA = 'highlighted-message';
  const ID_ANNUNCIO = 'announcement';
  const ID_RISCATTI = ['gigantified-emote-message', 'animated-message'];

  const PRIMA_PAROLA    = '(?:^|[^0-9a-z_])';
  const PRIMA_MENZIONE  = '(?:^|[^0-9a-z_@])@?';
  const DOPO            = '(?![0-9a-z_])';

  const METACARATTERI = /[.*+?^${}()|[\]\\]/g;

  function scappa(testo) {
    return String(testo).replace(METACARATTERI, '\\$&');
  }

  function interruttore(valore, predefinito) {

    if (valore === undefined || valore === null || valore === '') { return predefinito; }
    if (typeof valore === 'string') { return valore !== '0' && valore.toLowerCase() !== 'false'; }
    return !!valore;
  }

  function numero(valore) {
    const n = typeof valore === 'number' ? valore : parseInt(valore, 10);
    return (isFinite(n) && n > 0) ? Math.floor(n) : 0;
  }

  function numeroIt(n) {
    if (n < 1000) { return String(n); }
    try { return n.toLocaleString('it-IT'); }
    catch (e) { return String(n); }
  }

  function espressione(voci, conChiocciola) {
    if (!voci || !voci.length) { return null; }

    const ordinate = voci.slice().sort(function (a, b) { return b.length - a.length; });
    const pezzi = [];
    for (let i = 0; i < ordinate.length; i++) { pezzi.push(scappa(ordinate[i])); }

    const prima = conChiocciola ? PRIMA_MENZIONE : PRIMA_PAROLA;
    try {

      return new RegExp(prima + '(?:' + pezzi.join('|') + ')' + DOPO, 'i');
    } catch (e) {

      return null;
    }
  }

  let canale = CANALE_PREDEFINITO;
  let parole = [];
  let menzioniAccese = true;
  let primoAcceso = true;

  let reMenzione = null;
  let reParole = null;

  function nickPulito(valore) {
    if (typeof valore !== 'string') { return ''; }
    return valore.toLowerCase().replace(/[^a-z0-9_]/g, '');
  }

  function nomiDelCanale(nick) {
    const nomi = [nick];
    const taglio = nick.indexOf('_');
    if (taglio >= MIN_RADICE) { nomi.push(nick.slice(0, taglio)); }
    return nomi;
  }

  function normalizzaParole(valore) {
    let grezze;
    if (Object.prototype.toString.call(valore) === '[object Array]') { grezze = valore; }
    else if (typeof valore === 'string') { grezze = valore.split(','); }
    else { return []; }

    const pulite = [];
    const visto = {};
    for (let i = 0; i < grezze.length; i++) {

      const voce = String(grezze[i] === undefined || grezze[i] === null ? '' : grezze[i])
        .trim().toLowerCase();
      if (voce.length < MIN_PAROLA) { continue; }

      if (visto['.' + voce]) { continue; }
      visto['.' + voce] = true;
      pulite.push(voce);
    }
    return pulite;
  }

  function imposta(opzioni) {
    const o = (opzioni && typeof opzioni === 'object') ? opzioni : {};

    canale = nickPulito(o.canale) || CANALE_PREDEFINITO;
    parole = normalizzaParole(o.parole);
    menzioniAccese = interruttore(o.menzioni, true);
    primoAcceso = interruttore(o.primo, true);

    reMenzione = espressione(nomiDelCanale(canale), true);
    reParole = espressione(parole, false);
  }

  function testoPiatto(messaggio) {
    const pezzi = messaggio.pezzi;
    if (!pezzi || !pezzi.length) {
      return typeof messaggio.testo === 'string' ? messaggio.testo : '';
    }
    const fuori = [];
    for (let i = 0; i < pezzi.length; i++) {
      const p = pezzi[i];
      if (!p) { continue; }
      if (typeof p.testo === 'string' && p.testo) { fuori.push(p.testo); }
      else if (typeof p.nome === 'string' && p.nome) { fuori.push(p.nome); }
    }
    return fuori.join(' ');
  }

  function identificatore(messaggio) {
    const grezzo =
      messaggio.msgId ||
      messaggio.msgid ||
      messaggio['msg-id'] ||
      (messaggio.tag && messaggio.tag['msg-id']) ||
      (messaggio.tags && messaggio.tags['msg-id']) ||
      '';
    return typeof grezzo === 'string' ? grezzo.toLowerCase() : '';
  }

  function fraGli(id, elenco) {
    for (let i = 0; i < elenco.length; i++) {
      if (elenco[i] === id) { return true; }
    }
    return false;
  }

  function contestoDi(messaggio) {
    let piatto = null;
    return {
      messaggio: messaggio,
      id: identificatore(messaggio),
      bits: numero(messaggio.bits),
      testo: function () {
        if (piatto === null) { piatto = testoPiatto(messaggio); }
        return piatto;
      }
    };
  }

  function èEvidenza(c) { return c.id === ID_EVIDENZA; }

  function èRiscatto(c) { return fraGli(c.id, ID_RISCATTI); }

  function èAnnuncio(c) {
    if (c.id === ID_ANNUNCIO) { return true; }
    const e = c.messaggio.evento;
    return !!(e && e.genere === 'annuncio');
  }

  function bitsDa(soglia) {
    return function (c) { return c.bits >= soglia; };
  }

  function menzionaIlCanale(c) {
    if (!menzioniAccese) { return false; }

    const pezzi = c.messaggio.pezzi;
    if (pezzi) {
      for (let i = 0; i < pezzi.length; i++) {
        if (pezzi[i] && pezzi[i].tipo === 'menzione' && pezzi[i].nostra === true) { return true; }
      }
    }
    return !!reMenzione && reMenzione.test(c.testo());
  }

  function contieneUnaParola(c) {
    return !!reParole && reParole.test(c.testo());
  }

  function èIlPrimo(c) { return primoAcceso && c.messaggio.primo === true; }

  function èUnRitorno(c) { return c.messaggio.ritorno === true; }

  function èUnaRisposta(c) {
    const r = c.messaggio.risposta;
    return !!r && typeof r === 'object';
  }

  function etichettaBits(c) { return numeroIt(c.bits) + ' BITS'; }

  const TAVOLA = [

    { nome: 'evidenza', livello: 3, etichetta: 'MESSAGGIO IN EVIDENZA', tinta: 'magenta',
      accende: èEvidenza, componi: null },
    { nome: 'annuncio', livello: 3, etichetta: 'ANNUNCIO', tinta: 'magenta',
      accende: èAnnuncio, componi: null },
    { nome: 'bits', livello: 3, etichetta: 'BITS', tinta: 'magenta',
      accende: bitsDa(BITS_ALTO), componi: etichettaBits },
    { nome: 'evidenza', livello: 3, etichetta: 'MESSAGGIO IN EVIDENZA', tinta: 'magenta',
      accende: èRiscatto, componi: null },

    { nome: 'menzione', livello: 2, etichetta: 'TI HANNO NOMINATO', tinta: 'ciano',
      accende: menzionaIlCanale, componi: null },
    { nome: 'parola', livello: 2, etichetta: 'PAROLA CHIAVE', tinta: 'ciano',
      accende: contieneUnaParola, componi: null },
    { nome: 'bits', livello: 2, etichetta: 'BITS', tinta: 'ciano',
      accende: bitsDa(BITS_MEDIO), componi: etichettaBits },

    { nome: 'primo', livello: 1, etichetta: 'PRIMO MESSAGGIO', tinta: 'viola',
      accende: èIlPrimo, componi: null },
    { nome: 'ritorno', livello: 1, etichetta: 'BENTORNATO', tinta: 'viola',
      accende: èUnRitorno, componi: null },
    { nome: 'risposta', livello: 1, etichetta: 'RISPOSTA', tinta: 'viola',
      accende: èUnaRisposta, componi: null },

    { nome: 'bits', livello: 1, etichetta: 'BITS', tinta: 'viola',
      accende: bitsDa(1), componi: etichettaBits }
  ];

  const REGOLE = [];
  for (let r = 0; r < TAVOLA.length; r++) {
    REGOLE.push({
      nome: TAVOLA[r].nome,
      livello: TAVOLA[r].livello,
      etichetta: TAVOLA[r].etichetta,
      tinta: TAVOLA[r].tinta
    });
  }

  function valuta(messaggio) {
    if (!messaggio || typeof messaggio !== 'object') { return null; }

    const c = contestoDi(messaggio);

    for (let i = 0; i < TAVOLA.length; i++) {
      const regola = TAVOLA[i];
      if (!regola.accende(c)) { continue; }

      return {
        livello: regola.livello,
        motivo: regola.nome,
        etichetta: regola.componi ? regola.componi(c) : regola.etichetta
      };
    }

    return null;
  }

  function dalleImpostazioni() {
    const v = window.Impostazioni && window.Impostazioni.valori;
    if (!v) { return null; }
    return { canale: v.canale, parole: v.parole, menzioni: v.menzioni, primo: v.primo };
  }

  imposta(dalleImpostazioni());

  window.Rilievo = {
    imposta: imposta,
    valuta: valuta,
    REGOLE: REGOLE
  };
}());
