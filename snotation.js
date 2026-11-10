/* S-notation v1.0 (2012), implemented as a stream of text and markup tokens.
   No DOM dependencies: also runnable with Node for verification. */
(function (root) {
  'use strict';
  class SNotation {
    constructor() { this.tokens = []; this.revision = 0; this.last = null; this.history = []; }
    get text() { return this.tokens.filter(t => t.kind === 'char' && t.active).map(t => t.value).join(''); }
    locate(position) {
      let n = 0;
      for (let i = 0; i < this.tokens.length; i++) {
        const t = this.tokens[i];
        if (t.kind === 'char' && t.active) { if (n === position) return i; n++; }
      }
      return this.tokens.length;
    }
    counts() {
      const counts = new Map(), stack = [];
      for (const t of this.tokens) {
        if (t.kind === 'insertOpen') { stack.push(t.id); counts.set(t.id, 0); }
        else if (t.kind === 'insertClose') stack.pop();
        else if (t.kind === 'char' && t.active) for (const id of stack) counts.set(id, counts.get(id) + 1);
      }
      return counts;
    }
    addBreak(id) {
      let at = this.last ? this.tokens.indexOf(this.last) + 1 : 0;
      while (this.tokens[at]?.kind === 'break' && this.tokens[at].id < id) at++;
      this.tokens.splice(at, 0, {kind: 'break', id});
    }
    insert(position, value) {
      if (!Number.isInteger(position) || position < 0 || position > this.text.length) throw new RangeError('Invalid insertion position');
      if (!value) return;
      const normal = /^\s*$/.test(this.text.slice(position));
      const chars = value.split('').map(value => ({kind: 'char', value, active: true}));
      if (normal) {
        const at = this.locate(position);
        this.tokens = this.tokens.slice(0, at).concat(chars, this.tokens.slice(at));
        this.last = chars.at(-1);
        this.history.push({kind: 'production', position, value});
      } else {
        const id = ++this.revision;
        this.addBreak(id);
        const close = {kind: 'insertClose', id};
        const at = this.locate(position);
        this.tokens = this.tokens.slice(0, at).concat({kind: 'insertOpen', id}, chars, close, this.tokens.slice(at));
        this.last = close;
        this.history.push({kind: 'insertion', id, position, value});
      }
    }
    delete(position, length) {
      if (!Number.isInteger(position) || !Number.isInteger(length) || position < 0 || length < 0 || position + length > this.text.length) throw new RangeError('Invalid deletion range');
      if (!length) return;
      const value = this.text.slice(position, position + length), id = ++this.revision;
      this.addBreak(id);
      const startToken = this.tokens[this.locate(position)];
      let end = this.tokens.indexOf(startToken), remaining = length;
      while (remaining > 0) {
        const t = this.tokens[end++];
        if (t.kind === 'char' && t.active) { t.active = false; remaining--; }
      }
      const counts = this.counts();
      // Once all requested text is deleted, the close tag may pass only these nodes (§5.2).
      while (end < this.tokens.length) {
        const t = this.tokens[end];
        const jump = (t.kind === 'char' && !t.active) || t.kind === 'deleteOpen' || t.kind === 'deleteClose' ||
          (t.kind === 'break' && t.id < id) ||
          ((t.kind === 'insertOpen' || t.kind === 'insertClose') && counts.get(t.id) === 0);
        if (!jump) break;
        end++;
      }
      const close = {kind: 'deleteClose', id};
      this.tokens.splice(end, 0, close);
      // Place the opening tag last, after updating every enclosing insertion's live count.
      let start = this.tokens.indexOf(startToken);
      while (start > 0) {
        const t = this.tokens[start - 1];
        if (t.kind === 'char' && t.active) break;
        if ((t.kind === 'insertOpen' || t.kind === 'insertClose') && counts.get(t.id) > 0) break;
        start--;
      }
      this.tokens.splice(start, 0, {kind: 'deleteOpen', id});
      this.last = close;
      this.history.push({kind: 'deletion', id, position, value});
    }
    toPlain() {
      const sub = n => String(n).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]);
      const marks = {insertOpen: '{', insertClose: '}', deleteOpen: '[', deleteClose: ']', break: '|'};
      return this.tokens.map(t => t.kind === 'char' ? t.value.replace(/[\\{}\[\]|]/g, '\\$&') : marks[t.kind] + (['insertClose', 'deleteClose', 'break'].includes(t.kind) ? sub(t.id) : '')).join('');
    }
  }
  const example = [
    ['insert', 0, 'these is prodtion'],
    ['insert', 9, 'normal '],
    ['delete', 2, 3],
    ['insert', 2, 'is'],
    ['insert', 19, 'uc'],
    ['insert', 25, ' people'],
    ['insert', 8, 'not '],
    ['delete', 9, 3],
    ['delete', 8, 8]
  ];
  root.SNotation = SNotation; root.sNotationExample = example;
  if (typeof module !== 'undefined') module.exports = {SNotation, example};
})(typeof window !== 'undefined' ? window : globalThis);
