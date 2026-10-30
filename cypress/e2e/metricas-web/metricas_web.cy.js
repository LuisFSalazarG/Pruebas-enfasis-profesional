/// <reference types="cypress" />
import paginas from '../../fixtures/pages.json';
import dispositivos from '../../fixtures/devices.json';

// Si el cron manda un job, solo se miden sus dispositivos y paginas.
// Sin job (o con 'todos' / 'todas') se mide todo.
function filtrar(lista, filtro, campo) {
    if (!filtro || filtro === 'todos' || filtro === 'todas') {
        return lista;
    }
    return lista.filter((item) => filtro.includes(item[campo]));
}

const dispositivosAMedir = filtrar(dispositivos, Cypress.expose('dispositivos'), 'name');
const paginasAMedir = filtrar(paginas, Cypress.expose('paginas'), 'id');

// Registro de error con el mismo formato del JSON de metricas
function registroDeError(pagina, dispositivo, mensaje) {
    return {
        url: pagina.url,
        screenEmulation: `${dispositivo.name} (${dispositivo.width}x${dispositivo.height})`,
        timestamp: new Date().toISOString(),
        firstContentfulPaint: null,
        largestContentfulPaint: null,
        speedIndex: null,
        performance: null,
        status: 'error',
        error: mensaje.replace(/\s+/g, ' ').trim().slice(0, 300)
    };
}

describe('Metricas web con Lighthouse - multi dispositivo', () => {

    let medicionActual = null;

    // Si la prueba fallo antes de medir (ej. la pagina no cargo), el error igual queda en el JSON.
    // Los fallos de Lighthouse ya los guarda cy.medirPagina().
    afterEach(function () {
        const prueba = this.currentTest;
        const mensaje = prueba.err ? String(prueba.err.message) : 'Error desconocido';
        if (prueba.state === 'failed' && medicionActual && !mensaje.includes('Lighthouse fallo')) {
            cy.task('guardarMetrica', registroDeError(medicionActual.pagina, medicionActual.dispositivo, mensaje));
        }
    });

    dispositivosAMedir.forEach((dispositivo) => {
        describe(`Pruebas en ${dispositivo.name}`, () => {

            paginasAMedir.forEach((pagina) => {
                it(`Medir ${pagina.nombre} en ${dispositivo.name}`, () => {
                    medicionActual = { pagina, dispositivo };
                    cy.medirPagina(pagina, dispositivo);
                });
            });
        });
    });
});
