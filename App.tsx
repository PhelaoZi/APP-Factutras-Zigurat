import React, { useState, useCallback, useEffect } from 'react';
import { extractInvoiceDataFromXml, analyzeInvoiceData } from './services/geminiService';
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
            setNotification("Historial de facturas borrado.");
        }
    };

    const handleDeleteInvoice = async (id: number) => {
        if (window.confirm("¿Estás seguro de que quieres borrar esta factura? Esta acción es irreversible.")) {
            try {
                await deleteInvoice(id);
                setAllInvoices(prevInvoices => prevInvoices.filter(invoice => invoice.id !== id));
                setNotification("Factura borrada correctamente.");
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

                    {isLoading && <Spinner message="La IA está extrayendo los datos de su factura..." />}
                    {error && <ErrorDisplay message={error} />}
                    {notification && <Notification message={notification} onDismiss={() => setNotification(null)} />}
                    
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