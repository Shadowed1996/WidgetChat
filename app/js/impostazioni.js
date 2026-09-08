/* =====================================================================
   impostazioni.js — «il pollaio» · le manopole, e da dove arrivano

   POSSIEDE: la tabella delle impostazioni del CONTRATTO
   §6 — chiave, tipo, predefinito, limiti — e le parole con cui ogni
   voce si presenta a chi la gira. Sa trasformare una querystring in
   valori del tipo giusto, e sa rifare la strada al contrario.

   NON POSSIEDE: nient'altro. Non tocca il DOM, non conosce la chat,
   non sa cosa sia un'emote, non legge e non scrive localStorage. È il
   primo file che si carica (CONTRATTO §4) e non dipende da nessuno.

   ---------------------------------------------------------------------
   PERCHÉ LE PAROLE STANNO QUI E NON DENTRO regia.html
   ---------------------------------------------------------------------
   `etichetta` e `aiuto` vivono accanto alla voce che descrivono, non
   nella pagina che le mostra. Così aggiungere un'impostazione è UNA
   riga in questo file: la regia costruisce i suoi campi leggendo lo
   SCHEMA e se ne accorge da sola. Il giorno che i campi si scrivono a
   mano nell'HTML, la prima impostazione nuova la si dimentica in un
   posto solo — e il configuratore inizia a mentire.

   ---------------------------------------------------------------------
   DUE FORME, NON UNA: la querystring e i valori
   ---------------------------------------------------------------------
   Nella querystring tutto è testo: `emote=1`. Nei valori tutto è già
   del tipo giusto: `emote: true`. `predefinito` è scritto nella forma
   VALORE (quindi `true`, non `1`), perché è con i valori che si fanno
   i confronti — e il confronto serve a indirizzo(), che scrive solo
   ciò che differisce.

   ---------------------------------------------------------------------
   L'INDIRIZZO CORTO È UN REQUISITO, NON UN'ELEGANZA
   ---------------------------------------------------------------------
   indirizzo() scrive solo le chiavi diverse dal predefinito. Quel
   testo finisce incollato a mano dentro una sorgente browser di OBS,
   spesso ricopiato guardando un altro schermo: ogni parametro inutile
   è un’occasione in più di sbagliare un carattere.

   ---------------------------------------------------------------------
   INDICE
   ---------------------------------------------------------------------
     1. Costanti e limiti
     2. Lo SCHEMA — le voci del CONTRATTO §6
     3. PREDEFINITE — ricavate dallo SCHEMA, mai riscritte a mano
     4. Ripulitura dei tipi — ritagli, filtri, ripieghi
     5. Lettura della querystring
     6. leggi() — dalla querystring ai valori
     7. indirizzo() — dai valori alla querystring, corta
     8. Avvio e API pubblica
   ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. Costanti e limiti
     ------------------------------------------------------------------
     I numeri che ritagliano stanno dentro lo SCHEMA (min/max), e lì
     sono la verità: la regia li rilegge da lì per costruire i cursori.
     Qui restano solo i limiti che non appartengono a una voce sola.
     ------------------------------------------------------------------ */

  // Tetto alla lunghezza dei campi di testo. Non è paranoia: `bot` e
  // `parole` sono elenchi che crescono a ogni diretta, e un indirizzo
  // da quattromila caratteri in OBS non si incolla più — certe versioni
  // del campo lo troncano in silenzio, che è il modo peggiore di
  // perdere una configurazione.
  const LIMITE_TESTO = 400;

  // La pagina che l'indirizzo punta quando non se ne chiede un'altra.
  // È l'overlay, cioè la sorgente browser di OBS.
  const BASE = 'pollaio.html';

  /* ------------------------------------------------------------------
     2. Lo SCHEMA — le voci del CONTRATTO §6
     ------------------------------------------------------------------
     Campi di ogni voce:

       gruppo      dove finisce nella regia: canale · aspetto ·
                   contenuto · rilievo · moderazione
       chiave      il nome nella querystring. Non si cambia MAI: sta
                   dentro agli indirizzi che la gente ha già salvato
                   nella propria scena di OBS.
       tipo        testo · numero · sìno · voce
       predefinito già del tipo giusto (vedi il cappello)
       etichetta   il nome umano, quello scritto sul campo
       aiuto       a cosa serve DAVVERO in OBS. Non ripete l'etichetta:
                   un aiuto che è l'etichetta con più parole tanto vale
                   non scriverlo.
       voci        solo per `voce`: [{valore, etichetta}]
       min/max     solo per `numero`: i limiti del ritaglio
       passo       solo per `numero`: lo scatto del cursore
       unita       solo per `numero`: px, %, s — si stampa accanto
       esatto      solo per `numero`: la regia gli affianca anche una
                   casella numerica, perché col cursore non ci si
                   azzecca (larghezza, max, svanisci)
       lista       solo per `testo`: elenco separato da virgole, da
                   normalizzare
       modello     solo per `testo`: se non passa si torna al
                   predefinito, invece di propagare una cosa rotta
     ------------------------------------------------------------------ */

  const SCHEMA = [

    /* --- canale: chi ascolto, e se ascolto davvero ------------------ */
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
      /* NON si mostra nella regia, e non è una dimenticanza. Questa non è una
         preferenza: è un fatto che riguarda DOVE sta girando la pagina, e lo
         sa solo chi l'ha aperta. Lo aggiunge Pollaio.exe alla querystring
         quando apre la chat nella sua finestra, e accende il menu del tasto
         destro (js/menu.js). Metterlo fra le manopole vorrebbe dire offrire
         a chi configura una Sorgente Browser un interruttore che, acceso lì,
         non farebbe assolutamente niente. */
      nascosta: true,
      etichetta: 'Dentro la finestra del launcher',
      aiuto: 'Lo mette Pollaio.exe da sé: dice alla pagina che sta girando nella sua finestra, quella senza barra del titolo, e accende il menu del tasto destro con Chiudi, Riduci a icona, Sposta e Apri la regia.'
    },

    /* --- chat: le altre piattaforme --------------------------------- */
    {
      gruppo: 'chat',
      chiave: 'kick',
      tipo: 'testo',
      predefinito: '',
      /* Gli slug di Kick sono minuscoli, cifre, trattino e trattino basso.
         Il ripiego di ripulisciTesto accetta anche l'indirizzo intero
         incollato dalla barra del browser: taglia da dopo l'ultima barra. */
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
      /* NIENTE `modello` qui, ed è importante: ripulisciTesto mette in
         minuscolo tutto ciò che ne ha uno, e un id di video YouTube
         distingue maiuscole e minuscole. `dQw4w9WgXcQ` diventerebbe un
         video diverso, o nessuno, e il guasto sarebbe muto. La pulizia la
         fa js/youtube.js, che sa anche estrarre l'id da un indirizzo. */
      etichetta: 'La diretta YouTube',
      aiuto: 'L’indirizzo della diretta, o solo il suo id. Lo prendo da watch?v=…, da youtu.be/… o da live/…: incolla quello che hai. Serve l’id del VIDEO e non del canale, ed è una scelta di risparmio: risalire dal canale alla diretta in onda passerebbe da una chiamata che ha un tetto separato di cento al giorno, e bastano pochi riavvii per finirlo senza capire perché.'
    },
    {
      gruppo: 'chat',
      chiave: 'ytchiave',
      tipo: 'testo',
      predefinito: '',
      /* Anche qui niente `modello`, per la stessa ragione: una chiave
         Google distingue maiuscole e minuscole. */
      etichetta: 'La chiave API di YouTube',
      aiuto: 'Una chiave gratuita creata da te sulla console Google Cloud, con la sola YouTube Data API v3 attiva. Serve perché YouTube, a differenza di Twitch e Kick, non ha nessun modo di leggere una chat senza identificarsi. Due cose da sapere: la chiave finisce nell’indirizzo dell’overlay, quindi è visibile a chi vede il tuo schermo — usane una dedicata, che al massimo si brucia la quota e si rigenera in trenta secondi. E la quota è il vero limite: sono diecimila unità al giorno e coprono una diretta lunga solo se non chiedo troppo spesso, che è quello che faccio.'
    },

    /* --- aspetto: come si presenta sopra al gioco ------------------- */
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
      /* Era una scelta fra tre parole, ed è diventato un cursore: i tre
         gradini non bastavano mai: il salto fra «normale» e «arioso» era
         troppo largo e il punto giusto cadeva sempre in mezzo. Un overlay si
         regola guardandolo, non scegliendo da un elenco.

         I tre nomi di prima restano però leggibili (vedi `sinonimi` e
         ritagliaNumero): gli indirizzi già scritti dentro OBS e i preset
         finiti in localStorage continuano a valere esattamente come prima.
         Cambiare il tipo di una manopola non deve rompere una scena che
         qualcuno ha già montato. */
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
      /* La percentuale è di VELOCITÀ, non di durata: alzandola l'effetto va
         più svelto. È il verso in cui la pensa chi guarda («più veloce»), non
         quello in cui la scrive il CSS («meno millisecondi»), e fra i due
         vince sempre chi tocca la manopola. L'inversione la fa pollaio.js, in
         un punto solo, scrivendo --tempo sulla radice. */
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

    /* --- contenuto: quanta roba tengo, e cosa disegno dentro -------- */
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

    /* --- rilievo: le cose che non voglio perdere mentre gioco ------- */
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

    /* --- moderazione: quello che non deve finire in diretta --------- */
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

  /* ------------------------------------------------------------------
     3. PREDEFINITE — ricavate dallo SCHEMA
     ------------------------------------------------------------------
     Non c'è una seconda tabella scritta a mano con gli stessi valori:
     due tabelle da tenere allineate sono due tabelle che prima o poi si
     scollano, e il giorno che si scollano indirizzo() smette di
     accorciare senza che nessuno riesca a capire perché.
     ------------------------------------------------------------------ */

  const PREDEFINITE = {};

  (function costruisciPredefinite() {
    let i;
    for (i = 0; i < SCHEMA.length; i += 1) {
      PREDEFINITE[SCHEMA[i].chiave] = SCHEMA[i].predefinito;
    }
  }());

  /* ------------------------------------------------------------------
     4. Ripulitura dei tipi — ritagli, filtri, ripieghi
     ------------------------------------------------------------------
     Regola unica, valida per tutte e quattro le funzioni qui sotto:
     un valore che non si capisce NON è un errore, è un predefinito.
     Nessuna eccezione, nessun avviso a schermo, nessuna riga rossa.

     Il motivo è che questi valori arrivano da un indirizzo battuto a
     mano dentro un campo di OBS, spesso ricopiato da un altro schermo.
     Un `scala=9999` sbagliato deve dare il widget più grande
     consentito, non un widget rotto a metà diretta — e nemmeno un
     messaggio di errore stampato sopra al gioco.
     ------------------------------------------------------------------ */

  function ritagliaNumero(voce, grezzo) {
    // I sinonimi si guardano PRIMA di parseFloat, che su una parola darebbe
    // NaN e quindi il predefinito. Servono alle manopole che sono state tre
    // parole prima di diventare un cursore: un `spazio=arioso` scritto mesi fa
    // dentro una sorgente di OBS deve continuare a dare l'arioso di allora,
    // non il predefinito di adesso. hasOwnProperty perché la chiave arriva da
    // un indirizzo battuto a mano e potrebbe valere «constructor».
    if (voce.sinonimi) {
      const parola = String(grezzo).trim().toLowerCase();
      if (Object.prototype.hasOwnProperty.call(voce.sinonimi, parola)) {
        grezzo = voce.sinonimi[parola];
      }
    }

    // parseFloat e non parseInt: chi scrive «120.5» intende 120, non
    // «niente». Il troncamento arriva dopo, con Math.round.
    const n = parseFloat(grezzo);
    if (!isFinite(n)) { return voce.predefinito; }

    const intero = Math.round(n);
    if (intero < voce.min) { return voce.min; }
    if (intero > voce.max) { return voce.max; }
    return intero;
  }

  function leggiSino(grezzo) {
    const s = String(grezzo).trim().toLowerCase();

    // `?prova` senza valore vale «acceso»: è così che si scrivono le
    // bandierine a mano, e chi la batte in quel modo intende accenderla.
    // indirizzo() invece scrive sempre 1 o 0 per esteso, quindi questa
    // forma nasce soltanto dalle dita di qualcuno.
    if (s === '') { return true; }

    return s === '1' || s === 'true' || s === 'si' || s === 'sì' || s === 'on';
  }

  function ripulisciTesto(voce, grezzo) {
    let s = String(grezzo).replace(/\s+/g, ' ').trim();

    if (s.length > LIMITE_TESTO) { s = s.slice(0, LIMITE_TESTO); }

    if (voce.lista) {
      // Un elenco separato da virgole si normalizza sempre allo stesso
      // modo — minuscolo, senza spazi attorno, senza vuoti, senza
      // doppioni — perché «Nightbot, nightbot ,» sono tre voci diverse
      // per un confronto e una sola per chi le ha scritte.
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
      // Comodità vera, non gentilezza: qui dentro si incolla di tutto,
      // dall'indirizzo completo del canale al nome con la chiocciola
      // davanti. Prima di bocciare, provo a capire cosa si intendeva.
      s = s.toLowerCase();
      s = s.split('?')[0];
      if (s.indexOf('/') !== -1) { s = s.slice(s.lastIndexOf('/') + 1); }
      s = s.replace(/^[@#]/, '');

      // Se ancora non passa, il predefinito: meglio la chat del canale
      // giusto che una JOIN su un nome impossibile e un overlay muto
      // che non dice nemmeno perché è muto.
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

  // Lo smistamento sta in una funzione sola perché serve in due punti:
  // a leggi(), sui parametri dell'indirizzo, e a indirizzo(), che deve
  // ritipizzare prima di confrontare (vedi §7).
  function tipizza(voce, grezzo) {
    if (voce.tipo === 'numero') { return ritagliaNumero(voce, grezzo); }
    if (voce.tipo === 'sìno') { return leggiSino(grezzo); }
    if (voce.tipo === 'voce') { return scegliVoce(voce, grezzo); }
    return ripulisciTesto(voce, grezzo);
  }

  /* ------------------------------------------------------------------
     5. Lettura della querystring
     ------------------------------------------------------------------
     A mano, senza URLSearchParams. Non per diffidenza verso l'API — in
     OBS gira un Chromium recente — ma perché qui serve una cosa che
     URLSearchParams non regala: sopravvivere a una percentuale spaiata.

     `decodeURIComponent('%zz')` LANCIA. Un indirizzo battuto a mano
     prima o poi contiene un `%` da solo, e a quel punto l'eccezione non
     fermerebbe il singolo parametro sbagliato: fermerebbe l'esecuzione
     di questo file, cioè l'avvio dell'overlay, in diretta.
     ------------------------------------------------------------------ */

  function decodifica(pezzo) {
    try {
      // Nelle querystring il `+` vale spazio: è la vecchia regola dei
      // form, e la gente incolla ancora indirizzi scritti così.
      return decodeURIComponent(String(pezzo).replace(/\+/g, ' '));
    } catch (err) {
      // Percentuale spaiata: si tiene il testo com'è. Sarà il tipo a
      // ripulirlo, o cadrà sul predefinito. Nessuno se ne accorge.
      return String(pezzo);
    }
  }

  function spezzaQuerystring(querystring) {
    const coppie = {};
    let q = querystring == null ? '' : String(querystring);

    // Si accetta di tutto: 'a=1', '?a=1', un location.href intero, un
    // indirizzo con l'ancora in coda. Chi chiama non deve pensarci.
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
        // `?prova` senza uguale: chiave presente, valore vuoto. Per un
        // `sìno` vuol dire acceso (vedi leggiSino).
        chiave = decodifica(pezzi[i]);
        coppie[chiave] = '';
      } else {
        chiave = decodifica(pezzi[i].slice(0, taglio));
        coppie[chiave] = decodifica(pezzi[i].slice(taglio + 1));
      }
    }

    return coppie;
  }

  /* ------------------------------------------------------------------
     6. leggi() — dalla querystring ai valori
     ------------------------------------------------------------------
     Restituisce SEMPRE un oggetto nuovo e SEMPRE completo: tutte e
     tutte le chiavi, tutte del tipo giusto. Chi lo riceve non
     deve mai chiedersi se una chiave c'è.

     Oggetto nuovo, e non `valori` modificato in loco: la regia ne
     tiene in mano più d'uno per volta (il salvato, quello che arriva
     dal link, quello corrente), e due riferimenti allo stesso oggetto
     sarebbero un bug che si manifesta solo premendo Ripristina — cioè
     nel momento in cui uno si aspetta che tutto torni a posto.
     ------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------
     7. indirizzo() — dai valori alla querystring, corta
     ------------------------------------------------------------------
     Scrive solo ciò che differisce dal predefinito, nell'ordine dello
     SCHEMA. L'ordine fisso non è estetica: due configurazioni uguali
     devono produrre due stringhe uguali, altrimenti la regia non può
     decidere con un confronto se l'anteprima va davvero ricaricata — e
     si ricaricherebbe a ogni pixel di cursore trascinato.

     `base` è un parametro perché serve anche vuoto: la regia salva in
     localStorage la querystring nuda, che ripassata a leggi() torna
     valori validi. Un giro solo, e nessuna convalida scritta due volte.
     ------------------------------------------------------------------ */

  function scriviValore(voce, valore) {
    if (voce.tipo === 'sìno') { return valore ? '1' : '0'; }
    if (voce.tipo === 'numero') { return String(valore); }

    // La virgola è legale in una querystring ed è il separatore degli
    // elenchi: lasciarla in chiaro invece che come %2C toglie una
    // trentina di caratteri di rumore da un indirizzo che va riletto a
    // occhio prima di incollarlo in OBS.
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

      /* Le voci `nascosta` non escono MAI nell'indirizzo, ed è la regola che
         tiene in piedi la loro esistenza. Non sono configurazione: sono fatti
         su dove sta girando la pagina, e li scrive chi la apre.

         Il caso concreto è `finestra`. La regia gira dentro la finestra del
         launcher, quindi ce l'ha addosso; senza questa riga finirebbe
         nell'indirizzo che si copia e si incolla in OBS, e da lì in poi ogni
         Sorgente Browser si porterebbe dietro un parametro che dichiara una
         finestra che non esiste — accendendo un menu del tasto destro che non
         può comandare niente. */
      if (voce.nascosta) { continue; }

      // Chiave assente vuol dire chiave al predefinito. Così indirizzo()
      // accetta anche un oggetto parziale, che è comodo a chi lo
      // costruisce a mano per una prova al volo dalla console.
      if (!Object.prototype.hasOwnProperty.call(dati, voce.chiave)) { continue; }

      // Si ripassa dal tipo prima di confrontare: un `scala: '120'`
      // arrivato come stringa deve valere quanto 120, altrimenti
      // finisce nell'indirizzo anche quando è il predefinito e la
      // promessa dell'indirizzo corto salta.
      valore = tipizza(voce, dati[voce.chiave]);
      if (valore === voce.predefinito) { continue; }

      pezzi.push(voce.chiave + '=' + scriviValore(voce, valore));
    }

    if (pezzi.length === 0) { return partenza; }
    return partenza + '?' + pezzi.join('&');
  }

  /* ------------------------------------------------------------------
     8. Avvio e API pubblica
     ------------------------------------------------------------------
     `valori` si legge subito, mentre il file viene eseguito: chi arriva
     dopo nell'ordine di caricamento (irc, emote, badge, resa, pollaio)
     lo trova già pronto e non deve chiamare niente per sapere quale
     canale seguire.

     Fuori escono cinque cose e basta. In particolare non esce tipizza():
     chi ha un valore sporco da ripulire passa dalla querystring, cioè
     da leggi(), che è l'unica porta e quella che ritaglia tutto.
     ------------------------------------------------------------------ */

  const valori = leggi(typeof location !== 'undefined' ? location.search : '');

  window.Impostazioni = {
    SCHEMA: SCHEMA,
    PREDEFINITE: PREDEFINITE,
    valori: valori,
    leggi: leggi,
    indirizzo: indirizzo
  };
}());
