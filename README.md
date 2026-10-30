# Automatización de métricas web — Cypress + Lighthouse + Google Sheets

Proyecto del **Énfasis Profesional – Corte II** (Prof. Diana Henao), Universidad Autónoma de Manizales.

**Grupo 6:** Luis Fernando Salazar · Victor Manuel García Castañeda

Evalúa automáticamente el rendimiento de páginas institucionales de la UAM con **Lighthouse** (plugin
`@cypress-audit/lighthouse`) dentro de pruebas **Cypress**, guarda cada medición en un **JSON con historial**
y actualiza un **informe en Google Sheets** cada vez que se ejecuta un job programado.

```
scheduler (cron)  →  Cypress + Lighthouse  →  lighthouse-metrics.json  →  Apps Script  →  Google Sheets
  cada X minutos       mide cada página         guarda el historial       recibe los datos     el informe
```

## Páginas y dispositivos evaluados

| Página | Responsable | URL |
|---|---|---|
| Sobre la UAM | Victor Manuel García | https://www.autonoma.edu.co/conoce-la-uam/sobre-la-uam |
| Semilleros de investigación | Luis Salazar | https://www.autonoma.edu.co/investigacion-innovacion-y-emprendimiento/semilleros-de-investigacion |

> La profesora aprobó trabajar con **2 páginas** para este grupo (el PDF indica mínimo 3 para grupos de tres integrantes).

| Dispositivo | Resolución | Tipo |
|---|---|---|
| Desktop | 1280x720 | Escritorio |
| Pixel 7 | 412x915 | Móvil |
| iPhone 14 Pro Max | 430x932 | Móvil |

---

## 1. Requisitos

- **Node.js 22** (mínimo 20.12) — https://nodejs.org
- **Google Chrome** instalado (Cypress y Lighthouse lo usan)
- **Git**
- Una cuenta de Google para el informe en Google Sheets

> Recomendado: tener el proyecto **fuera de OneDrive**. OneDrive bloquea los videos que graba Cypress y puede borrar `node_modules`.

## 2. Instalación

```bash
git clone https://github.com/LuisFSalazarG/Pruebas-enfasis-profesional.git
cd Pruebas-enfasis-profesional
npm install
```

`npm install` descarga Cypress, el plugin de Lighthouse y `node-cron`. La carpeta `node_modules` no se sube al
repositorio, por eso este paso es obligatorio después de clonar.

Comprobar que todo corre (mide las páginas una vez, ~1 minuto y medio):

```bash
npm run metricas
```

Debe terminar en `All specs passed!` y agregar registros a `cypress/fixtures/lighthouse-metrics.json`.

## 3. Configuración

### 3.1 Conexión con Google Sheets (Apps Script)

El informe se actualiza por medio de un **Apps Script publicado como aplicación web**: no necesita Google Cloud
ni credenciales, solo una URL y un token.

1. Crear el Google Sheet e importar la plantilla: **Archivo → Importar → Subir**
   `entregas/Informe-Metricas-Web-UAM.xlsx` → *Reemplazar hoja de cálculo*.
2. Copiar el archivo de configuración:
   ```bash
   copy .env.example .env
   ```
3. En el `.env`, poner en `SHEETS_TOKEN` una clave cualquiera (letras y números, por ejemplo 30 caracteres).
4. En el Sheet: **Extensiones → Apps Script** → pegar el contenido de `scripts/apps-script/Codigo.gs` → en la
   línea `const TOKEN = '...'` poner **el mismo valor** de `SHEETS_TOKEN` → guardar.
5. **Implementar → Nueva implementación** → tipo **Aplicación web** →
   *Ejecutar como:* **Yo** · *Quién tiene acceso:* **Cualquier usuario** → **Implementar** → autorizar los permisos.
6. Copiar la URL que termina en `/exec` y ponerla en el `.env`:
   ```
   SHEETS_URL=https://script.google.com/macros/s/.../exec
   SHEETS_TOKEN=la-misma-clave-del-apps-script
   ```
7. Probar: al abrir la URL en el navegador debe responder `{"ok":true,"mensaje":"Puente de metricas activo"}`.
   Luego enviar el historial:
   ```bash
   npm run sheets
   ```

> El `.env` **no se sube** al repositorio (está en `.gitignore`). Si se cambia el código del Apps Script, publicar con
> **Implementar → Gestionar implementaciones → editar → Versión: Nueva versión** para que la URL no cambie.

### 3.2 Archivos de configuración

Todo lo que se puede cambiar está en archivos de configuración; **no hay que tocar código**:

| Qué | Archivo |
|---|---|
| Páginas (URLs) | `cypress/fixtures/pages.json` |
| Dispositivos y resoluciones | `cypress/fixtures/devices.json` |
| Programación de los jobs | `config/schedule.js` |
| Rangos de clasificación | `cypress/fixtures/thresholds.json` |
| URL del Apps Script y token | `.env` |

**Agregar una página** (`cypress/fixtures/pages.json`):

```json
{ "id": "admisiones", "nombre": "Admisiones", "url": "https://www.autonoma.edu.co/admisiones", "responsable": "Nombre" }
```

**Agregar un dispositivo** (`cypress/fixtures/devices.json`) y nombrarlo en el job correspondiente de `config/schedule.js`:

```json
{ "name": "Galaxy S23", "width": 360, "height": 780, "mobile": true }
```

### 3.3 Programación de los jobs

`config/schedule.js` define dos jobs independientes, uno móvil y uno de escritorio:

```js
{
    nombre: 'movil',
    habilitado: true,
    cada: 30,
    unidad: 'segundos',         // 'segundos' | 'minutos' | 'horas'
    dias: 'todos',              // o ['lunes', 'miercoles', 'viernes']
    dispositivos: ['Pixel 7', 'iPhone 14 Pro Max'],   // o 'todos'
    paginas: 'todas'            // o ids de pages.json
}
```

| Se quiere | Se pone |
|---|---|
| Cada 30 segundos | `cada: 30, unidad: 'segundos'` |
| Cada 50 segundos | `cada: 50, unidad: 'segundos'` |
| Cada minuto | `cada: 1, unidad: 'minutos'` |
| Cada 20 minutos | `cada: 20, unidad: 'minutos'` |
| Cada hora | `cada: 1, unidad: 'horas'` |
| Solo lunes y miércoles | `dias: ['lunes', 'miercoles']` |
| Desactivar un job | `habilitado: false` |

`cada` acepta **cualquier número entero**. Zona horaria: `America/Bogota`.

- Si el número cuadra con el reloj (segundos y minutos **1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30**; horas
  **1, 2, 3, 4, 6, 8, 12**) se usa **cron**: "cada 20 minutos" = a los :00, :20 y :40.
- Cualquier otro número (por ejemplo **50 segundos**) usa un **intervalo fijo** que cuenta desde que arranca
  el scheduler; la primera ejecución ocurre al cumplirse el primer intervalo.

Cada job tarda entre 40 y 80 segundos, así que con intervalos cortos (30 o 50 segundos) los jobs corren uno
tras otro sin descanso: la cola evita que se ejecuten dos a la vez.

## 4. Ejecución

| Comando | Qué hace |
|---|---|
| `npm run scheduler` | Inicia los jobs programados (mide y actualiza el Sheet automáticamente) |
| `npm run metricas` | Mide una vez, a mano, todas las páginas en todos los dispositivos |
| `npm run sheets` | Envía el historial del JSON al Google Sheet (no duplica filas) |
| `npm run cy:open` | Abre Cypress con ventana para ver las pruebas en tiempo real |
| `npm test` | Corre todos los specs de Cypress |

### Cómo se inicia y se mantiene activo el scheduler

```bash
npm run scheduler
```

- El scheduler usa **node-cron** y funciona **mientras la terminal esté abierta y el computador encendido**.
  Si se cierra la terminal o se presiona `Ctrl + C`, los jobs se detienen (no se pierde información); para
  reanudarlos basta con volver a ejecutar el comando.
- Usar **dos terminales**: una con el scheduler corriendo y otra para git u otros comandos.
- Después de cambiar `config/schedule.js` hay que **reiniciar** el scheduler (lee la configuración al arrancar).
- Solo corre un Cypress a la vez: si dos jobs coinciden, el segundo espera su turno; si un job todavía está
  corriendo cuando le toca otra vez, esa vuelta se omite. Entre corridas hay una pausa de 5 segundos.
- Si Cypress se cierra solo sin terminar, el scheduler guarda un log y un screenshot en `cypress/evidencias/`
  y **reintenta el job una vez**.
- Se eligió node-cron en lugar de GitHub Actions porque Lighthouse necesita el Chrome local y la hora se maneja
  directamente en `America/Bogota` (GitHub Actions usa UTC y puede retrasar las ejecuciones programadas).

Salida esperada:

```
[30/10/2026, 10:00:00 a. m.] Inicia job "movil"
   ... Cypress: 4 passing ...
[30/10/2026, 10:01:17 a. m.] Termina job "movil" en 77 s (codigo de salida 0)
[30/10/2026, 10:01:22 a. m.] Sheets: 4 filas nuevas en el informe
```

## 5. Resultados

### JSON con historial — `cypress/fixtures/lighthouse-metrics.json`

Cada ejecución **agrega** registros (nunca borra los anteriores), con el formato del ejemplo del enunciado:

```json
{
    "url": "https://www.autonoma.edu.co/conoce-la-uam/sobre-la-uam",
    "screenEmulation": "Pixel 7 (412x915)",
    "timestamp": "2026-10-30T04:35:42.752Z",
    "firstContentfulPaint": "1.5 s",
    "largestContentfulPaint": "1.9 s",
    "speedIndex": "2.0 s",
    "performance": 74,
    "status": "ok",
    "error": null
}
```

Si Lighthouse no pudo medir (página caída, 404, etc.), el registro queda con `"status": "error"` y el mensaje
en `error`.

### Informe en Google Sheets

- **Informe:** una fila por medición (pantalla, resolución, página, fecha, FCP, LCP, SI, performance), con
  **formato condicional**, **etiquetas de texto** (🟢 Bueno · 🟡 Por mejorar · 🔴 Deficiente) y la columna
  **Estado**:
  - `✅ ok` — todas las métricas dentro del rango esperado.
  - `❌ Falla: Performance 🟡 Por mejorar` — alguna métrica quedó por debajo del rango (ver `fallarDesde`).
  - `❌ <mensaje>` — Lighthouse no pudo medir la página.
- **Resumen:** promedios por página y dispositivo, mejor y peor performance, y comparación Desktop vs. Móvil.
- **Rangos:** los umbrales usados para clasificar.

### Rangos de clasificación — `cypress/fixtures/thresholds.json`

| Métrica | 🟢 Bueno | 🟡 Por mejorar | 🔴 Deficiente |
|---|---|---|---|
| FCP | ≤ 1,8 s | > 1,8 – 3 s | > 3 s |
| LCP | ≤ 2,5 s | > 2,5 – 4 s | > 4 s |
| Speed Index | ≤ 3,4 s | > 3,4 – 5,8 s | > 5,8 s |
| Performance | 90 – 100 | 50 – 89 | 0 – 49 |

Al cambiar los rangos, las etiquetas y el estado se recalculan solos en el siguiente envío; los colores del
formato condicional y la pestaña Rangos del Sheet se ajustan a mano.

**Cuándo falla la prueba** — `"fallarDesde"` en el mismo archivo:

| Valor | La prueba falla si alguna métrica queda en… |
|---|---|
| `"porMejorar"` (actual) | 🟡 Por mejorar o 🔴 Deficiente |
| `"deficiente"` | solo 🔴 Deficiente |
| `"nunca"` | nunca falla por rendimiento (solo si Lighthouse no puede medir) |

La medición se guarda en el JSON y se envía al Sheet aunque la prueba falle.

### Evidencias de fallos — `cypress/evidencias/`

Solo cuando una prueba falla (rendimiento por debajo del rango, página que no carga o Lighthouse que no puede
medir) se guardan, con fecha y hora en el nombre:

- **screenshots** — por ejemplo `rendimiento_sobre-la-uam_Pixel 7.png`, además del screenshot automático de Cypress
- **videos** — la corrida completa del job
- **logs** — si Cypress se cerró solo sin terminar

Las carpetas `cypress/screenshots` y `cypress/videos` son temporales y se limpian en cada corrida. Con intervalos
cortos se acumulan muchas evidencias (cada video pesa unos 3 MB): conviene limpiar la carpeta de vez en cuando.

## 6. Estructura del proyecto

```
Pruebas-enfasis-profesional/
├── .env.example               plantilla del .env (URL del Apps Script y token)
├── cypress.config.js          configuración de Cypress, Lighthouse y evidencias
├── package.json               dependencias y comandos
├── config/
│   └── schedule.js            programación de los jobs
├── scripts/
│   ├── scheduler.js           cron (node-cron)
│   ├── evidencia-cierre.js    evidencias cuando Cypress se cierra solo
│   ├── enviar-sheets.js       npm run sheets
│   └── apps-script/Codigo.gs  código del Apps Script del Google Sheet
├── entregas/                  plantilla del informe (.xlsx) y guía del proyecto (.docx)
└── cypress/
    ├── e2e/metricas-web/metricas_web.cy.js   prueba genérica: páginas × dispositivos
    ├── fixtures/
    │   ├── pages.json         páginas
    │   ├── devices.json       dispositivos
    │   ├── thresholds.json    rangos
    │   └── lighthouse-metrics.json   resultados (historial)
    ├── plugins/
    │   ├── lighthouse.js      mide con Lighthouse
    │   ├── clasificacion.js   Bueno / Por mejorar / Deficiente y cuándo falla la prueba
    │   ├── metrics.js         guarda en el JSON
    │   ├── evidencias.js      screenshots y videos de los fallos
    │   └── sheets.js          envía al Google Sheet
    ├── support/
    │   ├── commands.js        cy.medirPagina()
    │   └── e2e.js
    └── evidencias/            screenshots, videos y logs de los fallos
```

## 7. Problemas comunes

| Mensaje o síntoma | Solución |
|---|---|
| `Cannot find module ...` | Ejecutar `npm install` |
| `Sheets: no se envio -> falta SHEETS_URL en el .env` | Crear el `.env` (sección 3.1) |
| `Sheets: no se envio -> token invalido` | Poner el mismo token en el `.env` y en el Apps Script, y publicar una nueva versión |
| `#ERROR!` en el Sheet | El Apps Script no debe escribir fórmulas (el Sheet en español usa `;`). Usar el `Codigo.gs` del repositorio |
| El Sheet no se actualiza | Verificar que `npm run scheduler` esté corriendo |
| Cambios en `schedule.js` sin efecto | Reiniciar el scheduler (`Ctrl + C` y `npm run scheduler`) |
| Se borraron filas del Sheet | `npm run sheets` vuelve a poner las que faltan desde el JSON |
| `lighthouse-metrics.json esta danado` | `git checkout -- cypress/fixtures/lighthouse-metrics.json` (vuelve al último commit) |
| Casi todas las pruebas de móvil fallan | Es lo esperado con `"fallarDesde": "porMejorar"`: el performance móvil queda en 🟡. Ver sección 5 |

Más detalle (qué hacer si se borra algo, cambios frecuentes) en `entregas/Guia-Proyecto-Metricas-Web.docx`.
