const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'Sweetwater Grill Scheduler <onboarding@resend.dev>';

    if (!resendApiKey) {
      return json({ error: 'RESEND_API_KEY is not configured.' }, 500);
    }

    const { email, name, loginCode, appUrl } = await request.json();

    if (!email || !name || !loginCode || !appUrl) {
      return json({ error: 'Missing email, name, loginCode, or appUrl.' }, 400);
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: 'Your Sweetwater Grill Scheduler invite',
        html: `
          <div style="font-family: Arial, sans-serif; color: #14201f; line-height: 1.5;">
            <h1>Sweetwater Grill Scheduler</h1>
            <p>Hi ${escapeHtml(name)},</p>
            <p>You have been added to the Sweetwater Grill employee scheduler.</p>
            <p>Use this temporary first-time code to sign in:</p>
            <p style="font-size: 22px; font-weight: 700; letter-spacing: 1px;">${escapeHtml(loginCode)}</p>
            <p>Open the scheduler here:</p>
            <p><a href="${escapeHtml(appUrl)}">${escapeHtml(appUrl)}</a></p>
            <p>After you enter the code, you will be asked to create your own password.</p>
          </div>
        `,
        text: `Hi ${name},\n\nYou have been added to the Sweetwater Grill employee scheduler.\n\nTemporary first-time code: ${loginCode}\n\nOpen: ${appUrl}\n\nAfter you enter the code, you will be asked to create your own password.`,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      return json({ error: 'Email provider rejected the request.', details }, response.status);
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message || 'Invite email failed.' }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function escapeHtml(value: string) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
