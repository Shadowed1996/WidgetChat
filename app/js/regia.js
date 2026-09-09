(function () {
  'use strict';

  const CHIAVE_SALVA = 'sb-pollaio-regia';

  const CHIAVE_PRESET = 'sb-pollaio-preset';

  const MAX_PRESET = 12;
  const MAX_NOME_PRESET = 24;

  const FRENO = 300;

  const DURATA_FATTO = 2000;

  const ALTEZZA_MIN = 200;
  const ALTEZZA_MAX = 1080;
  const ALTEZZA_PREDEFINITA = 640;

  const FONDO_PREDEFINITO = 'scacchi';
  const FONDI = ['scacchi', 'chiaro', 'scuro', 'gioco'];

  const ATTESA_SICURO = 5000;

  // Windows ha un interruttore — Accessibilità, Effetti visivi — che chiede a
  // tutti i programmi di muoversi il meno possibile, e il pollaio lo rispetta:
  // con «come dice il computer» non parte più nessun effetto d'ingresso. È la
  // cosa giusta da fare ed è l'unica cosa sbagliata da fare in silenzio: chi
  // non sa dell'interruttore vede i messaggi entrare secchi, dà la colpa al
  // widget e lo reinstalla. Qui glielo si dice, sotto al campo che lo governa,
  // che è l'unico posto dove verrebbe a cercarlo.
  const CALMA = (function () {
    try {
      return window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    } catch (err) { return null; }
  }());

  // L’interruttore c’è su tutte e due le versioni di Windows, ma non nello
  // stesso posto, e nominarne uno solo manda a cercarlo dove non c’è: chi sta
  // su Windows 10 legge il percorso di Windows 11, non lo trova, e conclude che
  // il suo caso è un altro. Poi c’è il terzo posto, quello che nessuno collega
  // all’overlay: «Regola per ottenere le prestazioni migliori» nelle opzioni
  // prestazioni spegne la stessa cosa, ed è la prima spunta che si tocca su un
  // computer da gioco. Chromium li legge tutti e tre allo stesso modo.
  const DETTO_CALMA = 'Il tuo computer chiede meno animazioni. Su Windows 11 è ' +
    'Impostazioni → Accessibilità → Effetti visivi → «Effetti di animazione»; su ' +
    'Windows 10 è Impostazioni → Accessibilità → Schermo → «Mostra animazioni in ' +
    'Windows». Lo spegne anche «Regola per ottenere le prestazioni migliori», ' +
    'nelle opzioni prestazioni di sistema. Finché resta così, con «come dice il ' +
    'computer» i messaggi entrano senza nessun effetto. Metti «anima comunque», ' +
    'oppure riaccendi quell’interruttore.';

  function chiedeCalma() {
    return !!(CALMA && CALMA.matches);
  }

  const GRUPPI = [
    {
      chiave: 'canale',
      titolo: 'Il canale',
      nota: 'Chi ascolto, e se in questo momento sto ascoltando davvero o mi sto inventando tutto.'
    },
    {
      chiave: 'chat',
      titolo: 'Le altre chat',
      nota: 'Il pollaio può raccogliere più chat in una sola, e mettere sopra ogni messaggio la targhetta di dove è stato scritto. TikTok non c’è, e non è una dimenticanza: la sua chat pretende una firma calcolata da un server, e questa è una pagina aperta dal disco. Non si può fare da qui, quindi non ti metto un campo che non farebbe niente. Le live congiunte di Twitch qui non hanno campi per un motivo diverso: si accendono da sole quando parte una Stream Together, e non c’è niente da scrivere.'
    },
    {
      chiave: 'aspetto',
      titolo: 'L’aspetto',
      nota: 'Come si presenta sopra al gioco. Sono le manopole che si toccano guardando l’anteprima, non leggendole.'
    },
    {
      chiave: 'contenuto',
      titolo: 'Cosa si vede',
      nota: 'Quanta roba tengo appesa e cosa disegno dentro ai messaggi. È anche il posto dove si va quando OBS comincia a perdere fotogrammi.'
    },
    {
      chiave: 'rilievo',
      titolo: 'Cosa si accende',
      nota: 'Le cose che non voglio perdere mentre gioco e guardo lo schermo con la coda dell’occhio.'
    },
    {
      chiave: 'moderazione',
      titolo: 'Pulizia',
      nota: 'Quello che in diretta non ci deve finire: i bot, i comandi, e i messaggi che qualcuno ha già cancellato.'
    },
    {
      chiave: 'barra',
      titolo: 'La barra sotto la chat',
      nota: 'La striscia con i filtri e il campo per scrivere sta dentro la finestra di Pollaio.exe e qui nell’anteprima: dove c’è un mouse, insomma. In una sorgente browser di OBS non compare mai — là non clicca nessuno, e sarebbe solo una striscia in meno di gameplay.'
    }
  ];

  let valori = null;

  let fondo = FONDO_PREDEFINITO;
  let altezza = ALTEZZA_PREDEFINITA;

  const comandi = {};

  let freno = null;
  let ultimoTelaio = '';
  let ritornoCopia = null;

  const nodi = {};

  function agganciaNodi() {
    const id = [
      'gruppi', 'gruppi-vuoto', 'scena', 'telaio', 'misura',
      'altezza', 'altezza-valore', 'indirizzo', 'copia', 'copia-testo',
      'apri', 'ripristina', 'conferma', 'conferma-si', 'conferma-no', 'eco', 'azzera-eco', 'scordata',
      'preset-elenco', 'preset-vuoto', 'preset-salva', 'preset-nome-riga',
      'preset-nome', 'preset-conferma', 'preset-annulla'
    ];
    let i;
    let nome;

    for (i = 0; i < id.length; i += 1) {

      nome = id[i].replace(/-(.)/g, function (tutto, lettera) { return lettera.toUpperCase(); });
      nodi[nome] = document.getElementById(id[i]);
      if (!nodi[nome]) { return false; }
    }
    return true;
  }

  function crea(tag, classe, testo) {
    const el = document.createElement(tag);
    if (classe) { el.className = classe; }
    if (testo != null) { el.textContent = testo; }
    return el;
  }

  function classeTipo(tipo) {
    if (tipo === 'sìno') { return 'sino'; }
    return tipo;
  }

  function normalizza(chiave, valore) {
    const uno = {};
    uno[chiave] = valore;
    return window.Impostazioni.leggi(window.Impostazioni.indirizzo(uno, ''))[chiave];
  }

  function scriviValore(out, numero, unita) {
    out.textContent = String(numero);
    if (unita) { out.appendChild(crea('span', 'regia__unita', unita)); }
  }

  function eco(messaggio, riuscito) {
    nodi.eco.textContent = messaggio || '';
    nodi.eco.classList.toggle('is-fatto', !!riuscito);
  }

  function idCampo(voce) { return 'campo-' + voce.chiave; }
  function idAiuto(voce) { return 'aiuto-' + voce.chiave; }

  function ossatura(voce) {
    const campo = crea('div', 'regia__campo regia__campo--' + classeTipo(voce.tipo));
    campo.setAttribute('data-tipo', voce.tipo);
    return campo;
  }

  function aiutoDi(voce) {
    const p = crea('p', 'regia__aiuto', voce.aiuto);
    p.id = idAiuto(voce);
    return p;
  }

  function campoSino(voce) {
    const campo = ossatura(voce);
    const riga = crea('div', 'regia__riga');

    const spunta = document.createElement('input');
    spunta.type = 'checkbox';
    spunta.className = 'regia__interruttore';
    spunta.id = idCampo(voce);
    spunta.setAttribute('aria-describedby', idAiuto(voce));

    const etichetta = crea('label', 'regia__etichetta', voce.etichetta);
    etichetta.htmlFor = spunta.id;

    const stato = crea('span', 'regia__stato', '');

    function dipingi(acceso) {
      campo.setAttribute('data-acceso', acceso ? '1' : '0');
      stato.textContent = acceso ? 'sì' : 'no';
    }

    spunta.addEventListener('change', function () {
      dipingi(spunta.checked);
      cambia(voce.chiave, spunta.checked);
    });

    comandi[voce.chiave] = function (valore) {
      spunta.checked = !!valore;
      dipingi(!!valore);
    };

    riga.appendChild(spunta);
    riga.appendChild(etichetta);
    riga.appendChild(stato);
    campo.appendChild(riga);
    campo.appendChild(aiutoDi(voce));
    return campo;
  }

  function campoNumero(voce) {
    const campo = ossatura(voce);

    const etichetta = crea('label', 'regia__etichetta', voce.etichetta);
    etichetta.htmlFor = idCampo(voce);

    const riga = crea('div', 'regia__riga');

    const cursore = document.createElement('input');
    cursore.type = 'range';
    cursore.className = 'regia__cursore';
    cursore.id = idCampo(voce);
    cursore.min = String(voce.min);
    cursore.max = String(voce.max);
    cursore.step = String(voce.passo || 1);
    cursore.setAttribute('aria-describedby', idAiuto(voce));

    const uscita = crea('output', 'regia__valore');
    uscita.setAttribute('for', cursore.id);

    let casella = null;

    function dipingi(numero) {
      scriviValore(uscita, numero, voce.unita);
    }

    cursore.addEventListener('input', function () {
      const n = parseInt(cursore.value, 10);
      if (!isFinite(n)) { return; }
      dipingi(n);
      if (casella) { casella.value = String(n); }
      cambia(voce.chiave, n);
    });

    riga.appendChild(cursore);
    riga.appendChild(uscita);

    if (voce.esatto) {
      const gruppetto = crea('div', 'regia__esatto');

      casella = document.createElement('input');
      casella.type = 'number';
      casella.className = 'regia__numero';
      casella.id = 'esatto-' + voce.chiave;
      casella.min = String(voce.min);
      casella.max = String(voce.max);
      casella.step = '1';
      casella.setAttribute('aria-describedby', idAiuto(voce));

      const unita = crea('label', 'regia__unita-etichetta', voce.unita || '');
      unita.htmlFor = casella.id;

      casella.addEventListener('input', function () {
        const n = parseInt(casella.value, 10);
        if (!isFinite(n) || n < voce.min || n > voce.max) { return; }
        cursore.value = String(n);
        dipingi(n);
        cambia(voce.chiave, n);
      });

      casella.addEventListener('change', function () {
        const n = normalizza(voce.chiave, casella.value);
        casella.value = String(n);
        cursore.value = String(n);
        dipingi(n);
        cambia(voce.chiave, n);
      });

      gruppetto.appendChild(casella);
      gruppetto.appendChild(unita);
      riga.appendChild(gruppetto);
    }

    comandi[voce.chiave] = function (valore) {
      cursore.value = String(valore);
      if (casella) { casella.value = String(valore); }
      dipingi(valore);
    };

    campo.appendChild(etichetta);
    campo.appendChild(riga);
    campo.appendChild(aiutoDi(voce));
    return campo;
  }

  function campoVoce(voce) {
    const campo = ossatura(voce);
    campo.setAttribute('role', 'group');

    const titolo = crea('span', 'regia__etichetta', voce.etichetta);
    titolo.id = idCampo(voce);
    campo.setAttribute('aria-labelledby', titolo.id);
    campo.setAttribute('aria-describedby', idAiuto(voce));

    // Il solo campo che ha qualcosa da dire quando il computer risponde per
    // conto suo: si accende da sé e sparisce appena la scelta è «sempre».
    const allarme = voce.chiave === 'movimento'
      ? crea('p', 'regia__allarme', DETTO_CALMA)
      : null;

    function vestiAllarme(valore) {
      if (!allarme) { return; }
      allarme.hidden = !(chiedeCalma() && valore !== 'sempre');
    }

    const segmenti = crea('div', 'regia__segmenti');
    const radio = [];
    let i;

    for (i = 0; i < voce.voci.length; i += 1) {
      (function (scelta) {
        const bottone = document.createElement('input');
        bottone.type = 'radio';
        bottone.className = 'regia__radio';
        bottone.name = 'voce-' + voce.chiave;
        bottone.id = 'voce-' + voce.chiave + '-' + scelta.valore;
        bottone.value = scelta.valore;

        const etichetta = crea('label', 'regia__segmento', scelta.etichetta);
        etichetta.htmlFor = bottone.id;

        bottone.addEventListener('change', function () {
          if (!bottone.checked) { return; }
          vestiAllarme(scelta.valore);
          cambia(voce.chiave, scelta.valore);
        });

        radio.push(bottone);
        segmenti.appendChild(bottone);
        segmenti.appendChild(etichetta);
      }(voce.voci[i]));
    }

    comandi[voce.chiave] = function (valore) {
      let k;
      for (k = 0; k < radio.length; k += 1) {
        radio[k].checked = (radio[k].value === valore);
      }
      vestiAllarme(valore);
    };

    campo.appendChild(titolo);
    campo.appendChild(segmenti);
    campo.appendChild(aiutoDi(voce));

    if (allarme) {
      allarme.hidden = true;
      campo.appendChild(allarme);

      // Chi va a girare l'interruttore di Windows e torna qui deve trovare
      // l'avviso già sparito, senza riaprire la regia.
      if (CALMA && typeof CALMA.addEventListener === 'function') {
        CALMA.addEventListener('change', function () {
          let scelto = 'auto';
          let k;
          for (k = 0; k < radio.length; k += 1) {
            if (radio[k].checked) { scelto = radio[k].value; }
          }
          vestiAllarme(scelto);
        });
      }
    }

    return campo;
  }

  function campoTesto(voce) {
    const campo = ossatura(voce);

    const etichetta = crea('label', 'regia__etichetta', voce.etichetta);
    etichetta.htmlFor = idCampo(voce);

    const casella = document.createElement('input');
    casella.type = 'text';
    casella.className = 'regia__testo';
    casella.id = idCampo(voce);
    casella.spellcheck = false;
    casella.autocapitalize = 'off';
    casella.setAttribute('autocomplete', 'off');
    casella.setAttribute('aria-describedby', idAiuto(voce));

    casella.addEventListener('input', function () {
      cambia(voce.chiave, casella.value);
    });

    casella.addEventListener('change', function () {
      const pulito = normalizza(voce.chiave, casella.value);
      casella.value = pulito;
      cambia(voce.chiave, pulito);
    });

    comandi[voce.chiave] = function (valore) {
      casella.value = String(valore);
    };

    campo.appendChild(etichetta);
    campo.appendChild(casella);
    campo.appendChild(aiutoDi(voce));
    return campo;
  }

  function costruisciCampo(voce) {
    if (voce.tipo === 'sìno') { return campoSino(voce); }
    if (voce.tipo === 'numero') { return campoNumero(voce); }
    if (voce.tipo === 'voce') { return campoVoce(voce); }
    return campoTesto(voce);
  }

  function ordineGruppi(schema) {
    const ordine = [];
    const visti = {};
    let i;

    for (i = 0; i < GRUPPI.length; i += 1) {
      ordine.push(GRUPPI[i]);
      visti[GRUPPI[i].chiave] = true;
    }

    for (i = 0; i < schema.length; i += 1) {
      if (!visti[schema[i].gruppo]) {
        visti[schema[i].gruppo] = true;
        ordine.push({ chiave: schema[i].gruppo, titolo: schema[i].gruppo, nota: '' });
      }
    }

    return ordine;
  }

  function costruisciComandi() {
    const schema = window.Impostazioni.SCHEMA;
    const ordine = ordineGruppi(schema);
    let i;
    let k;
    let gruppo;
    let sezione;
    let contenitore;
    let quanti;

    for (i = 0; i < ordine.length; i += 1) {
      gruppo = ordine[i];

      sezione = crea('section', 'regia__gruppo');
      sezione.appendChild(crea('h3', 'regia__gruppo-titolo', gruppo.titolo));
      if (gruppo.nota) { sezione.appendChild(crea('p', 'regia__gruppo-nota', gruppo.nota)); }

      contenitore = crea('div', 'regia__campi');
      quanti = 0;

      for (k = 0; k < schema.length; k += 1) {
        if (schema[k].gruppo !== gruppo.chiave) { continue; }

        if (schema[k].nascosta) { continue; }
        contenitore.appendChild(costruisciCampo(schema[k]));
        quanti += 1;
      }

      if (quanti === 0) { continue; }

      sezione.appendChild(contenitore);
      nodi.gruppi.appendChild(sezione);
    }

    if (nodi.gruppiVuoto && nodi.gruppiVuoto.parentNode) {
      nodi.gruppiVuoto.parentNode.removeChild(nodi.gruppiVuoto);
    }
  }

  function cambia(chiave, valore) {
    valori[chiave] = valore;
    disegnaIndirizzo();
    misuraTelaio();
    aggiornaAttuale();
    programma();
  }

  function scriviTuttiICampi() {
    const schema = window.Impostazioni.SCHEMA;
    let i;
    let chiave;
    for (i = 0; i < schema.length; i += 1) {
      chiave = schema[i].chiave;
      if (comandi[chiave]) { comandi[chiave](valori[chiave]); }
    }
  }

  // L’indirizzo da incollare in OBS e l’indirizzo che apre qui non sono lo
  // stesso. Dentro Pollaio.exe la pagina vive su https://pollaio.locale, che è
  // un nome mappato dentro quella WebView e da nessuna altra parte: risolvendo
  // lì si otteneva una riga che in OBS non apre niente, e il bottone Copia
  // dava proprio quella. Il launcher ci passa la cartella vera prima che parta
  // qualunque script, e da quella si scrive il `file:///` che OBS vuole.
  // Aperta in un browser normale la regia sta già su `file:///`, POLLAIO_CARTELLA
  // non c’è, e allora basta risolvere contro sé stessa come si è sempre fatto.
  function cartellaVera() {
    const dove = typeof window.POLLAIO_CARTELLA === 'string' ? window.POLLAIO_CARTELLA : '';
    return dove.split('\\').join('/').replace(/\/+$/, '');
  }

  function indirizzoQui() {
    const relativo = window.Impostazioni.indirizzo(valori);
    try { return new URL(relativo, window.location.href).href; }
    catch (err) { return relativo; }
  }

  // Il launcher tiene acceso un piccolo server sulla rete di casa e ci passa il
  // suo indirizzo. Quando c’è, batte il percorso del file per tre motivi buoni:
  // è corto, non si rompe se sposti la cartella, e funziona anche da un secondo
  // computer — che col `file:///` non era proprio possibile.
  function serventeVero() {
    const dove = typeof window.POLLAIO_SERVENTE === 'string' ? window.POLLAIO_SERVENTE : '';
    return /^http:\/\/[0-9]{1,3}(?:\.[0-9]{1,3}){3}:[0-9]{2,5}$/.test(dove) ? dove : '';
  }

  function inRete() {
    return serventeVero().length > 0;
  }

  function indirizzoDaIncollare() {
    const rete = serventeVero();
    if (rete) { return rete + '/' + window.Impostazioni.indirizzo(valori); }

    const cartella = cartellaVera();
    if (!cartella) { return indirizzoQui(); }

    // encodeURI e non encodeURIComponent: le barre e i due punti del percorso
    // devono restare quelli che sono, ma uno spazio nel nome dell’utente no.
    return 'file:///' + encodeURI(cartella).replace(/^\/+/, '') +
           '/' + window.Impostazioni.indirizzo(valori);
  }

  function disegnaIndirizzo() {
    nodi.indirizzo.textContent = indirizzoDaIncollare();
    vestiScordata();
  }

  function misuraTelaio() {
    const larghezza = normalizza('larghezza', valori.larghezza);
    nodi.telaio.style.inlineSize = larghezza + 'px';
    nodi.telaio.style.blockSize = altezza + 'px';
    nodi.misura.textContent = larghezza + ' × ' + altezza;
  }

  function indirizzoAnteprima() {
    const copia = {};
    let chiave;
    for (chiave in valori) {
      if (Object.prototype.hasOwnProperty.call(valori, chiave)) {
        copia[chiave] = valori[chiave];
      }
    }
    copia.prova = true;
    return window.Impostazioni.indirizzo(copia);
  }

  function ricaricaAnteprima() {
    const url = indirizzoAnteprima();

    if (url === ultimoTelaio) { return; }

    ultimoTelaio = url;
    nodi.telaio.src = url;
  }

  function programma() {
    clearTimeout(freno);
    freno = setTimeout(function () {
      freno = null;
      ricaricaAnteprima();
      salva();
    }, FRENO);
  }

  function salva() {

    try {
      localStorage.setItem(CHIAVE_SALVA, JSON.stringify({
        q: window.Impostazioni.indirizzo(valori, ''),
        fondo: fondo,
        altezza: altezza
      }));
    } catch (err) {  }
  }

  function ripesca() {
    try {
      const grezzo = localStorage.getItem(CHIAVE_SALVA);
      if (!grezzo) { return null; }

      const dato = JSON.parse(grezzo);
      if (!dato || typeof dato !== 'object') { return null; }
      return dato;
    } catch (err) {

      return null;
    }
  }

  function dimentica() {
    try {
      localStorage.removeItem(CHIAVE_SALVA);
    } catch (err) {  }
  }

  function chiaviDelLink(querystring) {
    const trovate = [];
    let q = String(querystring || '');
    let pezzi;
    let i;
    let nome;

    if (q.indexOf('#') !== -1) { q = q.slice(0, q.indexOf('#')); }
    if (q.indexOf('?') !== -1) { q = q.slice(q.indexOf('?') + 1); }
    if (q === '') { return trovate; }

    pezzi = q.split('&');
    for (i = 0; i < pezzi.length; i += 1) {
      if (pezzi[i] === '') { continue; }

      nome = pezzi[i].split('=')[0];
      try {
        nome = decodeURIComponent(nome.replace(/\+/g, ' '));
      } catch (err) {

      }

      if (Object.prototype.hasOwnProperty.call(window.Impostazioni.PREDEFINITE, nome) &&
          trovate.indexOf(nome) === -1) {
        trovate.push(nome);
      }
    }

    return trovate;
  }

  function valoriDiPartenza() {
    const salvato = ripesca();
    const dalLink = chiaviDelLink(location.search);
    let partenza;
    let daFuori;
    let i;

    partenza = window.Impostazioni.leggi(salvato && salvato.q ? salvato.q : '');

    if (salvato) {
      if (FONDI.indexOf(salvato.fondo) !== -1) { fondo = salvato.fondo; }
      if (isFinite(salvato.altezza)) {
        altezza = Math.min(ALTEZZA_MAX, Math.max(ALTEZZA_MIN, Math.round(salvato.altezza)));
      }
    }

    if (dalLink.length) {
      daFuori = window.Impostazioni.leggi(location.search);
      for (i = 0; i < dalLink.length; i += 1) {
        partenza[dalLink[i]] = daFuori[dalLink[i]];
      }
    }

    return { valori: partenza, dalLink: dalLink.length, dalSalvato: !!salvato };
  }

  let preset = [];

  function presetAttuale() {
    return window.Impostazioni.indirizzo(valori, '');
  }

  function leggiPreset() {
    let dato;

    try {
      const grezzo = localStorage.getItem(CHIAVE_PRESET);
      if (!grezzo) { return []; }
      dato = JSON.parse(grezzo);
    } catch (err) {

      return [];
    }

    if (!Array.isArray(dato)) { return []; }

    const buoni = [];
    for (let i = 0; i < dato.length && buoni.length < MAX_PRESET; i += 1) {
      const voce = dato[i];
      if (!voce || typeof voce !== 'object') { continue; }
      if (typeof voce.nome !== 'string' || !voce.nome) { continue; }
      if (typeof voce.q !== 'string') { continue; }

      buoni.push({
        nome: voce.nome.slice(0, MAX_NOME_PRESET),
        q: voce.q,
        fondo: FONDI.indexOf(voce.fondo) !== -1 ? voce.fondo : FONDO_PREDEFINITO,
        altezza: isFinite(voce.altezza)
          ? Math.min(ALTEZZA_MAX, Math.max(ALTEZZA_MIN, Math.round(voce.altezza)))
          : ALTEZZA_PREDEFINITA
      });
    }

    return buoni;
  }

  function scriviPreset() {
    try {
      localStorage.setItem(CHIAVE_PRESET, JSON.stringify(preset));
      return true;
    } catch (err) {
      return false;
    }
  }

  function disegnaPreset() {
    const attuale = presetAttuale();

    while (nodi.presetElenco.firstChild) {
      nodi.presetElenco.removeChild(nodi.presetElenco.firstChild);
    }

    nodi.presetVuoto.hidden = preset.length > 0;

    for (let i = 0; i < preset.length; i += 1) {
      nodi.presetElenco.appendChild(voceDiPreset(preset[i], i, attuale));
    }
  }

  function aggiornaAttuale() {
    const attuale = presetAttuale();
    const voci = nodi.presetElenco.children;
    for (let i = 0; i < voci.length; i += 1) {
      voci[i].classList.toggle('is-attuale', !!(preset[i] && preset[i].q === attuale));
    }
  }

  function voceDiPreset(voce, indice, attuale) {
    const li = crea('li', 'regia__preset-voce');
    if (voce.q === attuale) { li.classList.add('is-attuale'); }

    const carica = crea('button', 'regia__preset-carica', voce.nome);
    carica.type = 'button';
    carica.addEventListener('click', function () { applicaPreset(indice); });

    const togli = crea('button', 'regia__preset-togli', '×');
    togli.type = 'button';
    togli.title = 'Dimentica «' + voce.nome + '»';
    togli.setAttribute('aria-label', 'Dimentica «' + voce.nome + '»');
    togli.addEventListener('click', function () { chiediSeTogliere(li, indice); });

    li.appendChild(carica);
    li.appendChild(togli);
    return li;
  }

  function chiediSeTogliere(li, indice) {
    if (li.classList.contains('is-chiede')) { return; }
    li.classList.add('is-chiede');

    const chiesta = crea('span', 'regia__preset-chiesta');
    chiesta.appendChild(crea('span', null, 'Dimentico?'));

    const si = crea('button', 'regia__btn regia__btn--mini', 'Sì');
    si.type = 'button';
    si.addEventListener('click', function () { togliPreset(indice); });

    const no = crea('button', 'regia__btn regia__btn--mini', 'No');
    no.type = 'button';
    no.addEventListener('click', function () {
      li.classList.remove('is-chiede');
      if (chiesta.parentNode) { chiesta.parentNode.removeChild(chiesta); }
    });

    chiesta.appendChild(si);
    chiesta.appendChild(no);
    li.appendChild(chiesta);
    si.focus();
  }

  function togliPreset(indice) {
    const nome = preset[indice] ? preset[indice].nome : '';
    preset.splice(indice, 1);
    scriviPreset();
    disegnaPreset();
    eco('Fatto: «' + nome + '» non ce l’ho più.', true);
  }

  function applicaPreset(indice) {
    const voce = preset[indice];
    if (!voce) { return; }

    valori = window.Impostazioni.leggi(voce.q);
    fondo = voce.fondo;
    altezza = voce.altezza;

    clearTimeout(freno);
    freno = null;

    scriviTuttiICampi();
    scriviFondo();
    scriviAltezza();
    disegnaIndirizzo();
    misuraTelaio();
    ricaricaAnteprima();
    salva();
    disegnaPreset();

    eco('Ecco «' + voce.nome + '».', true);
  }

  function mostraNome(aperta) {
    nodi.presetNomeRiga.hidden = !aperta;
    nodi.presetSalva.setAttribute('aria-expanded', aperta ? 'true' : 'false');

    if (aperta) {

      const attuale = presetAttuale();
      let proposta = '';
      for (let i = 0; i < preset.length; i += 1) {
        if (preset[i].q === attuale) { proposta = preset[i].nome; break; }
      }
      nodi.presetNome.value = proposta;
      nodi.presetNome.focus();
      nodi.presetNome.select();
    } else {
      nodi.presetSalva.focus();
    }
  }

  function salvaPreset() {
    const nome = String(nodi.presetNome.value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_NOME_PRESET);

    if (!nome) {
      eco('Mi serve un nome, se no non la ritrovo più.', false);
      nodi.presetNome.focus();
      return;
    }

    const voce = { nome: nome, q: presetAttuale(), fondo: fondo, altezza: altezza };

    let trovata = -1;
    for (let i = 0; i < preset.length; i += 1) {
      if (preset[i].nome.toLowerCase() === nome.toLowerCase()) { trovata = i; break; }
    }

    if (trovata !== -1) {
      preset[trovata] = voce;
    } else {
      if (preset.length >= MAX_PRESET) {
        eco('Ne ho già ' + MAX_PRESET + '. Ne dimentico una e riprovo.', false);
        return;
      }
      preset.push(voce);
    }

    const riuscito = scriviPreset();
    mostraNome(false);
    disegnaPreset();

    if (riuscito) {
      eco(trovata !== -1
        ? 'Fatto: «' + nome + '» adesso è com’è qui.'
        : 'Fatto: me la ricordo come «' + nome + '».', true);
    } else {

      eco('Non sono riuscito a salvarla: questo browser non me lo lascia fare.', false);
    }
  }

  function ascoltaPreset() {
    nodi.presetSalva.addEventListener('click', function () {
      mostraNome(nodi.presetNomeRiga.hidden);
    });

    nodi.presetConferma.addEventListener('click', salvaPreset);

    nodi.presetAnnulla.addEventListener('click', function () {
      mostraNome(false);
    });

    nodi.presetNome.addEventListener('keydown', function (evento) {
      if (evento.key === 'Enter') {
        evento.preventDefault();
        salvaPreset();
      } else if (evento.key === 'Escape') {
        evento.preventDefault();
        mostraNome(false);
      }
    });
  }

  function seleziona(elemento) {
    try {
      const intervallo = document.createRange();
      intervallo.selectNodeContents(elemento);
      const scelta = window.getSelection();
      scelta.removeAllRanges();
      scelta.addRange(intervallo);
      return true;
    } catch (err) {
      return false;
    }
  }

  function agliAppunti(testo, fatto, fallito) {

    function storico() {

      try {
        const ta = document.createElement('textarea');
        ta.value = testo;
        ta.setAttribute('readonly', 'readonly');
        ta.style.position = 'fixed';
        ta.style.insetBlockStart = '-1000px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const riuscito = document.execCommand('copy');
        document.body.removeChild(ta);

        if (riuscito) { fatto(); } else { fallito(); }
      } catch (err) {
        fallito();
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(testo).then(fatto, storico);
    } else {
      storico();
    }
  }

  function segnalaCopia(testoBottone, messaggio, riuscito) {
    nodi.copiaTesto.textContent = testoBottone;
    nodi.copia.classList.toggle('is-fatto', !!riuscito);
    eco(messaggio, riuscito);

    clearTimeout(ritornoCopia);
    ritornoCopia = setTimeout(function () {
      nodi.copiaTesto.textContent = 'Copia';
      nodi.copia.classList.remove('is-fatto');
    }, DURATA_FATTO);
  }

  function copia() {
    agliAppunti(nodi.indirizzo.textContent, function () {
      segnalaCopia('Copiato', inRete()
        ? 'Copiato. In OBS: sorgente Browser, «File locale» senza spunta, e questo va nel campo URL — anche da un altro computer di casa, se il pollaio resta acceso qui.'
        : 'Copiato. In OBS: sorgente Browser, «File locale» senza spunta, e questo va nel campo URL.', true);
    }, function () {
      seleziona(nodi.indirizzo);
      segnalaCopia('Seleziona e copia', 'Gli appunti qui non me li lascia toccare. L’indirizzo è già selezionato: Ctrl+C e sei a posto.', false);
    });
  }

  // Si apre l’indirizzo di qui, non quello da incollare: dentro Pollaio.exe un
  // `file:///` aperto da una pagina https non lo lascia aprire nessuno, e la
  // finestra resterebbe bianca. È la stessa pagina con gli stessi parametri.
  function apri() {
    const finestra = window.open(indirizzoQui(), '_blank');
    if (finestra) {
      eco('L’ho aperto in un’altra finestra: stessa pagina, stessi parametri. Se lì si vede giusto, in OBS si vede giusto.', true);
    } else {
      eco('Il browser ha bloccato la finestra. Copio l’indirizzo e lo apro a mano, viene uguale.', false);
    }
  }

  function mostraConferma(aperta) {
    nodi.conferma.hidden = !aperta;
    nodi.ripristina.setAttribute('aria-expanded', aperta ? 'true' : 'false');
    if (aperta) {
      nodi.confermaSi.focus();
    } else {
      nodi.ripristina.focus();
    }
  }

  function ripristina() {
    valori = window.Impostazioni.leggi('');
    fondo = FONDO_PREDEFINITO;
    altezza = ALTEZZA_PREDEFINITA;

    clearTimeout(freno);
    freno = null;
    dimentica();

    try {
      history.replaceState(null, '', location.pathname);
    } catch (err) {  }

    scriviTuttiICampi();
    scriviFondo();
    scriviAltezza();
    disegnaIndirizzo();
    misuraTelaio();
    ricaricaAnteprima();
    aggiornaAttuale();

    mandaMisura(LARGHEZZA_FINESTRA, ALTEZZA_FINESTRA);

    const detto = 'Fatto: tutto com’era all’inizio, misura della finestra compresa. Le configurazioni salvate restano dove sono.';

    eco(detto, true);

    nodi.azzeraEco.textContent = detto;
    nodi.azzeraEco.classList.add('is-fatto');
  }

  function scriviFondo() {
    const bottoni = document.getElementsByName('fondo');
    let i;
    nodi.scena.setAttribute('data-fondo', fondo);
    for (i = 0; i < bottoni.length; i += 1) {
      bottoni[i].checked = (bottoni[i].value === fondo);
    }
  }

  function scriviAltezza() {
    nodi.altezza.value = String(altezza);
    scriviValore(nodi.altezzaValore, altezza, 'px');
  }

  function ascoltaAnteprima() {
    const bottoni = document.getElementsByName('fondo');
    let i;

    for (i = 0; i < bottoni.length; i += 1) {
      (function (bottone) {
        bottone.addEventListener('change', function () {
          if (!bottone.checked || FONDI.indexOf(bottone.value) === -1) { return; }
          fondo = bottone.value;
          nodi.scena.setAttribute('data-fondo', fondo);
          programma();
        });
      }(bottoni[i]));
    }

    nodi.altezza.addEventListener('input', function () {
      const n = parseInt(nodi.altezza.value, 10);
      if (!isFinite(n)) { return; }
      altezza = Math.min(ALTEZZA_MAX, Math.max(ALTEZZA_MIN, n));
      scriviValore(nodi.altezzaValore, altezza, 'px');
      misuraTelaio();
      programma();
    });
  }

  function ascoltaAzioni() {
    nodi.copia.addEventListener('click', copia);
    nodi.apri.addEventListener('click', apri);

    nodi.ripristina.addEventListener('click', function () {
      mostraConferma(nodi.conferma.hidden);
    });

    nodi.confermaSi.addEventListener('click', function () {
      mostraConferma(false);
      ripristina();
    });

    nodi.confermaNo.addEventListener('click', function () {
      mostraConferma(false);
      eco('Non ho toccato niente.', false);
    });

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape' && !nodi.conferma.hidden) {
        mostraConferma(false);
      }
    });
  }

  var MISURA_MIN = 160;
  var MISURA_MAX = 4000;
  var MISURA_PASSO = 10;

  var LARGHEZZA_FINESTRA = 400;
  var ALTEZZA_FINESTRA = 600;

  var fin = { larghezza: null, altezza: null, eco: null, dentro: false };

  function numeroDalLink(chiave, ripiego) {
    var q = String(location.search || '');
    var r = new RegExp('[?&]' + chiave + '=([0-9]{1,5})');
    var t = r.exec(q);
    if (!t) { return ripiego; }
    var n = parseInt(t[1], 10);
    if (!isFinite(n)) { return ripiego; }
    return Math.max(MISURA_MIN, Math.min(MISURA_MAX, n));
  }

  function ritagliaMisura(campo, ripiego) {
    var n = parseInt(campo.value, 10);
    if (!isFinite(n)) { return ripiego; }
    return Math.max(MISURA_MIN, Math.min(MISURA_MAX, n));
  }

  function ecoMisura(messaggio, riuscito) {
    if (!fin.eco) { return; }
    fin.eco.textContent = messaggio || '';
    fin.eco.classList.toggle('is-fatto', !!riuscito);
  }

  function mandaMisura(larghezza, altezza) {
    if (!fin.larghezza || !fin.altezza) { return; }

    fin.larghezza.value = String(larghezza);
    fin.altezza.value = String(altezza);

    if (!fin.dentro) { return; }

    window.Menu.comanda('misura:' + larghezza + 'x' + altezza);

    ecoMisura('Fatto: ' + larghezza + ' × ' + altezza + '.', true);
  }

  function rispostaMisura(quante) {
    var larghezza = ritagliaMisura(fin.larghezza, LARGHEZZA_FINESTRA);
    var altezza = ritagliaMisura(fin.altezza, ALTEZZA_FINESTRA);
    var misura = larghezza + ' × ' + altezza;

    if (quante > 0) {
      ecoMisura('Fatto: ' + misura + ', e la finestra della chat si è già rifatta così.', true);
    } else {
      ecoMisura('Fatto: ' + misura + '. La chat adesso non è aperta: nascerà di questa misura.', true);
    }
  }

  function passoMisura(bottone) {
    var campo = document.getElementById(bottone.getAttribute('data-campo'));
    if (!campo) { return; }

    var verso = bottone.getAttribute('data-verso') === 'giu' ? -1 : 1;
    var partenza = campo.id === 'fin-altezza' ? ALTEZZA_FINESTRA : LARGHEZZA_FINESTRA;
    var n = ritagliaMisura(campo, partenza) + verso * MISURA_PASSO;

    campo.value = String(Math.max(MISURA_MIN, Math.min(MISURA_MAX, n)));
  }

  function ascoltaFinestra() {
    var salva = document.getElementById('fin-salva');
    var azzera = document.getElementById('fin-ripristina');
    var nota = document.getElementById('fin-nota');

    fin.larghezza = document.getElementById('fin-larghezza');
    fin.altezza = document.getElementById('fin-altezza');
    fin.eco = document.getElementById('fin-eco');

    if (!fin.larghezza || !fin.altezza || !fin.eco || !salva || !azzera || !nota) { return; }

    fin.larghezza.value = String(numeroDalLink('finw', LARGHEZZA_FINESTRA));
    fin.altezza.value = String(numeroDalLink('finh', ALTEZZA_FINESTRA));

    var frecce = document.getElementsByClassName('regia__freccia');
    var i;
    for (i = 0; i < frecce.length; i += 1) {
      (function (bottone) {
        bottone.addEventListener('click', function () { passoMisura(bottone); });
      }(frecce[i]));
    }

    fin.dentro = !!(window.Menu && window.Menu.dentro && window.Menu.dentro());

    if (!fin.dentro) {
      salva.disabled = true;
      azzera.disabled = true;
      return;
    }

    nota.hidden = true;

    document.addEventListener('pollaio-risposta', function (evento) {
      if (!evento.detail || evento.detail.comando !== 'misura') { return; }
      rispostaMisura(parseInt(evento.detail.coda, 10) || 0);
    });

    salva.addEventListener('click', function () {
      mandaMisura(ritagliaMisura(fin.larghezza, LARGHEZZA_FINESTRA),
                  ritagliaMisura(fin.altezza, ALTEZZA_FINESTRA));
    });

    azzera.addEventListener('click', function () {
      mandaMisura(LARGHEZZA_FINESTRA, ALTEZZA_FINESTRA);
    });
  }

  // La finestra di Pollaio.exe non legge la regia: legge la riga `parametri=`
  // del .ini, e quelle due cose possono divergere in silenzio. Divergevano: si
  // giravano le manopole, l'anteprima ubbidiva, e la finestra vera restava con
  // le impostazioni di un'altra volta — che si legge come «l'effetto non
  // funziona nel .exe», non come «non gliel'ho ancora detto». Il bottone per
  // dirglielo c'era già; quello che mancava era qualcuno che ricordasse di
  // premerlo.
  function stessaCoda(una, altra) {
    const netta = function (coda) {
      const testo = String(coda || '').replace(/^[?&]+/, '');
      try { return window.Impostazioni.indirizzo(window.Impostazioni.leggi(testo), ''); }
      catch (err) { return testo; }
    };
    return netta(una) === netta(altra);
  }

  function vestiScordata() {
    if (!nodi.scordata) { return; }

    // Solo dentro Pollaio.exe: altrove non c’è nessuna finestra da tenere in
    // pari, e un avviso sarebbe rumore.
    if (typeof window.POLLAIO_PARAMETRI !== 'string' || !fin.dentro) {
      nodi.scordata.hidden = true;
      return;
    }

    const suo = window.POLLAIO_PARAMETRI;
    const mio = codaPerLaFinestra().coda;

    if (stessaCoda(suo, mio)) { nodi.scordata.hidden = true; return; }

    nodi.scordata.hidden = false;
    nodi.scordata.textContent = 'La finestra di Pollaio.exe e la sorgente di OBS ' +
      'stanno ancora usando altre impostazioni: quelle che vedi qui valgono per ' +
      'l’anteprima e per l’indirizzo da copiare, non per loro. Premi «Usala anche ' +
      'in Pollaio.exe»: la finestra si rifà subito, e la sorgente browser al ' +
      'prossimo ricarica.';
  }

  function codaPerLaFinestra() {
    const copia = {};
    let chiave;

    for (chiave in valori) {
      if (Object.prototype.hasOwnProperty.call(valori, chiave)) { copia[chiave] = valori[chiave]; }
    }

    const scurito = (copia.fondo === 'trasparente');
    if (scurito) { copia.fondo = 'scuro'; }

    let coda = window.Impostazioni.indirizzo(copia, '');
    if (coda.charAt(0) === '?') { coda = coda.slice(1); }

    return { coda: coda, scurito: scurito };
  }

  // La coda vera, quella senza la correzione del fondo: e' questa che va alla
  // sorgente browser di OBS, dove il trasparente e' esattamente il punto.
  function codaPerLaSorgente() {
    let coda = window.Impostazioni.indirizzo(valori, '');
    if (coda.charAt(0) === '?') { coda = coda.slice(1); }
    return coda;
  }

  function ascoltaUso() {
    const bottone = document.getElementById('usa-finestra');
    if (!bottone) { return; }

    if (!fin.dentro) {
      bottone.disabled = true;
      return;
    }

    let scurito = false;
    let mandata = '';

    document.addEventListener('pollaio-risposta', function (evento) {
      if (!evento.detail || evento.detail.comando !== 'parametri') { return; }

      if (evento.detail.coda === '0') {
        eco('Non sono riuscito a scrivere avvio\\pollaio.ini: guarda che non sia di sola lettura.', false);
        return;
      }

      // Adesso il .ini dice questo, quindi l’avviso si spegne senza aspettare
      // che qualcuno riapra la regia.
      window.POLLAIO_PARAMETRI = mandata;
      vestiScordata();

      // Tre stati, e il terzo e' quello che mancava: la finestra si e' gia'
      // rifatta, quindi «vale dal prossimo avvio» sarebbe una bugia. Si dice
      // solo quando e' vero, cioe' quando la finestra non c'era.
      const subito = evento.detail.coda === '2';

      const nota = scurito
        ? ' Il fondo trasparente in una finestra vera vuol dire bianco, e su bianco il testo chiaro sparisce: lì ho scritto «scuro». In OBS resta trasparente.'
        : '';

      eco((subito
        ? 'Fatto: la finestra di Pollaio.exe si è già rifatta così — si è ricollegata alla chat, quindi per un attimo è vuota.'
        : 'Fatto. La finestra non è aperta: vale dalla prossima volta che la apri.') + nota, true);
    });

    bottone.addEventListener('click', function () {
      const fuori = codaPerLaFinestra();
      scurito = fuori.scurito;
      mandata = fuori.coda;

      // Due code, due comandi: quella della finestra e quella della sorgente.
      window.Menu.comanda('parametri:' + fuori.coda);
      window.Menu.comanda('sorgente:' + codaPerLaSorgente());
    });
  }

  const nodiConto = {};

  let sicuroConto = null;

  let attivazioneConto = null;

  function ecoConto(messaggio, riuscito) {
    if (!nodiConto.eco) { return; }
    nodiConto.eco.textContent = messaggio || '';
    nodiConto.eco.classList.toggle('is-fatto', !!riuscito);
  }

  function agganciaConto() {
    const id = ['cliente', 'detto', 'codice', 'cifre', 'app',
                'collega', 'apri', 'copia', 'lascia', 'scollega', 'eco'];
    let i;

    for (i = 0; i < id.length; i += 1) {
      nodiConto[id[i]] = document.getElementById('conto-' + id[i]);
      if (!nodiConto[id[i]]) { return false; }
    }
    return true;
  }

  function fermaSicuro() {
    clearTimeout(sicuroConto);
    sicuroConto = null;
    nodiConto.scollega.textContent = 'Revoca account';
    nodiConto.scollega.classList.remove('is-chiede');
  }

  function dettoConto(stato) {
    const chi = window.Conto.chi();

    if (stato === 'dentro') {
      return 'Sei collegato come ' + ((chi && chi.nome) || 'te') + ': il campo sotto la chat scrive a nome tuo. ' +
        'Il collegamento si rinnova da solo, qui non devi tornarci più.';
    }

    if (stato === 'attesa') {
      if (!nodiConto.cifre.textContent) { return 'Sto chiedendo il codice a Twitch. Un attimo.'; }
      return 'Adesso tocca a te: su Twitch, che ti ho appena aperto, di’ di sì. ' +
        'Io resto qui a controllare finché non l’hai fatto.';
    }

    if (chi && window.Conto.scaduto()) {
      return 'Eri collegato come ' + (chi.nome || chi.nick) + ', ma il collegamento è scaduto e Twitch non me lo rinnova più. ' +
        'Si riconnette da qui, con un clic.';
    }

    if (window.Conto.serveClientId()) {
      return 'Non è collegato nessuno. Prima del primo collegamento mi serve il Client ID qui sotto: ' +
        'è la volta sola in cui questa pagina chiede qualcosa.';
    }

    return 'Non è collegato nessuno, e va benissimo così: senza collegamento il pollaio legge la chat e basta, ' +
      'che è quello che ha sempre fatto. Serve solo se voglio anche scrivere.';
  }

  function vestiConto(stato) {
    const niente = stato === 'niente';
    const attesa = stato === 'attesa';
    const dentro = stato === 'dentro';

    fermaSicuro();

    nodiConto.detto.textContent = dettoConto(stato);
    nodiConto.detto.classList.toggle('is-dentro', dentro);
    nodiConto.detto.classList.toggle('is-attesa', attesa);

    nodiConto.cliente.readOnly = !niente;
    if (!attesa) { nodiConto.cliente.value = window.Conto.cliente(); }

    if (niente && window.Conto.serveClientId()) { nodiConto.app.open = true; }

    nodiConto.codice.hidden = !(attesa && nodiConto.cifre.textContent);

    nodiConto.collega.hidden = !niente;
    nodiConto.collega.textContent = window.Conto.chi() ? 'Riconnetti account' : 'Connetti account';

    nodiConto.apri.hidden = !attesa;
    nodiConto.copia.hidden = !attesa;
    nodiConto.lascia.hidden = !attesa;
    nodiConto.scollega.hidden = !dentro;
  }

  function apriTwitch() {
    if (!attivazioneConto) { return false; }

    if (window.Menu && window.Menu.nellaVetrina && window.Menu.nellaVetrina()) {
      window.Menu.comanda('attiva:' + attivazioneConto.codice);
      return true;
    }
    return !!window.open(attivazioneConto.indirizzo, '_blank');
  }

  function passoConto(passo) {
    if (!passo) { return; }

    if (passo.fase === 'codice') {
      attivazioneConto = { codice: passo.codice, indirizzo: passo.indirizzo };
      nodiConto.cifre.textContent = passo.codice;
      vestiConto('attesa');

      ecoConto(apriTwitch()
        ? 'Ti ho aperto Twitch con il codice già dentro: lì dentro di’ di sì.'
        : 'Il browser non me l’ha lasciata aprire. Vai su twitch.tv/activate e scrivi il codice qui sotto.',
        true);
      return;
    }

    if (passo.fase === 'fatto') {
      attivazioneConto = null;
      nodiConto.cifre.textContent = '';
      vestiConto('dentro');
      ecoConto('Fatto: da adesso posso scrivere in chat a nome tuo.', true);
      return;
    }

    if (passo.fase === 'errore') {
      attivazioneConto = null;
      nodiConto.cifre.textContent = '';
      vestiConto('niente');
      ecoConto(passo.detto, false);
    }
  }

  function collegaConto() {
    const scritto = String(nodiConto.cliente.value || '').trim().toLowerCase();

    if (scritto && window.Conto.MODELLO_CLIENT.test(scritto)) {
      window.Conto.ricorda(scritto);
      nodiConto.cliente.value = scritto;
    }

    if (window.Conto.serveClientId()) {
      nodiConto.app.open = true;
      ecoConto('Mi manca il Client ID: senza quello Twitch non sa chi gli sta chiedendo il permesso. È la riga qui sotto, e si riempie una volta sola.', false);
      nodiConto.cliente.focus();
      return;
    }

    nodiConto.cifre.textContent = '';
    attivazioneConto = null;

    vestiConto('attesa');
    ecoConto('Chiedo il codice a Twitch.', false);

    window.Conto.chiedi('', passoConto);
  }

  function apriAttiva() {
    if (apriTwitch()) {
      ecoConto('Riaperto: il codice è già dentro l’indirizzo, basta confermare.', true);
      return;
    }
    ecoConto('Il browser ha bloccato la finestra. Vado a mano su twitch.tv/activate e scrivo il codice, viene uguale.', false);
  }

  function copiaCodice() {
    const testo = nodiConto.cifre.textContent;

    if (!testo) {
      ecoConto('Il codice non c’è ancora: aspetto che Twitch me lo dia.', false);
      return;
    }

    agliAppunti(testo, function () {
      ecoConto('Copiato: lo incollo su twitch.tv/activate.', true);
    }, function () {
      seleziona(nodiConto.cifre);
      ecoConto('Gli appunti qui non me li lascia toccare. Il codice è già selezionato: Ctrl+C e sei a posto.', false);
    });
  }

  function lasciaConto() {
    window.Conto.ferma();
    attivazioneConto = null;
    nodiConto.cifre.textContent = '';
    vestiConto('niente');
    ecoConto('Lasciato stare: non ho toccato niente e non è collegato nessuno.', false);
  }

  function scollegaConto() {
    if (!sicuroConto) {
      nodiConto.scollega.textContent = 'Sicuro? Revoco.';
      nodiConto.scollega.classList.add('is-chiede');

      sicuroConto = setTimeout(function () {
        sicuroConto = null;
        nodiConto.scollega.textContent = 'Revoca account';
        nodiConto.scollega.classList.remove('is-chiede');
        ecoConto('Ho lasciato perdere: sei ancora collegato.', false);
      }, ATTESA_SICURO);

      ecoConto('Un altro clic e revoco davvero. Se aspetto, lascio le cose come stanno.', false);
      return;
    }

    window.Conto.scollega();
    attivazioneConto = null;
    nodiConto.cifre.textContent = '';
    vestiConto('niente');
    ecoConto('Fatto: ho detto a Twitch di dimenticare il gettone e l’ho tolto da qui. Il Client ID resta, così riconnetterti è un clic.', true);
  }

  function ascoltaConto() {
    if (!window.Conto) { return; }
    if (!agganciaConto()) { return; }

    nodiConto.collega.addEventListener('click', collegaConto);
    nodiConto.apri.addEventListener('click', apriAttiva);
    nodiConto.copia.addEventListener('click', copiaCodice);
    nodiConto.lascia.addEventListener('click', lasciaConto);
    nodiConto.scollega.addEventListener('click', scollegaConto);

    vestiConto(window.Conto.collegato() ? 'dentro' : 'niente');
  }

  function avvia() {

    if (!window.Impostazioni || !window.Impostazioni.SCHEMA) { return; }
    if (!agganciaNodi()) { return; }

    const partenza = valoriDiPartenza();
    valori = partenza.valori;

    costruisciComandi();
    scriviTuttiICampi();
    scriviFondo();
    scriviAltezza();
    disegnaIndirizzo();
    misuraTelaio();

    nodi.misura.setAttribute('for', 'campo-larghezza altezza');

    preset = leggiPreset();
    disegnaPreset();

    ascoltaAnteprima();
    ascoltaAzioni();
    ascoltaPreset();
    ascoltaFinestra();
    ascoltaUso();
    ascoltaConto();

    ricaricaAnteprima();

    if (partenza.dalLink) {
      eco('Sto usando la configurazione che era nel link, non quella che avevo salvato qui.', false);
    } else if (partenza.dalSalvato) {
      eco('Ho ripescato la configurazione dell’ultima volta.', false);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia);
  } else {
    avvia();
  }

  window.Regia = {

    valori: function () {
      const copia = {};
      let chiave;
      for (chiave in valori) {
        if (Object.prototype.hasOwnProperty.call(valori, chiave)) {
          copia[chiave] = valori[chiave];
        }
      }
      return copia;
    },

    indirizzo: function () {
      return window.Impostazioni.indirizzo(valori);
    },

    ripristina: ripristina
  };
}());
