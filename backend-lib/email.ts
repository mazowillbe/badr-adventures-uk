// Email helpers. Primary transport: Resend. Fallback: persist to
// `contact_messages` so the admin can read it in the dashboard.
const RESEND_URL = "https://api.resend.com/emails";

export function adminEmail(): string {
  return process.env.ADMIN_EMAIL || "jefferygo0o@gmail.com";
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function resendFromAddress(): string {
  return process.env.EMAIL_FROM || "Badr Adventures <onboarding@resend.dev>";
}

async function sendViaResend(input: {
  subject: string;
  body: string;
  fromName: string;
  replyTo?: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFromAddress(),
      to: [adminEmail()],
      subject: input.subject,
      text: input.body,
      reply_to: input.replyTo,
    }),
  });
  if (!res.ok) {
    console.error("[email] Resend failed", res.status, await res.text());
    return false;
  }
  return true;
}

export async function sendContactEmail(input: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<{ delivered: boolean; transport: "resend" | "stored" }> {
  const subject = input.subject?.trim() || `New contact form message from ${input.name}`;
  const body = [
    `From: ${input.name} <${input.email}>`,
    `Subject: ${subject}`,
    "",
    input.message,
    "",
    "— Sent from the Badr Adventures website contact form.",
  ].join("\n");

  if (isResendConfigured()) {
    const ok = await sendViaResend({
      subject,
      body,
      fromName: "Badr Adventures Contact",
      replyTo: input.email,
    });
    if (ok) return { delivered: true, transport: "resend" };
  }
  return { delivered: false, transport: "stored" };
}
