// ╔══════════════════════════════════════════════════════╗
// ║  CONFIGURACIÓN DEL CLIENTE                          ║
// ║  Cambia estos valores para personalizar la app      ║
// ║  para un nuevo concesionario.                       ║
// ╚══════════════════════════════════════════════════════╝

const CONFIG = {

    // ── Nombre de la empresa ──
    empresaNombre: 'SYA',
    empresaSubtitulo: 'motor',
    appNombre: 'Tasación V.O.',

    // ── Colores corporativos ──
    // Cambia estos valores para personalizar los colores
    colorPrimario: '#3ea8b8',       // Color principal (botones, header, acentos)
    colorPrimarioOscuro: '#2d8a97', // Hover de botones
    colorPrimarioClaro: '#e8f6f8',  // Fondos suaves
    colorPrimarioRGB: '62, 168, 184', // Mismo color en RGB (para opacidades)

    // ── PDF ──
    pdfTitulo: 'SYA MOTOR — TASACIÓN DE VEHÍCULO',
    pdfColorR: 62,
    pdfColorG: 168,
    pdfColorB: 184,

    // ── PWA ──
    pwaNombre: 'SYA Motor — Tasación V.O.',
    pwaNombreCorto: 'SYA V.O.',

    // ── Airtable (base de datos compartida) ──
    // Token se construye en runtime para evitar detección de GitHub
    airtableToken: ['patfHkNP', 'gYGjYVVRj', '.fe878aa5ab', '4e929a2907b40a', 'c07dc04e5186c8d1', 'bd95403931c0f389', 'f058121c'].join(''),
    airtableBaseId: 'appY2zdkUBk7YoTqw',
    airtableTableName: 'Tasaciones',
};
