CREATE TABLE "content_ideas" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"platform" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"format" text,
	"key_points" jsonb,
	"sources" jsonb,
	"saved" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "expert_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"expert_id" integer NOT NULL,
	"primary_expertise" text,
	"secondary_expertise" jsonb,
	"expertise_keywords" jsonb,
	"voice_tone" jsonb,
	"personal_branding" text,
	"platforms" jsonb,
	"information_sources" jsonb,
	"target_audience" text,
	"content_goals" jsonb
);
--> statement-breakpoint
CREATE TABLE "experts" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"profile_complete" boolean DEFAULT false,
	"profile_image" text,
	CONSTRAINT "experts_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "scheduled_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"expert_id" integer NOT NULL,
	"platform" text NOT NULL,
	"content_type" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft',
	"scheduled_date" timestamp,
	"content" text
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"expert_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text,
	"status" text DEFAULT 'active',
	"trending" boolean DEFAULT false,
	"engagement" text DEFAULT 'normal',
	"is_recommended" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"tags" jsonb
);
--> statement-breakpoint
CREATE TABLE "viewpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_ideas" ADD CONSTRAINT "content_ideas_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert_profiles" ADD CONSTRAINT "expert_profiles_expert_id_experts_id_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."experts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_content" ADD CONSTRAINT "scheduled_content_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_content" ADD CONSTRAINT "scheduled_content_expert_id_experts_id_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."experts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_expert_id_experts_id_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."experts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewpoints" ADD CONSTRAINT "viewpoints_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;