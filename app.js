(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const editor = $('editor');
  let recording = new RevisionRecording(), model = new SNotation(), rows = [], before = null, previous = '', exported = '';
  let clockStart = performance.now(), clockOffset = 0, navigationIntent = null;
  const now = () => clockOffset + (performance.now() - clockStart) / 1000;
  const rebuild = () => { ({model,rows} = recording.build()); };
  function counters() {
    $('char-count').textContent = `${Array.from(editor.value).length} characters`;
    $('edit-count').textContent = `${model.revision} revision${model.revision === 1 ? '' : 's'} recorded`;
  }
  function syncSelection() {
    if (document.activeElement !== editor) return;
    if (editor.selectionStart !== Math.min(recording.dot,recording.mark) || editor.selectionEnd !== Math.max(recording.dot,recording.mark)) {
      recording.navigate(editor.selectionStart,editor.selectionEnd,navigationIntent ?? now());
    }
    navigationIntent = null;
  }
  let replayRecording = null, replayRows = [], activeVisit = null;
  const timestampPhases = {sourceLast:'source',navigationStart:'navigation',firstEdit:'before',lastEdit:'after'};
  // Scroll only the relevant panel; stepping must not move the whole page.
  function revealInPanel(panel, item, headerHeight = 0) {
    const bounds = panel.getBoundingClientRect(), rect = item.getBoundingClientRect();
    const top = bounds.top + headerHeight + 4, bottom = bounds.bottom - 4;
    if (rect.top < top || rect.height > bottom - top) panel.scrollTop = Math.max(0,panel.scrollTop + rect.top - top);
    else if (rect.bottom > bottom) panel.scrollTop = Math.max(0,panel.scrollTop + rect.bottom - bottom);
  }
  function visitRevision(revision, phase) {
    if (!replayRecording) return;
    const snapshot = replayRecording.visit(revision,phase);
    activeVisit = {revision,phase};
    const opening = $('revision-viewer').hidden;
    $('revision-viewer').hidden = false;
    $('ledger-section').classList.toggle('has-preview',true);
    const labels={source:'At source',navigation:'Navigation starts',before:'Before',after:'After'};
    $('visit-title').textContent=`Revision ${revision} · ${labels[phase]}`;
    const row=replayRows.find(row=>row.x===revision);
    $('visit-progress').textContent=`${replayRows.findIndex(item=>item.x===revision)+1} of ${replayRows.length} revisions`;
    $('visit-content').replaceChildren();contentCell($('visit-content'),row);
    const when=snapshot.time == null ? 'time unavailable' : `${snapshot.time.toFixed(3)} s`;
    $('visit-description').textContent=`${row.kind === 'insert' ? 'Insert' : 'Delete'} · ${Array.from(row.content).length} characters · ${when} · historical character ${snapshot.start}`;
    const text=$('visit-text');text.replaceChildren();
    const left=document.createElement('span');left.textContent=snapshot.text.slice(0,snapshot.start);text.append(left);
    const mark=document.createElement(snapshot.end>snapshot.start?'mark':'span');
    if(snapshot.end>snapshot.start){mark.textContent=snapshot.text.slice(snapshot.start,snapshot.end);mark.className=`visit-highlight ${snapshot.kind}`;}
    else {mark.className='visit-caret';mark.setAttribute('aria-label','Caret position');}
    text.append(mark);
    const right=document.createElement('span');right.textContent=snapshot.text.slice(snapshot.end);text.append(right);
    $('visit-prev').disabled=revision===replayRows[0].x;
    $('visit-next').disabled=revision===replayRows.at(-1).x;
    $('visit-before').setAttribute('aria-pressed',String(phase==='before'));
    $('visit-after').setAttribute('aria-pressed',String(phase==='after'));
    for(const tr of $('ledger-body').children) {
      const current=tr.dataset.revision===String(revision);
      tr.classList.toggle('visited',current);
      if(current){tr.setAttribute('aria-current','step');revealInPanel($('ledger-scroll'),tr,$('ledger-head').getBoundingClientRect().height);}
      else tr.removeAttribute('aria-current');
    }
    revealInPanel(text,mark);
    if(opening)$('revision-viewer').scrollIntoView?.({block:'nearest'});
  }
  function contentCell(td,row) {
    td.className='revision-content';
    const code=document.createElement('code'), chars=Array.from(row.content), limit=80;
    const show=value=>value.replaceAll(' ','·').replaceAll('\n','↵\n').replaceAll('\t','⇥');
    code.textContent=show(chars.slice(0,limit).join(''))+(chars.length>limit?'…':'');
    code.title='Spaces: ·  Line breaks: ↵  Tabs: ⇥';td.append(code);
    if(chars.length>limit){
      const button=document.createElement('button');button.className='text-button content-toggle';button.type='button';
      button.textContent=`Show all (${chars.length} chars)`;button.setAttribute('aria-expanded','false');
      let expanded=false;
      button.addEventListener('click',()=>{
        expanded=!expanded;code.textContent=show(expanded?row.content:chars.slice(0,limit).join('')+'…');
        code.classList.toggle('expanded',expanded);button.textContent=expanded?'Show less':`Show all (${chars.length} chars)`;
        button.setAttribute('aria-expanded',String(expanded));
      });td.append(button);
    }
  }
  function renderLedger() {
    replayRecording=new RevisionRecording();replayRecording.operations=recording.operations.map(op=>({...op}));
    replayRows=rows;activeVisit=null;$('revision-viewer').hidden=true;
    $('ledger-section').classList.toggle('has-preview',false);$('ledger-scroll').scrollTop=0;
    const body = $('ledger-body'); body.replaceChildren();
    if (!rows.length) {
      const tr=document.createElement('tr'), td=document.createElement('td');td.colSpan=ledgerColumns.length;td.className='ledger-empty';
      td.textContent='No numbered revisions yet. Edit earlier text, then generate again.';tr.append(td);body.append(tr);
    }
    for (const row of rows) {
      const tr=document.createElement('tr');tr.dataset.revision=String(row.x);
      for (const [key] of ledgerColumns) {
        const td=document.createElement('td');
        if(key==='content')contentCell(td,row);
        else if(key==='x' || (timestampPhases[key] && row[key]!=null)){
          const button=document.createElement('button');button.className='timestamp-button';button.type='button';
          button.textContent=ledgerValue(key,row[key]);
          const phase=timestampPhases[key] || 'before';
          button.title=`Visit revision ${row.x}: ${{source:'last edit at source',navigation:'navigation start',before:'before revision',after:'after revision'}[phase]}`;
          button.setAttribute('aria-label',`${button.title}${key==='x'?'':` at ${button.textContent} seconds`}`);
          button.addEventListener('click',()=>visitRevision(row.x,phase));td.append(button);
        } else {td.textContent=ledgerValue(key,row[key]);if(key==='kind')td.className=row.kind==='insert'?'insert':'delete';}
        tr.append(td);
      }
      body.append(tr);
    }
    $('ledger-download').disabled = !rows.length;
  }
  const header=document.createElement('tr');
  for(const [,title,description] of ledgerColumns){const th=document.createElement('th');th.scope='col';th.textContent=title;th.title=description;header.append(th);}
  $('ledger-head').append(header);
  $('visit-close').addEventListener('click',()=>{$('revision-viewer').hidden=true;$('ledger-section').classList.toggle('has-preview',false);activeVisit=null;for(const tr of $('ledger-body').children){tr.classList.toggle('visited',false);tr.removeAttribute('aria-current');}});
  $('visit-before').addEventListener('click',()=>{if(activeVisit)visitRevision(activeVisit.revision,'before');});
  $('visit-after').addEventListener('click',()=>{if(activeVisit)visitRevision(activeVisit.revision,'after');});
  for(const [id,delta] of [['visit-prev',-1],['visit-next',1]])$(id).addEventListener('click',()=>{
    if(!activeVisit)return;const index=replayRows.findIndex(row=>row.x===activeVisit.revision),row=replayRows[index+delta];
    if(row)visitRevision(row.x,activeVisit.phase==='after'?'after':'before');
  });
  editor.addEventListener('beforeinput', e => { syncSelection(); before = {start: editor.selectionStart, end: editor.selectionEnd, type: e.inputType}; });
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
    recording.edit(start, removed, added, now(), merge);
    recording.dot = editor.selectionStart; recording.mark = editor.selectionEnd;
    previous = next; before = null; navigationIntent = null;
    rebuild(); counters();
    $('result-badge').textContent = 'GENERATE TO UPDATE';
    $('status').textContent = 'History updated. Generate S-notation to see the latest trace.';
  });
  editor.addEventListener('pointerdown', () => { navigationIntent = now(); });
  editor.addEventListener('keydown', e => { if (/^(Arrow|Home|End|Page)/.test(e.key) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a')) navigationIntent = now(); });
  editor.addEventListener('select', syncSelection);
  document.addEventListener('selectionchange', syncSelection);
  editor.addEventListener('blur', () => { recording.endGroup(); navigationIntent = null; });
  function render() {
    recording.endGroup(); renderLedger();
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
    recording = new RevisionRecording(); rebuild(); previous = ''; before = null; editor.value = '';
    clockStart = performance.now(); clockOffset = 0; navigationIntent = null;
    counters(); render(); editor.focus();
  });
  $('example').addEventListener('click', () => {
    recording = new RevisionRecording();
    recording.operations = sNotationExample.map(([kind,position,value])=>({kind,position,value,first:null,last:null,sourceLast:null,navigationStart:null})); rebuild();
    recording.dot = recording.mark = model.text.length;
    clockStart = performance.now(); clockOffset = 0;
    editor.value = model.text; previous = editor.value; before = null; navigationIntent = null;
    counters(); render();
    $('status').textContent = 'Loaded all seven revisions from the PDF’s extended example (pages 6–7). You can keep editing it.';
  });
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(exported); $('status').textContent = 'S-notation copied to clipboard.'; }
    catch { $('status').textContent = 'Clipboard unavailable. Select the trace to copy it, or use Download.'; }
  });
  function download(content, type, filename) {
    const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');
    a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  $('ledger-download').addEventListener('click', () => {
    download(ledgerCSV(replayRows),'text/csv;charset=utf-8','revision-ledger.csv');
    $('status').textContent='Revision ledger downloaded.';
  });
  function loadScriptLog(data) {
    const imported=RevisionRecording.fromScriptLog(data);
    const built=imported.build();
    recording=imported;model=built.model;rows=built.rows;
    editor.value=model.text;previous=editor.value;before=null;navigationIntent=null;
    recording.dot=recording.mark=model.text.length;recording.endGroup();
    clockStart=performance.now();clockOffset=imported.duration;
    counters();render();$('status').textContent='ScriptLog loaded. Original timestamps preserved; you can continue editing.';
  }
  $('scriptlog-example').addEventListener('click', async () => {
    try {
      const response=await fetch('scriptlog-data.json');if(!response.ok)throw new Error('Could not load the example file.');
      loadScriptLog(await response.json());
    } catch(error){$('status').textContent=`Import failed: ${error.message}`;}
  });
  $('import-log').addEventListener('change', async e => {
    const file=e.target.files[0];if(!file)return;
    try{loadScriptLog(JSON.parse(await file.text()));}catch(error){$('status').textContent=`Import failed: ${error.message}`;}
    e.target.value='';
  });
  $('download').addEventListener('click', () => {
    download(exported,'text/plain;charset=utf-8','s-notation.txt');
    $('status').textContent = 'S-notation downloaded.';
  });
  counters();
})();
