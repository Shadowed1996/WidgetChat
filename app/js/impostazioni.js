(function () {
  'use strict';

  const LIMITE_TESTO = 400;

  const BASE = 'pollaio.html';

  const SCHEMA = [

    {
      gruppo: 'canale',
      chiave: 'canale',
      tipo: 'testo',
      predefinito: 'slayer_beard',
      modello: /^[a-z0-9_]{1,25}$/,
      etichetta: 'Il canale da seguire',
      aiuto: 'Il nome che compare nell’indirizzo di Twitch, tutto minuscolo. Lo cambio solo se voglio mostrare la chat di qualcun altro — durante un raid, oppure per provare l’overlay su un canale dove in questo momento c’è gente che scrive.'
    },
    {
      gruppo: 'canale',
      chiave: 'id',
      tipo: 'testo',
      predefinito: '47738247',
      modello: /^[0-9]{1,12}$/,
      etichetta: 'L’id numerico del canale',
      aiuto: '7TV, BetterTTV e FrankerFaceZ non sanno chi sia «slayer_beard»: i loro indirizzi vogliono il numero. Se lo sbaglio la chat funziona lo stesso e restano le emote globali, ma quelle del canale — le uniche che la gente scrive davvero — non arrivano più.'
    },
    {
      gruppo: 'canale',
      chiave: 'prova',
      tipo: 'sìno',
      predefinito: false,
      etichetta: 'Modalità prova',
      aiuto: 'Non mi collego a niente e mi invento del traffico: nomi, emote, un raid, un abbonamento, un messaggio in evidenza. Serve a inquadrare l’overlay in OBS a canale spento, che è sempre il momento in cui si sistema un overlay. Resta una spia PROVA in alto, così non lo scambio per la chat vera e non lo dimentico acceso.'
    },
    {
      gruppo: 'canale',
      chiave: 'ostile',
      tipo: 'sìno',
      predefinito: false,
      etichetta: 'Traffico ostile',
      aiuto: 'Vale solo con la modalità prova accesa. Il traffico normale è credibile; questo è cattivo apposta — nomi lunghissimi senza spazi, testo con i segni impilati che fanno la colonna di inchiostro, uno scavalco della direzione che ribalta la frase, un muro di testo senza spazi, cento abbonamenti regalati in un colpo. Sono i casi che rompono un overlay, e le difese ci sono già: questo è il modo di guardarle lavorare invece di fidarsi.'
    },

    {
      gruppo: 'canale',
      chiave: 'finestra',
      tipo: 'sìno',
      predefinito: false,

      nascosta: true,
      etichetta: 'Dentro la finestra del launcher',
      aiuto: 'Lo mette Pollaio.exe da sé: dice alla pagina che sta girando nella sua finestra, quella senza barra del titolo, e accende il menu del tasto destro con Chiudi, Riduci a icona, Sposta e Apri la regia.'
    },

    {
      gruppo: 'chat',
      chiave: 'kick',
      tipo: 'testo',
      predefinito: '',

      modello: /^[a-z0-9_-]{1,32}$/,
      etichetta: 'Il canale Kick',
      aiuto: 'Il nome che compare nell’indirizzo di kick.com, oppure l’indirizzo intero incollato: lo taglio io. Lasciandolo vuoto Kick non si collega proprio. Quando c’è, sopra ogni messaggio compare la targhetta che dice da quale chat arriva — anche su quelli di Twitch, perché il senso della targhetta è distinguere, e con una chat sola non ci sarebbe niente da distinguere.'
    },
    {
      gruppo: 'chat',
      chiave: 'kickstanza',
      tipo: 'testo',
      predefinito: '',
      modello: /^[0-9]{1,12}$/,
      etichetta: 'L’id della chatroom Kick',
      aiuto: 'Quasi sempre da lasciare vuoto: l’id me lo trovo da solo dal nome del canale. Serve solo se un giorno Kick chiude quella porta e smetto di riuscirci — allora si apre kick.com/api/v2/channels/nomecanale nel browser, si cerca «chatroom», e il numero che c’è dentro si incolla qui. Se lo metto, non chiedo niente a nessuno e vado dritto alla chat.'
    },

    {
      gruppo: 'chat',
      chiave: 'youtube',
      tipo: 'testo',
      predefinito: '',

      etichetta: 'La diretta YouTube',
      aiuto: 'L’indirizzo della diretta, o solo il suo id. Lo prendo da watch?v=…, da youtu.be/… o da live/…: incolla quello che hai. Serve l’id del VIDEO e non del canale, ed è una scelta di risparmio: risalire dal canale alla diretta in onda passerebbe da una chiamata che ha un tetto separato di cento al giorno, e bastano pochi riavvii per finirlo senza capire perché.'
    },
    {
      gruppo: 'chat',
      chiave: 'ytchiave',
      tipo: 'testo',
      predefinito: '',

      etichetta: 'La chiave API di YouTube',
      aiuto: 'Una chiave gratuita creata da te sulla console Google Cloud, con la sola YouTube Data API v3 attiva. Serve perché YouTube, a differenza di Twitch e Kick, non ha nessun modo di leggere una chat senza identificarsi. Due cose da sapere: la chiave finisce nell’indirizzo dell’overlay, quindi è visibile a chi vede il tuo schermo — usane una dedicata, che al massimo si brucia la quota e si rigenera in trenta secondi. E la quota è il vero limite: sono diecimila unità al giorno e coprono una diretta lunga solo se non chiedo troppo spesso, che è quello che faccio.'
    },

    {
      gruppo: 'aspetto',
      chiave: 'tema',
      tipo: 'voce',
      predefinito: 'notte',
      voci: [
        { valore: 'notte', etichetta: 'Notte' },
        { valore: 'nudo', etichetta: 'Nudo' },
        { valore: 'insegna', etichetta: 'Insegna' }
      ],
      etichetta: 'Il tema',
      aiuto: '«Notte» dà a ogni messaggio la sua lastrina di vetro scuro, e sta bene sopra a quasi tutto: fra una riga e l’altra passa il gioco, e quanto ne passa lo decido con «quanta aria fra i messaggi». «Nudo» toglie il fondo e lascia il testo con un’ombra netta: è quello che voglio quando il gioco deve vedersi tutto. «Insegna» fa di ogni messaggio una scheda piena col gradiente del canale: si legge da lontano, ma copre parecchio schermo e regge solo se la chat è lenta.'
    },
    {
      gruppo: 'aspetto',
      chiave: 'fondo',
      tipo: 'voce',
      predefinito: 'trasparente',
      voci: [
        { valore: 'trasparente', etichetta: 'Trasparente' },
        { valore: 'scuro', etichetta: 'Scuro' },
        { valore: 'verde', etichetta: 'Verde' },
        { valore: 'magenta', etichetta: 'Magenta' }
      ],
      etichetta: 'Il fondo della pagina',
      aiuto: '«Trasparente» è quello giusto per una Sorgente Browser di OBS: sotto ai messaggi si vede il gioco. Ma in una finestra vera trasparente vuol dire bianco, e su bianco il testo chiaro sparisce — è per questo che Pollaio.exe usa «Scuro». «Verde» e «Magenta» sono per la cattura finestra: metto un fondo pieno e lo tolgo in OBS col chroma key. Scelgo il magenta quando in scena c’è del verde, tipo un prato.'
    },
    {
      gruppo: 'aspetto',
      chiave: 'spazio',
      tipo: 'numero',
      predefinito: 130,
      min: 40,
      max: 400,
      passo: 10,
      unita: '%',

      sinonimi: { compatto: 60, normale: 115, arioso: 220 },
      etichetta: 'Quanta aria fra i messaggi',
      aiuto: 'Su uno screenshot il compatto sembra sempre la scelta furba, perché ci stanno più righe. Dal vivo è il contrario: le righe si inseguono e l’occhio non riesce più ad agganciare quella giusta mentre passa. Se la chat è veloce alzo qui e tengo meno messaggi. Cento è il vecchio «normale»: sotto i settanta i messaggi si toccano, sopra i duecentocinquanta diventano schede staccate.'
    },
    {
      gruppo: 'aspetto',
      chiave: 'effetto',
      tipo: 'voce',
      predefinito: 'scivola',
      voci: [
        { valore: 'scivola', etichetta: 'Scivola' },
        { valore: 'bagliore', etichetta: 'Bagliore' },
        { valore: 'sfoca', etichetta: 'Sfoca' },
        { valore: 'glitch', etichetta: 'Glitch' },
        { valore: 'matrix', etichetta: 'Matrix' },
        { valore: 'insegna', etichetta: 'Neon' },
        { valore: 'scatto', etichetta: 'Scatto' },
        { valore: 'niente', etichetta: 'Niente' }
      ],
      etichetta: 'Come entra un messaggio',
      aiuto: 'Da guardare nell’anteprima qui accanto, perché a parole non si decide. «Scivola» è sobrio e non stanca in otto ore. «Bagliore» ci fa passare sopra una luce, «Sfoca» lo mette a fuoco, «Neon» lo accende a sfarfallii, «Glitch» è un disturbo video vero: la riga si strappa, i colori si separano, la tinta va fuori giri e ci passano sopra le righe di scansione. È l’unico che dura quasi un secondo invece di un istante, perché a raffica breve non si vedeva: si intuiva soltanto. Arriva a strappi, si calma un attimo e ricade — ed è la ricaduta quella che si guarda. «Matrix» fa arrivare i caratteri scombinati e li ricompone da sinistra a destra, in verde da terminale, con una riga di scansione che scende — è il più cyberpunk dei sette e anche il più costoso, quindi si scombina solo il testo corto e non più di quattro messaggi per volta. «Scatto» lo fa entrare di lato con una molla. «Niente» toglie il movimento: serve se il computer fatica o se registro e non voglio animazioni parassite.'
    },
    {
      gruppo: 'aspetto',
      chiave: 'velocita',
      tipo: 'numero',
      predefinito: 100,
      min: 25,
      max: 300,
      passo: 5,
      unita: '%',

      etichetta: 'Velocità dell’ingresso',
      aiuto: 'Quanto va svelto l’effetto scelto qui sopra. Cento è la misura con cui sono stati disegnati tutti e otto. Si abbassa quando un effetto piace ma passa troppo in fretta per essere visto — capita col glitch e col matrix, che raccontano qualcosa e hanno bisogno di tempo — e si alza quando la chat corre e l’animazione comincia a sembrare un ritardo dell’overlay invece che un ingresso.'
    },
    {
      gruppo: 'aspetto',
      chiave: 'larghezza',
      tipo: 'numero',
      predefinito: 420,
      min: 240,
      max: 1000,
      passo: 10,
      unita: 'px',
      esatto: true,
      etichetta: 'Larghezza della colonna',
      aiuto: 'È lo stesso numero che va scritto nella sorgente browser di OBS. Se qui metto 420 e là 320, la chat viene tagliata a destra e me ne accorgo a diretta iniziata: i due numeri vanno tenuti uguali, ed è per questo che il righello sotto l’anteprima li stampa insieme.'
    },
    {
      gruppo: 'aspetto',
      chiave: 'scala',
      tipo: 'numero',
      predefinito: 100,
      min: 60,
      max: 200,
      passo: 5,
      unita: '%',
      etichetta: 'Grandezza del testo',
      aiuto: 'Cento è la misura normale. Il metro giusto però non è questo monitor: è un telefono che guarda la diretta con l’overlay grande un quarto di schermo. Se lì non si legge alzo qui, che costa meno che allargare la colonna — la colonna ruba spazio al gioco, il corpo del testo no.'
    },
    {
      gruppo: 'aspetto',
      chiave: 'verso',
      tipo: 'voce',
      predefinito: 'su',
      voci: [
        { valore: 'su', etichetta: 'I nuovi in basso' },
        { valore: 'giu', etichetta: 'I nuovi in alto' }
      ],
      etichetta: 'Da che parte entrano i messaggi',
      aiuto: 'Con «su» la chat cresce verso l’alto, come su Twitch: è quello che si aspettano tutti. «Giu» serve quando l’overlay è appoggiato al bordo alto dello schermo e sotto ha altra roba — la barra degli obiettivi, gli alert — che non voglio far spingere in giù a ogni messaggio.'
    },
    {
      gruppo: 'aspetto',
      chiave: 'pollo',
      tipo: 'sìno',
      predefinito: false,
      etichetta: 'La mascotte accanto alla chat',
      aiuto: 'Il pollo del canale seduto sul bordo della colonna. Non serve a niente e si mangia una sessantina di pixel, ma riempie l’angolo quando la chat è ferma e fa capire che quell’overlay è di questo canale, non uno scaricato da un sito.'
    },

    {
      gruppo: 'contenuto',
      chiave: 'max',
      tipo: 'numero',
      predefinito: 40,
      min: 5,
      max: 200,
      passo: 5,
      unita: 'msg',
      esatto: true,
      etichetta: 'Quanti messaggi resto ad appendere',
      aiuto: 'Quanti messaggi restano appesi prima che i più vecchi escano. Con una chat veloce, oltre la cinquantina non si legge più niente e la sorgente browser inizia a mangiarsi il processore: ogni riga in pagina è roba che OBS ridisegna sessanta volte al secondo.'
    },
    {
      gruppo: 'contenuto',
      chiave: 'svanisci',
      tipo: 'numero',
      predefinito: 0,
      min: 0,
      max: 600,
      passo: 5,
      unita: 's',
      esatto: true,
      etichetta: 'Dopo quanto svanisce un messaggio',
      aiuto: 'A zero non spariscono mai. Metto 60 se voglio che la chat si svuoti da sola quando nessuno scrive: sopra a un gameplay, una colonna di messaggi vecchi di dieci minuti non è più chat, è roba che copre il gioco.'
    },
    {
      gruppo: 'contenuto',
      chiave: 'emote',
      tipo: 'sìno',
      predefinito: true,
      etichetta: 'Disegna le emote',
      aiuto: 'Spente, al posto della figura resta la parola: «Kappa» si legge come testo. Le tolgo quando la colonna è stretta e tre emote di fila si mangiano una riga intera senza dire niente a chi guarda da fuori.'
    },
    {
      gruppo: 'contenuto',
      chiave: 'sette',
      tipo: 'sìno',
      predefinito: true,
      etichetta: 'Emote 7TV',
      aiuto: 'Sono quelle che la chat usa davvero: le emote di Twitch le vedono solo gli abbonati, quelle di 7TV le vede chiunque, e infatti è lì che finiscono le battute interne del canale. Se il servizio non risponde perdo quelle emote, non la chat.'
    },
    {
      gruppo: 'contenuto',
      chiave: 'bttv',
      tipo: 'sìno',
      predefinito: true,
      etichetta: 'Emote BetterTTV',
      aiuto: 'Il provider storico. Oggi il canale non ne ha nessuna e la risposta arriva vuota — è normale, non è un guasto — ma restano le globali, che in chat qualcuno continua a scrivere per abitudine.'
    },
    {
      gruppo: 'contenuto',
      chiave: 'ffz',
      tipo: 'sìno',
      predefinito: true,
      etichetta: 'Emote FrankerFaceZ',
      aiuto: 'Come sopra, ancora più raro: sul canale l’indirizzo risponde 404 e la cosa finisce lì, in silenzio. Lo lascio acceso perché le globali costano una richiesta sola all’avvio e poi non se ne parla più per tutta la diretta.'
    },
    {
      gruppo: 'contenuto',
      chiave: 'anima',
      tipo: 'sìno',
      predefinito: true,
      etichetta: 'Lascia animate le emote animate',
      aiuto: 'Un’emote animata è un piccolo video in loop: venti in pagina sono venti animazioni che il browser di OBS ridisegna insieme al gioco, sulla stessa scheda video. Se la diretta perde fotogrammi proprio quando la chat va forte, questo è il primo interruttore da spegnere.'
    },
    {
      gruppo: 'contenuto',
      chiave: 'badge',
      tipo: 'sìno',
      predefinito: true,
      etichetta: 'Disegna i badge',
      aiuto: 'I distintivi davanti al nome: mod, VIP, abbonato, chi ha portato bits. Dicono a colpo d’occhio chi sta parlando, ed è il modo più veloce per accorgersi che a scrivere è un moderatore. Su una colonna stretta però diventano cinque figurine prima ancora del nome.'
    },
    {
      gruppo: 'contenuto',
      chiave: 'orario',
      tipo: 'sìno',
      predefinito: false,
      etichetta: 'Mostra l’ora del messaggio',
      aiuto: 'In diretta non serve — il messaggio si vede arrivare — ma se registro la sessione e poi la taglio in clip, avere l’ora stampata dentro al video fa risparmiare mezz’ora di ricerca a scorrimento.'
    },

    {
      gruppo: 'rilievo',
      chiave: 'menzioni',
      tipo: 'sìno',
      predefinito: true,
      etichetta: 'Evidenzia chi mi nomina',
      aiuto: 'Quando qualcuno scrive @slayer_beard il messaggio si accende in ciano. È la cosa che più facilmente si perde in una chat che scorre, ed è anche l’unica a cui bisogna per forza rispondere: tenerla spenta è il modo migliore per sembrare uno che ignora la gente.'
    },
    {
      gruppo: 'rilievo',
      chiave: 'parole',
      tipo: 'testo',
      predefinito: '',
      lista: true,
      etichetta: 'Parole che accendono un messaggio',
      aiuto: 'Separate da virgola. Ci metto quello a cui voglio rispondere anche mentre gioco: il nome del boss su cui sono bloccato, «spoiler», il mio nome scritto storto da chi non sa scriverlo. Quando una compare la riga si accende, e la vedo con la coda dell’occhio senza staccarmi dal gioco.'
    },
    {
      gruppo: 'rilievo',
      chiave: 'primo',
      tipo: 'sìno',
      predefinito: true,
      etichetta: 'Evidenzia il primo messaggio',
      aiuto: 'La primissima volta che una persona scrive nel canale. Sono i pochi secondi in cui la si può salutare per nome: se passano, quella non scrive più e non torna. Vale da sola tutto il resto della sezione.'
    },
    {
      gruppo: 'rilievo',
      chiave: 'eventi',
      tipo: 'sìno',
      predefinito: true,
      etichetta: 'Abbonamenti, raid e bits come schede',
      aiuto: 'Diventano riquadri grandi invece che righe come tutte le altre. Se in OBS ho già una sorgente di alert dedicata li spengo qui, altrimenti la stessa notizia arriva due volte a mezzo secondo di distanza e sembra un difetto dell’overlay.'
    },
    {
      gruppo: 'rilievo',
      chiave: 'treno',
      tipo: 'sìno',
      predefinito: true,
      etichetta: 'Hype train, con la barra',
      aiuto: 'Una fascia in cima che avvisa quando un treno sta per partire e poi mostra livello, punti e quanto manca. L’hype train non passa dalla chat: questo è l’unico pezzo del pollaio che va a chiederlo a una sorgente sua, e se quella un giorno smette di rispondere la fascia sparisce da sola senza portarsi dietro nient’altro.'
    },

    {
      gruppo: 'moderazione',
      chiave: 'bot',
      tipo: 'testo',
      predefinito: 'nightbot,streamelements,streamlabs,moobot,fossabot,sery_bot,wizebot,own3d',
      lista: true,
      etichetta: 'Nick da nascondere',
      aiuto: 'I bot che parlano in chat, separati da virgola. Le loro risposte le legge già chi le ha chieste, nella chat vera: in overlay sono solo righe di servizio che spingono fuori i messaggi delle persone. Qui dentro finisce anche il bot che annuncia i titoli, se ne ho uno.'
    },
    {
      gruppo: 'moderazione',
      chiave: 'comandi',
      tipo: 'sìno',
      predefinito: true,
      etichetta: 'Nascondi i messaggi che iniziano per !',
      aiuto: 'Un «!social» è una richiesta a un bot, non una conversazione. Nasconderli lascia in overlay soltanto quello che la gente si dice davvero, ed è metà del lavoro per far sembrare la chat più viva di quanto sia.'
    },
    {
      gruppo: 'moderazione',
      chiave: 'moderazione',
      tipo: 'voce',
      predefinito: 'sbarra',
      voci: [
        { valore: 'sbarra', etichetta: 'Lo sbarro' },
        { valore: 'togli', etichetta: 'Lo tolgo' },
        { valore: 'tieni', etichetta: 'Lo lascio' }
      ],
      etichetta: 'Un messaggio cancellato dai mod',
      aiuto: '«Lo sbarro» lo tiene in pagina barrato: si capisce che è successo qualcosa e che qualcuno è intervenuto. «Lo tolgo» lo fa sparire, ed è quello che voglio se sto registrando. «Lo lascio» non fa niente: il messaggio che un moderatore ha appena cancellato resta in diretta, cioè esattamente ciò che il moderatore voleva evitare.'
    }
  ];

  const PREDEFINITE = {};

  (function costruisciPredefinite() {
    let i;
    for (i = 0; i < SCHEMA.length; i += 1) {
      PREDEFINITE[SCHEMA[i].chiave] = SCHEMA[i].predefinito;
    }
  }());

  function ritagliaNumero(voce, grezzo) {

    if (voce.sinonimi) {
      const parola = String(grezzo).trim().toLowerCase();
      if (Object.prototype.hasOwnProperty.call(voce.sinonimi, parola)) {
        grezzo = voce.sinonimi[parola];
      }
    }

    const n = parseFloat(grezzo);
    if (!isFinite(n)) { return voce.predefinito; }

    const intero = Math.round(n);
    if (intero < voce.min) { return voce.min; }
    if (intero > voce.max) { return voce.max; }
    return intero;
  }

  function leggiSino(grezzo) {
    const s = String(grezzo).trim().toLowerCase();

    if (s === '') { return true; }

    return s === '1' || s === 'true' || s === 'si' || s === 'sì' || s === 'on';
  }

  function ripulisciTesto(voce, grezzo) {
    let s = String(grezzo).replace(/\s+/g, ' ').trim();

    if (s.length > LIMITE_TESTO) { s = s.slice(0, LIMITE_TESTO); }

    if (voce.lista) {

      const pezzi = s.toLowerCase().split(',');
      const puliti = [];
      let i;
      let p;
      for (i = 0; i < pezzi.length; i += 1) {
        p = pezzi[i].trim();
        if (p !== '' && puliti.indexOf(p) === -1) { puliti.push(p); }
      }
      return puliti.join(',');
    }

    if (voce.modello) {

      s = s.toLowerCase();
      s = s.split('?')[0];
      if (s.indexOf('/') !== -1) { s = s.slice(s.lastIndexOf('/') + 1); }
      s = s.replace(/^[@#]/, '');

      if (!voce.modello.test(s)) { return voce.predefinito; }
    }

    return s;
  }

  function scegliVoce(voce, grezzo) {
    const s = String(grezzo).trim().toLowerCase();
    let i;
    for (i = 0; i < voce.voci.length; i += 1) {
      if (voce.voci[i].valore === s) { return s; }
    }
    return voce.predefinito;
  }

  function tipizza(voce, grezzo) {
    if (voce.tipo === 'numero') { return ritagliaNumero(voce, grezzo); }
    if (voce.tipo === 'sìno') { return leggiSino(grezzo); }
    if (voce.tipo === 'voce') { return scegliVoce(voce, grezzo); }
    return ripulisciTesto(voce, grezzo);
  }

  function decodifica(pezzo) {
    try {

      return decodeURIComponent(String(pezzo).replace(/\+/g, ' '));
    } catch (err) {

      return String(pezzo);
    }
  }

  function spezzaQuerystring(querystring) {
    const coppie = {};
    let q = querystring == null ? '' : String(querystring);

    if (q.indexOf('#') !== -1) { q = q.slice(0, q.indexOf('#')); }
    if (q.indexOf('?') !== -1) { q = q.slice(q.indexOf('?') + 1); }
    if (q.charAt(0) === '&') { q = q.slice(1); }
    if (q === '') { return coppie; }

    const pezzi = q.split('&');
    let i;
    let taglio;
    let chiave;
    for (i = 0; i < pezzi.length; i += 1) {
      if (pezzi[i] === '') { continue; }

      taglio = pezzi[i].indexOf('=');
      if (taglio === -1) {

        chiave = decodifica(pezzi[i]);
        coppie[chiave] = '';
      } else {
        chiave = decodifica(pezzi[i].slice(0, taglio));
        coppie[chiave] = decodifica(pezzi[i].slice(taglio + 1));
      }
    }

    return coppie;
  }

  function leggi(querystring) {
    const coppie = spezzaQuerystring(querystring);
    const fuori = {};
    let i;
    let voce;

    for (i = 0; i < SCHEMA.length; i += 1) {
      voce = SCHEMA[i];
      if (Object.prototype.hasOwnProperty.call(coppie, voce.chiave)) {
        fuori[voce.chiave] = tipizza(voce, coppie[voce.chiave]);
      } else {
        fuori[voce.chiave] = voce.predefinito;
      }
    }

    return fuori;
  }

  function scriviValore(voce, valore) {
    if (voce.tipo === 'sìno') { return valore ? '1' : '0'; }
    if (voce.tipo === 'numero') { return String(valore); }

    return encodeURIComponent(String(valore)).replace(/%2C/g, ',');
  }

  function indirizzo(valori, base) {
    const dati = valori || {};
    const partenza = base == null ? BASE : String(base);
    const pezzi = [];
    let i;
    let voce;
    let valore;

    for (i = 0; i < SCHEMA.length; i += 1) {
      voce = SCHEMA[i];

      if (voce.nascosta) { continue; }

      if (!Object.prototype.hasOwnProperty.call(dati, voce.chiave)) { continue; }

      valore = tipizza(voce, dati[voce.chiave]);
      if (valore === voce.predefinito) { continue; }

      pezzi.push(voce.chiave + '=' + scriviValore(voce, valore));
    }

    if (pezzi.length === 0) { return partenza; }
    return partenza + '?' + pezzi.join('&');
  }

  const valori = leggi(typeof location !== 'undefined' ? location.search : '');

  window.Impostazioni = {
    SCHEMA: SCHEMA,
    PREDEFINITE: PREDEFINITE,
    valori: valori,
    leggi: leggi,
    indirizzo: indirizzo
  };
}());
