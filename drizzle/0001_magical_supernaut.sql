CREATE TYPE "public"."acp_type" AS ENUM('viper', 'ghost_eye', 'sentinel', 'electronic_warfare');--> statement-breakpoint
CREATE TYPE "public"."mission_status" AS ENUM('active', 'completed', 'aborted');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('operator', 'commander', 'admin');--> statement-breakpoint
CREATE TABLE "mission_assignments" (
	"operator_id" text NOT NULL,
	"mission_id" integer NOT NULL,
	CONSTRAINT "mission_assignments_operator_id_mission_id_pk" PRIMARY KEY("operator_id","mission_id"),
	CONSTRAINT "mission_assignments_unique" UNIQUE("operator_id","mission_id")
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "missions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"acp_id" integer NOT NULL,
	"commander_id" text NOT NULL,
	"auth_code" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" "mission_status" DEFAULT 'active' NOT NULL,
	"mission_windows" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "missions_auth_code_unique" UNIQUE("auth_code")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"role" "role" DEFAULT 'operator' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "acps" DROP CONSTRAINT "acps_code_unique";--> statement-breakpoint
ALTER TABLE "acps" ALTER COLUMN "description" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "acps" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "squadrons" ALTER COLUMN "description" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "squadrons" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "acps" ADD COLUMN "type" "acp_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "acps" ADD COLUMN "serial_number" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "mission_assignments" ADD CONSTRAINT "mission_assignments_operator_id_user_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_assignments" ADD CONSTRAINT "mission_assignments_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_acp_id_acps_id_fk" FOREIGN KEY ("acp_id") REFERENCES "public"."acps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_commander_id_user_id_fk" FOREIGN KEY ("commander_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignments_operator_idx" ON "mission_assignments" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "assignments_mission_idx" ON "mission_assignments" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "missions_acp_id_idx" ON "missions" USING btree ("acp_id");--> statement-breakpoint
CREATE INDEX "missions_commander_id_idx" ON "missions" USING btree ("commander_id");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "acps" DROP COLUMN "code";--> statement-breakpoint
ALTER TABLE "acps" ADD CONSTRAINT "acps_serial_number_unique" UNIQUE("serial_number");