ALTER TABLE "cases" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "cases_expiry_idx" ON "cases" USING btree ("active","expires_at");