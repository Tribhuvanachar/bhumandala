// js/screenshot.js
// Maps to F-016: Shloka Screenshot Card
// Renders a themed "fancy card" image (stotra name, shloka number, shloka
// text) via Canvas, matching whichever theme is currently active, so a
// shloka can be shared as a standalone image instead of just plain text.

window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['screenshot.js'] = 'v2.1 (Real image dimensions, no stretching)';

function dgeWrapCanvasText(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach(word => {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function dgeRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dgeLoadTemplateImage(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = path;
  });
}

// Layered gold "engraved plaque" text: a dark offset shadow (recess),
// a gold gradient body, and a thin dark edge stroke — gives a metallic,
// embossed look entirely via Canvas, no external assets needed.
function dgeDrawEmbossedGoldText(ctx, text, x, y) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText(text, x + 2, y + 3);
  ctx.restore();

  const grad = ctx.createLinearGradient(0, y - 32, 0, y + 12);
  grad.addColorStop(0, '#fff7c0');
  grad.addColorStop(0.25, '#ffe98a');
  grad.addColorStop(0.5, '#ffd54a');
  grad.addColorStop(0.75, '#c69214');
  grad.addColorStop(1, '#fff2a8');

  ctx.save();
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(255, 213, 77, 0.55)';
  ctx.shadowBlur = 14;
  ctx.fillText(text, x, y);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = '#5e3d00';
  ctx.lineWidth = 1.1;
  ctx.strokeText(text, x, y);
  ctx.restore();
}

async function dgeRenderShlokaCard(id) {
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (e) { /* best-effort */ }
  }

  const tpl = (typeof dgeGetSelectedShareTemplate === 'function')
    ? await dgeGetSelectedShareTemplate()
    : { id: 'plain', filename: null, safeZone: { x: 90, y: 260, w: 900, h: 560 }, hasBakedBranding: false };

  const templateImg = tpl.filename ? await dgeLoadTemplateImage(`images/${tpl.filename}`) : null;

  // Size the canvas to the template's REAL dimensions (read from the
  // loaded image) rather than a guessed/hardcoded size — this way a
  // newly-uploaded template of any aspect ratio is never stretched or
  // distorted to fit an assumed size.
  const W = templateImg ? templateImg.naturalWidth : 1080;
  const H = templateImg ? templateImg.naturalHeight : 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const style = getComputedStyle(document.body);
  const bg = style.getPropertyValue('--bg-main').trim() || '#FAF3E6';
  const accentGold = style.getPropertyValue('--accent-gold').trim() || '#B9821F';
  const cardBg = style.getPropertyValue('--card-bg').trim() || '#ffffff';

  const pad = 60;
  if (templateImg) {
    ctx.drawImage(templateImg, 0, 0, W, H);
  } else {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = cardBg;
    ctx.strokeStyle = accentGold;
    ctx.lineWidth = 4;
    dgeRoundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 28);
    ctx.fill();
    ctx.stroke();
  }

  ctx.textAlign = 'center';

  const zone = tpl.safeZone || { x: pad, y: pad + 80, w: W - pad * 2, h: H - pad * 2 - 160 };
  const zoneCx = zone.x + zone.w / 2;

  const stotraTitleRaw = (typeof stotraData !== 'undefined' && stotraData && stotraData.metadata) ? stotraData.metadata.title : '';
  const stotraTitle = (typeof applyTransliteration === 'function' ? applyTransliteration(stotraTitleRaw, window.activeScript || 'devanagari') : stotraTitleRaw).replace(/<[^>]*>/g, '');

  const shlokaTextRaw = typeof getText === 'function' ? getText(id) : '';
  const shlokaText = shlokaTextRaw.replace(/<[^>]*>/g, '');

  // Measure everything first so the whole block can be vertically
  // centered in the safe zone, not just horizontally.
  ctx.font = "bold 32px 'Tiro Devanagari Sanskrit', serif";
  const titleLines = dgeWrapCanvasText(ctx, stotraTitle, zone.w);
  const titleLineH = 40;

  ctx.font = "44px 'Tiro Devanagari Sanskrit', serif";
  const shlokaLines = dgeWrapCanvasText(ctx, shlokaText, zone.w);
  const shlokaLineH = 58;

  const badgeH = 40;
  const ruleGap = 26;
  const gapBeforeShloka = 22;

  const totalH = (titleLines.length * titleLineH) + ruleGap + badgeH + gapBeforeShloka + (shlokaLines.length * shlokaLineH);
  let curY = zone.y + Math.max(0, (zone.h - totalH) / 2) + titleLineH * 0.75;

  ctx.font = "bold 32px 'Tiro Devanagari Sanskrit', serif";
  titleLines.forEach(line => {
    dgeDrawEmbossedGoldText(ctx, line, zoneCx, curY);
    curY += titleLineH;
  });

  curY += ruleGap * 0.4;
  ctx.strokeStyle = 'rgba(198,146,20,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(zoneCx - 60, curY);
  ctx.lineTo(zoneCx + 60, curY);
  ctx.stroke();
  curY += ruleGap * 0.6 + 14;

  ctx.font = "600 22px 'Inter', sans-serif";
  dgeDrawEmbossedGoldText(ctx, `Shloka ${id}`, zoneCx, curY);
  curY += gapBeforeShloka + 16;

  ctx.font = "44px 'Tiro Devanagari Sanskrit', serif";
  shlokaLines.forEach(line => {
    dgeDrawEmbossedGoldText(ctx, line, zoneCx, curY);
    curY += shlokaLineH;
  });

  // Skip the footer if this template already has branding baked into
  // the artwork — drawing our own here would double it up.
  if (!tpl.hasBakedBranding) {
    ctx.font = "600 20px 'Inter', sans-serif";
    dgeDrawEmbossedGoldText(ctx, '🙏 ' + (document.title || 'Sarvamoola Digital Library'), W / 2, H - pad - 30);
  }

  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'));
}

window.downloadShlokaScreenshot = async function(id) {
  if (typeof showToast === 'function') showToast('Rendering image…');
  try {
    const blob = await dgeRenderShlokaCard(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Shloka-${id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch (e) {
    console.error('Screenshot render failed', e);
    if (typeof showToast === 'function') showToast('Could not render this image.');
  }
};

window.shareShlokaScreenshot = async function(id) {
  if (typeof showToast === 'function') showToast('Rendering image…');
  try {
    const blob = await dgeRenderShlokaCard(id);
    const file = new File([blob], `Shloka-${id}.png`, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `Shloka ${id}` });
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Shloka-${id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    if (typeof showToast === 'function') showToast("Sharing images isn't supported here — downloaded it instead.");
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    console.error('Screenshot share failed', e);
    if (typeof showToast === 'function') showToast('Could not share this image.');
  }
};
