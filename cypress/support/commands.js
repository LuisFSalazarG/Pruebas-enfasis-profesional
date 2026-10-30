// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

import rangos from '../fixtures/thresholds.json';
import { clasificarRegistro, metricasQueFallan } from '../plugins/clasificacion';

// Comando reutilizable: mide una pagina en un dispositivo con Lighthouse
// y guarda el resultado en el JSON
// Uso: cy.medirPagina(pagina, dispositivo)
Cypress.Commands.add('medirPagina', (pagina, dispositivo) => {

    // Abrir la pagina con la resolucion del dispositivo (queda en el video / screenshot)
    // failOnStatusCode: false -> si la pagina responde 404/500 igual se mide y el error queda en el JSON
    cy.viewport(dispositivo.width, dispositivo.height);
    cy.visit(pagina.url, { failOnStatusCode: false });

    // Medir con Lighthouse (corre en Node) y guardar en el historial
    cy.task('medirLighthouse', { url: pagina.url, dispositivo }, { timeout: 180000 }).then((registro) => {
        cy.task('guardarMetrica', registro).then(() => {

            // Si la medicion falla, captura pantalla y marca error
            if (registro.status === 'error') {
                cy.screenshot(`error_${pagina.id}_${dispositivo.name}`).then(() => {
                    throw new Error(`Lighthouse fallo para ${pagina.id} en ${dispositivo.name}: ${registro.error}`);
                });
                return;
            }

            // Si alguna metrica queda por debajo del rango (fallarDesde en thresholds.json),
            // la prueba falla: captura pantalla y queda el video como evidencia
            const etiquetas = clasificarRegistro(registro, rangos);
            const fallan = metricasQueFallan(etiquetas, rangos.fallarDesde);
            if (fallan.length > 0) {
                const detalle = fallan.map(([metrica, etiqueta]) => `${metrica} ${etiqueta}`).join(', ');
                cy.screenshot(`rendimiento_${pagina.id}_${dispositivo.name}`).then(() => {
                    throw new Error(`Rendimiento por debajo del rango en ${pagina.nombre} (${dispositivo.name}): ${detalle}`);
                });
            } else {
                cy.log(`${pagina.nombre} en ${dispositivo.name}: performance ${registro.performance}`);
            }
        });
    });
})