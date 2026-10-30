// enviar-sheets.js
// Envia a mano el historial de metricas al Google Sheet del informe.
// Uso: npm run sheets   (por ejemplo despues de npm run metricas)

const { enviarASheets } = require('../cypress/plugins/sheets');

enviarASheets()
    .then((resultado) => {
        if (resultado.ok) {
            console.log(`Sheets: ${resultado.agregadas} filas nuevas (de ${resultado.recibidas} mediciones enviadas)`);
        } else {
            console.log(`Sheets: no se envio -> ${resultado.error}`);
            process.exitCode = 1;
        }
    })
    .catch((error) => {
        console.log(`Sheets: error al enviar -> ${error.message}`);
        process.exitCode = 1;
    });
