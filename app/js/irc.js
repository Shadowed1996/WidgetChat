/* =====================================================================
   irc.js — «il pollaio» · la connessione e il protocollo

   Questo file possiede DUE cose sole: la socket verso la chat di Twitch
   e la lettura delle righe IRC. Analizza quello che arriva e lo passa a
   chi si è iscritto. Finisce lì.

   NON possiede — e non deve nemmeno sapere che esistono — le emote, i
   badge, i colori dei nick, i ruoli, il rilievo, gli eventi, il DOM, la
   grafica. Qui dentro non c'è un solo `document.createElement`. Il
   confine è netto apposta: il giorno che 7TV cambia formato o che il
   tema cambia colore, questo file non si tocca.

   Quello che consegna è una riga IRC analizzata, non il «messaggio» del
   CONTRATTO §5: quello lo costruisce chi sta più a valle, mettendo
   insieme emote, badge e ruoli. Forma della consegna:

     { comando, tag, prefisso, nick, canale, testo, parametri }

   `parametri` è la coda grezza del comando: c'è perché CLEARCHAT mette
   il nick bannato dove PRIVMSG mette il corpo, e chi legge quel comando
   deve poterselo sbrogliare a mano senza che io indovini per lui.

   ---------------------------------------------------------------------
   LA PAGINA NASCOSTA, CIOÈ LA TRAPPOLA DI OBS
   ---------------------------------------------------------------------
   Un overlay in OBS è quasi sempre «nascosto» secondo il browser: la
   sorgente non è visibile finché la scena non è attiva, e la sorgente
   browser di OBS riporta `visibilityState === 'hidden'` anche mentre
   sta trasmettendo in diretta. Un modulo che chiude la socket quando la
   pagina è nascosta — comportamento sensato in una scheda di Chrome —
   in OBS produce un overlay muto per metà diretta, e muto in silenzio,
   che è il modo peggiore di rompersi.

   Perciò la sospensione c'è, ma nasce SPENTA: `sospendi: false` è il
   predefinito, e va acceso solo da chi sa di stare in una scheda vera
   (l'anteprima di regia.html, per esempio). Non è una svista: è la
   scelta, ed è scritta qui perché il prossimo che passa non la
   «aggiusti» al contrario.

   ---------------------------------------------------------------------
   INDICE
   ---------------------------------------------------------------------
     1. Costanti
     2. Stato interno
     3. Lettura del protocollo — righe, tag, prefissi
     4. La socket — apertura, invio, chiusura
     5. Le righe che arrivano
     6. Riconnessione — l'attesa crescente
     7. Le sentinelle — pagina nascosta, silenzio, uscita
     8. Lo stato e chi lo guarda
     9. Avvio, arresto, API pubblica
   ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. Costanti
     ------------------------------------------------------------------
     Tutti i numeri che contano stanno qui in alto, in chiaro: le attese
     di una riconnessione sono la cosa che si finisce sempre per voler
     ritoccare a diretta in corso, e cercarle sparse nel file è una
     perdita di tempo.
     ------------------------------------------------------------------ */
  const INDIRIZZO = 'wss://irc-ws.chat.twitch.tv:443';

  // `twitch.tv/commands` è obbligatorio (CONTRATTO §8): senza, non
  // arrivano USERNOTICE, CLEARCHAT, CLEARMSG, ROOMSTATE, NOTICE, cioè
  // metà del progetto. `twitch.tv/membership` invece NON si chiede: è un
  // diluvio di JOIN/PART di gente che entra ed esce, e a noi non serve.
  const CAPACITA = 'CAP REQ :twitch.tv/tags twitch.tv/commands';

  // Connessione anonima in sola lettura: justinfan + un numero. Nessun
  // PASS, nessun token, niente da rubare dentro il file (CONTRATTO §1.3).
  const NICK_BASE = 10000;
  const NICK_ARCO = 80000;

  const TENTATIVI_MAX = 5;        // oltre il quinto la spia smette di dire «un attimo»
  const ATTESA_MASSIMA = 60000;   // il tetto fra due tentativi: si riprova per sempre
  const ATTESA_BASE = 1000;
  const SCARTO = 0.2;             // ±20% sull'attesa, vedi blocco 6
  const SESSIONE_BUONA = 60000;   // oltre questa durata la caduta è un incidente
  const RIENTRO_SUBITO = 300;     // per RECONNECT: quasi subito, non a scaletta

  const ATTESA_NASCOSTA = 60000;  // pagina nascosta: dopo un minuto si chiude
  const SILENZIO = 360000;        // sei minuti senza nemmeno un PING = è morta
  const GIRO_GUARDIA = 30000;     // ogni mezzo minuto si controlla il silenzio

  // Un login Twitch è minuscolo, alfanumerico e underscore, max 25.
  // Quello che non passa di qui non finisce dentro una JOIN.
  const NOME_CANALE = /^[a-z0-9_]{1,25}$/;

  // Le uniche righe che vengono consegnate. Tutto il resto (001, 002,
  // 353, 366, CAP, JOIN, USERSTATE, GLOBALUSERSTATE...) è rumore di
  // handshake: si legge e si butta, senza svegliare nessuno.
  const UTILI = {
    PRIVMSG: true,
    USERNOTICE: true,
    CLEARCHAT: true,
    CLEARMSG: true,
    ROOMSTATE: true,
    NOTICE: true
  };

  /* ------------------------------------------------------------------
     2. Stato interno
     ------------------------------------------------------------------ */
  const vivo = {
    acceso: false,      // avvia() sì / ferma() no. Comanda su tutto il resto.
    canale: '',         // già ripulito e minuscolo, senza il cancelletto
    sospendi: false,    // vedi il cappello: in OBS resta false
    stato: 'spenta'     // 'spenta' | 'collego' | 'accesa' | 'riprovo' | 'resa'
  };

  const presa = {
    socket: null,
    tentativi: 0,
    apertaIl: 0,        // quando si è aperta davvero, per misurare la sessione
    sospesa: false,     // chiusa perché la pagina era nascosta: si riapre al ritorno
    ultimoSegnale: 0    // ultimo byte arrivato, di qualunque genere
  };

  const timer = { riprova: null, nascosta: null, guardia: null };

  let consegna = null;        // la funzione `su` di chi ci ha avviati
  let sentinelle = false;     // gli ascoltatori di pagina si montano una volta sola
  const osservatori = [];     // le funzioni passate a suStato()

  // Niente console.error: il log di OBS è già affollato e un errore
  // rosso su una cosa che si ripara da sola è solo allarmismo
  // (CONTRATTO §7). Al massimo un avviso col prefisso del progetto.
  function avviso(testo) {
    try {
      if (window.console && typeof console.warn === 'function') {
        console.warn('[pollaio] ' + testo);
      }
    } catch (err) { /* nemmeno la console: pazienza, si tira dritto */ }
  }

  /* ------------------------------------------------------------------
     3. Lettura del protocollo — righe, tag, prefissi
     ------------------------------------------------------------------
     Forma di una riga:  [@tag;tag=valore] [:prefisso] COMANDO parametri

     Esempio vero, accorciato:
       @badges=vip/1;color=;display-name=Tizio;id=abc-123;mod=0
       :tizio!tizio@tizio.tmi.twitch.tv PRIVMSG #slayer_beard :ciao a tutti

     Si analizza a mano, con indexOf e slice: una espressione regolare
     unica su una riga di chat è più lenta e molto più difficile da
     leggere fra sei mesi, e qui passa ogni singolo messaggio del canale.
     ------------------------------------------------------------------ */

  /* I valori dei tag sono codificati dalla specifica IRCv3: lo spazio
     diventa \s, il punto e virgola \: (che altrimenti spezzerebbe la
     lista), la barra \\ e i ritorni a capo \r \n.

     Si decodifica in UN passaggio solo, carattere per carattere, e non
     con una catena di .replace(): la catena sbaglia sui casi doppi.
     Con `\\s` — barra letterale seguita dalla lettera s — il primo
     replace vedrebbe la coppia `\s` finale e ci metterebbe uno spazio,
     restituendo una barra e uno spazio invece di una barra e una «s».
     Raro? Sì. Ma i display-name se li scelgono le persone, e prima o
     poi arriva quello che ci prova apposta. */
  function disescapa(valore) {
    if (valore.indexOf('\\') === -1) { return valore; }  // il caso normale, gratis

    let fuori = '';
    for (let i = 0; i < valore.length; i++) {
      const c = valore.charAt(i);
      if (c !== '\\') { fuori += c; continue; }

      const dopo = valore.charAt(i + 1);
      i++;
      if (dopo === 's') { fuori += ' '; }
      else if (dopo === ':') { fuori += ';'; }
      else if (dopo === '\\') { fuori += '\\'; }
      else if (dopo === 'r' || dopo === 'n') { /* via: una riga non entra in un tag */ }
      else if (dopo === '') { /* barra spaiata in fondo: si butta, dice la specifica */ }
      else { fuori += dopo; }   // \x sconosciuto vale x, sempre per specifica
    }
    return fuori;
  }

  function leggiTag(pezzo) {
    const tag = Object.create(null);
    const coppie = pezzo.split(';');

    for (let i = 0; i < coppie.length; i++) {
      const coppia = coppie[i];
      if (!coppia) { continue; }

      const uguale = coppia.indexOf('=');
      if (uguale === 0) { continue; }             // «=valore» senza nome: riga storta

      // Un tag senza «=» esiste ed è valido: vale stringa vuota, non
      // `true` e non `undefined`. Chi legge fa sempre e solo confronti
      // con stringhe, e non deve stare a chiedersi di che tipo è oggi.
      if (uguale === -1) { tag[coppia] = ''; continue; }

      tag[coppia.slice(0, uguale)] = disescapa(coppia.slice(uguale + 1));
    }
    return tag;
  }

  function analizza(testo) {
    let resto = testo;
    let tag = {};
    let prefisso = '';

    if (resto.charAt(0) === '@') {
      const spazio = resto.indexOf(' ');
      if (spazio === -1) { return null; }
      tag = leggiTag(resto.slice(1, spazio));
      resto = resto.slice(spazio + 1);
    }

    if (resto.charAt(0) === ':') {
      const spazio = resto.indexOf(' ');
      if (spazio === -1) { return null; }
      prefisso = resto.slice(1, spazio);
      resto = resto.slice(spazio + 1);
    }

    const spazio = resto.indexOf(' ');
    return {
      tag: tag,
      prefisso: prefisso,
      comando: spazio === -1 ? resto : resto.slice(0, spazio),
      parametri: spazio === -1 ? '' : resto.slice(spazio + 1)
    };
  }

  /* Il prefisso di una persona è «tizio!tizio@tizio.tmi.twitch.tv»: il
     nick è quello che sta prima del punto esclamativo. Ma USERNOTICE e
     NOTICE arrivano col prefisso del server («tmi.twitch.tv»), che non è
     il nome di nessuno: lì si restituisce stringa vuota, e chi legge un
     USERNOTICE prende il nick dal tag `login`, che è il posto giusto. */
  function nickDa(prefisso) {
    if (!prefisso) { return ''; }
    const taglio = prefisso.indexOf('!');
    if (taglio > 0) { return prefisso.slice(0, taglio).toLowerCase(); }
    if (prefisso.indexOf('.') === -1) { return prefisso.toLowerCase(); }
    return '';
  }

  /* I parametri cominciano quasi sempre con «#canale», da solo o
     seguito da altro. NOTICE prima dell'autenticazione usa «*»: in quel
     caso il canale non c'è, e si dice che non c'è. */
  function canaleDa(parametri) {
    if (parametri.charAt(0) !== '#') { return ''; }
    const spazio = parametri.indexOf(' ');
    return spazio === -1 ? parametri : parametri.slice(0, spazio);
  }

  /* ------------------------------------------------------------------
     4. La socket — apertura, invio, chiusura
     ------------------------------------------------------------------ */
  function manda(testo) {
    try {
      // readyState 1 = OPEN. Scrivere su una socket che si sta
      // chiudendo lancia, e non c'è niente da recuperare: l'evento
      // close arriva comunque e la riconnessione la decide quello.
      if (presa.socket && presa.socket.readyState === 1) {
        presa.socket.send(testo + '\r\n');
      }
    } catch (err) { /* gestito da close */ }
  }

  function collega() {
    if (!vivo.acceso || presa.socket || presa.sospesa) { return; }
    if (typeof WebSocket !== 'function') { return; }

    clearTimeout(timer.riprova);
    timer.riprova = null;

    let socket;
    try {
      socket = new WebSocket(INDIRIZZO);
    } catch (err) {
      // Alcune reti — aziendali, o certi antivirus col filtro TLS —
      // bloccano il wss e il costruttore lancia prima ancora di provare
      // a collegarsi. Non c'è nessun evento close che arrivi a
      // consolarci: la riprova va chiamata a mano, qui.
      riprova();
      return;
    }

    presa.socket = socket;
    presa.apertaIl = 0;
    // La guardia del silenzio (blocco 7) parte già da adesso: così
    // copre anche il caso di una socket che resta in CONNECTING per
    // sempre, che su rete mobile capita e non lo dice nessuno.
    presa.ultimoSegnale = Date.now();
    cambiaStato('collego');

    // Il confronto `socket !== presa.socket` c'è in ogni gestore: quando
    // chiudiamo noi, la socket viene tolta da `presa` PRIMA della close,
    // e i suoi eventi in ritardo si riconoscono da soli come tali. Meglio
    // di un flag «l'ho chiusa io»: il flag va spento a mano, l'identità
    // no, e due socket sovrapposte non si confondono mai.
    socket.addEventListener('open', function () {
      if (socket !== presa.socket) { return; }

      presa.apertaIl = Date.now();
      presa.ultimoSegnale = Date.now();

      // L'ordine è quello del CONTRATTO §8 e non è decorativo: le
      // capacità si chiedono prima di dichiararsi, e il JOIN dopo il
      // NICK, altrimenti Twitch chiude senza spiegazioni.
      manda(CAPACITA);
      manda('NICK justinfan' + (NICK_BASE + Math.floor(Math.random() * NICK_ARCO)));
      manda('JOIN #' + vivo.canale);

      cambiaStato('accesa');
    });

    socket.addEventListener('message', function (e) {
      if (socket !== presa.socket) { return; }
      ricevi(e);
    });

    socket.addEventListener('close', function () {
      if (socket !== presa.socket) { return; }   // socket già scartata da noi

      const durata = presa.apertaIl ? Date.now() - presa.apertaIl : 0;
      presa.socket = null;
      presa.apertaIl = 0;

      // Una sessione che ha retto più di un minuto era buona: se cade è
      // un incidente di rete, non un rifiuto, e il conto dei tentativi
      // riparte da zero. Senza questa riga una diretta di tre ore
      // resterebbe muta al primo sbalzo di connessione, dopo cinque
      // tentativi spesi ore prima.
      if (durata > SESSIONE_BUONA) { presa.tentativi = 0; }
      riprova();
    });

    // L'evento error non porta informazioni utili — per ragioni di
    // sicurezza il browser non dice nemmeno perché — e arriva sempre
    // prima di close: si tace qui e si decide di là.
    socket.addEventListener('error', function () { /* gestito da close */ });
  }

  /* Chiusura decisa da noi: si toglie la socket da `presa` e poi la si
     chiude, così il gestore di close capisce di essere in ritardo e non
     fa scattare nessuna riconnessione (CONTRATTO di questo file: ferma()
     vuol dire ferma). Chi chiama decide cosa succede dopo. */
  function chiudiPresa() {
    clearTimeout(timer.riprova);
    timer.riprova = null;

    const socket = presa.socket;
    presa.socket = null;
    presa.apertaIl = 0;
    if (!socket) { return; }

    try { socket.close(); } catch (err) { /* già andata, va bene lo stesso */ }
  }

  /* ------------------------------------------------------------------
     5. Le righe che arrivano
     ------------------------------------------------------------------ */
  function ricevi(e) {
    presa.ultimoSegnale = Date.now();

    // Un solo evento può portare più righe: il protocollo le separa con
    // CR+LF e Twitch le accorpa spesso, soprattutto sul JOIN iniziale e
    // quando la chat va veloce. Chi legge `e.data` come una riga sola
    // perde tutto quello che sta dopo la prima.
    const righe = String(e.data).split(/\r\n|\r|\n/);
    for (let i = 0; i < righe.length; i++) { riga(righe[i]); }
  }

  function riga(testo) {
    if (!testo) { return; }

    const m = analizza(testo);
    if (!m) { return; }

    // Il PING arriva ogni cinque minuti circa. Il PONG va rimandato
    // subito e sempre: senza, Twitch chiude la connessione e l'overlay
    // ammutolisce a metà diretta. Si risponde col nome del server, che
    // è quello che Twitch si aspetta di risentirsi dire.
    if (m.comando === 'PING') { manda('PONG :tmi.twitch.tv'); return; }

    // RECONNECT non è un guasto: è Twitch che avvisa con garbo che sta
    // per riavviare quel server. Si rientra SUBITO, senza attesa
    // crescente e senza consumare tentativi — trattarlo come una caduta
    // vorrebbe dire stare zitti otto secondi per pura educazione.
    if (m.comando === 'RECONNECT') { rientroSubito(); return; }

    if (!UTILI[m.comando]) { return; }
    porta(m);
  }

  function porta(m) {
    if (!consegna) { return; }

    // Il corpo è quello che sta dopo il primo « :»: i due punti dentro
    // al testo (una faccina, un link) non contano, il separatore è solo
    // il primo. Se non c'è — ROOMSTATE, CLEARCHAT di uno svuotamento —
    // il testo è stringa vuota, mai null: chi legge non deve mettere una
    // guardia diversa per ogni comando.
    const stacco = m.parametri.indexOf(' :');

    const messaggio = {
      comando: m.comando,
      tag: m.tag,
      prefisso: m.prefisso,
      nick: nickDa(m.prefisso),
      canale: canaleDa(m.parametri),
      testo: stacco === -1 ? '' : m.parametri.slice(stacco + 2),
      parametri: m.parametri
    };

    // Il testo si consegna com'è arrivato, compreso il \x01ACTION del
    // /me: riconoscerlo è mestiere di chi costruisce il messaggio, non
    // mio. Io non tolgo e non aggiungo niente al corpo.
    try {
      consegna(messaggio);
    } catch (err) {
      // Un guasto a valle non deve portarsi via la connessione: la riga
      // dopo arriva fra un istante e magari va benissimo.
      avviso('Irc: chi legge i messaggi si è impuntato su ' + m.comando + '.');
    }
  }

  /* ------------------------------------------------------------------
     6. Riconnessione — l'attesa crescente
     ------------------------------------------------------------------
     1s, 2s, 4s, 8s, 16s e poi ci si ferma: se dopo mezzo minuto di
     tentativi Twitch non risponde, insistere non serve e uno stato
     'resa' visibile è più onesto di un overlay che ci prova per sempre.
     ------------------------------------------------------------------ */

  /* Lo scarto casuale non è vezzo statistico. Quando un server di Twitch
     cade, cadono insieme tutte le socket che ci stavano sopra: mille
     overlay che riprovano esattamente al secondo 1, al 2 e al 4
     ripresentano lo stesso muro tutti insieme. Con ±20% la stessa folla
     si spalma su qualche secondo e passa. */
  function conScarto(base) {
    const scarto = base * SCARTO * (Math.random() * 2 - 1);
    return Math.max(100, Math.round(base + scarto));
  }

  /* NON CI SI ARRENDE MAI, e questa è una correzione.

     Prima, dopo cinque tentativi in trentun secondi, lo stato diventava
     'resa' e nessun percorso riaccendeva più la connessione: la chat restava
     muta per tutta la diretta e l'unico rimedio era ricaricare la sorgente a
     mano dentro OBS. Ed è il caso più comune che esista — il router che si
     riavvia, il Wi-Fi che cambia, OBS che parte prima che la rete sia su.

     Il tetto vero non è il numero di tentativi ma l'ATTESA fra uno e l'altro:
     si sale fino a un minuto e poi ci si ferma lì, riprovando una volta al
     minuto per sempre. È rispettoso — Twitch dichiara limiti di venti
     autenticazioni ogni dieci secondi, e qui non ci si avvicina nemmeno — e
     il giorno che la rete torna, l'overlay torna da solo senza che nessuno
     debba accorgersene.

     Lo stato 'resa' resta, ma cambia significato: non è più «ho smesso», è
     «non ci riesco, continuo a provare ogni tanto». Lo dice la spia. */
  function riprova() {
    if (!vivo.acceso || presa.sospesa) { return; }

    const attesa = conScarto(Math.min(ATTESA_MASSIMA, ATTESA_BASE * Math.pow(2, presa.tentativi)));
    presa.tentativi++;

    clearTimeout(timer.riprova);
    timer.riprova = setTimeout(collega, attesa);

    /* Dopo i primi tentativi ravvicinati si passa a dirlo: chi guarda deve
       sapere che non è un inciampo di un secondo. */
    cambiaStato(presa.tentativi > TENTATIVI_MAX ? 'resa' : 'riprovo');
  }

  /* Il piccolo ritardo del rientro dopo un RECONNECT serve a due cose:
     lasciar arrivare l'evento close della socket vecchia, e non far
     ripartire tutti gli overlay del mondo nello stesso millisecondo.
     Non è l'attesa crescente: il contatore dei tentativi resta a zero. */
  function rientroSubito() {
    chiudiPresa();
    presa.tentativi = 0;
    if (!vivo.acceso || presa.sospesa) { return; }

    clearTimeout(timer.riprova);
    timer.riprova = setTimeout(collega, conScarto(RIENTRO_SUBITO));
    cambiaStato('riprovo');
  }

  /* ------------------------------------------------------------------
     7. Le sentinelle — pagina nascosta, silenzio, uscita
     ------------------------------------------------------------------ */
  function montaSentinelle() {
    if (sentinelle) { return; }
    sentinelle = true;

    // Si montano una volta sola e restano: controllano da sé se il
    // modulo è acceso. Aggiungere e togliere ascoltatori a ogni
    // avvia()/ferma() è più codice e più modi di sbagliare.
    try {
      if (document && document.addEventListener) {
        document.addEventListener('visibilitychange', suVisibilita);
      }
      if (window.addEventListener) {
        window.addEventListener('pagehide', suUscita);
      }
    } catch (err) { /* senza sentinelle si vive: la connessione regge lo stesso */ }
  }

  /* La sospensione è spenta salvo richiesta esplicita: vedi il cappello.
     Quando è accesa, un minuto di pagina nascosta chiude la socket —
     tenerne aperta una per una scheda che nessuno guarda è maleducazione
     verso Twitch — e il ritorno la riapre subito, senza attese. */
  function suVisibilita() {
    if (!vivo.acceso || !vivo.sospendi) { return; }

    clearTimeout(timer.nascosta);
    timer.nascosta = null;

    if (document.visibilityState === 'hidden') {
      timer.nascosta = setTimeout(sospendiOra, ATTESA_NASCOSTA);
      return;
    }

    if (presa.sospesa) {
      presa.sospesa = false;
      presa.tentativi = 0;   // il ritorno non è un tentativo fallito
      collega();
    }
  }

  function sospendiOra() {
    timer.nascosta = null;
    if (!vivo.acceso || !vivo.sospendi) { return; }

    presa.sospesa = true;
    chiudiPresa();
    // Da fuori una connessione sospesa è indistinguibile da una spenta,
    // ed è giusto così: torna da sé, non c'è niente da mostrare né da
    // decidere. Chi guarda lo stato non deve imparare un quinto caso.
    cambiaStato('spenta');
  }

  /* Una socket può morire senza dirlo: la rete se ne va, il browser non
     se ne accorge, l'evento close non arriva mai e la connessione resta
     lì aperta e vuota. Succede, e il sintomo è sempre lo stesso: la chat
     si ferma e nessuno sa perché. Twitch manda un PING ogni cinque
     minuti circa, quindi sei minuti di silenzio assoluto — nemmeno un
     PING — vogliono dire che dall'altra parte non c'è più niente. */
  function guardiaSilenzio() {
    if (!vivo.acceso || presa.sospesa || !presa.socket) { return; }
    if (Date.now() - presa.ultimoSegnale <= SILENZIO) { return; }

    avviso('Irc: sei minuti senza un segnale, nemmeno un PING. Riapro la connessione.');
    chiudiPresa();
    presa.tentativi = 0;   // era una sessione lunga: guasto, non rifiuto
    riprova();
  }

  // Si chiude tutto e non si riprova: la pagina se ne sta andando.
  function suUscita() {
    if (!vivo.acceso) { return; }
    ferma();
  }

  /* ------------------------------------------------------------------
     8. Lo stato e chi lo guarda
     ------------------------------------------------------------------
     Cinque parole, non di più, perché finiscono a schermo:
       spenta   — non c'è nessuna connessione, e va bene così
       collego  — socket aperta, handshake in corso
       accesa   — si legge la chat
       riprovo  — è caduta, c'è un'attesa in corso
       resa     — cinque tentativi buttati, non si insiste più
     ------------------------------------------------------------------ */
  function avvisaUno(fn, stato) {
    try {
      fn(stato);
    } catch (err) {
      avviso('Irc: un osservatore dello stato si è impuntato.');
    }
  }

  function cambiaStato(nuovo) {
    if (nuovo === vivo.stato) { return; }
    vivo.stato = nuovo;
    for (let i = 0; i < osservatori.length; i++) { avvisaUno(osservatori[i], nuovo); }
  }

  /* ------------------------------------------------------------------
     9. Avvio, arresto, API pubblica
     ------------------------------------------------------------------ */
  function avvia(opzioni) {
    const scelte = opzioni || {};

    // Riavviare su un altro canale deve essere lecito e indolore: si
    // smonta prima tutto quello che c'è, timer compresi.
    ferma();

    const canale = String(scelte.canale || '').trim().toLowerCase().replace(/^#/, '');

    // Ogni file si disinnesca da solo (CONTRATTO §1.9). Qui i motivi per
    // non partire sono tre, e nessuno è un errore da urlare: si dice
    // cosa manca e si resta 'spenta', senza rompere il resto della pagina.
    if (!NOME_CANALE.test(canale)) {
      avviso('Irc: «' + canale.slice(0, 25) + '» non è un nome di canale Twitch. Non mi collego.');
      return;
    }
    if (typeof scelte.su !== 'function') {
      avviso('Irc: nessuno legge i messaggi (manca `su`). Non mi collego.');
      return;
    }
    if (typeof WebSocket !== 'function') {
      avviso('Irc: questo browser non ha le WebSocket. La chat resta spenta.');
      return;
    }

    vivo.canale = canale;
    vivo.sospendi = scelte.sospendi === true;   // il predefinito è false, ed è voluto
    vivo.acceso = true;
    consegna = scelte.su;

    presa.tentativi = 0;
    presa.sospesa = false;
    presa.ultimoSegnale = Date.now();

    montaSentinelle();
    clearInterval(timer.guardia);
    timer.guardia = setInterval(guardiaSilenzio, GIRO_GUARDIA);

    collega();
  }

  function ferma() {
    vivo.acceso = false;
    consegna = null;

    clearTimeout(timer.riprova);
    clearTimeout(timer.nascosta);
    clearInterval(timer.guardia);
    timer.riprova = null;
    timer.nascosta = null;
    timer.guardia = null;

    presa.sospesa = false;
    presa.tentativi = 0;

    // chiudiPresa() toglie la socket prima di chiuderla, e `acceso` è
    // già falso: la close che arriverà fra poco non riaccende niente.
    chiudiPresa();
    cambiaStato('spenta');
  }

  window.Irc = {
    avvia: avvia,
    ferma: ferma,

    stato: function () {
      return vivo.stato;
    },

    // L'osservatore viene chiamato SUBITO con lo stato corrente: chi si
    // iscrive dopo l'avvio deve poter disegnare la spia giusta senza
    // aspettare il prossimo cambiamento, che potrebbe non arrivare mai
    // (una connessione che resta accesa per tre ore non cambia stato).
    suStato: function (fn) {
      if (typeof fn !== 'function') { return; }
      osservatori.push(fn);
      avvisaUno(fn, vivo.stato);
    },

    /* Le due funzioni del blocco 3, esposte per il banco di prova
       (prove.html) e per nient'altro. Chi disegna la chat non le chiama
       mai: riceve già le righe analizzate dalla `su` che passa ad avvia().

       Stanno qui perché sono PURE — testo dentro, oggetto fuori, nessuno
       stato di mezzo — e perché sono la parte di questo file che
       sbagliando fa il danno più silenzioso: un tag decodificato male non
       somiglia a un guasto, arriva in pagina come un nome plausibile che
       però non è quello che la persona ha scritto. È esattamente il
       genere di cosa che si scopre solo se la si prova, e il cappello di
       questo file rivendica di poter essere provato senza mezzo progetto
       intorno: senza queste due righe non era vero. */
    analizza: analizza,
    disescapa: disescapa
  };
}());
