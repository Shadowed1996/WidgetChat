(function () {
  'use strict';

  const CANALE_RIPIEGO = 'slayer_beard';
  const ID_CANALE_RIPIEGO = '47738247';

  const TINTE = 16;
  const MAX_NOME = 25;
  const RICORDO = 12;
  const SUBITO = 120;
  const DOPO_COPIONE = 900;
  const RITMO_MIN = 0.1;
  const RITMO_MAX = 20;

  const PAUSE_CALME = [3000, 3400, 3800, 4300, 4800, 5200, 5600, 6000];
  const PAUSE_RAFFICA = [180, 240, 300, 360, 420];
  const PAUSE_DOPO_RAFFICA = [3800, 4600, 5400, 6200];
  const LUNGHEZZA_RAFFICA = [5, 6, 7, 8];

  const SCINTILLA = ['no', 'no', 'no', 'no', 'no', 'sì'];
  const QUANDO_RARO = ['no', 'no', 'no', 'no', 'no', 'no', 'sì'];

  const GENERI = [
    'normale', 'normale', 'normale', 'normale', 'normale', 'normale',
    'emote', 'emote', 'lungo', 'risposta', 'menzione', 'azione', 'link'
  ];

  const PIATTAFORME = [
    'twitch', 'twitch', 'twitch', 'twitch', 'twitch',
    'youtube', 'youtube', 'kick', 'tiktok'
  ];

  const PIANI = ['1000', '1000', '1000', '2000', '3000', 'Prime'];
  const MESI_RIABBONAMENTO = [3, 6, 8, 11, 14, 19, 24, 27, 36];
  const DURATE_PAUSA = [60, 300, 600, 1800];
  const RAID_SPETTATORI = 42;
  const REGALI_IN_BLOCCO = 5;
  const BITS_MEDI = 100;
  const BITS_GROSSI = 1500;

  let acceso = false;
  let su = null;
  let ritmo = 1;
  let ostile = false;
  let canale = CANALE_RIPIEGO;
  let idCanale = ID_CANALE_RIPIEGO;
  let raffica = 0;
  let contatore = 0;

  const timer = [];
  const recenti = [];

  function pesca(voci) {
    if (!voci || !voci.length) { return null; }
    if (voci.length === 1) { return voci[0]; }

    let scelta = voci.ultima;
    for (let giro = 0; giro < 6 && scelta === voci.ultima; giro++) {
      scelta = voci[Math.floor(Math.random() * voci.length)];
    }
    voci.ultima = scelta;
    return scelta;
  }

  function forse(sacchetto) {
    return pesca(sacchetto) === 'sì';
  }

  function fra(ritardo, azione, esatto) {
    const attesa = esatto ? ritardo : Math.max(0, Math.round(ritardo / ritmo));
    const chiave = setTimeout(function () {
      const posto = timer.indexOf(chiave);
      if (posto >= 0) { timer.splice(posto, 1); }
      if (!acceso) { return; }
      try {
        azione();
      } catch (err) {

        console.warn('[pollaio] prova: un battito è saltato:', err);
      }
    }, attesa);
    timer.push(chiave);
    return chiave;
  }

  function chiedi(modulo, nome, firme, valida) {
    if (!modulo || typeof modulo[nome] !== 'function') { return null; }
    for (let i = 0; i < firme.length; i++) {
      let esito = null;
      try {
        esito = modulo[nome].apply(modulo, firme[i]);
      } catch (err) {
        esito = null;
      }
      if (valida(esito)) { return esito; }
    }
    return null;
  }

  function nuovoId() {
    contatore += 1;
    return 'prova-' + contatore;
  }

  function numero(valore, ripiego) {
    const n = parseFloat(valore);
    return (isFinite(n) && n > 0) ? n : ripiego;
  }

  const tavolozza = [];

  function leggiTavolozza() {
    tavolozza.length = 0;
    if (typeof document === 'undefined' || !document.documentElement) { return; }
    if (typeof getComputedStyle !== 'function') { return; }

    let stile = null;
    try {
      stile = getComputedStyle(document.documentElement);
    } catch (err) {
      return;
    }
    for (let i = 0; i < TINTE; i++) {
      let tinta = '';
      try {
        tinta = (stile.getPropertyValue('--nick-' + i) || '').trim();
      } catch (err) {
        tinta = '';
      }
      tavolozza.push(tinta);
    }
  }

  function coloreDi(persona) {
    return tavolozza[persona.tinta] || '';
  }

  function scheda(nome, tinta, peso, badges, badgeInfo, ruoli) {
    const r = ruoli || {};
    return {
      nome: nome.slice(0, MAX_NOME),
      nick: nome.toLowerCase(),
      id: '',
      tinta: tinta,
      peso: peso,
      badges: badges || '',
      badgeInfo: badgeInfo || '',
      ruoli: {
        capo: !!r.capo,
        mod: !!r.mod,
        vip: !!r.vip,
        abbonato: !!r.abbonato,
        artista: !!r.artista,
        staff: !!r.staff,
        bot: !!r.bot
      }
    };
  }

  const PERSONE = [
    scheda('slayer_beard',   0, 3, 'broadcaster/1,subscriber/12', 'subscriber/58', { capo: true, abbonato: true }),

    scheda('Marte_Rossa',    1, 5, 'moderator/1,subscriber/6',    'subscriber/31', { mod: true, abbonato: true }),
    scheda('gio_ninetto',    2, 4, 'moderator/1,subscriber/12',   'subscriber/44', { mod: true, abbonato: true }),
    scheda('TizzoDiBrace',   3, 3, 'moderator/1,premium/1',       '',              { mod: true }),

    scheda('NonnaVulcano',   4, 4, 'vip/1,subscriber/9',          'subscriber/22', { vip: true, abbonato: true }),
    scheda('pinoDelSud99',   5, 3, 'vip/1',                       '',              { vip: true }),

    scheda('cresta_viola',   6, 5, 'subscriber/3',                'subscriber/14', { abbonato: true }),
    scheda('LupoScalzo',     7, 4, 'subscriber/12',               'subscriber/37', { abbonato: true }),
    scheda('bea_trice_92',   8, 4, 'subscriber/1',                'subscriber/2',  { abbonato: true }),
    scheda('ManicoDiScopa',  9, 3, 'subscriber/6,premium/1',      'subscriber/19', { abbonato: true }),
    scheda('zeta_87',       10, 3, 'subscriber/2',                'subscriber/5',  { abbonato: true }),
    scheda('RicciodiMare',  11, 3, 'subscriber/18',               'subscriber/51', { abbonato: true }),
    scheda('teo_fuffa',     12, 3, 'subscriber/3',                'subscriber/9',  { abbonato: true }),

    scheda('Cassandra_Bit', 13, 3, 'premium/1',                   '',              {}),
    scheda('mirko1988',     14, 3, '',                            '',              {}),
    scheda('La_Piadina',    15, 3, '',                            '',              {}),
    scheda('gufo_notturno',  2, 2, 'premium/1',                   '',              {}),
    scheda('Sara_x3',        5, 2, '',                            '',              {}),
    scheda('ok_boomerino',   8, 2, '',                            '',              {}),
    scheda('TartaVeloce',   11, 2, '',                            '',              {}),

    scheda('sery_bot',      13, 1, 'moderator/1',                 '',              { mod: true, bot: true })
  ];

  const SACCHETTO = [];
  (function numeraEriempi() {
    for (let i = 0; i < PERSONE.length; i++) {
      const persona = PERSONE[i];
      persona.id = persona.ruoli.capo ? idCanale : String(900000000 + i);
      for (let volta = 0; volta < persona.peso; volta++) {
        SACCHETTO.push(persona);
      }
    }
  }());

  const CAPO = PERSONE.filter(function (p) { return p.ruoli.capo; })[0] || PERSONE[0];
  const SPETTATORI = PERSONE.filter(function (p) { return !p.ruoli.capo && !p.ruoli.bot; });

  function pescaPersona() {
    return pesca(SACCHETTO) || PERSONE[0];
  }

  function spettatoreBuono(persona) {
    return !persona.ruoli.capo && !persona.ruoli.bot &&
      piattaformaDi(persona) === 'twitch';
  }

  function pescaSpettatore() {
    let persona = pescaPersona();
    for (let giro = 0; giro < 8 && !spettatoreBuono(persona); giro++) {
      persona = pescaPersona();
    }
    if (spettatoreBuono(persona)) { return persona; }

    for (let i = 0; i < SPETTATORI.length; i++) {
      if (spettatoreBuono(SPETTATORI[i])) { return SPETTATORI[i]; }
    }
    return SPETTATORI[0];
  }

  function copiaRuoli(ruoli) {
    return {
      capo: ruoli.capo,
      mod: ruoli.mod,
      vip: ruoli.vip,
      abbonato: ruoli.abbonato,
      artista: ruoli.artista,
      staff: ruoli.staff,
      bot: ruoli.bot
    };
  }

  const FRASI = [
    'ahahahah',
    'ma che fai',
    'GG',
    'no vabbè',
    'ci sono anche io',
    'quel boss è impossibile',
    'buonasera a tutti',
    'occhio dietro!!',
    'sto morendo dal ridere',
    'ma è scriptato secondo me',
    'nooo ma dai',
    'bella giocata davvero',
    'io ci ho messo tre ore su quel pezzo',
    'raga ma la vita',
    'primo tentativo eh',
    'ma sei serio',
    'lag o sono io',
    'ma quanto manca alla fine',
    'ci siamo quasi dai',
    'te lo dico io che muori',
    'l\'avevo detto',
    'clip clip clip',
    'ma no il checkpoint',
    'stavolta ce la fai',
    'io guardo e soffro',
    'che musica è questa',
    'oh finalmente',
    'ma quello ti stava dietro da mezz\'ora',
    'niente da fare',
    'sono appena arrivato e mi sono già perso',
    'ma perché non usi la pozione',
    'ho la ram che piange solo a guardarlo',
    'buonasera capo',
    'a me va bene così',
    'seh vabbè',
    'io a quel punto avrei spento tutto',
    'daje',
    'ma è normale che faccia così',
    'stasera si fa tardi lo sento',
    'quel salto non lo fa nessuno',
    'ok adesso mi arrabbio pure io',
    'ma come hai fatto',
    'un altro tentativo e poi vado a cena',
    'ancora questo pezzo no ti prego',
    'il rumore in sottofondo è il cane?',
    'secondo me la prendi',
    'due ore fa dicevi la stessa cosa',
    'mamma mia che paura'
  ];

  const FRASI_EMOTE = [
    'KEKW',
    'monkaS',
    'Sadge',
    'catJAM catJAM catJAM',
    'KEKW KEKW KEKW',
    'PogChamp PogChamp',
    'Clap Clap Clap',
    'peepoHappy buonasera',
    'monkaS occhio che arriva',
    'OMEGALUL ma davvero',
    'EZ Clap',
    'Copium',
    'widepeepoHappy che bello che ci sei',
    'PauseChamp aspetto'
  ];

  const FRASI_LUNGHE = [
    'allora io dico la mia poi fate voi ma secondo me quel boss si fa molto meglio se stai in mezzo e aspetti che faccia il salto invece di provare a stargli dietro che tanto lui è più veloce di te e ti prende sempre',
    'ragazzi vi giuro che ieri sera ho provato lo stesso identico pezzo per due ore e mezza senza passarlo mai e poi stamattina al primo colpo pulito senza prendere un danno e ancora non ho capito cosa ho fatto di diverso',
    'scusate il messaggio lungo ma volevo dire che vi seguo da un annetto ormai e questa è la prima volta che scrivo in chat quindi ciao a tutti e buona serata anche a chi legge e non scrive mai',
    'no aspetta perché se prendi la scorciatoia a sinistra ti salti tutta la parte del ponte che poi è quella dove muoiono tutti quindi secondo me conviene anche se ti perdi il forziere grosso in fondo',
    'comunque la cosa bella di questo gioco è che sembra facilissimo finché lo guardi e poi lo provi e capisci che ogni singolo nemico è messo lì apposta per farti innervosire nel punto preciso in cui non te lo aspetti'
  ];

  const FRASI_LINK = ['guardate qua', 'l\'ho trovato qui', 'per chi lo chiedeva è questo', 'sta tutto scritto qui'];
  const CODE_LINK = ['', '/about', '/schedule', '/videos'];

  const FRASI_MENZIONE = ['dietro di te!!', 'la mappa la apri o no', 'grande', 'ma allora ci sei', 'stavi per morire eh'];

  const FRASI_RISPOSTA = ['ma infatti', 'esatto', 'no perché quello poi ti prende', 'ahahah verissimo', 'sono d\'accordo', 'ma anche no'];

  const FRASI_PRIMO = [
    'ciao a tutti primo messaggio',
    'buonasera scrivo per la prima volta',
    'ciao ragazzi passavo di qua e sono rimasto'
  ];

  const FRASI_BENTORNATO = ['eccomi, mancavo da un po\'', 'ciao raga, quanto tempo', 'sono tornato, che mi sono perso'];

  const FRASI_AZIONE = ['si nasconde dietro il divano', 'prende i popcorn', 'guarda la scena da dietro le dita', 'lancia una pozione'];

  const FRASI_EVIDENZA = [
    'ho riscattato i punti solo per dire che quel salto era pulitissimo',
    'uso i punti per dirti che sei un grande, vai avanti così',
    'metto in evidenza perché non lo ha detto nessuno: la musica di questa zona è bellissima'
  ];

  const FRASI_ANNUNCIO = [
    'stasera si va avanti finché non lo finiamo',
    'domani niente diretta, ci vediamo giovedì alla stessa ora',
    'grazie a tutti quelli che sono passati, siete tantissimi'
  ];

  const FRASI_RIABBONAMENTO = [
    'un altro mese, ci sono',
    'e non hai ancora battuto quel boss',
    'ci sono da quando giocavi al primo capitolo'
  ];

  const FRASI_BITS = ['tieni duro', 'questa è per il boss', 'bravo davvero', 'te li sei meritati'];

  const FRASI_BOT = [
    'la diretta è iniziata da 42 minuti',
    'ricordati di bere, ci vuole poco',
    'comandi disponibili: !social !pc !gioco'
  ];

  function frasiPer(persona) {
    return persona.ruoli.bot ? FRASI_BOT : FRASI;
  }

  const SEGNI = /(https?:\/\/[^\s]+|www\.[^\s]+|@[A-Za-z0-9_]{2,25})/g;

  function pezziDi(testo, tags, bits) {
    if (!testo) { return []; }

    const veri = chiedi(window.Emote, 'pezzi', [[testo, (tags && tags.emotes) || '', bits || 0], [testo, tags]], function (esito) {
      return Array.isArray(esito) && esito.length > 0 && !!esito[0] && typeof esito[0].tipo === 'string';
    });
    return veri || pezziSemplici(testo);
  }

  function pezziSemplici(testo) {
    const pezzi = [];
    let scorso = 0;
    let trovato = null;

    SEGNI.lastIndex = 0;
    while ((trovato = SEGNI.exec(testo)) !== null) {
      if (trovato.index > scorso) {
        pezzi.push({ tipo: 'testo', testo: testo.slice(scorso, trovato.index) });
      }
      const voce = trovato[0];
      if (voce.charAt(0) === '@') {
        pezzi.push({
          tipo: 'menzione',
          nome: voce,
          nostra: voce.slice(1).toLowerCase() === canale
        });
      } else {

        const ripulito = voce.replace(/^http:\/\//i, '');
        pezzi.push({
          tipo: 'link',
          testo: voce,
          url: /^https:\/\//i.test(voce) ? voce : 'https://' + ripulito
        });
      }
      scorso = trovato.index + voce.length;
    }
    if (scorso < testo.length) {
      pezzi.push({ tipo: 'testo', testo: testo.slice(scorso) });
    }
    return pezzi;
  }

  function testoPiatto(pezzi) {
    let riga = '';
    for (let i = 0; i < pezzi.length; i++) {
      const pezzo = pezzi[i];
      if (pezzo.tipo === 'testo') { riga += pezzo.testo; }
      else if (pezzo.tipo === 'emote' || pezzo.tipo === 'cheer') { riga += ' ' + pezzo.nome + ' '; }
      else if (pezzo.tipo === 'link') { riga += pezzo.testo; }
      else if (pezzo.tipo === 'menzione') { riga += pezzo.nome; }
    }
    return riga.replace(/\s+/g, ' ').trim();
  }

  function tagFinti(persona, extra) {
    const tags = {
      'id': nuovoId(),
      'badges': persona.badges,
      'badge-info': persona.badgeInfo,
      'color': '',
      'display-name': persona.nome,
      'login': persona.nick,
      'user-id': persona.id,
      'room-id': idCanale,
      'emotes': '',
      'tmi-sent-ts': String(Date.now())
    };
    if (extra) {
      for (const chiave in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, chiave)) {
          tags[chiave] = extra[chiave];
        }
      }
    }
    return tags;
  }

  function badgeDi(tags) {
    if (!tags.badges) { return []; }

    const veri = chiedi(window.Badge, 'leggi', [[tags.badges, tags['badge-info']], [tags]], function (esito) {
      return Array.isArray(esito) && esito.length > 0 && !!esito[0] && typeof esito[0].chiave === 'string';
    });
    return veri || [];
  }

  function rilievoDi(messaggio, tags) {
    return chiedi(window.Rilievo, 'valuta', [[messaggio], [messaggio, tags]], function (esito) {
      return !!esito && typeof esito.livello === 'number';
    });
  }

  function piattaformaDi(persona) {
    const nick = String((persona && persona.nick) || '');
    let somma = 0;
    for (let i = 0; i < nick.length; i++) { somma += nick.charCodeAt(i); }
    return PIATTAFORME[somma % PIATTAFORME.length];
  }

  function quiSiParlaTwitch(opz) {
    return !!(opz.evento || opz.bits || opz.primo || opz.ritorno ||
      (opz.tag && opz.tag['msg-id']));
  }

  function costruisci(persona, testo, opzioni) {
    const opz = opzioni || {};
    const tags = opz.tags || tagFinti(persona, opz.tag);
    const piattaforma = quiSiParlaTwitch(opz)
      ? 'twitch'
      : (opz.piattaforma || piattaformaDi(persona));

    const messaggio = {
      id: tags.id,
      tipo: opz.tipo || 'messaggio',
      ts: Date.now(),
      utenteId: persona.id,
      nick: persona.nick,
      nome: persona.nome,
      colore: coloreDi(persona),

      badge: piattaforma === 'twitch' ? badgeDi(tags) : [],
      ruoli: copiaRuoli(persona.ruoli),
      pezzi: pezziDi(testo, tags, opz.bits || 0),
      bits: opz.bits || 0,
      risposta: opz.risposta || null,
      primo: !!opz.primo,
      ritorno: !!opz.ritorno,
      rilievo: null,
      evento: opz.evento || null,
      cancellato: false,

      piattaforma: piattaforma,

      msgId: tags['msg-id'] || ''
    };
    messaggio.rilievo = rilievoDi(messaggio, tags);
    return messaggio;
  }

  function ricorda(messaggio) {

    if (messaggio.tipo !== 'messaggio' && messaggio.tipo !== 'azione') { return; }

    recenti.push({
      id: messaggio.id,
      nick: messaggio.nick,
      nome: messaggio.nome,
      testo: testoPiatto(messaggio.pezzi)
    });
    while (recenti.length > RICORDO) { recenti.shift(); }
  }

  function manda(messaggio) {
    if (!acceso || !messaggio || typeof su !== 'function') { return; }
    ricorda(messaggio);
    try {
      su(messaggio);
    } catch (err) {
      console.warn('[pollaio] prova: l\'ascoltatore è saltato su un messaggio:', err);
    }
  }

  function normale() {
    const persona = pescaPersona();
    return costruisci(persona, pesca(frasiPer(persona)), {});
  }

  function soloEmote() {
    return costruisci(pescaPersona(), pesca(FRASI_EMOTE), {});
  }

  function lungo() {
    return costruisci(pescaSpettatore(), pesca(FRASI_LUNGHE), {});
  }

  function conLink() {
    const testo = pesca(FRASI_LINK) + ' https://twitch.tv/' + canale + pesca(CODE_LINK);
    return costruisci(pescaSpettatore(), testo, {});
  }

  function menzione() {
    return costruisci(pescaSpettatore(), '@' + canale + ' ' + pesca(FRASI_MENZIONE), {});
  }

  function azione() {
    return costruisci(pescaPersona(), pesca(FRASI_AZIONE), { tipo: 'azione' });
  }

  function risposta() {
    const bersaglio = pesca(recenti);
    if (!bersaglio) { return normale(); }

    return costruisci(pescaPersona(), pesca(FRASI_RISPOSTA), {
      tag: {
        'reply-parent-msg-id': bersaglio.id,
        'reply-parent-user-login': bersaglio.nick,
        'reply-parent-display-name': bersaglio.nome,
        'reply-parent-msg-body': bersaglio.testo
      },
      risposta: { nome: bersaglio.nome, testo: bersaglio.testo }
    });
  }

  function pescaMessaggio() {
    switch (pesca(GENERI)) {
      case 'emote':    return soloEmote();
      case 'lungo':    return lungo();
      case 'risposta': return risposta();
      case 'menzione': return menzione();
      case 'azione':   return azione();
      case 'link':     return conLink();
      default:         return normale();
    }
  }

  function chiediEvento(comando, tags, corpo) {

    if (comando === 'CLEARCHAT' || comando === 'CLEARMSG') {
      return chiedi(window.Eventi, 'moderazione',
        [[comando, tags, '#' + canale + ' :' + (corpo || '')]],
        function (esito) { return !!esito && typeof esito.genere === 'string'; });
    }

    return chiedi(window.Eventi, 'leggi', [[comando, tags, corpo], [tags, corpo], [tags]], function (esito) {
      return !!esito && typeof esito.genere === 'string';
    });
  }

  function conScheda(persona, testo, comando, extra, corpo, tipo) {
    const tags = tagFinti(persona, extra);
    const scheda = chiediEvento(comando, tags, corpo === undefined ? testo : corpo);
    if (!scheda) { return null; }

    return costruisci(persona, testo, {
      tipo: tipo || 'evento',
      tags: tags,
      evento: scheda
    });
  }

  function abbonamento() {
    const persona = pescaSpettatore();
    return conScheda(persona, '', 'USERNOTICE', {
      'msg-id': 'sub',
      'msg-param-sub-plan': pesca(PIANI),
      'msg-param-cumulative-months': '1',
      'msg-param-months': '1',
      'system-msg': persona.nome + ' si è appena abbonato'
    }, '');
  }

  function riabbonamento() {
    const persona = pescaSpettatore();
    const mesi = String(pesca(MESI_RIABBONAMENTO));
    return conScheda(persona, pesca(FRASI_RIABBONAMENTO), 'USERNOTICE', {
      'msg-id': 'resub',
      'msg-param-sub-plan': pesca(PIANI),
      'msg-param-cumulative-months': mesi,
      'msg-param-streak-months': mesi,
      'msg-param-should-share-streak': '1',
      'system-msg': persona.nome + ' si è riabbonato, ' + mesi + ' mesi di fila'
    });
  }

  function regalo() {
    const chiDona = pescaSpettatore();
    const chiRiceve = pescaSpettatore();
    return conScheda(chiDona, '', 'USERNOTICE', {
      'msg-id': 'subgift',
      'msg-param-sub-plan': pesca(PIANI),
      'msg-param-months': '1',
      'msg-param-gift-months': '1',
      'msg-param-recipient-id': chiRiceve.id,
      'msg-param-recipient-user-name': chiRiceve.nick,
      'msg-param-recipient-display-name': chiRiceve.nome,
      'system-msg': chiDona.nome + ' ha regalato un abbonamento a ' + chiRiceve.nome
    }, '');
  }

  function regali() {
    const persona = pescaSpettatore();
    return conScheda(persona, '', 'USERNOTICE', {
      'msg-id': 'submysterygift',
      'msg-param-sub-plan': '1000',
      'msg-param-mass-gift-count': String(REGALI_IN_BLOCCO),
      'msg-param-sender-count': '23',
      'system-msg': persona.nome + ' ha regalato ' + REGALI_IN_BLOCCO + ' abbonamenti'
    }, '');
  }

  function raid() {
    const persona = pescaSpettatore();
    return conScheda(persona, '', 'USERNOTICE', {
      'msg-id': 'raid',
      'msg-param-displayName': persona.nome,
      'msg-param-login': persona.nick,
      'msg-param-viewerCount': String(RAID_SPETTATORI),
      'system-msg': persona.nome + ' arriva con ' + RAID_SPETTATORI + ' spettatori'
    }, '');
  }

  function annuncio() {
    return conScheda(CAPO, pesca(FRASI_ANNUNCIO), 'USERNOTICE', {
      'msg-id': 'announcement',
      'msg-param-color': 'PURPLE'
    });
  }

  function pausa() {
    const persona = pescaSpettatore();
    return conScheda(persona, '', 'CLEARCHAT', {
      'ban-duration': String(pesca(DURATE_PAUSA)),
      'target-user-id': persona.id
    }, persona.nick, 'sistema');
  }

  function cancella() {

    const bersaglio = pesca(recenti);
    if (!bersaglio) { return null; }

    const persona = PERSONE.filter(function (p) { return p.nick === bersaglio.nick; })[0];
    if (!persona) { return null; }

    return conScheda(persona, '', 'CLEARMSG', {
      'login': bersaglio.nick,
      'target-msg-id': bersaglio.id
    }, bersaglio.testo, 'sistema');
  }

  function bits(quanti) {

    const testo = (quanti >= 1000)
      ? 'Cheer1000 Cheer500 ' + pesca(FRASI_BITS)
      : 'Cheer100 ' + pesca(FRASI_BITS);

    return costruisci(pescaSpettatore(), testo, {
      bits: quanti,
      tag: { 'bits': String(quanti) }
    });
  }

  function bitsMedi() { return bits(BITS_MEDI); }
  function bitsGrossi() { return bits(BITS_GROSSI); }

  function evidenza() {
    return costruisci(pescaSpettatore(), pesca(FRASI_EVIDENZA), {
      tag: { 'msg-id': 'highlighted-message' }
    });
  }

  function primoMessaggio() {
    return costruisci(pescaSpettatore(), pesca(FRASI_PRIMO), {
      primo: true,
      tag: { 'first-msg': '1' }
    });
  }

  function bentornato() {
    return costruisci(pescaSpettatore(), pesca(FRASI_BENTORNATO), {
      ritorno: true,
      tag: { 'returning-chatter': '1' }
    });
  }

  const CASI_RARI = [
    abbonamento, riabbonamento, regalo, regali, raid, annuncio,
    pausa, cancella, bitsMedi, bitsGrossi, evidenza, primoMessaggio, bentornato
  ];
  const RESIDUI = [];

  function prossimoRaro() {
    if (!RESIDUI.length) {
      const serbatoio = ostile ? CASI_RARI.concat(CASI_OSTILI) : CASI_RARI;
      for (let i = 0; i < serbatoio.length; i++) { RESIDUI.push(serbatoio[i]); }
    }
    const fabbrica = pesca(RESIDUI);
    if (!fabbrica) { return null; }

    const posto = RESIDUI.indexOf(fabbrica);
    if (posto >= 0) { RESIDUI.splice(posto, 1); }
    return fabbrica();
  }

  const SEGNI_ZALGO = '\u0300\u0301\u0302\u0303\u0308\u030a\u0327\u0334\u0348\u035c';

  const SCAVALCO = '\u202e';
  const ISOLA = '\u2066';

  function impila(testo, quanti) {
    let fuori = '';
    for (let i = 0; i < testo.length; i++) {
      fuori += testo.charAt(i);
      if (testo.charAt(i) === ' ') { continue; }
      for (let s = 0; s < quanti; s++) {
        fuori += SEGNI_ZALGO.charAt((Math.random() * SEGNI_ZALGO.length) | 0);
      }
    }
    return fuori;
  }

  function travestito(nome, nick) {
    const base = pescaSpettatore();
    const finto = {};
    let chiave;
    for (chiave in base) {
      if (Object.prototype.hasOwnProperty.call(base, chiave)) { finto[chiave] = base[chiave]; }
    }
    finto.nome = nome;
    if (nick) { finto.nick = nick; }
    return finto;
  }

  function zalgo() {
    return costruisci(pescaSpettatore(), impila('non riesco a crederci', 40));
  }

  function zalgoNelNome() {
    return costruisci(travestito(impila('Tizio', 30)), 'ciao a tutti');
  }

  function scavalcoDirezione() {
    return costruisci(
      travestito('Tizio' + SCAVALCO + 'oizit'),
      'guardate qui ' + SCAVALCO + 'onaipmac ies non'
    );
  }

  function nomeLunghissimo() {
    return costruisci(
      travestito('Wxyzabcdefghijklmnopqrstuvwxyzabcdefghij', 'wxyzabcdefghijklmnopqrstuvwxyz'),
      'scusate il nome'
    );
  }

  function muroDiTesto() {
    let muro = '';
    for (let i = 0; i < 24; i++) { muro += 'aaaaaaaaaaaaaaaaaaaa'; }
    return costruisci(pescaSpettatore(), muro);
  }

  function soloEmote() {
    return costruisci(pescaSpettatore(), 'Kappa Kappa Kappa Kappa Kappa Kappa Kappa Kappa Kappa Kappa Kappa Kappa');
  }

  function controlli() {
    return costruisci(pescaSpettatore(), 'ciao\u0007 a\u0000 tutti' + ISOLA + ' quanti siete\u001b');
  }

  function linkLunghissimo() {
    let coda = '';
    for (let i = 0; i < 12; i++) { coda += 'segmento-lungo-'; }
    return costruisci(pescaSpettatore(), 'guardate qua twitch.tv/' + coda + 'fine');
  }

  const CASI_OSTILI = [
    zalgo, zalgoNelNome, scavalcoDirezione, nomeLunghissimo,
    muroDiTesto, soloEmote, controlli, linkLunghissimo
  ];

  const COPIONE = [
    [SUBITO, normale],
    [620,  soloEmote],
    [1200, lungo],
    [1850, primoMessaggio],
    [2500, risposta],
    [3150, menzione],
    [3800, bitsMedi],
    [4500, abbonamento],
    [5150, normale],
    [5700, bitsGrossi],
    [6400, raid],
    [7100, evidenza],
    [7750, azione],
    [8350, annuncio],
    [9000, regali],
    [9600, conLink]
  ];

  function recita() {
    COPIONE.forEach(function (voce, posto) {
      fra(voce[0], function () {

        manda(voce[1]() || pescaMessaggio());
      }, posto === 0);
    });

    fra(COPIONE[COPIONE.length - 1][0] + DOPO_COPIONE, battito);
  }

  function battito() {
    if (!acceso) { return; }

    if (raffica > 0) {
      raffica -= 1;
      manda(pescaMessaggio());
      fra(raffica > 0 ? pesca(PAUSE_RAFFICA) : pesca(PAUSE_DOPO_RAFFICA), battito);
      return;
    }

    manda((forse(QUANDO_RARO) ? prossimoRaro() : null) || pescaMessaggio());

    if (forse(SCINTILLA)) {
      raffica = pesca(LUNGHEZZA_RAFFICA);
      fra(pesca(PAUSE_RAFFICA), battito);
      return;
    }
    fra(pesca(PAUSE_CALME), battito);
  }

  function leggiCanale() {
    const valori = (window.Impostazioni && window.Impostazioni.valori) || null;
    canale = (valori && typeof valori.canale === 'string' && valori.canale)
      ? valori.canale.toLowerCase()
      : CANALE_RIPIEGO;
    idCanale = (valori && valori.id) ? String(valori.id) : ID_CANALE_RIPIEGO;

    CAPO.id = idCanale;
  }

  function leggiOstile() {
    const valori = (window.Impostazioni && window.Impostazioni.valori) || null;
    ostile = !!(valori && valori.ostile);
  }

  function ferma() {
    acceso = false;
    while (timer.length) { clearTimeout(timer.pop()); }
    raffica = 0;
    recenti.length = 0;
    su = null;
  }

  window.Prova = {

    avvia: function (opzioni) {
      const opz = opzioni || {};

      if (typeof opz.su !== 'function') { return; }

      ferma();
      leggiCanale();
      leggiOstile();
      leggiTavolozza();

      su = opz.su;
      ritmo = Math.min(RITMO_MAX, Math.max(RITMO_MIN, numero(opz.ritmo, 1)));
      acceso = true;
      recita();
    },

    ferma: ferma,

    attiva: function () { return acceso; }
  };
}());
