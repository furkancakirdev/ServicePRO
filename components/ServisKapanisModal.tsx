'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PersonelRol = 'SORUMLU' | 'DESTEK';
type PersonelUnvan = 'USTA' | 'CIRAK' | 'YONETICI' | 'OFIS';
type Zorluk = 'RUTIN' | 'ARIZA' | 'PROJE';

interface Personel {
  personelId: string;
  personelAd: string;
  rol: PersonelRol;
  unvan: PersonelUnvan;
}

interface ServisData {
  servisId: string;
  tekneAdi: string;
  isTuru: 'PAKET' | 'ARIZA' | 'PROJE';
  servisAciklamasi: string;
  yer: string;
  personeller: Personel[];
  zorlukSeviyesi?: Zorluk | null;
}

interface KaliteKontrol {
  uniteModelVar: boolean;
  uniteSaatiVar: boolean;
  uniteSaatiExcludeFromScoring: boolean;
  uniteSeriNoVar: boolean;
  aciklamaYeterli: boolean;
  adamSaatVar: boolean;
  adamSaatExcludeFromScoring: boolean;
  fotograflarVar: boolean;
  // legacy aliases for backward compatibility
  uniteSaatiMuaf?: boolean;
  adamSaatMuaf?: boolean;
}

interface CompletePayload {
  personeller: Array<{ personelId: string; rol: PersonelRol }>;
  bonusPersonelIds: string[];
  kaliteKontrol: KaliteKontrol;
  zorlukOverride: Zorluk | null;
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

const ZORLUK_OPTIONS: Array<{ value: Zorluk; label: string }> = [
  { value: 'RUTIN', label: 'Rutin (1.0x)' },
  { value: 'ARIZA', label: 'Ariza (1.2x)' },
  { value: 'PROJE', label: 'Proje (1.5x)' },
];

const defaultKalite: KaliteKontrol = {
  uniteModelVar: false,
  uniteSaatiVar: false,
  uniteSaatiExcludeFromScoring: false,
  uniteSeriNoVar: false,
  aciklamaYeterli: false,
  adamSaatVar: false,
  adamSaatExcludeFromScoring: false,
  fotograflarVar: false,
};

function normalizeUnvan(unvan: PersonelApi['unvan']): PersonelUnvan {
  if (unvan === 'usta') return 'USTA';
  if (unvan === 'cirak') return 'CIRAK';
  if (unvan === 'yonetici') return 'YONETICI';
  return 'OFIS';
}

function uniqueById(items: Personel[]): Personel[] {
  return Array.from(new Map(items.map((personel) => [personel.personelId, personel])).values());
}

function QuestionRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant={value ? 'default' : 'outline'} onClick={() => onChange(true)}>
          Evet
        </Button>
        <Button type="button" size="sm" variant={!value ? 'default' : 'outline'} onClick={() => onChange(false)}>
          Hayir
        </Button>
      </div>
    </div>
  );
}

function ExcludeFromScoringRow({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-dashed p-3">
      <Label className="text-sm">Puan disi kalsin</Label>
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} />
    </div>
  );
}

export default function ServisKapanisModal({
  acik,
  onKapat,
  servis,
  onPuanlamaKaydet,
}: ServisKapanisModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [saving, setSaving] = useState(false);
  const [zorluk, setZorluk] = useState<Zorluk | null>(null);
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
    for (const personel of servis.personeller) {
      mevcutAtamalar[personel.personelId] = personel.rol;
    }
    setAtamalar(mevcutAtamalar);

    const seeded = uniqueById(servis.personeller);
    setTumPersonel(seeded);

    fetch('/api/personel?aktif=true')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: PersonelApi[]) => {
        const mapped: Personel[] = data.map((personel) => ({
          personelId: personel.id,
          personelAd: personel.ad,
          rol: 'DESTEK',
          unvan: normalizeUnvan(personel.unvan),
        }));
        setTumPersonel(uniqueById([...seeded, ...mapped]));
      })
      .catch(() => {
        // fallback: existing assignments
      });
  }, [acik, servis]);

  const seciliAtamalar = useMemo(
    () =>
      Object.entries(atamalar).map(([personelId, rol]) => {
        const personel = tumPersonel.find((item) => item.personelId === personelId);
        return {
          personelId,
          rol,
          personelAd: personel?.personelAd ?? personelId,
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

    if (!kalite.uniteSaatiExcludeFromScoring) checks.push(kalite.uniteSaatiVar);
    if (!kalite.adamSaatExcludeFromScoring) checks.push(kalite.adamSaatVar);

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
    if (seciliAtamalar.length === 0) return;

    setSaving(true);
    try {
      await onPuanlamaKaydet(servis.servisId, {
        personeller: seciliAtamalar.map((personel) => ({
          personelId: personel.personelId,
          rol: personel.rol,
        })),
        bonusPersonelIds,
        kaliteKontrol: {
          ...kalite,
          // legacy aliases for current API compatibility
          uniteSaatiMuaf: kalite.uniteSaatiExcludeFromScoring,
          adamSaatMuaf: kalite.adamSaatExcludeFromScoring,
        },
        zorlukOverride: zorluk,
      });
      onKapat();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={acik} onOpenChange={onKapat}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Servis Kapanis ve Kalite Kontrolu</DialogTitle>
          <DialogDescription>
            {servis.tekneAdi} - {servis.servisAciklamasi}
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

        {step === 1 ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">1. Asama - Zorluk ve Personel Atama</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Zorluk Seviyesi</Label>
                    <Select
                      value={zorluk ?? 'OTO'}
                      onValueChange={(value) =>
                        setZorluk(value === 'OTO' ? null : (value as Zorluk))
                      }
                    >
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
                  <Label>Personel Atamalari (Sorumlu / Destek)</Label>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {tumPersonel.map((personel) => {
                      const checked = Boolean(atamalar[personel.personelId]);
                      const rol = atamalar[personel.personelId] ?? 'DESTEK';
                      return (
                        <div key={personel.personelId} className="space-y-2 rounded-md border p-3">
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
                          {checked ? (
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
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Asama - Servis Raporu Kalite Kontrolu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">Kalite Puani: %{kaliteBasariYuzdesi}</div>

                <QuestionRow
                  label="Unite modeli yazilmis mi?"
                  value={kalite.uniteModelVar}
                  onChange={(value) => setKalite((prev) => ({ ...prev, uniteModelVar: value }))}
                />

                <QuestionRow
                  label="Unite saati yazilmis mi?"
                  value={kalite.uniteSaatiVar}
                  onChange={(value) =>
                    setKalite((prev) => ({
                      ...prev,
                      uniteSaatiVar: value,
                      uniteSaatiExcludeFromScoring: value ? false : prev.uniteSaatiExcludeFromScoring,
                    }))
                  }
                />
                {!kalite.uniteSaatiVar ? (
                  <ExcludeFromScoringRow
                    checked={kalite.uniteSaatiExcludeFromScoring}
                    onCheckedChange={(checked) =>
                      setKalite((prev) => ({ ...prev, uniteSaatiExcludeFromScoring: checked }))
                    }
                  />
                ) : null}

                <QuestionRow
                  label="Unite seri numarasi yazilmis mi?"
                  value={kalite.uniteSeriNoVar}
                  onChange={(value) => setKalite((prev) => ({ ...prev, uniteSeriNoVar: value }))}
                />

                <QuestionRow
                  label="Yapilan isin aciklamasi yeterli mi?"
                  value={kalite.aciklamaYeterli}
                  onChange={(value) => setKalite((prev) => ({ ...prev, aciklamaYeterli: value }))}
                />

                <QuestionRow
                  label="Harcanan sure adam/saat belirtilmis mi?"
                  value={kalite.adamSaatVar}
                  onChange={(value) =>
                    setKalite((prev) => ({
                      ...prev,
                      adamSaatVar: value,
                      adamSaatExcludeFromScoring: value ? false : prev.adamSaatExcludeFromScoring,
                    }))
                  }
                />
                {!kalite.adamSaatVar ? (
                  <ExcludeFromScoringRow
                    checked={kalite.adamSaatExcludeFromScoring}
                    onCheckedChange={(checked) =>
                      setKalite((prev) => ({ ...prev, adamSaatExcludeFromScoring: checked }))
                    }
                  />
                ) : null}

                <QuestionRow
                  label="Yapilan isin fotograflari gonderildi mi?"
                  value={kalite.fotograflarVar}
                  onChange={(value) => setKalite((prev) => ({ ...prev, fotograflarVar: value }))}
                />
              </CardContent>
            </Card>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">3. Asama - Bonus Personel Secimi (+15)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {seciliAtamalar.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Once personel atamasi yapmalisiniz.</div>
                ) : null}
                {seciliAtamalar.map((personel) => {
                  const checked = bonusPersonelIds.includes(personel.personelId);
                  return (
                    <div key={personel.personelId} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <div className="text-sm font-medium">{personel.personelAd}</div>
                        <div className="text-xs text-muted-foreground">
                          {personel.rol === 'SORUMLU' ? 'Sorumlu' : 'Destek'}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant={checked ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleBonus(personel.personelId, !checked)}
                      >
                        <Star className="mr-1 h-4 w-4" />
                        {checked ? 'Bonus Verildi' : 'Bonus Ver'}
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">4. Asama - Ozet ve Kaydet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border p-3 text-sm">
                  <div>
                    <strong>Tekne:</strong> {servis.tekneAdi}
                  </div>
                  <div>
                    <strong>Is Turu:</strong> {servis.isTuru}
                  </div>
                  <div>
                    <strong>Zorluk:</strong> {zorluk ?? 'Otomatik'}
                  </div>
                  <div>
                    <strong>Kalite Puani:</strong> %{kaliteBasariYuzdesi}
                  </div>
                  <div>
                    <strong>Atanan Personel:</strong> {seciliAtamalar.length}
                  </div>
                  <div>
                    <strong>Bonus Verilen:</strong> {bonusPersonelIds.length}
                  </div>
                </div>

                <div className="space-y-2">
                  {seciliAtamalar.map((personel) => (
                    <div key={personel.personelId} className="flex items-center justify-between rounded-md border p-2 text-sm">
                      <span>{personel.personelAd}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{personel.rol}</Badge>
                        {bonusPersonelIds.includes(personel.personelId) ? <Badge>+15</Badge> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

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
            <ChevronLeft className="mr-1 h-4 w-4" />
            {step === 1 ? 'Iptal' : 'Geri'}
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4)}
              disabled={step === 1 && seciliAtamalar.length === 0}
            >
              Ileri
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving || seciliAtamalar.length === 0}>
              <CheckCircle2 className="mr-1 h-4 w-4" />
              {saving ? 'Kaydediliyor...' : 'Kaydet ve Tamamla'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
