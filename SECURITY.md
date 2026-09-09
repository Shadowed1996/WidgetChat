# Politica di sicurezza

Grazie per il tempo che dedichi a segnalare un problema. Questo documento dice
dove scrivere, cosa serve sapere e in quanto tempo arriva una risposta.

## Versioni supportate

Il pollaio si aggiorna da solo all'avvio: la versione supportata è sempre
l'ultima pubblicata nelle
[Releases](https://github.com/Shadowed1996/WidgetChat/releases).

| Versione | Supportata |
|---|---|
| 1.2.x (ultima release) | ✅ |
| precedenti | ❌ |

Se stai usando una versione più vecchia, la prima cosa da provare è aggiornare:
molti problemi sono già chiusi nella release successiva.

## Come segnalare una vulnerabilità

**Non aprire una issue pubblica** per un problema di sicurezza.

1. Vai su [Security → Report a vulnerability](https://github.com/Shadowed1996/WidgetChat/security/advisories/new)
   e apri una **GitHub Security Advisory privata**. È il canale preferito:
   resta riservata finché non c'è una correzione.
2. In alternativa, contatta [@Shadowed1996](https://github.com/Shadowed1996)
   su GitHub.

## Cosa includere nella segnalazione

Più roba c'è, prima si chiude:

- **Cosa succede** e perché è un problema di sicurezza.
- **Versione** del pollaio (la trovi nella regia, oppure è il tag dell'ultima
  release che hai scaricato) e come lo stai usando: `Pollaio.exe`, sorgente
  browser di OBS, o la pagina aperta da `file://`.
- **Ambiente**: versione di Windows, browser o runtime WebView2, versione di OBS.
- **Passi per riprodurre**, in ordine, dettagliati. Se serve un indirizzo con dei
  parametri dopo il `?`, incollalo.
- **Impatto**: cosa può ottenere chi sfrutta il problema.
- Eventuali **log**, screenshot o registrazioni. Togli prima i dati personali.

**Non allegare mai gettoni, chiavi API o password**, nemmeno tuoi: se un gettone
è finito in un log, revocalo e diccelo, non incollarlo.

## Tempi di risposta

| Fase | Tempo indicativo |
|---|---|
| Primo riscontro | entro 7 giorni |
| Valutazione e conferma | entro 14 giorni |
| Correzione e release | in base alla gravità, di norma con la release successiva |

Il progetto è portato avanti da una persona sola nel tempo libero: i tempi sono
indicativi, e se un problema è grave passa davanti a tutto il resto.

## Impegno verso chi segnala

Se segnali in buona fede — senza accedere a dati di altri, senza degradare il
servizio e senza divulgare il problema prima della correzione — **non verrà
intrapresa alcuna azione legale** nei tuoi confronti. Se lo desideri, il tuo
nome viene citato nel `CHANGELOG.md` alla voce della release che corregge il
problema.

## Fuori ambito

Non sono considerate vulnerabilità di questo progetto:

- Problemi delle **piattaforme di terze parti** — Twitch, Kick, YouTube, 7TV,
  BetterTTV, FrankerFaceZ — o delle loro API. Vanno segnalati a loro.
- Problemi del **runtime WebView2**, di **Chrome** o di **OBS**: vanno segnalati
  ai rispettivi progetti.
- Il **server locale** del launcher che risponde sulla rete di casa: è il suo
  comportamento previsto e documentato. Ascolta solo sulla rete locale, consegna
  soltanto i file del widget e si spegne con `rete=0` in `avvio\pollaio.ini`.
  Segnalazioni valide sono quelle che mostrano che consegna **altro** oltre a
  quei file, o che è raggiungibile da fuori.
- Il fatto che la **lettura della chat sia anonima e pubblica**: la chat di un
  canale in diretta è pubblica per definizione.
- Segnalazioni prodotte solo da uno **scanner automatico**, senza un caso di
  sfruttamento concreto.
- Attacchi che richiedono **accesso fisico** alla macchina o privilegi di
  amministratore già ottenuti.
- **Social engineering** verso l'autore o verso chi usa il progetto.
- Mancanza di intestazioni HTTP di sicurezza su un server che gira solo in
  locale.

## Note

Il pollaio non ha un backend, non raccoglie dati e non manda niente a nessuno
che non sia la piattaforma di chat a cui ti stai collegando. Il gettone che
Twitch rilascia dopo il collegamento dell'account resta nella memoria del
browser che ha fatto il collegamento: non finisce nell'indirizzo che si incolla
in OBS, né in `avvio\pollaio.ini`, né in questo repository.
