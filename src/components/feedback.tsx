/** Piezas de presentación del feedback pedagógico (sin lógica de red). */
import { useState, type ReactNode } from "react";
import type { Hallazgo } from "@/lib/motor";

/** Tarjeta blanca base, bordes redondeados y sombra sutil. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-card p-6 shadow-[var(--shadow-card)] ${className}`}>
      {children}
    </div>
  );
}

/** Contador grande (errores / avisos / logros). */
export function Contador({
  numero,
  etiqueta,
  tono,
}: {
  numero: number;
  etiqueta: string;
  tono: "danger" | "warn" | "success";
}) {
  const tonos = {
    danger: "bg-danger-soft text-danger-soft-foreground",
    warn: "bg-warn-soft text-warn-soft-foreground",
    success: "bg-success-soft text-success-soft-foreground",
  } as const;

  return (
    <div className={`flex-1 rounded-xl px-6 py-7 text-center ${tonos[tono]}`}>
      <div className="text-5xl font-bold tabular-nums">{numero}</div>
      <div className="mt-2 text-sm font-medium">{etiqueta}</div>
    </div>
  );
}

/** Sección colapsable con cabecera de color. */
export function Seccion({
  titulo,
  tono,
  abiertaPorDefecto = true,
  children,
}: {
  titulo: string;
  tono: "danger" | "warn" | "success" | "info";
  abiertaPorDefecto?: boolean;
  children: ReactNode;
}) {
  const [abierta, setAbierta] = useState(abiertaPorDefecto);
  const tonos = {
    danger: "bg-danger-soft text-danger-soft-foreground",
    warn: "bg-warn-soft text-warn-soft-foreground",
    success: "bg-success-soft text-success-soft-foreground",
    info: "bg-info-soft text-info-soft-foreground",
  } as const;

  return (
    <section className="overflow-hidden rounded-xl shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className={`flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-base font-semibold ${tonos[tono]}`}
      >
        <span>{titulo}</span>
        <span aria-hidden className="text-sm opacity-70">
          {abierta ? "▲" : "▼"}
        </span>
      </button>
      {abierta && <div className={`space-y-4 px-6 py-5 ${tonos[tono]}`}>{children}</div>}
    </section>
  );
}

/** Tarjeta de un hallazgo concreto del Excel. */
export function TarjetaHallazgo({ hallazgo }: { hallazgo: Hallazgo }) {
  const ubicacion = [hallazgo.hoja, hallazgo.celda].filter(Boolean).join(" · ");

  return (
    <article className="rounded-xl bg-card p-5 text-card-foreground shadow-[var(--shadow-card)]">
      {ubicacion && (
        <p className="font-mono text-xs text-muted-foreground">📍 {ubicacion}</p>
      )}
      <p className="mt-2 font-semibold leading-relaxed">{hallazgo.mensaje}</p>
      {hallazgo.sugerencia && <p className="mt-3 text-sm">💡 {hallazgo.sugerencia}</p>}
      {hallazgo.pista && (
        <p className="mt-2 text-sm italic text-muted-foreground">📌 {hallazgo.pista}</p>
      )}
    </article>
  );
}

/** Lista con viñetas para logros, fortalezas, debilidades y preguntas. */
export function Lista({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 leading-relaxed">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

/** Aviso de error amable. */
export function Aviso({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl bg-danger-soft px-5 py-4 text-sm leading-relaxed text-danger-soft-foreground"
    >
      ⚠️ {children}
    </p>
  );
}
