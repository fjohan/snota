const assert = require('node:assert/strict');
const {SNotation, example} = require('./snotation.js');
const m = new SNotation();
const expectedText = ['these is prodtion','these is normal prodtion','th is normal prodtion','this is normal prodtion','this is normal production','this is normal production people','this is not normal production people','this is nnormal production people','this is production people'];
const expectedTrace = [
 'these is prodtion',
 'these is {normal }₁prodtion|₁',
 'th[ese]₂ is {normal }₁|₂prodtion|₁',
 'th[ese]₂|₃{is}₃ is {normal }₁|₂prodtion|₁',
 'th[ese]₂|₃{is}₃|₄ is {normal }₁|₂prod{uc}₄tion|₁',
 'th[ese]₂|₃{is}₃|₄ is {normal }₁|₂prod{uc}₄tion|₁ people',
 'th[ese]₂|₃{is}₃|₄ is {{not }₅normal }₁|₂prod{uc}₄tion|₁ people|₅',
 'th[ese]₂|₃{is}₃|₄ is {{n[ot ]₆}₅|₆normal }₁|₂prod{uc}₄tion|₁ people|₅',
 'th[ese]₂|₃{is}₃|₄ is [{{n[ot ]₆|₇}₅|₆normal }₁|₂]₇prod{uc}₄tion|₁ people|₅'
];
for (const [i,[kind,pos,value]] of example.entries()) {
 m[kind](pos,value);
 assert.equal(m.text,expectedText[i],`live text at step ${i}`);
 assert.equal(m.toPlain(),expectedTrace[i],`PDF notation at step ${i}`);
}
assert.equal(m.counts().get(1),0); assert.equal(m.counts().get(5),0);
const nested = new SNotation(); nested.insert(0,'ababa'); nested.insert(4,'cdf'); nested.insert(6,'e');
assert.equal(nested.toPlain(),'abab{cd{e}₂f}₁|₂a|₁');
assert.equal(nested.counts().get(1),4); assert.equal(nested.counts().get(2),1);
nested.delete(0,2); assert.equal(nested.toPlain(),'[ab]₃ab{cd{e}₂|₃f}₁|₂a|₁');
const whitespace = new SNotation(); whitespace.insert(0,'a  '); whitespace.insert(1,'b'); assert.equal(whitespace.revision,0); assert.equal(whitespace.text,'ab  ');
const literal = new SNotation(); literal.insert(0,'<script>{a}|[b]😀\n'); assert.equal(literal.text,'<script>{a}|[b]😀\n'); assert.ok(literal.toPlain().includes('\\{a\\}'));
assert.throws(()=>literal.delete(999,1),RangeError);
// Deterministic mixed edits: live text must always equal a plain-string reference.
let seed=42, text='', f=new SNotation(); const rand=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
for(let i=0;i<400;i++) { const pos=rand(text.length+1); if(text.length && rand(3)===0 && pos<text.length){const n=1+rand(text.length-pos);f.delete(pos,n);text=text.slice(0,pos)+text.slice(pos+n);}else{const s=String.fromCharCode(97+rand(26));f.insert(pos,s);text=text.slice(0,pos)+s+text.slice(pos);} assert.equal(f.text,text,`random operation ${i}`); }
console.log('Passed: all PDF example stages, nested counts, jumping, whitespace, literals, range checks, and 400 mixed edits.');
