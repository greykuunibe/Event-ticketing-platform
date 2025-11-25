# Church Event Ticketing System

A lightweight full-stack ticketing system built with Next.js, featuring Paystack payment integration, ticket generation, and admin dashboard.

## Features

- 🎫 **Multi-ticket Support**: Handle single and couple tickets with individual dish/drink selections
- 💳 **Secure Payments**: Paystack integration for secure payment processing
- 📧 **Email Confirmation**: Automatic email delivery of tickets after successful payment
- 📥 **PNG Download**: Download tickets as PNG images
- 👨‍💼 **Admin Dashboard**: View and manage all reservations with statistics
- 📱 **Responsive Design**: Mobile-friendly booking experience

## Tech Stack

- **Next.js 14+** (App Router) with TypeScript
- **Supabase** for PostgreSQL database
- **Tailwind CSS** for styling
- **Phosphor Icons** for icons
- **Paystack** for payments
- **Resend** for email delivery
- **html-to-image** for PNG ticket generation

## Prerequisites

- Node.js 18+ installed
- Supabase account (free tier available)
- Paystack account with API keys
- Resend account with API key

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase Database

1. Create a project at [supabase.com](https://supabase.com)
2. Get your credentials from Settings → API:
   - Project URL
   - Service Role Key
3. Run the SQL schema:
   - Go to SQL Editor in Supabase dashboard
   - Copy and run the contents of `supabase/schema.sql`

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Paystack
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...

# Resend
RESEND_API_KEY=re_...

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Admin (optional - change this!)
ADMIN_SECRET=admin-secret-change-me
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
/app
  /api
    /tickets          # Ticket CRUD operations
    /paystack         # Payment initialization and webhooks
    /admin            # Admin endpoints
  /tickets
    /new              # Booking flow
    /success/[id]     # Success page with ticket
  /admin
    /dashboard        # Admin dashboard
/components
  /booking            # Booking flow components
  /ticket             # Ticket display components
  /admin              # Admin components
/lib
  supabase.ts         # Supabase client
  paystack.ts         # Paystack utilities
  email.ts            # Email utilities
  ticket-generator.ts # PNG generation
  constants.ts        # App constants
/supabase
  schema.sql          # Database schema
```

## Ticket Types

- **Regular Single**: GHS 120 (1 ticket)
- **Regular Couple**: GHS 240 (2 tickets)
- **VIP Couple**: GHS 300 (2 tickets)

## Dishes Available

1. Plain rice with chicken
2. Jollof rice with chicken
3. Fried rice with chicken
4. Loaded Fries with chicken
5. Plain rice with fish
6. Jollof rice with fish
7. Fried rice with fish

## Drinks Available

- Shandy
- Club
- Star
- Gulda
- Origin
- Malt (can and bottle)
- ABC
- Smirnoff (can and bottle)
- Eagle
- Vitamilk

## Payment Flow

1. User fills personal information
2. User selects ticket type
3. User selects dish and drink for each ticket
4. System creates ticket record
5. User is redirected to Paystack payment page
6. After successful payment, Paystack webhook updates ticket status
7. User receives email confirmation (if email provided)
8. User can download ticket as PNG

## Admin Dashboard

Access the admin dashboard at `/admin/dashboard`. You'll need to enter the admin secret (set in `ADMIN_SECRET` environment variable).

Features:
- View all tickets
- Filter by payment status
- Search tickets
- View statistics (total tickets, revenue, etc.)
- View detailed ticket information

## Paystack Webhook Setup

To receive payment confirmations, set up a webhook in your Paystack dashboard:

1. Go to Settings > Webhooks in Paystack dashboard
2. Add webhook URL: `https://yourdomain.com/api/paystack/webhook`
3. Select events: `charge.success`

## Email Configuration

The system uses Resend for email delivery. Make sure to:

1. Sign up for a Resend account
2. Verify your domain (or use the default `onboarding@resend.dev` for testing)
3. Add your API key to `.env`

## Production Deployment

### Recommended: Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Database Options

- **Supabase**: Free PostgreSQL database (recommended for beginners)
- **Railway**: Easy PostgreSQL hosting
- **Neon**: Serverless PostgreSQL

## Troubleshooting

### Database Connection Issues

- Verify your Supabase credentials in `.env`
- Check that tables are created (run `supabase/schema.sql` in SQL Editor)
- Ensure you're using the Service Role Key (not anon key)

### Payment Issues

- Verify Paystack keys are correct
- Check webhook URL is accessible
- Ensure webhook events are configured in Paystack dashboard

### Email Not Sending

- Verify Resend API key
- Check email domain is verified (if using custom domain)
- Check server logs for errors

## License

MIT

## Support

For issues or questions, please open an issue on the repository.
