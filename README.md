# Menzo Web

Cliente web de Menzo (Next.js 16 + React 19), desplegado en Vercel: https://menzoweb.vercel.app

## Desarrollo

```bash
npm ci
npm run dev        # http://localhost:3000
npm run lint
npx tsc --noEmit
npm test
npm run build
```

`NEXT_PUBLIC_API_URL` apunta a la API (por defecto `https://menzoapi.onrender.com`). Para desarrollo
local contra la API en tu máquina: `NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev` (y agrega
`http://localhost:3000` a `CORS_ALLOWED_ORIGINS` de la API).

## Páginas públicas (sin sesión)

- `/privacidad` — política de privacidad (URL para Google Play / App Store)
- `/terminos` — términos y normas de la comunidad
- `/eliminar-cuenta` — cómo eliminar la cuenta (URL que pide Google Play)
- `/forgot-password` y `/reset-password?token=…` — recuperación de contraseña por correo

## Despliegue

Cada push a `main` se despliega solo en Vercel.
