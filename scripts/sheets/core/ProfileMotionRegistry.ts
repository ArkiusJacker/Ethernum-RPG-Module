import {
  CHARACTER_SHEET_MOTION_MODES,
  normalizeCharacterSheetMotionMode,
  type CharacterSheetMotionMode,
} from "./CharacterSheetMotionService.js";

export const PROFILE_MOTION_IDS = [
  "pipping-night",
  "gyro-spin",
  "bayle-rage",
  "arkius-jacker",
  "yu-jiu-ji-tae",
  "charles",
  "atlas-sidarta",
] as const;

export type ProfileMotionId = typeof PROFILE_MOTION_IDS[number];

export const PROFILE_MOTION_VARIABLES = [
  "--ecs-profile-motion-duration",
  "--ecs-profile-motion-distance",
  "--ecs-profile-motion-rotation",
  "--ecs-profile-motion-scale",
  "--ecs-profile-motion-opacity",
] as const;

export type ProfileMotionVariable = typeof PROFILE_MOTION_VARIABLES[number];
export type ProfileMotionVariableMap = Readonly<Record<ProfileMotionVariable, string>>;

export interface ProfileMotionDefinition {
  id: ProfileMotionId;
  className: `ecs-profile-motion--${ProfileMotionId}`;
  variables: ProfileMotionVariableMap;
}

export interface ResolvedProfileMotion {
  profileId: ProfileMotionId;
  mode: CharacterSheetMotionMode;
  classes: readonly ["ecs-profile-motion", ProfileMotionDefinition["className"], `ecs-profile-motion--${CharacterSheetMotionMode}`];
  variables: ProfileMotionVariableMap;
}

function motionVariables(
  duration: string,
  distance: string,
  rotation: string,
  scale: string,
  opacity: string,
): ProfileMotionVariableMap {
  return Object.freeze({
    "--ecs-profile-motion-duration": duration,
    "--ecs-profile-motion-distance": distance,
    "--ecs-profile-motion-rotation": rotation,
    "--ecs-profile-motion-scale": scale,
    "--ecs-profile-motion-opacity": opacity,
  });
}

export const PROFILE_MOTION_DEFINITIONS = Object.freeze([
  { id: "pipping-night", className: "ecs-profile-motion--pipping-night", variables: motionVariables("5.2s", "1px", "0.15deg", "1.008", "0.78") },
  { id: "gyro-spin", className: "ecs-profile-motion--gyro-spin", variables: motionVariables("18s", "1px", "360deg", "1", "0.82") },
  { id: "bayle-rage", className: "ecs-profile-motion--bayle-rage", variables: motionVariables("6.2s", "2px", "0.2deg", "1.01", "0.84") },
  { id: "arkius-jacker", className: "ecs-profile-motion--arkius-jacker", variables: motionVariables("6.8s", "2px", "0.15deg", "1.006", "0.8") },
  { id: "yu-jiu-ji-tae", className: "ecs-profile-motion--yu-jiu-ji-tae", variables: motionVariables("12s", "1px", "360deg", "1", "0.7") },
  { id: "charles", className: "ecs-profile-motion--charles", variables: motionVariables("7.2s", "1px", "0.2deg", "1.006", "0.68") },
  { id: "atlas-sidarta", className: "ecs-profile-motion--atlas-sidarta", variables: motionVariables("9s", "1px", "0.35deg", "1.004", "0.72") },
] satisfies readonly ProfileMotionDefinition[]);

const DEFINITIONS = new Map(PROFILE_MOTION_DEFINITIONS.map(definition => [definition.id, definition]));
const PROFILE_ALIASES = new Map<string, ProfileMotionId>([["bayle-dragon", "bayle-rage"]]);

const REDUCED_VARIABLES = motionVariables("140ms", "0px", "0deg", "1", "1");
const OFF_VARIABLES = motionVariables("0ms", "0px", "0deg", "1", "1");

export function resolveProfileMotion(
  profileId: unknown,
  mode: unknown = "full",
): ResolvedProfileMotion | null {
  if (typeof profileId !== "string") return null;
  const normalizedId = profileId.trim().toLowerCase();
  const definition = DEFINITIONS.get(PROFILE_ALIASES.get(normalizedId) ?? normalizedId as ProfileMotionId);
  if (!definition) return null;

  const normalizedMode = normalizeCharacterSheetMotionMode(mode);
  const variables = normalizedMode === "off"
    ? OFF_VARIABLES
    : normalizedMode === "reduced"
      ? REDUCED_VARIABLES
      : definition.variables;

  return Object.freeze({
    profileId: definition.id,
    mode: normalizedMode,
    classes: Object.freeze([
      "ecs-profile-motion",
      definition.className,
      `ecs-profile-motion--${normalizedMode}`,
    ]) as ResolvedProfileMotion["classes"],
    variables,
  });
}

export const ProfileMotionRegistry = Object.freeze({
  modes: CHARACTER_SHEET_MOTION_MODES,
  profileIds: PROFILE_MOTION_IDS,
  definitions: PROFILE_MOTION_DEFINITIONS,
  resolve: resolveProfileMotion,
});
