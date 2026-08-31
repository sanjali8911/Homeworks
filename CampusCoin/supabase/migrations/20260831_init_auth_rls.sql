-- ==============================================================================
-- CampusCoin V8.0 Database Migration: Per-User UUID Schema & Row Level Security (RLS)
-- ==============================================================================

-- 1. Drop existing legacy table if it was created with TEXT id
DROP TABLE IF EXISTS public.campuscoin_state CASCADE;

-- 2. Create the campuscoin_state table with id as UUID bound to auth.users
CREATE TABLE public.campuscoin_state (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Grant table permissions to authenticated, anon, and service_role
GRANT ALL ON TABLE public.campuscoin_state TO authenticated;
GRANT ALL ON TABLE public.campuscoin_state TO service_role;
GRANT ALL ON TABLE public.campuscoin_state TO anon;

-- 4. Enable Row Level Security (RLS) on campuscoin_state
ALTER TABLE public.campuscoin_state ENABLE ROW LEVEL SECURITY;

-- 5. Drop any old policies if they exist
DROP POLICY IF EXISTS "Users can manage own campuscoin_state" ON public.campuscoin_state;
DROP POLICY IF EXISTS "Users can access and manage their own state" ON public.campuscoin_state;

-- 6. Create secure RLS Policy: Authenticated users can only manage their own record
CREATE POLICY "Users can manage own campuscoin_state"
ON public.campuscoin_state
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 7. Enable Realtime broadcasting for live multi-device syncing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'campuscoin_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campuscoin_state;
  END IF;
END $$;

-- 8. Trigger to automatically update updated_at on state modifications
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.campuscoin_state;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.campuscoin_state
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
