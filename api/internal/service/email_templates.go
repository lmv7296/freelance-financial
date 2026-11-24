package service

import (
	"fmt"
	"html"
)

// BuildVerificationEmailHTML generates a modern, responsive HTML email template for account verification.
func BuildVerificationEmailHTML(link string) string {
	escapedLink := html.EscapeString(link)

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifieer je e-mailadres</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #f1f5f9; text-align: left;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: #2563eb; width: 36px; height: 36px; border-radius: 8px; text-align: center; vertical-align: middle;">
                    <span style="color: #ffffff; font-weight: bold; font-size: 20px; line-height: 36px;">F</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px;">FreelanceFin</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; letter-spacing: -0.3px;">
                Bevestig je e-mailadres
              </h1>
              
              <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 24px 0;">
                Bedankt voor je aanmelding bij FreelanceFin! Klik op de onderstaande knop om je e-mailadres te verifiëren en je profiel te voltooien.
              </p>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #2563eb;">
                    <a href="%s" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px; background-color: #2563eb;">
                      E-mailadres verifiëren &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security notice -->
              <div style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 14px 16px; margin: 24px 0 16px 0;">
                <p style="font-size: 13px; line-height: 20px; color: #64748b; margin: 0;">
                  🔒 <strong>Veiligheidstip:</strong> Deze verificatielink is 24 uur geldig. Heb je zelf geen account aangemaakt bij FreelanceFin? Dan kun je deze e-mail veilig negeren.
                </p>
              </div>

              <!-- Fallback Link -->
              <p style="font-size: 13px; line-height: 20px; color: #94a3b8; margin: 24px 0 0 0;">
                Werkt de knop niet? Kopieer en plak deze link in je browser:<br>
                <a href="%s" style="color: #2563eb; word-break: break-all; text-decoration: underline;">%s</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 18px;">
                &copy; 2026 FreelanceFin. Alle rechten voorbehouden.<br>
                De complete financiële cockpit voor Nederlandse freelancers &amp; zzp'ers.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, escapedLink, escapedLink, escapedLink)
}

// BuildVerificationEmailText generates plaintext fallback for verification emails.
func BuildVerificationEmailText(link string) string {
	return fmt.Sprintf(`Hallo,

Bedankt voor je aanmelding bij FreelanceFin!

Klik op de onderstaande link om je e-mailadres te verifiëren en direct toegang te krijgen:
%s

Deze verificatielink is 24 uur geldig.
Heb je geen account aangemaakt? Dan kun je dit bericht veilig negeren.

Met vriendelijke groet,
Het FreelanceFin Team
https://freelancefin.nl
`, link)
}

