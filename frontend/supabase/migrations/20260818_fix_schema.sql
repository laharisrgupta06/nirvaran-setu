-- Nirvaran Setu Database Migration
-- Fixes schema mismatches for grievances and profiles tables

-- 1. Ensure grievances table has all required fields
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC;
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS proposed_solution TEXT;
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS evidence JSONB;
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS citizen_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS citizen_feedback TEXT;
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS department_reviewed_at TIMESTAMPTZ;
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS solution_proposed_at TIMESTAMPTZ;
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS action_started_at TIMESTAMPTZ;
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMPTZ;
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Ensure profiles table has all required fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Trigger to auto-create profile on auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    'citizen'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Setup Row Level Security (RLS) policies
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for grievances
DROP POLICY IF EXISTS "Citizens can insert their own grievances" ON grievances;
CREATE POLICY "Citizens can insert their own grievances"
  ON grievances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view relevant grievances" ON grievances;
CREATE POLICY "Users can view relevant grievances"
  ON grievances FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can update grievances" ON grievances;
CREATE POLICY "Admins can update grievances"
  ON grievances FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Citizens can update verification on their grievances" ON grievances;
CREATE POLICY "Citizens can update verification on their grievances"
  ON grievances FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
CREATE POLICY "Users can view profiles"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_grievances_user_id ON public.grievances(user_id);
CREATE INDEX IF NOT EXISTS idx_grievances_ticket_id ON public.grievances(ticket_id);
CREATE INDEX IF NOT EXISTS idx_grievances_status ON public.grievances(status);
