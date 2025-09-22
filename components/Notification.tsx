import React, { useEffect } from 'react';

interface NotificationProps {
    message: string;
    onDismiss: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss();
        }, 5000); // La notificación desaparece después de 5 segundos

        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg shadow-md animate-fade-in-down flex justify-between items-center">
            <p>{message}</p>
            <button onClick={onDismiss} className="text-green-800 hover:text-green-900 font-bold">
                &times;
            </button>
        </div>
    );
};
