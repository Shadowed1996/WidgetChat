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

  function nelLauncher() {
    return !!(window.Menu && window.Menu.dentro && window.Menu.dentro());
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
    nodi.manda.textContent = inVolo ? 'Mando…' : 'Manda';
  }

  function apriTwitch(passo) {
    if (nelLauncher()) {
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

    if (dentro) {
      nodi.campo.placeholder = 'Scrivi come ' + chi.nome;
      cresci();
      vestiManda();
      return;
    }

    vestiInvito();
  }

  function manda() {
    if (inVolo) { return; }

    var testo = window.Conto.ripulisci(nodi.campo.value);
    if (!testo) { return; }

    if (conf.prova) {
      eco('Sono in prova: qui non mando niente in chat davvero.');
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
    });

    nodi.campo.addEventListener('keydown', function (evento) {
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
    nodi.manda = nodi.barra.querySelector('.pollaio__scrivi-manda');
    nodi.resta = nodi.barra.querySelector('.pollaio__scrivi-resta');

    nodi.invito = nodi.barra.querySelector('.pollaio__invito');
    nodi.invitoBtn = nodi.barra.querySelector('.pollaio__invito-btn');

    nodi.eco = nodi.barra.querySelector('.pollaio__eco');

    return !!(nodi.filtri.length && nodi.pausa && nodi.pausaTesto && nodi.attesa &&
              nodi.scrivi && nodi.campo && nodi.manda && nodi.resta &&
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
