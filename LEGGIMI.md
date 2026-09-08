# il pollaio

Widget della chat di [slayer_beard](https://www.twitch.tv/slayer_beard), fatto per
essere catturato da OBS.

Si collega alla chat vera, disegna emote, badge, moderatori, abbonamenti, raid e
bits con la grafica del canale, ed evidenzia le cose che meritano di essere
notate mentre la chat scorre.

Non serve installare niente, non serve un account, non serve una password. Non
c'è nessun `npm install`: sono file HTML, CSS e JavaScript scritti a mano.

---

## Installarlo

Vai su [Releases](https://github.com/Shadowed1996/pollaio/releases), scarica
**`Installa.exe`** e fai doppio clic.

Ti chiede dove metterlo — di suo propone `AppData\Local\Pollaio`, che va bene
nel 99% dei casi — poi scarica l'ultima versione, la scompatta e ti lascia
**il collegamento sul desktop**. Un collegamento solo, al pollaio: la regia si
apre dal tasto destro dentro la chat, che è il posto dove uno la cerca.

Non chiede i permessi di amministratore e non tocca il registro: installa sotto
la tua cartella utente. Disinstallare vuol dire cancellare quella cartella e il
collegamento.

In alternativa c'è `pollaio.zip` nella stessa pagina, da scompattare a mano
dove preferisci.

---

## Gli aggiornamenti se li fa da solo

`Pollaio.exe` all'avvio chiede a GitHub qual è l'ultima versione pubblicata. Se
è più recente di quella che hai, sullo splash compare **«Aggiornamento in
corso…»** con la percentuale che sale mentre scarica, poi rimette a posto i
file, riparte da solo e apre la chat. Sono i soliti pochi secondi in più, e
solo quando c'è davvero qualcosa di nuovo.

Il file `avvio\pollaio.ini` **non viene toccato**: le tue preferenze
sopravvivono all'aggiornamento. Se la rete non risponde o qualcosa va storto,
non insiste: dice che l'aggiornamento l'ha saltato e apre la versione che hai
già. Una chat che non parte perché GitHub è lento sarebbe molto peggio di una
versione vecchia di un giorno.

Se preferisci decidere tu quando aggiornare, in `avvio\pollaio.ini` metti
`aggiorna=0` e il controllo non lo fa più.

Il vecchio `Pollaio.exe` non si può cancellare mentre sta girando, quindi
durante l'aggiornamento viene spostato di lato in `Pollaio.exe.vecchio` e
buttato via al lancio dopo. Se ne vedi qualcuno in giro, è quello: si può
cancellare a mano senza pensarci.

Resta buono anche il vecchio modo: rilanciare `Installa.exe`, che rifà `app` e
`lib` lasciando stare l'ini.

---

## Partire in trenta secondi

**Doppio clic su `Pollaio.exe`.**

Compare il pollo con la barra di caricamento, e dopo un paio di secondi si apre
una finestra stretta con la chat dentro. Quella finestra è già della misura
giusta: 400 × 600, come la chat di Twitch.

In OBS: **Sorgente → + → Cattura finestra → scegli la finestra del pollaio.**

---

## I due modi di metterlo in OBS, e quale scegliere

Sono davvero diversi, e la differenza conta.

### A. Sorgente browser — **è questa quella giusta per l'overlay**

**Senza impostazioni**, la via corta:

```
Sorgente → + → Browser
  ☑ File locale
  File:       C:\Users\Filippo\Desktop\Chat\app\pollaio.html
  Larghezza:  400
  Altezza:    600
  ☑ Aggiorna il browser quando la scena diventa attiva
```

**Con le impostazioni della regia** — e qui c'è una trappola. Il campo «File»
vuole un *percorso*, non un indirizzo: se ci incolli dentro qualcosa che finisce
per `?tema=nudo`, OBS cerca un file chiamato così, non lo trova, e ti ritrovi
una sorgente bianca. Quindi:

```
Sorgente → + → Browser
  ☐ File locale        ← TOGLI la spunta
  URL:  file:///C:/Users/Filippo/Desktop/Chat/app/pollaio.html?tema=nudo&scala=120
```

Tre cose da guardare: `file:///` con **tre** barre, le barre **in avanti** e non
rovesce, e la spunta «File locale» **tolta**. Il bottone Copia della regia ti dà
già l'indirizzo in questa forma, pronto da incollare.

**La trasparenza funziona**: sotto ai messaggi si vede il gioco. È il modo per
mettere la chat sopra al gameplay.

### B. `Pollaio.exe` + Cattura finestra

**La trasparenza NON funziona**: OBS cattura la finestra così com'è, col vetro
scuro dietro ai messaggi.

**La barra del titolo non c'è.** Il launcher la toglie: in una cattura finestra
sarebbe entrata nell'inquadratura, sopra al gameplay. Il prezzo è che quella
finestra non si sposta e non si chiude più nei modi soliti, e i comandi si sono
spostati dentro: **tasto destro sulla chat**.

**Per spostarla**: la si prende col tasto sinistro e la si trascina, da un
punto qualsiasi della chat. Non serve il menu — dentro non c'è niente da
cliccare, quindi tutta la superficie è la maniglia, e il puntatore a manina lo
dice. Nella regia invece si afferra **solo dalla testata**: il resto è pieno di
manopole, e una pagina che scappa mentre provi a girarne una sarebbe
inservibile.

Il tasto destro apre il menu:

| voce | cosa fa |
|---|---|
| **Apri la regia** | apre la regia nella sua finestra, come farebbe Regia.exe |
| **Ricarica la chat** | riparte pulita: serve dopo che la rete è stata via, o se i cataloghi delle emote erano arrivati a metà |
| **Riduci a icona** | come il bottone che non c'è più |
| **Chiudi il pollaio** | chiude la finestra e il launcher |

Se preferisci la barra com'era, in `avvio\pollaio.ini` metti `cornice=1`.

**Se il menu non comparisse**, la finestra si chiude sempre con **Alt+F4**, o
col tasto destro sulla sua icona nella barra delle applicazioni. Non resti mai
chiuso fuori.

Una cosa cambiata e che vale la pena sapere: **`Pollaio.exe` adesso resta
acceso** finché la chat è aperta, invece di sparire subito. È lui a stare in
ascolto di quei comandi. Chiudendo la chat si chiude anche lui.

Va benissimo lo stesso per: tenere la chat aperta su un secondo monitor mentre
giochi, metterla in un riquadro pieno del layout, o semplicemente guardarla senza
aprire Twitch. Ed è il modo più comodo per farla partire: doppio clic e via.

**Se vuoi la trasparenza anche così**, c'è: metti `fondo=verde` (o `magenta`, se
in scena c'è del verde tipo un prato) fra i parametri, e in OBS aggiungi alla
sorgente il filtro **Chiave cromatica**. Il fondo sparisce e restano solo i
messaggi. Le due tinte sono scelte apposta per non somigliare a niente che
compaia in un gioco.

In `avvio\pollaio.ini` diventa:

```ini
parametri=fondo=verde&tema=nudo&scala=100
```

---

## La regia — dove si configura

**Doppio clic su `Regia.exe`.** Si apre in una finestra sua, larga, senza barra
del titolo, con la stessa icona del pollaio. Ci si arriva anche dal menu del
tasto destro dentro la chat, voce **Apri la regia**.

`Regia.exe` è *lo stesso identico programma* di `Pollaio.exe`, copiato con un
altro nome: guarda come si chiama e, se nel nome c'è «regia», apre `regia.html`
invece di `pollaio.html`. Un secondo programma da tenere allineato al primo si
scollerebbe, e mezzo launcher duplicato è il posto dove va a nascondersi il
difetto che si vede solo in uno dei due.

La misura della sua finestra sta in `avvio\pollaio.ini`, righe `regialarghezza`
e `regiaaltezza`.

Se preferisci, **`regia.html` si apre ancora con un doppio clic** come sempre:
in quel caso è una normale pagina nel tuo browser, col suo bordo e le sue
schede, e il menu del tasto destro non compare perché non c'è nessuna finestra
da comandare.

A sinistra tutte le manopole, a destra l'anteprima dal vivo su uno sfondo a
scacchi che ti fa vedere cos'è trasparente e cosa no. Puoi cambiare il fondo
dell'anteprima in chiaro, scuro o finto gameplay: serve a controllare che il
testo si legga sopra a qualsiasi cosa, che è il vero problema di un overlay.

In basso c'è l'indirizzo con il bottone **Copia**. Quello va nel campo **URL** di
una Sorgente Browser con «File locale» **tolto** (vedi sopra), oppure in
`avvio\pollaio.ini` dopo `parametri=` — lì incolli solo la parte dopo il `?`.

L'anteprima gira sempre in modalità prova, altrimenti a canale spento non ci
sarebbe niente da guardare.

### La misura della finestra

In fondo alla regia c'è **La misura della finestra**: quanto è grande il
riquadro che apre `Pollaio.exe`. È un'altra cosa dalla «larghezza della
colonna» fra le manopole — quella dice quanto sono larghi i messaggi *dentro*,
questa quanto è grande la finestra che metti in OBS.

Il bottone **Salva la misura** funziona solo se hai aperto la regia con
`Regia.exe`: una pagina web non può scrivere un file sul disco, e a scriverlo è
il launcher. Aprendo `regia.html` col doppio clic il bottone è spento e la
misura si mette a mano in `avvio\pollaio.ini`.

La nuova misura vale dalla prossima apertura del pollaio, non subito: la
finestra aperta in quel momento resta com'è.

### Le configurazioni salvate

In fondo alla regia c'è **Salva com'è adesso**: si dà un nome alla
configurazione e resta lì, come una pastiglia da ricliccare. Serve perché una
diretta non ne ha una sola — il gameplay vuole il tema nudo e la colonna
stretta, le chiacchiere vogliono il vetro scuro e il testo grande, la cattura
finestra vuole il fondo verde — e rigirare dieci manopole a ogni cambio di
scena è il modo sicuro di smettere di farlo e tenersi quella storta.

La pastiglia accesa è quella che corrisponde alle manopole in questo momento, e
si spegne da sola appena se ne tocca una. Salvare due volte con lo stesso nome
non fa un doppione: aggiorna quella. Il × chiede conferma prima di dimenticare,
e **Ripristina** non le tocca — rimette le manopole com'erano, non butta via il
lavoro salvato.

Restano in questo browser, non nel file: se apri la regia su un altro computer
non le trovi. Quello che si porta in giro è sempre l'indirizzo.

---

## Sistemare l'inquadratura a canale spento

```
pollaio.html?prova=1
```

Genera traffico finto ma credibile: ventuno persone con badge e colori stabili,
frasi vere da chat italiana, emote vere del canale, e ogni tanto un abbonamento,
un raid, dei bits, un messaggio in evidenza, un ban.

Serve perché il momento in cui si sistema un overlay è **sempre** quello in cui
il canale è spento. In alto resta accesa una spia `PROVA`, così non lo si
confonde con la chat vera.

---

## Le impostazioni

Si scrivono dopo il `?` nell'indirizzo, separate da `&`. Sono tutte facoltative:
`pollaio.html` da solo funziona già.

Non c'è bisogno di impararle: la regia le costruisce da sola. Questa tabella
serve per quando vuoi ritoccare a mano.

### Canale

| chiave | valore | cosa fa |
|---|---|---|
| `canale` | `slayer_beard` | il canale da seguire |
| `id` | `47738247` | l'id numerico, serve per emote e badge del canale |
| `prova` | `0` | `1` accende il traffico finto |
| `ostile` | `0` | `1` ci mescola i casi cattivi: zalgo, nomi ribaltati, muri di testo |
| `kick` | *(vuoto)* | il canale Kick da unire alla chat. Vuoto: Kick non si collega |
| `kickstanza` | *(vuoto)* | l'id della chatroom Kick, solo se un giorno non riesco a trovarlo da solo |
| `youtube` | *(vuoto)* | l'indirizzo o l'id della diretta YouTube da unire alla chat |
| `ytchiave` | *(vuoto)* | la tua chiave API di YouTube. Senza, YouTube non si collega |

### Aspetto

| chiave | valore | cosa fa |
|---|---|---|
| `tema` | `notte` | `notte` una lastrina di vetro scuro per messaggio · `nudo` solo testo con ombra · `insegna` schede piene |
| `larghezza` | `420` | larghezza della colonna in pixel |
| `scala` | `100` | grandezza del testo in percentuale, da 60 a 200 |
| `verso` | `su` | `su` i nuovi in basso · `giu` i nuovi in alto |
| `fondo` | `trasparente` | `trasparente` per la Sorgente Browser · `scuro` per la finestra · `verde`/`magenta` per il chroma key |
| `spazio` | `130` | aria fra i messaggi, in percentuale da 40 a 400 |
| `effetto` | `scivola` | come entra un messaggio: `scivola` · `bagliore` · `sfoca` · `glitch` · `matrix` · `insegna` · `scatto` · `niente` |
| `velocita` | `100` | quanto va svelto l'effetto, in percentuale da 25 a 300 |
| `pollo` | `0` | `1` mostra la mascotte accanto alla chat |

### Contenuto

| chiave | valore | cosa fa |
|---|---|---|
| `max` | `40` | quanti messaggi restano appesi |
| `svanisci` | `0` | secondi dopo cui un messaggio sparisce. `0` = non spariscono mai |
| `emote` | `1` | disegna le emote |
| `sette` | `1` | emote 7TV (slayer_beard ne ha) |
| `bttv` | `1` | emote BetterTTV |
| `ffz` | `1` | emote FrankerFaceZ |
| `anima` | `1` | lascia animate le emote animate. A `0` le ferma sul primo fotogramma |
| `badge` | `1` | disegna i badge |
| `orario` | `0` | `1` mostra l'ora di ogni messaggio |

### Cosa evidenziare

| chiave | valore | cosa fa |
|---|---|---|
| `menzioni` | `1` | accende chi ti nomina |
| `parole` | *(vuoto)* | parole tue da accendere, separate da virgola |
| `primo` | `1` | accende il primo messaggio di chi non ha mai scritto |
| `eventi` | `1` | disegna abbonamenti, raid e bits come schede |
| `treno` | `1` | la fascia dell'hype train |

### Cosa nascondere

| chiave | valore | cosa fa |
|---|---|---|
| `bot` | `nightbot,streamelements,…` | nick da non mostrare |
| `comandi` | `1` | nasconde i messaggi che iniziano per `!` |
| `moderazione` | `sbarra` | messaggio cancellato: `sbarra` barrato · `togli` sparisce · `tieni` resta |

---

## Cosa viene evidenziato, e con che forza

Tre livelli. Vince sempre il più alto.

| | quando | come si vede |
|---|---|---|
| **alto** | messaggio in evidenza coi punti canale · annuncio dello streamer · da 1000 bits in su | bordo magenta, alone, un lampo all'ingresso |
| **medio** | ti nominano · c'è una tua parola chiave · da 100 bits in su | bordo ciano, etichetta accesa |
| **basso** | primo messaggio di sempre · uno che torna dopo tanto · una risposta | bordo viola tenue |

Essere moderatore, VIP o abbonato **non** è un'evidenziazione: è un badge e un
colore del nome. Un moderatore che scrive «ok» non è una cosa importante, e se
lo fosse non lo sarebbe più nessun'altra.

---

## L'hype train

In cima compare una fascia, e ha tre momenti:

| | quando | cosa dice |
|---|---|---|
| **TRENO IN ARRIVO** | qualcuno ha cominciato a contribuire ma il treno non è ancora partito | quanti eventi mancano per farlo partire, e quanto tempo resta |
| **HYPE TRAIN** | il treno è partito | livello, punti sul totale del livello, barra, conto alla rovescia |
| **GOLDEN KAPPA TRAIN** | è capitato quello raro | come sopra, ma in oro |

Quando finisce resta qualche secondo il riepilogo del livello raggiunto, poi la
fascia sparisce da sola.

**Il pezzo che ti interessa è il primo**: l'avviso arriva *prima* che il treno
parta, quindi fai in tempo a dirlo in diretta.

Un avvertimento onesto, perché è l'unica parte del widget costruita così.
L'hype train **non passa dalla chat**: Twitch non lo trasmette lì. L'unico modo
per averlo senza chiederti un login è chiederlo alla stessa fonte che usa il
sito di Twitch per disegnare la sua barra. Funziona — l'ho provato su un treno
vero prima di scriverlo — ma è una fonte che Twitch non garantisce a nessuno, e
un giorno potrebbe cambiare.

Per questo il treno è costruito come **un di più**: se quella fonte smette di
rispondere, dopo qualche tentativo la fascia sparisce e basta. La chat continua
come se niente fosse. Se succede e lo vuoi indietro, si può rifare con un tuo
login Twitch, che è la strada ufficiale e stabile.

Se non lo vuoi proprio: `treno=0`.

---

## Cosa vede e cosa non vede

Il widget entra in chat **in anonimo**, senza account e senza password. È una
scelta: niente da custodire, niente che scade, niente che possa essere bannato.

**Vede**: tutti i messaggi, emote di Twitch, 7TV, BetterTTV e FrankerFaceZ,
tutti i badge, i colori dei nomi, i `/me`, le risposte, i bits e i cheermote,
abbonamenti, riabbonamenti, regali singoli e in blocco, raid, annunci,
primi messaggi, ban, pause e cancellazioni dei moderatori.

**Non vede**: chi entra e chi esce dalla chat (Twitch non lo dice più in modo
affidabile), gli spettatori collegati, e le cose che passano solo dall'API con
il tuo login.

---

## Se qualcosa non va

**La chat resta vuota e in alto c'è scritto che riprova.**
La rete non arriva, oppure una rete filtra le connessioni WebSocket. Il widget
**non si arrende mai**: riprova all'infinito, aspettando sempre di più fino a un
minuto fra un tentativo e l'altro. Cambia solo come lo dice: dopo il quinto
tentativo la spia passa da «ci riprovo» a «continuo a provare», perché a quel
punto non è più un attimo ed è onesto smettere di farlo credere. Se la rete
torna a metà diretta, la chat riparte da sola senza che tu tocchi niente.

**Si vedono i nomi ma non le emote.**
I cataloghi di 7TV e compagnia si scaricano all'avvio: se la rete era lenta in
quel momento, le prime righe escono senza. Basta ricaricare la sorgente in OBS.
Le emote native di Twitch invece si vedono sempre, perché arrivano dentro al
messaggio.

**I badge sono forme colorate semplici invece di quelli veri.**
Vuol dire che il servizio dei badge non ha risposto e il widget ha usato quelli
che si disegna da solo. Funziona tutto, sono solo meno belli.

**In OBS si vede un rettangolo bianco dov'è il pollo.**
Non dovrebbe succedere: se succede, avvisami. L'immagine della mascotte ha il
fondo bianco e viene ritagliata dal foglio di stile.

**Il testo non si legge sopra al gioco.**
Prova `tema=nudo`, che mette un'ombra netta intorno a ogni lettera, oppure alza
il contrasto restando su `tema=notte`, che ha il vetro scuro dietro.

---

## Com'è fatto dentro

```
chat/
├─ Pollaio.exe        il launcher: splash e finestra già dimensionata
├─ Regia.exe          lo STESSO programma, copiato con un altro nome: apre la
│                     regia nella sua finestra invece della chat
├─ LEGGIMI.md         questo file
├─ CONTRATTO.md       le regole del progetto, per chi ci mette mano
│
├─ app/               il widget: è questa la cartella che si punta da OBS
│  ├─ pollaio.html    l'overlay — è questo che punta OBS
│  ├─ regia.html      il configuratore, con l'anteprima dal vivo
│  ├─ prove.html      il banco di prova: doppio clic, dice verde o rosso
│  ├─ css/
│  │  ├─ tokens.css      la palette del canale. L'unico file con dei colori scritti
│  │  ├─ pollaio.css     l'overlay
│  │  ├─ regia.css       il configuratore
│  │  ├─ menu.css        il menu del tasto destro, che serve a tutte e due
│  │  └─ prove.css       il banco di prova
│  ├─ js/
│  │  ├─ impostazioni.js legge le impostazioni dall'indirizzo
│  │  ├─ irc.js          la connessione alla chat di Twitch e il protocollo
│  │  ├─ kick.js         la chat di Kick, quando c'è
│  │  ├─ youtube.js      la chat di una diretta YouTube, quando c'è
│  │  ├─ emote.js        Twitch, 7TV, BetterTTV, FrankerFaceZ, cheermote
│  │  ├─ badge.js        i badge, con un ripiego disegnato a mano
│  │  ├─ rilievo.js      decide cosa è importante
│  │  ├─ eventi.js       abbonamenti, raid, bits, moderazione
│  │  ├─ treno.js        l'hype train
│  │  ├─ resa.js         l'unico file che tocca la pagina
│  │  ├─ prova.js        il traffico finto
│  │  ├─ menu.js         il tasto destro nella finestra di Pollaio.exe
│  │  ├─ regia.js        il configuratore
│  │  ├─ prove.js        i casi del banco di prova
│  │  └─ pollaio.js      mette insieme i pezzi
│  └─ img/               mascotte, avatar, icona
│
├─ lib/               le tre librerie di WebView2, il motore che disegna la
│                     finestra. Stanno qui e non nella radice perché non
│                     riguardano chi lo usa. Non vanno spostate né cancellate:
│                     senza, il launcher ripiega su Chrome.
│
└─ avvio/
   ├─ Pollaio.cs      il sorgente del launcher
   ├─ compila.cmd     lo ricompila
   └─ pollaio.ini     le preferenze del launcher
```

### Le preferenze del launcher

Stanno in `avvio\pollaio.ini`: misura della finestra, dove si apre, quali
parametri passare al widget, quale browser usare, se controllare gli
aggiornamenti all'avvio (`aggiorna`) e se tenere la barra del titolo
(`cornice`). È un file di testo con le spiegazioni dentro. Se lo cancelli, il
launcher lo riscrive.

### Ricompilare il launcher

Doppio clic su `avvio\compila.cmd`. Non installa niente: usa il compilatore C#
che Windows si porta dietro dal 2010. Se non funzionasse, `Pollaio.exe` è solo
una comodità — `pollaio.html` in OBS funziona da solo.

---

## Il banco di prova

**Doppio clic su `prove.html`.** Verde: le cose che devono restare vere lo sono
ancora. Rosso: la riga dice cosa ci si aspettava e cosa è arrivato.

Serve perché questo widget passa la giornata a leggere roba scritta da altri —
i tag del protocollo, i nomi che la gente si sceglie, gli indirizzi battuti a
mano in OBS, le risposte di quattro provider — e le difese contro quella roba
sono silenziose: quando cedono non si vede un errore, si vede un messaggio
plausibile che dice una cosa diversa da quella scritta. Il banco è il modo di
accorgersene prima della diretta invece che durante.

Non prova la rete, né il DOM, né il tempo: si apre e dice verde anche col cavo
staccato. Se dipendesse da 7TV direbbe rosso nei giorni in cui 7TV è giù, e a
quel punto lo si smetterebbe di guardare.

## Le regole della casa

Chi mette mano al codice legge prima `CONTRATTO.md`. In breve: zero dipendenze,
tutto deve girare da `file://`, niente `innerHTML` per la roba che arriva dalla
chat, nessun colore scritto fuori da `tokens.css`, niente `!important`, e tutto
in italiano — nomi, classi, commenti.
