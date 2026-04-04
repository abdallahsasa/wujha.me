
-- Clean up all existing INSERT policies on tickets
DROP POLICY IF EXISTS "Admins can insert tickets" ON tickets;
DROP POLICY IF EXISTS "Authenticated users can insert tickets" ON tickets;
DROP POLICY IF EXISTS "Public can insert tickets" ON tickets;
DROP POLICY IF EXISTS "Organizers can insert own event tickets" ON tickets;
DROP POLICY IF EXISTS "Anyone can create tickets" ON tickets;

-- Clean up existing SELECT policies
DROP POLICY IF EXISTS "Anyone can read own tickets" ON tickets;
DROP POLICY IF EXISTS "Users can read own tickets" ON tickets;
DROP POLICY IF EXISTS "Scanners can read tickets" ON tickets;
DROP POLICY IF EXISTS "Organizers can read own event tickets" ON tickets;
DROP POLICY IF EXISTS "Anyone can read tickets" ON tickets;

-- Clean up existing UPDATE policies
DROP POLICY IF EXISTS "Admins can update tickets" ON tickets;
DROP POLICY IF EXISTS "Scanners can update tickets for check-in" ON tickets;
DROP POLICY IF EXISTS "Organizers can update own event tickets" ON tickets;

-- Clean up existing DELETE policies
DROP POLICY IF EXISTS "Admins can delete tickets" ON tickets;

-- Create simple open policies
CREATE POLICY "Anyone can create tickets" ON tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read tickets" ON tickets FOR SELECT USING (true);
CREATE POLICY "Anyone can update tickets" ON tickets FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tickets" ON tickets FOR DELETE USING (true);
