//aca van las variables globales
const { defineConfig } = require("cypress");
const { prepareAudit } = require("@cypress-audit/lighthouse");
const { medirLighthouse } = require("./cypress/plugins/lighthouse");
const { guardarMetrica } = require("./cypress/plugins/metrics");
const { guardarScreenshot, procesarVideo } = require("./cypress/plugins/evidencias");

module.exports = defineConfig({
  e2e: {
    chromeWebSecurity: false,
    baseUrl: "https://www.autonoma.edu.co",
    pageLoadTimeout: 120000, // 120 segundos
    supportFile: "cypress/support/e2e.js",
    video: true,
    videoCompression: false, // sin compresion: evita un segundo archivo de video y el renombrado
    screenshotOnRunFailure: true,
    // Cypress limpia screenshots/ y videos/ al iniciar cada corrida (evita choques de nombres);
    // las evidencias de los fallos quedan guardadas en cypress/evidencias/
    trashAssetsBeforeRuns: true,
    setupNodeEvents(on, config) {
      // Implementar event listeners aqui
      on('before:browser:launch', (browser = {}, launchOptions) => {
        if (browser.family === 'chromium') {
          launchOptions.args.push('--disable-web-security');
          // Lighthouse se conecta al mismo Chrome de Cypress por su puerto de depuracion
          prepareAudit(launchOptions);
          return launchOptions;
        }
      });

      // Tareas que corren en Node (fuera del navegador): medir y guardar en el JSON
      on('task', { medirLighthouse, guardarMetrica });

      // Si el cron pasa un job (--expose job=movil), medir solo sus dispositivos y paginas
      const nombreJob = config.expose && config.expose.job;

      // Evidencias: screenshots y videos solo de los fallos, guardados en cypress/evidencias/
      on('after:screenshot', guardarScreenshot);
      on('after:spec', (spec, results) => procesarVideo(results, nombreJob));

      if (nombreJob) {
        const { jobs = [] } = require("./config/schedule");
        const job = jobs.find((j) => j.nombre === nombreJob);
        if (!job) {
          throw new Error(`El job "${nombreJob}" no existe en config/schedule.js`);
        }
        config.expose.dispositivos = job.dispositivos;
        config.expose.paginas = job.paginas;
      }

      return config;
    },
  },
});
