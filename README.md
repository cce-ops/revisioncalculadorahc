# 🌍 Autoevaluación de Huella de Carbono

Herramienta web **anónima** para que el alumnado autoevalúe su actividad de Huella de Carbono y
Economía Circular. Sin login, sin base de datos, sin historial, sin `localStorage`, sin cookies y
sin analítica.

Dos funcionalidades, en pestañas:

1. **📊 Comprobar mi Excel** — reglas duras, sin IA. Se envía el enlace del Google Sheets al motor
   externo (`GET {MOTOR_URL}?url=...`) y se muestran errores, avisos, sugerencias y logros.
2. **📄 Evaluar mi documento** — con IA. Se envía el texto del documento y la API Key de Groq del
   propio alumno al motor (`POST {MOTOR_URL}`), que llama a Groq con un prompt pedagógico.

La API Key se usa para una sola consulta y se descarta: no se guarda en ningún sitio.

## Arquitectura

- Frontend: React + TanStack Start + Tailwind CSS.
- Motor: Web App de Google Apps Script existente, expuesta como endpoint JSON.
- No hay backend propio: todas las llamadas salen del navegador con `fetch`.

## Configuración

Copia `.env.example` a `.env` y define la URL del motor:

```bash
cp .env.example .env
```

```
VITE_MOTOR_URL=https://script.google.com/macros/s/.../exec
```

Si la variable está vacía o vale `mock`, la aplicación funciona con **datos de ejemplo**, lo que
permite probar toda la interfaz sin el motor real (aparece un aviso en pantalla).

## Desarrollo

```bash
npm install
npm run dev
```

## Despliegue

- **Vercel / Netlify**: importa el repositorio y añade la variable de entorno `VITE_MOTOR_URL` en la
  configuración del proyecto. Comando de build `npm run build`.
- **Lovable**: publica desde el propio editor.

Recuerda que las variables `VITE_*` se incrustan en el bundle del navegador: la URL del motor es
pública por diseño, así que el Apps Script no debe exponer datos sensibles.

## Notas sobre el motor (Apps Script)

- Debe responder con cabeceras CORS abiertas.
- El `POST` se envía con `Content-Type: text/plain` para evitar el *preflight* que Apps Script no
  atiende; en el script se lee con `JSON.parse(e.postData.contents)`.
- Formato de respuesta esperado: ver los tipos en `src/lib/motor.ts`.

## Privacidad

No se almacena nada: ni el enlace, ni el texto del documento, ni la API Key. Todo vive en la memoria
de la pestaña del navegador y desaparece al recargar.
