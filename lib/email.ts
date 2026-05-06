import type { AIOutput, DimensionScores, TierValue } from '@/types';
import { TIER_META, DIMENSION_META } from '@/types';

// Force IPv4 — VPS has broken IPv6 routing
const ipv4Fetch = (url: string, init: Record<string, unknown>) =>
  undiciFetch(url as Parameters<typeof undiciFetch>[0], {
    ...(init as Parameters<typeof undiciFetch>[1]),
    dispatcher: new Agent({ connect: { family: 4 } }),
  });

interface EmailInput {
  to:              string;
  founderName:     string;
  companyName:     string;
  finalScore:      number;
  tier:            TierValue;
  dimensionScores: DimensionScores;
  aiOutput:        AIOutput;
  pdfBuffer:       Uint8Array;
}

export async function sendReportEmail(input: EmailInput) {
  const { to, founderName, companyName, finalScore, tier, dimensionScores, aiOutput, pdfBuffer } = input;
  const tierMeta   = TIER_META[tier];
  const bookingUrl = process.env.NEXT_PUBLIC_BOOKING_URL ?? 'https://devmantra.com';
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL    ?? 'https://devmantra.com';

  const dimRows = (Object.entries(dimensionScores) as [keyof DimensionScores, number][])
    .map(([k, v]) => {
      const pct = Math.round(v * 10);
      return `
        <tr>
          <td style="padding:8px 0;color:#3A4556;font-size:14px;font-family:Arial,sans-serif;">${DIMENSION_META[k].label}</td>
          <td style="padding:8px 0 8px 16px;width:160px;">
            <div style="background:#E5E7EB;border-radius:4px;height:8px;">
              <div style="background:${tierMeta.color};border-radius:4px;height:8px;width:${pct}%;"></div>
            </div>
          </td>
          <td style="padding:8px 0 8px 12px;color:#1A1A2E;font-weight:600;font-size:14px;font-family:Arial,sans-serif;">${pct}/100</td>
        </tr>`;
    })
    .join('');

  const actionsHtml = aiOutput.top_3_actions
    .map((a, i) => `
      <div style="margin-bottom:20px;padding:20px;background:#F4F6FB;border-radius:8px;border-left:4px solid ${tierMeta.color};">
        <div style="color:#1A1A2E;font-weight:700;font-size:15px;font-family:Arial,sans-serif;margin-bottom:8px;">
          ${String(i + 1).padStart(2, '0')}. ${a.title}
        </div>
        <div style="color:#3A4556;font-size:14px;line-height:1.6;font-family:Arial,sans-serif;">${a.body}</div>
      </div>`)
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F6FB;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(6,12,24,0.08);">

    <div style="background:linear-gradient(140deg,#060C18 0%,#0D1E3D 50%,#1B3C6B 100%);padding:40px 40px 32px;">
      <div style="color:#00B4C8;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">Dev Mantra · Fundability Index</div>
      <div style="color:#ffffff;font-size:26px;font-weight:800;margin-bottom:8px;">Hi ${founderName} 👋</div>
      <div style="color:rgba(255,255,255,0.7);font-size:15px;">Your Fundability Report for <strong style="color:#fff;">${companyName}</strong> is ready.</div>
    </div>

    <div style="padding:32px 40px;border-bottom:1px solid #E5E7EB;">
      <table style="width:100%;border-collapse:collapse;"><tr>
        <td style="vertical-align:middle;padding-right:24px;width:100px;">
          <div style="font-size:64px;font-weight:900;color:${tierMeta.color};line-height:1;">${finalScore}</div>
          <div style="font-size:16px;color:#7B8494;">/100</div>
        </td>
        <td style="vertical-align:middle;">
          <div style="display:inline-block;background:${tierMeta.bg};color:${tierMeta.color};font-size:13px;font-weight:700;padding:6px 14px;border-radius:100px;margin-bottom:8px;">${tierMeta.label}</div>
          <div style="color:#3A4556;font-size:14px;margin-top:6px;">Your full PDF report is attached.</div>
        </td>
      </tr></table>
    </div>

    <div style="padding:28px 40px;border-bottom:1px solid #E5E7EB;">
      <div style="color:#1A1A2E;font-size:16px;font-weight:700;margin-bottom:16px;">Dimension Breakdown</div>
      <table style="width:100%;border-collapse:collapse;">${dimRows}</table>
    </div>

    <div style="padding:28px 40px;border-bottom:1px solid #E5E7EB;">
      <div style="color:#1A1A2E;font-size:16px;font-weight:700;margin-bottom:12px;">Executive Verdict</div>
      <div style="color:#3A4556;font-size:14px;line-height:1.7;">${aiOutput.executive_verdict.replace(/\n/g, '<br>')}</div>
    </div>

    <div style="padding:28px 40px;border-bottom:1px solid #E5E7EB;">
      <div style="color:#1A1A2E;font-size:16px;font-weight:700;margin-bottom:16px;">Your 3-Point Action Plan</div>
      ${actionsHtml}
    </div>

    <div style="padding:32px 40px;text-align:center;">
      <div style="color:#1A1A2E;font-size:18px;font-weight:700;margin-bottom:8px;">Ready to close the gaps?</div>
      <div style="color:#7B8494;font-size:14px;margin-bottom:24px;">Book a free 30-minute strategy call with Dev Mantra's advisory team.</div>
      <a href="${bookingUrl}" style="display:inline-block;background:#00B4C8;color:#060C18;font-weight:700;font-size:16px;padding:16px 36px;border-radius:10px;text-decoration:none;">Book Free Consultation →</a>
    </div>

    <div style="background:#F4F6FB;padding:24px 40px;text-align:center;border-top:1px solid #E5E7EB;">
      <div style="color:#7B8494;font-size:11px;line-height:1.6;">
        Prepared by Dev Mantra Financial Services · N. Tatia &amp; Associates<br>
        20+ years of advisory · Rs.5,000 Cr+ in transactions · <a href="${appUrl}" style="color:#4A73C4;">devmantra.com</a>
      </div>
    </div>

  </div>
</body>
</html>`;

  const attachment = pdfBuffer.length > 0
    ? [{ name: `${companyName.replace(/\s+/g, '-')}-Fundability-Report.pdf`, content: Buffer.from(pdfBuffer).toString('base64') }]
    : [];

  const res = await ipv4Fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept':       'application/json',
      'api-key':      process.env.BREVO_API_KEY ?? '',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender:      { name: process.env.BREVO_FROM_NAME ?? 'Dev Mantra', email: process.env.BREVO_FROM_EMAIL },
      replyTo:     process.env.BREVO_REPLY_TO ? { email: process.env.BREVO_REPLY_TO } : undefined,
      to:          [{ email: to }],
      subject:     `Your Fundability Score is ${finalScore}/100 - ${tierMeta.label}`,
      htmlContent: html,
      attachment,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo API ${res.status}: ${body}`);
  }
}
