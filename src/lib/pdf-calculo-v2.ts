import type { CriteriosCalculo, IdentificacaoCalculo, ResultadoCalculo } from "./calculos-judiciais";

type RGB = readonly [number, number, number];
type Img = { bytes: Uint8Array; width: number; height: number };

const E = new TextEncoder();
const W = 595.28;
const H = 841.89;
const M = 36;
const C = {
  navy: [8, 46, 69] as RGB,
  blue: [13, 73, 104] as RGB,
  accent: [45, 126, 165] as RGB,
  light: [243, 249, 252] as RGB,
  lighter: [248, 251, 253] as RGB,
  border: [198, 220, 231] as RGB,
  text: [23, 52, 71] as RGB,
  muted: [88, 120, 139] as RGB,
  white: [255, 255, 255] as RGB,
};

const br = (d: string) => d ? d.split("-").reverse().join("/") : "";
const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const rgb = (c: RGB) => `${(c[0] / 255).toFixed(4)} ${(c[1] / 255).toFixed(4)} ${(c[2] / 255).toFixed(4)}`;
const safe = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "judicial";

function cp(ch: string) {
  const n = ch.charCodeAt(0);
  if (n <= 0x7f || (n >= 0xa0 && n <= 0xff)) return n;
  const map: Record<string, number> = { "€":128,"‚":130,"ƒ":131,"„":132,"…":133,"†":134,"‡":135,"ˆ":136,"‰":137,"Š":138,"‹":139,"Œ":140,"Ž":142,"‘":145,"’":146,"“":147,"”":148,"•":149,"–":150,"—":151,"˜":152,"™":153,"š":154,"›":155,"œ":156,"ž":158,"Ÿ":159 };
  return map[ch] ?? 63;
}
function lit(s: string) {
  let out = "";
  for (const ch of s) {
    const b = cp(ch);
    if (b === 40 || b === 41 || b === 92) out += `\\${String.fromCharCode(b)}`;
    else if (b >= 32 && b <= 126) out += String.fromCharCode(b);
    else out += `\\${b.toString(8).padStart(3, "0")}`;
  }
  return `(${out})`;
}
function join(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let pos = 0;
  parts.forEach((p) => { out.set(p, pos); pos += p.length; });
  return out;
}
function stream(bytes: Uint8Array, dict = "") { return join([E.encode(`<< ${dict} /Length ${bytes.length} >>\nstream\n`), bytes, E.encode("\nendstream")]); }
function width(s: string, size: number, bold = false) { return s.length * size * (bold ? .54 : .5); }
function wrap(s: string, max: number, size: number) {
  const words = String(s ?? "").split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const rows: string[] = [];
  let row = words[0] ?? "";
  for (let i = 1; i < words.length; i++) {
    const t = `${row} ${words[i]!}`;
    if (width(t, size) <= max) row = t; else { rows.push(row); row = words[i]!; }
  }
  rows.push(row); return rows;
}
async function loadImage(url: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error("Não foi possível carregar a logo do FaroLex.")); img.src = url;
  });
}
async function jpeg(url: string, bg: RGB, alpha = 1): Promise<Img> {
  const img = await loadImage(url);
  const w = 900, h = Math.max(1, Math.round(img.naturalHeight / img.naturalWidth * w));
  const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Não foi possível preparar a logo.");
  ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = alpha; ctx.drawImage(img, 0, 0, w, h);
  const bin = atob(canvas.toDataURL("image/jpeg", .92).split(",")[1] ?? "");
  const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, width: w, height: h };
}

class Page {
  cmd: string[] = [];
  fill(c: RGB) { this.cmd.push(`${rgb(c)} rg`); }
  stroke(c: RGB) { this.cmd.push(`${rgb(c)} RG`); }
  rect(x: number, top: number, w: number, h: number, fill = true, stroke = false) { this.cmd.push(`${x.toFixed(2)} ${(H-top-h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${fill && stroke ? "B" : fill ? "f" : "S"}`); }
  line(x1:number,y1:number,x2:number,y2:number){ this.cmd.push(`${x1.toFixed(2)} ${(H-y1).toFixed(2)} m ${x2.toFixed(2)} ${(H-y2).toFixed(2)} l S`); }
  text(s:string,x:number,top:number,size=9,opt?:{bold?:boolean;color?:RGB;align?:"left"|"right"|"center"}){
    const bold=opt?.bold??false, color=opt?.color??C.text; let tx=x;
    if(opt?.align==="right") tx-=width(s,size,bold); if(opt?.align==="center") tx-=width(s,size,bold)/2;
    this.cmd.push(`BT /${bold?"F2":"F1"} ${size.toFixed(2)} Tf ${rgb(color)} rg ${tx.toFixed(2)} ${(H-top).toFixed(2)} Td ${lit(s)} Tj ET`);
  }
  image(name:"Logo"|"Water",x:number,top:number,w:number,h:number){ this.cmd.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${(H-top-h).toFixed(2)} cm /${name} Do Q`); }
}

function meta(i?: IdentificacaoCalculo) {
  const a: [string,string][]=[]; if(!i)return a;
  if(i.processo)a.push(["Processo",i.processo]); if(i.clienteCaso)a.push(["Cliente/Caso",i.clienteCaso]);
  if(i.parteAutora)a.push(["Parte autora",i.parteAutora]); if(i.parteRe)a.push(["Parte ré",i.parteRe]);
  if(!i.parteAutora&&i.cliente)a.push(["Cliente",i.cliente]); if(!i.parteRe&&i.parteContraria)a.push(["Parte contrária",i.parteContraria]); return a;
}
function header(p:Page,logo:Img,water:Img,dataBase:string,first=true){
  p.fill(C.navy); p.rect(M,first?30:24,W-M*2,first?68:34);
  if(first){ const lw=122,lh=lw/(logo.width/logo.height); p.image("Logo",M+13,43,lw,lh); p.text("Memória de cálculo judicial",M+160,59,12,{bold:true,color:C.white}); p.text("ATUALIZAÇÃO E DEMONSTRATIVO",M+160,76,7,{color:[216,235,244]}); p.text("DATA-BASE DO CÁLCULO",W-M-16,58,6.3,{color:[188,217,231],align:"right"}); p.text(br(dataBase),W-M-16,76,10.5,{bold:true,color:C.white,align:"right"}); const ww=315,wh=ww/(water.width/water.height); p.image("Water",(W-ww)/2,220,ww,wh); }
  else { p.text("FaroLex",M+12,46,11,{bold:true,color:C.white}); p.text("Memória de cálculo judicial",W-M-12,46,8,{color:[216,235,244],align:"right"}); }
}
function title(p:Page,s:string,y:number){ p.text(s,M,y,12,{bold:true,color:C.navy}); p.stroke(C.border); p.line(M,y+7,W-M,y+7); p.stroke(C.accent); p.line(M,y+7,M+36,y+7); }
function footer(p:Page,n:number,total:number){ p.stroke(C.border); p.line(M,H-31,W-M,H-31); p.text("FaroLex · Memória de cálculo judicial",M,H-18,6.7,{color:C.muted}); p.text(`Página ${n} de ${total}`,W-M,H-18,6.7,{color:C.muted,align:"right"}); }

function build(pages:Page[],logo:Img,water:Img){
  const objs:Uint8Array[]=[]; const add=(o:Uint8Array)=>{objs.push(o);return objs.length};
  const cat=add(E.encode("")), pagesId=add(E.encode(""));
  const f1=add(E.encode("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"));
  const f2=add(E.encode("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"));
  const li=add(stream(logo.bytes,`/Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`));
  const wi=add(stream(water.bytes,`/Type /XObject /Subtype /Image /Width ${water.width} /Height ${water.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`));
  const pids:number[]=[];
  for(const p of pages){ const c=add(stream(E.encode(p.cmd.join("\n")))); pids.push(add(E.encode(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> /XObject << /Logo ${li} 0 R /Water ${wi} 0 R >> >> /Contents ${c} 0 R >>`))); }
  objs[cat-1]=E.encode(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`); objs[pagesId-1]=E.encode(`<< /Type /Pages /Kids [${pids.map(x=>`${x} 0 R`).join(" ")}] /Count ${pids.length} >>`);
  const out:Uint8Array[]=[E.encode("%PDF-1.4\n")], off=[0]; let pos=out[0]!.length;
  objs.forEach((o,i)=>{off[i+1]=pos; const a=E.encode(`${i+1} 0 obj\n`),b=E.encode("\nendobj\n"); out.push(a,o,b); pos+=a.length+o.length+b.length;});
  const x=pos; let xr=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`; for(let i=1;i<=objs.length;i++)xr+=`${String(off[i]).padStart(10,"0")} 00000 n \n`; xr+=`trailer\n<< /Size ${objs.length+1} /Root ${cat} 0 R >>\nstartxref\n${x}\n%%EOF`; out.push(E.encode(xr)); return new Blob([join(out)],{type:"application/pdf"});
}

export async function exportarCalculoPdfFinal(nome:string,dataBase:string,criterios:CriteriosCalculo,resultado:ResultadoCalculo,identificacao?:IdentificacaoCalculo){
  const [logo,water]=await Promise.all([jpeg("/faro-logo-white.png",C.navy),jpeg("/faro-logo-navy.png",C.white,.04)]);
  const pages:Page[]=[]; let p=new Page(); pages.push(p); header(p,logo,water,dataBase,true); let y=125;
  p.text(nome,M,y,16,{bold:true,color:C.navy}); p.fill(C.accent); p.rect(M,y+8,52,3); y+=28;
  const m=[...meta(identificacao??criterios.identificacao),["Data-base do cálculo",br(dataBase)] as [string,string]]; const col=(W-M*2)/2; const mh=Math.max(34,Math.ceil(m.length/2)*34);
  p.fill(C.lighter);p.stroke(C.border);p.rect(M,y,W-M*2,mh,true,true); m.forEach(([k,v],i)=>{const x=M+(i%2)*col+10,yy=y+Math.floor(i/2)*34+12;p.text(k.toUpperCase(),x,yy,6.4,{color:C.muted});p.text(wrap(v,col-20,8.6)[0]??"",x,yy+13,8.6,{bold:true});}); y+=mh+22;

  title(p,"Resumo das verbas",y); y+=20;
  const cards:[[string,number],[string,number],[string,number],[string,number]]=[["Principal",resultado.principal],["Correção monetária",resultado.correcao],["Juros",resultado.juros],["Subtotal das verbas",resultado.subtotal]];
  const gap=7,cw=(W-M*2-gap*3)/4; cards.forEach(([k,v],i)=>{const x=M+i*(cw+gap);p.fill(C.light);p.stroke(C.border);p.rect(x,y,cw,47,true,true);p.text(k.toUpperCase(),x+7,y+13,6,{color:C.muted});p.text(money(v),x+7,y+32,9.4,{bold:true,color:C.blue});}); y+=67;

  title(p,"Memória de cálculo",y); y+=16;
  const widths=[88,48,74,56,72,72,85], xs:number[]=[]; let xx=M; widths.forEach(w=>{xs.push(xx);xx+=w});
  const tableHeader=()=>{p.fill(C.blue);p.rect(M,y,widths.reduce((a,b)=>a+b,0),22);["Verba","Data","Principal","Fator","Correção","Juros","Atualizado"].forEach((h,i)=>p.text(h,xs[i]!+widths[i]!/2,y+14,6.8,{bold:true,color:C.white,align:"center"}));y+=22;}; tableHeader();
  resultado.memoria.forEach((r,idx)=>{const lines=wrap(r.verba,widths[0]!-8,6.4),rh=Math.max(24,12+lines.length*7);if(y+rh>H-58){p=new Page();pages.push(p);header(p,logo,water,dataBase,false);y=76;title(p,"Memória de cálculo · continuação",y);y+=16;tableHeader();}if(idx%2){p.fill(C.lighter);p.rect(M,y,widths.reduce((a,b)=>a+b,0),rh);}p.stroke([220,232,238]);p.line(M,y+rh,M+widths.reduce((a,b)=>a+b,0),y+rh);lines.forEach((s,i)=>p.text(s,xs[0]!+4,y+15+i*7,6.4));const vals=[br(r.data),money(r.principal),r.fatorCorrecao.toFixed(6),money(r.correcao),money(r.juros),money(r.atualizado)];vals.forEach((s,i)=>p.text(s,xs[i+1]!+widths[i+1]!-4,y+15,6.3,{bold:i===5,color:i===5?C.blue:C.text,align:"right"}));y+=rh;}); y+=18;

  const newPage=()=>{p=new Page();pages.push(p);header(p,logo,water,dataBase,false);y=78;};
  const ensure=(need:number)=>{if(y+need>H-58)newPage();};
  const periods=resultado.memoria.flatMap(r=>(r.periodosJuros??[]).map(q=>({verba:r.verba,...q})));
  if(periods.length){ensure(65);title(p,"Taxa Legal — períodos aplicados",y);y+=22;for(const q of periods){ensure(36);p.fill(C.light);p.rect(M,y,W-M*2,31);p.text(`${q.verba} · ${q.descricao}`,M+10,y+12,8,{bold:true,color:C.blue});p.text(`${br(q.de)} a ${br(q.ate)}`,M+10,y+24,7,{color:C.muted});p.text(money(q.juros),W-M-10,y+19,9,{bold:true,color:C.blue,align:"right"});y+=37;}y+=8;}

  ensure(150); title(p,"Fechamento do cálculo",y); y+=22;
  const rows:[string,number][]=[["Subtotal das verbas",resultado.subtotal],["Multa de execução",resultado.multaExecucao],["Honorários de execução",resultado.honorariosExecucao],["Honorários sucumbenciais",resultado.honorariosSucumbenciais],["Pagamentos / abatimentos",-resultado.abatimentos]];
  rows.forEach(([k,v],i)=>{p.fill(i===0?C.light:C.white);p.stroke(C.border);p.rect(M,y,W-M*2,27,true,true);p.text(k,M+10,y+17,8,{bold:i===0});p.text(money(v),W-M-10,y+17,8.5,{bold:true,align:"right",color:i===0?C.blue:C.text});y+=27;}); y+=8;
  p.fill(C.blue);p.rect(M,y,W-M*2,48);p.text("TOTAL ATUALIZADO",M+13,y+29,8,{color:[216,235,244]});p.text(money(resultado.total),W-M-13,y+31,18,{bold:true,color:C.white,align:"right"});y+=66;

  if(resultado.fontes.length){ensure(60);title(p,"Fontes e critérios",y);y+=22;for(const f of resultado.fontes){const ls=wrap(`• ${f}`,W-M*2-22,7.8),hh=ls.length*10+8;ensure(hh+4);p.fill(C.light);p.rect(M,y,W-M*2,hh);ls.forEach((s,i)=>p.text(s,M+10,y+13+i*10,7.8,{color:[64,95,112]}));y+=hh+5;}y+=7;}
  if(criterios.observacoes){const ls=wrap(criterios.observacoes,W-M*2-20,7.8),hh=ls.length*10+18;ensure(hh+30);title(p,"Observações",y);y+=22;p.fill([237,246,250]);p.stroke(C.border);p.rect(M,y,W-M*2,hh,true,true);ls.forEach((s,i)=>p.text(s,M+10,y+14+i*10,7.8,{color:[49,86,104]}));y+=hh;}

  pages.forEach((pg,i)=>footer(pg,i+1,pages.length)); const blob=build(pages,logo,water); const url=URL.createObjectURL(blob); const a=document.createElement("a");a.href=url;a.download=`calculo-${safe(nome)}-${new Date().toISOString().slice(0,10)}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
