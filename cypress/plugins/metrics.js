// metrics.js
// Guarda cada medicion en cypress/fixtures/lighthouse-metrics.json
// sin borrar las anteriores (historial)

const fs = require('fs');
const path = require('path');

const ARCHIVO = path.join(__dirname, '..', 'fixtures', 'lighthouse-metrics.json');

function guardarMetrica(registro) {
    const contenido = fs.existsSync(ARCHIVO) ? fs.readFileSync(ARCHIVO, 'utf8').trim() : '';
    const historial = contenido ? JSON.parse(contenido) : [];

    historial.push(registro);
    fs.writeFileSync(ARCHIVO, JSON.stringify(historial, null, 4) + '\n');

    // cy.task necesita que la tarea devuelva algo distinto de undefined
    return null;
}

module.exports = { guardarMetrica };
