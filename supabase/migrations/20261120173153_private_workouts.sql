BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE public.workouts (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise text NOT NULL CHECK (char_length(exercise) BETWEEN 1 AND 120 AND exercise = btrim(exercise)),
  weight numeric(7,2) NOT NULL CHECK (weight BETWEEN 0 AND 10000),
  reps integer NOT NULL CHECK (reps BETWEEN 1 AND 1000),
  sets integer NOT NULL CHECK (sets BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  client_request_id uuid NOT NULL,
  CONSTRAINT workouts_request_unique UNIQUE (user_id, client_request_id)
);
CREATE INDEX workouts_owner_recent ON public.workouts(user_id, id DESC);
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.workouts FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.workouts_id_seq FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, DELETE ON public.workouts TO authenticated;
GRANT INSERT (user_id, exercise, weight, reps, sets, client_request_id) ON public.workouts TO authenticated;
GRANT USAGE ON SEQUENCE public.workouts_id_seq TO authenticated;
CREATE POLICY workouts_read_own ON public.workouts FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY workouts_create_own ON public.workouts FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY workouts_delete_own ON public.workouts FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
COMMENT ON TABLE public.workouts IS 'Private workout records. Clients cannot choose another owner, edit identity/time, or update records.';
COMMIT;
