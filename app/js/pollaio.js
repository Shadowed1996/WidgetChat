(function () {
  'use strict';

  var AZIONE = /^\u0001ACTION\s(.*?)\u0001?$/;

  var CONTROLLO = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

  var ZALGO = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u0610-\u061a\u064b-\u065f\u06d6-\u06dc\u0e31\u0e34-\u0e3a\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20f0\ufe20-\ufe2f]{3,}/g;

  function domaZalgo(testo) {
    return testo.replace(ZALGO, function (pila) { return pila.slice(0, 2); });
  }

  var MAX_NOME = 25;

  var conf = null;
  var elencoBot = [];
  var partito = false;

  function vestiRadice(radice, valori) {
    radice.setAttribute('data-tema', valori.tema);
    radice.setAttribute('data-verso', valori.verso);
    radice.setAttribute('data-effetto', valori.effetto);

    var aria = Math.max(40, Math.min(400, valori.spazio)) / 100;
    radice.style.setProperty('--aria', aria.toFixed(3));

    var velocita = Math.max(25, Math.min(300, valori.velocita));
    radice.style.setProperty('--tempo', (100 / velocita).toFixed(3));

    if (document.body) { document.body.setAttribute('data-fondo', valori.fondo); }

    var scala = Math.max(60, Math.min(200, valori.scala)) / 100;
    document.documentElement.style.setProperty('--scala-testo', scala.toFixed(3));

    var nome = String(valori.canale || '').replace(/[^a-z0-9_]/gi, '');
    if (nome) { radice.style.setProperty('--canale', '"' + nome + '"'); }

    if (valori.larghezza > 0) {
      document.documentElement.style.setProperty('--larghezza', valori.larghezza + 'px');
    }

    var pollo = radice.querySelector('.pollaio__pollo');
    if (pollo && valori.pollo) {
      var img = pollo.querySelector('.pollaio__pollo-img');
      if (img && img.getAttribute('data-src')) {
        img.setAttribute('src', img.getAttribute('data-src'));
      }
      pollo.hidden = false;
    }
  }

  function ripulisci(valore, tetto) {
    var pulito = String(valore === undefined || valore === null ? '' : valore)
      .replace(CONTROLLO, '');
    pulito = domaZalgo(pulito).trim();
    if (!tetto) { return pulito; }

    var lettere = Array.from(pulito);
    if (lettere.length <= tetto) { return pulito; }
    return lettere.slice(0, tetto).join('');
  }

  function nickDaPrefisso(prefisso) {
    var taglio = String(prefisso || '').indexOf('!');
    return (taglio > 0 ? prefisso.slice(0, taglio) : String(prefisso || '')).toLowerCase();
  }

  function eBot(nick) {
    var i;
    for (i = 0; i < elencoBot.length; i++) {
      if (elencoBot[i] === nick) { return true; }
    }
    return false;
  }

  function reply(tag) {
    var nome = tag['reply-parent-display-name'];
    if (!nome) { return null; }
    return {
      nome: ripulisci(nome, MAX_NOME),
      testo: ripulisci(tag['reply-parent-msg-body'], 0)
    };
  }

  function pezziDi(corpo, tag, bits) {
    if (!conf.emote || !window.Emote) {
      return corpo ? [{ tipo: 'testo', testo: corpo }] : [];
    }
    try {
      return window.Emote.pezzi(corpo, tag.emotes || '', bits);
    } catch (err) {
      console.warn('[pollaio] le emote non si sono lasciate leggere:', err);
      return corpo ? [{ tipo: 'testo', testo: corpo }] : [];
    }
  }

  function distintiviDi(tag) {
    if (!conf.badge || !window.Badge) { return []; }
    try { return window.Badge.leggi(tag.badges || ''); }
    catch (err) { return []; }
  }

  function ruoliDi(tag, nick) {
    var ruoli = { capo: false, mod: false, vip: false, abbonato: false, artista: false, staff: false, bot: false };
    if (window.Badge) {
      try { ruoli = window.Badge.ruoli(tag.badges || '', tag); }
      catch (err) {  }
    }
    ruoli.bot = eBot(nick);
    return ruoli;
  }

  function giudica(messaggio) {
    if (!window.Rilievo) { return null; }
    try { return window.Rilievo.valuta(messaggio); }
    catch (err) { return null; }
  }

  function daPrivmsg(m) {
    var tag = m.tag || {};
    var nick = m.nick || nickDaPrefisso(m.prefisso);
    var corpo = m.testo || '';
    var tipo = 'messaggio';

    var azione = AZIONE.exec(corpo);
    if (azione) { corpo = azione[1]; tipo = 'azione'; }

    if (eBot(nick)) { return null; }
    if (conf.comandi && corpo.charAt(0) === '!') { return null; }

    var bits = parseInt(tag.bits, 10) || 0;

    var messaggio = {
      id:        tag.id || '',
      tipo:      tipo,
      ts:        parseInt(tag['tmi-sent-ts'], 10) || Date.now(),
      utenteId:  tag['user-id'] || '',
      nick:      nick,
      nome:      ripulisci(tag['display-name'] || nick, MAX_NOME),
      colore:    tag.color || '',
      badge:     distintiviDi(tag),
      ruoli:     ruoliDi(tag, nick),
      pezzi:     pezziDi(corpo, tag, bits),
      bits:      bits,
      risposta:  reply(tag),
      primo:     conf.primo && tag['first-msg'] === '1',
      ritorno:   tag['returning-chatter'] === '1',
      rilievo:   null,
      evento:    null,
      cancellato: false,

      piattaforma: 'twitch',

      msgId:     tag['msg-id'] || ''
    };

    messaggio.rilievo = giudica(messaggio);
    return messaggio;
  }

  var BLOCCHI_RICORDATI = 12;
  var VITA_BLOCCO = 300000;
  var blocchi = [];

  function bloccoGiaVisto(tag) {
    var id = tag['msg-param-community-gift-id'];
    if (!id) { return false; }

    var ora = Date.now();
    var i;

    for (i = blocchi.length - 1; i >= 0; i--) {
      if (ora - blocchi[i].ts > VITA_BLOCCO) { blocchi.splice(i, 1); }
    }
    for (i = 0; i < blocchi.length; i++) {
      if (blocchi[i].id === id) { return true; }
    }

    blocchi.push({ id: id, ts: ora });
    while (blocchi.length > BLOCCHI_RICORDATI) { blocchi.shift(); }
    return false;
  }

  function daUsernotice(m) {
    if (!conf.eventi || !window.Eventi) { return null; }

    var tag = m.tag || {};

    if (bloccoGiaVisto(tag)) { return null; }

    var evento;
    try { evento = window.Eventi.leggi(tag, m.testo || ''); }
    catch (err) { return null; }
    if (!evento) { return null; }

    var nick = (tag.login || '').toLowerCase();
    var allegato = evento.testo || '';
    var bits = parseInt(tag.bits, 10) || 0;

    var messaggio = {
      id:        tag.id || '',
      tipo:      'evento',
      ts:        parseInt(tag['tmi-sent-ts'], 10) || Date.now(),
      utenteId:  tag['user-id'] || '',
      nick:      nick,
      nome:      ripulisci(tag['display-name'] || nick, MAX_NOME),
      colore:    tag.color || '',
      badge:     distintiviDi(tag),
      ruoli:     ruoliDi(tag, nick),
      pezzi:     allegato ? pezziDi(allegato, tag, bits) : [],
      bits:      bits,
      risposta:  null,
      primo:     false,
      ritorno:   false,
      rilievo:   null,
      evento:    evento,
      cancellato: false,
      piattaforma: 'twitch',
      msgId:     tag['msg-id'] || ''
    };

    messaggio.rilievo = giudica(messaggio);
    return messaggio;
  }

  var RUOLI_KICK = {
    broadcaster: 'capo',
    moderator:   'mod',
    vip:         'vip',
    subscriber:  'abbonato',
    founder:     'abbonato',
    og:          'abbonato',
    staff:       'staff'
  };

  function ruoliKick(distintivi, nick) {
    var ruoli = { capo: false, mod: false, vip: false, abbonato: false, artista: false, staff: false, bot: false };
    var i;

    if (Array.isArray(distintivi)) {
      for (i = 0; i < distintivi.length; i++) {
        var tipo = String((distintivi[i] && distintivi[i].type) || '').toLowerCase();

        if (Object.prototype.hasOwnProperty.call(RUOLI_KICK, tipo)) {
          ruoli[RUOLI_KICK[tipo]] = true;
        }
      }
    }

    ruoli.bot = eBot(nick);
    return ruoli;
  }

  var MAX_BADGE_KICK = 6;

  function distintiviKick(identita) {
    var fuori = [];
    if (!conf.badge) { return fuori; }

    var elenco = (identita && identita.badges_v2) || [];
    if (!Array.isArray(elenco)) { return fuori; }

    for (var i = 0; i < elenco.length && fuori.length < MAX_BADGE_KICK; i++) {
      var b = elenco[i] || {};
      var url = String(b.image_url || '');

      if (!/^https:\/\//.test(url)) { continue; }

      var nome = String(b.name || '');
      fuori.push({ chiave: nome, versione: '', titolo: nome, url: url, url2: url });
    }

    return fuori;
  }

  function pezziKick(corpo) {
    if (!conf.emote || !window.Emote || !window.Emote.pezziKick) {
      return corpo ? [{ tipo: 'testo', testo: corpo }] : [];
    }
    try {
      return window.Emote.pezziKick(corpo);
    } catch (err) {
      console.warn('[pollaio] le emote di Kick non si sono lasciate leggere:', err);
      return corpo ? [{ tipo: 'testo', testo: corpo }] : [];
    }
  }

  function daKick(dato) {
    var mittente = dato.sender || {};
    var identita = mittente.identity || {};
    var nick = String(mittente.slug || mittente.username || '').toLowerCase();
    var corpo = String(dato.content || '');

    if (eBot(nick)) { return null; }
    if (conf.comandi && corpo.charAt(0) === '!') { return null; }

    var messaggio = {
      id:        String(dato.id || ''),
      tipo:      'messaggio',
      ts:        Date.parse(dato.created_at) || Date.now(),
      utenteId:  String(mittente.id || ''),
      nick:      nick,
      nome:      ripulisci(mittente.username || nick, MAX_NOME),

      colore:    String(identita.color || ''),
      badge:     distintiviKick(identita),
      ruoli:     ruoliKick(identita.badges, nick),
      pezzi:     pezziKick(corpo),

      bits:      0,
      risposta:  null,
      primo:     false,
      ritorno:   false,
      rilievo:   null,
      evento:    null,
      cancellato: false,
      piattaforma: 'kick',
      msgId:     ''
    };

    messaggio.rilievo = giudica(messaggio);
    return messaggio;
  }

  function daYoutube(voce) {
    var dettaglio = voce.snippet || {};
    if (dettaglio.type !== 'textMessageEvent') { return null; }

    var autore = voce.authorDetails || {};
    var corpo = String((dettaglio.textMessageDetails && dettaglio.textMessageDetails.messageText) || '');
    if (!corpo) { return null; }

    var nick = String(autore.displayName || '').toLowerCase();

    if (eBot(nick)) { return null; }
    if (conf.comandi && corpo.charAt(0) === '!') { return null; }

    var messaggio = {
      id:        String(voce.id || ''),
      tipo:      'messaggio',
      ts:        Date.parse(dettaglio.publishedAt) || Date.now(),
      utenteId:  String(autore.channelId || ''),
      nick:      nick,
      nome:      ripulisci(autore.displayName || nick, MAX_NOME),

      colore:    '',
      badge:     [],

      ruoli: {
        capo:      !!autore.isChatOwner,
        mod:       !!autore.isChatModerator,
        vip:       false,

        abbonato:  !!autore.isChatSponsor,
        artista:   false,
        staff:     false,
        bot:       eBot(nick)
      },

      pezzi:     pezziDi(corpo, {}, 0),

      bits:      0,
      risposta:  null,
      primo:     false,
      ritorno:   false,
      rilievo:   null,
      evento:    null,
      cancellato: false,
      piattaforma: 'youtube',
      msgId:     ''
    };

    messaggio.rilievo = giudica(messaggio);
    return messaggio;
  }

  function suRiga(m) {
    if (!m || !m.comando) { return; }

    if (m.comando === 'PRIVMSG') {
      var messaggio = daPrivmsg(m);
      if (messaggio) { window.Resa.aggiungi(messaggio); }

      if (m.tag && m.tag.bits) { svegliaTreno(); }
      return;
    }

    if (m.comando === 'USERNOTICE') {
      var evento = daUsernotice(m);
      if (evento) { window.Resa.aggiungi(evento); }

      svegliaTreno();
      return;
    }

    if (m.comando === 'CLEARCHAT' || m.comando === 'CLEARMSG') {
      suModerazione(m);
      return;
    }

    if (m.comando === 'NOTICE') {
      suAvviso(m);
    }
  }

  function svegliaTreno() {
    if (conf && conf.treno && window.Treno) { window.Treno.sveglia(); }
  }

  function altreChat() {
    if (!conf) { return false; }
    if (conf.kick || conf.kickstanza) { return true; }

    return !!(conf.youtube && conf.ytchiave);
  }

  function piattaformeAccese() {
    var quali = ['twitch'];
    if (!conf) { return quali; }

    if (conf.prova) { return ['twitch', 'kick', 'youtube']; }

    if (conf.kick || conf.kickstanza) { quali.push('kick'); }
    if (conf.youtube && conf.ytchiave) { quali.push('youtube'); }

    return quali.length > 1 ? quali : [];
  }

  function suModerazione(m) {
    if (!window.Eventi) { return; }

    var atto;
    try { atto = window.Eventi.moderazione(m.comando, m.tag || {}, m.parametri || ''); }
    catch (err) { return; }
    if (!atto) { return; }

    if (atto.genere === 'svuota') { window.Resa.svuota(); }
    else if (atto.genere === 'cancella') { window.Resa.cancella(atto.id); }
    else { window.Resa.cancellaDi(atto.nick); }

    if (conf.moderazione === 'togli' || !atto.frase) { return; }

    window.Resa.aggiungi({
      id: atto.id || '',
      tipo: 'sistema',
      ts: Date.now(),
      utenteId: '',
      nick: atto.nick || '',
      nome: '',
      colore: '',
      badge: [],
      ruoli: { capo: false, mod: false, vip: false, abbonato: false, artista: false, staff: false, bot: false },
      pezzi: [],
      bits: 0,
      risposta: null,
      primo: false,
      ritorno: false,
      rilievo: null,
      evento: atto,
      cancellato: false,

      piattaforma: 'twitch',
      msgId: ''
    });
  }

  function suAvviso(m) {
    if (!window.Eventi) { return; }

    var avviso;
    try { avviso = window.Eventi.avviso(m.tag || {}, m.testo || ''); }
    catch (err) { return; }

    if (avviso && avviso.grave) { window.Resa.spia('resa', avviso.testo); }
  }

  var FRASI = {
    collego: 'Apro il pollaio…',
    accesa:  'Sono nel pollaio',
    riprovo: 'Caduta la linea, ci riprovo…',
    resa:    'La chat non risponde, continuo a provare…',
    prova:   'Prova'
  };

  function suStato(stato) {
    window.Resa.spia(stato, FRASI[stato] || '');

  }

  var COPIONE_TRENO = [
    { attesa:  6000, stato: { fase: 'niente' } },
    { attesa:  4000, stato: { fase: 'arrivo', livello: 0, punti: 1, meta: 3, percento: 33, restano: 90, golden: false, partecipanti: 1, mancano: 2 } },
    { attesa:  4000, stato: { fase: 'arrivo', livello: 0, punti: 2, meta: 3, percento: 67, restano: 60, golden: false, partecipanti: 2, mancano: 1 } },
    { attesa:  5000, stato: { fase: 'corsa', livello: 1, punti:  300, meta: 1600, percento: 19, restano: 300, golden: false, partecipanti: 0, mancano: 0 } },
    { attesa:  5000, stato: { fase: 'corsa', livello: 1, punti:  950, meta: 1600, percento: 59, restano: 240, golden: false, partecipanti: 0, mancano: 0 } },
    { attesa:  5000, stato: { fase: 'corsa', livello: 1, punti: 1480, meta: 1600, percento: 93, restano: 190, golden: false, partecipanti: 0, mancano: 0 } },
    { attesa:  6000, stato: { fase: 'corsa', livello: 2, punti:  700, meta: 3400, percento: 21, restano: 300, golden: false, partecipanti: 0, mancano: 0 } },
    { attesa:  6000, stato: { fase: 'corsa', livello: 3, punti: 2100, meta: 5300, percento: 40, restano: 280, golden: true,  partecipanti: 0, mancano: 0 } },
    { attesa:  8000, stato: { fase: 'finito', livello: 3, punti: 2100, meta: 5300, percento: 40, restano: 0, golden: true, partecipanti: 0, mancano: 0 } }
  ];

  var passoTreno = 0;
  var timerTrenoFinto = null;

  function trenoFinto() {
    var voce = COPIONE_TRENO[passoTreno % COPIONE_TRENO.length];
    passoTreno++;

    window.Resa.treno(voce.stato);
    clearTimeout(timerTrenoFinto);
    timerTrenoFinto = setTimeout(trenoFinto, voce.attesa);
  }

  function avvia() {
    if (partito) { return; }
    partito = true;

    var radice = document.querySelector('.pollaio');
    if (!radice || !window.Impostazioni || !window.Resa) { return; }

    conf = window.Impostazioni.valori;
    elencoBot = String(conf.bot || '').toLowerCase().split(',').map(function (n) {
      return n.trim();
    }).filter(function (n) { return n.length > 0; });

    vestiRadice(radice, conf);

    if (!window.Resa.monta(radice, {
      max: conf.max,
      svanisci: conf.svanisci,
      orario: conf.orario,
      verso: conf.verso,
      moderazione: conf.moderazione,
      effetto: conf.effetto,

      velocita: conf.velocita,

      multi: !!conf.prova || altreChat(),

      anima: conf.anima
    })) { return; }

    if (window.Barra) {
      window.Barra.monta(radice, {
        barra: conf.barra,
        scrivi: conf.scrivi,
        canale: conf.canale,
        prova: conf.prova,
        verso: conf.verso,
        comandi: conf.comandi,
        piattaforme: piattaformeAccese()
      });
    }

    if (window.Rilievo) {
      window.Rilievo.imposta({
        canale: conf.canale,
        parole: conf.parole,
        menzioni: conf.menzioni,
        primo: conf.primo
      });
    }

    if (window.Badge && conf.badge) {
      window.Badge.carica(conf.canale, conf.id);
    }
    if (window.Emote && conf.emote) {
      window.Emote.carica(conf.id, conf.canale, {
        sette: conf.sette, bttv: conf.bttv, ffz: conf.ffz, anima: conf.anima
      });
    }

    if (conf.prova) {
      window.Resa.spia('prova', FRASI.prova);
      if (window.Prova) {
        window.Prova.avvia({ su: function (msg) {

          if (!msg.rilievo) { msg.rilievo = giudica(msg); }
          window.Resa.aggiungi(msg);
        } });
      }

      if (conf.treno) { trenoFinto(); }
      return;
    }

    if (window.Treno && conf.treno) {
      window.Treno.avvia({
        canale: conf.canale,
        su: function (stato) { window.Resa.treno(stato); }
      });
    }

    if (window.Kick && altreChat()) {
      window.Kick.avvia({
        canale: conf.kick,
        chatroom: conf.kickstanza,
        su: function (dato) {
          var messaggio = daKick(dato);
          if (messaggio) { window.Resa.aggiungi(messaggio); }
        }
      });
    }

    if (window.Youtube && conf.youtube && conf.ytchiave) {
      window.Youtube.avvia({
        video: conf.youtube,
        chiave: conf.ytchiave,
        su: function (voce) {
          var messaggio = daYoutube(voce);
          if (messaggio) { window.Resa.aggiungi(messaggio); }
        }
      });
    }

    if (!window.Irc) { return; }
    window.Irc.suStato(suStato);
    window.Irc.avvia({ canale: conf.canale, su: suRiga, sospendi: false });
  }

  window.Pollaio = {
    avvia: avvia,
    stato: function () { return window.Irc ? window.Irc.stato() : 'spenta'; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia, { once: true });
  } else {
    avvia();
  }

}());
