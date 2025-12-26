-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  "eventDate" TIMESTAMP WITH TIME ZONE,
  location TEXT,
  "qrCode" TEXT UNIQUE NOT NULL,
  "qrCodeExpiresAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "eventId" TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  "fullName" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  email TEXT,
  "ticketType" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "totalAmount" DECIMAL(10, 2) NOT NULL,
  "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
  "paymentReference" TEXT UNIQUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ticket_items table
CREATE TABLE IF NOT EXISTS ticket_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "ticketId" TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  dish TEXT NOT NULL,
  drink TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_qr_code ON events("qrCode");
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets("eventId");
CREATE INDEX IF NOT EXISTS idx_tickets_payment_status ON tickets("paymentStatus");
CREATE INDEX IF NOT EXISTS idx_tickets_payment_reference ON tickets("paymentReference");
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets("createdAt");
CREATE INDEX IF NOT EXISTS idx_ticket_items_ticket_id ON ticket_items("ticketId");

-- Create function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updatedAt
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

