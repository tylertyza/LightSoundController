import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  ip: text("ip").notNull(),
  mac: text("mac").notNull().unique(),
  deviceType: text("device_type").notNull(),
  isOnline: boolean("is_online").notNull().default(false),
  lastSeen: text("last_seen"),
  power: boolean("power").notNull().default(false),
  color: jsonb("color"),
  brightness: integer("brightness").notNull().default(100),
  temperature: integer("temperature").notNull().default(3500),
  isAdopted: boolean("is_adopted").notNull().default(false),
});

export const soundButtons = pgTable("sound_buttons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  audioFile: text("audio_file").notNull(),
  lightEffect: text("light_effect").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  targetDevices: text("target_devices").array(), // Array of device IDs that this sound button will control
});

export const scenes = pgTable("scenes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  configuration: jsonb("configuration").notNull(),
  colors: text("colors").array(),
  icon: text("icon").notNull().default("lightbulb"),
  targetDevices: text("target_devices").array(), // Array of device IDs that this scene will control
});

export const lightEffects = pgTable("light_effects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'flash', 'strobe', 'fade', 'cycle', 'breathe'
  duration: integer("duration").notNull().default(1000),
  configuration: jsonb("configuration").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  lastSeen: true,
});

export const insertSoundButtonSchema = createInsertSchema(soundButtons).omit({
  id: true,
  sortOrder: true,
});

export const insertSceneSchema = createInsertSchema(scenes).omit({
  id: true,
});

export const insertLightEffectSchema = createInsertSchema(lightEffects).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;

export type InsertSoundButton = z.infer<typeof insertSoundButtonSchema>;
export type SoundButton = typeof soundButtons.$inferSelect;

export type InsertScene = z.infer<typeof insertSceneSchema>;
export type Scene = typeof scenes.$inferSelect;

export type InsertLightEffect = z.infer<typeof insertLightEffectSchema>;
export type LightEffect = typeof lightEffects.$inferSelect;

// WebSocket message types
export type WebSocketMessage = 
  | { type: 'device_status'; payload: Device }
  | { type: 'device_discovered'; payload: Device }
  | { type: 'light_effect_triggered'; payload: { deviceId: number; effect: string } }
  | { type: 'sound_played'; payload: { buttonId: number; timestamp: number } }
  | { type: 'scene_applied'; payload: { sceneId: number; devices: number[] } };
