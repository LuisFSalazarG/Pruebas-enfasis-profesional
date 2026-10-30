// sheets.js
// Envia las mediciones de cypress/fixtures/lighthouse-metrics.json al Google Sheet del informe
// por medio del Apps Script publicado como aplicacion web (scripts/apps-script/Codigo.gs).
// El Apps Script no duplica filas: se puede enviar todo el historial cada vez.
// Configuracion en el archivo .env: SHEETS_URL y SHEETS_TOKEN

const fs = require('fs');
const path = require('path');
const { aNumero, clasificar, clasificarRegistro, metricasQueFallan } = require('./clasificacion');
const { leerHistorial } = require('./metrics');

const RAIZ = path.join(__dirname, '..', '..');
const FIXTURES = path.join(__dirname, '..', 'fixtures');

function leerJson(nombre) {
    return JSON.parse(fs.readFileSync(path.join(FIXTURES, nombre), 'utf8'));
}

function cargarEnv() {
    try {
        process.loadEnvFile(path.join(RAIZ, '.env'));
    } catch (error) {
        // sin .env: se usan las variables de entorno que ya existan
    }
}

// Convierte un registro del JSON en una fila de la tabla del informe
function prepararFila(registro, paginas, dispositivos, rangos) {
    const nombreDispositivo = registro.screenEmulation.split(' (')[0];
    const dispositivo = dispositivos.find((d) => d.name === nombreDispositivo);
    const pagina = paginas.find((p) => p.url === registro.url);
    const fcp = aNumero(registro.firstContentfulPaint);
    const lcp = aNumero(registro.largestContentfulPaint);
    const si = aNumero(registro.speedIndex);
    const performance = registro.performance ?? '';

    return {
        clave: `${registro.timestamp}|${registro.url}|${registro.screenEmulation}`,
        pantalla: dispositivo && !dispositivo.mobile ? '💻 Desktop' : '📱 Móvil',
        resolucion: registro.screenEmulation,
        url: registro.url,
        nombre: pagina ? pagina.nombre : registro.url,
        fecha: registro.timestamp,
        fcp, lcp, si, performance,
        // Etiquetas como texto (no formulas): funcionan en cualquier idioma del Sheet
        clasificacion: [
            clasificar(fcp, rangos.firstContentfulPaint),
            clasificar(lcp, rangos.largestContentfulPaint),
            clasificar(si, rangos.speedIndex),
            clasificar(performance, rangos.performance)
        ],
        estado: estadoDe(registro, rangos)
    };
}

// Columna Estado: error de medicion, falla por rendimiento (misma regla de la prueba) u ok
function estadoDe(registro, rangos) {
    if (registro.status !== 'ok') return `❌ ${registro.error}`;
    const fallan = metricasQueFallan(clasificarRegistro(registro, rangos), rangos.fallarDesde);
    if (fallan.length > 0) {
        return `❌ Falla: ${fallan.map(([metrica, etiqueta]) => `${metrica} ${etiqueta}`).join(', ')}`;
    }
    return '✅ ok';
}

async function enviarASheets() {
    cargarEnv();
    const url = process.env.SHEETS_URL;
    if (!url) {
        return { ok: false, omitido: true, error: 'falta SHEETS_URL en el .env' };
    }

    const paginas = leerJson('pages.json');
    const dispositivos = leerJson('devices.json');
    const rangos = leerJson('thresholds.json');
    const filas = leerHistorial().map((r) => prepararFila(r, paginas, dispositivos, rangos));

    const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ token: process.env.SHEETS_TOKEN, filas }),
        signal: AbortSignal.timeout(120000)
    });
    const texto = await respuesta.text();
    try {
        return JSON.parse(texto);
    } catch (error) {
        return { ok: false, error: `respuesta inesperada del Apps Script (HTTP ${respuesta.status}): ${texto.slice(0, 200)}` };
    }
}

module.exports = { enviarASheets, prepararFila };
