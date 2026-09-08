/* =============================================================================
   menu.js — «il pollaio» · il menu del tasto destro della finestra

   POSSIEDE: window.Menu, cioè il menu che compare col tasto destro quando il
   pollaio gira dentro la finestra di Pollaio.exe, e il canale con cui chiede
   al launcher di chiudere, ridurre a icona o spostare quella finestra.

   NON POSSIEDE: la chat. Qui dentro non si legge un messaggio e non si tocca
   l'elenco. Il menu vive accanto all'overlay, non dentro.

   PERCHÉ ESISTE
   Il launcher toglie la barra del titolo alla finestra del browser: in una
   cattura finestra di OBS quella barra entrerebbe nell'inquadratura, sopra al
   gameplay. Ma una finestra senza barra non si chiude e non si sposta più coi
   modi soliti, e i comandi devono ricomparire da qualche parte. Da qui, che è
   anche il posto giusto: così il menu è disegnato con la palette del canale
   invece che coi grigi di Windows.

   COME PARLA COL LAUNCHER, e perché così
   Una pagina non può chiudere una finestra di sistema. Serviva un canale
   senza server, senza file e senza dipendenze, e ce n'era uno già pronto: il
   TITOLO. Qui si scrive un comando in `document.title`, il browser lo copia
   nel testo della finestra, e il launcher lo legge con GetWindowText ogni
   150 millisecondi. Un canale a senso unico, lento e stretto — cioè le tre
   cose che qui non contano, visto che i comandi sono tre e li manda una
   persona che ha appena cliccato.

   Il titolo torna quello di prima dopo mezzo secondo abbondante: abbastanza
   perché il launcher lo veda di sicuro, abbastanza poco perché nessuno se ne
   accorga. E ogni comando porta un numero che cambia, altrimenti lo stesso
   titolo verrebbe letto tre o quattro volte di fila e «riduci a icona»
   scatterebbe tre volte.

   QUANDO NON ESISTE
   Se `finestra=1` non c'è nell'indirizzo, questo file non fa assolutamente
   niente. In una Sorgente Browser di OBS non c'è nessuna finestra da chiudere
   e il tasto destro non arriva nemmeno alla pagina: un menu lì sarebbe codice
   morto che promette comandi che non funzionano. È il launcher ad aggiungere
   quel parametro, perché è l'unico che sa dove sta girando la pagina.

   SE IL PONTE NON FUNZIONASSE: la finestra si chiude sempre con Alt+F4 o col
   tasto destro sulla barra delle applicazioni. Non si resta mai chiusi fuori,
   ed è la ragione per cui questa parte si è potuta scrivere anche senza un
   modo di provarla.

   INDICE
     1. Costanti e stato
     2. Il canale col launcher
     3. Le voci
     4. Aprire e chiudere il menu
     5. Avvio e API pubblica
   ============================================================================= */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. Costanti e stato
     ------------------------------------------------------------------ */

  var PREFISSO = 'pollaio:';

  /* Quanto resta scritto il comando nel titolo. Il launcher guarda ogni
     150 ms: mezzo secondo abbondante gli dà tre occasioni di vederlo anche se
     la macchina sta arrancando, e resta troppo poco perché qualcuno noti il
     titolo cambiato. */
  var DURATA_COMANDO = 700;

  var acceso = false;
  var pannello = null;
  var titoloVero = '';
  var contatore = 0;
  var ritorno = null;


  /* ------------------------------------------------------------------
     2. Il canale col launcher
     ------------------------------------------------------------------ */

  /* Due ponti, e si prende il migliore che c'è.

     IL PONTE VERO. Dentro la finestra del launcher disegnata con WebView2
     esiste `window.chrome.webview`, e un postMessage arriva dall'altra parte
     subito: niente attese, niente titoli da leggere, nessun modo di perdere un
     comando. È il caso normale.

     IL RIPIEGO. Quando il launcher non ha potuto usare WebView2 e ha aperto la
     pagina in Chrome o Edge, quell'oggetto non esiste e l'unico canale che
     resta è il TITOLO della finestra: si scrive lì il comando e il launcher lo
     legge con GetWindowText. Lento e stretto, ma i comandi sono tre e li manda
     una persona che ha appena cliccato.

     Il numero in coda serve solo al ripiego: il titolo resta scritto per
     mezzo secondo e il launcher guarda ogni 150 millisecondi, quindi senza un
     pezzo che cambia lo stesso comando verrebbe letto tre volte — cioè
     «riduci a icona» tre volte di fila. */
  function comanda(cosa) {
    contatore++;

    if (window.chrome && window.chrome.webview &&
        typeof window.chrome.webview.postMessage === 'function') {
      try {
        window.chrome.webview.postMessage(PREFISSO + cosa + ':' + contatore);
        return;
      } catch (err) {
        /* Non dovrebbe succedere, ma se succede c'è ancora il titolo. */
      }
    }

    document.title = PREFISSO + cosa + ':' + contatore;

    clearTimeout(ritorno);
    ritorno = setTimeout(function () {
      document.title = titoloVero;
    }, DURATA_COMANDO);
  }


  /* ------------------------------------------------------------------
     3. Le voci
     ------------------------------------------------------------------
     Due che la pagina sa fare da sola e tre che deve chiedere al
     launcher. L'ordine non è casuale: prima quelle che si usano spesso e
     non fanno danni, «Chiudi» ultima e staccata, perché è l'unica da cui
     non si torna indietro e non deve stare sotto il dito per sbaglio.
     ------------------------------------------------------------------ */

  var VOCI = [
    {
      testo: 'Apri la regia',
      /* Non `window.open`: quella aprirebbe una finestra normale del browser,
         con la barra degli indirizzi e le schede, e la regia tornerebbe a
         sembrare una pagina web invece di un programma. Si chiede al launcher
         di aprirla nella SUA finestra, con la sua misura e la sua icona. */
      fai: function () { comanda('regia'); },
      /* Dentro la regia questa voce non ha senso: ci si è già. */
      soloNellaChat: true
    },
    {
      testo: 'Ricarica la chat',
      /* Serve più di quanto sembri: è il modo di riprendersi dopo che la
         rete è stata via a lungo, e di rileggere i cataloghi delle emote
         se erano arrivati a metà. */
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


  /* ------------------------------------------------------------------
     4. Aprire e chiudere il menu
     ------------------------------------------------------------------ */

  function crea(tag, classe, testo) {
    var el = document.createElement(tag);
    if (classe) { el.className = classe; }
    /* textContent e mai innerHTML (§1.4). Qui il testo è roba nostra, ma la
       regola della casa non ha eccezioni: così non c'è nemmeno da discutere
       dove sia lecito. */
    if (testo != null) { el.textContent = testo; }
    return el;
  }

  /* Lo stesso menu serve due pagine — la chat e la regia — e una voce sola
     cambia fra le due. Si guarda il nome del file e non un parametro in più:
     un parametro andrebbe passato da due posti e prima o poi uno dei due se
     lo dimentica. */
  function dentroLaRegia() {
    var percorso = String(location.pathname || '').toLowerCase();
    return percorso.indexOf('regia.html') !== -1;
  }

  /* Da dove si può afferrare la finestra per spostarla.

     NELL'OVERLAY da tutta la sua superficie: dentro non c'è niente da
     cliccare, i messaggi non sono bottoni, e pretendere che si afferri una
     zona precisa in una finestra larga quattrocento pixel sarebbe una caccia
     al tesoro.

     NELLA REGIA solo dalla TESTATA. Il resto della pagina è pieno di manopole,
     e una pagina che scappa via mentre provi a girarne una è inservibile —
     sarebbe il difetto più fastidioso di tutto il progetto.

     In tutti e due i casi restano fuori i comandi veri e il menu: premere un
     bottone non deve mai voler dire prendere la finestra. */
  var COMANDI = 'input, button, select, textarea, a, label, summary, [role="menuitem"]';

  function afferrabile(bersaglio) {
    if (!bersaglio || typeof bersaglio.closest !== 'function') { return true; }
    if (bersaglio.closest(COMANDI)) { return false; }
    if (bersaglio.closest('.menu')) { return false; }

    if (dentroLaRegia()) { return !!bersaglio.closest('.regia__testa'); }
    return true;
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
          /* Prima si chiude, poi si esegue. Per «Sposta» è indispensabile: la
             finestra comincia a seguire il mouse, e un menu ancora aperto
             resterebbe appiccicato in mezzo allo schermo mentre tutto il
             resto si muove. */
          chiudi();
          try { voce.fai(); }
          catch (err) { /* una voce che salta non si porta via il menu */ }
        });

        pannello.appendChild(bottone);
      }(VOCI[i]));
    }

    document.body.appendChild(pannello);

    /* Si misura DOPO averlo attaccato, perché prima non ha dimensioni. Se non
       ci sta a destra o in basso, si ribalta dall'altra parte del puntatore
       invece di uscire dallo schermo — che su una finestra da 400 pixel
       succede quasi sempre, visto che il menu è largo quasi quanto lei. */
    var largo = pannello.offsetWidth;
    var alto = pannello.offsetHeight;
    var dentroX = window.innerWidth;
    var dentroY = window.innerHeight;

    if (x + largo > dentroX) { x = Math.max(0, x - largo); }
    if (y + alto > dentroY) { y = Math.max(0, y - alto); }

    pannello.style.insetInlineStart = x + 'px';
    pannello.style.insetBlockStart = y + 'px';
  }


  /* ------------------------------------------------------------------
     5. Avvio e API pubblica
     ------------------------------------------------------------------ */

  function avvia() {
    if (acceso) { return; }

    var valori = (window.Impostazioni && window.Impostazioni.valori) || null;
    if (!valori || !valori.finestra) { return; }
    if (!document.body) { return; }

    acceso = true;
    titoloVero = document.title;

    /* Si dichiara sulla radice che siamo dentro una finestra del launcher.
       Serve al foglio di stile per restituire il PUNTATORE, che nell'overlay è
       spento apposta (in OBS non c'è, e in una registrazione una freccia
       piantata in mezzo alla chat è un difetto). Qui invece ci si clicca
       dentro davvero: il menu del tasto destro è l'unico modo di chiudere e
       spostare la finestra, e un menu che non si vede puntare non si usa. */
    document.documentElement.setAttribute('data-finestra', '1');

    document.addEventListener('contextmenu', function (evento) {
      evento.preventDefault();
      apri(evento.clientX, evento.clientY);
    });

    /* Il tasto sinistro fa due cose: chiude il menu se è aperto, e comincia a
       trascinare la finestra.

       `mousedown` e non `click`, e vale per tutte e due. Per il menu, perché
       chi clicca fuori per liberarsene vuole vederlo sparire appena preme. Per
       il trascinamento è addirittura obbligatorio: il launcher passa la mano a
       Windows mentre il tasto è ancora GIÙ, e con un `click` sarebbe già stato
       rilasciato — non ci sarebbe più niente da seguire. */
    document.addEventListener('mousedown', function (evento) {
      if (pannello) {
        if (pannello.contains(evento.target)) { return; }
        chiudi();
      }

      if (evento.button !== 0) { return; }
      if (!afferrabile(evento.target)) { return; }

      comanda('trascina');
    });

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape') { chiudi(); }
    });

    /* Se la finestra perde il fuoco — si è cliccato su OBS, sul gioco — il
       menu non deve restare aperto sopra la chat per il resto della diretta. */
    window.addEventListener('blur', chiudi);
  }

  window.Menu = {
    avvia: avvia,
    aperto: function () { return !!pannello; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia, { once: true });
  } else {
    avvia();
  }

}());
