// lighthouse.js
// Mide una pagina con el plugin @cypress-audit/lighthouse en el Chrome que abre Cypress
// y devuelve un registro con las metricas en segundos

const { lighthouse } = require('@cypress-audit/lighthouse');

// Agentes de usuario que usa Lighthouse para simular celular o computador
const USER_AGENTS = {
    mobile: 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Mobile Safari/537.36',
    desktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
};

// Red y CPU simuladas (valores por defecto de Lighthouse para movil y escritorio)
const THROTTLING = {
    mobile: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
    desktop: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 }
};

// Arma la configuracion de Lighthouse a partir de un dispositivo de devices.json
function configuracionDe(dispositivo) {
    const tipo = dispositivo.mobile ? 'mobile' : 'desktop';
    return {
        extends: 'lighthouse:default',
        settings: {
            formFactor: tipo,
            screenEmulation: {
                mobile: dispositivo.mobile,
                width: dispositivo.width,
                height: dispositivo.height,
                deviceScaleFactor: dispositivo.mobile ? 2 : 1,
                disabled: false
            },
            emulatedUserAgent: USER_AGENTS[tipo],
            throttling: THROTTLING[tipo]
        }
    };
}

// Mide una pagina en un dispositivo. Nunca lanza error:
// si algo falla devuelve el registro con status "error" y el mensaje
// Formato del registro igual al ejemplo de la profesora (tiempos como "4.3 s")
async function medirLighthouse({ url, dispositivo }) {
    const registro = {
        url,
        screenEmulation: `${dispositivo.name} (${dispositivo.width}x${dispositivo.height})`,
        timestamp: new Date().toISOString(),
        firstContentfulPaint: null,
        largestContentfulPaint: null,
        speedIndex: null,
        performance: null,
        status: 'ok',
        error: null
    };

    try {
        // El plugin entrega el reporte completo de Lighthouse en el callback
        let reporte = null;
        const tarea = lighthouse((resultados) => {
            reporte = resultados.lhr;
        });

        // performance: 0 -> nunca falla por umbral; la clasificacion se hace con thresholds.json
        await tarea({ url, thresholds: { performance: 0 }, config: configuracionDe(dispositivo) });

        if (reporte.runtimeError) {
            throw new Error(`Lighthouse no pudo medir la pagina: ${reporte.runtimeError.message}`);
        }

        // displayValue es el texto que muestra Lighthouse en segundos, ej. "4.3 s"
        registro.timestamp = reporte.fetchTime;
        registro.firstContentfulPaint = reporte.audits['first-contentful-paint'].displayValue;
        registro.largestContentfulPaint = reporte.audits['largest-contentful-paint'].displayValue;
        registro.speedIndex = reporte.audits['speed-index'].displayValue;
        registro.performance = Math.round(reporte.categories.performance.score * 100);
    } catch (error) {
        registro.status = 'error';
        registro.error = error.message;
    }

    return registro;
}

module.exports = { medirLighthouse };
