CREATE TABLE "cases" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"target_id" text NOT NULL,
	"moderator_id" text NOT NULL,
	"reason" text NOT NULL,
	"duration_ms" bigint,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "command_usage" (
	"date" date NOT NULL,
	"command" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "command_usage_date_command_pk" PRIMARY KEY("date","command")
);
--> statement-breakpoint
CREATE TABLE "config_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"module" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "giveaway_entries" (
	"giveaway_id" integer NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "giveaway_entries_giveaway_id_user_id_pk" PRIMARY KEY("giveaway_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "giveaways" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text NOT NULL,
	"prize" text NOT NULL,
	"winner_count" integer DEFAULT 1 NOT NULL,
	"requirements" jsonb,
	"ends_at" timestamp with time zone NOT NULL,
	"ended" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "giveaways_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "heartbeat" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "level_rewards" (
	"level" integer PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"user_id" text PRIMARY KEY NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"last_daily" timestamp with time zone,
	"daily_streak" integer DEFAULT 0 NOT NULL,
	"last_work" timestamp with time zone,
	"last_xp_at" timestamp with time zone,
	"messages" integer DEFAULT 0 NOT NULL,
	"voice_seconds" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reaction_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"emoji" text NOT NULL,
	"role_id" text NOT NULL,
	"mode" text DEFAULT 'toggle' NOT NULL,
	"group_key" text
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"message" text NOT NULL,
	"remind_at" timestamp with time zone NOT NULL,
	"sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"modules" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" bigint NOT NULL,
	"role_id" text,
	"stock" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "starboard_posts" (
	"original_message_id" text PRIMARY KEY NOT NULL,
	"starboard_message_id" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stats_daily" (
	"date" date PRIMARY KEY NOT NULL,
	"messages" integer DEFAULT 0 NOT NULL,
	"joins" integer DEFAULT 0 NOT NULL,
	"leaves" integer DEFAULT 0 NOT NULL,
	"commands" integer DEFAULT 0 NOT NULL,
	"voice_seconds" integer DEFAULT 0 NOT NULL,
	"music_plays" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"claimed_by" text,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"transcript" "bytea",
	"transcript_bytes" integer,
	CONSTRAINT "tickets_channel_id_unique" UNIQUE("channel_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"discord_id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"avatar" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warnings" (
	"case_id" bigint PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "giveaway_entries" ADD CONSTRAINT "giveaway_entries_giveaway_id_giveaways_id_fk" FOREIGN KEY ("giveaway_id") REFERENCES "public"."giveaways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cases_target_idx" ON "cases" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "cases_created_idx" ON "cases" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "command_usage_date_idx" ON "command_usage" USING btree ("date");--> statement-breakpoint
CREATE INDEX "config_audit_created_idx" ON "config_audit" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "giveaway_entries_giveaway_idx" ON "giveaway_entries" USING btree ("giveaway_id");--> statement-breakpoint
CREATE INDEX "members_xp_idx" ON "members" USING btree ("xp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "members_balance_idx" ON "members" USING btree ("balance" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "reaction_roles_message_emoji_idx" ON "reaction_roles" USING btree ("message_id","emoji");--> statement-breakpoint
CREATE INDEX "reaction_roles_message_idx" ON "reaction_roles" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "reminders_due_idx" ON "reminders" USING btree ("sent","remind_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tickets_user_idx" ON "tickets" USING btree ("user_id");