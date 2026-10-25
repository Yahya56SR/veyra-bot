import { describe, expect, it } from 'vitest';
import { buildTranscriptHtml, escapeHtml, MAX_TRANSCRIPT_BYTES } from './transcript.js';

const META = {
  ticketId: 7,
  openedBy: 'opener#0001',
  category: 'General',
  openedAt: new Date('2026-01-01T00:00:00Z'),
  closedBy: 'closer#0002',
  closedAt: new Date('2026-01-02T00:00:00Z'),
  reason: 'Resolved',
};

describe('ticket transcripts', () => {
  it('escapes HTML in message content and metadata', () => {
    const result = buildTranscriptHtml(
      [
        {
          author: { tag: '<script>bad</script>' },
          content: '<img src=x onerror="alert(1)"> & "quotes" \'single\'',
          createdAt: new Date('2026-01-01T00:01:00Z'),
          attachments: [{ name: 'a&b.png', url: 'https://example.com/?a=1&b=2' }],
          embeds: [{ title: '<b>title</b>', description: 'line\nbreak' }],
        },
      ],
      META,
    );

    expect(result.html).not.toContain('<script>bad</script>');
    expect(result.html).not.toContain('<img src=x');
    expect(result.html).toContain('&lt;script&gt;bad&lt;/script&gt;');
    expect(result.html).toContain('&quot;quotes&quot;');
    expect(result.html).toContain('a&amp;b.png');
    expect(result.html).toContain('https://example.com/?a=1&amp;b=2');
    expect(result.html).toContain('&lt;b&gt;title&lt;/b&gt;');
    expect(result.truncated).toBe(false);
    expect(result.messageCount).toBe(1);
  });

  it('keeps the transcript under the size cap', () => {
    const message = {
      author: { tag: 'someone' },
      content: 'x'.repeat(50_000),
      createdAt: new Date('2026-01-01T00:01:00Z'),
      attachments: [],
      embeds: [],
    };

    const result = buildTranscriptHtml(
      Array.from({ length: 40 }, () => message),
      META,
    );

    expect(Buffer.byteLength(result.html, 'utf8')).toBeLessThanOrEqual(MAX_TRANSCRIPT_BYTES);
    expect(result.truncated).toBe(true);
    expect(result.messageCount).toBeLessThan(40);
  });

  it('handles empty transcripts', () => {
    const result = buildTranscriptHtml([], META);
    expect(result.messageCount).toBe(0);
    expect(result.truncated).toBe(false);
    expect(result.html).toContain('Ticket #7');
  });

  it('escapes standalone ampersands exactly once', () => {
    expect(escapeHtml('a & b < c')).toBe('a &amp; b &lt; c');
  });
});
