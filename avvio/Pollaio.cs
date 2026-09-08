/* =============================================================================
   Pollaio.cs — «il pollaio» · il launcher

   POSSIEDE: la finestra di avvio (lo splash col pollo e la barra), la lettura di
   avvio\pollaio.ini, la ricerca del browser, l'apertura del widget in modalità
   applicazione, e la generazione dell'icona dell'eseguibile.
   NON POSSIEDE: niente del widget. Non tocca l'HTML, non legge il CSS, non sa
   che cosa siano le emote. Apre una pagina e si toglie di mezzo.

   PERCHÉ UN .EXE E NON UN .BAT
   Perché il committente clicca un'icona e deve vedere qualcosa di bello, subito.
   Un .bat sputa una finestra nera. Questo mostra il pollo.

   PERCHÉ NIENTE WebView2
   WebView2 vorrebbe le DLL del suo SDK, che su questa macchina non ci sono, e
   scaricarle sarebbe una dipendenza — vietata dal §1.1 del contratto. La
   modalità `--app=` di Edge/Chrome dà esattamente lo stesso risultato (finestra
   nuda: niente barra indirizzi, niente schede, niente pulsanti) con zero
   dipendenze. Si compila con il csc.exe che Windows ha già dentro.

   INDICE
     1. Costanti e palette
     2. Programma — il punto d'ingresso
     3. Preferenze — avvio\pollaio.ini
     4. Splash — la finestra di avvio
        4.1 costruzione, forma e ombra
        4.2 il pollo mascherato (la parte delicata)
        4.2b la nebulosa: il fondo, calcolato pixel per pixel
        4.3 il disegno
        4.4 l'animazione
        4.5 le fasi, su un thread a parte
     5. Il browser — ricerca, avvio, attesa della finestra
     6. La rete — la verifica vera
     7. Icona — png → ico, per /win32icon
     7-bis. La finestra nuda e il ponte col menu della pagina
     8. Nativo — le chiamate di sistema che servono
   ============================================================================= */

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.Globalization;
using System.IO;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Pollaio
{

/* =============================================================================
   1. COSTANTI E PALETTE
   Gli esadecimali sono gli stessi di css/tokens.css. Qui devono stare per forza:
   il C# non ha var(). Sono copiati, non reinventati — se cambia la palette del
   canale, si cambia in tutti e due i posti.
   ============================================================================= */

internal static class Tinte
{
    public static readonly Color Fondo  = ColorTranslator.FromHtml("#07070c"); // nero del canale
    public static readonly Color Testo  = ColorTranslator.FromHtml("#f2f0f8"); // il nome
    public static readonly Color Tenue  = ColorTranslator.FromHtml("#9a93b0"); // etichette
    public static readonly Color Viola  = ColorTranslator.FromHtml("#8b2fff"); // corpo del pollo
    public static readonly Color Ciano  = ColorTranslator.FromHtml("#22e0ff"); // cresta del pollo
    public static readonly Color Live   = ColorTranslator.FromHtml("#ff3d5e"); // qualcosa è andato storto

    /* Il filo che corre intorno alla finestra della chat. È il viola del
       canale spento sul nero fino a diventare un accenno: a piena forza
       sarebbe una cornice, e una cornice è esattamente la cosa che questa
       finestra è nata per non avere. Deve leggersi come un bordo del vetro,
       non come un contorno disegnato. */
    public static readonly Color Bordo  = ColorTranslator.FromHtml("#2e1d52");
}


/* =============================================================================
   2. PROGRAMMA — il punto d'ingresso
   ============================================================================= */

/// <summary>
/// Le tre librerie di WebView2 stanno in `lib\`, non accanto agli eseguibili.
///
/// PERCHÉ. Sono file che non riguardano chi usa il pollaio, e in mezzo a
/// Pollaio.exe e Regia.exe erano solo confusione. Spostarle però vuol dire
/// dire a .NET dove cercarle, perché di suo guarda accanto all'eseguibile e
/// da nessun'altra parte.
///
/// Due meccanismi, perché i file sono di due specie:
///   · le due gestite si risolvono a mano quando qualcuno le chiede
///     (AssemblyResolve, che scatta solo quando la ricerca normale ha già
///     fallito: non rallenta niente);
///   · WebView2Loader.dll è NATIVA e la carica il motore per nome. Lì
///     AssemblyResolve non c'entra. La si carica prima noi, col percorso
///     completo: da quel momento è già in memoria, e la richiesta per nome
///     trova quella invece di cercarla su disco.
///
/// Va fatto PRIMA che si tocchi qualunque tipo di WebView2 — il caricamento
/// di un tipo tira dentro la sua libreria — e infatti è la prima cosa che
/// succede nel programma.
/// </summary>
internal static class Librerie
{
    public static void Aggancia()
    {
        string lib = Path.Combine(Programma.Radice, "lib");

        AppDomain.CurrentDomain.AssemblyResolve += delegate (object mittente, ResolveEventArgs e)
        {
            try
            {
                string nome = new AssemblyName(e.Name).Name + ".dll";
                string dove = Path.Combine(lib, nome);
                return File.Exists(dove) ? Assembly.LoadFrom(dove) : null;
            }
            catch { return null; }
        };

        try { Nativo.LoadLibraryW(Path.Combine(lib, "WebView2Loader.dll")); }
        catch { /* senza, resta il ripiego col browser */ }
    }
}


internal static class Programma
{
    /// <summary>La cartella dove sta Pollaio.exe: è la radice del progetto.</summary>
    public static string Radice
    {
        get { return Path.GetDirectoryName(Application.ExecutablePath); }
    }

    /// <summary>
    /// Dove vive il widget: le pagine, i fogli, gli script, le immagini.
    /// Sta in una cartella sua perché la radice deve contenere le cose che si
    /// aprono — i due eseguibili e il LEGGIMI — e nient'altro.
    /// </summary>
    public static string CartellaApp
    {
        get { return Path.Combine(Radice, "app"); }
    }

    [STAThread]
    private static int Main(string[] argomenti)
    {
        /* Prima di tutto il resto: le librerie stanno in `lib\` e .NET non lo
           sa. Va fatto qui, prima che si carichi qualunque tipo che le usi. */
        Librerie.Aggancia();

        // Passaggio di servizio, lo usa SOLO compila.cmd fra la prima e la
        // seconda compilazione: genera avvio\pollaio.ico da img\favicon.png e
        // esce senza aprire niente. Sta qui dentro invece che in un secondo
        // programmino perché così il .cmd non deve compilare due sorgenti.
        for (int i = 0; i < argomenti.Length; i++)
        {
            if (argomenti[i] == "--crea-icona")
            {
                string png = Path.Combine(CartellaApp, Path.Combine("img", "favicon.png"));
                string ico = Path.Combine(Radice, Path.Combine("avvio", "pollaio.ico"));
                return Icona.Genera(png, ico) ? 0 : 1;
            }
        }

        /* CHI SONO: il pollaio o la regia.

           Due strade, e la seconda è quella che conta. L'argomento `--regia`
           serve al menu del tasto destro, che si apre la regia da sé. Ma il
           riconoscimento dal NOME dell'ESEGUIBILE è ciò che permette di avere
           due icone sulla scrivania — Pollaio.exe e Regia.exe — che sono lo
           stesso identico programma copiato due volte.

           È voluto: un secondo sorgente da tenere allineato al primo si
           scolla, e mezzo launcher duplicato è il posto dove va a nascondersi
           il difetto che si vede solo in uno dei due. */
        string ioSono = Path.GetFileNameWithoutExtension(Application.ExecutablePath);
        ModoRegia = ioSono.IndexOf("regia", StringComparison.OrdinalIgnoreCase) >= 0;

        for (int i = 0; i < argomenti.Length; i++)
        {
            if (argomenti[i] == "--regia") ModoRegia = true;
        }

        // Va chiamata PRIMA di creare qualunque finestra. Senza, su uno schermo
        // a 125%/150% Windows ingrandisce lo splash come una fotografia e il
        // pollo esce sfocato. Con, disegniamo noi alla densità giusta (§4.1).
        try { Nativo.SetProcessDPIAware(); } catch { /* Windows vecchio: pazienza */ }

        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        /* Il ciclo dei messaggi NON ha una finestra principale, ed è voluto.
           Con `Application.Run(splash)` il ciclo morirebbe insieme allo
           splash — e la Vetrina, che nasce dopo di lui, se ne andrebbe con
           lui. Chi lo chiude è la Vetrina quando la si chiude; oppure lo
           splash stesso quando si è andati di ripiego e nessuna Vetrina è
           mai nata. */
        Splash splash = new Splash();
        splash.Show();
        Application.Run(new ApplicationContext());

        /* Da qui in poi lo splash non c'è più e la chat è aperta. Il launcher
           NON esce: resta a sentire il titolo della finestra, che è il canale
           su cui il menu del tasto destro gli chiede di chiudere, ridurre a
           icona o spostare (§7-bis). Torna quando la chat si chiude.

           È un cambiamento di comportamento e va dichiarato: prima Pollaio.exe
           spariva dall'elenco delle applicazioni appena aperta la finestra,
           adesso ci resta finché la chat è aperta. È il prezzo di una finestra
           senza cornice che si possa comunque comandare. */
        Ponte.Ascolta(FinestraChat);
        return 0;
    }

    /// <summary>
    /// La finestra del browser, trovata dallo splash. Sta qui e non dentro
    /// Splash perché serve DOPO che lo splash si è chiuso, e un campo di una
    /// finestra morta è un posto sbagliato dove tenere una cosa viva.
    /// </summary>
    public static IntPtr FinestraChat = IntPtr.Zero;

    /// <summary>Vero quando questo eseguibile apre la regia invece della chat.</summary>
    public static bool ModoRegia = false;

    /// <summary>
    /// Vero quando la finestra l'abbiamo disegnata noi (§7-ter). Serve allo
    /// splash per sapere se, chiudendosi, deve portarsi via anche il ciclo dei
    /// messaggi: se una Vetrina è nata, quel ciclo serve ancora a lei.
    /// </summary>
    public static bool VetrinaViva = false;
}


/* =============================================================================
   3. PREFERENZE — avvio\pollaio.ini
   Testo semplicissimo, chiave=valore. Nessun parser vero: si taglia alla prima
   `=` e si ignora tutto il resto. Se il file manca lo si scrive, commenti
   compresi: è il modo più onesto di documentare un file di configurazione.
   ============================================================================= */

internal sealed class Preferenze
{
    public int    Larghezza = 400;                  // px: la misura tipica di una chat Twitch
    public int    Altezza   = 600;
    public int    X         = -1;                   // -1 = attaccala al bordo destro
    public int    Y         = -1;                   // -1 = attaccala al bordo alto
    public string Parametri = "fondo=scuro&tema=notte&scala=100";
    public string Browser   = "auto";               // auto | edge | chrome
    public bool   Cornice   = false;                // false = finestra nuda (§7-bis)

    // La regia ha una finestra sua: è un banco di lavoro, non una colonna da
    // mettere in un angolo, e a 400 pixel non ci starebbero né le manopole né
    // l'anteprima accanto a loro.
    public int    RegiaLarghezza = 1280;
    public int    RegiaAltezza   = 880;

    /// <summary>
    /// Una copia di queste preferenze buona per la finestra della regia:
    /// la sua misura, e NESSUN parametro del widget. Quelli descrivono come
    /// deve apparire l'overlay, e infilarli nell'indirizzo della regia
    /// vorrebbe dire farle partire le manopole già girate — cioè mostrare
    /// come configurazione «in corso» una cosa che l'utente non ha toccato.
    /// </summary>
    public Preferenze PerLaRegia()
    {
        Preferenze r = new Preferenze();
        r.Larghezza = RegiaLarghezza;
        r.Altezza   = RegiaAltezza;
        r.X         = X;
        r.Y         = Y;
        r.Parametri = "";
        r.Browser   = Browser;
        r.Cornice   = Cornice;
        return r;
    }

    /// <summary>Il file, esattamente com'è scritto quando lo creiamo noi.</summary>
    private static readonly string[] Modello = new string[]
    {
        "# =============================================================================",
        "# pollaio.ini — le preferenze del launcher",
        "#",
        "# Righe `chiave=valore`, una per riga. Tutto quello che comincia per # è un",
        "# commento e non conta. Se cancelli questo file, Pollaio.exe lo riscrive.",
        "# =============================================================================",
        "",
        "# Dimensione della finestra, in pixel. 400x600 è la misura tipica di una chat",
        "# Twitch: alta e stretta, così sta in un angolo dello schermo e in OBS occupa",
        "# una colonna invece di una fascia.",
        "larghezza=400",
        "altezza=600",
        "",
        "# Dove si apre sullo schermo, in pixel dal bordo in alto a sinistra.",
        "# -1 e -1 la mettono in alto a destra dello schermo principale, staccata di",
        "# 24 pixel dai bordi. Puoi metterne a -1 anche uno solo dei due.",
        "x=-1",
        "y=-1",
        "",
        "# I parametri del widget: sono quelli che finiscono dopo il ? nell'indirizzo",
        "# di pollaio.html. Sono gli stessi della regia: apri regia.html, sistema tutto",
        "# guardando l'anteprima, copia l'indirizzo e incolla qui SOLO la parte dopo il",
        "# punto interrogativo. Lascia vuoto per i valori predefiniti.",
        "parametri=fondo=scuro&tema=notte&scala=100",
        "",
        "# Con quale browser aprirla: auto, edge, chrome.",
        "# `auto` prova prima Edge (c'è su ogni Windows) e poi Chrome. Se chiedi uno",
        "# che non è installato, il launcher ripiega sull'altro invece di arrendersi.",
        "browser=auto",
        "",
        "# La barra del titolo di Windows sopra la chat: 0 la toglie, 1 la lascia.",
        "# Senza barra la finestra è pulita e in OBS non entra nell'inquadratura, ma",
        "# non si può più né spostare né chiudere col mouse nel modo solito: si fa",
        "# tasto destro DENTRO la chat, dove compare un menu con Chiudi, Riduci a",
        "# icona, Sposta e Apri la regia.",
        "#",
        "# Se qualcosa andasse storto e quel menu non comparisse, la finestra si",
        "# chiude sempre con Alt+F4, o col tasto destro sulla barra delle",
        "# applicazioni. Non resti mai chiuso fuori.",
        "cornice=0",
        "",
        "# La finestra della REGIA, che è un'altra cosa: un banco di lavoro largo,",
        "# con le manopole a sinistra e l'anteprima a destra. Si apre con Regia.exe,",
        "# oppure dal menu del tasto destro dentro la chat.",
        "regialarghezza=1280",
        "regiaaltezza=880",
        ""
    };

    public static Preferenze Leggi(string percorso)
    {
        Preferenze p = new Preferenze();

        try
        {
            if (!File.Exists(percorso))
            {
                // Scriviamo in UTF-8 CON firma: senza, il Blocco note apre il file
                // con la codepage di sistema e le lettere accentate dei commenti
                // diventano scarabocchi.
                Directory.CreateDirectory(Path.GetDirectoryName(percorso));
                File.WriteAllText(percorso,
                    string.Join(Environment.NewLine, Modello),
                    new UTF8Encoding(true));
                return p;
            }

            string[] righe = File.ReadAllLines(percorso, Encoding.UTF8);
            for (int i = 0; i < righe.Length; i++)
            {
                string riga = righe[i].Trim();
                if (riga.Length == 0 || riga[0] == '#' || riga[0] == ';') continue;

                int taglio = riga.IndexOf('=');
                if (taglio <= 0) continue;

                string chiave = riga.Substring(0, taglio).Trim().ToLowerInvariant();
                // Il valore NON si taglia alle `=` successive: `parametri` ne è
                // pieno (fondo=scuro&tema=notte&scala=100) e va preso tutto intero.
                string valore = riga.Substring(taglio + 1).Trim().Trim('"');

                switch (chiave)
                {
                    case "larghezza": p.Larghezza = Numero(valore, p.Larghezza, 160, 4000); break;
                    case "altezza":   p.Altezza   = Numero(valore, p.Altezza,   160, 4000); break;
                    case "x":         p.X         = Numero(valore, p.X,      -20000, 20000); break;
                    case "y":         p.Y         = Numero(valore, p.Y,      -20000, 20000); break;
                    // Le virgolette doppie e gli spazi vanno via PRIMA di finire
                    // nella riga di comando del browser. L'indirizzo viene passato
                    // dentro --app="...": una virgoletta in mezzo chiuderebbe
                    // l'argomento e permetterebbe di infilare altri switch al
                    // browser. La strada realistica non è un attacco, è un incolla
                    // sbagliato — il LEGGIMI invita proprio a incollare qui dentro
                    // la parte dopo il «?» copiata dalla regia — ma il risultato
                    // sarebbe lo stesso, quindi si toglie e basta.
                    case "parametri":
                        p.Parametri = valore.TrimStart('?', '&').Replace("\"", "").Replace(" ", "");
                        break;
                    case "browser":   p.Browser   = valore.ToLowerInvariant(); break;
                    // Si accetta 1/si/sì/true come «sì», per la stessa ragione
                    // per cui il widget accetta le stesse forme nella
                    // querystring: chi scrive a mano non deve indovinare la
                    // parola giusta.
                    case "cornice":   p.Cornice   = Acceso(valore); break;
                    case "regialarghezza": p.RegiaLarghezza = Numero(valore, p.RegiaLarghezza, 640, 6000); break;
                    case "regiaaltezza":   p.RegiaAltezza   = Numero(valore, p.RegiaAltezza,   480, 4000); break;
                }
            }
        }
        catch
        {
            // Un ini illeggibile (disco pieno, permessi, chissà) non è una buona
            // ragione per non far partire la chat: si va coi predefiniti.
        }

        return p;
    }

    private static bool Acceso(string testo)
    {
        string s = (testo == null ? "" : testo.Trim().ToLowerInvariant());
        return s == "1" || s == "si" || s == "sì" || s == "true" || s == "on";
    }

    private static int Numero(string testo, int ripiego, int min, int max)
    {
        int n;
        if (!int.TryParse(testo, NumberStyles.Integer, CultureInfo.InvariantCulture, out n)) return ripiego;
        if (n < min) return min;
        if (n > max) return max;
        return n;
    }
}


/* =============================================================================
   4. SPLASH — la finestra di avvio
   Senza bordi, angoli tondi, sempre davanti, dipinta tutta a mano. Le misure
   qui sotto sono LOGICHE (come se lo schermo fosse a 96 DPI): il disegno viene
   poi scalato una volta sola con ScaleTransform, così il codice di layout resta
   leggibile e su uno schermo a 150% non c'è un solo pixel sfocato.
   ============================================================================= */

internal sealed class Splash : Form
{
    /* ---- 4.0 Misure logiche ---- */
    private const float L = 460f;   // larghezza
    private const float A = 300f;   // altezza
    private const float RAGGIO = 16f;

    private const float POLLO_ALTEZZA = 120f;
    private const float POLLO_ALTO    = 17f;
    private const float TITOLO_ALTO   = 146f;
    private const float SOTTO_ALTO    = 190f;
    private const float BARRA_ALTO    = 234f;
    private const float BARRA_SPESSA  = 4f;
    private const float BARRA_MARGINE = 62f;
    private const float FRASE_ALTO    = 252f;

    private const int   PASSO = 15;      // ms fra un fotogramma e l'altro
    private const int   FASE_MINIMA = 350;   // ms: sotto, la frase non si legge

    /* ---- 4.0 Stato ---- */
    private readonly Preferenze pref;
    private readonly double scala;           // 1.0 a 96 DPI, 1.5 a 144 DPI
    private Bitmap pollo;                    // già mascherato, pronto da disegnare
    private Bitmap nebulosa;                 // il fondo, calcolato una volta sola
    private readonly Font fTitolo, fSotto, fEtichetta, fErrore;
    private readonly StringFormat formatoCentro, formatoTesto;
    private readonly System.Windows.Forms.Timer battito;

    private string frase = "Apro il pollaio…";
    private string errore;                   // null finché tutto va bene
    private float obiettivo;                 // dove deve arrivare la barra (0..1)
    private float mostrato;                  // dov'è adesso: insegue `obiettivo`
    private bool uscita;                     // true = sta sfumando via

    /* -------------------------------------------------------------------------
       4.1 Costruzione, forma e ombra
       ------------------------------------------------------------------------- */

    public Splash()
    {
        pref = Preferenze.Leggi(Path.Combine(Programma.Radice,
                                Path.Combine("avvio", "pollaio.ini")));

        // La densità dello schermo principale. Siamo DPI-aware (§2), quindi
        // qui arriva il valore vero e non un 96 finto.
        using (Graphics g = Graphics.FromHwnd(IntPtr.Zero)) scala = g.DpiX / 96.0;

        FormBorderStyle = FormBorderStyle.None;
        StartPosition   = FormStartPosition.CenterScreen;
        ShowInTaskbar   = false;
        TopMost         = true;
        AutoScaleMode   = AutoScaleMode.None;   // scaliamo noi, con precisione
        BackColor       = Tinte.Fondo;
        Opacity         = 0.0;                  // entra in dissolvenza
        Text            = "il pollaio";
        ClientSize      = new Size((int)Math.Round(L * scala), (int)Math.Round(A * scala));

        SetStyle(ControlStyles.UserPaint
               | ControlStyles.AllPaintingInWmPaint
               | ControlStyles.OptimizedDoubleBuffer, true);

        // Gli angoli tondi. La Region ritaglia senza antialiasing — è un limite
        // di Windows, non del codice — perciò il bordo interno che disegniamo in
        // §4.3 serve anche a mascherare la scalettatura.
        using (GraphicsPath p = Arrotondato(0, 0, ClientSize.Width, ClientSize.Height, (float)(RAGGIO * scala)))
            Region = new Region(p);

        // I caratteri del canale (Space Grotesk, Manrope) non sono installati e
        // caricarli con PrivateFontCollection vorrebbe dire portarsi dietro i
        // file .woff2 convertiti in .ttf: una dipendenza per tre righe di testo.
        // Segoe UI ha metriche vicine e c'è su ogni Windows.
        fTitolo    = new Font("Segoe UI", 30f, FontStyle.Bold,    GraphicsUnit.Pixel);
        fSotto     = new Font("Segoe UI",  9.5f, FontStyle.Bold,  GraphicsUnit.Pixel);
        fEtichetta = new Font("Segoe UI",  9.5f, FontStyle.Bold,  GraphicsUnit.Pixel);
        fErrore    = new Font("Segoe UI", 13f, FontStyle.Regular, GraphicsUnit.Pixel);

        formatoCentro = FormatoStretto();
        formatoCentro.Alignment = StringAlignment.Center;
        formatoTesto  = new StringFormat();
        formatoTesto.Alignment     = StringAlignment.Center;
        formatoTesto.LineAlignment = StringAlignment.Near;
        formatoTesto.Trimming      = StringTrimming.Word;

        pollo = CaricaPollo(Path.Combine(Programma.CartellaApp, Path.Combine("img", "mascot.png")));
        nebulosa = Nebulosa(ClientSize.Width, ClientSize.Height);

        battito = new System.Windows.Forms.Timer();
        battito.Interval = PASSO;
        battito.Tick += Fotogramma;
        battito.Start();

        // In errore lo splash resta lì finché non ci si clicca sopra: mai una
        // finestrella di sistema che dice «Error».
        Click += delegate { if (errore != null) Close(); };
    }

    /// <summary>
    /// Il formato «tipografico»: testo misurato e disegnato senza un pixel di
    /// margine attorno.
    ///
    /// Si costruisce a mano invece di usare StringFormat.GenericTypographic, e
    /// non è pignoleria — è un bug con la firma inconfondibile. Quella proprietà
    /// restituisce un involucro attorno a un oggetto INTERNO di GDI+, uno solo
    /// per tutto il processo: appena l'involucro viene disposto (o anche solo
    /// raccolto dal garbage collector, perché ha il finalizzatore) GDI+ resta
    /// senza, e da lì in poi ogni testo torna a essere disegnato con il margine
    /// del formato predefinito. Su una frase intera non si nota. Disegnando
    /// lettera per lettera, come fa Spaziato, quel margine diventa un buco che
    /// cambia con la lettera: le tonde si staccano, le strette si appiccicano, e
    /// «APRO IL POLLAIO» si legge «APRO IL PO LLA IO».
    ///
    /// I tre flag sono esattamente quelli che GDI+ mette in GenericTypographic.
    /// FitBlackBox ha il nome al contrario di quello che fa: lato GDI+ è
    /// NoFitBlackBox, cioè «lascia pure che i glifi sbordino», ed è proprio
    /// quello che toglie il margine.
    /// </summary>
    private static StringFormat FormatoStretto()
    {
        StringFormat sf = new StringFormat(
              StringFormatFlags.FitBlackBox
            | StringFormatFlags.LineLimit
            | StringFormatFlags.NoClip
            | StringFormatFlags.MeasureTrailingSpaces);
        sf.Trimming = StringTrimming.None;
        sf.HotkeyPrefix = HotkeyPrefix.None;
        return sf;
    }

    /// <summary>L'ombra portata di Windows, gratis: CS_DROPSHADOW sulla classe.</summary>
    protected override CreateParams CreateParams
    {
        get
        {
            CreateParams cp = base.CreateParams;
            cp.ClassStyle |= 0x00020000;   // CS_DROPSHADOW
            return cp;
        }
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);

        // Il lavoro vero comincia solo quando la finestra è a schermo: prima non
        // esisterebbe l'handle su cui rimandare gli aggiornamenti. IsBackground
        // perché se l'utente chiude lo splash il processo deve morire subito.
        Thread t = new Thread(Lavora);
        t.IsBackground = true;
        t.Start();
    }

    protected override void OnFormClosed(FormClosedEventArgs e)
    {
        /* Se nessuna Vetrina è nata — ripiego col browser, oppure un errore
           fatale mostrato qui sopra — allora il ciclo dei messaggi non serve
           più a nessuno e va chiuso, o il processo resterebbe vivo e
           invisibile. Se invece la Vetrina c'è, quel ciclo è suo: sarà lei a
           chiuderlo. */
        if (!Programma.VetrinaViva) Application.ExitThread();

        battito.Stop();
        if (pollo != null) { pollo.Dispose(); pollo = null; }
        if (nebulosa != null) { nebulosa.Dispose(); nebulosa = null; }
        fTitolo.Dispose(); fSotto.Dispose(); fEtichetta.Dispose(); fErrore.Dispose();
        formatoCentro.Dispose(); formatoTesto.Dispose();
        base.OnFormClosed(e);
    }

    /* -------------------------------------------------------------------------
       4.2 Il pollo, e la maschera che serve solo qualche volta

       CORREZIONE, e vale la pena raccontarla perché il codice qui sotto sembra
       inutile finché non si sa: qui c'era una maschera radiale applicata SEMPRE,
       messa perché si dava per scontato che img\mascot.png fosse una fotografia
       rettangolare col pollo in mezzo a un fondo pieno.

       Il file è stato misurato: è un PNG RGBA con il 43,7% dei pixel ad alfa
       zero e i bordi già sfumati. È già ritagliato. La maschera non toglieva
       nessun fondo — erodeva il disegno: ventimila pixel visibili attenuati,
       il fattore giù fino a 0,46 sul bordo basso, la punta della cresta da 255
       a 220. Cioè sbiadiva i piedi e la cresta del pollo senza motivo.

       Quindi adesso si GUARDA prima. Se l'immagine ha già un canale alfa vero
       la si lascia stare; se è un rettangolo pieno — perché qualcuno l'ha
       sostituita con un ritaglio fatto male — la maschera scatta e la salva.
       Costa una passata sull'alfa, qualche millisecondo su 141.877 pixel.

       Quando scatta, moltiplica l'alfa esistente invece di sostituirla: così
       ammorbidisce il perimetro senza riempire quello che era trasparente.

       LockBits e non GetPixel: 337×421 fanno 141.877 pixel, e con GetPixel ci
       vorrebbe quasi mezzo secondo — mezzo secondo prima che lo splash appaia.
       Così sono pochi millisecondi. Niente `unsafe`: Marshal.Copy su un byte[]
       costa un paio di copie di mezzo megabyte e ci sta benissimo, e in cambio
       compila senza /unsafe.
       ------------------------------------------------------------------------- */

    private static Bitmap CaricaPollo(string percorso)
    {
        // Il centro e i raggi della maschera, in frazione dell'immagine.
        const double CX = 0.50, CY = 0.46, RX = 0.78, RY = 0.72;
        const double PIENO = 0.58;   // fin qui opaco, poi sfuma fino a 1.0

        try
        {
            if (!File.Exists(percorso)) return null;

            // Si legge in memoria e non con `new Bitmap(percorso)`: quello terrebbe
            // il file aperto per tutta la vita dell'immagine.
            byte[] grezzo = File.ReadAllBytes(percorso);
            Bitmap uscita;

            using (MemoryStream ms = new MemoryStream(grezzo))
            using (Bitmap sorgente = new Bitmap(ms))
            {
                int w = sorgente.Width, h = sorgente.Height;
                uscita = new Bitmap(w, h, PixelFormat.Format32bppArgb);

                BitmapData ds = sorgente.LockBits(new Rectangle(0, 0, w, h),
                                    ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                byte[] pixel = new byte[ds.Stride * h];
                Marshal.Copy(ds.Scan0, pixel, 0, pixel.Length);
                sorgente.UnlockBits(ds);

                // Format32bppArgb in memoria è B,G,R,A: l'alfa è il quarto byte.

                // Prima domanda: questa immagine è già ritagliata?
                // Si contano i pixel completamente trasparenti. Una foto
                // rettangolare non ne ha praticamente nessuno; un ritaglio vero
                // ne ha almeno un quinto, che è tutto quello che sta fuori dalla
                // sagoma. Un ventesimo come soglia sta comodamente in mezzo ai
                // due casi e non si lascia ingannare da qualche pixel d'angolo.
                int trasparenti = 0;
                for (int k = 3; k < pixel.Length; k += 4) { if (pixel[k] == 0) trasparenti++; }
                bool giaRitagliato = trasparenti > (w * h) / 20;

                for (int y = 0; y < h && !giaRitagliato; y++)
                {
                    double ny = (y + 0.5) / h;
                    double dy = (ny - CY) / RY;
                    double dy2 = dy * dy;
                    int riga = y * ds.Stride;

                    for (int x = 0; x < w; x++)
                    {
                        double nx = (x + 0.5) / w;
                        double dx = (nx - CX) / RX;
                        double d = Math.Sqrt(dx * dx + dy2);

                        double fattore;
                        if (d <= PIENO) fattore = 1.0;
                        else if (d >= 1.0) fattore = 0.0;
                        else fattore = 1.0 - (d - PIENO) / (1.0 - PIENO);

                        int i = riga + x * 4 + 3;
                        if (fattore < 1.0) pixel[i] = (byte)(pixel[i] * fattore);
                    }
                }

                BitmapData du = uscita.LockBits(new Rectangle(0, 0, w, h),
                                    ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
                // Le due bitmap hanno la stessa larghezza e lo stesso formato,
                // quindi anche lo stesso stride: la copia è diretta.
                Marshal.Copy(pixel, 0, du.Scan0, Math.Min(pixel.Length, du.Stride * h));
                uscita.UnlockBits(du);
            }

            return uscita;
        }
        catch
        {
            // Senza pollo lo splash è più povero ma parte lo stesso: il §1.9 del
            // contratto vale anche qui, ogni pezzo si disinnesca da solo.
            return null;
        }
    }

    /* -------------------------------------------------------------------------
       4.2b La nebulosa — il fondo, calcolato pixel per pixel

       Il fondo è il nero del canale con dentro tre luci morbide: viola in alto
       (la nebulosa), ciano in basso a destra, e un terzo viola più stretto
       dietro al pollo perché non sembri incollato sopra al nero.

       PERCHÉ NON CON PathGradientBrush, che sarebbe stato tre righe: perché su
       aree grandi fa le bande. Un degradé lungo 300 pixel che scende di venti
       livelli di colore cambia valore ogni quindici pixel, e su un fondo quasi
       nero quei gradini si vedono benissimo — erano anelli concentrici attorno
       all'alone ciano, e sembravano un errore di compressione.

       Rimedi messi in campo, tutti e due necessari:
       · la caduta della luce è (1-d)², non lineare: si spegne piano invece che
         di colpo, così i gradini sono più fitti dove il colore è debole;
       · un pizzico di rumore ordinato (matrice di Bayer 4×4) sposta ogni pixel
         di mezzo livello in su o in giù secondo uno schema fisso. È lo stesso
         trucco della stampa in retino: i gradini si sciolgono in una grana che
         a occhio non si vede.

       Si calcola UNA VOLTA nel costruttore, alla misura vera in pixel dello
       schermo, e poi si posa e basta: dentro OnPaint non c'è più un solo conto.
       ------------------------------------------------------------------------- */

    private static Bitmap Nebulosa(int w, int h)
    {
        // Ogni luce: centro x, centro y, raggio x, raggio y — tutti in frazione
        // della tela, così la composizione non cambia al variare del DPI — e
        // forza, cioè quanto colore aggiunge nel suo punto più acceso.
        double[][] luci = new double[][]
        {
            new double[] { 0.50, 0.03, 0.70, 0.62, 0.52 },   // viola: la nebulosa in alto
            new double[] { 0.86, 0.86, 0.44, 0.50, 0.30 },   // ciano: l'angolo in basso a destra
            new double[] { 0.50, 0.25, 0.26, 0.30, 0.30 }    // viola: il fiato dietro al pollo
        };
        Color[] tinte = new Color[] { Tinte.Viola, Tinte.Ciano, Tinte.Viola };

        int[,] bayer = new int[4, 4]
        {
            {  0,  8,  2, 10 },
            { 12,  4, 14,  6 },
            {  3, 11,  1,  9 },
            { 15,  7, 13,  5 }
        };

        try
        {
            Bitmap b = new Bitmap(w, h, PixelFormat.Format32bppArgb);
            BitmapData d = b.LockBits(new Rectangle(0, 0, w, h),
                               ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
            byte[] px = new byte[d.Stride * h];

            for (int y = 0; y < h; y++)
            {
                double ny = (y + 0.5) / h;
                int riga = y * d.Stride;

                for (int x = 0; x < w; x++)
                {
                    double nx = (x + 0.5) / w;
                    double r = Tinte.Fondo.R, v = Tinte.Fondo.G, bl = Tinte.Fondo.B;

                    for (int i = 0; i < luci.Length; i++)
                    {
                        double dx = (nx - luci[i][0]) / luci[i][2];
                        double dy = (ny - luci[i][1]) / luci[i][3];
                        double t = 1.0 - Math.Sqrt(dx * dx + dy * dy);
                        if (t <= 0.0) continue;

                        // Le luci si SOMMANO invece di sovrapporsi con l'alfa:
                        // una luce accende, non copre. Con l'alfa il ciano in
                        // basso avrebbe spento il viola invece di incontrarlo.
                        double f = t * t * luci[i][4];
                        r  += tinte[i].R * f;
                        v  += tinte[i].G * f;
                        bl += tinte[i].B * f;
                    }

                    double grana = (bayer[y & 3, x & 3] - 7.5) / 16.0;
                    int j = riga + x * 4;
                    px[j    ] = Sazia(bl + grana);   // B
                    px[j + 1] = Sazia(v  + grana);   // G
                    px[j + 2] = Sazia(r  + grana);   // R
                    px[j + 3] = 255;                 // A: il fondo è pieno
                }
            }

            Marshal.Copy(px, 0, d.Scan0, px.Length);
            b.UnlockBits(d);
            return b;
        }
        catch
        {
            // Senza fondo dipinto OnPaint riempie di nero e si va avanti.
            return null;
        }
    }

    private static byte Sazia(double v)
    {
        int n = (int)Math.Round(v);
        if (n < 0) return 0;
        if (n > 255) return 255;
        return (byte)n;
    }

    /* -------------------------------------------------------------------------
       4.3 Il disegno
       ------------------------------------------------------------------------- */

    protected override void OnPaint(PaintEventArgs e)
    {
        Graphics g = e.Graphics;

        // Il fondo è già pronto (§4.2b): si posa così com'è, in pixel veri,
        // prima di qualunque trasformazione.
        if (nebulosa != null) g.DrawImageUnscaled(nebulosa, 0, 0);
        else using (SolidBrush b = new SolidBrush(Tinte.Fondo)) g.FillRectangle(b, ClientRectangle);

        g.SmoothingMode      = SmoothingMode.AntiAlias;
        g.InterpolationMode  = InterpolationMode.HighQualityBicubic;
        g.PixelOffsetMode    = PixelOffsetMode.HighQuality;
        g.CompositingQuality = CompositingQuality.HighQuality;

        // AntiAlias e NON AntiAliasGridFit, per due ragioni.
        // La prima: durante la dissolvenza la finestra è «layered» e il testo
        // agganciato alla griglia su fondo semitrasparente sfrangia.
        // La seconda, che è quella che si vede: l'aggancio alla griglia sposta
        // OGNI GLIFO al pixel più vicino, uno per uno. Siccome le etichette
        // spaziate (§Spaziato) le disegniamo lettera per lettera a coordinate
        // frazionarie, ogni lettera veniva spostata per conto suo fino a 3px e
        // la scritta usciva a grumi: «APRO IL PO LLA IO». Senza aggancio i
        // glifi stanno esattamente dove diciamo noi.
        g.TextRenderingHint  = TextRenderingHint.AntiAlias;
        g.ScaleTransform((float)scala, (float)scala);

        // -- il pollo --
        if (pollo != null)
        {
            float hp = POLLO_ALTEZZA;
            float wp = hp * pollo.Width / (float)pollo.Height;
            g.DrawImage(pollo, L / 2f - wp / 2f, POLLO_ALTO, wp, hp);
        }

        // -- il nome --
        using (SolidBrush b = new SolidBrush(Tinte.Testo))
            g.DrawString("il pollaio", fTitolo, b, L / 2f, TITOLO_ALTO, formatoCentro);
        Spaziato(g, "CHAT DI SLAYER_BEARD", fSotto, Tinte.Tenue, L / 2f, SOTTO_ALTO);

        if (errore == null) DisegnaBarra(g);
        DisegnaFrase(g);

        // -- il bordo: chiude la forma e nasconde la scalettatura della Region --
        using (GraphicsPath p = Arrotondato(0.5f, 0.5f, L - 1f, A - 1f, RAGGIO))
        using (Pen pen = new Pen(Color.FromArgb(46, 255, 255, 255), 1f))
            g.DrawPath(pen, p);
    }

    private void DisegnaBarra(Graphics g)
    {
        float bx = BARRA_MARGINE, by = BARRA_ALTO;
        float bw = L - BARRA_MARGINE * 2f, bh = BARRA_SPESSA;
        float pieno = Math.Max(bh, bw * Math.Max(0f, Math.Min(1f, mostrato)));

        // il binario
        using (GraphicsPath p = Arrotondato(bx, by, bw, bh, bh / 2f))
        using (SolidBrush b = new SolidBrush(Color.FromArgb(34, 255, 255, 255)))
            g.FillPath(b, p);

        // Il gradiente è calcolato sulla larghezza INTERA della barra, non su
        // quella riempita: così la tinta a un certo punto della barra non cambia
        // mentre il riempimento cresce. Se lo si calcolasse sul riempimento, il
        // ciano resterebbe sempre incollato alla punta e sembrerebbe un errore.

        // il bagliore: la stessa barra, più alta e trasparente
        using (LinearGradientBrush lg = new LinearGradientBrush(
                   new RectangleF(bx, by - 4f, bw, bh + 8f),
                   Color.FromArgb(62, Tinte.Viola), Color.FromArgb(62, Tinte.Ciano), 0f))
        using (GraphicsPath p = Arrotondato(bx, by - 3f, pieno, bh + 6f, (bh + 6f) / 2f))
        {
            lg.WrapMode = WrapMode.TileFlipX;
            g.FillPath(lg, p);
        }

        // il riempimento vero
        using (LinearGradientBrush lg = new LinearGradientBrush(
                   new RectangleF(bx, by - 1f, bw, bh + 2f), Tinte.Viola, Tinte.Ciano, 0f))
        using (GraphicsPath p = Arrotondato(bx, by, pieno, bh, bh / 2f))
        {
            lg.WrapMode = WrapMode.TileFlipX;
            g.FillPath(lg, p);
        }

        // La punta accesa. Prende la tinta che il gradiente ha PROPRIO lì: a
        // inizio corsa è viola, a fine corsa è ciano. Una punta sempre ciano
        // sopra una barra ancora viola sembrerebbe un pezzo di un'altra grafica.
        Color punta = Mescola(Tinte.Viola, Tinte.Ciano, Math.Max(0f, Math.Min(1f, mostrato)));
        Alone(g, new RectangleF(bx + pieno - 14f, by + bh / 2f - 14f, 28f, 28f), punta, 155);
    }

    private static Color Mescola(Color a, Color b, float t)
    {
        return Color.FromArgb((int)(a.R + (b.R - a.R) * t),
                              (int)(a.G + (b.G - a.G) * t),
                              (int)(a.B + (b.B - a.B) * t));
    }

    private void DisegnaFrase(Graphics g)
    {
        if (errore == null)
        {
            Spaziato(g, frase.ToUpperInvariant(), fEtichetta, Tinte.Tenue, L / 2f, FRASE_ALTO);
            return;
        }

        // In errore la barra sparisce e il posto lo prende la frase, per esteso,
        // in tondo minuscolo: un'etichetta maiuscola spaziata di 60 caratteri
        // sarebbe illeggibile e non ci starebbe comunque.
        using (SolidBrush b = new SolidBrush(Tinte.Live))
            g.DrawString(errore, fErrore, b, new RectangleF(34f, 224f, L - 68f, 46f), formatoTesto);
        Spaziato(g, "FAI CLIC PER CHIUDERE", fEtichetta, Tinte.Tenue, L / 2f, 276f);
    }

    /// <summary>
    /// Un alone radiale morbido, per la punta della barra e basta: è piccolo e
    /// si muove, quindi qui PathGradientBrush va benissimo (per le luci grandi
    /// e ferme del fondo faceva le bande, e infatti quelle si calcolano a mano
    /// in §4.2b). La Blend tiene il colore stretto attorno al centro, che è come
    /// si comporta un radial-gradient del CSS: la rampa lineare che
    /// PathGradientBrush usa di suo darebbe un disco piatto.
    /// </summary>
    private static void Alone(Graphics g, RectangleF area, Color tinta, int intensita)
    {
        if (area.Width <= 0f || area.Height <= 0f) return;

        using (GraphicsPath p = new GraphicsPath())
        {
            p.AddEllipse(area);
            using (PathGradientBrush pg = new PathGradientBrush(p))
            {
                pg.CenterPoint     = new PointF(area.X + area.Width / 2f, area.Y + area.Height / 2f);
                pg.CenterColor     = Color.FromArgb(intensita, tinta);
                pg.SurroundColors  = new Color[] { Color.FromArgb(0, tinta) };

                // Posizione 0 = il bordo, 1 = il centro. La rampa tiene il colore
                // stretto attorno al centro e lo lascia morire lentamente verso
                // fuori: è così che si comporta un radial-gradient del CSS, mentre
                // la rampa lineare di PathGradientBrush darebbe un disco piatto.
                Blend bl = new Blend(5);
                bl.Positions = new float[] { 0f, 0.42f, 0.68f, 0.88f, 1f };
                bl.Factors   = new float[] { 0f, 0.05f, 0.20f, 0.55f, 1f };
                pg.Blend = bl;

                g.FillPath(pg, p);
            }
        }
    }

    /* LA TERZA VERSIONE DI QUESTA FUNZIONE, e vale la pena scrivere perché.

       La prima misurava i caratteri uno per uno e li disegnava a mano:
       MeasureString su un glifo solo dà l'ingombro dell'INCHIOSTRO, non
       l'avanzamento, e «APRO IL POLLAIO» veniva fuori «APRO IL PO LLA IO».

       La seconda misurava gli avanzamenti per differenza fra prefissi — che è
       il modo giusto di misurarli — ma continuava a disegnare una lettera per
       volta con un formato che allinea l'INCHIOSTRO all'ascissa data. Due
       sistemi di riferimento diversi: le lettere con molto bianco a sinistra
       (la A, la T, la Y) scivolavano rispetto alle altre e i vuoti uscivano
       irregolari. È il difetto che si vedeva in «CHAT DI SLAYER_BEARD».

       La terza smette di posizionare i glifi a mano. Si infila uno SPAZIO
       SOTTILE fra una lettera e l'altra e si disegna la stringa INTERA, una
       volta sola: le sporgenze laterali e la crenatura tornano in mano al
       motore dei caratteri, che le sa fare. Si perde il controllo fine sulla
       misura della spaziatura — è quella del carattere U+2009, non un numero
       nostro — e si guadagna una scritta coi vuoti tutti uguali, che era il
       punto. Con essa se ne va anche la cache delle misure: non c'è più
       niente da misurare, e con lei sparisce la parte più intricata del file. */
    private void Spaziato(Graphics g, string testo, Font f, Color colore, float cx, float y)
    {
        if (string.IsNullOrEmpty(testo)) return;

        StringBuilder b = new StringBuilder(testo.Length * 2);
        for (int i = 0; i < testo.Length; i++)
        {
            if (i > 0) b.Append(' ');   // THIN SPACE
            b.Append(testo[i]);
        }

        using (SolidBrush pennello = new SolidBrush(colore))
            g.DrawString(b.ToString(), f, pennello, cx, y, formatoCentro);
    }

    private static GraphicsPath Arrotondato(float x, float y, float w, float h, float r)
    {
        GraphicsPath p = new GraphicsPath();
        if (w <= 0f || h <= 0f) { p.AddRectangle(new RectangleF(x, y, Math.Max(w, 0f), Math.Max(h, 0f))); return p; }
        if (r * 2f > w) r = w / 2f;
        if (r * 2f > h) r = h / 2f;
        if (r <= 0.01f) { p.AddRectangle(new RectangleF(x, y, w, h)); return p; }

        float d = r * 2f;
        p.AddArc(x,         y,         d, d, 180f, 90f);
        p.AddArc(x + w - d, y,         d, d, 270f, 90f);
        p.AddArc(x + w - d, y + h - d, d, d,   0f, 90f);
        p.AddArc(x,         y + h - d, d, d,  90f, 90f);
        p.CloseFigure();
        return p;
    }

    /* -------------------------------------------------------------------------
       4.4 L'animazione
       ------------------------------------------------------------------------- */

    private void Fotogramma(object mittente, EventArgs e)
    {
        const double DISSOLVENZA = 0.08;   // ~200 ms a 15 ms per fotogramma
        bool ridisegna = false;

        if (uscita)
        {
            Opacity = Math.Max(0.0, Opacity - DISSOLVENZA);
            if (Opacity <= 0.001) { battito.Stop(); Close(); return; }
        }
        else if (Opacity < 1.0)
        {
            Opacity = Math.Min(1.0, Opacity + DISSOLVENZA);
        }

        // La barra insegue l'obiettivo con un avvicinamento esponenziale: parte
        // svelta e si posa piano. Un movimento lineare sembrerebbe meccanico.
        if (Math.Abs(obiettivo - mostrato) > 0.0008f)
        {
            mostrato += (obiettivo - mostrato) * 0.16f;
            ridisegna = true;
        }

        if (ridisegna) Invalidate();
    }

    /// <summary>Aggiorna la frase e l'obiettivo della barra dal thread di lavoro.</summary>
    private void Annuncia(string testo, float quota)
    {
        Rimanda(delegate
        {
            frase = testo;
            obiettivo = quota;
            Invalidate();
        });
    }

    /// <summary>Qualcosa è andato storto e non si può proseguire.</summary>
    private void Fatale(string testo)
    {
        Rimanda(delegate
        {
            errore = testo;
            Cursor = Cursors.Hand;
            Invalidate();
        });
    }

    /// <summary>Tutto fatto: dissolvi e chiudi.</summary>
    private void Congeda()
    {
        Rimanda(delegate { uscita = true; });
    }

    private void Rimanda(MethodInvoker azione)
    {
        try
        {
            if (IsDisposed || !IsHandleCreated) return;
            BeginInvoke(azione);
        }
        catch
        {
            // La finestra è stata chiusa mentre il thread stava per parlarle.
            // Non c'è niente da salvare e niente da dire.
        }
    }

    /* -------------------------------------------------------------------------
       4.5 Le fasi, su un thread a parte
       Tutto quello che può bloccare — la rete, l'avvio del browser, l'attesa
       della sua finestra — sta qui. Sul thread della finestra lo splash si
       inchioderebbe a metà dissolvenza.
       ------------------------------------------------------------------------- */

    private void Lavora()
    {
        /* La regia è lo stesso launcher che apre un'altra pagina, con la sua
           misura e senza i parametri del widget. Da qui in giù il codice non
           sa più quale delle due sta aprendo, ed è il motivo per cui non c'è
           un secondo launcher da tenere allineato a questo. */
        bool regia = Programma.ModoRegia;

        /* Una variabile locale e non `pref`, che è readonly: le preferenze
           lette dall'ini restano quelle: qui si lavora su una copia adattata
           alla finestra che si sta aprendo. */
        Preferenze uso = regia ? pref.PerLaRegia() : pref;

        string radice = Programma.Radice;
        string nomeFile = regia ? "regia.html" : "pollaio.html";
        string html = Path.Combine(Programma.CartellaApp, nomeFile);
        Stopwatch cr;

        /* 1 — Apro */
        cr = Stopwatch.StartNew();
        Annuncia(regia ? "Apro la regia…" : "Apro il pollaio…", 0.10f);
        if (!File.Exists(html))
        {
            Fatale("Manca " + nomeFile + ": il launcher deve stare nella stessa cartella.");
            return;
        }
        Respira(cr, FASE_MINIMA);

        /* 2 — Che motore uso

           La finestra nostra (§7-ter) è la strada principale. Il browser è il
           ripiego, e lo si cerca SOLO se serve: chiederlo comunque
           allungherebbe l'avvio di tutti per un caso che non capita quasi
           mai. */
        cr = Stopwatch.StartNew();
        bool vetrina = Vetrina.Disponibile();
        string browser = null;

        if (vetrina)
        {
            Annuncia("Preparo la finestra…", 0.30f);
        }
        else
        {
            Annuncia("Cerco un browser…", 0.30f);
            browser = Navigatore.Trova(uso.Browser);
            if (browser == null)
            {
                Fatale("Non trovo né il motore WebView2 né Edge o Chrome su questo computer.");
                return;
            }
        }
        Respira(cr, FASE_MINIMA);

        /* 3 — Controllo la rete (davvero) */
        cr = Stopwatch.StartNew();
        if (regia)
        {
            /* La regia NON si collega a niente: la sua anteprima gira in
               modalità prova, con traffico inventato. Bussare a 7TV per
               aprirla sarebbe una domanda a un server non nostro la cui
               risposta non cambierebbe niente. */
            Annuncia("Preparo le manopole…", 0.55f);
        }
        else
        {
            Annuncia("Controllo la rete…", 0.55f);
            if (!Rete.Risponde())
            {
                // Non è un errore fatale: la chat prova comunque a collegarsi, e
                // magari è solo 7TV ad avere una brutta giornata.
                Annuncia("Rete lenta, vado lo stesso…", 0.55f);
                Thread.Sleep(650);
            }
        }
        Respira(cr, FASE_MINIMA);

        /* 4 — Apro la finestra */
        cr = Stopwatch.StartNew();
        Annuncia(regia ? "Apro il banco di lavoro…" : "Mi collego al server…", 0.80f);

        if (vetrina)
        {
            /* La finestra si crea sul filo dell'interfaccia, non su questo: una
               Form nata su un thread di servizio avrebbe il suo ciclo di
               messaggi su quel thread, che muore appena le fasi finiscono —
               e con lui la finestra. */
            string dove = Navigatore.IndirizzoLocale(nomeFile, uso);
            Exception saltata = null;

            Invoke((MethodInvoker)delegate ()
            {
                try
                {
                    Vetrina v = new Vetrina(dove, uso, scala);
                    Programma.VetrinaViva = true;
                    v.Show();
                }
                catch (Exception ex) { saltata = ex; }
            });

            if (saltata != null)
            {
                Fatale("La finestra non è partita: " + saltata.Message);
                return;
            }

            Respira(cr, FASE_MINIMA);
            Annuncia("Ci siamo.", 1.00f);
            Respira(Stopwatch.StartNew(), 400);
            Congeda();
            return;
        }

        DateTime partenza = DateTime.Now;
        Process avviato;
        try
        {
            avviato = Navigatore.Apri(browser, html, uso, scala);
        }
        catch (Exception ex)
        {
            Fatale("Il browser non è partito: " + ex.Message);
            return;
        }
        Respira(cr, FASE_MINIMA);

        /* 5 — Ci siamo */
        cr = Stopwatch.StartNew();
        Annuncia("Ci siamo.", 1.00f);
        // Non ci si chiude a tempo: si aspetta che la finestra del browser
        // ESISTA. Se il primo avvio del profilo ci mette tre secondi, meglio
        // tre secondi di pollo che tre secondi di scrivania vuota.
        /* «pollaio» sta nel titolo di tutte e due le pagine — «il pollaio —
           chat di slayer_beard» e «Regia del pollaio — slayer_beard» — quindi
           serve a riconoscere la finestra giusta in tutti e due i casi. E
           siccome il titolo lo scrive la PAGINA, trovarlo vuol dire anche che
           il browser ha finito di costruirla: è il momento buono per toccarla. */
        IntPtr finestra = Navigatore.AttendiFinestra(avviato, browser, partenza, 12000, "pollaio");

        Cornice.Ricorda(uso.Larghezza, uso.Altezza, scala, !uso.Cornice);

        if (finestra != IntPtr.Zero)
        {
            /* La cornice si toglie ADESSO, mentre lo splash è ancora davanti:
               così la barra non si vede comparire e sparire, e la finestra esce
               da sotto il pollo già com'era destinata a essere. Il ponte poi la
               rimette a posto se il browser ci ripensa. */
            if (!uso.Cornice) Cornice.Togli(finestra, uso.Larghezza, uso.Altezza, scala);
            Cornice.MettiIcona(finestra);
        }

        // Il ponte la raccoglie dopo, quando lo splash se n'è andato (§7-bis).
        Programma.FinestraChat = finestra;

        Respira(cr, 550);

        Congeda();
    }

    /// <summary>Fa durare la fase almeno `minimo` millisecondi: una frase che
    /// lampeggia per 40 ms non l'ha letta nessuno.</summary>
    private static void Respira(Stopwatch cr, int minimo)
    {
        int resto = minimo - (int)cr.ElapsedMilliseconds;
        if (resto > 0) Thread.Sleep(resto);
    }
}


/* =============================================================================
   5. IL BROWSER — ricerca, avvio, attesa della finestra
   ============================================================================= */

internal static class Navigatore
{
    /* ---- 5.1 Dove può stare ---- */

    private static string[] PercorsiEdge()
    {
        return new string[]
        {
            Path.Combine(Cartella("ProgramFiles(x86)"), @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(Cartella("ProgramFiles"),      @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(Cartella("LOCALAPPDATA"),      @"Microsoft\Edge\Application\msedge.exe")
        };
    }

    private static string[] PercorsiChrome()
    {
        return new string[]
        {
            Path.Combine(Cartella("ProgramFiles"),      @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(Cartella("ProgramFiles(x86)"), @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(Cartella("LOCALAPPDATA"),      @"Google\Chrome\Application\chrome.exe")
        };
    }

    private static string Cartella(string variabile)
    {
        string v = Environment.GetEnvironmentVariable(variabile);
        return string.IsNullOrEmpty(v) ? @"C:\" : v;
    }

    /// <summary>
    /// Il primo browser che esiste davvero. `preferito` può essere edge, chrome
    /// o auto; se quello chiesto non c'è si ripiega sull'altro invece di
    /// arrendersi — meglio la chat aperta nel browser sbagliato che nessuna chat.
    /// </summary>
    public static string Trova(string preferito)
    {
        bool primaChrome = (preferito == "chrome");

        string[][] ordine = primaChrome
            ? new string[][] { PercorsiChrome(), PercorsiEdge() }
            : new string[][] { PercorsiEdge(), PercorsiChrome() };

        for (int g = 0; g < ordine.Length; g++)
            for (int i = 0; i < ordine[g].Length; i++)
                if (File.Exists(ordine[g][i])) return ordine[g][i];

        // Ultimo tentativo: il registro. Copre le installazioni fuori posto
        // (portable, cartelle personalizzate, Chrome for Testing).
        string[] chiavi = primaChrome
            ? new string[] { "chrome.exe", "msedge.exe" }
            : new string[] { "msedge.exe", "chrome.exe" };

        for (int i = 0; i < chiavi.Length; i++)
        {
            string p = DalRegistro(chiavi[i]);
            if (p != null && File.Exists(p)) return p;
        }

        return null;
    }

    private static string DalRegistro(string eseguibile)
    {
        try
        {
            string ramo = @"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\" + eseguibile;
            object v = Microsoft.Win32.Registry.GetValue(@"HKEY_LOCAL_MACHINE\" + ramo, null, null)
                    ?? Microsoft.Win32.Registry.GetValue(@"HKEY_CURRENT_USER\" + ramo, null, null);
            return v == null ? null : v.ToString().Trim('"');
        }
        catch { return null; }
    }

    /* ---- 5.2 L'apertura ---- */

    public static Process Apri(string browser, string html, Preferenze pref, double scala)
    {
        ProcessStartInfo psi = new ProcessStartInfo(browser, Comando(html, pref, scala));
        psi.UseShellExecute  = false;   // così ci torna un Process vero da seguire
        psi.CreateNoWindow   = true;
        psi.WorkingDirectory = Path.GetDirectoryName(browser);

        return Process.Start(psi);
    }

    /// <summary>
    /// Gli argomenti da passare al browser. Sta in un metodo suo, separato
    /// dall'avvio, perché è la riga più delicata di tutto il launcher e così si
    /// può leggere (e provare) senza far partire niente.
    /// </summary>
    /// <summary>
    /// L'indirizzo della pagina, con i parametri del widget e `finestra=1`.
    /// Sta in un metodo suo perché lo usano tutte e due le strade: la finestra
    /// nostra con WebView2 e il ripiego col browser. Erano la stessa riga
    /// scritta due volte, cioè la stessa riga che prima o poi divergeva.
    ///
    /// `finestra=1` dice alla pagina che sta girando DENTRO una finestra del
    /// launcher. Serve al menu del tasto destro: in una Sorgente Browser di
    /// OBS quel menu non deve esistere — non c'è nessuna finestra da chiudere,
    /// e mostrare «Chiudi» dove chiudere non si può è peggio che non mostrarlo.
    /// </summary>
    public static string Indirizzo(string html, Preferenze pref)
    {
        // new Uri(...).AbsoluteUri codifica spazi e accenti come si deve:
        // C:\Users\Chi è\Desktop\chat → file:///C:/Users/Chi%20%C3%A8/Desktop/chat.
        // Concatenare "file:///" + percorso.Replace('\\','/') sembrerebbe uguale
        // e si romperebbe al primo utente che si chiama «Niccolò».
        string indirizzo = new Uri(Path.GetFullPath(html)).AbsoluteUri;

        string coda = pref.Parametri;
        coda = (coda.Length > 0 ? coda + "&" : "") + "finestra=1";
        return indirizzo + "?" + coda;
    }

    /// <summary>Dove mettere la finestra, in pixel logici. Vedi Posizione().</summary>
    public static Point DoveAprirla(Preferenze pref, double scala)
    {
        return Posizione(pref, scala);
    }

    /// <summary>Il nome di dominio finto della Vetrina. Vedi IndirizzoLocale.</summary>
    public const string HOST_LOCALE = "pollaio.locale";

    /// <summary>
    /// L'indirizzo per la Vetrina, che NON è un `file://`.
    ///
    /// PERCHÉ. La prima versione navigava al file vero e WebView2 rispondeva
    /// ERR_FILE_NOT_FOUND. La strada raccomandata per il contenuto locale è
    /// un'altra: si mappa la cartella su un nome di dominio finto
    /// (SetVirtualHostNameToFolderMapping) e ci si naviga sopra in https.
    ///
    /// Non è un ripiego, è meglio: la pagina si ritrova un'ORIGINE VERA invece
    /// dell'origine opaca di `file://`. localStorage diventa uno spazio suo e
    /// non condiviso con qualunque altra pagina aperta dal disco, e le
    /// richieste ai provider di emote partono da un'origine normale invece che
    /// da `null`.
    ///
    /// Il ripiego col browser continua a usare `file://`: lì funziona da
    /// sempre, ed è anche la forma che si incolla in OBS.
    /// </summary>
    public static string IndirizzoLocale(string nomeFile, Preferenze pref)
    {
        string coda = pref.Parametri;
        coda = (coda.Length > 0 ? coda + "&" : "") + "finestra=1";
        return "https://" + HOST_LOCALE + "/" + nomeFile + "?" + coda;
    }

    public static string Comando(string html, Preferenze pref, double scala)
    {
        // new Uri(...).AbsoluteUri codifica spazi e accenti come si deve:
        // C:\Users\Chi è\Desktop\chat → file:///C:/Users/Chi%20%C3%A8/Desktop/chat.
        // Concatenare "file:///" + percorso.Replace('\\','/') sembrerebbe uguale
        // e si romperebbe al primo utente che si chiama «Niccolò».
        string indirizzo = Indirizzo(html, pref);

        Point dove = Posizione(pref, scala);

        string profilo = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            @"Pollaio\profilo");
        try { Directory.CreateDirectory(profilo); } catch { /* ci penserà il browser */ }

        StringBuilder a = new StringBuilder();

        // --app: la finestra nuda. Niente barra degli indirizzi, niente schede,
        // niente pulsanti: solo la pagina. È quello che OBS deve catturare.
        a.Append("--app=\"").Append(indirizzo).Append("\" ");
        a.Append("--window-size=").Append(pref.Larghezza).Append(',').Append(pref.Altezza).Append(' ');
        a.Append("--window-position=").Append(dove.X).Append(',').Append(dove.Y).Append(' ');

        // Un profilo TUTTO SUO, e non è un dettaglio: senza --user-data-dir la
        // finestra si aggancia al browser che l'utente ha già aperto. Da lì in
        // poi eredita le sue estensioni (che possono iniettare roba nella
        // pagina), i suoi aggiornamenti, i suoi pannelli — e in diretta può
        // comparire un «Ripristina le schede?» o un pop-up di un'estensione
        // SOPRA all'overlay. Con un profilo separato la finestra è isolata:
        // nessuna estensione, nessuna sessione, nessuna sorpresa.
        a.Append("--user-data-dir=\"").Append(profilo).Append("\" ");

        a.Append("--no-first-run ");
        a.Append("--no-default-browser-check ");
        a.Append("--disable-session-crashed-bubble ");   // «Chrome non si è chiuso correttamente»
        a.Append("--hide-crash-restore-bubble ");        // lo stesso, versione recente
        a.Append("--noerrdialogs ");
        // Translate: senza, Edge propone di tradurre la chat inglese e apre un
        // pannello sopra l'overlay. msEdgeIdentityProvisioning: il pop-up
        // «accedi con il tuo account Microsoft» al primo avvio del profilo.
        a.Append("--disable-features=Translate,TranslateUI,msEdgeIdentityProvisioning ");
        // Le emote animate e i suoni degli avvisi partono da soli: nell'overlay
        // non c'è nessuno che possa cliccare per dare il consenso.
        a.Append("--autoplay-policy=no-user-gesture-required");

        return a.ToString();
    }

    /// <summary>
    /// Dove mettere la finestra. Attenzione all'unità di misura: noi siamo
    /// DPI-aware e Screen ci dà pixel fisici, mentre --window-position e
    /// --window-size del browser ragionano in pixel logici. Su uno schermo al
    /// 150% la differenza è un terzo dello schermo: si converte.
    /// </summary>
    private static Point Posizione(Preferenze pref, double scala)
    {
        const int MARGINE = 24;

        Rectangle area = Screen.PrimaryScreen.WorkingArea;
        int sinistra = (int)Math.Round(area.Left   / scala);
        int alto     = (int)Math.Round(area.Top    / scala);
        int destra   = (int)Math.Round(area.Right  / scala);

        // -1 vale per ciascuno dei due assi separatamente: si può ancorare a
        // destra e scegliere a mano la quota verticale.
        int x = (pref.X == -1) ? destra - pref.Larghezza - MARGINE : pref.X;
        int y = (pref.Y == -1) ? alto + MARGINE : pref.Y;

        if (x < sinistra) x = sinistra;
        return new Point(x, y);
    }

    /* ---- 5.3 L'attesa ---- */

    /// <summary>
    /// Aspetta che la finestra del browser esista sul serio. Due strade, perché
    /// il processo che avviamo non è sempre quello che poi mostra la finestra:
    /// il primo può fare da lanciatore e uscire subito.
    /// </summary>
    /// <summary>
    /// Restituisce l'handle della finestra trovata, oppure IntPtr.Zero se il
    /// tetto è scaduto. Prima non restituiva niente: serve da quando il
    /// launcher deve togliere la cornice a quella finestra e poi starla a
    /// sentire (classi Cornice e Ponte).
    /// </summary>
    /// <summary>
    /// Aspetta la finestra dell'app e restituisce il suo handle, oppure
    /// IntPtr.Zero se il tetto scade.
    ///
    /// PERCHÉ NON PIÙ `MainWindowHandle`, che era la strada di prima e non
    /// funzionava. Quella proprietà restituisce la PRIMA finestra visibile del
    /// processo, e nei primi istanti di vita di Chrome o Edge non è quella
    /// dell'app: è una finestra di servizio, o l'app appena nata a cui il
    /// browser sta ancora riscrivendo gli stili mentre la costruisce. Togliere
    /// la cornice a quella non serviva a niente — un istante dopo il browser
    /// la rimetteva, e la barra restava lì.
    ///
    /// Adesso si cercano tutte le finestre di primo livello dei processi del
    /// browser nati dopo di noi, e si aspetta quella VISIBILE il cui titolo
    /// contiene `marcatore`. Il titolo arriva dal &lt;title&gt; della pagina, quindi
    /// trovarlo vuol dire due cose insieme: è la finestra giusta, e la pagina
    /// è già stata caricata — cioè il browser ha finito di metterci mano.
    /// </summary>
    public static IntPtr AttendiFinestra(Process avviato, string browser, DateTime partenza,
                                         int tetto, string marcatore)
    {
        string nome = Path.GetFileNameWithoutExtension(browser);
        Stopwatch cr = Stopwatch.StartNew();
        IntPtr ripiego = IntPtr.Zero;

        while (cr.ElapsedMilliseconds < tetto)
        {
            List<uint> nostri = ProcessiDelBrowser(nome, partenza, avviato);

            if (nostri.Count > 0)
            {
                IntPtr trovata = CercaFinestra(nostri, marcatore);
                if (trovata != IntPtr.Zero) return trovata;

                // Una finestra c'è ma il titolo non è ancora quello: si tiene
                // da parte come ripiego, e si continua ad aspettare quella
                // giusta finché c'è tempo.
                if (ripiego == IntPtr.Zero) ripiego = CercaFinestra(nostri, "");
            }

            Thread.Sleep(120);
        }

        // Scaduto il tetto ci si arrende e si chiude lo splash lo stesso: se il
        // browser è lento, lasciare il pollo per sempre a schermo è peggio.
        return ripiego;
    }

    private static List<uint> ProcessiDelBrowser(string nome, DateTime partenza, Process avviato)
    {
        List<uint> fuori = new List<uint>();

        if (avviato != null)
        {
            try { if (!avviato.HasExited) fuori.Add((uint)avviato.Id); }
            catch { /* già morto: era solo il lanciatore */ }
        }

        Process[] tutti = Process.GetProcessesByName(nome);
        try
        {
            for (int i = 0; i < tutti.Length; i++)
            {
                try
                {
                    // Un secondo di tolleranza: gli orologi di Process.StartTime
                    // e DateTime.Now non sono presi nello stesso istante.
                    if (tutti[i].StartTime < partenza.AddSeconds(-1)) continue;
                    uint id = (uint)tutti[i].Id;
                    if (!fuori.Contains(id)) fuori.Add(id);
                }
                catch { /* processo di un altro utente, o già morto */ }
            }
        }
        finally
        {
            for (int i = 0; i < tutti.Length; i++) tutti[i].Dispose();
        }

        return fuori;
    }

    /// <summary>
    /// La prima finestra di primo livello, visibile e con un titolo, che
    /// appartenga a uno di quei processi. Con `marcatore` non vuoto, il titolo
    /// deve anche contenerlo.
    /// </summary>
    private static IntPtr CercaFinestra(List<uint> processi, string marcatore)
    {
        IntPtr trovata = IntPtr.Zero;

        Nativo.EnumWindows(delegate (IntPtr finestra, IntPtr dato)
        {
            try
            {
                if (!Nativo.IsWindowVisible(finestra)) return true;

                uint processo;
                Nativo.GetWindowThreadProcessId(finestra, out processo);
                if (!processi.Contains(processo)) return true;

                string titolo = Nativo.Titolo(finestra);
                if (titolo.Length == 0) return true;

                if (marcatore.Length > 0 &&
                    titolo.IndexOf(marcatore, StringComparison.OrdinalIgnoreCase) < 0) return true;

                trovata = finestra;
                return false;   // trovata: si smette di scorrere
            }
            catch { return true; }
        }, IntPtr.Zero);

        return trovata;
    }
}


/* =============================================================================
   6. LA RETE — la verifica vera
   Non un ping finto: si bussa allo stesso 7TV a cui bussa il widget. Se risponde
   lui, rispondono anche Twitch e gli altri provider.
   ============================================================================= */

internal static class Rete
{
    private const string SONDA = "https://7tv.io/v3/emote-sets/global";
    private const int TETTO = 4000;

    public static bool Risponde()
    {
        // Il tetto di HttpWebRequest non copre tutto (la scoperta del proxy e
        // certe attese di DNS gli sfuggono), quindi la richiesta gira dentro un
        // thread suo che si abbandona dopo 4,5 secondi. È l'unico modo di
        // garantire che questa fase finisca.
        bool[] esito = new bool[1];
        Thread t = new Thread(delegate() { esito[0] = Bussa(); });
        t.IsBackground = true;
        t.Start();
        t.Join(TETTO + 500);
        return esito[0];
    }

    private static bool Bussa()
    {
        try
        {
            // 7TV parla solo TLS 1.2. Il valore è scritto come numero e non come
            // SecurityProtocolType.Tls12 apposta: quel nome non esiste nelle
            // reference assembly del .NET 4.0, e il csc di sistema potrebbe
            // essere puntato lì. 3072 = Tls12, 768 = Tls11.
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)(3072 | 768);

            HttpWebRequest r = (HttpWebRequest)WebRequest.Create(SONDA);
            r.Method            = "HEAD";
            r.Timeout           = TETTO;
            r.ReadWriteTimeout  = TETTO;
            r.UserAgent         = "pollaio-launcher";
            r.AllowAutoRedirect = true;

            using (WebResponse w = r.GetResponse()) { return true; }
        }
        catch (WebException ex)
        {
            // Un 403 o un 405 (il server non gradisce HEAD) sono comunque una
            // RISPOSTA: vuol dire che la rete c'è ed è quello che ci interessa.
            // Solo un fallimento senza risposta è un vero problema di rete.
            return ex.Response != null;
        }
        catch
        {
            return false;
        }
    }
}


/* =============================================================================
   7. ICONA — png → ico, per /win32icon
   Non serve al funzionamento: serve perché il .exe sulla scrivania abbia la
   faccia del pollo invece del rettangolo grigio di Windows. Lo chiama solo
   compila.cmd, con --crea-icona.

   Formato: 16/24/32/48/64 come DIB a 32 bit (il formato storico, che qualunque
   cosa sa leggere) e 128/256 come PNG dentro l'ico (ammesso da Vista in poi e
   molto più piccolo: un 256 in DIB da solo peserebbe 270 KB).
   ============================================================================= */

internal static class Icona
{
    private static readonly int[] MISURE = new int[] { 16, 24, 32, 48, 64, 128, 256 };
    private const int SOGLIA_PNG = 128;   // da qui in su si comprime

    public static bool Genera(string png, string ico)
    {
        try
        {
            if (!File.Exists(png)) return false;

            byte[] grezzo = File.ReadAllBytes(png);
            List<byte[]> corpi = new List<byte[]>();
            List<int> lati = new List<int>();

            using (MemoryStream ms = new MemoryStream(grezzo))
            using (Bitmap sorgente = new Bitmap(ms))
            {
                for (int i = 0; i < MISURE.Length; i++)
                {
                    int n = MISURE[i];
                    using (Bitmap piccola = Ridimensiona(sorgente, n))
                    {
                        corpi.Add(n >= SOGLIA_PNG ? InPng(piccola) : InDib(piccola));
                        lati.Add(n);
                    }
                }
            }

            using (MemoryStream ms = new MemoryStream())
            using (BinaryWriter w = new BinaryWriter(ms))
            {
                // ICONDIR
                w.Write((short)0);              // riservato
                w.Write((short)1);              // 1 = icona
                w.Write((short)corpi.Count);

                int scorrimento = 6 + 16 * corpi.Count;
                for (int i = 0; i < corpi.Count; i++)
                {
                    // ICONDIRENTRY. 256 si scrive 0: il campo è un solo byte.
                    w.Write((byte)(lati[i] >= 256 ? 0 : lati[i]));
                    w.Write((byte)(lati[i] >= 256 ? 0 : lati[i]));
                    w.Write((byte)0);           // colori della tavolozza: nessuna
                    w.Write((byte)0);           // riservato
                    w.Write((short)1);          // piani
                    w.Write((short)32);         // bit per pixel
                    w.Write(corpi[i].Length);
                    w.Write(scorrimento);
                    scorrimento += corpi[i].Length;
                }

                for (int i = 0; i < corpi.Count; i++) w.Write(corpi[i]);

                w.Flush();
                Directory.CreateDirectory(Path.GetDirectoryName(ico));
                File.WriteAllBytes(ico, ms.ToArray());
            }

            return true;
        }
        catch
        {
            // Meglio nessuna icona che una compilazione che si ferma: compila.cmd
            // guarda se il file c'è e, se non c'è, compila senza.
            return false;
        }
    }

    private static Bitmap Ridimensiona(Bitmap sorgente, int lato)
    {
        Bitmap b = new Bitmap(lato, lato, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(b))
        {
            g.CompositingMode    = CompositingMode.SourceCopy;
            g.CompositingQuality = CompositingQuality.HighQuality;
            g.InterpolationMode  = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode    = PixelOffsetMode.HighQuality;
            g.SmoothingMode      = SmoothingMode.HighQuality;

            using (ImageAttributes ia = new ImageAttributes())
            {
                // Senza TileFlipXY il bicubico va a pescare fuori dai bordi e
                // lascia una cornice semitrasparente attorno all'icona.
                ia.SetWrapMode(WrapMode.TileFlipXY);
                g.DrawImage(sorgente, new Rectangle(0, 0, lato, lato),
                            0, 0, sorgente.Width, sorgente.Height, GraphicsUnit.Pixel, ia);
            }
        }
        return b;
    }

    private static byte[] InPng(Bitmap b)
    {
        using (MemoryStream ms = new MemoryStream())
        {
            b.Save(ms, ImageFormat.Png);
            return ms.ToArray();
        }
    }

    /// <summary>
    /// L'immagine come DIB a 32 bit: BITMAPINFOHEADER, poi i pixel dal basso
    /// verso l'alto, poi la maschera AND a 1 bit. La maschera si scrive tutta a
    /// zero — «nessun pixel nascosto» — perché la trasparenza vera la fa il
    /// canale alfa dei 32 bit; ma il campo deve esserci lo stesso, è il formato.
    /// </summary>
    private static byte[] InDib(Bitmap b)
    {
        int w = b.Width, h = b.Height;
        int passoMaschera = ((w + 31) / 32) * 4;     // righe allineate a 4 byte
        int byteMaschera = passoMaschera * h;

        BitmapData d = b.LockBits(new Rectangle(0, 0, w, h),
                          ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        byte[] pixel = new byte[d.Stride * h];
        Marshal.Copy(d.Scan0, pixel, 0, pixel.Length);
        b.UnlockBits(d);

        using (MemoryStream ms = new MemoryStream())
        using (BinaryWriter s = new BinaryWriter(ms))
        {
            s.Write(40);                 // biSize
            s.Write(w);                  // biWidth
            s.Write(h * 2);              // biHeight: XOR + AND, è il formato ICO
            s.Write((short)1);           // biPlanes
            s.Write((short)32);          // biBitCount
            s.Write(0);                  // biCompression = BI_RGB
            s.Write(w * h * 4 + byteMaschera);
            s.Write(0); s.Write(0);      // pixel per metro
            s.Write(0); s.Write(0);      // colori usati / importanti

            // I DIB si scrivono dall'ultima riga alla prima.
            for (int y = h - 1; y >= 0; y--)
                s.Write(pixel, y * d.Stride, w * 4);

            s.Write(new byte[byteMaschera]);

            s.Flush();
            return ms.ToArray();
        }
    }
}


/* =============================================================================
   7-bis. LA FINESTRA NUDA E IL PONTE

   PERCHÉ ESISTE QUESTA PARTE
   La barra del titolo sopra la chat non è del launcher: è del browser. `--app`
   toglie schede, indirizzo e pulsanti, ma una barra sottile con il titolo e i
   tre bottoni di Windows resta — e in una cattura finestra di OBS entra
   nell'inquadratura, sopra al gameplay.

   Si può togliere: lo stile di una finestra è un numero, e Windows lascia
   riscriverlo a chiunque abbia l'handle. Il problema nasce dopo. Una finestra
   senza cornice non si sposta più trascinandola e non si chiude più col
   bottone, perché non ci sono più né la barra né i bottoni.

   IL MENU DEVE QUINDI STARE DENTRO LA PAGINA, ed è anche il posto giusto:
   così è disegnato in CSS con la palette del canale invece che con i grigi di
   Windows. Ma una pagina non può chiudere una finestra di sistema.

   IL PONTE, e perché è fatto così. Serve un canale fra la pagina e il
   launcher, senza server, senza file, senza dipendenze. Ce n'è uno già
   pronto: il TITOLO della finestra. La pagina scrive un comando in
   `document.title`, il browser lo copia nel testo della finestra, e il
   launcher lo legge con GetWindowText. Un canale a senso unico, lento e
   piccolo — e sono esattamente le tre cose che qui non contano, perché i
   comandi sono quattro e li manda un essere umano che ha appena cliccato.

   IL COSTO: il launcher non esce più dopo aver aperto la chat. Resta acceso a
   guardare il titolo finché la finestra vive. È un processo in più nell'elenco
   delle applicazioni, e va detto invece che scoperto.

   LA VIA DI FUGA. Se il ponte non funzionasse — un browser che non ricopia il
   titolo, un domani in cui Chrome cambia idea — la finestra resta chiudibile
   con Alt+F4 e dal tasto destro sulla barra delle applicazioni. Non si resta
   mai chiusi fuori, ed è la ragione per cui questa parte si è potuta scrivere
   senza avere un modo di provarla su questa macchina.
   ============================================================================= */

internal static class Cornice
{
    /* Le misure di questa finestra, tenute da parte per poterla rifare.

       PERCHÉ SI DEVE RIFARE. Chrome ed Edge riscrivono gli stili delle loro
       finestre più di una volta durante la vita: al primo disegno, quando la
       pagina finisce di caricare, quando la finestra viene ripristinata dopo
       essere stata ridotta a icona. Ogni volta la cornice può tornare. Toglierla
       una volta sola all'avvio è esattamente l'errore che questa parte ha già
       fatto: sembrava fatto e non lo era. */
    private static int larghezzaVoluta;
    private static int altezzaVoluta;
    private static double scalaVoluta = 1.0;
    private static bool nuda;

    public static void Ricorda(int larghezza, int altezza, double scala, bool senzaCornice)
    {
        larghezzaVoluta = larghezza;
        altezzaVoluta = altezza;
        scalaVoluta = scala;
        nuda = senzaCornice;
    }

    /// <summary>
    /// Se la cornice è tornata, la toglie di nuovo. Costa una lettura di uno
    /// stile, quindi si può chiamare spesso senza pensarci.
    /// </summary>
    public static void Rinfresca(IntPtr finestra)
    {
        if (!nuda || finestra == IntPtr.Zero) return;

        try
        {
            int stile = Nativo.LeggiStile(finestra, Nativo.GWL_STYLE);
            if (stile == 0) return;

            // Se non c'è più niente da togliere si esce senza toccare niente:
            // riapplicare lo stile a ogni giro farebbe sfarfallare la finestra.
            bool sporca = (stile & (Nativo.WS_CAPTION | Nativo.WS_THICKFRAME)) != 0;
            if (!sporca) return;

            Togli(finestra, larghezzaVoluta, altezzaVoluta, scalaVoluta);
        }
        catch { /* si riproverà al giro dopo */ }
    }

    /// <summary>
    /// L'icona della finestra: quella della barra delle applicazioni e
    /// dell'Alt+Tab. Senza, resta quella del browser — e una finestra senza
    /// cornice con sotto il logo di Edge continua a dire «sono una pagina web».
    /// </summary>
    public static void MettiIcona(IntPtr finestra)
    {
        if (finestra == IntPtr.Zero) return;

        try
        {
            Icon icona = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            if (icona == null) return;

            Nativo.SendMessageW(finestra, Nativo.WM_SETICON,
                new IntPtr(Nativo.ICONA_GRANDE), icona.Handle);
            Nativo.SendMessageW(finestra, Nativo.WM_SETICON,
                new IntPtr(Nativo.ICONA_PICCOLA), icona.Handle);
        }
        catch { /* resta l'icona del browser: brutta, non rotta */ }
    }

    /// <summary>
    /// Toglie barra del titolo, bordo di ridimensionamento e bottoni.
    /// Qualunque cosa vada storta, la cornice resta: brutta, non rotta.
    /// </summary>
    public static void Togli(IntPtr finestra, int larghezza, int altezza, double scala)
    {
        if (finestra == IntPtr.Zero) return;

        try
        {
            /* 1. LO STILE CLASSICO. WS_CAPTION porta con sé WS_BORDER, quindi
                  se ne va anche il filo intorno. WS_POPUP si AGGIUNGE, non si
                  toglie: è lo stile delle finestre senza area non cliente, ed
                  è quello che dice a Windows di non riservare più spazio
                  attorno al contenuto. Toglierli e basta, senza metterlo,
                  lasciava una finestra «sovrapposta» a cui era stata tolta la
                  barra — non una finestra nuda. */
            int stile = Nativo.LeggiStile(finestra, Nativo.GWL_STYLE);
            if (stile != 0)
            {
                stile &= ~(Nativo.WS_CAPTION | Nativo.WS_THICKFRAME |
                           Nativo.WS_MINIMIZEBOX | Nativo.WS_MAXIMIZEBOX | Nativo.WS_SYSMENU);
                stile |= Nativo.WS_POPUP;
                Nativo.ScriviStile(finestra, Nativo.GWL_STYLE, stile);
            }

            /* 2. GLI STILI ESTESI, che disegnano bordi per conto loro e
                  sopravvivono tranquillamente al punto 1. Era da qui che
                  veniva parte del filo chiaro rimasto intorno. */
            int esteso = Nativo.LeggiStile(finestra, Nativo.GWL_EXSTYLE);
            if (esteso != 0)
            {
                esteso &= ~(Nativo.WS_EX_DLGMODALFRAME | Nativo.WS_EX_CLIENTEDGE |
                            Nativo.WS_EX_STATICEDGE | Nativo.WS_EX_WINDOWEDGE);
                Nativo.ScriviStile(finestra, Nativo.GWL_EXSTYLE, esteso);
            }

            /* 3. DWM. Su Windows 11 il bordo di un pixel e gli angoli tondi
                  NON li disegna la finestra: li disegna il compositore, dopo
                  di lei, e nessuno stile li può togliere. Si spengono
                  chiedendoglielo. Su Windows 10 la chiamata fallisce e non
                  importa: là quel bordo non c'era. */
            try
            {
                int nessunBordo = Nativo.DWMWA_COLOR_NONE;
                Nativo.DwmSetWindowAttribute(finestra, Nativo.DWMWA_BORDER_COLOR,
                    ref nessunBordo, sizeof(int));

                int angoliVivi = Nativo.DWMWCP_DONOTROUND;
                Nativo.DwmSetWindowAttribute(finestra, Nativo.DWMWA_WINDOW_CORNER_PREFERENCE,
                    ref angoliVivi, sizeof(int));
            }
            catch { /* Windows più vecchio: niente da spegnere */ }

            /* 4. SWP_FRAMECHANGED non è facoltativo: senza, Windows non
                  ricalcola l'area non cliente e la cornice resta disegnata
                  finché qualcos'altro non forza un ridisegno — cioè a volte
                  per sempre. Va fatto DOPO tutti i cambi di stile, una volta
                  sola. */
            Nativo.SetWindowPos(finestra, IntPtr.Zero, 0, 0, 0, 0,
                Nativo.SWP_NOMOVE | Nativo.SWP_NOSIZE | Nativo.SWP_NOZORDER | Nativo.SWP_FRAMECHANGED);

            RimettiMisura(finestra, larghezza, altezza, scala);
        }
        catch { /* la cornice resta dov'è */ }
    }

    /// <summary>
    /// Tolta la barra, la finestra resta grande uguale ma l'area utile CRESCE
    /// di quanto misurava la barra: la pagina dentro diventa più alta di
    /// trenta pixel e l'inquadratura preparata in OBS non torna più. Si rimette
    /// la misura chiesta nell'ini, che adesso vale tutta per la pagina.
    ///
    /// La scala serve perché l'ini parla in pixel logici (come --window-size
    /// del browser) mentre queste chiamate lavorano in pixel fisici: su uno
    /// schermo al 150% la differenza è metà finestra.
    /// </summary>
    private static void RimettiMisura(IntPtr finestra, int larghezza, int altezza, double scala)
    {
        Nativo.RECT r;
        if (!Nativo.GetWindowRect(finestra, out r)) return;

        int l = (int)Math.Round(larghezza * scala);
        int a = (int)Math.Round(altezza * scala);
        if (l < 80 || a < 80) return;

        Nativo.MoveWindow(finestra, r.Sinistra, r.Alto, l, a, true);
    }
}


internal static class Ponte
{
    /* Il comando viaggia come `pollaio:<cosa>:<numero>`. Il numero cambia a
       ogni invio, ed è lì per un motivo preciso: il titolo resta scritto per
       qualche decimo di secondo, il launcher guarda ogni 150 ms, e senza un
       pezzo che cambia lo stesso comando verrebbe eseguito due o tre volte —
       cioè «Riduci a icona» tre volte, oppure «Chiudi» mentre si sta già
       chiudendo. */
    private const string PREFISSO = "pollaio:";
    private const int PASSO = 150;

    private static string ultimoFatto = "";

    /// <summary>
    /// Resta a guardare il titolo della finestra finché la finestra esiste.
    /// Torna quando la chat è stata chiusa: a quel punto il launcher ha
    /// finito il suo lavoro e può uscire.
    /// </summary>
    public static void Ascolta(IntPtr finestra)
    {
        if (finestra == IntPtr.Zero) return;

        int giri = 0;

        while (true)
        {
            try
            {
                if (!Nativo.IsWindow(finestra)) return;

                /* Ogni due secondi si controlla che la cornice non sia tornata.
                   Il browser riscrive gli stili della sua finestra più di una
                   volta — al primo disegno, a pagina caricata, quando si
                   ripristina dopo un «riduci a icona» — e ogni volta la barra
                   può ricomparire. Toglierla una volta sola all'avvio è
                   l'errore che questa parte ha già fatto una volta. */
                giri++;
                if (giri % 13 == 0) Cornice.Rinfresca(finestra);

                string titolo = Nativo.Titolo(finestra);
                int dove = titolo.IndexOf(PREFISSO, StringComparison.Ordinal);

                if (dove >= 0)
                {
                    string gettone = Gettone(titolo, dove);
                    if (gettone.Length > 0 && gettone != ultimoFatto)
                    {
                        ultimoFatto = gettone;
                        Esegui(finestra, Comando(gettone));
                    }
                }
            }
            catch { /* un giro saltato non è niente: si riprova fra 150 ms */ }

            Thread.Sleep(PASSO);
        }
    }

    /// <summary>Dal titolo al gettone intero, numero compreso.</summary>
    private static string Gettone(string titolo, int dove)
    {
        string resto = titolo.Substring(dove + PREFISSO.Length);
        int spazio = resto.IndexOf(' ');
        if (spazio >= 0) resto = resto.Substring(0, spazio);
        return resto.Trim();
    }

    /// <summary>Dal gettone al comando, buttando via il numero.</summary>
    private static string Comando(string gettone)
    {
        int taglio = gettone.IndexOf(':');
        return (taglio > 0 ? gettone.Substring(0, taglio) : gettone).ToLowerInvariant();
    }

    private static void Esegui(IntPtr finestra, string comando)
    {
        if (comando == "chiudi")
        {
            // WM_CLOSE e non TerminateProcess: si chiede al browser di
            // chiudersi, e lui saluta i suoi processi figli come si deve.
            // Ammazzarlo lascerebbe in giro il profilo sporco e alla prossima
            // apertura comparirebbe «Chrome non si è chiuso correttamente»
            // sopra la diretta.
            Nativo.PostMessage(finestra, Nativo.WM_CLOSE, IntPtr.Zero, IntPtr.Zero);
            return;
        }

        if (comando == "riduci")
        {
            Nativo.ShowWindow(finestra, Nativo.SW_MINIMIZE);
            return;
        }

        if (comando == "regia")
        {
            /* Si riapre QUESTO stesso eseguibile con --regia: una copia di sé
               che apre l'altra pagina, con la sua finestra e la sua misura.
               Non `Process.Start("regia.html")`, che la aprirebbe nel browser
               predefinito con barra degli indirizzi e schede — cioè come una
               pagina web, che è esattamente quello che non si vuole. */
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo(Application.ExecutablePath, "--regia");
                psi.UseShellExecute = true;
                psi.WorkingDirectory = Programma.Radice;
                Process.Start(psi);
            }
            catch { /* se non parte, si resta con la chat: nessun danno */ }
            return;
        }

        /* Nel ripiego col browser il trascinamento vero non si può fare: il
           comando arriva dal titolo della finestra fino a 150 millisecondi
           dopo, e a quel punto il tasto è quasi sempre già stato rilasciato —
           Windows non avrebbe niente da seguire. Resta il modo di prima: la
           finestra segue il mouse finché non si clicca. Meno bello, ma è
           l'unica cosa che quel canale permette. */
        if (comando == "trascina") Trascina(finestra);
    }

    /// <summary>
    /// La finestra segue il mouse finché non si clicca. È il modo che resta
    /// quando non c'è più una barra da trascinare, e ha un vantaggio suo: si
    /// sposta senza tenere premuto, che su una finestra alta e stretta in un
    /// angolo dello schermo è più comodo del trascinamento vero.
    /// </summary>
    /// <summary>
    /// Pubblica perché la usano tutte e due le strade: il ripiego col browser
    /// e la finestra nostra. Il modo di spostare una finestra senza barra è lo
    /// stesso, che dentro ci sia Chrome o WebView2.
    /// </summary>
    public static void Trascina(IntPtr finestra)
    {
        Nativo.RECT r;
        Nativo.PUNTO p;

        if (!Nativo.GetWindowRect(finestra, out r)) return;
        if (!Nativo.GetCursorPos(out p)) return;

        int scartoX = r.Sinistra - p.X;
        int scartoY = r.Alto - p.Y;
        int larghezza = r.Destra - r.Sinistra;
        int altezza = r.Basso - r.Alto;

        // Si aspetta che il tasto sia RILASCIATO prima di cominciare. Chi ha
        // appena cliccato la voce del menu lo tiene ancora premuto, e senza
        // questa attesa lo spostamento finirebbe nell'istante in cui comincia.
        while ((Nativo.GetAsyncKeyState(Nativo.VK_LBUTTON) & 0x8000) != 0) Thread.Sleep(20);

        while (Nativo.IsWindow(finestra))
        {
            if (!Nativo.GetCursorPos(out p)) return;
            Nativo.MoveWindow(finestra, p.X + scartoX, p.Y + scartoY, larghezza, altezza, true);

            if ((Nativo.GetAsyncKeyState(Nativo.VK_LBUTTON) & 0x8000) != 0) return;
            Thread.Sleep(15);
        }
    }
}


/* =============================================================================
   7-ter. LA VETRINA — la finestra vera, disegnata da noi

   È LA STRADA PRINCIPALE, e quella col browser è diventata il ripiego.

   PERCHÉ SI È CAMBIATA IDEA. Aprire Chrome in modalità applicazione e poi
   strappargli la barra del titolo funzionava a metà: il browser riscrive gli
   stili della sua finestra quando vuole, e la barra tornava. Ma il difetto
   vero era un altro, ed era di forma: quella restava la finestra di Chrome,
   con la sua icona sulla barra delle applicazioni e il suo processo. Sembrava
   una pagina web a cui era stato tolto il bordo, perché è esattamente quello
   che era.

   Qui invece la finestra è NOSTRA. Senza cornice per costruzione, non perché
   gliel'abbiamo tolta: `FormBorderStyle.None` è come nasce, ed è la stessa
   riga che regge lo splash. L'icona è la nostra, il processo è il nostro, e
   non c'è nessuno che possa ripensarci a metà diretta.

   IL PREZZO, dichiarato. Servono tre file accanto all'eseguibile:
   Microsoft.Web.WebView2.Core.dll, .WinForms.dll e WebView2Loader.dll. Sono
   una DIPENDENZA, e il §1.1 del contratto ne vietava di ogni tipo: è una
   deroga decisa apposta, non una svista. Devono viaggiare con la cartella —
   chi la copiasse senza di loro si ritroverebbe il ripiego col browser.

   IL MOTORE non è fra questi tre file: è il runtime WebView2, che Windows 11
   si porta dietro con Edge. Se mancasse, `Disponibile()` dice di no e il
   launcher torna alla strada di prima, invece di non partire.

   IL PONTE QUI È VERO. Niente più comandi scritti nel titolo della finestra:
   la pagina chiama window.chrome.webview.postMessage e il messaggio arriva
   qui dentro. Il trucco del titolo resta soltanto nel ripiego, dove è l'unica
   cosa che si può fare.
   ============================================================================= */

/// <summary>
/// Una riga di diario in %TEMP%\pollaio-diagnosi.txt. Serve a farsi dire da
/// Windows com'è andata una chiamata che non si può guardare da fuori: il
/// launcher non ha una console, e senza questo si tirerebbe a indovinare.
/// Si può togliere il giorno che non serve più — non lo legge nessun altro.
/// </summary>
internal static class Diagnosi
{
    public static void Scrivi(string riga)
    {
        try
        {
            string dove = Path.Combine(Path.GetTempPath(), "pollaio-diagnosi.txt");
            File.AppendAllText(dove,
                DateTime.Now.ToString("HH:mm:ss") + "  " + riga + Environment.NewLine);
        }
        catch { /* se non si può scrivere, pazienza: era solo un diario */ }
    }
}


internal sealed class Vetrina : Form
{
    private readonly WebView2 vista = new WebView2();
    private readonly string indirizzo;

    /// <summary>
    /// C'è il runtime e le librerie si caricano? Si chiede alla libreria
    /// stessa quale versione del motore vede: se lancia — DLL mancanti,
    /// runtime assente, architettura sbagliata — la risposta è no e si va di
    /// ripiego. Una domanda sola, e risponde per tutte e tre le cose.
    /// </summary>
    public static bool Disponibile()
    {
        try
        {
            string versione = CoreWebView2Environment.GetAvailableBrowserVersionString();
            return !string.IsNullOrEmpty(versione);
        }
        catch { return false; }
    }

    public Vetrina(string indirizzo, Preferenze pref, double scala)
    {
        this.indirizzo = indirizzo;

        FormBorderStyle = FormBorderStyle.None;
        StartPosition = FormStartPosition.Manual;
        ShowInTaskbar = true;
        KeyPreview = true;
        Text = "il pollaio";

        /* Nero e non il colore di sistema: si vede solo dove la pagina è
           trasparente, e in quei punti un grigio chiaro di Windows sarebbe la
           cosa più visibile dello schermo. La pagina si dipinge il suo fondo
           da sé, seguendo il parametro `fondo`. */
        BackColor = Color.Black;

        Size = new Size((int)Math.Round(pref.Larghezza * scala),
                        (int)Math.Round(pref.Altezza * scala));

        Point dove = Navigatore.DoveAprirla(pref, scala);
        Location = new Point((int)Math.Round(dove.X * scala), (int)Math.Round(dove.Y * scala));

        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); }
        catch { /* resta quella di sistema */ }

        vista.Dock = DockStyle.Fill;

        /* Un profilo tutto suo, come già faceva la strada col browser e per la
           stessa ragione: senza, ci si aggancerebbe a quello dell'utente e in
           diretta potrebbe comparire un pannello di un'estensione sopra
           l'overlay. Qui in più il profilo è separato anche da quello del
           ripiego: due motori diversi non devono litigarsi la stessa cartella. */
        string profilo = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            @"Pollaio\vetrina");
        try { Directory.CreateDirectory(profilo); } catch { /* ci penserà il motore */ }

        CoreWebView2CreationProperties proprieta = new CoreWebView2CreationProperties();
        proprieta.UserDataFolder = profilo;
        // Le emote animate e i suoni degli avvisi partono da soli: nell'overlay
        // non c'è nessuno che possa cliccare per dare il consenso.
        proprieta.AdditionalBrowserArguments = "--autoplay-policy=no-user-gesture-required";
        vista.CreationProperties = proprieta;

        vista.CoreWebView2InitializationCompleted += Pronta;
        Controls.Add(vista);
    }

    /* GLI ANGOLI TONDI SI OTTENGONO RIMETTENDO IL TELAIO, non togliendolo.

       Sembra il contrario di quello che serve, e per capirlo è costato un
       tentativo sbagliato. Windows 11 arrotonda gli angoli e disegna l'ombra
       come parte del TELAIO di una finestra: una finestra senza telaio non ha
       niente da arrotondare, e DWMWA_WINDOW_CORNER_PREFERENCE su di lei non fa
       assolutamente nulla — provato, restava squadrata.

       Quindi si rimette WS_THICKFRAME e si lascia via WS_CAPTION: telaio sì,
       barra del titolo no. Windows arrotonda, mette l'ombra, e il filo di
       bordo lo colora come gli diciamo noi (Ammorbidisci). In più la finestra
       torna ridimensionabile trascinandone i bordi, che su una chat da mettere
       in un angolo dello schermo è comodo e prima non si poteva. */
    protected override CreateParams CreateParams
    {
        get
        {
            CreateParams cp = base.CreateParams;
            cp.Style |= Nativo.WS_THICKFRAME;
            return cp;
        }
    }

    /* L'AREA UTILE È TUTTA LA FINESTRA.

       Rimesso il telaio per avere angoli tondi e ombra, Windows si riprendeva
       i pixel che gli spettano: una banda in cima e un filo a destra, dipinti
       col colore di sistema — bianchi, sopra una chat nera, esattamente la
       cosa che non doveva esserci.

       WM_NCCALCSIZE è la domanda «quanto della finestra è area non cliente?».
       Rispondendo che non se ne prende niente, il telaio continua a esistere
       per DWM — che quindi continua ad arrotondare, a fare l'ombra e a
       colorare il bordo — ma non toglie più spazio alla pagina.

       Il prezzo: senza area non cliente, i bordi non fanno più da maniglie per
       ridimensionare col mouse. La finestra si sposta dal menu del tasto
       destro e si dimensiona dall'ini, che è come funzionava già prima. */
    protected override void WndProc(ref Message m)
    {
        const int WM_NCCALCSIZE = 0x0083;

        if (m.Msg == WM_NCCALCSIZE && m.WParam != IntPtr.Zero)
        {
            m.Result = IntPtr.Zero;
            return;
        }

        base.WndProc(ref m);
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);
        Ammorbidisci();

        try { vista.EnsureCoreWebView2Async(null); }
        catch { Close(); }
    }

    /// <summary>
    /// Angoli tondi e un filo di bordo. Su Windows 11 li disegna DWM, il
    /// compositore, e li disegna BENE: sfumati sui bordi, con la finestra
    /// ritagliata davvero e non mascherata. Farli a mano con una Region
    /// darebbe angoli scalettati e mangerebbe l'ombra.
    ///
    /// Su Windows 10 queste due proprietà non esistono, la chiamata torna un
    /// codice d'errore e la finestra resta squadrata. È una differenza di
    /// aspetto, non di funzionamento, e non vale un ripiego.
    /// </summary>
    private void Ammorbidisci()
    {
        int esitoTondi = -1;
        int esitoBordo = -1;
        int stile = 0;

        try
        {
            stile = Nativo.LeggiStile(Handle, Nativo.GWL_STYLE);

            int tondi = Nativo.DWMWCP_ROUND;
            esitoTondi = Nativo.DwmSetWindowAttribute(Handle, Nativo.DWMWA_WINDOW_CORNER_PREFERENCE,
                ref tondi, sizeof(int));

            /* COLORREF non è RGB: i byte stanno al contrario, 0x00BBGGRR.
               Scritto come RGB il viola del canale diventerebbe un azzurro. */
            Color c = Tinte.Bordo;
            int colore = (c.B << 16) | (c.G << 8) | c.R;
            esitoBordo = Nativo.DwmSetWindowAttribute(Handle, Nativo.DWMWA_BORDER_COLOR,
                ref colore, sizeof(int));
        }
        catch { /* Windows più vecchio: angoli vivi, e va bene lo stesso */ }

        Diagnosi.Scrivi(
            "stile=0x" + stile.ToString("X8") +
            "  popup=" + ((stile & unchecked((int)0x80000000)) != 0) +
            "  thickframe=" + ((stile & 0x00040000) != 0) +
            "  caption=" + ((stile & 0x00C00000) != 0) +
            "  tondi=0x" + esitoTondi.ToString("X8") +
            "  bordo=0x" + esitoBordo.ToString("X8"));
    }

    private void Pronta(object mittente, CoreWebView2InitializationCompletedEventArgs e)
    {
        if (!e.IsSuccess) { Close(); return; }

        CoreWebView2 motore = vista.CoreWebView2;

        try
        {
            /* Il menu di sistema del motore va spento: il tasto destro deve
               aprire IL NOSTRO menu, quello disegnato con la palette del
               canale. Gli acceleratori del browser (F5, Ctrl+P, Ctrl+F) pure:
               questa è un'applicazione, non una pagina, e la ricarica sta nel
               menu insieme a tutto il resto. */
            motore.Settings.AreDefaultContextMenusEnabled = false;
            motore.Settings.AreBrowserAcceleratorKeysEnabled = false;
            motore.Settings.AreDevToolsEnabled = false;
            motore.Settings.IsStatusBarEnabled = false;
            motore.Settings.IsZoomControlEnabled = false;
        }
        catch { /* un motore più vecchio: si tiene quello che accetta */ }

        /* La trasparenza dove la pagina è trasparente. Su un runtime che non la
           sostiene la proprietà lancia e si resta col fondo pieno: si perde un
           effetto, non la chat. */
        try { vista.DefaultBackgroundColor = Color.Transparent; }
        catch { /* pazienza */ }

        /* La cartella del progetto diventa la radice di un dominio finto. È il
           modo con cui WebView2 vuole che le si dia del contenuto locale, e
           senza questa riga la navigazione muore con ERR_FILE_NOT_FOUND —
           provato. `Allow` e non `DenyCors`: la pagina deve poter chiedere le
           emote ai provider veri. */
        try
        {
            motore.SetVirtualHostNameToFolderMapping(
                Navigatore.HOST_LOCALE, Programma.CartellaApp,
                CoreWebView2HostResourceAccessKind.Allow);
        }
        catch { /* su un runtime che non la conosce si tenterà lo stesso */ }

        motore.WebMessageReceived += Messaggio;
        vista.Source = new Uri(indirizzo);
    }

    /* IL PONTE, quello vero. La pagina chiama
       window.chrome.webview.postMessage('pollaio:chiudi') e il messaggio
       arriva qui: niente titoli da leggere, niente attese di 150 millisecondi,
       niente numeri per distinguere due comandi uguali di fila. */
    private void Messaggio(object mittente, CoreWebView2WebMessageReceivedEventArgs e)
    {
        string testo;
        try { testo = e.TryGetWebMessageAsString(); }
        catch { return; }

        if (string.IsNullOrEmpty(testo)) return;
        if (!testo.StartsWith("pollaio:", StringComparison.Ordinal)) return;

        string comando = testo.Substring("pollaio:".Length);
        int taglio = comando.IndexOf(':');
        if (taglio > 0) comando = comando.Substring(0, taglio);
        comando = comando.ToLowerInvariant();

        if (comando == "chiudi") { Close(); return; }
        if (comando == "riduci") { WindowState = FormWindowState.Minimized; return; }
        if (comando == "ricarica") { try { vista.Reload(); } catch { } return; }

        if (comando == "regia")
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo(Application.ExecutablePath, "--regia");
                psi.UseShellExecute = true;
                psi.WorkingDirectory = Programma.Radice;
                Process.Start(psi);
            }
            catch { /* se non parte, si resta con la chat */ }
            return;
        }

        if (comando == "trascina")
        {
            /* IL TRASCINAMENTO, e perché è fatto così.

               La finestra non ha una barra da afferrare, quindi la pagina
               avvisa appena qualcuno preme il tasto sinistro. Qui si lascia la
               cattura del mouse e si dice alla finestra che quel tasto è stato
               premuto sulla sua barra del titolo. Da quell'istante è WINDOWS a
               spostarla, con il suo ciclo di trascinamento: segue il mouse
               finché il tasto resta giù, si aggancia ai bordi, si comporta
               bene sui monitor multipli.

               Va fatto MENTRE il tasto è ancora premuto, ed è il motivo per
               cui il messaggio arriva da un `mousedown` e non da un click:
               con il click il tasto sarebbe già stato rilasciato e Windows
               non avrebbe niente da seguire. */
            Nativo.ReleaseCapture();
            Nativo.SendMessageW(Handle, Nativo.WM_NCLBUTTONDOWN, Nativo.HTCAPTION, IntPtr.Zero);
        }
    }

    protected override void OnFormClosed(FormClosedEventArgs e)
    {
        base.OnFormClosed(e);
        try { vista.Dispose(); } catch { }

        // Il ciclo dei messaggi non ha una finestra principale: senza questa
        // riga il processo resterebbe vivo e invisibile dopo la chiusura.
        Application.ExitThread();
    }
}


/* =============================================================================
   8. NATIVO — le chiamate di sistema che servono
   ============================================================================= */

internal static class Nativo
{
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetProcessDPIAware();

    /// <summary>
    /// Carica una libreria nativa dal percorso completo. Serve a
    /// WebView2Loader.dll, che sta in `lib\` mentre il motore la cerca per
    /// nome accanto all'eseguibile: caricandola prima noi, la sua richiesta
    /// trova un modulo già in memoria e non guarda su disco. Vedi Librerie.
    /// </summary>
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern IntPtr LoadLibraryW(string percorso);

    /* ---- Lo stile della finestra ----
       GWL_STYLE è l'indice dello stile classico. Le costanti sono quelle
       storiche di Windows e non cambiano da trent'anni. */
    public const int GWL_STYLE   = -16;
    public const int GWL_EXSTYLE = -20;

    public const int WS_CAPTION     = 0x00C00000;   // = WS_BORDER | WS_DLGFRAME
    public const int WS_THICKFRAME  = 0x00040000;
    public const int WS_MINIMIZEBOX = 0x00020000;
    public const int WS_MAXIMIZEBOX = 0x00010000;
    public const int WS_SYSMENU     = 0x00080000;
    public const int WS_POPUP       = unchecked((int)0x80000000);

    /* Gli stili ESTESI disegnano i loro bordi per conto loro, e sopravvivono
       benissimo alla rimozione della barra del titolo: è da qui che veniva il
       filo chiaro che restava intorno alla finestra. */
    public const int WS_EX_DLGMODALFRAME = 0x00000001;
    public const int WS_EX_CLIENTEDGE    = 0x00000200;
    public const int WS_EX_STATICEDGE    = 0x00020000;
    public const int WS_EX_WINDOWEDGE    = 0x00000100;

    /* Windows 11 disegna intorno a OGNI finestra un bordo di un pixel e degli
       angoli arrotondati, e non li disegna la finestra: li disegna DWM, il
       compositore, DOPO di lei. Nessuna combinazione di stili li toglie —
       vanno spenti chiedendolo a lui.

       DWMWA_COLOR_NONE non è «trasparente»: è «non disegnarlo affatto», che è
       la cosa giusta. Un bordo trasparente lascerebbe comunque il suo pixel
       nell'inquadratura di OBS.

       Su Windows 10 queste due proprietà non esistono e la chiamata torna un
       codice d'errore che si ignora: là il bordo non c'era già. */
    public const int DWMWA_WINDOW_CORNER_PREFERENCE = 33;
    public const int DWMWA_BORDER_COLOR = 34;
    public const int DWMWCP_DONOTROUND = 1;
    public const int DWMWCP_ROUND = 2;
    public const int DWMWA_COLOR_NONE = unchecked((int)0xFFFFFFFE);

    [DllImport("dwmapi.dll")]
    public static extern int DwmSetWindowAttribute(IntPtr hWnd, int attributo,
                                                   ref int valore, int quanti);

    public const uint SWP_NOMOVE       = 0x0002;
    public const uint SWP_NOSIZE       = 0x0001;
    public const uint SWP_NOZORDER     = 0x0004;
    public const uint SWP_FRAMECHANGED = 0x0020;

    public const int SW_MINIMIZE = 6;

    public const uint WM_CLOSE = 0x0010;

    /* Il trascinamento vero. Si lascia la cattura del mouse e si dice alla
       finestra che il tasto è stato premuto sulla SUA BARRA DEL TITOLO —
       quella che non ha. Da lì in poi è Windows a spostarla, col suo ciclo di
       trascinamento: segue il mouse finché il tasto resta premuto, si aggancia
       ai bordi dello schermo, rispetta i monitor multipli. Rifarlo a mano
       vorrebbe dire riscrivere tutto quello, peggio. */
    public const uint WM_NCLBUTTONDOWN = 0x00A1;
    public static readonly IntPtr HTCAPTION = new IntPtr(2);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool ReleaseCapture();

    public const int VK_LBUTTON = 0x01;

    /* Su Windows a 64 bit lo stile è un valore lungo quanto un puntatore, e
       GetWindowLong troncherebbe. Si dichiarano tutte e due le versioni e si
       sceglie in base alla dimensione di IntPtr: è il modo canonico, e
       sbagliarlo dà un difetto che si vede solo su una delle due
       architetture — cioè quello che nessuno prova. */
    [DllImport("user32.dll", EntryPoint = "GetWindowLong")]
    private static extern int GetWindowLong32(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtr")]
    private static extern IntPtr GetWindowLong64(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", EntryPoint = "SetWindowLong")]
    private static extern int SetWindowLong32(IntPtr hWnd, int nIndex, int dwNewLong);

    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtr")]
    private static extern IntPtr SetWindowLong64(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

    public static int LeggiStile(IntPtr finestra, int quale)
    {
        if (IntPtr.Size == 8) return (int)(long)GetWindowLong64(finestra, quale);
        return GetWindowLong32(finestra, quale);
    }

    public static void ScriviStile(IntPtr finestra, int quale, int stile)
    {
        if (IntPtr.Size == 8) SetWindowLong64(finestra, quale, new IntPtr(stile));
        else SetWindowLong32(finestra, quale, stile);
    }

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr dopo,
                                           int x, int y, int cx, int cy, uint flag);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool MoveWindow(IntPtr hWnd, int x, int y, int larghezza, int altezza,
                                         [MarshalAs(UnmanagedType.Bool)] bool ridisegna);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool ShowWindow(IntPtr hWnd, int comando);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool PostMessage(IntPtr hWnd, uint messaggio, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindow(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = false)]
    public static extern int GetWindowTextW(IntPtr hWnd, StringBuilder testo, int quanti);

    public delegate bool Passante(IntPtr finestra, IntPtr dato);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool EnumWindows(Passante passante, IntPtr dato);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processo);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    /* L'icona della finestra: quella che si vede sulla barra delle
       applicazioni e nell'Alt+Tab. Senza, lì compare il logo di Edge o di
       Chrome — e una finestra senza cornice con l'icona del browser sotto
       continua a dire «sono una pagina web», che è l'esatto contrario di
       quello che questa parte vuole ottenere. */
    public const uint WM_SETICON = 0x0080;
    public const int ICONA_PICCOLA = 0;
    public const int ICONA_GRANDE = 1;

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern IntPtr SendMessageW(IntPtr hWnd, uint messaggio, IntPtr wParam, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Sinistra, Alto, Destra, Basso; }

    [StructLayout(LayoutKind.Sequential)]
    public struct PUNTO { public int X, Y; }

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT rettangolo);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool GetCursorPos(out PUNTO punto);

    [DllImport("user32.dll")]
    public static extern short GetAsyncKeyState(int tasto);

    /// <summary>Il testo della finestra. Per una finestra `--app` di
    /// Chrome o Edge è il title della pagina: è il canale su cui il widget
    /// parla al launcher (vedi la classe Ponte).</summary>
    public static string Titolo(IntPtr finestra)
    {
        try
        {
            StringBuilder b = new StringBuilder(512);
            int quanti = GetWindowTextW(finestra, b, b.Capacity);
            return quanti > 0 ? b.ToString() : "";
        }
        catch { return ""; }
    }
}

}
