import type { InvoiceData } from '../types';
import { openDB } from 'idb';

const DB_NAME = 'InvoiceDB';
const STORE_NAME = 'invoices';
const DB_VERSION = 1;

let dbPromise: Promise<any>;

function initDB() {
    if (dbPromise) return dbPromise;

    dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db: any) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                // Crear un índice para buscar duplicados fácilmente
                store.createIndex('invoiceIdentifier', ['numero_factura', 'emisor.identificacion_fiscal'], { unique: true });
            }
        },
    });
    return dbPromise;
}

export async function addInvoices(invoices: InvoiceData[]): Promise<{ addedCount: number; duplicateCount: number }> {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    let addedCount = 0;
    let duplicateCount = 0;

    for (const invoice of invoices) {
        try {
            // La restricción 'unique' en el índice se encargará de lanzar un error si hay un duplicado
            await store.add(invoice);
            addedCount++;
        } catch (error: any) {
            // El error 'ConstraintError' indica un duplicado
            if (error.name === 'ConstraintError') {
                duplicateCount++;
            } else {
                console.error('Error al añadir factura:', error);
                // Si hay otro error, se cancela la transacción
                tx.abort();
                throw error;
            }
        }
    }
    
    await tx.done;
    return { addedCount, duplicateCount };
}

export async function getAllInvoices(): Promise<InvoiceData[]> {
    const db = await initDB();
    return db.getAll(STORE_NAME);
}

export async function clearInvoices(): Promise<void> {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.objectStore(STORE_NAME).clear();
    await tx.done;
}

export async function deleteInvoice(id: number): Promise<void> {
    const db = await initDB();
    await db.delete(STORE_NAME, id);
}