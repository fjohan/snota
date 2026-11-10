/* Edit recording, ScriptLog import, and ledger generation. Times are seconds. */
(function(root) {
  'use strict';
  const Engine = root.SNotation || (typeof require === 'function' ? require('./snotation.js').SNotation : null);
  class RevisionRecording {
    constructor(initialText = '') {
      this.operations = initialText ? [{kind:'insert',position:0,value:initialText,first:null,last:null,sourceLast:null,navigationStart:null}] : [];
      this.lastTime = null; this.navigationStart = null; this.group = false;
      this.dot = this.mark = initialText.length;
    }
    navigate(dot, mark, time) {
      if (dot === this.dot && mark === this.mark) return;
      if (this.navigationStart === null && Number.isFinite(time)) this.navigationStart = time;
      this.group = false; this.dot = dot; this.mark = mark;
    }
    endGroup() { this.group = false; }
    edit(position, length, value, time, merge = true) {
      if (length) this.record('delete', position, length, time, merge && !value);
      if (value) this.record('insert', position, value, time, merge && !length);
      this.dot = this.mark = position + value.length;
    }
    record(kind, position, value, time, merge) {
      const last = this.operations.at(-1);
      let joined = false;
      if (merge && this.group && this.navigationStart === null && last?.kind === kind) {
        if (kind === 'insert' && position === last.position + last.value.length) { last.value += value; joined = true; }
        else if (kind === 'delete' && position === last.position) { last.value += value; joined = true; }
        else if (kind === 'delete' && position + value === last.position) { last.position = position; last.value += value; joined = true; }
      }
      if (joined) last.last = time;
      else this.operations.push({kind,position,value,first:time,last:time,sourceLast:this.lastTime,navigationStart:this.navigationStart});
      this.lastTime = time; this.navigationStart = null; this.group = merge;
    }
    build() {
      const model = new Engine(), rows = [];
      for (const op of this.operations) {
        const prior = model.revision;
        model[op.kind](op.position,op.value);
        if (model.revision !== prior) rows.push({x:model.revision,sourceChars:null,targetChars:null,sourceWord:null,targetWord:null,
          sourceLast:op.sourceLast,navigationStart:op.navigationStart,firstEdit:op.first,lastEdit:op.last});
      }
      const byId = new Map(rows.map(row=>[row.x,row])); let position = 0;
      for (const token of model.tokens) {
        if (token.kind === 'char' && token.active) position++;
        else if (token.kind === 'break') byId.get(token.id).sourceChars = position;
        else if (token.kind === 'insertClose' || token.kind === 'deleteClose') byId.get(token.id).targetChars = position;
      }
      const words = [...model.text.matchAll(/\S+/gu)];
      const wordAt = point => words.length ? Math.max(1,words.filter(w=>w.index <= point).length) : null;
      for (const row of rows) { row.sourceWord = wordAt(row.sourceChars); row.targetWord = wordAt(row.targetChars); }
      return {model,rows};
    }
    static fromScriptLog(data) {
      if (!Array.isArray(data) || !Array.isArray(data[0]) || !Array.isArray(data[1]) || !data[0][0]) throw new Error('Expected ScriptLog metadata and event arrays.');
      const initial = data[0][0].initialText ?? '';
      if (typeof initial !== 'string') throw new Error('Invalid initialText.');
      const rec = new RevisionRecording(initial); let text = initial, lastTime = 0;
      for (const event of data[1]) {
        const time = Number(event.relativeTime);
        if (event.relativeTime == null || !Number.isFinite(time) || time < lastTime) throw new Error('Events must have ordered relativeTime values in seconds.');
        lastTime = time;
        if (event.event === '<caretUpdate>') {
          if (![event.dot,event.mark].every(n=>Number.isInteger(n)&&n>=0&&n<=text.length)) throw new Error('Invalid caret position.');
          rec.navigate(event.dot,event.mark,time);
        } else if (['<replace>','<remove>','<insert>'].includes(event.event)) {
          const p=event.offset, n=event.event === '<insert>' ? 0 : event.length, value=event.event === '<remove>' ? '' : event.str;
          if (!Number.isInteger(p)||!Number.isInteger(n)||p<0||n<0||p+n>text.length||typeof value!=='string') throw new Error('Invalid edit range or text.');
          rec.edit(p,n,value,time); text=text.slice(0,p)+value+text.slice(p+n);
        }
      }
      rec.duration = lastTime; return rec;
    }
  }
  const ledgerColumns = [
    ['x','x'],['sourceChars','source_point (chars, 0-based)'],['targetChars','target_point (chars, 0-based)'],
    ['sourceWord','source_point (word index, 1-based)'],['targetWord','target_point (word index, 1-based)'],
    ['sourceLast','last writing edit at source (s)'],['navigationStart','navigation start |x (s)'],
    ['firstEdit','first edit at target (s)'],['lastEdit','last edit x (s)']
  ];
  const ledgerValue = (key,value) => value == null ? '-' : ['sourceLast','navigationStart','firstEdit','lastEdit'].includes(key) ? value.toFixed(3) : String(value);
  const ledgerCSV = rows => [ledgerColumns.map(([,title])=>title),...rows.map(row=>ledgerColumns.map(([key])=>ledgerValue(key,row[key])))].map(row=>row.map(value=>'"'+value.replaceAll('"','""')+'"').join(',')).join('\r\n');
  root.RevisionRecording=RevisionRecording;root.ledgerColumns=ledgerColumns;root.ledgerValue=ledgerValue;root.ledgerCSV=ledgerCSV;
  if(typeof module!=='undefined') module.exports={RevisionRecording,ledgerColumns,ledgerValue,ledgerCSV};
})(typeof window!=='undefined'?window:globalThis);
