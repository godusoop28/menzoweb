import type { Metadata } from "next";
import Link from "next/link";

import { LEGAL_CONTACT_EMAIL, LegalLayout, LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Términos y normas de la comunidad · Menzo",
  description: "Las reglas para usar Menzo y convivir en la comunidad.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Términos y normas de la comunidad">
      <p>
        Al crear una cuenta o usar Menzo aceptas estos términos y la{" "}
        <Link href="/privacidad" className="text-[var(--color-orange)]">política de privacidad</Link>.
      </p>

      <LegalSection title="Tu cuenta">
        <ul className="list-disc space-y-2 pl-5">
          <li>Debes tener al menos 13 años para usar Menzo.</li>
          <li>Eres responsable de lo que se haga con tu cuenta; no compartas tu contraseña.</li>
          <li>No suplantes a otras personas ni crees cuentas para evadir un bloqueo o una suspensión.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Tolerancia cero con contenido abusivo">
        <p>No se permite publicar, enviar ni transmitir en salas en vivo:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Acoso, amenazas, intimidación o ataques contra personas o grupos.</li>
          <li>Discurso de odio o discriminación por origen, religión, género, orientación, discapacidad u otra condición.</li>
          <li>Contenido sexual explícito, y cualquier contenido sexual que involucre a menores (se reporta a las autoridades).</li>
          <li>Violencia gráfica, apología de la violencia o del terrorismo, o promoción de autolesiones.</li>
          <li>Spam, estafas, enlaces maliciosos o publicidad no solicitada.</li>
          <li>Datos personales de otras personas sin su permiso (doxxing).</li>
          <li>Contenido que infrinja derechos de autor o de terceros, o actividades ilegales.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Reportes, bloqueos y moderación">
        <p>
          Puedes bloquear a cualquier persona y reportar publicaciones, comentarios, mensajes o perfiles desde la app o
          la web. El equipo de moderación revisa los reportes y actúa sobre el contenido que incumpla estas normas en un
          plazo máximo de 24 horas: puede ocultar o eliminar contenido y suspender o eliminar cuentas, sin previo aviso
          en casos graves.
        </p>
      </LegalSection>

      <LegalSection title="Tu contenido">
        <p>
          Lo que publicas sigue siendo tuyo. Nos das permiso para almacenarlo y mostrarlo dentro de Menzo mientras esté
          publicado. Si lo borras o eliminas tu cuenta, dejamos de mostrarlo según lo que explica la política de
          privacidad.
        </p>
      </LegalSection>

      <LegalSection title="Servicio">
        <p>
          Menzo se ofrece “tal cual”. Hacemos lo posible para que funcione bien, pero puede haber interrupciones o
          cambios. Podemos actualizar estos términos; si el cambio es importante te avisaremos en la app.
        </p>
      </LegalSection>

      <LegalSection title="Contacto">
        <p>
          Para reportar un problema urgente o hacer cualquier consulta:{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-[var(--color-orange)]">{LEGAL_CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
