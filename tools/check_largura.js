// Verifica dimensionamento: nenhuma tela pode ser mais larga que o celular.
const {chromium,devices}=require('playwright');
(async()=>{const b=await chromium.launch();let falhas=0;
for (const dev of ['iPhone SE','iPhone 13','Pixel 7']){
 const c=await b.newContext({...devices[dev]});const p=await c.newPage();p.on('pageerror',e=>{console.log('ERR',e.message);falhas++;});
 await p.addInitScript(()=>{ // notinha com texto bem longo para estressar
   window.__fake=true; });
 await p.goto('http://localhost:8790/');await p.waitForTimeout(2500);

 const telas=['casa','objetivos','lanc','mercado','metas','visao','contas','fixos','patrimonio','plano'];
 for(const t of telas){
   await p.evaluate((t)=>{ if(t==='casa'){window.OIKOS_OBJ&&OIKOS_OBJ.hide();OIKOS_CASA.show();} else if(t==='objetivos'){OIKOS_OBJ.show();} else {OIKOS_CASA.hide();OIKOS_OBJ&&OIKOS_OBJ.hide();document.getElementById('tab-'+t).click();} },t);
   await p.waitForTimeout(500);
   await p.evaluate(()=>{ document.querySelectorAll('#nt-lista').forEach(b=>{b.innerHTML='<p class="nt-lh">Últimas notinhas</p><div class="nt-it"><span>🎁 Presente para o Emanuel (motinha) - PIX Bradesco George com um texto bem comprido · 10/11, 10:03</span><b class="ok">✅ Recebida</b></div>';}); });
   await p.waitForTimeout(100);
   const r=await p.evaluate(()=>{const W=document.documentElement.clientWidth;const bad=[];
     document.querySelectorAll('body *').forEach(e=>{ if(e.closest('.ob-chips,.og-ops,.ag-ops,.nt-ops,.fv-scroll,svg,.ob-sheet,.og-sheet,.ag-sheet,.nt-sheet,.cs-lsheet'))return; const b=e.getBoundingClientRect(); if(b.width>0&&b.height>0&&b.right>W+1){const cs=getComputedStyle(e); if(cs.visibility!=='hidden'&&cs.display!=='none') bad.push((e.id||e.className||e.tagName).toString().slice(0,30)+':'+Math.round(b.right));}});
     return [bad.length, W, bad.slice(0,4).join(' | ')];});
   const ok=r[0]===0; if(!ok)falhas++; console.log(dev.padEnd(10),t.padEnd(11),ok?'ok':'ESTOURA',r.join('/'));
 }
 await c.close();}
await b.close();console.log(falhas?'FALHAS: '+falhas:'TUDO OK');process.exit(falhas?1:0)})()
