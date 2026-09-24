import type { Metadata } from "next";
import Link from "next/link";

import { LEGAL_CONTACT_EMAIL, LegalLayout, LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Eliminar tu cuenta · Menzo",
  description: "Cómo eliminar tu cuenta de Menzo y qué datos se borran.",
};

/** URL pública que Google Play pide para "eliminación de cuenta y datos". */
export default function DeleteAccountInfoPage() {
  return (
    <LegalLayout title="Eliminar tu cuenta de Menzo">
      <LegalSection title="Desde la app o la web">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Inicia sesión en la app de Menzo o en <Link href="/login" className="text-[var(--color-orange)]">menzoweb.vercel.app</Link>.</li>
          <li>Abre <strong>Configuración</strong>.</li>
          <li>En la sección <strong>Cuenta</strong>, toca <strong>Eliminar mi cuenta</strong>.</li>
          <li>Confirma escribiendo tu contraseña. La eliminación es inmediata y no se puede deshacer.</li>
        </ol>
      </LegalSection>

      <LegalSection title="Si ya no puedes entrar">
        <p>
          Recupera el acceso con <Link href="/forgot-password" className="text-[var(--color-orange)]">¿Olvidaste tu contraseña?</Link>, o
          escríbenos desde el correo de tu cuenta a{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}?subject=Eliminar%20mi%20cuenta%20de%20Menzo`} className="text-[var(--color-orange)]">{LEGAL_CONTACT_EMAIL}</a>{" "}
          con el asunto “Eliminar mi cuenta” y la eliminaremos en un máximo de 7 días.
        </p>
      </LegalSection>

      <LegalSection title="Qué se borra">
        <ul className="list-disc space-y-2 pl-5">
          <li>Correo, contraseña, nombre, usuario, foto, portada, fondo, biografía, estado, intereses y enlaces a redes.</li>
          <li>Todas tus publicaciones dejan de mostrarse.</li>
          <li>Tus seguidores y seguidos, y todas tus sesiones abiertas.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Qué se conserva">
        <p>
          Los mensajes que enviaste en chats de otras personas se muestran como “Usuario eliminado”, sin ningún dato
          tuyo, para no romper sus conversaciones. Los reportes de moderación pueden conservarse hasta 12 meses para
          prevenir abusos.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
