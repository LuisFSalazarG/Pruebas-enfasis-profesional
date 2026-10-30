// evidencia-cierre.js
// Evidencias cuando Cypress se cierra solo, sin terminar la corrida
// (en ese caso Cypress no alcanza a tomar screenshots):
//   - guarda la salida de la terminal en cypress/evidencias/logs
//   - toma un screenshot de cada pagina del job con Chrome (sin Cypress)
//   - si el reintento tambien falla, registra el error en el JSON de metricas

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { guardarMetrica } = require('../cypress/plugins/metrics');
const { sello, CARPETA } = require('../cypress/plugins/evidencias');
const paginas = require('../cypress/fixtures/pages.json');
const dispositivos = require('../cypress/fixtures/devices.json');

const RUTAS_CHROME = [
    path.join(process.env.ProgramFiles || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe')
];

// Mismo filtro del spec: 'todos' / 'todas' o una lista
function filtrar(lista, filtro, campo) {
    if (!filtro || filtro === 'todos' || filtro === 'todas') return lista;
    return lista.filter((item) => filtro.includes(item[campo]));
}

// Paginas x dispositivos que mide un job
function medicionesDelJob(job) {
    const resultado = [];
    filtrar(dispositivos, job.dispositivos, 'name').forEach((dispositivo) => {
        filtrar(paginas, job.paginas, 'id').forEach((pagina) => resultado.push({ pagina, dispositivo }));
    });
    return resultado;
}

function guardarLog(job, salida) {
    const carpeta = path.join(CARPETA, 'logs');
    fs.mkdirSync(carpeta, { recursive: true });
    const archivo = path.join(carpeta, `${sello()}_${job.nombre}_cypress.log`);
    fs.writeFileSync(archivo, salida || '(Cypress no imprimio nada)');
    return path.relative(path.join(__dirname, '..'), archivo);
}

// Screenshot de cada pagina con la resolucion de cada dispositivo, usando Chrome sin Cypress
function tomarScreenshots(job) {
    const chrome = RUTAS_CHROME.find((ruta) => fs.existsSync(ruta));
    if (!chrome) return [];

    const carpeta = path.join(CARPETA, 'screenshots');
    fs.mkdirSync(carpeta, { recursive: true });
    const archivos = [];
    medicionesDelJob(job).forEach(({ pagina, dispositivo }) => {
        const archivo = path.join(carpeta, `${sello()}_cierre_${pagina.id}_${dispositivo.name}.png`);
        try {
            execFileSync(chrome, [
                '--headless=new', '--disable-gpu', '--hide-scrollbars',
                `--window-size=${dispositivo.width},${dispositivo.height}`,
                `--screenshot=${archivo}`, pagina.url
            ], { timeout: 60000, stdio: 'ignore' });
            archivos.push(archivo);
        } catch (error) {
            // si la pagina tampoco carga en Chrome, se sigue con las demas
        }
    });
    return archivos;
}

// Un registro de error por cada pagina x dispositivo que no se pudo medir
function registrarErrores(job, mensaje) {
    medicionesDelJob(job).forEach(({ pagina, dispositivo }) => {
        guardarMetrica({
            url: pagina.url,
            screenEmulation: `${dispositivo.name} (${dispositivo.width}x${dispositivo.height})`,
            timestamp: new Date().toISOString(),
            firstContentfulPaint: null,
            largestContentfulPaint: null,
            speedIndex: null,
            performance: null,
            status: 'error',
            error: mensaje
        });
    });
}

module.exports = { guardarLog, tomarScreenshots, registrarErrores };
