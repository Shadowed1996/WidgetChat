/* =============================================================================
   treno.js — «il pollaio» · window.Treno

   POSSIEDE: lo stato dell'Hype Train del canale — se ne sta arrivando uno, se
   ce n'è uno in corso, a che livello, quanto manca.

   NON POSSIEDE: il DOM (resa.js), la chat (irc.js), gli eventi di chat
   (eventi.js). Qui si interroga una sorgente e si consegna uno stato.

   INDICE
     1. Da dove arrivano i dati, e perché da lì
     2. La domanda al server
     3. Lo stato consegnato
     4. Il ritmo delle letture
     5. Ciclo di vita
     6. API pubblica

   ---------------------------------------------------------------------------
   1. DA DOVE ARRIVANO I DATI, E PERCHÉ DA LÌ

   L'Hype Train NON passa dalla chat. Su IRC arrivano abbonamenti, regali,
   raid, bits e annunci, ma dell'Hype Train non c'è traccia: non è difficile da
   leggere, proprio non viene trasmesso. Il vecchio canale che lo esponeva
   (PubSub) Twitch l'ha spento. L'API pubblica documentata (EventSub) lo
   espone, ma pretende un token OAuth del proprietario del canale.

   Questo file usa invece l'API GraphQL interna di Twitch — la stessa che usa
   il sito di Twitch quando ti mostra la barra dell'Hype Train. Risponde in
   anonimo con il Client-Id pubblico del client web, e manda
   «Access-Control-Allow-Origin: *», quindi si può chiamare da un browser e
   anche da una pagina aperta da file://. Verificato sul campo, su un treno
   vero in corso, prima di scrivere questo file.

   È UNA SCELTA, E VA DETTA: non è l'API pubblica documentata. Funziona, la
   usa mezzo ecosistema Twitch, ma nessuno la garantisce e un giorno può
   cambiare. Per questo il file è costruito perché il treno sia UN DI PIÙ:
   qualunque cosa vada storta — la domanda cambia forma, il server risponde
   picche, la rete cade — treno.js si spegne da solo e la chat continua come
   se niente fosse. Non c'è un solo percorso in cui un guasto qui possa
   fermare il pollaio.

   Se un giorno smettesse di funzionare, la strada di ricambio è EventSub col
   token del proprietario: cambierebbe solo il §2 di questo file, perché lo
   stato consegnato al §3 è già modellato per reggere entrambe le sorgenti.
   ============================================================================= */

(function () {
  'use strict';

  /* ---- 1. Costanti -------------------------------------------------------- */

  var INDIRIZZO = 'https://gql.twitch.tv/gql';

  /* Il Client-Id del client web di Twitch. Non è un segreto e non è mio: è
     quello che il sito di Twitch manda a ogni richiesta, visibile a chiunque
     apra gli strumenti per sviluppatori del browser. Sta qui perché senza il
     server rifiuta la domanda. */
  var CLIENTE = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

  /* La domanda. Tre rami:
       approaching — il treno che STA per partire: quanti eventi mancano ed
                     entro quando. È questo che permette di avvisare prima.
       execution   — il treno in corso: livello, punti, obiettivo, secondi.
       isGoldenKappaTrain — il treno raro, che merita un disegno tutto suo. */
  var DOMANDA =
    'query($n:String!){channel(name:$n){hypeTrain{' +
      'approaching{goal expiresAt participants}' +
      'execution{id startedAt expiresAt endedAt isGoldenKappaTrain' +
        'progress{goal total remainingSeconds level{value goal}}}' +
    '}}}';

  var TETTO_TEMPO = 8000;   /* ms: oltre, la richiesta si abbandona */

  /* Il ritmo delle letture, in millisecondi. Vedi il §4 per il ragionamento. */
  var RITMO_FERMO   = 60000;   /* niente in vista: una lettura al minuto */
  var RITMO_ARRIVO  =  6000;   /* treno in avvicinamento: si guarda spesso */
  var RITMO_CORSA   =  5000;   /* treno in corso: la barra deve muoversi */

  /* Dopo cinque errori di fila si smette e basta. Un overlay che continua a
     bussare a una porta chiusa per otto ore non aiuta nessuno, e il treno è
     un di più: se non si può avere, si sta zitti. */
  var ERRORI_MAX = 5;

  /* Quanto resta a schermo il riepilogo quando il treno finisce. */
  var CODA_FINE = 12000;


  /* ---- 2. Stato interno --------------------------------------------------- */

  var conf = { canale: '', su: null };
  var timer = null;
  var acceso = false;
  var errori = 0;
  var inVolo = false;

  /* L'ultimo stato consegnato, per non ripetere lo stesso avviso a ogni
     lettura: chi ascolta viene svegliato solo quando qualcosa cambia davvero. */
  var ultimo = null;
  var ultimaFirma = '';
  var timerCoda = null;


  /* ---- 3. Lo stato consegnato ---------------------------------------------
     Una forma sola, indipendente da dove arrivano i dati. `fase` è l'unica
     cosa che chi disegna deve guardare per decidere cosa mostrare.

       {
         fase:         'arrivo' | 'corsa' | 'finito' | 'niente',
         livello:      3,          // solo in 'corsa'
         punti:        1000,       // punti accumulati nel livello
         meta:         1600,       // punti che servono per il livello
         percento:     63,         // già calcolato, 0-100
         restano:      126,        // secondi alla scadenza
         golden:       false,      // il Golden Kappa Train
         partecipanti: 3,          // solo in 'arrivo'
         mancano:      2           // eventi che mancano per farlo partire
       }
     ------------------------------------------------------------------------ */

  function daRisposta(dati) {
    var canale = dati && dati.data && dati.data.channel;
    var treno = canale && canale.hypeTrain;
    if (!treno) { return { fase: 'niente' }; }

    var e = treno.execution;
    if (e && !e.endedAt) {
      var p = e.progress || {};
      var meta = p.goal || 0;
      var punti = p.total || 0;

      return {
        fase: 'corsa',
        livello: (p.level && p.level.value) || 1,
        punti: punti,
        meta: meta,
        /* Il conto si fa qui e non nel foglio di stile: una larghezza in
           percentuale calcolata a mano è l'unica cosa che il CSS non può
           ricavare da solo, e farla fare al JS evita di scrivere due volte la
           stessa divisione in posti diversi. */
        percento: meta > 0 ? Math.min(100, Math.round(punti / meta * 100)) : 0,
        restano: p.remainingSeconds || 0,
        golden: e.isGoldenKappaTrain === true,
        partecipanti: 0,
        mancano: 0
      };
    }

    var a = treno.approaching;
    if (a) {
      var quanti = (a.participants && a.participants.length) || 0;
      var obiettivo = a.goal || 0;

      return {
        fase: 'arrivo',
        livello: 0,
        punti: quanti,
        meta: obiettivo,
        percento: obiettivo > 0 ? Math.min(100, Math.round(quanti / obiettivo * 100)) : 0,
        restano: secondiA(a.expiresAt),
        golden: false,
        partecipanti: quanti,
        /* Non può essere negativo: se i partecipanti superano l'obiettivo il
           treno è già partito e la lettura dopo ce lo dirà. */
        mancano: Math.max(0, obiettivo - quanti)
      };
    }

    return { fase: 'niente' };
  }

  function secondiA(quando) {
    if (!quando) { return 0; }
    var t = Date.parse(quando);
    if (isNaN(t)) { return 0; }
    return Math.max(0, Math.round((t - Date.now()) / 1000));
  }

  /* Due stati sono «lo stesso avviso» se combaciano nelle cose che si vedono.
     I secondi che scorrono NON entrano nella firma: altrimenti a ogni lettura
     sembrerebbe cambiato tutto e chi disegna rifarebbe la scheda da capo
     cinque volte al minuto. Il conto alla rovescia lo fa il CSS da solo. */
  function firma(s) {
    return s.fase + '|' + s.livello + '|' + s.punti + '|' + s.meta + '|' +
           s.golden + '|' + s.mancano;
  }


  /* ---- 4. Il ritmo delle letture -----------------------------------------
     Il ritmo non è fisso, e la ragione è di educazione oltre che di risorse:
     una lettura ogni cinque secondi per otto ore di diretta sono seimila
     richieste a un server che non è mio.

     Quindi: a riposo si guarda una volta al minuto, che basta e avanza per
     accorgersi che qualcosa si muove. Quando c'è un treno in arrivo o in
     corso si stringe a cinque-sei secondi, perché lì la barra deve muoversi.

     E soprattutto c'è la scorciatoia del §5: chi ci usa può chiamare
     `sveglia()` quando in chat passa un abbonamento, un regalo o dei bits.
     Sono ESATTAMENTE gli eventi che fanno partire e salire un treno, quindi
     invece di bussare al server in continuazione ad aspettare, si guarda nel
     momento preciso in cui può essere successo qualcosa. La chat fa da
     campanello e il server si interroga solo quando serve.
     ------------------------------------------------------------------------ */

  function prossimoRitmo(stato) {
    if (!stato) { return RITMO_FERMO; }
    if (stato.fase === 'corsa')  { return RITMO_CORSA; }
    if (stato.fase === 'arrivo') { return RITMO_ARRIVO; }
    return RITMO_FERMO;
  }

  function riarma(attesa) {
    clearTimeout(timer);
    if (!acceso) { return; }
    timer = setTimeout(guarda, attesa);
  }


  /* ---- 5. La lettura ------------------------------------------------------ */

  function guarda() {
    if (!acceso || inVolo) { return; }
    if (typeof fetch !== 'function') { return; }

    inVolo = true;
    ultimaLettura = Date.now();

    /* AbortController e non un semplice timeout: senza, una richiesta che non
       torna mai resta appesa e il ritmo si ferma per sempre. */
    var taglio = null;
    var opzioni = {
      method: 'POST',
      headers: { 'Client-Id': CLIENTE, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: DOMANDA, variables: { n: conf.canale } })
    };

    try {
      if (typeof AbortController === 'function') {
        var ctrl = new AbortController();
        opzioni.signal = ctrl.signal;
        taglio = setTimeout(function () { try { ctrl.abort(); } catch (err) { /* già finita */ } }, TETTO_TEMPO);
      }
    } catch (err) { /* niente AbortController: si va senza tetto di tempo */ }

    fetch(INDIRIZZO, opzioni).then(function (r) {
      clearTimeout(taglio);
      if (!r || !r.ok) { throw new Error('risposta ' + (r && r.status)); }
      return r.json();
    }).then(function (dati) {
      /* Un errore di GraphQL NON arriva con un codice di errore: arriva con
         un HTTP 200 e un corpo {"errors":[...]} senza "data". Senza questo
         controllo il contatore degli errori si azzerava a ogni risposta e il
         modulo non si sarebbe spento MAI — il giorno che Twitch cambia lo
         schema avrebbe continuato a bussare una volta al minuto per otto ore,
         che e esattamente il contrario di quel che promette il §15. */
      if (dati && dati.errors) { throw new Error("la domanda non e piaciuta"); }

      inVolo = false;
      errori = 0;

      /* Se nel frattempo ci hanno spento, questa risposta non si consegna.
         Una richiesta partita un istante prima di ferma() torna comunque, e
         senza questa riga farebbe riapparire la fascia subito dopo il
         {fase:'niente'} con cui ferma() l'aveva appena fatta sparire. */
      if (!acceso) { return; }

      var stato = daRisposta(dati);
      consegna(stato);
      riarma(prossimoRitmo(stato));

    })['catch'](function () {
      /* Un guasto non si racconta a schermo e non si racconta nel log: il
         treno è un di più, e chi guarda la diretta non deve accorgersi che
         una cosa che non ha chiesto non ha funzionato. */
      clearTimeout(taglio);
      inVolo = false;
      errori++;

      if (errori >= ERRORI_MAX) {
        console.warn('[pollaio] rinuncio all’hype train dopo ' + errori + ' tentativi andati male.');
        ferma();
        return;
      }
      /* Attesa crescente sugli errori, per non insistere su un server che
         magari sta rispondendo picche apposta. */
      riarma(RITMO_FERMO * errori);
    });
  }

  function consegna(stato) {
    /* Il treno è finito: si avvisa una volta sola, con un riepilogo che resta
       su qualche secondo, e poi si torna al silenzio. Senza questo passaggio
       la scheda del treno sparirebbe di colpo nell'istante esatto in cui
       finisce, che è il momento in cui la gente la sta guardando. */
    if (stato.fase === 'niente' && ultimo && ultimo.fase === 'corsa') {
      var fine = {
        fase: 'finito',
        livello: ultimo.livello,
        punti: ultimo.punti,
        meta: ultimo.meta,
        percento: ultimo.percento,
        restano: 0,
        golden: ultimo.golden,
        partecipanti: 0,
        mancano: 0
      };
      avvisa(fine);
      ultimo = stato;
      ultimaFirma = firma(stato);

      clearTimeout(timerCoda);
      timerCoda = setTimeout(function () { avvisa({ fase: 'niente' }); }, CODA_FINE);
      return;
    }

    /* Qualunque stato nuovo annulla la coda del «finito»: se entro i dodici
       secondi parte un altro treno — succede, i back-to-back esistono — il
       timer vecchio sparerebbe {fase:niente} sopra a un treno in corsa e ne
       spegnerebbe la fascia. */
    clearTimeout(timerCoda);

    var f = firma(stato);
    if (f === ultimaFirma) { return; }

    ultimo = stato;
    ultimaFirma = f;
    avvisa(stato);
  }

  function avvisa(stato) {
    if (typeof conf.su !== 'function') { return; }
    try { conf.su(stato); }
    catch (err) { console.warn('[pollaio] chi ascolta il treno è andato in errore:', err); }
  }


  /* ---- 6. API pubblica ---------------------------------------------------- */

  function avvia(opzioni) {
    var o = opzioni || {};
    var canale = String(o.canale || '').toLowerCase().trim();

    /* Si disinnesca da solo: canale storto, niente funzione da chiamare,
       niente fetch nel browser. In tutti e tre i casi non si parte, e non
       succede niente di male. */
    if (!/^[a-z0-9_]{1,25}$/.test(canale)) { return false; }
    if (typeof o.su !== 'function') { return false; }
    if (typeof fetch !== 'function') { return false; }

    conf.canale = canale;
    conf.su = o.su;
    acceso = true;
    errori = 0;
    ultimo = null;
    ultimaFirma = '';

    guarda();
    return true;
  }

  function ferma() {
    var eraAcceso = acceso;
    acceso = false;
    clearTimeout(timer);
    clearTimeout(timerCoda);
    timer = null;
    timerCoda = null;

    /* Anche `inVolo`, altrimenti una richiesta partita un attimo prima torna
       comunque e consegna uno stato DOPO lo spegnimento: la fascia
       riapparirebbe subito dopo il {fase:'niente'} con cui ferma() l'aveva
       appena fatta sparire. */
    inVolo = false;

    /* Spegnendosi si dice a chi ascolta che non c'è più niente da mostrare.

       Senza questa riga la fascia resta appesa con l'ultimo stato letto: se la
       rete cade mentre un treno è in corsa, sopra la diretta rimane «LIVELLO 3
       — 2100/5300» con dati morti per tutte le ore che restano, e il conto alla
       rovescia continua a scorrere in un intervallo che nessuno ferma più.

       Il §15 del contratto promette che se la sorgente smette di rispondere la
       fascia sparisce. Questa è la riga che mantiene la promessa. */
    if (eraAcceso && ultimo && ultimo.fase !== 'niente') {
      ultimo = { fase: 'niente' };
      ultimaFirma = 'niente|0|0|0|false|0';
      avvisa({ fase: 'niente' });
    }
  }

  /* Il campanello del §4: la chat ha visto passare qualcosa che può aver mosso
     il treno, quindi si guarda subito invece di aspettare il proprio turno.

     Il pavimento di tre secondi è la parte che conta, e prima non c'era.
     L'unica difesa era «una lettura è già in volo», che dura due o trecento
     millisecondi: venti regali spalmati su tre secondi diventavano dieci
     richieste. Un abbonamento regalato in blocco a cento persone — che
     chiunque può comprare — è una raffica di cento USERNOTICE, quindi una
     raffica di richieste, quindi il limite di frequenza dall'altra parte,
     quindi cinque errori e il treno spento per il resto della diretta.

     Sarebbe stato il colmo: l'unica cosa che un troll poteva disattivare era
     proprio quella su cui il contratto si è preso il rischio maggiore.

     Se il campanello suona troppo presto non si rinuncia alla lettura: si
     riarma per quando sarà il momento. Così l'informazione non si perde, si
     ritarda di un paio di secondi. */
  var RITMO_MINIMO = 3000;
  var ultimaLettura = 0;

  function sveglia() {
    if (!acceso || inVolo) { return; }

    var passato = Date.now() - ultimaLettura;
    clearTimeout(timer);

    if (passato >= RITMO_MINIMO) { guarda(); return; }
    timer = setTimeout(guarda, RITMO_MINIMO - passato);
  }

  window.Treno = {
    avvia: avvia,
    ferma: ferma,
    sveglia: sveglia,
    stato: function () { return ultimo ? ultimo.fase : 'spento'; }
  };

}());
