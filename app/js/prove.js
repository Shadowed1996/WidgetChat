(function () {
  'use strict';

  const casi = [];
  let gruppoCorrente = '';

  function gruppo(nome) { gruppoCorrente = nome; }

  function prova(titolo, fn) {
    casi.push({ gruppo: gruppoCorrente, titolo: titolo, fn: fn });
  }

  function Fallito(messaggio) { this.messaggio = messaggio; }

  function mostra(v) {
    if (typeof v === 'string') { return '«' + v + '»'; }
    if (v === undefined) { return 'undefined'; }
    if (v === null) { return 'null'; }
    try { return JSON.stringify(v); } catch (err) { return String(v); }
  }

  function uguale(avuto, atteso, nota) {
    if (avuto !== atteso) {
      throw new Fallito((nota ? nota + ' — ' : '') +
        'atteso ' + mostra(atteso) + ', avuto ' + mostra(avuto));
    }
  }

  function vero(condizione, nota) {
    if (!condizione) { throw new Fallito(nota || 'mi aspettavo vero'); }
  }

  function stessiCampi(avuto, atteso, nota) {
    let chiave;
    for (chiave in atteso) {
      if (Object.prototype.hasOwnProperty.call(atteso, chiave)) {
        uguale(avuto ? avuto[chiave] : undefined, atteso[chiave],
          (nota ? nota + '.' : '') + chiave);
      }
    }
  }

  function messaggio(extra) {
    const m = {
      id: '', tipo: 'messaggio', ts: 0, utenteId: '', nick: 'tizio',
      nome: 'Tizio', colore: '', badge: [],
      ruoli: { capo: false, mod: false, vip: false, abbonato: false, artista: false, staff: false, bot: false },
      pezzi: [], bits: 0, risposta: null, primo: false, ritorno: false,
      rilievo: null, evento: null, cancellato: false, msgId: ''
    };
    let chiave;
    for (chiave in (extra || {})) {
      if (Object.prototype.hasOwnProperty.call(extra, chiave)) { m[chiave] = extra[chiave]; }
    }
    return m;
  }

  gruppo('Impostazioni');

  prova('senza parametri si ottengono i predefiniti', function () {
    const v = window.Impostazioni.leggi('');
    uguale(v.tema, 'notte', 'tema');
    uguale(v.spazio, 130, 'spazio');
    uguale(v.velocita, 100, 'velocita');
    uguale(v.prova, false, 'prova');
  });

  prova('un numero fuori scala si ritaglia, non si rifiuta', function () {
    uguale(window.Impostazioni.leggi('scala=9999').scala, 200, 'sopra il massimo');
    uguale(window.Impostazioni.leggi('scala=1').scala, 60, 'sotto il minimo');
  });

  prova('un numero illeggibile torna al predefinito', function () {
    uguale(window.Impostazioni.leggi('scala=ciao').scala, 100);
  });

  prova('i vecchi nomi di «spazio» valgono ancora', function () {
    uguale(window.Impostazioni.leggi('spazio=compatto').spazio, 60, 'compatto');
    uguale(window.Impostazioni.leggi('spazio=normale').spazio, 115, 'normale');
    uguale(window.Impostazioni.leggi('spazio=arioso').spazio, 220, 'arioso');
  });

  prova('un sinonimo inventato non pesca dal prototipo', function () {

    uguale(window.Impostazioni.leggi('spazio=constructor').spazio, 130);
  });

  prova('una bandierina senza «=» vale acceso', function () {
    uguale(window.Impostazioni.leggi('prova').prova, true, 'senza valore');
    uguale(window.Impostazioni.leggi('prova=0').prova, false, 'spenta per esteso');
    uguale(window.Impostazioni.leggi('prova=sì').prova, true, 'con l’accento');
  });

  prova('un elenco si normalizza: minuscolo, senza vuoti, senza doppioni', function () {
    uguale(window.Impostazioni.leggi('bot=Nightbot,+nightbot+,,Moobot').bot, 'nightbot,moobot');
  });

  prova('nel canale si può incollare l’indirizzo di Twitch', function () {
    uguale(window.Impostazioni.leggi('canale=https://twitch.tv/Tizio').canale, 'tizio', 'indirizzo intero');
    uguale(window.Impostazioni.leggi('canale=@Tizio').canale, 'tizio', 'con la chiocciola');
  });

  prova('una percentuale spaiata non ferma la lettura', function () {

    uguale(window.Impostazioni.leggi('%zz=1&scala=120').scala, 120);
  });

  prova('l’indirizzo porta solo ciò che è cambiato', function () {
    uguale(window.Impostazioni.indirizzo(window.Impostazioni.leggi('')), 'pollaio.html');
  });

  prova('una voce nascosta non finisce mai nell’indirizzo', function () {

    const v = window.Impostazioni.leggi('finestra=1&tema=nudo');
    uguale(v.finestra, true, 'letto');

    uguale(window.Impostazioni.indirizzo(v, ''), '?tema=nudo', 'scritto');
  });

  prova('andata e ritorno: quello che esce, rientrando, è lo stesso', function () {
    const partenza = window.Impostazioni.leggi('tema=nudo&scala=140&spazio=220&velocita=60&prova=1');
    const tornato = window.Impostazioni.leggi(window.Impostazioni.indirizzo(partenza, ''));
    stessiCampi(tornato, {
      tema: 'nudo', scala: 140, spazio: 220, velocita: 60, prova: true
    });
  });

  gruppo('Irc');

  prova('una riga nuda si analizza', function () {
    const r = window.Irc.analizza('PING :tmi.twitch.tv');
    uguale(r.comando, 'PING', 'comando');
    uguale(r.parametri, ':tmi.twitch.tv', 'parametri');
    uguale(r.prefisso, '', 'prefisso');
  });

  prova('una riga completa: tag, prefisso, comando, parametri', function () {
    const r = window.Irc.analizza(
      '@display-name=Tizio;mod=1 :tizio!tizio@tizio.tmi.twitch.tv PRIVMSG #slayer_beard :ciao a tutti');
    uguale(r.tag['display-name'], 'Tizio', 'display-name');
    uguale(r.tag.mod, '1', 'mod');
    uguale(r.prefisso, 'tizio!tizio@tizio.tmi.twitch.tv', 'prefisso');
    uguale(r.comando, 'PRIVMSG', 'comando');
    uguale(r.parametri, '#slayer_beard :ciao a tutti', 'parametri');
  });

  prova('un tag senza «=» vale stringa vuota, non true', function () {
    const r = window.Irc.analizza('@solo PING');
    uguale(r.tag.solo, '', 'il valore');
  });

  prova('una riga storta non fa uscire niente di storto', function () {
    uguale(window.Irc.analizza('@senzaspazio'), null, 'tag senza spazio dopo');
  });

  prova('l’unescaping dei tag segue la specifica', function () {
    uguale(window.Irc.disescapa('ciao\\sa\\stutti'), 'ciao a tutti', 'lo spazio');
    uguale(window.Irc.disescapa('a\\:b'), 'a;b', 'il punto e virgola');
    uguale(window.Irc.disescapa('a\\\\b'), 'a\\b', 'la barra');
    uguale(window.Irc.disescapa('senza niente'), 'senza niente', 'il caso normale');
  });

  prova('la barra doppia seguita da «s» non diventa uno spazio', function () {

    uguale(window.Irc.disescapa('\\\\s'), '\\s');
  });

  prova('una barra spaiata in fondo si butta', function () {
    uguale(window.Irc.disescapa('ciao\\'), 'ciao');
  });

  prova('i ritorni a capo non entrano in un tag', function () {
    uguale(window.Irc.disescapa('a\\rb\\nc'), 'abc');
  });

  gruppo('Badge');

  prova('un tag vuoto non produce badge', function () {
    const b = window.Badge.leggi('');
    vero(Array.isArray(b), 'deve essere un elenco');
    uguale(b.length, 0, 'quanti');
  });

  prova('i ruoli si leggono dal tag badges', function () {
    uguale(window.Badge.ruoli('moderator/1', {}).mod, true, 'moderatore');
    uguale(window.Badge.ruoli('broadcaster/1', {}).capo, true, 'il capo');
    uguale(window.Badge.ruoli('vip/1', {}).vip, true, 'vip');
  });

  prova('chi non ha badge non ha ruoli', function () {
    const r = window.Badge.ruoli('', {});
    uguale(r.mod, false, 'mod');
    uguale(r.capo, false, 'capo');
    uguale(r.vip, false, 'vip');
  });

  gruppo('Eventi');

  prova('un msg-id nuovo di Twitch non fa sparire l’evento', function () {

    const e = window.Eventi.leggi({ 'msg-id': 'qualcosadinuovo' }, '');
    vero(e, 'non doveva sparire');
    uguale(e.genere, 'altro', 'genere');
  });

  prova('i msg-id che viaggiano sui PRIVMSG non sono eventi', function () {

    uguale(window.Eventi.leggi({ 'msg-id': 'highlighted-message' }, ''), null);
  });

  prova('un abbonamento diventa un evento', function () {
    const e = window.Eventi.leggi({ 'msg-id': 'sub', 'msg-param-sub-plan': '1000' }, '');
    vero(e, 'deve uscire qualcosa');
    uguale(e.genere, 'abbonamento', 'genere');
  });

  prova('un raid porta con sé quanta gente', function () {
    const e = window.Eventi.leggi({
      'msg-id': 'raid',
      'msg-param-displayName': 'Tizio',
      'msg-param-viewerCount': '42'
    }, '');
    vero(e, 'deve uscire qualcosa');
    uguale(e.genere, 'raid', 'genere');
    uguale(e.quantita, 42, 'quantità');
  });

  prova('CLEARCHAT senza bersaglio svuota tutto', function () {
    const a = window.Eventi.moderazione('CLEARCHAT', {}, '#canale');
    vero(a, 'deve uscire un atto');
    uguale(a.genere, 'svuota', 'genere');
  });

  prova('CLEARMSG cancella un messaggio solo', function () {
    const a = window.Eventi.moderazione('CLEARMSG', { 'target-msg-id': 'abc-123' }, '#canale :ciao');
    vero(a, 'deve uscire un atto');
    uguale(a.genere, 'cancella', 'genere');
    uguale(a.id, 'abc-123', 'id');
  });

  gruppo('Emote');

  prova('il testo semplice resta un pezzo di testo', function () {
    const p = window.Emote.pezzi('ciao a tutti', '', 0);
    uguale(p.length, 1, 'quanti pezzi');
    uguale(p[0].tipo, 'testo', 'tipo');
    uguale(p[0].testo, 'ciao a tutti', 'testo');
  });

  prova('un’emote nativa esce col suo indirizzo https', function () {

    const p = window.Emote.pezzi('Kappa', '25:0-4', 0);
    let trovata = null;
    for (let i = 0; i < p.length; i++) { if (p[i].tipo === 'emote') { trovata = p[i]; } }
    vero(trovata, 'deve esserci un pezzo emote');
    uguale(trovata.nome, 'Kappa', 'nome');
    vero(/^https:\/\//.test(trovata.url), 'l’indirizzo deve essere https, era ' + mostra(trovata.url));
  });

  prova('un indirizzo scritto in chat diventa un link', function () {
    const p = window.Emote.pezzi('guarda twitch.tv/slayer_beard', '', 0);
    let link = null;
    for (let i = 0; i < p.length; i++) { if (p[i].tipo === 'link') { link = p[i]; } }
    vero(link, 'deve esserci un pezzo link');
    vero(/^https?:\/\//.test(link.url), 'con un url vero, era ' + mostra(link.url));
  });

  prova('la punteggiatura attaccata non entra nel link', function () {
    const p = window.Emote.pezzi('vai su twitch.tv/x, poi torna', '', 0);
    let link = null;
    for (let i = 0; i < p.length; i++) { if (p[i].tipo === 'link') { link = p[i]; } }
    vero(link, 'deve esserci un pezzo link');
    vero(link.testo.indexOf(',') === -1, 'la virgola non deve starci: ' + mostra(link.testo));
  });

  gruppo('Emote di Kick');

  prova('l’emote di Kick esce col nome e l’indirizzo del suo CDN', function () {
    const p = window.Emote.pezziKick('ciao [emote:5748035:monkaEyes] a tutti');
    let emote = null;
    for (let i = 0; i < p.length; i++) { if (p[i].tipo === 'emote') { emote = p[i]; } }
    vero(emote, 'deve esserci un pezzo emote');
    uguale(emote.nome, 'monkaEyes', 'nome');
    uguale(emote.url, 'https://files.kick.com/emotes/5748035/fullsize', 'indirizzo');
    uguale(emote.fonte, 'kick', 'fonte');
  });

  prova('il testo intorno all’emote non si perde', function () {
    const p = window.Emote.pezziKick('prima [emote:1:x] dopo');
    let testo = '';
    for (let i = 0; i < p.length; i++) { if (p[i].tipo === 'testo') { testo += p[i].testo; } }
    vero(testo.indexOf('prima') !== -1, 'manca «prima»: ' + mostra(testo));
    vero(testo.indexOf('dopo') !== -1, 'manca «dopo»: ' + mostra(testo));
  });

  prova('due emote di fila escono tutte e due', function () {
    const p = window.Emote.pezziKick('[emote:1:uno][emote:2:due]');
    let quante = 0;
    for (let i = 0; i < p.length; i++) { if (p[i].tipo === 'emote') { quante++; } }
    uguale(quante, 2, 'quante emote');
  });

  prova('una sintassi storta resta testo, non diventa un indirizzo', function () {

    const p = window.Emote.pezziKick('[emote:abc:finta] e [emote:] e [emote');
    for (let i = 0; i < p.length; i++) {
      uguale(p[i].tipo === 'emote', false, 'il pezzo ' + i + ' non doveva essere un’emote');
    }
  });

  prova('i link dentro un messaggio Kick si accendono come su Twitch', function () {

    const p = window.Emote.pezziKick('guarda twitch.tv/slayer_beard [emote:1:x]');
    let link = null;
    for (let i = 0; i < p.length; i++) { if (p[i].tipo === 'link') { link = p[i]; } }
    vero(link, 'deve esserci un pezzo link');
  });

  gruppo('YouTube');

  prova('l’id si estrae dai tre indirizzi che YouTube usa', function () {
    uguale(window.Youtube.idVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ', 'watch');
    uguale(window.Youtube.idVideo('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ', 'youtu.be');
    uguale(window.Youtube.idVideo('https://www.youtube.com/live/dQw4w9WgXcQ'), 'dQw4w9WgXcQ', 'live');
  });

  prova('l’id nudo passa così com’è', function () {
    uguale(window.Youtube.idVideo('dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });

  prova('le maiuscole dell’id NON si toccano', function () {

    uguale(window.Youtube.idVideo('AbCdEfGhIjK'), 'AbCdEfGhIjK');
  });

  prova('quello che non è un id non diventa un id', function () {
    uguale(window.Youtube.idVideo(''), '', 'vuoto');
    uguale(window.Youtube.idVideo('ciao'), '', 'troppo corto');
    uguale(window.Youtube.idVideo('https://www.youtube.com/@unhandle'), '', 'un handle non è un video');
  });

  prova('un id lungo dentro una frase non viene pescato a caso', function () {

    uguale(window.Youtube.idVideo('questaeunafraselunghissima'), '');
  });

  gruppo('Rilievo');

  prova('un messaggio qualunque non si accende', function () {
    window.Rilievo.imposta({ canale: 'slayer_beard', parole: '', menzioni: true, primo: true });
    const r = window.Rilievo.valuta(messaggio({ pezzi: [{ tipo: 'testo', testo: 'ok' }] }));
    vero(!r || !r.livello, 'non doveva uscire nessun livello, è uscito ' + mostra(r));
  });

  prova('il riscatto coi punti canale è il livello alto', function () {
    window.Rilievo.imposta({ canale: 'slayer_beard', parole: '', menzioni: true, primo: true });
    const r = window.Rilievo.valuta(messaggio({
      msgId: 'highlighted-message',
      pezzi: [{ tipo: 'testo', testo: 'guardate qui' }]
    }));
    vero(r, 'deve uscire un giudizio');
    uguale(r.livello, 3, 'livello');
  });

  prova('i bits salgono di livello alle soglie giuste', function () {
    window.Rilievo.imposta({ canale: 'slayer_beard', parole: '', menzioni: true, primo: true });
    uguale(window.Rilievo.valuta(messaggio({ bits: 1000 })).livello, 3, 'da mille in su');
    uguale(window.Rilievo.valuta(messaggio({ bits: 100 })).livello, 2, 'da cento in su');
  });

  prova('un moderatore che scrive «ok» non è una cosa importante', function () {

    window.Rilievo.imposta({ canale: 'slayer_beard', parole: '', menzioni: true, primo: true });
    const m = messaggio({ pezzi: [{ tipo: 'testo', testo: 'ok' }] });
    m.ruoli.mod = true;
    const r = window.Rilievo.valuta(m);
    vero(!r || !r.livello, 'non doveva accendersi, è uscito ' + mostra(r));
  });

  prova('il primo messaggio di sempre si accende piano', function () {
    window.Rilievo.imposta({ canale: 'slayer_beard', parole: '', menzioni: true, primo: true });
    const r = window.Rilievo.valuta(messaggio({ primo: true, pezzi: [{ tipo: 'testo', testo: 'ciao' }] }));
    vero(r, 'deve uscire un giudizio');
    uguale(r.livello, 1, 'livello');
  });

  function esegui() {
    const esiti = [];
    let passati = 0;
    let falliti = 0;
    let rotti = 0;

    for (let i = 0; i < casi.length; i++) {
      const caso = casi[i];
      let stato = 'passato';
      let dettaglio = '';

      try {
        caso.fn();
        passati++;
      } catch (err) {
        if (err instanceof Fallito) {
          stato = 'fallito';
          dettaglio = err.messaggio;
          falliti++;
        } else {

          stato = 'rotto';
          dettaglio = (err && err.message) ? err.message : String(err);
          rotti++;
        }
      }

      esiti.push({ gruppo: caso.gruppo, titolo: caso.titolo, stato: stato, dettaglio: dettaglio });
    }

    return { esiti: esiti, passati: passati, falliti: falliti, rotti: rotti, totale: casi.length };
  }

  function crea(tag, classe, testo) {
    const el = document.createElement(tag);
    if (classe) { el.className = classe; }
    if (testo != null) { el.textContent = testo; }
    return el;
  }

  function disegna(esito) {
    const dove = document.getElementById('esito');
    const sommario = document.getElementById('sommario');
    if (!dove || !sommario) { return; }

    while (dove.firstChild) { dove.removeChild(dove.firstChild); }

    const tutto = esito.falliti === 0 && esito.rotti === 0;
    sommario.setAttribute('data-stato', tutto ? 'bene' : 'male');
    sommario.textContent = tutto
      ? 'Tutte e ' + esito.totale + ' a posto.'
      : esito.passati + ' a posto, ' + esito.falliti + ' sbagliate, ' +
        esito.rotti + ' rotte, su ' + esito.totale + '.';

    let gruppoStampato = '';
    for (let i = 0; i < esito.esiti.length; i++) {
      const e = esito.esiti[i];

      if (e.gruppo !== gruppoStampato) {
        gruppoStampato = e.gruppo;
        dove.appendChild(crea('h2', 'prove__gruppo', e.gruppo));
      }

      const riga = crea('li', 'prove__caso');
      riga.setAttribute('data-stato', e.stato);
      riga.appendChild(crea('span', 'prove__segno',
        e.stato === 'passato' ? '·' : (e.stato === 'fallito' ? '×' : '!')));
      riga.appendChild(crea('span', 'prove__titolo-caso', e.titolo));
      if (e.dettaglio) { riga.appendChild(crea('p', 'prove__dettaglio', e.dettaglio)); }
      dove.appendChild(riga);
    }
  }

  window.Prove = {
    esegui: esegui,
    quanti: function () { return casi.length; }
  };

  if (typeof document !== 'undefined' && document.getElementById) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { disegna(esegui()); });
    } else {
      disegna(esegui());
    }
  }

}());
