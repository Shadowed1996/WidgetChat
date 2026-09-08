# il pollaio

Widget della chat di [slayer_beard](https://www.twitch.tv/slayer_beard), fatto per
essere catturato da OBS.

Si collega alla chat vera, disegna emote, badge, moderatori, abbonamenti, raid e
bits con la grafica del canale, ed evidenzia le cose che meritano di essere
notate mentre la chat scorre.

Per **guardarla** non serve installare niente, non serve un account, non serve
una password: il pollaio entra in chat in anonimo, come ha sempre fatto. Un
account Twitch serve **solo** se vuoi anche **scrivere**, dal campo in fondo
alla chat, e si attacca da lì: finché non c'è nessuno collegato, al posto del
campo c'è il bottone che fa tutto. La prima volta si passa dalla regia per
riempire una riga, dopo è un clic. Se non lo attacchi, il widget è esattamente
quello di prima.

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

**Eventi** tiene le schede di abbonamento, riabbonamento, regali, raid e
annunci, più ogni messaggio con dei bits.

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

Nell'anteprima della regia il bottone si vede ma non collega niente: là dentro è
tutto finto, e collegare un account per davvero da un'anteprima sarebbe una
sorpresa poco gradita.

### Le due manopole

Stanno nella regia, gruppo **La barra sotto la chat**, e nascono accese tutte e
due: `barra` è la striscia coi filtri e la pausa, `scrivi` è il campo per
scrivere dentro la striscia — e con lui il bottone «Connetti account» che ne fa
le veci quando non c'è nessun account. Spegnerne una non spegne l'altra.

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
restano — Twitch ne accetta cinquecento. In modalità prova non manda niente per
davvero, e te lo dice invece di far finta.

Il collegamento va fatto **una volta sola**, e si può fare da due posti.

**Dal bottone sotto la chat.** Finché non c'è nessun account collegato, al posto
del campo per scrivere c'è **Connetti account**. Lo premi, diventa «Sto
aspettando…», e il pollaio ti apre Twitch alla pagina di conferma — nella
finestra di `Pollaio.exe` è il tuo browser di sistema, quello dove sei già
loggato. Dici di sì, e appena Twitch lo conferma il bottone lascia il posto al
campo per scrivere. Non devi aprire la regia, e non devi tornare a dire a
nessuno che hai finito: se ne accorge da solo.

**Dalla regia.** Sezione **«Il tuo account Twitch»**, che è la prima cosa della
pagina, subito sotto il titolo. Il giro è identico e il bottone si chiama
uguale, **Connetti account**; in più qui c'è una riga di stato che dice sempre a
che punto siamo, il codice scritto grande, e i bottoni **Riapri Twitch**, **Copia
il codice** e **Lascia stare**, che servono quando il browser fa i capricci.

**La pagina di Twitch si apre col codice già dentro.** L'indirizzo è
`twitch.tv/activate?device-code=…`, e me lo dà Twitch stesso insieme al codice:
in pratica non devi ricopiare niente, trovi solo il bottone di conferma. Il
codice resta scritto in pagina lo stesso, perché se il browser non si apre — o
si apre quello sbagliato, dove non sei loggato — devi poterlo battere a mano su
`twitch.tv/activate`. Vale mezz'ora, e io intanto resto lì ad aspettare.

### La prima volta: il Client ID

C'è una cosa che va messa una volta sola, e quella va messa **dalla regia**: il
**Client ID**. Sta in fondo alla sezione dell'account, dentro il blocco
richiudibile **«Con quale applicazione mi presento a Twitch»**. Se il Client ID
c'è già il blocco è chiuso e non lo vedi nemmeno; se manca si apre da solo, e la
riga di stato ti dice che è l'unica volta in cui questa pagina ti chiede
qualcosa. Da lì in poi collegarsi è **un clic e basta**, da tutte e due le
strade.

Si riempie così: su `dev.twitch.tv/console/apps` registri **un'applicazione
tua** — «Register Your Application», nome qualsiasi, **OAuth Redirect URL**
`http://localhost`, categoria «Chat Bot», tipo **Public**. Twitch ti dà il
**Client ID**: lo incolli nel campo e premi **Connetti account**. Il **Client
Secret** non serve: non copiarlo da nessuna parte.

Finché quel campo è vuoto il bottone sotto la chat non parte: te lo dice e ti
manda in regia, perché è l'unico posto dove il campo c'è.

**Perché serve un'applicazione tua e non una mia.** Non è un capriccio del
pollaio: Twitch non concede permessi a un programma anonimo, vuole sapere *quale*
programma glieli sta chiedendo, e quel nome pubblico è il Client ID. Non è un
segreto e non è una password — viaggia in chiaro dentro ogni richiesta, e infatti
nella regia sta lì in bella vista.

### Il gettone, e come si toglie

Il permesso chiesto è **uno solo**: `user:write:chat`, cioè mandare messaggi a
nome tuo. Non può leggere i tuoi messaggi privati, non può bannare nessuno, non
può toccare le impostazioni del canale.

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
fatto, e senza collegamento è esattamente il widget di prima. L'account serve a
una cosa sola, ed è scritta nel nome del permesso.

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
| `scrivi` | `1` | il campo per scrivere dentro la striscia. Senza account collegato al suo posto c'è il bottone «Connetti account» |

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

Per **leggere**, il widget entra in chat **in anonimo**, senza account e senza
password, e questa parte non è cambiata: niente da custodire, niente che scade,
niente che possa essere bannato. È così in `pollaio.html` aperto da solo, ed è
così nella sorgente browser di OBS, sempre.

Per **scrivere** un account serve, e allora quelle tre cose diventano tutte e
tre false. Vale la pena dirle una per una invece di lasciarle scoprire.

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

Il permesso è `user:write:chat` e soltanto quello, e **Revoca account** nella
regia lo revoca davvero su Twitch invece di limitarsi a dimenticarlo qui.

**Vede**: tutti i messaggi, emote di Twitch, 7TV, BetterTTV e FrankerFaceZ,
tutti i badge, i colori dei nomi, i `/me`, le risposte, i bits e i cheermote,
abbonamenti, riabbonamenti, regali singoli e in blocco, raid, annunci,
primi messaggi, ban, pause e cancellazioni dei moderatori.

**Non vede**: chi entra e chi esce dalla chat (Twitch non lo dice più in modo
affidabile), gli spettatori collegati, e le cose che passano solo dall'API con
un login che abbia il permesso di leggerle — quello che chiedo serve a scrivere,
non a leggere, quindi non cambia niente di questo elenco.

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
│  │  ├─ resa.js         l'unico file che tocca la pagina
│  │  ├─ conto.js        il collegamento con l'account Twitch, e il mandare
│  │  ├─ barra.js        la striscia sotto la chat: filtri, pausa, campo
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
