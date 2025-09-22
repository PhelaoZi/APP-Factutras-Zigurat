
import React, { useCallback, useState } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { XmlIcon } from './icons/XmlIcon';

interface FileUploadProps {
    onFileSelect: (file: File | null) => void;
    fileName: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, fileName }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    }, [onFileSelect]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileSelect(e.target.files[0]);
        }
    };
    
    return (
        <div className="w-full">
            <label
                htmlFor="xml-upload"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
            >
                {fileName ? (
                    <div className="text-center">
                        <XmlIcon className="w-16 h-16 mx-auto text-gray-500" />
                        <p className="mt-4 text-lg font-semibold text-gray-700">{fileName}</p>
                        <p className="mt-1 text-sm text-gray-500">Archivo cargado. Haz clic para cambiar o arrastra uno nuevo.</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadIcon className="w-10 h-10 mb-4 text-gray-400"/>
                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Haz clic para cargar</span> o arrastra y suelta</p>
                        <p className="text-xs text-gray-500">Solo archivos XML</p>
                    </div>
                )}
                <input id="xml-upload" type="file" className="hidden" accept=".xml,text/xml" onChange={handleFileChange} />
            </label>
        </div>
    );
};
