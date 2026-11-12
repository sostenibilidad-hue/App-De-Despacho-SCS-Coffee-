/**
 * BACKEND — App Reporte CSC Coffee and Softs Company S.A.S.
 * ------------------------------------------------------------
 * IMPORTANTE: este archivo vive únicamente dentro de Google Apps Script.
 * NO lo subas a GitHub. Solo index.html, app.js, logos.js, manifest.json
 * e íconos van a GitHub Pages.
 *
 * ESTRUCTURA: el Google Sheet maneja SOLO 3 hojas:
 *   1) Usuarios : Cedula | Nombre | ClaveHash | Rol | Estado | FechaSolicitud | AceptaPolitica
 *   2) Datos    : Id_Reporte | Fecha | Placa | Lotes | Responsable | Documentos Anexos
 *   3) Imagen   : Id_Reporte | Id_Imagen | Ruta | Fecha   (una fila por foto)
 *
 * REGLAS:
 *  - Cada registro nuevo (reporte o foto) se guarda en la FILA 2 (justo
 *    debajo del encabezado): lo más nuevo siempre arriba.
 *  - Las FOTOS van en una carpeta de Drive que contiene SOLO imágenes
 *    (IMAGES_FOLDER_NAME). Cada archivo se llama
 *    <Id_Reporte>_<Id_Imagen>_<nombre>, así se pueden buscar por reporte
 *    directamente en Drive. El "Documento anexo" va en otra carpeta aparte
 *    (DOCS_FOLDER_NAME) para no mezclarlo con las fotos.
 */
const SPREADSHEET_ID = '1DG3s5FJ7b9rN3REQxfsvzNg7_Eh8HHqcrRrHkK3eeU4';
const ROOT_FOLDER_ID = '1FvEaNaeUWo6CF8q33Gzk7waEil6pPIe1';
const SALT = 'sucden-reporte-2026'; // NO cambiar: las claves ya creadas dependen de este valor

const USERS_SHEET_NAME = 'Usuarios';
const DATA_SHEET_NAME  = 'Datos';
const IMG_SHEET_NAME   = 'Imagen';
const ID_HEADER = 'Id_Reporte';
const IMAGES_FOLDER_NAME = 'CSC_Imagenes';   // SOLO fotos
const DOCS_FOLDER_NAME   = 'CSC_Documentos'; // documento anexo principal

// Encabezados EXACTOS (con sus espacios finales) que usa app.js.
const DATA_HEADERS = [
  'Id_Reporte', 'Fecha ', 'Placa Del Vehiculo ', 'Numero De Lotes ',
  'Nom: Del Respnsable del Despacho ', 'Documentos Anexos'
];
const IMG_HEADERS = ['Id_Reporte', 'Id_Imagen', 'Ruta', 'Fecha'];

/* ------------------------- ENTRADA HTTP ------------------------- */

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'list') return jsonResponse({ ok: true, records: listRecords() });
    if (action === 'listImages') return jsonResponse({ ok: true, images: listImages(e.parameter.reportId) });
    if (action === 'listPendingUsers') return jsonResponse({ ok: true, users: listPendingUsers(e.parameter.adminCedula) });
    if (action === 'listUsers') return jsonResponse({ ok: true, users: listAllUsers(e.parameter.adminCedula) });
    if (action === 'pendingPhotos') return jsonResponse({ ok: true, pending: getPendingPhotoReports() });
    if (action === 'mainFile') return jsonResponse(getMainFileUrl(e.parameter.path));
    return jsonResponse({ ok: false, error: 'Acción no reconocida: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'create') return jsonResponse({ ok: true, result: createRecord(body) });
    if (body.action === 'update') return jsonResponse({ ok: true, result: updateRecord(body) });
    if (body.action === 'addImage') return jsonResponse({ ok: true, result: addImage(body) });
    if (body.action === 'delete') return jsonResponse({ ok: true, result: deleteRecord(body) });
    if (body.action === 'deleteImage') return jsonResponse({ ok: true, result: deleteImage(body) });
    if (body.action === 'login') return jsonResponse(login(body.cedula, body.clave));
    if (body.action === 'requestAccess') return jsonResponse({ ok: true, result: requestAccess(body) });
    if (body.action === 'approveUser') return jsonResponse({ ok: true, result: setUserStatus(body.adminCedula, body.cedula, 'autorizado') });
    if (body.action === 'rejectUser') return jsonResponse({ ok: true, result: setUserStatus(body.adminCedula, body.cedula, 'rechazado') });
    return jsonResponse({ ok: false, error: 'Acción no reconocida: ' + body.action });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------- HOJAS ------------------------- */

function getSpreadsheet() { return SpreadsheetApp.openById(SPREADSHEET_ID); }

/** Devuelve la hoja; si no existe, la crea con sus encabezados. */
function getOrCreateSheet(name, headers) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getUsersSheet() {
  return getOrCreateSheet(USERS_SHEET_NAME,
    ['Cedula', 'Nombre', 'ClaveHash', 'Rol', 'Estado', 'FechaSolicitud', 'AceptaPolitica']);
}
function getDataSheet() { return getOrCreateSheet(DATA_SHEET_NAME, DATA_HEADERS); }
function getImgSheet()  { return getOrCreateSheet(IMG_SHEET_NAME, IMG_HEADERS); }

/** Inserta una fila nueva en la posición 2 (debajo del encabezado). */
function insertRowsAtTop(sheet, rows) {
  if (!rows.length) return;
  sheet.insertRowsBefore(2, rows.length);
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function findHeaderRow(data, mustContain) {
  for (let i = 0; i < data.length; i++) {
    if (data[i].some(c => String(c).indexOf(mustContain) !== -1)) return i;
  }
  return 0;
}

function normalizeHeader(h) {
  return String(h).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function normalizeId(v) { return String(v == null ? '' : v).trim(); }

/* ------------------------- USUARIOS / LOGIN ------------------------- */

function hashClave(clave) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, clave + SALT);
  return digest.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
}

function findUserRow(sheet, cedula) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(cedula)) return { rowIndex: i + 1, row: data[i] };
  }
  return null;
}

function login(cedula, clave) {
  if (!cedula || !clave) return { ok: false, error: 'Ingresa cédula y clave.' };
  const sheet = getUsersSheet();
  const found = findUserRow(sheet, cedula);
  if (!found) return { ok: false, error: 'Cédula no registrada. Solicita acceso primero.' };
  const [, nombre, claveHash, rol, estado] = found.row;
  if (estado !== 'autorizado') return { ok: false, error: 'Tu acceso aún no ha sido autorizado por el administrador.' };
  if (hashClave(clave) !== claveHash) return { ok: false, error: 'Clave incorrecta.' };
  return { ok: true, user: { cedula: String(cedula), nombre, rol } };
}

function requestAccess(body) {
  const { cedula, nombre, clave, aceptaPolitica } = body;
  if (!cedula || !nombre || !clave) throw new Error('Faltan datos para la solicitud.');
  if (!aceptaPolitica) throw new Error('Debes aceptar la política de tratamiento de datos personales.');
  const sheet = getUsersSheet();
  if (findUserRow(sheet, cedula)) throw new Error('Esa cédula ya está registrada.');
  // Solicitud nueva: también arriba (fila 2).
  insertRowsAtTop(sheet, [[String(cedula), nombre, hashClave(clave), 'usuario', 'pendiente', new Date(), 'Sí']]);
  return { pending: true };
}

function requireAdmin(adminCedula) {
  const found = findUserRow(getUsersSheet(), adminCedula);
  if (!found || found.row[3] !== 'admin' || found.row[4] !== 'autorizado') throw new Error('No autorizado.');
}

function listPendingUsers(adminCedula) {
  requireAdmin(adminCedula);
  const data = getUsersSheet().getDataRange().getValues();
  const out = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][4] === 'pendiente') out.push({ cedula: String(data[i][0]), nombre: data[i][1], fecha: data[i][5] });
  }
  return out;
}

function listAllUsers(adminCedula) {
  requireAdmin(adminCedula);
  const data = getUsersSheet().getDataRange().getValues();
  const out = [];
  for (let i = 1; i < data.length; i++) {
    out.push({ cedula: String(data[i][0]), nombre: data[i][1], rol: data[i][3], estado: data[i][4] });
  }
  return out;
}

function setUserStatus(adminCedula, cedula, estado) {
  requireAdmin(adminCedula);
  const sheet = getUsersSheet();
  const found = findUserRow(sheet, cedula);
  if (!found) throw new Error('Usuario no encontrado.');
  sheet.getRange(found.rowIndex, 5).setValue(estado);
  return { cedula: String(cedula), estado };
}

/**
 * Crea (o promueve) un administrador. Edita las 3 constantes y ejecútala
 * UNA vez desde el editor de Apps Script. Después puedes borrar la clave
 * escrita aquí.
 */
function configurarAdmin() {
  const CEDULA = 'PON_AQUI_LA_CEDULA';
  const NOMBRE = 'Administrador';
  const CLAVE  = 'PON_AQUI_UNA_CLAVE_FUERTE';

  const sheet = getUsersSheet();
  const found = findUserRow(sheet, CEDULA);
  if (found) {
    sheet.getRange(found.rowIndex, 4).setValue('admin');
    sheet.getRange(found.rowIndex, 5).setValue('autorizado');
    Logger.log('La cédula ya existía: ahora es admin autorizado (no se tocó su clave).');
  } else {
    insertRowsAtTop(sheet, [[CEDULA, NOMBRE, hashClave(CLAVE), 'admin', 'autorizado', new Date(), 'Sí']]);
    Logger.log('Admin creado.');
  }
}

/* ------------------------- LECTURA DE REPORTES ------------------------- */

function listRecords() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('list_datos');
  if (cached) return JSON.parse(cached);

  const data = getDataSheet().getDataRange().getValues();
  const headerRow = findHeaderRow(data, ID_HEADER);
  // NO recortar (trim) los encabezados: app.js usa las llaves exactas.
  const headers = data[headerRow].map(h => String(h));
  const records = [];
  // La hoja ya está ordenada con lo más nuevo ARRIBA, así que NO se invierte.
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (row.every(c => c === '' || c === null)) continue;
    const rec = {};
    headers.forEach((h, idx) => { if (h) rec[h] = row[idx]; });
    records.push(rec);
  }

  try {
    const json = JSON.stringify(records);
    if (json.length < 95000) cache.put('list_datos', json, 30);
  } catch (e) { /* no crítico */ }
  return records;
}

function invalidateListCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove('list_datos');
    cache.remove('pending_datos');
  } catch (e) { /* no crítico */ }
}

/** Reportes que todavía no tienen ninguna foto adicional (campana). */
function getPendingPhotoReports() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('pending_datos');
  if (cached) return JSON.parse(cached);

  const imgData = getImgSheet().getDataRange().getValues();
  const idsConFoto = {};
  for (let i = 1; i < imgData.length; i++) {
    const id = normalizeId(imgData[i][0]);
    if (id) idsConFoto[id] = true;
  }

  const pendientes = listRecords()
    .filter(r => !idsConFoto[normalizeId(r[ID_HEADER])])
    .map(r => ({
      id: r[ID_HEADER],
      placa: r['Placa Del Vehiculo '] || '',
      fecha: r['Fecha '] || '',
      responsable: r['Nom: Del Respnsable del Despacho '] || ''
    }));

  try {
    const json = JSON.stringify(pendientes);
    if (json.length < 95000) cache.put('pending_datos', json, 30);
  } catch (e) { /* no crítico */ }
  return pendientes;
}

function listImages(reportId) {
  const data = getImgSheet().getDataRange().getValues();
  const wanted = reportId ? normalizeId(reportId) : null;
  const results = [];
  for (let i = 1; i < data.length; i++) {
    const [repId, imgId, path] = data[i];
    if (!path) continue;
    if (wanted && normalizeId(repId) !== wanted) continue;
    const fileId = getFileIdByPath(path);
    if (fileId) {
      results.push({
        reportId: repId,
        imageId: imgId,
        name: String(path).split('/').pop(),
        path: String(path),
        viewUrl: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1000',
        downloadUrl: 'https://drive.google.com/uc?export=download&id=' + fileId
      });
    }
  }
  return results;
}

/* ------------------------- ARCHIVOS EN DRIVE ------------------------- */

function getFileIdByPath(path) {
  const cache = CacheService.getScriptCache();
  const key = 'fileId_' + path;
  const cached = cache.get(key);
  if (cached) return cached;
  const id = resolveFileIdByPath_(path);
  if (id) { try { cache.put(key, id, 21600); } catch (e) {} }
  return id;
}

function resolveFileIdByPath_(path) {
  const parts = String(path).split('/');
  const fileName = parts.pop();
  let folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  let pathOk = true;
  for (const p of parts) {
    const next = findSubfolderFuzzy(folder, p);
    if (!next) { pathOk = false; break; }
    folder = next;
  }
  if (pathOk) {
    const id = findFileInFolder(folder, fileName);
    if (id) return id;
  }
  return findFileRecursive(DriveApp.getFolderById(ROOT_FOLDER_ID), fileName, 0);
}

function findSubfolderFuzzy(folder, name) {
  const exact = folder.getFoldersByName(name);
  if (exact.hasNext()) return exact.next();
  const target = normalizeHeader(name);
  const all = folder.getFolders();
  while (all.hasNext()) {
    const f = all.next();
    if (normalizeHeader(f.getName()) === target) return f;
  }
  return null;
}

function findFileInFolder(folder, fileName) {
  const exact = folder.getFilesByName(fileName);
  if (exact.hasNext()) return exact.next().getId();
  const all = folder.getFiles();
  while (all.hasNext()) {
    const f = all.next();
    if (f.getName().indexOf(fileName) !== -1) return f.getId();
  }
  return null;
}

function findFileRecursive(folder, fileName, depth) {
  if (depth > 4) return null;
  const id = findFileInFolder(folder, fileName);
  if (id) return id;
  const subs = folder.getFolders();
  while (subs.hasNext()) {
    const found = findFileRecursive(subs.next(), fileName, depth + 1);
    if (found) return found;
  }
  return null;
}

function getMainFileUrl(path) {
  if (!path) return { ok: true, viewUrl: '', downloadUrl: '' };
  const fileId = getFileIdByPath(path);
  if (!fileId) return { ok: false, error: 'Archivo no encontrado en Drive.' };
  return {
    ok: true,
    viewUrl: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1000',
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + fileId
  };
}

const _sharedFoldersThisRun = {};

/** Comparte la carpeta una sola vez; los archivos nuevos heredan el permiso. */
function ensureFolderShared(folder) {
  const id = folder.getId();
  if (_sharedFoldersThisRun[id]) return;
  try {
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (shareErr) {
    Logger.log('Aviso: no se pudo compartir la carpeta "' + folder.getName() + '": ' + shareErr.message);
  }
  _sharedFoldersThisRun[id] = true;
}

/**
 * Sube un archivo a una subcarpeta de la carpeta raíz (la crea si no existe).
 * El nombre queda como <prefix>_<nombre original>, p. ej. a1b2c3d4_f9e8d7c6_foto.jpg
 */
function uploadFileToFolder(fileData, folderName, prefix) {
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const it = root.getFoldersByName(folderName);
  const folder = it.hasNext() ? it.next() : root.createFolder(folderName);
  ensureFolderShared(folder);

  const bytes = Utilities.base64Decode(fileData.base64);
  const safeName = (prefix + '_' + fileData.filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  const file = folder.createFile(Utilities.newBlob(bytes, fileData.mimeType, safeName));
  return folderName + '/' + file.getName();
}

/* ------------------------- ESCRITURA DE REPORTES ------------------------- */

function createRecord(body) {
  const sheet = getDataSheet();
  const data = sheet.getDataRange().getValues();
  const headerRow = findHeaderRow(data, ID_HEADER);
  const headers = data[headerRow].map(h => String(h));

  const id = Utilities.getUuid().split('-')[0];
  const fields = body.fields || {};

  let mainFilePath = '';
  if (body.file) mainFilePath = uploadFileToFolder(body.file, DOCS_FOLDER_NAME, id);

  const row = headers.map(h => {
    if (h === ID_HEADER) return id;
    if (h === 'Documentos Anexos') return mainFilePath;
    return fields[h] !== undefined ? fields[h] : '';
  });

  // Siempre en la FILA 2 (el más nuevo arriba).
  sheet.insertRowsBefore(headerRow + 2, 1);
  sheet.getRange(headerRow + 2, 1, 1, row.length).setValues([row]);

  if (body.images && body.images.length) addImagesBulk(id, body.images);

  invalidateListCache();
  return { id: id };
}

function updateRecord(body) {
  const sheet = getDataSheet();
  const data = sheet.getDataRange().getValues();
  const headerRow = findHeaderRow(data, ID_HEADER);
  const headers = data[headerRow].map(h => String(h));
  const idColIdx = headers.indexOf(ID_HEADER);

  let targetRowIdx = -1;
  for (let i = headerRow + 1; i < data.length; i++) {
    if (String(data[i][idColIdx]) === String(body.id)) { targetRowIdx = i; break; }
  }
  if (targetRowIdx === -1) throw new Error('Reporte no encontrado.');

  const fields = body.fields || {};
  headers.forEach((h, colIdx) => {
    if (h === ID_HEADER || h === 'Documentos Anexos') return;
    if (fields[h] !== undefined) sheet.getRange(targetRowIdx + 1, colIdx + 1).setValue(fields[h]);
  });

  if (body.images && body.images.length) addImagesBulk(body.id, body.images);

  invalidateListCache();
  return { id: body.id, updated: true };
}

function deleteRecord(body) {
  const sheet = getDataSheet();
  const data = sheet.getDataRange().getValues();
  const headerRow = findHeaderRow(data, ID_HEADER);
  const headers = data[headerRow].map(h => String(h));
  const idColIdx = headers.indexOf(ID_HEADER);

  let targetRowIdx = -1;
  for (let i = headerRow + 1; i < data.length; i++) {
    if (String(data[i][idColIdx]) === String(body.id)) { targetRowIdx = i; break; }
  }
  if (targetRowIdx === -1) throw new Error('Reporte no encontrado.');

  sheet.deleteRow(targetRowIdx + 1);
  const imagesDeleted = deleteImagesForReport(body.id);

  invalidateListCache();
  return { id: body.id, deleted: true, imagesDeleted: imagesDeleted };
}

function deleteImagesForReport(reportId) {
  const sheet = getImgSheet();
  const data = sheet.getDataRange().getValues();
  const wanted = normalizeId(reportId);
  const cache = CacheService.getScriptCache();
  let deletedCount = 0;

  for (let i = data.length - 1; i >= 1; i--) {
    if (normalizeId(data[i][0]) !== wanted) continue;
    const path = data[i][2];
    if (path) {
      try {
        const fileId = getFileIdByPath(path);
        if (fileId) DriveApp.getFileById(fileId).setTrashed(true);
        cache.remove('fileId_' + path);
      } catch (e) { /* un archivo que falle no detiene el borrado */ }
    }
    sheet.deleteRow(i + 1);
    deletedCount++;
  }
  return deletedCount;
}

function deleteImage(body) {
  if (!body.path) throw new Error('Falta indicar qué foto borrar.');
  const sheet = getImgSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][2]) !== String(body.path)) continue;
    try {
      const fileId = getFileIdByPath(body.path);
      if (fileId) DriveApp.getFileById(fileId).setTrashed(true);
      CacheService.getScriptCache().remove('fileId_' + body.path);
    } catch (e) { /* igual se quita la fila */ }
    sheet.deleteRow(i + 1);
    invalidateListCache();
    return { deleted: true };
  }
  throw new Error('No se encontró esa foto (puede que ya se haya borrado).');
}

/** Sube UNA foto suelta a un reporte existente. */
function addImage(body) {
  addImagesBulk(body.reportId, [body.file]);
  invalidateListCache();
  return { added: 1 };
}

/**
 * Sube varias fotos de un reporte a la carpeta de IMÁGENES y agrega todas
 * sus filas a la hoja "Imagen" en una sola operación, arriba (fila 2).
 */
function addImagesBulk(reportId, files) {
  const sheet = getImgSheet();
  const now = new Date();
  const rows = files.map(file => {
    const imgId = Utilities.getUuid().split('-')[0];
    // Prefijo = reporte + imagen → buscable por reporte en la carpeta.
    const path = uploadFileToFolder(file, IMAGES_FOLDER_NAME, reportId + '_' + imgId);
    return [reportId, imgId, path, now];
  });
  insertRowsAtTop(sheet, rows);
  return { added: rows.length };
}


/* ------------------------- PREPARACIÓN INICIAL ------------------------- */

/**
 * EJECUTAR UNA SOLA VEZ desde el editor de Apps Script (botón ▶ Ejecutar,
 * con "prepararCSC" seleccionada en la lista de funciones). Crea las hojas
 * Usuarios, Datos e Imagen y las carpetas CSC_Imagenes y CSC_Documentos.
 * La primera vez Google pide autorizar permisos: acéptalos.
 */
function prepararCSC() {
  getUsersSheet();
  getDataSheet();
  getImgSheet();
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  [IMAGES_FOLDER_NAME, DOCS_FOLDER_NAME].forEach(name => {
    const it = root.getFoldersByName(name);
    const folder = it.hasNext() ? it.next() : root.createFolder(name);
    ensureFolderShared(folder);
    Logger.log('Carpeta lista: ' + name + ' → ' + folder.getUrl());
  });
  Logger.log('Hojas Usuarios, Datos e Imagen listas.');
}
