# Sweetwater Grill Scheduler

Mobile-first restaurant employee scheduling app built with React, Tailwind CSS, and Supabase.

## Run locally

```bash
npm install
npm run dev
```

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Restart `npm run dev`.
6. Add at least one manager row to the `employees` table.

## Employee invite emails

Employee invite emails are sent through the Supabase Edge Function in `supabase/functions/send-employee-invite`.

Configure these Supabase function secrets:

```bash
supabase secrets set RESEND_API_KEY=your-resend-api-key
supabase secrets set FROM_EMAIL="Sweetwater Grill Scheduler <schedule@yourdomain.com>"
```

Deploy the function:

```bash
supabase functions deploy send-employee-invite
```

When a manager adds an employee or resets their code, the app emails that employee a temporary first-time code and asks them to create a password.

The included schema creates:

- `employees`
- `shifts`
- `time_off_requests`
- `coverage_requests`
- `notifications`

The UI includes the required manager approval behavior: time-off and coverage requests remain pending until the manager approves or denies them. Coverage only reassigns a shift after another employee accepts and the manager approves.
