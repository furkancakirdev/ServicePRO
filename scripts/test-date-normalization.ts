import assert from 'node:assert/strict';
import { parseDateOnlyToUtcDate } from '../lib/date-utils';
import { parseSmartDateToUtcDate } from '../lib/sync/utils/smart-date-parser';
import { mapSheetStatusToDbStatus } from '../lib/sync/utils/status-mapper';
import { getLokasyonGroupFromFields, normalizeServisDurumuForApp } from '../lib/domain-mappers';

function run() {
  const serial = parseSmartDateToUtcDate('45800');
  assert.ok(serial.date, 'Excel serial must be parsed');
  assert.equal(serial.source, 'excel_serial');

  const serialWithApostrophe = parseSmartDateToUtcDate("'45800'");
  assert.ok(serialWithApostrophe.date, 'Excel serial with apostrophe must be parsed');
  assert.equal(serialWithApostrophe.source, 'excel_serial');

  const dotDate = parseSmartDateToUtcDate('14.02.2026');
  assert.ok(dotDate.date, 'dd.mm.yyyy date must be parsed');

  const slashDate = parseDateOnlyToUtcDate('14/02/2026');
  assert.ok(slashDate, 'dd/mm/yyyy date must be parsed in date-utils');

  const statusMapped = mapSheetStatusToDbStatus('Devam Ediyor');
  assert.equal(normalizeServisDurumuForApp(statusMapped.status), 'DEVAM_EDIYOR');

  assert.equal(getLokasyonGroupFromFields('YATMARIN', null), 'YATMARIN');
  assert.equal(getLokasyonGroupFromFields('Netsel Marina', null), 'NETSEL');
  assert.equal(getLokasyonGroupFromFields('Gocek', null), 'DIS_SERVIS');

  console.log('PASS: date + status + location normalization');
}

run();
