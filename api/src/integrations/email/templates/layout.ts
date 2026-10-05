/**
 * Minimal shared HTML shell for transactional auth emails. Deliberately simple
 * (inline styles, no external assets) for maximum email-client compatibility —
 * matching the brand palette from design/06-Design-System.md (§2) without
 * depending on that phase's web fonts/assets, which email clients can't reliably load.
 */
export function emailLayout(options: { title: string; bodyHtml: string }): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${options.title}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#F7F8F6; font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F8F6; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF; border-radius:12px; overflow:hidden; max-width:480px; width:100%;">
            <tr>
              <td style="background-color:#1B6B3F; padding:24px 32px;">
                <span style="color:#FFFFFF; font-size:18px; font-weight:600;">Sai Yadadri Seva Ashram</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${options.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px; background-color:#F7F8F6; color:#6B7269; font-size:12px;">
                Sai Yadadri Seva Ashram &middot; Regd. No. 423/2019 &middot; Hyderabad, Telangana
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block; background-color:#1B6B3F; color:#FFFFFF; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600; margin-top:16px;">${label}</a>`;
}
