import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  CHARACTER_SHEET_IMAGE_ROLES,
  characterSheetImageFallback,
  CharacterSheetImageService,
  handleSheetImageError,
  inferCharacterSheetImageRole,
  prepareSheetImage,
  type CharacterSheetImageRole,
} from "../scripts/sheets/core/CharacterSheetImageService.js";

class FakeImage {
  readonly tagName = "IMG";
  readonly dataset: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly classes = new Set<string>();
  readonly classList = { add: (name: string) => this.classes.add(name) };

  constructor(role: CharacterSheetImageRole, source?: string) {
    this.dataset.imageRole = role;
    if (source !== undefined) this.attributes.set("src", source);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
}

describe("CharacterSheetImageService", () => {
  it("provides a role-specific local fallback for every supported image role", () => {
    const fallbacks = CHARACTER_SHEET_IMAGE_ROLES.map(characterSheetImageFallback);
    expect(new Set(fallbacks).size).toBe(CHARACTER_SHEET_IMAGE_ROLES.length);
    expect(characterSheetImageFallback("weapon")).toBe("icons/svg/sword.svg");
    expect(characterSheetImageFallback("spell")).toBe("icons/svg/book.svg");
    expect(characterSheetImageFallback("portrait")).toBe("icons/svg/mystery-man.svg");
  });

  it.each([
    ["square", "square-512.webp"],
    ["portrait", "portrait-800x1200.webp"],
    ["wide", "wide-1600x600.webp"],
    ["tall", "tall-600x1600.webp"],
    ["transparent PNG", "standalone-transparent.png"],
  ])("preserves a valid %s image source", (_label, source) => {
    const image = new FakeImage("item", source);
    expect(prepareSheetImage(image as unknown as HTMLImageElement)).toBe(false);
    expect(image.getAttribute("src")).toBe(source);
    expect(image.dataset.imageFallbackApplied).toBeUndefined();
  });

  it("fills a missing source immediately and uses contain for the fallback artwork", () => {
    const image = new FakeImage("feat", "");
    expect(prepareSheetImage(image as unknown as HTMLImageElement)).toBe(true);
    expect(image.getAttribute("src")).toBe("icons/svg/upgrade.svg");
    expect(image.dataset.imageFit).toBe("contain");
    expect(image.classes.has("is-image-fallback")).toBe(true);
  });

  it("replaces an invalid image in place without requesting a sheet rerender", () => {
    const image = new FakeImage("weapon", "missing.webp");
    const render = vi.fn();

    expect(handleSheetImageError(image as unknown as HTMLImageElement)).toBe(true);
    expect(image.getAttribute("src")).toBe("icons/svg/sword.svg");
    expect(render).not.toHaveBeenCalled();

    expect(handleSheetImageError(image as unknown as HTMLImageElement)).toBe(false);
    expect(image.getAttribute("src")).toBeNull();
    expect(image.dataset.imageFallbackFailed).toBe("true");
  });

  it("binds one capture-phase error handler and prepares current missing images", () => {
    const image = new FakeImage("spell", "");
    Object.assign(image, { closest: () => null });
    const addEventListener = vi.fn();
    const root = {
      querySelectorAll: () => [image],
      addEventListener,
    } as unknown as HTMLElement;
    const service = new CharacterSheetImageService();

    service.bind(root);
    service.bind(root);

    expect(image.getAttribute("src")).toBe("icons/svg/book.svg");
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenCalledWith("error", expect.any(Function), true);
  });

  it("assigns semantic roles to legacy images inserted by embedded mechanics", () => {
    const image = new FakeImage("item", "legacy.webp") as FakeImage & { closest: (selector: string) => object | null };
    delete image.dataset.imageRole;
    image.closest = selector => selector.includes("data-tab") ? {} : null;
    expect(inferCharacterSheetImageRole(image as unknown as HTMLImageElement)).toBe("unique");
  });

  it("distinguishes content thumbnails from canonical UI assets", () => {
    const templatesDirectory = join(process.cwd(), "templates", "sheets");
    const templateFiles = [
      join(templatesDirectory, "base", "header.html"),
      ...readdirSync(join(templatesDirectory, "ethernum")).map(file => join(templatesDirectory, "ethernum", file)),
      ...readdirSync(join(templatesDirectory, "components")).map(file => join(templatesDirectory, "components", file)),
    ];
    const images = templateFiles.flatMap(file => readFileSync(file, "utf8").match(/<img\b[^>]*>/g) ?? []);
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image.includes("data-image-role=") || image.includes("data-ui-asset=") || image.includes("data-reference-image")).toBe(true);
      expect(image.includes("data-image-role=") && image.includes("data-ui-asset=")).toBe(false);
    }

    const baseCss = readFileSync(join(process.cwd(), "styles", "sheets", "character-sheet-base.css"), "utf8");
    const componentCss = readFileSync(join(process.cwd(), "styles", "sheets", "character-sheet-components.css"), "utf8");
    expect(baseCss).toMatch(/\.ecs-thumbnail \{[\s\S]*?flex: 0 0 auto;[\s\S]*?aspect-ratio: 1 \/ 1;/);
    expect(baseCss).toMatch(/img\[data-image-role\][\s\S]*?min-width: 100%;[\s\S]*?object-fit: cover;/);
    expect(baseCss).toContain('.ecs-thumbnail img[data-image-fit="contain"]');
    expect(componentCss).toMatch(/\.ecs-item-image \{[\s\S]*?flex: 0 0 42px;[\s\S]*?max-width: 42px;/);
  });
});
