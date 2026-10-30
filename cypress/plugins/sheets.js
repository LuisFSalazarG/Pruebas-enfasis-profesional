// sheets.js
// Envia las mediciones de cypress/fixtures/lighthouse-metrics.json al Google Sheet del informe
// por medio del Apps Script publicado como aplicacion web (scripts/apps-script/Codigo.gs).
// El Apps Script no duplica filas: se puede enviar todo el historial cada vez.
// Configuracion en el archivo .env: SHEETS_URL y SHEETS_TOKEN

const fs = require('fs');
const path = require('path');

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

// "1.5 s" -> 1.5   |   null -> ''
function aNumero(texto) {
    const coincidencia = String(texto ?? '').match(/[\d.]+/);
    return coincidencia ? Number(coincidencia[0]) : '';
}

// Etiqueta segun los rangos de thresholds.json (se envia como texto: funciona en cualquier idioma del Sheet)
function clasificar(valor, rango) {
    if (valor === '') return '';
    const menorEsMejor = rango.mejorEs === 'menor';
    const bueno = menorEsMejor ? valor <= rango.bueno : valor >= rango.bueno;
    const porMejorar = menorEsMejor ? valor <= rango.porMejorar : valor >= rango.porMejorar;
    if (bueno) return '🟢 Bueno';
    if (porMejorar) return '🟡 Por mejorar';
    return '🔴 Deficiente';
}

// Convierte un registro del JSON en una fila de la tabla del informe
function prepararFila(registro, paginas, dispositivos, rangos) {
    const nombreDispositivo = registro.screenEmulation.split(' (')[0];
    const dispositivo = dispositivos.find((d) => d.name === nombreDispositivo);
    const pagina = paginas.find((p) => p.url === registro.url);
    const ok = registro.status === 'ok';
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
        clasificacion: [
            clasificar(fcp, rangos.firstContentfulPaint),
            clasificar(lcp, rangos.largestContentfulPaint),
            clasificar(si, rangos.speedIndex),
            clasificar(performance, rangos.performance)
        ],
        estado: ok ? '✅ ok' : `❌ ${registro.error}`
    };
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
    const filas = leerJson('lighthouse-metrics.json').map((r) => prepararFila(r, paginas, dispositivos, rangos));

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
