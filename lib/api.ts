
import { Service, Personnel } from '@/types';

// Helper to fetch data
async function fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    }
    return res.json();
}

// ==================== SERVICE API ====================

export async function fetchServices(): Promise<Service[]> {
    const payload = await fetchJson<{ services?: Service[] }>('/api/services');
    return Array.isArray(payload?.services) ? payload.services : [];
}

export async function fetchServiceById(id: string): Promise<Service | null> {
    try {
        return await fetchJson<Service>(`/api/services/${id}`);
    } catch {
        return null;
    }
}

export async function createService(service: Omit<Service, 'id'>): Promise<string> {
    const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service),
    });
    if (!res.ok) throw new Error('Failed to create service');
    const data = await res.json();
    return data.id;
}

export async function updateService(id: string, updates: Partial<Service>): Promise<boolean> {
    const res = await fetch(`/api/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    return res.ok;
}

// ==================== PERSONNEL API ====================

export async function fetchPersonnel(): Promise<Personnel[]> {
    return fetchJson<Personnel[]>('/api/personel');
}

export async function fetchPersonnelById(id: string): Promise<Personnel | null> {
    try {
        return await fetchJson<Personnel>(`/api/personel/${id}`);
    } catch {
        return null;
    }
}

// ==================== STATS API ====================

export async function fetchStats() {
    return fetchJson<{
        bugunServisleri: number;
        devamEdenler: number;
        parcaBekleyenler: number;
        randevular: number;
        tamamlananlar: number;
        toplamServis: number;
        aktifPersonel: number;
    }>('/api/stats');
}
