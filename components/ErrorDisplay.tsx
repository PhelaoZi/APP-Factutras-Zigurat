
import React from 'react';

interface ErrorDisplayProps {
    message: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
    return (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg" role="alert">
            <p className="font-bold">Error</p>
            <p>{message}</p>
        </div>
    );
};
