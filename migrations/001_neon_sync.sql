CREATE TABLE IF NOT EXISTS rony_dieta_sync (
  owner_id text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, key)
);

CREATE TABLE IF NOT EXISTS rony_dieta_menu_history (
  owner_id text NOT NULL,
  week_start date NOT NULL,
  week_index integer NOT NULL,
  week_name text NOT NULL,
  menu_signature text,
  app_build text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, week_start)
);
