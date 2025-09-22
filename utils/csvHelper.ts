import type { InvoiceData } from '../types';

// Declara la librería XLSX global, que se carga desde una etiqueta de script en index.html
declare const XLSX: any;

export const downloadAsExcel = (invoices: InvoiceData[], baseFileName: string) => {
    if (!invoices || invoices.length === 0) return;

    const headers = [
        'Numero Factura', 'Fecha Emision', 'Fecha Vencimiento', 'Moneda',
        'Emisor Nombre', 'Emisor ID Fiscal', 'Emisor Direccion', 'Emisor Contacto',
        'Receptor Nombre', 'Receptor ID Fiscal', 'Receptor Direccion', 'Receptor Contacto',
        'Subtotal Factura', 'Impuestos', 'Total Factura', 'Notas',
        'Item Descripcion', 'Item Cantidad', 'Item Precio Unitario', 'Item Total Linea'
    ];

    const rows = invoices.flatMap(invoice =>
        (invoice.items.length > 0 ? invoice.items : [{ descripcion: 'N/A', cantidad: 0, precio_unitario: 0, total_linea: 0 }]).map(item => [
            invoice.numero_factura,
            invoice.fecha_emision,
            invoice.fecha_vencimiento,
            invoice.moneda,
            invoice.emisor.nombre,
            invoice.emisor.identificacion_fiscal,
            invoice.emisor.direccion,
            invoice.emisor.contacto || '',
            invoice.receptor.nombre,
            invoice.receptor.identificacion_fiscal,
            invoice.receptor.direccion,
            invoice.receptor.contacto || '',
            invoice.subtotal,
            invoice.impuestos.map(t => `${t.tipo} ${t.tasa}%: ${t.monto.toFixed(2)}`).join('; '),
            invoice.total,
            invoice.notas || '',
            item.descripcion,
            item.cantidad,
            item.precio_unitario,
            item.total_linea,
        ])
    );

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows], { cellDates: true });
    
    // Asigna tipos de celda a los datos para un formato correcto en Excel
    // Empezamos en la fila 1 para saltar los encabezados
    rows.forEach((row, r) => {
        // Columnas con valores monetarios
        [12, 14, 18, 19].forEach(c => {
            const cell_address = { c: c, r: r + 1 };
            const cell = XLSX.utils.encode_cell(cell_address);
            if(worksheet[cell]) {
                worksheet[cell].t = 'n';
                worksheet[cell].z = '#,##0.00';
            }
        });
        // Columna de cantidad
        const qty_cell_address = { c: 17, r: r + 1 };
        const qty_cell = XLSX.utils.encode_cell(qty_cell_address);
        if(worksheet[qty_cell]){
            worksheet[qty_cell].t = 'n';
        }
    });

    // Ajustar automáticamente el ancho de las columnas para una mejor legibilidad
    const colWidths = headers.map((header, i) => {
        const maxLength = Math.max(
            header?.length || 0,
            ...rows.map(row => String(row[i] ?? '').length)
        );
        return { wch: maxLength + 2 }; // +2 para un poco de espacio
    });
    worksheet['!cols'] = colWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Facturas');

    const cleanFileName = baseFileName.replace(/\.xml$/i, '');
    XLSX.writeFile(workbook, `${cleanFileName}_facturas.xlsx`);
};