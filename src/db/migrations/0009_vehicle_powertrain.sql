ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "powertrain" varchar(20) DEFAULT 'combustion' NOT NULL;
