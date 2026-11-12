// Auditoria: abre cada aba no celular e procura texto espremido, cortado ou erros.
const {chromium,devices}=require('playwright');const OUT=process.env.OUT||'/tmp';
(async()=>{const b=await chromium.launch();let falhas=0;
for (const dev of ['iPhone 13','iPhone SE']){
 const c=await b.newContext({...devices[dev]});const p=await c.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);falhas++;});
 await p.goto('http://localhost:8790/');await p.waitForTimeout(2500);
 const telas=['casa','objetivos','lanc','mercado','metas','visao','contas','fixos','patrimonio','plano','negocio'];
 for(const t of telas){
   await p.evaluate((t)=>{ window.OIKOS_NEG&&OIKOS_NEG.hide&&OIKOS_NEG.hide(); if(t==='casa'){window.OIKOS_OBJ&&OIKOS_OBJ.hide();OIKOS_CASA.show();} else if(t==='objetivos'){OIKOS_OBJ.show();} else if(t==='negocio'){OIKOS_IR('negocio');} else {OIKOS_CASA.hide();OIKOS_OBJ&&OIKOS_OBJ.hide();document.getElementById('tab-'+t).click();} },t);
   await p.waitForTimeout(700);
   const r=await p.evaluate(()=>{const W=document.documentElement.clientWidth;const bad=[];
     document.querySelectorAll('td,th,h1,h2,h3,p,span,b,small,button,label').forEach(e=>{const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden')return;const r=e.getBoundingClientRect();if(!r.width||!r.height)return;if(e.closest('.ob-sheet,.og-sheet,.ag-sheet,.nt-sheet,.cs-lsheet,[hidden]'))return;
       const txt=(e.innerText||'').trim(); if(!txt)return;
       const lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.3;
       if(r.height>lh*6 && r.width<70 && txt.length>4) bad.push('ESPREMIDO '+(e.id||e.tagName)+' "'+txt.slice(0,18)+'" w'+Math.round(r.width));
       else if(e.scrollWidth>e.clientWidth+2 && cs.overflowX!=='auto' && cs.overflowX!=='scroll' && cs.textOverflow!=='ellipsis' && !e.closest('.ob-chips,.fv-scroll,.ob-nav')) bad.push('CORTADO '+(e.id||e.className||e.tagName).toString().slice(0,20)+' "'+txt.slice(0,18)+'"');
       if(r.right>W+1 && !e.closest('.ob-chips,.fv-scroll,.og-ops,.ag-ops,.nt-ops')) bad.push('ESTOURA '+(e.id||e.tagName)+' "'+txt.slice(0,18)+'"');});
     return [...new Set(bad)];});
   if(r.length)falhas++; console.log(dev.padEnd(10),t.padEnd(11),r.length?r.slice(0,5).join(' | '):'ok');
   if(dev==='iPhone 13') await p.screenshot({path:OUT+'/aud-'+t+'.png',fullPage:true});
 }
 await c.close();}
await b.close();console.log(falhas?'FALHAS: '+falhas:'TUDO OK')})()
