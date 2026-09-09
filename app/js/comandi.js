(function () {
  'use strict';

  var MODELLO_UTENTE = /^[a-z0-9_]{1,25}$/;

  var MODELLO_ID = /^[0-9]{1,20}$/;

  var MODELLO_INTERO = /^[0-9]{1,9}$/;

  var SPORCO = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

  var CODA_SECONDI = /\s*\/\s*([0-9]{1,6})\s*$/;

  var SCOPO_BANDITI     = 'moderator:manage:banned_users';
  var SCOPO_RIPULITURA  = 'moderator:manage:chat_messages';
  var SCOPO_MODI        = 'moderator:manage:chat_settings';
  var SCOPO_ANNUNCI     = 'moderator:manage:announcements';
  var SCOPO_SALUTI      = 'moderator:manage:shoutouts';
  var SCOPO_RAID        = 'channel:manage:raids';
  var SCOPO_SONDAGGI    = 'channel:manage:polls';
  var SCOPO_PREDIZIONI  = 'channel:manage:predictions';
  var SCOPO_DIRETTA     = 'channel:manage:broadcast';
  var SCOPO_MODERATORI  = 'channel:manage:moderators';
  var SCOPO_VIP         = 'channel:manage:vips';
  var SCOPO_SUSSURRI    = 'user:manage:whispers';

  var PAUSA_PREDEFINITA = 600;
  var PAUSA_MINIMA = 1;
  var PAUSA_MASSIMA = 1209600;

  var LENTO_PREDEFINITO = 30;
  var LENTO_MINIMO = 3;
  var LENTO_MASSIMO = 120;

  var SEGUACI_PREDEFINITI = 0;
  var SEGUACI_MINIMI = 0;
  var SEGUACI_MASSIMI = 129600;

  var SCELTE_MINIME = 2;
  var SCELTE_MASSIME = 5;
  var ESITI_MASSIMI = 10;

  var DURATA_PREDEFINITA = 120;
  var SONDAGGIO_MINIMO = 15;
  var SONDAGGIO_MASSIMO = 1800;
  var PREDIZIONE_MINIMA = 30;
  var PREDIZIONE_MASSIMA = 1800;

  var LIMITE_MOTIVO = 500;
  var LIMITE_ANNUNCIO = 500;
  var LIMITE_SUSSURRO = 500;
  var LIMITE_SEGNALIBRO = 140;
  var LIMITE_DOMANDA = 60;
  var LIMITE_SCELTA = 25;
  var LIMITE_PREVISIONE = 45;
  var LIMITE_ECO = 40;

  var COLORE_PREDEFINITO = 'primary';

  var COLORI = { blue: 'blu', green: 'verde', orange: 'arancione', purple: 'viola' };

  function ritaglia(testo, quanti) {
    var s = String(testo === undefined || testo === null ? '' : testo)
      .replace(SPORCO, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    var lettere = Array.from(s);
    if (lettere.length <= quanti) { return s; }
    return lettere.slice(0, quanti).join('').trim();
  }

  function utente(grezzo) {
    var s = String(grezzo === undefined || grezzo === null ? '' : grezzo)
      .replace(SPORCO, '')
      .trim()
      .toLowerCase();

    if (s.charAt(0) === '@') { s = s.slice(1); }
    return MODELLO_UTENTE.test(s) ? s : '';
  }

  function intero(grezzo) {
    return MODELLO_INTERO.test(String(grezzo === undefined || grezzo === null ? '' : grezzo));
  }

  function ritagliaNumero(grezzo, minimo, massimo) {
    var n = parseInt(String(grezzo), 10);
    if (!isFinite(n)) { return minimo; }
    if (n < minimo) { return minimo; }
    if (n > massimo) { return massimo; }
    return n;
  }

  function dettaSecondi(quanti) {
    var n = Math.max(0, Math.floor(Number(quanti) || 0));

    if (n >= 86400 && n % 86400 === 0) {
      return n === 86400 ? 'un giorno' : (n / 86400) + ' giorni';
    }
    if (n >= 3600 && n % 3600 === 0) {
      return n === 3600 ? 'un’ora' : (n / 3600) + ' ore';
    }
    if (n >= 60 && n % 60 === 0) {
      return n === 60 ? 'un minuto' : (n / 60) + ' minuti';
    }
    return n === 1 ? 'un secondo' : n + ' secondi';
  }

  function due(numero) {
    return numero < 10 ? '0' + numero : String(numero);
  }

  function orologio(secondi) {
    var n = Math.max(0, Math.floor(Number(secondi) || 0));
    var ore = Math.floor(n / 3600);
    var minuti = Math.floor((n % 3600) / 60);

    if (ore) { return ore + ':' + due(minuti) + ':' + due(n % 60); }
    return minuti + ':' + due(n % 60);
  }

  function analizza(testo) {
    var riga = String(testo === undefined || testo === null ? '' : testo)
      .replace(SPORCO, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (riga.charAt(0) !== '/') { return null; }

    var spazio = riga.indexOf(' ');
    var nome = (spazio === -1 ? riga.slice(1) : riga.slice(1, spazio)).toLowerCase();

    if (!Object.prototype.hasOwnProperty.call(TAVOLA, nome)) { return null; }

    var resto = spazio === -1 ? '' : riga.slice(spazio + 1).trim();

    return { nome: nome, argomenti: resto === '' ? [] : resto.split(' ') };
  }

  function e(testo) {
    return analizza(testo) !== null;
  }

  function ilConto() {
    var c = window.Conto;

    if (!c || typeof c.verso !== 'function' || typeof c.chi !== 'function' ||
        typeof c.puo !== 'function' || typeof c.canale !== 'function') {
      return null;
    }
    return c;
  }

  function uso(voce) {
    return '/' + voce.nome + (voce.sintassi ? ' ' + voce.sintassi : '');
  }

  function daModeratore(ctx) {
    return 'broadcaster_id=' + encodeURIComponent(ctx.canaleId) +
           '&moderator_id=' + encodeURIComponent(ctx.io);
  }

  function bussa(metodo, percorso, corpo, detto, su) {
    window.Conto.verso(metodo, percorso, corpo, function (guaio, dati, scollegato) {
      if (guaio) { su(guaio, null, scollegato); return; }
      su(null, typeof detto === 'function' ? detto(dati) : detto);
    });
  }

  function conUtente(grezzo, chiaveUso, su, poi) {
    if (!grezzo) {
      su('Mi manca il nome di chi: si scrive ' + chiaveUso + '.');
      return;
    }

    var nome = utente(grezzo);
    if (!nome) {
      su('«' + ritaglia(grezzo, LIMITE_ECO) + '» non è un nome che Twitch possa avere: ' +
         'lettere, numeri e trattini bassi, al massimo venticinque.');
      return;
    }

    window.Conto.canale(nome, function (guaio, id, scollegato) {
      if (guaio) { su(guaio, null, scollegato); return; }

      if (!MODELLO_ID.test(String(id || ''))) {
        su('Twitch non mi ha detto chi è ' + nome + ', quindi mi fermo qui.');
        return;
      }
      poi(nome, String(id));
    });
  }

  function modo(ctx, campi, detto, su) {
    bussa('PATCH', '/chat/settings?' + daModeratore(ctx), campi, detto, su);
  }

  function interruttore(campi, detto) {
    return function (argomenti, ctx, su) {
      modo(ctx, campi, detto, su);
    };
  }

  function scioglie(detto) {
    return function (argomenti, ctx, su, chiaveUso) {
      conUtente(argomenti[0], chiaveUso, su, function (nome, id) {
        bussa('DELETE',
          '/moderation/bans?' + daModeratore(ctx) + '&user_id=' + encodeURIComponent(id),
          null, detto(nome), su);
      });
    };
  }

  function ruolo(metodo, percorso, scopo, nome, sintassi, aiuto, detto) {
    return {
      nome: nome,
      sintassi: sintassi,
      aiuto: aiuto,
      scopo: scopo,
      fa: function (argomenti, ctx, su, chiaveUso) {
        conUtente(argomenti[0], chiaveUso, su, function (chi, id) {
          bussa(metodo,
            percorso + '?broadcaster_id=' + encodeURIComponent(ctx.canaleId) +
            '&user_id=' + encodeURIComponent(id),
            null, detto(chi), su);
        });
      }
    };
  }

  function spezza(argomenti) {
    var riga = argomenti.join(' ');
    var secondi = 0;

    var coda = CODA_SECONDI.exec(riga);
    if (coda) {
      secondi = parseInt(coda[1], 10);
      riga = riga.slice(0, coda.index);
    }

    var parti = riga.split('|');
    var titolo = ritaglia(parti[0], LIMITE_DOMANDA);
    var voci = [];
    var i;

    for (i = 1; i < parti.length; i++) {
      var voce = ritaglia(parti[i], LIMITE_SCELTA);
      if (voce) { voci.push(voce); }
    }

    return { titolo: titolo, voci: voci, secondi: secondi };
  }

  function dettoSegnalibro(dati) {
    var voce = dati && dati.data && dati.data[0];
    var quando = voce && isFinite(voce.position_seconds) ? Number(voce.position_seconds) : -1;

    if (quando < 0) { return 'Fatto: il segnalibro è nella diretta.'; }
    return 'Fatto: segnalibro messo a ' + orologio(quando) + ' dall’inizio della diretta.';
  }

  var COMANDI = [
    {
      nome: 'ban',
      sintassi: '<utente> [motivo]',
      aiuto: 'Lo caccio dal canale per sempre, con il motivo se glielo vuoi dire.',
      scopo: SCOPO_BANDITI,
      fa: function (argomenti, ctx, su, chiaveUso) {
        conUtente(argomenti[0], chiaveUso, su, function (nome, id) {
          var motivo = ritaglia(argomenti.slice(1).join(' '), LIMITE_MOTIVO);
          var dati = { user_id: id };
          if (motivo) { dati.reason = motivo; }

          bussa('POST', '/moderation/bans?' + daModeratore(ctx), { data: dati },
            'Fatto: ' + nome + ' è fuori dal canale' + (motivo ? ', e sa perché.' : '.'), su);
        });
      }
    },
    {
      nome: 'timeout',
      sintassi: '<utente> [secondi] [motivo]',
      aiuto: 'Lo metto in panchina: senza numero sono dieci minuti, al massimo due settimane.',
      scopo: SCOPO_BANDITI,
      fa: function (argomenti, ctx, su, chiaveUso) {
        conUtente(argomenti[0], chiaveUso, su, function (nome, id) {
          var resto = argomenti.slice(1);
          var secondi = PAUSA_PREDEFINITA;

          if (resto.length && intero(resto[0])) {
            secondi = ritagliaNumero(resto[0], PAUSA_MINIMA, PAUSA_MASSIMA);
            resto = resto.slice(1);
          }

          var motivo = ritaglia(resto.join(' '), LIMITE_MOTIVO);
          var dati = { user_id: id, duration: secondi };
          if (motivo) { dati.reason = motivo; }

          bussa('POST', '/moderation/bans?' + daModeratore(ctx), { data: dati },
            'Fatto: ' + nome + ' sta in panchina per ' + dettaSecondi(secondi) + '.', su);
        });
      }
    },
    {
      nome: 'unban',
      sintassi: '<utente>',
      aiuto: 'Gli riapro la porta del canale.',
      scopo: SCOPO_BANDITI,
      fa: scioglie(function (nome) { return 'Fatto: ' + nome + ' può tornare in chat.'; })
    },
    {
      nome: 'untimeout',
      sintassi: '<utente>',
      aiuto: 'Gli tolgo la panchina prima della fine.',
      scopo: SCOPO_BANDITI,
      fa: scioglie(function (nome) { return 'Fatto: ' + nome + ' può riscrivere subito.'; })
    },
    {
      nome: 'clear',
      sintassi: '',
      aiuto: 'Svuoto la chat per tutti quelli che stanno guardando.',
      scopo: SCOPO_RIPULITURA,
      fa: function (argomenti, ctx, su) {
        bussa('DELETE', '/moderation/chat?' + daModeratore(ctx), null,
          'Fatto: la chat è pulita per tutti.', su);
      }
    },
    {
      nome: 'slow',
      sintassi: '[secondi]',
      aiuto: 'Un messaggio ogni tanto: senza numero sono trenta secondi, da tre a centoventi.',
      scopo: SCOPO_MODI,
      fa: function (argomenti, ctx, su, chiaveUso) {
        if (argomenti.length && !intero(argomenti[0])) {
          su('«' + ritaglia(argomenti[0], LIMITE_ECO) + '» non è un numero di secondi: si scrive ' + chiaveUso + '.');
          return;
        }

        var secondi = argomenti.length
          ? ritagliaNumero(argomenti[0], LENTO_MINIMO, LENTO_MASSIMO)
          : LENTO_PREDEFINITO;

        modo(ctx, { slow_mode: true, slow_mode_wait_time: secondi },
          'Fatto: adesso si scrive un messaggio ogni ' + dettaSecondi(secondi) + '.', su);
      }
    },
    {
      nome: 'slowoff',
      sintassi: '',
      aiuto: 'Tolgo il rallentatore.',
      scopo: SCOPO_MODI,
      fa: interruttore({ slow_mode: false }, 'Fatto: si torna a scrivere quando si vuole.')
    },
    {
      nome: 'followers',
      sintassi: '[minuti]',
      aiuto: 'Scrivono solo i follower: col numero, solo chi segue da almeno quei minuti.',
      scopo: SCOPO_MODI,
      fa: function (argomenti, ctx, su, chiaveUso) {
        if (argomenti.length && !intero(argomenti[0])) {
          su('«' + ritaglia(argomenti[0], LIMITE_ECO) + '» non è un numero di minuti: si scrive ' + chiaveUso + '.');
          return;
        }

        var minuti = argomenti.length
          ? ritagliaNumero(argomenti[0], SEGUACI_MINIMI, SEGUACI_MASSIMI)
          : SEGUACI_PREDEFINITI;

        modo(ctx, { follower_mode: true, follower_mode_duration: minuti },
          minuti
            ? 'Fatto: scrive solo chi segue il canale da almeno ' + dettaSecondi(minuti * 60) + '.'
            : 'Fatto: scrivono solo i follower.', su);
      }
    },
    {
      nome: 'followersoff',
      sintassi: '',
      aiuto: 'Torna a scrivere chiunque, follower o no.',
      scopo: SCOPO_MODI,
      fa: interruttore({ follower_mode: false }, 'Fatto: scrive di nuovo chiunque, follower o no.')
    },
    {
      nome: 'subscribers',
      sintassi: '',
      aiuto: 'Scrivono solo gli abbonati.',
      scopo: SCOPO_MODI,
      fa: interruttore({ subscriber_mode: true }, 'Fatto: adesso scrivono solo gli abbonati.')
    },
    {
      nome: 'subscribersoff',
      sintassi: '',
      aiuto: 'Torna a scrivere anche chi non è abbonato.',
      scopo: SCOPO_MODI,
      fa: interruttore({ subscriber_mode: false }, 'Fatto: scrive di nuovo chiunque, abbonato o no.')
    },
    {
      nome: 'emoteonly',
      sintassi: '',
      aiuto: 'Si parla solo a emote.',
      scopo: SCOPO_MODI,
      fa: interruttore({ emote_mode: true }, 'Fatto: adesso si parla solo a emote.')
    },
    {
      nome: 'emoteonlyoff',
      sintassi: '',
      aiuto: 'Si torna a parlare anche a parole.',
      scopo: SCOPO_MODI,
      fa: interruttore({ emote_mode: false }, 'Fatto: si torna a parlare anche a parole.')
    },
    {
      nome: 'uniquechat',
      sintassi: '',
      aiuto: 'Niente messaggi copiati e incollati uguali.',
      scopo: SCOPO_MODI,
      fa: interruttore({ unique_chat_mode: true }, 'Fatto: due messaggi uguali non passano più.')
    },
    {
      nome: 'uniquechatoff',
      sintassi: '',
      aiuto: 'Si può ripetere quello che si vuole.',
      scopo: SCOPO_MODI,
      fa: interruttore({ unique_chat_mode: false }, 'Fatto: si può ripetere quello che si vuole.')
    },
    {
      nome: 'announce',
      sintassi: '[blue|green|orange|purple] <testo>',
      aiuto: 'Un annuncio in evidenza in chat: senza colore prende quello del canale.',
      scopo: SCOPO_ANNUNCI,
      fa: function (argomenti, ctx, su, chiaveUso) {
        var voci = argomenti.slice();
        var colore = COLORE_PREDEFINITO;

        if (voci.length > 1 &&
            Object.prototype.hasOwnProperty.call(COLORI, String(voci[0]).toLowerCase())) {
          colore = String(voci[0]).toLowerCase();
          voci = voci.slice(1);
        }

        var messaggio = ritaglia(voci.join(' '), LIMITE_ANNUNCIO);
        if (!messaggio) {
          su('Un annuncio senza niente da dire non lo faccio: si scrive ' + chiaveUso + '.');
          return;
        }

        bussa('POST', '/chat/announcements?' + daModeratore(ctx),
          { message: messaggio, color: colore },
          'Fatto: l’annuncio è in chat' +
          (colore === COLORE_PREDEFINITO ? '.' : ', in ' + COLORI[colore] + '.'), su);
      }
    },
    {
      nome: 'shoutout',
      sintassi: '<utente>',
      aiuto: 'Mando la chat a vedere un altro canale.',
      scopo: SCOPO_SALUTI,
      fa: function (argomenti, ctx, su, chiaveUso) {
        conUtente(argomenti[0], chiaveUso, su, function (nome, id) {
          bussa('POST',
            '/chat/shoutouts?from_broadcaster_id=' + encodeURIComponent(ctx.canaleId) +
            '&to_broadcaster_id=' + encodeURIComponent(id) +
            '&moderator_id=' + encodeURIComponent(ctx.io),
            null, 'Fatto: ho detto a tutti di andare a vedere ' + nome + '.', su);
        });
      }
    },
    {
      nome: 'raid',
      sintassi: '<utente>',
      aiuto: 'Porto la gente da un altro: parte il conto alla rovescia.',
      scopo: SCOPO_RAID,
      fa: function (argomenti, ctx, su, chiaveUso) {
        conUtente(argomenti[0], chiaveUso, su, function (nome, id) {
          bussa('POST',
            '/raids?from_broadcaster_id=' + encodeURIComponent(ctx.canaleId) +
            '&to_broadcaster_id=' + encodeURIComponent(id),
            null, 'Fatto: il conto alla rovescia del raid su ' + nome + ' è partito.', su);
        });
      }
    },
    {
      nome: 'unraid',
      sintassi: '',
      aiuto: 'Annullo il raid prima che parta.',
      scopo: SCOPO_RAID,
      fa: function (argomenti, ctx, su) {
        bussa('DELETE', '/raids?broadcaster_id=' + encodeURIComponent(ctx.canaleId), null,
          'Fatto: il raid è annullato, non si va più da nessuna parte.', su);
      }
    },
    {
      nome: 'marker',
      sintassi: '[descrizione]',
      aiuto: 'Metto un segnalibro nella diretta, per ritrovare il punto dopo.',
      scopo: SCOPO_DIRETTA,
      fa: function (argomenti, ctx, su) {
        var descrizione = ritaglia(argomenti.join(' '), LIMITE_SEGNALIBRO);
        var corpo = { user_id: ctx.canaleId };
        if (descrizione) { corpo.description = descrizione; }

        bussa('POST', '/streams/markers', corpo, dettoSegnalibro, su);
      }
    },
    {
      nome: 'poll',
      sintassi: '<domanda> | <scelta> | <scelta> [| altre] [/ secondi]',
      aiuto: 'Apro un sondaggio: da due a cinque scelte separate da «|», e «/ 90» in fondo per dire quanto dura (senza, dura due minuti).',
      scopo: SCOPO_SONDAGGI,
      fa: function (argomenti, ctx, su, chiaveUso) {
        var letto = spezza(argomenti);

        if (!letto.titolo || letto.voci.length < SCELTE_MINIME) {
          su('Un sondaggio si scrive ' + chiaveUso + ': prima la domanda, poi almeno due scelte separate da «|».');
          return;
        }
        if (letto.voci.length > SCELTE_MASSIME) {
          su('Twitch arriva a cinque scelte e me ne hai date ' + letto.voci.length + ': togline qualcuna.');
          return;
        }

        var durata = letto.secondi
          ? ritagliaNumero(letto.secondi, SONDAGGIO_MINIMO, SONDAGGIO_MASSIMO)
          : DURATA_PREDEFINITA;

        var scelte = [];
        var i;
        for (i = 0; i < letto.voci.length; i++) { scelte.push({ title: letto.voci[i] }); }

        bussa('POST', '/polls', {
          broadcaster_id: ctx.canaleId,
          title: letto.titolo,
          choices: scelte,
          duration: durata
        }, 'Fatto: il sondaggio «' + letto.titolo + '» è aperto, ' + scelte.length +
           ' scelte, si vota per ' + dettaSecondi(durata) + '.', su);
      }
    },
    {
      nome: 'prediction',
      sintassi: '<domanda> | <esito> | <esito> [| altri] [/ secondi]',
      aiuto: 'Apro una predizione: da due a dieci esiti separati da «|», e «/ 90» in fondo per dire quanto si scommette (senza, due minuti).',
      scopo: SCOPO_PREDIZIONI,
      fa: function (argomenti, ctx, su, chiaveUso) {
        var letto = spezza(argomenti);
        var titolo = ritaglia(letto.titolo, LIMITE_PREVISIONE);

        if (!titolo || letto.voci.length < SCELTE_MINIME) {
          su('Una predizione si scrive ' + chiaveUso + ': prima la domanda, poi almeno due esiti separati da «|».');
          return;
        }
        if (letto.voci.length > ESITI_MASSIMI) {
          su('Twitch arriva a dieci esiti e me ne hai dati ' + letto.voci.length + ': togline qualcuno.');
          return;
        }

        var finestra = letto.secondi
          ? ritagliaNumero(letto.secondi, PREDIZIONE_MINIMA, PREDIZIONE_MASSIMA)
          : DURATA_PREDEFINITA;

        var esiti = [];
        var i;
        for (i = 0; i < letto.voci.length; i++) { esiti.push({ title: letto.voci[i] }); }

        bussa('POST', '/predictions', {
          broadcaster_id: ctx.canaleId,
          title: titolo,
          outcomes: esiti,
          prediction_window: finestra
        }, 'Fatto: la predizione «' + titolo + '» è aperta, ' + esiti.length +
           ' esiti, si scommette per ' + dettaSecondi(finestra) + '.', su);
      }
    },
    ruolo('POST', '/moderation/moderators', SCOPO_MODERATORI, 'mod', '<utente>',
      'Lo faccio moderatore del canale.',
      function (nome) { return 'Fatto: ' + nome + ' adesso è moderatore.'; }),
    ruolo('DELETE', '/moderation/moderators', SCOPO_MODERATORI, 'unmod', '<utente>',
      'Gli tolgo la spada da moderatore.',
      function (nome) { return 'Fatto: ' + nome + ' non è più moderatore.'; }),
    ruolo('POST', '/channels/vips', SCOPO_VIP, 'vip', '<utente>',
      'Gli do il VIP.',
      function (nome) { return 'Fatto: ' + nome + ' adesso è VIP.'; }),
    ruolo('DELETE', '/channels/vips', SCOPO_VIP, 'unvip', '<utente>',
      'Gli tolgo il VIP.',
      function (nome) { return 'Fatto: ' + nome + ' non è più VIP.'; }),
    {
      nome: 'w',
      sintassi: '<utente> <testo>',
      aiuto: 'Un sussurro: lo legge solo lui, e in chat non compare.',
      scopo: SCOPO_SUSSURRI,
      fa: function (argomenti, ctx, su, chiaveUso) {
        var messaggio = ritaglia(argomenti.slice(1).join(' '), LIMITE_SUSSURRO);

        if (argomenti.length && !messaggio) {
          su('Un sussurro vuoto non lo mando: si scrive ' + chiaveUso + '.');
          return;
        }

        conUtente(argomenti[0], chiaveUso, su, function (nome, id) {
          bussa('POST',
            '/whispers?from_user_id=' + encodeURIComponent(ctx.io) +
            '&to_user_id=' + encodeURIComponent(id),
            { message: messaggio }, 'Fatto: il sussurro è arrivato a ' + nome + '.', su);
        });
      }
    }
  ];

  var TAVOLA = {};
  var ELENCO = [];

  (function () {
    var i;
    for (i = 0; i < COMANDI.length; i++) {
      TAVOLA[COMANDI[i].nome] = COMANDI[i];
      ELENCO.push({ nome: uso(COMANDI[i]), aiuto: COMANDI[i].aiuto });
    }
  }());

  function dettoIgnoto(testo) {
    var riga = ritaglia(testo, 80);

    if (riga.charAt(0) !== '/') {
      return 'Questo non è un comando: i comandi cominciano con la barra, tipo /ban o /slow.';
    }
    return '«' + ritaglia(riga.split(' ')[0], LIMITE_ECO) +
           '» non è un comando che so fare, quindi non lo mando da nessuna parte.';
  }

  function senzaPermesso(voce) {
    return 'Al tuo collegamento manca il permesso che serve per «/' + voce.nome + '». ' +
           'I permessi si chiedono quando si collega l’account, e il tuo è più vecchio di questi comandi: ' +
           'ricollega l’account e torno a poterlo fare.';
  }

  function esegui(testo, contesto, su) {
    if (typeof su !== 'function') { return; }

    var detto = false;

    function rispondi(guaio, riuscito, scollegato) {
      if (detto) { return; }
      detto = true;
      su(guaio || null, riuscito || null, !!scollegato);
    }

    var letto = analizza(testo);
    if (!letto) { rispondi(dettoIgnoto(testo)); return; }

    var voce = TAVOLA[letto.nome];

    var conto = ilConto();
    if (!conto) {
      rispondi('Non trovo la parte che parla con Twitch: senza quella i comandi non li so dare.');
      return;
    }

    var canaleId = String((contesto && contesto.canaleId) || '');
    if (!MODELLO_ID.test(canaleId)) {
      rispondi('Non so ancora in che canale siamo, e non do comandi al buio: riprova fra un attimo.');
      return;
    }

    var io = conto.chi();
    if (!io || !MODELLO_ID.test(String(io.utenteId || ''))) {
      rispondi('Prima devo sapere chi sei: collega il tuo account Twitch e poi i comandi li do a nome tuo.', null, true);
      return;
    }

    if (!conto.puo(voce.scopo)) { rispondi(senzaPermesso(voce)); return; }

    var ctx = {
      canale: String((contesto && contesto.canale) || ''),
      canaleId: canaleId,
      io: String(io.utenteId)
    };

    try {
      voce.fa(letto.argomenti, ctx, rispondi, uso(voce));
    } catch (err) {
      rispondi('Mi sono impigliato mentre facevo «/' + voce.nome + '»: non è partito niente.');
    }
  }

  window.Comandi = {
    ELENCO: ELENCO,
    e: e,
    analizza: analizza,
    esegui: esegui
  };
}());
