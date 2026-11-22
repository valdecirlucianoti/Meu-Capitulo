(() => {
  const K = 'mc-leitor'; let s = { size: 20, theme: 'claro' };
  try { s = { ...s, ...JSON.parse(localStorage.getItem(K) || '{}') }; } catch (e) {}
  const apply = () => {
    document.body.dataset.theme = s.theme;
    document.documentElement.style.setProperty('--fs', s.size + 'px');
    try { localStorage.setItem(K, JSON.stringify(s)); } catch (e) {}
  };
  document.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'mais') s.size = Math.min(30, s.size + 2);
    if (a === 'menos') s.size = Math.max(14, s.size - 2);
    if (a === 'tema') s.theme = { claro: 'sepia', sepia: 'escuro', escuro: 'claro' }[s.theme];
    apply();
  });
  const bar = document.getElementById('prog');
  addEventListener('scroll', () => { const h = document.documentElement; bar.style.width = (h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1) * 100) + '%'; });
  apply();
})();
