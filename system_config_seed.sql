-- Create SystemConfig table
CREATE TABLE IF NOT EXISTS "SystemConfig" (
    "id" SERIAL PRIMARY KEY,
    "plazo_peticion" INTEGER NOT NULL DEFAULT 15,
    "plazo_queja" INTEGER NOT NULL DEFAULT 15,
    "plazo_reclamo" INTEGER NOT NULL DEFAULT 15,
    "plazo_recurso" INTEGER NOT NULL DEFAULT 30,
    "prefijo_radicado" TEXT NOT NULL DEFAULT 'PQR',
    "backup_automatico" BOOLEAN NOT NULL DEFAULT true,
    "backup_frecuencia" INTEGER NOT NULL DEFAULT 7,
    "recovery_email_1" TEXT,
    "recovery_email_2" TEXT,
    "first_setup_done" BOOLEAN NOT NULL DEFAULT false,
    "entidad_logo" BYTEA,
    "entidad_nombre" TEXT,
    "entidad_email" TEXT,
    "entidad_telefono" TEXT,
    "entidad_whatsapp" TEXT,
    "entidad_nit" TEXT,
    "hashed_password" TEXT
);

-- Insert default configuration if table is empty
INSERT INTO "SystemConfig" (
    "plazo_peticion",
    "plazo_queja",
    "plazo_reclamo",
    "plazo_recurso",
    "prefijo_radicado",
    "backup_automatico",
    "backup_frecuencia",
    "first_setup_done",
    "entidad_logo",
    "entidad_nombre",
    "entidad_email",
    "entidad_telefono",
    "entidad_whatsapp",
    "entidad_nit",
    "hashed_password"
)
SELECT 
    15, 
    15, 
    15, 
    30, 
    'PQR', 
    true, 
    7, 
    false, 
    NULL, 
    NULL, 
    NULL, 
    NULL, 
    NULL, 
    NULL, 
    NULL
WHERE NOT EXISTS (SELECT 1 FROM "SystemConfig");
