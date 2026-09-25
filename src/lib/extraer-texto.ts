/** Extrae texto de PDF, Word (.docx) o texto plano, todo en el navegador. */
export async function extraerTexto(archivo: File): Promise<string> {
  const nombre = archivo.name.toLowerCase();
  if (nombre.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const worker = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const pdf = await pdfjs.getDocument({ data: await archivo.arrayBuffer() }).promise;
    const paginas: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const pag = await pdf.getPage(i);
      const c = await pag.getTextContent();
      paginas.push(c.items.map((it) => ("str" in it ? it.str : "")).join(" "));
    }
    return paginas.join("\n\n").trim();
  }
  if (nombre.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const r = await mammoth.extractRawText({ arrayBuffer: await archivo.arrayBuffer() });
    return r.value.trim();
  }
  if (nombre.endsWith(".doc")) {
    throw new Error("El formato .doc antiguo no se puede leer. Guárdalo como .docx o PDF.");
  }
  return (await archivo.text()).trim();
}

export const ACEPTA = ".pdf,.docx,.txt,.md";
