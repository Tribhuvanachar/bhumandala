// js/screenshot.js
// Maps to F-016: Shloka Screenshot Card
// Renders a themed "fancy card" image (stotra name, shloka number, shloka
// text) via Canvas, matching whichever theme is currently active, so a
// shloka can be shared as a standalone image instead of just plain text.

window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['screenshot.js'] = 'v1.0';

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

async function dgeRenderShlokaCard(id) {
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (e) { /* best-effort */ }
  }

  const W = 1080, H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const style = getComputedStyle(document.body);
  const bg = style.getPropertyValue('--bg-main').trim() || '#FAF3E6';
  const accentRed = style.getPropertyValue('--accent-red').trim() || '#AE231F';
  const accentGold = style.getPropertyValue('--accent-gold').trim() || '#B9821F';
  const textColor = style.getPropertyValue('--text-sanskrit').trim() || '#9A1B1B';
  const cardBg = style.getPropertyValue('--card-bg').trim() || '#ffffff';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const pad = 60;
  ctx.fillStyle = cardBg;
  ctx.strokeStyle = accentGold;
  ctx.lineWidth = 4;
  dgeRoundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 28);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';

  const stotraTitleRaw = (typeof stotraData !== 'undefined' && stotraData && stotraData.metadata) ? stotraData.metadata.title : '';
  const stotraTitle = (typeof applyTransliteration === 'function' ? applyTransliteration(stotraTitleRaw, window.activeScript || 'devanagari') : stotraTitleRaw).replace(/<[^>]*>/g, '');
  ctx.fillStyle = accentRed;
  ctx.font = "bold 34px 'Tiro Devanagari Sanskrit', serif";
  dgeWrapCanvasText(ctx, stotraTitle, W - pad * 2 - 60).forEach((line, i) => {
    ctx.fillText(line, W / 2, pad + 80 + i * 44, W - pad * 2 - 60);
  });

  ctx.strokeStyle = accentGold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 60, pad + 140);
  ctx.lineTo(W / 2 + 60, pad + 140);
  ctx.stroke();

  ctx.fillStyle = accentGold;
  ctx.font = "600 22px 'Inter', sans-serif";
  ctx.fillText(`Shloka ${id}`, W / 2, pad + 185);

  const shlokaTextRaw = typeof getText === 'function' ? getText(id) : '';
  const shlokaText = shlokaTextRaw.replace(/<[^>]*>/g, '');
  ctx.fillStyle = textColor;
  ctx.font = "44px 'Tiro Devanagari Sanskrit', serif";
  const maxTextWidth = W - pad * 2 - 80;
  const lines = dgeWrapCanvasText(ctx, shlokaText, maxTextWidth);
  const lineHeight = 62;
  const totalTextHeight = lines.length * lineHeight;
  let startY = (H / 2) - (totalTextHeight / 2) + 40;
  lines.forEach(line => {
    ctx.fillText(line, W / 2, startY, maxTextWidth);
    startY += lineHeight;
  });

  ctx.fillStyle = accentRed;
  ctx.font = "600 20px 'Inter', sans-serif";
  ctx.fillText('🙏 ' + (document.title || 'Sarvamoola Digital Library'), W / 2, H - pad - 30);

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
