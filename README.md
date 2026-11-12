# App Reporte — CSC Coffee and Softs Company S.A.S.

Colores corporativos: blanco y café. Logo CSC Coffee en login, encabezado, pantalla de carga e íconos de la app.

## Hojas del Google Sheet (solo 3)

| Hoja | Columnas |
|---|---|
| **Usuarios** | Cedula, Nombre, ClaveHash, Rol, Estado, FechaSolicitud, AceptaPolitica |
| **Datos** | Id_Reporte, `Fecha `, `Placa Del Vehiculo `, `Numero De Lotes `, `Nom: Del Respnsable del Despacho `, Documentos Anexos |
| **Imagen** | Id_Reporte, Id_Imagen, Ruta, Fecha |

Los encabezados de **Datos** llevan un espacio al final (así los espera app.js). Si la hoja no existe, el backend la crea sola con los encabezados correctos.

Cada registro nuevo (reporte, foto o solicitud de usuario) se guarda en la **fila 2**: lo más nuevo siempre arriba.

## Imágenes

- Las fotos van en la carpeta de Drive **CSC_Imagenes**, que contiene solo imágenes.
- Cada archivo se llama `IdReporte_IdImagen_nombre.jpg`, así se buscan por reporte directamente en Drive.
- La hoja **Imagen** guarda la referencia (Id_Reporte, Id_Imagen, Ruta, Fecha).
- El "Documento anexo" principal va en otra carpeta, **CSC_Documentos**, para no mezclarlo con las fotos.

## Pasos

1. Google Sheet → Extensiones → Apps Script → reemplaza todo por `Code.gs`.
2. Edita y ejecuta una vez `configurarAdmin()` (cédula y clave del administrador). Si ya tienes tus usuarios en la hoja **Usuarios**, no hace falta.
3. Implementar → Administrar implementaciones → lápiz → Nueva versión → Implementar (la URL no cambia).
4. Sube a GitHub (reemplazando): `index.html`, `app.js`, `logos.js`, `manifest.json` y los 5 íconos `.png`. **No subas Code.gs.**
5. Renombra tus hojas actuales a **Datos** e **Imagen**. Si vienen de la versión anterior, las fotos viejas tienen las columnas A y B invertidas: la hoja Imagen espera Id_Reporte en A e Id_Imagen en B.

Si vas a reemplazar el ícono instalado en celulares, hay que desinstalar y volver a instalar la app (PWA).
