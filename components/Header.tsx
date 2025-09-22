
import React from 'react';

export const Header: React.FC = () => {
    return (
        <header className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Extractor y Analista de Facturas con IA
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
                Sube tus facturas XML para extraer datos y obtener análisis e insights valiosos sobre tu negocio de forma automática.
            </p>
        </header>
    );
};