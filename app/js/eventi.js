(function () {
  'use strict';

  const MAX_NOME = 25;
  const MAX_TITOLO = 90;

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

  const PIANI = {
    'PRIME': 'PRIME',
    '1000':  'TIER 1',
    '2000':  'TIER 2',
    '3000':  'TIER 3'
  };

  const TINTE_ANNUNCIO = {
    'PRIMARY': 'viola',
    'BLUE':    'ciano',
    'GREEN':   'ok',
    'ORANGE':  'allerta',
    'PURPLE':  'viola'
  };

  const NON_EVENTI = {
    'highlighted-message':      true,
    'skip-subs-mode-message':   true,
    'gigantified-emote-message': true,
    'animated-message':         true
  };

  const AVVISI = {
    'msg_channel_suspended': { grave: true,  testo: 'Questo canale è sospeso: dalla chat non arriverà niente.' },
    'msg_room_not_found':    { grave: true,  testo: "Questo canale non esiste: controlla il nome nell'indirizzo." },
    'msg_banned':            { grave: true,  testo: 'Da questo canale sono bandito: la chat non la posso leggere.' },
    'tos_ban':               { grave: true,  testo: 'Twitch ha chiuso questo canale.' },
    'msg_channel_blocked':   { grave: false, testo: 'Questo canale risulta bloccato: potrebbe non arrivare niente.' }
  };

  function stringa(valore) {
    return (typeof valore === 'string') ? valore : '';
  }

  function pulisci(valore) {
    return stringa(valore)
      .replace(/[\u0000-\u001F\u007F]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function taglia(valore, quanti) {
    const testo = pulisci(valore);

        var lettere = Array.from(testo);
        if (lettere.length <= quanti) { return testo; }
        return lettere.slice(0, quanti - 1).join('') + '…';
  }

  function persona(mostrato, login) {
    const nome = pulisci(mostrato) || pulisci(login);
    return nome.slice(0, MAX_NOME);
  }

  function accesso(valore) {
    return pulisci(valore).toLowerCase().slice(0, MAX_NOME);
  }

  function numero(valore) {
    const n = parseInt(stringa(valore), 10);
    return (isNaN(n) || n < 0) ? 0 : n;
  }

  function cifre(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function conta(n, uno, molti) {
    return cifre(n) + ' ' + ((n === 1) ? uno : molti);
  }

  function racconta(n, uno, molti) {
    return (n === 1) ? uno : (cifre(n) + ' ' + molti);
  }

  function durataUmana(secondi) {
    if (secondi < 60)    { return conta(secondi, 'secondo', 'secondi'); }
    if (secondi < 3600)  { return conta(Math.floor(secondi / 60), 'minuto', 'minuti'); }
    if (secondi < 86400) { return conta(Math.floor(secondi / 3600), 'ora', 'ore'); }
    return conta(Math.floor(secondi / 86400), 'giorno', 'giorni');
  }

  function piano(tag) {
    return PIANI[pulisci(tag['msg-param-sub-plan']).toUpperCase()] || '';
  }

  function mesiDiFila(tag) {
    if (pulisci(tag['msg-param-should-share-streak']) !== '1') { return 0; }
    const mesi = numero(tag['msg-param-streak-months']);
    return (mesi > 1) ? mesi : 0;
  }

  function mesiTotali(tag) {
    const mesi = numero(tag['msg-param-cumulative-months']);
    return (mesi > 1) ? mesi : 0;
  }

  function leggi(tag, testo) {
    if (!tag || typeof tag !== 'object') { return null; }

    const id = pulisci(tag['msg-id']).toLowerCase();
    if (NON_EVENTI[id]) { return null; }

    const voce = GENERI[id] || null;
    const sistema = taglia(tag['system-msg'], MAX_TITOLO);

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

    const aChi = persona(tag['msg-param-recipient-display-name'], tag['msg-param-recipient-user-name']);

    switch (evento.genere) {

      case 'abbonamento':

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

          evento.titolo = 'Ha regalato ' + racconta(quanti, 'un abbonamento', 'abbonamenti');

          if (inTutto > quanti) {
            evento.dettaglio = racconta(quanti, 'un abbonamento regalato', 'abbonamenti regalati') +
                               ', ' + cifre(inTutto) + ' in tutto';
          }
        }
        break;
      }

      case 'conferma': {

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

        evento.tinta = TINTE_ANNUNCIO[pulisci(tag['msg-param-color']).toUpperCase()] || 'viola';
        break;

      case 'bits':

        evento.quantita = numero(tag['msg-param-threshold']);
        if (evento.quantita) {
          evento.dettaglio = 'ha sbloccato il distintivo da ' + cifre(evento.quantita) + ' bits';
        }
        break;

      case 'traguardo': {

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

        break;
    }

    return evento;
  }

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

    return { genere: 'ban', nick: nick, motivo: '', frase: nick + ' è stato bannato' };
  }

  function avviso(tag, testo) {
    const tags = (tag && typeof tag === 'object') ? tag : {};
    const id = pulisci(tags['msg-id']).toLowerCase();
    const voce = AVVISI[id];

    if (voce) { return { testo: voce.testo, grave: voce.grave }; }

    if (!id && /login (unsuccessful|authentication failed)/i.test(pulisci(testo))) {
      return { testo: 'Twitch non mi ha fatto entrare in chat. Ricarica la pagina.', grave: true };
    }

    return null;
  }

  if (Object.freeze) { Object.freeze(GENERI); }

  window.Eventi = {
    leggi:       leggi,
    moderazione: moderazione,
    avviso:      avviso,
    GENERI:      GENERI
  };
}());
