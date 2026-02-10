
const fs = require('fs');
const path = require('path');

const CSV_PATH = 'C:/Users/furkan.cakir/Desktop/ServicePro/Atölye Servis Planlama - Atölye Servis Planlama (1).csv';
const OUTPUT_DIR = path.join(__dirname, '../data');
const SERVICES_FILE = path.join(OUTPUT_DIR, 'services.json');
const PERSONNEL_FILE = path.join(OUTPUT_DIR, 'personnel.json');

// Helper to determine status
function mapStatus(durumStr) {
    if (!durumStr) return 'PLANLANDI';
    const d = durumStr.toUpperCase();
    if (d.includes('BITTI') || d.includes('BİTTİ')) return 'TAMAMLANDI'; // Fixed Turkish I
    if (d.includes('IPTAL') || d.includes('İPTAL')) return 'IPTAL';
    if (d.includes('KEŞİF') || d.includes('KESIF')) return 'DEVAM_EDIYOR';
    if (d.includes('DEVAM')) return 'DEVAM_EDIYOR';
    return 'PLANLANDI';
}

function mapIsTuru(aciklama) {
    if (!aciklama) return 'DIGER';
    const a = aciklama.toUpperCase();
    if (a.includes('BAKIM') || a.includes('RUTİN')) return 'RUTIN_BAKIM';
    if (a.includes('ARIZA') || a.includes('TAMİR')) return 'ARIZA_TESPIT';
    if (a.includes('MONTAJ')) return 'MONTAJ';
    if (a.includes('KEŞİF')) return 'KESIF';
    return 'DIGER';
}

// Simple CSV Parser (Handles quoted fields roughly)
function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        let line = lines[i];
        if (!line.trim()) continue;

        // Simple split considering quotes (basic implementation)
        const row = [];
        let inQuote = false;
        let currentCell = '';

        for (let char of line) {
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                row.push(currentCell.trim());
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
        row.push(currentCell.trim());

        const obj = {};
        headers.forEach((h, index) => {
            obj[h] = row[index] ? row[index].replace(/^"|"$/g, '') : '';
        });
        result.push(obj);
    }
    return result;
}

function run() {
    console.log('Reading CSV from:', CSV_PATH);
    try {
        const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
        const records = parseCSV(fileContent);

        console.log(`Found ${records.length} records.`);

        const services = [];

        records.forEach((row, index) => {
            // Check if record is valid (must have at least TEKNE ADI or AÇIKLAMA)
            if (!row['TEKNE ADI'] && !row['SERVİS AÇIKLAMASI']) return;

            const id = (index + 2735).toString(); // Start from known ID range

            const service = {
                id: id,
                tekneAdi: row['TEKNE ADI'] || 'Bilinmiyor',
                tarih: row['TARİH'] || new Date().toLocaleDateString('tr-TR'),
                saat: row['SAAT'] || '09:00',
                adres: row['ADRES'] || '',
                yer: row['YER'] || '',
                aciklama: row['SERVİS AÇIKLAMASI'] || '',
                irtibatKisi: row['İRTİBAT KİŞİ'] || '',
                telefon: row['TELEFON'] || '',
                durum: mapStatus(row['DURUM']),
                isTuru: mapIsTuru(row['SERVİS AÇIKLAMASI']),
                atananPersonel: [],
                olusturulmaTarihi: new Date().toISOString()
            };

            services.push(service);
        });

        // Write services.json
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        fs.writeFileSync(SERVICES_FILE, JSON.stringify(services, null, 2));
        console.log(`Wrote ${services.length} services to ${SERVICES_FILE}`);

        // Write default personnel if not exists
        if (!fs.existsSync(PERSONNEL_FILE)) {
            const defaultPersonnel = [
                { id: '1', adSoyad: 'Mehmet Yücad', unvan: 'BAS_TEKNISYEN', mevcutIsler: [], tamamlananIsler: [], puanlar: [], rozetler: [] },
                { id: '2', adSoyad: 'Furkan Çakır', unvan: 'TEKNISYEN', mevcutIsler: [], tamamlananIsler: [], puanlar: [], rozetler: [] },
                { id: '3', adSoyad: 'İbrahim Yayalık', unvan: 'TEKNISYEN', mevcutIsler: [], tamamlananIsler: [], puanlar: [], rozetler: [] },
                { id: '4', adSoyad: 'Emre', unvan: 'CIRAK', mevcutIsler: [], tamamlananIsler: [], puanlar: [], rozetler: [] }
            ];
            fs.writeFileSync(PERSONNEL_FILE, JSON.stringify(defaultPersonnel, null, 2));
            console.log(`Wrote default personnel to ${PERSONNEL_FILE}`);
        }

    } catch (error) {
        console.error("Migration failed:", error);
    }
}

run();
