import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from './ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { Badge } from './ui/Badge';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

const ProductBulkUpload = ({ onUpload, onCancel }) => {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseErrors, setParseErrors] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null); // idle, uploading, success, error

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setFile(file);
      parseFile(file);
    }
  }, []);

  const parseFile = (file) => {
    setIsParsing(true);
    setParseErrors([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsParsing(false);

        if (results.errors && results.errors.length > 0) {
          const errors = results.errors.map(error => ({
            row: error.row,
            message: error.message
          }));
          setParseErrors(errors);
          return;
        }

        setParsedData(results.data);
        // Tomar solo las primeras 5 filas para la vista previa
        setPreviewData(results.data.slice(0, 5));
      },
      error: (error) => {
        setIsParsing(false);
        setParseErrors([{ message: error.message }]);
      }
    });
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
    if (!file || parsedData.length === 0) return;

    setUploadStatus('uploading');

    try {
      await onUpload(file);
      setUploadStatus('success');
    } catch (error) {
      setUploadStatus('error');
      console.error('Error uploading file:', error);
    }
  };

  const columns = previewData.length > 0
    ? Object.keys(previewData[0]).filter(key => key.trim() !== '')
    : [];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Carga Masiva de Productos</CardTitle>
        <CardDescription>
          Sube un archivo CSV con la información de múltiples productos
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
            <p className="text-lg font-medium">Suelta el archivo aquí</p>
          ) : (
            <>
              <p className="text-lg font-medium">Arrastra y suelta un archivo CSV aquí</p>
              <p className="text-sm text-muted-foreground mt-2">
                o haz clic para seleccionar un archivo
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

            {parseErrors.length > 0 && (
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive">
                <div className="flex items-center space-x-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <h3 className="font-medium">Errores de parsing</h3>
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {parseErrors.map((error, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      {error.row !== undefined && <span className="font-mono">Fila {error.row + 1}:</span>}
                      <span>{error.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {previewData.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Vista previa de los datos</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((column, index) => (
                          <TableHead key={index}>{column}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {columns.map((column, colIndex) => (
                            <TableCell key={colIndex} className="max-w-xs truncate">
                              {row[column]}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Mostrando {previewData.length} de {parsedData.length} registros totales
                </p>
              </div>
            )}
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30 flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-green-700 dark:text-green-300">
              Archivo subido exitosamente
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!file || parsedData.length === 0 || uploadStatus === 'uploading'}
        >
          {uploadStatus === 'uploading' ? 'Subiendo...' : 'Subir Archivo'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductBulkUpload;