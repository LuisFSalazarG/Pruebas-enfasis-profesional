// Codigo.gs
// Apps Script del Google Sheet "Informe-Metricas-Web-UAM" (Extensiones > Apps Script).
// Recibe las mediciones que envia el proyecto Cypress y las escribe en la pestaña Informe.
// Solo escribe filas: no cambia la portada, los formatos ni el formato condicional.
//
// Publicar: Implementar > Nueva implementacion > Aplicacion web
//   Ejecutar como: Yo   |   Quien tiene acceso: Cualquier usuario
// Al cambiar el codigo: Implementar > Gestionar implementaciones > editar > Version: nueva version

const TOKEN = 'PEGAR_AQUI_EL_SHEETS_TOKEN_DEL_.env';
const HOJA = 'Informe';
const FILA_INICIO = 9;   // primera fila de datos (la 8 son los encabezados)
const COL_CLAVE = 14;    // columna N (oculta): evita escribir dos veces la misma medicion

// Para probar en el navegador que la URL funciona
function doGet() {
  return responder({ ok: true, mensaje: 'Puente de metricas activo' });
}

function doPost(e) {
  const candado = LockService.getScriptLock();
  candado.waitLock(30000);
  try {
    const datos = JSON.parse(e.postData.contents);
    if (datos.token !== TOKEN) {
      return responder({ ok: false, error: 'token invalido' });
    }
    const libro = SpreadsheetApp.getActiveSpreadsheet();
    libro.setSpreadsheetTimeZone('America/Bogota');   // fechas en hora de Colombia
    const hoja = libro.getSheetByName(HOJA);
    const filas = datos.filas || [];
    const agregadas = agregarFilas(hoja, filas);
    completarEnlacesYClasificacion(hoja, filas);
    return responder({ ok: true, agregadas: agregadas, recibidas: filas.length });
  } catch (error) {
    return responder({ ok: false, error: String(error) });
  } finally {
    candado.releaseLock();
  }
}

function agregarFilas(hoja, filas) {
  // Columna N oculta con la clave de cada medicion (se crea si la hoja no la tiene)
  if (hoja.getMaxColumns() < COL_CLAVE) {
    hoja.insertColumnsAfter(hoja.getMaxColumns(), COL_CLAVE - hoja.getMaxColumns());
  }
  if (hoja.getRange(FILA_INICIO - 1, COL_CLAVE).getValue() !== 'Clave') {
    hoja.getRange(FILA_INICIO - 1, COL_CLAVE).setValue('Clave');
    hoja.hideColumns(COL_CLAVE);
  }

  const ultima = Math.max(hoja.getLastRow(), FILA_INICIO - 1);
  const existentes = new Set(leerClaves(hoja, ultima));
  const nuevas = filas.filter((f) => !existentes.has(f.clave));
  if (nuevas.length === 0) return 0;

  const primera = ultima + 1;
  const faltan = primera + nuevas.length - 1 - hoja.getMaxRows();
  if (faltan > 0) hoja.insertRowsAfter(hoja.getMaxRows(), faltan);

  // Solo valores (sin formulas): la columna C se convierte en enlace despues
  const valores = nuevas.map((f) => [
    f.pantalla, f.resolucion, f.nombre, new Date(f.fecha),
    f.fcp, f.lcp, f.si, f.performance,
    ...f.clasificacion,
    f.estado, f.clave
  ]);
  hoja.getRange(primera, 1, valores.length, COL_CLAVE).setValues(valores);

  // Mismo formato de la primera fila de la tabla (bordes, "1.5 s", fecha)
  hoja.getRange(FILA_INICIO, 1, 1, 13)
    .copyTo(hoja.getRange(primera, 1, valores.length, 13), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);

  return nuevas.length;
}

// Para todas las filas de la tabla: nombre de la pagina con enlace (columna C)
// y clasificacion como texto (I-L). Asi tambien se reparan filas anteriores.
// No se usan formulas: en un Sheet en español las formulas con comas dan #ERROR!
function completarEnlacesYClasificacion(hoja, filas) {
  const ultima = hoja.getLastRow();
  if (ultima < FILA_INICIO) return;
  const total = ultima - FILA_INICIO + 1;

  const porClave = new Map(filas.map((f) => [f.clave, f]));
  const claves = leerClaves(hoja, ultima);
  const rangoC = hoja.getRange(FILA_INICIO, 3, total, 1);
  const actuales = rangoC.getRichTextValues();
  const enlaces = claves.map((clave, i) => {
    const f = porClave.get(clave);
    if (!f) return actuales[i];
    return [SpreadsheetApp.newRichTextValue().setText(f.nombre).setLinkUrl(f.url).build()];
  });
  rangoC.setRichTextValues(enlaces);

  const rangoClasif = hoja.getRange(FILA_INICIO, 9, total, 4);
  const clasifActual = rangoClasif.getValues();
  const clasificaciones = claves.map((clave, i) => {
    const f = porClave.get(clave);
    return f ? f.clasificacion : clasifActual[i];
  });
  rangoClasif.setValues(clasificaciones);
}

function leerClaves(hoja, ultima) {
  if (ultima < FILA_INICIO) return [];
  return hoja.getRange(FILA_INICIO, COL_CLAVE, ultima - FILA_INICIO + 1, 1).getValues()
    .map((fila) => String(fila[0]));
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
