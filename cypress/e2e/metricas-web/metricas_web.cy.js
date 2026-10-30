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

describe('Metricas web con Lighthouse - multi dispositivo', () => {

    dispositivosAMedir.forEach((dispositivo) => {
        describe(`Pruebas en ${dispositivo.name}`, () => {

            paginasAMedir.forEach((pagina) => {
                it(`Medir ${pagina.nombre} en ${dispositivo.name}`, () => {
                    cy.medirPagina(pagina, dispositivo);
                });
            });
        });
    });
});
