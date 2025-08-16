import { transport } from "../Config/nodemailer";

const { FRONTEND_URL } = process.env;

type EmailTypes = {
  name: string;
  email: string;
  token: string;
};

export const sendConfirmationEmail = async (user: EmailTypes) => {
  const email = await transport.sendMail({
    from: "Royal Padel <admin@royal-padel.com.mx>",
    to: user.email,
    subject: "Royal Padel - Confirma tu cuenta",
    html: `
      <!doctype html>
      <html lang="es" style="margin:0;padding:0;">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Royal Padel – Confirmación de cuenta</title>
          <style>
            /* Soporte básico de dark mode */
            @media (prefers-color-scheme: dark) {
              .bg { background-color: #0b1220 !important; }
              .card { background-color: #0f172a !important; color:#e5e7eb !important; }
              .muted { color:#94a3b8 !important; }
              .btn { color:#0b1220 !important; }
            }
          </style>
        </head>
        <body class="bg" style="margin:0;padding:0;background:#f6f9fc;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f9fc;">
            <tr>
              <td align="center" style="padding:32px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">
                  <tr>
                    <td class="card" style="background:#ffffff;border-radius:16px;box-shadow:0 10px 30px rgba(2,6,23,.08);overflow:hidden;">
                      <!-- Header -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:28px 28px 0 28px;">
                            <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#64748b;text-transform:uppercase;letter-spacing:.12em;">Royal Padel</div>
                            <h1 style="margin:6px 0 0 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-weight:700;font-size:22px;line-height:1.3;color:#0f172a;">Confirma tu cuenta</h1>
                          </td>
                        </tr>
                      </table>

                      <!-- Body -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:20px 28px 0 28px;">
                            <p style="margin:0 0 12px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#334155;">
                              Hola <strong>${user.name}</strong>,
                            </p>
                            <p style="margin:0 0 16px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#475569;">
                              Para activar tu cuenta vinculada a <strong>${user.email}</strong>, ingresa el siguiente código de verificación de 6 dígitos en la página de confirmación.
                            </p>
                          </td>
                        </tr>

                        <!-- Code -->
                        <tr>
                          <td align="center" style="padding:6px 28px 4px 28px;">
                            <div style="display:inline-block;background:#0ea5e91a;border:1px solid #0ea5e94d;border-radius:12px;padding:16px 22px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:700;font-size:28px;letter-spacing:.18em;color:#0f172a;">
                              ${user.token}
                            </div>
                          </td>
                        </tr>

                        <!-- Button -->
                        <tr>
                          <td align="center" style="padding:18px 28px 0 28px;">
                            <a href="${FRONTEND_URL}/auth/confirm-account?email=${user.email}" class="btn" style="display:inline-block;text-decoration:none;background:#0ea5e9;border-radius:10px;padding:12px 20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-weight:600;font-size:15px;color:#ffffff;">
                              Ir a confirmar mi cuenta
                            </a>
                          </td>
                        </tr>

                        <!-- Fallback link -->
                        <tr>
                          <td style="padding:14px 28px 0 28px;">
                            <p class="muted" style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#64748b;">
                              Si el botón no funciona, copia y pega este enlace en tu navegador:
                            </p>
                            <p style="margin:6px 0 0 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#0ea5e9;word-break:break-all;">
                              <a href="${FRONTEND_URL}/auth/confirm-account?email=${user.email}" style="color:#0ea5e9;text-decoration:underline;">${FRONTEND_URL}/auth/confirm-account?email=${user.email}</a>
                            </p>
                          </td>
                        </tr>

                        <!-- Help -->
                        <tr>
                          <td style="padding:18px 28px 28px 28px;">
                            <p class="muted" style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#64748b;">
                              Este código expira en 10 minutos. Si no solicitaste este correo, puedes ignorarlo con seguridad.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- Footer -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;">
                        <tr>
                          <td style="padding:16px 28px;">
                            <p class="muted" style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#94a3b8;">
                              © ${new Date().getFullYear()} Royal Padel · Tuxpan, Veracruz
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
      `,
  });
};

export const sendPassworsResetToken = async (user: EmailTypes) => {
  const email = await transport.sendMail({
    from: "Royal Padel <admin@royal-padel.com.mx>",
    to: user.email,
    subject: "Royal Padel - Reestablece tu contraseña",
    html: `
      <!doctype html>
      <html lang="es" style="margin:0;padding:0;">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Royal Padel – Restablecer contraseña</title>
          <style>
            /* Soporte básico de dark mode */
            @media (prefers-color-scheme: dark) {
              .bg { background-color: #0b1220 !important; }
              .card { background-color: #0f172a !important; color:#e5e7eb !important; }
              .muted { color:#94a3b8 !important; }
              .btn { color:#0b1220 !important; }
            }
          </style>
        </head>
        <body class="bg" style="margin:0;padding:0;background:#f6f9fc;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f9fc;">
            <tr>
              <td align="center" style="padding:32px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">
                  <tr>
                    <td class="card" style="background:#ffffff;border-radius:16px;box-shadow:0 10px 30px rgba(2,6,23,.08);overflow:hidden;">
                      <!-- Header -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:28px 28px 0 28px;">
                            <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#64748b;text-transform:uppercase;letter-spacing:.12em;">Royal Padel</div>
                            <h1 style="margin:6px 0 0 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-weight:700;font-size:22px;line-height:1.3;color:#0f172a;">Restablece tu contraseña</h1>
                          </td>
                        </tr>
                      </table>

                      <!-- Body -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:20px 28px 0 28px;">
                            <p style="margin:0 0 12px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#334155;">
                              Hola <strong>${user.name}</strong>,
                            </p>
                            <p style="margin:0 0 16px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#475569;">
                              Recibimos una solicitud para restablecer la contraseña de la cuenta asociada a <strong>${user.email}</strong>. Ingresa el siguiente código de 6 dígitos en la página de restablecimiento.
                            </p>
                          </td>
                        </tr>

                        <!-- Code -->
                        <tr>
                          <td align="center" style="padding:6px 28px 4px 28px;">
                            <div style="display:inline-block;background:#0ea5e91a;border:1px solid #0ea5e94d;border-radius:12px;padding:16px 22px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:700;font-size:28px;letter-spacing:.18em;color:#0f172a;">
                              ${user.token}
                            </div>
                          </td>
                        </tr>

                        <!-- Button -->
                        <tr>
                          <td align="center" style="padding:18px 28px 0 28px;">
                            <a href="${FRONTEND_URL}/auth/reset-password?email=${user.email}" class="btn" style="display:inline-block;text-decoration:none;background:#0ea5e9;border-radius:10px;padding:12px 20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-weight:600;font-size:15px;color:#ffffff;">
                              Ir a restablecer contraseña
                            </a>
                          </td>
                        </tr>

                        <!-- Fallback link -->
                        <tr>
                          <td style="padding:14px 28px 0 28px;">
                            <p class="muted" style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#64748b;">
                              Si el botón no funciona, copia y pega este enlace en tu navegador:
                            </p>
                            <p style="margin:6px 0 0 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#0ea5e9;word-break:break-all;">
                              <a href="${FRONTEND_URL}/auth/reset-password?email=${user.email}" style="color:#0ea5e9;text-decoration:underline;">${FRONTEND_URL}/auth/reset-password?email=${user.email}</a>
                            </p>
                          </td>
                        </tr>

                        <!-- Help -->
                        <tr>
                          <td style="padding:18px 28px 28px 28px;">
                            <p class="muted" style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#64748b;">
                              Este código expira en 10 minutos. Si no solicitaste este cambio, puedes ignorar este correo.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- Footer -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;">
                        <tr>
                          <td style="padding:16px 28px;">
                            <p class="muted" style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#94a3b8;">
                              © ${new Date().getFullYear()} Royal Padel · Tuxpan, Veracruz
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
      `,
  });
};
