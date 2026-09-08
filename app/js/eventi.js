/* =====================================================================
   eventi.js — «il pollaio» · window.Eventi

   POSSIEDE una cosa sola: la traduzione in italiano di USERNOTICE,
   CLEARCHAT, CLEARMSG e NOTICE in oggetti che si possono disegnare —
   la tabella del CONTRATTO §11, scritta una volta e tenuta qui.

   NON POSSIEDE il DOM, le emote, i badge, i colori, il disegno. Da qui
   escono soltanto dati; chi disegna li mette in pagina con textContent.
   Non c'è un solo `document.createElement` in tutto il file, e non ci
   deve entrare: il giorno che cambia il tema, questo file non si tocca.

   ---------------------------------------------------------------------
   QUATTRO COSE VALGONO PER TUTTO IL FILE
   ---------------------------------------------------------------------

   1. I valori dei tag arrivano GIÀ decodificati da js/irc.js: le
      sequenze `\s` sono spazi, i `\:` punti e virgola. Qui NON si
      decodifica una seconda volta. Non è pignoleria: decodificando due
      volte, uno che si scrive «a\sb» nel display-name se lo vedrebbe
      diventare «a b», e da lì si falsificano frasi.

   2. Niente di quello che esce di qui è destinato a un attributo o a
      innerHTML: sono stringhe da stampare con textContent (§1.4). Per
      la stessa ragione `tinta` è il NOME di un token di css/tokens.css
      e non un colore — gli esadecimali stanno in quel file e solo lì
      (§1.5).

   3. Un msg-id sconosciuto NON fa sparire l'evento: diventa un evento
      generico, genere 'altro', titolo preso da `system-msg` ripulito.
      Twitch aggiunge msg-id nuovi ogni pochi mesi, e un widget che tace
      davanti a una novità invecchia male molto prima del previsto.

   4. L'oggetto evento porta un campo in più rispetto al §11: `testo`,
      cioè il messaggio che l'utente ha allegato all'USERNOTICE (la
      frase del riabbonamento, il corpo dell'annuncio). Esce COSÌ COM'È,
      non analizzato: a spezzettarlo in emote e link ci pensa Emote.

   ---------------------------------------------------------------------
   INDICE
   ---------------------------------------------------------------------
     1. Costanti e tabelle
     2. Micro-aiuti — ripulitura, numeri, plurali
     3. Le durate raccontate in italiano
     4. I pezzi ricorrenti di un USERNOTICE
     5. leggi() — USERNOTICE → evento
     6. moderazione() — CLEARCHAT e CLEARMSG → provvedimento
     7. avviso() — NOTICE → i soli avvisi che riguardano chi guarda
     8. API pubblica
   ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. Costanti e tabelle
     ------------------------------------------------------------------ */

  const MAX_NOME = 25;     // §5: un display-name più lungo di così non esiste
  const MAX_TITOLO = 90;   // il ripiego su system-msg può arrivare lunghissimo

  /* La tabella del §11, tradotta una volta sola e tenuta qui dentro: chi
     disegna non deve conoscere una sola parola inglese del protocollo.

     Esce anche fuori come Eventi.GENERI, congelata, perché la diagnostica
     e la modalità prova devono poter dire quali msg-id il widget sa
     davvero raccontare — senza copiarsi l'elenco addosso, che è il modo
     più sicuro per farlo invecchiare. */
  const GENERI = {
    'sub':                 { genere: 'abbonamento',    titolo: 'Nuovo abbonato',                  tinta: 'viola' },
    'resub':               { genere: 'riabbonamento',  titolo: 'Si è riabbonato',                 tinta: 'viola' },
    'subgift':             { genere: 'regalo',         titolo: 'Ha regalato un abbonamento',      tinta: 'magenta' },
    'submysterygift':      { genere: 'regali',         titolo: 'Ha regalato degli abbonamenti',   tinta: 'magenta' },
    'giftpaidupgrade':     { genere: 'conferma',       titolo: "Continua l'abbonamento regalato", tinta: 'magenta' },
    'anongiftpaidupgrade': { genere: 'conferma',       titolo: "Continua l'abbonamento regalato", tinta: 'magenta' },
    'raid':                { genere: 'raid',           titolo: 'Raid in arrivo',                  tinta: 'ciano' },
    'unraid':              { genere: 'raid-annullato', titolo: 'Raid annullato',                  tinta: 'ciano' },
    'announcement':        { genere: 'annuncio',       titolo: 'Annuncio',                        tinta: 'viola' },
    'bitsbadgetier':       { genere: 'bits',           titolo: 'Nuovo distintivo bits',           tinta: 'allerta' },
    'viewermilestone':     { genere: 'traguardo',      titolo: 'Traguardo',                       tinta: 'allerta' }
  };

  /* Il piano si mostra come lo chiamano tutti in chat, non come lo scrive
     il protocollo: «1000» su una scheda non vorrebbe dire niente a
     nessuno. La chiave è in maiuscolo perché oggi Twitch manda «Prime»
     con la P grande, ma non giuro che lo farà per sempre. */
  const PIANI = {
    'PRIME': 'PRIME',
    '1000':  'TIER 1',
    '2000':  'TIER 2',
    '3000':  'TIER 3'
  };

  /* L'annuncio è l'unico evento in cui il colore lo sceglie lo streamer
     mentre scrive. Si traduce nei token che il widget ha davvero: non
     esiste un token arancione né un verde di marchio, quindi ORANGE cade
     su --allerta e GREEN su --ok, che sono le due tinte calde e verdi
     della palette. Un colore sconosciuto torna al viola del canale. */
  const TINTE_ANNUNCIO = {
    'PRIMARY': 'viola',
    'BLUE':    'ciano',
    'GREEN':   'ok',
    'ORANGE':  'allerta',
    'PURPLE':  'viola'
  };

  /* Questi msg-id viaggiano sui PRIVMSG, non sugli USERNOTICE: sono roba
     di Rilievo (§10), non eventi. Se un chiamante distratto ci passa i
     tag di un messaggio normale, meglio un null che una scheda «altro»
     appiccicata sopra ogni riscatto di punti canale. */
  const NON_EVENTI = {
    'highlighted-message':      true,
    'skip-subs-mode-message':   true,
    'gigantified-emote-message': true,
    'animated-message':         true
  };

  /* I NOTICE che vale la pena di dire. Tutti gli altri riguardano chi
     scrive in chat — slow mode, solo abbonati, messaggio rifiutato — e
     qui non scrive nessuno (§1.3): si tace.

     `grave` vuol dire una cosa precisa: da questo canale non arriverà MAI
     niente, quindi il widget deve smettere di aspettare e dirlo. Restare
     muto per sempre è il modo peggiore di rompersi, perché sembra un
     guasto del widget invece che un canale che non c'è. */
  const AVVISI = {
    'msg_channel_suspended': { grave: true,  testo: 'Questo canale è sospeso: dalla chat non arriverà niente.' },
    'msg_room_not_found':    { grave: true,  testo: "Questo canale non esiste: controlla il nome nell'indirizzo." },
    'msg_banned':            { grave: true,  testo: 'Da questo canale sono bandito: la chat non la posso leggere.' },
    'tos_ban':               { grave: true,  testo: 'Twitch ha chiuso questo canale.' },
    'msg_channel_blocked':   { grave: false, testo: 'Questo canale risulta bloccato: potrebbe non arrivare niente.' }
  };

  /* ------------------------------------------------------------------
     2. Micro-aiuti — ripulitura, numeri, plurali
     ------------------------------------------------------------------ */

  function stringa(valore) {
    return (typeof valore === 'string') ? valore : '';
  }

  /* I caratteri di controllo dentro un tag non li digita nessuno per
     sbaglio: o sono un errore di codifica, o sono il tentativo di
     spezzare una riga e far sembrare la scheda qualcosa che non è.
     Diventano spazi, gli spazi doppi tornano singoli, e quello che resta
     è testo. Vale anche per system-msg, che arriva già decodificato ma
     non per questo pulito. */
  function pulisci(valore) {
    return stringa(valore)
      .replace(/[\u0000-\u001F\u007F]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function taglia(valore, quanti) {
    const testo = pulisci(valore);
    /* Array.from e non slice: si conta per caratteri veri. Con slice un nome
           che finisce con un'emoji al carattere 25 esce con mezza emoji, cioè un
           rombo nero col punto interrogativo. Gli altri file del progetto lo
           facevano già; questo era rimasto indietro. */
        var lettere = Array.from(testo);
        if (lettere.length <= quanti) { return testo; }
        return lettere.slice(0, quanti - 1).join('') + '…';
  }

  /* Il nome da mostrare: il display-name se c'è, altrimenti il login —
     gli account molto vecchi arrivano senza display-name. Ripulito e
     tagliato a 25 come vuole il §5; il taglio con i nomi veri non scatta
     mai, è una rete per i tag malformati. */
  function persona(mostrato, login) {
    const nome = pulisci(mostrato) || pulisci(login);
    return nome.slice(0, MAX_NOME);
  }

  /* Il login: sempre minuscolo, perché è quello che identifica davvero la
     persona nei comandi di moderazione e nell'elenco dei bot. */
  function accesso(valore) {
    return pulisci(valore).toLowerCase().slice(0, MAX_NOME);
  }

  function numero(valore) {
    const n = parseInt(stringa(valore), 10);
    return (isNaN(n) || n < 0) ? 0 : n;
  }

  /* Migliaia col punto, che è come si scrivono in italiano: «100.000
     bits» si legge, «100000 bits» si conta col dito sullo schermo. */
  function cifre(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function conta(n, uno, molti) {
    return cifre(n) + ' ' + ((n === 1) ? uno : molti);
  }

  /* Come conta(), ma al singolare mette l'articolo al posto della cifra:
     «un abbonamento» è una frase detta a voce, «1 abbonamento» è una
     ricevuta. Le durate del §6 usano conta() apposta, non questa: lì la
     cifra È il dato, e «1 secondo» accanto a «10 minuti» deve restare un
     numero per farsi confrontare al volo. */
  function racconta(n, uno, molti) {
    return (n === 1) ? uno : (cifre(n) + ' ' + molti);
  }

  /* ------------------------------------------------------------------
     3. Le durate raccontate in italiano
     ------------------------------------------------------------------
     Una pausa su Twitch è un numero di secondi, e «600 secondi» non lo
     capisce nessuno al volo. Si mostra una sola unità, la più grande che
     ci sta dentro, arrotondata per difetto: nella riga di un overlay
     «10 minuti» vale più di «10 minuti e 3 secondi», e la precisione al
     secondo non serve a chi guarda.
     ------------------------------------------------------------------ */
  function durataUmana(secondi) {
    if (secondi < 60)    { return conta(secondi, 'secondo', 'secondi'); }
    if (secondi < 3600)  { return conta(Math.floor(secondi / 60), 'minuto', 'minuti'); }
    if (secondi < 86400) { return conta(Math.floor(secondi / 3600), 'ora', 'ore'); }
    return conta(Math.floor(secondi / 86400), 'giorno', 'giorni');
  }

  /* ------------------------------------------------------------------
     4. I pezzi ricorrenti di un USERNOTICE
     ------------------------------------------------------------------ */

  function piano(tag) {
    return PIANI[pulisci(tag['msg-param-sub-plan']).toUpperCase()] || '';
  }

  /* I mesi di fila si mostrano SOLO se Twitch dice che si possono
     mostrare: chi tiene la serie nascosta ha spuntato apposta quella
     casella nelle sue impostazioni, e scoprirla noi sarebbe un piccolo
     tradimento. Sotto i due mesi non è ancora una serie e non si dice:
     «1 mese di fila» è rumore. */
  function mesiDiFila(tag) {
    if (pulisci(tag['msg-param-should-share-streak']) !== '1') { return 0; }
    const mesi = numero(tag['msg-param-streak-months']);
    return (mesi > 1) ? mesi : 0;
  }

  /* I mesi totali: uno solo vuol dire «è appena arrivato», e quello non è
     un dettaglio da riga piccola, è già il titolo. */
  function mesiTotali(tag) {
    const mesi = numero(tag['msg-param-cumulative-months']);
    return (mesi > 1) ? mesi : 0;
  }

  /* ------------------------------------------------------------------
     5. leggi() — USERNOTICE → evento
     ------------------------------------------------------------------
     Torna l'oggetto del §11 (più `testo`, vedi il cappello) oppure null
     se dai tag non si ricava proprio niente da dire.

     `system-msg` non diventa MAI il titolo di un evento conosciuto: è la
     frase pronta di Twitch, ed è in inglese. Serve solo da ripiego
     quando il msg-id non lo conosciamo — meglio una riga in inglese che
     un buco al posto di un abbonamento.
     ------------------------------------------------------------------ */
  function leggi(tag, testo) {
    if (!tag || typeof tag !== 'object') { return null; }

    const id = pulisci(tag['msg-id']).toLowerCase();
    if (NON_EVENTI[id]) { return null; }

    const voce = GENERI[id] || null;
    const sistema = taglia(tag['system-msg'], MAX_TITOLO);

    /* Né un msg-id, né la frase di Twitch: non c'è niente da disegnare, e
       una scheda vuota in mezzo alla chat è peggio di nessuna scheda. */
    if (!voce && !id && !sistema) { return null; }

    const evento = {
      genere:    voce ? voce.genere : 'altro',
      titolo:    voce ? voce.titolo : (sistema || 'È successo qualcosa'),
      dettaglio: '',
      quantita:  0,
      livello:   piano(tag),
      tinta:     voce ? voce.tinta : 'viola',
      testo:     stringa(testo)
    };

    /* A chi è andato il regalo. Il login serve solo se il display-name
       manca, cosa che capita con gli account vecchi di dieci anni. */
    const aChi = persona(tag['msg-param-recipient-display-name'], tag['msg-param-recipient-user-name']);

    switch (evento.genere) {

      case 'abbonamento':
        /* Un abbonamento nuovo di zecca non ha una storia da raccontare.
           Se invece i mesi totali sono più di uno vuol dire che è un
           rientro dopo una pausa, e quello sì che vale la riga piccola. */
        if (mesiTotali(tag)) {
          evento.dettaglio = conta(mesiTotali(tag), 'mese', 'mesi') + ' in totale';
        }
        break;

      case 'riabbonamento': {
        const fila = mesiDiFila(tag);
        const totali = mesiTotali(tag);
        let riga = '';

        if (fila) { riga = conta(fila, 'mese', 'mesi') + ' di fila'; }
        if (totali) {
          /* Con tutti e due i numeri la seconda metà perde la parola
             «mesi»: ripeterla in tre parole di distanza suona come un
             modulo compilato male, non come una frase detta a voce. */
          riga = riga
            ? (riga + ', ' + cifre(totali) + ' in tutto')
            : (conta(totali, 'mese', 'mesi') + ' in totale');
        }
        evento.dettaglio = riga;
        break;
      }

      case 'regalo': {
        const inTutto = numero(tag['msg-param-sender-count']);
        evento.quantita = 1;
        evento.dettaglio = aChi
          ? ('ha regalato un abbonamento a ' + aChi)
          : 'ha regalato un abbonamento';
        if (inTutto > 1) { evento.dettaglio += ', ' + cifre(inTutto) + ' in tutto'; }
        break;
      }

      case 'regali': {
        const quanti = numero(tag['msg-param-mass-gift-count']);
        const inTutto = numero(tag['msg-param-sender-count']);
        if (quanti) {
          evento.quantita = quanti;
          /* La N della tabella del §11 è un segnaposto: il numero vero
             sta nel titolo, perché è la prima cosa che si guarda. */
          evento.titolo = 'Ha regalato ' + racconta(quanti, 'un abbonamento', 'abbonamenti');
          /* Il conto di sempre si dice solo se lo sappiamo, e solo se
             aggiunge qualcosa: altrimenti la riga piccola non farebbe che
             ripetere il titolo con altre parole. */
          if (inTutto > quanti) {
            evento.dettaglio = racconta(quanti, 'un abbonamento regalato', 'abbonamenti regalati') +
                               ', ' + cifre(inTutto) + ' in tutto';
          }
        }
        break;
      }

      case 'conferma': {
        /* giftpaidupgrade porta il nome di chi aveva fatto il regalo;
           anongiftpaidupgrade no, e non è un tag mancante per sbaglio:
           quel regalo era anonimo per scelta di chi l'ha fatto, e si
           rispetta dicendolo così. */
        const donatore = persona(tag['msg-param-sender-name'], tag['msg-param-sender-login']);
        if (donatore) {
          evento.dettaglio = 'glielo aveva regalato ' + donatore;
        } else if (id === 'anongiftpaidupgrade') {
          evento.dettaglio = 'glielo aveva regalato un anonimo';
        }
        break;
      }

      case 'raid':
        evento.quantita = numero(tag['msg-param-viewerCount']);
        if (evento.quantita) {
          evento.dettaglio = 'ha portato ' + racconta(evento.quantita, 'una persona', 'persone');
        }
        break;

      case 'raid-annullato':
        evento.dettaglio = 'alla fine non se ne fa niente';
        break;

      case 'annuncio':
        /* Il colore lo sceglie lo streamer quando scrive l'annuncio: è
           l'unico caso in tutto il file in cui la tinta della scheda non
           la decide il genere. Il corpo dell'annuncio non finisce nel
           dettaglio, arriva allegato in `testo` e lo disegna chi sa
           leggere le emote. */
        evento.tinta = TINTE_ANNUNCIO[pulisci(tag['msg-param-color']).toUpperCase()] || 'viola';
        break;

      case 'bits':
        /* La soglia del distintivo — 1.000, 10.000, 100.000 bits — sta in
           msg-param-threshold: senza quella il titolo resterebbe monco e
           non si capirebbe di che distintivo si parla. */
        evento.quantita = numero(tag['msg-param-threshold']);
        if (evento.quantita) {
          evento.dettaglio = 'ha sbloccato il distintivo da ' + cifre(evento.quantita) + ' bits';
        }
        break;

      case 'traguardo': {
        /* Oggi viewermilestone ha una categoria sola, watch-streak: le
           dirette seguite di fila, contate in msg-param-value. Se domani
           ne arriva un'altra si ripiega sulla frase di Twitch invece di
           inventarsi una traduzione per una cosa che non conosciamo. */
        const categoria = pulisci(tag['msg-param-category']).toLowerCase();
        evento.quantita = numero(tag['msg-param-value']);
        if (categoria === 'watch-streak' && evento.quantita) {
          evento.dettaglio = 'è qui da ' + racconta(evento.quantita, 'una diretta', 'dirette') + ' di fila';
        } else if (sistema) {
          evento.dettaglio = sistema;
        }
        break;
      }

      default:
        /* 'altro': il titolo è già la frase di Twitch ripulita. Non si
           aggiunge niente, perché non sappiamo cosa stiamo guardando e
           inventare un dettaglio sarebbe peggio che non averlo. */
        break;
    }

    return evento;
  }

  /* ------------------------------------------------------------------
     6. moderazione() — CLEARCHAT e CLEARMSG → provvedimento
     ------------------------------------------------------------------
     `parametri` è la coda grezza del comando così come la consegna
     js/irc.js: '#canale' quando è stata svuotata tutta la chat,
     '#canale :tizio' quando il provvedimento riguarda una persona sola.
     Si accetta anche un elenco già spezzato, nel caso un domani i
     parametri arrivino in quella forma: costa tre righe e non costringe
     nessuno a toccare questo file.

     Al risultato del §11 si aggiunge `frase`: la riga italiana già
     scritta, pronta da stampare. Sta qui e non in resa.js perché la
     traduzione è il mestiere di questo file — e perché così la stessa
     frase non viene riscritta in due punti che poi divergono.
     ------------------------------------------------------------------ */
  function bersaglio(parametri) {
    if (Object.prototype.toString.call(parametri) === '[object Array]') {
      return (parametri.length > 1) ? accesso(parametri[parametri.length - 1]) : '';
    }
    const coda = stringa(parametri);
    const due = coda.indexOf(':');
    return (due >= 0) ? accesso(coda.slice(due + 1)) : '';
  }

  function moderazione(comando, tag, parametri) {
    const nome = pulisci(comando).toUpperCase();
    const tags = (tag && typeof tag === 'object') ? tag : {};

    if (nome === 'CLEARMSG') {
      /* Il nick c'è ma la frase resta impersonale: un messaggio
         cancellato non si ripete a voce, e nemmeno si intesta a qualcuno
         davanti a tutta la chat. Il nick serve a chi disegna per trovare
         la riga, non per scriverla. */
      return {
        genere: 'cancella',
        id:     pulisci(tags['target-msg-id']),
        nick:   accesso(tags['login']),
        frase:  'un messaggio è stato cancellato'
      };
    }

    if (nome !== 'CLEARCHAT') { return null; }

    const nick = bersaglio(parametri);
    if (!nick) {
      return { genere: 'svuota', frase: 'la chat è stata svuotata' };
    }

    const durata = numero(tags['ban-duration']);
    if (durata > 0) {
      return {
        genere: 'pausa',
        nick:   nick,
        durata: durata,
        frase:  nick + ' è stato messo in pausa per ' + durataUmana(durata)
      };
    }

    /* Il motivo del ban su IRC non arriva più da anni: il campo resta,
       vuoto, perché il §11 lo dichiara e chi disegna non deve stare a
       chiedersi se esiste. */
    return { genere: 'ban', nick: nick, motivo: '', frase: nick + ' è stato bannato' };
  }

  /* ------------------------------------------------------------------
     7. avviso() — NOTICE → i soli avvisi che riguardano chi guarda
     ------------------------------------------------------------------
     Serve a un caso solo, ma è quello che rende onesto il widget: se il
     canale è sospeso o non esiste, dalla chat non arriverà mai niente, e
     restare muti per sempre sembrerebbe un guasto nostro. Tutto il resto
     dei NOTICE riguarda chi scrive in chat, e qui non scrive nessuno
     (§1.3): torna null e non si disturba lo spettatore.
     ------------------------------------------------------------------ */
  function avviso(tag, testo) {
    const tags = (tag && typeof tag === 'object') ? tag : {};
    const id = pulisci(tags['msg-id']).toLowerCase();
    const voce = AVVISI[id];

    if (voce) { return { testo: voce.testo, grave: voce.grave }; }

    /* Il rifiuto all'ingresso arriva senza msg-id, quindi lo si riconosce
       dalla frase inglese: è il caso in cui il nick anonimo non è stato
       accettato. È grave — la socket è aperta ma non entrerà mai in
       nessun canale — e senza questa riga il widget resterebbe vuoto
       senza dire perché. */
    if (!id && /login (unsuccessful|authentication failed)/i.test(pulisci(testo))) {
      return { testo: 'Twitch non mi ha fatto entrare in chat. Ricarica la pagina.', grave: true };
    }

    return null;
  }

  /* ------------------------------------------------------------------
     8. API pubblica
     ------------------------------------------------------------------
     GENERI esce congelata: è una tabella da leggere, e un modulo che la
     modificasse cambierebbe il racconto di tutti gli altri senza che si
     capisca da dove arriva il cambiamento.
     ------------------------------------------------------------------ */
  if (Object.freeze) { Object.freeze(GENERI); }

  window.Eventi = {
    leggi:       leggi,
    moderazione: moderazione,
    avviso:      avviso,
    GENERI:      GENERI
  };
}());
