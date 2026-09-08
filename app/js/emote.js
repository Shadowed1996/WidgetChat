/* =============================================================================
   emote.js — «il pollaio» · widget chat per OBS

   POSSIEDE: il catalogo delle emote — Twitch, 7TV, BTTV, FFZ, cheermote (§4) —
   e la trasformazione del testo di un messaggio nell'array di «pezzi» del §5
   del contratto: emote, cheer, menzioni, link, e il testo che resta.

   NON POSSIEDE: niente DOM, niente badge, niente resa. Qui dentro non si crea
   un elemento, non si legge la pagina, non si scrive un attributo. Questo file
   restituisce DATI; chi li disegna è resa.js, che è anche l'unico posto in cui
   quei dati toccano il documento (§1.4).

   TRE COSE VALGONO PER TUTTO IL FILE

   1. `carica()` non fallisce MAI. Un provider irraggiungibile fa perdere le sue
      emote, non il widget (§1.9): il catalogo resta com'è, `pezzi()` continua a
      restituire testo, e la chat si vede lo stesso. Per questo la Promise
      risolve sempre e ogni errore diventa al massimo un console.warn.
   2. Il catalogo è un oggetto PIATTO nome → voce, non un elenco. Ogni parola di
      ogni messaggio fa una ricerca: con quattro sorgenti in pagina sono qualche
      migliaio di emote, e scandire un array a ogni parola si vedrebbe in OBS,
      che disegna la chat mentre il computer sta già facendo girare il gioco.
   3. Gli URL escono di qui SEMPRE normalizzati a `https://`, o non escono
      affatto. 7TV e FFZ li servono senza schema («//cdn...»): se passassero
      così finirebbero in un `src` come percorsi relativi al file locale, e da
      `file://` (§1.2) non caricherebbero niente.

   INDICE
   1. Costanti e stato
   2. Micro-aiuti: https, avvisi, fetch col tetto di tempo
   3. Il catalogo e la precedenza fra le sorgenti
   4. Le quattro sorgenti di rete
   4-bis. Il ricordo — localStorage
   5. carica() — tutto in parallelo, niente reject
   6. Le emote native di Twitch e la trappola degli indici
   7. Dalla parola al pezzo: catalogo, cheer, menzioni, link
   8. pezzi() — il montaggio
   9. API pubblica
   ============================================================================= */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. Costanti e stato
     ------------------------------------------------------------------
     Gli indirizzi sono quelli del §7 del contratto, verificati e senza
     autenticazione. Da `file://` l'origine della pagina è `null`: queste
     API rispondono con `Access-Control-Allow-Origin: *`, ed è la ragione
     per cui il widget funziona anche aperto dal disco dentro OBS.
     ------------------------------------------------------------------ */
  const TEMPO_MAX = 8000;      // tetto di tempo per ogni singola chiamata

  const SETTE_GLOBALI = 'https://7tv.io/v3/emote-sets/global';
  const SETTE_CANALE  = 'https://7tv.io/v3/users/twitch/';
  const BTTV_GLOBALI  = 'https://api.betterttv.net/3/cached/emotes/global';
  const BTTV_CANALE   = 'https://api.betterttv.net/3/cached/users/twitch/';
  const FFZ_GLOBALI   = 'https://api.frankerfacez.com/v1/set/global';
  const FFZ_CANALE    = 'https://api.frankerfacez.com/v1/room/';

  const CDN_TWITCH = 'https://static-cdn.jtvnw.net/emoticons/v2/';
  const CDN_BTTV   = 'https://cdn.betterttv.net/emote/';
  const CDN_CHEER  = 'https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/';

  // Precedenza (§ delle istruzioni): l'emote di canale batte la globale, e a
  // parità 7TV batte BTTV batte FFZ. Si somma, così basta un numero solo.
  // Serve perché le quattro chiamate partono INSIEME e arrivano in ordine
  // sparso: senza un peso, chi risponde per ultimo vincerebbe, e il catalogo
  // cambierebbe da un avvio all'altro a seconda della rete.
  const PESO_CANALE = 100;
  const PESO_7TV    = 3;
  const PESO_BTTV   = 2;
  const PESO_FFZ    = 1;

  // 7TV marca le emote a larghezza zero con questo bit dentro `flags`.
  // Sono quelle che si disegnano SOPRA l'emote precedente (§5): SoCute,
  // RainTime, HYPERS e compagnia.
  const BIT_SOVRAPPOSTA = 1 << 8;   // 256

  // I gradini del cheermote: si prende il più alto che non supera la quantità.
  const LIVELLI_CHEER = [100000, 10000, 5000, 1000, 100, 1];

  // I prefissi che Twitch riconosce come cheermote. Il confronto è `=== 1`
  // e non `if (PREFISSI_CHEER[p])`: una parola come «constructor» pescherebbe
  // una proprietà di Object.prototype e diventerebbe un cheer fantasma.
  const PREFISSI_CHEER = {
    cheer: 1, bitboss: 1, doodlecheer: 1, party: 1, kappa: 1, pride: 1,
    showlove: 1, streamerdonation: 1, uni: 1, muxy: 1, hola: 1, charity: 1,
    pogchamp: 1, bday: 1, heyguys: 1, anon: 1, corgo: 1, nyan: 1, scoops: 1
  };

  const ID_EMOTE = /^[A-Za-z0-9_-]{1,64}$/;          // id del tag `emotes`
  const MENZIONE = /^@[a-zA-Z0-9_]{3,25}$/;          // i limiti dei login Twitch
  const LINK_ESPLICITO = /^https?:\/\/[^\s]+$/i;
  // I domini nudi: la stessa lista corta del sito. Allungarla vuol dire
  // trasformare in link ogni «ok.io» detto per scherzo.
  const LINK_NUDO = /^(?:[\w-]+\.)+(?:com|net|org|it|tv|gg|io|me|link|xyz|info|shop)(?:[\/?#][^\s]*)?$/i;
  // Punteggiatura appiccicata alla fine: «@tizio,» e «twitch.tv/x)» sono la
  // norma in chat. Si stacca prima di riconoscere menzioni e link, e torna
  // subito dopo come testo. Alle emote NON si applica: un'emote è la parola
  // intera, e «Sadge.» non è «Sadge».
  const CODA_MUTA = /[.,;:!?)\]}'"»…]+$/;

  const catalogo = Object.create(null);   // nome → voce; senza prototipo, così
                                          // un'emote che si chiama «toString»
                                          // non pesca un metodo per sbaglio
  let quantita = 0;      // quante voci ci sono davvero nel catalogo
  let fontiOk = 0;       // quante sorgenti hanno risposto qualcosa di leggibile
  let attesa = null;     // la Promise di carica(), riusata se qualcuno richiama

  let CANALE = '';       // login del canale, minuscolo — serve a `menzione.nostra`
  let ANIMA = true;      // impostazione `anima` (§6)

  /* ------------------------------------------------------------------
     2. Micro-aiuti: https, avvisi, fetch col tetto di tempo
     ------------------------------------------------------------------ */

  // Unico cancello per gli URL delle immagini. Quello che non è https esce
  // vuoto, e una voce senza url non entra nel catalogo (blocco 3).
  function aHttps(indirizzo) {
    const testo = String(indirizzo || '').trim();
    if (!testo) { return ''; }
    if (testo.indexOf('//') === 0) { return 'https:' + testo; }
    if (testo.indexOf('http://') === 0) { return 'https://' + testo.slice(7); }
    if (testo.indexOf('https://') === 0) { return testo; }
    return '';
  }

  // Un warn, mai un error: in OBS il log è una finestrella che nessuno guarda,
  // e un errore rosso fa credere che il widget sia rotto quando invece ha solo
  // perso un provider (§7).
  function avviso(testo) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[pollaio] ' + testo);
    }
  }

  // fetch con tetto di tempo. `fetch` da sola non scade mai: senza questo, un
  // provider che accetta la connessione e poi tace terrebbe il catalogo in
  // sospeso per tutta la diretta. AbortController chiude davvero la richiesta,
  // il setTimeout risolve comunque anche dove AbortController non esistesse.
  // Risolve SEMPRE: `null` vuol dire «non pervenuto», e chi legge si arrangia.
  function prendi(indirizzo, etichetta, muto) {
    return new Promise(function (risolvi) {
      if (typeof fetch !== 'function') { risolvi(null); return; }

      let controllo = null;
      let chiuso = false;

      try { controllo = new AbortController(); } catch (errore) { controllo = null; }

      const timer = setTimeout(function () {
        chiuso = true;
        if (controllo) { try { controllo.abort(); } catch (errore) { /* niente */ } }
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
          if (chiuso) { return; }              // già risolto dal timeout
          // `muto` è per i due casi che il contratto dichiara normali: FFZ del
          // canale risponde 404 e BTTV del canale può non conoscere il canale.
          // Non sono guasti, sono l'assenza di quelle emote.
          if (!muto) { avviso(etichetta + ': ' + (errore && errore.message ? errore.message : 'non raggiungibile') + '. Vado avanti senza.'); }
          risolvi(null);
        });
    });
  }

  /* ------------------------------------------------------------------
     3. Il catalogo e la precedenza fra le sorgenti
     ------------------------------------------------------------------
     Una voce del catalogo è già quasi un pezzo del §5, più il `peso` che
     serve solo qui dentro. `peso` non esce mai: `daCatalogo()` copia i
     campi in un oggetto nuovo, così chi disegna non può modificare per
     sbaglio il catalogo di tutti i messaggi futuri.
     ------------------------------------------------------------------ */
  function deposita(nome, voce) {
    if (!nome || !voce || !voce.url) { return; }

    const vecchia = catalogo[nome];
    if (vecchia && vecchia.peso >= voce.peso) { return; }   // vince chi pesa di più
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

  /* ------------------------------------------------------------------
     4. Le quattro sorgenti di rete
     ------------------------------------------------------------------
     Ogni lettore riceve quello che ha risposto il provider e non si fida
     di niente: chiavi che mancano, campi di un altro tipo, elenchi che
     non sono elenchi. Una voce storta si salta, le altre entrano.

     Nota sull'impostazione `anima`: fra le sorgenti del contratto solo il
     cheermote ha un indirizzo statico dichiarato, e infatti è l'unico che
     lo usa (blocco 7). Per le altre non ci si inventa un URL che non è
     scritto da nessuna parte: l'informazione «questa è animata» viaggia
     sul pezzo (`animata: true`) e decide chi disegna.
     ------------------------------------------------------------------ */

  // 7TV: `{name, data:{id, animated, flags, host:{url, files[]}}}`, e il bit
  // della sovrapposizione può stare sulla voce dell'insieme oppure sul dato
  // dell'emote a seconda di com'è stata aggiunta: si guardano tutti e due.
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

  // `host.files` elenca i formati davvero disponibili. Si preferisce il webp
  // (lo capiscono tutti i browser recenti e pesa meno), ma se un'emote vecchia
  // ha solo l'avif o il gif si prende quello che c'è invece di chiedere un
  // file che non esiste.
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

  // BTTV: `{id, code, imageType, animated}`. `imageType` vale 'gif' anche
  // quando `animated` manca, ed è il caso della metà delle emote globali.
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
        sovrapposta: false,   // BTTV non dichiara le sue a larghezza zero
        peso: PESO_BTTV + (dalCanale ? PESO_CANALE : 0)
      });
    }
  }

  // FFZ: `sets` è un oggetto indicizzato per numero d'insieme, non un elenco.
  // Sul globale si guarda `default_sets`: gli altri insiemi che arrivano nella
  // stessa risposta sono roba speciale che nemmeno FFZ mostra per forza, e
  // caricarli vorrebbe dire far comparire emote che nessuno ha mai attivato.
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

        // `animated`, sulle emote nuove, non è un sì/no: è un secondo
        // elenco di misure con le versioni in movimento. Se c'è, l'emote è
        // animata; gli indirizzi da usare sono quelli solo quando `anima` è
        // acceso, altrimenti restano le misure ferme di `urls`.
        const moto = voce.animated;
        const animata = !!moto;
        let misure = voce.urls || {};
        if (animata && typeof moto === 'object' && ANIMA) { misure = moto; }

        // FFZ non garantisce tutte e tre le misure: le emote vecchie hanno
        // spesso solo la 1. Si scende di misura invece di chiedere un file
        // che non c'è.
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

  /* ------------------------------------------------------------------
     5. carica() — tutto in parallelo, niente reject
     ------------------------------------------------------------------
     Le sei chiamate partono insieme: in serie, con sei tetti da otto
     secondi, l'attesa peggiore sarebbe quasi un minuto di chat muta.
     Insieme, il peggio è otto secondi e basta, e l'ordine d'arrivo non
     conta perché a decidere chi vince è il peso (blocco 1).
     ------------------------------------------------------------------ */

  // Il guscio comune: prende, conta la sorgente riuscita, e legge dentro un
  // try/catch. Se un provider cambiasse la forma della risposta domani, qui
  // si perde quella sorgente — non l'avvio del widget.
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

  /* ------------------------------------------------------------------
     4-bis. Il ricordo — localStorage
     ------------------------------------------------------------------
     PERCHÉ ESISTE. Il LEGGIMI consiglia di spuntare in OBS «Aggiorna il
     browser quando la scena diventa attiva», quindi ogni cambio di scena
     rifà da capo tutte e sei le chiamate ai cataloghi. Su una regia che
     alterna due scene ogni minuto sono centinaia di richieste all'ora a
     server che non sono nostri, e il §15 del contratto dice che il ritmo
     delle letture è una questione di educazione prima che di risorse.
     Nel frattempo, finché quelle risposte non arrivano, le prime righe
     escono senza le emote di terze parti: è il problema noto che il
     LEGGIMI elenca come «si vedono i nomi ma non le emote».

     COSA SI RICORDA. Non le risposte grezze dei provider — sono megabyte
     di JSON pieni di campi che non guardiamo, e localStorage ne regge
     cinque in tutto — ma il catalogo GIÀ RIDOTTO, cioè lo stesso oggetto
     piatto nome → voce che serve a pezzi(). È molto più piccolo e al
     ritorno non va rianalizzato: si rimette in piedi e basta.

     LE TRE ETÀ DI UN RICORDO
       fresco  (< 30 min)  si usa e la rete non si tocca affatto. È il
                           caso del cambio di scena, quello che toglie
                           insieme l'attesa e il traffico.
       stanco  (< 12 ore)  si usa subito e intanto si ricarica dietro per
                           la volta dopo: le emote ci sono dalla prima
                           riga e restano comunque aggiornate.
       scaduto (oltre)     si butta e si fa il giro di rete di sempre.

     L'IMPRONTA. Un ricordo vale solo per lo stesso canale e le stesse
     sorgenti accese: chi spegne 7TV e ricarica non deve ritrovarsi le
     emote di 7TV ripescate dal ricordo di prima.

     UN'EMOTE TOLTA A MONTE sopravvive nel catalogo fino alla scadenza,
     perché il giro di rete deposita le nuove ma non cancella le vecchie.
     È il prezzo di questo meccanismo, ed è accettabile: costa un'emote
     disegnata di troppo per qualche ora, non una riga di chat persa.
     ------------------------------------------------------------------ */

  const CHIAVE_RICORDO = 'sb-pollaio-emote';

  // Cambia quando cambia la FORMA di una voce del catalogo. Un ricordo
  // scritto da una versione precedente viene buttato invece di essere
  // interpretato male: un campo mancante qui diventa un'immagine rotta
  // sopra al gameplay, e non si vede finché non è in diretta.
  const FORMATO_RICORDO = 1;

  const RICORDO_FRESCO  = 1800000;    // 30 minuti
  const RICORDO_SCADUTO = 43200000;   // 12 ore

  // Oltre questo, non si scrive. Un catalogo enorme riempirebbe la quota
  // e farebbe fallire anche il salvataggio della regia, che vive nello
  // stesso spazio: meglio rinunciare al ricordo che rompere il vicino.
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
    // Non si salva un catalogo vuoto: se la rete è caduta del tutto,
    // ricordarsi il niente vorrebbe dire ripartire senza emote e senza
    // nemmeno riprovare per le prossime dodici ore.
    if (!quantita) { return; }

    try {
      const testo = JSON.stringify({
        v: FORMATO_RICORDO,
        ts: Date.now(),
        impronta: impronta(id, scelte),
        sorgenti: fontiOk,
        catalogo: catalogo
      });

      if (testo.length > TETTO_RICORDO) {
        avviso('il catalogo è troppo grande per essere ricordato');
        return;
      }

      localStorage.setItem(CHIAVE_RICORDO, testo);
    } catch (err) {
      // Quota piena, navigazione privata, storage negato dal browser:
      // sono tutti casi in cui si perde solo la scorciatoia. Il §2 del
      // contratto vuole il try/catch anche in scrittura, e qui il motivo
      // si vede: senza, il widget non partirebbe per un ricordo.
    }
  }

  /* Rimette in piedi il catalogo e dice che età aveva: 'fresco', 'stanco'
     oppure null se non c'era, non era leggibile, era di un altro canale o
     era scaduto. Il chiamante decide cosa farne. */
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
    // Un `ts` nel futuro vuol dire orologio spostato all'indietro dopo il
    // salvataggio: si butta, invece di tenersi un ricordo che non
    // scadrebbe mai.
    if (eta < 0 || eta > RICORDO_SCADUTO) { return null; }

    const nomi = Object.keys(dato.catalogo);
    for (let i = 0; i < nomi.length; i++) {
      const voce = dato.catalogo[nomi[i]];
      // Si ricontrolla l'https anche in uscita dal ricordo: fra la
      // scrittura e adesso c'è passato il disco, ed è l'unico cancello
      // che protegge un `src` (§1.4 e la terza regola del cappello).
      if (voce && aHttps(voce.url)) { deposita(nomi[i], voce); }
    }

    if (!quantita) { return null; }

    fontiOk = Number(dato.sorgenti) || 1;
    return eta < RICORDO_FRESCO ? 'fresco' : 'stanco';
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
        // Muto: oggi risponde con le liste vuote (§7), e per un canale non
        // registrato su BTTV risponde 404. Sono tutti e due «non ce ne sono».
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
        // Muto: il 404 è la risposta normale per un canale che su FFZ non ha
        // una stanza. Si tace e si va avanti, dice il contratto.
        lavori.push(sorgente(FFZ_CANALE + encodeURIComponent(CANALE), 'FFZ del canale', true, function (dati) {
          leggiFfz(dati, true);
        }));
      }
    }

    // `then(fine, fine)`: anche se qualcosa riuscisse a rompersi fuori dai
    // try/catch qui sopra, la Promise pubblica risolve lo stesso. Chi ha
    // chiamato non deve mai avere un `catch` per far partire la chat.
    function fine() {
      // Si ricorda alla fine del giro, col catalogo al completo: salvarlo a
      // ogni sorgente che arriva vorrebbe dire scrivere sei volte per
      // tenersi soltanto la sesta.
      ricorda(id, scelte);
      return esito();
    }

    return Promise.all(lavori).then(fine, fine);
  }

  function carica(idCanale, canale, opzioni) {
    // Chi chiama due volte (l'anteprima della regia che si ridisegna) riceve
    // la stessa attesa invece di rifare il giro di rete.
    if (attesa) { return attesa; }

    const scelte = opzioni || {};
    const id = String(idCanale || '').replace(/[^0-9]/g, '');

    // Il login del canale resta qui dentro per tutta la vita della pagina: è
    // il metro con cui `menzione.nostra` decide se hanno nominato lo streamer.
    // Si scrive PRIMA di guardare il ricordo, perché entra nella sua impronta.
    CANALE = String(canale || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    ANIMA = scelte.anima !== false;

    const eta = ripescaRicordo(id, scelte);

    if (eta) {
      // Il catalogo è già in piedi: chi ha chiamato disegna le emote dalla
      // PRIMA riga di chat, che è tutto il motivo per cui questo esiste.
      attesa = Promise.resolve(esito());

      // Stanco: si ricarica dietro, senza far aspettare nessuno e senza
      // toccare `attesa`. Le voci nuove entrano nel catalogo vivo mentre la
      // chat già scorre, e il ricordo si riscrive per la volta dopo.
      if (eta === 'stanco') { giroDiRete(id, scelte); }

      return attesa;
    }

    attesa = giroDiRete(id, scelte);
    return attesa;
  }

  /* ------------------------------------------------------------------
     6. Le emote native di Twitch e la trappola degli indici
     ------------------------------------------------------------------
     Il tag ha questa forma:  25:0-4,12-16/1902:6-10
     cioè id, due punti, e gli intervalli di posizione nel testo. Le native
     si lavorano PER PRIME e hanno la precedenza assoluta: sono le uniche
     di cui Twitch ci dice esattamente dove stanno, e non passano dal
     catalogo perché il tag ci dà già l'id.

     QUI SBAGLIANO QUASI TUTTI. Gli indici sono in PUNTI DI CODICE Unicode,
     non in unità UTF-16 come quelle che conta JavaScript. Un'emoji fuori
     dal piano base (👍, 🐔, la metà delle bandiere) per JavaScript è lunga
     due, per Twitch è lunga uno. Basta una di quelle prima dell'emote —
     e in chat ce n'è a ogni riga — perché `testo.slice(inizio, fine + 1)`
     tagli spostato di un carattere: l'emote esce con il nome storto e, cosa
     peggiore, il testo attorno esce mangiato o duplicato.

     La cura è lavorare su `Array.from(testo)`, che spezza per caratteri
     veri (per punti di codice), tagliare lì e ricomporre con join. Costa
     un array per messaggio: è il prezzo giusto per non spezzare le emoji.
     ------------------------------------------------------------------ */
  function leggiTagEmotes(tag) {
    const fuori = [];
    const testo = String(tag || '').trim();
    if (!testo) { return fuori; }

    const gruppi = testo.split('/');
    for (let i = 0; i < gruppi.length; i++) {
      const due = gruppi[i].indexOf(':');
      if (due <= 0) { continue; }

      const id = gruppi[i].slice(0, due);
      if (!ID_EMOTE.test(id)) { continue; }   // l'id finisce in un URL: si controlla

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
      // Il tag non dice se l'emote è animata, e non c'è modo di saperlo senza
      // chiedere all'API con un token. Si dichiara ferma: nessuno se ne fa
      // niente di male, l'immagine si muove lo stesso se si muove.
      animata: false,
      sovrapposta: false
    };
  }

  // Restituisce un elenco di «tratti»: o un'emote nativa già pronta, o un
  // pezzo di testo grezzo che il blocco 7 dovrà ancora guardare parola per
  // parola. Gli spazi attorno alle emote restano nei tratti grezzi, quindi
  // la spaziatura del messaggio non si perde.
  function tagliaNative(corpo, tagEmotes) {
    const intervalli = leggiTagEmotes(tagEmotes);
    if (!intervalli.length) { return [{ testo: corpo }]; }

    const lettere = Array.from(corpo);   // per caratteri veri, vedi il cappello
    const tratti = [];
    let cursore = 0;

    // Il tag elenca gli id nell'ordine in cui compaiono nell'elenco, non nel
    // testo: senza questo riordino il cursore andrebbe all'indietro e i pezzi
    // uscirebbero mescolati.
    intervalli.sort(function (a, b) { return a.inizio - b.inizio; });

    for (let i = 0; i < intervalli.length; i++) {
      const tratto = intervalli[i];
      if (tratto.inizio < cursore) { continue; }          // si accavalla: si scarta
      if (tratto.fine >= lettere.length) { continue; }    // tag più lungo del testo

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

  /* ------------------------------------------------------------------
     7. Dalla parola al pezzo: catalogo, cheer, menzioni, link
     ------------------------------------------------------------------
     Sul testo rimasto si lavora per parole intere. Un'emote di terze parti
     è una parola intera e mai un pezzo di parola: cercarla dentro le
     parole trasformerebbe «pescatore» in «pesc» + l'emote «atore», ed è
     esattamente il difetto per cui certi widget sembrano impazziti.
     ------------------------------------------------------------------ */

  // Il posto unico dove entra il testo: unisce ai pezzi `testo` adiacenti e
  // scarta il vuoto, così il §5 è rispettato per costruzione invece che con
  // una ripulita finale.
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

  // Si guarda solo se il messaggio ha davvero dei bits: senza questo,
  // «pride100» scritto per scherzo diventerebbe un cheermote in un messaggio
  // che non ha pagato niente.
  function forseCheer(parola) {
    const trovato = parola.match(/^([a-z]+)(\d+)$/i);
    if (!trovato) { return null; }
    if (PREFISSI_CHEER[trovato[1].toLowerCase()] !== 1) { return null; }

    const quanti = parseInt(trovato[2], 10);
    if (!isFinite(quanti) || quanti < 1) { return null; }

    const livello = livelloCheer(quanti);
    // L'unico posto in cui `anima` cambia davvero un indirizzo: qui la
    // versione ferma esiste ed è dichiarata (§7).
    const moto = ANIMA ? 'animated' : 'static';

    return {
      tipo: 'cheer',
      // `nome` è il prefisso come l'ha scritto chi ha pagato: serve all'alt.
      // L'immagine invece è sempre quella dell'azione «Cheer»: gli altri
      // prefissi hanno una cartella loro, ma l'elenco sta dietro all'API
      // autenticata dei cheermote, e qui non ci sono token (§1.3).
      nome: trovato[1],
      bits: quanti,
      // url/url2 come per le emote (§5): 2x e 4x, per il srcset di resa.js.
      url: CDN_CHEER + moto + '/' + livello + '/2.' + (ANIMA ? 'gif' : 'png'),
      url2: CDN_CHEER + moto + '/' + livello + '/4.' + (ANIMA ? 'gif' : 'png'),
      livello: livello
    };
  }

  // Il link NON diventa cliccabile: in un overlay non serve a niente (in OBS
  // non si può nemmeno cliccare) e un anchor con un indirizzo scritto da uno
  // sconosciuto è un rischio gratuito. Il pezzo serve solo a farlo vedere
  // diverso dal testo. L'URL si normalizza lo stesso, per chi volesse
  // mostrarlo pulito.
  function forseLink(parola) {
    if (LINK_ESPLICITO.test(parola)) { return aHttps(parola); }
    if (LINK_NUDO.test(parola)) { return 'https://' + parola; }
    return '';
  }

  function guardaParola(parola, bits, uscita) {
    // 1. Catalogo. Prima di tutto il resto: le emote di terze parti sono
    //    parole intere e non assomigliano a niente altro.
    const voce = catalogo[parola];
    if (voce) { uscita.push(daCatalogo(voce)); return; }

    // 2. Cheer.
    if (bits > 0) {
      const cheer = forseCheer(parola);
      if (cheer) { uscita.push(cheer); return; }
    }

    // 3. Menzioni e link, senza la punteggiatura appesa in fondo.
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

    // 4. Niente di tutto questo: è testo.
    spingiTesto(uscita, parola);
  }

  // Si spezza tenendo gli spazi (il gruppo dentro split li restituisce), così
  // «ciao   a  tutti» resta com'era: in chat la spaziatura è un modo di dire
  // le cose, e comprimerla cambierebbe il messaggio.
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

  /* ------------------------------------------------------------------
     8. pezzi() — il montaggio
     ------------------------------------------------------------------
     Il testo che arriva qui è il corpo del PRIVMSG già ripulito da irc.js:
     per un `/me` la cornice `\x01ACTION …\x01` è già stata tolta, ed è
     giusto così, perché gli indici del tag `emotes` sono contati sul testo
     senza quella cornice.
     ------------------------------------------------------------------ */
  /* --- Le emote di Kick -----------------------------------------------------
     Kick non manda un tag a parte con gli indici come Twitch: infila le sue
     emote DENTRO il testo, con una sintassi sua che si porta dietro anche il
     nome — `[emote:5748035:collectiblesmonkaEyes]`.

     Questo la rende più semplice del caso Twitch (niente indici da contare
     sulle unità di codice) e più pericolosa in un modo diverso: quella
     sintassi può scriverla CHIUNQUE a mano in chat. Non è un problema, ed è
     bene sapere perché: l'id passa da una regola che accetta solo cifre, e
     l'indirizzo che ne esce punta comunque al CDN di Kick. Al massimo si
     ottiene un'emote che non esiste, cioè un'immagine rotta, non un
     indirizzo scelto da chi scriveva.

     Il resto del testo passa dalla stessa `guardaGrezzo` del caso Twitch: i
     link e le menzioni si riconoscono allo stesso modo su tutte le chat, e
     avere due strade diverse vorrebbe dire scoprire fra un mese che su una
     delle due i link non si accendono.

     Le emote di terze parti (7TV, BetterTTV) su Kick restano parole nude:
     Kick non le risolve nel suo payload e noi non abbiamo il suo catalogo.
     Restano testo, che è esattamente quello che sono per il server.
     -------------------------------------------------------------------------- */
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
        /* Kick serve una misura sola: la 2x e la 4x sono lo stesso file.
           Meglio ripeterlo che lasciare url2 vuoto, perché chi disegna si
           aspetta due indirizzi e con uno solo perderebbe il srcset. */
        url2: indirizzo,
        fonte: 'kick',
        /* Non si può sapere: allo stesso indirizzo Kick serve un PNG o una
           GIF a seconda dell'emote, e non lo dichiara nel messaggio. Si dice
           `false` invece di indovinare — l'unica cosa che ne dipende è il
           congelamento di `anima=0`, e mancare un congelamento è meno grave
           che fermare un'immagine che non si muoveva. */
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

  /* ------------------------------------------------------------------
     9. API pubblica
     ------------------------------------------------------------------
     `pronto` e `quante` servono alla diagnostica: dicono se le sorgenti
     hanno risposto e quante emote ci sono in mano. Il widget funziona
     comunque anche quando sono `false` e `0` — restano le native di
     Twitch, che non hanno bisogno di nessun catalogo.
     ------------------------------------------------------------------ */
  window.Emote = {
    carica: carica,
    pezzi: pezzi,
    pezziKick: pezziKick,
    pronto: function () { return fontiOk > 0; },
    quante: function () { return quantita; }
  };
}());
