import { Resend } from 'resend';

export const isEmailConfigured = () => Boolean(process.env.RESEND_API_KEY);
/** In local development without Resend, codes are logged and returned to the app instead of emailed. */
export const devCodesEnabled = () => !isEmailConfigured() && process.env.NODE_ENV !== 'production';

export async function sendLoginCode(email: string, code: string): Promise<void> {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV === 'production') throw new Error('RESEND_API_KEY is not set, so sign-in codes cannot be sent.');
    console.log(`[dev] Sign-in code for ${email}: ${code}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'English Coach <onboarding@resend.dev>',
    to: email,
    subject: `${code} is your English Coach code`,
    text: `Your sign-in code is ${code}.\n\nIt expires in 10 minutes. If you did not ask for it, you can ignore this email.`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:16px;color:#15213A">
      <p>Your sign-in code is</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:8px 0">${code}</p>
      <p style="color:#5A6579">It expires in 10 minutes. If you did not ask for it, you can ignore this email.</p>
    </div>`,
  });
  if (error) throw new Error(`Resend could not send the email: ${error.message}`);
}
