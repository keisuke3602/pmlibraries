// Converts the WordPress.com export in wp-export/*.json into Markdown files
// under src/content/. Re-runnable: output directories are regenerated.
import fs from 'node:fs';
import path from 'node:path';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, 'wp-export', f), 'utf8'));

const posts = read('posts.json').posts;
const pages = read('pages.json').posts;
const comments = read('comments.json').comments;

const SITE_HOSTS = /^https?:\/\/(?:www\.)?(?:pmlibraries\.com|pmlibraries\.wordpress\.com)/i;

// Some posts were re-dated or re-slugged after other posts linked to them, and
// WordPress silently redirected. Resolve such links by slug instead.
const slugKey = (s) => s.replace(/￼/g, '').replace(/\/$/, '');
const postBySlug = new Map();
for (const p of posts) {
  const permalink = safeDecode(new URL(p.URL).pathname);
  postBySlug.set(slugKey(permalink.split('/').at(-2)), permalink);
}

// Same-site URL -> decoded root-relative path. Uploads keep their path, query dropped.
function localizeUrl(url, currentPath) {
  if (!url) return url;
  url = url.replace(/&#038;|&amp;/g, '&');
  if (!SITE_HOSTS.test(url)) return url;
  const u = new URL(url.replace(/^http:/, 'https:'));
  let p = safeDecode(u.pathname);
  if (p.startsWith('/wp-content/uploads/')) return encodeURI(p);
  const dated = p.match(/^\/\d{4}\/\d{2}\/\d{2}\/([^/]+)\/?$/);
  if (dated && postBySlug.has(slugKey(dated[1]))) p = postBySlug.get(slugKey(dated[1]));
  const hash = u.hash ? safeDecode(u.hash) : '';
  if (currentPath && p === currentPath && hash) return hash;
  // A table of contents built before its own post was re-slugged points at the old URL.
  if (currentPath && dated && hash && !postBySlug.has(slugKey(dated[1]))) return hash;
  if (u.searchParams.get('p') || u.searchParams.get('page_id')) return '/';
  return encodeURI(p) + hash;
}

// Images redrawn after the move, in place of the low-resolution originals.
const imageOverrides = {
  '/wp-content/uploads/2021/12/productmanager.png': '/images/pm-roles-and-skills/business-tech-ux.jpeg',
  '/wp-content/uploads/2021/12/productmangementtriangle-1.png': '/images/pm-roles-and-skills/product-management-triangle.png',
  '/wp-content/uploads/2021/12/productmanagercareerpaths.png': '/images/pm-roles-and-skills/career-paths.png',
};

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

function makeTurndown(currentPath, tocAnchors = new Map()) {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
  });
  td.use(gfm);

  td.remove(['script', 'style', 'svg', 'noscript', 'form']);
  const dropClasses = [
    'wp-block-jetpack-subscriptions',
    'wp-block-jetpack-contact-form',
    'wp-block-jetpack-donations',
    'wp-block-premium-content-container',
    'sharedaddy',
    'jp-relatedposts',
  ];
  td.addRule('drop-wp-widgets', {
    filter: (n) => n.nodeType === 1 && dropClasses.some((c) => n.classList?.contains(c)),
    replacement: () => '',
  });

  td.addRule('embed', {
    filter: (n) => n.nodeName === 'FIGURE' && n.classList.contains('wp-block-embed'),
    replacement: (_c, n) => {
      const iframe = n.querySelector('iframe');
      const wrapper = n.querySelector('.wp-block-embed__wrapper');
      const link = n.querySelector('a[href]');
      let url = (wrapper?.textContent || '').trim().split(/\s+/)[0];
      if (!/^https?:/.test(url)) url = link?.getAttribute('href') || '';
      if (n.classList.contains('wp-block-embed-youtube')) {
        const src = (iframe?.getAttribute('src') || '').replace(/&#038;|&amp;/g, '&');
        const id = src.match(/embed\/([\w-]+)/)?.[1] || url.match(/(?:v=|youtu\.be\/)([\w-]+)/)?.[1];
        if (id) {
          return `\n\n<div class="video"><iframe src="https://www.youtube.com/embed/${id}" title="YouTube video" loading="lazy" allowfullscreen></iframe></div>\n\n`;
        }
      }
      if (n.classList.contains('wp-block-embed-twitter')) {
        const text = (n.querySelector('blockquote p')?.textContent || '').trim();
        return `\n\n> ${text ? text.replace(/\n+/g, ' ') + '\n>\n> ' : ''}— [X (Twitter)](${url})\n\n`;
      }
      return url ? `\n\n[${url}](${url})\n\n` : '';
    },
  });

  // Raw HTML so the WordPress ids survive; the in-post tables of contents link to them.
  // A few headings lost their id in WordPress; recover it from the matching TOC entry.
  td.addRule('heading-with-id', {
    filter: (n) => {
      if (!/^H[1-6]$/.test(n.nodeName)) return false;
      if (!n.getAttribute('id') && tocAnchors.has(n.textContent.trim())) {
        n.setAttribute('id', tocAnchors.get(n.textContent.trim()));
      }
      return !!n.getAttribute('id');
    },
    replacement: (_c, n) => {
      const inner = n.innerHTML
        .replace(/href="([^"]+)"/g, (_m, h) => `href="${localizeUrl(h, currentPath)}"`)
        .replace(/\s*\n\s*/g, ' ')
        .trim();
      if (!inner) return '';
      return `\n\n<${n.nodeName.toLowerCase()} id="${n.getAttribute('id')}">${inner}</${n.nodeName.toLowerCase()}>\n\n`;
    },
  });

  td.addRule('image', {
    filter: 'img',
    replacement: (_c, n) => {
      let src = localizeUrl(n.getAttribute('src') || '', currentPath);
      if (!src) return '';
      src = imageOverrides[src] ?? src;
      const alt = (n.getAttribute('alt') || '').replace(/[\[\]]/g, '');
      return `![${alt}](${src})`;
    },
  });

  td.addRule('figcaption', {
    filter: 'figcaption',
    // Raw HTML, since Markdown inside an HTML block is not parsed.
    replacement: (c, n) => (c.trim() ? `\n\n<p class="caption">${n.innerHTML.replace(/\s*\n\s*/g, ' ').trim()}</p>\n\n` : ''),
  });

  td.addRule('link', {
    filter: (n) => n.nodeName === 'A' && n.getAttribute('href'),
    replacement: (c, n) => {
      const href = localizeUrl(n.getAttribute('href'), currentPath);
      if (!c.trim()) return '';
      // Markdown links cannot carry a target, so keep WordPress's new-tab links as inline HTML.
      if (n.getAttribute('target') === '_blank') {
        return `<a href="${href.replace(/"/g, '%22')}" target="_blank" rel="noopener">${c}</a>`;
      }
      return `[${c}](${href.replace(/\)/g, '%29').replace(/ /g, '%20')})`;
    },
  });

  return td;
}

function toMarkdown(html, currentPath) {
  const tocAnchors = new Map();
  for (const [, href, text] of html.matchAll(/<a[^>]+href="([^"]*#[^"]+)"[^>]*>([^<]+)<\/a>/g)) {
    tocAnchors.set(entity(text).replace(/&nbsp;/g, ' ').trim(), safeDecode(href.split('#')[1]));
  }
  return makeTurndown(currentPath, tocAnchors)
    .turndown(html)
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

function plain(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#8230;|\[&hellip;\]/g, '…')
    .replace(/&amp;/g, '&').replace(/&#8217;/g, '’').replace(/&#[0-9]+;/g, '').replace(/\s+/g, ' ').trim();
}

const entity = (s) => s.replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function frontmatter(obj) {
  // JSON values are valid YAML, which avoids quoting surprises in titles.
  return '---\n' + Object.entries(obj).filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n') + '\n---\n\n';
}

function permalinkOf(p) {
  return safeDecode(new URL(p.URL).pathname);
}

function write(dir, file, fm, body) {
  fs.writeFileSync(path.join(dir, file), frontmatter(fm) + body);
}

const postsDir = path.join(root, 'src/content/posts');
const pagesDir = path.join(root, 'src/content/pages');
for (const d of [postsDir, pagesDir]) {
  fs.rmSync(d, { recursive: true, force: true });
  fs.mkdirSync(d, { recursive: true });
}

const commentsByPost = {};
for (const c of comments) {
  if (c.status && c.status !== 'approved') continue;
  (commentsByPost[c.post.ID] ||= []).push({
    author: entity(c.author?.name || '匿名'),
    date: c.date,
    body: toMarkdown(c.content, null).trim(),
  });
}

for (const p of posts) {
  const permalink = permalinkOf(p);
  const cats = Object.values(p.categories).map((c) => ({ name: entity(c.name), slug: safeDecode(c.slug) }));
  write(postsDir, `${p.date.slice(0, 10)}-${p.ID}.md`, {
    title: entity(p.title),
    date: p.date,
    modified: p.modified,
    permalink,
    categories: cats,
    tags: Object.values(p.tags).map((t) => ({ name: entity(t.name), slug: safeDecode(t.slug) })),
    image: p.featured_image ? localizeUrl(p.featured_image.split('?')[0]) : undefined,
    excerpt: entity(plain(p.excerpt)).slice(0, 200),
    wpId: p.ID,
    comments: (commentsByPost[p.ID] || []).sort((a, b) => a.date.localeCompare(b.date)),
  }, toMarkdown(p.content, permalink));
}

// The WordPress front page is a generated post list; the Astro index replaces it.
const contactNote = `お問い合わせ・翻訳リクエストは、[X](https://twitter.com/PMLibraries)、[Facebook](https://www.facebook.com/pmlibraries)、[LinkedIn](https://www.linkedin.com/company/pm-library/) からお気軽にご連絡ください。\n\n`;
for (const p of pages) {
  const permalink = permalinkOf(p);
  if (permalink === '/') continue;
  let body = toMarkdown(p.content, permalink);
  if (p.content.includes('wp-block-jetpack-contact-form')) body = contactNote + body;
  write(pagesDir, `${p.ID}.md`, {
    title: entity(p.title).replace(/￼/g, '').trim(),
    date: p.date,
    permalink,
    image: p.featured_image ? localizeUrl(p.featured_image.split('?')[0]) : undefined,
    wpId: p.ID,
  }, body);
}

console.log(`posts: ${posts.length}, pages: ${pages.length - 1}, comments: ${comments.length}`);
