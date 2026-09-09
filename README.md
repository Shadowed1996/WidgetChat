# il pollaio

Widget della chat di **Twitch**, **Kick** e **YouTube** da mettere in OBS: si
collega alla chat vera, la disegna con la grafica del canale e si cattura come
sorgente browser sopra al gameplay.

![Versione](https://img.shields.io/badge/versione-1.2.16-8b2fff)
![Piattaforma](https://img.shields.io/badge/piattaforma-Windows-22e0ff)
![Dipendenze](https://img.shields.io/badge/dipendenze-zero-3fb950)
![Licenza](https://img.shields.io/badge/licenza-proprietaria-6e7681)

---

## Cos'è

Il pollaio è un overlay di chat per chi trasmette in diretta. È una pagina HTML
autonoma — niente `npm install`, niente framework, niente CDN — che entra in
chat, disegna emote, badge, moderatori, abbonamenti, raid, bits e hype train, ed
evidenzia le cose che meritano di essere notate mentre i messaggi scorrono.

Per **guardare** la chat non serve niente: il widget si collega in anonimo,
senza account e senza password. Un account Twitch serve solo se si vuole anche
**fare** qualcosa — scrivere dal campo in fondo, dare i comandi da moderatore,
aprire un sondaggio, vedere chi c'è in chat — e si collega con un clic.

Accanto al widget c'è un launcher Windows scritto in C# (`Pollaio.exe`) che apre
la chat in una finestra senza cornice già dimensionata per OBS, serve la stessa
pagina sulla rete di casa e si aggiorna da solo dalle release di questo
repository.

## Funzionalità

- **Chat multipiattaforma** — Twitch via IRC, Kick e una diretta YouTube unite
  nello stesso flusso, con la targhetta della piattaforma su ogni messaggio.
- **Live congiunte di Twitch** — chi scrive da un altro canale compare con la
  sua faccia, i suoi badge e le sue emote, senza collegare alcun account.
- **Emote e badge** — Twitch, 7TV, BetterTTV, FrankerFaceZ e cheermote, con un
  ripiego disegnato a mano quando un badge non arriva.
- **Rilievo** — menzioni, parole scelte da te e primo messaggio di chi non ha
  mai scritto vengono accesi, su tre livelli di forza.
- **Eventi** — abbonamenti, riabbonamenti, regali singoli e in blocco, raid,
  annunci, bits, ban, pause e cancellazioni dei moderatori.
- **Hype train** — la fascia dedicata, con livello e avanzamento.
- **Barra sotto la chat** — filtri, pausa, campo per scrivere, suggeritore di
  emote che si apre coi due punti, pannellini di sondaggio e pronostico.
- **Comandi di Twitch** — i comandi dal campo della chat, il menù sul nome e il
  pannello di chi c'è in chat (serve l'account collegato).
- **Regia** — un configuratore con anteprima dal vivo: temi, effetti d'ingresso,
  scala, spaziatura, colore di fondo, misura della finestra. Si preme **Salva** e
  si aggiornano insieme la finestra del launcher e la sorgente in OBS.
- **Server locale** — con il launcher acceso, in OBS si incolla solo indirizzo e
  porta: la configurazione la attacca il server, e funziona anche da un secondo
  computer della rete di casa.
- **Banco di prova** — `app/prove.html`: doppio clic, dice verde o rosso, e
  funziona anche col cavo staccato.
- **Aggiornamento automatico** — il launcher confronta la propria versione con
  l'ultima release e si aggiorna all'avvio, lasciando intatte le preferenze.

## Requisiti

| Componente | Requisito |
|---|---|
| Widget (`app/`) | un browser qualsiasi, oppure la sorgente browser di OBS. Nessuna dipendenza da installare |
| Launcher (`Pollaio.exe`) | Windows a 64 bit |
| Compilazione del launcher | .NET Framework 4 — il `csc.exe` che Windows si porta dietro, presente di serie su Windows 10 e 11 |
| Motore di disegno | Microsoft Edge WebView2; le librerie sono in `lib/`. Se manca il runtime, il launcher ripiega su Chrome |
| Account | facoltativo. Serve solo per scrivere in chat, per i comandi e per sapere chi c'è |

Il widget da solo funziona anche aperto da `file://`, senza server e senza rete.

## Installazione e avvio

### Per usarlo

Scarica **`Installa.exe`** dalla pagina
[Releases](https://github.com/Shadowed1996/WidgetChat/releases) e fai doppio
clic: chiede dove mettere le cose, scarica l'ultima versione, la scompatta e
lascia il collegamento sul desktop. Non chiede i permessi di amministratore e non
tocca il registro. In alternativa c'è `pollaio.zip`, da scompattare a mano.

### Dal codice sorgente

```bash
git clone https://github.com/Shadowed1996/WidgetChat.git
cd WidgetChat
```

Il widget è già pronto: si apre `app/pollaio.html` con un doppio clic.

Per costruire il launcher, doppio clic su `avvio\compila.cmd`, oppure da
`cmd.exe`:

```bat
avvio\compila.cmd
```

Non installa niente: cerca il `csc.exe` del .NET Framework 4 in
`C:\Windows\Microsoft.NET`, compila `avvio\Pollaio.cs`, genera l'icona da
`app\img\favicon.png`, ricompila con l'icona e copia il risultato in `Regia.exe`.
`Pollaio.exe` e `Regia.exe` finiscono nella radice del progetto e non sono
versionati: li ricostruisce la compilazione, e le versioni pronte stanno nelle
release.

### In OBS

Col launcher acceso, il modo giusto per l'overlay è la **sorgente browser**
sull'indirizzo corto che dà il bottone **Copia** della regia:

```
Sorgente → + → Browser
  ☐ File locale        ← senza spunta
  URL:        http://192.168.1.20:4747
  Larghezza:  400
  Altezza:    600
```

Senza server si punta al file, sempre con la spunta «File locale» **tolta**:
`file:///C:/.../app/pollaio.html?tema=nudo&scala=120`. La differenza fra i due
modi, e perché la cattura finestra non tiene la trasparenza, è spiegata per
esteso in [`LEGGIMI.md`](LEGGIMI.md).

## Struttura del progetto

```
.
├─ app/            il widget: è questa la cartella che si punta da OBS
│  ├─ pollaio.html   l'overlay della chat
│  ├─ regia.html     il configuratore, con l'anteprima dal vivo
│  ├─ prove.html     il banco di prova: doppio clic, dice verde o rosso
│  ├─ prova-obs.html diagnostica da mettere in OBS quando non si vede niente
│  ├─ css/           tokens (l'unico file coi colori), overlay, regia, menu, font
│  ├─ font/          Space Grotesk, Manrope e JetBrains Mono in locale
│  ├─ img/           mascotte, avatar, icona
│  └─ js/            i moduli del widget, uno per compito
├─ avvio/          il launcher Windows
│  ├─ Pollaio.cs     il sorgente C#
│  └─ compila.cmd    lo ricompila senza installare nulla
├─ lib/            le tre librerie di WebView2, il motore che disegna la finestra
├─ LEGGIMI.md      il manuale completo, per chi lo usa
└─ CONTRATTO.md    le regole del progetto, per chi ci mette mano
```

I moduli in `app/js/` hanno nomi italiani e un compito ciascuno:

| File | Cosa fa |
|---|---|
| `impostazioni.js` | legge le impostazioni dall'indirizzo |
| `irc.js` | la connessione alla chat di Twitch e il protocollo |
| `kick.js` · `youtube.js` | le chat di Kick e di una diretta YouTube |
| `emote.js` · `badge.js` | Twitch, 7TV, BetterTTV, FrankerFaceZ, cheermote e badge |
| `rilievo.js` | decide cosa è importante |
| `eventi.js` | abbonamenti, raid, bits, moderazione |
| `treno.js` | l'hype train |
| `stormo.js` | le live congiunte: chi sono gli altri canali |
| `resa.js` | l'unico file che tocca la pagina |
| `conto.js` | il collegamento con l'account Twitch, e il mandare |
| `comandi.js` | i comandi: cosa vuol dire ognuno, che permesso vuole, a quale endpoint va |
| `gente.js` | quanti guardano, chi c'è in chat, e chi è cosa |
| `azioni.js` | il menù che si apre cliccando un nome |
| `barra.js` | la striscia sotto la chat: filtri, pausa, campo, suggeritore |
| `prova.js` · `prove.js` | il traffico finto e i casi del banco di prova |
| `menu.js` | il tasto destro e i bordi che si tirano |
| `regia.js` | il configuratore |
| `pollaio.js` | mette insieme i pezzi |

## Configurazione

Ci sono due posti, e non si sovrappongono.

**Le impostazioni del widget** si scrivono dopo il `?` nell'indirizzo, separate
da `&`, e sono tutte facoltative — `pollaio.html` da solo funziona già. Non c'è
bisogno di impararle: le costruisce la regia. Le principali:

| Chiave | Esempio | Cosa fa |
|---|---|---|
| `canale` | `slayer_beard` | il canale Twitch da seguire |
| `kick` · `youtube` | *(vuoto)* | le altre due chat da unire, quando ci sono |
| `tema` | `notte` | `notte`, `nudo` o `insegna` |
| `fondo` | `trasparente` | `trasparente` per OBS, `scuro` per la finestra, `verde`/`magenta` per il chroma key |
| `larghezza` · `scala` | `420` · `100` | larghezza della colonna e grandezza del testo |
| `effetto` · `velocita` | `scivola` · `100` | come entra un messaggio, e quanto va svelto |
| `max` · `svanisci` | `40` · `0` | quanti messaggi restano appesi, e dopo quanti secondi spariscono |
| `barra` · `scrivi` | `1` · `1` | la striscia sotto la chat, e il campo per scrivere |

La tabella completa — canale, aspetto, contenuto, cosa evidenziare, cosa
nascondere — sta in [`LEGGIMI.md`](LEGGIMI.md), sezione «Le impostazioni».

**Le preferenze del launcher** stanno in `avvio\pollaio.ini`: misura e posizione
della finestra, quali parametri passare al widget, quale browser usare, se
controllare gli aggiornamenti (`aggiorna`), se tenere la barra del titolo
(`cornice`), se accendere il server locale (`rete`) e su quale porta (`porta`).
È un file di testo con le spiegazioni dentro; se lo cancelli, il launcher lo
riscrive al primo avvio. Non è versionato, e l'aggiornamento automatico non lo
tocca.

Nessuna chiave e nessun gettone finiscono nei file di configurazione: il gettone
di Twitch resta nella memoria del browser che ha fatto il collegamento — non
nell'indirizzo che si incolla in OBS, non in `avvio\pollaio.ini`.

## Documentazione

| Documento | A cosa serve |
|---|---|
| [`LEGGIMI.md`](LEGGIMI.md) | il manuale completo per chi lo usa: installazione, i due modi di metterlo in OBS, la barra sotto la chat, la regia, l'account Twitch e i permessi, i comandi, le impostazioni una per una, cosa vede e cosa non vede, e la sezione «Se qualcosa non va» |
| [`CONTRATTO.md`](CONTRATTO.md) | il documento vincolante per chi mette mano al codice: vincoli non negoziabili, stile, proprietà dei file, l'oggetto «messaggio», le sorgenti in rete, il protocollo, il disegno, il banco di prova |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | come si lavora al repository: branch, commit, checklist |
| [`CHANGELOG.md`](CHANGELOG.md) | la storia delle versioni |
| [`SECURITY.md`](SECURITY.md) | come segnalare una vulnerabilità |

Il README resta corto apposta: il manuale è `LEGGIMI.md`, e non va duplicato.

## Banco di prova

Doppio clic su `app/prove.html`. Verde: le cose che devono restare vere lo sono
ancora. Rosso: la riga dice cosa ci si aspettava e cosa è arrivato. Non prova la
rete, né il DOM, né il tempo — si apre e dice verde anche col cavo staccato.

## Licenze di terze parti

Il repository include componenti di terzi, distribuiti con le loro licenze:

| Componente | Dove | Licenza |
|---|---|---|
| JetBrains Mono | `app/font/jetbrains-mono-*.woff2` | SIL Open Font License 1.1 — testo in [`app/font/LICENZA.txt`](app/font/LICENZA.txt) |
| Manrope | `app/font/manrope-*.woff2` | SIL Open Font License 1.1 |
| Space Grotesk | `app/font/space-grotesk-*.woff2` | SIL Open Font License 1.1 |
| Microsoft Edge WebView2 | `lib/Microsoft.Web.WebView2.Core.dll`, `lib/Microsoft.Web.WebView2.WinForms.dll`, `lib/WebView2Loader.dll` | condizioni di licenza software Microsoft per il WebView2 SDK |

I caratteri stanno nel progetto e non arrivano da Google a ogni apertura: se la
rete tossisse proprio mentre parte la diretta, l'overlay si disegnerebbe coi
caratteri di ripiego.

Emote e badge sono immagini servite da Twitch, 7TV, BetterTTV e FrankerFaceZ e
appartengono ai rispettivi titolari: il widget le mostra, non le ridistribuisce.

## Licenza

Software proprietario, tutti i diritti riservati. Vedi [`LICENSE`](LICENSE).
Le licenze di terze parti elencate qui sopra prevalgono, limitatamente ai
componenti a cui si riferiscono.

## Autore

Filippo — [@Shadowed1996](https://github.com/Shadowed1996)
