(function () {
  'use strict';

  var RITMO_SPETTATORI = 60000;

  var RITMO_LISTA = 120000;

  var RITMO_MINIMO = 5000;

  var TOLLERANZA = 1000;

  var TETTO_PAGINE = 5;

  var TETTO_PAGINE_RUOLI = 3;

  var PER_PAGINA = 1000;

  var PER_PAGINA_RUOLI = 100;

  var ERRORI_MAX = 5;

  var LIMITE_NOME = 25;

  var SCOPO_CHATTERS   = 'moderator:read:chatters';
  var SCOPO_MODERATORI = 'channel:manage:moderators';
  var SCOPO_VIP        = 'channel:manage:vips';

  var SPETTATORI  = '/streams?user_id=';
  var CHATTERS    = '/chat/chatters?broadcaster_id=';
  var MODERATORI  = '/moderation/moderators?broadcaster_id=';
  var VIP         = '/channels/vips?broadcaster_id=';

  var MODELLO_CANALE = /^[a-z0-9_]{1,25}$/;
  var MODELLO_ID     = /^[0-9]{1,20}$/;

  var SENZA_TWITCH = 'Non riesco a parlare con Twitch da qui.';

  var SENZA_CANALE = 'Non so a quale canale guardare.';

  var SENZA_CONTO = 'Per sapere chi c’è mi serve il tuo account Twitch collegato.';

  var SENZA_ME = 'Non so ancora chi sei su Twitch, e senza quello non posso chiedere chi c’è in chat.';

  var SENZA_CHATTERS = 'Il collegamento non ha il permesso di leggere chi c’è in chat: si rifà con «Connetti account».';

  var SENZA_MODERATORI = 'Il collegamento non ha il permesso di leggere i moderatori del canale.';

  var SENZA_VIP = 'Il collegamento non ha il permesso di leggere i VIP del canale.';

  var NON_MOD = 'Chi c’è in chat lo vedono soltanto lo streamer e i suoi moderatori, e qui non lo sei: ti resta il conto degli spettatori.';

  var ALTRUI = 'Questo canale non è il tuo: l’elenco completo dei moderatori e dei VIP Twitch lo dice soltanto al suo streamer. Qui riconosco quelli che hanno scritto — il badge viaggia col messaggio — e gli altri stanno fra gli utenti finché non parlano.';

  var STORTO = 'Twitch ha risposto in un modo che non capisco.';

  var conf = { canale: '', canaleId: '', bot: [], su: null, visibile: null };

  var acceso = false;
  var inVolo = false;
  var chiesto = false;
  var timer = null;
  var sessione = 0;
  var errori = 0;

  var ultimaLettura = 0;
  var ultimaLista = 0;

  // `null` finché Twitch non ha risposto la prima volta, e non `0`: uno zero
  // qui vuol dire «in diretta, e non guarda nessuno», che è una cosa vera e
  // diversa da «non lo so ancora». Chi legge questo campo decide cosa scrivere
  // in faccia a qualcuno, e su un dubbio non deve scrivere niente.
  var spettatori = null;
  var nomeStreamer = '';
  var inChat = 0;
  var scomparti = { moderatori: [], vip: [], bot: [], utenti: [] };
  var quando = 0;
  var guaioSpettatori = '';
  var guaioLista = '';

  var ultimo = null;
  var ultimaFirma = '';

  function conto() {
    var c = window.Conto;
    return (c && typeof c.verso === 'function') ? c : null;
  }

  function permesso(scopo) {
    var c = conto();
    if (!c || typeof c.puo !== 'function') { return false; }
    return c.puo(scopo) === true;
  }

  function elenco(valore) {
    if (typeof Array.isArray === 'function') { return Array.isArray(valore); }
    return Object.prototype.toString.call(valore) === '[object Array]';
  }

  function pulito(grezzo, ripiego) {
    var c = conto();
    var s;

    if (c && typeof c.ripulisci === 'function') {
      s = c.ripulisci(grezzo);
    } else {
      s = String(grezzo === undefined || grezzo === null ? '' : grezzo)
        .replace(/\s+/g, ' ').trim();
    }
    if (!s) { return ripiego; }

    var lettere = (typeof Array.from === 'function') ? Array.from(s) : s.split('');
    if (lettere.length > LIMITE_NOME) { s = lettere.slice(0, LIMITE_NOME).join('').trim(); }

    return s || ripiego;
  }

  function uniti(pezzi) {
    var buoni = [];
    var i;

    for (i = 0; i < pezzi.length; i++) {
      if (!pezzi[i]) { continue; }
      if (buoni.indexOf(pezzi[i]) !== -1) { continue; }
      buoni.push(pezzi[i]);
    }
    return buoni.join(' ');
  }

  function persona(voce) {
    if (!voce || typeof voce !== 'object') { return null; }

    var nick = String(voce.user_login || '').trim().toLowerCase();
    if (!nick) { return null; }

    return {
      id: String(voce.user_id || ''),
      nick: nick,
      nome: pulito(voce.user_name, nick)
    };
  }

  function perNome(a, b) {
    var x = a.nome.toLowerCase();
    var y = b.nome.toLowerCase();

    if (x < y) { return -1; }
    if (x > y) { return 1; }
    if (a.nick < b.nick) { return -1; }
    if (a.nick > b.nick) { return 1; }
    return 0;
  }

  function insieme(gente) {
    var dentro = Object.create(null);
    var i;

    if (!gente) { return dentro; }
    for (i = 0; i < gente.length; i++) { dentro[gente[i].nick] = true; }
    return dentro;
  }

  function copia(gente) {
    var fuori = [];
    var i;

    for (i = 0; i < gente.length; i++) {
      fuori.push({ nick: gente[i].nick, nome: gente[i].nome });
    }
    return fuori;
  }

  function nomi(gente) {
    var pezzi = [];
    var i;

    for (i = 0; i < gente.length; i++) { pezzi.push(gente[i].nick); }
    return pezzi.join(',');
  }

  function scompartoStreamer() {
    if (!conf.canale) { return []; }
    return [{ nick: conf.canale, nome: nomeStreamer || conf.canale }];
  }

  function foto() {
    return {
      spettatori: spettatori,
      inChat: inChat,
      streamer: scompartoStreamer(),
      moderatori: copia(scomparti.moderatori),
      vip: copia(scomparti.vip),
      bot: copia(scomparti.bot),
      utenti: copia(scomparti.utenti),
      quando: quando,
      guaio: uniti([guaioSpettatori, guaioLista])
    };
  }

  function firma(s) {
    return s.spettatori + '|' + s.inChat + '|' + s.guaio + '|' +
      nomi(s.streamer) + '|' + nomi(s.moderatori) + '|' +
      nomi(s.vip) + '|' + nomi(s.bot) + '|' + nomi(s.utenti);
  }

  function avvisa(stato) {
    if (typeof conf.su !== 'function') { return; }
    try { conf.su(stato); }
    catch (err) { console.warn('[pollaio] chi ascolta la gente è andato in errore:', err); }
  }

  function consegna() {
    var s = foto();
    var f = firma(s);

    if (ultimo && f === ultimaFirma) { return; }

    ultimo = s;
    ultimaFirma = f;
    avvisa(s);
  }

  function sfoglia(percorso, tetto, su) {
    var raccolta = [];
    var pagine = 0;
    var totale = 0;

    function passo(dopo) {
      var c = conto();
      if (!c) { su(SENZA_TWITCH); return; }

      c.verso('GET', percorso + (dopo ? '&after=' + encodeURIComponent(dopo) : ''), null,
        function (guaio, dati, scollegato, stato) {
          if (guaio) { su(guaio, null, 0, scollegato === true, stato); return; }

          var voci = dati && dati.data;
          if (!elenco(voci)) { su(STORTO, null, 0, false, stato); return; }

          var i;
          var chi;

          for (i = 0; i < voci.length; i++) {
            chi = persona(voci[i]);
            if (chi) { raccolta.push(chi); }
          }

          pagine++;
          if (isFinite(dati.total)) { totale = Number(dati.total); }

          var cursore = dati.pagination && dati.pagination.cursor;

          if (cursore && voci.length && pagine < tetto) { passo(String(cursore)); return; }
          su(null, raccolta, totale > 0 ? totale : raccolta.length, false);
        });
    }

    passo('');
  }

  // Quello che si e' visto passare in chat. I badge `moderator/1`, `vip/1` e
  // `broadcaster/1` viaggiano attaccati a ogni messaggio e sono veri: dicono il
  // ruolo di chi ha parlato, e lo dicono anche su un canale che non e' il tuo,
  // dove Helix non te lo direbbe mai. Copertura parziale — solo chi ha scritto —
  // ma e' la differenza fra «non so niente» e «questi li so».
  var dettiDaiBadge = Object.create(null);

  function visto(nick, ruoli) {
    var chiave = String(nick || '').toLowerCase();
    if (!chiave || !ruoli) { return; }

    var suo = dettiDaiBadge[chiave] || (dettiDaiBadge[chiave] = { mod: false, vip: false, bot: false });

    // Solo in salita: un badge che c'era e adesso non c'e' vuol dire che il
    // messaggio arriva da un'altra stanza, non che il ruolo e' stato tolto.
    if (ruoli.mod) { suo.mod = true; }
    if (ruoli.vip) { suo.vip = true; }
    if (ruoli.bot) { suo.bot = true; }
  }

  function eBot(nick) {
    var chiave = String(nick || '').toLowerCase();
    if (conf.bot.indexOf(chiave) !== -1) { return true; }
    return !!(dettiDaiBadge[chiave] && dettiDaiBadge[chiave].bot);
  }

  function dividi(gente, mod, vip) {
    var dentroMod = insieme(mod);
    var dentroVip = insieme(vip);
    var visti = Object.create(null);
    var moderatori = [];
    var vipi = [];
    var bot = [];
    var utenti = [];
    var i;
    var chi;
    var detto;

    for (i = 0; i < gente.length; i++) {
      chi = gente[i];
      if (visti[chi.nick]) { continue; }
      visti[chi.nick] = true;

      if (chi.nick === conf.canale) { nomeStreamer = chi.nome || nomeStreamer; continue; }

      // I bot prima dei ruoli: un bot moderatore e' un bot, ed e' quello che
      // uno vuole vedere quando guarda l'elenco.
      if (eBot(chi.nick)) { bot.push(chi); continue; }

      detto = dettiDaiBadge[chi.nick];

      if (dentroMod[chi.nick] || (detto && detto.mod)) { moderatori.push(chi); continue; }
      if (dentroVip[chi.nick] || (detto && detto.vip)) { vipi.push(chi); continue; }
      utenti.push(chi);
    }

    moderatori.sort(perNome);
    vipi.sort(perNome);
    bot.sort(perNome);
    utenti.sort(perNome);

    scomparti = { moderatori: moderatori, vip: vipi, bot: bot, utenti: utenti };
  }

  function scusa(r, padrone) {
    if (!r.guaioChatters) { return STORTO; }
    if (r.scollegato) { return r.guaioChatters; }
    if (r.guaioChatters === SENZA_CHATTERS || r.guaioChatters === SENZA_ME) { return r.guaioChatters; }
    if (padrone || r.spettatori === null) { return r.guaioChatters; }

    // NON_MOD solo sul 403, che e' l'unico stato in cui Twitch sta davvero
    // dicendo «non sei un suo moderatore». Prima ci finiva dentro qualunque
    // guasto — un 429, un 500, la rete che cade — e a un moderatore vero il
    // pollaio rispondeva «qui non lo sei», che e' falso e manda a cercare la
    // cosa sbagliata.
    if (r.statoChatters !== 403) { return r.guaioChatters; }
    return NON_MOD;
  }

  function raccogli(pieno, padrone, r) {
    var riuscito = false;

    if (r.spettatori !== null) { spettatori = r.spettatori; riuscito = true; }
    guaioSpettatori = r.guaioSpettatori;
    if (r.nome) { nomeStreamer = r.nome; }

    if (pieno) {
      if (r.lista) {
        riuscito = true;
        inChat = r.totale;
        dividi(r.lista, r.mod, r.vip);
        guaioLista = r.guaioRuoli;
      } else {
        guaioLista = scusa(r, padrone);
      }
    }

    if (riuscito) { quando = Date.now(); errori = 0; }
    else { errori++; }

    consegna();

    if (errori >= ERRORI_MAX) {
      console.warn('[pollaio] rinuncio a contare la gente dopo ' + errori + ' letture andate male.');
      ferma();
    }
  }

  function giro(pieno) {
    var c = conto();
    if (!acceso || inVolo || !c) { return; }

    var io = (typeof c.chi === 'function') ? c.chi() : null;
    var mio = io ? String(io.utenteId || '') : '';
    var padrone = !!mio && mio === conf.canaleId;
    var mia = sessione;

    var r = {
      spettatori: null,
      nome: '',
      guaioSpettatori: '',
      lista: null,
      totale: 0,
      guaioChatters: '',
      statoChatters: 0,
      scollegato: false,
      mod: null,
      vip: null,
      guaioRuoli: ''
    };

    var restano = 1;

    function meno() {
      restano--;
      if (restano > 0) { return; }
      if (mia !== sessione) { return; }

      inVolo = false;
      if (!acceso) { return; }

      raccogli(pieno, padrone, r);
      if (acceso) { riarma(); }
    }

    inVolo = true;
    ultimaLettura = Date.now();
    if (pieno) { ultimaLista = ultimaLettura; }

    restano++;
    c.verso('GET', SPETTATORI + encodeURIComponent(conf.canaleId), null, function (guaio, dati) {
      if (guaio) { r.guaioSpettatori = guaio; meno(); return; }

      var voci = dati && dati.data;
      if (!elenco(voci)) { r.guaioSpettatori = STORTO; meno(); return; }

      if (!voci.length) { r.spettatori = -1; meno(); return; }

      r.spettatori = Math.max(0, parseInt(voci[0].viewer_count, 10) || 0);
      r.nome = pulito(voci[0].user_name, '');
      meno();
    });

    if (pieno) {
      if (!mio) {
        r.guaioChatters = SENZA_ME;
      } else if (!permesso(SCOPO_CHATTERS)) {
        r.guaioChatters = SENZA_CHATTERS;
      } else {
        restano++;
        sfoglia(CHATTERS + encodeURIComponent(conf.canaleId) +
          '&moderator_id=' + encodeURIComponent(mio) +
          '&first=' + PER_PAGINA, TETTO_PAGINE,
          function (guaio, gente, totale, scollegato, stato) {
            if (guaio) {
              r.guaioChatters = guaio;
              r.scollegato = scollegato;
              r.statoChatters = stato;
              meno();
              return;
            }
            r.lista = gente;
            r.totale = totale;
            meno();
          });
      }

      if (!padrone) {
        r.guaioRuoli = ALTRUI;
      } else {
        if (!permesso(SCOPO_MODERATORI)) {
          r.guaioRuoli = uniti([r.guaioRuoli, SENZA_MODERATORI]);
        } else {
          restano++;
          sfoglia(MODERATORI + encodeURIComponent(conf.canaleId) +
            '&first=' + PER_PAGINA_RUOLI, TETTO_PAGINE_RUOLI,
            function (guaio, gente) {
              if (guaio) { r.guaioRuoli = uniti([r.guaioRuoli, guaio]); }
              else { r.mod = gente; }
              meno();
            });
        }

        if (!permesso(SCOPO_VIP)) {
          r.guaioRuoli = uniti([r.guaioRuoli, SENZA_VIP]);
        } else {
          restano++;
          sfoglia(VIP + encodeURIComponent(conf.canaleId) +
            '&first=' + PER_PAGINA_RUOLI, TETTO_PAGINE_RUOLI,
            function (guaio, gente) {
              if (guaio) { r.guaioRuoli = uniti([r.guaioRuoli, guaio]); }
              else { r.vip = gente; }
              meno();
            });
        }
      }
    }

    meno();
  }

  function siVede() {
    if (typeof conf.visibile !== 'function') { return true; }
    try { return conf.visibile() !== false; }
    catch (err) { return true; }
  }

  function vuoleLista() {
    if (!siVede()) { return false; }
    return (Date.now() - ultimaLista) >= (RITMO_LISTA - TOLLERANZA);
  }

  function parti() {
    var pieno = chiesto || vuoleLista();
    chiesto = false;
    giro(pieno);
  }

  function battito() {
    timer = null;
    if (!acceso) { return; }
    parti();
  }

  function riarma() {
    var attesa = RITMO_SPETTATORI;
    var passato;

    clearTimeout(timer);
    timer = null;
    if (!acceso) { return; }

    if (chiesto) {
      passato = Date.now() - ultimaLettura;
      attesa = Math.max(0, RITMO_MINIMO - passato);
    }

    timer = setTimeout(battito, attesa);
  }

  function aggiorna() {
    if (!acceso) { return false; }

    chiesto = true;
    if (inVolo) { return false; }

    var passato = Date.now() - ultimaLettura;

    clearTimeout(timer);
    timer = null;

    if (passato >= RITMO_MINIMO) { parti(); return true; }

    timer = setTimeout(battito, RITMO_MINIMO - passato);
    return false;
  }

  function ferma() {
    acceso = false;
    chiesto = false;
    inVolo = false;
    sessione++;
    clearTimeout(timer);
    timer = null;
  }

  function azzera() {
    spettatori = null;
    nomeStreamer = '';
    inChat = 0;
    scomparti = { moderatori: [], vip: [], bot: [], utenti: [] };

    // Cambiando canale i badge visti valgono per l’altro, non per questo.
    dettiDaiBadge = Object.create(null);
    quando = 0;
    guaioSpettatori = '';
    guaioLista = '';
    ultimo = null;
    ultimaFirma = '';
    errori = 0;
    ultimaLettura = 0;
    ultimaLista = 0;
  }

  function piuTardi() {
    clearTimeout(timer);
    timer = setTimeout(function () { timer = null; consegna(); }, 0);
  }

  // I bot non sono un dato di Twitch: `chat/chatters` restituisce nomi e basta,
  // e il distintivo da bot non esce da nessuna API. Sono quelli che l'utente ha
  // scritto nella sua manopola, piu' quelli che la chat ha fatto riconoscere.
  function nomiDiBot(dato) {
    var fuori = [];
    var pezzi = Array.isArray(dato) ? dato : String(dato || '').split(',');
    var i;
    var nome;

    for (i = 0; i < pezzi.length; i++) {
      nome = String(pezzi[i] || '').trim().toLowerCase();
      if (nome && MODELLO_CANALE.test(nome) && fuori.indexOf(nome) === -1) { fuori.push(nome); }
    }
    return fuori;
  }

  function avvia(contesto) {
    ferma();
    azzera();

    var o = contesto || {};
    var canale = String(o.canale || '').trim().toLowerCase();
    var canaleId = String(o.canaleId || '').trim();

    conf = {
      canale: MODELLO_CANALE.test(canale) ? canale : '',
      canaleId: MODELLO_ID.test(canaleId) ? canaleId : '',
      bot: nomiDiBot(o.bot),
      su: (typeof o.su === 'function') ? o.su : null,
      visibile: (typeof o.visibile === 'function') ? o.visibile : null
    };

    if (!conf.su) { return false; }

    if (!conf.canale || !conf.canaleId) {
      guaioLista = SENZA_CANALE;
      piuTardi();
      return false;
    }

    var c = conto();

    if (!c) {
      guaioLista = SENZA_TWITCH;
      piuTardi();
      return false;
    }

    if (typeof c.collegato !== 'function' || !c.collegato()) {
      guaioLista = SENZA_CONTO;
      piuTardi();
      return false;
    }

    acceso = true;
    sessione++;
    giro(siVede());
    return true;
  }

  window.Gente = {
    avvia: avvia,
    ferma: ferma,
    aggiorna: aggiorna,
    visto: visto,
    stato: function () { return ultimo || foto(); }
  };
}());
