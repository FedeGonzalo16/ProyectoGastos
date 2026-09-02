import Link from "next/link";
import type { ReactNode } from "react";

interface ManageLinkProps {
  href: string;
  children: ReactNode;
  /** Clases extra, típicamente solo de margen/posición — el resto del estilo ya lo define este componente. */
  className?: string;
}

/**
 * Enlace a una pantalla de gestión clave (categorías, gastos fijos,
 * presupuestos), con forma de botón sólido en vez de texto plano — antes eran
 * solo texto verde chico y pasaban desapercibidos al scrollear rápido, a
 * pesar de ser accesos a funcionalidades centrales de la app, no un detalle
 * menor. Mismo estilo que "+ Nueva inversión"/"+ Nueva categoría".
 */
export function ManageLink({ href, children, className = "" }: ManageLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex w-fit items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-semibold text-white ${className}`}
      style={{ background: "var(--color-brand)" }}
    >
      {children}
    </Link>
  );
}
