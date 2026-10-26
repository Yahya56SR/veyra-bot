CREATE TABLE "cases" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"type" text NOT NULL,
	"target_id" text NOT NULL,
	"moderator_id" text NOT NULL,
	"reason" text NOT NULL,
	"duration_ms" bigint,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "command_usage" (
	"guild_id" text NOT NULL,
	"date" date NOT NULL,
	"command" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "command_usage_guild_id_date_command_pk" PRIMARY KEY("guild_id","date","command")
);
--> statement-breakpoint
CREATE TABLE "config_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
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
	"guild_id" text NOT NULL,
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
CREATE TABLE "guild_memberships" (
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"permissions" text DEFAULT '0' NOT NULL,
	"owner" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guild_memberships_guild_id_user_id_pk" PRIMARY KEY("guild_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "guilds" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"owner_id" text,
	"member_count" integer DEFAULT 0 NOT NULL,
	"premium_tier" text DEFAULT 'free' NOT NULL,
	"premium_until" timestamp with time zone,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "heartbeat" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "level_rewards" (
	"guild_id" text NOT NULL,
	"level" integer NOT NULL,
	"role_id" text NOT NULL,
	CONSTRAINT "level_rewards_guild_id_level_pk" PRIMARY KEY("guild_id","level")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"last_daily" timestamp with time zone,
	"daily_streak" integer DEFAULT 0 NOT NULL,
	"last_work" timestamp with time zone,
	"last_xp_at" timestamp with time zone,
	"messages" integer DEFAULT 0 NOT NULL,
	"voice_seconds" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_guild_id_user_id_pk" PRIMARY KEY("guild_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "premium_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"tier" text DEFAULT 'premium' NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "premium_subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "reaction_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"message_id" text NOT NULL,
	"emoji" text NOT NULL,
	"role_id" text NOT NULL,
	"mode" text DEFAULT 'toggle' NOT NULL,
	"group_key" text
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
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
	"guild_id" text PRIMARY KEY NOT NULL,
	"modules" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"name" text NOT NULL,
	"price" bigint NOT NULL,
	"role_id" text,
	"stock" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "starboard_posts" (
	"guild_id" text NOT NULL,
	"original_message_id" text NOT NULL,
	"starboard_message_id" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "starboard_posts_guild_id_original_message_id_pk" PRIMARY KEY("guild_id","original_message_id")
);
--> statement-breakpoint
CREATE TABLE "stats_daily" (
	"guild_id" text NOT NULL,
	"date" date NOT NULL,
	"messages" integer DEFAULT 0 NOT NULL,
	"joins" integer DEFAULT 0 NOT NULL,
	"leaves" integer DEFAULT 0 NOT NULL,
	"commands" integer DEFAULT 0 NOT NULL,
	"voice_seconds" integer DEFAULT 0 NOT NULL,
	"music_plays" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "stats_daily_guild_id_date_pk" PRIMARY KEY("guild_id","date")
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
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
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_usage" ADD CONSTRAINT "command_usage_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_audit" ADD CONSTRAINT "config_audit_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaway_entries" ADD CONSTRAINT "giveaway_entries_giveaway_id_giveaways_id_fk" FOREIGN KEY ("giveaway_id") REFERENCES "public"."giveaways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaways" ADD CONSTRAINT "giveaways_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_memberships" ADD CONSTRAINT "guild_memberships_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_memberships" ADD CONSTRAINT "guild_memberships_user_id_users_discord_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("discord_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_rewards" ADD CONSTRAINT "level_rewards_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_subscriptions" ADD CONSTRAINT "premium_subscriptions_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaction_roles" ADD CONSTRAINT "reaction_roles_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_items" ADD CONSTRAINT "shop_items_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "starboard_posts" ADD CONSTRAINT "starboard_posts_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stats_daily" ADD CONSTRAINT "stats_daily_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cases_guild_target_idx" ON "cases" USING btree ("guild_id","target_id");--> statement-breakpoint
CREATE INDEX "cases_guild_created_idx" ON "cases" USING btree ("guild_id","created_at");--> statement-breakpoint
CREATE INDEX "cases_guild_expiry_idx" ON "cases" USING btree ("guild_id","active","expires_at");--> statement-breakpoint
CREATE INDEX "command_usage_guild_date_idx" ON "command_usage" USING btree ("guild_id","date");--> statement-breakpoint
CREATE INDEX "config_audit_guild_created_idx" ON "config_audit" USING btree ("guild_id","created_at");--> statement-breakpoint
CREATE INDEX "giveaway_entries_giveaway_idx" ON "giveaway_entries" USING btree ("giveaway_id");--> statement-breakpoint
CREATE INDEX "giveaways_guild_due_idx" ON "giveaways" USING btree ("guild_id","ended","ends_at");--> statement-breakpoint
CREATE INDEX "guild_memberships_user_idx" ON "guild_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "guilds_premium_idx" ON "guilds" USING btree ("premium_tier","premium_until");--> statement-breakpoint
CREATE INDEX "members_guild_xp_idx" ON "members" USING btree ("guild_id","xp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "members_guild_balance_idx" ON "members" USING btree ("guild_id","balance" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "premium_subscriptions_guild_idx" ON "premium_subscriptions" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "premium_subscriptions_customer_idx" ON "premium_subscriptions" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reaction_roles_guild_message_emoji_idx" ON "reaction_roles" USING btree ("guild_id","message_id","emoji");--> statement-breakpoint
CREATE INDEX "reaction_roles_guild_message_idx" ON "reaction_roles" USING btree ("guild_id","message_id");--> statement-breakpoint
CREATE INDEX "reminders_due_idx" ON "reminders" USING btree ("sent","remind_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shop_items_guild_idx" ON "shop_items" USING btree ("guild_id","price");--> statement-breakpoint
CREATE INDEX "tickets_guild_status_idx" ON "tickets" USING btree ("guild_id","status");--> statement-breakpoint
CREATE INDEX "tickets_guild_user_idx" ON "tickets" USING btree ("guild_id","user_id");--> statement-breakpoint
CREATE INDEX "warnings_guild_user_idx" ON "warnings" USING btree ("guild_id","user_id","active");