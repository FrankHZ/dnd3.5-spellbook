import fs from "node:fs";
import path from "node:path";
import iconv from "iconv-lite";
import * as cheerio from "cheerio";

type Options = {
  inputDir: string;
  outputDir: string;
  globRe: RegExp;
  assumeGb2312: boolean;
  keepOnlyContent: boolean;
  stripAttrs: boolean;
  dropEmptySpans: boolean;
  removeMsoParagraphNoise: boolean;
};

const DEFAULTS: Options = {
  inputDir: "",
  outputDir: "",
  globRe: /^.+\.html?$/i,
  assumeGb2312: true,
  keepOnlyContent: true,
  stripAttrs: true,
  dropEmptySpans: true,
  removeMsoParagraphNoise: true,
};

function readHtmlFile(filePath: string, assumeGb2312: boolean): string {
  const buf = fs.readFileSync(filePath);
  if (!assumeGb2312) return buf.toString("utf-8");
  // CHM exports often are GB2312/GBK; iconv-lite supports "gb2312"
  return iconv.decode(buf, "gb2312");
}

function writeHtmlFile(filePath: string, html: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, html, "utf-8");
}

function stripAttributes($: cheerio.CheerioAPI) {
  // Remove most Word/CHM noise attributes
  const ATTRS_TO_REMOVE = [
    "style",
    "class",
    "lang",
    "width",
    "height",
    "border",
    "cellspacing",
    "cellpadding",
    "align",
    "valign",
  ];

  $("*").each((_, el) => {
    for (const a of ATTRS_TO_REMOVE) {
      $(el).removeAttr(a);
    }
  });

  // Keep table structural attrs if you want (optional) — currently removed.
}

function dropEmptyOrUselessSpans($: cheerio.CheerioAPI) {
  $("span").each((_, el) => {
    const $el = $(el);
    const text = $el
      .text()
      .replace(/\u00A0/g, " ")
      .trim();
    const hasMeaningfulChildren = $el.children().length > 0;

    // If span is just a wrapper with no attrs (already stripped) and no meaningful text, drop it
    if (!hasMeaningfulChildren && text === "") {
      $el.remove();
      return;
    }

    // Unwrap spans that are just wrappers (no attrs after stripping)
    // This keeps inner text but removes the tag.
    if ($el[0] && Object.keys($el[0].attribs || {}).length === 0) {
      // Preserve if it's inside <b>/<i> etc? Unwrap is still fine.
      $el.replaceWith($el.contents());
    }
  });
}

function removeMsoNoiseParagraphs($: cheerio.CheerioAPI) {
  // Remove paragraphs that are only &nbsp; or whitespace
  $("p").each((_, el) => {
    const t = $(el)
      .text()
      .replace(/\u00A0/g, " ")
      .trim();
    if (t === "") {
      // but: keep if it contains a table? (unlikely)
      if ($(el).find("table").length === 0) $(el).remove();
    }
  });
}

function extractCoreContent($: cheerio.CheerioAPI): string {
  // Prefer WordSection1 if present; else use winchm content; else body
  const content = $("#winchm_template_content");
  if (content.length) {
    const ws = content.find(".WordSection1").first();
    if (ws.length) return ws.html() ?? "";
    return content.html() ?? "";
  }
  return $("body").html() ?? "";
}

function buildCleanDocument(innerHtml: string): string {
  // Minimal, stable wrapper; no template, no navigation.
  // Keep UTF-8 output for git.
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>chm</title>
</head>
<body>
<div id="content">
${innerHtml}
</div>
</body>
</html>
`;
}

function preprocessOne(filePath: string, outPath: string, opts: Options) {
  const raw = readHtmlFile(filePath, opts.assumeGb2312);
  const $ = cheerio.load(raw);

  let inner = opts.keepOnlyContent
    ? extractCoreContent($)
    : ($("body").html() ?? "");

  // Re-load the extracted fragment so operations are focused
  const $frag = cheerio.load(`<div id="root">${inner}</div>`);

  // Remove winchm template remnants if they leaked in
  $frag(
    "#winchm_template_top, #winchm_template_footer, #winchm_template_container",
  ).remove();

  // Optionally strip heavy attributes
  if (opts.stripAttrs) stripAttributes($frag);

  // Optional cleanups
  if (opts.removeMsoParagraphNoise) removeMsoNoiseParagraphs($frag);
  if (opts.dropEmptySpans) dropEmptyOrUselessSpans($frag);

  const cleanedInner = $frag("#root").html() ?? $frag("body").html() ?? "";

  const finalHtml = buildCleanDocument(cleanedInner);

  writeHtmlFile(outPath, finalHtml);
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const opts: Options = { ...DEFAULTS } as Options;

  const get = (k: string) => {
    const idx = args.indexOf(k);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  const inputDir = get("--in");
  const outputDir = get("--out");

  if (!inputDir || !outputDir) {
    console.error(`Usage:
npx tsx scripts/preprocess-chm-html.ts --in <inputDir> --out <outputDir> [--utf8] [--keep-body]
Defaults assume GB2312 input and keep only #winchm_template_content.
`);
    process.exit(1);
  }

  opts.inputDir = inputDir;
  opts.outputDir = outputDir;

  if (args.includes("--utf8")) opts.assumeGb2312 = false;
  if (args.includes("--keep-body")) opts.keepOnlyContent = false;
  if (args.includes("--keep-attrs")) opts.stripAttrs = false;
  if (args.includes("--keep-spans")) opts.dropEmptySpans = false;
  if (args.includes("--keep-empty-p")) opts.removeMsoParagraphNoise = false;

  return opts;
}

function scanInputHtmlFiles(inputDir: string, globRe: RegExp): string[] {
  const files: string[] = [];

  function visit(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const ent of entries) {
      const fullPath = path.join(currentDir, ent.name);
      if (ent.isDirectory()) {
        if (!ent.name.toLowerCase().endsWith(".files")) visit(fullPath);
        continue;
      }

      if (ent.isFile() && globRe.test(ent.name)) {
        files.push(fullPath);
      }
    }
  }

  visit(inputDir);
  return files.sort((a, b) => a.localeCompare(b));
}

async function main() {
  const opts = parseArgs();
  const files = scanInputHtmlFiles(opts.inputDir, opts.globRe);

  if (files.length === 0) {
    console.error("No .htm/.html files found in input dir.");
    process.exit(1);
  }

  for (const inPath of files) {
    const relativePath = path.relative(opts.inputDir, inPath);
    const outPath = path.join(opts.outputDir, relativePath);
    preprocessOne(inPath, outPath, opts);
  }

  console.log(`Processed ${files.length} files.`);
  console.log(`Input : ${path.resolve(opts.inputDir)}`);
  console.log(`Output: ${path.resolve(opts.outputDir)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
