(() => {
  const root = document.documentElement;
  const colorA = document.getElementById('colorA');
  const colorB = document.getElementById('colorB');
  const boldBtn = document.getElementById('boldBtn');
  const toggleEditor = document.getElementById('toggleEditor');
  const editorBar = document.querySelector('.editor-bar');
  const toggleLevelA = document.getElementById('toggleLevelA');
  const toggleLevelB = document.getElementById('toggleLevelB');
  const toggleWorld = document.getElementById('toggleWorld');
  const worldCard = document.getElementById('worldCard');
  const exportPngBtn = document.getElementById('exportPngBtn');
  const selectionBoldBtn = document.getElementById('selectionBoldBtn');
  const exportTarget = document.getElementById('exportTarget');
  const columnA = document.getElementById('columnA');
  const columnB = document.getElementById('columnB');

  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const n = parseInt(clean.length === 3
      ? clean.split('').map(c => c + c).join('')
      : clean, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function mixWithWhite(rgb, ratio = 0.82) {
    const mix = (value) => Math.round(value * (1 - ratio) + 255 * ratio);
    return { r: mix(rgb.r), g: mix(rgb.g), b: mix(rgb.b) };
  }

  function rgbToCss(rgb) {
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  }

  function setTheme(which, value) {
    const rgb = hexToRgb(value);
    const soft = mixWithWhite(rgb, 0.82);
    root.style.setProperty(`--${which}`, value);
    root.style.setProperty(`--${which}-rgb`, `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    root.style.setProperty(`--${which}-soft`, rgbToCss(soft));
  }

  function applyLevelState(column, isOn) {
    column.classList.toggle('level-on', isOn);
    column.classList.toggle('level-off', !isOn);
  }

  function normalizeMetaInput(input) {
    const raw = input.value
      .replace(/[·ㆍ]/g, ',')
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
    input.value = raw.join(' · ');
  }

  colorA.addEventListener('input', e => setTheme('a', e.target.value));
  colorB.addEventListener('input', e => setTheme('b', e.target.value));

  toggleLevelA.addEventListener('change', e => applyLevelState(columnA, e.target.checked));
  toggleLevelB.addEventListener('change', e => applyLevelState(columnB, e.target.checked));
  toggleWorld.addEventListener('change', e => {
    worldCard.classList.toggle('is-off', !e.target.checked);
  });

  applyLevelState(columnA, true);
  applyLevelState(columnB, true);
  worldCard.classList.toggle('is-off', !toggleWorld.checked);

  boldBtn.addEventListener('click', () => {
    document.execCommand('bold', false, null);
  });

  let savedTextRange = null;

  function hideSelectionBoldButton() {
    selectionBoldBtn.classList.remove('is-visible');
    savedTextRange = null;
  }

  function updateSelectionBoldButton() {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      hideSelectionBoldButton();
      return;
    }

    const range = selection.getRangeAt(0);
    const startNode = range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : range.startContainer;
    const endNode = range.endContainer.nodeType === Node.TEXT_NODE
      ? range.endContainer.parentElement
      : range.endContainer;

    if (!startNode || !endNode) {
      hideSelectionBoldButton();
      return;
    }

    const editableStart = startNode.closest('[contenteditable="true"]');
    const editableEnd = endNode.closest('[contenteditable="true"]');

    // 한 편집 영역 안에서 선택한 텍스트에만 표시.
    // 이미지 출처(@출처)는 굵게 기능 대상에서 제외.
    if (
      !editableStart ||
      editableStart !== editableEnd ||
      editableStart.classList.contains('image-source') ||
      !exportTarget.contains(editableStart)
    ) {
      hideSelectionBoldButton();
      return;
    }

    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      hideSelectionBoldButton();
      return;
    }

    savedTextRange = range.cloneRange();

    const buttonWidth = 38;
    const buttonHeight = 34;
    const gap = 8;

    let left = rect.left + rect.width / 2 - buttonWidth / 2;
    let top = rect.top - buttonHeight - gap;

    left = Math.max(8, Math.min(left, window.innerWidth - buttonWidth - 8));

    if (top < 8) {
      top = rect.bottom + gap;
    }

    selectionBoldBtn.style.left = `${left}px`;
    selectionBoldBtn.style.top = `${top}px`;
    selectionBoldBtn.classList.add('is-visible');
  }

  document.addEventListener('selectionchange', () => {
    requestAnimationFrame(updateSelectionBoldButton);
  });

  document.addEventListener('mouseup', () => {
    requestAnimationFrame(updateSelectionBoldButton);
  });

  document.addEventListener('keyup', () => {
    requestAnimationFrame(updateSelectionBoldButton);
  });

  selectionBoldBtn.addEventListener('mousedown', e => {
    // 버튼을 누르는 순간 텍스트 선택이 풀리지 않도록 함
    e.preventDefault();

    if (!savedTextRange) return;

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedTextRange);

    document.execCommand('bold', false, null);

    selection.removeAllRanges();
    hideSelectionBoldButton();
  });

  document.addEventListener('mousedown', e => {
    if (
      e.target !== selectionBoldBtn &&
      !e.target.closest('[contenteditable="true"]')
    ) {
      hideSelectionBoldButton();
    }
  });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      const active = document.activeElement;
      if (active && active.isContentEditable) {
        e.preventDefault();
        document.execCommand('bold', false, null);
      }
    }
  });

  toggleEditor.addEventListener('click', () => {
    const collapsed = editorBar.classList.toggle('is-collapsed');
    toggleEditor.textContent = collapsed ? '편집바 펼치기' : '편집바 접기';
  });


  // 이름은 항상 한 줄 유지. 길어지면 해당 칸 안에 들어올 때까지 글자 크기를 자동 축소.
  function fitName(nameEl) {
    const isMobile = window.matchMedia('(max-width: 760px)').matches;
    const maxSize = isMobile ? 44 : 54;
    const minSize = 20;

    nameEl.style.fontSize = `${maxSize}px`;

    let size = maxSize;
    while (nameEl.scrollWidth > nameEl.clientWidth && size > minSize) {
      size -= 1;
      nameEl.style.fontSize = `${size}px`;
    }
  }

  const nameEls = [...document.querySelectorAll('.name')];

  function fitAllNames() {
    nameEls.forEach(fitName);
  }

  nameEls.forEach(nameEl => {
    nameEl.addEventListener('input', () => fitName(nameEl));
    nameEl.addEventListener('blur', () => fitName(nameEl));
  });

  const nameResizeObserver = new ResizeObserver(() => fitAllNames());
  nameEls.forEach(nameEl => nameResizeObserver.observe(nameEl));
  window.addEventListener('resize', fitAllNames);
  requestAnimationFrame(fitAllNames);

  document.querySelectorAll('.meta-inline').forEach(input => {
    normalizeMetaInput(input);

    input.addEventListener('input', () => {
      const before = input.value;
      const caret = input.selectionStart ?? before.length;
      if (!/[，,ㆍ]/.test(before)) return;

      const left = before.slice(0, caret).replace(/[，,ㆍ]/g, ' · ');
      const right = before.slice(caret).replace(/[，,ㆍ]/g, ' · ');
      input.value = left + right;
      const nextCaret = left.length;
      input.setSelectionRange(nextCaret, nextCaret);
    });

    input.addEventListener('blur', () => normalizeMetaInput(input));
    input.addEventListener('paste', () => setTimeout(() => normalizeMetaInput(input), 0));
  });

  exportPngBtn.addEventListener('click', async () => {
    const originalText = exportPngBtn.textContent;
    exportPngBtn.textContent = '저장중...';
    exportPngBtn.disabled = true;
    document.body.classList.add('exporting');
    document.body.classList.add('export-desktop');

    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      fitAllNames();

      const canvas = await html2canvas(exportTarget, {
        backgroundColor: getComputedStyle(exportTarget).backgroundColor,
        scale: 3,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: exportTarget.scrollWidth,
        windowHeight: exportTarget.scrollHeight
      });

      const link = document.createElement('a');
      link.download = 'pair-profile-sheet.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      alert('PNG 저장 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      document.body.classList.remove('exporting');
      document.body.classList.remove('export-desktop');
      requestAnimationFrame(fitAllNames);
      exportPngBtn.textContent = originalText;
      exportPngBtn.disabled = false;
    }
  });

  document.querySelectorAll('.image-slot').forEach(slot => {
    const img = slot.querySelector('img');
    const input = slot.querySelector('.image-input');
    const source = slot.querySelector('.image-source');

    const state = {
      scale: 1,
      x: 0,
      y: 0,
      minScale: 0.1,
      naturalFit: 1,
      dragging: false,
      startX: 0,
      startY: 0,
      sourceMode: 'auto'
    };

    function applyTransform() {
      img.style.transform =
        `translate(-50%, -50%) translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    }

    function fitImage() {
      if (!img.naturalWidth || !img.naturalHeight) return;
      const sw = slot.clientWidth;
      const sh = slot.clientHeight;
      const fit = Math.min(sw / img.naturalWidth, sh / img.naturalHeight);
      state.naturalFit = fit;
      state.minScale = Math.max(0.05, fit * 0.35);
      state.scale = fit;
      state.x = 0;
      state.y = 0;
      applyTransform();
    }

    function autoSourceColor() {
      if (state.sourceMode !== 'auto' || !img.naturalWidth) return;

      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const sampleW = Math.max(1, Math.floor(img.naturalWidth * 0.28));
        const sampleH = Math.max(1, Math.floor(img.naturalHeight * 0.22));
        canvas.width = sampleW;
        canvas.height = sampleH;
        ctx.drawImage(
          img,
          img.naturalWidth - sampleW,
          img.naturalHeight - sampleH,
          sampleW,
          sampleH,
          0,
          0,
          sampleW,
          sampleH
        );
        const data = ctx.getImageData(0, 0, sampleW, sampleH).data;
        let total = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          total += 0.2126 * r + 0.7152 * g + 0.0722 * b;
          count++;
        }
        const lum = total / Math.max(count, 1);

        if (lum < 90) {
          source.style.color = '#ffffff';
          source.style.textShadow = '0 1px 3px rgba(0,0,0,.55)';
        } else if (lum > 195) {
          source.style.color = '#111111';
          source.style.textShadow = '0 1px 3px rgba(255,255,255,.45)';
        } else {
          source.style.color = '#666666';
          source.style.textShadow = '0 1px 3px rgba(255,255,255,.35)';
        }
      } catch {
        source.style.color = '#ffffff';
      }
    }

    function setSourceMode(mode) {
      state.sourceMode = mode;
      if (mode === 'auto') return autoSourceColor();

      const map = {
        white: '#ffffff',
        gray: '#777777',
        black: '#111111'
      };
      source.style.color = map[mode] || '#ffffff';
      source.style.textShadow =
        mode === 'black'
          ? '0 1px 3px rgba(255,255,255,.45)'
          : '0 1px 3px rgba(0,0,0,.35)';
    }

    slot.querySelectorAll('[data-source-color]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        setSourceMode(btn.dataset.sourceColor);
      });
    });

    slot.querySelector('[data-action="upload"]').addEventListener('click', e => {
      e.stopPropagation();
      input.click();
    });

    slot.querySelector('[data-action="zoom-in"]').addEventListener('click', e => {
      e.stopPropagation();
      state.scale *= 1.12;
      applyTransform();
    });

    slot.querySelector('[data-action="zoom-out"]').addEventListener('click', e => {
      e.stopPropagation();
      state.scale = Math.max(state.minScale, state.scale / 1.12);
      applyTransform();
    });

    slot.querySelector('[data-action="reset"]').addEventListener('click', e => {
      e.stopPropagation();
      fitImage();
      autoSourceColor();
    });

    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      img.onload = () => {
        slot.classList.add('has-image');
        fitImage();
        autoSourceColor();
      };
      img.src = url;
    });

    slot.addEventListener('wheel', e => {
      if (!slot.classList.contains('has-image')) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      state.scale = Math.max(state.minScale, state.scale * factor);
      applyTransform();
    }, { passive: false });

    img.addEventListener('pointerdown', e => {
      if (!slot.classList.contains('has-image')) return;
      state.dragging = true;
      state.startX = e.clientX - state.x;
      state.startY = e.clientY - state.y;
      slot.classList.add('is-dragging');
      img.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    img.addEventListener('pointermove', e => {
      if (!state.dragging) return;
      state.x = e.clientX - state.startX;
      state.y = e.clientY - state.startY;
      applyTransform();
    });

    img.addEventListener('pointerup', e => {
      state.dragging = false;
      slot.classList.remove('is-dragging');
      try { img.releasePointerCapture(e.pointerId); } catch {}
      autoSourceColor();
    });

    img.addEventListener('pointercancel', () => {
      state.dragging = false;
      slot.classList.remove('is-dragging');
    });
  });
})();
