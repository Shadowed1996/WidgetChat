/* =====================================================================
   rilievo.js — «il pollaio» · cosa merita di essere notato

   POSSIEDE il giudizio. Data una riga di chat dice se vale la pena
   farla saltare all'occhio, quanto, e con che parola. È la risposta
   alla richiesta «highlight su cose importanti»: la tabella del §10 del
   contratto è implementata qui sotto, riga per riga, nel suo ordine.

   NON POSSIEDE niente di visibile. Non tocca il DOM, non conosce un
   solo esadecimale, non sa cosa sia una classe CSS. Restituisce un
   giudizio, non un pixel: `tinta` è il NOME di un token — `magenta`,
   `ciano`, `viola` — e chi disegna se lo traduce da tokens.css. Così la
   stessa decisione vale identica per l'overlay, per l'anteprima della
   regia e per qualunque cosa venga dopo.

   QUATTRO COSE VALGONO PER TUTTO IL FILE

   1. `valuta()` gira su OGNI messaggio, e una chat sotto raid fa cento
      righe al minuto. Quindi non compila niente: tutto ciò che si può
      preparare una volta sola — le espressioni regolari del canale e
      delle parole chiave — sta in `imposta()`, che si chiama all'avvio
      e poi solo quando la regia cambia le impostazioni. Ricompilare una
      regexp a ogni riga è lo spreco classico di questo tipo di codice.
   2. Il livello 0 non esiste come oggetto: `valuta()` torna `null`. Chi
      chiama scrive `if (rilievo)`, non `if (rilievo.livello > 0)`, e il
      §5 può tenersi `rilievo: null` come valore di riposo.
   3. Vince la prima regola che si accende. L'elenco è già in ordine di
      precedenza (livello alto prima, e a parità l'ordine del §10), così
      «vince il livello più alto, a parità il primo della lista» non è
      una condizione da controllare: è la forma dell'array.
   4. I ruoli non sono un rilievo (§10, ultima riga). Un moderatore che
      scrive «ok» è un moderatore che scrive «ok».

   INDICE
   1. Costanti
   2. Utilità — testo, numeri, confini di parola
   3. Stato compilato e `imposta()`
   4. Il testo del messaggio, ricostruito dai pezzi
   5. Le condizioni delle regole
   6. La tavola — la precedenza, e REGOLE che ne è il ritratto pubblico
   7. `valuta()`
   8. API pubblica e avvio
   ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. Costanti
     ------------------------------------------------------------------ */

  const CANALE_PREDEFINITO = 'slayer_beard';   // §6: il widget senza parametri funziona

  const BITS_ALTO  = 1000;   // §10: da qui in su è livello 3
  const BITS_MEDIO = 100;    // §10: da qui in su è livello 2

  const MIN_PAROLA = 2;      // vedi normalizzaParole(): sotto i 2 caratteri si scarta
  const MIN_RADICE = 4;      // vedi nomiDelCanale(): «slayer» sì, «sb» no

  // I `msg-id` che Twitch mette sui riscatti di punti canale. Sono tre nomi
  // diversi per la stessa faccenda — «questo messaggio l'ho pagato per farlo
  // vedere» — e per noi valgono tutti come MESSAGGIO IN EVIDENZA.
  const ID_EVIDENZA = 'highlighted-message';
  const ID_ANNUNCIO = 'announcement';
  const ID_RISCATTI = ['gigantified-emote-message', 'animated-message'];

  /* I confini di parola, a mano, e questo è il punto delicato del file.

     In JavaScript `\b` è definito rispetto a `\w`, che vale [A-Za-z0-9_]:
     l'underscore è a tutti gli effetti un carattere di parola. Su un nick
     come `slayer_beard` la cosa morde da due lati.
     · `\bslayer\b` NON si accende su `@slayer_beard`, perché fra `slayer` e
       `_` non c'è nessun passaggio parola/non-parola. La radice, che è
       proprio la forma corta che la gente scrive di più, andrebbe persa.
     · `\b@slayer_beard\b` non si accende nemmeno su ` @slayer_beard`: prima
       della `@` c'è uno spazio, e spazio→chiocciola sono due non-parole, di
       nuovo nessun confine. Il `\b` iniziale rifiuta proprio la forma con la
       chiocciola, che è quella canonica.
     Quindi niente `\b`: il confine se lo scrive il file. Prima della parola
     si pretende l'inizio del testo oppure un carattere che non sia
     lettera/cifra/underscore; dopo si pretende, con un lookahead che non
     consuma, che non ne cominci uno. Il lookahead deve restare NEGATIVO e
     non consumare: due parole chiave attaccate («ciao clip») devono potersi
     accendere entrambe, e un match non deve mangiarsi il confine del
     successivo.

     Nella variante per le menzioni la chiocciola è ammessa in mezzo ed è
     esclusa dai caratteri di confine: così ` @slayer` si accende e
     `posta@slayer` no, che è un indirizzo, non una chiamata. */
  const PRIMA_PAROLA    = '(?:^|[^0-9a-z_])';
  const PRIMA_MENZIONE  = '(?:^|[^0-9a-z_@])@?';
  const DOPO            = '(?![0-9a-z_])';

  // Da scappare prima di finire dentro una RegExp. Le impostazioni arrivano
  // dalla querystring: è testo di chiunque abbia in mano l'indirizzo, e una
  // parola chiave come «(» non deve poter rompere la compilazione.
  const METACARATTERI = /[.*+?^${}()|[\]\\]/g;

  /* ------------------------------------------------------------------
     2. Utilità — testo, numeri, confini di parola
     ------------------------------------------------------------------ */

  function scappa(testo) {
    return String(testo).replace(METACARATTERI, '\\$&');
  }

  function interruttore(valore, predefinito) {
    // `sìno` del §6 arriva già booleano da Impostazioni, ma la regia può
    // passare l'1/0 della querystring: si accetta anche quello.
    if (valore === undefined || valore === null || valore === '') { return predefinito; }
    if (typeof valore === 'string') { return valore !== '0' && valore.toLowerCase() !== 'false'; }
    return !!valore;
  }

  function numero(valore) {
    const n = typeof valore === 'number' ? valore : parseInt(valore, 10);
    return (isFinite(n) && n > 0) ? Math.floor(n) : 0;
  }

  /* I bits si scrivono all'italiana solo quando serve davvero: sotto il
     migliaio `toLocaleString` non cambierebbe niente e costerebbe comunque.

     E sopra il migliaio non sempre cambia qualcosa, il che a prima vista
     sembra un errore e non lo è: in italiano il numero di quattro cifre non
     si punta. `1000` resta «1000», `10000` diventa «10.000». È la regola
     tipografica italiana, la stessa che applica il browser, e si lascia
     decidere a lui invece di infilare punti a mano.

     Se Intl manca o il locale è sconosciuto non deve cadere il rilievo: nel
     dubbio si scrive il numero nudo, che è brutto ma vero. */
  function numeroIt(n) {
    if (n < 1000) { return String(n); }
    try { return n.toLocaleString('it-IT'); }
    catch (e) { return String(n); }
  }

  /* Compila UNA sola espressione per tutte le alternative: una regexp con
     l'alternanza costa un passaggio sul testo, N regexp costano N passaggi.
     Le alternative vanno dalla più lunga alla più corta perché l'alternanza
     in JavaScript è pigra e si ferma alla prima che entra: con `slayer`
     prima di `slayer_beard`, su «@slayer_beard» proverebbe la radice, la
     vedrebbe seguita da `_` e butterebbe via il match buono. */
  function espressione(voci, conChiocciola) {
    if (!voci || !voci.length) { return null; }

    const ordinate = voci.slice().sort(function (a, b) { return b.length - a.length; });
    const pezzi = [];
    for (let i = 0; i < ordinate.length; i++) { pezzi.push(scappa(ordinate[i])); }

    const prima = conChiocciola ? PRIMA_MENZIONE : PRIMA_PAROLA;
    try {
      // Nessun flag `g`: si usa solo `.test()`, e una regexp globale si
      // porterebbe dietro `lastIndex` fra un messaggio e l'altro, cioè un
      // rilievo che si accende a righe alterne. Bug bastardo e silenzioso.
      return new RegExp(prima + '(?:' + pezzi.join('|') + ')' + DOPO, 'i');
    } catch (e) {
      // Non può succedere, visto che tutto è scappato. Ma se succede, il
      // widget perde una regola, non la chat (§1.9).
      return null;
    }
  }

  /* ------------------------------------------------------------------
     3. Stato compilato e `imposta()`
     ------------------------------------------------------------------
     Tutto quello che sta qui sotto è il risultato di `imposta()`, e serve
     solo a far girare `valuta()` senza pensare. `imposta()` si può
     richiamare quante volte si vuole — la regia lo fa a ogni tocco di un
     comando: ricompila e basta, non c'è nessuno stato da smontare prima.
     ------------------------------------------------------------------ */

  let canale = CANALE_PREDEFINITO;
  let parole = [];
  let menzioniAccese = true;
  let primoAcceso = true;

  // `null` vuol dire «non c'è niente da cercare», e la regola relativa non si
  // accende mai. Non è un guasto: è il caso normale di `parole` vuoto, che è
  // pure il predefinito del §6.
  let reMenzione = null;
  let reParole = null;

  // Il canale può arrivare come `#slayer_beard`, `@slayer_beard` o con
  // maiuscole a caso. Un login Twitch è [a-z0-9_]: si tiene solo quello.
  function nickPulito(valore) {
    if (typeof valore !== 'string') { return ''; }
    return valore.toLowerCase().replace(/[^a-z0-9_]/g, '');
  }

  /* Le forme in cui la gente nomina davvero il canale: il nick intero e la
     sua radice, cioè quello che sta prima del primo underscore. La radice si
     tiene solo se è lunga almeno MIN_RADICE: su un canale tipo `dr_pollo`
     accendere il rilievo su «dr» vorrebbe dire accenderlo su mezza chat.
     La forma con la chiocciola e le maiuscole le gestisce l'espressione. */
  function nomiDelCanale(nick) {
    const nomi = [nick];
    const taglio = nick.indexOf('_');
    if (taglio >= MIN_RADICE) { nomi.push(nick.slice(0, taglio)); }
    return nomi;
  }

  /* Le parole chiave arrivano dal §6 come testo separato da virgole, ma
     l'API dichiara un array: si accettano tutti e due, perché la regia
     tiene una lista e la querystring una stringa e nessuno dei due deve
     sapere cosa preferisce l'altro.

     Si buttano: gli spazi ai bordi, le voci vuote, i doppioni, e tutto
     quello che sta sotto MIN_PAROLA. Quest'ultima non è pignoleria: una
     parola chiave di una lettera si accenderebbe su quasi ogni messaggio,
     e un rilievo che si accende sempre è un rilievo spento. */
  function normalizzaParole(valore) {
    let grezze;
    if (Object.prototype.toString.call(valore) === '[object Array]') { grezze = valore; }
    else if (typeof valore === 'string') { grezze = valore.split(','); }
    else { return []; }

    const pulite = [];
    const visto = {};
    for (let i = 0; i < grezze.length; i++) {
      // `trim()` porta via anche lo spazio unificatore di chi incolla la
      // lista da un foglio di calcolo: a occhio è uno spazio, per `split`
      // no, e senza questo si ritroverebbe una parola chiave che non si
      // accende mai e non si capisce perché.
      const voce = String(grezze[i] === undefined || grezze[i] === null ? '' : grezze[i])
        .trim().toLowerCase();
      if (voce.length < MIN_PAROLA) { continue; }
      // Prefisso sulla chiave della mappa: una parola chiave che si chiama
      // «constructor» non deve pescare dal prototipo.
      if (visto['.' + voce]) { continue; }
      visto['.' + voce] = true;
      pulite.push(voce);
    }
    return pulite;
  }

  function imposta(opzioni) {
    const o = (opzioni && typeof opzioni === 'object') ? opzioni : {};

    canale = nickPulito(o.canale) || CANALE_PREDEFINITO;
    parole = normalizzaParole(o.parole);
    menzioniAccese = interruttore(o.menzioni, true);
    primoAcceso = interruttore(o.primo, true);

    // L'unico lavoro vero del file sta in queste due righe, ed è per questo
    // che stanno qui e non dentro `valuta()`.
    reMenzione = espressione(nomiDelCanale(canale), true);
    reParole = espressione(parole, false);
  }

  /* ------------------------------------------------------------------
     4. Il testo del messaggio, ricostruito dai pezzi
     ------------------------------------------------------------------
     Il §5 non porta in giro il testo grezzo: porta `pezzi`, già analizzati.
     Per cercarci dentro una parola lo si rimette insieme prendendo, di ogni
     pezzo, la sua parte leggibile — `testo` per testo e link, `nome` per
     menzioni, emote e cheer. Le emote ci stanno dentro apposta: sono parole
     che la persona ha scritto, e se uno mette «clip» fra le parole chiave
     si aspetta che valga anche quando la scrive di fianco a un'emote.

     Si unisce con uno spazio, e non a filo: due pezzi adiacenti non devono
     poter formare per attaccamento una parola che nessuno ha scritto.
     ------------------------------------------------------------------ */
  function testoPiatto(messaggio) {
    const pezzi = messaggio.pezzi;
    if (!pezzi || !pezzi.length) {
      return typeof messaggio.testo === 'string' ? messaggio.testo : '';
    }
    const fuori = [];
    for (let i = 0; i < pezzi.length; i++) {
      const p = pezzi[i];
      if (!p) { continue; }
      if (typeof p.testo === 'string' && p.testo) { fuori.push(p.testo); }
      else if (typeof p.nome === 'string' && p.nome) { fuori.push(p.nome); }
    }
    return fuori.join(' ');
  }

  /* Il `msg-id` non c'è nel §5: l'oggetto messaggio è già digerito e i tag
     IRC restano in irc.js. Ma il §10 sul `msg-id` ci fonda due regole su
     tre del livello alto, quindi lo si cerca nei posti plausibili invece di
     pretenderne uno solo. Chi lo mette lo chiami come vuole: il rilievo non
     si rompe, e se non lo trova quelle due regole semplicemente non si
     accendono. Per l'annuncio c'è anche la seconda strada dell'`evento`
     (§11: `msg-id=announcement` → genere `annuncio`), che è quella che
     arriva davvero quando il messaggio passa da USERNOTICE. */
  function identificatore(messaggio) {
    const grezzo =
      messaggio.msgId ||
      messaggio.msgid ||
      messaggio['msg-id'] ||
      (messaggio.tag && messaggio.tag['msg-id']) ||
      (messaggio.tags && messaggio.tags['msg-id']) ||
      '';
    return typeof grezzo === 'string' ? grezzo.toLowerCase() : '';
  }

  function fraGli(id, elenco) {
    for (let i = 0; i < elenco.length; i++) {
      if (elenco[i] === id) { return true; }
    }
    return false;
  }

  /* Il contesto è il messaggio più le tre cose che le regole si passano di
     mano in mano. Il testo piatto è pigro apposta: un messaggio in evidenza
     o da mille bits vince alla prima regola, e non c'è ragione di
     ricomporgli il corpo per poi buttarlo. */
  function contestoDi(messaggio) {
    let piatto = null;
    return {
      messaggio: messaggio,
      id: identificatore(messaggio),
      bits: numero(messaggio.bits),
      testo: function () {
        if (piatto === null) { piatto = testoPiatto(messaggio); }
        return piatto;
      }
    };
  }

  /* ------------------------------------------------------------------
     5. Le condizioni delle regole
     ------------------------------------------------------------------ */

  function èEvidenza(c) { return c.id === ID_EVIDENZA; }

  function èRiscatto(c) { return fraGli(c.id, ID_RISCATTI); }

  function èAnnuncio(c) {
    if (c.id === ID_ANNUNCIO) { return true; }
    const e = c.messaggio.evento;
    return !!(e && e.genere === 'annuncio');
  }

  function bitsDa(soglia) {
    return function (c) { return c.bits >= soglia; };
  }

  /* La menzione ha due sorgenti, e vanno bene tutte e due. La prima è il
     pezzo `{tipo:'menzione', nostra:true}` del §5, che chi ha spezzettato
     il corpo ha già riconosciuto: se c'è, ci si fida e si risparmia il
     passaggio sul testo. La seconda è l'espressione, che serve comunque
     perché la gente il nick lo scrive anche senza chiocciola — e in quel
     caso nessun analizzatore lo marca come menzione. */
  function menzionaIlCanale(c) {
    if (!menzioniAccese) { return false; }

    const pezzi = c.messaggio.pezzi;
    if (pezzi) {
      for (let i = 0; i < pezzi.length; i++) {
        if (pezzi[i] && pezzi[i].tipo === 'menzione' && pezzi[i].nostra === true) { return true; }
      }
    }
    return !!reMenzione && reMenzione.test(c.testo());
  }

  function contieneUnaParola(c) {
    return !!reParole && reParole.test(c.testo());
  }

  /* `primo` ha il suo interruttore nel §6. `ritorno` no, e non gliene si
     inventa uno: sono due tag diversi di Twitch (`first-msg` e
     `returning-chatter`) e il contratto dà l'interruttore solo al primo. */
  function èIlPrimo(c) { return primoAcceso && c.messaggio.primo === true; }

  function èUnRitorno(c) { return c.messaggio.ritorno === true; }

  function èUnaRisposta(c) {
    const r = c.messaggio.risposta;
    return !!r && typeof r === 'object';
  }

  function etichettaBits(c) { return numeroIt(c.bits) + ' BITS'; }

  /* ------------------------------------------------------------------
     6. La tavola — la precedenza, e REGOLE che ne è il ritratto pubblico
     ------------------------------------------------------------------
     Questo array È il §10. L'ordine è la precedenza: si scorre dall'alto e
     vince la prima che si accende, quindi i livelli stanno in ordine
     decrescente e dentro ogni livello vale l'ordine della tabella.

     `nome` è anche il `motivo` che finisce nel giudizio: sono la stessa
     cosa, e tenerli separati vorrebbe dire due elenchi da aggiornare
     insieme. Per questo «bits» compare tre volte, a tre livelli diversi:
     non è un doppione, sono tre regole che dicono lo stesso perché con tre
     soglie. Stessa faccenda per le due righe «evidenza»: il riscatto
     `gigantified`/`animated` è tenuto separato e DOPO i bits alti perché
     così vuole la tabella — un messaggio gigante pagato con più di mille
     bits si annuncia come bits, che è la notizia più grossa delle due.

     `tinta` è il nome di un token, non un colore, e non è il nome della
     variabile CSS: al livello 1 il token da scrivere è `--viola-chiaro`
     (il `--viola` pieno non è leggibile come testo, lo dice tokens.css).
     La traduzione da nome a variabile è di chi disegna, non di qui.
     ------------------------------------------------------------------ */
  const TAVOLA = [
    /* ---- livello 3: alto, magenta ---- */
    { nome: 'evidenza', livello: 3, etichetta: 'MESSAGGIO IN EVIDENZA', tinta: 'magenta',
      accende: èEvidenza, componi: null },
    { nome: 'annuncio', livello: 3, etichetta: 'ANNUNCIO', tinta: 'magenta',
      accende: èAnnuncio, componi: null },
    { nome: 'bits', livello: 3, etichetta: 'BITS', tinta: 'magenta',
      accende: bitsDa(BITS_ALTO), componi: etichettaBits },
    { nome: 'evidenza', livello: 3, etichetta: 'MESSAGGIO IN EVIDENZA', tinta: 'magenta',
      accende: èRiscatto, componi: null },

    /* ---- livello 2: medio, ciano ---- */
    { nome: 'menzione', livello: 2, etichetta: 'TI HANNO NOMINATO', tinta: 'ciano',
      accende: menzionaIlCanale, componi: null },
    { nome: 'parola', livello: 2, etichetta: 'PAROLA CHIAVE', tinta: 'ciano',
      accende: contieneUnaParola, componi: null },
    { nome: 'bits', livello: 2, etichetta: 'BITS', tinta: 'ciano',
      accende: bitsDa(BITS_MEDIO), componi: etichettaBits },

    /* ---- livello 1: basso, viola ---- */
    { nome: 'primo', livello: 1, etichetta: 'PRIMO MESSAGGIO', tinta: 'viola',
      accende: èIlPrimo, componi: null },
    { nome: 'ritorno', livello: 1, etichetta: 'BENTORNATO', tinta: 'viola',
      accende: èUnRitorno, componi: null },
    { nome: 'risposta', livello: 1, etichetta: 'RISPOSTA', tinta: 'viola',
      accende: èUnaRisposta, componi: null },
    // Il §10 qui dice «bits > 0»: `numero()` restituisce solo interi non
    // negativi, quindi la soglia 1 è la stessa cosa e resta una soglia sola.
    { nome: 'bits', livello: 1, etichetta: 'BITS', tinta: 'viola',
      accende: bitsDa(1), componi: etichettaBits }
  ];

  /* Il ritratto pubblico della tavola: gli stessi campi, senza le funzioni.
     Serve a regia.html per elencare all'utente cosa verrà evidenziato senza
     che nessuno riscriva la lista a mano da un'altra parte — è una copia,
     così chi la legge non può metterci le mani dentro alla tavola vera. */
  const REGOLE = [];
  for (let r = 0; r < TAVOLA.length; r++) {
    REGOLE.push({
      nome: TAVOLA[r].nome,
      livello: TAVOLA[r].livello,
      etichetta: TAVOLA[r].etichetta,
      tinta: TAVOLA[r].tinta
    });
  }

  /* ------------------------------------------------------------------
     7. `valuta()` — l'unica cosa che gira cento volte al minuto
     ------------------------------------------------------------------ */
  function valuta(messaggio) {
    if (!messaggio || typeof messaggio !== 'object') { return null; }

    const c = contestoDi(messaggio);

    for (let i = 0; i < TAVOLA.length; i++) {
      const regola = TAVOLA[i];
      if (!regola.accende(c)) { continue; }
      // Il giudizio è esattamente la terna del §5: niente `tinta` qui
      // dentro. La tinta è una proprietà della regola, non del messaggio,
      // e chi disegna la pesca da REGOLE o dal livello.
      return {
        livello: regola.livello,
        motivo: regola.nome,
        etichetta: regola.componi ? regola.componi(c) : regola.etichetta
      };
    }

    // Livello 0. Non si restituisce un oggetto vuoto: si restituisce niente.
    return null;
  }

  /* ------------------------------------------------------------------
     8. API pubblica e avvio
     ------------------------------------------------------------------
     Si parte già configurati. impostazioni.js viene prima di questo file
     nell'ordine di caricamento (§4), quindi se c'è lo si legge subito: così
     `valuta()` è buono anche se qualcuno se ne serve prima che pollaio.js
     abbia messo insieme i pezzi. Se non c'è, restano i predefiniti del §6 e
     il rilievo funziona lo stesso sul canale di casa.
     ------------------------------------------------------------------ */
  function dalleImpostazioni() {
    const v = window.Impostazioni && window.Impostazioni.valori;
    if (!v) { return null; }
    return { canale: v.canale, parole: v.parole, menzioni: v.menzioni, primo: v.primo };
  }

  imposta(dalleImpostazioni());

  window.Rilievo = {
    imposta: imposta,
    valuta: valuta,
    REGOLE: REGOLE
  };
}());
