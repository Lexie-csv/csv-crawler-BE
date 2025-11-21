#!/usr/bin/env tsx
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as pdfParse from 'pdf-parse';
import { execFile } from 'child_process';
import PdfLlmProcessor from '../services/pdf-llm-processor.service.js';
import type { ExtractedPolicyDocument } from '@csv/types';

// Load .env from several likely locations so OPENAI_API_KEY in apps/api/.env is available
import fsSync from 'fs';
import { fileURLToPath } from 'url';
// Candidates (in order): repo-root/apps/api/.env, cwd/.env, file-relative ../../.env
const fileDir = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.resolve(process.cwd(), 'apps', 'api', '.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(fileDir, '../../.env'),
];
let loadedEnv = false;
for (const p of candidates) {
  try {
    if (fsSync.existsSync(p)) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('dotenv').config({ path: p });
      console.log(`[ocr-reprocess] Loaded .env from: ${p}`);
      loadedEnv = true;
      break;
    }
  } catch (_e) {}
}
if (!loadedEnv) {
  try { require('dotenv').config(); } catch {}
}

const execFilePromise = (cmd: string, args: string[]) => new Promise<{ stdout: string; stderr: string }>((res, rej) => {
  execFile(cmd, args, { maxBuffer: 1024 * 1024 * 20 }, (err, stdout, stderr) => {
    if (err) return rej({ err, stdout, stderr } as any);
    res({ stdout: String(stdout), stderr: String(stderr) });
  });
});

async function main() {
  const source = process.argv[2] || process.env.SOURCE;
  if (!source) {
    console.error('Usage: tsx src/cli/ocr-reprocess.ts <SOURCE_NAME>');
    process.exit(1);
  }

  const downloadsDir = path.resolve(`./storage/downloads/${source.toLowerCase()}`);
  const outDir = path.resolve('./storage/pdf-crawls');
  await fs.mkdir(outDir, { recursive: true });

  const processor = new PdfLlmProcessor();

  let files: string[] = [];
  try { files = await fs.readdir(downloadsDir); } catch (e) { console.error('No downloads dir found:', downloadsDir); process.exit(1); }
  const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

  const results: ExtractedPolicyDocument[] = [];

  console.log(`Found ${pdfFiles.length} PDF(s) in ${downloadsDir}`);

    // concurrency runner
    const concurrency = 3;
    const queue: Promise<void>[] = [];

    const ocrOutDir = path.join('./storage/ocr', source);
    await fs.mkdir(ocrOutDir, { recursive: true }).catch(() => {});

    const processFile = async (f: string) => {
      const filePath = path.join(downloadsDir, f);
      console.log(`\n>> OCR+LLM processing: ${f}`);
      const safeName = f.replace(/[^a-zA-Z0-9._-]/g, '_');
      const ocrPath = path.join(ocrOutDir, `${safeName}.txt`);

      // First try extracting text via pdf-parse (fast, no OCR)
      let parsedText = '';
      try {
        const buf = await fs.readFile(filePath);
        const { PDFParse } = pdfParse as any;
        const parser = new PDFParse({ data: buf } as any);
        const textResult = await parser.getText();
        parsedText = (textResult && textResult.text) ? textResult.text : '';
        try { await parser.destroy(); } catch {}
      } catch (e) {
        console.warn('   pdf-parse failed or file is image-only:', String(e));
        parsedText = '';
      }

      // If parsed text is long enough, skip OCR
      const MIN_PARSED_TEXT = 400;
      let ocrText = '';
      if (parsedText && parsedText.length >= MIN_PARSED_TEXT) {
        console.log(`   ✓ Parsed text found (${parsedText.length} chars) — skipping OCR`);
        ocrText = parsedText;
        await fs.writeFile(ocrPath, ocrText, 'utf8').catch(() => {});
      } else {
        // We'll try OCR converting PDF -> images with Ghostscript/pdftoppm then tesseract.
        try {
          console.log('   Trying Ghostscript -> tesseract OCR pipeline...');
          // create temp dir for images
          const tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), `ocr-${safeName}-`));
          let imagesPattern: string | null = null;

          try {
            // Try gs first
            await execFilePromise('gs', ['--version']);
            // produce PNGs at 300 DPI named page-001.png page-002.png ...
            const outPattern = path.join(tmpBase, 'page-%03d.png');
            const gsArgs = ['-dSAFER', '-dBATCH', '-dNOPAUSE', '-sDEVICE=pngalpha', '-r300', `-sOutputFile=${outPattern}`, filePath];
            await execFilePromise('gs', gsArgs);
            imagesPattern = path.join(tmpBase, 'page-*.png');
          } catch (e) {
            // gs not available or failed — try pdftoppm (poppler)
            try {
              await execFilePromise('pdftoppm', ['-v']);
              const outPrefix = path.join(tmpBase, 'page');
              await execFilePromise('pdftoppm', ['-png', '-r', '300', filePath, outPrefix]);
              imagesPattern = path.join(tmpBase, 'page-*.png');
            } catch (e2) {
              // fallback: try tesseract directly on PDF (may fail on many PDFs)
              console.warn('   Ghostscript and pdftoppm unavailable or conversion failed, falling back to direct tesseract on PDF');
              try {
                const { stdout } = await execFilePromise('tesseract', [filePath, 'stdout', '-l', 'eng']);
                ocrText = stdout || '';
                await fs.writeFile(ocrPath, ocrText, 'utf8').catch(() => {});
                console.log(`   ✓ Saved OCR text (direct tesseract): ${ocrPath}`);
              } catch (e3) {
                console.warn('   direct tesseract on PDF also failed:', String(e3));
              }
            }
          }

          // If we have images, run tesseract on each and concatenate
          if (imagesPattern) {
            const imgs = (await fs.readdir(tmpBase)).filter(x => x.toLowerCase().endsWith('.png')).sort();
            for (const img of imgs) {
              const imgPath = path.join(tmpBase, img);
              try {
                const { stdout } = await execFilePromise('tesseract', [imgPath, 'stdout', '-l', 'eng']);
                if (stdout) ocrText += stdout + '\n';
              } catch (e) {
                console.warn('   tesseract failed on image', imgPath, String(e));
              }
            }
            // persist
            await fs.writeFile(ocrPath, ocrText, 'utf8').catch(() => {});
            console.log(`   ✓ Saved OCR text: ${ocrPath}`);
          }

          // cleanup tempdir
          try { await fs.rm(tmpBase, { recursive: true, force: true }); } catch {};
        } catch (err: any) {
          console.warn('   OCR pipeline failed for this file (skipping OCR):', err?.err?.message || err);
          // ensure we at least write empty file marker
          await fs.writeFile(ocrPath, ocrText, 'utf8').catch(() => {});
        }
      }
    

    try {
      const llmOut = await processor.processText(ocrText || parsedText || '', '', source);
      if (llmOut) {
        // ensure some canonical fields
        (llmOut as any).file_path = `storage/downloads/${source.toLowerCase()}/${f}`;
        results.push(llmOut as ExtractedPolicyDocument);
  console.log('   ✅ LLM returned structured JSON; saved to batch results');
  return;
      } else {
        console.log('   ↩️  LLM returned null (no structured output) — adding placeholder record');
        results.push({
          relevant: false,
          title: f,
          file_path: `storage/downloads/${source.toLowerCase()}/${f}`,
          raw_text_hash: '',
          summary: null,
        } as any);
      }
    } catch (e) {
      console.error('   ❌ Error calling LLM processor:', e);
      results.push({
        relevant: false,
        title: f,
        file_path: `storage/downloads/${source.toLowerCase()}/${f}`,
        raw_text_hash: '',
        summary: null,
      } as any);
    }
  };

  // start workers
  let idx = 0;
  const runNext = async () => {
    while (idx < pdfFiles.length) {
      const cur = idx++;
      const fname = pdfFiles[cur];
      await processFile(fname);
    }
  };

  const workers = Array.from({ length: concurrency }).map(() => runNext());
  await Promise.all(workers);

  const stamp = new Date().toISOString().replace(/:/g,'-').replace(/\..+$/,'');
  const outPath = path.join(outDir, `${source}_ocr_reprocessed_${stamp}.json`);
  await fs.writeFile(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n✅ OCR + LLM batch saved to: ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
