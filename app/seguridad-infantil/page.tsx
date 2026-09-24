import type { Metadata } from "next";
import Link from "next/link";

import { LEGAL_CONTACT_EMAIL, LegalLayout, LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Estándares de seguridad infantil · Menzo",
  description: "Política de Menzo contra el abuso y la explotación sexual infantil (CSAE).",
};

/** Estándares publicados contra el abuso y la explotación sexual infantil (CSAE) — Google Play
 * los exige para apps sociales y de citas. */
export default function ChildSafetyPage() {
  return (
    <LegalLayout title="Estándares de seguridad infantil">
      <p>
        Menzo tiene tolerancia cero con el abuso y la explotación sexual infantil (CSAE) y con el material de abuso
        sexual infantil (CSAM). Estos estándares se aplican a todo el contenido de la app de Android y de la web:
        publicaciones, comentarios, chats, mensajes directos, muros, imágenes, dibujos y salas LIVE.
      </p>

      <LegalSection title="Lo que está prohibido">
        <ul className="list-disc space-y-2 pl-5">
          <li>Cualquier contenido que muestre, promueva o normalice el abuso o la explotación sexual de menores.</li>
          <li>Material de abuso sexual infantil (CSAM), incluido contenido generado o editado artificialmente.</li>
          <li>El grooming: contactar a menores con fines sexuales, pedirles imágenes o intentar encuentros.</li>
          <li>La sextorsión y cualquier intento de obtener contenido sexual de un menor.</li>
          <li>Contenido sexualizado de menores, aunque no sea explícito.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Cómo lo prevenimos">
        <ul className="list-disc space-y-2 pl-5">
          <li>Menzo no permite cuentas de menores de 13 años (ver los <Link href="/terminos" className="text-[var(--color-orange)]">términos</Link>).</li>
          <li>Filtros automáticos revisan el texto que se publica y envían a la cola de moderación el contenido de riesgo.</li>
          <li>Cualquier persona puede bloquear a otro usuario y reportar publicaciones, mensajes o perfiles desde la app y la web.</li>
          <li>El equipo de moderación revisa los reportes con prioridad y puede ocultar contenido y suspender o eliminar cuentas de inmediato.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Cómo actuamos">
        <p>
          Cuando detectamos o nos reportan contenido de CSAE, lo retiramos de inmediato, eliminamos la cuenta
          responsable y conservamos la evidencia necesaria para las autoridades. Reportamos el CSAM al National Center
          for Missing &amp; Exploited Children (NCMEC) y a las autoridades locales competentes, según lo exija la ley.
        </p>
      </LegalSection>

      <LegalSection title="Cómo reportar">
        <p>
          Dentro de Menzo, usa la opción <strong>Reportar</strong> en el perfil, la publicación o el mensaje. También
          puedes escribir directamente a nuestro contacto de seguridad infantil:{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}?subject=Seguridad%20infantil`} className="text-[var(--color-orange)]">
            {LEGAL_CONTACT_EMAIL}
          </a>
          . Si un menor está en peligro inmediato, contacta primero a las autoridades de tu país.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
