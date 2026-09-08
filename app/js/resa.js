(function () {
  'use strict';

  var MAX_NOME = 25;

  var MAX_CITAZIONE = 70;

  var DURATA_ENTRATA = 400;

  var DURATE_ENTRATA = { glitch: 900 };

  function durataEntrata(effetto) {

    var base = DURATA_ENTRATA;
    if (Object.prototype.hasOwnProperty.call(DURATE_ENTRATA, effetto)) {
      base = DURATE_ENTRATA[effetto];
    }

    return Math.round(base * (100 / conf.velocita));
  }

  var DURATA_USCITA = 400;

  var INDIRIZZO_BUONO = /^(?:https:\/\/|data:image\/svg\+xml,)/;

  var CONTROLLO = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

  var ZALGO = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u0610-\u061a\u064b-\u065f\u06d6-\u06dc\u0e31\u0e34-\u0e3a\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20f0\ufe20-\ufe2f]{3,}/g;

  function domaZalgo(testo) {
    return testo.replace(ZALGO, function (pila) { return pila.slice(0, 2); });
  }

  function sicuroTesto(valore) {
    return domaZalgo(String(valore === undefined || valore === null ? '' : valore)
      .replace(CONTROLLO, ''));
  }

  var nodi = {
    radice: null,
    elenco: null,
    spia: null,
    spiaTesto: null
  };

  var conf = {
    max: 40,
    svanisci: 0,
    orario: false,
    verso: 'su',
    moderazione: 'sbarra',
    effetto: 'scivola',

    velocita: 100,

    multi: false,

    anima: true
  };

  var menoMovimento = false;
  try {
    menoMovimento = !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (err) {  }

  var righe = [];

  var timer = [];

  var primoArrivato = false;

  var LUM_FONDO = 0.006;

  var LUM_MINIMA = 4.5 * (LUM_FONDO + 0.05) - 0.05;

  function lineare(canale) {
    var v = canale / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }

  function luminanza(r, g, b) {
    return 0.2126 * lineare(r) + 0.7152 * lineare(g) + 0.0722 * lineare(b);
  }

  function leggiEsadecimale(valore) {
    var testo = String(valore || '').trim();
    if (testo.charAt(0) !== '#') { return null; }
    testo = testo.slice(1);

    if (testo.length === 3) {
      testo = testo.charAt(0) + testo.charAt(0) +
              testo.charAt(1) + testo.charAt(1) +
              testo.charAt(2) + testo.charAt(2);
    }
    if (testo.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(testo)) { return null; }

    return [
      parseInt(testo.slice(0, 2), 16),
      parseInt(testo.slice(2, 4), 16),
      parseInt(testo.slice(4, 6), 16)
    ];
  }

  function versoEsadecimale(rgb) {
    var pezzi = '#';
    var i;
    for (i = 0; i < 3; i++) {
      var n = Math.max(0, Math.min(255, Math.round(rgb[i])));
      pezzi += (n < 16 ? '0' : '') + n.toString(16);
    }
    return pezzi;
  }

  function versoHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var l = (max + min) / 2;
    var h = 0;
    var s = 0;

    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r)      { h = (g - b) / d + (g < b ? 6 : 0); }
      else if (max === g) { h = (b - r) / d + 2; }
      else                { h = (r - g) / d + 4; }
      h /= 6;
    }
    return [h, s, l];
  }

  function daHsl(h, s, l) {
    function canale(p, q, t) {
      if (t < 0) { t += 1; }
      if (t > 1) { t -= 1; }
      if (t < 1 / 6) { return p + (q - p) * 6 * t; }
      if (t < 1 / 2) { return q; }
      if (t < 2 / 3) { return p + (q - p) * (2 / 3 - t) * 6; }
      return p;
    }

    if (s === 0) { return [l * 255, l * 255, l * 255]; }

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    return [
      canale(p, q, h + 1 / 3) * 255,
      canale(p, q, h) * 255,
      canale(p, q, h - 1 / 3) * 255
    ];
  }

  function schiarisci(rgb) {
    var hsl = versoHsl(rgb[0], rgb[1], rgb[2]);
    var l = hsl[2];
    var tentativi = 0;
    var fuori = rgb;

    while (luminanza(fuori[0], fuori[1], fuori[2]) < LUM_MINIMA && tentativi < 20) {
      l = Math.min(1, l + 0.03);
      fuori = daHsl(hsl[0], hsl[1], l);
      tentativi++;
    }
    return fuori;
  }

  function impronta(testo) {
    var n = 5381;
    var i;
    for (i = 0; i < testo.length; i++) {
      n = ((n << 5) + n + testo.charCodeAt(i)) | 0;
    }
    return Math.abs(n);
  }

  function tinta(colore, nick) {
    var rgb = leggiEsadecimale(colore);

    if (!rgb) {
      return 'var(--nick-' + (impronta(String(nick || '')) % 16) + ')';
    }
    if (luminanza(rgb[0], rgb[1], rgb[2]) >= LUM_MINIMA) {
      return versoEsadecimale(rgb);
    }
    return versoEsadecimale(schiarisci(rgb));
  }

  function crea(tag, classe, testo) {
    var nodo = document.createElement(tag);
    if (classe) { nodo.className = classe; }
    if (testo !== undefined && testo !== null) { nodo.textContent = String(testo); }
    return nodo;
  }

  function ripulisci(valore, tetto) {
    var pulito = domaZalgo(
      String(valore === undefined || valore === null ? '' : valore).replace(CONTROLLO, '')
    ).trim();
    if (!tetto || pulito.length <= tetto) { return pulito; }

    var lettere = Array.from(pulito);
    if (lettere.length <= tetto) { return pulito; }
    return lettere.slice(0, tetto - 1).join('') + '…';
  }

  function indirizzoBuono(url) {
    return typeof url === 'string' && INDIRIZZO_BUONO.test(url);
  }

  function immagine(classe, url, url2, alt, titolo) {
    if (!indirizzoBuono(url)) { return null; }

    var img = document.createElement('img');
    img.className = classe;
    img.setAttribute('src', url);
    if (indirizzoBuono(url2)) { img.setAttribute('srcset', url + ' 1x, ' + url2 + ' 2x'); }
    img.setAttribute('alt', alt === undefined ? '' : String(alt));
    if (titolo) { img.setAttribute('title', String(titolo)); }

    img.setAttribute('decoding', 'async');
    return img;
  }

  function disegnaCorpo(pezzi, tintaNome) {
    var corpo = crea('p', 'pollaio__corpo');
    var i;

    for (i = 0; i < pezzi.length; i++) {
      var pezzo = pezzi[i] || {};

      if (pezzo.tipo === 'emote') {
        attaccaEmote(corpo, pezzo);

      } else if (pezzo.tipo === 'cheer') {
        var cheer = immagine('pollaio__cheer', pezzo.url, pezzo.url2, pezzo.nome, pezzo.nome);
        if (cheer) { corpo.appendChild(cheer); }
        corpo.appendChild(crea('b', 'pollaio__bits', pezzo.bits));
        corpo.appendChild(document.createTextNode(' '));

      } else if (pezzo.tipo === 'menzione') {
        corpo.appendChild(crea('span', 'pollaio__menzione', pezzo.nome));

      } else if (pezzo.tipo === 'link') {

        corpo.appendChild(crea('span', 'pollaio__link', pezzo.testo));

      } else if (pezzo.tipo === 'testo') {
        corpo.appendChild(document.createTextNode(sicuroTesto(pezzo.testo)));
      }
    }

    if (tintaNome) { corpo.style.setProperty('--tinta', tintaNome); }
    return corpo;
  }

  var CACHE_FERME = Object.create(null);

  function congela(img, indirizzo) {
    if (!indirizzo) { return; }

    if (CACHE_FERME[indirizzo]) {
      img.removeAttribute('srcset');
      img.src = CACHE_FERME[indirizzo];
      return;
    }

    var lettore = new Image();

    lettore.crossOrigin = 'anonymous';

    lettore.onload = function () {
      try {
        var tela = document.createElement('canvas');
        tela.width = lettore.naturalWidth || 56;
        tela.height = lettore.naturalHeight || 56;

        var pennello = tela.getContext('2d');
        if (!pennello) { return; }
        pennello.drawImage(lettore, 0, 0);

        var fermo = tela.toDataURL('image/png');
        CACHE_FERME[indirizzo] = fermo;

        img.removeAttribute('srcset');
        img.src = fermo;
      } catch (err) {

      }
    };

    lettore.src = indirizzo;
  }

  function attaccaEmote(corpo, pezzo) {
    var img = immagine('pollaio__emote', pezzo.url, pezzo.url2, pezzo.nome, pezzo.nome);

    if (!img) {
      corpo.appendChild(document.createTextNode(String(pezzo.nome || '')));
      return;
    }
    if (pezzo.fonte) { img.setAttribute('data-fonte', pezzo.fonte); }
    if (!conf.anima && pezzo.animata) { congela(img, pezzo.url); }

    if (pezzo.sovrapposta) {
      var ultimo = corpo.lastElementChild;

      if (ultimo && ultimo.className === 'pollaio__pila') {
        img.className = 'pollaio__emote is-sopra';
        ultimo.appendChild(img);
        return;
      }
      if (ultimo && ultimo.className === 'pollaio__emote') {
        var pila = crea('span', 'pollaio__pila');
        corpo.replaceChild(pila, ultimo);
        pila.appendChild(ultimo);
        img.className = 'pollaio__emote is-sopra';
        pila.appendChild(img);
        return;
      }
    }

    corpo.appendChild(img);
  }

  var NOMI_FONTE = {
    twitch: 'Twitch',
    youtube: 'YouTube',
    kick: 'Kick',
    tiktok: 'TikTok'
  };

  function disegnaFonte(messaggio) {
    if (!conf.multi) { return null; }

    var chiave = String(messaggio.piattaforma || '').toLowerCase();

    if (!Object.prototype.hasOwnProperty.call(NOMI_FONTE, chiave)) { return null; }

    var targhetta = crea('p', 'pollaio__fonte', NOMI_FONTE[chiave]);
    targhetta.setAttribute('data-fonte', chiave);
    return targhetta;
  }

  function disegnaTesta(messaggio, tintaNome) {
    var testa = crea('p', 'pollaio__testa');

    if (conf.orario) {
      var data = new Date(messaggio.ts || Date.now());
      var ore = data.getHours();
      var minuti = data.getMinutes();
      testa.appendChild(crea('span', 'pollaio__orario',
        (ore < 10 ? '0' : '') + ore + ':' + (minuti < 10 ? '0' : '') + minuti));
    }

    var badge = messaggio.badge || [];
    if (badge.length) {
      var scatola = crea('span', 'pollaio__distintivi');
      var i;
      var attaccati = 0;

      for (i = 0; i < badge.length; i++) {

        var d = immagine('pollaio__distintivo', badge[i].url, badge[i].url2, '', badge[i].titolo);
        if (d) { scatola.appendChild(d); attaccati++; }
      }
      if (attaccati) { testa.appendChild(scatola); }
    }

    var nome = crea('span', 'pollaio__nome', ripulisci(messaggio.nome || messaggio.nick, MAX_NOME));
    nome.style.setProperty('--tinta', tintaNome);
    testa.appendChild(nome);

    return testa;
  }

  function disegnaRisposta(risposta) {
    var blocco = crea('p', 'pollaio__risposta');
    blocco.appendChild(crea('span', 'pollaio__risposta-nome', ripulisci(risposta.nome, MAX_NOME)));
    blocco.appendChild(crea('span', 'pollaio__risposta-testo', ripulisci(risposta.testo, MAX_CITAZIONE)));
    return blocco;
  }

  function disegnaEvento(messaggio) {
    var evento = messaggio.evento;
    var riga = crea('li', 'pollaio__riga pollaio__evento');
    riga.setAttribute('data-tinta', evento.tinta || 'viola');

    riga.appendChild(crea('p', 'pollaio__evento-titolo', evento.titolo));

    if (messaggio.nome || messaggio.nick) {
      riga.appendChild(crea('p', 'pollaio__evento-nome',
        ripulisci(messaggio.nome || messaggio.nick, MAX_NOME)));
    }
    if (evento.dettaglio) {
      riga.appendChild(crea('p', 'pollaio__evento-dettaglio', evento.dettaglio));
    }
    if (evento.livello) {
      riga.appendChild(crea('span', 'pollaio__evento-piano', evento.livello));
    }

    if (messaggio.pezzi && messaggio.pezzi.length) {
      riga.appendChild(disegnaCorpo(messaggio.pezzi, null));
    }
    return riga;
  }

  function disegnaModerazione(messaggio) {
    var riga = crea('li', 'pollaio__riga pollaio__moderazione');
    riga.appendChild(crea('p', 'pollaio__moderazione-testo', messaggio.evento.frase));
    return riga;
  }

  function disegna(messaggio) {
    if (messaggio.evento && messaggio.tipo === 'sistema') { return disegnaModerazione(messaggio); }
    if (messaggio.evento && messaggio.tipo === 'evento')  { return disegnaEvento(messaggio); }

    var colore = tinta(messaggio.colore, messaggio.nick);
    var riga = crea('li', 'pollaio__riga');
    var ruoli = messaggio.ruoli || {};

    riga.setAttribute('data-rilievo', messaggio.rilievo ? messaggio.rilievo.livello : 0);
    if (messaggio.id) { riga.setAttribute('data-id', messaggio.id); }
    if (messaggio.nick) { riga.setAttribute('data-nick', messaggio.nick); }

    if (ruoli.capo) { riga.classList.add('is-capo'); }
    if (ruoli.mod)  { riga.classList.add('is-mod'); }
    if (ruoli.vip)  { riga.classList.add('is-vip'); }
    if (messaggio.tipo === 'azione') { riga.classList.add('is-azione'); }

    var fonte = disegnaFonte(messaggio);
    if (fonte) { riga.appendChild(fonte); }

    if (messaggio.rilievo && messaggio.rilievo.etichetta) {
      riga.appendChild(crea('p', 'pollaio__etichetta', messaggio.rilievo.etichetta));
    }
    if (messaggio.risposta) {
      riga.appendChild(disegnaRisposta(messaggio.risposta));
    }

    riga.appendChild(disegnaTesta(messaggio, colore));
    riga.appendChild(disegnaCorpo(messaggio.pezzi || [], messaggio.tipo === 'azione' ? colore : null));

    return riga;
  }

  function fra(fn, ms) {
    var id = setTimeout(function () {
      var i = timer.indexOf(id);
      if (i !== -1) { timer.splice(i, 1); }
      fn();
    }, ms);
    timer.push(id);
    return id;
  }

  function spegni(id) {
    if (!id) { return; }
    clearTimeout(id);
    var i = timer.indexOf(id);
    if (i !== -1) { timer.splice(i, 1); }
  }

  function togli(riga) {
    var posto = righe.indexOf(riga);
    if (posto !== -1) { righe.splice(posto, 1); }

    spegni(riga.__uscita);
    spegni(riga.__entrata);
    riga.__uscita = null;
    riga.__entrata = null;

    if (riga.parentNode) { riga.parentNode.removeChild(riga); }
  }

  function sfuma(riga) {
    var posto = righe.indexOf(riga);
    if (posto !== -1) { righe.splice(posto, 1); }

    riga.classList.add('is-svanisce');
    riga.__uscita = fra(function () {
      riga.__uscita = null;
      if (riga.parentNode) { riga.parentNode.removeChild(riga); }
    }, DURATA_USCITA);
  }

  var PER_FOTOGRAMMA = 8;

  var CODA_MAX = 60;

  var coda = [];
  var codaArmata = false;

  function drena() {
    codaArmata = false;
    var quanti = Math.min(PER_FOTOGRAMMA, coda.length);
    var i;
    for (i = 0; i < quanti; i++) { disegnaEAppendi(coda.shift()); }
    if (coda.length) { arma(); }
  }

  function arma() {
    if (codaArmata) { return; }
    codaArmata = true;

    var fatto = false;
    function unaVolta() {
      if (fatto) { return; }
      fatto = true;
      drena();
    }

    if (typeof requestAnimationFrame === 'function') { requestAnimationFrame(unaVolta); }
    fra(unaVolta, 100);
  }

  function disegnaEAppendi(messaggio) {
    var riga;
    try {
      riga = disegna(messaggio);
    } catch (err) {

      console.warn('[pollaio] non sono riuscito a disegnare un messaggio:', err);
      return null;
    }
    if (!riga) { return null; }

    togliSpia();

    riga.classList.add('is-nuovo');

    if (conf.verso === 'giu' && nodi.elenco.firstChild) {
      nodi.elenco.insertBefore(riga, nodi.elenco.firstChild);
    } else {
      nodi.elenco.appendChild(riga);
    }
    righe.push(riga);

    riga.__entrata = fra(function () {
      riga.__entrata = null;
      riga.classList.remove('is-nuovo');
    }, durataEntrata(conf.effetto));

    if (conf.effetto === 'matrix' && !menoMovimento) { scombina(riga); }

    while (righe.length > conf.max) {
      togli(righe[0]);
    }

    if (conf.svanisci > 0) {
      riga.__uscita = fra(function () { sfuma(riga); }, conf.svanisci * 1000);
    }

    return riga;
  }

  function aggiungi(messaggio) {
    if (!nodi.elenco || !messaggio) { return false; }

    coda.push(messaggio);
    while (coda.length > CODA_MAX) { coda.shift(); }
    arma();
    return true;
  }

  function cancella(id) {
    if (!nodi.elenco || !id || conf.moderazione === 'tieni') { return; }

    var trovata = nodi.elenco.querySelector('[data-id="' + String(id).replace(/["\\]/g, '') + '"]');
    if (!trovata) { return; }

    if (conf.moderazione === 'togli') { togli(trovata); return; }
    trovata.classList.add('is-cancellato');
  }

  function cancellaDi(nick) {
    if (!nodi.elenco || !nick || conf.moderazione === 'tieni') { return; }

    var pulito = String(nick).toLowerCase().replace(/["\\]/g, '');
    var trovate = nodi.elenco.querySelectorAll('[data-nick="' + pulito + '"]');
    var i;

    for (i = 0; i < trovate.length; i++) {
      if (conf.moderazione === 'togli') { togli(trovate[i]); }
      else { trovate[i].classList.add('is-cancellato'); }
    }
  }

  function svuota() {
    var i;
    for (i = 0; i < timer.length; i++) { clearTimeout(timer[i]); }
    timer = [];
    righe = [];

    coda = [];

    codaArmata = false;

    if (nodi.elenco) { nodi.elenco.textContent = ''; }
  }

  var battitoTreno = null;
  var scadenzaTreno = 0;

  function tempoUmano(secondi) {
    var s = Math.max(0, Math.round(secondi));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function scriviTempo() {
    if (!nodi.trenoTempo) { return; }
    var restano = Math.round((scadenzaTreno - Date.now()) / 1000);
    nodi.trenoTempo.textContent = restano > 0 ? tempoUmano(restano) : '';

    if (restano <= 0) { fermaBattito(); }
  }

  function fermaBattito() {
    clearInterval(battitoTreno);
    battitoTreno = null;
  }

  function treno(stato) {
    if (!nodi.treno) { return; }
    var s = stato || { fase: 'niente' };

    if (s.fase === 'niente') {
      fermaBattito();
      nodi.treno.hidden = true;
      nodi.treno.setAttribute('data-fase', 'niente');
      return;
    }

    nodi.treno.hidden = false;
    nodi.treno.setAttribute('data-fase', s.fase);

    if (s.golden) { nodi.treno.setAttribute('data-golden', '1'); }
    else { nodi.treno.removeAttribute('data-golden'); }

    if (nodi.trenoTitolo) {
      nodi.trenoTitolo.textContent =
        s.fase === 'arrivo' ? 'Treno in arrivo' :
        s.fase === 'finito' ? 'Treno finito' :
        s.golden            ? 'Golden Kappa Train' : 'Hype Train';
    }

    if (nodi.trenoLivello) {

      nodi.trenoLivello.textContent =
        s.fase === 'arrivo'
          ? (s.mancano > 0 ? 'Mancano ' + s.mancano : 'Ci siamo')
          : 'Livello ' + s.livello;
    }

    if (nodi.trenoRiempimento) {
      nodi.trenoRiempimento.style.setProperty('--percento', s.percento + '%');
    }

    if (nodi.trenoPunti) {
      nodi.trenoPunti.textContent =
        s.fase === 'arrivo' ? (s.partecipanti + ' in ballo')
                            : (s.punti + ' / ' + s.meta);
    }

    fermaBattito();
    if (s.fase === 'finito' || !s.restano) {
      if (nodi.trenoTempo) { nodi.trenoTempo.textContent = ''; }
      return;
    }

    scadenzaTreno = Date.now() + s.restano * 1000;
    scriviTempo();
    battitoTreno = setInterval(scriviTempo, 1000);
  }

  var GLIFI = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+=<>/\\|';

  var DURATA_MATRIX = 380;

  var MAX_MATRIX = 140;

  var MAX_IN_VOLO = 4;

  var inVolo = 0;

  function pescaGlifo() {
    return GLIFI.charAt((Math.random() * GLIFI.length) | 0);
  }

  function scombina(riga) {
    if (inVolo >= MAX_IN_VOLO) { return; }

    var corpo = riga.querySelector('.pollaio__corpo');
    if (!corpo) { return; }

    var pezzi = [];
    var totale = 0;
    var i;
    for (i = 0; i < corpo.childNodes.length; i++) {
      var n = corpo.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue) {
        pezzi.push({ nodo: n, vero: n.nodeValue });
        totale += n.nodeValue.length;
      }
    }
    if (!pezzi.length || totale > MAX_MATRIX) { return; }

    inVolo++;
    var partito = 0;
    var finito = false;

    var durata = Math.round(DURATA_MATRIX * (100 / conf.velocita));

    function rimetti() {
      if (finito) { return; }
      finito = true;
      inVolo--;
      var k;
      for (k = 0; k < pezzi.length; k++) { pezzi[k].nodo.nodeValue = pezzi[k].vero; }
    }

    function passo(ora) {
      if (finito) { return; }
      if (!partito) { partito = ora; }

      if (!riga.parentNode) { rimetti(); return; }

      var avanti = Math.min(1, (ora - partito) / durata);
      var risolti = Math.floor(avanti * totale);
      var visti = 0;
      var p;

      for (p = 0; p < pezzi.length; p++) {
        var vero = pezzi[p].vero;
        var fuori = '';
        var c;
        for (c = 0; c < vero.length; c++) {
          if (visti + c < risolti || vero.charAt(c) === ' ') { fuori += vero.charAt(c); }
          else { fuori += pescaGlifo(); }
        }
        pezzi[p].nodo.nodeValue = fuori;
        visti += vero.length;
      }

      if (avanti >= 1) { rimetti(); return; }
      requestAnimationFrame(passo);
    }

    requestAnimationFrame(passo);

    fra(rimetti, durata + 600);
  }

  function spia(stato, testo) {
    if (!nodi.spia) { return; }
    var s = String(stato || 'spenta');

    if (s === 'collego' || s === 'riprovo' || s === 'resa') { primoArrivato = false; }

    nodi.spia.setAttribute('data-stato', s);
    if (nodi.spiaTesto && testo !== undefined) { nodi.spiaTesto.textContent = String(testo); }
  }

  function togliSpia() {
    if (primoArrivato || !nodi.spia) { return; }
    primoArrivato = true;
    if (nodi.spia.getAttribute('data-stato') === 'accesa') { spia('spenta', ''); }
  }

  function imposta(opzioni) {
    var o = opzioni || {};
    if (typeof o.max === 'number')      { conf.max = Math.max(1, o.max); }
    if (typeof o.svanisci === 'number') { conf.svanisci = Math.max(0, o.svanisci); }
    if (typeof o.orario === 'boolean')  { conf.orario = o.orario; }
    if (o.verso)                        { conf.verso = o.verso; }
    if (o.moderazione)                  { conf.moderazione = o.moderazione; }
    if (o.effetto)                      { conf.effetto = o.effetto; }

    if (typeof o.velocita === 'number' && isFinite(o.velocita) && o.velocita > 0) {
      conf.velocita = Math.max(25, Math.min(300, o.velocita));
    }

    if (typeof o.multi === 'boolean') { conf.multi = o.multi; }
    if (typeof o.anima === 'boolean') { conf.anima = o.anima; }
  }

  function monta(radice, opzioni) {
    if (!radice) { return false; }

    nodi.radice = radice;
    nodi.elenco = radice.querySelector('.pollaio__elenco');
    nodi.spia = radice.querySelector('.pollaio__spia');
    nodi.spiaTesto = radice.querySelector('.pollaio__spia-testo');

    nodi.treno = radice.querySelector('.pollaio__treno');
    nodi.trenoTitolo = radice.querySelector('.pollaio__treno-titolo');
    nodi.trenoLivello = radice.querySelector('.pollaio__treno-livello');
    nodi.trenoRiempimento = radice.querySelector('.pollaio__treno-riempimento');
    nodi.trenoPunti = radice.querySelector('.pollaio__treno-punti');
    nodi.trenoTempo = radice.querySelector('.pollaio__treno-tempo');

    imposta(opzioni);
    return !!nodi.elenco;
  }

  window.Resa = {
    monta: monta,
    imposta: imposta,
    aggiungi: aggiungi,
    cancella: cancella,
    cancellaDi: cancellaDi,
    svuota: svuota,
    spia: spia,
    treno: treno,
    tinta: tinta,
    quante: function () { return righe.length; }
  };

}());
