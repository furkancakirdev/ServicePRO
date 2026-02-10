import fs from 'fs';
import path from 'path';
import { Service, Personnel, ServisPuani } from '@/types';

// Mark as server-only to prevent client-side usage
// server-only import removed to avoid dependency issues


const DATA_DIR = path.join(process.cwd(), 'data');
const SERVICES_FILE = path.join(DATA_DIR, 'services.json');
const PERSONNEL_FILE = path.join(DATA_DIR, 'personnel.json');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json'); // For ServisPuani etc.

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to read JSON
function readJson<T>(filePath: string, defaultValue: T): T {
    try {
        if (!fs.existsSync(filePath)) {
            return defaultValue;
        }
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(fileContent) as T;
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return defaultValue;
    }
}

// Helper to write JSON
function writeJson<T>(filePath: string, data: T): void {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
    }
}

export interface Database {
    services: Service[];
    personnel: Personnel[];
    servisPuanlari: ServisPuani[];
}

export function getDatabase(): Database {
    return {
        services: readJson<Service[]>(SERVICES_FILE, []),
        personnel: readJson<Personnel[]>(PERSONNEL_FILE, []),
        servisPuanlari: readJson<ServisPuani[]>(SCORES_FILE, []),
    };
}

// ==================== SERVICE OPERATIONS ====================

export function getAllServices(): Service[] {
    return readJson<Service[]>(SERVICES_FILE, []);
}

export function getServiceById(id: string): Service | null {
    const services = getAllServices();
    return services.find(s => s.id === id) || null;
}

export function addService(service: Omit<Service, 'id'>): string {
    const services = getAllServices();
    // Simple numeric ID generation (can be improved)
    const newId = String(Math.max(...services.map(s => parseInt(s.id) || 0), 2735) + 1);
    const newService = { ...service, id: newId };
    services.unshift(newService);
    writeJson(SERVICES_FILE, services);
    return newId;
}

export function updateService(id: string, updates: Partial<Service>): boolean {
    const services = getAllServices();
    const index = services.findIndex(s => s.id === id);
    if (index === -1) return false;

    services[index] = { ...services[index], ...updates };
    writeJson(SERVICES_FILE, services);
    return true;
}

export function deleteService(id: string): boolean {
    let services = getAllServices();
    const initialLength = services.length;
    services = services.filter(s => s.id !== id);
    if (services.length === initialLength) return false;

    writeJson(SERVICES_FILE, services);
    return true;
}

// ==================== PERSONNEL OPERATIONS ====================

export function getAllPersonnel(): Personnel[] {
    return readJson<Personnel[]>(PERSONNEL_FILE, []);
}

export function getPersonnelById(id: string): Personnel | null {
    const personnel = getAllPersonnel();
    return personnel.find(p => p.id === id) || null;
}

export function updatePersonnel(id: string, updates: Partial<Personnel>): boolean {
    const personnel = getAllPersonnel();
    const index = personnel.findIndex(p => p.id === id);
    if (index === -1) return false;

    personnel[index] = { ...personnel[index], ...updates };
    writeJson(PERSONNEL_FILE, personnel);
    return true;
}


// ==================== SCORING OPERATIONS ====================

export function addServisPuani(puan: Omit<ServisPuani, 'id'>): string {
    const scores = readJson<ServisPuani[]>(SCORES_FILE, []);
    const newId = `SP-${Date.now()}`;
    scores.push({ ...puan, id: newId });
    writeJson(SCORES_FILE, scores);
    return newId;
}

export function getServisPuanlariByPersonnel(personnelId: string): ServisPuani[] {
    const scores = readJson<ServisPuani[]>(SCORES_FILE, []);
    return scores.filter(p => p.personnelId === personnelId);
}

// ==================== STATS ====================

export function getStats() {
    const services = getAllServices();
    const personnel = getAllPersonnel();
    
    // Format today as DD.MM.YYYY to match CSV data (Turkish format)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const today = `${day}.${month}.${year}`;

    return {
        bugunServisleri: services.filter(s => s.tarih === today).length,
        devamEdenler: services.filter(s => s.durum === 'DEVAM_EDIYOR' || s.durum === 'KESIF_KONTROL').length,
        parcaBekleyenler: services.filter(s => s.durum === 'PARCA_BEKLIYOR').length,
        randevular: services.filter(s => s.durum === 'RANDEVU_VERILDI').length,
        tamamlananlar: services.filter(s => s.durum === 'TAMAMLANDI').length,
        toplamServis: services.length,
        aktifPersonel: personnel.filter(p => p.aktif && p.rol === 'teknisyen').length,
    };
}
