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
  volume: integer("volume").notNull().default(80), // Volume level (0-100)
  customJson: jsonb("custom_json"), // For custom JSON lighting effects
});

export const scenes = pgTable("scenes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  configuration: jsonb("configuration").notNull(),
  colors: text("colors").array(),
  icon: text("icon").notNull().default("lightbulb"),
  targetDevices: text("target_devices").array(), // Array of device IDs that this scene will control
  customJson: jsonb("custom_json"), // For custom JSON lighting effects
  turnOnIfOff: boolean("turn_on_if_off").notNull().default(true),
  deviceSettings: jsonb("device_settings"), // Per-device color and brightness settings
});

export const lightEffects = pgTable("light_effects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'preset' or 'custom'
  isCustom: boolean("is_custom").notNull().default(false),
  duration: integer("duration").notNull().default(1000),
  configuration: jsonb("configuration").notNull(),
  customJson: jsonb("custom_json"), // For custom JSON effects
  hiddenFromDashboard: boolean("hidden_from_dashboard").notNull().default(false),
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

// Custom lighting effect JSON schema
export const lightingEffectStepSchema = z.object({
  brightness: z.number().min(0).max(100).describe("Brightness level (0-100)"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).describe("Color in HEX format (#RRGGBB)"),
  duration: z.number().min(100).describe("Duration in milliseconds"),
  easing: z.object({
    type: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out']).default('linear'),
    duration: z.number().min(0).default(0).describe("Easing duration in milliseconds")
  }).optional(),
  deviceIds: z.array(z.string()).describe("Array of device IDs to control")
});

export const customLightingEffectSchema = z.object({
  name: z.string().describe("Name of the custom effect"),
  description: z.string().optional(),
  loop: z.boolean().default(false).describe("Whether the effect should loop"),
  loopCount: z.number().min(1).optional().describe("Number of loops (omit for infinite)"),
  globalDelay: z.number().min(0).default(0).describe("Global delay before starting effect"),
  steps: z.array(lightingEffectStepSchema).min(1).describe("Array of lighting steps")
});

// WebSocket message types
export type WebSocketMessage = 
  | { type: 'device_status'; payload: Device }
  | { type: 'device_discovered'; payload: Device }
  | { type: 'light_effect_triggered'; payload: { deviceId: number; effect: string } }
  | { type: 'sound_played'; payload: { buttonId: number; timestamp: number } }
  | { type: 'scene_applied'; payload: { sceneId: number; devices: number[] } }
  | { type: 'custom_effect_applied'; payload: { effectId: number; devices: string[] } };

export type CustomLightingEffect = z.infer<typeof customLightingEffectSchema>;
export type LightingEffectStep = z.infer<typeof lightingEffectStepSchema>;
