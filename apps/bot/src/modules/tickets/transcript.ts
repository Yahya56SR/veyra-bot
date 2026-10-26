const MAX_TRANSCRIPT_BYTES = 1_000_000;

export interface TranscriptMessage {
  author: { tag: string };
  content: string;
  createdAt: Date;
  attachments: { name: string; url: string }[];
  embeds: { title?: string | null; description?: string | null }[];
}

export interface TranscriptMeta {
  ticketId: number;
  openedBy: string;
  category: string;
  openedAt: Date;
  closedBy: string;
  closedAt: Date;
  reason: string;
}

export interface TranscriptResult {
  html: string;
  truncated: boolean;
  messageCount: number;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds a self-contained, escaped HTML transcript. Raw message text is never
 * inserted as markup, so a member cannot inject scripts into a staff transcript.
 */
export function buildTranscriptHtml(
  messages: readonly TranscriptMessage[],
  meta: TranscriptMeta,
): TranscriptResult {
  const header = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ticket #${meta.ticketId}</title>
<style>
:root{color-scheme:dark}
body{margin:0;padding:2rem;background:#0f1117;color:#e5e7eb;font:15px/1.5 system-ui,sans-serif}
main{max-width:900px;margin:0 auto}
header{border-bottom:1px solid #2b3040;margin-bottom:1.5rem;padding-bottom:1rem}
h1{margin:0 0 .4rem;font-size:1.6rem}
.meta{color:#9ca3af;font-size:.9rem}
.msg{background:#171a23;border:1px solid #252a38;border-radius:10px;padding:.85rem 1rem;margin:.75rem 0}
.msg .who{color:#c4b5fd;font-weight:600}
.msg .when{color:#6b7280;font-size:.78rem;margin-left:.5rem}
.content{margin-top:.35rem;white-space:pre-wrap;overflow-wrap:anywhere}
.attachments{margin-top:.5rem;font-size:.88rem}
.embed{border-left:3px solid #8b5cf6;margin-top:.5rem;padding:.4rem .7rem;background:#11131a}
.embed h2{font-size:.95rem;margin:0 0 .2rem}
.embed p{margin:0;color:#cbd5e1;white-space:pre-wrap}
footer{margin-top:2rem;color:#6b7280;font-size:.8rem}
</style>
</head>
<body>
<main>
<header>
<h1>Ticket #${meta.ticketId}</h1>
<div class="meta">
Opened by ${escapeHtml(meta.openedBy)} · ${escapeHtml(meta.category)}<br>
Opened ${meta.openedAt.toISOString()} · Closed ${meta.closedAt.toISOString()}<br>
Closed by ${escapeHtml(meta.closedBy)} · Reason: ${escapeHtml(meta.reason)}
</div>
</header>
`;

  let html = header;
  let bytes = Buffer.byteLength(header, 'utf8');
  let truncated = false;
  let messageCount = 0;
  const footer = `</main>
<footer>Veyra ticket transcript · ${escapeHtml(meta.closedAt.toISOString())}</footer>
</body>
</html>
`;
  const footerBytes = Buffer.byteLength(footer, 'utf8');
  const truncatedNotice = '<p class="meta"><em>Transcript truncated at the 1 MB limit.</em></p>\n';

  for (const message of messages) {
    const attachments = message.attachments
      .map(
        (attachment) =>
          `<a href="${escapeHtml(attachment.url)}" rel="noreferrer">${escapeHtml(
            attachment.name,
          )}</a>`,
      )
      .join(' · ');

    const embeds = message.embeds
      .map(
        (embed) =>
          `<div class="embed">${embed.title ? `<h2>${escapeHtml(embed.title)}</h2>` : ''}${
            embed.description ? `<p>${escapeHtml(embed.description)}</p>` : ''
          }</div>`,
      )
      .join('');

    const block = `<div class="msg"><span class="who">${escapeHtml(
      message.author.tag,
    )}</span><span class="when">${message.createdAt.toISOString()}</span><div class="content">${escapeHtml(
      message.content,
    )}</div>${attachments ? `<div class="attachments">${attachments}</div>` : ''}${embeds}</div>
`;
    const blockBytes = Buffer.byteLength(block, 'utf8');

    if (bytes + blockBytes + footerBytes > MAX_TRANSCRIPT_BYTES) {
      truncated = true;
      break;
    }

    html += block;
    bytes += blockBytes;
    messageCount += 1;
  }

  if (truncated) {
    const noticeBytes = Buffer.byteLength(truncatedNotice, 'utf8');
    if (bytes + noticeBytes + footerBytes <= MAX_TRANSCRIPT_BYTES) {
      html += truncatedNotice;
      bytes += noticeBytes;
    }
  }

  html += footer;

  return { html, truncated, messageCount };
}

export { MAX_TRANSCRIPT_BYTES };
