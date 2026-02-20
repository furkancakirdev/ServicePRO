import assert from 'node:assert/strict';
import { buildSyncDateValidation } from '../lib/sync/utils/date-validation';

function run() {
  const result = buildSyncDateValidation({
    PLANLAMA: {
      metadata: {
        warnings: [
          'date_parse_failed:13/31/2026|row=abc',
          'date_fallback:invalid:abc|row=def',
          'status_fallback:UNKNOWN|row=xyz',
        ],
      },
    },
    PERSONEL: {
      metadata: {
        warnings: ['status_fallback:UNKNOWN|row=123'],
      },
    },
  });

  assert.equal(result.issuesFound, 1);
  assert.equal(result.details.length, 1);
  assert.equal(result.details[0].sheet, 'PLANLAMA');
  assert.equal(result.details[0].count, 2);

  console.log('PASS: sync metadata date validation');
}

run();

