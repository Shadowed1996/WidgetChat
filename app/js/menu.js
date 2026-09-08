(function () {
  'use strict';

  var PREFISSO = 'pollaio:';

  var DURATA_COMANDO = 700;

  var acceso = false;
  var pannello = null;
  var titoloVero = '';
  var contatore = 0;
  var ritorno = null;

  function dentroLaVetrina() {
    return !!(window.chrome && window.chrome.webview &&
              typeof window.chrome.webview.postMessage === 'function');
  }

  function comanda(cosa) {
    contatore++;

    if (dentroLaVetrina()) {
      try {
        window.chrome.webview.postMessage(PREFISSO + cosa + ':' + contatore);
        return;
      } catch (err) {

      }
    }

    document.title = PREFISSO + cosa + ':' + contatore;

    clearTimeout(ritorno);
    ritorno = setTimeout(function () {
      document.title = titoloVero;
    }, DURATA_COMANDO);
  }

  function ascoltaRisposte() {
    if (!window.chrome || !window.chrome.webview ||
        typeof window.chrome.webview.addEventListener !== 'function') { return; }

    window.chrome.webview.addEventListener('message', function (evento) {
      var testo;

      try { testo = String(evento.data == null ? '' : evento.data); }
      catch (err) { return; }

      if (testo.indexOf(PREFISSO) !== 0) { return; }

      var resto = testo.slice(PREFISSO.length);
      var taglio = resto.indexOf(':');

      document.dispatchEvent(new CustomEvent('pollaio-risposta', {
        detail: {
          comando: taglio > 0 ? resto.slice(0, taglio) : resto,
          coda: taglio > 0 ? resto.slice(taglio + 1) : ''
        }
      }));
    });
  }

  var VOCI = [
    {
      testo: 'Apri la regia',

      fai: function () { comanda('regia'); },

      soloNellaChat: true
    },
    {
      testo: 'Ricarica la chat',

      fai: function () { location.reload(); }
    },
    {
      testo: 'Riduci a icona',
      staccata: true,
      fai: function () { comanda('riduci'); }
    },
    {
      testo: 'Chiudi il pollaio',
      staccata: true,
      pericolosa: true,
      fai: function () { comanda('chiudi'); }
    }
  ];

  function crea(tag, classe, testo) {
    var el = document.createElement(tag);
    if (classe) { el.className = classe; }

    if (testo != null) { el.textContent = testo; }
    return el;
  }

  function dentroLaRegia() {
    var percorso = String(location.pathname || '').toLowerCase();
    return percorso.indexOf('regia.html') !== -1;
  }

  var COMANDI = 'input, button, select, textarea, a, label, summary, [role="menuitem"]';

  function afferrabile(bersaglio) {
    if (!bersaglio || typeof bersaglio.closest !== 'function') { return true; }
    if (bersaglio.closest(COMANDI)) { return false; }
    if (bersaglio.closest('.menu')) { return false; }
    if (bersaglio.closest('.pollaio__barra')) { return false; }

    if (dentroLaRegia()) { return !!bersaglio.closest('.regia__testa'); }
    return true;
  }

  var MARGINE = 6;

  var ANGOLO = 16;

  var bordo = '';

  function zonaDelBordo(x, y) {
    var largo = window.innerWidth;
    var alto = window.innerHeight;

    if (largo < 3 * ANGOLO || alto < 3 * ANGOLO) { return ''; }

    var suO = x <= MARGINE;
    var suE = x >= largo - MARGINE;
    var suN = y <= MARGINE;
    var suS = y >= alto - MARGINE;

    var viciO = x <= ANGOLO;
    var viciE = x >= largo - ANGOLO;
    var viciN = y <= ANGOLO;
    var viciS = y >= alto - ANGOLO;

    if ((suN && viciO) || (suO && viciN)) { return 'no'; }
    if ((suN && viciE) || (suE && viciN)) { return 'ne'; }
    if ((suS && viciO) || (suO && viciS)) { return 'so'; }
    if ((suS && viciE) || (suE && viciS)) { return 'se'; }

    if (suN) { return 'n'; }
    if (suS) { return 's'; }
    if (suO) { return 'o'; }
    if (suE) { return 'e'; }

    return '';
  }

  function segnaBordo(zona) {
    if (zona === bordo) { return; }
    bordo = zona;

    if (bordo) { document.documentElement.setAttribute('data-bordo', bordo); }
    else { document.documentElement.removeAttribute('data-bordo'); }
  }

  function guardaIlBordo(evento) {
    if (!dentroLaVetrina() || dentroLaRegia() || pannello) { segnaBordo(''); return; }
    segnaBordo(zonaDelBordo(evento.clientX, evento.clientY));
  }

  function chiudi() {
    if (!pannello) { return; }
    if (pannello.parentNode) { pannello.parentNode.removeChild(pannello); }
    pannello = null;
  }

  function apri(x, y) {
    chiudi();

    pannello = crea('div', 'menu');
    pannello.setAttribute('role', 'menu');

    for (var i = 0; i < VOCI.length; i++) {
      if (VOCI[i].soloNellaChat && dentroLaRegia()) { continue; }

      (function (voce) {
        var bottone = crea('button', 'menu__voce', voce.testo);
        bottone.type = 'button';
        bottone.setAttribute('role', 'menuitem');
        if (voce.staccata) { bottone.classList.add('is-staccata'); }
        if (voce.pericolosa) { bottone.classList.add('is-pericolosa'); }

        bottone.addEventListener('click', function () {

          chiudi();
          try { voce.fai(); }
          catch (err) {  }
        });

        pannello.appendChild(bottone);
      }(VOCI[i]));
    }

    document.body.appendChild(pannello);

    var largo = pannello.offsetWidth;
    var alto = pannello.offsetHeight;
    var dentroX = window.innerWidth;
    var dentroY = window.innerHeight;

    if (x + largo > dentroX) { x = Math.max(0, x - largo); }
    if (y + alto > dentroY) { y = Math.max(0, y - alto); }

    pannello.style.insetInlineStart = x + 'px';
    pannello.style.insetBlockStart = y + 'px';
  }

  function avvia() {
    if (acceso) { return; }

    var valori = (window.Impostazioni && window.Impostazioni.valori) || null;
    if (!valori || !valori.finestra) { return; }
    if (!document.body) { return; }

    acceso = true;
    titoloVero = document.title;

    document.documentElement.setAttribute('data-finestra', '1');

    ascoltaRisposte();

    document.addEventListener('contextmenu', function (evento) {
      evento.preventDefault();
      apri(evento.clientX, evento.clientY);
    });

    document.addEventListener('mousedown', function (evento) {
      if (pannello) {
        if (pannello.contains(evento.target)) { return; }
        chiudi();
      }

      if (evento.button !== 0) { return; }

      if (bordo) {
        evento.preventDefault();
        comanda('ridimensiona:' + bordo);
        return;
      }

      if (!afferrabile(evento.target)) { return; }

      comanda('trascina');
    });

    document.addEventListener('mousemove', guardaIlBordo);

    document.addEventListener('mouseleave', function () { segnaBordo(''); });

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape') { chiudi(); }
    });

    window.addEventListener('blur', function () {
      chiudi();
      segnaBordo('');
    });
  }

  window.Menu = {
    avvia: avvia,
    aperto: function () { return !!pannello; },
    comanda: comanda,
    dentro: function () { return acceso; },
    nellaVetrina: function () { return acceso && dentroLaVetrina(); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia, { once: true });
  } else {
    avvia();
  }

}());
