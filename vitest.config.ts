import { defineConfig } from "vitest/config";

/**
 * Solo corre sobre funciones puras (`lib/aggregations/`, etc.) — no hace
 * falta jsdom ni nada relacionado al DOM, el entorno "node" por defecto
 * alcanza y es más rápido.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
  },
});
