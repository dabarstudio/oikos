// mede quanto o app demora para responder a toques comuns (CPU 4x mais lenta)
const {chromium,devices}=require('playwright');
(async()=>{const b=await chromium.launch();const c=await b.newContext({...devices['iPhone 13']});const p=await c.newPage();
await p.route(/fonts\.g/,r=>r.abort());
const cdp=await c.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
await p.addInitScript(()=>{window.__lt=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push([e.name,Math.round(e.duration)]))).observe({type:'longtask',buffered:true});
 const MO=window.MutationObserver; window.__mo=0; window.MutationObserver=class extends MO{constructor(cb){super((...a)=>{window.__mo++;return cb(...a)})}};});
const t0=Date.now();await p.goto('http://localhost:8790/');await p.waitForFunction(()=>document.querySelector('.cs-hero'),{timeout:30000});console.log('carregar',Date.now()-t0,'ms');
await p.waitForTimeout(1500);
async function medir(nome,fn){await p.evaluate(()=>{window.__lt=[];window.__mo=0});const t=Date.now();await fn();await p.waitForTimeout(600);const r=await p.evaluate(()=>[window.__lt.reduce((s,x)=>s+x[1],0),Math.max(0,...window.__lt.map(x=>x[1])),window.__mo]);console.log(nome.padEnd(28),'tarefas longas',r[0],'ms · maior',r[1],'ms · observers',r[2]);}
await medir('abrir Gastos',()=>p.evaluate(()=>OIKOS_IR('lanc')));
await medir('filtro Gastos (busca)',async()=>{const i=await p.$('#card-lanc input[type=search], #card-lanc input');if(i){await i.fill('mercado');}});
await medir('trocar período',async()=>{const s=await p.$('select');if(s){const o=await s.$$eval('option',os=>os.map(o=>o.value));await s.selectOption(o[1]||o[0]);}});
await medir('abrir Contas',()=>p.evaluate(()=>OIKOS_IR('contas')));
await medir('chip Contas',async()=>{const ch=await p.$$('.ob-chip');if(ch[1])await ch[1].click();});
await medir('abrir Início',()=>p.evaluate(()=>OIKOS_IR('casa')));
await medir('tocar envelope',async()=>{const e=await p.$('.cs-env');if(e)await e.click();});
await medir('abrir Patrimônio',()=>p.evaluate(()=>OIKOS_IR('patrimonio')));
await medir('abrir Mais',async()=>{const m=await p.$('.ob-nav [data-go="mais"], .ob-nav button:last-child');if(m)await m.click();});
await b.close()})();
