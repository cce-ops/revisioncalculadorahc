/**
 * Cliente del "motor" externo (Google Apps Script).
 * No hay backend propio: todo son llamadas fetch desde el navegador.
 * Nada se almacena (ni localStorage, ni cookies, ni analytics).
 */

export type Severidad = "error" | "aviso" | "info";

export interface Hallazgo {
  hoja?: string;
  celda?: string;
  severidad?: Severidad;
  mensaje: string;
  sugerencia?: string;
  pista?: string;
}

export interface ExcelOk {
  ok: true;
  archivo?: string;
  totalErrores?: number;
  totalAvisos?: number;
  totalInfos?: number;
  logros?: string[];
  errores?: Hallazgo[];
  avisos?: Hallazgo[];
  infos?: Hallazgo[];
}

export interface DocOk {
  ok: true;
  fortalezas?: string[];
  debilidades?: string[];
  preguntas_socraticas?: string[];
  aspectos?: {
    fuentes?: string;
    hipotesis?: string;
    anualizacion?: string;
    reparto?: string;
    escenarios?: string;
  };
}

export interface RespuestaError {
  ok: false;
  error: string;
}

/** Modelo fijo para la evaluación con IA. */
export const MODELO_LLM = "llama-3.3-70b-versatile";

import { MOTOR_URL_CONFIG } from "@/config";

const MOTOR_URL = (
  MOTOR_URL_CONFIG || ((import.meta.env["VITE_MOTOR_URL"] as string | undefined) ?? "")
).trim();

/** Material de referencia (apuntes, rúbricas) que el alumno adjunta. */
export interface Referencia {
  nombre: string;
  tipo: "apuntes" | "rubrica";
  texto: string;
}

/** Sin URL configurada (o valor "mock") se usan datos de ejemplo para probar la UI. */
export const USANDO_MOCK = MOTOR_URL === "" || MOTOR_URL.toLowerCase() === "mock";

/**
 * Acepta la URL completa de Google Sheets o solo el ID pegado a pelo.
 * Devuelve siempre una URL completa.
 */
export function normalizarEnlaceSheets(valor: string): string {
  const v = valor.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[a-zA-Z0-9-_]{20,}$/.test(v)) {
    return `https://docs.google.com/spreadsheets/d/${v}/edit`;
  }
  return v;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MOCK_EXCEL: ExcelOk = {
  ok: true,
  archivo: "Actividad_HuellaCarbono_Grupo4 (ejemplo)",
  totalErrores: 2,
  totalAvisos: 1,
  totalInfos: 1,
  logros: [
    "Inventario completo y coherente con las unidades declaradas.",
    "Los factores de emisión citan fuente y año.",
    "El reparto por número de convivientes está justificado.",
  ],
  errores: [
    {
      hoja: "ESCENARIO A",
      celda: "H25",
      severidad: "error",
      mensaje: "La fórmula de mejora está invertida.",
      sugerencia: "Cambia a =C25-G25",
      pista: "Una reducción real debe dar POSITIVO.",
    },
    {
      hoja: "2-CÁLCULO",
      celda: "D12",
      severidad: "error",
      mensaje: "El vehículo eléctrico se contabiliza en electricidad y también en combustibles.",
      sugerencia: "Elimina el consumo del VE de la fila de combustibles.",
      pista: "Doble conteo: cada kWh debe aparecer una sola vez.",
    },
  ],
  avisos: [
    {
      hoja: "1-INVENTARIO",
      celda: "B8",
      severidad: "aviso",
      mensaje: "El consumo de agua parece mensual y no anual.",
      sugerencia: "Multiplica por 12 o indica el periodo en la celda de notas.",
      pista: "Revisa la anualización de todos los consumos.",
    },
  ],
  infos: [
    {
      hoja: "ESCENARIO B",
      celda: "F30",
      severidad: "info",
      mensaje: "Podrías añadir el ahorro asociado a la reducción de residuos.",
      sugerencia: "Incluye una fila con el factor de emisión de residuos mezclados.",
    },
  ],
};

const MOCK_DOC: DocOk = {
  ok: true,
  fortalezas: [
    "Se identifican correctamente los alcances 1 y 2 del inventario.",
    "Las fuentes de los factores de emisión están citadas con año de publicación.",
  ],
  debilidades: [
    "No se justifica la hipótesis de reparto del consumo entre convivientes.",
    "El escenario B no cuantifica la inversión necesaria ni el periodo de retorno.",
  ],
  preguntas_socraticas: [
    "¿Qué ocurriría con tu huella si el mix eléctrico cambiase un 20%?",
    "¿Cómo has evitado contabilizar dos veces la energía del vehículo eléctrico?",
    "¿Tu escenario de mejora es reproducible por otro grupo con tus mismos datos?",
  ],
  aspectos: {
    fuentes: "Correctas y trazables, aunque falta el enlace a la calculadora OCCC.",
    hipotesis: "Poco explícitas: conviene listarlas en una tabla.",
    anualizacion: "Coherente salvo en el consumo de agua.",
    reparto: "Se aplica pero sin justificar el criterio elegido.",
    escenarios: "Bien planteados; falta cuantificar el coste del escenario B.",
  },
};

async function leerJson<T>(res: Response): Promise<T | RespuestaError> {
  const texto = await res.text();
  try {
    return JSON.parse(texto) as T;
  } catch {
    return { ok: false, error: "El motor devolvió una respuesta que no se pudo leer." };
  }
}

/** Fase 1 — análisis de reglas duras sobre el Google Sheets. */
export async function analizarExcel(enlace: string): Promise<ExcelOk | RespuestaError> {
  if (USANDO_MOCK) {
    await espera(1200);
    return MOCK_EXCEL;
  }
  try {
    const url = `${MOTOR_URL}?url=${encodeURIComponent(normalizarEnlaceSheets(enlace))}`;
    const res = await fetch(url, { method: "GET" });
    return await leerJson<ExcelOk>(res);
  } catch {
    return {
      ok: false,
      error:
        "No se pudo analizar tu Excel. Verifica que el enlace es correcto y que has compartido el archivo con permiso de lectura.",
    };
  }
}

/** Fase 2 — evaluación pedagógica del documento con IA (la API Key se usa y se descarta). */
export async function evaluarDocumento(
  texto: string,
  apiKey: string,
  referencias: Referencia[] = [],
): Promise<DocOk | RespuestaError> {
  if (USANDO_MOCK) {
    await espera(1800);
    return MOCK_DOC;
  }
  try {
    const res = await fetch(MOTOR_URL, {
      method: "POST",
      // text/plain evita el preflight CORS que Apps Script no responde.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ accion: "evaluarDocumento", texto, apiKey, modelo: MODELO_LLM, referencias }),
    });
    return await leerJson<DocOk>(res);
  } catch {
    return {
      ok: false,
      error: "No se pudo evaluar tu documento. Verifica tu API Key y vuelve a intentarlo.",
    };
  }
}

const MOCK_REVISION_EXCEL: DocOk = {
  ok: true,
  fortalezas: ["La estructura del inventario sigue el orden que pide la rúbrica."],
  debilidades: [
    "La rúbrica exige justificar cada factor de emisión y dos filas no tienen fuente.",
  ],
  preguntas_socraticas: ["¿Qué criterio de la rúbrica crees que cubre peor tu escenario B?"],
};

/** Revisión con IA del Excel, usando apuntes y rúbricas como referencia. */
export async function revisarExcelConIA(
  enlace: string,
  apiKey: string,
  referencias: Referencia[],
): Promise<DocOk | RespuestaError> {
  if (USANDO_MOCK) {
    await espera(1500);
    return MOCK_REVISION_EXCEL;
  }
  try {
    const res = await fetch(MOTOR_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        accion: "revisarExcel",
        url: normalizarEnlaceSheets(enlace),
        apiKey,
        modelo: MODELO_LLM,
        referencias,
      }),
    });
    return await leerJson<DocOk>(res);
  } catch {
    return { ok: false, error: "No se pudo hacer la revisión con IA del Excel." };
  }
}
