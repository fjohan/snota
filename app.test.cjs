const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
class Element {
 constructor(){this.listeners={};this.children=[];this._text='';this.value='';this.selectionStart=this.selectionEnd=0;this.classList={toggle(){}};}
 addEventListener(type,fn){this.listeners[type]=fn;}set textContent(s){this._text=String(s);this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
 append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this._text='';this.children=nodes;}focus(){doc.activeElement=this;}click(){return this.listeners.click?.({});}
}
const els=new Map(),doc={activeElement:null,getElementById(id){if(!els.has(id))els.set(id,new Element());return els.get(id);},addEventListener(){},createElement(){return new Element();},createDocumentFragment(){return new Element();}};
let time=0;const downloads=[];
const ctx={document:doc,performance:{now:()=>time},fetch:async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('scriptlog-data.json','utf8'))}),setTimeout:()=>{},Blob,URL:{createObjectURL:b=>{downloads.push(b);return 'blob:test';},revokeObjectURL(){}},console};ctx.window=ctx;vm.createContext(ctx);
for(const name of ['snotation.js','recording.js','app.js'])vm.runInContext(fs.readFileSync(name,'utf8'),ctx);
const el=id=>doc.getElementById(id),editor=el('editor');editor.focus();
function input(value,start,end,type,after){editor.selectionStart=start;editor.selectionEnd=end;editor.listeners.beforeinput({inputType:type});editor.value=value;editor.selectionStart=editor.selectionEnd=after;editor.listeners.input({inputType:type,isComposing:false});}
function navigate(start,end,at){time=at;editor.listeners.pointerdown();editor.selectionStart=start;editor.selectionEnd=end;editor.listeners.select();}
(async()=>{
 time=1000;input('one cat',0,0,'insertText',7);navigate(4,5,2000);time=3000;input('one bat',4,5,'insertText',5);el('generate').click();
 assert.equal(el('ledger-body').children.length,2);assert.equal(el('ledger-body').children[0].children[5].textContent,'1.000');assert.equal(el('ledger-body').children[0].children[6].textContent,'2.000');assert.equal(el('ledger-body').children[1].children[6].textContent,'-');
 el('reset').click();time=4000;input('aaa',0,0,'insertText',3);navigate(1,1,5000);time=6000;input('aa',1,1,'deleteContentBackward',0);el('generate').click();assert.equal(el('output').textContent,'[a]1aa|1');
 await el('scriptlog-example').click();assert.equal(el('ledger-body').children.length,6);assert.equal(el('ledger-body').children[0].children[6].textContent,'17.597');assert.equal(editor.value,'vi redigerar inne i orden\n\nvi redigerar i början av orden\n\n');
 el('ledger-download').click();assert.ok((await downloads.at(-1).text()).includes('"109.382"'));
 const old=editor.value;await el('import-log').listeners.change({target:{files:[{text:async()=>'{"bad":true}'}]}});assert.equal(editor.value,old);assert.ok(el('status').textContent.startsWith('Import failed:'));
 el('example').click();assert.equal(el('ledger-body').children[0].children[5].textContent,'-');
 el('reset').click();assert.equal(el('ledger-download').disabled,true);assert.equal(el('output').textContent,'Write something first, then generate your trace.');
 console.log('Passed UI event integration: live navigation/timing, replacement, backspace, example import, CSV download, invalid import preservation, missing timestamps, and reset.');
})().catch(e=>{console.error(e);process.exitCode=1;});
