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

// Comando reutilizable: mide una pagina en un dispositivo con Lighthouse
// y guarda el resultado en el JSON
// Uso: cy.medirPagina(pagina, dispositivo)
Cypress.Commands.add('medirPagina', (pagina, dispositivo) => {

    // Abrir la pagina con la resolucion del dispositivo (queda en el video / screenshot)
    cy.viewport(dispositivo.width, dispositivo.height);
    cy.visit(pagina.url);

    // Medir con Lighthouse (corre en Node) y guardar en el historial
    cy.task('medirLighthouse', { url: pagina.url, dispositivo }, { timeout: 180000 }).then((registro) => {
        cy.task('guardarMetrica', registro).then(() => {

            // Si la medicion falla, captura pantalla y marca error
            if (registro.status === 'error') {
                cy.screenshot(`error_${pagina.id}_${dispositivo.name}`).then(() => {
                    throw new Error(`Lighthouse fallo para ${pagina.id} en ${dispositivo.name}: ${registro.error}`);
                });
            } else {
                cy.log(`${pagina.nombre} en ${dispositivo.name}: performance ${registro.performance}`);
            }
        });
    });
})