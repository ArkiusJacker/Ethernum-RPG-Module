type Data = Record<string, unknown>;

export type CharacterBiographyField =
  | "appearance"
  | "backstory"
  | "campaignNotes"
  | "allies"
  | "enemies"
  | "organizations";

export type EnrichedCharacterBiography = Record<CharacterBiographyField, string>;

export interface CharacterRichTextOptions {
  user?: unknown;
  secrets?: boolean;
  rollData?: Data;
  relativeTo?: unknown;
}

export type CharacterRichTextCapabilityStatus = "supported" | "fallback" | "unsupported";

interface RichTextEditor {
  enrichHTML: (content: string, options?: Data) => string | Promise<string>;
}

const BIOGRAPHY_FIELDS: CharacterBiographyField[] = [
  "appearance",
  "backstory",
  "campaignNotes",
  "allies",
  "enemies",
  "organizations",
];

function record(value: unknown): Data {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Data : {};
}

function runtime(name: string): unknown {
  return (globalThis as unknown as Data)[name];
}

function editor(value: unknown): RichTextEditor | null {
  if ((typeof value !== "object" || value === null) && typeof value !== "function") return null;
  const candidate = value as RichTextEditor;
  return typeof candidate.enrichHTML === "function" ? candidate : null;
}

function pf2eEditor(): RichTextEditor | null {
  const pf2e = record(runtime("pf2e"));
  const config = record(runtime("CONFIG"));
  const pf2eConfig = record(config.PF2E);
  const game = record(runtime("game"));
  const gamePf2e = record(game.pf2e);
  return editor(runtime("TextEditorPF2e"))
    ?? editor(pf2e.TextEditorPF2e)
    ?? editor(gamePf2e.TextEditorPF2e)
    ?? editor(gamePf2e.TextEditor)
    ?? editor(pf2eConfig.TextEditorPF2e)
    ?? editor(pf2eConfig.TextEditor);
}

function foundryEditor(): RichTextEditor | null {
  return editor(runtime("TextEditor"));
}

function currentUser(): unknown {
  return record(runtime("game")).user;
}

function permission(actor: Data, user: unknown, level: string): boolean {
  const testUserPermission = actor.testUserPermission;
  if (typeof testUserPermission !== "function" || !user) return false;
  try {
    return testUserPermission.call(actor, user, level) === true;
  } catch {
    return false;
  }
}

export function canViewCharacterSecrets(actorValue: unknown, userValue: unknown = currentUser()): boolean {
  const actor = record(actorValue);
  const user = record(userValue);
  if (user.isGM === true || actor.isOwner === true) return true;
  return permission(actor, userValue, "OWNER");
}

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr",
]);

function restrictedOpeningTag(tag: string): boolean {
  const classValue = /\bclass\s*=\s*(['"])(.*?)\1/i.exec(tag)?.[2] ?? "";
  const visibility = /\bdata-visibility\s*=\s*(['"])(.*?)\1/i.exec(tag)?.[2] ?? "";
  return classValue.split(/\s+/).some(value => value.toLowerCase() === "secret")
    || visibility.trim().toLowerCase() === "gm";
}

function stripSecrets(content: string): string {
  const stack: Array<{ tag: string; restricted: boolean }> = [];
  const tagPattern = /<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>/gi;
  let result = "";
  let cursor = 0;
  let restrictedDepth = 0;

  for (const match of content.matchAll(tagPattern)) {
    const token = match[0];
    const index = match.index ?? cursor;
    if (restrictedDepth === 0) result += content.slice(cursor, index);
    cursor = index + token.length;

    const name = /^<\/?\s*([a-z][\w-]*)/i.exec(token)?.[1]?.toLowerCase();
    if (!name || token.startsWith("<!")) {
      if (restrictedDepth === 0) result += token;
      continue;
    }

    if (/^<\//.test(token)) {
      const before = restrictedDepth;
      let entry: { tag: string; restricted: boolean } | undefined;
      while ((entry = stack.pop())) {
        if (entry.restricted) restrictedDepth = Math.max(0, restrictedDepth - 1);
        if (entry.tag === name) break;
      }
      if (before === 0 && restrictedDepth === 0) result += token;
      continue;
    }

    const restricted = restrictedOpeningTag(token);
    const before = restrictedDepth;
    if (restricted) restrictedDepth += 1;
    if (before === 0 && !restricted) result += token;
    if (!/\/>\s*$/.test(token) && !VOID_TAGS.has(name)) stack.push({ tag: name, restricted });
    else if (restricted) restrictedDepth = Math.max(0, restrictedDepth - 1);
  }

  if (restrictedDepth === 0) result += content.slice(cursor);
  return result;
}

function escapeHTML(content: string): string {
  return content
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function actorRollData(actor: Data): Data {
  const getRollData = actor.getRollData;
  if (typeof getRollData !== "function") return record(actor.system);
  try {
    return record(getRollData.call(actor));
  } catch {
    return record(actor.system);
  }
}

export async function enrichCharacterRichText(
  contentValue: unknown,
  actorValue: Actor | unknown,
  options: CharacterRichTextOptions = {},
): Promise<string> {
  const original = typeof contentValue === "string" ? contentValue : "";
  if (!original) return "";
  const actor = record(actorValue);
  const secrets = options.secrets ?? canViewCharacterSecrets(actorValue, options.user);
  const content = secrets ? original : stripSecrets(original);
  const enrichOptions: Data = {
    async: true,
    secrets,
    rollData: options.rollData ?? actorRollData(actor),
    relativeTo: options.relativeTo ?? actorValue,
  };

  for (const candidate of [pf2eEditor(), foundryEditor()]) {
    if (!candidate) continue;
    try {
      const enriched = await candidate.enrichHTML(content, enrichOptions);
      return secrets ? String(enriched ?? "") : stripSecrets(String(enriched ?? ""));
    } catch {
      // A failing PF2e enricher must not prevent the Foundry fallback.
    }
  }

  return escapeHTML(content);
}

export function characterRichTextCapabilityStatus(): CharacterRichTextCapabilityStatus {
  if (pf2eEditor()) return "supported";
  if (foundryEditor()) return "fallback";
  return "unsupported";
}

function biographySource(actorValue: unknown): Data {
  const actor = record(actorValue);
  const prepared = record(record(record(actor.system).details).biography);
  const stored = record(record(record(record(actor._source).system).details).biography);
  return { ...stored, ...prepared };
}

export async function enrichCharacterBiography(
  actor: Actor | unknown,
  options: CharacterRichTextOptions = {},
): Promise<EnrichedCharacterBiography> {
  const biography = biographySource(actor);
  const pairs = await Promise.all(BIOGRAPHY_FIELDS.map(async field => [
    field,
    await enrichCharacterRichText(biography[field], actor, options),
  ] as const));
  return Object.fromEntries(pairs) as EnrichedCharacterBiography;
}

export const CharacterRichTextService = {
  enrich: enrichCharacterRichText,
  biography: enrichCharacterBiography,
  canViewSecrets: canViewCharacterSecrets,
  capabilityStatus: characterRichTextCapabilityStatus,
} as const;
