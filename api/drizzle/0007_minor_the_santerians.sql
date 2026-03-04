CREATE TYPE "public"."order_type" AS ENUM('standard', 'delivery');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "type" "order_type" DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "date" date;