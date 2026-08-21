/** Funciones puras del motor de recuperación de DJ Menzi (auditoría de confiabilidad de
 * reproducción) — separadas de MenziDjContext.tsx para poder testearlas sin un player real. */

/** Clasificación de errores de la IFrame API (sección 21 del pedido de auditoría): no todos
 * ameritan la misma respuesta. 100 (video no encontrado/eliminado) y 101/150 (el dueño
 * deshabilitó el embed) son FATALES para ese video puntual — nunca se van a resolver solos, no
 * tiene sentido seguir reintentando cargarlo. 2 (parámetro inválido) y 5 (error del reproductor
 * HTML5) son transitorios — pueden deberse a un glitch puntual del player, no del video en sí.
 * Cualquier código no reconocido se trata como transitorio: sin evidencia clara de que el video
 * esté roto, no hay que atascar la sala saltándolo por error. Mismo contrato que
 * `isFatalYoutubeError` en menzomovil/lib/features/music/menzi_dj_provider.dart. */
export function isFatalYoutubeError(errorCode: number): boolean {
  return errorCode === 100 || errorCode === 101 || errorCode === 150;
}
