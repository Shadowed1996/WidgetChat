(function () {
  'use strict';

  var ATTESA_SICURO = 4000;

  var MODELLO_NICK = /^[a-z0-9_]{1,25}$/;

  var VOCI = [
    { testo: 'Sussurra', riga: 'w', campo: true },
    { testo: 'Shoutout', riga: 'shoutout', scopo: 'moderator:manage:shoutouts', staccata: true },
    { testo: 'Timeout 10 minuti', riga: 'timeout 600', scopo: 'moderator:manage:banned_users', staccata: true },
    { testo: 'Timeout un’ora', riga: 'timeout 3600', scopo: 'moderator:manage:banned_users' },
    { testo: 'Togli il timeout', riga: 'untimeout', scopo: 'moderator:manage:banned_users' },
    { testo: 'Fallo VIP', riga: 'vip', scopo: 'channel:manage:vips', staccata: true },
    { testo: 'Togli il VIP', riga: 'unvip', scopo: 'channel:manage:vips' },
    { testo: 'Fallo moderatore', riga: 'mod', scopo: 'channel:manage:moderators' },
    { testo: 'Togli il moderatore', riga: 'unmod', scopo: 'channel:manage:moderators' },
    { testo: 'Banna', riga: 'ban', scopo: 'moderator:manage:banned_users', staccata: true, pericolosa: true }
  ];

  var conf = { canale: '', canaleId: '', su: null, scrivi: null };

  var radice = null;
  var pannello = null;
  var acceso = false;

  var sicuroVoce = null;
  var sicuroTimer = null;

  function dillo(testo, guaio) {
    if (typeof conf.su === 'function') { conf.su(testo, guaio); }
  }

  function chiudi() {
    clearTimeout(sicuroTimer);
    sicuroTimer = null;
    sicuroVoce = null;

    if (!pannello) { return; }
    if (pannello.parentNode) { pannello.parentNode.removeChild(pannello); }
    pannello = null;
  }

  function puo(scopo) {
    if (!scopo) { return true; }
    return !!(window.Conto && window.Conto.puo && window.Conto.puo(scopo));
  }

  function esegui(voce, nick) {
    var riga = '/' + voce.riga + ' ' + nick;

    if (voce.campo) {
      chiudi();
      if (typeof conf.scrivi === 'function') { conf.scrivi(riga + ' '); }
      return;
    }

    if (!window.Comandi || !window.Comandi.esegui) {
      dillo('I comandi qui non ci sono.', true);
      return;
    }

    chiudi();
    dillo('Lo chiedo a Twitch.');

    window.Comandi.esegui(riga, { canale: conf.canale, canaleId: conf.canaleId },
      function (guaio, detto) {
        if (guaio) { dillo(guaio, true); return; }
        dillo(detto || 'Fatto.');
      });
  }

  function crea(tag, classe, testo) {
    var el = document.createElement(tag);
    if (classe) { el.className = classe; }
    if (testo != null) { el.textContent = testo; }
    return el;
  }

  function bottone(voce, nick) {
    var b = crea('button', 'pollaio__azione', voce.testo);
    b.type = 'button';
    b.setAttribute('role', 'menuitem');

    if (voce.staccata) { b.classList.add('is-staccata'); }
    if (voce.pericolosa) { b.classList.add('is-pericolosa'); }

    if (!puo(voce.scopo)) {
      b.disabled = true;
      b.title = 'Serve un permesso che il collegamento non ha: riconnetti l’account.';
      return b;
    }

    b.addEventListener('click', function () {
      if (!voce.pericolosa) { esegui(voce, nick); return; }

      if (sicuroVoce !== voce) {
        sicuroVoce = voce;
        b.textContent = 'Sicuro? Banno ' + nick;

        clearTimeout(sicuroTimer);
        sicuroTimer = setTimeout(function () {
          sicuroTimer = null;
          if (sicuroVoce !== voce || !pannello) { return; }
          sicuroVoce = null;
          b.textContent = voce.testo;
        }, ATTESA_SICURO);
        return;
      }

      clearTimeout(sicuroTimer);
      sicuroTimer = null;
      sicuroVoce = null;
      esegui(voce, nick);
    });

    return b;
  }

  function apri(nick, x, y) {
    chiudi();

    pannello = crea('div', 'pollaio__azioni');
    pannello.setAttribute('role', 'menu');

    pannello.appendChild(crea('p', 'pollaio__azioni-chi', nick));

    var i;
    for (i = 0; i < VOCI.length; i++) {
      pannello.appendChild(bottone(VOCI[i], nick));
    }

    document.body.appendChild(pannello);

    var largo = pannello.offsetWidth;
    var alto = pannello.offsetHeight;

    if (x + largo > window.innerWidth) { x = Math.max(0, window.innerWidth - largo); }
    if (y + alto > window.innerHeight) { y = Math.max(0, y - alto); }

    pannello.style.insetInlineStart = Math.max(0, x) + 'px';
    pannello.style.insetBlockStart = Math.max(0, y) + 'px';
  }

  function nickDi(bersaglio) {
    if (!bersaglio || typeof bersaglio.closest !== 'function') { return ''; }

    var voce = bersaglio.closest('.pollaio__lista-nome');
    if (voce && voce.getAttribute('data-nick')) { return voce.getAttribute('data-nick'); }

    var nome = bersaglio.closest('.pollaio__nome');
    if (!nome) { return ''; }

    var riga = nome.closest('.pollaio__riga');
    if (!riga) { return ''; }

    if (riga.getAttribute('data-piattaforma') !== 'twitch') { return ''; }

    return String(riga.getAttribute('data-nick') || '');
  }

  function monta(dove, opzioni) {
    if (acceso || !dove) { return false; }

    var o = opzioni || {};
    conf.canale = String(o.canale || '');
    conf.canaleId = String(o.canaleId || '');
    conf.su = o.su || null;
    conf.scrivi = o.scrivi || null;

    radice = dove;
    acceso = true;

    radice.addEventListener('click', function (evento) {
      var nick = nickDi(evento.target);
      if (!nick || !MODELLO_NICK.test(nick)) { return; }

      evento.preventDefault();
      evento.stopPropagation();
      apri(nick, evento.clientX, evento.clientY);
    });

    document.addEventListener('mousedown', function (evento) {
      if (!pannello) { return; }
      if (pannello.contains(evento.target)) { return; }
      chiudi();
    });

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape') { chiudi(); }
    });

    window.addEventListener('blur', chiudi);
    return true;
  }

  function canale(id) {
    conf.canaleId = String(id || '');
  }

  window.Azioni = {
    monta: monta,
    canale: canale,
    apri: apri,
    chiudi: chiudi,
    aperto: function () { return !!pannello; }
  };
}());
