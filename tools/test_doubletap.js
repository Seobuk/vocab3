// A double tap performs its alternate action without ever starting single-tap playback.
const {chromium} = require('playwright');
const assert = require('assert/strict');
const path = require('path');
const FILE = require('url').pathToFileURL(path.resolve(__dirname,'../assets/index.html')).href;
let n=0;
function eq(name,got,want){assert.deepEqual(got,want,name);console.log('ok '+name);n++;}
(async()=>{
  const b=await chromium.launch();
  try {
    const p=await b.newPage({viewport:{width:390,height:844}});
    const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(()=>{
      window.__said=[];window.__yt=[];
      Object.defineProperty(window,'speechSynthesis',{value:{speak(u){window.__said.push(u.text);setTimeout(()=>u.onend&&u.onend(),10);},cancel(){},getVoices(){return[];}}});
      window.SpeechSynthesisUtterance=function(t){this.text=t;};
      window.YT={Player:function(el,o){
        let at=0,st=2;setTimeout(()=>o.events.onReady({}),0);
        this.seekTo=t=>{at=t;window.__yt.push('seek');};this.playVideo=()=>{st=1;window.__yt.push('play');};
        this.pauseVideo=()=>{st=2;window.__yt.push('pause');};this.getCurrentTime=()=>at;this.getPlayerState=()=>st;
        this.getDuration=()=>60;this.destroy=()=>{};
      }};
    });
    await p.goto(FILE);await p.evaluate(()=>localStorage.clear());await p.reload();
    await p.evaluate(()=>{
      const s=window.__vocab.state();s.settings.autoSpeak=false;s.settings.themeRandom=false;
      s.settings.tour={home:1,list:1,study:1,dlgv:1,ytv:1};
      s.dlg=[{id:'note',kind:'note',sit:'I felt happy today.',title:'일기',lines:[{s:'A',e:'I felt happy today.',k:'오늘 기뻤어요.'},{s:'A',e:'I went home.',k:'집에 갔어요.'}]}];
      s.yt=[{id:'video',vid:'TAPVIDEO001',title:'Tap video',tv:3,mb:1,sents:[
        {s:0,t:4,e:'Hello everyone welcome back.',k:'모두 다시 만나 반가워요.',x:[]},
        {s:5,t:9,e:'Today is a wonderful day.',k:'오늘은 멋진 날이에요.',x:[]}
      ]}];window.__vocab.save();window.__vocab.go('list',{stage:'all'});
    });
    const list='#listBody .it-ex >> nth=0';
    await p.dblclick(list);await p.waitForTimeout(500);
    eq('list double tap shows translation without reading',await p.evaluate(()=>[window.__said.length,document.querySelector('#listBody .it-k').classList.contains('hid')]),[0,false]);
    await p.click(list);await p.waitForTimeout(250);
    const box=await p.locator(list).boundingBox();await p.mouse.move(box.x+10,box.y+10);await p.mouse.down();await p.waitForTimeout(200);
    eq('second press suppresses first action while held',await p.evaluate(()=>window.__said.length),0);
    await p.mouse.up();await p.waitForTimeout(500);
    eq('second press released after delay is still translation only',await p.evaluate(()=>[window.__said.length,document.querySelector('#listBody .it-k').classList.contains('hid')]),[0,true]);
    await p.click(list);await p.waitForTimeout(150);eq('single tap waits for second tap',await p.evaluate(()=>window.__said.length),0);
    await p.waitForTimeout(350);eq('single tap reads exactly once',await p.evaluate(()=>window.__said.length),1);
    await p.evaluate(()=>{window.__said=[];});await p.click(list);await p.evaluate(()=>window.__vocab.go('home'));await p.waitForTimeout(500);
    eq('leaving the screen cancels pending reading',await p.evaluate(()=>window.__said.length),0);
    await p.evaluate(()=>window.__vocab.go('list',{stage:'all'}));await p.click(list);
    await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>!!window.__hidden});window.__hidden=true;document.dispatchEvent(new Event('visibilitychange'));window.__hidden=false;document.dispatchEvent(new Event('visibilitychange'));});
    await p.waitForTimeout(500);eq('browser backgrounding cancels pending reading after resume',await p.evaluate(()=>window.__said.length),0);
    await p.evaluate(()=>window.__vocab.go('home'));
    await p.click('.today [data-action="start"]');await p.waitForTimeout(500);
    const ex='#cardArea .reveal[data-reveal="e"]';
    await p.dblclick(ex);await p.waitForTimeout(500);
    eq('hidden card double tap shows English and translation without reading',await p.evaluate(()=>[window.__said.length,document.querySelector('#cardArea [data-reveal="e"]').getAttribute('data-step')]),[0,'2']);
    await p.dblclick(ex);await p.waitForTimeout(500);eq('card double tap hides translation without reading',await p.evaluate(()=>window.__said.length),0);
    await p.click(ex);await p.waitForTimeout(500);eq('card single tap still reads',await p.evaluate(()=>window.__said.length),1);
    await p.evaluate(()=>{window.__said=[];window.__vocab.go('dlgv',{id:'note'});});
    await p.dblclick('#dl-0');await p.waitForTimeout(500);
    eq('note double tap toggles translation without starting TTS',await p.evaluate(()=>[window.__said.length,document.querySelector('#dl-0 .dl-k').classList.contains('hid')]),[0,true]);
    await p.click('#dl-0');await p.waitForTimeout(700);
    await p.click('#dl-1');await p.waitForTimeout(250);await p.click('#dl-1');await p.waitForTimeout(500);
    eq('automatic playback completion between taps does not consume the double tap',await p.evaluate(()=>[window.__said.length,document.querySelector('#dl-1 .dl-k').classList.contains('hid')]),[1,true]);
    await p.evaluate(()=>{window.__voiceCalls=0;window.__vocab.state().settings.expressiveVoice=true;window.VocabVoice.read=()=>{window.__voiceCalls++;return Promise.resolve(true);};});
    await p.dblclick('#dl-0');await p.waitForTimeout(500);
    eq('note double tap also avoids AI voice requests',await p.evaluate(()=>window.__voiceCalls),0);
    await p.click('#dl-0');await p.waitForTimeout(500);eq('note single tap starts AI voice once',await p.evaluate(()=>window.__voiceCalls),1);
    await p.evaluate(()=>{window.__vocab.state().settings.expressiveVoice=false;window.__vocab.go('ytv',{id:'video'});});await p.waitForTimeout(500);
    await p.evaluate(()=>{window.__yt=[];});await p.dblclick('#ys0 .ko-line');await p.waitForTimeout(500);
    eq('YouTube translation double tap never seeks or starts playback',await p.evaluate(()=>window.__yt),[]);
    await p.click('#ys0 .ys-t');await p.waitForTimeout(500);
    eq('YouTube sentence single tap still plays',await p.evaluate(()=>window.__yt.filter(x=>x==='play').length),1);
    await p.evaluate(()=>{window.__yt=[];});await p.dblclick('#ys0 .yw[data-t="1"]');await p.waitForTimeout(500);
    eq('YouTube word double tap opens meaning without replaying',await p.evaluate(()=>[window.__yt.filter(x=>x==='play'||x==='seek'),!!document.querySelector('#ys0 .ycard')]),[[],true]);
    eq('no page errors',errs,[]);console.log('all ok ('+n+')');
  }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
