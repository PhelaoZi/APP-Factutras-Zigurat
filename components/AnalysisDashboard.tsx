import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Spinner } from './Spinner';
import { ErrorDisplay } from './ErrorDisplay';
import { AnalysisIcon } from './icons/AnalysisIcon';

interface AnalysisDashboardProps {
    onAnalyze: (prompt: string) => void;
    isAnalyzing: boolean;
    result: string | null;
    error: string | null;
}

const analysisSuggestions = [
    "Dame un resumen general de las ventas (total facturado, número de facturas, ticket promedio).",
    "Identifica mis 3 clientes principales por el total gastado y cuánto ha gastado cada uno.",
    "¿Cuáles son los productos o servicios más vendidos por cantidad y por ingresos totales?",
];

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ onAnalyze, isAnalyzing, result, error }) => {
    const [customPrompt, setCustomPrompt] = useState('');

    const handleCustomAnalysis = () => {
        if (customPrompt.trim()) {
            onAnalyze(customPrompt);
        }
    };
    
    return (
        <div className="mt-8 mb-6 p-6 bg-gray-50 border border-gray-200 rounded-lg shadow-sm animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
                <AnalysisIcon className="w-8 h-8 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-900">Análisis e Insights con IA</h2>
            </div>
            <p className="text-gray-600 mb-6">Haz preguntas sobre tu historial de facturas para obtener información valiosa sobre tu negocio.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {analysisSuggestions.map((prompt, index) => (
                    <button
                        key={index}
                        onClick={() => onAnalyze(prompt)}
                        disabled={isAnalyzing}
                        className="p-3 text-sm font-medium text-left bg-white border rounded-lg hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {prompt}
                    </button>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
                 <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="O escribe tu propia pregunta aquí..."
                    className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition"
                    rows={2}
                    disabled={isAnalyzing}
                />
                <button
                    onClick={handleCustomAnalysis}
                    disabled={isAnalyzing || !customPrompt.trim()}
                    className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isAnalyzing ? 'Analizando...' : 'Generar Análisis'}
                </button>
            </div>

            {isAnalyzing && <Spinner message="La IA está analizando su historial de ventas..." />}
            {error && <ErrorDisplay message={error} />}
            {result && (
                <div className="mt-6 p-5 bg-white border border-gray-200 rounded-lg animate-fade-in">
                     <h3 className="text-lg font-semibold text-gray-800 mb-4">Resultado del Análisis:</h3>
                    <article className="prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                    </article>
                </div>
            )}
        </div>
    );
};
