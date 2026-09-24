import type { Metadata } from "next";
import Link from "next/link";

import { LEGAL_CONTACT_EMAIL, LegalLayout, LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Política de privacidad · Menzo",
  description: "Qué datos recopila Menzo, para qué los usa y cómo puedes eliminarlos.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Política de privacidad">
      <p>
        Menzo es una comunidad para conectar con personas que comparten tus intereses: publicaciones, chats, salas en
        vivo, minijuegos y perfiles. Esta política explica qué datos recopilamos en la app de Android y en la web
        (menzoweb.vercel.app), para qué los usamos y qué control tienes sobre ellos.
      </p>

      <LegalSection title="Datos que recopilamos">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Datos de cuenta:</strong> correo electrónico y contraseña (guardamos solo un hash cifrado, nunca la
            contraseña en texto).
          </li>
          <li>
            <strong>Perfil:</strong> nombre visible, nombre de usuario, foto de perfil, portada, fondo, biografía, estado,
            intereses, enlaces a redes sociales y personalización visual que decidas agregar.
          </li>
          <li>
            <strong>Contenido que publicas:</strong> publicaciones, comentarios, encuestas, mensajes de chat y mensajes
            directos, mensajes en muros, dibujos en la pizarra, stickers, imágenes y GIF que compartes.
          </li>
          <li>
            <strong>Actividad en la app:</strong> a quién sigues, reacciones, “me gusta”, guardados, búsquedas recientes,
            perfiles visitados, participación en salas en vivo y partidas, nivel y experiencia, y tu mascota virtual.
          </li>
          <li>
            <strong>Audio en salas en vivo:</strong> si activas el micrófono en una sala en vivo, tu voz se transmite en
            tiempo real a los demás participantes. <strong>Menzo no graba ni guarda el audio.</strong>
          </li>
          <li>
            <strong>Datos técnicos:</strong> informes de fallos de la app de Android (tipo de dispositivo, versión del
            sistema y de la app, y el error) para poder corregir errores; y la dirección IP de forma temporal para
            limitar abusos (por ejemplo, intentos masivos de registro).
          </li>
        </ul>
        <p>No recopilamos tu ubicación, contactos, fotos que no elijas subir ni datos de pago. No mostramos publicidad.</p>
      </LegalSection>

      <LegalSection title="Para qué usamos los datos">
        <ul className="list-disc space-y-2 pl-5">
          <li>Crear y mantener tu cuenta y tu perfil, y mostrar tu contenido a otras personas de la comunidad.</li>
          <li>Hacer funcionar los chats, las salas en vivo, la música compartida, los minijuegos y las notificaciones.</li>
          <li>Moderar la comunidad: revisar reportes, detectar spam y contenido que incumpla los términos.</li>
          <li>Proteger la seguridad de las cuentas (límites de intentos, recuperación de contraseña por correo).</li>
          <li>Diagnosticar y corregir fallos de la app.</li>
        </ul>
        <p>No vendemos tus datos ni los usamos para publicidad.</p>
      </LegalSection>

      <LegalSection title="Qué ven otras personas">
        <p>
          Tu perfil público (nombre, usuario, foto, biografía, intereses, enlaces, nivel), tus publicaciones, comentarios y
          los mensajes que envías en salas públicas son visibles para otros usuarios. Los mensajes directos solo los ven
          las personas de esa conversación (y el equipo de moderación si alguien los reporta).
        </p>
      </LegalSection>

      <LegalSection title="Servicios de terceros">
        <p>Usamos proveedores que procesan datos solo para prestarnos su servicio:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Render</strong> (servidor y base de datos de Menzo) y <strong>Vercel</strong> (sitio web).</li>
          <li><strong>Cloudinary</strong> (almacenamiento de las imágenes que subes).</li>
          <li><strong>Agora</strong> (transmisión de audio en tiempo real en salas en vivo, sin grabación).</li>
          <li><strong>YouTube</strong> (reproductor de la música compartida en salas en vivo) y <strong>Tenor</strong> (buscador de GIF).</li>
          <li><strong>Firebase Crashlytics</strong> de Google (informes de fallos de la app de Android).</li>
          <li>Un proveedor de correo electrónico para enviar los enlaces de recuperación de contraseña.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Seguridad">
        <p>
          Toda la comunicación con Menzo viaja cifrada (HTTPS). Las contraseñas se guardan con hash (BCrypt) y los
          tokens de sesión y de recuperación se almacenan solo como hash.
        </p>
      </LegalSection>

      <LegalSection title="Conservación y eliminación">
        <p>
          Conservamos tus datos mientras tengas una cuenta. Puedes eliminar tu cuenta en cualquier momento desde
          Configuración, en la app o en la web (ver <Link href="/eliminar-cuenta" className="text-[var(--color-orange)]">cómo eliminar tu cuenta</Link>).
          Al eliminarla borramos tu correo, contraseña, foto, portada, biografía, intereses y enlaces; ocultamos todas tus
          publicaciones; eliminamos seguidores y seguidos, y cerramos todas tus sesiones. Los mensajes que dejaste en
          chats de otras personas se conservan como “Usuario eliminado” para no romper sus conversaciones. Los informes
          de moderación pueden conservarse hasta 12 meses para prevenir abusos.
        </p>
      </LegalSection>

      <LegalSection title="Tus derechos">
        <p>
          Puedes ver y editar tu información desde tu perfil, bloquear o reportar a otras personas, y eliminar tu
          cuenta. Para acceder a una copia de tus datos o hacer cualquier otra solicitud, escríbenos a{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-[var(--color-orange)]">{LEGAL_CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection title="Menores de edad">
        <p>
          Menzo no está dirigido a menores de 13 años y no recopilamos a sabiendas datos de menores de esa edad. Si
          crees que un menor de 13 años creó una cuenta, escríbenos y la eliminaremos.
        </p>
      </LegalSection>

      <LegalSection title="Cambios y contacto">
        <p>
          Si cambiamos esta política, actualizaremos la fecha de arriba y, si el cambio es importante, te avisaremos en
          la app. Dudas o solicitudes: <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-[var(--color-orange)]">{LEGAL_CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
