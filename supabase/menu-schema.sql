-- Create dishes table
CREATE TABLE IF NOT EXISTS dishes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create drinks table
CREATE TABLE IF NOT EXISTS drinks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ticket_types table
CREATE TABLE IF NOT EXISTS ticket_types (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  price DECIMAL(10, 2) NOT NULL,
  "peoplePerTicket" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create triggers for updatedAt
CREATE TRIGGER update_dishes_updated_at BEFORE UPDATE ON dishes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drinks_updated_at BEFORE UPDATE ON drinks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_types_updated_at BEFORE UPDATE ON ticket_types
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default data (optional - you can remove this and add via admin)
INSERT INTO dishes (name) VALUES
  ('Plain rice with chicken'),
  ('Jollof rice with chicken'),
  ('Fried rice with chicken'),
  ('Loaded Fries with chicken'),
  ('Plain rice with fish'),
  ('Jollof rice with fish'),
  ('Fried rice with fish')
ON CONFLICT (name) DO NOTHING;

INSERT INTO drinks (name) VALUES
  ('Shandy'),
  ('Club'),
  ('Star'),
  ('Gulda'),
  ('Origin'),
  ('Malt (can and bottle)'),
  ('ABC'),
  ('Smirnoff (can and bottle)'),
  ('Eagle'),
  ('Vitamilk')
ON CONFLICT (name) DO NOTHING;

INSERT INTO ticket_types (name, price, "peoplePerTicket") VALUES
  ('Regular Single', 120, 1),
  ('Regular Couple', 240, 2),
  ('VIP Couple', 300, 2)
ON CONFLICT (name) DO NOTHING;