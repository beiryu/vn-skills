import { readFileSync } from 'node:fs';
import jsqrModule from 'jsqr';
import { PNG } from 'pngjs';

// jsqr ships CommonJS; depending on the loader the function is the module itself or its `default`.
type JsQR = (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;
const jsQR: JsQR = (
  typeof jsqrModule === 'function' ? jsqrModule : (jsqrModule as { default: unknown }).default
) as JsQR;

type DecodeResult =
  | { ok: true; payload: string }
  | { ok: false; error: { code: string; message: string; hint?: string } };

/** Largest image (decoded bytes) accepted by `decodeQrBuffer` callers that take untrusted input: 5 MB. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Read the QR payload from PNG bytes. Returns an error message instead of throwing. */
export function decodeQrBuffer(buf: Uint8Array, label = 'image'): DecodeResult {
  let png: PNG;
  try {
    png = PNG.sync.read(Buffer.from(buf));
  } catch (e) {
    return {
      ok: false,
      error: {
        code: 'READ_ERROR',
        message: `cannot read "${label}" as PNG: ${(e as Error).message}`,
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
        message: `no QR code found in ${label}`,
        hint: 'Use a sharp, uncropped image with the whole QR code and its white border.',
      },
    };
  return { ok: true, payload: qr.data };
}

/** Read the QR payload from a PNG file. Returns an error message instead of throwing. */
export function decodeQrPng(file: string): DecodeResult {
  if (!file || !file.trim())
    return {
      ok: false,
      error: {
        code: 'EMPTY',
        message: 'No image file given',
        hint: 'Pass the path to a PNG file, e.g. vn-skills vietqr decode qr.png.',
      },
    };
  let bytes: Buffer;
  try {
    bytes = readFileSync(file);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT')
      return {
        ok: false,
        error: { code: 'READ_ERROR', message: `File "${file}" not found`, hint: 'Check the path.' },
      };
    return {
      ok: false,
      error: {
        code: 'READ_ERROR',
        message: `cannot read "${file}": ${(e as Error).message}`,
        hint: 'Check the path and permissions.',
      },
    };
  }
  return decodeQrBuffer(bytes, file);
}
