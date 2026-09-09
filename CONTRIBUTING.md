# Come contribuire

Grazie per l'interesse. Prima la cosa più importante, così non si perde tempo.

## I contributi esterni non sono aperti

«il pollaio» è software **proprietario** (vedi [`LICENSE`](LICENSE)). Le pull
request si accettano **solo su invito**: una PR non concordata viene chiusa
senza essere esaminata, non per scortesia ma perché accettarla creerebbe un
problema di titolarità dei diritti.

**Quello che invece è sempre benvenuto** è una segnalazione: un difetto, un caso
che non funziona, una spiegazione poco chiara nel manuale. Apri una
[issue](https://github.com/Shadowed1996/WidgetChat/issues/new/choose) e usa i
template.

Il resto di questo documento serve a chi lavora al codice — l'autore e chi è
stato invitato.

## Prima di scrivere una riga

Leggi [`CONTRATTO.md`](CONTRATTO.md). È un documento vincolante e viene prima di
questo: contiene i vincoli non negoziabili, la forma dell'oggetto «messaggio»,
l'elenco delle sorgenti in rete e chi possiede quale file. Chi non l'ha letto
finisce per riscrivere qualcosa che era già stato deciso.

In breve, i vincoli che non si toccano:

- **Zero dipendenze.** Niente npm, niente build, niente framework, niente CDN.
  Solo HTML, CSS e JavaScript scritti a mano.
- **Deve funzionare da `file://`.** Niente `type="module"`, niente `fetch` di
  file locali, niente percorsi assoluti: solo `<script src>` classici e percorsi
  relativi.
- **La lettura della chat resta anonima**, sempre. La scrittura si accende
  apposta, collegando un account.
- **Niente `innerHTML`** per la roba che arriva dalla chat.
- **Nessun colore scritto fuori da `app/css/tokens.css`**, e niente `!important`.
- **Tutto in italiano**: nomi di file, di variabili, di classi, di commenti.

## Segnalare un problema

Usa i template delle issue:

- **[Bug]** — cosa succede, cosa dovrebbe succedere, passi per riprodurre,
  ambiente (Windows, browser o WebView2, OBS), versione del pollaio, log.
- **[Funzionalità]** — quale problema risolve, la soluzione proposta, le
  alternative valutate.

Per una **vulnerabilità** non si apre una issue: si segue
[`SECURITY.md`](SECURITY.md).

Prima di aprire, controlla che il problema non sia già descritto nella sezione
«Se qualcosa non va» di [`LEGGIMI.md`](LEGGIMI.md), e che non ci sia già una
issue aperta uguale.

## Flusso di lavoro

1. Un branch per argomento, con nome `tipo/descrizione-breve`:
   `fix/emote-7tv-mancanti`, `feat/chat-di-kick`, `docs/tabella-impostazioni`.
2. **Un argomento per pull request.** Due correzioni scollegate sono due PR.
3. Prima di aprire la PR, allinea il branch a `main`.
4. Descrivi la PR col template: si compila, non si cancella.

## Convenzione dei commit

[Conventional Commits](https://www.conventionalcommits.org/), con la descrizione
**in italiano**, minuscola, all'infinito o al presente, senza punto finale:

```
tipo: descrizione breve di cosa cambia

Corpo facoltativo: il perché, non il cosa. Il cosa si legge dal diff.
```

Tipi ammessi:

| Tipo | Quando |
|---|---|
| `feat` | una funzionalità nuova |
| `fix` | una correzione |
| `docs` | solo documentazione |
| `style` | formattazione, senza cambi di comportamento |
| `refactor` | riscrittura che non cambia il comportamento |
| `perf` | prestazioni |
| `test` | casi del banco di prova |
| `chore` | manutenzione, configurazione, dipendenze |

Esempi:

```
fix: le emote di 7TV sparivano quando il canale non ne aveva
feat: la targhetta della piattaforma sui messaggi di Kick
docs: la tabella delle impostazioni segue il codice
```

I commit di release fanno eccezione e restano nella forma
`Versione X.Y.Z: cosa cambia`, perché è quella che finisce nelle note della
release.

## Stile del codice

Va imitato quello che c'è già. In sintesi, ma la versione autorevole è §2 e §3
del [`CONTRATTO.md`](CONTRATTO.md).

### JavaScript (`app/js/`)

- **Indentazione: 2 spazi.** Mai tab.
- **Un file = un IIFE = un globale.** Nessun `import`/`export`:

  ```js
  (function () {
    'use strict';
    /* ... */
    window.NomeModulo = { /* API pubblica, e solo quella */ };
  }());
  ```

- Stile ES5: `function` anonime, niente arrow function, niente classi, niente
  `async`/`await` nei file del widget — si usano le Promise con `.then`.
- **Costanti in MAIUSCOLO** in cima al file: `CANALE`, `MAX_MESSAGGI`.
- Accesso a `localStorage` **sempre dentro `try/catch`**, anche in lettura.
  Chiavi col prefisso `sb-pollaio-`.
- **Il codice pubblicato non porta commenti.** Si scrive commentato mentre si
  lavora — è il modo di non ripetere gli errori già pagati — e si spoglia alla
  fine. Le spiegazioni vecchie stanno nella storia di git:
  `git log -p --reverse -- app/js/kick.js`.
- Il solo file che tocca la pagina è `resa.js`. Gli altri non disegnano.

### CSS (`app/css/`)

- **Indentazione: 2 spazi.**
- Blocco `.pollaio`, **BEM leggero in italiano**: elemento `.pollaio__riga`,
  secondo livello col trattino singolo `.pollaio__riga-testa` (mai un secondo
  `__`), modificatore `.pollaio--nudo`, stato `.is-mod`.
- Stati enumerati su `data-*`, non su classi: `[data-tema="notte"]`,
  `[data-rilievo="alto"]`.
- **Proprietà logiche**: `inline-size`, `block-size`, `inset-inline-start`,
  `padding-block`, `border-block-end`. Mai `width`/`left`/`top` se esiste il
  corrispettivo logico.
- **I colori stanno solo in `tokens.css`.** Niente `!important`.
- Ogni file possiede solo il proprio blocco: nessuno scrive le classi di un altro.

### C# (`avvio/Pollaio.cs`)

- **Indentazione: 4 spazi.**
- Un solo file, un solo sorgente: `Pollaio.exe`, `Regia.exe` e `Installa.exe`
  sono lo stesso eseguibile con tre nomi, e il programma guarda come si chiama.
- Si compila col `csc.exe` del .NET Framework 4 già presente in Windows: non si
  introducono dipendenze da SDK o da NuGet.
- Le uniche librerie esterne ammesse sono le tre di WebView2 in `lib/`.

### Fine riga

Il progetto gira su Windows e i fine riga sono fissati a **CRLF** da
[`.gitattributes`](.gitattributes): un `.cmd` con fine riga di Unix funziona
finché non incontra una `goto`, e poi smette senza dire perché. Non cambiarlo.

## Provare le modifiche

Non c'è una build e non c'è un test runner: si apre il file.

1. **Il banco di prova**: doppio clic su `app/prove.html`. Deve dire verde. Se
   aggiungi un comportamento che deve restare vero, aggiungi il caso in
   `app/js/prove.js`.
2. **Il widget da solo**: `app/pollaio.html?prova=1` accende il traffico finto,
   e `&ostile=1` ci mescola i casi cattivi — zalgo, nomi ribaltati, muri di
   testo. È il modo di vedere le difese all'opera senza aspettare la diretta.
3. **In OBS**: `app/prova-obs.html` dice a schermo cosa sta facendo quel browser,
   quando la sorgente resta bianca.
4. **Il launcher**: `avvio\compila.cmd`, poi doppio clic su `Pollaio.exe`.

## Rilasciare una versione

Il workflow [`release.yml`](.github/workflows/release.yml) parte sul push di un
tag `v*`, e **la prima cosa che fa è controllare che il tag coincida con la
costante `VERSIONE` in `avvio/Pollaio.cs`**. Se i due numeri non combaciano si
ferma: il launcher si aggiorna confrontando quella costante col tag dell'ultima
release, quindi un disallineamento significa o non aggiornarsi mai, o
riaggiornarsi a ogni avvio.

Quindi, in ordine: si aggiorna `VERSIONE` in `avvio/Pollaio.cs`, si aggiorna il
[`CHANGELOG.md`](CHANGELOG.md), si committa, si tagga `vX.Y.Z` e si spinge il tag.

## Checklist prima di aprire una PR

- [ ] Ho letto `CONTRATTO.md` e la modifica non ne viola i vincoli.
- [ ] Un solo argomento in questa PR.
- [ ] Zero dipendenze aggiunte: niente npm, niente CDN, niente framework.
- [ ] Funziona ancora aperto da `file://`.
- [ ] `app/prove.html` è verde, e i casi nuovi sono stati aggiunti.
- [ ] Indentazione rispettata: 2 spazi in JS e CSS, 4 nel C#.
- [ ] I commenti di lavoro sono stati tolti dal codice pubblicato.
- [ ] Nessun colore fuori da `tokens.css`, nessun `!important`.
- [ ] Nessun `innerHTML` su roba che arriva dalla chat.
- [ ] **Nessun segreto committato**: gettoni, chiavi API, `pollaio.ini`.
- [ ] La documentazione tocca da questa modifica è aggiornata (`LEGGIMI.md`
      per chi usa, `CONTRATTO.md` per chi scrive).
- [ ] `CHANGELOG.md` aggiornato se la modifica è visibile a chi lo usa.
- [ ] Messaggi di commit secondo la convenzione qui sopra.

## Contatti

Filippo — [@Shadowed1996](https://github.com/Shadowed1996)
