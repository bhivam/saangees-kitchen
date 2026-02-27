CREATE TABLE "delivery_dates" (
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "delivery_dates_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
ALTER TABLE "delivery_dates" ADD CONSTRAINT "delivery_dates_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;