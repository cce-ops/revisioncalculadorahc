import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  analizarExcel,
  evaluarDocumento,
  revisarExcelConIA,
  USANDO_MOCK,
  type Referencia,
  type DocOk,
  type ExcelOk,
} from "@/lib/motor";
import { ACEPTA, extraerTexto } from "@/lib/extraer-texto";
import { Aviso, Card, Contador, Lista, Seccion, TarjetaHallazgo } from "@/components/feedback";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Autoevaluación de Huella de Carbono" },
      {
        name: "description",
        content:
          "Herramienta anónima para autoevaluar el Excel de inventario y el documento de evidencias de la actividad de Huella de Carbono y Economía Circular.",
      },
      { property: "og:title", content: "Autoevaluación de Huella de Carbono" },
      {
        property: "og:description",
        content:
          "Comprueba tu Excel con reglas automáticas y recibe feedback pedagógico sobre tu documento de evidencias. Sin registro y sin almacenar datos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type Pestana = "excel" | "documento";

function App() {
  const [pestana, setPestana] = useState<Pestana>("excel");

  // Estado de la fase 1 (Excel)
  const [enlace, setEnlace] = useState("");
  const [resultadoExcel, setResultadoExcel] = useState<ExcelOk | null>(null);
  const [conIA, setConIA] = useState(false);
  const [revisionIA, setRevisionIA] = useState<DocOk | null>(null);
  const [referencias, setReferencias] = useState<Referencia[]>([]);
  const [nombreDoc, setNombreDoc] = useState("");

  // Estado de la fase 2 (documento). La API Key vive solo aquí, en memoria.
  const [texto, setTexto] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [resultadoDoc, setResultadoDoc] = useState<DocOk | null>(null);

  const [cargando, setCargando] = useState<null | Pestana>(null);
  const [error, setError] = useState("");

  async function comprobarExcel(e: React.FormEvent) {
    e.preventDefault();
    if (!enlace.trim()) {
      setError("Pega el enlace de tu Google Sheets para poder comprobarlo.");
      return;
    }
    if (conIA && !apiKey.trim()) {
      setError("Para la revisión con IA necesitas tu API Key de Groq.");
      return;
    }
    setError("");
    setCargando("excel");
    const res = await analizarExcel(enlace);
    let rev: DocOk | null = null;
    if (res.ok && conIA) {
      const r = await revisarExcelConIA(enlace, apiKey, referencias);
      setApiKey("");
      if (r.ok) rev = r;
      else setError(r.error);
    }
    setCargando(null);
    if (res.ok) {
      setRevisionIA(rev);
      setResultadoExcel(res);
    } else setError(res.error);
  }

  async function evaluarDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) {
      setError("Adjunta tu documento (PDF o Word) o pega su texto.");
      return;
    }
    if (!apiKey.trim()) {
      setError("Necesitas una API Key de Groq para usar esta función.");
      return;
    }
    setError("");
    setCargando("documento");
    const res = await evaluarDocumento(texto, apiKey, referencias);
    setCargando(null);
    if (res.ok) {
      setResultadoDoc(res);
      setApiKey(""); // la key se usa y se descarta
    } else {
      setError(res.error);
    }
  }

  function volver() {
    setResultadoExcel(null);
    setResultadoDoc(null);
    setRevisionIA(null);
    setError("");
  }

  async function adjuntarDoc(f: File | undefined) {
    if (!f) return;
    try {
      setTexto(await extraerTexto(f));
      setNombreDoc(f.name);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    }
  }

  const campoKey = (
    <div className="space-y-2">
      <label htmlFor="apikey" className="block text-sm font-semibold">
        API Key de Groq (gratuita)
      </label>
      <input
        id="apikey"
        type="password"
        autoComplete="off"
        value={apiKey}
        onChange={(ev) => setApiKey(ev.target.value)}
        placeholder="gsk_..."
        className="w-full rounded-lg border border-input bg-card px-4 py-3 font-mono text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
      <p className="text-sm leading-relaxed text-muted-foreground">
        Obtén tu key gratis en console.groq.com. Se usa solo para esta consulta y no se guarda.
      </p>
    </div>
  );

  return (
    <main className="min-h-screen px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            🌍 Autoevaluación de Huella de Carbono
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Herramienta anónima. Los datos no se almacenan en ningún servidor.
          </p>
        </header>

        {USANDO_MOCK && (
          <p className="mt-6 rounded-xl bg-warn-soft px-5 py-3 text-center text-sm text-warn-soft-foreground">
            Modo demostración: se muestran resultados de ejemplo porque no hay motor configurado.
          </p>
        )}

        <noscript>
          <p className="mt-6 rounded-xl bg-danger-soft px-5 py-4 text-sm text-danger-soft-foreground">
            Esta herramienta necesita JavaScript activado para poder analizar tu Excel y tu
            documento. Actívalo en tu navegador y vuelve a cargar la página.
          </p>
        </noscript>

        <div className="mt-8">
          {cargando ? (
            <Cargando fase={cargando} />
          ) : resultadoExcel ? (
            <>
              {revisionIA && (
                <div className="mb-6">
                  <ResultadosDoc datos={revisionIA} titulo="🤖 Revisión con IA según apuntes y rúbricas" />
                </div>
              )}
              <ResultadosExcel datos={resultadoExcel} onVolver={volver} />
            </>
          ) : resultadoDoc ? (
            <ResultadosDoc datos={resultadoDoc} onVolver={volver} />
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row" role="tablist">
                <Tab
                  activa={pestana === "excel"}
                  onClick={() => {
                    setPestana("excel");
                    setError("");
                  }}
                >
                  📊 Comprobar mi Excel
                </Tab>
                <Tab
                  activa={pestana === "documento"}
                  onClick={() => {
                    setPestana("documento");
                    setError("");
                  }}
                >
                  📄 Evaluar mi documento
                </Tab>
              </div>

              <div className="mt-6 space-y-5">
                {error && <Aviso>{error}</Aviso>}

                <MaterialReferencia referencias={referencias} onChange={setReferencias} onError={setError} />

                {pestana === "excel" ? (
                  <Card>
                    <form onSubmit={comprobarExcel} className="space-y-5">
                      <div className="space-y-2">
                        <label htmlFor="enlace" className="block text-sm font-semibold">
                          Enlace de tu Google Sheets
                        </label>
                        <input
                          id="enlace"
                          value={enlace}
                          onChange={(ev) => setEnlace(ev.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          className="w-full rounded-lg border border-input bg-card px-4 py-3 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                        />
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          Abre tu Excel en Drive → Clic derecho → Compartir → Copiar enlace.
                          Importante: el archivo debe estar en formato Google Sheets (no .xlsx).
                        </p>
                      </div>
                      <label className="flex items-start gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={conIA}
                          onChange={(ev) => setConIA(ev.target.checked)}
                          className="mt-1 size-4"
                        />
                        <span>
                          <span className="font-semibold">Añadir revisión con IA</span>
                          <span className="block text-muted-foreground">
                            Además de las reglas, la IA comenta tu Excel usando los apuntes y
                            rúbricas que hayas adjuntado.
                          </span>
                        </span>
                      </label>
                      {conIA && campoKey}
                      <BotonPrincipal>Comprobar mi Excel</BotonPrincipal>
                    </form>
                  </Card>
                ) : (
                  <Card>
                    <form onSubmit={evaluarDoc} className="space-y-5">
                      <div className="space-y-2">
                        <span className="block text-sm font-semibold">Tu documento de evidencias</span>
                        <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-input bg-muted/40 px-4 py-6 text-center text-sm hover:bg-muted">
                          <span className="font-semibold">📎 Adjuntar PDF o Word</span>
                          <span className="text-muted-foreground">
                            {nombreDoc ? `Cargado: ${nombreDoc}` : "Formatos: .pdf, .docx"}
                          </span>
                          <input
                            type="file"
                            accept={ACEPTA}
                            className="sr-only"
                            onChange={(ev) => adjuntarDoc(ev.target.files?.[0])}
                          />
                        </label>
                        <label htmlFor="texto" className="block pt-2 text-sm text-muted-foreground">
                          …o pega el texto directamente (puedes revisarlo aquí):
                        </label>
                        <textarea
                          id="texto"
                          value={texto}
                          onChange={(ev) => setTexto(ev.target.value)}
                          rows={8}
                          placeholder="Pega aquí el contenido de tu documento..."
                          className="w-full resize-y rounded-lg border border-input bg-card px-4 py-3 text-base leading-relaxed outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                        />
                      </div>

                      {campoKey}

                      <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                        Tu API Key es personal. Esta herramienta no la almacena ni la comparte.
                      </p>

                      <BotonPrincipal>Evaluar con IA</BotonPrincipal>
                    </form>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Tab({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activa}
      onClick={onClick}
      className={`flex-1 rounded-xl px-5 py-3 text-base font-semibold transition-colors ${
        activa
          ? "bg-primary text-primary-foreground shadow-[var(--shadow-card)]"
          : "bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function BotonPrincipal({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="w-full rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
    >
      {children}
    </button>
  );
}

function BotonSecundario({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-input bg-card px-6 py-4 text-base font-semibold text-foreground transition-colors hover:bg-muted"
    >
      {children}
    </button>
  );
}

function Cargando({ fase }: { fase: Pestana }) {
  return (
    <Card className="flex flex-col items-center gap-5 py-16 text-center">
      <span
        aria-hidden
        className="size-10 animate-spin rounded-full border-4 border-muted border-t-primary"
      />
      <p className="text-base text-muted-foreground" role="status">
        {fase === "excel"
          ? "Analizando tu Excel..."
          : "Evaluando tu documento con IA... Esto puede tardar 10-20 segundos."}
      </p>
    </Card>
  );
}

function ResultadosExcel({ datos, onVolver }: { datos: ExcelOk; onVolver: () => void }) {
  const errores = datos.errores ?? [];
  const avisos = datos.avisos ?? [];
  const infos = datos.infos ?? [];
  const logros = datos.logros ?? [];
  const limpio = errores.length === 0 && avisos.length === 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{datos.archivo ?? "Resultado del análisis"}</h2>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Contador numero={datos.totalErrores ?? errores.length} etiqueta="A corregir" tono="danger" />
        <Contador numero={datos.totalAvisos ?? avisos.length} etiqueta="A revisar" tono="warn" />
        <Contador numero={logros.length} etiqueta="Logros" tono="success" />
      </div>

      {limpio ? (
        <Card className="py-14 text-center text-xl font-semibold">
          🎉 ¡Enhorabuena! Tu Excel está listo para entregar.
        </Card>
      ) : null}

      {logros.length > 0 && (
        <Seccion titulo="🎉 Lo que has hecho bien" tono="success">
          <Lista items={logros} />
        </Seccion>
      )}

      {errores.length > 0 && (
        <Seccion titulo={`🔴 Cosas que debes corregir (${errores.length})`} tono="danger">
          {errores.map((h, i) => (
            <TarjetaHallazgo key={i} hallazgo={h} />
          ))}
        </Seccion>
      )}

      {avisos.length > 0 && (
        <Seccion
          titulo={`🟡 Cosas a revisar (${avisos.length})`}
          tono="warn"
          abiertaPorDefecto={false}
        >
          {avisos.map((h, i) => (
            <TarjetaHallazgo key={i} hallazgo={h} />
          ))}
        </Seccion>
      )}

      {infos.length > 0 && (
        <Seccion titulo={`💡 Sugerencias (${infos.length})`} tono="success" abiertaPorDefecto={false}>
          {infos.map((h, i) => (
            <TarjetaHallazgo key={i} hallazgo={h} />
          ))}
        </Seccion>
      )}

      <BotonSecundario onClick={onVolver}>Comprobar otro Excel</BotonSecundario>
    </div>
  );
}

function ResultadosDoc({
  datos,
  onVolver,
  titulo = "Evaluación de tu documento de evidencias",
}: {
  datos: DocOk;
  onVolver?: () => void;
  titulo?: string;
}) {
  const aspectos: Array<[string, string | undefined]> = [
    ["Fuentes", datos.aspectos?.fuentes],
    ["Hipótesis", datos.aspectos?.hipotesis],
    ["Anualización", datos.aspectos?.anualizacion],
    ["Reparto", datos.aspectos?.reparto],
    ["Escenarios", datos.aspectos?.escenarios],
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{titulo}</h2>

      {(datos.fortalezas ?? []).length > 0 && (
        <Seccion titulo="✅ Fortalezas" tono="success">
          <Lista items={datos.fortalezas ?? []} />
        </Seccion>
      )}

      {(datos.debilidades ?? []).length > 0 && (
        <Seccion titulo="⚠️ Debilidades" tono="warn">
          <Lista items={datos.debilidades ?? []} />
        </Seccion>
      )}

      {(datos.preguntas_socraticas ?? []).length > 0 && (
        <Seccion titulo="🤔 Preguntas para reflexionar" tono="info">
          <Lista items={datos.preguntas_socraticas ?? []} />
        </Seccion>
      )}

      {aspectos.some(([, v]) => v) && (
        <Card className="space-y-5">
          <h3 className="text-base font-semibold">📋 Análisis por aspecto</h3>
          {aspectos.map(([titulo, comentario]) =>
            comentario ? (
              <div key={titulo}>
                <p className="text-sm font-semibold">{titulo}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{comentario}</p>
              </div>
            ) : null,
          )}
        </Card>
      )}

      {onVolver && <BotonSecundario onClick={onVolver}>Evaluar otro documento</BotonSecundario>}
    </div>
  );
}

function MaterialReferencia({
  referencias,
  onChange,
  onError,
}: {
  referencias: Referencia[];
  onChange: (r: Referencia[]) => void;
  onError: (m: string) => void;
}) {
  const [leyendo, setLeyendo] = useState(false);

  async function anadir(files: FileList | null, tipo: Referencia["tipo"]) {
    if (!files?.length) return;
    setLeyendo(true);
    const nuevas: Referencia[] = [];
    for (const f of Array.from(files)) {
      try {
        const texto = await extraerTexto(f);
        if (texto) nuevas.push({ nombre: f.name, tipo, texto });
      } catch (e) {
        onError(e instanceof Error ? e.message : `No se pudo leer ${f.name}.`);
      }
    }
    setLeyendo(false);
    onChange([...referencias, ...nuevas]);
  }

  const boton = (tipo: Referencia["tipo"], texto: string) => (
    <label className="flex-1 cursor-pointer rounded-lg border border-input bg-card px-4 py-3 text-center text-sm font-semibold hover:bg-muted">
      {texto}
      <input
        type="file"
        multiple
        accept={ACEPTA}
        className="sr-only"
        onChange={(ev) => {
          void anadir(ev.target.files, tipo);
          ev.target.value = "";
        }}
      />
    </label>
  );

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">📚 Apuntes y rúbricas (opcional)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          La IA los usará como referencia al evaluar tu documento y tu Excel. No se guardan.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {boton("apuntes", "+ Añadir apuntes")}
        {boton("rubrica", "+ Añadir rúbrica")}
      </div>
      {leyendo && <p className="text-sm text-muted-foreground">Leyendo archivos…</p>}
      {referencias.length > 0 && (
        <ul className="space-y-2">
          {referencias.map((r, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-2 text-sm"
            >
              <span className="truncate">
                {r.tipo === "rubrica" ? "📏" : "📘"} {r.nombre}
              </span>
              <button
                type="button"
                onClick={() => onChange(referencias.filter((_, j) => j !== i))}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label={`Quitar ${r.nombre}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
