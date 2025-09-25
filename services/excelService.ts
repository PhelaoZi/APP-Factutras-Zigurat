// services/excelService.ts
import type { DatabaseTables } from './dataMapper';

/**
 * Genera un archivo Excel con la misma estructura que tu Excel actual
 * para respaldo y revisión manual
 */
export const generateExcelBackup = (data: DatabaseTables, filename?: string): void => {
    try {
        console.log("📊 Generando Excel de respaldo...");

        // Crear el contenido del Excel en formato CSV (más simple que XLSX)
        const csvContent = generateCSVContent(data);
        
        // Crear y descargar el archivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const finalFilename = filename || `facturas_${new Date().toISOString().split('T')[0]}.csv`;
        
        downloadFile(blob, finalFilename);
        
        console.log(`✅ Excel de respaldo generado: ${finalFilename}`);
        
    } catch (error) {
        console.error("❌ Error generando Excel:", error);
        throw new Error(`Error al generar Excel de respaldo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
};

/**
 * Genera contenido CSV con todas las tablas
 */
const generateCSVContent = (data: DatabaseTables): string => {
    let csvContent = '';

    // TABLA CLIENTES
    csvContent += "=== TABLA CLIENTES ===\n";
    csvContent += "rut,razon_social\n";
    data.clientes.forEach(cliente => {
        csvContent += `"${cliente.rut}","${cliente.razon_social.replace(/"/g, '""')}"\n`;
    });
    csvContent += "\n";

    // TABLA PRODUCTOS  
    csvContent += "=== TABLA PRODUCTOS ===\n";
    csvContent += "descripcion_producto\n";
    data.productos.forEach(producto => {
        csvContent += `"${producto.descripcion_producto.replace(/"/g, '""')}"\n`;
    });
    csvContent += "\n";

    // TABLA VENTAS
    csvContent += "=== TABLA VENTAS ===\n";
    csvContent += "numero_factura,fecha_factura,monto_total_factura,rut_cliente\n";
    data.ventas.forEach(venta => {
        csvContent += `${venta.numero_factura},"${venta.fecha_factura}",${venta.monto_total_factura},"${venta.rut_cliente}"\n`;
    });
    csvContent += "\n";

    // TABLA DETALLE_VENTAS
    csvContent += "=== TABLA DETALLE_VENTAS ===\n";
    csvContent += "numero_factura,descripcion_producto,unidades_vendidas\n";
    data.detalle_ventas.forEach(detalle => {
        csvContent += `${detalle.numero_factura},"${detalle.descripcion_producto.replace(/"/g, '""')}",${detalle.unidades_vendidas}\n`;
    });

    return csvContent;
};

/**
 * Descarga un archivo blob con el nombre especificado
 */
const downloadFile = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Agregar al DOM temporalmente para hacer clic
    document.body.appendChild(link);
    link.click();
    
    // Limpiar
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Genera un resumen de lo que se va a procesar
 */
export const generateProcessSummary = (data: DatabaseTables): string => {
    const totalFacturas = data.ventas.length;
    const totalProductos = data.detalle_ventas.reduce((sum, detalle) => sum + detalle.unidades_vendidas, 0);
    const montoTotal = data.ventas.reduce((sum, venta) => sum + venta.monto_total_factura, 0);
    
    return `
📊 RESUMEN DEL PROCESAMIENTO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Facturas: ${totalFacturas}
👥 Clientes únicos: ${data.clientes.length}
🍺 Productos únicos: ${data.productos.length}
📦 Total unidades vendidas: ${totalProductos}
💰 Monto total: $${montoTotal.toLocaleString('es-CL')}

📅 Rango de fechas: ${getDateRange(data.ventas)}

🏆 Top productos:
${getTopProducts(data.detalle_ventas).join('\n')}

👑 Top clientes:
${getTopClientes(data.ventas, data.clientes).join('\n')}
`;
};

/**
 * Obtiene el rango de fechas de las ventas
 */
const getDateRange = (ventas: any[]): string => {
    if (ventas.length === 0) return "Sin fechas";
    
    const fechas = ventas.map(v => new Date(v.fecha_factura)).sort((a, b) => a.getTime() - b.getTime());
    const primera = fechas[0].toLocaleDateString('es-CL');
    const ultima = fechas[fechas.length - 1].toLocaleDateString('es-CL');
    
    return primera === ultima ? primera : `${primera} - ${ultima}`;
};

/**
 * Obtiene los productos más vendidos
 */
const getTopProducts = (detalles: any[]): string[] => {
    const productCount = detalles.reduce((acc, detalle) => {
        acc[detalle.descripcion_producto] = (acc[detalle.descripcion_producto] || 0) + detalle.unidades_vendidas;
        return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(productCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([producto, cantidad], index) => `  ${index + 1}. ${producto}: ${cantidad} unidades`);
};

/**
 * Obtiene los clientes que más compran
 */
const getTopClientes = (ventas: any[], clientes: any[]): string[] => {
    const clienteVentas = ventas.reduce((acc, venta) => {
        acc[venta.rut_cliente] = (acc[venta.rut_cliente] || 0) + venta.monto_total_factura;
        return acc;
    }, {} as Record<string, number>);
    
    const clienteMap = clientes.reduce((acc, cliente) => {
        acc[cliente.rut] = cliente.razon_social;
        return acc;
    }, {} as Record<string, string>);
    
    return Object.entries(clienteVentas)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([rut, monto], index) => {
            const nombre = clienteMap[rut] || rut;
            return `  ${index + 1}. ${nombre}: $${monto.toLocaleString('es-CL')}`;
        });
};