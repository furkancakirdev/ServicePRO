import {
    IsTuru,
    IS_TURU_CONFIG,
    KapanisRaporu,
    RAPOR_GEREKSINIMLERI,
    PUAN_AGIRLIKLARI,
    YANIT_PUANLARI,
    YetkiliDegerlendirmesiUsta,
    YetkiliDegerlendirmesiCirak,
    AylikPerformans,
    YetkiliYanit,
    DEGERLENDIRME_SORULARI,
    PersonelUnvan,
} from '@/types';

// ==================== KATMAN 1: BİREYSEL SERVİS PUANI ====================

export function hesaplaRaporBasarisi(
    rapor: KapanisRaporu,
    isTuru: IsTuru
): number {
    const gerekliAlanlar = RAPOR_GEREKSINIMLERI[isTuru];
    let kazanilan = 0;

    gerekliAlanlar.forEach(alan => {
        if (rapor[alan]) kazanilan++;
    });

    // Açıklama bonus
    if (rapor.aciklama && rapor.aciklama.length > 20) {
        kazanilan += 0.5;
    }

    return kazanilan / (gerekliAlanlar.length + 0.5);
}

export function hesaplaBireyselPuan(
    raporBasarisi: number,
    isTuru: IsTuru,
    rol: 'sorumlu' | 'destek',
    bonus: boolean
): { hamPuan: number; zorlukCarpani: number; finalPuan: number } {
    return hesaplaBireyselPuanWithCarpan(
        raporBasarisi,
        IS_TURU_CONFIG[isTuru].carpan,
        rol,
        bonus
    );
}

export function hesaplaBireyselPuanWithCarpan(
    raporBasarisi: number,
    zorlukCarpani: number,
    rol: 'sorumlu' | 'destek',
    bonus: boolean
): { hamPuan: number; zorlukCarpani: number; finalPuan: number } {
    const hamPuan = rol === 'sorumlu' ? 40 + (60 * raporBasarisi) : 80;
    const bonusPuani = bonus ? 15 : 0;

    return {
        hamPuan: Math.round(hamPuan),
        zorlukCarpani,
        finalPuan: Math.round((hamPuan * zorlukCarpani) + bonusPuani),
    };
}
// ==================== KATMAN 2: YETKİLİ DEĞERLENDİRMESİ (ATLA + AĞIRLIK) ====================

export function hesaplaYetkiliPuani(
    sorular: YetkiliDegerlendirmesiUsta['sorular'] | YetkiliDegerlendirmesiCirak['sorular'],
    unvan: PersonelUnvan
): number {
    const isUsta = unvan === 'usta';
    let toplamPuan = 0;
    let toplamAgirlik = 0;

    // İlk 5 soru
    const soruListesi = isUsta ? DEGERLENDIRME_SORULARI.USTA : DEGERLENDIRME_SORULARI.CIRAK;
    soruListesi.forEach((soruConfig) => {
        const yanit = sorular[soruConfig.key as keyof typeof sorular] as YetkiliYanit;
        const puan = YANIT_PUANLARI[yanit];
        const agirlik = 1; // Default ağırlık

        if (puan !== null) {
            toplamPuan += puan * agirlik;
            toplamAgirlik += agirlik;
        }
    });

    // 6. soru (Genel Performans)
    const genelYanit = (sorular as Partial<Record<'genelSahaPerformansi', YetkiliYanit>>).genelSahaPerformansi;
    const genelPuan = genelYanit ? YANIT_PUANLARI[genelYanit as YetkiliYanit] : null;
    const genelAgirlik = 1;

    if (genelPuan !== null) {
        toplamPuan += genelPuan * genelAgirlik;
        toplamAgirlik += genelAgirlik;
    }

    // Ağırlıklı ortalama
    if (toplamAgirlik === 0) return 0;
    return Math.round(toplamPuan / toplamAgirlik);
}

// ==================== KATMAN 3: İSMAİL ÇOBAN KANAATİ ====================

export function normalizeIsmailPuani(puan: 1 | 2 | 3 | 4 | 5): number {
    return ((puan - 1) / 4) * 100;
}

// ==================== AYLIK TOPLAM HESAPLAMA ====================

export function hesaplaAylikToplam(
    bireyselPuanOrtalama: number,
    yetkiliPuanOrtalama: number,
    ismailPuani: number
): number {
    const normalizedIsmail = normalizeIsmailPuani(ismailPuani as 1 | 2 | 3 | 4 | 5);

    const toplam =
        (bireyselPuanOrtalama * PUAN_AGIRLIKLARI.bireysel) +
        (yetkiliPuanOrtalama * PUAN_AGIRLIKLARI.yetkili) +
        (normalizedIsmail * PUAN_AGIRLIKLARI.ismail);

    return Math.round(toplam);
}

// ==================== SIRALAMA VE ROZET ====================

export function belirleRozet(siralama: number): AylikPerformans['rozetDurumu'] {
    if (siralama === 1) return 'ALTIN';
    if (siralama === 2) return 'GUMUS';
    if (siralama === 3) return 'BRONZ';
    return undefined;
}

export function siralaPersoneller(
    performanslar: Omit<AylikPerformans, 'siralama' | 'rozetDurumu'>[]
): AylikPerformans[] {
    const sirali = [...performanslar].sort((a, b) => b.toplamPuan - a.toplamPuan);

    return sirali.map((p, index) => ({
        ...p,
        siralama: index + 1,
        rozetDurumu: belirleRozet(index + 1),
    }));
}

// ==================== YILLIK KLASMAN ====================

export function hesaplaYillikKlasman(
    aylikPerformanslar: AylikPerformans[]
): { personnelId: string; altinRozet: number; gumusRozet: number; bronzRozet: number; toplamPuan: number }[] {
    const personelMap = new Map<string, { altinRozet: number; gumusRozet: number; bronzRozet: number; toplamPuan: number }>();

    aylikPerformanslar.forEach(p => {
        const existing = personelMap.get(p.personnelId) || { altinRozet: 0, gumusRozet: 0, bronzRozet: 0, toplamPuan: 0 };

        if (p.rozetDurumu === 'ALTIN') existing.altinRozet++;
        if (p.rozetDurumu === 'GUMUS') existing.gumusRozet++;
        if (p.rozetDurumu === 'BRONZ') existing.bronzRozet++;
        existing.toplamPuan += p.toplamPuan;

        personelMap.set(p.personnelId, existing);
    });

    return Array.from(personelMap.entries()).map(([personnelId, data]) => ({
        personnelId,
        ...data,
    })).sort((a, b) => {
        if (b.altinRozet !== a.altinRozet) return b.altinRozet - a.altinRozet;
        const aTotal = a.altinRozet + a.gumusRozet + a.bronzRozet;
        const bTotal = b.altinRozet + b.gumusRozet + b.bronzRozet;
        if (bTotal !== aTotal) return bTotal - aTotal;
        return b.toplamPuan - a.toplamPuan;
    });
}

