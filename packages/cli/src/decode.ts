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

/**
 * Largest image (width x height) decoded: 20 megapixels, enough for a 12 MP phone photo or a 4K
 * screenshot. A small PNG can declare a huge size and pngjs allocates it all before decoding
 * (249 KB at 16000x16000 took 2.8 GB), so the size is read from IHDR and checked first.
 */
export const MAX_IMAGE_PIXELS = 20_000_000;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Width and height from the IHDR chunk, which the PNG spec requires right after the signature. */
function pngSize(buf: Uint8Array): { width: number; height: number } | null {
  if (buf.length < 24 || PNG_SIGNATURE.some((b, i) => buf[i] !== b)) return null;
  if (String.fromCharCode(buf[12]!, buf[13]!, buf[14]!, buf[15]!) !== 'IHDR') return null;
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return { width: v.getUint32(16), height: v.getUint32(20) };
}

/** Read the QR payload from PNG bytes. Returns an error message instead of throwing. */
export function decodeQrBuffer(buf: Uint8Array, label = 'image'): DecodeResult {
  const size = pngSize(buf);
  if (size && size.width * size.height > MAX_IMAGE_PIXELS)
    return {
      ok: false,
      error: {
        code: 'TOO_LARGE',
        message: `${label} is ${size.width}x${size.height} pixels; the limit is ${MAX_IMAGE_PIXELS / 1_000_000} megapixels`,
        hint: 'Crop or scale the image down to the QR code before decoding.',
      },
    };
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
