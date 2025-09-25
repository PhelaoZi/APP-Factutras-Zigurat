// services/dataMapper.ts
import type { InvoiceData } from '../types';

// Tipos que coinciden exactamente con tu estructura PostgreSQL
export interface DatabaseTables {
  clientes: Cliente[];
  productos: Producto[];
  ventas: Venta[];
  detalle_ventas: DetalleVenta[];
}

interface Cliente {
  rut: string;                    // VARCHAR(20) - PK
  razon_social: string;          // VARCHAR(255)
}

interface Producto {
  descripcion_producto: string;   // VARCHAR(255) - UNIQUE
}

interface Venta {
  numero_factura: number;         // INTEGER - PK
  fecha_factura: string;          // DATE (formato: YYYY-MM-DD)
  monto_total_factura: number;    // NUMERIC(12,2)
  rut_cliente: string;            // VARCHAR(20) - FK a clientes
}

interface DetalleVenta {
  numero_factura: number;         // INTEGER - FK a ventas
  descripcion_producto: string;   // Temporal para resolver id_producto
  unidades_vendidas: number;      // INTEGER
}

/**
 * Convierte las facturas extraídas del XML al formato de tu base de datos PostgreSQL
 */
export const mapInvoicesToDatabaseFormat = (
  invoices: InvoiceData[]
): DatabaseTables => {
  
  console.log(`🔄 Iniciando mapeo de ${invoices.length} facturas...`);
  
  const clientes: Cliente[] = [];
  const productos: Producto[] = [];
  const ventas: Venta[] = [];
  const detalle_ventas: DetalleVenta[] = [];
  
  // Sets para evitar duplicados
  const clientesSet = new Set<string>();
  const productosSet = new Set<string>();
  
  let totalItems = 0;

  for (const invoice of invoices) {
    try {
      // 1. MAPEAR CLIENTE (receptor de la factura)
      const clienteRut = invoice.receptor.identificacion_fiscal;
      
      if (!clientesSet.has(clienteRut)) {
        clientes.push({
          rut: clienteRut,
          razon_social: invoice.receptor.nombre.trim()
        });
        clientesSet.add(clienteRut);
        console.log(`➕ Nuevo cliente: ${invoice.receptor.nombre} (${clienteRut})`);
      }

      // 2. MAPEAR PRODUCTOS únicos de todos los items
      invoice.items.forEach(item => {
        const descripcionLimpia = item.descripcion.trim();
        
        if (!productosSet.has(descripcionLimpia)) {
          productos.push({
            descripcion_producto: descripcionLimpia
          });
          productosSet.add(descripcionLimpia);
          console.log(`🍺 Nuevo producto: ${descripcionLimpia}`);
        }
      });

      // 3. MAPEAR VENTA (una fila por factura)
      const numeroFactura = parseInt(invoice.numero_factura);
      
      ventas.push({
        numero_factura: numeroFactura,
        fecha_factura: invoice.fecha_emision.split('T')[0], // Solo fecha, sin hora
        monto_total_factura: parseFloat(invoice.total.toFixed(2)),
        rut_cliente: clienteRut
      });

      // 4. MAPEAR DETALLES (una fila por cada producto de la factura)
      invoice.items.forEach(item => {
        detalle_ventas.push({
          numero_factura: numeroFactura,
          descripcion_producto: item.descripcion.trim(),
          unidades_vendidas: Math.round(item.cantidad) // Redondear a entero
        });
        totalItems++;
      });

      console.log(`✅ Factura ${numeroFactura} mapeada con ${invoice.items.length} productos`);
      
    } catch (error) {
      console.error(`❌ Error mapeando factura ${invoice.numero_factura}:`, error);
      // Continuar con las demás facturas
    }
  }

  // Resumen del mapeo
  console.log(`
🎯 RESUMEN DEL MAPEO:
📋 ${invoices.length} facturas procesadas
👥 ${clientes.length} clientes únicos
🍺 ${productos.length} productos únicos  
💰 ${ventas.length} ventas
📦 ${detalle_ventas.length} detalles de productos
  `);

  return { 
    clientes, 
    productos, 
    ventas, 
    detalle_ventas 
  };
};

/**
 * Validar que los datos mapeados son correctos antes de enviar a PostgreSQL
 */
export const validateMappedData = (data: DatabaseTables): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validar que no hay datos vacíos
  if (data.clientes.length === 0) errors.push("No se encontraron clientes");
  if (data.productos.length === 0) errors.push("No se encontraron productos");
  if (data.ventas.length === 0) errors.push("No se encontraron ventas");
  if (data.detalle_ventas.length === 0) errors.push("No se encontraron detalles de venta");

  // Validar formato de RUT (básico)
  data.clientes.forEach((cliente, index) => {
    if (!cliente.rut || cliente.rut.length < 8) {
      errors.push(`Cliente ${index + 1}: RUT inválido (${cliente.rut})`);
    }
    if (!cliente.razon_social || cliente.razon_social.trim().length === 0) {
      errors.push(`Cliente ${index + 1}: Razón social vacía`);
    }
  });

  // Validar productos
  data.productos.forEach((producto, index) => {
    if (!producto.descripcion_producto || producto.descripcion_producto.trim().length === 0) {
      errors.push(`Producto ${index + 1}: Descripción vacía`);
    }
  });

  // Validar ventas
  data.ventas.forEach((venta, index) => {
    if (!venta.numero_factura || venta.numero_factura <= 0) {
      errors.push(`Venta ${index + 1}: Número de factura inválido`);
    }
    if (!venta.fecha_factura || !/^\d{4}-\d{2}-\d{2}$/.test(venta.fecha_factura)) {
      errors.push(`Venta ${index + 1}: Fecha inválida (${venta.fecha_factura})`);
    }
    if (venta.monto_total_factura <= 0) {
      errors.push(`Venta ${index + 1}: Monto inválido (${venta.monto_total_factura})`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};