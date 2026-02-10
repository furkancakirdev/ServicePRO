'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, ChevronLeft, ChevronRight, Star } from 'lucide-react';

type PersonelRol = 'SORUMLU' | 'DESTEK';

interface Personel {
  personelId: string;
  personelAd: string;
  rol: PersonelRol;
  unvan: 'USTA' | 'CIRAK' | 'YONETICI' | 'OFIS';
}

interface ServisData {
  servisId: string;
  tekneAdi: string;
  isTuru: 'PAKET' | 'ARIZA' | 'PROJE';
  servisAciklamasi: string;
  yer: string;
  personeller: Personel[];
  zorlukSeviyesi?: 'RUTIN' | 'ARIZA' | 'PROJE' | null;
}

interface KaliteKontrol {
  uniteModelVar: boolean;
  uniteSaatiVar: boolean;
  uniteSaatiMuaf: boolean;
  uniteSeriNoVar: boolean;
  aciklamaYeterli: boolean;
  adamSaatVar: boolean;
  adamSaatMuaf: boolean;
  fotograflarVar: boolean;
}

interface CompletePayload {
  personeller: Array<{ personelId: string; rol: PersonelRol }>;
  bonusPersonelIds: string[];
  kaliteKontrol: KaliteKontrol;
  zorlukOverride: 'RUTIN' | 'ARIZA' | 'PROJE' | null;
}

interface ServisKapanisModalProps {
  acik: boolean;
  onKapat: () => void;
  servis: ServisData | null;
  onPuanlamaKaydet: (servisId: string, payload: CompletePayload) => Promise<void>;
}

interface PersonelApi {
  id: string;
  ad: string;
  unvan: 'usta' | 'cirak' | 'yonetici' | 'ofis';
  aktif: boolean;
}

const ZORLUK_OPTIONS = [
  { value: 'RUTIN', label: 'Rutin (1.0x)' },
  { value: 'ARIZA', label: 'Arıza (1.2x)' },
  { value: 'PROJE', label: 'Proje (1.5x)' },
] as const;

const defaultKalite: KaliteKontrol = {
  uniteModelVar: false,
  uniteSaatiVar: false,
  uniteSaatiMuaf: false,
  uniteSeriNoVar: false,
  aciklamaYeterli: false,
  adamSaatVar: false,
  adamSaatMuaf: false,
  fotograflarVar: false,
};

function normalizeUnvan(unvan: PersonelApi['unvan']): Personel['unvan'] {
  if (unvan === 'usta') return 'USTA';
  if (unvan === 'cirak') return 'CIRAK';
  if (unvan === 'yonetici') return 'YONETICI';
  return 'OFIS';
}

function uniqueById(items: Personel[]): Personel[] {
  return Array.from(new Map(items.map((p) => [p.personelId, p])).values());
}

export default function ServisKapanisModal({ acik, onKapat, servis, onPuanlamaKaydet }: ServisKapanisModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [saving, setSaving] = useState(false);
  const [zorluk, setZorluk] = useState<'RUTIN' | 'ARIZA' | 'PROJE' | null>(null);
  const [kalite, setKalite] = useState<KaliteKontrol>(defaultKalite);
  const [tumPersonel, setTumPersonel] = useState<Personel[]>([]);
  const [atamalar, setAtamalar] = useState<Record<string, PersonelRol>>({});
  const [bonusPersonelIds, setBonusPersonelIds] = useState<string[]>([]);

  useEffect(() => {
    if (!acik || !servis) return;

    setStep(1);
    setKalite(defaultKalite);
    setBonusPersonelIds([]);
    setZorluk(servis.zorlukSeviyesi ?? null);

    const mevcutAtamalar: Record<string, PersonelRol> = {};
    for (const p of servis.personeller) {
      mevcutAtamalar[p.personelId] = p.rol;
    }
    setAtamalar(mevcutAtamalar);

    const seeded = uniqueById(servis.personeller);
    setTumPersonel(seeded);

    fetch('/api/personel?aktif=true')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: PersonelApi[]) => {
        const mapped = data.map((p) => ({
          personelId: p.id,
          personelAd: p.ad,
          rol: 'DESTEK' as PersonelRol,
          unvan: normalizeUnvan(p.unvan),
        }));
        setTumPersonel(uniqueById([...seeded, ...mapped]));
      })
      .catch(() => {
        // Sessiz fallback: mevcut atama listesi yeterli
      });
  }, [acik, servis]);

  const seciliAtamalar = useMemo(
    () =>
      Object.entries(atamalar).map(([personelId, rol]) => {
        const p = tumPersonel.find((item) => item.personelId === personelId);
        return {
          personelId,
          rol,
          personelAd: p?.personelAd ?? personelId,
        };
      }),
    [atamalar, tumPersonel]
  );

  const kaliteBasariYuzdesi = useMemo(() => {
    const checks: boolean[] = [
      kalite.uniteModelVar,
      kalite.uniteSeriNoVar,
      kalite.aciklamaYeterli,
      kalite.fotograflarVar,
    ];

    if (!kalite.uniteSaatiMuaf) checks.push(kalite.uniteSaatiVar);
    if (!kalite.adamSaatMuaf) checks.push(kalite.adamSaatVar);

    if (checks.length === 0) return 100;
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [kalite]);

  if (!servis) return null;

  const toggleAtama = (personelId: string, checked: boolean) => {
    setAtamalar((prev) => {
      const next = { ...prev };
      if (checked) {
        next[personelId] = next[personelId] ?? 'DESTEK';
      } else {
        delete next[personelId];
      }
      return next;
    });

    if (!checked) {
      setBonusPersonelIds((prev) => prev.filter((id) => id !== personelId));
    }
  };

  const setRol = (personelId: string, rol: PersonelRol) => {
    setAtamalar((prev) => ({ ...prev, [personelId]: rol }));
  };

  const toggleBonus = (personelId: string, checked: boolean) => {
    setBonusPersonelIds((prev) => {
      if (checked) return Array.from(new Set([...prev, personelId]));
      return prev.filter((id) => id !== personelId);
    });
  };

  const handleSubmit = async () => {
    if (seciliAtamalar.length === 0) {
      return;
    }

    setSaving(true);
    try {
      await onPuanlamaKaydet(servis.servisId, {
        personeller: seciliAtamalar.map((p) => ({ personelId: p.personelId, rol: p.rol })),
        bonusPersonelIds,
        kaliteKontrol: kalite,
        zorlukOverride: zorluk,
      });
      onKapat();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={acik} onOpenChange={onKapat}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Servis Kapanış ve Kalite Kontrolü</DialogTitle>
          <DialogDescription>
            {servis.tekneAdi} • {servis.servisAciklamasi}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className={`h-2 w-16 rounded-full ${step >= index ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">1. Aşama • Zorluk ve Personel Atama</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Zorluk Seviyesi</Label>
                    <Select value={zorluk ?? 'OTO'} onValueChange={(v) => setZorluk(v === 'OTO' ? null : (v as 'RUTIN' | 'ARIZA' | 'PROJE'))}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OTO">Otomatik ({servis.isTuru})</SelectItem>
                        {ZORLUK_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Lokasyon</Label>
                    <div className="mt-2 rounded-md border px-3 py-2 text-sm">{servis.yer || '-'}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Personel Atamaları (Sorumlu / Destek)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {tumPersonel.map((personel) => {
                      const checked = Boolean(atamalar[personel.personelId]);
                      const rol = atamalar[personel.personelId] ?? 'DESTEK';
                      return (
                        <div key={personel.personelId} className="rounded-md border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => toggleAtama(personel.personelId, Boolean(value))}
                              />
                              <span className="text-sm font-medium">{personel.personelAd}</span>
                            </div>
                            <Badge variant="outline">{personel.unvan}</Badge>
                          </div>
                          {checked && (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={rol === 'SORUMLU' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setRol(personel.personelId, 'SORUMLU')}
                              >
                                Sorumlu
                              </Button>
                              <Button
                                type="button"
                                variant={rol === 'DESTEK' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setRol(personel.personelId, 'DESTEK')}
                              >
                                Destek
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Aşama • Servis Raporu Kalite Kontrolü</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">Kalite Puanı: %{kaliteBasariYuzdesi}</div>

                <QuestionRow
                  label="Ünite modeli yazılmış mı?"
                  value={kalite.uniteModelVar}
                  onChange={(val) => setKalite((prev) => ({ ...prev, uniteModelVar: val }))}
                />

                <QuestionRow
                  label="Ünite saati yazılmış mı?"
                  value={kalite.uniteSaatiVar}
                  onChange={(val) => setKalite((prev) => ({ ...prev, uniteSaatiVar: val }))}
                  disabled={kalite.uniteSaatiMuaf}
                />
                <QuestionRow
                  label="Saati olmayan ünite (puan dışı)"
                  value={kalite.uniteSaatiMuaf}
                  onChange={(val) => setKalite((prev) => ({ ...prev, uniteSaatiMuaf: val, uniteSaatiVar: val ? false : prev.uniteSaatiVar }))}
                />

                <QuestionRow
                  label="Ünite seri numarası yazılmış mı?"
                  value={kalite.uniteSeriNoVar}
                  onChange={(val) => setKalite((prev) => ({ ...prev, uniteSeriNoVar: val }))}
                />

                <QuestionRow
                  label="Yapılan işin açıklaması yeterli mi?"
                  value={kalite.aciklamaYeterli}
                  onChange={(val) => setKalite((prev) => ({ ...prev, aciklamaYeterli: val }))}
                />

                <QuestionRow
                  label="Harcanan süre adam/saat belirtilmiş mi?"
                  value={kalite.adamSaatVar}
                  onChange={(val) => setKalite((prev) => ({ ...prev, adamSaatVar: val }))}
                  disabled={kalite.adamSaatMuaf}
                />
                <QuestionRow
                  label="Adam/saat uygulanmaz (puan dışı)"
                  value={kalite.adamSaatMuaf}
                  onChange={(val) => setKalite((prev) => ({ ...prev, adamSaatMuaf: val, adamSaatVar: val ? false : prev.adamSaatVar }))}
                />

                <QuestionRow
                  label="Yapılan işin fotoğrafları gönderildi mi?"
                  value={kalite.fotograflarVar}
                  onChange={(val) => setKalite((prev) => ({ ...prev, fotograflarVar: val }))}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">3. Aşama • Bonus Personel Seçimi (+15)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {seciliAtamalar.length === 0 && (
                  <div className="text-sm text-muted-foreground">Önce personel ataması yapmalısınız.</div>
                )}
                {seciliAtamalar.map((p) => {
                  const checked = bonusPersonelIds.includes(p.personelId);
                  return (
                    <div key={p.personelId} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <div className="font-medium text-sm">{p.personelAd}</div>
                        <div className="text-xs text-muted-foreground">{p.rol === 'SORUMLU' ? 'Sorumlu' : 'Destek'}</div>
                      </div>
                      <Button
                        type="button"
                        variant={checked ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleBonus(p.personelId, !checked)}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        {checked ? 'Bonus Verildi' : 'Bonus Ver'}
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">4. Aşama • Özet ve Kaydet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border p-3 text-sm">
                  <div><strong>Tekne:</strong> {servis.tekneAdi}</div>
                  <div><strong>İş Türü:</strong> {servis.isTuru}</div>
                  <div><strong>Zorluk:</strong> {zorluk ?? 'Otomatik'}</div>
                  <div><strong>Kalite Puanı:</strong> %{kaliteBasariYuzdesi}</div>
                  <div><strong>Atanan Personel:</strong> {seciliAtamalar.length}</div>
                  <div><strong>Bonus Verilen:</strong> {bonusPersonelIds.length}</div>
                </div>

                <div className="space-y-2">
                  {seciliAtamalar.map((p) => (
                    <div key={p.personelId} className="flex items-center justify-between text-sm rounded-md border p-2">
                      <span>{p.personelAd}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{p.rol}</Badge>
                        {bonusPersonelIds.includes(p.personelId) && <Badge>+15</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => {
              if (step === 1) {
                onKapat();
                return;
              }
              setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
            }}
            disabled={saving}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> {step === 1 ? 'İptal' : 'Geri'}
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4)}
              disabled={step === 1 && seciliAtamalar.length === 0}
            >
              İleri <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving || seciliAtamalar.length === 0}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {saving ? 'Kaydediliyor...' : 'Kaydet ve Tamamla'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuestionRow({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant={value ? 'default' : 'outline'} disabled={disabled} onClick={() => onChange(true)}>
          Evet
        </Button>
        <Button type="button" size="sm" variant={!value ? 'default' : 'outline'} disabled={disabled} onClick={() => onChange(false)}>
          Hayır
        </Button>
      </div>
    </div>
  );
}
