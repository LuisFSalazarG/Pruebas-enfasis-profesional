// clasificacion.js
// Clasifica las metricas segun los rangos de cypress/fixtures/thresholds.json.
// Se usa en la prueba (decide si falla) y en sheets.js (etiquetas del informe).

const BUENO = '🟢 Bueno';
const POR_MEJORAR = '🟡 Por mejorar';
const DEFICIENTE = '🔴 Deficiente';

// "1.5 s" -> 1.5   |   null -> ''
function aNumero(texto) {
    const coincidencia = String(texto ?? '').match(/[\d.]+/);
    return coincidencia ? Number(coincidencia[0]) : '';
}

function clasificar(valor, rango) {
    if (valor === '') return '';
    const menorEsMejor = rango.mejorEs === 'menor';
    const bueno = menorEsMejor ? valor <= rango.bueno : valor >= rango.bueno;
    const porMejorar = menorEsMejor ? valor <= rango.porMejorar : valor >= rango.porMejorar;
    if (bueno) return BUENO;
    if (porMejorar) return POR_MEJORAR;
    return DEFICIENTE;
}

// Etiquetas de las 4 metricas de un registro del JSON
function clasificarRegistro(registro, rangos) {
    return {
        FCP: clasificar(aNumero(registro.firstContentfulPaint), rangos.firstContentfulPaint),
        LCP: clasificar(aNumero(registro.largestContentfulPaint), rangos.largestContentfulPaint),
        SI: clasificar(aNumero(registro.speedIndex), rangos.speedIndex),
        Performance: clasificar(registro.performance ?? '', rangos.performance)
    };
}

// Metricas que hacen fallar la prueba segun "fallarDesde" de thresholds.json:
//   'porMejorar' -> falla con Por mejorar o Deficiente
//   'deficiente' -> falla solo con Deficiente
//   'nunca'      -> nunca falla por rendimiento
function metricasQueFallan(etiquetas, fallarDesde) {
    const malas = fallarDesde === 'porMejorar' ? [POR_MEJORAR, DEFICIENTE]
        : fallarDesde === 'deficiente' ? [DEFICIENTE]
            : [];
    return Object.entries(etiquetas).filter(([, etiqueta]) => malas.includes(etiqueta));
}

module.exports = { aNumero, clasificar, clasificarRegistro, metricasQueFallan };
