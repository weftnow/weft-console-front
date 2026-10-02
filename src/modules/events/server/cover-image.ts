import "server-only";
import sharp from "sharp";
import { ApplicationError } from "@/shared/lib/application-error";

export type NormalizedCover = { bytes: Buffer; mimeType: "image/webp" };

function invalidCover(message: string): never {
  throw new ApplicationError("VALIDATION_ERROR", "Check the cover image.", { coverImage: message });
}

export async function normalizeCover(value: string): Promise<NormalizedCover> {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length > 2_000_000) invalidCover("Choose a JPEG, PNG or WebP image.");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.toString("base64") !== match[2] || bytes.length > 1_500_000) invalidCover("The cover image is too large or malformed.");
  try {
    const metadata = await sharp(bytes, { limitInputPixels: 16_000_000 }).metadata();
    if (!metadata.width || !metadata.height || metadata.width * metadata.height > 16_000_000 || metadata.format !== match[1]) invalidCover("Choose a valid JPEG, PNG or WebP image under 16 megapixels.");
    for (const quality of [80, 60, 40, 25]) {
      const normalized = await sharp(bytes, { limitInputPixels: 16_000_000 })
        .rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality }).toBuffer();
      if (normalized.length <= 262_144) return { bytes: normalized, mimeType: "image/webp" };
    }
    invalidCover("The normalized cover must be 256 KiB or smaller.");
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    invalidCover("The image could not be decoded.");
  }
}
