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

internal static class Tinte
{
    public static readonly Color Fondo  = ColorTranslator.FromHtml("#07070c");
    public static readonly Color Testo  = ColorTranslator.FromHtml("#f2f0f8");
    public static readonly Color Tenue  = ColorTranslator.FromHtml("#9a93b0");
    public static readonly Color Viola  = ColorTranslator.FromHtml("#8b2fff");
    public static readonly Color Ciano  = ColorTranslator.FromHtml("#22e0ff");
    public static readonly Color Live   = ColorTranslator.FromHtml("#ff3d5e");

    public static readonly Color Bordo  = ColorTranslator.FromHtml("#2e1d52");
}

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
        catch {  }
    }
}

internal static class Programma
{

    public static string Radice
    {
        get { return Path.GetDirectoryName(Application.ExecutablePath); }
    }

    public static string CartellaApp
    {
        get { return Path.Combine(Radice, "app"); }
    }

    [STAThread]
    private static int Main(string[] argomenti)
    {

        Librerie.Aggancia();

        for (int i = 0; i < argomenti.Length; i++)
        {
            if (argomenti[i] == "--crea-icona")
            {
                string png = Path.Combine(CartellaApp, Path.Combine("img", "favicon.png"));
                string ico = Path.Combine(Radice, Path.Combine("avvio", "pollaio.ico"));
                return Icona.Genera(png, ico) ? 0 : 1;
            }
        }

        string ioSono = Path.GetFileNameWithoutExtension(Application.ExecutablePath);
        ModoRegia = ioSono.IndexOf("regia", StringComparison.OrdinalIgnoreCase) >= 0;

        ModoInstalla = ioSono.IndexOf("installa", StringComparison.OrdinalIgnoreCase) >= 0;

        for (int i = 0; i < argomenti.Length; i++)
        {
            if (argomenti[i] == "--regia") ModoRegia = true;
            if (argomenti[i] == "--installa") ModoInstalla = true;
        }

        if (!ModoInstalla) Aggiornamento.PulisciVecchi();

        try { Nativo.SetProcessDPIAware(); } catch {  }

        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        if (ModoInstalla)
        {
            using (Scelta scelta = new Scelta())
            {
                if (scelta.ShowDialog() != DialogResult.OK) return 0;
                if (scelta.Percorso.Length == 0) return 0;
                Destinazione = scelta.Percorso;
            }
        }

        Splash splash = new Splash();
        splash.Show();
        Application.Run(new ApplicationContext());

        if (ModoInstalla)
        {
            if (Installato.Length > 0)
            {
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo(Installato);
                    psi.UseShellExecute = true;
                    psi.WorkingDirectory = Path.GetDirectoryName(Installato);
                    Process.Start(psi);
                }
                catch { }
            }
            return 0;
        }

        Ponte.Ascolta(FinestraChat);
        return 0;
    }

    public static IntPtr FinestraChat = IntPtr.Zero;

    public static bool ModoRegia = false;

    public static bool VetrinaViva = false;

    public static bool ModoInstalla = false;

    public static string Destinazione = "";

    public static string Installato = "";

    public const string VERSIONE = "1.1.0";
}

internal sealed class Preferenze
{
    public int    Larghezza = 400;
    public int    Altezza   = 600;
    public int    X         = -1;
    public int    Y         = -1;
    public string Parametri = "fondo=scuro&tema=notte&scala=100";
    public string Browser   = "auto";
    public bool   Aggiorna  = true;
    public bool   Cornice   = false;

    public int    RegiaLarghezza = 1280;
    public int    RegiaAltezza   = 880;

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
        "# All'avvio guardo da solo se su GitHub c'è una versione più nuova, e se",
        "# c'è la scarico: lo splash dice «Aggiornamento in corso…» e fa vedere la",
        "# percentuale. Se la rete non risponde lascio perdere e apro la chat lo",
        "# stesso. Metti 0 per decidere tu quando aggiornare.",
        "aggiorna=1",
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

                string valore = riga.Substring(taglio + 1).Trim().Trim('"');

                switch (chiave)
                {
                    case "larghezza": p.Larghezza = Numero(valore, p.Larghezza, 160, 4000); break;
                    case "altezza":   p.Altezza   = Numero(valore, p.Altezza,   160, 4000); break;
                    case "x":         p.X         = Numero(valore, p.X,      -20000, 20000); break;
                    case "y":         p.Y         = Numero(valore, p.Y,      -20000, 20000); break;

                    case "parametri":
                        p.Parametri = valore.TrimStart('?', '&').Replace("\"", "").Replace(" ", "");
                        break;
                    case "browser":   p.Browser   = valore.ToLowerInvariant(); break;

                    case "cornice":   p.Cornice   = Acceso(valore); break;
                    case "aggiorna":  p.Aggiorna  = Acceso(valore); break;
                    case "regialarghezza": p.RegiaLarghezza = Numero(valore, p.RegiaLarghezza, 640, 6000); break;
                    case "regiaaltezza":   p.RegiaAltezza   = Numero(valore, p.RegiaAltezza,   480, 4000); break;
                }
            }
        }
        catch
        {

        }

        return p;
    }

    public static bool Riscrivi(string percorso, int larghezza, int altezza)
    {
        try
        {
            if (!File.Exists(percorso)) { Leggi(percorso); }
            if (!File.Exists(percorso)) return false;

            string[] righe = File.ReadAllLines(percorso, Encoding.UTF8);
            bool fattaL = false, fattaA = false;

            for (int i = 0; i < righe.Length; i++)
            {
                string riga = righe[i].TrimStart();
                if (riga.Length == 0 || riga[0] == '#' || riga[0] == ';') continue;

                if (!fattaL && riga.StartsWith("larghezza=", StringComparison.OrdinalIgnoreCase))
                {
                    righe[i] = "larghezza=" + larghezza.ToString(CultureInfo.InvariantCulture);
                    fattaL = true;
                }
                else if (!fattaA && riga.StartsWith("altezza=", StringComparison.OrdinalIgnoreCase))
                {
                    righe[i] = "altezza=" + altezza.ToString(CultureInfo.InvariantCulture);
                    fattaA = true;
                }
            }

            List<string> fuori = new List<string>(righe);
            if (!fattaL) fuori.Add("larghezza=" + larghezza.ToString(CultureInfo.InvariantCulture));
            if (!fattaA) fuori.Add("altezza=" + altezza.ToString(CultureInfo.InvariantCulture));

            File.WriteAllLines(percorso, fuori.ToArray(), new UTF8Encoding(true));
            return true;
        }
        catch { return false; }
    }

    public static bool RiscriviRiga(string percorso, string chiave, string valore)
    {
        try
        {
            if (!File.Exists(percorso)) { Leggi(percorso); }
            if (!File.Exists(percorso)) return false;

            string[] righe = File.ReadAllLines(percorso, Encoding.UTF8);
            string attacco = chiave + "=";
            bool fatta = false;

            for (int i = 0; i < righe.Length; i++)
            {
                string riga = righe[i].TrimStart();
                if (riga.Length == 0 || riga[0] == '#' || riga[0] == ';') continue;

                if (!fatta && riga.StartsWith(attacco, StringComparison.OrdinalIgnoreCase))
                {
                    righe[i] = attacco + valore;
                    fatta = true;
                }
            }

            List<string> fuori = new List<string>(righe);
            if (!fatta) fuori.Add(attacco + valore);

            File.WriteAllLines(percorso, fuori.ToArray(), new UTF8Encoding(true));
            return true;
        }
        catch { return false; }
    }

    public static bool ParametriBuoni(string coda)
    {
        if (coda == null) return false;
        if (coda.Length > 1000) return false;

        for (int i = 0; i < coda.Length; i++)
        {
            char c = coda[i];
            bool buono = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') ||
                         c == '=' || c == '&' || c == '%' || c == '.' || c == '_' ||
                         c == '-' || c == ',' || c == '~' || c == '+';
            if (!buono) return false;
        }

        return true;
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

internal sealed class Splash : Form
{

    private const float L = 460f;
    private const float A = 300f;
    private const float RAGGIO = 16f;

    private const float POLLO_ALTEZZA = 120f;
    private const float POLLO_ALTO    = 17f;
    private const float TITOLO_ALTO   = 146f;
    private const float SOTTO_ALTO    = 190f;
    private const float BARRA_ALTO    = 234f;
    private const float BARRA_SPESSA  = 4f;
    private const float BARRA_MARGINE = 62f;
    private const float FRASE_ALTO    = 252f;

    private const int   PASSO = 15;
    private const int   FASE_MINIMA = 350;

    private readonly Preferenze pref;
    private readonly double scala;
    private Bitmap pollo;
    private Bitmap nebulosa;
    private readonly Font fTitolo, fSotto, fEtichetta, fErrore;
    private readonly StringFormat formatoCentro, formatoTesto;
    private readonly System.Windows.Forms.Timer battito;

    private string frase = "Apro il pollaio…";
    private string errore;
    private float obiettivo;
    private float mostrato;
    private bool uscita;

    public Splash()
    {
        pref = Preferenze.Leggi(Path.Combine(Programma.Radice,
                                Path.Combine("avvio", "pollaio.ini")));

        using (Graphics g = Graphics.FromHwnd(IntPtr.Zero)) scala = g.DpiX / 96.0;

        FormBorderStyle = FormBorderStyle.None;
        StartPosition   = FormStartPosition.CenterScreen;
        ShowInTaskbar   = false;
        TopMost         = true;
        AutoScaleMode   = AutoScaleMode.None;
        BackColor       = Tinte.Fondo;
        Opacity         = 0.0;
        Text            = "Apro il pollaio";
        ClientSize      = new Size((int)Math.Round(L * scala), (int)Math.Round(A * scala));

        SetStyle(ControlStyles.UserPaint
               | ControlStyles.AllPaintingInWmPaint
               | ControlStyles.OptimizedDoubleBuffer, true);

        using (GraphicsPath p = Arrotondato(0, 0, ClientSize.Width, ClientSize.Height, (float)(RAGGIO * scala)))
            Region = new Region(p);

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

        Click += delegate { if (errore != null) Close(); };
    }

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

    protected override CreateParams CreateParams
    {
        get
        {
            CreateParams cp = base.CreateParams;
            cp.ClassStyle |= 0x00020000;
            return cp;
        }
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);

        Thread t = new Thread(Lavora);
        t.IsBackground = true;
        t.Start();
    }

    protected override void OnFormClosed(FormClosedEventArgs e)
    {

        if (!Programma.VetrinaViva) Application.ExitThread();

        battito.Stop();
        if (pollo != null) { pollo.Dispose(); pollo = null; }
        if (nebulosa != null) { nebulosa.Dispose(); nebulosa = null; }
        fTitolo.Dispose(); fSotto.Dispose(); fEtichetta.Dispose(); fErrore.Dispose();
        formatoCentro.Dispose(); formatoTesto.Dispose();
        base.OnFormClosed(e);
    }

    private static Bitmap CaricaPollo(string percorso)
    {

        const double CX = 0.50, CY = 0.46, RX = 0.78, RY = 0.72;
        const double PIENO = 0.58;

        try
        {
            if (!File.Exists(percorso)) return null;

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

                Marshal.Copy(pixel, 0, du.Scan0, Math.Min(pixel.Length, du.Stride * h));
                uscita.UnlockBits(du);
            }

            return uscita;
        }
        catch
        {

            return null;
        }
    }

    private static Bitmap Nebulosa(int w, int h)
    {

        double[][] luci = new double[][]
        {
            new double[] { 0.50, 0.03, 0.70, 0.62, 0.52 },
            new double[] { 0.86, 0.86, 0.44, 0.50, 0.30 },
            new double[] { 0.50, 0.25, 0.26, 0.30, 0.30 }
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

                        double f = t * t * luci[i][4];
                        r  += tinte[i].R * f;
                        v  += tinte[i].G * f;
                        bl += tinte[i].B * f;
                    }

                    double grana = (bayer[y & 3, x & 3] - 7.5) / 16.0;
                    int j = riga + x * 4;
                    px[j    ] = Sazia(bl + grana);
                    px[j + 1] = Sazia(v  + grana);
                    px[j + 2] = Sazia(r  + grana);
                    px[j + 3] = 255;
                }
            }

            Marshal.Copy(px, 0, d.Scan0, px.Length);
            b.UnlockBits(d);
            return b;
        }
        catch
        {

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

    protected override void OnPaint(PaintEventArgs e)
    {
        Graphics g = e.Graphics;

        if (nebulosa != null) g.DrawImageUnscaled(nebulosa, 0, 0);
        else using (SolidBrush b = new SolidBrush(Tinte.Fondo)) g.FillRectangle(b, ClientRectangle);

        g.SmoothingMode      = SmoothingMode.AntiAlias;
        g.InterpolationMode  = InterpolationMode.HighQualityBicubic;
        g.PixelOffsetMode    = PixelOffsetMode.HighQuality;
        g.CompositingQuality = CompositingQuality.HighQuality;

        g.TextRenderingHint  = TextRenderingHint.AntiAlias;
        g.ScaleTransform((float)scala, (float)scala);

        if (pollo != null)
        {
            float hp = POLLO_ALTEZZA;
            float wp = hp * pollo.Width / (float)pollo.Height;
            g.DrawImage(pollo, L / 2f - wp / 2f, POLLO_ALTO, wp, hp);
        }

        using (SolidBrush b = new SolidBrush(Tinte.Testo))
            g.DrawString("il pollaio", fTitolo, b, L / 2f, TITOLO_ALTO, formatoCentro);
        Spaziato(g, "CHAT DI SLAYER_BEARD", fSotto, Tinte.Tenue, L / 2f, SOTTO_ALTO);

        if (errore == null) DisegnaBarra(g);
        DisegnaFrase(g);

        using (GraphicsPath p = Arrotondato(0.5f, 0.5f, L - 1f, A - 1f, RAGGIO))
        using (Pen pen = new Pen(Color.FromArgb(46, 255, 255, 255), 1f))
            g.DrawPath(pen, p);
    }

    private void DisegnaBarra(Graphics g)
    {
        float bx = BARRA_MARGINE, by = BARRA_ALTO;
        float bw = L - BARRA_MARGINE * 2f, bh = BARRA_SPESSA;
        float pieno = Math.Max(bh, bw * Math.Max(0f, Math.Min(1f, mostrato)));

        using (GraphicsPath p = Arrotondato(bx, by, bw, bh, bh / 2f))
        using (SolidBrush b = new SolidBrush(Color.FromArgb(34, 255, 255, 255)))
            g.FillPath(b, p);

        using (LinearGradientBrush lg = new LinearGradientBrush(
                   new RectangleF(bx, by - 4f, bw, bh + 8f),
                   Color.FromArgb(62, Tinte.Viola), Color.FromArgb(62, Tinte.Ciano), 0f))
        using (GraphicsPath p = Arrotondato(bx, by - 3f, pieno, bh + 6f, (bh + 6f) / 2f))
        {
            lg.WrapMode = WrapMode.TileFlipX;
            g.FillPath(lg, p);
        }

        using (LinearGradientBrush lg = new LinearGradientBrush(
                   new RectangleF(bx, by - 1f, bw, bh + 2f), Tinte.Viola, Tinte.Ciano, 0f))
        using (GraphicsPath p = Arrotondato(bx, by, pieno, bh, bh / 2f))
        {
            lg.WrapMode = WrapMode.TileFlipX;
            g.FillPath(lg, p);
        }

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

        using (SolidBrush b = new SolidBrush(Tinte.Live))
            g.DrawString(errore, fErrore, b, new RectangleF(34f, 224f, L - 68f, 46f), formatoTesto);
        Spaziato(g, "FAI CLIC PER CHIUDERE", fEtichetta, Tinte.Tenue, L / 2f, 276f);
    }

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

                Blend bl = new Blend(5);
                bl.Positions = new float[] { 0f, 0.42f, 0.68f, 0.88f, 1f };
                bl.Factors   = new float[] { 0f, 0.05f, 0.20f, 0.55f, 1f };
                pg.Blend = bl;

                g.FillPath(pg, p);
            }
        }
    }

    private void Spaziato(Graphics g, string testo, Font f, Color colore, float cx, float y)
    {
        if (string.IsNullOrEmpty(testo)) return;

        StringBuilder b = new StringBuilder(testo.Length * 2);
        for (int i = 0; i < testo.Length; i++)
        {
            if (i > 0) b.Append(' ');
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

    private void Fotogramma(object mittente, EventArgs e)
    {
        const double DISSOLVENZA = 0.08;
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

        if (Math.Abs(obiettivo - mostrato) > 0.0008f)
        {
            mostrato += (obiettivo - mostrato) * 0.16f;
            ridisegna = true;
        }

        if (ridisegna) Invalidate();
    }

    private void Annuncia(string testo, float quota)
    {
        Rimanda(delegate
        {
            frase = testo;
            obiettivo = quota;
            Invalidate();
        });
    }

    private void Fatale(string testo)
    {
        Rimanda(delegate
        {
            errore = testo;
            Cursor = Cursors.Hand;
            Invalidate();
        });
    }

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

        }
    }

    private void Lavora()
    {
        if (Programma.ModoInstalla) { FasiInstallazione(); return; }

        bool regia = Programma.ModoRegia;

        Preferenze uso = regia ? pref.PerLaRegia() : pref;

        string radice = Programma.Radice;
        string nomeFile = regia ? "regia.html" : "pollaio.html";
        string html = Path.Combine(Programma.CartellaApp, nomeFile);
        Stopwatch cr;

        cr = Stopwatch.StartNew();
        Annuncia(regia ? "Apro la regia…" : "Apro il pollaio…", 0.10f);
        if (!File.Exists(html))
        {
            Fatale("Manca " + nomeFile + ": il launcher deve stare nella stessa cartella.");
            return;
        }
        Respira(cr, FASE_MINIMA);

        if (!regia && uso.Aggiorna && Aggiorna()) return;

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

        cr = Stopwatch.StartNew();
        if (regia)
        {

            Annuncia("Preparo le manopole…", 0.55f);
        }
        else
        {
            Annuncia("Controllo la rete…", 0.55f);
            if (!Rete.Risponde())
            {

                Annuncia("Rete lenta, vado lo stesso…", 0.55f);
                Thread.Sleep(650);
            }
        }
        Respira(cr, FASE_MINIMA);

        cr = Stopwatch.StartNew();
        Annuncia(regia ? "Apro il banco di lavoro…" : "Mi collego al server…", 0.80f);

        if (vetrina)
        {

            string dove = Navigatore.IndirizzoLocale(nomeFile, uso);
            if (regia) dove += "&finw=" + pref.Larghezza + "&finh=" + pref.Altezza;
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

        cr = Stopwatch.StartNew();
        Annuncia("Ci siamo.", 1.00f);

        IntPtr finestra = Navigatore.AttendiFinestra(avviato, browser, partenza, 12000, "pollaio");

        Cornice.Ricorda(uso.Larghezza, uso.Altezza, scala, !uso.Cornice);

        if (finestra != IntPtr.Zero)
        {

            if (!uso.Cornice) Cornice.Togli(finestra, uso.Larghezza, uso.Altezza, scala);
            Cornice.MettiIcona(finestra);
        }

        Programma.FinestraChat = finestra;

        Respira(cr, 550);

        Congeda();
    }

    private bool Aggiorna()
    {
        Stopwatch cr = Stopwatch.StartNew();
        Annuncia("Controllo gli aggiornamenti…", 0.18f);

        Novita nuova = Aggiornamento.Cerca();
        Respira(cr, FASE_MINIMA);

        if (nuova == null) return false;

        string zip = Path.Combine(Path.GetTempPath(), "pollaio-agg-" + Guid.NewGuid().ToString("N") + ".zip");
        bool andata = false;

        try
        {
            Annuncia("Aggiornamento in corso… 0%", 0.22f);

            Recupero.Scarica(nuova.Zip, zip, delegate (int p)
            {
                Annuncia("Aggiornamento in corso… " + p + "%", 0.22f + p * 0.0060f);
            });

            cr = Stopwatch.StartNew();
            Annuncia("Metto a posto i file…", 0.88f);
            andata = Aggiornamento.Applica(zip);
            Respira(cr, 700);
        }
        catch
        {
            andata = false;
        }
        finally
        {
            try { if (File.Exists(zip)) File.Delete(zip); } catch { }
        }

        if (!andata)
        {

            Annuncia("Aggiornamento saltato, apro quello che ho…", 0.30f);
            Respira(Stopwatch.StartNew(), 1100);
            return false;
        }

        Annuncia("Aggiornato alla " + nuova.Tag + ": riparto.", 1.00f);
        Respira(Stopwatch.StartNew(), 1400);

        Aggiornamento.Riparti();
        Congeda();
        return true;
    }

    private void FasiInstallazione()
    {
        string destinazione = Programma.Destinazione;
        string zip = Path.Combine(Path.GetTempPath(), "pollaio-" + Guid.NewGuid().ToString("N") + ".zip");
        Stopwatch cr;

        try
        {
            cr = Stopwatch.StartNew();
            Annuncia("Preparo l'installazione…", 0.06f);
            Directory.CreateDirectory(destinazione);
            Respira(cr, 900);

            cr = Stopwatch.StartNew();
            Annuncia("Cerco l'ultima versione…", 0.16f);
            string indirizzo = Recupero.TrovaArchivio();
            if (indirizzo == null)
            {
                Fatale("Non trovo nessuna versione pubblicata. Controlla la rete e riprova.");
                return;
            }
            Respira(cr, 1100);

            cr = Stopwatch.StartNew();
            Annuncia("Installazione in corso…", 0.20f);
            Recupero.Scarica(indirizzo, zip, delegate (int p)
            {
                Annuncia("Installazione in corso…", 0.20f + p * 0.0055f);
            });
            Respira(cr, 900);

            cr = Stopwatch.StartNew();
            Annuncia("Metto a posto i file…", 0.82f);
            Recupero.Svuota(destinazione);
            System.IO.Compression.ZipFile.ExtractToDirectory(zip, destinazione);
            Respira(cr, 1000);

            string eseguibile = Path.Combine(destinazione, "Pollaio.exe");
            if (!File.Exists(eseguibile))
            {
                Fatale("L'archivio scaricato non conteneva Pollaio.exe.");
                return;
            }

            cr = Stopwatch.StartNew();
            Annuncia("Creo il collegamento sul desktop…", 0.93f);
            Recupero.Collegamento(eseguibile);
            Respira(cr, 900);

            Programma.Installato = eseguibile;

            cr = Stopwatch.StartNew();
            Annuncia("Fatto: il pollaio è sul desktop.", 1.00f);
            Respira(cr, 1600);

            Congeda();
        }
        catch (Exception ex)
        {
            Fatale("Non ci sono riuscito: " + ex.Message);
        }
        finally
        {
            try { if (File.Exists(zip)) File.Delete(zip); } catch { }
        }
    }
    private static void Respira(Stopwatch cr, int minimo)
    {
        int resto = minimo - (int)cr.ElapsedMilliseconds;
        if (resto > 0) Thread.Sleep(resto);
    }
}

internal static class Navigatore
{

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

    public static string Trova(string preferito)
    {
        bool primaChrome = (preferito == "chrome");

        string[][] ordine = primaChrome
            ? new string[][] { PercorsiChrome(), PercorsiEdge() }
            : new string[][] { PercorsiEdge(), PercorsiChrome() };

        for (int g = 0; g < ordine.Length; g++)
            for (int i = 0; i < ordine[g].Length; i++)
                if (File.Exists(ordine[g][i])) return ordine[g][i];

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

    public static Process Apri(string browser, string html, Preferenze pref, double scala)
    {
        ProcessStartInfo psi = new ProcessStartInfo(browser, Comando(html, pref, scala));
        psi.UseShellExecute  = false;
        psi.CreateNoWindow   = true;
        psi.WorkingDirectory = Path.GetDirectoryName(browser);

        return Process.Start(psi);
    }

    public static string Indirizzo(string html, Preferenze pref)
    {

        string indirizzo = new Uri(Path.GetFullPath(html)).AbsoluteUri;

        string coda = pref.Parametri;
        coda = (coda.Length > 0 ? coda + "&" : "") + "finestra=1";
        return indirizzo + "?" + coda;
    }

    public static Point DoveAprirla(Preferenze pref, double scala)
    {
        return Posizione(pref, scala);
    }

    public const string HOST_LOCALE = "pollaio.locale";

    public static string IndirizzoLocale(string nomeFile, Preferenze pref)
    {
        string coda = pref.Parametri;
        coda = (coda.Length > 0 ? coda + "&" : "") + "finestra=1";
        return "https://" + HOST_LOCALE + "/" + nomeFile + "?" + coda;
    }

    public static string Comando(string html, Preferenze pref, double scala)
    {

        string indirizzo = Indirizzo(html, pref);

        Point dove = Posizione(pref, scala);

        string profilo = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            @"Pollaio\profilo");
        try { Directory.CreateDirectory(profilo); } catch {  }

        StringBuilder a = new StringBuilder();

        a.Append("--app=\"").Append(indirizzo).Append("\" ");
        a.Append("--window-size=").Append(pref.Larghezza).Append(',').Append(pref.Altezza).Append(' ');
        a.Append("--window-position=").Append(dove.X).Append(',').Append(dove.Y).Append(' ');

        a.Append("--user-data-dir=\"").Append(profilo).Append("\" ");

        a.Append("--no-first-run ");
        a.Append("--no-default-browser-check ");
        a.Append("--disable-session-crashed-bubble ");
        a.Append("--hide-crash-restore-bubble ");
        a.Append("--noerrdialogs ");

        a.Append("--disable-features=Translate,TranslateUI,msEdgeIdentityProvisioning ");

        a.Append("--autoplay-policy=no-user-gesture-required");

        return a.ToString();
    }

    private static Point Posizione(Preferenze pref, double scala)
    {
        const int MARGINE = 24;

        Rectangle area = Screen.PrimaryScreen.WorkingArea;
        int sinistra = (int)Math.Round(area.Left   / scala);
        int alto     = (int)Math.Round(area.Top    / scala);
        int destra   = (int)Math.Round(area.Right  / scala);

        int x = (pref.X == -1) ? destra - pref.Larghezza - MARGINE : pref.X;
        int y = (pref.Y == -1) ? alto + MARGINE : pref.Y;

        if (x < sinistra) x = sinistra;
        return new Point(x, y);
    }

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

                if (ripiego == IntPtr.Zero) ripiego = CercaFinestra(nostri, "");
            }

            Thread.Sleep(120);
        }

        return ripiego;
    }

    private static List<uint> ProcessiDelBrowser(string nome, DateTime partenza, Process avviato)
    {
        List<uint> fuori = new List<uint>();

        if (avviato != null)
        {
            try { if (!avviato.HasExited) fuori.Add((uint)avviato.Id); }
            catch {  }
        }

        Process[] tutti = Process.GetProcessesByName(nome);
        try
        {
            for (int i = 0; i < tutti.Length; i++)
            {
                try
                {

                    if (tutti[i].StartTime < partenza.AddSeconds(-1)) continue;
                    uint id = (uint)tutti[i].Id;
                    if (!fuori.Contains(id)) fuori.Add(id);
                }
                catch {  }
            }
        }
        finally
        {
            for (int i = 0; i < tutti.Length; i++) tutti[i].Dispose();
        }

        return fuori;
    }

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
                return false;
            }
            catch { return true; }
        }, IntPtr.Zero);

        return trovata;
    }
}

internal static class Rete
{
    private const string SONDA = "https://7tv.io/v3/emote-sets/global";
    private const int TETTO = 4000;

    public static bool Risponde()
    {

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

            return ex.Response != null;
        }
        catch
        {
            return false;
        }
    }
}

internal static class Icona
{
    private static readonly int[] MISURE = new int[] { 16, 24, 32, 48, 64, 128, 256 };
    private const int SOGLIA_PNG = 128;

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

                w.Write((short)0);
                w.Write((short)1);
                w.Write((short)corpi.Count);

                int scorrimento = 6 + 16 * corpi.Count;
                for (int i = 0; i < corpi.Count; i++)
                {

                    w.Write((byte)(lati[i] >= 256 ? 0 : lati[i]));
                    w.Write((byte)(lati[i] >= 256 ? 0 : lati[i]));
                    w.Write((byte)0);
                    w.Write((byte)0);
                    w.Write((short)1);
                    w.Write((short)32);
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

    private static byte[] InDib(Bitmap b)
    {
        int w = b.Width, h = b.Height;
        int passoMaschera = ((w + 31) / 32) * 4;
        int byteMaschera = passoMaschera * h;

        BitmapData d = b.LockBits(new Rectangle(0, 0, w, h),
                          ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        byte[] pixel = new byte[d.Stride * h];
        Marshal.Copy(d.Scan0, pixel, 0, pixel.Length);
        b.UnlockBits(d);

        using (MemoryStream ms = new MemoryStream())
        using (BinaryWriter s = new BinaryWriter(ms))
        {
            s.Write(40);
            s.Write(w);
            s.Write(h * 2);
            s.Write((short)1);
            s.Write((short)32);
            s.Write(0);
            s.Write(w * h * 4 + byteMaschera);
            s.Write(0); s.Write(0);
            s.Write(0); s.Write(0);

            for (int y = h - 1; y >= 0; y--)
                s.Write(pixel, y * d.Stride, w * 4);

            s.Write(new byte[byteMaschera]);

            s.Flush();
            return ms.ToArray();
        }
    }
}

internal static class Cornice
{

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

    public static void Rinfresca(IntPtr finestra)
    {
        if (!nuda || finestra == IntPtr.Zero) return;

        try
        {
            int stile = Nativo.LeggiStile(finestra, Nativo.GWL_STYLE);
            if (stile == 0) return;

            bool sporca = (stile & (Nativo.WS_CAPTION | Nativo.WS_THICKFRAME)) != 0;
            if (!sporca) return;

            Togli(finestra, larghezzaVoluta, altezzaVoluta, scalaVoluta);
        }
        catch {  }
    }

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
        catch {  }
    }

    public static void Togli(IntPtr finestra, int larghezza, int altezza, double scala)
    {
        if (finestra == IntPtr.Zero) return;

        try
        {

            int stile = Nativo.LeggiStile(finestra, Nativo.GWL_STYLE);
            if (stile != 0)
            {
                stile &= ~(Nativo.WS_CAPTION | Nativo.WS_THICKFRAME |
                           Nativo.WS_MINIMIZEBOX | Nativo.WS_MAXIMIZEBOX | Nativo.WS_SYSMENU);
                stile |= Nativo.WS_POPUP;
                Nativo.ScriviStile(finestra, Nativo.GWL_STYLE, stile);
            }

            int esteso = Nativo.LeggiStile(finestra, Nativo.GWL_EXSTYLE);
            if (esteso != 0)
            {
                esteso &= ~(Nativo.WS_EX_DLGMODALFRAME | Nativo.WS_EX_CLIENTEDGE |
                            Nativo.WS_EX_STATICEDGE | Nativo.WS_EX_WINDOWEDGE);
                Nativo.ScriviStile(finestra, Nativo.GWL_EXSTYLE, esteso);
            }

            try
            {
                int nessunBordo = Nativo.DWMWA_COLOR_NONE;
                Nativo.DwmSetWindowAttribute(finestra, Nativo.DWMWA_BORDER_COLOR,
                    ref nessunBordo, sizeof(int));

                int angoliVivi = Nativo.DWMWCP_DONOTROUND;
                Nativo.DwmSetWindowAttribute(finestra, Nativo.DWMWA_WINDOW_CORNER_PREFERENCE,
                    ref angoliVivi, sizeof(int));
            }
            catch {  }

            Nativo.SetWindowPos(finestra, IntPtr.Zero, 0, 0, 0, 0,
                Nativo.SWP_NOMOVE | Nativo.SWP_NOSIZE | Nativo.SWP_NOZORDER | Nativo.SWP_FRAMECHANGED);

            RimettiMisura(finestra, larghezza, altezza, scala);
        }
        catch {  }
    }

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

    private const string PREFISSO = "pollaio:";
    private const int PASSO = 150;

    private static string ultimoFatto = "";

    public static void Ascolta(IntPtr finestra)
    {
        if (finestra == IntPtr.Zero) return;

        int giri = 0;

        while (true)
        {
            try
            {
                if (!Nativo.IsWindow(finestra)) return;

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
                        Esegui(finestra, gettone);
                    }
                }
            }
            catch {  }

            Thread.Sleep(PASSO);
        }
    }

    private static string Gettone(string titolo, int dove)
    {
        string resto = titolo.Substring(dove + PREFISSO.Length);
        int spazio = resto.IndexOf(' ');
        if (spazio >= 0) resto = resto.Substring(0, spazio);
        return resto.Trim();
    }

    private static string Comando(string gettone)
    {
        int taglio = gettone.IndexOf(':');
        return (taglio > 0 ? gettone.Substring(0, taglio) : gettone).ToLowerInvariant();
    }

    private static void Esegui(IntPtr finestra, string gettone)
    {
        string comando = Comando(gettone);

        if (comando == "chiudi")
        {

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

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo(Application.ExecutablePath, "--regia");
                psi.UseShellExecute = true;
                psi.WorkingDirectory = Programma.Radice;
                Process.Start(psi);
            }
            catch {  }
            return;
        }

        if (comando == "misura")
        {
            string coda = gettone.Substring("misura".Length).TrimStart(':');

            int fine = coda.IndexOf(':');
            if (fine >= 0) coda = coda.Substring(0, fine);

            string[] pezzi = coda.Split('x');
            int l, a;
            if (pezzi.Length == 2 &&
                int.TryParse(pezzi[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out l) &&
                int.TryParse(pezzi[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out a))
            {
                l = Math.Max(160, Math.Min(4000, l));
                a = Math.Max(160, Math.Min(4000, a));

                string ini = Path.Combine(Programma.Radice, Path.Combine("avvio", "pollaio.ini"));
                Preferenze.Riscrivi(ini, l, a);
                Sorelle.Ridimensiona(l, a, Sorelle.Scala());
            }
            return;
        }

        if (comando == "parametri")
        {
            const string testa = "parametri:";
            if (gettone.Length < testa.Length) return;

            string coda = gettone.Substring(testa.Length);

            int fine = coda.LastIndexOf(':');
            coda = fine >= 0 ? coda.Substring(0, fine) : "";

            if (!Preferenze.ParametriBuoni(coda)) return;

            string ini = Path.Combine(Programma.Radice, Path.Combine("avvio", "pollaio.ini"));
            Preferenze.RiscriviRiga(ini, "parametri", coda);
            return;
        }

        if (comando == "trascina") Trascina(finestra);
    }

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

internal static class Sorelle
{
    public const string TITOLO_CHAT  = "il pollaio";
    public const string TITOLO_REGIA = "la regia del pollaio";

    public static double Scala()
    {
        try
        {
            using (Graphics g = Graphics.FromHwnd(IntPtr.Zero)) return g.DpiX / 96.0;
        }
        catch { return 1.0; }
    }

    public static int Ridimensiona(int larghezza, int altezza, double scala)
    {
        int l = (int)Math.Round(larghezza * scala);
        int a = (int)Math.Round(altezza * scala);
        if (l < 80 || a < 80) return 0;

        uint mio;
        try { mio = (uint)Process.GetCurrentProcess().Id; }
        catch { return 0; }

        int quante = 0;

        try
        {
            Nativo.EnumWindows(delegate (IntPtr finestra, IntPtr dato)
            {
                try
                {
                    if (!Nativo.IsWindowVisible(finestra)) return true;

                    uint suo;
                    Nativo.GetWindowThreadProcessId(finestra, out suo);
                    if (suo == mio) return true;

                    string titolo = Nativo.Titolo(finestra);

                    if (titolo == TITOLO_CHAT)
                    {
                        Nativo.PostMessage(finestra, (uint)Nativo.WM_MISURA,
                                           (IntPtr)larghezza, (IntPtr)altezza);
                        quante++;
                        return true;
                    }

                    if (!titolo.StartsWith(TITOLO_CHAT + " —", StringComparison.Ordinal)) return true;

                    Nativo.RECT r;
                    if (!Nativo.GetWindowRect(finestra, out r)) return true;

                    Nativo.MoveWindow(finestra, r.Sinistra, r.Alto, l, a, true);
                    quante++;
                }
                catch {  }

                return true;
            }, IntPtr.Zero);
        }
        catch {  }

        return quante;
    }
}

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
        catch {  }
    }
}

internal sealed class Vetrina : Form
{
    private const string ATTIVAZIONE = "https://www.twitch.tv/activate";

    private readonly WebView2 vista = new WebView2();
    private readonly string indirizzo;
    private readonly double scala;

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
        this.scala = scala;

        FormBorderStyle = FormBorderStyle.None;
        StartPosition = FormStartPosition.Manual;
        ShowInTaskbar = true;
        KeyPreview = true;

        Text = Programma.ModoRegia ? Sorelle.TITOLO_REGIA : Sorelle.TITOLO_CHAT;

        BackColor = Color.Black;

        Size = new Size((int)Math.Round(pref.Larghezza * scala),
                        (int)Math.Round(pref.Altezza * scala));

        MinimumSize = new Size((int)Math.Round(160 * scala), (int)Math.Round(160 * scala));

        Point dove = Navigatore.DoveAprirla(pref, scala);
        Location = new Point((int)Math.Round(dove.X * scala), (int)Math.Round(dove.Y * scala));

        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); }
        catch {  }

        vista.Dock = DockStyle.Fill;

        string profilo = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            @"Pollaio\vetrina");
        try { Directory.CreateDirectory(profilo); } catch {  }

        CoreWebView2CreationProperties proprieta = new CoreWebView2CreationProperties();
        proprieta.UserDataFolder = profilo;

        proprieta.AdditionalBrowserArguments = "--autoplay-policy=no-user-gesture-required";
        vista.CreationProperties = proprieta;

        vista.CoreWebView2InitializationCompleted += Pronta;
        Controls.Add(vista);
    }

    protected override CreateParams CreateParams
    {
        get
        {
            CreateParams cp = base.CreateParams;
            cp.Style |= Nativo.WS_THICKFRAME;
            return cp;
        }
    }

    protected override void WndProc(ref Message m)
    {
        const int WM_NCCALCSIZE = 0x0083;

        if (m.Msg == WM_NCCALCSIZE && m.WParam != IntPtr.Zero)
        {
            m.Result = IntPtr.Zero;
            return;
        }

        if (m.Msg == Nativo.WM_MISURA)
        {
            Misura(m.WParam.ToInt32(), m.LParam.ToInt32());
            m.Result = IntPtr.Zero;
            return;
        }

        if (m.Msg == Nativo.WM_EXITSIZEMOVE) { RicordaMisura(); }

        base.WndProc(ref m);
    }

    private static bool CodiceBuono(string codice)
    {
        if (string.IsNullOrEmpty(codice)) return false;
        if (codice.Length < 4 || codice.Length > 16) return false;

        for (int i = 0; i < codice.Length; i++)
        {
            char c = codice[i];
            bool buono = (c >= '0' && c <= '9') ||
                         (c >= 'a' && c <= 'z') ||
                         (c >= 'A' && c <= 'Z');
            if (!buono) return false;
        }
        return true;
    }

    private static IntPtr ZonaDiBordo(string dove)
    {
        switch (dove)
        {
            case "n":  return Nativo.HTTOP;
            case "s":  return Nativo.HTBOTTOM;
            case "e":  return Nativo.HTRIGHT;
            case "o":  return Nativo.HTLEFT;
            case "no": return Nativo.HTTOPLEFT;
            case "ne": return Nativo.HTTOPRIGHT;
            case "so": return Nativo.HTBOTTOMLEFT;
            case "se": return Nativo.HTBOTTOMRIGHT;
        }
        return IntPtr.Zero;
    }

    private void RicordaMisura()
    {
        try
        {
            if (WindowState != FormWindowState.Normal) return;

            int l = (int)Math.Round(Size.Width / scala);
            int a = (int)Math.Round(Size.Height / scala);

            l = Math.Max(160, Math.Min(4000, l));
            a = Math.Max(160, Math.Min(4000, a));

            string ini = Path.Combine(Programma.Radice, Path.Combine("avvio", "pollaio.ini"));

            if (Programma.ModoRegia)
            {
                Preferenze.RiscriviRiga(ini, "regialarghezza", l.ToString(CultureInfo.InvariantCulture));
                Preferenze.RiscriviRiga(ini, "regiaaltezza", a.ToString(CultureInfo.InvariantCulture));
                return;
            }

            Preferenze.Riscrivi(ini, l, a);
        }
        catch {  }
    }

    private void Misura(int larghezza, int altezza)
    {
        if (larghezza < 160 || larghezza > 4000) return;
        if (altezza < 160 || altezza > 4000) return;

        try
        {
            if (WindowState != FormWindowState.Normal) WindowState = FormWindowState.Normal;

            Size = new Size((int)Math.Round(larghezza * scala),
                            (int)Math.Round(altezza * scala));
        }
        catch {  }
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);
        Ammorbidisci();

        try { vista.EnsureCoreWebView2Async(null); }
        catch { Close(); }
    }

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

            Color c = Tinte.Bordo;
            int colore = (c.B << 16) | (c.G << 8) | c.R;
            esitoBordo = Nativo.DwmSetWindowAttribute(Handle, Nativo.DWMWA_BORDER_COLOR,
                ref colore, sizeof(int));
        }
        catch {  }

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

            motore.Settings.AreDefaultContextMenusEnabled = false;
            motore.Settings.AreBrowserAcceleratorKeysEnabled = false;
            motore.Settings.AreDevToolsEnabled = false;
            motore.Settings.IsStatusBarEnabled = false;
            motore.Settings.IsZoomControlEnabled = false;
        }
        catch {  }

        try { vista.DefaultBackgroundColor = Color.Transparent; }
        catch {  }

        try
        {
            motore.SetVirtualHostNameToFolderMapping(
                Navigatore.HOST_LOCALE, Programma.CartellaApp,
                CoreWebView2HostResourceAccessKind.Allow);
        }
        catch {  }

        motore.WebMessageReceived += Messaggio;
        vista.Source = new Uri(indirizzo);
    }

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
            catch {  }
            return;
        }

        if (comando == "attiva")
        {
            string codice = testo.Substring("pollaio:attiva".Length).TrimStart(':');

            int fineCodice = codice.IndexOf(':');
            if (fineCodice >= 0) codice = codice.Substring(0, fineCodice);

            string dove = ATTIVAZIONE;
            if (CodiceBuono(codice)) dove = ATTIVAZIONE + "?device-code=" + codice;

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo(dove);
                psi.UseShellExecute = true;
                Process.Start(psi);
                Rispondi("attiva:1");
            }
            catch { Rispondi("attiva:0"); }
            return;
        }

        if (comando == "misura")
        {
            string coda = testo.Substring("pollaio:misura".Length).TrimStart(':');

            int fine = coda.IndexOf(':');
            if (fine >= 0) coda = coda.Substring(0, fine);

            string[] pezzi = coda.Split('x');
            int l, a;
            if (pezzi.Length == 2 &&
                int.TryParse(pezzi[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out l) &&
                int.TryParse(pezzi[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out a))
            {
                l = Math.Max(160, Math.Min(4000, l));
                a = Math.Max(160, Math.Min(4000, a));
                string ini = Path.Combine(Programma.Radice, Path.Combine("avvio", "pollaio.ini"));
                Preferenze.Riscrivi(ini, l, a);

                int quante = Sorelle.Ridimensiona(l, a, scala);

                if (!Programma.ModoRegia)
                {
                    Misura(l, a);
                    quante++;
                }

                Rispondi("misura:" + quante.ToString(CultureInfo.InvariantCulture));
            }
            return;
        }

        if (comando == "parametri")
        {
            const string testa = "pollaio:parametri:";
            if (testo.Length < testa.Length) return;

            string coda = testo.Substring(testa.Length);

            int fine = coda.LastIndexOf(':');
            coda = fine >= 0 ? coda.Substring(0, fine) : "";

            if (!Preferenze.ParametriBuoni(coda)) { Rispondi("parametri:0"); return; }

            string ini = Path.Combine(Programma.Radice, Path.Combine("avvio", "pollaio.ini"));
            Rispondi("parametri:" + (Preferenze.RiscriviRiga(ini, "parametri", coda) ? "1" : "0"));
            return;
        }

        if (comando == "ridimensiona")
        {
            string dove = testo.Substring("pollaio:ridimensiona".Length).TrimStart(':');

            int stacco = dove.IndexOf(':');
            if (stacco >= 0) dove = dove.Substring(0, stacco);

            IntPtr zona = ZonaDiBordo(dove.ToLowerInvariant());
            if (zona == IntPtr.Zero) return;

            if (WindowState != FormWindowState.Normal) return;

            Nativo.ReleaseCapture();
            Nativo.SendMessageW(Handle, Nativo.WM_NCLBUTTONDOWN, zona, IntPtr.Zero);
            return;
        }

        if (comando == "trascina")
        {

            Nativo.ReleaseCapture();
            Nativo.SendMessageW(Handle, Nativo.WM_NCLBUTTONDOWN, Nativo.HTCAPTION, IntPtr.Zero);
        }
    }

    private void Rispondi(string cosa)
    {
        try { vista.CoreWebView2.PostWebMessageAsString("pollaio:" + cosa); }
        catch {  }
    }

    protected override void OnFormClosed(FormClosedEventArgs e)
    {
        base.OnFormClosed(e);
        try { vista.Dispose(); } catch { }

        Application.ExitThread();
    }
}

internal sealed class Scelta : Form
{
    private readonly TextBox dove;
    public string Percorso { get { return dove.Text.Trim(); } }

    public Scelta()
    {
        FormBorderStyle = FormBorderStyle.None;
        StartPosition = FormStartPosition.CenterScreen;
        ShowInTaskbar = true;
        BackColor = Tinte.Fondo;
        ClientSize = new Size(560, 250);
        Text = "Installa il pollaio";
        KeyPreview = true;

        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); }
        catch { }

        Etichetta("il pollaio",
            new Font("Segoe UI", 27f, FontStyle.Bold, GraphicsUnit.Pixel), Tinte.Testo, 34, 30, 480, 40);

        Etichetta("Scelgo dove metterlo, poi ci penso io: scarico l'ultima versione, la " +
                  "scompatto e ti lascio il collegamento sul desktop.",
            new Font("Segoe UI", 13f, FontStyle.Regular, GraphicsUnit.Pixel), Tinte.Tenue, 34, 78, 492, 46);

        dove = new TextBox();
        dove.Location = new Point(34, 136);
        dove.Size = new Size(376, 28);
        dove.BorderStyle = BorderStyle.FixedSingle;
        dove.BackColor = ColorTranslator.FromHtml("#12101f");
        dove.ForeColor = Tinte.Testo;
        dove.Font = new Font("Consolas", 12f, FontStyle.Regular, GraphicsUnit.Pixel);
        dove.Text = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Pollaio");
        Controls.Add(dove);

        Button sfoglia = Bottone("Sfoglia", 420, 134, 106, 32, false);
        sfoglia.Click += delegate { Cerca(); };

        Button vai = Bottone("Installa", 34, 194, 150, 38, true);
        vai.Click += delegate { DialogResult = DialogResult.OK; Close(); };

        Button lascia = Bottone("Annulla", 196, 194, 116, 38, false);
        lascia.Click += delegate { DialogResult = DialogResult.Cancel; Close(); };

        AcceptButton = vai;
        KeyDown += delegate (object m, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Escape) { DialogResult = DialogResult.Cancel; Close(); }
        };
    }

    private void Etichetta(string testo, Font f, Color c, int x, int y, int w, int h)
    {
        Label l = new Label();
        l.Text = testo; l.Font = f; l.ForeColor = c;
        l.BackColor = Color.Transparent;
        l.Location = new Point(x, y); l.Size = new Size(w, h);
        Controls.Add(l);
    }

    private Button Bottone(string testo, int x, int y, int w, int h, bool pieno)
    {
        Button b = new Button();
        b.Text = testo;
        b.Location = new Point(x, y); b.Size = new Size(w, h);
        b.FlatStyle = FlatStyle.Flat;
        b.FlatAppearance.BorderSize = 1;
        b.FlatAppearance.BorderColor = pieno ? Tinte.Viola : ColorTranslator.FromHtml("#2e2b40");
        b.BackColor = pieno ? Tinte.Viola : Tinte.Fondo;
        b.ForeColor = Tinte.Testo;
        b.Font = new Font("Segoe UI", 13f, FontStyle.Regular, GraphicsUnit.Pixel);
        b.Cursor = Cursors.Hand;
        Controls.Add(b);
        return b;
    }

    private void Cerca()
    {
        using (FolderBrowserDialog f = new FolderBrowserDialog())
        {
            f.Description = "Dove metto il pollaio";
            f.ShowNewFolderButton = true;
            if (f.ShowDialog(this) == DialogResult.OK && f.SelectedPath.Length > 0)
                dove.Text = Path.Combine(f.SelectedPath, "Pollaio");
        }
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);
        try
        {
            int tondi = Nativo.DWMWCP_ROUND;
            Nativo.DwmSetWindowAttribute(Handle, Nativo.DWMWA_WINDOW_CORNER_PREFERENCE, ref tondi, sizeof(int));
            Color c = Tinte.Bordo;
            int colore = (c.B << 16) | (c.G << 8) | c.R;
            Nativo.DwmSetWindowAttribute(Handle, Nativo.DWMWA_BORDER_COLOR, ref colore, sizeof(int));
        }
        catch { }
    }

    protected override void OnMouseDown(MouseEventArgs e)
    {
        base.OnMouseDown(e);
        if (e.Button != MouseButtons.Left) return;
        Nativo.ReleaseCapture();
        Nativo.SendMessageW(Handle, Nativo.WM_NCLBUTTONDOWN, Nativo.HTCAPTION, IntPtr.Zero);
    }
}

internal static class Recupero
{
    private const string DEPOSITO = "Shadowed1996/pollaio";
    public const string API = "https://api.github.com/repos/" + DEPOSITO + "/releases/latest";

    public static string TrovaArchivio()
    {
        return Archivio(Json(API));
    }

    public static string Archivio(string json)
    {
        if (json == null) return null;

        int i = 0;
        while (true)
        {
            i = json.IndexOf("\"browser_download_url\"", i, StringComparison.Ordinal);
            if (i < 0) return null;

            string url = Valore(json, i);
            if (url == null) return null;
            if (url.EndsWith(".zip", StringComparison.OrdinalIgnoreCase)) return url;

            i += "\"browser_download_url\"".Length;
        }
    }

    public static string Campo(string json, string chiave)
    {
        if (json == null) return null;
        int i = json.IndexOf("\"" + chiave + "\"", StringComparison.Ordinal);
        if (i < 0) return null;
        return Valore(json, i);
    }

    private static string Valore(string json, int daChiave)
    {
        int duepunti = json.IndexOf(':', daChiave);
        if (duepunti < 0) return null;
        int apre = json.IndexOf('"', duepunti + 1);
        if (apre < 0) return null;
        int chiude = json.IndexOf('"', apre + 1);
        if (chiude < 0) return null;
        return json.Substring(apre + 1, chiude - apre - 1);
    }

    public static string Json(string indirizzo)
    {
        try
        {
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
            HttpWebRequest r = (HttpWebRequest)WebRequest.Create(indirizzo);
            r.UserAgent = "pollaio-installer";
            r.Accept = "application/vnd.github+json";
            r.Timeout = 15000;

            using (WebResponse risposta = r.GetResponse())
            using (StreamReader lettore = new StreamReader(risposta.GetResponseStream()))
                return lettore.ReadToEnd();
        }
        catch { return null; }
    }

    public static void Scarica(string indirizzo, string dove, Action<int> avanza)
    {
        ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;

        HttpWebRequest r = (HttpWebRequest)WebRequest.Create(indirizzo);
        r.UserAgent = "pollaio-installer";
        r.Timeout = 30000;

        using (WebResponse risposta = r.GetResponse())
        using (Stream entra = risposta.GetResponseStream())
        using (FileStream esce = File.Create(dove))
        {
            long totale = risposta.ContentLength;
            long fatto = 0;
            byte[] pezzo = new byte[64 * 1024];
            int quanti;

            while ((quanti = entra.Read(pezzo, 0, pezzo.Length)) > 0)
            {
                esce.Write(pezzo, 0, quanti);
                fatto += quanti;
                if (totale > 0 && avanza != null) avanza((int)(fatto * 100 / totale));
            }
        }
    }

    public static void Svuota(string destinazione)
    {
        foreach (string nome in new string[] { "app", "lib" })
        {
            string p = Path.Combine(destinazione, nome);
            try { if (Directory.Exists(p)) Directory.Delete(p, true); } catch { }
        }
    }

    public static void Collegamento(string eseguibile)
    {
        string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        string lnk = Path.Combine(desktop, "il pollaio.lnk");

        Type tipo = Type.GetTypeFromProgID("WScript.Shell");
        if (tipo == null) return;

        object shell = Activator.CreateInstance(tipo);
        object scorciatoia = tipo.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod,
            null, shell, new object[] { lnk });

        Type ts = scorciatoia.GetType();
        ts.InvokeMember("TargetPath", BindingFlags.SetProperty, null, scorciatoia, new object[] { eseguibile });
        ts.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, scorciatoia,
            new object[] { Path.GetDirectoryName(eseguibile) });
        ts.InvokeMember("IconLocation", BindingFlags.SetProperty, null, scorciatoia,
            new object[] { eseguibile + ",0" });
        ts.InvokeMember("Description", BindingFlags.SetProperty, null, scorciatoia,
            new object[] { "La chat di slayer_beard sopra al gioco" });
        ts.InvokeMember("Save", BindingFlags.InvokeMethod, null, scorciatoia, null);
    }
}

internal sealed class Novita
{
    public string Tag;
    public string Zip;
}

internal static class Aggiornamento
{

    public static Novita Cerca()
    {
        string json = Recupero.Json(Recupero.API);
        if (json == null) return null;

        string tag = Recupero.Campo(json, "tag_name");
        if (tag == null) return null;
        if (!PiuNuova(tag, Programma.VERSIONE)) return null;

        string zip = Recupero.Archivio(json);
        if (zip == null) return null;

        Novita n = new Novita();
        n.Tag = tag;
        n.Zip = zip;
        return n;
    }

    public static bool PiuNuova(string tag, string mia)
    {
        int[] la = Numeri(tag);
        int[] lb = Numeri(mia);
        if (la == null || lb == null) return false;

        for (int i = 0; i < 3; i++)
        {
            if (la[i] > lb[i]) return true;
            if (la[i] < lb[i]) return false;
        }
        return false;
    }

    private static int[] Numeri(string versione)
    {
        if (string.IsNullOrEmpty(versione)) return null;
        string s = versione.Trim().TrimStart('v', 'V');

        string[] pezzi = s.Split('.');
        int[] fuori = new int[3];

        for (int i = 0; i < 3; i++)
        {
            fuori[i] = 0;
            if (i >= pezzi.Length) continue;

            string solo = "";
            for (int k = 0; k < pezzi[i].Length && char.IsDigit(pezzi[i][k]); k++) solo += pezzi[i][k];
            if (solo.Length == 0) continue;

            int n;
            if (int.TryParse(solo, NumberStyles.Integer, CultureInfo.InvariantCulture, out n)) fuori[i] = n;
        }

        return fuori;
    }

    public static void PulisciVecchi()
    {
        try
        {
            foreach (string f in Directory.GetFiles(Programma.Radice, "*.vecchio", SearchOption.AllDirectories))
            {
                try { File.Delete(f); } catch { }
            }
        }
        catch { }
    }

    public static bool Applica(string zip)
    {
        string temporanea = Path.Combine(Path.GetTempPath(), "pollaio-nuovo-" + Guid.NewGuid().ToString("N"));

        try
        {
            Directory.CreateDirectory(temporanea);
            System.IO.Compression.ZipFile.ExtractToDirectory(zip, temporanea);

            if (!File.Exists(Path.Combine(temporanea, "Pollaio.exe"))) return false;

            foreach (string nome in new string[] { "app", "lib" })
            {
                string partenza = Path.Combine(temporanea, nome);
                if (!Directory.Exists(partenza)) continue;

                Fondi(partenza, Path.Combine(Programma.Radice, nome));
            }

            foreach (string nome in new string[] { "Pollaio.exe", "Regia.exe", "LEGGIMI.md" })
            {
                string partenza = Path.Combine(temporanea, nome);
                if (!File.Exists(partenza)) continue;

                if (!Sostituisci(partenza, Path.Combine(Programma.Radice, nome))) return false;
            }

            return true;
        }
        catch { return false; }
        finally
        {
            try { if (Directory.Exists(temporanea)) Directory.Delete(temporanea, true); } catch { }
        }
    }

    private static void Fondi(string da, string a)
    {
        Directory.CreateDirectory(a);

        foreach (string f in Directory.GetFiles(da))
            Sostituisci(f, Path.Combine(a, Path.GetFileName(f)));

        foreach (string d in Directory.GetDirectories(da))
            Fondi(d, Path.Combine(a, Path.GetFileName(d)));
    }

    private static bool Sostituisci(string partenza, string arrivo)
    {
        try
        {
            if (File.Exists(arrivo))
            {
                try
                {
                    File.Delete(arrivo);
                }
                catch
                {
                    string daparte = arrivo + ".vecchio";
                    try { if (File.Exists(daparte)) File.Delete(daparte); } catch { }
                    File.Move(arrivo, daparte);
                }
            }

            File.Copy(partenza, arrivo, true);
            return true;
        }
        catch { return false; }
    }

    public static void Riparti()
    {
        try
        {
            ProcessStartInfo psi = new ProcessStartInfo(Application.ExecutablePath);
            psi.UseShellExecute = true;
            psi.WorkingDirectory = Programma.Radice;
            Process.Start(psi);
        }
        catch { }
    }
}
internal static class Nativo
{
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetProcessDPIAware();

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern IntPtr LoadLibraryW(string percorso);

    public const int GWL_STYLE   = -16;
    public const int GWL_EXSTYLE = -20;

    public const int WS_CAPTION     = 0x00C00000;
    public const int WS_THICKFRAME  = 0x00040000;
    public const int WS_MINIMIZEBOX = 0x00020000;
    public const int WS_MAXIMIZEBOX = 0x00010000;
    public const int WS_SYSMENU     = 0x00080000;
    public const int WS_POPUP       = unchecked((int)0x80000000);

    public const int WS_EX_DLGMODALFRAME = 0x00000001;
    public const int WS_EX_CLIENTEDGE    = 0x00000200;
    public const int WS_EX_STATICEDGE    = 0x00020000;
    public const int WS_EX_WINDOWEDGE    = 0x00000100;

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

    public const int WM_MISURA = 0x8000 + 7;

    public const uint WM_NCLBUTTONDOWN = 0x00A1;
    public static readonly IntPtr HTCAPTION = new IntPtr(2);

    public static readonly IntPtr HTLEFT        = new IntPtr(10);
    public static readonly IntPtr HTRIGHT       = new IntPtr(11);
    public static readonly IntPtr HTTOP         = new IntPtr(12);
    public static readonly IntPtr HTTOPLEFT     = new IntPtr(13);
    public static readonly IntPtr HTTOPRIGHT    = new IntPtr(14);
    public static readonly IntPtr HTBOTTOM      = new IntPtr(15);
    public static readonly IntPtr HTBOTTOMLEFT  = new IntPtr(16);
    public static readonly IntPtr HTBOTTOMRIGHT = new IntPtr(17);

    public const int WM_EXITSIZEMOVE = 0x0232;

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool ReleaseCapture();

    public const int VK_LBUTTON = 0x01;

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
