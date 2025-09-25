import React, { useState, useCallback, useEffect } from 'react';
import { extractInvoiceDataFromXml, analyzeInvoiceData } from './services/geminiService';
import { mapInvoicesToDatabaseFormat, validateMappedData, type DatabaseTables } from './services/dataMapper';
import type { InvoiceData } from './types';
import { FileUpload } from './components/FileUpload';
import { InvoiceList } from './components/ResultsDisplay';
import { Spinner } from './components/Spinner';
import { Header } from './components/Header';
import { ErrorDisplay } from './components/ErrorDisplay';
import { Notification } from './components/Notification';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { addInvoices, getAllInvoices, clearInvoices, deleteInvoice } from './utils/db';

const App: React.FC = () => {
    const [xmlContent, setXmlContent] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [allInvoices, setAllInvoices] = useState<InvoiceData[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    // Nuevos estados para el mapeo de datos PostgreSQL
    const [mappedData, setMappedData] = useState<DatabaseTables | null>(null);
    const [mappingStatus, setMappingStatus] = useState<string | null>(null);
    const [isMapping, setIsMapping] = useState<boolean>(false);

    const loadInvoices = useCallback(async () => {
        const invoices = await getAllInvoices();
        setAllInvoices(invoices);
    }, []);

    useEffect(() => {
        loadInvoices();
    }, [loadInvoices]);

    const handleFileChange = (file: File | null) => {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                setXmlContent(content);
                setFileName(file.name);
                setError(null);
                setNotification(null);
                // Reset mapping data when new file is loaded
                setMappedData(null);
                setMappingStatus(null);
            };
            reader.onerror = () => {
                setError("Error al leer el archivo. Por favor, inténtelo de nuevo.");
                setXmlContent(null);
                setFileName(null);
            };
            reader.readAsText(file);
        } else {
            setXmlContent(null);
            setFileName(null);
            setError(null);
            setNotification(null);
            setMappedData(null);
            setMappingStatus(null);
        }
    };

    const processXml = useCallback(async () => {
        if (!xmlContent) {
            setError("Por favor, seleccione un archivo XML primero.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setNotification(null);

        try {
            const extractedData = await extractInvoiceDataFromXml(xmlContent);
            const { addedCount, duplicateCount } = await addInvoices(extractedData);
            
            setNotification(`${addedCount} factura(s) nueva(s) añadida(s). ${duplicateCount} duplicado(s) omitido(s).`);
            
            await loadInvoices(); // Recargar todas las facturas desde la BD
        } catch (err) {
            console.error("Error processing XML:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido.";
            setError(`Error al procesar el archivo con la IA. Detalles: ${errorMessage}`);
        } finally {
            setIsLoading(false);
            // Reset file input after processing
            setXmlContent(null);
            setFileName(null);
        }
    }, [xmlContent, loadInvoices]);

    // Nueva función para mapear datos a formato PostgreSQL
    const mapearDatosParaBD = useCallback(() => {
        if (allInvoices.length === 0) {
            setError("No hay facturas para mapear. Primero procesa un archivo XML.");
            return;
        }

        setIsMapping(true);
        setMappingStatus("🔄 Mapeando datos al formato PostgreSQL...");
        setError(null);
        
        try {
            console.log("Iniciando mapeo de", allInvoices.length, "facturas");
            
            // Mapear datos usando el nuevo servicio
            const datosMapados = mapInvoicesToDatabaseFormat(allInvoices);
            
            // Validar que los datos están correctos
            const validacion = validateMappedData(datosMapados);
            
            if (validacion.isValid) {
                setMappedData(datosMapados);
                setMappingStatus(`✅ Datos mapeados correctamente:
📋 ${allInvoices.length} facturas procesadas
👥 ${datosMapados.clientes.length} clientes únicos
🍺 ${datosMapados.productos.length} productos únicos
💰 ${datosMapados.ventas.length} ventas
📦 ${datosMapados.detalle_ventas.length} detalles de productos`);
                setError(null);
                console.log("Mapeo completado exitosamente:", datosMapados);
            } else {
                console.error("Errores de validación:", validacion.errors);
                setError(`❌ Errores en la validación de datos: ${validacion.errors.join(', ')}`);
                setMappedData(null);
                setMappingStatus(null);
            }
            
        } catch (error) {
            console.error("Error en el mapeo:", error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            setError(`❌ Error al mapear datos: ${errorMessage}`);
            setMappedData(null);
            setMappingStatus(null);
        } finally {
            setIsMapping(false);
        }
    }, [allInvoices]);
    
    const handleRequestAnalysis = useCallback(async (prompt: string) => {
        if (allInvoices.length === 0) {
            setAnalysisError("No hay facturas para analizar. Sube un archivo primero.");
            return;
        }

        setIsAnalyzing(true);
        setAnalysisError(null);
        setAnalysisResult(null);

        try {
            const result = await analyzeInvoiceData(allInvoices, prompt);
            setAnalysisResult(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido durante el análisis.";
            setAnalysisError(errorMessage);
        } finally {
            setIsAnalyzing(false);
        }
    }, [allInvoices]);

    const handleClearData = async () => {
        if (window.confirm("¿Estás seguro de que quieres borrar todo el historial de facturas? Esta acción no se puede deshacer.")) {
            await clearInvoices();
            setAllInvoices([]);
            setAnalysisResult(null);
            setAnalysisError(null);
            setMappedData(null);
            setMappingStatus(null);
            setNotification("Historial de facturas borrado.");
        }
    };

    const handleDeleteInvoice = async (id: number) => {
        if (window.confirm("¿Estás seguro de que quieres borrar esta factura? Esta acción es irreversible.")) {
            try {
                await deleteInvoice(id);
                setAllInvoices(prevInvoices => prevInvoices.filter(invoice => invoice.id !== id));
                setNotification("Factura borrada correctamente.");
                // Reset mapping data if invoice is deleted
                setMappedData(null);
                setMappingStatus(null);
            } catch (err) {
                console.error("Error deleting invoice:", err);
                setError("No se pudo borrar la factura.");
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-4xl mx-auto">
                <Header />
                <main className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200 mt-6">
                    <FileUpload onFileSelect={handleFileChange} fileName={fileName} />
                    
                    {fileName && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={processXml}
                                disabled={isLoading || !xmlContent}
                                className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Procesando...' : 'Añadir Factura(s) al Historial'}
                            </button>
                        </div>
                    )}

                    {/* Nuevo botón para mapear datos a PostgreSQL */}
                    {allInvoices.length > 0 && (
                        <div className="mt-4 text-center">
                            <button
                                onClick={mapearDatosParaBD}
                                disabled={isMapping || isLoading}
                                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {isMapping ? 'Mapeando...' : '🗺️ Mapear para PostgreSQL'}
                            </button>
                        </div>
                    )}

                    {isLoading && <Spinner message="La IA está extrayendo los datos de su factura..." />}
                    {isMapping && <Spinner message="Organizando datos para la base de datos PostgreSQL..." />}
                    {error && <ErrorDisplay message={error} />}
                    {notification && <Notification message={notification} onDismiss={() => setNotification(null)} />}
                    
                    {/* Mostrar estado del mapeo */}
                    {mappingStatus && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h3 className="text-sm font-medium text-blue-800 mb-2">Estado del Mapeo:</h3>
                            <pre className="text-sm text-blue-700 whitespace-pre-line">{mappingStatus}</pre>
                        </div>
                    )}

                    {/* Preview de datos mapeados */}
                    {mappedData && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h3 className="text-lg font-medium text-green-800 mb-3">✅ Datos Listos para PostgreSQL</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                    <div className="text-2xl font-bold text-green-600">{mappedData.clientes.length}</div>
                                    <div className="text-sm text-green-700 font-medium">Clientes</div>
                                </div>
                                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                    <div className="text-2xl font-bold text-green-600">{mappedData.productos.length}</div>
                                    <div className="text-sm text-green-700 font-medium">Productos</div>
                                </div>
                                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                    <div className="text-2xl font-bold text-green-600">{mappedData.ventas.length}</div>
                                    <div className="text-sm text-green-700 font-medium">Ventas</div>
                                </div>
                                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                    <div className="text-2xl font-bold text-green-600">{mappedData.detalle_ventas.length}</div>
                                    <div className="text-sm text-green-700 font-medium">Detalles</div>
                                </div>
                            </div>
                            
                            {/* Vista previa de algunos datos */}
                            <div className="mt-4 grid md:grid-cols-2 gap-4">
                                {mappedData.clientes.length > 0 && (
                                    <div className="bg-white p-3 rounded border">
                                        <h4 className="font-medium text-gray-800 mb-2">👥 Ejemplo Cliente:</h4>
                                        <p className="text-sm text-gray-600">
                                            <strong>RUT:</strong> {mappedData.clientes[0].rut}<br/>
                                            <strong>Razón Social:</strong> {mappedData.clientes[0].razon_social}
                                        </p>
                                    </div>
                                )}
                                {mappedData.productos.length > 0 && (
                                    <div className="bg-white p-3 rounded border">
                                        <h4 className="font-medium text-gray-800 mb-2">🍺 Ejemplo Producto:</h4>
                                        <p className="text-sm text-gray-600">
                                            {mappedData.productos[0].descripcion_producto}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {allInvoices.length > 0 && (
                        <AnalysisDashboard
                            onAnalyze={handleRequestAnalysis}
                            isAnalyzing={isAnalyzing}
                            result={analysisResult}
                            error={analysisError}
                        />
                    )}

                    <InvoiceList 
                        data={allInvoices} 
                        fileName={'historial_facturas'} 
                        onClearData={handleClearData} 
                        onDeleteInvoice={handleDeleteInvoice}
                    />
                </main>
                 <footer className="text-center mt-8 text-sm text-gray-500">
                    <p>Desarrollado con IA de Gemini. Simplificando la extracción y análisis de datos.</p>
                </footer>
            </div>
        </div>
    );
};

export default App;