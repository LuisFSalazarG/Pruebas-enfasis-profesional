// metrics.js
// Guarda cada medicion en cypress/fixtures/lighthouse-metrics.json
// sin borrar las anteriores (historial)

const fs = require('fs');
const path = require('path');

const ARCHIVO = path.join(__dirname, '..', 'fixtures', 'lighthouse-metrics.json');

function esperar(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Lee el historial. Si el archivo esta a medio escribir (otro proceso guardando), reintenta
function leerHistorial() {
    for (let intento = 1; ; intento++) {
        const contenido = fs.existsSync(ARCHIVO) ? fs.readFileSync(ARCHIVO, 'utf8').replace(/^﻿/, '').trim() : '';
        try {
            return contenido ? JSON.parse(contenido) : [];
        } catch (error) {
            if (intento === 3) {
                throw new Error(`${path.basename(ARCHIVO)} esta danado (${error.message}). Recuperarlo con: git checkout -- cypress/fixtures/lighthouse-metrics.json`);
            }
            esperar(500);
        }
    }
}

function guardarMetrica(registro) {
    const historial = leerHistorial();
    historial.push(registro);

    // Escritura atomica: se escribe un archivo temporal y se renombra,
    // asi el JSON nunca queda a medias aunque se cierre el proceso
    const temporal = `${ARCHIVO}.tmp`;
    fs.writeFileSync(temporal, JSON.stringify(historial, null, 4) + '\n');
    fs.renameSync(temporal, ARCHIVO);

    // cy.task necesita que la tarea devuelva algo distinto de undefined
    return null;
}

module.exports = { guardarMetrica, leerHistorial };
