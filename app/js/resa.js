/* =============================================================================
   resa.js — «il pollaio» · window.Resa

   POSSIEDE: il DOM. È l'unico file del progetto che crea, attacca e stacca
   elementi dalla pagina, e l'unico che conosce i nomi delle classi CSS.

   NON POSSIEDE: il protocollo (irc.js), il catalogo delle emote (emote.js), i
   badge (badge.js), il giudizio su cosa è importante (rilievo.js), la
   traduzione degli eventi (eventi.js). Qui arriva un oggetto «messaggio» già
   completo secondo il §5 del contratto, e ne esce un <li>.

   INDICE
     1.  Costanti e stato
     2.  Il colore del nick — la parte con più ragionamento dentro
     3.  Aiutanti del DOM
     4.  I pezzi del corpo (testo, emote, cheer, link, menzioni)
     5.  La testa della riga (orario, badge, nome)
     6.  Le righe speciali (evento, moderazione)
     7.  Costruzione della riga completa
     8.  L'elenco: aggiunta, tetto, dissolvenza, cancellazione
     9.  La spia di stato
     10. API pubblica

   REGOLA CHE NON SI TOCCA (§1.4 del contratto)
   Quello che arriva dalla chat entra in pagina SOLO con textContent, e gli
   indirizzi delle immagini passano SOLO da indirizzoBuono(). Non esiste un
   caso, in questo file, in cui valga la pena di scrivere innerHTML: qualunque
   scorciatoia qui dentro diventa una falla che un tizio a caso in chat può
   aprire scrivendo il messaggio giusto durante una diretta.
   ============================================================================= */

(function () {
  'use strict';

  /* ---- 1. Costanti e stato ------------------------------------------------ */

  /* Il nome più lungo che Twitch permette è 25 caratteri: oltre, è roba
     storta e va tagliata prima di arrivare in pagina. */
  var MAX_NOME = 25;

  /* Il testo citato in una risposta si mostra troncato: è un richiamo, non il
     messaggio vero, e su una colonna da 400px una citazione lunga mangia lo
     spazio del messaggio che conta. */
  var MAX_CITAZIONE = 70;

  /* Quanto resta la classe .is-nuovo addosso a una riga. Deve superare la
     durata dell'animazione di entrata (180ms) con un margine, altrimenti su
     una macchina carica l'animazione viene tagliata a metà. */
  var DURATA_ENTRATA = 400;

  /* Gli effetti che hanno bisogno di più tempo di così, e quanto.

     La finestra non può essere una sola per tutti, perché i sette effetti non
     raccontano la stessa cosa. «Scivola» è un movimento di servizio: più corto
     è, meglio sta: sopra il quarto di secondo non si legge più come
     un'animazione ma come un ritardo dell'overlay. Il glitch è l'opposto — è
     un guasto video finto, l'unico effetto che deve FARSI GUARDARE — e dentro
     i 400ms i suoi fotogrammi duravano quarantacinque millisecondi l'uno: si
     intuiva che era successo qualcosa, non si vedeva cosa.

     Con una finestra unica bisognava scegliere fra un glitch invisibile e uno
     scivola lento. Questa tabella costa tre righe e li lascia decidere a testa
     loro; chi non è nominato resta a DURATA_ENTRATA.

     Chi allunga un effetto qui deve allungare anche la sua @keyframes in
     css/pollaio.css §14, e viceversa: sono due metà dello stesso numero. */
  var DURATE_ENTRATA = { glitch: 900 };

  function durataEntrata(effetto) {
    /* hasOwnProperty e non un accesso diretto: un `effetto` che arrivasse
       dalla querystring valendo «constructor» o «toString» pescherebbe dal
       prototipo e restituirebbe una funzione al posto di un numero. */
    var base = DURATA_ENTRATA;
    if (Object.prototype.hasOwnProperty.call(DURATE_ENTRATA, effetto)) {
      base = DURATE_ENTRATA[effetto];
    }

    /* La stessa proporzione che il foglio applica alle @keyframes con
       --tempo. Le due cose devono muoversi insieme: se il CSS rallenta e
       questa finestra no, l'animazione viene troncata a metà; se accelera e
       questa resta lunga, la riga continua a essere «nuova» molto dopo che
       l'effetto è finito — e per il matrix «nuova» vuol dire ancora verde e
       in monospazio. È lo stesso numero letto da due parti. */
    return Math.round(base * (100 / conf.velocita));
  }

  /* La dissolvenza in uscita, quando l'impostazione «svanisci» è accesa.
     Deve combaciare con --durata-lunga del CSS. */
  var DURATA_USCITA = 400;

  /* Gli indirizzi ammessi per un <img>. https per emote e badge veri, data:
     per i badge di ripiego che badge.js disegna a mano quando la rete non
     risponde. Nient'altro passa: né http, né javascript:, né percorsi
     relativi che qualcuno potrebbe far comparire in un nome di emote. */
  var INDIRIZZO_BUONO = /^(?:https:\/\/|data:image\/svg\+xml,)/;

  /* Quello che NON deve mai arrivare in pagina, e perché ognuno di questi:

       C0 e DEL, C1        caratteri di controllo: non si vedono e sballano tutto
       200E 200F           marcatori di direzione
       202A-202E           incorporamento e SCAVALCO della direzione
       2066-2069           isolamento della direzione

     I marcatori di direzione non sono un dettaglio da manuale: uno scavalco
     RTL infilato in un display-name fa leggere il nome al contrario, e in un
     messaggio ribalta tutto il testo che segue. È il modo più economico che
     ha un troll per far dire a qualcun altro una cosa che non ha scritto. */
  var CONTROLLO = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

  /* I segni combinanti si impilano SOPRA la lettera precedente, e non hanno
     un limite: qualche centinaio infilati in un messaggio disegna una colonna
     di inchiostro alta quanto tutto l'overlay e copre gli altri messaggi. È
     lo scherzo che in giro si chiama «zalgo». Due per lettera bastano a
     scrivere qualunque lingua vera; dal terzo in poi si tagliano. */
  var ZALGO = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u0610-\u061a\u064b-\u065f\u06d6-\u06dc\u0e31\u0e34-\u0e3a\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20f0\ufe20-\ufe2f]{3,}/g;

  function domaZalgo(testo) {
    return testo.replace(ZALGO, function (pila) { return pila.slice(0, 2); });
  }

  /* La ripulitura del CORPO del messaggio.

     Serve una funzione a parte da ripulisci(): quella taglia gli spazi ai
     bordi, e qui non si può, perché il corpo arriva già spezzato in pezzi da
     emote.js e lo spazio fra una parola e l'emote che segue è significativo.
     Toglierlo attaccherebbe le emote al testo.

     È l'unico posto da cui passa il testo scritto da sconosciuti prima di
     diventare un nodo della pagina: se manca qui, non è filtrato da nessuna
     parte. */
  function sicuroTesto(valore) {
    return domaZalgo(String(valore === undefined || valore === null ? '' : valore)
      .replace(CONTROLLO, ''));
  }

  var nodi = {
    radice: null,
    elenco: null,
    spia: null,
    spiaTesto: null
  };

  var conf = {
    max: 40,
    svanisci: 0,
    orario: false,
    verso: 'su',
    moderazione: 'sbarra',
    effetto: 'scivola',
    /* Percentuale di velocità dell'ingresso, la stessa che il foglio riceve
       come --tempo. Cento è la misura con cui sono disegnate le animazioni. */
    velocita: 100,
    /* Vero quando le chat collegate sono più d'una: accende la targhetta
       della piattaforma sopra ogni messaggio. Lo decide pollaio.js. */
    multi: false,
    /* Impostazione `anima`. Spenta, le emote animate si fermano al primo
       fotogramma (vedi congela(), blocco 4). */
    anima: true
  };

  /* Chi ha chiesto meno movimento non deve vedere i caratteri ballare. Si
     legge una volta sola all'avvio e non a ogni messaggio: matchMedia costa
     poco ma non zero, e qui si passa cento volte al minuto. */
  var menoMovimento = false;
  try {
    menoMovimento = !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (err) { /* browser che non sa rispondere: si tiene il movimento */ }

  /* Le righe appese, in ordine di arrivo. Serve un array nostro e non
     nodi.elenco.children: quando una riga sta svanendo è ancora nel DOM ma
     non conta più per il tetto, e mescolare le due cose fa sparire messaggi
     vivi al posto di quelli morti. */
  var righe = [];

  /* I timer delle dissolvenze, per poterli spegnere tutti in svuota(). Un
     timer orfano che scrive su un nodo staccato non rompe niente, ma tiene in
     vita l'oggetto messaggio per sempre: in otto ore di diretta si vede. */
  var timer = [];

  /* Se è già arrivato almeno un messaggio da quando la pagina è aperta.
     Serve alla spia: vedi togliSpia(). */
  var primoArrivato = false;


  /* ---- 2. Il colore del nick ---------------------------------------------
     In una chat che scorre il colore del nome è il modo principale per capire
     chi parla senza leggere. Vale la pena farlo bene, e ci sono due problemi
     distinti da risolvere.

     PROBLEMA A — chi non ha mai scelto un colore.
     Twitch manda il tag `color` vuoto. Lasciarli tutti bianchi vorrebbe dire
     che metà chat è indistinguibile. Si pesca una tinta dalla tavolozza di
     tokens.css con un hash del nick: deterministico, quindi la stessa persona
     ha lo stesso colore oggi, fra un'ora e fra un mese, che è esattamente ciò
     che rende il colore utile a riconoscere qualcuno.

     PROBLEMA B — chi ha scelto un colore illeggibile.
     Twitch lascia scegliere blu scuro (#0000FF) e marrone (#8A2BE2 è già al
     limite). Sopra al vetro scuro dell'overlay sono macchie nere. Qui NON si
     sostituisce il colore — sarebbe scortese e la persona non si
     riconoscerebbe più — si SCHIARISCE tenendo tinta e saturazione, finché il
     contrasto non arriva a 4.5:1.

     Il fondo di riferimento è il vetro --pannello sopra il nero del canale,
     cioè circa rgb(16,13,28), luminanza ~0.006. È il fondo nominale del tema
     «notte». Nel tema «nudo» sotto c'è il gameplay e nessun calcolo può
     prevederlo: lì il lavoro lo fa --ombra-testo, che stacca il testo da
     qualsiasi cosa. Per questo la soglia si calcola una volta sola qui e non
     si insegue il fondo vero.
     ------------------------------------------------------------------------ */

  var LUM_FONDO = 0.006;

  /* Da (L+0.05)/(LUM_FONDO+0.05) >= 4.5 si ricava la luminanza minima del
     testo. Con questo fondo viene ~0.202. */
  var LUM_MINIMA = 4.5 * (LUM_FONDO + 0.05) - 0.05;

  /* Un canale sRGB da 0-255 alla sua parte lineare, per la formula WCAG. */
  function lineare(canale) {
    var v = canale / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }

  function luminanza(r, g, b) {
    return 0.2126 * lineare(r) + 0.7152 * lineare(g) + 0.0722 * lineare(b);
  }

  /* '#a1b2c3' e '#abc' → [r,g,b]. Qualunque altra cosa → null: il tag `color`
     arriva da fuori e non si dà per scontato che sia un colore. */
  function leggiEsadecimale(valore) {
    var testo = String(valore || '').trim();
    if (testo.charAt(0) !== '#') { return null; }
    testo = testo.slice(1);

    if (testo.length === 3) {
      testo = testo.charAt(0) + testo.charAt(0) +
              testo.charAt(1) + testo.charAt(1) +
              testo.charAt(2) + testo.charAt(2);
    }
    if (testo.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(testo)) { return null; }

    return [
      parseInt(testo.slice(0, 2), 16),
      parseInt(testo.slice(2, 4), 16),
      parseInt(testo.slice(4, 6), 16)
    ];
  }

  function versoEsadecimale(rgb) {
    var pezzi = '#';
    var i;
    for (i = 0; i < 3; i++) {
      var n = Math.max(0, Math.min(255, Math.round(rgb[i])));
      pezzi += (n < 16 ? '0' : '') + n.toString(16);
    }
    return pezzi;
  }

  /* RGB → HSL e ritorno. Servono per schiarire tenendo la tinta: alzare i tre
     canali in proporzione, che sarebbe più corto, sposta la tinta verso il
     bianco e fa diventare grigi tutti i colori scuri — cioè proprio quelli
     che stiamo cercando di salvare. */
  function versoHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var l = (max + min) / 2;
    var h = 0;
    var s = 0;

    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r)      { h = (g - b) / d + (g < b ? 6 : 0); }
      else if (max === g) { h = (b - r) / d + 2; }
      else                { h = (r - g) / d + 4; }
      h /= 6;
    }
    return [h, s, l];
  }

  function daHsl(h, s, l) {
    function canale(p, q, t) {
      if (t < 0) { t += 1; }
      if (t > 1) { t -= 1; }
      if (t < 1 / 6) { return p + (q - p) * 6 * t; }
      if (t < 1 / 2) { return q; }
      if (t < 2 / 3) { return p + (q - p) * (2 / 3 - t) * 6; }
      return p;
    }

    if (s === 0) { return [l * 255, l * 255, l * 255]; }

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    return [
      canale(p, q, h + 1 / 3) * 255,
      canale(p, q, h) * 255,
      canale(p, q, h - 1 / 3) * 255
    ];
  }

  /* Alza la L finché la luminanza non supera la soglia. Venti passi da 0.03
     bastano ad arrivare in cima partendo da nero, e il ciclo si ferma appena
     ha finito: è un conto che gira su ogni messaggio di una chat veloce, non
     una ricerca binaria da manuale. */
  function schiarisci(rgb) {
    var hsl = versoHsl(rgb[0], rgb[1], rgb[2]);
    var l = hsl[2];
    var tentativi = 0;
    var fuori = rgb;

    while (luminanza(fuori[0], fuori[1], fuori[2]) < LUM_MINIMA && tentativi < 20) {
      l = Math.min(1, l + 0.03);
      fuori = daHsl(hsl[0], hsl[1], l);
      tentativi++;
    }
    return fuori;
  }

  /* Hash stabile di una stringa (variante di djb2). Non serve che sia
     crittografico: serve che dia sempre lo stesso numero per lo stesso nick,
     su qualunque browser e a distanza di mesi. */
  function impronta(testo) {
    var n = 5381;
    var i;
    for (i = 0; i < testo.length; i++) {
      n = ((n << 5) + n + testo.charCodeAt(i)) | 0;
    }
    return Math.abs(n);
  }

  /* L'unica funzione che serve da fuori: dato il tag color e il nick,
     restituisce il colore da scrivere. Se il tag manca si pesca dalla
     tavolozza (che è in tokens.css, quindi si restituisce il nome della
     variabile e non un colore: così ritoccare la tavolozza resta un lavoro da
     fare in un file di CSS, come dice il contratto). */
  function tinta(colore, nick) {
    var rgb = leggiEsadecimale(colore);

    if (!rgb) {
      return 'var(--nick-' + (impronta(String(nick || '')) % 16) + ')';
    }
    if (luminanza(rgb[0], rgb[1], rgb[2]) >= LUM_MINIMA) {
      return versoEsadecimale(rgb);
    }
    return versoEsadecimale(schiarisci(rgb));
  }


  /* ---- 3. Aiutanti del DOM ------------------------------------------------ */

  function crea(tag, classe, testo) {
    var nodo = document.createElement(tag);
    if (classe) { nodo.className = classe; }
    if (testo !== undefined && testo !== null) { nodo.textContent = String(testo); }
    return nodo;
  }

  function ripulisci(valore, tetto) {
    var pulito = domaZalgo(
      String(valore === undefined || valore === null ? '' : valore).replace(CONTROLLO, '')
    ).trim();
    if (!tetto || pulito.length <= tetto) { return pulito; }

    /* Array.from e non slice: si conta per caratteri veri, così il taglio non
       spezza a metà un'emoji — e in chat ce n'è a ogni riga. */
    var lettere = Array.from(pulito);
    if (lettere.length <= tetto) { return pulito; }
    return lettere.slice(0, tetto - 1).join('') + '…';
  }

  function indirizzoBuono(url) {
    return typeof url === 'string' && INDIRIZZO_BUONO.test(url);
  }

  /* Ogni <img> del widget passa da qui. Se l'indirizzo non convince, non si
     crea proprio il nodo: si restituisce null e chi chiama mette il testo al
     posto dell'immagine. Meglio leggere «Sadge» che vedere un buco. */
  function immagine(classe, url, url2, alt, titolo) {
    if (!indirizzoBuono(url)) { return null; }

    var img = document.createElement('img');
    img.className = classe;
    img.setAttribute('src', url);
    if (indirizzoBuono(url2)) { img.setAttribute('srcset', url + ' 1x, ' + url2 + ' 2x'); }
    img.setAttribute('alt', alt === undefined ? '' : String(alt));
    if (titolo) { img.setAttribute('title', String(titolo)); }

    /* decoding async tiene il disegno fuori dal filo principale: in una
       raffica di venti messaggi pieni di emote la differenza si vede. */
    img.setAttribute('decoding', 'async');
    return img;
  }


  /* ---- 4. I pezzi del corpo ----------------------------------------------
     L'array `pezzi` arriva già analizzato da emote.js: qui non si interpreta
     niente, si disegna e basta. Le uniche due decisioni sono le emote
     sovrapposte (§5 del contratto) e il ripiego quando un indirizzo non passa
     il controllo.
     ------------------------------------------------------------------------ */

  function disegnaCorpo(pezzi, tintaNome) {
    var corpo = crea('p', 'pollaio__corpo');
    var i;

    for (i = 0; i < pezzi.length; i++) {
      var pezzo = pezzi[i] || {};

      if (pezzo.tipo === 'emote') {
        attaccaEmote(corpo, pezzo);

      } else if (pezzo.tipo === 'cheer') {
        var cheer = immagine('pollaio__cheer', pezzo.url, pezzo.url2, pezzo.nome, pezzo.nome);
        if (cheer) { corpo.appendChild(cheer); }
        corpo.appendChild(crea('b', 'pollaio__bits', pezzo.bits));
        corpo.appendChild(document.createTextNode(' '));

      } else if (pezzo.tipo === 'menzione') {
        corpo.appendChild(crea('span', 'pollaio__menzione', pezzo.nome));

      } else if (pezzo.tipo === 'link') {
        /* Volutamente uno <span> e non un <a>: in un overlay non si clicca
           niente, e un <a> con un indirizzo scritto da uno sconosciuto è un
           rischio gratuito in cambio di zero vantaggi. */
        corpo.appendChild(crea('span', 'pollaio__link', pezzo.testo));

      } else if (pezzo.tipo === 'testo') {
        corpo.appendChild(document.createTextNode(sicuroTesto(pezzo.testo)));
      }
    }

    /* Nel /me il corpo prende il colore del nome, come fa Twitch. */
    if (tintaNome) { corpo.style.setProperty('--tinta', tintaNome); }
    return corpo;
  }

  /* Le emote a larghezza zero di 7TV (SoCute, RainTime…) si disegnano SOPRA
     l'emote che le precede, non accanto. Qui si guarda l'ultimo nodo
     attaccato: se è un'emote la si avvolge in una pila e ci si mette sopra la
     nuova. Se non c'è niente prima — succede quando qualcuno scrive solo
     l'emote sovrapposta — si disegna normale, perché una pila con un elemento
     solo sarebbe un contenitore vuoto per niente. */
  /* --- Fermare un'emote animata (impostazione `anima=0`) ---------------------
     L'interruttore c'era da sempre e non faceva niente: emote.js lo usava solo
     per il cheermote, l'unica sorgente per cui il contratto dichiara un
     indirizzo statico. Per 7TV, BetterTTV, FrankerFaceZ e le emote native di
     Twitch l'impostazione era inerte — prometteva e basta.

     Non si può risolvere inventando un URL statico che i provider non
     dichiarano (§7: non ci si inventa un indirizzo che non è scritto da
     nessuna parte). Si può però disegnare il PRIMO FOTOGRAMMA su un canvas e
     usare quello: il browser di un'immagine animata disegna il fotogramma
     corrente, e appena caricata è il primo.

     TRE COSE CHE VANNO SAPUTE
     1. Il canvas si sporca se il provider non manda le intestazioni CORS, e
        toDataURL lancia. Si prende l'eccezione e resta l'emote animata: si
        perde l'impostazione, non l'emote (§1.9).
     2. Si tiene memoria per indirizzo. In una chat vera la stessa emote passa
        cento volte, e rifare il giro ogni volta vorrebbe dire cento canvas al
        minuto per un risultato identico.
     3. Il congelamento è asincrono: la prima volta l'emote si muove per un
        istante prima di fermarsi. Con la memoria succede una volta sola per
        emote, e l'alternativa — non disegnarla finché non è pronta — sarebbe
        un buco nel messaggio, che è peggio.
     -------------------------------------------------------------------------- */

  var CACHE_FERME = Object.create(null);

  function congela(img, indirizzo) {
    if (!indirizzo) { return; }

    if (CACHE_FERME[indirizzo]) {
      img.removeAttribute('srcset');
      img.src = CACHE_FERME[indirizzo];
      return;
    }

    var lettore = new Image();

    /* Senza questo il canvas si sporca SEMPRE e toDataURL lancia sempre. Con
       questo, si sporca solo se il provider non risponde con CORS. */
    lettore.crossOrigin = 'anonymous';

    lettore.onload = function () {
      try {
        var tela = document.createElement('canvas');
        tela.width = lettore.naturalWidth || 56;
        tela.height = lettore.naturalHeight || 56;

        var pennello = tela.getContext('2d');
        if (!pennello) { return; }
        pennello.drawImage(lettore, 0, 0);

        var fermo = tela.toDataURL('image/png');
        CACHE_FERME[indirizzo] = fermo;

        /* srcset via PRIMA di src: se restasse, il browser potrebbe scegliere
           la 4x animata e il congelamento non si vedrebbe su uno schermo
           denso — cioè proprio dove si nota. */
        img.removeAttribute('srcset');
        img.src = fermo;
      } catch (err) {
        /* Canvas sporco: il provider non manda CORS. Resta l'emote animata. */
      }
    };

    lettore.src = indirizzo;
  }

  function attaccaEmote(corpo, pezzo) {
    var img = immagine('pollaio__emote', pezzo.url, pezzo.url2, pezzo.nome, pezzo.nome);

    if (!img) {
      corpo.appendChild(document.createTextNode(String(pezzo.nome || '')));
      return;
    }
    if (pezzo.fonte) { img.setAttribute('data-fonte', pezzo.fonte); }
    if (!conf.anima && pezzo.animata) { congela(img, pezzo.url); }

    if (pezzo.sovrapposta) {
      var ultimo = corpo.lastElementChild;

      if (ultimo && ultimo.className === 'pollaio__pila') {
        img.className = 'pollaio__emote is-sopra';
        ultimo.appendChild(img);
        return;
      }
      if (ultimo && ultimo.className === 'pollaio__emote') {
        var pila = crea('span', 'pollaio__pila');
        corpo.replaceChild(pila, ultimo);
        pila.appendChild(ultimo);
        img.className = 'pollaio__emote is-sopra';
        pila.appendChild(img);
        return;
      }
    }

    corpo.appendChild(img);
  }


  /* ---- 5. La testa della riga --------------------------------------------- */

  /* I nomi sulla targhetta della piattaforma. Restano in inglese perché sono
     nomi propri: «YouTube» non si traduce, e una targhetta funziona solo se
     dice esattamente la parola che l'occhio si aspetta — tradotta smetterebbe
     di essere riconosciuta prima di essere letta, che è tutto il suo mestiere. */
  var NOMI_FONTE = {
    twitch: 'Twitch',
    youtube: 'YouTube',
    kick: 'Kick',
    tiktok: 'TikTok'
  };

  /* La targhetta si disegna solo quando le chat sono più d'una. In una chat di
     sole persone da Twitch, «Twitch» ripetuto sopra ogni messaggio non
     aggiunge niente: ruba una riga a testa e insegna all'occhio a ignorare
     proprio l'elemento che dovrebbe saltare fuori il giorno che serve. Chi
     decide se siamo in più d'una è pollaio.js, che è l'unico a sapere quante
     sorgenti sono accese. */
  function disegnaFonte(messaggio) {
    if (!conf.multi) { return null; }

    var chiave = String(messaggio.piattaforma || '').toLowerCase();

    /* hasOwnProperty e non un accesso diretto: `piattaforma` viaggia dentro un
       messaggio, e un valore come «constructor» pescherebbe dal prototipo una
       funzione al posto di un nome — che finirebbe in pagina come testo. */
    if (!Object.prototype.hasOwnProperty.call(NOMI_FONTE, chiave)) { return null; }

    var targhetta = crea('p', 'pollaio__fonte', NOMI_FONTE[chiave]);
    targhetta.setAttribute('data-fonte', chiave);
    return targhetta;
  }

  function disegnaTesta(messaggio, tintaNome) {
    var testa = crea('p', 'pollaio__testa');

    if (conf.orario) {
      var data = new Date(messaggio.ts || Date.now());
      var ore = data.getHours();
      var minuti = data.getMinutes();
      testa.appendChild(crea('span', 'pollaio__orario',
        (ore < 10 ? '0' : '') + ore + ':' + (minuti < 10 ? '0' : '') + minuti));
    }

    var badge = messaggio.badge || [];
    if (badge.length) {
      var scatola = crea('span', 'pollaio__distintivi');
      var i;
      var attaccati = 0;

      for (i = 0; i < badge.length; i++) {
        /* alt="" e non il titolo: il nome della persona identifica già chi
           parla, e un lettore di schermo che annuncia «Moderatore Abbonato da
           12 mesi tizio» prima di ogni riga è insopportabile. Il titolo resta
           su title, per chi ci passa sopra col mouse. */
        var d = immagine('pollaio__distintivo', badge[i].url, badge[i].url2, '', badge[i].titolo);
        if (d) { scatola.appendChild(d); attaccati++; }
      }
      if (attaccati) { testa.appendChild(scatola); }
    }

    var nome = crea('span', 'pollaio__nome', ripulisci(messaggio.nome || messaggio.nick, MAX_NOME));
    nome.style.setProperty('--tinta', tintaNome);
    testa.appendChild(nome);

    return testa;
  }

  function disegnaRisposta(risposta) {
    var blocco = crea('p', 'pollaio__risposta');
    blocco.appendChild(crea('span', 'pollaio__risposta-nome', ripulisci(risposta.nome, MAX_NOME)));
    blocco.appendChild(crea('span', 'pollaio__risposta-testo', ripulisci(risposta.testo, MAX_CITAZIONE)));
    return blocco;
  }


  /* ---- 6. Le righe speciali ----------------------------------------------- */

  function disegnaEvento(messaggio) {
    var evento = messaggio.evento;
    var riga = crea('li', 'pollaio__riga pollaio__evento');
    riga.setAttribute('data-tinta', evento.tinta || 'viola');

    riga.appendChild(crea('p', 'pollaio__evento-titolo', evento.titolo));

    if (messaggio.nome || messaggio.nick) {
      riga.appendChild(crea('p', 'pollaio__evento-nome',
        ripulisci(messaggio.nome || messaggio.nick, MAX_NOME)));
    }
    if (evento.dettaglio) {
      riga.appendChild(crea('p', 'pollaio__evento-dettaglio', evento.dettaglio));
    }
    if (evento.livello) {
      riga.appendChild(crea('span', 'pollaio__evento-piano', evento.livello));
    }
    /* Il messaggio allegato a un riabbonamento: c'è solo qualche volta, e
       quando c'è è la parte che lo streamer legge ad alta voce. */
    if (messaggio.pezzi && messaggio.pezzi.length) {
      riga.appendChild(disegnaCorpo(messaggio.pezzi, null));
    }
    return riga;
  }

  function disegnaModerazione(messaggio) {
    var riga = crea('li', 'pollaio__riga pollaio__moderazione');
    riga.appendChild(crea('p', 'pollaio__moderazione-testo', messaggio.evento.frase));
    return riga;
  }


  /* ---- 7. Costruzione della riga completa --------------------------------- */

  function disegna(messaggio) {
    if (messaggio.evento && messaggio.tipo === 'sistema') { return disegnaModerazione(messaggio); }
    if (messaggio.evento && messaggio.tipo === 'evento')  { return disegnaEvento(messaggio); }

    var colore = tinta(messaggio.colore, messaggio.nick);
    var riga = crea('li', 'pollaio__riga');
    var ruoli = messaggio.ruoli || {};

    riga.setAttribute('data-rilievo', messaggio.rilievo ? messaggio.rilievo.livello : 0);
    if (messaggio.id) { riga.setAttribute('data-id', messaggio.id); }
    if (messaggio.nick) { riga.setAttribute('data-nick', messaggio.nick); }

    /* I ruoli vanno sulla riga come classi e non come rilievo: servono al CSS
       per distinguere chi parla, ma un moderatore che scrive «ok» non è una
       cosa importante e non deve accendersi (§10 del contratto). */
    if (ruoli.capo) { riga.classList.add('is-capo'); }
    if (ruoli.mod)  { riga.classList.add('is-mod'); }
    if (ruoli.vip)  { riga.classList.add('is-vip'); }
    if (messaggio.tipo === 'azione') { riga.classList.add('is-azione'); }

    /* La targhetta va per PRIMA, in cima al riquadro: dice da dove arriva
       tutto quello che viene dopo, quindi deve stare prima di tutto quello
       che viene dopo. Messa in fondo racconterebbe la provenienza di un
       messaggio già letto. */
    var fonte = disegnaFonte(messaggio);
    if (fonte) { riga.appendChild(fonte); }

    if (messaggio.rilievo && messaggio.rilievo.etichetta) {
      riga.appendChild(crea('p', 'pollaio__etichetta', messaggio.rilievo.etichetta));
    }
    if (messaggio.risposta) {
      riga.appendChild(disegnaRisposta(messaggio.risposta));
    }

    riga.appendChild(disegnaTesta(messaggio, colore));
    riga.appendChild(disegnaCorpo(messaggio.pezzi || [], messaggio.tipo === 'azione' ? colore : null));

    return riga;
  }


  /* ---- 8. L'elenco -------------------------------------------------------- */

  /* Un setTimeout che si toglie da solo dall'elenco appena scatta.

     Senza, l'array `timer` cresce all'infinito: in otto ore di diretta a
     trenta messaggi al minuto sono decine di migliaia di numeri che non
     servono più a nessuno, e svuota() diventa un ciclo su tutti quelli.
     Il file prometteva già di non farlo — adesso è vero. */
  function fra(fn, ms) {
    var id = setTimeout(function () {
      var i = timer.indexOf(id);
      if (i !== -1) { timer.splice(i, 1); }
      fn();
    }, ms);
    timer.push(id);
    return id;
  }

  function spegni(id) {
    if (!id) { return; }
    clearTimeout(id);
    var i = timer.indexOf(id);
    if (i !== -1) { timer.splice(i, 1); }
  }

  /* Togliere una riga vuol dire anche spegnere i SUOI timer.

     Senza questa parte, il timer della dissolvenza tiene in vita il <li> —
     con dentro tutte le sue immagini — per tutta la durata di «svanisci», che
     arriva a dieci minuti. Il tetto stacca la riga dal DOM molto prima, ma la
     chiusura del timer continua a puntarla: in un raid si accumulano migliaia
     di nodi staccati che nessuno vede e nessuno libera. */
  function togli(riga) {
    var posto = righe.indexOf(riga);
    if (posto !== -1) { righe.splice(posto, 1); }

    spegni(riga.__uscita);
    spegni(riga.__entrata);
    riga.__uscita = null;
    riga.__entrata = null;

    if (riga.parentNode) { riga.parentNode.removeChild(riga); }
  }

  /* L'uscita in dissolvenza: si mette la classe, si aspetta la transizione e
     poi si stacca. La riga esce SUBITO dall'array `righe` perché per il tetto
     non conta più — sta già andandosene — ma resta nel DOM finché
     l'animazione non è finita. */
  function sfuma(riga) {
    var posto = righe.indexOf(riga);
    if (posto !== -1) { righe.splice(posto, 1); }

    riga.classList.add('is-svanisce');
    riga.__uscita = fra(function () {
      riga.__uscita = null;
      if (riga.parentNode) { riga.parentNode.removeChild(riga); }
    }, DURATA_USCITA);
  }


  /* --- Il freno all'ingresso ------------------------------------------------
     Un solo frame WebSocket porta spesso decine di righe, e prima ognuna
     diventava subito un nodo del DOM con la sua animazione: durante un raid
     il filo principale restava bloccato a costruire messaggi che nessuno fa
     in tempo a leggere. In OBS quello non è «l'overlay va a scatti», è la
     sorgente browser che perde fotogrammi in diretta.

     Quindi i messaggi si accodano e si disegnano al fotogramma successivo, a
     gruppi. Quello che eccede il tetto della coda si butta via SENZA mai
     diventare un nodo: in una raffica da duecento al secondo, i messaggi
     scorrerebbero comunque via prima di poterli leggere, e vale molto di più
     un overlay fluido che venti righe in più viste per un decimo di secondo.
     -------------------------------------------------------------------------- */

  /* Quanti se ne disegnano per fotogramma.

     Il conto vero dipende da chi sveglia la coda. Con i fotogrammi a 60 al
     secondo sono quasi cinquecento messaggi al secondo; con la sola rete di
     sicurezza da 100ms — cioè in OBS, dove i fotogrammi non arrivano — sono
     ottanta. Ottanta al secondo sono comunque il quadruplo di un raid grosso,
     ma il numero onesto è quello, non il primo. */
  var PER_FOTOGRAMMA = 8;

  /* Oltre questi in attesa si scartano i più VECCHI: in una chat che scorre
     l'ultimo messaggio conta più del primo. */
  var CODA_MAX = 60;

  var coda = [];
  var codaArmata = false;

  function drena() {
    codaArmata = false;
    var quanti = Math.min(PER_FOTOGRAMMA, coda.length);
    var i;
    for (i = 0; i < quanti; i++) { disegnaEAppendi(coda.shift()); }
    if (coda.length) { arma(); }
  }

  /* Il fotogramma NON basta da solo, e questa è la riga che salva l'overlay.

     In OBS la sorgente browser è quasi sempre «nascosta» per il browser anche
     mentre va in onda — è lo stesso motivo per cui irc.js non sospende la
     connessione a pagina nascosta. E a pagina nascosta requestAnimationFrame
     non viene chiamato: la coda non si svuoterebbe MAI, e la chat resterebbe
     ferma per tutta la diretta.

     Quindi si arma tutte e due: il fotogramma quando c'è, e un timer come rete
     di sicurezza. Vince chi arriva primo, l'altro trova `fatto` e si ferma. */
  function arma() {
    if (codaArmata) { return; }
    codaArmata = true;

    var fatto = false;
    function unaVolta() {
      if (fatto) { return; }
      fatto = true;
      drena();
    }

    if (typeof requestAnimationFrame === 'function') { requestAnimationFrame(unaVolta); }
    fra(unaVolta, 100);
  }

  function disegnaEAppendi(messaggio) {
    var riga;
    try {
      riga = disegna(messaggio);
    } catch (err) {
      /* Un messaggio storto non deve portare via la chat: si salta quello e
         si va avanti. È il tipo di guasto che, senza questa rete, si scopre
         in diretta davanti a duecento persone. */
      console.warn('[pollaio] non sono riuscito a disegnare un messaggio:', err);
      return null;
    }
    if (!riga) { return null; }

    /* La spia se ne va al PRIMO messaggio, non dopo un tot di secondi.
       Col timer cieco, su un canale spento o silenzioso, la finestra restava
       completamente vuota dopo tre secondi — che è esattamente come sembrava
       rotta. Finché nessuno scrive, «Sono nel pollaio» è l'unica cosa che
       distingue «collegato e in attesa» da «non funziona». */
    togliSpia();

    riga.classList.add('is-nuovo');

    if (conf.verso === 'giu' && nodi.elenco.firstChild) {
      nodi.elenco.insertBefore(riga, nodi.elenco.firstChild);
    } else {
      nodi.elenco.appendChild(riga);
    }
    righe.push(riga);

    riga.__entrata = fra(function () {
      riga.__entrata = null;
      riga.classList.remove('is-nuovo');
    }, durataEntrata(conf.effetto));

    /* L'unico effetto che ha bisogno del JS: gli altri sette li fa il CSS da
       solo con [data-effetto] e non passano di qui. */
    if (conf.effetto === 'matrix' && !menoMovimento) { scombina(riga); }

    /* Il tetto: i più vecchi escono senza dissolvenza. Se ne uscissero venti
       in dissolvenza tutti insieme durante un raid, il browser passerebbe
       mezzo secondo ad animare roba che nessuno sta guardando. */
    while (righe.length > conf.max) {
      togli(righe[0]);
    }

    if (conf.svanisci > 0) {
      riga.__uscita = fra(function () { sfuma(riga); }, conf.svanisci * 1000);
    }

    return riga;
  }

  function aggiungi(messaggio) {
    if (!nodi.elenco || !messaggio) { return false; }

    coda.push(messaggio);
    while (coda.length > CODA_MAX) { coda.shift(); }
    arma();
    return true;
  }

  /* CLEARMSG: un moderatore ha cancellato un messaggio preciso. */
  function cancella(id) {
    if (!nodi.elenco || !id || conf.moderazione === 'tieni') { return; }

    var trovata = nodi.elenco.querySelector('[data-id="' + String(id).replace(/["\\]/g, '') + '"]');
    if (!trovata) { return; }

    if (conf.moderazione === 'togli') { togli(trovata); return; }
    trovata.classList.add('is-cancellato');
  }

  /* CLEARCHAT su un nick: ban o pausa. Sparisce tutto quello che aveva
     scritto, che è il motivo per cui esiste il ban. */
  function cancellaDi(nick) {
    if (!nodi.elenco || !nick || conf.moderazione === 'tieni') { return; }

    var pulito = String(nick).toLowerCase().replace(/["\\]/g, '');
    var trovate = nodi.elenco.querySelectorAll('[data-nick="' + pulito + '"]');
    var i;

    for (i = 0; i < trovate.length; i++) {
      if (conf.moderazione === 'togli') { togli(trovate[i]); }
      else { trovate[i].classList.add('is-cancellato'); }
    }
  }

  function svuota() {
    var i;
    for (i = 0; i < timer.length; i++) { clearTimeout(timer[i]); }
    timer = [];
    righe = [];
    /* Anche la coda: un CLEARCHAT vuol dire «via tutto», e i messaggi che
       stanno per essere disegnati sono altrettanto «tutto». Disegnarli dopo
       lo svuotamento farebbe ricomparire in pagina proprio la roba che un
       moderatore ha appena tolto di mezzo. */
    coda = [];

    /* E la bandiera della coda, che è la riga più importante di questa
       funzione. Il ciclo sopra ha appena spento OGNI timer dell'elenco,
       compresa la rete di sicurezza che arma() usa quando i fotogrammi non
       arrivano — cioè quasi sempre, in OBS. Senza rimettere `codaArmata` a
       false, arma() esce alla prima riga per ogni messaggio successivo,
       drena() non viene più chiamato da nessuno e la chat resta ferma per il
       resto della diretta.

       E l'innesco è proprio il caso peggiore: un moderatore che svuota la chat
       MENTRE sta inondando, cioè il motivo per cui la svuota. */
    codaArmata = false;

    if (nodi.elenco) { nodi.elenco.textContent = ''; }
  }


  /* ---- 8-bis. L'Hype Train ------------------------------------------------
     La scheda del treno non sta nell'elenco dei messaggi: è appesa in cima e
     RESTA, perché è uno stato che dura minuti, non un messaggio che passa. Se
     stesse in mezzo alle righe scorrerebbe via proprio mentre la gente la
     guarda per sapere quanto manca.

     I secondi li conta il browser, non il server. treno.js legge lo stato ogni
     cinque secondi: se il conto alla rovescia si aggiornasse solo lì, si
     vedrebbe saltare di cinque in cinque. Qui parte un battito da un secondo
     che scala il numero da solo, e la lettura vera lo rimette in riga quando
     arriva.
     ------------------------------------------------------------------------ */

  var battitoTreno = null;
  var scadenzaTreno = 0;

  function tempoUmano(secondi) {
    var s = Math.max(0, Math.round(secondi));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function scriviTempo() {
    if (!nodi.trenoTempo) { return; }
    var restano = Math.round((scadenzaTreno - Date.now()) / 1000);
    nodi.trenoTempo.textContent = restano > 0 ? tempoUmano(restano) : '';

    /* Finito il conto, il battito si spegne da solo. Senza, resta un
       intervallo che scrive nel DOM una volta al secondo per tutte le ore
       che restano, su una fascia che intanto continua a dire «in corsa». */
    if (restano <= 0) { fermaBattito(); }
  }

  function fermaBattito() {
    clearInterval(battitoTreno);
    battitoTreno = null;
  }

  function treno(stato) {
    if (!nodi.treno) { return; }
    var s = stato || { fase: 'niente' };

    if (s.fase === 'niente') {
      fermaBattito();
      nodi.treno.hidden = true;
      nodi.treno.setAttribute('data-fase', 'niente');
      return;
    }

    nodi.treno.hidden = false;
    nodi.treno.setAttribute('data-fase', s.fase);
    /* Attributo e non classe: il Golden Kappa è una variante del treno, e il
       CSS lo veste con [data-golden] senza dover conoscere una classe in più. */
    if (s.golden) { nodi.treno.setAttribute('data-golden', '1'); }
    else { nodi.treno.removeAttribute('data-golden'); }

    if (nodi.trenoTitolo) {
      nodi.trenoTitolo.textContent =
        s.fase === 'arrivo' ? 'Treno in arrivo' :
        s.fase === 'finito' ? 'Treno finito' :
        s.golden            ? 'Golden Kappa Train' : 'Hype Train';
    }

    if (nodi.trenoLivello) {
      /* In arrivo non c'è un livello: si dice quanto manca a farlo partire,
         che è l'unica cosa che in quel momento interessa a qualcuno. */
      nodi.trenoLivello.textContent =
        s.fase === 'arrivo'
          ? (s.mancano > 0 ? 'Mancano ' + s.mancano : 'Ci siamo')
          : 'Livello ' + s.livello;
    }

    if (nodi.trenoRiempimento) {
      nodi.trenoRiempimento.style.setProperty('--percento', s.percento + '%');
    }

    if (nodi.trenoPunti) {
      nodi.trenoPunti.textContent =
        s.fase === 'arrivo' ? (s.partecipanti + ' in ballo')
                            : (s.punti + ' / ' + s.meta);
    }

    fermaBattito();
    if (s.fase === 'finito' || !s.restano) {
      if (nodi.trenoTempo) { nodi.trenoTempo.textContent = ''; }
      return;
    }

    scadenzaTreno = Date.now() + s.restano * 1000;
    scriviTempo();
    battitoTreno = setInterval(scriviTempo, 1000);
  }


  /* ---- 8-ter. L'effetto «matrix» -----------------------------------------
     I caratteri del messaggio arrivano scombinati e si ricompongono da
     sinistra a destra, come un terminale che decifra. È l'unico effetto che
     NON si può fare in CSS: bisogna riscrivere il testo fotogramma per
     fotogramma, e quindi vive qui invece che nel foglio di stile.

     Tre attenzioni, e sono tutte questioni di non far danni:

     1. Si toccano SOLO i nodi di testo. Le emote sono <img> e non hanno
        niente da scombinare; se si lavorasse sull'HTML della riga si
        distruggerebbero, e si violerebbe pure il §1.4.
     2. Il testo originale si mette da parte PRIMA e si rimette alla fine, in
        un `finally` logico: se qualcosa va storto a metà, il messaggio deve
        restare leggibile. Un effetto che può lasciare in pagina un messaggio
        illeggibile non vale il rischio.
     3. C'è un tetto ai caratteri e un tetto agli effetti in volo. In una
        raffica da venti messaggi al secondo, venti animazioni che riscrivono
        testo a ogni fotogramma fanno singhiozzare l'overlay — e l'overlay che
        singhiozza si vede in diretta, l'effetto elegante no.
     ------------------------------------------------------------------------ */

  /* Katakana a mezza larghezza più cifre e simboli: è l'alfabeto del
     terminale che decifra. Niente lettere latine minuscole, che a colpo
     d'occhio somigliano troppo al testo vero e l'effetto non si legge. */
  var GLIFI = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+=<>/\\|';

  var DURATA_MATRIX = 380;
  /* Oltre questi caratteri non si scombina: un messaggio lunghissimo costerebbe
     troppo per fotogramma, e comunque l'effetto si legge già nelle prime righe. */
  var MAX_MATRIX = 140;
  /* Quanti effetti possono girare insieme. Oltre, i nuovi messaggi entrano
     senza: meglio un effetto in meno che un overlay a scatti. */
  var MAX_IN_VOLO = 4;

  var inVolo = 0;

  function pescaGlifo() {
    return GLIFI.charAt((Math.random() * GLIFI.length) | 0);
  }

  function scombina(riga) {
    if (inVolo >= MAX_IN_VOLO) { return; }

    var corpo = riga.querySelector('.pollaio__corpo');
    if (!corpo) { return; }

    /* Si raccolgono i nodi di testo con il loro valore originale. Da qui in
       poi si lavora su questo elenco e mai sul DOM della riga. */
    var pezzi = [];
    var totale = 0;
    var i;
    for (i = 0; i < corpo.childNodes.length; i++) {
      var n = corpo.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue) {
        pezzi.push({ nodo: n, vero: n.nodeValue });
        totale += n.nodeValue.length;
      }
    }
    if (!pezzi.length || totale > MAX_MATRIX) { return; }

    inVolo++;
    var partito = 0;
    var finito = false;

    /* La durata si fissa QUI, una volta sola, e non si rilegge a ogni
       fotogramma. Nell'anteprima della regia il cursore della velocità si
       trascina mentre la chat scorre: rileggendola, il rapporto `avanti`
       farebbe un salto a metà corsa e i caratteri si ricomporrebbero
       all'indietro. Un effetto che torna indietro si legge come un difetto. */
    var durata = Math.round(DURATA_MATRIX * (100 / conf.velocita));

    function rimetti() {
      if (finito) { return; }
      finito = true;
      inVolo--;
      var k;
      for (k = 0; k < pezzi.length; k++) { pezzi[k].nodo.nodeValue = pezzi[k].vero; }
    }

    function passo(ora) {
      if (finito) { return; }
      if (!partito) { partito = ora; }

      /* Se la riga è stata staccata nel frattempo — tetto dei messaggi, ban,
         svuota — si smette subito: continuare a scrivere su nodi orfani è
         lavoro buttato che tiene in vita l'intero messaggio. */
      if (!riga.parentNode) { rimetti(); return; }

      var avanti = Math.min(1, (ora - partito) / durata);
      var risolti = Math.floor(avanti * totale);
      var visti = 0;
      var p;

      for (p = 0; p < pezzi.length; p++) {
        var vero = pezzi[p].vero;
        var fuori = '';
        var c;
        for (c = 0; c < vero.length; c++) {
          if (visti + c < risolti || vero.charAt(c) === ' ') { fuori += vero.charAt(c); }
          else { fuori += pescaGlifo(); }
        }
        pezzi[p].nodo.nodeValue = fuori;
        visti += vero.length;
      }

      if (avanti >= 1) { rimetti(); return; }
      requestAnimationFrame(passo);
    }

    requestAnimationFrame(passo);
    /* Rete di sicurezza: se per qualunque motivo i fotogrammi smettessero di
       arrivare (scheda in secondo piano, browser che stacca il rAF), il testo
       torna leggibile lo stesso. Senza questa riga un messaggio potrebbe
       restare scombinato per sempre. */
    fra(rimetti, durata + 600);
  }


  /* ---- 9. La spia di stato ------------------------------------------------ */

  function spia(stato, testo) {
    if (!nodi.spia) { return; }
    var s = String(stato || 'spenta');

    /* Tornando a collegarsi si riapre il diritto di spegnere la spia.

       Senza questa riga, `primoArrivato` restava alzato per sempre dopo il
       primo messaggio: alla prima caduta di linea la spia tornava verde e non
       si spegneva PIÙ, perché togliSpia() usciva subito. In otto ore di
       diretta una caduta di linea è quasi certa, quindi quel puntino verde in
       un angolo dell'overlay era garantito — ed è esattamente il rumore che si
       voleva evitare. */
    if (s === 'collego' || s === 'riprovo' || s === 'resa') { primoArrivato = false; }

    nodi.spia.setAttribute('data-stato', s);
    if (nodi.spiaTesto && testo !== undefined) { nodi.spiaTesto.textContent = String(testo); }
  }

  /* Si toglie SOLO la spia verde del «collegato», e una volta sola. Le altre
     restano: «ci riprovo» e «non ci riesco più» devono sopravvivere all'arrivo
     di un messaggio vecchio, e la spia PROVA deve restare per tutta la prova —
     è lì apposta perché non si scambi il traffico finto per quello vero. */
  function togliSpia() {
    if (primoArrivato || !nodi.spia) { return; }
    primoArrivato = true;
    if (nodi.spia.getAttribute('data-stato') === 'accesa') { spia('spenta', ''); }
  }


  /* ---- 10. API pubblica --------------------------------------------------- */

  function imposta(opzioni) {
    var o = opzioni || {};
    if (typeof o.max === 'number')      { conf.max = Math.max(1, o.max); }
    if (typeof o.svanisci === 'number') { conf.svanisci = Math.max(0, o.svanisci); }
    if (typeof o.orario === 'boolean')  { conf.orario = o.orario; }
    if (o.verso)                        { conf.verso = o.verso; }
    if (o.moderazione)                  { conf.moderazione = o.moderazione; }
    if (o.effetto)                      { conf.effetto = o.effetto; }

    /* Si controlla che sia un numero vero e maggiore di zero, non solo che
       ci sia: la velocità finisce a denominatore in durataEntrata(), e uno
       zero arrivato da un indirizzo storto darebbe Infinity, cioè una riga
       che resta «nuova» per sempre — col matrix vorrebbe dire un messaggio
       verde e in monospazio piantato in pagina fino a fine diretta. */
    if (typeof o.velocita === 'number' && isFinite(o.velocita) && o.velocita > 0) {
      conf.velocita = Math.max(25, Math.min(300, o.velocita));
    }

    if (typeof o.multi === 'boolean') { conf.multi = o.multi; }
    if (typeof o.anima === 'boolean') { conf.anima = o.anima; }
  }

  function monta(radice, opzioni) {
    if (!radice) { return false; }

    nodi.radice = radice;
    nodi.elenco = radice.querySelector('.pollaio__elenco');
    nodi.spia = radice.querySelector('.pollaio__spia');
    nodi.spiaTesto = radice.querySelector('.pollaio__spia-testo');

    nodi.treno = radice.querySelector('.pollaio__treno');
    nodi.trenoTitolo = radice.querySelector('.pollaio__treno-titolo');
    nodi.trenoLivello = radice.querySelector('.pollaio__treno-livello');
    nodi.trenoRiempimento = radice.querySelector('.pollaio__treno-riempimento');
    nodi.trenoPunti = radice.querySelector('.pollaio__treno-punti');
    nodi.trenoTempo = radice.querySelector('.pollaio__treno-tempo');

    imposta(opzioni);
    return !!nodi.elenco;
  }

  window.Resa = {
    monta: monta,
    imposta: imposta,
    aggiungi: aggiungi,
    cancella: cancella,
    cancellaDi: cancellaDi,
    svuota: svuota,
    spia: spia,
    treno: treno,
    tinta: tinta,
    quante: function () { return righe.length; }
  };

}());
