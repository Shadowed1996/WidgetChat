(function () {
  'use strict';

  const GLOBALI = 'https://api.ivr.fi/v2/twitch/badges/global';
  const DI_CANALE = 'https://api.ivr.fi/v2/twitch/badges/channel';

  const TETTO = 8000;
  const SOLO_HTTPS = /^https:\/\//;

  const PESO = {
    'broadcaster': 0,
    'staff': 1, 'admin': 1, 'global_mod': 1, 'partner': 1,
    'moderator': 2,
    'vip': 3,
    'subscriber': 4, 'founder': 4
  };
  const PESO_RESTO = 5;

  const FORMA_TELECAMERA =
    '<rect x="2" y="5.5" width="14" height="13" rx="3.2"/>' +
    '<path d="M17.4 12L22 6.6V17.4Z"/>';

  const FORMA_SCUDO =
    '<path d="M12 2L20.5 5.4V11.6L12 22L3.5 11.6V5.4Z"/>';

  const FORMA_DIAMANTE =
    '<path d="M12 2.4L22 9.2L12 21.6L2 9.2Z"/>';

  const FORMA_STELLA =
    '<path d="M12 2.6l2.9 5.9 6.5 0.9 -4.7 4.6 1.1 6.5 -5.8 -3.1 -5.8 3.1' +
    ' 1.1 -6.5L2.6 9.4l6.5 -0.9z"/>';

  const FORMA_STELLA_CERCHIATA =
    '<circle cx="12" cy="12" r="10.8" opacity="0.32"/>' + FORMA_STELLA;

  const FORMA_CORONA =
    '<path d="M2.2 7.2L7.5 11L12 4L16.5 11L21.8 7.2L20 18.4H4Z"/>' +
    '<rect x="3.4" y="19.4" width="17.2" height="2.6" rx="1.1"/>';

  const FORMA_DISTINTIVO =
    '<path d="M12 1.4l2.9 2.4 3.7 -0.6 0.9 3.6 3.3 1.8 -1.6 3.4 1.6 3.4' +
    ' -3.3 1.8 -0.9 3.6 -3.7 -0.6 -2.9 2.4 -2.9 -2.4 -3.7 0.6 -0.9 -3.6' +
    ' -3.3 -1.8 1.6 -3.4 -1.6 -3.4 3.3 -1.8 0.9 -3.6 3.7 0.6z"/>';

  const FORMA_PENNELLO =
    '<path d="M16.8 1.8L22.2 7.2L13.4 16L8 10.6Z"/>' +
    '<path d="M6.9 11.7L12.3 17.1L9.6 19.8L3.4 21.2L4.9 15.1Z"/>';

  function disegno(forma, tinta) {

    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"' +
      ' width="18" height="18" fill="' + tinta + '">' + forma + '</svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  function mano(titolo, forma, tinta) {
    const url = disegno(forma, tinta);
    return { titolo: titolo, url: url, url2: url };
  }

  const RIPIEGO = {
    'broadcaster':  mano('Padrone di casa', FORMA_TELECAMERA, '#ff3d5e'),
    'moderator':    mano('Moderatore', FORMA_SCUDO, '#00ad03'),
    'vip':          mano('VIP', FORMA_DIAMANTE, '#e005b9'),
    'subscriber':   mano('Abbonato', FORMA_STELLA, '#8b2fff'),
    'founder':      mano('Fondatore', FORMA_STELLA_CERCHIATA, '#ffc65c'),
    'premium':      mano('Prime', FORMA_CORONA, '#8ab4ff'),
    'staff':        mano('Staff di Twitch', FORMA_DISTINTIVO, '#9a93b0'),
    'admin':        mano('Amministratore Twitch', FORMA_DISTINTIVO, '#9a93b0'),
    'global_mod':   mano('Moderatore globale', FORMA_DISTINTIVO, '#9a93b0'),
    'artist-badge': mano('Artista del canale', FORMA_PENNELLO, '#22e0ff')
  };

  const CATALOGO = {};
  const PRIMA = {};

  let pronto = false;
  let inCorso = null;
  let firmaCarica = '';

  function frase(valore, ripiegoValore) {
    return (typeof valore === 'string' && valore.trim()) ? valore.trim() : ripiegoValore;
  }

  function ha(oggetto, chiave) {
    return Object.prototype.hasOwnProperty.call(oggetto, chiave);
  }

  function sicuro(valore) {
    return (typeof valore === 'string' && SOLO_HTTPS.test(valore)) ? valore : '';
  }

  function acceso(valore) {
    return valore === '1' || valore === 1 || valore === true;
  }

  function chiedi(indirizzo) {
    if (typeof window.fetch !== 'function') { return Promise.resolve(null); }

    const opzioni = { cache: 'default' };
    let taglia = null;

    if (typeof window.AbortController === 'function') {
      const controllo = new AbortController();
      opzioni.signal = controllo.signal;
      taglia = setTimeout(function () { controllo.abort(); }, TETTO);
    }

    return window.fetch(indirizzo, opzioni).then(function (risposta) {
      if (!risposta.ok) { throw new Error('HTTP ' + risposta.status); }
      return risposta.json();
    }).then(function (dati) {
      clearTimeout(taglia);
      return dati;
    }).catch(function (errore) {
      clearTimeout(taglia);

      console.warn('[pollaio] badge: niente da ' + indirizzo +
                   ' (' + ((errore && errore.message) || 'errore') + ')');
      return null;
    });
  }

  function assorbi(elenco) {
    if (!elenco || !Array.isArray(elenco)) { return 0; }

    const visti = {};
    let contati = 0;

    for (let i = 0; i < elenco.length; i++) {
      const gruppo = elenco[i];
      if (!gruppo || typeof gruppo.set_id !== 'string' || !gruppo.set_id) { continue; }
      if (!Array.isArray(gruppo.versions)) { continue; }

      const chiave = gruppo.set_id;

      for (let j = 0; j < gruppo.versions.length; j++) {
        const v = gruppo.versions[j];
        if (!v || (typeof v.id !== 'string' && typeof v.id !== 'number')) { continue; }

        const due = sicuro(v.image_url_2x) || sicuro(v.image_url_1x);
        if (!due) { continue; }

        const versione = String(v.id);
        const voce = {
          chiave: chiave,
          versione: versione,
          titolo: frase(v.title, '') || frase(v.description, '') || chiave,
          url: due,
          url2: sicuro(v.image_url_4x) || due
        };

        CATALOGO[chiave + '/' + versione] = voce;
        if (!ha(visti, chiave)) { visti[chiave] = true; PRIMA[chiave] = voce; }
        contati++;
      }
    }

    return contati;
  }

  function svuota() {
    let chiave;
    for (chiave in CATALOGO) { if (ha(CATALOGO, chiave)) { delete CATALOGO[chiave]; } }
    for (chiave in PRIMA) { if (ha(PRIMA, chiave)) { delete PRIMA[chiave]; } }
  }

  const CHIAVE_RICORDO = 'sb-pollaio-badge';
  const FORMATO_RICORDO = 1;
  const RICORDO_FRESCO  = 1800000;
  const RICORDO_SCADUTO = 43200000;
  const TETTO_RICORDO = 400000;

  function quantiInCatalogo() {
    let quanti = 0;
    let chiave;
    for (chiave in CATALOGO) { if (ha(CATALOGO, chiave)) { quanti++; } }
    return quanti;
  }

  function ricorda(firma) {
    if (!quantiInCatalogo()) { return; }

    try {
      const indice = [];
      let chiave;
      for (chiave in PRIMA) {
        if (ha(PRIMA, chiave)) {
          indice.push(chiave + '\t' + PRIMA[chiave].chiave + '/' + PRIMA[chiave].versione);
        }
      }

      const testo = JSON.stringify({
        v: FORMATO_RICORDO,
        ts: Date.now(),
        firma: firma,
        catalogo: CATALOGO,
        prima: indice
      });

      if (testo.length > TETTO_RICORDO) { return; }

      localStorage.setItem(CHIAVE_RICORDO, testo);
    } catch (err) {

    }
  }

  function ripescaRicordo(firma) {
    let dato;

    try {
      const grezzo = localStorage.getItem(CHIAVE_RICORDO);
      if (!grezzo) { return null; }
      dato = JSON.parse(grezzo);
    } catch (err) {
      return null;
    }

    if (!dato || typeof dato !== 'object') { return null; }
    if (dato.v !== FORMATO_RICORDO) { return null; }
    if (dato.firma !== firma) { return null; }
    if (!dato.catalogo || typeof dato.catalogo !== 'object') { return null; }

    const eta = Date.now() - (Number(dato.ts) || 0);

    if (eta < 0 || eta > RICORDO_SCADUTO) { return null; }

    const chiavi = Object.keys(dato.catalogo);
    for (let i = 0; i < chiavi.length; i++) {
      const voce = dato.catalogo[chiavi[i]];

      if (voce && voce.url && sicuro(voce.url)) { CATALOGO[chiavi[i]] = voce; }
    }

    if (!quantiInCatalogo()) { svuota(); return null; }

    const indice = Array.isArray(dato.prima) ? dato.prima : [];
    for (let k = 0; k < indice.length; k++) {
      const pezzi = String(indice[k]).split('\t');
      if (pezzi.length !== 2) { continue; }
      if (ha(CATALOGO, pezzi[1])) { PRIMA[pezzi[0]] = CATALOGO[pezzi[1]]; }
    }

    return eta < RICORDO_FRESCO ? 'fresco' : 'stanco';
  }

  function giroDiRete(firma, nome, id) {
    let indirizzoCanale = '';
    if (nome) {
      indirizzoCanale = DI_CANALE + '?login=' + encodeURIComponent(nome);
    } else if (id) {
      indirizzoCanale = DI_CANALE + '?id=' + encodeURIComponent(id);
    }

    return Promise.all([
      chiedi(GLOBALI),
      indirizzoCanale ? chiedi(indirizzoCanale) : Promise.resolve(null)
    ]).then(function (risposte) {
      let quanti = assorbi(risposte[0]);
      quanti += assorbi(risposte[1]);
      pronto = true;
      if (!quanti) {
        console.warn('[pollaio] badge: catalogo vuoto, restano i disegni di scorta');
      }
      ricorda(firma);
      return quanti;
    }).catch(function () {

      pronto = true;
      return 0;
    });
  }

  function carica(canale, idCanale) {
    const nome = frase(canale, '').toLowerCase();
    const grezzoId = (idCanale === undefined || idCanale === null) ? '' : String(idCanale);
    const id = frase(grezzoId, '');
    const firma = nome + '|' + id;

    if (inCorso && firma === firmaCarica) { return inCorso; }

    if (inCorso) {
      svuota();
      pronto = false;
    }
    firmaCarica = firma;

    const eta = ripescaRicordo(firma);

    if (eta) {

      pronto = true;
      inCorso = Promise.resolve(quantiInCatalogo());

      if (eta === 'stanco') { giroDiRete(firma, nome, id); }

      return inCorso;
    }

    inCorso = giroDiRete(firma, nome, id);
    return inCorso;
  }

  function trova(chiave, versione) {
    const esatto = CATALOGO[chiave + '/' + versione];
    if (esatto) {
      return {
        chiave: chiave, versione: versione, titolo: esatto.titolo,
        url: esatto.url, url2: esatto.url2
      };
    }

    if (ha(RIPIEGO, chiave)) {
      const disegnato = RIPIEGO[chiave];
      return {
        chiave: chiave, versione: versione, titolo: disegnato.titolo,
        url: disegnato.url, url2: disegnato.url2
      };
    }

    if (ha(PRIMA, chiave)) {

      const altra = PRIMA[chiave];
      return {
        chiave: chiave, versione: versione, titolo: altra.titolo,
        url: altra.url, url2: altra.url2
      };
    }

    return null;
  }

  function peso(chiave) {
    return ha(PESO, chiave) ? PESO[chiave] : PESO_RESTO;
  }

  function leggi(tagBadges) {
    const grezzo = frase(tagBadges, '');
    if (!grezzo) { return []; }

    const voci = grezzo.split(',');
    const raccolta = [];

    for (let i = 0; i < voci.length; i++) {
      const voce = voci[i].trim();
      if (!voce) { continue; }

      const taglio = voce.indexOf('/');
      const chiave = (taglio === -1 ? voce : voce.slice(0, taglio)).trim();
      const versione = (taglio === -1 ? '1' : voce.slice(taglio + 1)).trim();
      if (!chiave) { continue; }

      const badge = trova(chiave, versione);
      if (!badge) { continue; }

      raccolta.push({ badge: badge, peso: peso(chiave), indice: raccolta.length });
    }

    raccolta.sort(function (a, b) {
      if (a.peso !== b.peso) { return a.peso - b.peso; }
      return a.indice - b.indice;
    });

    const elenco = [];
    for (let k = 0; k < raccolta.length; k++) { elenco.push(raccolta[k].badge); }
    return elenco;
  }

  function insieme(tagBadges) {
    const dentro = {};
    const grezzo = frase(tagBadges, '');
    if (!grezzo) { return dentro; }

    const voci = grezzo.split(',');
    for (let i = 0; i < voci.length; i++) {
      const voce = voci[i].trim();
      if (!voce) { continue; }
      const taglio = voce.indexOf('/');
      const chiave = (taglio === -1 ? voce : voce.slice(0, taglio)).trim();
      if (chiave) { dentro[chiave] = true; }
    }
    return dentro;
  }

  function ruoli(tagBadges, tag) {
    const dentro = insieme(tagBadges);
    const t = tag || {};

    return {
      capo:     ha(dentro, 'broadcaster'),
      mod:      ha(dentro, 'moderator') || acceso(t.mod),
      vip:      ha(dentro, 'vip') || acceso(t.vip),
      abbonato: ha(dentro, 'subscriber') || ha(dentro, 'founder') || acceso(t.subscriber),
      artista:  ha(dentro, 'artist-badge'),
      staff:    ha(dentro, 'staff') || ha(dentro, 'admin') ||
                ha(dentro, 'global_mod') ,
      bot:      false
    };
  }

  window.Badge = {
    carica: carica,
    leggi: leggi,
    ruoli: ruoli,
    pronto: function () { return pronto; }
  };
}());
