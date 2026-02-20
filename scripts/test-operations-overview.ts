import assert from 'node:assert/strict';
import { buildOperationsOverview } from '../lib/operations/overview';

function run() {
  const start = new Date(Date.UTC(2026, 1, 9, 12, 0, 0));
  const end = new Date(Date.UTC(2026, 1, 15, 12, 0, 0));

  const overview = buildOperationsOverview({
    services: [
      {
        tarih: new Date(Date.UTC(2026, 1, 10, 12, 0, 0)),
        tekneAdi: 'Tekne A',
        adres: 'Yatmarin',
        yer: 'YATMARİN',
        durum: 'RANDEVU_VERILDI',
      },
      {
        tarih: new Date(Date.UTC(2026, 1, 11, 12, 0, 0)),
        tekneAdi: 'Tekne B',
        adres: 'Bodrum',
        yer: 'Bodrum',
        durum: 'DEVAM_EDIYOR',
      },
      {
        tarih: null,
        tekneAdi: 'Tekne C',
        adres: 'Netsel',
        yer: 'Netsel Marina',
        durum: 'PARCA_BEKLIYOR',
      },
      {
        tarih: new Date(Date.UTC(2026, 1, 12, 12, 0, 0)),
        tekneAdi: 'Tekne D',
        adres: 'Yatmarin',
        yer: 'Yatmarin',
        durum: 'TAMAMLANDI',
      },
    ],
    activeTechnicianCount: 4,
    start,
    end,
  });

  assert.equal(overview.totals.openServices, 3);
  assert.equal(overview.totals.scheduledInRange, 2);
  assert.equal(overview.totals.externalInRange, 1);
  assert.equal(overview.totals.unscheduledOpen, 1);
  assert.equal(overview.capacity.weeklyCapacity, 20);
  assert.equal(overview.capacity.plannedInRange, 2);
  assert.ok(overview.externalDestinations.some((item) => item.destination === 'Bodrum'));
  assert.ok(overview.yatmarinByDay.some((item) => item.serviceCount > 0));

  console.log('PASS: operations overview calculations');
}

run();

