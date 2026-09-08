(function () {
  'use strict';

  const TEMPO_MAX = 8000;

  const SETTE_GLOBALI = 'https://7tv.io/v3/emote-sets/global';
  const SETTE_CANALE  = 'https://7tv.io/v3/users/twitch/';
  const BTTV_GLOBALI  = 'https://api.betterttv.net/3/cached/emotes/global';
  const BTTV_CANALE   = 'https://api.betterttv.net/3/cached/users/twitch/';
  const FFZ_GLOBALI   = 'https://api.frankerfacez.com/v1/set/global';
  const FFZ_CANALE    = 'https://api.frankerfacez.com/v1/room/';

  const CDN_TWITCH = 'https://static-cdn.jtvnw.net/emoticons/v2/';
  const CDN_BTTV   = 'https://cdn.betterttv.net/emote/';
  const CDN_CHEER  = 'https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/';

  const PESO_CANALE = 100;
  const PESO_7TV    = 3;
  const PESO_BTTV   = 2;
  const PESO_FFZ    = 1;

  const BIT_SOVRAPPOSTA = 1 << 8;

  const LIVELLI_CHEER = [100000, 10000, 5000, 1000, 100, 1];

  const PREFISSI_CHEER = {
    cheer: 1, bitboss: 1, doodlecheer: 1, party: 1, kappa: 1, pride: 1,
    showlove: 1, streamerdonation: 1, uni: 1, muxy: 1, hola: 1, charity: 1,
    pogchamp: 1, bday: 1, heyguys: 1, anon: 1, corgo: 1, nyan: 1, scoops: 1
  };

  const ID_EMOTE = /^[A-Za-z0-9_-]{1,64}$/;
  const MENZIONE = /^@[a-zA-Z0-9_]{3,25}$/;
  const LINK_ESPLICITO = /^https?:\/\/[^\s]+$/i;

  const LINK_NUDO = /^(?:[\w-]+\.)+(?:com|net|org|it|tv|gg|io|me|link|xyz|info|shop)(?:[\/?#][^\s]*)?$/i;

  const CODA_MUTA = /[.,;:!?)\]}'"»…]+$/;

  const catalogo = Object.create(null);

  let quantita = 0;
  let fontiOk = 0;
  let fontiChieste = 0;
  let attesa = null;

  let CANALE = '';
  let ANIMA = true;

  function aHttps(indirizzo) {
    const testo = String(indirizzo || '').trim();
    if (!testo) { return ''; }
    if (testo.indexOf('//') === 0) { return 'https:' + testo; }
    if (testo.indexOf('http://') === 0) { return 'https://' + testo.slice(7); }
    if (testo.indexOf('https://') === 0) { return testo; }
    return '';
  }

  function avviso(testo) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[pollaio] ' + testo);
    }
  }

  function prendi(indirizzo, etichetta, muto) {
    return new Promise(function (risolvi) {
      if (typeof fetch !== 'function') { risolvi(null); return; }

      let controllo = null;
      let chiuso = false;

      try { controllo = new AbortController(); } catch (errore) { controllo = null; }

      const timer = setTimeout(function () {
        chiuso = true;
        if (controllo) { try { controllo.abort(); } catch (errore) {  } }
        if (!muto) { avviso(etichetta + ': non ha risposto in ' + (TEMPO_MAX / 1000) + ' secondi. Vado avanti senza.'); }
        risolvi(null);
      }, TEMPO_MAX);

      fetch(indirizzo, controllo ? { signal: controllo.signal } : undefined)
        .then(function (risposta) {
          if (!risposta.ok) { throw new Error('HTTP ' + risposta.status); }
          return risposta.json();
        })
        .then(function (dati) {
          clearTimeout(timer);
          if (!chiuso) { risolvi(dati); }
        }, function (errore) {
          clearTimeout(timer);
          if (chiuso) { return; }

          if (!muto) { avviso(etichetta + ': ' + (errore && errore.message ? errore.message : 'non raggiungibile') + '. Vado avanti senza.'); }
          risolvi(null);
        });
    });
  }

  function deposita(nome, voce) {
    if (!nome || !voce || !voce.url) { return; }

    const vecchia = catalogo[nome];
    if (vecchia && vecchia.peso >= voce.peso) { return; }
    if (!vecchia) { quantita++; }
    catalogo[nome] = voce;
  }

  function daCatalogo(voce) {
    return {
      tipo: 'emote',
      nome: voce.nome,
      url: voce.url,
      url2: voce.url2,
      fonte: voce.fonte,
      animata: voce.animata,
      sovrapposta: voce.sovrapposta
    };
  }

  function leggiSette(voci, dalCanale) {
    if (!Array.isArray(voci)) { return; }

    for (let i = 0; i < voci.length; i++) {
      const voce = voci[i] || {};
      const dato = voce.data || {};
      const host = dato.host || {};
      const nome = String(voce.name || dato.name || '');
      const radice = aHttps(host.url);
      if (!nome || !radice) { continue; }

      const bandiere = (Number(voce.flags) || 0) | (Number(dato.flags) || 0);

      deposita(nome, {
        nome: nome,
        url: radice + '/' + fileSette(host, '2x'),
        url2: radice + '/' + fileSette(host, '4x'),
        fonte: '7tv',
        animata: !!dato.animated,
        sovrapposta: (bandiere & BIT_SOVRAPPOSTA) !== 0,
        peso: PESO_7TV + (dalCanale ? PESO_CANALE : 0)
      });
    }
  }

  function fileSette(host, misura) {
    const elenco = Array.isArray(host.files) ? host.files : [];
    let scelto = '';

    for (let i = 0; i < elenco.length; i++) {
      const nome = String((elenco[i] && elenco[i].name) || '');
      if (nome.indexOf(misura + '.') !== 0) { continue; }
      if (nome.slice(-5) === '.webp') { return nome; }
      if (!scelto) { scelto = nome; }
    }
    return scelto || (misura + '.webp');
  }

  function leggiBttv(voci, dalCanale) {
    if (!Array.isArray(voci)) { return; }

    for (let i = 0; i < voci.length; i++) {
      const voce = voci[i] || {};
      const nome = String(voce.code || '');
      const id = String(voce.id || '');
      if (!nome || !ID_EMOTE.test(id)) { continue; }

      deposita(nome, {
        nome: nome,
        url: CDN_BTTV + id + '/2x',
        url2: CDN_BTTV + id + '/3x',
        fonte: 'bttv',
        animata: !!voce.animated || String(voce.imageType || '') === 'gif',
        sovrapposta: false,
        peso: PESO_BTTV + (dalCanale ? PESO_CANALE : 0)
      });
    }
  }

  function leggiFfz(dati, dalCanale) {
    if (!dati || typeof dati !== 'object') { return; }

    const insiemi = dati.sets;
    if (!insiemi || typeof insiemi !== 'object') { return; }

    const chiavi = Array.isArray(dati.default_sets) && dati.default_sets.length
      ? dati.default_sets
      : Object.keys(insiemi);

    for (let i = 0; i < chiavi.length; i++) {
      const insieme = insiemi[chiavi[i]];
      const voci = insieme && insieme.emoticons;
      if (!Array.isArray(voci)) { continue; }

      for (let j = 0; j < voci.length; j++) {
        const voce = voci[j] || {};
        const nome = String(voce.name || '');
        if (!nome) { continue; }

        const moto = voce.animated;
        const animata = !!moto;
        let misure = voce.urls || {};
        if (animata && typeof moto === 'object' && ANIMA) { misure = moto; }

        const url = aHttps(misure[2] || misure[1]);
        const url2 = aHttps(misure[4] || misure[2] || misure[1]);
        if (!url) { continue; }

        deposita(nome, {
          nome: nome,
          url: url,
          url2: url2 || url,
          fonte: 'ffz',
          animata: animata,
          sovrapposta: false,
          peso: PESO_FFZ + (dalCanale ? PESO_CANALE : 0)
        });
      }
    }
  }

  function sorgente(indirizzo, etichetta, muto, lettore) {
    return prendi(indirizzo, etichetta, muto).then(function (dati) {
      if (!dati) { return; }
      fontiOk++;
      try {
        lettore(dati);
      } catch (errore) {
        avviso(etichetta + ': risposta in una forma che non conosco. La salto.');
      }
    });
  }

  const CHIAVE_RICORDO = 'sb-pollaio-emote';

  const FORMATO_RICORDO = 2;

  const RICORDO_FRESCO  = 1800000;
  const RICORDO_SCADUTO = 43200000;

  const TETTO_RICORDO = 1500000;

  function impronta(id, scelte) {
    return [
      id || '-',
      CANALE || '-',
      scelte.sette === false ? 0 : 1,
      scelte.bttv === false ? 0 : 1,
      scelte.ffz === false ? 0 : 1
    ].join('|');
  }

  function ricorda(id, scelte) {

    if (!quantita) { return; }

    try {
      const testo = JSON.stringify({
        v: FORMATO_RICORDO,
        ts: Date.now(),
        impronta: impronta(id, scelte),
        sorgenti: fontiOk,
        chieste: fontiChieste,
        catalogo: catalogo
      });

      if (testo.length > TETTO_RICORDO) {
        avviso('il catalogo è troppo grande per essere ricordato');
        return;
      }

      localStorage.setItem(CHIAVE_RICORDO, testo);
    } catch (err) {

    }
  }

  function ripescaRicordo(id, scelte) {
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
    if (dato.impronta !== impronta(id, scelte)) { return null; }
    if (!dato.catalogo || typeof dato.catalogo !== 'object') { return null; }

    const eta = Date.now() - (Number(dato.ts) || 0);

    if (eta < 0 || eta > RICORDO_SCADUTO) { return null; }

    const nomi = Object.keys(dato.catalogo);
    for (let i = 0; i < nomi.length; i++) {
      const voce = dato.catalogo[nomi[i]];

      if (voce && aHttps(voce.url)) { deposita(nomi[i], voce); }
    }

    if (!quantita) { return null; }

    fontiOk = Number(dato.sorgenti) || 1;

    const chieste = Number(dato.chieste) || 0;
    const intero = chieste > 0 && fontiOk >= chieste;

    return eta < RICORDO_FRESCO && intero ? 'fresco' : 'stanco';
  }

  function esito() {
    return { quante: quantita, sorgenti: fontiOk, pronto: fontiOk > 0 };
  }

  function giroDiRete(id, scelte) {
    const lavori = [];

    if (scelte.sette !== false) {
      lavori.push(sorgente(SETTE_GLOBALI, '7TV globali', false, function (dati) {
        leggiSette(dati.emotes, false);
      }));
      if (id) {
        lavori.push(sorgente(SETTE_CANALE + id, '7TV del canale', false, function (dati) {
          leggiSette(dati.emote_set && dati.emote_set.emotes, true);
        }));
      }
    }

    if (scelte.bttv !== false) {
      lavori.push(sorgente(BTTV_GLOBALI, 'BTTV globali', false, function (dati) {
        leggiBttv(dati, false);
      }));
      if (id) {

        lavori.push(sorgente(BTTV_CANALE + id, 'BTTV del canale', true, function (dati) {
          leggiBttv(dati.channelEmotes, true);
          leggiBttv(dati.sharedEmotes, true);
        }));
      }
    }

    if (scelte.ffz !== false) {
      lavori.push(sorgente(FFZ_GLOBALI, 'FFZ globali', false, function (dati) {
        leggiFfz(dati, false);
      }));
      if (CANALE) {

        lavori.push(sorgente(FFZ_CANALE + encodeURIComponent(CANALE), 'FFZ del canale', true, function (dati) {
          leggiFfz(dati, true);
        }));
      }
    }

    fontiChieste = lavori.length;

    function fine() {

      ricorda(id, scelte);
      return esito();
    }

    return Promise.all(lavori).then(fine, fine);
  }

  function carica(idCanale, canale, opzioni) {

    if (attesa) { return attesa; }

    const scelte = opzioni || {};
    const id = String(idCanale || '').replace(/[^0-9]/g, '');

    CANALE = String(canale || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    ANIMA = scelte.anima !== false;

    const eta = ripescaRicordo(id, scelte);

    if (eta) {

      attesa = Promise.resolve(esito());

      if (eta === 'stanco') { giroDiRete(id, scelte); }

      return attesa;
    }

    attesa = giroDiRete(id, scelte);
    return attesa;
  }

  function leggiTagEmotes(tag) {
    const fuori = [];
    const testo = String(tag || '').trim();
    if (!testo) { return fuori; }

    const gruppi = testo.split('/');
    for (let i = 0; i < gruppi.length; i++) {
      const due = gruppi[i].indexOf(':');
      if (due <= 0) { continue; }

      const id = gruppi[i].slice(0, due);
      if (!ID_EMOTE.test(id)) { continue; }

      const fette = gruppi[i].slice(due + 1).split(',');
      for (let j = 0; j < fette.length; j++) {
        const meno = fette[j].indexOf('-');
        if (meno <= 0) { continue; }

        const inizio = parseInt(fette[j].slice(0, meno), 10);
        const fine = parseInt(fette[j].slice(meno + 1), 10);
        if (!isFinite(inizio) || !isFinite(fine)) { continue; }
        if (inizio < 0 || fine < inizio) { continue; }

        fuori.push({ id: id, inizio: inizio, fine: fine });
      }
    }
    return fuori;
  }

  function emoteTwitch(id, nome) {
    return {
      tipo: 'emote',
      nome: nome,
      url: CDN_TWITCH + id + '/default/dark/2.0',
      url2: CDN_TWITCH + id + '/default/dark/3.0',
      fonte: 'twitch',

      animata: false,
      sovrapposta: false
    };
  }

  function tagliaNative(corpo, tagEmotes) {
    const intervalli = leggiTagEmotes(tagEmotes);
    if (!intervalli.length) { return [{ testo: corpo }]; }

    const lettere = Array.from(corpo);
    const tratti = [];
    let cursore = 0;

    intervalli.sort(function (a, b) { return a.inizio - b.inizio; });

    for (let i = 0; i < intervalli.length; i++) {
      const tratto = intervalli[i];
      if (tratto.inizio < cursore) { continue; }
      if (tratto.fine >= lettere.length) { continue; }

      if (tratto.inizio > cursore) {
        tratti.push({ testo: lettere.slice(cursore, tratto.inizio).join('') });
      }
      tratti.push({
        emote: emoteTwitch(tratto.id, lettere.slice(tratto.inizio, tratto.fine + 1).join(''))
      });
      cursore = tratto.fine + 1;
    }

    if (cursore < lettere.length) {
      tratti.push({ testo: lettere.slice(cursore).join('') });
    }
    return tratti;
  }

  function spingiTesto(uscita, testo) {
    if (!testo) { return; }

    const ultimo = uscita.length ? uscita[uscita.length - 1] : null;
    if (ultimo && ultimo.tipo === 'testo') {
      ultimo.testo += testo;
      return;
    }
    uscita.push({ tipo: 'testo', testo: testo });
  }

  function livelloCheer(quanti) {
    for (let i = 0; i < LIVELLI_CHEER.length; i++) {
      if (quanti >= LIVELLI_CHEER[i]) { return LIVELLI_CHEER[i]; }
    }
    return 1;
  }

  function forseCheer(parola) {
    const trovato = parola.match(/^([a-z]+)(\d+)$/i);
    if (!trovato) { return null; }
    if (PREFISSI_CHEER[trovato[1].toLowerCase()] !== 1) { return null; }

    const quanti = parseInt(trovato[2], 10);
    if (!isFinite(quanti) || quanti < 1) { return null; }

    const livello = livelloCheer(quanti);

    const moto = ANIMA ? 'animated' : 'static';

    return {
      tipo: 'cheer',

      nome: trovato[1],
      bits: quanti,

      url: CDN_CHEER + moto + '/' + livello + '/2.' + (ANIMA ? 'gif' : 'png'),
      url2: CDN_CHEER + moto + '/' + livello + '/4.' + (ANIMA ? 'gif' : 'png'),
      livello: livello
    };
  }

  function forseLink(parola) {
    if (LINK_ESPLICITO.test(parola)) { return aHttps(parola); }
    if (LINK_NUDO.test(parola)) { return 'https://' + parola; }
    return '';
  }

  function guardaParola(parola, bits, uscita) {

    const voce = catalogo[parola];
    if (voce) { uscita.push(daCatalogo(voce)); return; }

    if (bits > 0) {
      const cheer = forseCheer(parola);
      if (cheer) { uscita.push(cheer); return; }
    }

    const trovata = parola.match(CODA_MUTA);
    const coda = trovata ? trovata[0] : '';
    const nucleo = coda ? parola.slice(0, parola.length - coda.length) : parola;

    if (nucleo) {
      if (MENZIONE.test(nucleo)) {
        uscita.push({
          tipo: 'menzione',
          nome: nucleo,
          nostra: nucleo.slice(1).toLowerCase() === CANALE
        });
        spingiTesto(uscita, coda);
        return;
      }

      const url = forseLink(nucleo);
      if (url) {
        uscita.push({ tipo: 'link', testo: nucleo, url: url });
        spingiTesto(uscita, coda);
        return;
      }
    }

    spingiTesto(uscita, parola);
  }

  function guardaGrezzo(grezzo, bits, uscita) {
    if (!grezzo) { return; }

    const parti = grezzo.split(/(\s+)/);
    for (let i = 0; i < parti.length; i++) {
      const parte = parti[i];
      if (!parte) { continue; }
      if (!parte.trim()) { spingiTesto(uscita, parte); continue; }
      guardaParola(parte, bits, uscita);
    }
  }

  const EMOTE_KICK = /\[emote:(\d+):([^\]]*)\]/g;
  const CDN_KICK = 'https://files.kick.com/emotes/';

  function pezziKick(testo) {
    const corpo = typeof testo === 'string' ? testo : '';
    const uscita = [];
    if (!corpo) { return uscita; }

    let ultimo = 0;
    let trovato;

    EMOTE_KICK.lastIndex = 0;
    while ((trovato = EMOTE_KICK.exec(corpo)) !== null) {
      if (trovato.index > ultimo) {
        guardaGrezzo(corpo.slice(ultimo, trovato.index), 0, uscita);
      }

      const indirizzo = CDN_KICK + trovato[1] + '/fullsize';
      uscita.push({
        tipo: 'emote',
        nome: trovato[2] || 'emote',
        url: indirizzo,

        url2: indirizzo,
        fonte: 'kick',

        animata: false,
        sovrapposta: false
      });

      ultimo = trovato.index + trovato[0].length;
    }

    if (ultimo < corpo.length) {
      guardaGrezzo(corpo.slice(ultimo), 0, uscita);
    }

    return uscita;
  }

  function pezzi(testo, tagEmotes, tagBits) {
    const corpo = typeof testo === 'string' ? testo : '';
    const uscita = [];
    if (!corpo) { return uscita; }

    const bits = Number(tagBits) > 0 ? Number(tagBits) : 0;
    const tratti = tagliaNative(corpo, tagEmotes);

    for (let i = 0; i < tratti.length; i++) {
      if (tratti[i].emote) { uscita.push(tratti[i].emote); continue; }
      guardaGrezzo(tratti[i].testo, bits, uscita);
    }
    return uscita;
  }

  const SUGGERITE = 8;

  function cerca(prefisso, tetto) {
    const chiave = String(prefisso || '').toLowerCase();
    if (!chiave) { return []; }

    const quante = tetto > 0 ? tetto : SUGGERITE;
    const inizia = [];
    const dentro = [];
    const nomi = Object.keys(catalogo);

    for (let i = 0; i < nomi.length; i++) {
      const dove = nomi[i].toLowerCase().indexOf(chiave);
      if (dove === 0) { inizia.push(catalogo[nomi[i]]); }
      else if (dove > 0) { dentro.push(catalogo[nomi[i]]); }
    }

    function primaLeNostre(a, b) {
      if (b.peso !== a.peso) { return b.peso - a.peso; }
      if (a.nome.length !== b.nome.length) { return a.nome.length - b.nome.length; }
      return a.nome < b.nome ? -1 : 1;
    }

    inizia.sort(primaLeNostre);
    dentro.sort(primaLeNostre);

    return inizia.concat(dentro).slice(0, quante);
  }

  window.Emote = {
    carica: carica,
    pezzi: pezzi,
    pezziKick: pezziKick,
    cerca: cerca,
    pronto: function () { return fontiOk > 0; },
    quante: function () { return quantita; }
  };
}());
