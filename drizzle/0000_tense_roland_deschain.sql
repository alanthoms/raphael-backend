CREATE TABLE "acps" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "acps_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"squadron_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "acps_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "squadrons" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "squadrons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "squadrons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "acps" ADD CONSTRAINT "acps_squadron_id_squadrons_id_fk" FOREIGN KEY ("squadron_id") REFERENCES "public"."squadrons"("id") ON DELETE restrict ON UPDATE no action;