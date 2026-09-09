# il pollaio

Widget della chat di [slayer_beard](https://www.twitch.tv/slayer_beard), fatto per
essere catturato da OBS.

Si collega alla chat vera, disegna emote, badge, moderatori, abbonamenti, raid e
bits con la grafica del canale, ed evidenzia le cose che meritano di essere
notate mentre la chat scorre.

Per **guardarla** non serve installare niente, non serve un account, non serve
una password: il pollaio entra in chat in anonimo, come ha sempre fatto. Un
account Twitch serve se vuoi anche **fare** qualcosa — scrivere dal campo in
fondo alla chat, dare i comandi da moderatore, aprire un sondaggio, vedere chi
c'è dentro — e si attacca da lì: finché non c'è nessuno collegato, al posto del
campo c'è il bottone che fa tutto, e collegarsi è un clic. Se non lo attacchi,
il widget è esattamente quello di prima.

**Se l'account l'avevi già collegato, va riconnesso una volta.** I comandi
chiedono a Twitch dei permessi che il vecchio collegamento non aveva, e Twitch
quei permessi li concede soltanto nel momento in cui ci si collega: a un
collegamento già fatto non si aggiungono. È un clic, e sta tutto spiegato in
«I permessi, e perché l'account va riconnesso», più sotto.

Non c'è nessun `npm install`: sono file HTML, CSS e JavaScript scritti a mano.

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

Se la allarghi — si tira un bordo, come una finestra qualunque — la chat si
allarga con lei: dentro la finestra del launcher i messaggi prendono tutta la
larghezza e il testo cresce insieme al riquadro, invece di restare quello di una
colonna da 400. Nella sorgente browser di OBS
no — lì comanda la «larghezza della colonna», perché quel numero deve
combaciare con quello che scrivi in OBS.

**Finché non scrive nessuno la finestra dice su quale canale sta ascoltando.**
Non è un abbellimento: una spia verde e zero messaggi vuol dire tanto «il
canale è fermo» quanto «stai ascoltando il canale sbagliato», e queste due cose
si somigliano troppo per lasciarle indistinguibili a diretta iniziata. In OBS
quella scritta non compare: là un overlay senza messaggi deve restare
invisibile.

---

## I due modi di metterlo in OBS, e quale scegliere

Sono davvero diversi, e la differenza conta.

### A. Sorgente browser — **è questa quella giusta per l'overlay**

**Senza impostazioni**, la via corta:

```
Sorgente → + → Browser
  ☑ File locale
  File:       C:\Users\Filippo\AppData\Local\Pollaio\app\pollaio.html
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
  URL:  file:///C:/Users/Filippo/AppData/Local/Pollaio/app/pollaio.html?tema=nudo&scala=120
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
spostati dentro: **tasto destro sulla chat**. Ridimensionarla, invece, si fa
come sempre — si tira un bordo — perché quello è l'unico gesto che la barra del
titolo, andandosene, non si è portata via.

**Per spostarla**: la si prende col tasto sinistro e la si trascina, da un
punto qualsiasi dei messaggi. Non serve il menu — lì dentro non c'è niente da
cliccare, quindi tutta quella superficie è la maniglia, e il puntatore a manina
lo dice. L'unico pezzo che non trascina è **la barra in fondo**, che invece di
roba da cliccare ne ha: sopra di lei il puntatore torna quello di sempre, se no
ogni clic su un filtro avrebbe rischiato di spostare la finestra. Nella regia si
afferra **solo dalla testata**: il resto è pieno di manopole, e una pagina che
scappa mentre provi a girarne una sarebbe inservibile.

**Per ridimensionarla**: si prende un bordo o un angolo e si tira, come una
finestra qualunque. Il puntatore cambia da sé quando ci passi sopra — doppia
freccia orizzontale sui fianchi, verticale sopra e sotto, diagonale negli
angoli — ed è lui a dire dov'è la presa, che senza barra del titolo e senza
cornice non si vedrebbe. La zona sensibile è di **sei pixel** dal bordo,
**sedici** negli angoli: al trascinamento toglie soltanto quella striscia, tutto
il resto della superficie resta la maniglia per spostare la finestra come prima.
Sotto **160 × 160** non si stringe — è lo stesso minimo che accetta il campo
della regia — perché una finestra ridotta a una riga non si riafferra più.

**La misura nuova se la ricorda.** Appena molli il bordo, il launcher la scrive
in `avvio\pollaio.ini`, righe `larghezza` e `altezza`: sono **le stesse due
righe** che scrive il bottone «Salva la misura» della regia. Non ci sono due
misure diverse che litigano, ce n'è una sola, e la si cambia dal bordo o dalla
regia a piacere.

Tutto questo **vale per la finestra della chat**. Nella regia i bordi sono
lasciati stare apposta: là il bordo destro è dove sta la barra di scorrimento, e
ritrovarsi a ridimensionare la finestra quando volevi scorrere la pagina sarebbe
peggio che non poterla ridimensionare affatto. La misura della regia si mette
dal suo campo, come prima.

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
aprire Twitch. Ed è il modo più comodo per farla partire: doppio clic e via. È
anche l'unico dei due dove c'è **la barra in fondo** — i filtri, la pausa e il
campo per scrivere — perché nella sorgente browser di OBS non compare mai
(la sezione qui sotto).

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

## La barra sotto la chat: filtri e pausa

In fondo alla chat c'è una striscia con i filtri, il tasto per fermarla e il
campo per scrivere.

**Compare solo dove la si può usare**: la finestra di `Pollaio.exe`, l'anteprima
nella regia, la pagina aperta a mano in un browser. In una **sorgente browser di
OBS non compare mai** — si riconosce da sola che è dentro OBS, e là non c'è
nessuno che clicca: sarebbe soltanto una striscia in meno di gameplay.

### I filtri

Pastiglie: **Tutto**, poi una per ogni chat collegata (**Twitch**, **Kick**,
**YouTube**), poi **Eventi**.

Le pastiglie delle chat compaiono **solo quando le chat collegate sono più
d'una**: con la sola Twitch, «Tutto» e «Twitch» sarebbero lo stesso bottone
scritto due volte. È la stessa regola della targhetta della piattaforma sopra ai
messaggi.

Quando sei in una **live congiunta** (la sezione più sotto) ne compare una **per
ogni streamer** della sessione, il tuo compreso: servono a guardare la chat di
uno solo, che con la piattaforma non si potrebbe fare visto che siete tutti su
Twitch. Spariscono da sole quando la sessione finisce.

**Eventi** tiene le schede di abbonamento, riabbonamento, regali, raid e
annunci, più ogni messaggio con dei bits.

Qui ci sono solo i filtri, e basta: il sondaggio e il pronostico non stanno in
questa fila. Si aprono battendo il loro comando nel campo qui sotto, e lo
racconto nella sezione «I comandi di Twitch, dal campo della chat».

Un dettaglio che vale la pena raccontare: con un filtro acceso il pollaio
**tiene in pagina più righe** di quante ne dica la manopola «quanti messaggi
resto ad appendere» — fino a sei volte tante — e di quelle conta solo quelle che
si vedono. Senza, filtrare per «Eventi» avrebbe mostrato due righe su quaranta,
cioè quasi niente, e un filtro che mostra quasi niente non lo usa nessuno due
volte.

### La pausa

Il bottone **Ferma** smette di appendere: quello che c'è sullo schermo resta
fermo. I messaggi che arrivano intanto vanno da parte — fino a duecento — e
compare **«N messaggi in attesa — riparti»**, che è anche il bottone per farla
ripartire.

Mentre è ferma i messaggi **non svaniscono**: se hai impostato «dopo quanto
svanisce un messaggio», quei conti alla rovescia si congelano e ripartono da
dove erano quando riparte la chat. Sarebbe stato beffardo fermare la chat per
rileggere una cosa e vedersela sfumare sotto gli occhi.

Dove c'è la barra l'elenco diventa scorrevole, e **girare la rotella
all'indietro ferma la chat da sé**: è il gesto che uno fa d'istinto quando vuole
rileggere qualcosa che sta scappando. Ripartire invece è sempre un clic apposta.
Una chat che riparte da sola mentre stai leggendo è esattamente il problema che
volevi risolvere.

### Il campo per scrivere

Manda i messaggi con il tuo account, e per forza di cose c'è solo se un account
è collegato. Finché non lo è, al suo posto c'è **un bottone solo, centrato:
«Connetti account»**, e il collegamento parte da lì.

Prima al suo posto c'era una riga che spiegava cosa mancava. Ma una riga che
dice «mi manca una cosa» senza darti il modo di dargliela è soltanto un
rimprovero, e per rimediare toccava aprire la regia. Adesso il bottone diventa
«Sto aspettando…» mentre Twitch conferma, e appena hai detto di sì lascia il
posto al campo, col tuo nome dentro. Come funziona il giro sta nella sezione
«Scrivere in chat, e l'account Twitch», qui sotto.

Le emote non si battono a memoria: **due punti e una lettera** aprono sopra al
campo l'elenco di quelle che somigliano, e si sceglie da lì. Com'è fatto è
spiegato nella stessa sezione.

Dallo stesso campo partono anche **i comandi di Twitch** — `/ban`, `/timeout`,
`/poll` e altri ventiquattro — e cliccando un nome si apre il menù che li dà
senza far ricopiare niente. Sono due sezioni a parte, più sotto: «I comandi di
Twitch, dal campo della chat» e «Il menù sul nome, e chi c'è in chat».

Nell'anteprima della regia il bottone si vede ma non collega niente: là dentro è
tutto finto, e collegare un account per davvero da un'anteprima sarebbe una
sorpresa poco gradita.

### Le due manopole

Stanno nella regia, gruppo **La barra sotto la chat**, e nascono accese tutte e
due: `barra` è la striscia coi filtri e la pausa, `scrivi` è il campo per
scrivere dentro la striscia — e con lui il bottone «Connetti account» che ne fa
le veci quando non c'è nessun account. Spegnerne una non spegne l'altra.

`scrivi` però si porta dietro più di quello che dice il nome: da lì passa il
riconoscimento dell'account, e dall'account passano il pannello del sondaggio,
il bottone che conta chi c'è e le emote di Twitch nel suggeritore. Spegnendolo
restano i filtri e la pausa, cioè la barra com'era prima. Il menù sul nome si
apre ancora, ma resta a mani vuote: l'id del canale lo scopro insieme
all'account, e quella strada passa di qui.

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
e `regiaaltezza`. Qui i bordi non si tirano, per il motivo detto sopra: a destra
c'è la barra di scorrimento.

Se preferisci, **`regia.html` si apre ancora con un doppio clic** come sempre:
in quel caso è una normale pagina nel tuo browser, col suo bordo e le sue
schede, e il menu del tasto destro non compare perché non c'è nessuna finestra
da comandare.

**In cima, subito sotto il titolo, c'è «Il tuo account Twitch».** Sta lassù, e
non in fondo com'era prima, perché è l'unica cosa della regia che si fa una
volta e poi non si tocca più: cercarla in mezzo alle configurazioni salvate era
il modo migliore di non trovarla.

Sotto di lei, a sinistra tutte le manopole, a destra l'anteprima dal vivo su uno
sfondo a scacchi che ti fa vedere cos'è trasparente e cosa no. Puoi cambiare il
fondo dell'anteprima in chiaro, scuro o finto gameplay: serve a controllare che
il testo si legga sopra a qualsiasi cosa, che è il vero problema di un overlay.

In basso c'è l'indirizzo con il bottone **Copia**. Quello va nel campo **URL** di
una Sorgente Browser con «File locale» **tolto** (vedi sopra).

Accanto c'è **Usala anche in Pollaio.exe**, che è la scorciatoia per l'altra
metà: la finestra del launcher non legge quell'indirizzo, legge la riga
`parametri=` di `avvio\pollaio.ini`. Il bottone ce la scrive lui, invece di
farti aprire il file col blocco note e incollare a mano la coda dopo il `?`.
Vale dal prossimo avvio di `Pollaio.exe`, e come tutto quello che tocca l'ini
funziona solo con la regia aperta da `Regia.exe`.

Una correzione la fa da sé: se il fondo è «trasparente» ci scrive «scuro».
Trasparente ha senso in una sorgente browser, dove sotto c'è il gioco; in una
finestra vera vuol dire bianco, e su bianco il testo chiaro sparisce. Te lo
dice, non lo fa di nascosto.

L'anteprima gira sempre in modalità prova, altrimenti a canale spento non ci
sarebbe niente da guardare.

### La misura della finestra

In fondo alla regia c'è **La misura della finestra**: quanto è grande il
riquadro che apre `Pollaio.exe`. È un'altra cosa dalla «larghezza della
colonna» fra le manopole — quella dice quanto sono larghi i messaggi *dentro*,
questa quanto è grande la finestra che metti in OBS.

Le strade per cambiarla sono tre, e finiscono tutte e tre sulle stesse due righe
di `avvio\pollaio.ini`, `larghezza` e `altezza`. La più immediata non passa
nemmeno di qui: **si tira il bordo della finestra della chat** (sopra, nella
sezione B), e appena molli il mouse la misura è già scritta. Poi c'è questo
campo, col bottone **Salva la misura**. E poi c'è aprire l'ini col blocco note e
scriverla a mano.

**Il campo serve per il caso opposto al bordo: quando la vuoi esatta.** 400 ×
600 battuti qui sono 400 × 600; tirati a occhio sono 397 × 611, e te ne accorgi
solo dopo, quando in OBS la sorgente non combacia.

Il bottone **Salva la misura** funziona solo se hai aperto la regia con
`Regia.exe`: una pagina web non può scrivere un file sul disco, e a scriverlo è
il launcher. Aprendo `regia.html` col doppio clic il bottone è spento, e restano
le altre due strade: il bordo della finestra della chat, o l'ini a mano.

La misura si applica subito: se il pollaio è aperto mentre salvi, quella
finestra si rifà della misura nuova sotto i tuoi occhi. Se non è aperto la
misura resta scritta e nascerà così la prossima volta — è sempre quella riga di
`avvio\pollaio.ini`, non due cose diverse.

Accanto c'è **Ripristina le dimensioni**, che rimette 400 × 600 senza far di
conto: è la misura di una chat di Twitch, il punto da cui ripartire quando una
prova è andata troppo in là.

### Rimettere tutto com'era

In fondo alla regia, dopo le istruzioni per OBS, c'è **Ripristina le
impostazioni**: chiede conferma e poi riporta ogni manopola al valore di
partenza — l'aspetto, cosa si vede, cosa si accende, la pulizia, la barra sotto
la chat, l'anteprima e anche la misura della finestra. Le configurazioni salvate
non le tocca: quelle si tolgono una per una, con la loro ×. E non tocca
l'account: rimette le manopole, non ti butta fuori da Twitch.

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

## Scrivere in chat, e l'account Twitch

Il campo in fondo alla chat manda i messaggi **con il tuo account**. Invio
manda, Esc svuota il campo, e sopra i quattrocento caratteri compare quanti ne
restano — Twitch ne accetta cinquecento. Il tasto accanto dice **Invia** —
diceva «Manda» — e mentre il messaggio è per aria diventa «Invio…», così si vede
che è partito e non lo si preme due volte. In modalità prova non manda niente
per davvero, e te lo dice invece di far finta.

### Le emote si scelgono da un elenco, e i due punti non partono

Si battono **i due punti e almeno una lettera** — `:kek` — e sopra al campo si
apre l'elenco: fino a **otto** emote, ognuna con la sua anteprima accanto al
nome. Si scorre con le **frecce su e giù**, si conferma con **Invio** o con
**Tab**, si chiude con **Esc**, e volendo si clicca quella che si vuole. Scelta
l'emote, il nome prende il posto dei due punti e si porta dietro uno spazio:
attaccata alla parola dopo, un'emote non la disegna nessuno.

**Nel messaggio finisce il nome nudo**: scegliendo KEKW parte `KEKW`, non
`:KEKW:`. È il punto che confonde chi arriva da Discord, dove `:nome:` è la
sintassi vera e i due punti fanno parte davvero del messaggio. Su Twitch no: i
due punti sono soltanto il gesto che apre l'elenco, e quello che Twitch disegna
è il nome da solo. Se scrivi `:kekw` e mandi senza scegliere niente, dall'altra
parte arrivano proprio quei caratteri e restano testo — da noi come su Twitch,
che si comporta uguale.

I due punti contano solo a inizio parola, cioè a capo del messaggio o dopo uno
spazio: se no ogni `https://` avrebbe aperto un elenco.

Le emote proposte vengono da quattro parti: i tre cataloghi che il pollaio
carica comunque — 7TV, BetterTTV, FrankerFaceZ — e **Twitch stesso**. L'ordine è
questo: prima quelle che **cominciano** per quello che hai battuto, poi quelle
che ce l'hanno in mezzo; e dentro a ciascuno dei due gruppi vengono prima **le
tue emote di Twitch**, poi le **emote del canale** prese dai cataloghi, poi le
più corte, poi in ordine alfabetico.

Finché l'elenco è aperto, **Invio sceglie invece di mandare** ed **Esc chiude
l'elenco invece di svuotare il campo**: sono i due tasti che si premono senza
guardare, e mandare mezzo messaggio per aver confermato un'emote sarebbe stato
un brutto scherzo. Appena l'elenco si chiude tornano a fare quello di sempre.

**Le emote native di Twitch adesso ci sono**, ed è la novità che si nota di
più. Sono quelle scritte come `slayer156Hype`, o come `Kappa`: non stanno in
nessuno dei tre cataloghi, e infatti fino a poco fa il suggeritore non ne
proponeva una. Il risultato era beffardo — chi è abbonato al canale doveva
battere a memoria proprio le emote per cui paga. Adesso, appena l'account è
collegato, chiedo a Twitch **quali emote puoi usare tu in questo canale**,
quelle dei tuoi abbonamenti comprese, e le metto per prime: sono le uniche che
tutti vedono davvero, perché le altre tre le disegna soltanto chi ha
l'estensione installata.

Serve il collegamento e serve il permesso `user:read:emotes`. Senza, il
suggeritore torna com'era — i tre cataloghi e basta — e le native si battono a
mano come sempre. In chat si vedono lo stesso: quelle arrivano dentro al
messaggio, per una strada che non passa di qui.

### Collegare l'account

Il collegamento va fatto **una volta sola**, e si può fare da due posti.

**Dal bottone sotto la chat.** Finché non c'è nessun account collegato, al posto
del campo per scrivere c'è **Connetti account**. Lo premi, diventa «Sto
aspettando…», e il pollaio ti apre Twitch alla pagina di conferma — nella
finestra di `Pollaio.exe` è il tuo browser di sistema, quello dove sei già
loggato. Dici di sì, e appena Twitch lo conferma il bottone lascia il posto al
campo per scrivere. Non devi aprire la regia, e non devi tornare a dire a
nessuno che hai finito: se ne accorge da solo.

**Dalla regia.** Sezione **«Il tuo account Twitch»**, che è la prima cosa della
pagina, subito sotto il titolo. Il giro è identico e il bottone fa la stessa
cosa — si chiama **Connetti account** la prima volta e **Riconnetti account**
quando un account c'è già; in più qui c'è una riga di stato che dice sempre a
che punto siamo, il codice scritto grande, e i bottoni **Riapri Twitch**, **Copia
il codice** e **Lascia stare**, che servono quando il browser fa i capricci.

**La pagina di Twitch si apre col codice già dentro.** L'indirizzo è
`twitch.tv/activate?device-code=…`, e me lo dà Twitch stesso insieme al codice:
in pratica non devi ricopiare niente, trovi solo il bottone di conferma. Il
codice resta scritto in pagina lo stesso, perché se il browser non si apre — o
si apre quello sbagliato, dove non sei loggato — devi poterlo battere a mano su
`twitch.tv/activate`. Vale mezz'ora, e io intanto resto lì ad aspettare.

### Il Client ID: quasi sempre non devi fare niente

Twitch non concede permessi a un programma anonimo: vuole sapere *quale*
programma glieli sta chiedendo, e quel nome pubblico è il **Client ID**. Non è
un segreto e non è una password — viaggia in chiaro dentro ogni richiesta, e
infatti nella regia sta lì in bella vista.

**Uno ce n'è già dentro**, quello del pollaio, e quindi collegare l'account è un
clic e basta, da tutte e due le strade. Il campo sta in regia in fondo alla
sezione dell'account, dentro il blocco richiudibile **«Con quale applicazione mi
presento a Twitch»**: se è pieno il blocco resta chiuso e non lo vedi nemmeno.
Era una domanda che questa pagina faceva a tutti e che quasi nessuno aveva
motivo di sentirsi fare.

Serve solo se vuoi presentarti a Twitch **con un'applicazione tua** invece che
con la mia — perché stai facendo la tua versione del pollaio, o perché non ti va
che sulla pagina di conferma compaia il mio nome. Si fa così: su
`dev.twitch.tv/console/apps`, «Register Your Application», nome qualsiasi,
**OAuth Redirect URL** `http://localhost`, categoria «Chat Bot», tipo
**Public**. Twitch ti dà il Client ID: lo incolli nel campo e premi **Connetti
account**. Il **Client Secret** non serve: non copiarlo da nessuna parte.

Se quel campo restasse vuoto — l'unico modo è svuotarlo a mano — il bottone
sotto la chat non parte: te lo dice e ti manda in regia, perché è l'unico posto
dove il campo c'è.

### I permessi, e perché l'account va riconnesso

Qui è cambiata la cosa più importante di tutte, e va detta forte.

Prima il permesso chiesto era **uno solo**, `user:write:chat`: mandare messaggi
a nome tuo. Adesso sono **sedici**, perché i comandi, la lista di chi c'è e le
emote di Twitch non passano da quello. Su Twitch ogni cosa ha il suo permesso, e
non ne esiste uno che le contenga tutte — quindi si chiedono uno per uno, e sono
esattamente questi:

| permesso | a cosa serve |
|---|---|
| `user:write:chat` | scrivere in chat, come prima |
| `moderator:manage:banned_users` | `/ban` `/timeout` `/unban` `/untimeout` |
| `moderator:manage:chat_messages` | `/clear` |
| `moderator:manage:chat_settings` | `/slow` `/followers` `/subscribers` `/emoteonly` `/uniquechat` e i loro «off» |
| `moderator:manage:announcements` | `/announce` |
| `moderator:manage:shoutouts` | `/shoutout` |
| `channel:manage:raids` | `/raid` `/unraid` |
| `channel:manage:polls` | `/poll`, e il pannello del sondaggio |
| `channel:manage:predictions` | `/prediction`, e il pannello del pronostico |
| `channel:manage:broadcast` | `/marker` |
| `channel:manage:moderators` | `/mod` `/unmod`, e sapere chi è moderatore nella lista |
| `channel:manage:vips` | `/vip` `/unvip`, e sapere chi è VIP nella lista |
| `user:manage:whispers` | `/w` |
| `moderator:read:chatters` | chi c'è in chat adesso |
| `user:read:emotes` | le emote di Twitch nel suggeritore |
| `user:read:chat` | sapere chi è entrato in una live congiunta **prima** che scriva, e quando la sessione finisce |

**Twitch i permessi li concede solo nel momento in cui ci si collega.** Non si
aggiungono dopo, non si chiedono al volo quando servono: o c'erano quando hai
detto di sì, o non ci sono. Ecco perché **chi aveva collegato l'account prima di
questa versione deve riconnetterlo una volta** — e in regia il bottone si chiama
apposta **Riconnetti account** quando un account c'è già.

Chi non lo fa non rompe niente e non perde niente di quello che aveva: continua
a scrivere in chat come sempre. Ma ogni comando si ferma prima di partire e dice
quale permesso manca, nel menù sul nome le voci restano spente, il pannello del
sondaggio non si apre e il bottone di chi c'è non compare.

Se sedici ti sembrano tanti, la risposta onesta è che sono tanti: Twitch li fa
vedere tutti sulla pagina di conferma e li dà in blocco, quindi dicendo di sì li
dai tutti insieme. Sono uno per comando, e l'unico modo di averne meno sarebbe
avere meno comandi. Quello che non cambia è che **senza collegamento il pollaio
legge la chat esattamente come prima**, in anonimo.

### Il gettone, e come si toglie

**Dove finisce il gettone: in questo browser e basta.** Non finisce
nell'indirizzo che la regia ti fa copiare, non finisce in `avvio\pollaio.ini`, e
**non arriva mai alla sorgente browser di OBS** — che è un altro browser, con la
sua memoria separata. Le due finestre invece se lo passano, perché `Pollaio.exe`
e `Regia.exe` sono due finestre dello stesso programma, con lo stesso profilo:
colleghi da una parte e l'altra se ne accorge subito, senza riavviare niente.

Il collegamento **si rinnova da solo**. Se un giorno non ci riesce, il campo per
scrivere si toglie di mezzo e al suo posto torna il bottone **Connetti account**:
un clic e sei di nuovo dentro. La chat, intanto, continua a leggersi come sempre.

Per andarsene c'è **Revoca account**, nella regia. Revoca davvero il gettone su
Twitch, non si limita a dimenticarlo qui, e proprio perché è una cosa vera chiede
sempre conferma: il primo clic lo fa diventare **«Sicuro? Revoco.»**, il secondo
revoca per davvero. Se ci ripensi basta non fare niente: dopo qualche secondo il
bottone torna com'era. Il Client ID resta al suo posto, così ricollegarsi è di
nuovo un clic solo.

**Quello che non cambia, ed è il punto**: per *leggere* la chat non serve e non
servirà mai nessun account. Il pollaio entra in chat in anonimo come ha sempre
fatto, e senza collegamento è esattamente il widget di prima. L'account non
serve a guardare la chat: serve a farci qualcosa dentro.

---

## I comandi di Twitch, dal campo della chat

Dal campo in fondo alla chat si danno **ventisette comandi**, battuti come si
sono sempre battuti: `/ban tizio`, `/slow 10`, `/announce si parte`. Partono per
davvero.

**Perché è una sezione e non una riga.** Nel 2023 Twitch ha spento i comandi via
IRC: da allora la barra non è più un pezzo di testo che la chat interpreta, e
ognuno è diventato **un endpoint suo dell'API, con un permesso suo**. Peggio:
l'API con cui il pollaio manda i messaggi quei comandi non li esegue, li
rifiuta. Chi provava `/ban tizio` si vedeva rispondere «Twitch non l'ha fatto
passare» e non poteva capirci niente — non aveva sbagliato a scrivere, era una
strada chiusa in fondo. Adesso il comando lo riconosco prima di mandarlo e lo
giro all'endpoint giusto.

E quello che scrivi non finisce mai in chat per sbaglio: se la riga comincia per
`/` e il comando non lo conosco, **non lo mando** — te lo dico e resta nel
campo. Un `/bam tizio` battuto storto che compare in chat davanti a tutti è
esattamente la figura che non voglio farti fare.

### L'elenco

| comando | cosa fa |
|---|---|
| `/ban <utente> [motivo]` | lo caccio dal canale per sempre, con il motivo se glielo vuoi dire |
| `/timeout <utente> [secondi] [motivo]` | lo metto in panchina: senza numero sono dieci minuti, al massimo due settimane |
| `/unban <utente>` | gli riapro la porta del canale |
| `/untimeout <utente>` | gli tolgo la panchina prima della fine |
| `/clear` | svuoto la chat per tutti quelli che stanno guardando |
| `/slow [secondi]` | un messaggio ogni tanto: senza numero sono trenta secondi, da tre a centoventi |
| `/slowoff` | tolgo il rallentatore |
| `/followers [minuti]` | scrivono solo i follower: col numero, solo chi segue da almeno quei minuti |
| `/followersoff` | torna a scrivere chiunque, follower o no |
| `/subscribers` | scrivono solo gli abbonati |
| `/subscribersoff` | torna a scrivere anche chi non è abbonato |
| `/emoteonly` | si parla solo a emote |
| `/emoteonlyoff` | si torna a parlare anche a parole |
| `/uniquechat` | niente messaggi copiati e incollati uguali |
| `/uniquechatoff` | si può ripetere quello che si vuole |
| `/announce [blue\|green\|orange\|purple] <testo>` | un annuncio in evidenza in chat: senza colore prende quello del canale |
| `/shoutout <utente>` | mando la chat a vedere un altro canale |
| `/raid <utente>` | porto la gente da un altro: parte il conto alla rovescia |
| `/unraid` | annullo il raid prima che parta |
| `/marker [descrizione]` | metto un segnalibro nella diretta, per ritrovare il punto dopo |
| `/poll <domanda> \| <scelta> \| <scelta> [\| altre] [/ secondi]` | apro un sondaggio: da due a cinque scelte |
| `/prediction <domanda> \| <esito> \| <esito> [\| altri] [/ secondi]` | apro un pronostico: da due a dieci esiti |
| `/mod <utente>` | lo faccio moderatore del canale |
| `/unmod <utente>` | gli tolgo la spada da moderatore |
| `/vip <utente>` | gli do il VIP |
| `/unvip <utente>` | gli tolgo il VIP |
| `/w <utente> <testo>` | un sussurro: lo legge solo lui, e in chat non compare |

Il nome di chi si scrive con o senza la chiocciola, non cambia niente: `@tizio`
e `tizio` sono la stessa cosa. Le maiuscole nemmeno.

Dove Twitch ha un limite di lunghezza io **taglio invece di farmi dire di no**:
il motivo di un ban e il testo di un annuncio o di un sussurro a cinquecento
caratteri, la descrizione di un segnalibro a centoquaranta. Preferisco un motivo
accorciato a un comando che non parte.

### `/poll` e `/prediction`, che vanno spiegati

Sono gli unici due con una sintassi da imparare, perché sono gli unici che
devono passare a Twitch più di una cosa per volta:

```
/poll <domanda> | <scelta> | <scelta> [| altre] [/ secondi]
/prediction <domanda> | <esito> | <esito> [| altri] [/ secondi]
```

La barra verticale separa la domanda dalle risposte, e le risposte fra loro.

La durata è la parte con il trucco. Si scrive in fondo — una barra, uno spazio,
i secondi — e la leggo come durata **solo se la riga finisce così**. Serviva
perché una domanda tipo «chi vince, A/B?» ha una barra in mezzo e non voleva
dire niente del genere: guardando solo la coda, quella barra resta parte della
domanda. Se la durata non la metti sono **due minuti**.

```
/poll Che si gioca stasera? | Elden Ring | Un souls a caso | Si chiacchiera / 180
```

Il sondaggio vuole da **due a cinque** scelte e dura da quindici secondi a
mezz'ora; il pronostico vuole da **due a dieci** esiti e la finestra arriva alla
stessa mezz'ora. Anche qui taglio dove Twitch ha un limite: la domanda di un
sondaggio a sessanta caratteri, quella di un pronostico a quarantacinque, ogni
scelta a venticinque.

### Sondaggio e Pronostico: i due pannellini

Il comando scritto resta, per chi lo sa a memoria. Ma comporre
`/poll domanda | scelta | scelta / 120` dentro un campo largo quattrocento pixel
è scomodo e facile da sbagliare — una barra dimenticata e il sondaggio ha una
scelta sola — quindi il pannello si apre da sé: **batti `/poll` e basta**, senza
niente dietro, e compare in sovrimpressione sopra la chat. Uguale con
`/prediction`. La fila dei filtri resta solo per i filtri, che è il suo mestiere.

Se invece il comando lo scrivi intero — `/poll domanda | scelta | scelta / 120` —
resta un comando e parte com'è: la scorciatoia per chi la sa a memoria non se
n'è andata. Il pannello si chiude con la sua crocetta.

Dentro c'è la domanda, le scelte una per riga, **Aggiungi scelta** per farne
un'altra e la durata in secondi. Si conferma con **Apri il sondaggio** o **Apri
il pronostico**. Il pannello nasce con due scelte già pronte, perché è il minimo
che Twitch accetta, e il tasto per aggiungerne si spegne da sé quando sei
arrivato al massimo: i limiti li fa vedere invece di dirteli dopo.

| | domanda | quante | ognuna | durata |
|---|---|---|---|---|
| **Sondaggio** | 60 caratteri | da 2 a 5 scelte | 25 caratteri | 15–1800 secondi |
| **Pronostico** | 45 caratteri | da 2 a 10 esiti | 25 caratteri | 1–1800 secondi |

Le righe lasciate vuote le salto, quindi non devi cancellarle: se ne apri cinque
e ne riempi tre, il sondaggio ha tre scelte. L'unica cosa che il pannello
rifiuta è **una barra verticale dentro la domanda**, perché è il segno con cui
compone il comando e se ne trovasse una in mezzo taglierebbe la domanda a metà.

Sotto è lo stesso motore: il pannello compone la riga del comando e la fa
eseguire allo stesso pezzo di codice che esegue `/poll` battuto a mano. Non ci
sono due strade che possono scollarsi, ce n'è una con due porte d'ingresso.

**Il pannello si apre solo se il collegamento ha il permesso** —
`channel:manage:polls` per il sondaggio, `channel:manage:predictions` per il
pronostico — e senza, invece di aprirsi, ti dice quale permesso manca. Un
pannello che si apre e poi non conclude sarebbe peggio di uno che non si apre. In modalità prova fanno
eccezione: si vedono, ma non aprono niente, perché là l'id del canale non lo
vado nemmeno a cercare.

### Quando un comando non parte

Prima di chiamare Twitch controllo tre cose, in quest'ordine, e ognuna ha la sua
risposta:

- **non so chi sei**: l'account non è collegato, e i comandi li do a nome tuo;
- **non so ancora in che canale siamo**: l'id numerico del canale me lo dice
  Twitch subito dopo il collegamento, e per un attimo non ce l'ho. Riprova fra
  un secondo — comandi al buio non ne do;
- **al tuo collegamento manca il permesso**: è il caso che capiterà a te se
  l'account l'avevi collegato prima, e si risolve riconnettendolo.

Poi risponde Twitch, e quello che dice te lo riporto com'è. Un no che parla di
moderatore vuol dire quasi sempre che sul canale non lo sei: il permesso ce
l'hai, il ruolo no. Sono due cose diverse e si confondono facilmente — il
permesso è quello che hai dato tu al pollaio, il ruolo è quello che ti ha dato
lo streamer.

---

## Il menù sul nome, e chi c'è in chat

Questa è la parte che si userà davvero. Ricopiare un nick a mano mentre la chat
scorre è il modo migliore di dare il timeout alla persona sbagliata, e comunque
quasi nessuno lo fa: quando serve un timeout serve subito.

### Il menù sul nome

**Clicca il nome di chi ha scritto**, quello in testa al suo messaggio, oppure
un nome nella lista di chi c'è, e si apre un menù:

*Sussurra · Shoutout · Timeout 10 minuti · Timeout un'ora · Togli il timeout ·
Fallo VIP · Togli il VIP · Fallo moderatore · Togli il moderatore · Banna*.

Non c'è niente da scrivere: la persona ce l'hai già davanti. E sotto non c'è
niente di nuovo — il menù compone la riga del comando e la fa fare **allo stesso
pezzo di codice** che esegue i comandi battuti a mano. Una strada sola, due modi
di imboccarla: il giorno che `/timeout` cambia, cambia in tutti e due i posti
insieme.

Le cose che contano:

- **Le voci per cui il collegamento non ha il permesso sono spente**, e il
  perché sta nel `title`: ci passi sopra col mouse e te lo dice. Meglio una voce
  spenta che spiega di una accesa che fallisce.
- **Banna chiede conferma.** Il primo clic la fa diventare «Sicuro? Banno
  tizio», il secondo — entro quattro secondi — banna davvero; passati i quattro
  secondi torna com'era da sola. È l'unica voce da cui non si torna indietro, ed
  è l'unica che chiede due volte.
- **Sussurra non manda niente**: riempie il campo con `/w tizio ` e ti lascia
  scrivere. Un sussurro senza testo non ha senso, e mandarlo al primo clic
  sarebbe stato soltanto un modo di spedire messaggi vuoti. È anche l'unica voce
  che resta accesa quando il permesso manca, e ha senso: non fa partire niente,
  quindi il controllo del permesso arriva quando premi Invio.
- **Esc chiude**, e chiude anche un clic fuori dal menù.

Il menù c'è dove c'è la barra: nella finestra di `Pollaio.exe` e nella pagina
aperta a mano in un browser. In una sorgente browser di OBS no, e **in modalità
prova nemmeno** — là dentro le persone sono inventate, e bannare una persona
inventata chiamerebbe Twitch per davvero.

### Il contatore, e la lista di chi c'è

In cima alla chat compare un bottone: **«N in chat · N guardano»**. Sono due
numeri diversi ed è giusto tenerli separati — chi guarda è quasi sempre molto
più di chi scrive, e il rapporto fra i due dice più di ciascuno dei due preso da
solo. A canale spento il bottone lo scrive, «canale spento», che è comunque
un'informazione.

Cliccandolo si apre un pannello diviso in quattro scomparti: **streamer,
moderatori, VIP, utenti**. Dentro c'è chi è in chat **adesso** — non l'elenco dei
moderatori del canale, non l'anagrafe dei VIP: gli scomparti servono a mettere
in ordine le persone che ci sono, non a fare la lista di quelle che potrebbero
esserci.

**Il bottone compare solo con l'account collegato**, perché quei numeri li
chiedo all'API e senza collegamento non ho niente con cui chiederli.

Tre cose da dire con onestà, perché sono limiti veri e non guasti:

- **Chi c'è in chat, Twitch lo fa vedere solo allo streamer e ai suoi
  moderatori.** Su un canale dove non sei né l'uno né l'altro quella lista non
  arriva: resta il conto degli spettatori, e il pannello scrive per esteso
  perché. Non è il pollaio che non ce la fa.
- **Moderatori e VIP li so dividere solo sul tuo canale.** Altrove Twitch non mi
  lascia chiedere chi sono, quindi ci sono tutti ma stanno tutti fra gli utenti.
  Anche questo il pannello lo dice, invece di lasciartelo indovinare da uno
  scomparto vuoto.
- **Il ritmo è educato**: il contatore ogni minuto, la lista ogni due, e **la
  lista la chiedo soltanto a pannello aperto**. Un widget acceso otto ore non ha
  nessun motivo di farsi mandare mille nomi da Twitch per tenerli in un pannello
  che nessuno sta guardando. Appena lo apri la lettura la faccio subito, a meno
  che non sia appena passata di lì: fra due letture lascio comunque cinque
  secondi.

Se le letture vanno male cinque volte di fila smetto di provare, e il contatore
resta fermo su quello che sapeva. Un numero vecchio è meglio di un widget che
martella Twitch a vuoto per tutta la diretta.

---

## Sistemare l'inquadratura a canale spento

```
pollaio.html?prova=1
```

Genera traffico finto ma credibile: ventuno persone con badge e colori stabili,
frasi vere da chat italiana, emote vere del canale, e ogni tanto un abbonamento,
un raid, dei bits, un messaggio in evidenza, un ban.

**Le emote vere si vedono davvero**, e vale la pena dirlo perché fino a poco fa
non era così: in prova non ne compariva mai una. Il copione d'apertura chiamava
un muro di `Kappa`, che è un'emote **nativa di Twitch** — non sta nei cataloghi
di 7TV, BetterTTV e FrankerFaceZ, e in chat vera arriva dentro al messaggio, per
una via che in prova non esiste. Quindi usciva testo, e usciva testo proprio nel
momento in cui uno sta guardando l'overlay per inquadrarlo. Adesso al secondo
0,6 del copione arrivano tre `KEKW` veri, disegnati come in diretta, e le emote
continuano a passare per tutto il resto del traffico finto. Servono i cataloghi,
quindi col cavo staccato restano nomi scritti: è la stessa condizione della chat
vera.

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
| `movimento` | `auto` | `auto` dà retta all'interruttore di Windows che chiede meno animazioni · `sempre` anima comunque, ed è quello che serve in una sorgente browser di OBS |
| `pollo` | `0` | `1` mostra la mascotte accanto alla chat |

### Contenuto

| chiave | valore | cosa fa |
|---|---|---|
| `max` | `40` | quanti messaggi restano appesi. Con un filtro acceso ne tiene da parte fino a sei volte tanti, e conta solo quelli che si vedono |
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

### La barra sotto la chat

| chiave | valore | cosa fa |
|---|---|---|
| `barra` | `1` | la striscia coi filtri e la pausa. In una sorgente browser di OBS non compare comunque, qualunque cosa dica questa chiave |
| `scrivi` | `1` | il campo per scrivere dentro la striscia, e con lui i comandi, il pannello del sondaggio, il bottone di chi c'è e le emote di Twitch nel suggeritore. Senza account collegato al suo posto c'è il bottone «Connetti account» |

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

## Le live congiunte

Twitch le chiama **Stream Together**: inviti altri streamer nella tua diretta e
le vostre chat diventano una sola, fino a sei canali, con i moderatori di tutti
che valgono per tutti. Il pollaio la riconosce da solo. **Non c'è niente da
configurare, niente da accendere e nessun canale in più da scrivere da qualche
parte**: quando la sessione parte cambia la chat, e il widget se ne accorge.

Cosa vedi cambiare:

- **I messaggi degli altri streamer arrivano con la loro faccia e il loro
  nome** su una targhetta sopra la riga, con una tinta diversa per canale. I
  tuoi restano nudi come sempre: sono i tuoi, si riconoscono perché non hanno
  niente sopra.
- **I badge sono quelli giusti.** Un moderatore dell'altro canale si vede come
  moderatore, un suo abbonato con il distintivo del **suo** abbonamento — non
  col tuo. Se il suo distintivo non si riesce a recuperare, al posto suo va il
  disegnino di scorta: mai il tuo badge addosso a qualcun altro, che sarebbe
  una bugia.
- **Le emote sono le sue.** 7TV, BetterTTV e FrankerFaceZ dell'altro canale
  vengono caricate quando serve, e valgono solo per i suoi messaggi. Le emote
  di Twitch funzionano per tutti come sempre.
- **Nella barra sotto la chat compare una pastiglia per ogni streamer**, così
  puoi guardare solo la chat di uno.
- **Chi nomina l'altro streamer si accende** come chi nomina te: in una live
  congiunta sta parlando di questa diretta comunque.

Tutto questo **senza account collegato**: basta la chat, che porta già dentro
di sé tutto quello che serve. L'unica differenza se l'account c'è: il pollaio
sa chi partecipa **prima** che scriva — quindi faccia, nome, badge ed emote
sono già pronti al primo messaggio — e sa **quando la sessione finisce**, così
le pastiglie e le targhette si tolgono di mezzo subito invece di restare lì.
Senza account, un canale compare al suo primo messaggio, che è un ritardo di
niente.

Quello che il pollaio **non** fa: non avvia una live congiunta. Quella si fa
dalla dashboard di Twitch, e Twitch non lascia farla da fuori.

Kick e YouTube non hanno niente del genere, e infatti qui non c'entrano: questa
è una cosa di Twitch e basta.

---

## Cosa vede e cosa non vede

Per **leggere**, il widget entra in chat **in anonimo**, senza account e senza
password, e questa parte non è cambiata: niente da custodire, niente che scade,
niente che possa essere bannato. È così in `pollaio.html` aperto da solo, ed è
così nella sorgente browser di OBS, sempre.

Per **scrivere**, per i comandi e per sapere chi c'è, un account serve, e allora
quelle tre cose diventano tutte e tre false. Vale la pena dirle una per una
invece di lasciarle scoprire.

- **C'è qualcosa da custodire**: il gettone che Twitch rilascia dopo il tuo sì.
  Sta nella memoria di questo browser e basta — non nell'indirizzo che copi in
  OBS, non in `avvio\pollaio.ini`, e mai nella sorgente browser, che è un altro
  browser con la sua memoria separata.
- **C'è qualcosa che scade**: il gettone dura qualche ora e si rinnova da solo,
  senza che tu te ne accorga. Il giorno che il rinnovo non riesce più, il campo
  per scrivere si toglie di mezzo e al suo posto torna il bottone «Connetti
  account», che rifà il giro in un clic. La chat, intanto, continua a leggersi.
- **E sì, si può essere bannati.** Chi scrive in chat è il tuo account, con le
  regole di chiunque altro: il widget non ha una corsia preferenziale, manda un
  messaggio come lo manderesti dal sito di Twitch.

I permessi adesso sono sedici invece di uno — sono in tabella nella sezione
«I permessi, e perché l'account va riconnesso» — e **Revoca account** nella
regia li revoca davvero su Twitch, tutti insieme, invece di limitarsi a
dimenticare il gettone qui.

**Vede**: tutti i messaggi, emote di Twitch, 7TV, BetterTTV e FrankerFaceZ,
tutti i badge, i colori dei nomi, i `/me`, le risposte, i bits e i cheermote,
abbonamenti, riabbonamenti, regali singoli e in blocco, raid, annunci,
primi messaggi, ban, pause e cancellazioni dei moderatori.

**Vede anche le live congiunte**, senza che tu colleghi niente: i messaggi
degli altri streamer con la loro faccia, i loro badge e le loro emote. Sta
nella sezione «Le live congiunte» qui sopra.

**Con l'account collegato vede in più**: quanti stanno guardando, chi è in chat
adesso — ma solo dove sei lo streamer o un suo moderatore, che è una regola di
Twitch e non mia — quali emote di Twitch puoi usare tu in questo canale, e chi
è entrato in una live congiunta prima ancora che scriva. Queste non passano
dalla chat, passano dall'API, e l'API vuole un login: è tutta qui la differenza
fra prima e adesso.

**Non vede**: chi entra e chi esce dalla chat, perché Twitch non lo dice più in
modo affidabile. E senza account collegato non vede nemmeno le tre cose della
riga qui sopra.

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

E adesso ricaricare basta davvero. Il pollaio si ricorda il catalogo per non
richiederlo a ogni apertura, e fino a poco fa se lo teneva buono per mezz'ora
anche quando aveva risposto **una sorgente su sei**: chi fa partire il pollaio
insieme al computer, con la rete non ancora in piedi, si portava dietro quel
catalogo monco per mezz'ora di ricariche, e in quella mezz'ora nessuna ricarica
riprovava nemmeno a chiedere. Adesso il ricordo si dichiara buono solo se viene
da un **giro completo**. Un giro parziale si usa lo stesso, subito — meglio due
emote che nessuna, e la chat non deve partire spoglia per aspettare la rete —
ma non blocca più il rifornimento: mentre leggi, il catalogo se lo sta già
richiedendo.

**Un comando risponde che al collegamento manca un permesso.**
Il collegamento è più vecchio dei comandi. Twitch i permessi li dà solo quando
si collega l'account, quindi a uno già fatto non c'è modo di aggiungerli: apri
la regia, **Riconnetti account**, un clic, e tornano tutti. È la stessa cosa che
tiene spente le voci del menù sul nome, che spegne il pannello del sondaggio
e che fa mancare il bottone di chi c'è.

**Un comando dice che Twitch ha detto di no, e parla di moderatore.**
Quello è un altro paio di maniche: il permesso ce l'hai, il ruolo no. Il
permesso è quello che hai dato tu al pollaio, il ruolo è quello che ti ha dato
lo streamer sul suo canale. Nessuna riconnessione lo risolve — o sei moderatore
di quel canale, o quel comando non lo puoi dare da nessuna parte, nemmeno dal
sito di Twitch.

**Il bottone con quanti sono in chat non compare.**
O l'account non è collegato — quei numeri li chiedo all'API, e senza login non
ho niente con cui chiederli — oppure sei in una sorgente browser di OBS, dove di
tutta la barra non compare niente. Se invece compare ma la lista dice che non
può, allora è il caso onesto: su quel canale non sei né lo streamer né un suo
moderatore, e chi c'è in chat Twitch lo fa vedere solo a loro.

**I badge sono forme colorate semplici invece di quelli veri.**
Vuol dire che il servizio dei badge non ha risposto e il widget ha usato quelli
che si disegna da solo. Funziona tutto, sono solo meno belli.

**In OBS si vede un rettangolo bianco dov'è il pollo.**
Non dovrebbe succedere: se succede, avvisami. L'immagine della mascotte ha il
fondo bianco e viene ritagliata dal foglio di stile.

**L'overlay non anima niente, e non si capisce perché.**
I messaggi compaiono e basta: niente effetto d'ingresso, niente dissolvenza in
uscita, la spia non batte, la fascia dell'hype train sta ferma, il pollo non
dondola. Quasi sempre è Windows: Impostazioni → Accessibilità → Effetti visivi →
**Effetti di animazione**. Quando quell'interruttore è spento, il computer chiede
a tutti i programmi di muoversi il meno possibile, e il pollaio gli dà retta —
in blocco. È per questo che sembra un difetto del widget: due persone sullo
stesso canale, una vede l'effetto glitch e l'altra non lo vede su nessun
messaggio.

**Adesso però non lo fa più di nascosto.** Qui c'era scritto «e senza dirlo», ed
era la parte che faceva perdere il pomeriggio: chi non sa di quell'interruttore
dà la colpa al widget, resetta le impostazioni e reinstalla, e non cambia niente
perché la causa non è nel programma. Dalla 1.2.1 **la regia se ne accorge da
sola**: se il computer chiede meno animazioni e la manopola è su «come dice il
computer», sotto a quella manopola compare un riquadro giallo che dice cosa sta
succedendo e come si rimedia. Sparisce da sé appena giri la manopola, o appena
riaccendi l'interruttore in Windows e torni sulla regia.

**Il rimedio è uno dei due**: riaccendere gli effetti in Windows, oppure mettere
`movimento=sempre` fra i parametri dell'indirizzo. Nella regia è la manopola
**«Quando animare»**, nel gruppo «L'aspetto», da girare su «Anima comunque».

Il predefinito resta `auto`, cioè dare retta al computer, e non per pigrizia:
quell'interruttore lo accende chi sta male a guardare le cose che si muovono, e
ignorarlo di nascosto sarebbe sgarbato. Ma dentro una **sorgente browser di
OBS** quella è la risposta a una domanda mal posta. Lì il computer non sta
guardando, sta disegnando: la preferenza è di chi trasmette, mentre l'immagine
la guardano gli spettatori, che quella preferenza non l'hanno mai espressa. Nella
sorgente browser «anima comunque» ha senso. Sulla macchina che usi per
**guardare** la chat no: lì chi guarda è chi ha espresso la preferenza, ed è
giusto rispettarla.

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
│  │  ├─ font.css        i tre caratteri, presi dalla cartella qui accanto
│  │  └─ prove.css       il banco di prova
│  ├─ font/           Space Grotesk, Manrope, JetBrains Mono in locale.
│  │                  Prima arrivavano da Google a ogni apertura: se la rete
│  │                  tossiva proprio mentre partiva la diretta, l'overlay si
│  │                  disegnava coi caratteri di ripiego. Sono sotto licenza
│  │                  SIL Open Font, il testo sta in font\LICENZA.txt
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
│  │  ├─ stormo.js       le live congiunte: chi sono gli altri canali
│  │  ├─ resa.js         l'unico file che tocca la pagina
│  │  ├─ conto.js        il collegamento con l'account Twitch, e il mandare
│  │  ├─ comandi.js      i ventisette comandi: cosa vuol dire ognuno, che
│  │  │                  permesso vuole e a quale endpoint di Twitch va
│  │  ├─ gente.js        quanti guardano, chi c'è in chat, e chi è cosa
│  │  ├─ azioni.js       il menù che si apre cliccando un nome
│  │  ├─ barra.js        la striscia sotto la chat: filtri, pausa, campo per
│  │  │                  scrivere, l'elenco delle emote che si apre coi due
│  │  │                  punti, e il pannellino di sondaggio e pronostico
│  │  ├─ prova.js        il traffico finto
│  │  ├─ menu.js         il tasto destro e i bordi che si tirano, nella
│  │  │                  finestra di Pollaio.exe
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

Stanno in `avvio\pollaio.ini`: misura della finestra (che il launcher riscrive
da sé ogni volta che la tiri per un bordo), dove si apre, quali
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
