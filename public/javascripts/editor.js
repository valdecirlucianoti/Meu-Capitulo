(() => {
  const $ = id => document.getElementById(id);
  const form = $('chapterForm');
  if (!form) return;

  const bookId = window.MEU_CAPITULO_EDITOR?.bookId || 'novo';
  const titleInput = $('chapterTitle');
  const priceInput = $('price');
  const hiddenText = $('text');
  const typeSelect = $('blockType');
  const contentInput = $('blockContent');
  const imageInput = $('blockImage');
  const imageCaption = $('imageCaption');
  const imageStatus = $('imageStatus');
  const textEditor = $('textEditor');
  const imageEditor = $('imageEditor');
  const addButton = $('addBlock');
  const cancelButton = $('cancelEdit');
  const blocksHost = $('blocks');
  const emptyState = $('emptyState');
  const blockCount = $('blockCount');
  const saveStatus = $('saveStatus');
  const preview = $('preview');
  const previewToggle = $('previewToggle');

  const help = {
    h1: 'Título principal de uma seção ou momento importante.',
    h2: 'Subtítulo para organizar partes da narrativa.',
    h3: 'Título menor para tópicos ou pequenas divisões.',
    p: 'Escreva livremente. Uma linha em branco separa parágrafos. Use **negrito**, *itálico*, `código` e [texto](https://link).',
    ul: 'Um item por linha. Você pode começar cada linha com - ou *.',
    ol: 'Um item por linha. A numeração será criada automaticamente.',
    steps: 'Um passo por linha. Use Título do passo | descrição para separar título e descrição.',
    quote: 'Um trecho marcante, fala ou pensamento em destaque.',
    'note-info': 'Informação complementar ou contexto importante.',
    'note-warn': 'Aviso ou informação que merece atenção.',
    'note-ok': 'Dica, descoberta ou informação positiva.',
    'note-err': 'Alerta crítico dentro da narrativa.',
    img: 'Envie uma imagem ou cole uma imagem com Ctrl+V.',
    code: 'Preserva espaços e quebras de linha. Útil para trechos monoespaçados.',
    table: 'Primeira linha é o cabeçalho. Separe colunas com |, ; ou Tab.',
    link: 'Formato: Texto do botão | https://endereco',
    hr: 'Insere uma linha divisória entre cenas.',
    pagebreak: 'Marca uma quebra de página para impressão.'
  };

  const labels = {
    h1:'TÍTULO PRINCIPAL', h2:'SUBTÍTULO', h3:'TÍTULO MENOR', p:'TEXTO',
    ul:'LISTA', ol:'LISTA NUMERADA', steps:'PASSO A PASSO', quote:'CITAÇÃO',
    'note-info':'INFORMAÇÃO', 'note-warn':'ATENÇÃO', 'note-ok':'DICA',
    'note-err':'ALERTA', img:'IMAGEM', code:'TEXTO MONOESPAÇADO',
    table:'TABELA', link:'LINK', hr:'DIVISOR', pagebreak:'QUEBRA DE PÁGINA'
  };

  let blocks = [];
  let editing = -1;
  let previewing = false;
  const storageKey = `mc-editor-${bookId}`;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    })[ch]);
  }

  function inline(value) {
    let s = escapeHtml(value);
    s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^\w*])\*([^\s*](?:.*?[^\s*])?)\*(?!\w)/g, '$1<em>$2</em>');
    s = s.replace(/\[([^\]\n]+)\]\((https:\/\/[^\s)]+|http:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return s;
  }

  function renderBlock(block) {
    const v = String(block.content || '');
    if (block.type === 'h1') return `<h1>${inline(v)}</h1>`;
    if (block.type === 'h2') return `<h2>${inline(v)}</h2>`;
    if (block.type === 'h3') return `<h3>${inline(v)}</h3>`;
    if (block.type === 'p') return v.split(/\n\s*\n/).filter(Boolean)
      .map(p => `<p>${inline(p).replace(/\n/g, '<br>')}</p>`).join('');
    if (block.type === 'quote') return `<blockquote>${inline(v).replace(/\n/g, '<br>')}</blockquote>`;
    if (block.type.startsWith('note-')) return `<div class="note ${block.type}">${inline(v).replace(/\n/g, '<br>')}</div>`;
    if (block.type === 'ul' || block.type === 'ol') {
      const tag = block.type;
      const items = v.split('\n').map(x => x.trim().replace(/^([-*•]|\d+[.)])\s+/, '')).filter(Boolean);
      return `<${tag}>${items.map(x => `<li>${inline(x)}</li>`).join('')}</${tag}>`;
    }
    if (block.type === 'steps') {
      const items = v.split('\n').map(x => x.trim()).filter(Boolean);
      return `<ol class="steps">${items.map(x => {
        const parts = x.split(' | ');
        return `<li><strong>${inline(parts[0])}</strong>${parts[1] ? `<br>${inline(parts.slice(1).join(' | '))}` : ''}</li>`;
      }).join('')}</ol>`;
    }
    if (block.type === 'img') {
      const url = safeImageUrl(block.url);
      if (!url) return '<p><em>Imagem indisponível</em></p>';
      return `<figure><img src="${escapeHtml(url)}" alt="${escapeHtml(block.caption || '')}">${block.caption ? `<figcaption>${inline(block.caption)}</figcaption>` : ''}</figure>`;
    }
    if (block.type === 'code') return `<pre><code>${escapeHtml(v)}</code></pre>`;
    if (block.type === 'hr') return '<hr>';
    if (block.type === 'pagebreak') return '<div class="page-break"></div>';
    if (block.type === 'link') {
      const [label, url] = v.split('|').map(x => x.trim());
      if (!/^https?:\/\//i.test(url || '')) return `<p>${inline(v)}</p>`;
      return `<p><a class="chapter-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${inline(label || url)}</a></p>`;
    }
    if (block.type === 'table') {
      const rows = v.split('\n').filter(x => x.trim()).map(line => line.split(/[|;\t]/).map(c => c.trim()));
      if (!rows.length) return '';
      return `<div class="chapter-table"><table><thead><tr>${rows[0].map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(row => `<tr>${rows[0].map((_, i) => `<td>${inline(row[i] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    return `<p>${inline(v).replace(/\n/g, '<br>')}</p>`;
  }

  function safeImageUrl(url) {
    if (typeof url !== 'string') return '';
    if (url.startsWith('/uploads/')) return url;
    if (/^https:\/\//i.test(url)) return url;
    return '';
  }

  function saveDraft() {
    const data = {
      title: titleInput.value,
      price: priceInput.value,
      blocks
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      saveStatus.textContent = 'Rascunho salvo neste dispositivo';
    } catch {
      saveStatus.textContent = 'Não foi possível salvar o rascunho local';
    }
  }

  let saveTimer;
  function scheduleSave() {
    saveStatus.textContent = 'Salvando rascunho…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 350);
  }

  function sync() {
    hiddenText.value = JSON.stringify({ version: 1, blocks });
    blockCount.textContent = `${blocks.length} ${blocks.length === 1 ? 'bloco' : 'blocos'}`;
    emptyState.hidden = blocks.length > 0;
    renderList();
    if (previewing) renderPreview();
    scheduleSave();
  }

  function renderList() {
    blocksHost.querySelectorAll('.editor-block').forEach(el => el.remove());
    blocks.forEach((block, index) => {
      const card = document.createElement('article');
      card.className = 'editor-block' + (editing === index ? ' selected' : '');
      const top = document.createElement('div');
      top.className = 'editor-block-top';
      const type = document.createElement('span');
      type.className = 'editor-block-type';
      type.textContent = `${String(index + 1).padStart(2, '0')} · ${labels[block.type] || 'BLOCO'}`;
      const actions = document.createElement('div');
      actions.className = 'editor-block-actions';
      const controls = [
        ['↑', () => move(index, -1), index === 0],
        ['↓', () => move(index, 1), index === blocks.length - 1],
        ['Editar', () => beginEdit(index), false],
        ['Duplicar', () => duplicate(index), false],
        ['Excluir', () => remove(index), false]
      ];
      controls.forEach(([label, fn, disabled]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.disabled = disabled;
        button.addEventListener('click', fn);
        actions.append(button);
      });
      top.append(type, actions);
      const body = document.createElement('div');
      body.className = 'editor-block-content';
      body.innerHTML = renderBlock(block);
      card.append(top, body);
      blocksHost.append(card);
    });
  }

  function renderPreview() {
    preview.innerHTML = blocks.map(renderBlock).join('') || '<p>Adicione blocos para visualizar o capítulo.</p>';
  }

  function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    sync();
  }

  function duplicate(index) {
    blocks.splice(index + 1, 0, { ...blocks[index] });
    sync();
  }

  function remove(index) {
    if (!confirm('Excluir este bloco?')) return;
    blocks.splice(index, 1);
    if (editing === index) endEdit();
    else if (editing > index) editing--;
    sync();
  }

  function beginEdit(index) {
    const block = blocks[index];
    editing = index;
    typeSelect.value = block.type;
    updateComposer();
    contentInput.value = block.content || '';
    imageCaption.value = block.caption || '';
    addButton.textContent = 'Salvar alteração';
    cancelButton.hidden = false;
    if (block.type === 'img') imageStatus.textContent = block.url || 'Selecione outra imagem para substituir.';
    syncSelectionOnly();
    contentInput.focus();
  }

  function syncSelectionOnly() {
    blocksHost.querySelectorAll('.editor-block').forEach((el, i) => {
      el.classList.toggle('selected', i === editing);
    });
  }

  function endEdit() {
    editing = -1;
    addButton.textContent = '+ Adicionar bloco';
    cancelButton.hidden = true;
    contentInput.value = '';
    imageCaption.value = '';
    imageInput.value = '';
    imageStatus.textContent = 'PNG, JPG, GIF ou WEBP. Máximo de 5 MB.';
    syncSelectionOnly();
  }

  function updateComposer() {
    const type = typeSelect.value;
    $('blockHelp').textContent = help[type] || '';
    const isImage = type === 'img';
    textEditor.hidden = isImage || type === 'hr' || type === 'pagebreak';
    imageEditor.hidden = !isImage;
    contentInput.placeholder = type === 'table'
      ? 'Nome | Descrição\nItem 1 | Descrição do item'
      : type === 'steps'
        ? 'Primeiro passo | Descrição\nSegundo passo | Descrição'
        : 'Escreva o conteúdo deste bloco...';
  }

  async function uploadImage(file) {
    if (!file) return null;
    const data = new FormData();
    data.append('imagem', file);
    imageStatus.textContent = 'Enviando imagem…';
    const response = await fetch('/upload', { method: 'POST', body: data });
    const result = await response.json();
    if (!response.ok || !result.url) throw new Error(result.erro || 'Falha no envio.');
    imageStatus.textContent = 'Imagem enviada.';
    return result.url;
  }

  async function commitBlock() {
    const type = typeSelect.value;
    let block;
    if (type === 'img') {
      let url = editing >= 0 && blocks[editing].type === 'img' ? blocks[editing].url : '';
      if (imageInput.files[0]) url = await uploadImage(imageInput.files[0]);
      if (!url) {
        imageStatus.textContent = 'Escolha uma imagem antes de adicionar o bloco.';
        return;
      }
      block = { type, url, caption: imageCaption.value.trim() };
    } else {
      block = { type, content: contentInput.value };
      if (!['hr', 'pagebreak'].includes(type) && !contentInput.value.trim()) {
        contentInput.focus();
        return;
      }
    }
    if (editing >= 0) blocks[editing] = block;
    else blocks.push(block);
    endEdit();
    sync();
  }

  typeSelect.addEventListener('change', () => {
    if (editing >= 0 && !confirm('Trocar o tipo descarta o conteúdo em edição. Continuar?')) {
      typeSelect.value = blocks[editing].type;
      return;
    }
    if (editing >= 0) endEdit();
    updateComposer();
  });
  addButton.addEventListener('click', async () => {
    try { await commitBlock(); }
    catch (err) { imageStatus.textContent = err.message; }
  });
  cancelButton.addEventListener('click', endEdit);
  titleInput.addEventListener('input', scheduleSave);
  priceInput.addEventListener('input', scheduleSave);
  previewToggle.addEventListener('click', () => {
    previewing = !previewing;
    blocksHost.hidden = previewing;
    preview.hidden = !previewing;
    previewToggle.textContent = previewing ? 'Voltar ao editor' : 'Pré-visualizar';
    if (previewing) renderPreview();
  });

  document.addEventListener('paste', async event => {
    const item = [...(event.clipboardData?.items || [])].find(x => x.type.startsWith('image/'));
    if (!item) return;
    const file = item.getAsFile();
    if (!file) return;
    event.preventDefault();
    try {
      const url = await uploadImage(file);
      blocks.push({ type: 'img', url, caption: '' });
      sync();
    } catch (err) {
      imageStatus.textContent = err.message;
    }
  });

  form.addEventListener('submit', event => {
    if (!blocks.length) {
      event.preventDefault();
      alert('Adicione pelo menos um bloco ao capítulo.');
      return;
    }
    hiddenText.value = JSON.stringify({ version: 1, blocks });
    try { localStorage.removeItem(storageKey); } catch {}
  });

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!confirm('Encontramos um rascunho local deste capítulo. Deseja recuperá-lo?')) return;
      titleInput.value = data.title || '';
      priceInput.value = data.price ?? '0';
      blocks = Array.isArray(data.blocks) ? data.blocks : [];
      sync();
    } catch {}
  }

  updateComposer();
  restoreDraft();
  sync();
})();
