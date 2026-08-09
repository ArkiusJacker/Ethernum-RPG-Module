export const CHARACTER_SHEET_IMAGE_ROLES = [
  "portrait",
  "item",
  "weapon",
  "feat",
  "spell",
  "action",
  "unique",
  "logo",
] as const;

export type CharacterSheetImageRole = typeof CHARACTER_SHEET_IMAGE_ROLES[number];

const FALLBACKS: Record<CharacterSheetImageRole, string> = {
  portrait: "icons/svg/mystery-man.svg",
  item: "icons/svg/item-bag.svg",
  weapon: "icons/svg/sword.svg",
  feat: "icons/svg/upgrade.svg",
  spell: "icons/svg/book.svg",
  action: "icons/svg/dice-target.svg",
  unique: "icons/svg/aura.svg",
  logo: "icons/svg/clockwork.svg",
};

interface SheetImageLike {
  tagName?: string;
  dataset: DOMStringMap;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  classList?: Pick<DOMTokenList, "add">;
}

function isImage(value: unknown): value is SheetImageLike {
  return Boolean(value && typeof value === "object"
    && String((value as SheetImageLike).tagName ?? "").toLowerCase() === "img"
    && typeof (value as SheetImageLike).getAttribute === "function"
    && typeof (value as SheetImageLike).setAttribute === "function");
}

export function normalizeCharacterSheetImageRole(value: unknown): CharacterSheetImageRole {
  const role = String(value ?? "").trim().toLowerCase();
  return (CHARACTER_SHEET_IMAGE_ROLES as readonly string[]).includes(role)
    ? role as CharacterSheetImageRole
    : "item";
}

export function characterSheetImageFallback(role: unknown): string {
  return FALLBACKS[normalizeCharacterSheetImageRole(role)];
}

export function inferCharacterSheetImageRole(image: HTMLImageElement): CharacterSheetImageRole {
  if (image.dataset.imageRole) return normalizeCharacterSheetImageRole(image.dataset.imageRole);
  if (image.closest(".ecs-portrait")) return "portrait";
  if (image.closest(".ecs-strike")) return "weapon";
  if (image.closest(".ecs-spell-row, .ecs-spell-entry")) return "spell";
  if (image.closest(".ecs-feat-row")) return "feat";
  if (image.closest(".ecs-action-row, .ecs-activity-columns, .ecs-activity-list")) return "action";
  if (image.closest('.ecs-tab-panel--unique, [data-tab="unique"]')) return "unique";
  return "item";
}

export function prepareSheetImage(image: SheetImageLike): boolean {
  const role = normalizeCharacterSheetImageRole(image.dataset.imageRole);
  image.dataset.imageRole = role;
  const source = image.getAttribute("src")?.trim() ?? "";
  if (source) return false;
  image.setAttribute("src", characterSheetImageFallback(role));
  image.dataset.imageFallbackApplied = "true";
  image.dataset.imageFit = "contain";
  image.classList?.add("is-image-fallback");
  return true;
}

export function handleSheetImageError(eventOrImage: Event | SheetImageLike): boolean {
  const eventTarget = "currentTarget" in eventOrImage
    ? eventOrImage.currentTarget ?? eventOrImage.target
    : eventOrImage;
  if (!isImage(eventTarget)) return false;

  const role = normalizeCharacterSheetImageRole(eventTarget.dataset.imageRole);
  const fallback = characterSheetImageFallback(role);
  const alreadyApplied = eventTarget.dataset.imageFallbackApplied === "true";
  if (alreadyApplied && eventTarget.getAttribute("src") === fallback) {
    eventTarget.removeAttribute("src");
    eventTarget.dataset.imageFallbackFailed = "true";
    eventTarget.classList?.add("is-image-missing");
    return false;
  }

  eventTarget.dataset.imageFallbackApplied = "true";
  eventTarget.dataset.imageFit = "contain";
  eventTarget.classList?.add("is-image-fallback");
  eventTarget.setAttribute("src", fallback);
  return true;
}

export class CharacterSheetImageService {
  readonly #boundRoots = new WeakSet<object>();

  bind(root: HTMLElement): void {
    root.querySelectorAll<HTMLImageElement>("img").forEach(image => {
      image.dataset.imageRole = inferCharacterSheetImageRole(image);
      prepareSheetImage(image);
    });
    if (this.#boundRoots.has(root)) return;
    this.#boundRoots.add(root);
    root.addEventListener("error", event => {
      handleSheetImageError(event);
    }, true);
  }
}
