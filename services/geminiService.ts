import { GoogleGenAI, Type } from "@google/genai";
import type { InvoiceData } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const invoiceSchema = {
    type: Type.OBJECT,
    properties: {
        numero_factura: { type: Type.STRING, description: "El número de identificación único de la factura." },
        fecha_emision: { type: Type.STRING, description: "La fecha en que se emitió la factura (formato YYYY-MM-DD)." },
        fecha_vencimiento: { type: Type.STRING, description: "La fecha de vencimiento del pago de la factura (formato YYYY-MM-DD)." },
        moneda: { type: Type.STRING, description: "La moneda de la factura (ej. USD, EUR, MXN)." },
        emisor: {
            type: Type.OBJECT,
            properties: {
                nombre: { type: Type.STRING },
                identificacion_fiscal: { type: Type.STRING },
                direccion: { type: Type.STRING },
                contacto: { type: Type.STRING, description: "Email o teléfono del emisor" },
            },
            required: ["nombre", "identificacion_fiscal", "direccion"]
        },
        receptor: {
            type: Type.OBJECT,
            properties: {
                nombre: { type: Type.STRING },
                identificacion_fiscal: { type: Type.STRING },
                direccion: { type: Type.STRING },
                contacto: { type: Type.STRING, description: "Email o teléfono del receptor" },
            },
            required: ["nombre", "identificacion_fiscal", "direccion"]
        },
        items: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    descripcion: { type: Type.STRING },
                    cantidad: { type: Type.NUMBER },
                    precio_unitario: { type: Type.NUMBER },
                    total_linea: { type: Type.NUMBER },
                },
                required: ["descripcion", "cantidad", "precio_unitario", "total_linea"]
            },
        },
        subtotal: { type: Type.NUMBER, description: "El monto total antes de impuestos." },
        impuestos: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    tipo: { type: Type.STRING, description: "Tipo de impuesto (ej. IVA, ISR)." },
                    tasa: { type: Type.NUMBER, description: "Tasa del impuesto en porcentaje (ej. 16 para 16%)." },
                    monto: { type: Type.NUMBER, description: "Monto total del impuesto." },
                },
                required: ["tipo", "tasa", "monto"]
            },
        },
        total: { type: Type.NUMBER, description: "El monto total final de la factura." },
        notas: { type: Type.STRING, description: "Cualquier nota o comentario adicional en la factura." },
    },
    required: ["numero_factura", "fecha_emision", "fecha_vencimiento", "moneda", "emisor", "receptor", "items", "subtotal", "impuestos", "total"]
};

const responseSchema = {
    type: Type.ARRAY,
    items: invoiceSchema
};


export const extractInvoiceDataFromXml = async (xmlContent: string): Promise<InvoiceData[]> => {
    try {
        const prompt = `
            Eres un asistente experto en contabilidad especializado en procesar facturas electrónicas.
            El siguiente contenido XML puede contener una o varias facturas. Tu tarea es analizar el contenido,
            identificar TODAS y CADA UNA de las facturas presentes, y extraer la información relevante de cada una.

            Devuelve un array de objetos JSON, donde cada objeto representa una factura individual y se ajusta
            estrictamente al esquema JSON proporcionado. Asegúrate de que todos los valores numéricos
            sean números y no cadenas de texto. Si un campo opcional como 'notas' o 'contacto' no está presente, omítelo.

            Contenido XML de la(s) factura(s):
            \`\`\`xml
            ${xmlContent}
            \`\`\`
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsedData = JSON.parse(jsonText);

        if (!Array.isArray(parsedData)) {
            throw new Error("La respuesta de la IA no es un array, como se esperaba.");
        }
        
        if (parsedData.length > 0) {
            const firstInvoice = parsedData[0];
            if (!firstInvoice.numero_factura || !firstInvoice.emisor || !firstInvoice.receptor || !firstInvoice.items || typeof firstInvoice.total === 'undefined') {
                 throw new Error("La respuesta de la IA no contiene los campos esperados para una factura.");
            }
        }

        return parsedData as InvoiceData[];

    } catch (error) {
        console.error("Error al llamar a la API de Gemini para extracción:", error);
        throw new Error("No se pudo procesar el XML. La IA devolvió un error o un formato inesperado.");
    }
};

export const analyzeInvoiceData = async (invoices: InvoiceData[], userPrompt: string): Promise<string> => {
    if (!invoices || invoices.length === 0) {
        throw new Error("No hay datos de facturas para analizar.");
    }

    try {
        const prompt = `
            Eres un asistente experto en análisis de negocios y financiero. Se te proporcionará un array de objetos JSON que representa un historial de facturas.
            Tu tarea es analizar estos datos en profundidad para responder a la siguiente solicitud del usuario.

            Solicitud del usuario: "${userPrompt}"

            Datos de las facturas:
            \`\`\`json
            ${JSON.stringify(invoices, null, 2)}
            \`\`\`

            Por favor, proporciona una respuesta clara, concisa y bien estructurada. Utiliza el formato Markdown (encabezados, listas, negritas) para que tu respuesta sea fácil de leer.
            Ofrece insights accionables siempre que sea posible. Basa tu análisis únicamente en los datos proporcionados.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text;

    } catch (error) {
        console.error("Error al llamar a la API de Gemini para análisis:", error);
        throw new Error("La IA no pudo completar el análisis. Por favor, intenta de nuevo más tarde.");
    }
};