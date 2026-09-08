/* =====================================================================
   prova.js — «il pollaio» · il traffico finto della modalità prova

   POSSIEDE: window.Prova, cioè un canale che parla da solo. Fabbrica
   oggetti «messaggio» identici a quelli della chat vera (CONTRATTO §5) e
   li consegna a chi lo ha avviato. Finisce qui.

   NON POSSIEDE la pagina: dentro questo file non si crea un nodo, non si
   scrive una classe, non si tocca un pixel. La spia «PROVA» del §13 è
   markup di pollaio.html e stile di pollaio.css — se la disegnasse la
   prova, spegnere la prova lascerebbe sporcizia in pagina.
   NON POSSIEDE la rete: prova.js non chiama nessuno. Le emote e i badge
   veri li hanno già scaricati Emote e Badge per conto loro; qui si va a
   chiedere quello che hanno, e se non hanno ancora niente si esce senza,
   che va benissimo (§1.9).
   NON POSSIEDE il rilievo né gli eventi: quelli li scrivono Rilievo ed
   Eventi. Qui si preparano solo i tag finti da dargli in pasto.

   PERCHÉ ESISTE. Un overlay si sistema quando il canale è spento: si apre
   OBS di pomeriggio, si trascina il riquadro, si decide la larghezza e la
   scala. Senza traffico finto l'unico modo di inquadrare il pollaio
   sarebbe regolarlo in diretta mentre la gente scrive, cioè mai. Per
   questo la prova non è un test sintetico ma un'imitazione: venti persone
   con nome, colore e ruolo stabili, frasi italiane vere, e un ritmo che
   ogni tanto si strozza in una raffica. Se si vedesse che è finta non
   servirebbe a niente, perché i problemi che deve far venire fuori — il
   testo lungo che va a capo, due nick che si somigliano troppo, la scheda
   del raid che sfora la colonna, l'emote che non si vede — saltano fuori
   solo col traffico vero.

   TRE COSE VALGONO PER TUTTO IL FILE

   1. La casualità passa tutta da `pesca()` (blocco 2): è l'unico punto
      con un Math.random. Le probabilità si scrivono ripetendo le voci
      dentro l'elenco, così si leggono a occhio invece di nascondersi
      dentro un confronto con un numero.
   2. Ogni attesa nasce da `fra()` e il suo timer finisce nell'elenco
      `timer`. `ferma()` li spegne tutti: una prova che continua a
      sussurrare dopo lo stop infilerebbe messaggi inventati dentro la
      chat vera, ed è il modo migliore per far dire una bugia in diretta.
   3. Gli oggetti `evento` e `rilievo` non si scrivono a mano: si chiedono
      a Eventi e a Rilievo passando i tag finti, esattamente come farebbe
      irc.js con quelli veri. Se domani cambia la tabella del §11, la
      prova la segue da sola senza che nessuno se lo ricordi.

   INDICE
   1.  Costanti e stato
   2.  La casualità, i timer, gli aiuti minuti
   3.  La tavolozza dei nick
   4.  Le persone del pollaio
   5.  Le frasi
   6.  Il corpo del messaggio: i pezzi
   7.  La moneta unica: l'oggetto messaggio del §5
   8.  Gli eventi e la moderazione
   9.  I casi rari, quelli che devono vedersi
   9-bis. Il traffico ostile — impostazione `ostile`
   10. Il copione dei primi dieci secondi
   11. Il ritmo: calma e raffiche
   12. API pubblica
   ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. Costanti e stato
     ------------------------------------------------------------------
     Le pause sono elenchi e non intervalli min/max perché la casualità
     passa solo da `pesca()`: un elenco di valori possibili si pesca, un
     intervallo no. In cambio si legge meglio — qui sotto si vede a occhio
     che la chat calma respira fra i tre e i sei secondi, e che una
     raffica sta dentro i due secondi scarsi.
     ------------------------------------------------------------------ */
  const CANALE_RIPIEGO = 'slayer_beard';
  const ID_CANALE_RIPIEGO = '47738247';   // §6: l'id numerico di slayer_beard

  const TINTE = 16;          // quante --nick-N ci sono in tokens.css (§13)
  const MAX_NOME = 25;       // §5: un display-name più lungo non esiste
  const RICORDO = 12;        // messaggi tenuti da parte per risposte e CLEARMSG
  const SUBITO = 120;        // il primo messaggio: il §13 vive o muore qui
  const DOPO_COPIONE = 900;  // respiro fra la rassegna e il traffico normale
  const RITMO_MIN = 0.1;
  const RITMO_MAX = 20;

  const PAUSE_CALME = [3000, 3400, 3800, 4300, 4800, 5200, 5600, 6000];
  const PAUSE_RAFFICA = [180, 240, 300, 360, 420];
  const PAUSE_DOPO_RAFFICA = [3800, 4600, 5400, 6200];
  const LUNGHEZZA_RAFFICA = [5, 6, 7, 8];

  // Probabilità scritte come sacchetti di gettoni: una scintilla ogni sei
  // battiti calmi accende una raffica, un caso raro ogni sette.
  const SCINTILLA = ['no', 'no', 'no', 'no', 'no', 'sì'];
  const QUANDO_RARO = ['no', 'no', 'no', 'no', 'no', 'no', 'sì'];

  // Che genere di messaggio scrive la gente quando non sta succedendo
  // niente di speciale. Le ripetizioni sono il peso: sei battiti su
  // tredici sono frasi normali, uno solo porta un link.
  const GENERI = [
    'normale', 'normale', 'normale', 'normale', 'normale', 'normale',
    'emote', 'emote', 'lungo', 'risposta', 'menzione', 'azione', 'link'
  ];

  /* Da quale chat arriva un messaggio finto. Le ripetizioni sono il peso:
     Twitch resta la maggioranza, come sarà dal vivo, ma le altre passano
     abbastanza spesso da poter regolare la targhetta guardandola.

     In prova si mescolano SEMPRE tutte e quattro, anche quelle che non hai
     ancora collegato. È voluto: la modalità prova serve a sistemare
     l'overlay prima che serva, e una targhetta la si regola solo se la si
     vede. Dal vivo invece la targhetta compare solo per le chat davvero
     accese — è resa.js a deciderlo, guardando `multi`. */
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
  let su = null;          // l'ascoltatore: gli si consegna un messaggio per volta
  let ritmo = 1;
  let ostile = false;     // impostazione `ostile`: mescola i casi cattivi (9-bis)
  let canale = CANALE_RIPIEGO;
  let idCanale = ID_CANALE_RIPIEGO;
  let raffica = 0;        // quanti messaggi mancano alla fine della raffica in corso
  let contatore = 0;      // per gli id: contati, non estratti, così non collidono mai

  const timer = [];       // ogni setTimeout vivo, per `ferma()`
  const recenti = [];     // {id, nick, nome, testo} — servono a rispondere e a cancellare

  /* ------------------------------------------------------------------
     2. La casualità, i timer, gli aiuti minuti
     ------------------------------------------------------------------ */

  // L'unico Math.random del file. Come nel sito evita di ripetere due
  // volte di fila la stessa voce, ma la memoria sta sull'elenco invece
  // che in una variabile sola: qui si pescano frasi, persone e pause in
  // mezzo agli stessi battiti, e una memoria condivisa non impedirebbe
  // mai niente (una pausa non è mai uguale a una frase, quindi il
  // confronto passerebbe sempre e l'anti-ripetizione non varrebbe nulla).
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

  // Un sì/no pescato da un sacchetto di gettoni: `forse(SCINTILLA)`.
  function forse(sacchetto) {
    return pesca(sacchetto) === 'sì';
  }

  // Ogni attesa passa di qui, e ogni timer si registra: `ferma()` non ha
  // bisogno di sapere quanti sono né chi li ha creati. Il timer si toglie
  // dall'elenco appena scatta, altrimenti dopo dieci minuti di prova
  // l'elenco sarebbe lungo mille e clearTimeout girerebbe a vuoto.
  // `esatto` salta la moltiplicazione del ritmo: serve solo al primo
  // messaggio, che deve comparire subito anche con `ritmo=0.1`.
  function fra(ritardo, azione, esatto) {
    const attesa = esatto ? ritardo : Math.max(0, Math.round(ritardo / ritmo));
    const chiave = setTimeout(function () {
      const posto = timer.indexOf(chiave);
      if (posto >= 0) { timer.splice(posto, 1); }
      if (!acceso) { return; }
      try {
        azione();
      } catch (err) {
        // Un inciampo della prova non deve portarsi via il widget: al
        // massimo si perde un messaggio finto (§1.9, §7).
        console.warn('[pollaio] prova: un battito è saltato:', err);
      }
    }, attesa);
    timer.push(chiave);
    return chiave;
  }

  // Chiama `modulo[nome]` provando le firme in ordine, dalla più completa
  // alla più essenziale, e tiene la prima risposta che somiglia a quello
  // che il contratto promette. Serve perché prova.js consuma quattro
  // moduli (Badge, Emote, Eventi, Rilievo) che possono non essere ancora
  // caricati, non essere pronti, o rispondere a vuoto: in nessuno di
  // questi casi la prova deve fermarsi, e in nessun caso deve inventarsi
  // il risultato al posto loro.
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

  // Contati, non estratti: due messaggi non possono avere lo stesso id, e
  // CLEARMSG deve poter puntare a un id che esiste davvero.
  function nuovoId() {
    contatore += 1;
    return 'prova-' + contatore;
  }

  function numero(valore, ripiego) {
    const n = parseFloat(valore);
    return (isFinite(n) && n > 0) ? n : ripiego;
  }

  /* ------------------------------------------------------------------
     3. La tavolozza dei nick
     ------------------------------------------------------------------
     Il §5 vuole `colore` già in forma '#rrggbb', quindi la prova deve
     darne uno. Le sedici tinte però stanno in tokens.css (§13) e il §1.5
     dice che gli esadecimali non si scrivono da nessun'altra parte: si
     leggono da lì con getComputedStyle, una volta sola all'avvio.

     L'alternativa scartata era copiare qui i sedici valori: due tavolozze
     che si allontanano appena qualcuno ritocca una tinta, e una prova che
     mostrerebbe colori che il pollaio vero non usa più — cioè esattamente
     il contrario di quello che serve a chi sta regolando l'overlay.

     Non si tocca il DOM: si legge una variabile CSS già in pagina. Se il
     foglio non c'è (prova.js caricato da solo), la tavolozza resta vuota
     e `colore` esce '': è il caso che il §9 prevede — colore mancante,
     chi disegna ne assegna uno stabile dal nick. Si degrada, non si rompe.
     ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------
     4. Le persone del pollaio
     ------------------------------------------------------------------
     Venti nomi più un bot, con ruolo, badge e tinta fissi per tutta la
     sessione. La stabilità è il punto: se il colore cambiasse a ogni
     messaggio non si potrebbe rispondere alla domanda per cui la prova
     esiste — «due nick di fila si distinguono?».

     Il `peso` è quante volte la persona finisce nel sacchetto: una chat
     da venticinque spettatori non ha venticinque persone che scrivono
     allo stesso modo, ne ha quattro o cinque che parlano e le altre che
     guardano. Un traffico uniforme si riconosce subito come finto.

     Il `badge-info` porta il numero vero di mesi (quello che finisce nel
     titolo del badge), `badges` porta la versione del distintivo: su
     Twitch sono due tag diversi e Badge li vuole tutti e due.
     ------------------------------------------------------------------ */
  function scheda(nome, tinta, peso, badges, badgeInfo, ruoli) {
    const r = ruoli || {};
    return {
      nome: nome.slice(0, MAX_NOME),
      nick: nome.toLowerCase(),
      id: '',                 // lo assegna il giro qui sotto
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

    // Il bot serve a una cosa sola: verificare che l'impostazione `bot`
    // lo nasconda davvero. Peso 1, così col filtro acceso la sua assenza
    // non lascia buchi visibili, e col filtro spento si vede comparire.
    scheda('sery_bot',      13, 1, 'moderator/1',                 '',              { mod: true, bot: true })
  ];

  // Id finti ma stabili. Il capo tiene quello vero del canale (§6): è
  // l'unico id di questo file che corrisponde a qualcuno.
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

  // Chi può abbonarsi, regalare o fare un raid: non il capo (non si
  // abbona a sé stesso) e non il bot (non ha la carta di credito).
  /* Chi può abbonarsi, regalare o fare un raid: non il capo (non si abbona a
     sé stesso), non il bot (non ha la carta di credito), e — da quando la
     chat ne raccoglie più d'una — nemmeno chi scrive da fuori Twitch.

     Quest'ultimo pezzo chiude un difetto sottile. Se un raid finisse addosso
     a una persona che il resto del tempo scrive da YouTube, quella persona
     cambierebbe targhetta da un messaggio all'altro: prima Twitch per la
     scheda del raid, poi YouTube per la frase dopo. La provenienza è una
     proprietà della persona, non del singolo messaggio, e deve restare
     ferma anche quando è la prova a inventarsela. */
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

    /* Il ripiego non è SPETTATORI[0] a scatola chiusa: quello potrebbe
       essere una persona di YouTube, e si tornerebbe da capo. Si cerca il
       primo che vada davvero bene, e solo se non ne esistesse nessuno si
       ripiega sul primo qualunque — che a quel punto è meglio di niente. */
    for (let i = 0; i < SPETTATORI.length; i++) {
      if (spettatoreBuono(SPETTATORI[i])) { return SPETTATORI[i]; }
    }
    return SPETTATORI[0];
  }

  // Copia e non riferimento: il messaggio esce di qui e va in mano ad
  // altri. Se qualcuno gli scrivesse dentro un ruolo, se lo terrebbe per
  // tutta la sessione e quella persona cambierebbe faccia a metà prova.
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

  /* ------------------------------------------------------------------
     5. Le frasi
     ------------------------------------------------------------------
     Italiano di chat: corto, senza punteggiatura, sgrammaticato dove lo è
     davvero. Non sono frasi di riempimento — se si leggessero come
     «messaggio di prova 1, messaggio di prova 2» l'occhio smetterebbe di
     leggerle, e chi non legge non si accorge che la colonna è stretta.

     I nomi di emote (KEKW, monkaS, catJAM...) restano testo se il set 7TV
     del canale non li ha: nessun danno, si vede la parola. È il motivo
     per cui vale la pena metterceli — accendere la prova è il modo di
     controllare quali emote si vedono davvero prima di andare in onda.
     ------------------------------------------------------------------ */
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

  // Alcune tutte emote, alcune emote più due parole: sono i due casi che
  // si disegnano in modo diverso e vanno visti tutti e due.
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

  // Servono a una cosa sola: guardare come va a capo il testo e se la
  // colonna regge. Nessuno le legge, tutti le vedono.
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

  // Il bot non parla come le persone: se dicesse «ahahahah» si vedrebbe
  // subito che l'elenco delle frasi è uno solo per tutti.
  const FRASI_BOT = [
    'la diretta è iniziata da 42 minuti',
    'ricordati di bere, ci vuole poco',
    'comandi disponibili: !social !pc !gioco'
  ];

  function frasiPer(persona) {
    return persona.ruoli.bot ? FRASI_BOT : FRASI;
  }

  /* ------------------------------------------------------------------
     6. Il corpo del messaggio: i pezzi
     ------------------------------------------------------------------
     Chi spezzetta il corpo è Emote (§4): sa quali emote ha il canale su
     7TV, BTTV e FFZ, e riconosce link e menzioni. La prova gli passa il
     testo e basta — così in prova compaiono le emote VERE di slayer_beard,
     che è poi il modo di scoprire prima della diretta che l'emote usata
     tutte le sere non si vede.

     Il tag `emotes` resta vuoto di proposito: fabbricare id di emote
     Twitch validi vorrebbe dire copiare qui una tabella di numeri che
     invecchia da sola e che il giorno che sbaglia mostra l'immagine di
     un'altra emote. Le emote della prova sono quelle dei provider, punto.

     Se Emote non c'è (o non ha ancora scaricato niente) si ripiega su
     `pezziSemplici`, che non ha bisogno di nessun catalogo: link e
     menzioni si riconoscono dal testo, il resto è testo. Meglio una chat
     senza emote di una prova che non parte.
     ------------------------------------------------------------------ */
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
        // §1.4: negli attributi ci va solo https. Qui il testo è roba
        // nostra, ma la regola vale lo stesso — un overlay che prova a
        // caricare http da una pagina https non carica proprio niente.
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

  // Il corpo ridotto a una riga sola: serve alla citazione delle risposte
  // (§5, `risposta.testo`), che su Twitch è testo piatto anche quando il
  // messaggio citato era pieno di emote.
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

  /* ------------------------------------------------------------------
     7. La moneta unica: l'oggetto messaggio del §5
     ------------------------------------------------------------------
     Tutto quello che esce da qui ha esattamente la forma del §5, campo
     per campo, compresi quelli che restano vuoti. Chi riceve non deve
     poter distinguere un messaggio della prova da uno vero: se dovesse
     chiedersi «e se fosse finto?» la prova avrebbe già fallito.
     ------------------------------------------------------------------ */

  // I tag come li manderebbe Twitch. Da qui passano tutti i moduli che
  // leggono i tag (Badge, Eventi, Rilievo), così la prova li interroga
  // nella stessa lingua di irc.js invece che con oggetti su misura.
  function tagFinti(persona, extra) {
    const tags = {
      'id': nuovoId(),
      'badges': persona.badges,
      'badge-info': persona.badgeInfo,
      'color': '',              // il colore lo mette il blocco 3, dalla tavolozza
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

  // I badge veri del canale, dal catalogo di Badge. Si richiedono a ogni
  // messaggio e non una volta sola all'avvio: il catalogo arriva dalla
  // rete e nei primi secondi della prova quasi certamente non c'è ancora,
  // quindi i primi messaggi escono spogli e quelli dopo, da soli, coi
  // distintivi. È il comportamento giusto — nessuno vuole ricaricare la
  // pagina per vedere comparire i badge.
  function badgeDi(tags) {
    if (!tags.badges) { return []; }

    const veri = chiedi(window.Badge, 'leggi', [[tags.badges, tags['badge-info']], [tags]], function (esito) {
      return Array.isArray(esito) && esito.length > 0 && !!esito[0] && typeof esito[0].chiave === 'string';
    });
    return veri || [];
  }

  // Il rilievo lo decide Rilievo (§10), non la prova: qui si preparano
  // solo gli ingredienti — i bits, la menzione, il primo messaggio, il
  // msg-id del riscatto punti — e si lascia che sia lui a dire quale
  // livello vince. Se rispondesse la prova, il giorno che cambia la
  // tabella del §10 la prova mostrerebbe tinte che il widget non usa più.
  function rilievoDi(messaggio, tags) {
    return chiedi(window.Rilievo, 'valuta', [[messaggio], [messaggio, tags]], function (esito) {
      return !!esito && typeof esito.livello === 'number';
    });
  }

  /* Stabile: dallo stesso nick esce sempre la stessa piattaforma, anche fra
     un avvio e l'altro. Non serve una funzione di dispersione vera — serve
     che non cambi — quindi si sommano i codici delle lettere, come fa la
     tavolozza dei nick al blocco 3. Nota che NON passa da pesca(): non è
     casualità, è una proprietà della persona. */
  function piattaformaDi(persona) {
    const nick = String((persona && persona.nick) || '');
    let somma = 0;
    for (let i = 0; i < nick.length; i++) { somma += nick.charCodeAt(i); }
    return PIATTAFORME[somma % PIATTAFORME.length];
  }

  /* Certe cose esistono SOLO su Twitch: i raid, i bits, il riscatto coi punti
     canale, il primo messaggio di sempre, il bentornato. Se il traffico finto
     le mettesse in bocca a una persona pescata come «YouTube», l'anteprima
     mostrerebbe una scheda «Raid in arrivo» sotto una targhetta di una
     piattaforma che i raid non ce li ha.

     Quindi chi porta un ingrediente di Twitch È di Twitch. Non è una toppa
     sull'aspetto: è che quel messaggio, così com'è fatto, da un'altra parte
     non potrebbe proprio nascere. */
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

      /* I BADGE SOLO A CHI SCRIVE DA TWITCH, e questa riga nasce da un
         difetto vero visto nell'anteprima: sopra una targhetta «YouTube»
         compariva la spada da moderatore di Twitch. I badge che il pollaio
         sa disegnare vengono dal catalogo di Twitch — sono le sue immagini,
         le sue chiavi, le sue versioni — e su un'altra piattaforma non
         vogliono dire niente.

         Il RUOLO invece resta: un moderatore di YouTube è un moderatore, e
         il bordo e il colore del nome glieli si dà lo stesso. Quello che
         non si può fare è prestargli il distintivo di un'altra casa. */
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

      /* La piattaforma segue la PERSONA e non il singolo messaggio: chi
         scrive da YouTube scrive sempre da YouTube. Pescarla a ogni riga
         farebbe cambiare provenienza alla stessa faccia da un messaggio
         all'altro, e la targhetta smetterebbe di voler dire qualcosa.
         L'eccezione la decide quiSiParlaTwitch() qui sopra. */
      piattaforma: piattaforma,

      /* Senza questo il riscatto punti canale non si accendeva MAI in
         prova: rilievo.js cerca il msg-id qui, e la prova lo metteva solo
         nei tag finti. Il copione annunciava un livello 3 che non arrivava. */
      msgId: tags['msg-id'] || ''
    };
    messaggio.rilievo = rilievoDi(messaggio, tags);
    return messaggio;
  }

  function ricorda(messaggio) {
    // Solo i messaggi delle persone: a una scheda di raid non si risponde
    // e non si cancella.
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

  /* ---- i messaggi normali, quelli che fanno il traffico ---- */

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

  // Il /me: su IRC è un PRIVMSG col corpo dentro \x01ACTION...\x01 (§8),
  // ma quella scorza la toglie irc.js. Qui il messaggio arriva già
  // srotolato: tipo 'azione' e il corpo pulito.
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

  /* ------------------------------------------------------------------
     8. Gli eventi e la moderazione
     ------------------------------------------------------------------
     Nessun oggetto `evento` si scrive qui dentro. Si preparano i tag che
     manderebbe Twitch e si chiede a Eventi (§11) di leggerli: se domani
     cambia un titolo, una tinta o un genere, la prova cambia con lui e
     nessuno deve ricordarsi di venire a correggere questo file. È anche
     un modo di collaudare Eventi — se una riga della tabella è sbagliata
     si vede in prova, che è il posto giusto, invece che in diretta.

     Se Eventi non c'è, o non conosce quel msg-id, la scheda non si
     inventa: quel battito diventa un messaggio normale (blocchi 10 e 11).
     ------------------------------------------------------------------ */
  function chiediEvento(comando, tags, corpo) {
    /* CLEARCHAT e CLEARMSG NON passano da Eventi.leggi: quella funzione legge
       gli USERNOTICE, e un provvedimento di moderazione non ha né `msg-id` né
       `system-msg`. Chiamandola si otteneva sempre `null`, quindi in modalità
       prova una pausa o una cancellazione non si vedevano MAI — e il §13
       promette proprio «un ban» fra le cose da mostrare.

       La funzione giusta è Eventi.moderazione, che vuole la coda grezza del
       protocollo: «#canale :bersaglio». */
    if (comando === 'CLEARCHAT' || comando === 'CLEARMSG') {
      return chiedi(window.Eventi, 'moderazione',
        [[comando, tags, '#' + canale + ' :' + (corpo || '')]],
        function (esito) { return !!esito && typeof esito.genere === 'string'; });
    }

    return chiedi(window.Eventi, 'leggi', [[comando, tags, corpo], [tags, corpo], [tags]], function (esito) {
      return !!esito && typeof esito.genere === 'string';
    });
  }

  // Un messaggio la cui ragione d'essere è la scheda: abbonamenti, raid,
  // annunci. Tipo 'evento'. Il testo, quando c'è (il riabbonamento,
  // l'annuncio), sta comunque nei pezzi: chi disegna lo mette sotto la
  // scheda, come fa Twitch.
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

  // L'annuncio è l'unico evento che parla per forza con la voce del capo:
  // è il messaggio che lo streamer manda con /announce.
  function annuncio() {
    return conScheda(CAPO, pesca(FRASI_ANNUNCIO), 'USERNOTICE', {
      'msg-id': 'announcement',
      'msg-param-color': 'PURPLE'
    });
  }

  // Moderazione: tipo 'sistema' e non 'evento', perché non è una scheda
  // da festeggiare — è una riga di servizio che dice cos'è successo a una
  // persona o a un messaggio (§5, §11).
  function pausa() {
    const persona = pescaSpettatore();
    return conScheda(persona, '', 'CLEARCHAT', {
      'ban-duration': String(pesca(DURATE_PAUSA)),
      'target-user-id': persona.id
    }, persona.nick, 'sistema');
  }

  function cancella() {
    // Serve un messaggio che esista davvero: cancellarne uno inventato
    // non farebbe vedere niente, ed è proprio la sbarra sul messaggio
    // già in pagina la cosa da guardare (§6, impostazione `moderazione`).
    const bersaglio = pesca(recenti);
    if (!bersaglio) { return null; }

    const persona = PERSONE.filter(function (p) { return p.nick === bersaglio.nick; })[0];
    if (!persona) { return null; }

    return conScheda(persona, '', 'CLEARMSG', {
      'login': bersaglio.nick,
      'target-msg-id': bersaglio.id
    }, bersaglio.testo, 'sistema');
  }

  /* ------------------------------------------------------------------
     9. I casi rari, quelli che devono vedersi
     ------------------------------------------------------------------
     Bits, riscatti, primi messaggi: non passano da Eventi (non sono
     USERNOTICE) ma da tag su un messaggio normale. È Rilievo a decidere
     che livello meritano — qui si mette solo l'ingrediente in tavola.
     ------------------------------------------------------------------ */
  function bits(quanti) {
    // Il testo si scrive come lo scrive la gente: «Cheer100 tieni duro».
    // Il token lo trasforma in cheermote Emote, se è pronto; se non lo è
    // resta la parola, ma il campo `bits` c'è comunque e il rilievo si
    // accende lo stesso. Il caso peggiore è brutto, non rotto.
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

  // Riscatto punti canale: §10, livello 3.
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

  // Il sacchetto dei casi rari si svuota e si riempie: così si vedono
  // tutti, in ordine sparso, senza che la sorte ne dimentichi uno per
  // dieci minuti — che in una prova vuol dire non vederlo mai.
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

  /* ------------------------------------------------------------------
     9-bis. Il traffico ostile — impostazione `ostile`
     ------------------------------------------------------------------
     Il traffico normale è CREDIBILE, ed è la cosa giusta per inquadrare
     l'overlay. Ma quello che rompe un overlay non è credibile: è un nick
     di quaranta caratteri senza spazi, una frase con trecento segni
     impilati sopra le lettere, uno scavalco della direzione infilato in
     un nome. Le difese contro queste cose ci sono già — stanno in
     resa.js, che è l'ultimo cancello prima che il testo diventi un nodo
     della pagina — ma finora non c'era modo di GUARDARLE lavorare.

     Questi casi entrano nello stesso sacchetto dei casi rari, quindi
     arrivano mescolati al traffico normale e si vede come stanno accanto
     agli altri messaggi. È il punto: uno zalgo domato bene non si nota,
     e non notarlo è esattamente l'esito che si sta cercando.

     PERCHÉ QUI NON C'È IL BLOCCO DA CENTO REGALI. Sarebbe il caso più
     spettacolare, e sarebbe una bugia: la soppressione dei regali in
     blocco vive in pollaio.js (daUsernotice, il conto dei
     `msg-param-community-gift-id`), e la prova non passa di lì — i
     messaggi li costruisce da sé. Mostrerebbe cento schede una dietro
     l'altra, cioè una cosa che in diretta non succede, facendo sembrare
     rotto quello che funziona. Un banco che spaventa per finta si smette
     di guardarlo.
     ------------------------------------------------------------------ */

  // Segni combinanti veri, presi dai blocchi che ZALGO di resa.js
  // riconosce. Si impilano SOPRA la lettera precedente e non hanno limite
  // d'altezza: qualche centinaio disegna una colonna di inchiostro alta
  // quanto l'overlay e copre i messaggi vicini.
  /* Si scrivono con le ESCAPE e mai col carattere vero. È la stessa regola
     che pollaio.js dichiara per il carattere di controllo dell'ACTION: un
     sorgente con dentro segni combinanti e scavalchi di direzione è una
     mina per qualunque editor — si incolla male, si confronta peggio, e
     chi lo apre vede una riga che non somiglia a quello che fa. Qui poi
     sarebbe doppiamente beffardo, visto che sono esattamente i caratteri
     da cui il widget si difende.

     Il nome è SEGNI_ZALGO e non SEGNI: quello è già preso al blocco 6, dove
     è la regola dei link e delle menzioni. */
  const SEGNI_ZALGO = '\u0300\u0301\u0302\u0303\u0308\u030a\u0327\u0334\u0348\u035c';

  const SCAVALCO = '\u202e';   // RIGHT-TO-LEFT OVERRIDE
  const ISOLA = '\u2066';      // LEFT-TO-RIGHT ISOLATE

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

  // Copia una persona vera e le cambia il nome: serve perché costruisci()
  // prende nome, nick e colore dalla persona, e un nome ostile deve
  // arrivare da lì come arriverebbe da un display-name vero.
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

  // Lo zalgo nel corpo: quaranta segni per lettera. Domato bene resta una
  // frase leggibile con due accenti di troppo; non domato, l'overlay
  // sparisce sotto l'inchiostro.
  function zalgo() {
    return costruisci(pescaSpettatore(), impila('non riesco a crederci', 40));
  }

  // E nel nome, che è il posto peggiore: il nome sta su una riga sola
  // accanto al badge, e una colonna di segni lì sopra copre i messaggi
  // che stanno sopra invece del proprio.
  function zalgoNelNome() {
    return costruisci(travestito(impila('Tizio', 30)), 'ciao a tutti');
  }

  /* Lo scavalco della direzione. Non è un dettaglio da manuale: infilato
     in un messaggio ribalta tutto il testo che segue, ed è il modo più
     economico che ha un troll per far leggere a qualcun altro una frase
     che nessuno ha scritto. Qui se ne mette uno nel corpo e uno nel nome. */
  function scavalcoDirezione() {
    return costruisci(
      travestito('Tizio' + SCAVALCO + 'oizit'),
      'guardate qui ' + SCAVALCO + 'onaipmac ies non'
    );
  }

  // Quaranta caratteri senza uno spazio. Senza `overflow-wrap: anywhere`
  // allarga la colonna, e in OBS la chat esce dall'inquadratura da un
  // lato — che è il difetto che non si vede finché non è in diretta.
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

  // Solo emote, niente testo. Se il catalogo è pronto sono immagini in
  // fila e si vede se la riga va a capo come deve; se non lo è restano
  // parole, e va bene lo stesso.
  function soloEmote() {
    return costruisci(pescaSpettatore(), 'Kappa Kappa Kappa Kappa Kappa Kappa Kappa Kappa Kappa Kappa Kappa Kappa');
  }

  // Caratteri di controllo e marcatori di isolamento in mezzo alle
  // parole: non si vedono, ma se passassero sballerebbero il disegno
  // della riga senza lasciare traccia di dove sia il problema.
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

  /* ------------------------------------------------------------------
     10. Il copione dei primi dieci secondi
     ------------------------------------------------------------------
     Chi apre la prova sta regolando qualcosa e vuole vedere tutti i casi
     adesso, non fra tre minuti. Nei primi dieci secondi passano in
     rassegna: le emote, il testo lungo, i tre livelli di rilievo, i bits
     piccoli e quelli grossi, il /me, il link e tre schede di evento
     diverse. Poi il copione finisce e comincia il traffico normale del
     blocco 11, che continua a ripescare da solo i casi rimasti.

     Il primo messaggio è a 120ms e non passa dal ritmo: un riquadro vuoto
     per mezzo secondo fa pensare che la prova non sia partita, e la cosa
     che si fa subito dopo è ricaricare la pagina.
     ------------------------------------------------------------------ */
  const COPIONE = [
    [SUBITO, normale],          // c'è vita, subito
    [620,  soloEmote],          // le emote vere del canale
    [1200, lungo],              // il testo che va a capo: la colonna regge?
    [1850, primoMessaggio],     // rilievo 1 — PRIMO MESSAGGIO
    [2500, risposta],           // rilievo 1 — RISPOSTA, con la citazione sopra
    [3150, menzione],           // rilievo 2 — TI HANNO NOMINATO
    [3800, bitsMedi],           // rilievo 2 — BITS, col cheermote da 100
    [4500, abbonamento],        // la prima scheda
    [5150, normale],            // si respira
    [5700, bitsGrossi],         // rilievo 3 — BITS, il cheermote grosso
    [6400, raid],               // la scheda più larga di tutte
    [7100, evidenza],           // rilievo 3 — MESSAGGIO IN EVIDENZA
    [7750, azione],             // il /me
    [8350, annuncio],           // rilievo 3 più scheda, la voce del capo
    [9000, regali],             // il regalo in blocco
    [9600, conLink]             // il link
  ];

  function recita() {
    COPIONE.forEach(function (voce, posto) {
      fra(voce[0], function () {
        // Se la fabbrica non produce (Eventi non pronto, niente da
        // cancellare) il battito non si perde: diventa una frase. Un buco
        // nel copione si leggerebbe come «si è piantata».
        manda(voce[1]() || pescaMessaggio());
      }, posto === 0);
    });

    fra(COPIONE[COPIONE.length - 1][0] + DOPO_COPIONE, battito);
  }

  /* ------------------------------------------------------------------
     11. Il ritmo: calma e raffiche
     ------------------------------------------------------------------
     Una chat vera non è un metronomo. Sta ferma tre, quattro, sei
     secondi, poi succede qualcosa nel gioco e arrivano sei messaggi in
     due secondi. È la raffica il caso che conta: è lì che si scopre che
     i messaggi escono dall'inquadratura, che l'animazione di entrata è
     troppo lenta o che `max` è troppo alto. Una prova a cadenza fissa non
     farebbe vedere niente di tutto questo, e in più si riconoscerebbe
     come finta al terzo messaggio.

     `ritmo` moltiplica la frequenza: `ritmo=3` accorcia tutte le attese a
     un terzo. Serve a riempire la colonna in fretta quando si sta
     scegliendo l'altezza.
     ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------
     12. API pubblica
     ------------------------------------------------------------------
     Tre funzioni e basta. `avvia` è idempotente: chiamata due volte non
     raddoppia il traffico, riparte da capo. Serve alla regia, che rifà
     l'anteprima ogni volta che si tocca un comando.
     ------------------------------------------------------------------ */
  function leggiCanale() {
    const valori = (window.Impostazioni && window.Impostazioni.valori) || null;
    canale = (valori && typeof valori.canale === 'string' && valori.canale)
      ? valori.canale.toLowerCase()
      : CANALE_RIPIEGO;
    idCanale = (valori && valori.id) ? String(valori.id) : ID_CANALE_RIPIEGO;
    // Il capo è il canale: il suo user-id segue l'impostazione, non resta
    // quello di slayer_beard se qualcuno prova con un altro canale.
    CAPO.id = idCanale;
  }

  /* Si rilegge a ogni avvio e non una volta sola: l'anteprima della regia
     ricarica la pagina a ogni manopola girata, ma il launcher e OBS no —
     e l'interruttore va acceso e spento mentre si guarda, altrimenti per
     provarlo bisognerebbe chiudere e riaprire.

     Il sacchetto dei casi si svuota: cambiando l'impostazione a metà
     giro, i casi ostili entrano dal prossimo rifornimento e non da
     subito. Va bene così — svuotarlo a mano vorrebbe dire perdere i casi
     rari normali che non erano ancora usciti. */
  function leggiOstile() {
    const valori = (window.Impostazioni && window.Impostazioni.valori) || null;
    ostile = !!(valori && valori.ostile);
  }

  function ferma() {
    acceso = false;
    while (timer.length) { clearTimeout(timer.pop()); }
    raffica = 0;
    recenti.length = 0;   // gli id di prima non esistono più: non ci si risponde
    su = null;
  }

  window.Prova = {
    // opzioni = { su: function (messaggio) {}, ritmo: 1 }
    avvia: function (opzioni) {
      const opz = opzioni || {};
      // Senza ascoltatore non c'è niente da fare, e non si lascia acceso
      // un generatore che parla nel vuoto (§1.9).
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
