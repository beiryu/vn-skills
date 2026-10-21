import { readFileSync } from 'node:fs';
import jsqrModule from 'jsqr';
import { PNG } from 'pngjs';

// jsqr ships CommonJS; depending on the loader the function is the module itself or its `default`.
type JsQR = (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;
const jsQR: JsQR = (
  typeof jsqrModule === 'function' ? jsqrModule : (jsqrModule as { default: unknown }).default
) as JsQR;

/** Read the QR payload from a PNG file. Returns an error message instead of throwing. */
export function decodeQrPng(
  file: string,
):
  | { ok: true; payload: string }
  | { ok: false; error: { code: string; message: string; hint?: string } } {
  let png: PNG;
  try {
    png = PNG.sync.read(readFileSync(file));
  } catch (e) {
    return {
      ok: false,
      error: {
        code: 'READ_ERROR',
        message: `cannot read ${file} as PNG: ${(e as Error).message}`,
        hint: 'Only PNG images are supported; convert screenshots or JPEGs to PNG first.',
      },
    };
  }
  const qr = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  if (!qr || !qr.data)
    return {
      ok: false,
      error: {
        code: 'NO_QR',
        message: `no QR code found in ${file}`,
        hint: 'Use a sharp, uncropped image with the whole QR code and its white border.',
      },
    };
  return { ok: true, payload: qr.data };
}
