-- SQL de migración manual para ajustar la columna password_hash y (opcional) añadir una restricción
-- Ejecuta esto en tu base de datos (Postgres) antes de crear usuarios vía Google.

BEGIN;

-- 1) Permitir NULL en password_hash (antes era NOT NULL)
ALTER TABLE "users"
  ALTER COLUMN "password_hash" DROP NOT NULL;

-- 2) (Opcional pero recomendado) Asegura que exista al menos una credencial
--    Si ya existe, primero elimina la constraint para recrearla.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_credential_chk'
      AND table_name = 'users'
      AND table_schema = 'public'
  ) THEN
    EXECUTE 'ALTER TABLE "users" DROP CONSTRAINT "users_credential_chk"';
  END IF;
END$$;

ALTER TABLE "users"
  ADD CONSTRAINT "users_credential_chk"
  CHECK (("password_hash" IS NOT NULL) OR ("google_sub" IS NOT NULL));

COMMIT;

