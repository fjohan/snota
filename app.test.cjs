const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
class Element {
 constructor(){this.listeners={};this.children=[];this._text='';this.value='';this.selectionStart=this.selectionEnd=0;this.classList={toggle(){}};this.dataset={};this.attributes={};this.hidden=false;this.scrollTop=0;this.scrollLeft=0;this.scrollCalls=0;}
 setAttribute(key,value){this.attributes[key]=value;}
 removeAttribute(key){delete this.attributes[key];}
 scrollIntoView(){this.scrollCalls++;}
 getBoundingClientRect(){
  if(this===el('ledger-scroll'))return {top:0,bottom:160,height:160};
  if(this===el('ledger-head'))return {top:0,bottom:30,height:30};
  if(this.dataset.revision){const top=30+(Number(this.dataset.revision)-1)*40-el('ledger-scroll').scrollTop;return {top,bottom:top+40,height:40};}
  return {top:0,bottom:30,height:30};
 }
 addEventListener(type,fn){this.listeners[type]=fn;}set textContent(s){this._text=String(s);this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
 append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this._text='';this.children=nodes;}focus(){doc.activeElement=this;}click(){return this.listeners.click?.({});}
}
const els=new Map(),doc={activeElement:null,getElementById(id){if(!els.has(id))els.set(id,new Element());return els.get(id);},addEventListener(){},createElement(){return new Element();},createDocumentFragment(){return new Element();}};
let time=0;const downloads=[];
const ctx={document:doc,performance:{now:()=>time},fetch:async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('scriptlog-data.json','utf8'))}),setTimeout:()=>{},Blob,URL:{createObjectURL:b=>{downloads.push(b);return 'blob:test';},revokeObjectURL(){}},console};ctx.window=ctx;vm.createContext(ctx);
for(const name of ['snotation.js','recording.js','app.js'])vm.runInContext(fs.readFileSync(name,'utf8'),ctx);
const el=id=>doc.getElementById(id),editor=el('editor');editor.focus();
const keys=['x','kind','content','sourceChars','targetChars','sourceWord','targetWord','sourceLast','navigationStart','firstEdit','lastEdit'];
const cell=(row,key)=>el('ledger-body').children[row].children[keys.indexOf(key)];
function input(value,start,end,type,after){editor.selectionStart=start;editor.selectionEnd=end;editor.listeners.beforeinput({inputType:type});editor.value=value;editor.selectionStart=editor.selectionEnd=after;editor.listeners.input({inputType:type,isComposing:false});}
function navigate(start,end,at){time=at;editor.listeners.pointerdown();editor.selectionStart=start;editor.selectionEnd=end;editor.listeners.select();}
(async()=>{
 time=1000;input('one cat',0,0,'insertText',7);navigate(4,5,2000);time=3000;input('one bat',4,5,'insertText',5);el('generate').click();
 assert.equal(el('ledger-body').children.length,2);assert.equal(cell(0,'sourceLast').textContent,'1.000');assert.equal(cell(0,'navigationStart').textContent,'2.000');assert.equal(cell(1,'navigationStart').textContent,'-');
 el('reset').click();time=4000;input('aaa',0,0,'insertText',3);navigate(1,1,5000);time=6000;input('aa',1,1,'deleteContentBackward',0);el('generate').click();assert.equal(el('output').textContent,'[a]1aa|1');
 await el('scriptlog-example').click();assert.equal(el('ledger-body').children.length,6);assert.equal(cell(0,'navigationStart').textContent,'17.597');assert.equal(editor.value,'vi redigerar inne i orden\n\nvi redigerar i början av orden\n\n');
 cell(0,'firstEdit').children[0].click();assert.equal(el('revision-viewer').hidden,false);assert.equal(el('visit-text').textContent,'vi redisherar ine i orden');
 assert.equal(el('visit-text').children[1].textContent,'sh');assert.equal(el('visit-prev').disabled,true);
 el('visit-after').click();assert.equal(el('visit-text').textContent,'vi redierar ine i orden');
 el('visit-next').click();assert.equal(el('visit-title').textContent,'Revision 2 · After');assert.equal(el('visit-text').textContent,'vi redigerar ine i orden');
 el('visit-before').click();assert.equal(el('visit-text').textContent,'vi redierar ine i orden');el('visit-prev').click();assert.equal(el('visit-title').textContent,'Revision 1 · Before');
 cell(0,'sourceLast').children[0].click();assert.ok(el('visit-description').textContent.includes('historical character 25'));
 cell(0,'navigationStart').children[0].click();assert.ok(el('visit-description').textContent.includes('17.597 s'));
 cell(5,'lastEdit').children[0].click();assert.equal(el('visit-next').disabled,true);
 assert.ok(el('ledger-scroll').scrollTop>0,'Current row follows navigation within the ledger');
 assert.equal(el('visit-progress').textContent,'6 of 6 revisions');assert.equal(el('visit-content').textContent,'b');
 assert.equal(el('ledger-body').children[5].attributes['aria-current'],'step');
 const pageScrolls=el('revision-viewer').scrollCalls;el('visit-prev').click();assert.equal(el('revision-viewer').scrollCalls,pageScrolls,'Stepping keeps the page stable');
 cell(0,'firstEdit').children[0].click();assert.equal(el('ledger-scroll').scrollTop,0,'Going back reveals the first row below the sticky header');
 assert.equal(el('ledger-body').children[5].attributes['aria-current'],undefined);
 el('visit-close').click();assert.equal(el('revision-viewer').hidden,true);
 assert.equal(cell(0,'kind').textContent,'Delete');assert.equal(cell(0,'content').textContent,'sh');
 el('ledger-download').click();assert.ok((await downloads.at(-1).text()).includes('"109.382"'));
 const old=editor.value;await el('import-log').listeners.change({target:{files:[{text:async()=>'{"bad":true}'}]}});assert.equal(editor.value,old);assert.ok(el('status').textContent.startsWith('Import failed:'));
 el('example').click();assert.equal(cell(0,'sourceLast').textContent,'-');
 cell(0,'x').children[0].click();assert.ok(el('visit-description').textContent.includes('time unavailable'));
 // Long content expands and collapses, including Unicode and literal HTML.
 const long='😀<script>\n'.repeat(30), data=[[{initialText:'tail'}],[{event:'<replace>',offset:0,length:0,str:long,relativeTime:'1'}]];
 await el('import-log').listeners.change({target:{files:[{text:async()=>JSON.stringify(data)}]}});
 const content=cell(0,'content'),code=content.children[0],toggle=content.children[1];assert.ok(code.textContent.endsWith('…'));assert.ok(code.textContent.length<long.length);
 toggle.click();assert.equal(toggle.attributes['aria-expanded'],'true');assert.equal(code.textContent,long.replaceAll('\n','↵\n'));toggle.click();assert.ok(code.textContent.endsWith('…'));
 cell(0,'lastEdit').children[0].click();assert.equal(el('visit-text').textContent,long+'tail');assert.equal(el('visit-text').children[1].textContent,long);
 // Editing after generation keeps the preview and CSV attached to that generated history.
 editor.focus();time+=1000;input('changed'+long+'tail',0,0,'insertFromPaste',7);
 cell(0,'firstEdit').children[0].click();assert.equal(el('visit-text').textContent,'tail');
 el('ledger-download').click();assert.ok(!(await downloads.at(-1).text()).includes('changed'));
 el('reset').click();assert.equal(el('ledger-download').disabled,true);assert.equal(el('output').textContent,'Write something first, then generate your trace.');
 console.log('Passed UI event integration: live navigation/timing, replacement, backspace, example import, CSV download, invalid import preservation, missing timestamps, and reset.');
})().catch(e=>{console.error(e);process.exitCode=1;});
