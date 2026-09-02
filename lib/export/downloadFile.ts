/**
 * Dispara la descarga de un archivo de texto en el navegador — todo pasa en
 * el cliente, no depende de ningún backend ni de Supabase.
 */
export function downloadTextFile(filename: string, content: string, mimeType = "text/csv;charset=utf-8"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
