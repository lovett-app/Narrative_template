(() => {
  const root = document.documentElement;
  const colorA = document.getElementById('colorA');
  const colorB = document.getElementById('colorB');
  const boldBtn = document.getElementById('boldBtn');
  const toggleEditor = document.getElementById('toggleEditor');
  const editorBar = document.querySelector('.editor-bar');
  const toggleLevelA = document.getElementById('toggleLevelA');
  const toggleLevelB = document.getElementById('toggleLevelB');
  const toggleBubbleA = document.getElementById('toggleBubbleA');
  const toggleBubbleB = document.getElementById('toggleBubbleB');
  const bubbleA = document.getElementById('bubbleA');
  const bubbleB = document.getElementById('bubbleB');
  const toggleWorld = document.getElementById('toggleWorld');
  const worldCard = document.getElementById('worldCard');
  const exportPngBtn = document.getElementById('exportPngBtn');
  const saveDataBtn = document.getElementById('saveDataBtn');
  const loadDataBtn = document.getElementById('loadDataBtn');
  const loadDataInput = document.getElementById('loadDataInput');
  const dataStatus = document.getElementById('dataStatus');
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

  function applyBubbleState(bubble, isOn) {
    bubble.classList.toggle('is-off', !isOn);
  }

  toggleBubbleA.addEventListener('change', e => applyBubbleState(bubbleA, e.target.checked));
  toggleBubbleB.addEventListener('change', e => applyBubbleState(bubbleB, e.target.checked));

  toggleWorld.addEventListener('change', e => {
    worldCard.classList.toggle('is-off', !e.target.checked);
  });

  applyLevelState(columnA, true);
  applyLevelState(columnB, true);
  applyBubbleState(bubbleA, toggleBubbleA.checked);
  applyBubbleState(bubbleB, toggleBubbleB.checked);
  worldCard.classList.toggle('is-off', !toggleWorld.checked);

  function normalizeUnboldedText(rootEl) {
    if (!rootEl) return;

    // 브라우저가 기존 <strong>/<b> 안의 일부를 굵게 해제할 때
    // <span style="font-weight: normal"> 형태를 만들 수 있다.
    // 이 경우 부모의 테마색을 상속하지 않도록 검정으로 명시한다.
    rootEl.querySelectorAll('span[style]').forEach(span => {
      const weight = String(span.style.fontWeight || '').trim().toLowerCase();

      if (weight === 'normal' || weight === '400') {
        span.style.color = 'var(--ink)';
      } else if (span.style.color) {
        span.style.removeProperty('color');
      }
    });
  }

  function toggleBoldAtSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const node = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentElement
      : range.commonAncestorContainer;
    const editable = node?.closest?.('[contenteditable="true"]');

    document.execCommand('bold', false, null);

    if (editable) {
      requestAnimationFrame(() => normalizeUnboldedText(editable));
    }
  }

  boldBtn.addEventListener('click', () => {
    toggleBoldAtSelection();
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

    toggleBoldAtSelection();

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
        toggleBoldAtSelection();
      }
    }
  });

  toggleEditor.addEventListener('click', () => {
    const collapsed = editorBar.classList.toggle('is-collapsed');
    toggleEditor.textContent = collapsed ? '펼치기' : '접기';
  });


  // 이름은 항상 한 줄 유지. 길어지면 해당 칸 안에 들어올 때까지 글자 크기를 자동 축소.
  const nameEls = [...document.querySelectorAll('.name')];

  // A/B 이름은 둘 중 긴 이름을 기준으로 같은 글자 크기를 사용한다.
  // 둘 다 한 줄에 들어가는 한 가장 큰 공통 크기를 유지한다.
  function fitAllNames() {
    const isMobile = window.matchMedia('(max-width: 760px)').matches;
    const maxSize = isMobile ? 40 : 54;
    const minSize = 20;

    let size = maxSize;

    nameEls.forEach(nameEl => {
      nameEl.style.fontSize = `${size}px`;
      nameEl.style.whiteSpace = 'nowrap';
    });

    while (
      nameEls.some(nameEl => nameEl.scrollWidth > nameEl.clientWidth) &&
      size > minSize
    ) {
      size -= 1;
      nameEls.forEach(nameEl => {
        nameEl.style.fontSize = `${size}px`;
      });
    }
  }

  nameEls.forEach(nameEl => {
    nameEl.addEventListener('input', fitAllNames);
    nameEl.addEventListener('blur', fitAllNames);
  });

  const nameResizeObserver = new ResizeObserver(() => fitAllNames());
  nameEls.forEach(nameEl => nameResizeObserver.observe(nameEl));
  window.addEventListener('resize', fitAllNames);
  requestAnimationFrame(fitAllNames);

  // 일반 붙여넣기도 Ctrl+Shift+V처럼 처리:
  // 외부 HTML/폰트/색/크기를 가져오지 않고 현재 페어틀 서식만 사용한다.
  document.addEventListener('paste', e => {
    const editable = e.target.closest?.('[contenteditable="true"]');
    if (!editable) return;

    e.preventDefault();

    const plain = (e.clipboardData || window.clipboardData)
      ?.getData('text/plain') ?? '';

    const escaped = plain
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r\n|\r|\n/g, '<br>');

    document.execCommand('insertHTML', false, escaped);

    if (editable.classList.contains('name')) {
      requestAnimationFrame(fitAllNames);
    }
  });

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

    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      /*
       * 모바일 PNG 저장 핵심:
       * 실제 화면 DOM을 desktop 클래스로 늘리지 않는다.
       * html2canvas가 만드는 복제 문서의 viewport만 1536px로 지정해
       * 그 복제본 안에서 데스크톱(3열) CSS가 적용되도록 한다.
       */
      const EXPORT_WINDOW_WIDTH = 1536;
      const EXPORT_SCALE = window.innerWidth <= 760 ? 2 : 3;

      const canvas = await html2canvas(exportTarget, {
        backgroundColor: getComputedStyle(exportTarget).backgroundColor,
        scale: EXPORT_SCALE,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: EXPORT_WINDOW_WIDTH,
        windowHeight: Math.max(3600, document.documentElement.scrollHeight),
        onclone: (clonedDocument) => {
          const clonedBody = clonedDocument.body;
          const clonedTarget = clonedDocument.getElementById('exportTarget');

          // 편집용 UI 숨김
          clonedBody.classList.add('exporting');

          // 과거 모바일 저장용 강제 클래스가 복제본에 남지 않도록 제거
          clonedBody.classList.remove('export-desktop');

          // 캡처 순간 transition 때문에 중간 높이가 잡히는 현상 방지
          const style = clonedDocument.createElement('style');
          style.textContent = `
            *, *::before, *::after {
              animation: none !important;
              transition: none !important;
              caret-color: transparent !important;
            }

            /* 복제 문서에서는 모바일 편집 UI가 아닌 원래 3열 결과물 크기 사용 */
            #exportTarget {
              width: 1468px !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 34px 34px 38px !important;
            }

            #exportTarget .sheet {
              width: 1400px !important;
              max-width: none !important;
              margin: 0 !important;
            }
          `;
          clonedDocument.head.appendChild(style);

          // 모바일에서 자동축소되어 inline font-size가 남은 이름을
          // 데스크톱 폭 기준으로 다시 계산
          const clonedNames = [...clonedDocument.querySelectorAll('.name')];
          let clonedNameSize = 54;
          const clonedNameMinSize = 20;

          clonedNames.forEach(nameEl => {
            nameEl.style.fontSize = `${clonedNameSize}px`;
            nameEl.style.whiteSpace = 'nowrap';
          });

          while (
            clonedNames.some(nameEl => nameEl.scrollWidth > nameEl.clientWidth) &&
            clonedNameSize > clonedNameMinSize
          ) {
            clonedNameSize -= 1;
            clonedNames.forEach(nameEl => {
              nameEl.style.fontSize = `${clonedNameSize}px`;
            });
          }

          // 편집 포커스/선택 표시가 PNG에 남지 않게 처리
          clonedDocument.querySelectorAll('[contenteditable="true"]').forEach(el => {
            el.blur?.();
          });

          if (clonedTarget) {
            clonedTarget.scrollTop = 0;
            clonedTarget.scrollLeft = 0;
          }
        }
      });

      const link = document.createElement('a');
      link.download = 'pair-profile-sheet.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      alert('PNG 저장 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      exportPngBtn.textContent = originalText;
      exportPngBtn.disabled = false;
    }
  });


  // ─────────────────────────────────────────
  // 해시태그 추가 / 삭제
  // ─────────────────────────────────────────
  function focusTagText(chip, selectAll = false) {
    const textNode = [...chip.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
    if (!textNode) return;

    chip.focus();

    const range = document.createRange();
    if (selectAll) {
      range.selectNodeContents(textNode);
    } else {
      range.setStart(textNode, textNode.textContent.length);
      range.collapse(true);
    }

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function createTagChip(row, text = '#새태그', selectAll = true) {
    if (!row) return null;

    const chip = document.createElement('span');
    chip.textContent = text.startsWith('#') ? text : `#${text}`;
    row.appendChild(chip);
    decorateTagRow(row);

    requestAnimationFrame(() => focusTagText(chip, selectAll));
    return chip;
  }

  function decorateTagRow(row) {
    if (!row) return;

    [...row.children].forEach(chip => {
      if (chip.classList.contains('tag-chip-ready')) return;

      chip.classList.add('tag-chip-ready');
      chip.setAttribute('contenteditable', 'true');
      chip.setAttribute('spellcheck', 'false');

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'tag-delete no-export';
      del.textContent = '×';
      del.setAttribute('contenteditable', 'false');
      del.setAttribute('aria-label', '태그 삭제');

      del.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
      });

      del.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        chip.remove();
      });

      // 쉼표 입력 = 현재 태그 확정 + 바로 다음 태그 생성
      chip.addEventListener('keydown', e => {
        if (e.key !== ',' || e.ctrlKey || e.metaKey || e.altKey) return;

        e.preventDefault();

        const textNode = [...chip.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
        if (textNode) {
          textNode.textContent = textNode.textContent.replace(/,+$/g, '').trim();
          if (textNode.textContent && !textNode.textContent.startsWith('#')) {
            textNode.textContent = `#${textNode.textContent}`;
          }
        }

        createTagChip(row, '#새태그', true);
      });

      chip.appendChild(del);
    });
  }

  function cleanTagHtml(row) {
    const clone = row.cloneNode(true);
    clone.querySelectorAll('.tag-delete').forEach(btn => btn.remove());
    clone.querySelectorAll('[contenteditable]').forEach(el => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
    });
    clone.querySelectorAll('.tag-chip-ready').forEach(el => {
      el.classList.remove('tag-chip-ready');
    });
    return clone.innerHTML;
  }

  function restoreTagHtml(row, html) {
    if (!row) return;
    row.innerHTML = html || '';
    decorateTagRow(row);
  }

  const tagRowA = document.querySelector('#columnA .tag-row');
  const tagRowB = document.querySelector('#columnB .tag-row');

  decorateTagRow(tagRowA);
  decorateTagRow(tagRowB);

  document.querySelectorAll('[data-tag-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.dataset.tagAdd === 'a' ? tagRowA : tagRowB;
      createTagChip(row, '#새태그', true);
    });
  });

  const imageSlotApis = new Map();

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
      sourceMode: 'white',
      locked: false
    };

    const sourceColorTools = slot.querySelector('.source-color-tools');
    const lockBtn = document.createElement('button');
    lockBtn.type = 'button';
    lockBtn.dataset.action = 'lock';
    lockBtn.className = 'image-lock-btn';
    lockBtn.textContent = '🔒';
    lockBtn.title = '이미지 잠금/해제';

    if (sourceColorTools) {
      sourceColorTools.before(lockBtn);
    } else {
      slot.querySelector('.image-tools')?.appendChild(lockBtn);
    }

    function updateLockUi() {
      slot.classList.toggle('image-locked', state.locked);
      lockBtn.textContent = state.locked ? '🔓' : '🔒';
      lockBtn.classList.toggle('is-locked', state.locked);
    }

    lockBtn.addEventListener('click', e => {
      e.stopPropagation();
      state.locked = !state.locked;
      updateLockUi();
    });

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
      if (mode === 'auto') mode = 'white'; // 구버전 데이터 호환
      state.sourceMode = mode;

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
      if (state.locked) return;
      state.scale *= 1.12;
      applyTransform();
    });

    slot.querySelector('[data-action="zoom-out"]').addEventListener('click', e => {
      e.stopPropagation();
      if (state.locked) return;
      state.scale = Math.max(state.minScale, state.scale / 1.12);
      applyTransform();
    });

    slot.querySelector('[data-action="reset"]').addEventListener('click', e => {
      e.stopPropagation();
      if (state.locked) return;
      fitImage();
    });

    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;

      // 데이터 파일 안에 이미지까지 함께 저장할 수 있도록
      // blob URL이 아니라 data URL로 읽는다.
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          slot.classList.add('has-image');
          fitImage();
          setSourceMode(state.sourceMode);
        };
        img.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    });

    slot.addEventListener('wheel', e => {
      if (!slot.classList.contains('has-image')) return;
      if (state.locked) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      state.scale = Math.max(state.minScale, state.scale * factor);
      applyTransform();
    }, { passive: false });

    img.addEventListener('pointerdown', e => {
      if (!slot.classList.contains('has-image')) return;
      if (state.locked) return;
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
      setSourceMode(state.sourceMode);
    });

    img.addEventListener('pointercancel', () => {
      state.dragging = false;
      slot.classList.remove('is-dragging');
    });

    imageSlotApis.set(slot.dataset.slot, {
      serialize() {
        return {
          src: slot.classList.contains('has-image') && img.src ? img.src : null,
          scale: state.scale,
          x: state.x,
          y: state.y,
          sourceHtml: source.innerHTML,
          sourceMode: state.sourceMode,
          locked: state.locked
        };
      },

      restore(data) {
        return new Promise(resolve => {
          const saved = data || {};

          source.innerHTML = typeof saved.sourceHtml === 'string'
            ? saved.sourceHtml
            : '@출처';

          state.locked = Boolean(saved.locked);
          updateLockUi();

          const finishWithoutImage = () => {
            img.removeAttribute('src');
            slot.classList.remove('has-image');
            state.scale = 1;
            state.x = 0;
            state.y = 0;
            state.naturalFit = 1;
            state.minScale = 0.1;
            setSourceMode(saved.sourceMode || 'white');
            resolve();
          };

          if (!saved.src) {
            finishWithoutImage();
            return;
          }

          img.onload = () => {
            slot.classList.add('has-image');

            const sw = slot.clientWidth;
            const sh = slot.clientHeight;
            const fit = Math.min(sw / img.naturalWidth, sh / img.naturalHeight);

            state.naturalFit = fit;
            state.minScale = Math.max(0.05, fit * 0.35);
            state.scale = Number.isFinite(Number(saved.scale))
              ? Number(saved.scale)
              : fit;
            state.x = Number.isFinite(Number(saved.x)) ? Number(saved.x) : 0;
            state.y = Number.isFinite(Number(saved.y)) ? Number(saved.y) : 0;

            applyTransform();
            setSourceMode(saved.sourceMode || 'white');
            resolve();
          };

          img.onerror = () => {
            finishWithoutImage();
          };

          img.src = saved.src;
        });
      }
    });
  });


  // ─────────────────────────────────────────
  // · 항목 편집
  // Enter      → 새 항목 "· "
  // Ctrl+Enter → 같은 항목의 보조 줄(· 없음, 줄간격 조금 좁게)
  // ─────────────────────────────────────────
  function splitEditableByBr(editor) {
    const lines = [];
    let current = document.createDocumentFragment();

    [...editor.childNodes].forEach(node => {
      if (node.nodeName === 'BR') {
        lines.push(current);
        current = document.createDocumentFragment();
      } else {
        current.appendChild(node.cloneNode(true));
      }
    });
    lines.push(current);

    editor.innerHTML = '';

    lines.forEach(fragment => {
      const div = document.createElement('div');
      div.appendChild(fragment);
      const text = div.textContent.trim();
      div.className = text.startsWith('·') ? 'bullet-line' : 'bullet-subline';
      if (!div.childNodes.length) div.innerHTML = '<br>';
      editor.appendChild(div);
    });
  }

  function setCaretAfterPrefix(block) {
    const selection = window.getSelection();
    const range = document.createRange();

    if (!block.firstChild || block.firstChild.nodeName === 'BR') {
      block.textContent = block.classList.contains('bullet-line') ? '· ' : '';
    }

    const target = block.firstChild || block;
    const length = target.nodeType === Node.TEXT_NODE
      ? target.textContent.length
      : target.childNodes.length;

    range.setStart(target, length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function insertBulletBlock(editor, continuation = false) {
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;
    const anchorEl = anchorNode?.nodeType === Node.TEXT_NODE
      ? anchorNode.parentElement
      : anchorNode;

    const currentBlock = anchorEl?.closest?.('.bullet-line, .bullet-subline');

    const block = document.createElement('div');
    block.className = continuation ? 'bullet-subline' : 'bullet-line';
    block.textContent = continuation ? '' : '· ';

    if (currentBlock && editor.contains(currentBlock)) {
      currentBlock.insertAdjacentElement('afterend', block);
    } else {
      editor.appendChild(block);
    }

    setCaretAfterPrefix(block);
  }

  document.querySelectorAll('.editable').forEach(editor => {
    const text = editor.textContent.trim();
    if (!text.startsWith('·')) return;

    editor.classList.add('bullet-editor');
    splitEditableByBr(editor);

    editor.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;

      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        insertBulletBlock(editor, true);
      } else {
        insertBulletBlock(editor, false);
      }
    });
  });

  // ─────────────────────────────────────────
  // 데이터 파일 저장 / 불러오기
  // ─────────────────────────────────────────

  const dataFieldSelectors = {
    world: '#worldCard .world-content',

    aName: '#columnA .name',
    aCatchphrase: '#columnA .catchphrase',
    aBubble: '#bubbleA .speech-text',
    aTags: '#columnA .tag-row',
    aBio: '#columnA .bio',
    aLevel: '#columnA .level-card .editable',

    relationSummary: '.relation-summary .summary-copy',
    relationKeywordBox: '.relation-summary .summary-box',
    relationAToB: '.relation-details .relation-a .editable',
    relationBToA: '.relation-details .relation-b .editable',
    ng: '.ng-card .editable',

    bName: '#columnB .name',
    bCatchphrase: '#columnB .catchphrase',
    bBubble: '#bubbleB .speech-text',
    bTags: '#columnB .tag-row',
    bBio: '#columnB .bio',
    bLevel: '#columnB .level-card .editable',

    aPersonality: '.details-column[data-theme-side="a"] .detail-card:nth-child(1) .editable',
    aAppearance: '.details-column[data-theme-side="a"] .detail-card:nth-child(2) .editable',
    aSpeechTitle: '.details-column[data-theme-side="a"] .detail-card:nth-child(3) .heading-editable',
    aSpeechBody: '.details-column[data-theme-side="a"] .detail-card:nth-child(3) .editable',
    aCall: '.details-column[data-theme-side="a"] .detail-card:nth-child(3) .like-row span[contenteditable="true"]',

    bPersonality: '.details-column[data-theme-side="b"] .detail-card:nth-child(1) .editable',
    bAppearance: '.details-column[data-theme-side="b"] .detail-card:nth-child(2) .editable',
    bSpeechTitle: '.details-column[data-theme-side="b"] .detail-card:nth-child(3) .heading-editable',
    bSpeechBody: '.details-column[data-theme-side="b"] .detail-card:nth-child(3) .editable',
    bCall: '.details-column[data-theme-side="b"] .detail-card:nth-child(3) .like-row span[contenteditable="true"]'
  };

  function setDataStatus(message) {
    dataStatus.textContent = message;
    window.clearTimeout(setDataStatus.timer);
    setDataStatus.timer = window.setTimeout(() => {
      dataStatus.textContent = '';
    }, 2500);
  }

  function collectTextFields() {
    const fields = {};

    Object.entries(dataFieldSelectors).forEach(([key, selector]) => {
      const el = document.querySelector(selector);
      if (!el) return;

      if (key === 'aTags' || key === 'bTags') {
        fields[key] = cleanTagHtml(el);
      } else {
        fields[key] = el.innerHTML;
      }
    });

    return fields;
  }

  function restoreTextFields(fields) {
    if (!fields || typeof fields !== 'object') return;

    Object.entries(dataFieldSelectors).forEach(([key, selector]) => {
      if (!(key in fields)) return;
      const el = document.querySelector(selector);
      if (!el) return;

      if (key === 'aTags' || key === 'bTags') {
        restoreTagHtml(el, fields[key]);
      } else {
        el.innerHTML = fields[key];
      }
    });
  }

  function collectImageData() {
    const images = {};
    imageSlotApis.forEach((api, key) => {
      images[key] = api.serialize();
    });
    return images;
  }

  async function restoreImageData(images) {
    if (!images || typeof images !== 'object') return;

    const jobs = [];
    imageSlotApis.forEach((api, key) => {
      jobs.push(api.restore(images[key] || null));
    });
    await Promise.all(jobs);
  }

  function buildDataFile() {
    return {
      format: 'pair-profile-template',
      version: 22,
      savedAt: new Date().toISOString(),

      settings: {
        colorA: colorA.value,
        colorB: colorB.value,
        levelA: toggleLevelA.checked,
        levelB: toggleLevelB.checked,
        bubbleA: toggleBubbleA.checked,
        bubbleB: toggleBubbleB.checked,
        world: toggleWorld.checked
      },

      fields: collectTextFields(),

      inputs: {
        aMeta: document.querySelector('#columnA .meta-inline')?.value || '',
        bMeta: document.querySelector('#columnB .meta-inline')?.value || ''
      },

      images: collectImageData()
    };
  }

  function downloadDataFile(data) {
    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: 'application/json;charset=utf-8' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pair-profile-data.json';
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function restoreDataFile(data) {
    if (!data || data.format !== 'pair-profile-template') {
      throw new Error('이 페어틀의 데이터 파일이 아닙니다.');
    }

    const settings = data.settings || {};

    if (typeof settings.colorA === 'string') {
      colorA.value = settings.colorA;
      setTheme('a', settings.colorA);
    }

    if (typeof settings.colorB === 'string') {
      colorB.value = settings.colorB;
      setTheme('b', settings.colorB);
    }

    if (typeof settings.levelA === 'boolean') {
      toggleLevelA.checked = settings.levelA;
      applyLevelState(columnA, settings.levelA);
    }

    if (typeof settings.levelB === 'boolean') {
      toggleLevelB.checked = settings.levelB;
      applyLevelState(columnB, settings.levelB);
    }

    if (typeof settings.bubbleA === 'boolean') {
      toggleBubbleA.checked = settings.bubbleA;
      applyBubbleState(bubbleA, settings.bubbleA);
    }

    if (typeof settings.bubbleB === 'boolean') {
      toggleBubbleB.checked = settings.bubbleB;
      applyBubbleState(bubbleB, settings.bubbleB);
    }

    if (typeof settings.world === 'boolean') {
      toggleWorld.checked = settings.world;
      worldCard.classList.toggle('is-off', !settings.world);
    }

    restoreTextFields(data.fields);

    const aMeta = document.querySelector('#columnA .meta-inline');
    const bMeta = document.querySelector('#columnB .meta-inline');

    if (aMeta && typeof data.inputs?.aMeta === 'string') {
      aMeta.value = data.inputs.aMeta;
      normalizeMetaInput(aMeta);
    }

    if (bMeta && typeof data.inputs?.bMeta === 'string') {
      bMeta.value = data.inputs.bMeta;
      normalizeMetaInput(bMeta);
    }

    await restoreImageData(data.images);

    requestAnimationFrame(() => {
      fitAllNames();
    });
  }

  saveDataBtn.addEventListener('click', () => {
    try {
      downloadDataFile(buildDataFile());
      setDataStatus('저장됨');
    } catch (err) {
      console.error(err);
      alert('데이터 저장 중 오류가 발생했습니다.');
    }
  });

  loadDataBtn.addEventListener('click', () => {
    loadDataInput.value = '';
    loadDataInput.click();
  });

  loadDataInput.addEventListener('change', async () => {
    const file = loadDataInput.files && loadDataInput.files[0];
    if (!file) return;

    loadDataBtn.disabled = true;
    saveDataBtn.disabled = true;
    setDataStatus('불러오는 중...');

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await restoreDataFile(data);
      setDataStatus('불러옴');
    } catch (err) {
      console.error(err);
      alert(err?.message || '데이터 파일을 불러오지 못했습니다.');
      setDataStatus('');
    } finally {
      loadDataBtn.disabled = false;
      saveDataBtn.disabled = false;
      loadDataInput.value = '';
    }
  });
})();
