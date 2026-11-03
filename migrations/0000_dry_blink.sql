CREATE TABLE "twitch_competition_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"guild_id" varchar(32) NOT NULL,
	"channel_id" varchar(32) NOT NULL,
	"message_id" varchar(32) NOT NULL,
	"notified_role_id" varchar(32),
	"last_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "twitch_competitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vod_id" varchar(32) NOT NULL,
	"vod_url" text NOT NULL,
	"description" varchar(255) NOT NULL,
	"banner_url" text,
	"duration_days" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_by" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "twitch_competition_posts" ADD CONSTRAINT "twitch_competition_posts_competition_id_twitch_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."twitch_competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "twitch_competition_posts_competition_guild_unique" ON "twitch_competition_posts" USING btree ("competition_id","guild_id");--> statement-breakpoint
CREATE INDEX "twitch_competition_posts_competition_id_idx" ON "twitch_competition_posts" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "twitch_competitions_ends_at_idx" ON "twitch_competitions" USING btree ("ends_at");--> statement-breakpoint
CREATE INDEX "twitch_competitions_vod_id_idx" ON "twitch_competitions" USING btree ("vod_id");