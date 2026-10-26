import { describe, expect, it } from 'vitest';
import { parsePanelEntries } from './reactionrole.js';

describe('reaction role panel parsing', () => {
  it('parses label=roleId pairs', () => {
    expect(parsePanelEntries('Gamer=123456789012345678 | Artist=234567890123456789')).toEqual([
      { label: 'Gamer', roleId: '123456789012345678' },
      { label: 'Artist', roleId: '234567890123456789' },
    ]);
  });

  it('accepts bare role IDs and mentions', () => {
    expect(parsePanelEntries('123456789012345678|<@&234567890123456789>')).toEqual([
      { label: '123456789012345678', roleId: '123456789012345678' },
      { label: '234567890123456789', roleId: '234567890123456789' },
    ]);
  });

  it('ignores malformed entries', () => {
    expect(parsePanelEntries('nope=abc | | 42')).toEqual([]);
  });
});
