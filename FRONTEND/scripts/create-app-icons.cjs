/* Preserve the original SE mark; regenerate with: node scripts/create-app-icons.cjs */
const path = require('path');
const sharp = require(require.resolve('sharp', { paths: [path.resolve(__dirname, '../../BACKEND'), path.resolve(__dirname, '..')] }));
const publicDir = path.resolve(__dirname, '../public');
async function main() {
  // The SE symbol occupies the left 134 × 67 pixels of the original logo.
  const mark = await sharp(path.join(publicDir, 'se-logo.png'))
    .extract({ left: 0, top: 0, width: 134, height: 67 })
    .png().toBuffer();
  for (const [size, maskable, name] of [
    [1024, false, 'se-erp-1024.png'], [512, false, 'se-erp-512.png'],
    [192, false, 'se-erp-192.png'], [512, true, 'se-erp-maskable-512.png'],
    [192, true, 'se-erp-maskable-192.png'], [180, false, 'apple-touch-icon.png'],
    [32, false, 'favicon-32.png']
  ]) {
    const width = Math.round(size * (maskable ? 0.64 : 0.76));
    const symbol = await sharp(mark).resize({ width, kernel: 'lanczos3' }).toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: '#111315' } })
      .composite([{ input: symbol, gravity: 'centre' }])
      .png().toFile(path.join(publicDir, 'icons', name));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
