/* =====================================================================
   regia.js — «il pollaio» · il configuratore (CONTRATTO §14)

   POSSIEDE: i comandi di regia.html. Li costruisce, li ascolta, ne
   ricava l'indirizzo, ricarica l'anteprima, ricorda le scelte fino
   alla volta dopo.

   NON POSSIEDE: le impostazioni. Quelle sono di impostazioni.js, e qui
   non ce n'è nemmeno una scritta a mano. Non possiede nemmeno
   l'overlay: quello vive dentro all'iframe, che è un altro documento
   con i suoi script e i suoi fogli. Da qui non lo si tocca, e va bene
   così — l'anteprima deve mostrare l'overlay vero, non una versione
   pilotata da chi la guarda.

   ---------------------------------------------------------------------
   I CAMPI NASCONO DALLO SCHEMA, SEMPRE
   ---------------------------------------------------------------------
   Nessun <input> è scritto in regia.html. Si scorre
   Impostazioni.SCHEMA, si raggruppa per `gruppo`, e per ogni voce si
   costruisce il comando adatto al suo `tipo`. Costa una cinquantina di
   righe in più di quanto costerebbe scrivere i campi a mano
   nell'HTML, e le vale tutte: il giorno che si aggiunge
   un'impostazione, questa pagina se ne accorge da sola. Se i campi
   fossero scritti a mano, la nuova voce si dimenticherebbe qui — e una
   regia che ignora un'impostazione è peggio di nessuna regia, perché
   consegna un indirizzo che sembra completo e non lo è.

   Un `gruppo` che non conosco non lo perdo: finisce in una sezione in
   fondo col suo nome grezzo. Brutta, ma tutti i comandi ci sono.

   ---------------------------------------------------------------------
   IL FRENO DA 300ms
   ---------------------------------------------------------------------
   L'indirizzo e il righello si aggiornano a ogni movimento, subito:
   sono testo, non costano niente, e la loro utilità è tutta nel vederli
   cambiare mentre si trascina. L'iframe no. Ricaricarlo vuol dire
   riaprire una WebSocket verso Twitch e riscaricare le emote: farlo
   trenta volte trascinando un cursore significa trenta connessioni
   aperte e chiuse in due secondi, e Twitch che comincia a rispondere
   di no. Quindi si aspetta che la mano si fermi.

   ---------------------------------------------------------------------
   CHI VINCE, FRA IL LINK E IL SALVATO
   ---------------------------------------------------------------------
   Vince il link, ma solo per le chiavi che porta davvero. Aprire
   `regia.html?tema=nudo` deve mostrare il tema nudo anche a chi qui
   dentro aveva salvato altro — altrimenti mandare a qualcuno il link
   di una configurazione non servirebbe a niente. Le chiavi che il link
   NON nomina restano quelle salvate: un link corto non deve azzerare
   mezz'ora di lavoro di chi lo apre.

   ---------------------------------------------------------------------
   INDICE
   ---------------------------------------------------------------------
     1. Costanti — chiavi, freno, gruppi, fondi
     2. Stato interno e aggancio al DOM
     3. Aiutanti minuti
     4. I campi, costruiti dallo SCHEMA
     5. Il giro dei valori: dal campo alla pagina
     6. L'indirizzo, il righello, l'anteprima col freno
     7. Il ricordo — localStorage
     7-bis. I preset — le configurazioni salvate con un nome
     8. Copia, apri, ripristina con conferma inline
     9. L'anteprima: fondo e altezza
    10. Avvio e API pubblica
   ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. Costanti
     ------------------------------------------------------------------ */

  // Prefisso obbligato per tutto il progetto (CONTRATTO §2).
  const CHIAVE_SALVA = 'sb-pollaio-regia';

  // Le configurazioni salvate con un nome stanno in una chiave LORO, e non
  // dentro a quella di sopra. Sono due cose diverse con due vite diverse:
  // «l'ultima volta» si riscrive a ogni manopola girata, i preset solo
  // quando lo si chiede. Tenerli insieme vorrebbe dire riscrivere l'intero
  // elenco dei preset trecento volte in mezz'ora di regolazioni, e perderli
  // tutti insieme il giorno che quel salvataggio si corrompe.
  const CHIAVE_PRESET = 'sb-pollaio-preset';

  // Oltre questi non si accetta: l'elenco è una riga di pastiglie e a un
  // certo punto diventa il problema che doveva risolvere.
  const MAX_PRESET = 12;
  const MAX_NOME_PRESET = 24;

  // Quanto aspetto che la mano si fermi prima di ricaricare l'iframe.
  // Trecento millisecondi è il numero che non si sente: sotto i due-
  // cento l'anteprima riparte mentre si sta ancora trascinando, sopra
  // il mezzo secondo sembra che la pagina ci pensi su.
  const FRENO = 300;

  // Quanto resta scritto «Copiato» sul bottone. Due secondi: il tempo
  // di leggerlo senza che diventi lo stato normale del bottone.
  const DURATA_FATTO = 2000;

  const ALTEZZA_MIN = 200;
  const ALTEZZA_MAX = 1080;
  const ALTEZZA_PREDEFINITA = 640;

  const FONDO_PREDEFINITO = 'scacchi';
  const FONDI = ['scacchi', 'chiaro', 'scuro', 'gioco'];

  /* I gruppi: ordine, titolo e la riga che dice cosa ci si trova.
     Stanno qui e non nello SCHEMA perché sono roba di questa pagina —
     un giorno il widget potrebbe avere una seconda interfaccia che
     raggruppa diversamente, e impostazioni.js non deve saperne niente.
     Le CHIAVI però vengono da lì: se lo SCHEMA porta un gruppo che qui
     non c'è, lo si vede comparire in fondo (vedi §4). */
  const GRUPPI = [
    {
      chiave: 'canale',
      titolo: 'Il canale',
      nota: 'Chi ascolto, e se in questo momento sto ascoltando davvero o mi sto inventando tutto.'
    },
    {
      chiave: 'chat',
      titolo: 'Le altre chat',
      nota: 'Il pollaio può raccogliere più chat in una sola, e mettere sopra ogni messaggio la targhetta di dove è stato scritto. TikTok non c’è, e non è una dimenticanza: la sua chat pretende una firma calcolata da un server, e questa è una pagina aperta dal disco. Non si può fare da qui, quindi non ti metto un campo che non farebbe niente.'
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
    }
  ];

  /* ------------------------------------------------------------------
     2. Stato interno e aggancio al DOM
     ------------------------------------------------------------------ */

  // I valori correnti, sempre della forma di Impostazioni.valori.
  let valori = null;

  // Le due preferenze che riguardano solo questa pagina e non
  // finiscono MAI nell'indirizzo: cosa c'è sotto all'anteprima e quanto
  // è alta. Non sono impostazioni dell'overlay, sono il banco di prova.
  let fondo = FONDO_PREDEFINITO;
  let altezza = ALTEZZA_PREDEFINITA;

  // chiave → funzione che riscrive il comando a schermo. La riempie §4,
  // la usa §5 quando i valori cambiano da fuori (ripristino, avvio).
  const comandi = {};

  let freno = null;          // il timer del ritardo sull'iframe
  let ultimoTelaio = '';     // l'ultimo src davvero assegnato
  let ritornoCopia = null;   // il timer che rimette «Copia» sul bottone

  const nodi = {};

  function agganciaNodi() {
    const id = [
      'gruppi', 'gruppi-vuoto', 'scena', 'telaio', 'misura',
      'altezza', 'altezza-valore', 'indirizzo', 'copia', 'copia-testo',
      'apri', 'ripristina', 'conferma', 'conferma-si', 'conferma-no', 'eco',
      'preset-elenco', 'preset-vuoto', 'preset-salva', 'preset-nome-riga',
      'preset-nome', 'preset-conferma', 'preset-annulla'
    ];
    let i;
    let nome;

    for (i = 0; i < id.length; i += 1) {
      // 'gruppi-vuoto' → nodi.gruppiVuoto: nel JS i nomi non hanno
      // trattini, negli id dell'HTML sì.
      nome = id[i].replace(/-(.)/g, function (tutto, lettera) { return lettera.toUpperCase(); });
      nodi[nome] = document.getElementById(id[i]);
      if (!nodi[nome]) { return false; }
    }
    return true;
  }

  /* ------------------------------------------------------------------
     3. Aiutanti minuti
     ------------------------------------------------------------------
     Tutto si costruisce con createElement e textContent. Qui il testo è
     roba nostra e non arriva dalla chat, ma la regola della casa
     (CONTRATTO §1.4) vale lo stesso: l'innerHTML non entra nel
     progetto, così non c'è nemmeno da discutere dove sia lecito.
     ------------------------------------------------------------------ */

  function crea(tag, classe, testo) {
    const el = document.createElement(tag);
    if (classe) { el.className = classe; }
    if (testo != null) { el.textContent = testo; }
    return el;
  }

  // Il nome del tipo diventa un pezzo di classe CSS: 'sìno' ha
  // l'accento, e un accento dentro un selettore è una scomodità che non
  // serve a nessuno.
  function classeTipo(tipo) {
    if (tipo === 'sìno') { return 'sino'; }
    return tipo;
  }

  // Ripulisce un valore facendogli fare il giro completo dall'esterno:
  // lo si scrive in una querystring e lo si rilegge. Passa da
  // indirizzo() e da leggi(), che sono le uniche due porte pubbliche di
  // impostazioni.js — quindi ritaglia, normalizza e ripiega esattamente
  // come farebbe l'overlay all'avvio. Nessuna regola copiata qui dentro,
  // nessuna copia da tenere allineata.
  function normalizza(chiave, valore) {
    const uno = {};
    uno[chiave] = valore;
    return window.Impostazioni.leggi(window.Impostazioni.indirizzo(uno, ''))[chiave];
  }

  // Scrive dentro a un <output> il numero e la sua unità. Il numero è un
  // nodo di testo e l'unità uno <span>: così l'unità resta più piccola e
  // tenue senza infilare markup dentro a una stringa.
  function scriviValore(out, numero, unita) {
    out.textContent = String(numero);
    if (unita) { out.appendChild(crea('span', 'regia__unita', unita)); }
  }

  function eco(messaggio, riuscito) {
    nodi.eco.textContent = messaggio || '';
    nodi.eco.classList.toggle('is-fatto', !!riuscito);
  }

  /* ------------------------------------------------------------------
     4. I campi, costruiti dallo SCHEMA
     ------------------------------------------------------------------
     Ogni costruttore restituisce l'elemento del campo e lascia in
     `comandi[chiave]` la funzione che sa riscrivere quel campo. Le due
     direzioni restano separate: gli ascoltatori spingono i valori in
     avanti (campo → valori), `comandi` li spinge indietro (valori →
     campo) quando a cambiarli è stato qualcun altro. Se la stessa
     funzione facesse tutte e due le cose, un Ripristina finirebbe per
     rilanciare un evento per campo e ricaricare l'anteprima altrettante
     volte.
     ------------------------------------------------------------------ */

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

  /* --- sìno: un interruttore ------------------------------------------
     È un <input type="checkbox"> vero, ridisegnato dal foglio. Non un
     <button aria-checked>: il checkbox porta con sé la barra
     spaziatrice, lo stato annunciato dai lettori di schermo e il clic
     sull'etichetta. Rifatto a mano, prima o poi uno dei tre si rompe. */
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

    // La parola accanto all'interruttore: il colore da solo non basta a
    // chi i colori non li distingue, e nemmeno a chi guarda di fretta.
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

  /* --- numero: un cursore, il valore in monospazio, e per i tre che
     contano anche una casella ------------------------------------------
     `voce.esatto` è nello SCHEMA e non in un elenco scritto qui: sono
     larghezza, max e svanisci, cioè i numeri che devono corrispondere a
     qualcosa di preciso — la larghezza della sorgente in OBS, un conto
     di messaggi, dei secondi. Col cursore, 420 su un arco che arriva a
     1000 non lo si prende, e ci si accontenta di 430. */
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

      // L'unità è una <label> vera legata alla casella: due caratteri
      // che sembrano decorazione e invece sono il nome del campo per
      // chi naviga a voce, dove «px» dopo «Larghezza della colonna»
      // basta e avanza.
      const unita = crea('label', 'regia__unita-etichetta', voce.unita || '');
      unita.htmlFor = casella.id;

      // Mentre si scrive si accetta solo un numero già dentro ai limiti:
      // battendo «9» per una larghezza che parte da 240 non si vuole
      // un'anteprima larga nove pixel per un attimo. Il ritaglio vero
      // arriva quando si esce dal campo, appena sotto.
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

  /* --- voce: bottoni-segmento -----------------------------------------
     Non una <select>: le opzioni sono due o tre, si vedono tutte
     insieme e si cambia idea con un clic invece che con due. Sotto sono
     <input type="radio">, quindi le frecce della tastiera funzionano da
     sole e non c'è niente da riscrivere.

     Il gruppo è un <div role="group"> e non un <fieldset>: il fieldset
     con display:flex fa cose strane alla sua <legend> in più di un
     motore, e l'etichetta di gruppo la si ottiene identica con
     aria-labelledby. */
  function campoVoce(voce) {
    const campo = ossatura(voce);
    campo.setAttribute('role', 'group');

    const titolo = crea('span', 'regia__etichetta', voce.etichetta);
    titolo.id = idCampo(voce);
    campo.setAttribute('aria-labelledby', titolo.id);
    campo.setAttribute('aria-describedby', idAiuto(voce));

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
          if (bottone.checked) { cambia(voce.chiave, scelta.valore); }
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
    };

    campo.appendChild(titolo);
    campo.appendChild(segmenti);
    campo.appendChild(aiutoDi(voce));
    return campo;
  }

  /* --- testo -----------------------------------------------------------
     Mentre si scrive non si riscrive mai dentro al campo: normalizzare
     a ogni tasto (minuscolo, spazi via, doppioni via) farebbe saltare il
     cursore in mezzo alla parola e battere una virgola diventerebbe una
     lotta. La ripulitura arriva quando si esce dal campo, e a quel punto
     si vede nero su bianco cosa ho capito di quello che è stato scritto. */
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

  /* --- l'ordine dei gruppi --------------------------------------------
     Prima quelli che conosco, nell'ordine in cui li ho scritti; poi
     tutti gli altri, nell'ordine dello SCHEMA. Il secondo giro è quello
     che salva la pagina il giorno che qualcuno inventa un gruppo nuovo:
     la sezione viene fuori senza titolo bello e senza nota, ma i suoi
     comandi ci sono tutti. Meglio brutta che assente. */
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

        /* Le voci `nascosta` non sono manopole: sono fatti che qualcun altro
           mette nell'indirizzo (oggi `finestra`, che ci scrive Pollaio.exe).
           Mostrarle qui vorrebbe dire offrire un interruttore che, acceso da
           questa pagina, non farebbe niente — e un configuratore che mente su
           cosa serve a cosa è peggio di uno che tace. Restano comunque nello
           SCHEMA, quindi Impostazioni le legge e indirizzo() le conserva. */
        if (schema[k].nascosta) { continue; }
        contenitore.appendChild(costruisciCampo(schema[k]));
        quanti += 1;
      }

      // Un gruppo dichiarato e rimasto senza voci non si stampa: sarebbe
      // un riquadro vuoto che sembra un pezzo di pagina non caricato.
      if (quanti === 0) { continue; }

      sezione.appendChild(contenitore);
      nodi.gruppi.appendChild(sezione);
    }

    // I comandi ci sono: il paragrafo che diceva «sto costruendo» ha
    // finito il suo lavoro e se ne va.
    if (nodi.gruppiVuoto && nodi.gruppiVuoto.parentNode) {
      nodi.gruppiVuoto.parentNode.removeChild(nodi.gruppiVuoto);
    }
  }

  /* ------------------------------------------------------------------
     5. Il giro dei valori: dal campo alla pagina
     ------------------------------------------------------------------ */

  // Una modifica sola, fatta da un campo. Tutto quello che è testo si
  // aggiorna subito; l'iframe e il salvataggio passano dal freno.
  function cambia(chiave, valore) {
    valori[chiave] = valore;
    disegnaIndirizzo();
    misuraTelaio();
    aggiornaAttuale();
    programma();
  }

  // I valori entrano nei campi. Non si passa da cambia(): qui a
  // muoversi sono i comandi, non i valori, e chiamare cambia()
  // una volta per campo vorrebbe dire altrettanti giri inutili.
  function scriviTuttiICampi() {
    const schema = window.Impostazioni.SCHEMA;
    let i;
    let chiave;
    for (i = 0; i < schema.length; i += 1) {
      chiave = schema[i].chiave;
      if (comandi[chiave]) { comandi[chiave](valori[chiave]); }
    }
  }

  /* ------------------------------------------------------------------
     6. L'indirizzo, il righello, l'anteprima col freno
     ------------------------------------------------------------------ */

  function disegnaIndirizzo() {
    /* Si mostra l'indirizzo ASSOLUTO, non `pollaio.html?...`.

       Quello relativo funziona solo dentro questa pagina: incollato nel campo
       URL di una Sorgente Browser di OBS non punta a niente, e chi lo copia si
       ritrova un riquadro bianco senza capire perché. Qui si sa dove sta il
       file — è la cartella di regia.html — quindi si consegna la forma
       `file:///C:/.../pollaio.html?...`, che è quella che OBS accetta.

       new URL() fa da sé la codifica di spazi e accenti nel percorso, che a
       mano si sbaglia sempre. Se per qualche motivo non si risolve, si torna
       al relativo: meglio un indirizzo corto che nessun indirizzo. */
    var relativo = window.Impostazioni.indirizzo(valori);
    var mostrato = relativo;
    try {
      mostrato = new URL(relativo, window.location.href).href;
    } catch (err) { /* si resta sul relativo */ }

    nodi.indirizzo.textContent = mostrato;
  }

  // Il righello: la larghezza scelta e l'altezza dell'anteprima, che
  // sono esattamente i due numeri da battere nella sorgente browser di
  // OBS. Stanno insieme perché è insieme che vanno copiati.
  function misuraTelaio() {
    const larghezza = normalizza('larghezza', valori.larghezza);
    nodi.telaio.style.inlineSize = larghezza + 'px';
    nodi.telaio.style.blockSize = altezza + 'px';
    nodi.misura.textContent = larghezza + ' × ' + altezza;
  }

  // L'indirizzo dell'anteprima è quello vero con la prova accesa: a
  // canale spento — cioè quasi sempre, quando si sistema un overlay —
  // senza traffico finto qui non si vedrebbe niente da sistemare.
  // L'interruttore «prova» dei comandi riguarda solo l'indirizzo che ci
  // si porta via.
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

    // Stesso indirizzo, stessa pagina: ricaricarla vorrebbe dire
    // buttare via una connessione a Twitch già aperta per riaprirne una
    // identica. Succede più spesso di quanto sembri — si trascina un
    // cursore e lo si riporta dov'era.
    if (url === ultimoTelaio) { return; }

    ultimoTelaio = url;
    nodi.telaio.src = url;
  }

  // Il freno: tutto ciò che costa caro aspetta che la mano si fermi.
  function programma() {
    clearTimeout(freno);
    freno = setTimeout(function () {
      freno = null;
      ricaricaAnteprima();
      salva();
    }, FRENO);
  }

  /* ------------------------------------------------------------------
     7. Il ricordo — localStorage
     ------------------------------------------------------------------
     Non si salva l'oggetto dei valori: si salva la QUERYSTRING, cioè la
     stessa forma corta che finisce nell'indirizzo. Costa una riga e
     regala tre cose.

     Primo: quello che torna dal salvataggio rientra da leggi(), quindi
     è ritagliato e ripiegato come qualunque cosa arrivi da fuori — un
     `scala: 9999` finito lì dentro per una versione vecchia del file
     non può rompere niente.
     Secondo: le chiavi rimaste al predefinito non si salvano affatto,
     quindi se domani un predefinito cambia, chi non l'aveva toccato si
     ritrova quello nuovo invece del vecchio congelato.
     Terzo: sta in mezzo riga e si legge a occhio nudo dagli strumenti
     del browser.

     Insieme viaggiano le due preferenze della pagina — il fondo
     dell'anteprima e la sua altezza — che nell'indirizzo non ci vanno
     perché non sono impostazioni dell'overlay.
     ------------------------------------------------------------------ */

  function salva() {
    // localStorage sempre dentro try/catch, anche in scrittura: in
    // navigazione privata o con i dati dei siti bloccati, il solo
    // accesso lancia (CONTRATTO §2). Non salvare è un peccato veniale,
    // fermare la pagina no.
    try {
      localStorage.setItem(CHIAVE_SALVA, JSON.stringify({
        q: window.Impostazioni.indirizzo(valori, ''),
        fondo: fondo,
        altezza: altezza
      }));
    } catch (err) { /* pazienza: la configurazione vive nell'indirizzo */ }
  }

  function ripesca() {
    try {
      const grezzo = localStorage.getItem(CHIAVE_SALVA);
      if (!grezzo) { return null; }

      const dato = JSON.parse(grezzo);
      if (!dato || typeof dato !== 'object') { return null; }
      return dato;
    } catch (err) {
      // Anche JSON.parse può lanciare: un salvataggio scritto da una
      // versione precedente non deve impedire l'avvio di questa.
      return null;
    }
  }

  function dimentica() {
    try {
      localStorage.removeItem(CHIAVE_SALVA);
    } catch (err) { /* non c'era niente da dimenticare */ }
  }

  /* --- chi vince fra il link e il salvato -----------------------------
     Impostazioni.leggi() restituisce sempre tutte le
     chiavi, quindi da sola non può dire QUALI stavano davvero nel link.
     Serve saperlo: le chiavi nominate dal link devono vincere sul
     salvato, le altre no. Da qui questo secondo giro sulla querystring,
     che guarda soltanto i nomi. */
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
        // Percentuale spaiata: resta il nome grezzo com'era. Al massimo
        // non corrisponde a nessuna chiave e il parametro viene
        // ignorato, che è esattamente quello che merita.
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

    // Il salvato passa da leggi(): è testo che arriva da fuori come
    // qualunque altro, e va ritagliato allo stesso modo.
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

  /* ------------------------------------------------------------------
     7-bis. I preset — le configurazioni salvate con un nome
     ------------------------------------------------------------------
     PERCHÉ. Una diretta non ha una configurazione sola: il gameplay vuole
     il tema nudo e una colonna stretta, le chiacchiere vogliono il vetro
     scuro e il testo grande, la cattura finestra vuole il fondo verde. Il
     ricordo del blocco 7 ne tiene UNA, l'ultima, quindi passare da una
     all'altra voleva dire rigirare a mano dieci manopole ogni volta — e
     dopo la seconda volta si smette di farlo e ci si tiene quella storta.

     COSA SI SALVA. Le stesse tre cose del blocco 7: la querystring, il
     fondo dell'anteprima e la sua altezza. La querystring per le stesse
     ragioni scritte là sopra — rientra da leggi() e quindi è ritagliata
     come qualunque cosa arrivi da fuori. Fondo e altezza perché fanno
     parte di come si stava lavorando: chi salva «chroma key» vuole
     ritrovare anche lo sfondo su cui lo stava controllando.

     IL NOME. Si chiede in pagina e non con un prompt(), per le stesse
     ragioni della conferma del blocco 8. Un nome che esiste già non
     genera un doppione: sovrascrive, che è quello che si intende quando
     si salva due volte con lo stesso nome dopo aver ritoccato qualcosa.
     ------------------------------------------------------------------ */

  let preset = [];

  // Quale pastiglia risulta accesa. Non è uno stato che si ricorda: si
  // ricalcola confrontando la querystring corrente, così basta girare una
  // manopola perché si spenga da sola. Una selezione che resta accesa
  // mentre i valori sono cambiati direbbe una bugia.
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
      // Salvataggio di una versione precedente, o scritto a mano da
      // qualcuno che curiosava: si riparte da zero invece di fermare la
      // pagina. Il §2 vuole il try/catch anche in lettura, ed è per questo.
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

  /* Ricostruisce l'elenco da capo a ogni cambiamento invece di ritoccare i
     nodi esistenti. Sono al massimo dodici pastiglie: la differenza non si
     misura, e un elenco ricostruito non può andare fuori sincrono con i
     dati, che è il difetto vero degli aggiornamenti parziali. */
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

  /* Solo la pastiglia accesa, senza ricostruire l'elenco. Serve perché
     cambia() passa di qui a ogni tasto premuto: ridisegnare tutto vorrebbe
     dire, fra le altre cose, far sparire sotto il naso una domanda
     «Dimentico?» aperta mentre si gira una manopola con l'altra mano. */
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

    // Il × porta la domanda dentro alla pastiglia stessa. Cancellare senza
    // chiedere è troppo facile da fare per sbaglio con un bersaglio piccolo
    // attaccato a quello che si usa di continuo.
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

    // Stessa sequenza di ripristina(), e non è una ripetizione casuale: è
    // l'unico ordine che funziona. I valori prima, i campi dopo, e
    // l'anteprima per ultima, quando tutto il resto è già a posto.
    valori = window.Impostazioni.leggi(voce.q);
    fondo = voce.fondo;
    altezza = voce.altezza;

    // Il freno in volo scriverebbe fra un decimo di secondo la
    // configurazione di PRIMA sopra a quella appena caricata.
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
      // Il nome di una configurazione già uguale a questa è il
      // suggerimento migliore che si possa dare: chi salva due volte la
      // stessa cosa quasi sempre la sta aggiornando.
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

    // Stesso nome: si sovrascrive al suo posto, senza spostarla in fondo.
    // Chi risalva «gameplay» dopo aver ritoccato una manopola sta
    // aggiornando quella, e vuole ritrovarla dov'era.
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
      // Succede in navigazione privata o a quota piena. Si dice, invece di
      // far credere che sia andata: il danno vero è scoprirlo fra un mese,
      // quando la configurazione serve e non c'è.
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

    // Invio salva, Esc lascia stare: dentro a un campo di testo sono i due
    // gesti che si fanno senza pensarci, e non trovarli è più fastidioso
    // che non avere il campo.
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

  /* ------------------------------------------------------------------
     8. Copia, apri, ripristina con conferma inline
     ------------------------------------------------------------------ */

  // Selezionare l'indirizzo in pagina è il ripiego onesto quando gli
  // appunti non sono disponibili: almeno il testo è già evidenziato e
  // basta un Ctrl+C.
  function selezionaIndirizzo() {
    try {
      const intervallo = document.createRange();
      intervallo.selectNodeContents(nodi.indirizzo);
      const scelta = window.getSelection();
      scelta.removeAllRanges();
      scelta.addRange(intervallo);
      return true;
    } catch (err) {
      return false;
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
    const testo = nodi.indirizzo.textContent;

    function fatto() {
      segnalaCopia('Copiato', 'Copiato. In OBS va nel campo del file locale della sorgente browser.', true);
    }

    function storico() {
      // Il vecchio execCommand su una textarea fuori campo. Funziona
      // ancora dove navigator.clipboard non c'è, cioè quasi sempre
      // quando la pagina è stata aperta con un doppio clic: file:// non
      // è un contesto sicuro e l'API degli appunti lì non esiste.
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

        if (riuscito) {
          fatto();
        } else {
          selezionaIndirizzo();
          segnalaCopia('Seleziona e copia', 'Gli appunti qui non me li lascia toccare. L’indirizzo è già selezionato: Ctrl+C e sei a posto.', false);
        }
      } catch (err) {
        selezionaIndirizzo();
        segnalaCopia('Seleziona e copia', 'Gli appunti qui non me li lascia toccare. L’indirizzo è già selezionato: Ctrl+C e sei a posto.', false);
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(testo).then(fatto, storico);
    } else {
      storico();
    }
  }

  function apri() {
    const finestra = window.open(nodi.indirizzo.textContent, '_blank');
    if (finestra) {
      eco('L’ho aperto in un’altra finestra. È l’indirizzo esatto, quello qui sotto: se lì si vede giusto, in OBS si vede giusto.', true);
    } else {
      eco('Il browser ha bloccato la finestra. Copio l’indirizzo e lo apro a mano, viene uguale.', false);
    }
  }

  /* --- la conferma inline ---------------------------------------------
     Un confirm() del browser ferma tutta la pagina, arriva senza
     contesto, parla la lingua del sistema e non si può scrivere come
     parla il resto della pagina. Qui il «Sicuro?» nasce accanto al
     bottone che l'ha provocato, dove l'occhio sta già guardando, e si
     chiude da solo con Esc. */
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

    // Prima si spegne il freno: un timer già in volo, scattando fra un
    // decimo di secondo, riscriverebbe in localStorage quello che qui
    // sotto stiamo per dimenticare.
    clearTimeout(freno);
    freno = null;
    dimentica();

    // Se la pagina era stata aperta con dei parametri nel link, quelli
    // resterebbero nella barra dell'indirizzo e tornerebbero al primo
    // ricaricamento: un Ripristina che dura fino a F5 non è un
    // ripristino. Su file:// replaceState può lanciare, quindi la si
    // tenta e amen.
    try {
      history.replaceState(null, '', location.pathname);
    } catch (err) { /* resta il link com'era: pazienza, i valori sono a posto */ }

    scriviTuttiICampi();
    scriviFondo();
    scriviAltezza();
    disegnaIndirizzo();
    misuraTelaio();
    ricaricaAnteprima();
    aggiornaAttuale();

    // Le configurazioni salvate con un nome NON si toccano. «Ripristina»
    // rimette le manopole com'erano all'inizio, e chi lo preme vuole
    // ripartire pulito da qui — non buttare via il lavoro di settimane che
    // sta in un'altra chiave e ha un bottone suo per essere dimenticato.
    eco('Fatto: tutto com’era all’inizio. Le configurazioni salvate restano dove sono.', true);
  }

  /* ------------------------------------------------------------------
     9. L'anteprima: fondo e altezza
     ------------------------------------------------------------------ */

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
          programma();   // qui serve solo a salvare: l'src non cambia
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

  /* ------------------------------------------------------------------
     10. Avvio e API pubblica
     ------------------------------------------------------------------ */

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

    // Esc chiude la conferma: è il gesto che tutti fanno d'istinto
    // davanti a una domanda che non si voleva.
    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape' && !nodi.conferma.hidden) {
        mostraConferma(false);
      }
    });
  }

  function avvia() {
    // Ogni file si disinnesca da solo (CONTRATTO §1.9). Qui manca il
    // modulo delle impostazioni o manca mezza pagina: si lascia in
    // piedi il paragrafo che spiega cosa non è andato e ci si ferma,
    // senza riempire la console di rosso.
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

    // Il righello dipende da due comandi: la larghezza, che è generata
    // dallo SCHEMA e ha il suo id solo adesso, e l'altezza, che sta
    // nell'HTML. Si dichiarano tutti e due, perché è da tutti e due che
    // quel numero viene fuori.
    nodi.misura.setAttribute('for', 'campo-larghezza altezza');

    preset = leggiPreset();
    disegnaPreset();

    ascoltaAnteprima();
    ascoltaAzioni();
    ascoltaPreset();

    // La prima anteprima parte subito: qui non c'è nessuna mano da
    // aspettare, e mezzo secondo di riquadro vuoto all'apertura si
    // legge come una pagina che non funziona.
    ricaricaAnteprima();

    if (partenza.dalLink) {
      eco('Sto usando la configurazione che era nel link, non quella che avevo salvato qui.', false);
    } else if (partenza.dalSalvato) {
      eco('Ho ripescato la configurazione dell’ultima volta.', false);
    }
  }

  // I due script stanno in fondo al body, quindi il DOM c'è già. Il
  // controllo su readyState è la rete di sicurezza per il giorno che
  // qualcuno li sposta nel <head> con un defer.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia);
  } else {
    avvia();
  }

  window.Regia = {
    // Una copia, non l'oggetto vero: da fuori si guarda, non si scrive.
    // Chi vuole cambiare qualcosa gira una manopola, come tutti.
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
