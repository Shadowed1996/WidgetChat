(function () {
  'use strict';

  var PIATTAFORME = ['twitch', 'kick', 'youtube'];

  var DURATA_ECO = 7000;

  var RIGHE_MAX = 4;

  var RESTA_DA = 100;

  var conf = {
    canale: '',
    prova: false,
    scrivi: true,
    verso: 'su',
    comandi: true,
    piattaforme: []
  };

  var nodi = {};

  var acceso = false;
  var inVolo = false;
  var inCorso = false;
  var timerEco = null;

  function inObs() {
    try { return !!window.obsstudio; }
    catch (err) { return false; }
  }

  function eco(testo, guaio) {
    if (!nodi.eco) { return; }

    nodi.eco.textContent = String(testo || '');
    nodi.eco.classList.toggle('is-guaio', !!guaio);

    clearTimeout(timerEco);
    if (!testo) { return; }

    timerEco = setTimeout(function () {
      nodi.eco.textContent = '';
      nodi.eco.classList.remove('is-guaio');
    }, DURATA_ECO);
  }

  function vestiFiltri(scelto) {
    var i;
    for (i = 0; i < nodi.filtri.length; i++) {
      var suo = nodi.filtri[i].getAttribute('data-filtro') === scelto;
      nodi.filtri[i].setAttribute('aria-pressed', suo ? 'true' : 'false');
      nodi.filtri[i].classList.toggle('is-scelto', suo);
    }
  }

  function scegli(nome) {
    vestiFiltri(window.Resa.filtro(nome));
  }

  function vestiPausa() {
    var ferma = window.Resa.inPausa();

    nodi.pausa.setAttribute('aria-pressed', ferma ? 'true' : 'false');
    nodi.pausa.classList.toggle('is-scelto', ferma);
    nodi.pausaTesto.textContent = ferma ? 'Riparti' : 'Ferma';
    nodi.pausa.title = ferma
      ? 'Fai ripartire la chat'
      : 'Ferma la chat: quello che c’è resta lì';
  }

  function vestiAttesa(quanti, ferma) {
    if (!nodi.attesa) { return; }

    if (!ferma || quanti < 1) {
      nodi.attesa.hidden = true;
      nodi.attesa.textContent = '';
      return;
    }

    nodi.attesa.hidden = false;
    nodi.attesa.textContent = quanti === 1
      ? '1 messaggio in attesa — riparti'
      : quanti + ' messaggi in attesa — riparti';
  }

  function alterna() {
    window.Resa.pausa(!window.Resa.inPausa());
    vestiPausa();
    vestiAttesa(window.Resa.inAttesa(), window.Resa.inPausa());
  }

  function cresci() {
    if (!nodi.campo || nodi.scrivi.hidden) { return; }

    nodi.campo.style.blockSize = 'auto';

    var riga = parseFloat(getComputedStyle(nodi.campo).lineHeight);
    if (!isFinite(riga) || riga <= 0) { riga = 20; }

    var una = Math.round(riga) + 16;
    var tetto = Math.round(riga * RIGHE_MAX) + 16;

    nodi.campo.style.blockSize =
      Math.max(una, Math.min(nodi.campo.scrollHeight, tetto)) + 'px';
  }

  function vestiResta() {
    if (!nodi.resta) { return; }

    var restano = window.Conto.LIMITE - Array.from(String(nodi.campo.value || '')).length;

    if (restano > RESTA_DA) {
      nodi.resta.textContent = '';
      nodi.resta.hidden = true;
      return;
    }

    nodi.resta.hidden = false;
    nodi.resta.textContent = String(restano);
    nodi.resta.classList.toggle('is-stretto', restano <= 20);
  }

  function vestiManda() {
    if (!nodi.manda) { return; }

    var vuoto = window.Conto.ripulisci(nodi.campo.value) === '';
    nodi.manda.disabled = inVolo || vuoto;
    nodi.manda.textContent = inVolo ? 'Invio…' : 'Invia';
  }

  function nellaVetrina() {
    return !!(window.Menu && window.Menu.nellaVetrina && window.Menu.nellaVetrina());
  }

  function apriTwitch(passo) {
    if (nellaVetrina()) {
      window.Menu.comanda('attiva:' + passo.codice);
      return true;
    }
    return !!window.open(passo.indirizzo, '_blank');
  }

  function vestiInvito() {
    nodi.invitoBtn.disabled = inCorso;
    nodi.invitoBtn.textContent = inCorso ? 'Sto aspettando…' : 'Connetti account';
  }

  function connetti() {
    if (inCorso) { return; }

    if (conf.prova) {
      eco('Sono in prova: qui non collego niente per davvero.');
      return;
    }

    if (window.Conto.serveClientId()) {
      eco('Prima devo sapere con quale applicazione presentarmi a Twitch: si fa una volta sola, in cima alla regia.', true);
      return;
    }

    inCorso = true;
    vestiInvito();
    eco('Chiedo il codice a Twitch.');

    window.Conto.chiedi('', function (passo) {
      if (passo.fase === 'codice') {
        eco(apriTwitch(passo)
          ? 'Ti ho aperto Twitch: di’ di sì e torniamo qui. Il codice è ' + passo.codice + '.'
          : 'Vai su twitch.tv/activate e scrivi ' + passo.codice + '.');
        return;
      }

      inCorso = false;
      vestiInvito();

      if (passo.fase === 'fatto') {
        vestiConto();
        eco('Fatto: adesso scrivo a nome tuo.');
        return;
      }
      eco(passo.detto, true);
    });
  }

  var SUGGERITE = 8;

  var TROVA_CHIAVE = /(?:^|\s):([A-Za-z0-9_+-]*)$/;

  var suggerite = [];
  var scelta = -1;

  function chiaveSottoIlCursore() {
    var fine = nodi.campo.selectionStart;
    if (typeof fine !== 'number') { return null; }

    var trovato = TROVA_CHIAVE.exec(nodi.campo.value.slice(0, fine));
    if (!trovato) { return null; }

    return { chiave: trovato[1], inizio: fine - trovato[1].length - 1, fine: fine };
  }

  function chiudiSuggeriti() {
    if (!nodi.suggeriti || nodi.suggeriti.hidden) { return; }

    nodi.suggeriti.hidden = true;
    nodi.suggeriti.textContent = '';
    suggerite = [];
    scelta = -1;
  }

  function vestiScelta() {
    var voci = nodi.suggeriti.children;
    var i;

    for (i = 0; i < voci.length; i++) {
      var sua = i === scelta;
      voci[i].classList.toggle('is-scelta', sua);
      voci[i].setAttribute('aria-selected', sua ? 'true' : 'false');
    }
  }

  function metti(voce) {
    var dove = chiaveSottoIlCursore();
    if (!dove || !voce) { chiudiSuggeriti(); return; }

    var testo = nodi.campo.value;
    var dopo = testo.slice(dove.fine);
    var spazio = dopo.charAt(0) === ' ' ? '' : ' ';

    nodi.campo.value = testo.slice(0, dove.inizio) + voce.nome + spazio + dopo;

    var cursore = dove.inizio + voce.nome.length + spazio.length;
    nodi.campo.setSelectionRange(cursore, cursore);

    chiudiSuggeriti();
    cresci();
    vestiResta();
    vestiManda();
    nodi.campo.focus();
  }

  function disegnaSuggeriti(voci) {
    nodi.suggeriti.textContent = '';

    var i;
    for (i = 0; i < voci.length; i++) {
      (function (voce, posto) {
        var riga = document.createElement('li');
        riga.className = 'pollaio__suggerito';
        riga.setAttribute('role', 'option');
        riga.setAttribute('aria-selected', 'false');

        if (/^https:\/\//.test(voce.url)) {
          var img = document.createElement('img');
          img.className = 'pollaio__suggerito-img';
          img.setAttribute('src', voce.url);
          img.setAttribute('alt', '');
          img.setAttribute('decoding', 'async');
          riga.appendChild(img);
        }

        var nome = document.createElement('span');
        nome.className = 'pollaio__suggerito-nome';
        nome.textContent = voce.nome;
        riga.appendChild(nome);

        riga.addEventListener('mousedown', function (evento) {
          evento.preventDefault();
          metti(voce);
        });

        riga.addEventListener('mouseenter', function () {
          scelta = posto;
          vestiScelta();
        });

        nodi.suggeriti.appendChild(riga);
      }(voci[i], i));
    }

    nodi.suggeriti.hidden = false;
    scelta = 0;
    vestiScelta();
  }

  function suggerisci() {
    if (!nodi.suggeriti || !window.Emote || !window.Emote.cerca) { return; }

    var dove = chiaveSottoIlCursore();
    if (!dove || !dove.chiave) { chiudiSuggeriti(); return; }

    var trovate;
    try { trovate = window.Emote.cerca(dove.chiave, SUGGERITE); }
    catch (err) { trovate = []; }

    if (!trovate.length) { chiudiSuggeriti(); return; }

    suggerite = trovate;
    disegnaSuggeriti(trovate);
  }

  function tastiSuggeriti(evento) {
    if (!nodi.suggeriti || nodi.suggeriti.hidden || !suggerite.length) { return false; }

    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      scelta += evento.key === 'ArrowDown' ? 1 : -1;
      if (scelta < 0) { scelta = suggerite.length - 1; }
      if (scelta >= suggerite.length) { scelta = 0; }
      vestiScelta();
      return true;
    }

    if (evento.key === 'Enter' || evento.key === 'Tab') {
      evento.preventDefault();
      metti(suggerite[scelta] || suggerite[0]);
      return true;
    }

    if (evento.key === 'Escape') {
      evento.preventDefault();
      chiudiSuggeriti();
      return true;
    }

    return false;
  }

  var MODI = {
    poll: {
      comando: 'poll', scopo: 'channel:manage:polls',
      titolo: 60, scelta: 25, min: 2, max: 5,
      durata: 120, durataMin: 15, durataMax: 1800,
      domanda: 'La domanda', come: 'Scelta', crea: 'Apri il sondaggio',
      vuoto: 'Servono almeno due scelte: un sondaggio con una risposta sola non è un sondaggio.'
    },
    prediction: {
      comando: 'prediction', scopo: 'channel:manage:predictions',
      titolo: 45, scelta: 25, min: 2, max: 10,
      durata: 120, durataMin: 1, durataMax: 1800,
      domanda: 'Su cosa si scommette', come: 'Esito', crea: 'Apri il pronostico',
      vuoto: 'Servono almeno due esiti: su un esito solo non si scommette.'
    }
  };

  var modo = MODI.poll;

  function scelteVive() {
    return nodi.sondaggioScelte.querySelectorAll('.pollaio__sondaggio-scelta');
  }

  function aggiungiScelta() {
    var quante = scelteVive().length;
    if (quante >= modo.max) { return; }

    var campo = document.createElement('input');
    campo.type = 'text';
    campo.className = 'pollaio__sondaggio-campo pollaio__sondaggio-scelta';
    campo.maxLength = modo.scelta;
    campo.autocomplete = 'off';
    campo.placeholder = modo.come + ' ' + (quante + 1);
    campo.setAttribute('aria-label', modo.come + ' ' + (quante + 1));

    nodi.sondaggioScelte.appendChild(campo);
    nodi.sondaggioPiu.disabled = scelteVive().length >= modo.max;
    return campo;
  }

  function svuotaSondaggio() {
    nodi.sondaggioDomanda.value = '';
    nodi.sondaggioScelte.textContent = '';

    nodi.sondaggioDomanda.maxLength = modo.titolo;
    nodi.sondaggioDomanda.placeholder = modo.domanda;

    nodi.sondaggioDurata.min = String(modo.durataMin);
    nodi.sondaggioDurata.max = String(modo.durataMax);
    nodi.sondaggioDurata.value = String(modo.durata);

    nodi.sondaggioCrea.textContent = modo.crea;
    nodi.sondaggioPiu.textContent = 'Aggiungi ' + modo.come.toLowerCase();

    var i;
    for (i = 0; i < modo.min; i++) { aggiungiScelta(); }
    nodi.sondaggioPiu.disabled = false;
  }

  function vestiApri() {
    var aperto = !nodi.sondaggio.hidden;
    var i;

    for (i = 0; i < nodi.sondaggioApri.length; i++) {
      var suo = aperto && nodi.sondaggioApri[i].getAttribute('data-modo') === modo.comando;
      nodi.sondaggioApri[i].setAttribute('aria-expanded', suo ? 'true' : 'false');
      nodi.sondaggioApri[i].classList.toggle('is-scelto', suo);
    }
  }

  function alternaSondaggio(quale) {
    var voluto = MODI[quale] || modo;

    if (nodi.sondaggio.hidden || voluto !== modo) {
      modo = voluto;
      nodi.sondaggio.hidden = false;
      svuotaSondaggio();
      vestiApri();
      nodi.sondaggioDomanda.focus();
      return;
    }

    nodi.sondaggio.hidden = true;
    vestiApri();
  }

  function creaSondaggio(evento) {
    evento.preventDefault();
    if (inVolo) { return; }

    if (conf.prova) {
      eco('Sono in prova: qui non apro niente per davvero.');
      return;
    }

    var domanda = nodi.sondaggioDomanda.value.replace(/\s+/g, ' ').trim();
    if (!domanda) {
      eco('Mi manca la domanda.', true);
      nodi.sondaggioDomanda.focus();
      return;
    }

    var campi = scelteVive();
    var scelte = [];
    var i;

    for (i = 0; i < campi.length; i++) {
      var testo = campi[i].value.replace(/\s+/g, ' ').trim();
      if (testo) { scelte.push(testo); }
    }

    if (scelte.length < modo.min) {
      eco(modo.vuoto, true);
      return;
    }

    if (domanda.indexOf('|') !== -1) {
      eco('Nella domanda non ci può stare una barra verticale: è quella che separa le scelte.', true);
      return;
    }

    var durata = parseInt(nodi.sondaggioDurata.value, 10);
    if (!isFinite(durata)) { durata = 120; }

    var riga = '/' + modo.comando + ' ' + domanda + ' | ' + scelte.join(' | ') + ' / ' + durata;

    if (!canaleId) {
      eco('Non so ancora l’id del canale: un attimo e riprova.', true);
      return;
    }

    inVolo = true;
    eco('Lo chiedo a Twitch.');

    window.Comandi.esegui(riga, { canale: conf.canale, canaleId: canaleId },
      function (guaio, detto) {
        inVolo = false;

        if (guaio) { eco(guaio, true); return; }

        svuotaSondaggio();
        alternaSondaggio(modo.comando);
        eco(detto || 'Fatto.');
      });
  }

  var SCOMPARTI = [
    { chiave: 'streamer', titolo: 'Streamer' },
    { chiave: 'moderatori', titolo: 'Moderatori' },
    { chiave: 'vip', titolo: 'VIP' },
    { chiave: 'utenti', titolo: 'Utenti' }
  ];

  function scriviConta(stato) {
    var pezzi = [];

    if (stato.inChat > 0) { pezzi.push(stato.inChat + ' in chat'); }
    if (stato.spettatori > 0) { pezzi.push(stato.spettatori + ' guardano'); }
    else if (stato.spettatori === -1) { pezzi.push('canale spento'); }

    nodi.genteConta.textContent = pezzi.length ? pezzi.join(' · ') : 'Chi c’è';
  }

  function disegnaLista(stato) {
    nodi.listaScomparti.textContent = '';
    nodi.listaEco.textContent = stato.guaio || '';

    var i;
    for (i = 0; i < SCOMPARTI.length; i++) {
      var quale = SCOMPARTI[i];
      var gente = stato[quale.chiave] || [];
      if (!gente.length) { continue; }

      var scomparto = document.createElement('div');
      scomparto.className = 'pollaio__lista-scomparto';
      scomparto.setAttribute('data-chi', quale.chiave);

      var titolo = document.createElement('p');
      titolo.className = 'pollaio__lista-titolo';
      titolo.textContent = quale.titolo + ' · ' + gente.length;
      scomparto.appendChild(titolo);

      var nomi = document.createElement('ul');
      nomi.className = 'pollaio__lista-nomi';

      var k;
      for (k = 0; k < gente.length; k++) {
        var voce = document.createElement('li');
        voce.className = 'pollaio__lista-nome';
        voce.textContent = gente[k].nome || gente[k].nick;
        if (gente[k].nick) { voce.setAttribute('data-nick', gente[k].nick); }
        nomi.appendChild(voce);
      }

      scomparto.appendChild(nomi);
      nodi.listaScomparti.appendChild(scomparto);
    }

    if (!nodi.listaScomparti.children.length && !nodi.listaEco.textContent) {
      nodi.listaEco.textContent = 'Non c’è ancora nessuno da mostrare.';
    }
  }

  var ultimaGente = null;
  var genteAvviata = false;

  function avviaGente() {
    if (genteAvviata || conf.prova) { return; }
    if (!window.Conto.collegato()) { return; }

    genteAvviata = true;

    window.Conto.canale(conf.canale, function (guaio, id) {
      if (guaio || !id) { genteAvviata = false; return; }

      canaleId = id;
      prendiLeMie(id);
      if (window.Azioni && window.Azioni.canale) { window.Azioni.canale(id); }

      if (!window.Gente || !window.Gente.avvia) { return; }

      window.Gente.avvia({
        canale: conf.canale,
        canaleId: id,
        visibile: function () { return !nodi.lista.hidden; },
        su: vestiGente
      });
    });
  }

  function prendiLeMie(id) {
    if (!window.Emote || !window.Emote.aggiungiTwitch) { return; }
    if (!window.Conto.puo('user:read:emotes')) { return; }

    var chi = window.Conto.chi();
    if (!chi || !chi.utenteId) { return; }

    window.Conto.verso('GET',
      '/chat/emotes/user?user_id=' + encodeURIComponent(chi.utenteId) +
      '&broadcaster_id=' + encodeURIComponent(id),
      null,
      function (guaio, dati) {
        if (guaio || !dati) { return; }
        window.Emote.aggiungiTwitch(dati.data);
      });
  }

  function vestiGente(stato) {
    if (!nodi.gente || !stato) { return; }

    ultimaGente = stato;
    nodi.gente.hidden = false;
    scriviConta(stato);

    if (!nodi.lista.hidden) { disegnaLista(stato); }
  }

  function alternaLista() {
    var apri = nodi.lista.hidden;

    nodi.lista.hidden = !apri;
    nodi.genteBottone.setAttribute('aria-expanded', apri ? 'true' : 'false');

    if (!apri) { return; }

    disegnaLista(ultimaGente || { guaio: 'Sto chiedendo a Twitch chi c’è.' });
    if (window.Gente && window.Gente.aggiorna) { window.Gente.aggiorna(); }
  }

  function vestiConto() {
    if (!conf.scrivi) {
      nodi.scrivi.hidden = true;
      nodi.invito.hidden = true;
      return;
    }

    var chi = window.Conto.chi();
    var dentro = window.Conto.collegato();

    nodi.scrivi.hidden = !dentro;
    nodi.invito.hidden = dentro;

    if (nodi.sondaggioApri && nodi.sondaggioApri.length) {
      var q;
      var nessuno = true;

      for (q = 0; q < nodi.sondaggioApri.length; q++) {
        var quale = nodi.sondaggioApri[q].getAttribute('data-modo');
        var suo = dentro && window.Conto.puo(MODI[quale].scopo);
        nodi.sondaggioApri[q].hidden = !suo;
        if (suo) { nessuno = false; }
      }

      if (nessuno && !nodi.sondaggio.hidden) {
        nodi.sondaggio.hidden = true;
        vestiApri();
      }
    }

    if (dentro) {
      nodi.campo.placeholder = 'Scrivi come ' + chi.nome;
      avviaGente();
      cresci();
      vestiManda();
      return;
    }

    vestiInvito();
  }

  var canaleId = '';

  function svuotaCampo() {
    nodi.campo.value = '';
    cresci();
    vestiResta();
    vestiManda();
    nodi.campo.focus();
  }

  function esegui(testo) {
    if (!canaleId) {
      eco('Non so ancora l’id del canale: un attimo e riprova.', true);
      return;
    }

    inVolo = true;
    vestiManda();
    eco('Lo chiedo a Twitch.');

    window.Comandi.esegui(testo, { canale: conf.canale, canaleId: canaleId },
      function (guaio, detto) {
        inVolo = false;
        vestiManda();

        if (guaio) { eco(guaio, true); return; }

        svuotaCampo();
        eco(detto || 'Fatto.');
      });
  }

  function manda() {
    if (inVolo) { return; }

    var testo = window.Conto.ripulisci(nodi.campo.value);
    if (!testo) { return; }

    if (conf.prova) {
      eco('Sono in prova: qui non mando niente in chat davvero.');
      return;
    }

    if (testo.charAt(0) === '/') {
      if (window.Comandi && window.Comandi.e(testo)) { esegui(testo); return; }

      eco('Questo comando non lo conosco, e non lo mando: Twitch da questa strada ' +
          'i comandi non li esegue, li scrive, e «' + testo.split(' ')[0] + '» ' +
          'finirebbe in chat in chiaro davanti a tutti.', true);
      return;
    }

    inVolo = true;
    vestiManda();
    eco('');

    window.Conto.manda({ canale: conf.canale, testo: testo }, function (guaio, fatto, scollegato) {
      inVolo = false;

      if (guaio) {
        vestiManda();
        eco(guaio, true);
        if (scollegato) { vestiConto(); }
        return;
      }

      nodi.campo.value = '';
      cresci();
      vestiResta();
      vestiManda();
      nodi.campo.focus();

      if (conf.comandi && testo.charAt(0) === '!') {
        eco('Mandato. Qui non lo vedi comparire: i messaggi che iniziano per «!» li nascondo.');
      }
    });
  }

  function ascoltaScrivi() {
    nodi.scrivi.addEventListener('submit', function (evento) {
      evento.preventDefault();
      manda();
    });

    nodi.campo.addEventListener('input', function () {
      cresci();
      vestiResta();
      vestiManda();
      suggerisci();
    });

    nodi.campo.addEventListener('blur', chiudiSuggeriti);

    nodi.campo.addEventListener('keydown', function (evento) {
      if (tastiSuggeriti(evento)) { return; }

      if (evento.key === 'Enter' && !evento.shiftKey) {
        evento.preventDefault();
        manda();
        return;
      }
      if (evento.key === 'Escape' && nodi.campo.value !== '') {
        evento.preventDefault();
        nodi.campo.value = '';
        cresci();
        vestiResta();
        vestiManda();
      }
    });

    nodi.invitoBtn.addEventListener('click', connetti);
  }

  function ascoltaRotella() {
    var elenco = nodi.radice.querySelector('.pollaio__elenco');
    if (!elenco) { return; }

    elenco.addEventListener('wheel', function (evento) {
      if (window.Resa.inPausa()) { return; }

      var indietro = conf.verso === 'giu' ? evento.deltaY > 0 : evento.deltaY < 0;
      if (!indietro) { return; }

      window.Resa.pausa(true);
      vestiPausa();
      vestiAttesa(window.Resa.inAttesa(), true);
      eco('Ho fermato la chat perché sei tornato indietro.');
    }, { passive: true });
  }

  function ascoltaConto() {
    window.addEventListener('storage', function (evento) {
      if (evento.key && evento.key !== 'sb-pollaio-conto') { return; }
      window.Conto.rileggi();
      vestiConto();
    });
  }

  function agganciaNodi(radice) {
    nodi.radice = radice;
    nodi.barra = radice.querySelector('.pollaio__barra');
    if (!nodi.barra) { return false; }

    nodi.filtri = nodi.barra.querySelectorAll('.pollaio__filtro');
    nodi.pausa = nodi.barra.querySelector('.pollaio__pausa');
    nodi.pausaTesto = nodi.barra.querySelector('.pollaio__pausa-testo');
    nodi.attesa = nodi.barra.querySelector('.pollaio__attesa');

    nodi.scrivi = nodi.barra.querySelector('.pollaio__scrivi');
    nodi.campo = nodi.barra.querySelector('.pollaio__scrivi-campo');
    nodi.suggeriti = nodi.barra.querySelector('.pollaio__suggeriti');

    nodi.sondaggio = nodi.barra.querySelector('.pollaio__sondaggio');
    nodi.sondaggioApri = nodi.barra.querySelectorAll('.pollaio__sondaggio-apri');
    nodi.sondaggioCrea = nodi.barra.querySelector('.pollaio__sondaggio-crea');
    nodi.sondaggioDomanda = nodi.barra.querySelector('.pollaio__sondaggio-domanda');
    nodi.sondaggioScelte = nodi.barra.querySelector('.pollaio__sondaggio-scelte');
    nodi.sondaggioPiu = nodi.barra.querySelector('.pollaio__sondaggio-piu');
    nodi.sondaggioDurata = nodi.barra.querySelector('.pollaio__sondaggio-durata input');

    nodi.gente = radice.querySelector('.pollaio__gente');
    nodi.genteBottone = radice.querySelector('.pollaio__gente-bottone');
    nodi.genteConta = radice.querySelector('.pollaio__gente-conta');
    nodi.lista = radice.querySelector('.pollaio__lista');
    nodi.listaEco = radice.querySelector('.pollaio__lista-eco');
    nodi.listaScomparti = radice.querySelector('.pollaio__lista-scomparti');
    nodi.manda = nodi.barra.querySelector('.pollaio__scrivi-manda');
    nodi.resta = nodi.barra.querySelector('.pollaio__scrivi-resta');

    nodi.invito = nodi.barra.querySelector('.pollaio__invito');
    nodi.invitoBtn = nodi.barra.querySelector('.pollaio__invito-btn');

    nodi.eco = nodi.barra.querySelector('.pollaio__eco');

    return !!(nodi.filtri.length && nodi.pausa && nodi.pausaTesto && nodi.attesa &&
              nodi.scrivi && nodi.campo && nodi.manda && nodi.resta && nodi.suggeriti &&
              nodi.invito && nodi.invitoBtn && nodi.eco);
  }

  function preparaFiltri() {
    var i;

    for (i = 0; i < nodi.filtri.length; i++) {
      var quale = nodi.filtri[i].getAttribute('data-filtro');

      if (PIATTAFORME.indexOf(quale) !== -1) {
        nodi.filtri[i].hidden = conf.piattaforme.indexOf(quale) === -1;
      }

      (function (bottone) {
        bottone.addEventListener('click', function () {
          scegli(bottone.getAttribute('data-filtro'));
        });
      }(nodi.filtri[i]));
    }
  }

  function monta(radice, opzioni) {
    if (acceso || !radice) { return false; }
    if (!window.Resa || !window.Conto) { return false; }

    var o = opzioni || {};
    conf.canale = String(o.canale || '');
    conf.prova = !!o.prova;
    conf.scrivi = o.scrivi !== false;
    conf.verso = o.verso === 'giu' ? 'giu' : 'su';
    conf.comandi = o.comandi !== false;
    conf.piattaforme = Array.isArray(o.piattaforme) ? o.piattaforme : [];

    if (!agganciaNodi(radice)) { return false; }

    if (!o.barra || inObs()) {
      nodi.barra.hidden = true;
      return false;
    }

    acceso = true;
    nodi.barra.hidden = false;

    preparaFiltri();
    vestiFiltri(window.Resa.qualeFiltro());
    vestiPausa();

    nodi.pausa.addEventListener('click', alterna);

    if (nodi.genteBottone) { nodi.genteBottone.addEventListener('click', alternaLista); }

    if (nodi.sondaggioApri.length) {
      var b;
      for (b = 0; b < nodi.sondaggioApri.length; b++) {
        (function (bottone) {
          bottone.addEventListener('click', function () {
            alternaSondaggio(bottone.getAttribute('data-modo'));
          });
        }(nodi.sondaggioApri[b]));
      }

      nodi.sondaggioPiu.addEventListener('click', aggiungiScelta);
      nodi.sondaggio.addEventListener('submit', creaSondaggio);
      svuotaSondaggio();
    }

    if (window.Azioni && window.Azioni.monta && !conf.prova) {
      window.Azioni.monta(nodi.radice, {
        canale: conf.canale,
        canaleId: canaleId,
        su: eco,
        scrivi: function (riga) {
          if (nodi.scrivi.hidden) { return; }
          nodi.campo.value = riga;
          nodi.campo.setSelectionRange(riga.length, riga.length);
          cresci();
          vestiResta();
          vestiManda();
          nodi.campo.focus();
        }
      });
    }
    nodi.attesa.addEventListener('click', alterna);

    window.Resa.suAttesa(vestiAttesa);
    window.Resa.imposta({ scorre: true });

    ascoltaRotella();

    if (conf.scrivi) {
      ascoltaScrivi();
      ascoltaConto();
      vestiConto();
      cresci();
    } else {
      nodi.scrivi.hidden = true;
      nodi.invito.hidden = true;
    }

    return true;
  }

  window.Barra = {
    monta: monta,
    accesa: function () { return acceso; },
    vestiConto: vestiConto
  };
}());
