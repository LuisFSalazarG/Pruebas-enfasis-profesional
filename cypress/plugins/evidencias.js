// evidencias.js
// Guarda los screenshots y videos de los fallos en cypress/evidencias/ con fecha en el nombre.
// Cypress limpia cypress/screenshots y cypress/videos al inicio de cada corrida,
// asi que aqui se conservan las evidencias de todas las corridas.

const fs = require('fs');
const path = require('path');

const CARPETA = path.join(__dirname, '..', 'evidencias');

// Fecha y hora de Bogota para el nombre del archivo: 2026-10-29_22-22-08
function sello() {
    const bogota = new Date(Date.now() - 5 * 60 * 60 * 1000);
    return bogota.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
}

function copiarEvidencia(subcarpeta, origen, nombre) {
    const destino = path.join(CARPETA, subcarpeta);
    fs.mkdirSync(destino, { recursive: true });
    fs.copyFileSync(origen, path.join(destino, `${sello()}_${nombre}`));
}

// Cada screenshot se toma solo cuando algo falla: se copia a evidencias/screenshots
function guardarScreenshot(detalles) {
    try {
        copiarEvidencia('screenshots', detalles.path, path.basename(detalles.path));
    } catch (error) {
        console.log(`No se pudo guardar el screenshot en evidencias: ${error.message}`);
    }
}

// Si algun test fallo, el video se copia a evidencias/videos; luego se borra el original
function procesarVideo(results, nombreJob) {
    if (!results || !results.video || !fs.existsSync(results.video)) return;
    try {
        if (results.stats.failures > 0) {
            copiarEvidencia('videos', results.video, `${nombreJob || 'manual'}_${path.basename(results.video)}`);
        }
        fs.unlinkSync(results.video);
    } catch (error) {
        console.log(`No se pudo procesar el video: ${error.message}`);
    }
}

module.exports = { guardarScreenshot, procesarVideo, sello, CARPETA };
