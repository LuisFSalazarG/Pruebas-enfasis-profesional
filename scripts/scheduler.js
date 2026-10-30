// scheduler.js
// Programa las ejecuciones de Cypress segun config/schedule.js
// Iniciar con: npm run scheduler  (dejar la terminal abierta)

const cron = require('node-cron');
const { spawn } = require('child_process');
const schedule = require('../config/schedule');
const { guardarLog, tomarScreenshots, registrarErrores } = require('./evidencia-cierre');
const { enviarASheets } = require('../cypress/plugins/sheets');

const SPEC = 'cypress/e2e/metricas-web/metricas_web.cy.js';
const ZONA = schedule.zonaHoraria;
const DIAS = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };

// Muestra un mensaje con la hora de Bogota
function log(mensaje) {
    const hora = new Date().toLocaleString('es-CO', { timeZone: ZONA });
    console.log(`[${hora}] ${mensaje}`);
}

// Quita tildes y pasa a minusculas: "Miércoles" -> "miercoles"
function normalizar(texto) {
    return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// ['lunes', 'miercoles'] -> "1,3"   |   'todos' -> "*"
function diasACron(dias) {
    if (!dias || dias === 'todos') return '*';
    return dias.map((dia) => {
        const numero = DIAS[normalizar(dia)];
        if (numero === undefined) {
            throw new Error(`dia "${dia}" no valido (usa: lunes, martes, miercoles, jueves, viernes, sabado, domingo)`);
        }
        return numero;
    }).join(',');
}

// Funcion generica: convierte "cada N unidad" + dias en una expresion cron
// Formato cron de 6 campos: segundo minuto hora diaDelMes mes diaDeLaSemana
function aCron(job) {
    const cada = job.cada;
    const unidad = normalizar(job.unidad);
    const dias = diasACron(job.dias);

    if (!Number.isInteger(cada) || cada <= 0) {
        throw new Error(`"cada" debe ser un numero entero mayor que 0 (recibido: ${cada})`);
    }
    if (unidad === 'segundos' && cada < 60 && 60 % cada === 0) {
        return `*/${cada} * * * * ${dias}`;
    }
    if (unidad === 'minutos' && cada < 60 && 60 % cada === 0) {
        return `0 */${cada} * * * ${dias}`;
    }
    if (unidad === 'horas' && cada < 24 && 24 % cada === 0) {
        return `0 0 */${cada} * * ${dias}`;
    }
    throw new Error(`"cada ${cada} ${job.unidad}" no se puede programar exacto. Segundos/minutos: 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30. Horas: 1, 2, 3, 4, 6, 8, 12`);
}

// Solo corre un Cypress a la vez: si hay uno corriendo, el job espera su turno
const cola = [];
let jobActual = null;

function pedirEjecucion(job) {
    if (jobActual === job.nombre || cola.some((j) => j.nombre === job.nombre)) {
        log(`Job "${job.nombre}" sigue corriendo o en espera, se omite esta vuelta`);
        return;
    }
    cola.push(job);
    ejecutarSiguiente();
}

// Pausa entre corridas: le da tiempo al Chrome de la corrida anterior de cerrarse
// (si no, Cypress puede quedarse esperando la conexion con Chrome y cerrarse)
const PAUSA_ENTRE_CORRIDAS_MS = 5000;
let enPausa = false;

function ejecutarSiguiente() {
    if (jobActual || enPausa || cola.length === 0) return;

    const job = cola.shift();
    jobActual = job.nombre;
    const inicio = Date.now();
    log(`Inicia job "${job.nombre}"${job.esReintento ? ' (reintento)' : ''}`);

    const comando = `npx cypress run --browser chrome --spec ${SPEC} --expose job=${job.nombre}`;
    const proceso = spawn(comando, { stdio: ['inherit', 'pipe', 'pipe'], shell: true });

    // Se muestra la salida de Cypress en la terminal y tambien se guarda por si hay que dejarla como evidencia
    let salida = '';
    const copiar = (destino) => (datos) => {
        destino.write(datos);
        salida = (salida + datos.toString()).slice(-200000);
    };
    proceso.stdout.on('data', copiar(process.stdout));
    proceso.stderr.on('data', copiar(process.stderr));

    proceso.on('close', (codigo) => {
        const duracion = Math.round((Date.now() - inicio) / 1000);
        log(`Termina job "${job.nombre}" en ${duracion} s (codigo de salida ${codigo})`);
        jobActual = null;

        // Si Cypress termina bien su corrida imprime "(Run Finished)", aunque alguna prueba falle.
        // Si no lo imprimio, Cypress se cerro solo: no alcanzo a tomar screenshots, se toman aqui
        const seCerroSolo = codigo !== 0 && !salida.includes('(Run Finished)');

        if (seCerroSolo) {
            const archivoLog = guardarLog(job, salida);
            const capturas = tomarScreenshots(job);
            log(`Job "${job.nombre}": Cypress se cerro sin terminar. Log: ${archivoLog} | screenshots: ${capturas.length}`);

            if (!job.esReintento) {
                log(`Job "${job.nombre}": se reintenta una vez`);
                cola.unshift({ ...job, esReintento: true });
            } else {
                registrarErrores(job, `Cypress se cerro sin terminar (codigo ${codigo}); ver ${archivoLog}`);
                log(`Job "${job.nombre}": el reintento tambien fallo, el error quedo registrado en el JSON`);
            }
        } else if (codigo !== 0) {
            log(`Job "${job.nombre}" con fallos: revisa el JSON y cypress/evidencias/`);
        }

        // Cada vez que termina un job, el informe en Google Sheets se actualiza con el JSON
        enviarASheets()
            .then((r) => log(r.ok ? `Sheets: ${r.agregadas} filas nuevas en el informe` : `Sheets: no se envio -> ${r.error}`))
            .catch((error) => log(`Sheets: error al enviar -> ${error.message}`));

        enPausa = true;
        setTimeout(() => {
            enPausa = false;
            ejecutarSiguiente();
        }, PAUSA_ENTRE_CORRIDAS_MS);
    });
}

// Programar cada job habilitado
const habilitados = schedule.jobs.filter((job) => job.habilitado);

if (habilitados.length === 0) {
    log('No hay jobs habilitados en config/schedule.js');
    process.exit(0);
}

habilitados.forEach((job) => {
    try {
        const expresion = aCron(job);
        cron.schedule(expresion, () => pedirEjecucion(job), { timezone: ZONA });
        log(`Job "${job.nombre}" programado cada ${job.cada} ${job.unidad}, dias: ${job.dias} (cron: ${expresion})`);
    } catch (error) {
        log(`Job "${job.nombre}" NO se programo: ${error.message}`);
    }
});

log('Scheduler activo. Deja esta terminal abierta (Ctrl + C para detener).');
