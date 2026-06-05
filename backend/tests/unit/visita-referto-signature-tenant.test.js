import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@jest/globals';

const serviceSource = readFileSync(new URL('../../services/clinical/VisitaRefertoService.js', import.meta.url), 'utf8');

function extractFindFirstBlocks(source) {
  const marker = 'prisma.firmaDigitale.findFirst({';
  const blocks = [];
  let index = source.indexOf(marker);
  while (index !== -1) {
    let cursor = index + marker.length;
    let depth = 1;
    while (cursor < source.length && depth > 0) {
      const char = source[cursor];
      if (char === '{') depth += 1;
      if (char === '}') depth -= 1;
      cursor += 1;
    }
    blocks.push(source.slice(index, cursor));
    index = source.indexOf(marker, cursor);
  }
  return blocks;
}

describe('VisitaRefertoService signature tenant isolation', () => {
  test('does not use cross-tenant signature fallback queries', () => {
    expect(serviceSource).not.toMatch(/CROSS-TENANT|cross-tenant/i);
  });

  test('all firmaDigitale.findFirst signature lookups are tenant scoped', () => {
    const blocks = extractFindFirstBlocks(serviceSource);

    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block).toContain('tenantId');
    }
  });
});
