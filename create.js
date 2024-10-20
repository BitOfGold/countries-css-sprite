import dotenv from 'dotenv';
import axios from 'axios';
import { promises as fs } from 'fs';
import * as cheerio from 'cheerio';
import path from 'path';
import sharp from 'sharp';
import tinify from 'tinify';

dotenv.config();
tinify.key = process.env.TINIFY_API_KEY;

const url = 'https://en.m.wikipedia.org/wiki/List_of_ISO_3166_country_codes';
const outputFile = 'iso_country_codes.html';
const FHEIGHT = 16;
let countries = [];


async function downloadWikiPage() {
  if (await fs.access(outputFile).then(() => true).catch(() => false)) {
    console.log(`File ${outputFile} already exists, skipping download`);
    return;
  }
  try {
    const response = await axios.get(url);
    await fs.writeFile(outputFile, response.data);
    console.log(`Successfully downloaded the page and saved it as ${outputFile}`);
  } catch (error) {
    console.error('Error downloading the page:', error.message);
  }
}

async function downloadFlags() {
  // Read the Wikipedia page
  const html = await fs.readFile(outputFile, 'utf-8');
  const $ = cheerio.load(html);

  // Extract country codes and flag URLs

  $('table.wikitable tr').each((i, elem) => {
    const tds = $(elem).find('td');
    if (tds.length > 1) {
      let code = $(tds[3]).text().trim();
      code = code.length > 2 ? code.slice(-2) : code;
      let flagUrl = '';
      const images = $(tds[0]).find('img');
      if (images.length > 0) {
        flagUrl = images.first().attr('src');
      } else {
        // Check if there's an img tag in the text content
        const textContent = $(tds[0]).text();
        const imgMatch = textContent.match(/<img.*?src="(.*?)"/);
        if (imgMatch) {
          flagUrl = imgMatch[1];
        } else {
          console.log('No flag found for', code, textContent);
        }
      }
      flagUrl = `http:${flagUrl}`;

      // Extract the full SVG URL from the thumbnail PNG URL
      flagUrl = flagUrl.replace(/\/thumb\//, '/');
      flagUrl = flagUrl.split('.svg')[0] + '.svg';
      
      console.log(code, flagUrl);
      if (code && flagUrl) {
        countries.push({ code, flagUrl });
      }
    }
  });

  //console.log(countries);

  // Create a directory for flags
  await fs.mkdir('flags', { recursive: true });

  // Download flags
  for (const country of countries) {
    const flagPath = path.join('flags', `${country.code}.svg`);
    if (await fs.access(flagPath).then(() => true).catch(() => false)) {
      console.log(`Flag for ${country.code} already exists, skipping download`);
      continue;
    }
    const response = await axios.get(country.flagUrl, { responseType: 'arraybuffer' });
    await fs.writeFile(flagPath, response.data);
    console.log(`Downloaded flag for ${country.code}`);
  }
}

async function resizeFlags() {
  const flags = await fs.readdir('flags');
  await fs.mkdir('resized_flags', { recursive: true });
  
  for (const flag of flags) {
    const image = sharp(path.join('flags', flag));
    const metadata = await image.metadata();
    const aspectRatio = metadata.width / metadata.height;
    const newWidth = Math.round(FHEIGHT * aspectRatio);
    await image
        .resize({ height: FHEIGHT, width: newWidth })
        .png()
        .toFile(path.join('resized_flags', flag.replace('.svg', '.png')));
    console.log(`Resized flag: ${flag} to ${newWidth}x${FHEIGHT}`);
  }
}

async function createSprite() {
  const flags = await fs.readdir('resized_flags');
  const flagMetadata = [];
  const rows = [];
  let currentRow = { width: 0, flags: [] };

  // Calculate rows and collect metadata
  for (const flag of flags) {
    const metadata = await sharp(path.join('resized_flags', flag)).metadata();
    const flagData = { file: flag, width: metadata.width };

    if (currentRow.width + metadata.width > 1024) {
      rows.push(currentRow);
      currentRow = { width: 0, flags: [] };
    }

    currentRow.width += metadata.width;
    currentRow.flags.push(flagData);
    flagMetadata.push(flagData);
  }

  if (currentRow.flags.length > 0) {
    rows.push(currentRow);
  }

  const totalHeight = rows.length * FHEIGHT;
  const maxWidth = Math.max(...rows.map(row => row.width));

  const sprite = sharp({
    create: {
      width: maxWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });

  const compositeOperations = [];
  let currentY = 0;

  rows.forEach(row => {
    let currentX = 0;
    row.flags.forEach(flag => {
      compositeOperations.push({
        input: path.join('resized_flags', flag.file),
        top: currentY,
        left: currentX
      });
      currentX += flag.width;
    });
    currentY += FHEIGHT;
  });

  await sprite
    .composite(compositeOperations)
    .png({ colors: 128, dither: 0 })
    .toFile('country_flags_sprite.png');

  console.log('Sprite created: country_flags_sprite.png');
  return { flagMetadata, rows };
}

async function generateCSS({ flagMetadata, rows }) {
  let css = `
.country-flag {
  display: inline-block;
  height: ${FHEIGHT}px;
  background-image: url('country_flags_sprite.png');
  background-repeat: no-repeat;
}

`;

  const groupedFlags = {};
  
  let currentY = 0;
  rows.forEach(row => {
    let currentX = 0;
    row.flags.forEach(flag => {
      const countryCode = path.parse(flag.file).name;
      if (!groupedFlags[flag.width]) {
        groupedFlags[flag.width] = [];
      }
      groupedFlags[flag.width].push({ countryCode, currentX, currentY });
      currentX += flag.width;
    });
    currentY += FHEIGHT;
  });

  Object.entries(groupedFlags).forEach(([width, flags]) => {
    const selector = flags.map(f => `.${f.countryCode}`).join(', ');
    css += `${selector} { width: ${width}px; margin-right: ${32-width}px; }\n`;
    flags.forEach(flag => {
      css += `.${flag.countryCode} { background-position: -${flag.currentX}px -${flag.currentY}px; }\n`;
    });
    css += '\n';
  });

  await fs.writeFile('country_flags.css', css);
  console.log('CSS generated: country_flags.css');
}

async function generateTestHTML() {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Country Flags Test</title>
    <link rel="stylesheet" href="country_flags.css">
    <style>
        body { background: #bbb; font-family: Arial, sans-serif; }
        .flag-container { display: inline-block; margin: 10px; text-align: center; }
        .country-code { font-size: 12px; margin-top: 5px; }
    </style>
</head>
<body>
    <h1>Country Flags Test</h1>
    <div id="flags-container">`;

  countries.forEach(({ code }) => {
    html += `
        <div class="flag-container">
            <div class="country-flag ${code}"></div>
            <div class="country-code">${code}</div>
        </div>`;
  });

  html += `
    </div>
</body>
</html>`;

  await fs.writeFile('country_flags_test.html', html);
  console.log('Test HTML generated: country_flags_test.html');
}

async function compressPNG() {
  console.log("Compressing PNG sprite...");
  
  try {
    const source = tinify.fromFile("country_flags_sprite.png");
    await source.toFile("country_flags_sprite_compressed.png");
    console.log("PNG sprite compressed successfully: country_flags_sprite_compressed.png");
    
    // Optionally, replace the original file with the compressed one
    await fs.rename("country_flags_sprite_compressed.png", "country_flags_sprite.png");
    console.log("Replaced original sprite with compressed version");
  } catch (error) {
    console.error("Error compressing PNG:", error.message);
  }
}

async function main() {
  await downloadWikiPage();
  await downloadFlags();
  await resizeFlags();
  const flagMetadata = await createSprite();
  await generateCSS(flagMetadata);
  await compressPNG();
  await generateTestHTML();
}



main().catch(console.error);
