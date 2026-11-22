// Converte o texto do autor em HTML seguro: parágrafos, **negrito**, *itálico*, --- (quebra de cena) e ![legenda](imagem)
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
module.exports = text => esc(String(text || '')).replace(/\r/g, '').split(/\n{2,}/).map(b => {
  b = b.trim(); if (!b) return '';
  if (b === '---') return '<hr class="cena">';
  const m = b.match(/^!\[(.*?)\]\((\/uploads\/[\w.\-]+|https?:\/\/[^\s)]+)\)$/);
  if (m) return `<figure><img src="${m[2]}" alt="${m[1]}" loading="lazy">${m[1] ? `<figcaption>${m[1]}</figcaption>` : ''}</figure>`;
  b = b.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
  return `<p>${b}</p>`;
}).join('\n');
