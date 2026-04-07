#!/usr/bin/env node

/**
 * eBook generation pipeline — Markdown to EPUB and PDF.
 *
 * Usage:
 *   node ebook/build.mjs              # build both EPUB and PDF
 *   node ebook/build.mjs --epub       # EPUB only
 *   node ebook/build.mjs --pdf        # PDF only
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Marked } from "marked";
import epubGen from "epub-gen-memory";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const buildEpub = args.length === 0 || args.includes("--epub");
const buildPdf = args.length === 0 || args.includes("--pdf");

// ── Load config ──────────────────────────────────────────────────────
const config = JSON.parse(readFileSync(resolve(__dirname, "book.config.json"), "utf-8"));
const outputDir = resolve(__dirname, config.outputDir);
mkdirSync(outputDir, { recursive: true });

// ── Parse front matter + body from markdown ──────────────────────────
function parseMarkdown(filePath) {
  const raw = readFileSync(resolve(__dirname, filePath), "utf-8");
  let body = raw;
  let meta = {};

  if (raw.startsWith("---")) {
    const end = raw.indexOf("---", 3);
    if (end !== -1) {
      const frontMatter = raw.slice(3, end).trim();
      body = raw.slice(end + 3).trim();
      for (const line of frontMatter.split("\n")) {
        const colon = line.indexOf(":");
        if (colon > 0) {
          const key = line.slice(0, colon).trim();
          let val = line.slice(colon + 1).trim();
          if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
            val = val.slice(1, -1);
          }
          meta[key] = val;
        }
      }
    }
  }

  return { meta, body };
}

// ── Convert markdown to HTML ─────────────────────────────────────────
const marked = new Marked();

function mdToHtml(mdBody) {
  return marked.parse(mdBody);
}

// ── Book stylesheet ──────────────────────────────────────────────────
const bookCss = `
body {
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.7;
  color: #1a1a1a;
  max-width: 40em;
  margin: 0 auto;
  padding: 1em;
}
h1 { font-size: 2em; margin: 1.5em 0 0.5em; page-break-before: always; }
h2 { font-size: 1.5em; margin: 1.2em 0 0.4em; }
h3 { font-size: 1.2em; margin: 1em 0 0.3em; }
p { margin: 0.8em 0; text-align: justify; }
ul, ol { margin: 0.8em 0; padding-left: 1.5em; }
li { margin: 0.3em 0; }
strong { font-weight: 700; }
em { font-style: italic; }
blockquote {
  border-left: 3px solid #ccc;
  margin: 1em 0;
  padding: 0.5em 1em;
  font-style: italic;
  color: #555;
}
`;

// ── Prepare chapters ─────────────────────────────────────────────────
const chapters = config.chapters.map((ch) => {
  const { meta, body } = parseMarkdown(ch.file);
  const html = mdToHtml(body);
  return {
    title: ch.chapterTitle || meta.title || "Untitled",
    content: html,
    meta,
  };
});

console.log(`Loaded ${chapters.length} chapter(s)`);

// ── Generate cover image from HTML ───────────────────────────────────
async function generateCoverImage() {
  const coverHtmlPath = resolve(__dirname, config.cover);
  if (!existsSync(coverHtmlPath)) {
    console.log("No cover.html found, skipping cover image generation.");
    return null;
  }

  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 2400 });

    const coverHtml = readFileSync(coverHtmlPath, "utf-8");
    await page.setContent(coverHtml, { waitUntil: "networkidle0" });

    const coverPath = resolve(outputDir, "cover.png");
    await page.screenshot({ path: coverPath, type: "png" });
    await browser.close();

    console.log(`Cover image generated: ${coverPath}`);
    return coverPath;
  } catch (e) {
    console.warn(`Cover generation skipped (puppeteer unavailable): ${e.message}`);
    return null;
  }
}

// ── Build EPUB ───────────────────────────────────────────────────────
async function buildEpubFile(coverImagePath) {
  const epubOptions = {
    title: config.title,
    author: config.author,
    publisher: config.publisher || config.author,
    description: config.description || "",
    lang: config.language || "en",
    css: bookCss,
  };

  const epubContent = chapters.map((ch) => ({
    title: ch.title,
    content: ch.content,
  }));

  if (coverImagePath && existsSync(coverImagePath)) {
    epubOptions.cover = coverImagePath;
  }

  const epubBuffer = await epubGen.default(epubOptions, epubContent);
  const epubPath = resolve(outputDir, safeFilename(config.title) + ".epub");
  writeFileSync(epubPath, epubBuffer);
  console.log(`EPUB created: ${epubPath}`);
  return epubPath;
}

// ── Build PDF ────────────────────────────────────────────────────────
async function buildPdfFile(coverImagePath) {
  let puppeteer;
  try {
    puppeteer = await import("puppeteer");
  } catch {
    console.error("PDF generation requires puppeteer. Run: npm install puppeteer");
    process.exit(1);
  }

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Build full HTML document
  const tocHtml = chapters
    .map((ch, i) => `<li><a href="#chapter-${i}">${ch.title}</a></li>`)
    .join("\n");

  const chaptersHtml = chapters
    .map(
      (ch, i) =>
        `<div class="chapter" id="chapter-${i}">
          <h1>${ch.title}</h1>
          ${ch.content}
        </div>`
    )
    .join("\n");

  let coverSection = "";
  if (coverImagePath && existsSync(coverImagePath)) {
    const coverData = readFileSync(coverImagePath).toString("base64");
    coverSection = `
      <div class="cover-page">
        <img src="data:image/png;base64,${coverData}" style="width:100%;height:100%;object-fit:contain;" />
      </div>`;
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="${config.language || "en"}">
<head>
<meta charset="utf-8">
<style>
${bookCss}
@page { size: 6in 9in; margin: 0.75in; }
.cover-page { page-break-after: always; margin: 0; padding: 0; }
.cover-page img { display: block; max-height: 100vh; }
.toc { page-break-after: always; }
.toc h1 { font-size: 1.8em; }
.toc ul { list-style: none; padding: 0; }
.toc li { margin: 0.5em 0; font-size: 1.1em; }
.toc a { text-decoration: none; color: #1a1a1a; }
.chapter { page-break-before: always; }
</style>
</head>
<body>
${coverSection}
<div class="toc">
  <h1>Table of Contents</h1>
  <ul>${tocHtml}</ul>
</div>
${chaptersHtml}
</body>
</html>`;

  await page.setContent(fullHtml, { waitUntil: "networkidle0" });

  const pdfPath = resolve(outputDir, safeFilename(config.title) + ".pdf");
  await page.pdf({
    path: pdfPath,
    format: "A5",
    margin: { top: "0.75in", bottom: "0.75in", left: "0.6in", right: "0.6in" },
    printBackground: true,
    displayHeaderFooter: false,
  });

  await browser.close();
  console.log(`PDF created: ${pdfPath}`);
  return pdfPath;
}

// ── Helpers ──────────────────────────────────────────────────────────
function safeFilename(title) {
  return title
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-zA-Z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log(`Building eBook: "${config.title}"`);
  console.log(`Output directory: ${outputDir}`);

  const coverImagePath = await generateCoverImage();

  if (buildEpub) await buildEpubFile(coverImagePath);
  if (buildPdf) await buildPdfFile(coverImagePath);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
