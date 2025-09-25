// services/postgresService.ts
import { GoogleGenAI } from "@google/genai";
import type { DatabaseTables } from './dataMapper';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface PostgresResult {
    success: boolean;
    summary: string;
    details?: {
        clientesInsertados: number;
        productosInsertados: number;
        ventasInsertadas: number;
        detallesInsertados: number;
        errores?: string[];
    };
    sqlGenerated?: string[];
}

/**
 * Procesa y envía los datos mapeados a PostgreSQL usando Gemini para generar SQL optimizado
 */
export const insertIntoDatabaseWithGemini = async (
    data: DatabaseTables
): Promise<PostgresResult> => {
    try {
        console.log("🚀 Iniciando inserción en PostgreSQL...");
        console.log("Datos a procesar:", {
            clientes: data.clientes.length,
            productos: data.productos.length,
            ventas: data.ventas.length,
            detalles: data.detalle_ventas.length
        });

        // 1. Generar SQL con Gemini
        console.log("🤖 Generando consultas SQL con Gemini...");
        const sqlQueries = await generatePostgreSQLWithGemini(data);
        
        if (!sqlQueries || sqlQueries.length === 0) {
            throw new Error("Gemini no pudo generar las consultas SQL");
        }

        console.log(`📝 ${sqlQueries.length} consultas SQL generadas`);

        // 2. Simular ejecución (TEMPORAL - aquí conectarás con tu BD real)
        console.log("💾 Ejecutando consultas en PostgreSQL...");
        const resultados = await simulatePostgreSQLExecution(sqlQueries, data);

        return {
            success: true,
            summary: `🎉 Proceso completado exitosamente: ${data.ventas.length} facturas procesadas`,
            details: resultados,
            sqlGenerated: sqlQueries
        };

    } catch (error) {
        console.error("❌ Error en insertIntoDatabaseWithGemini:", error);
        return {
            success: false,
            summary: `❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
            details: {
                clientesInsertados: 0,
                productosInsertados: 0,
                ventasInsertadas: 0,
                detallesInsertados: 0,
                errores: [error instanceof Error ? error.message : 'Error desconocido']
            }
        };
    }
};

/**
 * Genera consultas SQL optimizadas usando Gemini AI
 */
const generatePostgreSQLWithGemini = async (data: DatabaseTables): Promise<string[]> => {
    const prompt = `
Eres un experto en PostgreSQL. Genera 4 consultas SQL optimizadas para insertar datos de facturas de cervecería.

ESTRUCTURA EXACTA DE LA BASE DE DATOS:
- clientes (rut VARCHAR(20) PK, razon_social VARCHAR(255))
- productos (id_producto SERIAL PK, descripcion_producto VARCHAR(255) UNIQUE)
- ventas (numero_factura INTEGER PK, fecha_factura DATE, monto_total_factura NUMERIC(12,2), rut_cliente VARCHAR(20) FK)
- detalle_ventas (id_detalle_venta SERIAL PK, numero_factura INTEGER FK, id_producto INTEGER FK, unidades_vendidas INTEGER)

CONSTRAINTS IMPORTANTES:
- productos.descripcion_producto es UNIQUE
- detalle_ventas tiene UNIQUE(numero_factura, id_producto)
- Todas las FK están definidas y deben respetarse

DATOS A INSERTAR:
${JSON.stringify(data, null, 2)}

INSTRUCCIONES ESPECÍFICAS:

1. CONSULTA 1 - Insertar clientes:
INSERT INTO clientes (rut, razon_social) VALUES 
('rut1', 'nombre1'), ('rut2', 'nombre2')
ON CONFLICT (rut) DO UPDATE SET razon_social = EXCLUDED.razon_social;

2. CONSULTA 2 - Insertar productos:
INSERT INTO productos (descripcion_producto) VALUES 
('producto1'), ('producto2')
ON CONFLICT (descripcion_producto) DO NOTHING;

3. CONSULTA 3 - Insertar ventas:
INSERT INTO ventas (numero_factura, fecha_factura, monto_total_factura, rut_cliente) VALUES 
(1234, '2024-01-01', 50000.00, 'rut1')
ON CONFLICT (numero_factura) DO NOTHING;

4. CONSULTA 4 - Insertar detalle_ventas (usando subconsulta para obtener id_producto):
INSERT INTO detalle_ventas (numero_factura, id_producto, unidades_vendidas) VALUES 
(1234, (SELECT id_producto FROM productos WHERE descripcion_producto = 'producto1'), 2)
ON CONFLICT (numero_factura, id_producto) DO UPDATE SET unidades_vendidas = EXCLUDED.unidades_vendidas;

FORMATO DE RESPUESTA:
- Devolver array JSON con exactamente 4 strings
- Cada string es una consulta SQL completa
- NO incluir comentarios ni explicaciones
- Usar formato de fecha PostgreSQL (YYYY-MM-DD)
- Escapar comillas simples en textos si es necesario

EJEMPLO RESPUESTA: ["consulta1", "consulta2", "consulta3", "consulta4"]
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            },
        });

        const sqlQueries = JSON.parse(response.text);
        
        // Validar que recibimos 4 consultas
        if (!Array.isArray(sqlQueries) || sqlQueries.length !== 4) {
            throw new Error(`Se esperaban 4 consultas SQL, pero se recibieron ${sqlQueries?.length || 0}`);
        }

        console.log("✅ Consultas SQL generadas correctamente");
        sqlQueries.forEach((query, index) => {
            console.log(`📝 Consulta ${index + 1}:`, query.substring(0, 100) + "...");
        });

        return sqlQueries;

    } catch (error) {
        console.error("❌ Error generando SQL con Gemini:", error);
        throw new Error(`Error al generar consultas SQL: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
};

/**
 * TEMPORAL: Simula la ejecución en PostgreSQL
 * REEMPLAZAR con conexión real a tu base de datos
 */
const simulatePostgreSQLExecution = async (
    queries: string[], 
    data: DatabaseTables
): Promise<{
    clientesInsertados: number;
    productosInsertados: number;
    ventasInsertadas: number;
    detallesInsertados: number;
}> => {
    
    console.log("⚠️  MODO SIMULACIÓN - NO se están insertando datos reales");
    console.log("🔄 Simulando ejecución de", queries.length, "consultas...");
    
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simular conteos de inserción
    const resultado = {
        clientesInsertados: data.clientes.length,
        productosInsertados: data.productos.length, 
        ventasInsertadas: data.ventas.length,
        detallesInsertados: data.detalle_ventas.length
    };
    
    console.log("✅ Simulación completada:", resultado);
    
    return resultado;
};

/**
 * TODO: Función para ejecutar SQL real en PostgreSQL
 * Aquí integrarías con tu MCP PostgreSQL o API backend
 */
const executeRealPostgreSQL = async (queries: string[]): Promise<any> => {
    // OPCIÓN 1: Usar fetch a tu API backend
    /*
    const response = await fetch('/api/execute-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries })
    });
    return response.json();
    */

    // OPCIÓN 2: Usar tu MCP PostgreSQL (si está disponible en el frontend)
    /*
    // Aquí llamarías a tu MCP server
    */

    throw new Error("executeRealPostgreSQL no implementado aún");
};