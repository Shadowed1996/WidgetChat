/* =====================================================================
   badge.js — «il pollaio» · i distintivi di chi scrive

   POSSIEDE: il catalogo dei badge di Twitch (globali + di canale), la
   lettura del tag `badges` di un messaggio, e il ripiego disegnato a
   mano per quando la rete tace.

   NON POSSIEDE: il DOM (qui non nasce un solo nodo), le emote, il
   rendering, la decisione su chi è un bot. Questo file restituisce
   DATI, nella forma esatta del CONTRATTO §5: i badge come
   [{chiave, versione, titolo, url, url2}] e i ruoli come
   {capo, mod, vip, abbonato, artista, staff, bot}. Chi li disegna è
   resa.js, e non deve sapere niente di quello che c'è qui dentro.

   INDICE
   1. Costanti e sorgenti
   2. Il ripiego disegnato a mano (SVG dentro data: URI)
   3. Stato interno
   4. Micro-aiuti
   5. Assorbimento del catalogo
   5-bis. Il ricordo — localStorage
   6. carica() — le due chiamate di rete
   7. leggi() — dal tag `badges` all'elenco già ordinato
   8. ruoli() — chi è chi
   9. API pubblica

   DUE COSE VALGONO PER TUTTO IL FILE

   1. Niente qui dentro può portarsi via il widget. `carica()` restituisce
      una Promise che risolve SEMPRE — anche a rete morta, anche a JSON
      storto — e `leggi()` funziona pure se `carica()` non è mai stata
      chiamata, perché il ripiego del blocco 2 è già in memoria. Un
      moderatore che non si distingue è esattamente la cosa che questo
      widget deve risolvere: restare senza badge non è un'opzione.
   2. L'ECCEZIONE SUGLI ESADECIMALI, ed è voluta, non è una svista.
      Il CONTRATTO §1.5 vieta i colori esadecimali fuori da
      css/tokens.css. Nel blocco 2 ce ne sono otto, e ci stanno perché
      NON sono regole CSS: sono il contenuto di un'immagine SVG che
      finisce dentro un attributo `src`. Un `var(--viola)` dentro una
      data: URI non verrebbe mai risolto — l'SVG è un documento a sé, non
      eredita le variabili della pagina che lo mostra. Le tinte sono
      copiate una per una dai token (--live, --viola, --ciano, --allerta,
      --testo-tenue) più i tre colori ufficiali di Twitch per mod, VIP e
      Prime, che token non sono e non devono diventarlo.
   ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. Costanti e sorgenti
     ------------------------------------------------------------------
     L'endpoint storico badges.twitch.tv è MORTO: risponde male da quando
     Twitch ha spostato tutto sull'API con autenticazione. Siccome il
     widget è anonimo per contratto (§1.3: nessun token dentro il file),
     si passa da ivr.fi, che è pubblico e non chiede niente a nessuno.

     I due elenchi arrivano nella stessa forma:
       [{ set_id, versions: [{ id, image_url_1x/2x/4x, title, description }] }]

     La chiave del catalogo è `set_id + '/' + versione.id`, cioè
     esattamente quello che Twitch scrive nel tag `badges` di ogni
     messaggio: 'moderator/1', 'subscriber/12'. Nessuna traduzione in
     mezzo, nessuna tabella da tenere allineata a mano.
     ------------------------------------------------------------------ */
  const GLOBALI = 'https://api.ivr.fi/v2/twitch/badges/global';
  const DI_CANALE = 'https://api.ivr.fi/v2/twitch/badges/channel';

  const TETTO = 8000;               // ms: oltre, si molla e restano i disegni
  const SOLO_HTTPS = /^https:\/\//; // §1.4: nessun URL entra in un src senza passare di qui

  /* Ordine di disegno. Un moderatore si deve riconoscere dal PRIMO badge,
     non dal terzo: Twitch manda i badge in un ordine suo, che mette
     l'abbonato prima del mod più spesso di quanto faccia comodo. Chi non è
     in tabella vale PESO_RESTO e resta nell'ordine in cui è arrivato. */
  const PESO = {
    'broadcaster': 0,
    'staff': 1, 'admin': 1, 'global_mod': 1, 'partner': 1,
    'moderator': 2,
    'vip': 3,
    'subscriber': 4, 'founder': 4
  };
  const PESO_RESTO = 5;

  /* ------------------------------------------------------------------
     2. Il ripiego disegnato a mano
     ------------------------------------------------------------------
     Se ivr.fi non risponde — o risponde ma di quel set non sa niente —
     questi disegni tengono in piedi la sola cosa che i badge servono
     davvero a fare: far vedere a colpo d'occhio chi comanda, chi modera,
     chi paga.

     Regole con cui sono disegnati, e sono tutte per la stessa ragione
     (sotto c'è un gameplay, e il badge è alto 18 pixel):
     · viewBox 0 0 24 24, misura nominale 18×18;
     · forme PIENE, niente tratti sottili: un contorno da 1px sopra a
       un'esplosione sparisce;
     · una tinta sola per disegno, presa dai token del canale;
     · una data: URI sola per tutt'e due le misure — un SVG scala da sé,
       quindi `url` e `url2` puntano allo stesso disegno e lo `srcset` di
       resa.js non ha niente da scegliere. È il motivo per cui il ripiego
       è vettoriale e non un PNG.

     Codifica: 'data:image/svg+xml,' + encodeURIComponent(...). Il `#`
     delle tinte diventa %23, ed è obbligatorio: lasciato crudo, il
     browser lo leggerebbe come l'inizio di un frammento e l'immagine
     resterebbe vuota. Niente base64: allunga di un terzo e rende il file
     illeggibile a chi lo riapre per cambiare una forma.

     NOTA PER CHI DISEGNA (resa.js): da qui, dentro `url` e `url2`, esce
     https: oppure 'data:image/svg+xml,' e nient'altro. Il controllo del
     §1.4 su quello che arriva dalla rete lo fa già questo file, prima di
     mettere qualcosa nel catalogo; se resa.js rifà un /^https:\/\// secco
     sui badge, butta via proprio i disegni di scorta — cioè l'unica cosa
     che resta quando la rete è giù.
     ------------------------------------------------------------------ */

  /* Le forme stanno fuori dalla tabella così restano leggibili e la stella
     si può riusare due volte (abbonato e fondatore). */
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

  /* Il fondatore è la stella dell'abbonato dentro un disco della stessa
     tinta: è il «contorno» chiesto, ottenuto con un'opacità e non con uno
     stroke, che a 18px si perderebbe. */
  const FORMA_STELLA_CERCHIATA =
    '<circle cx="12" cy="12" r="10.8" opacity="0.32"/>' + FORMA_STELLA;

  const FORMA_CORONA =
    '<path d="M2.2 7.2L7.5 11L12 4L16.5 11L21.8 7.2L20 18.4H4Z"/>' +
    '<rect x="3.4" y="19.4" width="17.2" height="2.6" rx="1.1"/>';

  /* Un sigillo a otto lobi: è la forma che si legge come «distintivo»
     anche quando è grigia e piccola. */
  const FORMA_DISTINTIVO =
    '<path d="M12 1.4l2.9 2.4 3.7 -0.6 0.9 3.6 3.3 1.8 -1.6 3.4 1.6 3.4' +
    ' -3.3 1.8 -0.9 3.6 -3.7 -0.6 -2.9 2.4 -2.9 -2.4 -3.7 0.6 -0.9 -3.6' +
    ' -3.3 -1.8 1.6 -3.4 -1.6 -3.4 3.3 -1.8 0.9 -3.6 3.7 0.6z"/>';

  const FORMA_PENNELLO =
    '<path d="M16.8 1.8L22.2 7.2L13.4 16L8 10.6Z"/>' +
    '<path d="M6.9 11.7L12.3 17.1L9.6 19.8L3.4 21.2L4.9 15.1Z"/>';

  function disegno(forma, tinta) {
    // width/height nominali: se resa.js non impone una misura, il badge
    // esce comunque a 18px invece che a 300, che è quello che fa un SVG
    // senza dimensioni intrinseche.
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"' +
      ' width="18" height="18" fill="' + tinta + '">' + forma + '</svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  function mano(titolo, forma, tinta) {
    const url = disegno(forma, tinta);
    return { titolo: titolo, url: url, url2: url };
  }

  /* I titoli qui sono in italiano (§1.8) perché finiscono nel `title` del
     badge, e quello lo legge una persona. I titoli che arrivano da ivr.fi
     restano invece in inglese: sono il nome che Twitch dà alle sue cose,
     come i tag del protocollo, e riscriverli vorrebbe dire tenere
     allineata a mano una tabella di duecento voci che cambia da sola. */
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

  /* Da dove viene ogni tinta, per chi un giorno riaprirà questo file:
       #ff3d5e --live   · #8b2fff --viola     · #22e0ff --ciano
       #ffc65c --allerta · #9a93b0 --testo-tenue
       #00ad03 verde del mod · #e005b9 rosa VIP · #8ab4ff blu Prime
     Gli ultimi tre sono di Twitch, non del canale: sono i colori con cui
     quei ruoli si riconoscono in qualunque chat, e tirarli verso la
     palette del canale renderebbe il ripiego meno leggibile del badge
     vero, che è l'esatto contrario del suo mestiere. */

  /* ------------------------------------------------------------------
     3. Stato interno
     ------------------------------------------------------------------ */
  const CATALOGO = {};   // 'set/versione' → {chiave, versione, titolo, url, url2}
  const PRIMA = {};      // 'set' → una versione qualsiasi ma stabile di quel set

  let pronto = false;    // le due chiamate hanno finito (bene o male: vedi §9)
  let inCorso = null;    // la Promise in volo, per non chiedere due volte
  let firmaCarica = '';  // 'canale|id' di quella in volo: cambia canale, si ricarica

  /* ------------------------------------------------------------------
     4. Micro-aiuti
     ------------------------------------------------------------------ */
  function frase(valore, ripiegoValore) {
    return (typeof valore === 'string' && valore.trim()) ? valore.trim() : ripiegoValore;
  }

  // Le chiavi arrivano dalla chat: un set che si chiamasse 'toString'
  // troverebbe la funzione del prototipo e la scambierebbe per un badge.
  function ha(oggetto, chiave) {
    return Object.prototype.hasOwnProperty.call(oggetto, chiave);
  }

  // §1.4: un URL che non è https non finisce mai in un attributo src.
  function sicuro(valore) {
    return (typeof valore === 'string' && SOLO_HTTPS.test(valore)) ? valore : '';
  }

  // I tag di Twitch sono stringhe: `mod=1`. Si accettano anche il numero e
  // il booleano perché prova.js genera traffico finto scritto a mano, e una
  // modalità di prova che si comporta diversamente da quella vera non serve
  // a niente.
  function acceso(valore) {
    return valore === '1' || valore === 1 || valore === true;
  }

  /* Una GET con tetto di tempo che non fallisce mai davvero: risolve con i
     dati oppure con null. AbortController è l'unico modo per chiudere per
     davvero una fetch appesa — un setTimeout che ignora la risposta
     lascerebbe la richiesta aperta e OBS a tenersi una socket per niente.
     Se il browser non ce l'ha, si perde solo il tetto di tempo, non la
     chiamata. */
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
      // Un console.warn solo, col prefisso, e si tira avanti (§7): il log di
      // OBS è già pieno di suo, e questo non è un guasto ma un ripiego.
      console.warn('[pollaio] badge: niente da ' + indirizzo +
                   ' (' + ((errore && errore.message) || 'errore') + ')');
      return null;
    });
  }

  /* ------------------------------------------------------------------
     5. Assorbimento del catalogo
     ------------------------------------------------------------------
     Si chiama due volte: prima con i globali, poi con quelli del canale.
     La seconda SOVRASCRIVE la prima, e deve farlo: il badge dell'abbonato
     è diverso per ogni canale, e quello del canale è l'unico giusto —
     mostrare la stellina globale a chi paga da tre anni è proprio il
     genere di dettaglio che si nota.

     `PRIMA` tiene, per ogni set, una versione qualsiasi ma stabile: serve
     al blocco 7 per i mesi di abbonamento che il catalogo non conosce. Si
     scrive solo la prima di ogni chiamata, così l'ultima chiamata (il
     canale) vince sulla precedente (i globali) senza che l'ordine interno
     dell'elenco conti qualcosa.
     ------------------------------------------------------------------ */
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

        // La 2x è la misura di lavoro (§5); la 1x è l'ultima spiaggia, ma
        // un badge sgranato è meglio di un buco.
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

  // Le due tabelle si svuotano in blocco quando si cambia canale (blocco 6).
  // Sono `const`, quindi si cancellano chiave per chiave: riassegnarle
  // vorrebbe dire farle diventare `let` e perdere la garanzia che nessuno,
  // da qui in avanti, le sostituisca con qualcos'altro.
  function svuota() {
    let chiave;
    for (chiave in CATALOGO) { if (ha(CATALOGO, chiave)) { delete CATALOGO[chiave]; } }
    for (chiave in PRIMA) { if (ha(PRIMA, chiave)) { delete PRIMA[chiave]; } }
  }

  /* ------------------------------------------------------------------
     6. carica() — le due chiamate di rete
     ------------------------------------------------------------------
     Risolve SEMPRE, col numero di badge finiti nel catalogo (0 compreso).
     Chi chiama non ha mai un `.catch` da scrivere: se va male restano i
     disegni, e il resto del widget non se ne accorge.

     Le due richieste partono insieme, non in fila: sono indipendenti, e
     l'attesa giusta è quella della più lenta, non la somma delle due.
     L'ordine di ASSORBIMENTO invece è fisso: globali, poi canale.

     `idCanale` a ivr.fi non serve, che lavora per login; sta nella firma
     perché è quello che passa pollaio.js (§6, impostazione `id`) e perché
     fa da scorta se il nome del canale manca.
     ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------
     5-bis. Il ricordo — localStorage
     ------------------------------------------------------------------
     Stessa ragione e stesso meccanismo di emote.js, e i due file sono
     scritti apposta nello stesso modo: chi capisce uno capisce l'altro.

     In OBS la sorgente si ricarica a ogni cambio di scena, quindi senza
     un ricordo si ricomincia ogni volta da due chiamate a ivr.fi — e nel
     frattempo i badge sono le forme disegnate a mano del blocco 2, che
     funzionano ma si vedono. Qui la differenza è ancora più visibile che
     con le emote: un moderatore senza il suo badge, per i primi secondi
     dopo ogni cambio di scena, è esattamente la cosa che il cappello di
     questo file dichiara di non voler lasciar succedere.

     Si ricordano le due tabelle già assorbite, non le risposte grezze.
     PRIMA non si duplica: se ne salvano solo le chiavi, e al ritorno si
     ricostruisce puntando dentro CATALOGO. Duplicarla vorrebbe dire
     scrivere due volte le stesse voci per una tabella che è solo un
     indice.

     Le età sono quelle di emote.js — fresco sotto i trenta minuti, stanco
     fino a dodici ore, poi scaduto — e per la stessa ragione: sotto la
     mezz'ora si sta cambiando scena, non si sta cambiando canale.
     ------------------------------------------------------------------ */

  const CHIAVE_RICORDO = 'sb-pollaio-badge';
  const FORMATO_RICORDO = 1;
  const RICORDO_FRESCO  = 1800000;    // 30 minuti
  const RICORDO_SCADUTO = 43200000;   // 12 ore
  const TETTO_RICORDO = 400000;       // i badge sono poche centinaia: basta

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
      // Quota, navigazione privata, storage negato: si perde la
      // scorciatoia e nient'altro. Il §2 del contratto vuole il try/catch
      // anche in scrittura, e serve proprio a questo.
    }
  }

  /* Rimette in piedi le due tabelle e dice che età aveva il ricordo:
     'fresco', 'stanco', oppure null se non c'era, era illeggibile, era di
     un altro canale o era scaduto. */
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
    // Un `ts` nel futuro è un orologio spostato indietro dopo il
    // salvataggio: si butta, o resterebbe valido per sempre.
    if (eta < 0 || eta > RICORDO_SCADUTO) { return null; }

    const chiavi = Object.keys(dato.catalogo);
    for (let i = 0; i < chiavi.length; i++) {
      const voce = dato.catalogo[chiavi[i]];
      // Si ripassa dal cancello dell'https anche in uscita dal ricordo:
      // fra la scrittura e adesso c'è passato il disco, e questo è
      // l'unico controllo che protegge un `src` (CONTRATTO §1.4).
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
      let quanti = assorbi(risposte[0]);   // prima i globali...
      quanti += assorbi(risposte[1]);      // ...poi il canale, che vince
      pronto = true;
      if (!quanti) {
        console.warn('[pollaio] badge: catalogo vuoto, restano i disegni di scorta');
      }
      ricorda(firma);
      return quanti;
    }).catch(function () {
      // Non ci si arriva, perché chiedi() non rifiuta mai. Sta qui perché
      // se un domani qualcuno tocca assorbi(), un'eccezione non deve
      // lasciare `pronto` a false per sempre e appendere chi aspetta.
      pronto = true;
      return 0;
    });
  }

  function carica(canale, idCanale) {
    const nome = frase(canale, '').toLowerCase();
    const grezzoId = (idCanale === undefined || idCanale === null) ? '' : String(idCanale);
    const id = frase(grezzoId, '');
    const firma = nome + '|' + id;

    // Stesso canale, richiesta già in volo o già finita: si restituisce
    // quella. regia.html rifà l'anteprima a ogni tasto premuto, e non deve
    // martellare ivr.fi per niente.
    if (inCorso && firma === firmaCarica) { return inCorso; }

    // Canale diverso: si butta via il catalogo vecchio. I badge di canale
    // hanno le stesse chiavi ovunque ('subscriber/0'), quindi quelli di
    // prima resterebbero addosso a chi scrive nel canale nuovo. Nel
    // frattempo disegna il ripiego, che è esattamente il suo mestiere.
    if (inCorso) {
      svuota();
      pronto = false;
    }
    firmaCarica = firma;

    const eta = ripescaRicordo(firma);

    if (eta) {
      // Le tabelle sono già in piedi: resa.js disegna i badge veri dal
      // primo messaggio invece dei disegni di scorta.
      pronto = true;
      inCorso = Promise.resolve(quantiInCatalogo());

      // Stanco: si ricarica dietro, senza far aspettare nessuno. Le voci
      // nuove entrano nelle tabelle vive e il ricordo si riscrive per la
      // volta dopo; `inCorso` resta quella già risolta, così chi ha
      // chiamato non si ritrova un'attesa che si allunga da sola.
      if (eta === 'stanco') { giroDiRete(firma, nome, id); }

      return inCorso;
    }

    inCorso = giroDiRete(firma, nome, id);
    return inCorso;
  }

  /* ------------------------------------------------------------------
     7. leggi() — dal tag `badges` all'elenco già ordinato
     ------------------------------------------------------------------
     'moderator/1,subscriber/12' → [{chiave, versione, titolo, url, url2}]

     Tre tentativi per ogni voce, in quest'ordine:
       1. la versione esatta nel catalogo: l'arte vera, quella del canale;
       2. il disegno a mano del blocco 2 — è il caso della rete morta, ma
          anche quello del badge che nel catalogo non c'era;
       3. un'altra versione dello stesso set (PRIMA). È la rete di sicurezza
          dei mesi di abbonamento: 'subscriber/12' può mancare mentre
          'subscriber/0' c'è, e la stellina del canale con il tier sbagliato
          è comunque meglio di un badge che sparisce.
     Se non riesce nessuno dei tre la voce si lascia cadere: in pagina un
     `src` vuoto è peggio di un badge in meno.

     Funziona anche prima di carica(): il catalogo è vuoto, il ripiego no.
     ------------------------------------------------------------------ */
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
      // La versione resta quella richiesta: è quella che ha davvero chi
      // scrive, ed è l'unica cosa che il chiamante può ancora usare.
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

      // Si taglia al PRIMO '/': il nome del set non ne contiene mai, la
      // versione in teoria sì, e in quel caso è tutta sua.
      const taglio = voce.indexOf('/');
      const chiave = (taglio === -1 ? voce : voce.slice(0, taglio)).trim();
      const versione = (taglio === -1 ? '1' : voce.slice(taglio + 1)).trim();
      if (!chiave) { continue; }

      const badge = trova(chiave, versione);
      if (!badge) { continue; }

      raccolta.push({ badge: badge, peso: peso(chiave), indice: raccolta.length });
    }

    // L'indice fa da spareggio: dentro lo stesso peso l'ordine resta quello
    // di Twitch. Non ci si affida alla stabilità di sort(), che è garantita
    // solo dai motori recenti: qui la si scrive a mano e non ci si pensa più.
    raccolta.sort(function (a, b) {
      if (a.peso !== b.peso) { return a.peso - b.peso; }
      return a.indice - b.indice;
    });

    const elenco = [];
    for (let k = 0; k < raccolta.length; k++) { elenco.push(raccolta[k].badge); }
    return elenco;
  }

  /* ------------------------------------------------------------------
     8. ruoli() — chi è chi
     ------------------------------------------------------------------
     Si guardano sia i badge sia i tag diretti, perché i due non coincidono
     sempre: `mod=1` arriva anche senza il badge, e dentro una USERNOTICE
     capita l'opposto — i badge ci sono e i tag di stato no. Chi dei due
     dice di sì ha ragione: sbagliare per eccesso qui vuol dire mostrare un
     badge di troppo, sbagliare per difetto vuol dire non far riconoscere
     un moderatore, che è la cosa che questo widget non deve fare.

     `bot` resta sempre false: qui non si sa niente del nick, e non lo si
     vuole sapere. Lo decide chi chiama, confrontando il nick con la lista
     dell'impostazione `bot` (§6). È l'unico campo che questo file dichiara
     e non calcola, ed è dichiarato lo stesso perché l'oggetto del §5 deve
     uscire completo: nessun campo che compare a metà strada.
     ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------
     9. API pubblica
     ------------------------------------------------------------------
     pronto() dice «il catalogo è quello che sarà»: le due chiamate hanno
     finito, bene o male. Non dice che sono andate a buon fine, e non serve
     che lo dica — con il ripiego già in memoria non c'è niente per cui
     valga la pena aspettare, e resa.js può disegnare dal primo messaggio.
     ------------------------------------------------------------------ */
  window.Badge = {
    carica: carica,
    leggi: leggi,
    ruoli: ruoli,
    pronto: function () { return pronto; }
  };
}());
