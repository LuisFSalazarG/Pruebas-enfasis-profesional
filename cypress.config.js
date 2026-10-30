//aca van las variables globales
const { defineConfig } = require("cypress");
const fs = require("fs");
const { prepareAudit } = require("@cypress-audit/lighthouse");
const { medirLighthouse } = require("./cypress/plugins/lighthouse");
const { guardarMetrica } = require("./cypress/plugins/metrics");

module.exports = defineConfig({
  e2e: {
    chromeWebSecurity: false,
    baseUrl: "https://www.autonoma.edu.co",
    pageLoadTimeout: 120000, // 120 segundos
    supportFile: "cypress/support/e2e.js",
    video: true,
    screenshotOnRunFailure: true,
    trashAssetsBeforeRuns: false, // conservar screenshots y videos de corridas anteriores (evidencias)
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

      // Conservar el video solo si algun test del spec fallo
      on('after:spec', (spec, results) => {
        if (results && results.video && results.stats.failures === 0 && fs.existsSync(results.video)) {
          fs.unlinkSync(results.video);
        }
      });

      // Si el cron pasa un job (--expose job=movil), medir solo sus dispositivos y paginas
      const nombreJob = config.expose && config.expose.job;
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
