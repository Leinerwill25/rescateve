const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Directorio raiz del proyecto (scripts/js/ -> ../../)
const PROJECT_ROOT = path.resolve(__dirname, '../../');

const excelFilePath = path.join(PROJECT_ROOT, 'data/real/PacientesConsolidados_Hospitales_Venezuela.xlsx');
const sqlFilePath = path.join(PROJECT_ROOT, 'data/real/import_pacientes.sql');

console.log(`Leyendo archivo: ${excelFilePath}`);

try {
  const wb = xlsx.readFile(excelFilePath);
  // Buscar la hoja consolidada, o usar la primera si no se llama así
  const sheetName = wb.SheetNames.find(n => n.includes('BUSCAR PACIENTES')) || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  
  // Extraer como arreglo 2D
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  let sql = `-- ================================================================\n`;
  sql += `-- SCRIPT GENERADO AUTOMÁTICAMENTE PARA IMPORTAR PACIENTES\n`;
  sql += `-- Hoja origen: ${sheetName}\n`;
  sql += `-- ================================================================\n\n`;

  let insertCount = 0;

  // Asumimos que la fila 2 (índice 2) contiene los headers reales, los datos empiezan en la fila 3
  // Vamos a iterar desde la fila 1 en adelante y detectar cuándo empiezan los datos buscando 'HOSPITAL'
  let dataStartIndex = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] && typeof data[i][1] === 'string' && data[i][1].trim().toUpperCase() === 'HOSPITAL') {
      dataStartIndex = i + 1;
      break;
    }
  }

  // Si no encuentra la cabecera explícita, asume que empieza en la fila 3 (índice 2)
  if (dataStartIndex === 0) dataStartIndex = 2;

  for (let i = dataStartIndex; i < data.length; i++) {
    const row = data[i];
    // Asegurarse de que al menos tenga Hospital (col 1) y Nombre (col 2)
    if (!row || !row[1] || !row[2]) continue;

    const hospital = row[1].toString().replace(/'/g, "''").trim();
    const nombre = row[2].toString().replace(/'/g, "''").trim();
    
    // Edad (col 3)
    let edad = 'NULL';
    if (row[3] != null) {
      const parsedEdad = parseInt(row[3]);
      if (!isNaN(parsedEdad)) edad = parsedEdad;
    }

    // Cédula (col 4) - Guardar como string
    let cedula = 'NULL';
    if (row[4] != null && row[4].toString().trim() !== '') {
      cedula = `'${row[4].toString().replace(/'/g, "''").trim()}'`;
    }

    // Teléfono (col 5)
    let telefono = 'NULL';
    if (row[5] != null && row[5].toString().trim() !== '') {
      telefono = `'${row[5].toString().replace(/'/g, "''").trim()}'`;
    }

    // Dirección (col 6)
    let direccion = 'NULL';
    if (row[6] != null && row[6].toString().trim() !== '') {
      direccion = `'${row[6].toString().replace(/'/g, "''").trim()}'`;
    }

    // Observaciones (col 7)
    let observaciones = 'NULL';
    if (row[7] != null && row[7].toString().trim() !== '') {
      observaciones = `'${row[7].toString().replace(/'/g, "''").trim()}'`;
    }

    sql += `INSERT INTO public.pacientes_hospital (hospital, nombre, edad, cedula, telefono, direccion, observaciones, fuente) `;
    sql += `VALUES ('${hospital}', '${nombre}', ${edad}, ${cedula}, ${telefono}, ${direccion}, ${observaciones}, 'Consolidado Oficial CSV') `;
    sql += `ON CONFLICT (hospital, nombre) DO NOTHING;\n`;
    
    insertCount++;
  }

  fs.writeFileSync(sqlFilePath, sql);
  console.log(`✅ Importación generada con éxito: ${insertCount} registros procesados.`);
  console.log(`El archivo SQL se guardó en: ${sqlFilePath}`);

} catch (error) {
  console.error("Error al procesar el archivo Excel:", error);
}
