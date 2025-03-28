import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  profilePicture: text("profile_picture"),
  userType: text("user_type").notNull().default("passenger"), // "passenger" or "driver"
  createdAt: timestamp("created_at").defaultNow(),
  language: text("language").default("pt"),
  isOnline: boolean("is_online").default(false),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => users.id),
  model: text("model").notNull(),
  year: text("year").notNull(),
  color: text("color").notNull(),
  licensePlate: text("license_plate").notNull().unique(),
  vehicleType: text("vehicle_type").notNull().default("economy"), // "economy", "comfort", "premium"
});

export const rides = pgTable("rides", {
  id: serial("id").primaryKey(),
  passengerId: integer("passenger_id").references(() => users.id),
  driverId: integer("driver_id").references(() => users.id),
  originAddress: text("origin_address").notNull(),
  destinationAddress: text("destination_address").notNull(),
  originLat: real("origin_lat"),
  originLng: real("origin_lng"),
  destinationLat: real("destination_lat"),
  destinationLng: real("destination_lng"),
  status: text("status").notNull().default("requested"), // "requested", "accepted", "in_progress", "completed", "cancelled"
  requestedAt: timestamp("requested_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  distance: real("distance"), // in km
  duration: integer("duration"), // in minutes
  fare: real("fare"), // in local currency
  vehicleType: text("vehicle_type").default("economy"), // "economy", "comfort", "premium"
  paymentMethod: text("payment_method").default("credit_card"),
});

export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  rideId: integer("ride_id").references(() => rides.id),
  fromUserId: integer("from_user_id").references(() => users.id),
  toUserId: integer("to_user_id").references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  phone: true,
  profilePicture: true,
  userType: true,
  language: true,
  isOnline: true,
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
});

export const insertRideSchema = createInsertSchema(rides).omit({
  id: true,
  requestedAt: true,
  acceptedAt: true,
  startedAt: true,
  completedAt: true,
  cancelledAt: true,
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertRide = z.infer<typeof insertRideSchema>;
export type InsertRating = z.infer<typeof insertRatingSchema>;

export type User = typeof users.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Ride = typeof rides.$inferSelect;
export type Rating = typeof ratings.$inferSelect;

// Extended schemas for validation
export const loginSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"]
});

export type RegisterInput = z.infer<typeof registerSchema>;
