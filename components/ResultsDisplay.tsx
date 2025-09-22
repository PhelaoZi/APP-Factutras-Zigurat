import React from 'react';
import type { InvoiceData, Party } from '../types';
import { downloadAsExcel } from '../utils/csvHelper';
import { ExcelIcon } from './icons/ExcelIcon';
import { TrashIcon } from './icons/TrashIcon';

interface InvoiceListProps {
    data: InvoiceData[];
    fileName: string;
    onClearData: () => void;
    onDeleteInvoice: (id: number) => void;
}

interface SingleInvoiceDisplayProps {
    data: InvoiceData;
    onDelete: (id: number) => void;
}

const PartyInfo: React.FC<{ title: string; party: Party }> = ({ title, party }) => (
    <div className="bg-gray-50 p-4 rounded-lg border">
        <h3 className="text-md font-semibold text-gray-800 border-b pb-2 mb-2">{title}</h3>
        <p className="text-sm"><strong>Nombre:</strong> {party.nombre}</p>
        <p className="text-sm"><strong>ID Fiscal:</strong> {party.identificacion_fiscal}</p>
        <p className="text-sm"><strong>Dirección:</strong> {party.direccion}</p>
        {party.contacto && <p className="text-sm"><strong>Contacto:</strong> {party.contacto}</p>}
    </div>
);

const Totals: React.FC<{ data: InvoiceData }> = ({ data }) => (
    <div className="mt-6 space-y-2 text-right">
        <p className="text-md font-medium text-gray-600">Subtotal: <span className="font-bold text-gray-900">{data.subtotal.toFixed(2)} {data.moneda}</span></p>
        {data.impuestos.map((tax, index) => (
            <p key={index} className="text-md font-medium text-gray-600">{tax.tipo} ({tax.tasa}%): <span className="font-bold text-gray-900">{tax.monto.toFixed(2)} {data.moneda}</span></p>
        ))}
        <hr className="my-2"/>
        <p className="text-xl font-bold text-gray-900">Total: <span className="text-indigo-600">{data.total.toFixed(2)} {data.moneda}</span></p>
    </div>
);

const SingleInvoiceDisplay: React.FC<SingleInvoiceDisplayProps> = ({ data, onDelete }) => {
    
    const handleDelete = () => {
        if (data.id) {
            onDelete(data.id);
        }
    };
    
    return (
        <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
            <div className="border-b pb-4 mb-6 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Factura #{data.numero_factura}</h3>
                 <button
                    onClick={handleDelete}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    aria-label="Borrar factura"
                    title="Borrar esta factura"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
                <div className="p-3 bg-gray-100 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Fecha de Emisión</p>
                    <p className="text-md font-semibold text-gray-800">{data.fecha_emision}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Fecha de Vencimiento</p>
                    <p className="text-md font-semibold text-gray-800">{data.fecha_vencimiento}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Moneda</p>
                    <p className="text-md font-semibold text-gray-800">{data.moneda}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <PartyInfo title="Emisor" party={data.emisor} />
                <PartyInfo title="Receptor" party={data.receptor} />
            </div>

            <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Artículos de la Factura</h4>
                <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unitario</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.items.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.descripcion}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.cantidad}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.precio_unitario.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.total_linea.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Totals data={data} />

            {data.notas && (
                <div className="mt-6 border-t pt-4">
                     <h4 className="text-md font-semibold text-gray-800">Notas Adicionales</h4>
                     <p className="text-sm text-gray-600 mt-2 p-3 bg-gray-50 rounded-md">{data.notas}</p>
                </div>
            )}
        </div>
    );
};

export const InvoiceList: React.FC<InvoiceListProps> = ({ data, fileName, onClearData, onDeleteInvoice }) => {
    
    const handleDownload = () => {
        downloadAsExcel(data, fileName);
    };

    if (data.length === 0) {
        return (
            <div className="mt-8 text-center p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-semibold text-blue-800">No hay facturas en el historial.</p>
                <p className="text-sm text-blue-700">Sube un archivo XML para empezar a añadir facturas.</p>
            </div>
        )
    }

    return (
        <div className="mt-8 animate-fade-in">
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-lg shadow-md border border-gray-200 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Historial de Facturas ({data.length})
                    </h2>
                    <p className="text-gray-500">Todas las facturas guardadas.</p>
                </div>
                 <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button onClick={handleDownload} className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all">
                        <ExcelIcon className="w-5 h-5" />
                        Exportar a Excel
                    </button>
                    <button onClick={onClearData} className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all">
                        <TrashIcon className="w-5 h-5" />
                        Limpiar Historial
                    </button>
                 </div>
            </div>

            <div className="space-y-6">
                {data.map((invoice, index) => (
                    <SingleInvoiceDisplay 
                        key={`${invoice.numero_factura}-${invoice.id || index}`} 
                        data={invoice} 
                        onDelete={onDeleteInvoice} 
                    />
                ))}
            </div>
        </div>
    );
};