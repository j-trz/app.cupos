import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Button } from './ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { Badge } from './ui/Badge';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { PRODUCT_IMPORT_COLUMNS, validateProductRow } from '../lib/productImportSchema.js';
import { useAgencies } from '../hooks/useAgencies';

const ProductBulkUpload = ({ onUpload, onCancel }) => {
  const [file, setFile] = useState(null);
  const [validRows, setValidRows] = useState([]);
  const [invalidRows, setInvalidRows] = useState([]); // [{ rowNumber, errors, raw }]
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null); // null, uploading, success, error
  const [uploadResult, setUploadResult] = useState(null); // { created, skipped }

  const { data: agencies = [] } = useAgencies();
  const validAgencyCodes = agencies.map((a) => a.code);

  const onDrop = useCallback((acceptedFiles) => {
    const picked = acceptedFiles[0];
    if (picked) {
      setFile(picked);
      setUploadStatus(null);
      setUploadResult(null);
      parseFile(picked);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validAgencyCodes.join(',')]);

  const parseFile = (picked) => {
    setIsParsing(true);
    setParseError(null);
    setValidRows([]);
    setInvalidRows([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // XLSX.read entiende tanto binarios .xlsx/.xls reales como texto CSV
        // (a diferencia de PapaParse, que solo puede leer CSV) — un solo
        // parser para los tres formatos que la zona de drop dice aceptar.
        const workbook = XLSX.read(e.target.result, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        if (rows.length === 0) {
          setParseError('El archivo no tiene filas de datos.');
          setIsParsing(false);
          return;
        }

        const valid = [];
        const invalid = [];
        rows.forEach((row, idx) => {
          const { valid: isValid, errors, normalized } = validateProductRow(row, validAgencyCodes);
          if (isValid) {
            valid.push(normalized);
          } else {
            invalid.push({ rowNumber: idx + 2, errors, raw: row }); // +2: fila 1 es el header
          }
        });

        setValidRows(valid);
        setInvalidRows(invalid);
      } catch (err) {
        setParseError(err.message || 'No se pudo leer el archivo. ¿Es un .xlsx, .xls o .csv válido?');
      } finally {
        setIsParsing(false);
      }
    };
    reader.onerror = () => {
      setIsParsing(false);
      setParseError('No se pudo leer el archivo.');
    };
    reader.readAsArrayBuffer(picked);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  const handleUpload = async () => {
    if (validRows.length === 0) return;

    setUploadStatus('uploading');
    try {
      const result = await onUpload(validRows);
      setUploadStatus('success');
      setUploadResult({ created: result?.count ?? validRows.length, skipped: invalidRows.length });
    } catch (error) {
      setUploadStatus('error');
      setParseError(error.message || 'Error al subir los productos.');
    }
  };

  const previewColumns = PRODUCT_IMPORT_COLUMNS.map((c) => c.key);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Carga Masiva de Productos</CardTitle>
        <CardDescription>
          Subí un archivo .xlsx, .xls o .csv con la información de múltiples productos. Descargá la plantilla desde el botón "Descargar Plantilla" si no sabés qué columnas usar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Zona de arrastre */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-primary'
            }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          {isDragActive ? (
            <p className="text-lg font-medium">Soltá el archivo acá</p>
          ) : (
            <>
              <p className="text-lg font-medium">Arrastrá y soltá un archivo .xlsx, .xls o .csv acá</p>
              <p className="text-sm text-muted-foreground mt-2">
                o hacé clic para seleccionar un archivo
              </p>
            </>
          )}
        </div>

        {file && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <span className="font-medium truncate max-w-xs">{file.name}</span>
              </div>
              <Badge variant="secondary">{file.size} bytes</Badge>
            </div>

            {isParsing && (
              <div className="flex items-center justify-center p-4">
                <p>Procesando archivo...</p>
              </div>
            )}

            {parseError && (
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive">
                <div className="flex items-center space-x-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <h3 className="font-medium">Error</h3>
                </div>
                <p className="mt-2 text-sm">{parseError}</p>
              </div>
            )}

            {invalidRows.length > 0 && (
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive">
                <div className="flex items-center space-x-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <h3 className="font-medium">{invalidRows.length} fila(s) con errores — no se van a importar</h3>
                </div>
                <ul className="mt-2 space-y-1 text-sm max-h-40 overflow-y-auto">
                  {invalidRows.map((item) => (
                    <li key={item.rowNumber}>
                      <span className="font-mono">Fila {item.rowNumber}:</span> {item.errors.join('; ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validRows.length > 0 && (
              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {validRows.length} fila(s) válidas, listas para importar
                </h3>
                <div className="border rounded-lg overflow-x-auto max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewColumns.map((column) => (
                          <TableHead key={column}>{column}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validRows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {previewColumns.map((column) => (
                            <TableCell key={column} className="max-w-xs truncate">
                              {String(row[column] ?? '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30 flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-green-700 dark:text-green-300">
              Se crearon {uploadResult?.created ?? validRows.length} productos.
              {uploadResult?.skipped ? ` ${uploadResult.skipped} fila(s) no se importaron por errores.` : ''}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cerrar
        </Button>
        <Button
          onClick={handleUpload}
          disabled={validRows.length === 0 || uploadStatus === 'uploading'}
        >
          {uploadStatus === 'uploading' ? 'Subiendo...' : `Importar ${validRows.length || ''} producto(s)`}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductBulkUpload;
