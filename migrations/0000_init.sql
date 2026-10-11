CREATE TABLE `attendance` (
	`owner` text NOT NULL,
	`event_id` text NOT NULL,
	`solo` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`owner`, `event_id`)
);
--> statement-breakpoint
CREATE INDEX `attendance_event` ON `attendance` (`event_id`);--> statement-breakpoint
CREATE TABLE `catalogue` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`checked_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `connections` (
	`owner` text NOT NULL,
	`profile_id` text NOT NULL,
	`met_at` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`follow_up` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner`, `profile_id`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`owner` text NOT NULL,
	`event_id` text NOT NULL,
	`status` text DEFAULT 'interested' NOT NULL,
	PRIMARY KEY(`owner`, `event_id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`interests` text DEFAULT '[]' NOT NULL,
	`seeking` text DEFAULT '' NOT NULL,
	`offering` text DEFAULT '' NOT NULL,
	`linkedin` text DEFAULT '' NOT NULL,
	`twitter` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`share_phone` integer DEFAULT 0 NOT NULL,
	`share_email` integer DEFAULT 0 NOT NULL,
	`contact_token` text,
	`itinerary_token` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_id_unique` ON `profiles` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_contact_token_unique` ON `profiles` (`contact_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_itinerary_token_unique` ON `profiles` (`itinerary_token`);