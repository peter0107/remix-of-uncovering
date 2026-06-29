type SendEmailInput = {
  to: string[];
  subject: string;
  html: string;
  text?: string;
};

function getResendApiKey() {
  return process.env.RESEND_API_KEY?.trim() || "";
}

function getFromEmail() {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    "Beginner <no-reply@beginner.today>"
  );
}

export async function sendResendEmail(input: SendEmailInput) {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY is missing. Skipping email send.");
    return { ok: false as const, skipped: true as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getFromEmail(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend send failed: ${response.status} ${body}`);
  }

  return { ok: true as const, skipped: false as const };
}
