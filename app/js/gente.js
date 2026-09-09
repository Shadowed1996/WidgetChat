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

  var ALTRUI = 'Questo canale non è il tuo, quindi non so chi è moderatore e chi è VIP: li trovi tutti fra gli utenti.';

  var STORTO = 'Twitch ha risposto in un modo che non capisco.';

  var conf = { canale: '', canaleId: '', su: null, visibile: null };

  var acceso = false;
  var inVolo = false;
  var chiesto = false;
  var timer = null;
  var sessione = 0;
  var errori = 0;

  var ultimaLettura = 0;
  var ultimaLista = 0;

  var spettatori = 0;
  var nomeStreamer = '';
  var inChat = 0;
  var scomparti = { moderatori: [], vip: [], utenti: [] };
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
      utenti: copia(scomparti.utenti),
      quando: quando,
      guaio: uniti([guaioSpettatori, guaioLista])
    };
  }

  function firma(s) {
    return s.spettatori + '|' + s.inChat + '|' + s.guaio + '|' +
      nomi(s.streamer) + '|' + nomi(s.moderatori) + '|' +
      nomi(s.vip) + '|' + nomi(s.utenti);
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
        function (guaio, dati, scollegato) {
          if (guaio) { su(guaio, null, 0, scollegato === true); return; }

          var voci = dati && dati.data;
          if (!elenco(voci)) { su(STORTO, null, 0, false); return; }

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

  function dividi(gente, mod, vip) {
    var dentroMod = insieme(mod);
    var dentroVip = insieme(vip);
    var visti = Object.create(null);
    var moderatori = [];
    var vipi = [];
    var utenti = [];
    var i;
    var chi;

    for (i = 0; i < gente.length; i++) {
      chi = gente[i];
      if (visti[chi.nick]) { continue; }
      visti[chi.nick] = true;

      if (chi.nick === conf.canale) { nomeStreamer = chi.nome || nomeStreamer; continue; }
      if (dentroMod[chi.nick]) { moderatori.push(chi); continue; }
      if (dentroVip[chi.nick]) { vipi.push(chi); continue; }
      utenti.push(chi);
    }

    moderatori.sort(perNome);
    vipi.sort(perNome);
    utenti.sort(perNome);

    scomparti = { moderatori: moderatori, vip: vipi, utenti: utenti };
  }

  function scusa(r, padrone) {
    if (!r.guaioChatters) { return STORTO; }
    if (r.scollegato) { return r.guaioChatters; }
    if (r.guaioChatters === SENZA_CHATTERS || r.guaioChatters === SENZA_ME) { return r.guaioChatters; }
    if (padrone || r.spettatori === null) { return r.guaioChatters; }
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
          function (guaio, gente, totale, scollegato) {
            if (guaio) {
              r.guaioChatters = guaio;
              r.scollegato = scollegato;
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
    spettatori = 0;
    nomeStreamer = '';
    inChat = 0;
    scomparti = { moderatori: [], vip: [], utenti: [] };
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

  function avvia(contesto) {
    ferma();
    azzera();

    var o = contesto || {};
    var canale = String(o.canale || '').trim().toLowerCase();
    var canaleId = String(o.canaleId || '').trim();

    conf = {
      canale: MODELLO_CANALE.test(canale) ? canale : '',
      canaleId: MODELLO_ID.test(canaleId) ? canaleId : '',
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
    stato: function () { return ultimo || foto(); }
  };
}());
