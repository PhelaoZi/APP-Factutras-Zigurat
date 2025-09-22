
export interface Party {
    nombre: string;
    identificacion_fiscal: string;
    direccion: string;
    contacto?: string;
}

export interface LineItem {
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
    total_linea: number;
}

export interface Tax {
    tipo: string;
    tasa: number;
    monto: number;
}

export interface InvoiceData {
    id?: number; // Clave primaria de IndexedDB
    numero_factura: string;
    fecha_emision: string;
    fecha_vencimiento: string;
    moneda: string;
    emisor: Party;
    receptor: Party;
    items: LineItem[];
    subtotal: number;
    impuestos: Tax[];
    total: number;
    notas?: string;
}