/**
 * ocr-studio-core.js — the document and style model behind admin/ocr-studio.html.
 *
 * WHAT THE STUDIO IS FOR. Sarvam's layout-preserving OCR returns HTML: a
 * heading comes back as <h2>, a paragraph as <p>. tools/ocr_review_merge.py
 * already keeps that markup per block instead of flattening it to text. What
 * was missing is the half a person actually works in — seeing the digitised
 * page beside the original, and restyling the whole document from one block,
 * the way a Word style does.
 *
 * THE ONE IDEA. A block keeps TWO tags, and the distinction is the whole
 * design:
 *
 *   srcTag  what the OCR decided this block was. Never edited. It is the
 *           evidence, and it is what "every other block like this one" means.
 *   cls     what WE have decided it is. Edited freely, per block or in bulk.
 *
 * Because srcTag survives, selecting one heading and saying "all of these are
 * Heading 2" is a well-defined operation rather than a guess: the other blocks
 * the OCR tagged the same way are exactly the ones that change. And because
 * cls is separate from the style table, editing the Heading 2 style restyles
 * every block carrying it without touching a single block's own markup —
 * which is what makes it a style rather than formatting.
 *
 * PURE. No DOM, no fetch. The page is the shell; every rule about what
 * changes when you click something lives here, where it can be tested.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.dgeOcrStudio = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Which HTML tags the OCR emits as a block. Anything else it returns is
  // inline and stays inside whatever block contains it.
  const BLOCK_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote', 'pre', 'li', 'div'];

  /**
   * The style classes a person picks from, and how each renders.
   *
   * `tag` is what the class exports as, so the published HTML stays semantic —
   * a Heading 2 leaves here as an <h2>, not a <div> with big text. Everything
   * else is appearance and is safe to edit.
   */
  function defaultStyles() {
    return {
      title:     { label: 'Title',       tag: 'h1',         size: 30, weight: 700, italic: false, align: 'center', before: 0,  after: 18, indent: 0, color: '' },
      h1:        { label: 'Heading 1',   tag: 'h1',         size: 24, weight: 700, italic: false, align: 'left',   before: 20, after: 10, indent: 0, color: '' },
      h2:        { label: 'Heading 2',   tag: 'h2',         size: 20, weight: 700, italic: false, align: 'left',   before: 16, after: 8,  indent: 0, color: '' },
      h3:        { label: 'Heading 3',   tag: 'h3',         size: 17, weight: 600, italic: false, align: 'left',   before: 14, after: 6,  indent: 0, color: '' },
      body:      { label: 'Body',        tag: 'p',          size: 15, weight: 400, italic: false, align: 'left',   before: 0,  after: 10, indent: 0, color: '' },
      verse:     { label: 'Verse',       tag: 'blockquote', size: 16, weight: 400, italic: false, align: 'center', before: 10, after: 10, indent: 0, color: '' },
      commentary:{ label: 'Commentary',  tag: 'p',          size: 14, weight: 400, italic: false, align: 'left',   before: 0,  after: 8,  indent: 18, color: '' },
      colophon:  { label: 'Colophon',    tag: 'p',          size: 14, weight: 600, italic: true,  align: 'center', before: 12, after: 12, indent: 0, color: '' },
      note:      { label: 'Note',        tag: 'p',          size: 13, weight: 400, italic: true,  align: 'left',   before: 0,  after: 6,  indent: 18, color: '' }
    };
  }

  /** The class a block starts in, from the tag the OCR gave it. */
  function classify(srcTag) {
    const t = String(srcTag || '').toLowerCase();
    if (t === 'h1') return 'h1';
    if (t === 'h2') return 'h2';
    if (t === 'h3' || t === 'h4' || t === 'h5' || t === 'h6') return 'h3';
    if (t === 'blockquote') return 'verse';
    return 'body';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** The inner text of an HTML fragment, without needing a DOM. */
  function textOf(html) {
    return String(html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  /**
   * Split one page of OCR HTML into blocks.
   *
   * Deliberately a scanner over top-level tags rather than a full parser: the
   * input is machine-generated and shallow, and mirroring
   * tools/ocr_review_merge.py's _BlockSplitter keeps the browser and the merge
   * tool agreeing on what a block is. Text outside any block tag still becomes
   * a block — OCR does emit bare lines, and silently dropping them would lose
   * content with nothing to show for it.
   */
  function parseBlocks(html, page) {
    const src = String(html || '');
    const out = [];
    const re = new RegExp('<(' + BLOCK_TAGS.join('|') + ')\\b[^>]*>([\\s\\S]*?)<\\/\\1>', 'gi');
    let last = 0, m;
    const loose = (chunk) => {
      const t = textOf(chunk);
      if (t) out.push({ srcTag: 'p', html: escapeHtml(t), text: t, page: page || null });
    };
    while ((m = re.exec(src)) !== null) {
      if (m.index > last) loose(src.slice(last, m.index));
      const inner = m[2];
      const t = textOf(inner);
      if (t) out.push({ srcTag: m[1].toLowerCase(), html: inner, text: t, page: page || null });
      last = re.lastIndex;
    }
    if (last < src.length) loose(src.slice(last));
    return out.map((b, i) => Object.assign({ id: 'b' + (i + 1), cls: classify(b.srcTag) }, b));
  }

  /** Build a document from pages of OCR HTML. */
  function docFromPages(pages) {
    const blocks = [];
    (pages || []).forEach((p, pi) => {
      const html = typeof p === 'string' ? p : (p && (p.html || p.text)) || '';
      const num = (p && p.page) || pi + 1;
      parseBlocks(html, num).forEach((b) => {
        blocks.push(Object.assign({}, b, { id: 'p' + num + '_' + b.id }));
      });
    });
    return { blocks: blocks, styles: defaultStyles() };
  }

  /** Every block the OCR tagged the same way as this one. */
  function blocksLike(doc, blockId) {
    const b = (doc.blocks || []).find((x) => x.id === blockId);
    if (!b) return [];
    return doc.blocks.filter((x) => x.srcTag === b.srcTag);
  }

  /**
   * Put a block, its lookalikes, or the whole document into a class.
   *
   * `scope`:
   *   'one'  just this block
   *   'like' every block the OCR tagged the same way — the "select a header and
   *          apply it everywhere" move, and the reason srcTag is never edited
   *   'all'  every block, for the rare wholesale reset
   *
   * Returns the number of blocks changed, so the UI can say what it did rather
   * than leaving the person to scroll and check.
   */
  function applyClass(doc, blockId, cls, scope) {
    if (!doc || !doc.styles || !doc.styles[cls]) return 0;
    let targets;
    if (scope === 'all') targets = doc.blocks.slice();
    else if (scope === 'like') targets = blocksLike(doc, blockId);
    else targets = doc.blocks.filter((x) => x.id === blockId);
    let n = 0;
    targets.forEach((b) => { if (b.cls !== cls) { b.cls = cls; n++; } });
    return n;
  }

  /** How many blocks sit in each class — the style panel's counts. */
  function counts(doc) {
    const out = {};
    Object.keys((doc && doc.styles) || {}).forEach((k) => { out[k] = 0; });
    ((doc && doc.blocks) || []).forEach((b) => { out[b.cls] = (out[b.cls] || 0) + 1; });
    return out;
  }

  /** One class as a CSS rule body. */
  function ruleFor(s) {
    const parts = [
      'font-size:' + Number(s.size || 15) + 'px',
      'font-weight:' + Number(s.weight || 400),
      'font-style:' + (s.italic ? 'italic' : 'normal'),
      'text-align:' + (s.align || 'left'),
      'margin:' + Number(s.before || 0) + 'px 0 ' + Number(s.after || 0) + 'px 0',
      'padding-left:' + Number(s.indent || 0) + 'px'
    ];
    if (s.color) parts.push('color:' + s.color);
    return parts.join(';');
  }

  /** The whole style table as CSS, scoped so it cannot leak into the admin chrome. */
  function styleCss(styles, scope) {
    const sel = scope || '.doc';
    return Object.keys(styles || {})
      .map((k) => sel + ' [data-cls="' + k + '"]{' + ruleFor(styles[k]) + '}')
      .join('\n');
  }

  /**
   * The finished document, as standalone HTML.
   *
   * Each block exports under its CLASS's tag, not the tag the OCR gave it, so
   * a paragraph reclassified as a heading really leaves here as a heading. The
   * style table rides along as one <style> block — which is what makes the
   * result a styled document rather than a pile of inline attributes.
   */
  function exportHtml(doc, title) {
    const styles = doc.styles || defaultStyles();
    const body = (doc.blocks || []).map((b) => {
      const s = styles[b.cls] || styles.body;
      const tag = (s && s.tag) || 'p';
      return '<' + tag + ' data-cls="' + b.cls + '">' + b.html + '</' + tag + '>';
    }).join('\n');
    return '<!DOCTYPE html><html lang="sa"><head><meta charset="utf-8">' +
      '<title>' + escapeHtml(title || 'Digitised document') + '</title>' +
      '<style>body{max-width:44rem;margin:2rem auto;padding:0 1rem;' +
      'font-family:"Noto Serif Devanagari",serif;line-height:1.7}\n' +
      styleCss(styles, 'body') + '</style></head><body>\n' + body + '\n</body></html>';
  }

  /**
   * The shape tools/ocr_review_merge.py consumes.
   *
   * It reads `html` beside `text` per block, so the studio's decisions reach
   * the corpus through the merge path that already exists rather than a second
   * one built alongside it.
   */
  function toMergeBlocks(doc) {
    const styles = doc.styles || defaultStyles();
    return (doc.blocks || []).map((b) => {
      const s = styles[b.cls] || styles.body;
      const tag = (s && s.tag) || 'p';
      return {
        page: b.page,
        cls: b.cls,
        html: '<' + tag + ' data-cls="' + b.cls + '">' + b.html + '</' + tag + '>',
        text: b.text
      };
    });
  }

  return {
    BLOCK_TAGS, defaultStyles, classify, parseBlocks, docFromPages,
    blocksLike, applyClass, counts, ruleFor, styleCss, exportHtml,
    toMergeBlocks, textOf, escapeHtml
  };
}));
