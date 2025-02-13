const sharp = require('sharp');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const sourceIcon = './public/icon.png'; // je originele icoon

async function generateIcons() {
  // Maak icons directory als die niet bestaat
  if (!fs.existsSync('./public/icons')) {
    fs.mkdirSync('./public/icons', { recursive: true });
  }

  // Genereer iconen voor alle formaten
  for (const size of sizes) {
    await sharp(sourceIcon)
      .resize(size, size)
      .toFile(`./public/icons/icon-${size}x${size}.png`);
  }

  // Genereer maskable icoon (met padding)
  await sharp(sourceIcon)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toFile('./public/icons/maskable-icon-512x512.png');
}

generateIcons().catch(console.error);