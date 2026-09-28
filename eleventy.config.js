// Site configuration. You shouldn't need to edit this file:
// all of the words and photos live in the `content` folder.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { imageSize } from "image-size";
import Image, { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

const INPUT = "content";
const SITE_URL = "https://ciaran-commits.github.io";

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov)$/i;
const MODEL_EXT = /\.glb$/i;

// ---------- helpers ----------

const escapeHtml = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Folder of a page, relative to the content folder, e.g. "projects/humidity-house".
const pageDir = (inputPath) =>
  path.relative(INPUT, path.dirname(inputPath)).split(path.sep).join("/");

// Turn "images/photo.jpg" (relative to the page) into "/projects/x/images/photo.jpg".
function resolveSrc(src, inputPath) {
  if (/^(https?:)?\/\//.test(src) || src.startsWith("/")) return src;
  const clean = decodeURI(src).replace(/^\.\//, "");
  return "/" + path.posix.join(pageDir(inputPath), clean);
}

// Width / height of an image, so rows of photos can line up at equal heights.
function aspectRatio(src) {
  if (VIDEO_EXT.test(src)) return 9 / 16; // phone videos are usually portrait
  try {
    const dim = imageSize(fs.readFileSync(path.join(INPUT, src)));
    const turned = dim.orientation >= 5 && dim.orientation <= 8;
    return turned ? dim.height / dim.width : dim.width / dim.height;
  } catch {
    console.warn(`[portfolio] Couldn't find image: ${src}`);
    return null;
  }
}

// One row of photos/videos. A single item is shown large; several sit side by side.
function mediaRow(items, { eager = false } = {}) {
  const found = items.map((item) => ({ ...item, ar: aspectRatio(item.src) })).filter((item) => item.ar !== null);
  if (!found.length) return "";
  const count = found.length;
  const sizes = count === 1 ? "(min-width: 1320px) 1240px, 100vw" : `(min-width: 700px) ${Math.round(100 / count)}vw, 100vw`;
  const figures = found.map(({ src, alt = "", caption = "", ar }) => {
    const media = VIDEO_EXT.test(src)
      ? `<video src="${escapeHtml(src)}" autoplay muted loop playsinline preload="metadata"${alt ? ` aria-label="${escapeHtml(alt)}"` : ""}></video>`
      : `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" sizes="${sizes}"${eager ? ' loading="eager" fetchpriority="high"' : ""}>`;
    const cap = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : "";
    return `<figure class="media-item${caption ? " has-caption" : ""}" style="--ar: ${ar.toFixed(4)}">${media}${cap}</figure>`;
  });
  const rowShape = found.reduce((sum, { ar }) => sum + ar, 0);
  return `<div class="media" data-count="${count}" style="--row-ar: ${rowShape.toFixed(4)}; --gaps: ${count - 1}">${figures.join("")}</div>\n`;
}

// An interactive 3D viewer. Several models get buttons to show each one, plus "All parts".
function viewerBlock(items) {
  const models = items.map(({ src, alt }) => ({ src, name: alt || "Model" }));
  const buttons =
    models.length > 1
      ? `<div class="viewer-parts" role="group" aria-label="Show part"><button type="button" aria-pressed="true" data-part="all">All parts</button>${models
          .map((m, i) => `<button type="button" aria-pressed="false" data-part="${i}">${escapeHtml(m.name)}</button>`)
          .join("")}</div>`
      : "";
  const label = models.length > 1 ? "3D model of the parts" : `3D model: ${models[0].name}`;
  return `<figure class="viewer" data-models="${escapeHtml(JSON.stringify(models))}" aria-label="${escapeHtml(label)}"><div class="viewer-stage"><p class="viewer-status">Loading 3D model…</p><p class="viewer-hint" aria-hidden="true">Drag to rotate</p></div>${buttons}</figure>
`;
}

// Markdown: a paragraph containing only images becomes a row of photos.
// If every image in it is a .glb 3D model, it becomes a 3D viewer instead.
// Images on consecutive lines sit side by side; a blank line starts a new row.
function mediaRowsPlugin(md) {
  md.core.ruler.push("media_rows", (state) => {
    const { tokens, env } = state;
    const inputPath = env?.page?.inputPath;
    if (!inputPath) return;
    for (let i = 0; i < tokens.length - 2; i++) {
      if (tokens[i].type !== "paragraph_open" || tokens[i + 1].type !== "inline") continue;
      const kids = tokens[i + 1].children || [];
      const images = kids.filter((t) => t.type === "image");
      const onlyImages =
        images.length > 0 &&
        kids.every((t) => t.type === "image" || t.type === "softbreak" || t.type === "hardbreak" || (t.type === "text" && !t.content.trim()));
      if (!onlyImages) continue;
      const items = images.map((t) => {
        const alt = t.content || "";
        return { src: resolveSrc(t.attrGet("src"), inputPath), alt, caption: t.attrGet("title") || alt };
      });
      const block = new state.Token("html_block", "", 0);
      block.content = items.every((item) => MODEL_EXT.test(item.src)) ? viewerBlock(items) : mediaRow(items);
      tokens.splice(i, 3, block);
    }
  });
}

// All image/video files in a project's images folder, in name order.
function folderMedia(inputPath) {
  const dir = path.join(path.dirname(inputPath), "images");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXT.test(f) || VIDEO_EXT.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => resolveSrc(`images/${f}`, inputPath));
}

const isProject = (data) => /[\\/]projects[\\/][^\\/]+[\\/]project\.md$/.test(data.page.inputPath);

// ---------- configuration ----------

export default function (eleventyConfig) {
  // Name, contact links and resume file come from the top of content/home.md.
  eleventyConfig.addGlobalData("site", () => {
    const { data } = matter(fs.readFileSync(path.join(INPUT, "home.md"), "utf8"));
    return { url: SITE_URL, ...data };
  });

  // Page addresses and layouts, worked out from where each file lives.
  eleventyConfig.addGlobalData("eleventyComputed", {
    permalink: (data) => {
      const rel = pageDir(data.page.inputPath);
      if (data.draft) return false;
      if (isProject(data)) return `/${rel}/`;
      if (data.page.fileSlug === "home" && rel === "") return "/";
      return undefined;
    },
    layout: (data) => {
      if (isProject(data)) return "project.njk";
      if (data.page.fileSlug === "home" && pageDir(data.page.inputPath) === "") return "home.njk";
      return "page.njk";
    },
    // `cover` is the home page thumbnail; `hero` (optional) is the big photo at the top of the project page.
    coverSrc: (data) => {
      if (!isProject(data)) return undefined;
      if (data.cover) return resolveSrc(data.cover, data.page.inputPath);
      return folderMedia(data.page.inputPath).find((src) => IMAGE_EXT.test(src));
    },
    heroSrc: (data) => {
      if (!isProject(data)) return undefined;
      const pick = data.hero || data.cover;
      if (pick) return resolveSrc(pick, data.page.inputPath);
      return folderMedia(data.page.inputPath).find((src) => IMAGE_EXT.test(src));
    },
  });

  eleventyConfig.addCollection("projects", (api) =>
    api
      .getFilteredByGlob(`${INPUT}/projects/*/project.md`)
      .filter((p) => !p.data.draft)
      .sort((a, b) => {
        const oa = a.data.order ?? 999, ob = b.data.order ?? 999;
        if (oa !== ob) return oa - ob;
        const ya = String(a.data.year ?? ""), yb = String(b.data.year ?? "");
        if (ya !== yb) return yb.localeCompare(ya);
        return String(a.data.title).localeCompare(String(b.data.title));
      })
  );

  // Markdown settings: nice quotes/dashes, and photo rows.
  eleventyConfig.amendLibrary("md", (md) => {
    md.set({ typographer: true });
    md.use(mediaRowsPlugin);
  });

  // Template helpers used by the layouts in theme/.
  eleventyConfig.addFilter("coverImage", (src, alt = "") => (src ? mediaRow([{ src, alt }], { eager: true }) : ""));
  eleventyConfig.addFilter("hasMedia", (html = "") => /<(img|video)\b|class="viewer"/.test(html));
  eleventyConfig.addFilter("hasViewer", (html = "") => html.includes('class="viewer"'));
  eleventyConfig.addFilter("folderGallery", (inputPath, skip) => {
    const files = folderMedia(inputPath).filter((src) => src !== skip);
    let html = "";
    for (let i = 0; i < files.length; i += 2) html += mediaRow(files.slice(i, i + 2).map((src) => ({ src })));
    return html;
  });
  eleventyConfig.addFilter("metaLine", (data) => [data.client, data.year].filter(Boolean).join(" · "));
  eleventyConfig.addFilter("nextProject", (projects, url) => {
    if (!projects || projects.length < 2) return null;
    const i = projects.findIndex((p) => p.url === url);
    return projects[(i + 1) % projects.length];
  });
  eleventyConfig.addFilter("absoluteUrl", (url) => new URL(url, SITE_URL).href);

  // Preview image used when a page is shared on LinkedIn, Slack, iMessage, etc.
  eleventyConfig.addAsyncShortcode("shareImage", async (src) => {
    if (!src || !IMAGE_EXT.test(src)) return "";
    try {
      const { jpeg: [img] } = await Image(path.join(INPUT, src), {
        widths: [1200],
        formats: ["jpeg"],
        outputDir: path.join(eleventyConfig.directories.output, "img"),
        urlPath: "/img/",
      });
      return `<meta property="og:image" content="${SITE_URL}${img.url}">
  <meta property="og:image:width" content="${img.width}">
  <meta property="og:image:height" content="${img.height}">
  <meta name="twitter:card" content="summary_large_image">`;
    } catch {
      return "";
    }
  });
  eleventyConfig.addFilter("year", () => new Date().getFullYear());

  // Photos: resized and converted automatically for fast loading on phones.
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ["webp", "jpeg"],
    widths: [640, 1080, 1600, 2400],
    sharpOptions: { animated: true },
    failOnError: false,
    htmlOptions: {
      imgAttributes: { loading: "lazy", decoding: "async", sizes: "100vw" },
    },
  });

  // Files copied to the site as they are.
  eleventyConfig.addPassthroughCopy(`${INPUT}/**/*.{pdf,mp4,webm,mov,glb}`);
  eleventyConfig.addPassthroughCopy({ "theme/style.css": "style.css", "theme/favicon.svg": "favicon.svg", "theme/viewer.js": "viewer.js" });
  eleventyConfig.addWatchTarget("theme/");

  return {
    dir: { input: INPUT, includes: "../theme", layouts: "../theme/layouts", output: "_site" },
    templateFormats: ["md"],
    markdownTemplateEngine: false,
  };
}
