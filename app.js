(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const editor = $('editor');
  let operations = [], model = new SNotation(), before = null, previous = '', group = false, exported = '';
  const rebuild = () => { model = new SNotation(); for (const [kind, pos, value] of operations) model[kind](pos, value); };
  function counters() {
    $('char-count').textContent = `${Array.from(editor.value).length} characters`;
    $('edit-count').textContent = `${model.revision} revision${model.revision === 1 ? '' : 's'} recorded`;
  }
  function record(kind, pos, value, merge) {
    const last = operations.at(-1);
    if (merge && group && last?.[0] === kind) {
      if (kind === 'insert' && pos === last[1] + last[2].length) { last[2] += value; return; }
      if (kind === 'delete' && pos === last[1]) { last[2] += value; return; }
      if (kind === 'delete' && pos + value === last[1]) { last[1] = pos; last[2] += value; return; }
    }
    operations.push([kind, pos, value]);
  }
  editor.addEventListener('beforeinput', e => { before = {start: editor.selectionStart, end: editor.selectionEnd, type: e.inputType}; });
  editor.addEventListener('input', e => {
    const next = editor.value;
    if (next === previous) { before = null; return; }
    let start = 0, oldEnd = previous.length, newEnd = next.length;
    const b = before;
    // Anchor native edits to the selection, including repeated-character deletions.
    if (b && b.type.startsWith('delete') && b.start === b.end && next.length < previous.length && /Content(Backward|Forward)$/.test(b.type)) {
      const count = previous.length - next.length;
      start = b.type.endsWith('Backward') ? b.start - count : b.start;
      oldEnd = start + count; newEnd = start;
    } else if (b && b.type.startsWith('insert') && next.startsWith(previous.slice(0, b.start)) && next.endsWith(previous.slice(b.end))) {
      start = b.start; oldEnd = b.end; newEnd = next.length - (previous.length - b.end);
    } else {
      while (start < oldEnd && start < newEnd && previous[start] === next[start]) start++;
      while (oldEnd > start && newEnd > start && previous[oldEnd - 1] === next[newEnd - 1]) { oldEnd--; newEnd--; }
    }
    const removed = oldEnd - start, added = next.slice(start, newEnd);
    const merge = !e.isComposing && !/Paste|Drop|Replacement|history/i.test(e.inputType || '') && !(removed && added);
    if (removed) record('delete', start, removed, merge);
    if (added) { if (removed) group = false; record('insert', start, added, merge); }
    group = merge; previous = next; before = null;
    rebuild(); counters();
    $('result-badge').textContent = 'GENERATE TO UPDATE';
    $('status').textContent = 'History updated. Generate S-notation to see the latest trace.';
  });
  editor.addEventListener('pointerdown', () => { group = false; });
  editor.addEventListener('keydown', e => { if (/^(Arrow|Home|End|Page|Tab)/.test(e.key) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a')) group = false; });
  editor.addEventListener('blur', () => { group = false; });
  function render() {
    group = false;
    const output = $('output'); output.replaceChildren();
    output.classList.toggle('empty', !model.tokens.length);
    if (!model.tokens.length) {
      output.textContent = 'Write something first, then generate your trace.';
      $('status').textContent = 'The editor is empty. Type or paste some text to begin.';
      $('result-summary').textContent = 'No text recorded';
      $('result-badge').textContent = 'EMPTY';
      exported = ''; $('copy').disabled = $('download').disabled = true;
      return;
    }
    const fragment = document.createDocumentFragment();
    const symbols = {insertOpen: '{', insertClose: '}', deleteOpen: '[', deleteClose: ']', break: '|'};
    const stack = [];
    for (const t of model.tokens) {
      const span = document.createElement('span');
      if (t.kind === 'char') {
        span.textContent = t.value;
        span.className = !t.active ? 'deleted-char' : stack.length ? 'inserted-char' : '';
      } else {
        span.className = t.kind.startsWith('insert') ? 'insert' : t.kind.startsWith('delete') ? 'delete' : 'break';
        span.textContent = symbols[t.kind];
        if (['insertClose', 'deleteClose', 'break'].includes(t.kind)) {
          const sub = document.createElement('sub'); sub.textContent = t.id; span.append(sub);
        }
        span.title = `${t.kind.startsWith('insert') ? 'Insertion' : t.kind.startsWith('delete') ? 'Deletion' : 'Break for revision'} ${t.id}`;
        if (t.kind === 'insertOpen') stack.push(t.id);
        if (t.kind === 'insertClose') stack.pop();
      }
      fragment.append(span);
    }
    output.append(fragment);
    exported = model.toPlain();
    $('copy').disabled = $('download').disabled = false;
    $('result-badge').textContent = 'UP TO DATE';
    $('result-summary').textContent = `${model.revision} numbered revision${model.revision === 1 ? '' : 's'}`;
    $('status').textContent = model.revision ? 'Trace generated. Keep editing to continue the story.' : 'Trace generated. Normal production has no markup — revise earlier text to add revisions.';
  }
  $('generate').addEventListener('click', render);
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); render(); } });
  $('reset').addEventListener('click', () => {
    operations = []; model = new SNotation(); previous = ''; before = null; group = false; editor.value = '';
    counters(); render(); editor.focus();
  });
  $('example').addEventListener('click', () => {
    operations = sNotationExample.map(op => [...op]); rebuild();
    editor.value = model.text; previous = editor.value; before = null; group = false;
    counters(); render();
    $('status').textContent = 'Loaded all seven revisions from the PDF’s extended example (pages 6–7). You can keep editing it.';
  });
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(exported); $('status').textContent = 'S-notation copied to clipboard.'; }
    catch { $('status').textContent = 'Clipboard unavailable. Select the trace to copy it, or use Download.'; }
  });
  $('download').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([exported], {type: 'text/plain;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = 's-notation.txt'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('status').textContent = 'S-notation downloaded.';
  });
  counters();
})();
