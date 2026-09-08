/* =============================================================================
   pollaio.js — «il pollaio» · window.Pollaio

   POSSIEDE: l'avvio, la configurazione della radice e la TRADUZIONE da riga
   IRC a oggetto «messaggio» del §5. È il file che mette insieme i pezzi e
   l'unico che li conosce tutti.

   NON POSSIEDE: niente di quello che fanno gli altri. Non analizza il
   protocollo (irc.js), non cerca emote (emote.js), non decide cosa è
   importante (rilievo.js), non tocca il DOM (resa.js). Se una riga di questo
   file inizia a fare uno di quei mestieri, va spostata di là.

   INDICE
     1. Costanti e stato
     2. La radice: temi, misure, scala
     3. Da riga IRC a messaggio — la traduzione
     4. I quattro comandi che contano
     5. La spia di stato
     6. Avvio

   PERCHÉ LA TRADUZIONE STA QUI E NON IN irc.js
   Perché irc.js deve restare ignorante: consegna righe del protocollo e non sa
   che esistono le emote, i badge o il rilievo. Se sapesse, non lo si potrebbe
   provare senza mezzo progetto intorno, e cambiare il modo in cui si disegna
   un messaggio vorrebbe dire mettere le mani nel codice della connessione.
   ============================================================================= */

(function () {
  'use strict';

  /* ---- 1. Costanti e stato ------------------------------------------------ */

  /* Il /me di IRC: il corpo arriva avvolto nel carattere di controllo 0x01,
     con dentro la parola ACTION. Il terminatore finale a volte manca — dipende
     dal client di chi scrive — quindi nella regola è facoltativo. Le due
     sequenze si scrivono con la escape \u0001 e non col byte vero: un sorgente
     con dentro un carattere di controllo è una mina per qualunque editor.  */
  var AZIONE = /^\u0001ACTION\s(.*?)\u0001?$/;

  /* Quello che NON deve mai arrivare in pagina, e perché ognuno di questi:

       C0 e DEL, C1        caratteri di controllo: non si vedono e sballano tutto
       200E 200F           marcatori di direzione
       202A-202E           incorporamento e SCAVALCO della direzione
       2066-2069           isolamento della direzione

     I marcatori di direzione non sono un dettaglio da manuale: uno scavalco
     RTL infilato in un display-name fa leggere il nome al contrario, e in un
     messaggio ribalta tutto il testo che segue. È il modo più economico che
     ha un troll per far dire a qualcun altro una cosa che non ha scritto. */
  var CONTROLLO = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

  /* I segni combinanti si impilano SOPRA la lettera precedente, e non hanno
     un limite: qualche centinaio infilati in un messaggio disegna una colonna
     di inchiostro alta quanto tutto l'overlay e copre gli altri messaggi. È
     lo scherzo che in giro si chiama «zalgo». Due per lettera bastano a
     scrivere qualunque lingua vera; dal terzo in poi si tagliano. */
  var ZALGO = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u0610-\u061a\u064b-\u065f\u06d6-\u06dc\u0e31\u0e34-\u0e3a\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20f0\ufe20-\ufe2f]{3,}/g;

  function domaZalgo(testo) {
    return testo.replace(ZALGO, function (pila) { return pila.slice(0, 2); });
  }

  var MAX_NOME = 25;

  var conf = null;
  var elencoBot = [];
  var partito = false;


  /* ---- 2. La radice ------------------------------------------------------- */

  /* Tutte le misure del widget scendono da --corpo, che è in px, e dal fatto
     che nel CSS tutto il resto è in em. Scrivere qui quel numero riscala
     nomi, emote, badge e spaziature in un colpo solo: è il motivo per cui
     l'impostazione «scala» è una percentuale e non venti valori da regolare. */
  function vestiRadice(radice, valori) {
    radice.setAttribute('data-tema', valori.tema);
    radice.setAttribute('data-verso', valori.verso);
    radice.setAttribute('data-effetto', valori.effetto);

    /* L'aria fra i messaggi non è più un attributo con tre valori ma un
       moltiplicatore continuo. Nel foglio passa dentro al padding delle righe
       E al distacco dell'elenco, così una manopola sola muove entrambe le
       spaziature invece di lasciarne indietro una: era il difetto di quando i
       gradini erano tre, perché il punto giusto cadeva sempre in mezzo.

       Il ritaglio ripete quello di impostazioni.js e non si fida: qui si
       arriva anche da regia.js, che costruisce i valori per conto suo. */
    var aria = Math.max(40, Math.min(400, valori.spazio)) / 100;
    radice.style.setProperty('--aria', aria.toFixed(3));

    /* --tempo è un MOLTIPLICATORE DI DURATA, quindi è l'inverso della
       velocità: al 200% di velocità un'animazione dura la metà.

       L'inversione si fa qui, in un punto solo. Nella querystring c'è la
       velocità perché è così che la pensa chi tocca la manopola («più
       veloce»); nel foglio serve una durata perché è così che la scrive il
       CSS. Fra i due versi vince chi guarda l'overlay, e la traduzione è
       compito di questo file, che è quello che mette insieme i pezzi. */
    var velocita = Math.max(25, Math.min(300, valori.velocita));
    radice.style.setProperty('--tempo', (100 / velocita).toFixed(3));

    /* Il fondo va sul <body> e non sulla radice: deve coprire TUTTA la
       finestra, anche quando la colonna della chat è più stretta o più corta.
       Su .pollaio lascerebbe scoperti i bordi, ed è proprio dove si nota. */
    if (document.body) { document.body.setAttribute('data-fondo', valori.fondo); }

    var scala = Math.max(60, Math.min(200, valori.scala)) / 100;
    document.documentElement.style.setProperty('--corpo', (16 * scala).toFixed(2) + 'px');

    /* La larghezza la decide la finestra di OBS, non il CSS: qui si mette
       solo un tetto, per chi apre la pagina in un browser a schermo intero e
       si ritroverebbe una riga di chat lunga due metri. */
    if (valori.larghezza > 0) {
      document.documentElement.style.setProperty('--larghezza', valori.larghezza + 'px');
    }

    /* La mascotte sta nel markup già pronta ma spenta: accenderla è togliere
       un attributo, non costruire un nodo. Così chi non la vuole non paga né
       il PNG da 135 kB né la maschera radiale, che su una sorgente browser
       che gira per otto ore non è gratis. */
    var pollo = radice.querySelector('.pollaio__pollo');
    if (pollo && valori.pollo) {
      var img = pollo.querySelector('.pollaio__pollo-img');
      if (img && img.getAttribute('data-src')) {
        img.setAttribute('src', img.getAttribute('data-src'));
      }
      pollo.hidden = false;
    }
  }


  /* ---- 3. Da riga IRC a messaggio ----------------------------------------- */

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

  /* Un bot non è una persona: i suoi messaggi sono comandi automatici, e in
     un overlay rubano righe a chi sta parlando davvero. */
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
      catch (err) { /* si resta coi ruoli spenti: si perde un bordo, non la riga */ }
    }
    ruoli.bot = eBot(nick);
    return ruoli;
  }

  /* Il giudizio del rilievo si chiede DOPO aver riempito tutto il resto,
     perché rilievo.js guarda i pezzi, i bits e la risposta. Invertire
     l'ordine è l'errore che fa accendere solo metà delle regole. */
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

    /* I filtri stanno qui e non in resa.js: una riga scartata non deve
       nemmeno diventare un oggetto, tanto meno un nodo del DOM. */
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

      /* Da dove arriva questo messaggio. Qui è sempre Twitch — è questo il
         file che traduce le righe IRC — e il campo esiste perché quando le
         chat saranno più d'una resa.js deve poter disegnare la targhetta
         senza chiedersi chi gliel'ha passato. Scriverlo adesso, anche se
         vale una cosa sola, costa una riga; aggiungerlo dopo vorrebbe dire
         trovare tutti i posti che costruiscono un messaggio. */
      piattaforma: 'twitch',

      /* rilievo.js cerca il msg-id qui: è il tag che distingue un riscatto
         punti canale da un messaggio normale, e senza non si potrebbe
         riconoscere il livello 3. */
      msgId:     tag['msg-id'] || ''
    };

    messaggio.rilievo = giudica(messaggio);
    return messaggio;
  }

  /* I REGALI IN BLOCCO, e perché servono queste quindici righe.

     Quando qualcuno regala cento abbonamenti, Twitch NON manda un evento solo:
     manda un `submysterygift` che dice «ne ho regalati cento» e poi CENTO
     `subgift`, uno per destinatario, tutti legati dallo stesso
     `msg-param-community-gift-id`. Il client di Twitch mostra il primo e
     sopprime gli altri.

     Senza fare lo stesso, il pollaio disegnerebbe 101 schede una dietro
     l'altra: la chat verrebbe spazzata via per intero proprio nel momento in
     cui la gente sta scrivendo «grazie». Ed è il momento peggiore in cui
     perdere la chat.

     Si ricordano gli ultimi blocchi visti, non per sempre: qualche minuto
     basta — le singole `subgift` arrivano entro pochi secondi dal capofila —
     e l'elenco non cresce oltre una decina di voci. */
  var BLOCCHI_RICORDATI = 12;
  var VITA_BLOCCO = 300000;   /* cinque minuti */
  var blocchi = [];

  function bloccoGiaVisto(tag) {
    var id = tag['msg-param-community-gift-id'];
    if (!id) { return false; }

    var ora = Date.now();
    var i;

    /* Si potano i vecchi qui, che è l'unico posto da cui si passa: così non
       serve un timer solo per fare pulizia. */
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

    /* Il capofila (`submysterygift`) passa e registra il blocco; le `subgift`
       che seguono trovano l'id già visto e vengono scartate. */
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


  /* ---- 3-bis. Da messaggio Kick a messaggio -------------------------------
     Stessa idea del blocco 3 e stesso posto: la traduzione sta qui perché
     kick.js deve restare ignorante come irc.js. Lui consegna l'oggetto già
     estratto dalla busta di Pusher; cosa sia un'emote, un badge o un rilievo
     lo sanno solo i moduli che li possiedono.

     Kick dice le stesse cose di Twitch con altre parole, e la traduzione è
     tutta qui: `content` invece del corpo del PRIVMSG, `sender.slug` invece
     del nick nel prefisso, `identity.color` invece del tag `color`,
     `badges_v2` invece del tag `badges`. Da qui in poi è un messaggio del §5
     come tutti gli altri, e nessuno a valle deve sapere da dove veniva.
     ------------------------------------------------------------------------ */

  /* I badge testuali di Kick portano un `type`, e sono quelli che dicono chi
     è chi. Quelli grafici (badges_v2) servono a disegnare, non a decidere. */
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
        /* hasOwnProperty: `type` arriva dalla rete, e «constructor» pescato
           dal prototipo scriverebbe in `ruoli` una chiave che non esiste. */
        if (Object.prototype.hasOwnProperty.call(RUOLI_KICK, tipo)) {
          ruoli[RUOLI_KICK[tipo]] = true;
        }
      }
    }

    ruoli.bot = eBot(nick);
    return ruoli;
  }

  /* Il tetto a sei badge non è pignoleria: `badges_v2` contiene anche il
     distintivo del «livello» che ha chiunque, e su una colonna da 400px una
     fila di otto iconcine mangia la riga del nome. */
  var MAX_BADGE_KICK = 6;

  function distintiviKick(identita) {
    var fuori = [];
    if (!conf.badge) { return fuori; }

    var elenco = (identita && identita.badges_v2) || [];
    if (!Array.isArray(elenco)) { return fuori; }

    for (var i = 0; i < elenco.length && fuori.length < MAX_BADGE_KICK; i++) {
      var b = elenco[i] || {};
      var url = String(b.image_url || '');

      /* Lo stesso cancello di tutto il resto del progetto (§1.4): quello che
         non è https non finisce in un attributo src. */
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

    /* Gli stessi due filtri del PRIVMSG, e per la stessa ragione: una riga
       scartata non deve nemmeno diventare un oggetto. Che i bot stiano su
       Twitch o su Kick non cambia niente per chi guarda. */
    if (eBot(nick)) { return null; }
    if (conf.comandi && corpo.charAt(0) === '!') { return null; }

    var messaggio = {
      id:        String(dato.id || ''),
      tipo:      'messaggio',
      ts:        Date.parse(dato.created_at) || Date.now(),
      utenteId:  String(mittente.id || ''),
      nick:      nick,
      nome:      ripulisci(mittente.username || nick, MAX_NOME),

      /* Kick manda il colore già in esadecimale. Non si tocca: la correzione
         del contrasto del §9 la fa chi disegna, uguale per tutte le chat. */
      colore:    String(identita.color || ''),
      badge:     distintiviKick(identita),
      ruoli:     ruoliKick(identita.badges, nick),
      pezzi:     pezziKick(corpo),

      /* Kick non ha i bits, non ha il riscatto punti canale e non manda i
         primi messaggi. Restano spenti, e il rilievo si accende comunque
         sulle menzioni e sulle parole chiave, che valgono ovunque. */
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


  /* ---- 3-ter. Da messaggio YouTube a messaggio ----------------------------
     Come per Kick: youtube.js consegna la voce grezza dell'API, la
     traduzione sta qui.

     SI TRADUCE SOLO IL MESSAGGIO DI TESTO, e la scelta va dichiarata. L'API
     manda una quindicina di tipi diversi — SuperChat, adesioni a pagamento,
     regali di membership, sondaggi, ban. Farli comparire come schede
     vorrebbe dire insegnare a Eventi un secondo vocabolario, e finché non è
     fatto per bene è meglio non farli comparire affatto: il §1.7 vieta le
     funzioni a metà, e una scheda «adesione» che mostra il campo sbagliato è
     peggio di nessuna scheda.

     E UNA COSA CHE NON C'È E NON CI SARÀ: le iscrizioni gratuite al canale.
     L'API non le espone, non esiste proprio un evento. Un overlay che
     annunciasse «nuovo iscritto» su YouTube starebbe inventando.
     ------------------------------------------------------------------------ */

  function daYoutube(voce) {
    var dettaglio = voce.snippet || {};
    if (dettaglio.type !== 'textMessageEvent') { return null; }

    var autore = voce.authorDetails || {};
    var corpo = String((dettaglio.textMessageDetails && dettaglio.textMessageDetails.messageText) || '');
    if (!corpo) { return null; }

    /* YouTube non ha i login: ha un id di canale e un nome visualizzato che
       chiunque può cambiare quando vuole. Come «nick» si usa il nome ridotto
       a minuscolo, che è l'unica cosa con cui l'elenco dei bot possa essere
       confrontato — l'id di canale non lo saprebbe scrivere nessuno. */
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

      /* YouTube non dà un colore al nome. Lasciandolo vuoto, la regola del §9
         ne assegna uno stabile ricavato dal nick: la stessa persona avrà
         sempre la stessa tinta, come su Twitch per chi non l'ha mai scelta. */
      colore:    '',
      badge:     [],

      ruoli: {
        capo:      !!autore.isChatOwner,
        mod:       !!autore.isChatModerator,
        vip:       false,
        /* «Sponsor» su YouTube vuol dire membership a pagamento: è il
           corrispettivo dell'abbonato di Twitch, non dell'iscritto. */
        abbonato:  !!autore.isChatSponsor,
        artista:   false,
        staff:     false,
        bot:       eBot(nick)
      },

      /* Si passa dalla stessa pezzi() di Twitch, senza tag emote: link e
         menzioni si riconoscono uguale su tutte le chat, e le emote globali
         di 7TV scritte per nome si vedono anche qui. Le emoji personalizzate
         del canale YouTube arrivano come testo e testo restano: l'API le dà
         come scorciatoie, senza un indirizzo da cui disegnarle. */
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


  /* ---- 4. I quattro comandi che contano ----------------------------------- */

  function suRiga(m) {
    if (!m || !m.comando) { return; }

    if (m.comando === 'PRIVMSG') {
      var messaggio = daPrivmsg(m);
      if (messaggio) { window.Resa.aggiungi(messaggio); }
      /* I bits alimentano l'hype train: appena ne passano, si va a guardare
         se il treno si è mosso, invece di aspettare il prossimo giro. */
      if (m.tag && m.tag.bits) { svegliaTreno(); }
      return;
    }

    if (m.comando === 'USERNOTICE') {
      var evento = daUsernotice(m);
      if (evento) { window.Resa.aggiungi(evento); }
      /* Abbonamenti, regali e raid sono l'altra metà di ciò che fa partire e
         salire un treno. Vedere l'evento in chat è il segnale più tempestivo
         che esista: arriva prima di qualunque lettura a intervallo. */
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

  /* La chat fa da campanello al treno: invece di interrogare il server in
     continuazione, lo si interroga nell'istante in cui è passato qualcosa che
     può averlo mosso. treno.js si difende da solo dalle raffiche, quindi venti
     regali di fila non diventano venti richieste. */
  function svegliaTreno() {
    if (conf && conf.treno && window.Treno) { window.Treno.sveglia(); }
  }

  /* Vero se oltre a Twitch è collegata almeno un'altra chat. Da qui dipende
     la targhetta della piattaforma: con una chat sola non c'è niente da
     distinguere, e «Twitch» sopra ogni riga sarebbe rumore che insegna
     all'occhio a ignorare proprio l'elemento che dovrà saltare fuori il
     giorno che una seconda chat ci sarà (§17). */
  function altreChat() {
    if (!conf) { return false; }
    if (conf.kick || conf.kickstanza) { return true; }
    /* YouTube conta solo se ci sono TUTTI E DUE i pezzi: senza chiave non si
       collega, e accendere la targhetta per una chat che non arriverà mai
       vorrebbe dire scrivere «Twitch» sopra ogni riga per niente. */
    return !!(conf.youtube && conf.ytchiave);
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

    /* La riga che RACCONTA la moderazione si mostra solo se le righe
       moderate restano in pagina. Con moderazione=togli il messaggio è già
       sparito e annunciarlo sarebbe raccontare un fatto che non si vede;
       peggio, ripeterebbe in chiaro il nome di chi è stato bannato proprio
       mentre lo si stava togliendo di mezzo. */
    if (conf.moderazione === 'togli' || !atto.frase) { return; }

    /* La forma piena del §5, anche se disegnandola se ne useranno tre campi.
       «Nessuno inventa un'altra moneta»: un oggetto con sette campi su
       diciassette non esplode oggi solo perché disegna() lo smista subito,
       ma il primo che infila un passaggio prima dello smistamento — un
       filtro, un conteggio, un giudizio del rilievo — trova undefined dove
       il contratto promette una stringa. */
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
      /* La moderazione è un fatto della chat da cui arriva: un ban su Twitch
         non è un ban su YouTube, e la riga che lo racconta deve dire dove è
         successo come lo dice qualunque altro messaggio. */
      piattaforma: 'twitch',
      msgId: ''
    });
  }

  function suAvviso(m) {
    if (!window.Eventi) { return; }

    var avviso;
    try { avviso = window.Eventi.avviso(m.tag || {}, m.testo || ''); }
    catch (err) { return; }

    /* Solo gli avvisi gravi arrivano allo spettatore, e non come messaggio
       ma come stato: «canale sospeso» non è una riga di chat, è il motivo per
       cui non ne arriverà nessun'altra. */
    if (avviso && avviso.grave) { window.Resa.spia('resa', avviso.testo); }
  }


  /* ---- 5. La spia di stato ------------------------------------------------ */

  var FRASI = {
    collego: 'Apro il pollaio…',
    accesa:  'Sono nel pollaio',
    riprovo: 'Caduta la linea, ci riprovo…',
    resa:    'La chat non risponde, continuo a provare…',
    prova:   'Prova'
  };

  function suStato(stato) {
    window.Resa.spia(stato, FRASI[stato] || '');

    /* La spia del «collegato» NON si spegne a tempo: la toglie js/resa.js
       quando arriva il primo messaggio. Col timer cieco, su un canale spento o
       semplicemente silenzioso, dopo tre secondi la finestra restava vuota e
       identica a una rotta — ed è proprio così che sembrava, aprendo
       Pollaio.exe fuori diretta. Finché nessuno parla, quella riga è l'unica
       cosa che distingue «collegato e in attesa» da «non funziona». */
  }


  /* ---- 5-bis. Il treno finto della modalità prova -------------------------
     L'hype train arriva da una sorgente sua, che in prova non si interroga:
     sarebbe scortese bussare a un server per mostrare dati che non servono a
     nessuno, e comunque a canale spento risponderebbe «niente».

     Ma senza questo blocco la fascia del treno non comparirebbe MAI in
     anteprima, e chi sistema l'overlay in OBS non potrebbe regolarla — che è
     lo stesso motivo per cui in prova si dà il giudizio del rilievo. Quindi
     qui si recita un treno intero, dall'avvicinamento al Golden Kappa, in un
     giro di circa un minuto e mezzo che poi ricomincia.

     I numeri sono quelli veri: 1600 punti per il livello 1 e 3400 per il
     livello 2 sono le soglie che ho letto da un treno vero mentre girava.
     ------------------------------------------------------------------------ */

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


  /* ---- 6. Avvio ----------------------------------------------------------- */

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
      /* resa.js tiene .is-nuovo addosso alla riga per tutta la durata
         dell'animazione: se il CSS rallenta e lui no, l'effetto viene
         troncato a metà. La velocità deve arrivare a tutti e due. */
      velocita: conf.velocita,

      /* Se le chat collegate sono più d'una, ogni messaggio porta in cima la
         targhetta di dove è stato scritto. In prova è sempre acceso, perché
         la modalità prova serve a sistemare l'overlay PRIMA che serva, e una
         targhetta la si regola solo guardandola: senza, non ci sarebbe modo
         di deciderne forma e posto se non in diretta, che è esattamente il
         momento in cui non si vuole toccare niente. */
      multi: !!conf.prova || altreChat(),

      /* `anima` non serviva più a niente da quando è stata scritta: emote.js
         la usa solo per il cheermote, e per tutte le altre sorgenti restava
         una promessa. Adesso arriva anche qui, dove le emote diventano
         immagini, ed è lì che si può davvero fermarle. */
      anima: conf.anima
    })) { return; }

    if (window.Rilievo) {
      window.Rilievo.imposta({
        canale: conf.canale,
        parole: conf.parole,
        menzioni: conf.menzioni,
        primo: conf.primo
      });
    }

    /* I cataloghi si caricano in parallelo e NON si aspettano: la chat deve
       comparire subito. Le prime righe usciranno senza emote di terze parti e
       si arricchiranno da sole dalla riga dopo, che è molto meglio di tre
       secondi di riquadro vuoto mentre la rete risponde. */
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
          /* Il giudizio si dà anche al traffico finto, ed è il motivo per cui
             passa di qui invece di andare dritto al disegno: la modalità
             prova serve a regolare l'overlay, e il rilievo è la cosa che si
             regola di più. Un'anteprima che non evidenzia niente mostrerebbe
             tutto tranne quello che si sta cercando di sistemare.
             prova.js resta ignorante e si limita a inventare messaggi: chi
             decide cosa è importante è rilievo.js, qui come in diretta. */
          if (!msg.rilievo) { msg.rilievo = giudica(msg); }
          window.Resa.aggiungi(msg);
        } });
      }
      /* Anche il treno va recitato, se no in anteprima non lo si vede mai e
         non lo si può regolare. Vale la stessa ragione del rilievo qui sopra. */
      if (conf.treno) { trenoFinto(); }
      return;
    }

    /* L'Hype Train arriva da una sorgente sua, non dalla chat: su IRC non
       passa proprio. Si accende dopo la chat e in modo indipendente, così se
       quella sorgente un giorno smette di rispondere il pollaio non se ne
       accorge nemmeno. */
    if (window.Treno && conf.treno) {
      window.Treno.avvia({
        canale: conf.canale,
        su: function (stato) { window.Resa.treno(stato); }
      });
    }

    /* Kick si accende PRIMA di Twitch e in modo indipendente. Prima perché
       deve risolvere lo slug in un id di chatroom, e quella chiamata di rete
       tanto vale che parta subito; indipendente perché è una sorgente in più
       — se il canale non esiste o Kick chiude la porta, si perde quella chat
       e Twitch non se ne accorge nemmeno (§1.9).

       La spia di stato NON la tocca: quella racconta la chat principale, e
       farle dire «riprovo» perché un canale Kick sbagliato non risponde
       vorrebbe dire far sembrare rotto un overlay che sta funzionando. */
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
