"use client";

/** Último recurso cuando falla el propio layout raíz — por eso trae su propio <html>/<body> y
 * estilos en línea (globals.css puede no haber cargado). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#07090D", color: "#F5F5F7", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", padding: 16 }}>
          <h1 style={{ fontSize: 20 }}>Algo salió mal</h1>
          <p style={{ opacity: 0.7, fontSize: 14 }}>Recarga la página para volver a intentarlo.</p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 12, padding: "10px 20px", borderRadius: 999, border: 0, background: "#FF7A1A", color: "#07090D", fontWeight: 600, cursor: "pointer" }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
