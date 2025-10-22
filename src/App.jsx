diff --git a/src/App.jsx b/src/App.jsx
index 21b136ac4a861de7c7e21dfeffdeb49798b46f80..bca1899542edaf5df0f307d59a6ef7fa5b34d49b 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -1,1025 +1,931 @@
 import React, { useEffect, useMemo, useRef, useState } from "react";
 
 /********************
  * Utils
  ********************/
 const brl = (n) => Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
 const pct = (n) => (isFinite(Number(n)) ? Number(n) : 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%";
 const currencyToNumber = (s) => {
   if (typeof s === "number") return s;
   if (!s) return 0;
   const clean = s.toString().replace(/[R$\s\.]/g, "").replace(",", ".");
   const num = parseFloat(clean);
-  return isNaN(num) ? 0 : num;
+  return Number.isNaN(num) ? 0 : num;
 };
 const calcularTIR = (fluxos, chute = 0.1) => {
-  let taxa = chute, iter = 0;
-  const max = 1000, eps = 1e-4;
+  let taxa = chute;
+  let iter = 0;
+  const max = 1000;
+  const eps = 1e-4;
   while (iter < max) {
-    let vpl = 0, der = 0;
-    for (let i = 0; i < fluxos.length; i++) {
-      vpl += fluxos[i] / Math.pow(1 + taxa, i);
-      der -= (i * fluxos[i]) / Math.pow(1 + taxa, i + 1);
+    let vpl = 0;
+    let derivada = 0;
+    for (let i = 0; i < fluxos.length; i += 1) {
+      const fator = Math.pow(1 + taxa, i);
+      vpl += fluxos[i] / fator;
+      derivada -= (i * fluxos[i]) / (fator * (1 + taxa));
     }
-    if (Math.abs(vpl) < eps || der === 0) break;
-    taxa = taxa - vpl / der;
-    iter++;
+    if (Math.abs(vpl) < eps || derivada === 0) break;
+    taxa -= vpl / derivada;
+    iter += 1;
   }
   return iter < max ? taxa * 100 : 0;
 };
 
 /********************
- * Logo
+ * Assets
  ********************/
 const ALVO_LOGO = "data:image/svg+xml,%3Csvg width='1200' height='400' viewBox='0 0 1200 400' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50' y='300' font-family='Arial' font-size='280' font-weight='900' fill='%233A3A3A' letter-spacing='-10'%3EALVO%3C/text%3E%3Ccircle cx='950' cy='200' r='140' stroke='%233A3A3A' stroke-width='28' fill='none'/%3E%3Ccircle cx='950' cy='200' r='85' stroke='%233A3A3A' stroke-width='20' fill='none'/%3E%3Ctext x='1050' y='235' font-family='Arial' font-size='95' font-weight='700' fill='%2334747E'%3EBR%3C/text%3E%3C/svg%3E";
 const AlvoLogo = ({ size = 48 }) => <img src={ALVO_LOGO} alt="Alvo BR" style={{ height: size, width: "auto" }} />;
 
 /********************
- * PDF libs (custom slicer para evitar 32 páginas por zoom)
+ * PDF libs
  ********************/
 async function ensurePdfLibs() {
   const needH2C = typeof window !== "undefined" && !window.html2canvas;
   const needJSPDF = typeof window !== "undefined" && !(window.jspdf && window.jspdf.jsPDF);
   const loaders = [];
   if (needH2C) loaders.push(loadScript("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"));
   if (needJSPDF) loaders.push(loadScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"));
   if (loaders.length) await Promise.all(loaders);
 }
 function loadScript(src) {
   return new Promise((resolve, reject) => {
     const s = document.createElement("script");
-    s.src = src; s.async = true;
+    s.src = src;
+    s.async = true;
     s.onload = () => resolve();
     s.onerror = () => reject(new Error("Falha ao carregar " + src));
     document.head.appendChild(s);
   });
 }
 
 /********************
  * Defaults
  ********************/
 const sample = {
   company: "Alvo BR Imobiliária",
   date: new Date().toISOString().slice(0, 10),
   consultor: "Nome do Consultor",
   phone: "(47) 9 9999-9999",
   email: "contato@alvobr.com.br",
   siteUrl: "https://alvobr.com.br",
   cliente: "Nome do Cliente",
   clientePhone: "(47) 9 8888-8888",
   clienteEmail: "cliente@email.com",
   recursosCliente: 0,
   empreendimento: "Nome do Empreendimento",
   endereco: "Endereço completo — Itajaí/SC",
   construtora: "Nome da Construtora",
   tipo: "Apartamento 2 suítes",
   area: 74,
   vagas: 2,
   entrega: "Dezembro/2026",
   valorTotal: 980000,
-  // Fluxo (nominal), porcentagem apenas para CHAVES
   entradaValor: 98000,
   entradaParcelas: 1,
   obraParcelaValor: 12250,
   duranteObraParcelas: 36,
   chavesPercent: 45,
-  chavesForma: "financiamento", // financiamento | avista | posConstrutora
+  chavesForma: "financiamento",
   chavesPosParcelas: 0,
-  // Reforços (antes chamados Balões)
   balaoValor: 0,
   balaoQuantidade: 0,
   balaoFrequenciaMeses: 6,
   prazoObraAnos: 3,
-  apreciacao: 18, // % a.a.
-  adrDiaria: 350, ocupacao: 70, custosOperacionais: 30,
+  apreciacao: 18,
+  adrDiaria: 350,
+  ocupacao: 70,
+  custosOperacionais: 30,
   validade: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
 };
 
 /********************
- * App (single column)
+ * App
  ********************/
 export default function App() {
-  const [step, setStep] = useState("setup"); // setup | resultado
+  const [step, setStep] = useState("setup");
   const [data, setData] = useState(sample);
   const resultRef = useRef(null);
 
-  // Prazo de obra governa nº de parcelas e anos de valorização
   useEffect(() => {
-    setData((d) => {
-      const anos = Number(d.prazoObraAnos || 0);
-      if (!anos) return d;
+    setData((prev) => {
+      const anos = Number(prev.prazoObraAnos || 0);
+      if (!anos) return prev;
       const alvoParcelas = anos * 12;
-      const aindaPadrao = !d.duranteObraParcelas || d.duranteObraParcelas === sample.prazoObraAnos * 12;
+      const aindaPadrao = !prev.duranteObraParcelas || prev.duranteObraParcelas === sample.prazoObraAnos * 12;
       return {
-        ...d,
-        duranteObraParcelas: aindaPadrao ? alvoParcelas : d.duranteObraParcelas,
+        ...prev,
+        duranteObraParcelas: aindaPadrao ? alvoParcelas : prev.duranteObraParcelas,
       };
     });
   }, [data.prazoObraAnos]);
 
-  // Cálculos
   const valores = useMemo(() => {
-    const total = Number(data.valorTotal || 0);
+    const total = Math.max(0, Number(data.valorTotal || 0));
 
-    // Entrada NOMINAL (com possibilidade futura de parcelas de entrada)
-    const entradaValor = Number(data.entradaValor || 0);
+    const entradaValor = Math.max(0, Number(data.entradaValor || 0));
     const entradaParcelas = Math.max(1, Number(data.entradaParcelas || 1));
-    const entradaParcela = entradaValor / entradaParcelas;
+    const entradaParcela = entradaParcelas ? entradaValor / entradaParcelas : 0;
 
-    // Obra NOMINAL
-    const parcelasObra = Number(data.duranteObraParcelas || 0);
-    const duranteObraParcela = Number(data.obraParcelaValor || 0);
-    const duranteObraTotal = duranteObraParcela * Math.max(0, parcelasObra);
+    const parcelasObra = Math.max(0, Number(data.duranteObraParcelas || 0));
+    const duranteObraParcela = Math.max(0, Number(data.obraParcelaValor || 0));
+    const duranteObraTotal = duranteObraParcela * parcelasObra;
 
-    // Chaves (SOMENTE %)
-    const chavesTotal = (total * Number(data.chavesPercent || 0)) / 100;
-    const chavesFinanciado = data.chavesForma === "financiamento";
-
-    // Reforços (antes Balões) NOMINAIS — passam a compor o investimento real e o fluxo
     const qRef = Math.max(0, Number(data.balaoQuantidade || 0));
     const vRef = Math.max(0, Number(data.balaoValor || 0));
     const freqRef = Math.max(1, Number(data.balaoFrequenciaMeses || 1));
     const reforcosTotal = qRef * vRef;
 
-    const valorInvestidoReal =
-      (entradaValor + duranteObraTotal + reforcosTotal) + (chavesFinanciado ? 0 : chavesTotal);
+    const chavesPercent = Math.max(0, Number(data.chavesPercent || 0));
+    const chavesTotal = (total * chavesPercent) / 100;
+    const chavesFinanciado = data.chavesForma === "financiamento";
+    const totalPosChaves = data.chavesForma === "posConstrutora" ? chavesTotal : 0;
+    const totalFinanciado = chavesFinanciado ? chavesTotal : 0;
+    const chavesNoFluxo = data.chavesForma === "avista" ? chavesTotal : totalPosChaves;
+
+    const totalEntrada = entradaValor;
+    const totalObra = duranteObraTotal;
+    const totalReforcos = reforcosTotal;
+    const totalFluxoSemFin = totalEntrada + totalObra + totalReforcos + chavesNoFluxo;
+    const totalAteChaves = totalEntrada + totalObra + totalReforcos;
 
-    const recursosCliente = 0;
-    const saldoACompor = Math.max(0, valorInvestidoReal);
+    const valorInvestidoReal = totalEntrada + totalObra + totalReforcos + (chavesFinanciado ? 0 : chavesTotal);
+    const saldoACompor = Math.max(0, total - valorInvestidoReal);
 
-    const precoM2 = (Number(data.area || 0) > 0) ? total / Number(data.area) : 0;
+    const precoM2 = Number(data.area || 0) > 0 ? total / Number(data.area) : 0;
 
-    // cronograma (datas) – respeitando entrada, obra, REFORÇOS ANTES das chaves
     const hoje = new Date();
-    const schedule = [];
+    const scheduleBase = [];
 
-    // Entradas
-    for (let i = 1; i <= entradaParcelas; i++) {
-      const d = new Date(hoje); d.setMonth(d.getMonth() + (i - 1));
-      schedule.push({ tipo: entradaParcelas === 1 ? `Entrada (ato)` : `Entrada ${i}/${entradaParcelas}` , data: d, valor: entradaParcela });
+    for (let i = 1; i <= entradaParcelas; i += 1) {
+      const d = new Date(hoje);
+      d.setMonth(d.getMonth() + (i - 1));
+      scheduleBase.push({ tipo: entradaParcelas === 1 ? "Entrada (ato)" : `Entrada ${i}/${entradaParcelas}`, data: d, valor: entradaParcela });
     }
-    // Durante a obra
-    for (let i = 1; i <= parcelasObra; i++) {
-      const d = new Date(hoje); d.setMonth(d.getMonth() + i);
-      schedule.push({ tipo: `Obra ${i}/${parcelasObra}`, data: d, valor: duranteObraParcela });
+    for (let i = 1; i <= parcelasObra; i += 1) {
+      const d = new Date(hoje);
+      d.setMonth(d.getMonth() + i);
+      scheduleBase.push({ tipo: `Obra ${i}/${parcelasObra}`, data: d, valor: duranteObraParcela });
     }
-    // Reforços (posicionados durante a obra; não depois das chaves)
     if (qRef > 0 && vRef > 0) {
-      for (let i = 0; i < qRef; i++) {
+      for (let i = 0; i < qRef; i += 1) {
+        const d = new Date(hoje);
         const mesDentroDaObra = Math.min(parcelasObra, 1 + i * freqRef);
-        const d = new Date(hoje); d.setMonth(d.getMonth() + mesDentroDaObra);
-        schedule.push({ tipo: `Reforço ${i + 1}/${qRef}`, data: d, valor: vRef });
+        d.setMonth(d.getMonth() + mesDentroDaObra);
+        scheduleBase.push({ tipo: `Reforço ${i + 1}/${qRef}`, data: d, valor: vRef });
       }
     }
-    // Chaves
     if (data.chavesForma === "avista" && chavesTotal > 0) {
-      const d = new Date(hoje); d.setMonth(d.getMonth() + parcelasObra + 1);
-      schedule.push({ tipo: "Chaves (à vista)", data: d, valor: chavesTotal });
+      const d = new Date(hoje);
+      d.setMonth(d.getMonth() + parcelasObra + 1);
+      scheduleBase.push({ tipo: "Chaves (à vista)", data: d, valor: chavesTotal });
     }
     if (data.chavesForma === "posConstrutora" && chavesTotal > 0) {
-      const pcs = Number(data.chavesPosParcelas || 0);
-      for (let i = 1; i <= pcs; i++) {
-        const d = new Date(hoje); d.setMonth(d.getMonth() + parcelasObra + i);
-        schedule.push({ tipo: `Pós-chaves ${i}/${pcs}` , data: d, valor: chavesTotal / Math.max(pcs, 1) });
+      const pcs = Math.max(1, Number(data.chavesPosParcelas || 1));
+      for (let i = 1; i <= pcs; i += 1) {
+        const d = new Date(hoje);
+        d.setMonth(d.getMonth() + parcelasObra + i);
+        scheduleBase.push({ tipo: `Pós-chaves ${i}/${pcs}`, data: d, valor: chavesTotal / pcs });
       }
     }
 
-    const entradaPercent = total > 0 ? (entradaValor / total) * 100 : 0;
-    const duranteObraPercent = total > 0 ? (100 * duranteObraTotal) / total : 0;
+    const scheduleOrdenado = scheduleBase.sort((a, b) => a.data - b.data);
+    let acumulado = 0;
+    const schedule = scheduleOrdenado.map((item, index) => {
+      acumulado += item.valor;
+      const perc = totalFluxoSemFin > 0 ? (acumulado / totalFluxoSemFin) * 100 : 0;
+      return { ...item, index: index + 1, acumulado, perc };
+    });
 
-    const totalEntrada = entradaValor;
-    const totalObra = duranteObraTotal;
-    const totalReforcos = reforcosTotal;
-    const totalPosChaves = (data.chavesForma === 'posConstrutora') ? chavesTotal : 0;
-    const totalFinanciado = chavesFinanciado ? chavesTotal : 0;
-    const totalFluxoSemFin = totalEntrada + totalObra + totalReforcos + (data.chavesForma === 'avista' ? chavesTotal : totalPosChaves);
-    const totalAteChaves = totalEntrada + totalObra + totalReforcos;
+    const entradaPercent = total > 0 ? (entradaValor / total) * 100 : 0;
+    const duranteObraPercent = total > 0 ? (duranteObraTotal / total) * 100 : 0;
 
     return {
       total,
-      entradaValor, entradaParcelas, entradaParcela, entradaPercent,
-      duranteObraTotal, duranteObraParcela, duranteObraParcelas: parcelasObra, duranteObraPercent,
-      chavesTotal, chavesFinanciado, reforcosTotal, valorInvestidoReal, recursosCliente, saldoACompor, schedule,
+      entradaValor,
+      entradaParcelas,
+      entradaParcela,
+      entradaPercent,
+      duranteObraTotal,
+      duranteObraParcela,
+      duranteObraParcelas: parcelasObra,
+      duranteObraPercent,
+      reforcosTotal,
+      qRef,
+      vRef,
+      freqRef,
+      chavesTotal,
+      chavesFinanciado,
+      totalPosChaves,
+      totalFinanciado,
+      totalFluxoSemFin,
+      totalAteChaves,
+      valorInvestidoReal,
+      saldoACompor,
       precoM2,
-      qRef, vRef, freqRef,
-      totalEntrada, totalObra, totalReforcos, totalPosChaves, totalFinanciado, totalFluxoSemFin, totalAteChaves
+      totalEntrada,
+      totalObra,
+      totalReforcos,
+      schedule,
     };
   }, [data]);
 
-  // Fluxos p/ TIR
   const buildFluxosBase = (incluirChaves = true) => {
     const fluxos = [];
-    // Entradas
-    for (let i = 0; i < valores.entradaParcelas; i++) fluxos.push(-valores.entradaParcela);
-    // Obra (cresce mês a mês)
-    for (let i = 0; i < valores.duranteObraParcelas; i++) fluxos.push(-valores.duranteObraParcela);
-    // Reforços entram DENTRO da obra (somados ao mês correspondente)
+    for (let i = 0; i < valores.entradaParcelas; i += 1) fluxos.push(-valores.entradaParcela);
+    for (let i = 0; i < valores.duranteObraParcelas; i += 1) fluxos.push(-valores.duranteObraParcela);
     if (valores.qRef > 0 && valores.vRef > 0) {
-      for (let i = 0; i < valores.qRef; i++) {
+      for (let i = 0; i < valores.qRef; i += 1) {
         const mesDentroDaObra = Math.min(valores.duranteObraParcelas, 1 + i * valores.freqRef);
-        const idx = valores.entradaParcelas + (mesDentroDaObra - 1); // 0-based
-        if (idx >= 0 && idx < fluxos.length) fluxos[idx] += -valores.vRef; else {
+        const idx = valores.entradaParcelas + (mesDentroDaObra - 1);
+        if (idx >= 0 && idx < fluxos.length) fluxos[idx] += -valores.vRef;
+        else {
           while (fluxos.length <= idx) fluxos.push(0);
           fluxos[idx] += -valores.vRef;
         }
       }
     }
-    // Chaves
     if (incluirChaves) {
       if (data.chavesForma === "avista") fluxos.push(-valores.chavesTotal);
-      else if (data.chavesForma === "posConstrutora") {
-        const pcs = Number(data.chavesPosParcelas || 0);
-        for (let i = 0; i < pcs; i++) fluxos.push(-(valores.chavesTotal / Math.max(pcs, 1)));
-      } else {
-        // financiamento: não entra como saída de caixa do investidor
-        for (let i = 0; i < 12; i++) fluxos.push(0);
+      if (data.chavesForma === "posConstrutora") {
+        const pcs = Math.max(1, Number(data.chavesPosParcelas || 1));
+        for (let i = 0; i < pcs; i += 1) fluxos.push(-(valores.chavesTotal / pcs));
+      }
+      if (data.chavesForma === "financiamento") {
+        for (let i = 0; i < 12; i += 1) fluxos.push(0);
       }
     }
     return fluxos;
   };
 
-  // Cenários
   const cenario1 = useMemo(() => {
-    const anos = Number(data.prazoObraAnos || 0);
-    const taxa = Number(data.apreciacao || 0) / 100;
+    const anos = Math.max(0, Number(data.prazoObraAnos || 0));
+    const taxa = Math.max(0, Number(data.apreciacao || 0)) / 100;
     const valorFinal = valores.total * Math.pow(1 + taxa, anos);
     const lucro = valorFinal - valores.total;
-    const roi = (lucro / valores.total) * 100;
-    const roas = (lucro / valores.valorInvestidoReal) * 100;
+    const roi = valores.total > 0 ? (lucro / valores.total) * 100 : 0;
+    const roas = valores.valorInvestidoReal > 0 ? (lucro / valores.valorInvestidoReal) * 100 : 0;
     const fluxos = buildFluxosBase(true);
     fluxos.push(valorFinal);
     const tir = calcularTIR(fluxos);
     const tirAnual = (Math.pow(1 + tir / 100, 12) - 1) * 100;
     return { valorFinal, lucro, roi, roas, tir: tirAnual, prazo: anos };
   }, [valores, data]);
 
   const cenario2 = useMemo(() => {
-    const anosEntrega = Number(data.prazoObraAnos || 0);
-    const taxa = Number(data.apreciacao || 0) / 100;
+    const anosEntrega = Math.max(0, Number(data.prazoObraAnos || 0));
+    const taxa = Math.max(0, Number(data.apreciacao || 0)) / 100;
     const valorFinal = valores.total * Math.pow(1 + taxa, anosEntrega);
     const patrimonioAcrescido = valorFinal - valores.total;
 
-    const adrDiaria = Number(data.adrDiaria || 0);
-    const ocupacao = Number(data.ocupacao || 0) / 100;
-    const custos = Number(data.custosOperacionais || 0) / 100;
+    const adrDiaria = Math.max(0, Number(data.adrDiaria || 0));
+    const ocupacao = Math.max(0, Number(data.ocupacao || 0)) / 100;
+    const custos = Math.max(0, Number(data.custosOperacionais || 0)) / 100;
     const receitaMensalBruta = adrDiaria * ocupacao * 30;
     const aluguelLiquido = receitaMensalBruta * (1 - custos);
 
-    const mesesOperacao = 5 * 12; // 5 anos fixos
+    const mesesOperacao = 5 * 12;
     const rendaAcumulada = aluguelLiquido * mesesOperacao;
 
     const retornoTotal = patrimonioAcrescido + rendaAcumulada;
-    const roi = (retornoTotal / valores.total) * 100;
-    const roas = (retornoTotal / valores.valorInvestidoReal) * 100;
+    const roi = valores.total > 0 ? (retornoTotal / valores.total) * 100 : 0;
+    const roas = valores.valorInvestidoReal > 0 ? (retornoTotal / valores.valorInvestidoReal) * 100 : 0;
 
     const fluxos = buildFluxosBase(true);
-    for (let i = 0; i < mesesOperacao; i++) fluxos.push(aluguelLiquido);
+    for (let i = 0; i < mesesOperacao; i += 1) fluxos.push(aluguelLiquido);
     fluxos.push(valorFinal);
-
     const tir = calcularTIR(fluxos);
     const tirAnual = (Math.pow(1 + tir / 100, 12) - 1) * 100;
 
-    return { valorFinal, patrimonioAcrescido, adrDiaria, receitaMensalBruta, aluguelLiquido, rendaAcumulada, retornoTotal, roi, roas, tir: tirAnual, prazoTotal: anosEntrega + 5 };
+    return {
+      valorFinal,
+      patrimonioAcrescido,
+      adrDiaria,
+      receitaMensalBruta,
+      aluguelLiquido,
+      rendaAcumulada,
+      retornoTotal,
+      roi,
+      roas,
+      tir: tirAnual,
+      prazoTotal: anosEntrega + 5,
+    };
   }, [valores, data]);
 
-  // Handlers
   const handle = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }));
   const handleNumeric = (k) => (e) => setData((d) => ({ ...d, [k]: currencyToNumber(e.target.value) }));
   const handlePercent = (k) => (e) => {
     const num = parseFloat((e.target.value + "").replace(",", "."));
-    setData((d) => ({ ...d, [k]: isNaN(num) ? 0 : num }));
+    setData((d) => ({ ...d, [k]: Number.isNaN(num) ? 0 : num }));
   };
 
-  /********************
-   * PDF multipágina sem zoom extra (slicing em A4)
-   ********************/
   const savePDF = async () => {
     await ensurePdfLibs();
     const { jsPDF } = window.jspdf;
     const node = resultRef.current;
+    if (!node) return;
 
-    // Força largura exata da página virtual para captura perfeita
     const originalWidth = node.style.width;
-    node.style.width = "794px"; // A4 a ~96dpi
+    node.style.width = "794px";
 
     const canvas = await window.html2canvas(node, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
     const pdf = new jsPDF("p", "mm", "a4");
     const pageWidth = pdf.internal.pageSize.getWidth();
     const pageHeight = pdf.internal.pageSize.getHeight();
 
-    const imgWidth = pageWidth; // preencher a largura
+    const imgWidth = pageWidth;
     const pageHeightPx = (canvas.width * pageHeight) / pageWidth;
 
     let position = 0;
     let pageIndex = 0;
-
     while (position < canvas.height) {
       const sliceCanvas = document.createElement("canvas");
       sliceCanvas.width = canvas.width;
       sliceCanvas.height = Math.min(pageHeightPx, canvas.height - position);
       const sliceCtx = sliceCanvas.getContext("2d");
       sliceCtx.drawImage(canvas, 0, position, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
       const sliceData = sliceCanvas.toDataURL("image/png");
 
       if (pageIndex > 0) pdf.addPage();
       pdf.addImage(sliceData, "PNG", 0, 0, imgWidth, (sliceCanvas.height * imgWidth) / canvas.width);
 
       position += pageHeightPx;
-      pageIndex++;
+      pageIndex += 1;
     }
 
     node.style.width = originalWidth || "";
 
     const file = `Proposta_Alvo_${(data.cliente || "cliente").replace(/\s+/g, "_")}.pdf`;
     pdf.save(file);
   };
 
-  const gerarProposta = () => setStep("resultado"); // NÃO baixa PDF automaticamente
+  const gerarProposta = () => setStep("resultado");
   const fillExample = () => setData(sample);
   const clearAll = () => setData({});
 
   return (
     <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
-      {/* Topbar */}
       <div className="sticky top-0 z-40 backdrop-blur border-b bg-white/80">
         <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
           <AlvoLogo size={36} />
           <div className="flex-1">
             <h1 className="text-xl font-semibold">Alvo Propostas</h1>
-            <p className="text-xs text-gray-500">Página {step === "setup" ? "de Edição" : "da Proposta"} · PDF multipágina (corrigido)</p>
+            <p className="text-xs text-gray-500">
+              Página {step === "setup" ? "de Edição" : "da Proposta"} · PDF multipágina alinhado
+            </p>
           </div>
           <div className="flex items-center gap-2">
-            <button onClick={fillExample} className="px-3 py-2 rounded-2xl bg-white shadow-sm border text-sm">Exemplo</button>
-            <button onClick={clearAll} className="px-3 py-2 rounded-2xl bg-white shadow-sm border text-sm">Limpar</button>
+            <button onClick={fillExample} className="px-3 py-2 rounded-2xl bg-white shadow-sm border text-sm">
+              Exemplo
+            </button>
+            <button onClick={clearAll} className="px-3 py-2 rounded-2xl bg-white shadow-sm border text-sm">
+              Limpar
+            </button>
             {step === "resultado" ? (
               <>
-                <button onClick={() => setStep("setup")} className="px-3 py-2 rounded-2xl bg-white shadow-sm border text-sm">Voltar ao Setup</button>
-                <button onClick={savePDF} className="px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm">Baixar PDF</button>
+                <button
+                  onClick={() => setStep("setup")}
+                  className="px-3 py-2 rounded-2xl bg-white shadow-sm border text-sm"
+                >
+                  Voltar ao Setup
+                </button>
+                <button
+                  onClick={savePDF}
+                  className="px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
+                >
+                  Baixar PDF
+                </button>
               </>
             ) : (
-              <button onClick={gerarProposta} className="px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm">Gerar Proposta</button>
+              <button
+                onClick={gerarProposta}
+                className="px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
+              >
+                Gerar Proposta
+              </button>
             )}
           </div>
         </div>
       </div>
 
       {step === "setup" ? (
-        /* ---------- SETUP: SINGLE COLUMN (rolagem contínua) ---------- */
-        <div className="mx-auto max-w-7xl p-6 space-y-6">
+        <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
           <Card title="1) Empresa">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               <Input label="Empresa" value={data.company || ""} onChange={handle("company")} />
               <Input label="Data" value={data.date || ""} onChange={handle("date")} />
               <Input label="Consultor" value={data.consultor || ""} onChange={handle("consultor")} />
               <Input label="Telefone" value={data.phone || ""} onChange={handle("phone")} />
               <Input label="E-mail" value={data.email || ""} onChange={handle("email")} />
               <Input label="Site (URL)" value={data.siteUrl || ""} onChange={handle("siteUrl")} placeholder="https://alvobr.com.br" />
             </div>
           </Card>
 
           <Card title="2) Cliente">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               <Input label="Nome" value={data.cliente || ""} onChange={handle("cliente")} />
               <Input label="Telefone" value={data.clientePhone || ""} onChange={handle("clientePhone")} />
-              <Input label="E-mail" value={data.clienteEmail || ""} onChange={handle("clienteEmail")} /></div>
+              <Input label="E-mail" value={data.clienteEmail || ""} onChange={handle("clienteEmail")} />
+            </div>
           </Card>
 
           <Card title="3) Empreendimento">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               <Input label="Nome" value={data.empreendimento || ""} onChange={handle("empreendimento")} />
               <Input label="Endereço" value={data.endereco || ""} onChange={handle("endereco")} />
               <Input label="Construtora" value={data.construtora || ""} onChange={handle("construtora")} />
               <Input label="Tipo" value={data.tipo || ""} onChange={handle("tipo")} />
               <Input label="Área (m²)" value={data.area ?? ""} onChange={handleNumeric("area")} />
               <Input label="Vagas de garagem" value={data.vagas ?? ""} onChange={handleNumeric("vagas")} />
               <Input label="Entrega (texto)" value={data.entrega || ""} onChange={handle("entrega")} />
             </div>
           </Card>
 
           <Card title="4) Fluxo de Pagamento (nominal)">
             <div className="space-y-4">
-              {/* Valor total */}
               <div className="rounded-xl border p-3 bg-slate-50">
                 <p className="text-sm font-semibold mb-2">Valor do Imóvel</p>
-                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
-                  <Input label="Valor total do imóvel (R$)" value={data.valorTotal ?? ""} onChange={handleNumeric("valorTotal")} />
-                </div>
+                <Input label="Valor total do imóvel (R$)" value={data.valorTotal ?? ""} onChange={handleNumeric("valorTotal")} />
               </div>
 
-              {/* Entrada (NOMINAL) */}
               <div className="rounded-xl border p-3 bg-slate-50">
                 <p className="text-sm font-semibold mb-2">Entrada (nominal)</p>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                   <Input label="Total de Entrada (R$)" value={data.entradaValor ?? ""} onChange={handleNumeric("entradaValor")} />
                   <Input label="Parcelas de entrada" value={data.entradaParcelas ?? ""} onChange={handleNumeric("entradaParcelas")} />
-                  <div className="text-xs text-gray-600">Parcela estimada:<br/><strong>{brl((data.entradaValor||0)/Math.max(1, data.entradaParcelas||1))}</strong></div>
+                  <div className="text-xs text-gray-600">
+                    Parcela estimada:
+                    <br />
+                    <strong>{brl((data.entradaValor || 0) / Math.max(1, data.entradaParcelas || 1))}</strong>
+                  </div>
                 </div>
               </div>
 
-              {/* Durante a obra (NOMINAL) */}
               <div className="rounded-xl border p-3 bg-slate-50">
                 <p className="text-sm font-semibold mb-2">Durante a obra (nominal)</p>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                   <Input label="Parcela de obra (R$)" value={data.obraParcelaValor ?? ""} onChange={handleNumeric("obraParcelaValor")} />
                   <Input label="Nº de parcelas de obra" value={data.duranteObraParcelas ?? ""} onChange={handleNumeric("duranteObraParcelas")} />
-                  <div className="text-xs text-gray-600">Total em obra:<br/><strong>{brl((data.obraParcelaValor||0)*(data.duranteObraParcelas||0))}</strong></div>
+                  <div className="text-xs text-gray-600">
+                    Total em obra:
+                    <br />
+                    <strong>{brl((data.obraParcelaValor || 0) * (data.duranteObraParcelas || 0))}</strong>
+                  </div>
                 </div>
               </div>
 
-              {/* REFORÇOS (ex-Balões) */}
               <div className="rounded-xl border p-3 bg-slate-50">
                 <p className="text-sm font-semibold mb-2">Reforços (nominais)</p>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                   <Input label="Valor do reforço (R$)" value={data.balaoValor ?? ""} onChange={handleNumeric("balaoValor")} />
                   <Input label="Qtde de reforços" value={data.balaoQuantidade ?? ""} onChange={handleNumeric("balaoQuantidade")} />
                   <Input label="Frequência (meses)" value={data.balaoFrequenciaMeses ?? ""} onChange={handleNumeric("balaoFrequenciaMeses")} />
                 </div>
-                <div className="mt-2 text-xs text-gray-600">Total em reforços: <strong>{brl((data.balaoValor||0)*(data.balaoQuantidade||0))}</strong></div>
+                <div className="mt-2 text-xs text-gray-600">
+                  Total em reforços: <strong>{brl((data.balaoValor || 0) * (data.balaoQuantidade || 0))}</strong>
+                </div>
               </div>
 
-              {/* Chaves (APENAS %) */}
               <div className="rounded-xl border p-3 bg-slate-50">
                 <p className="text-sm font-semibold mb-2">Entrega das chaves</p>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                   <label className="block">
                     <div className="text-xs text-gray-600 mb-1">Forma</div>
-                    <select className="w-full px-3 py-2 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
-                      value={data.chavesForma} onChange={(e)=>setData(d=>({...d, chavesForma: e.target.value}))}>
+                    <select
+                      className="w-full px-3 py-2 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
+                      value={data.chavesForma}
+                      onChange={(e) => setData((d) => ({ ...d, chavesForma: e.target.value }))}
+                    >
                       <option value="financiamento">Financiamento bancário</option>
                       <option value="avista">À vista na entrega</option>
                       <option value="posConstrutora">Parcelado com a construtora (pós-chaves)</option>
                     </select>
                   </label>
                   <Input label="Chaves (% do total)" value={data.chavesPercent ?? ""} onChange={handlePercent("chavesPercent")} />
                   {data.chavesForma === "posConstrutora" && (
                     <Input label="Parcelas pós-chaves" value={data.chavesPosParcelas ?? ""} onChange={handleNumeric("chavesPosParcelas")} />
                   )}
                 </div>
-                {/* resultados embaixo, como pedido */}
                 <div className="mt-2 text-xs text-gray-600 space-y-1">
-                  {data.chavesForma !== 'financiamento' && (<div>Valor das chaves (estimado): <strong>{brl(valores.chavesTotal)}</strong></div>)}
-                  {data.chavesForma === 'financiamento' && (
-                    <div>Valor a financiar (banco): <strong>{brl(valores.chavesTotal)}</strong></div>
+                  {data.chavesForma !== "financiamento" && (
+                    <div>
+                      Valor das chaves (estimado): <strong>{brl(valores.chavesTotal)}</strong>
+                    </div>
                   )}
-                  {data.chavesForma === 'posConstrutora' && (
-                    <div>Pos-chaves em {data.chavesPosParcelas||0}x de <strong>{brl((valores.chavesTotal/Math.max(1, data.chavesPosParcelas||1)))}</strong></div>
+                  {data.chavesForma === "financiamento" && (
+                    <div>
+                      Valor a financiar (banco): <strong>{brl(valores.chavesTotal)}</strong>
+                    </div>
+                  )}
+                  {data.chavesForma === "posConstrutora" && (
+                    <div>
+                      Pós-chaves em {data.chavesPosParcelas || 0}x de <strong>{brl(valores.chavesTotal / Math.max(1, data.chavesPosParcelas || 1))}</strong>
+                    </div>
                   )}
                 </div>
               </div>
 
-              {/* Prazos + Short Stay */}
               <div className="rounded-xl border p-3 bg-slate-50">
                 <p className="text-sm font-semibold mb-2">Prazos e Short Stay</p>
                 <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                   <Input label="Prazo de obra (anos)" value={data.prazoObraAnos ?? ""} onChange={handleNumeric("prazoObraAnos")} />
                   <Input label="Valorização a.a. (%)" value={data.apreciacao ?? ""} onChange={handlePercent("apreciacao")} />
                   <Input label="ADR (R$)" value={data.adrDiaria ?? ""} onChange={handleNumeric("adrDiaria")} />
                   <Input label="Ocupação (%)" value={data.ocupacao ?? ""} onChange={handlePercent("ocupacao")} />
                   <Input label="Custos operac. (%)" value={data.custosOperacionais ?? ""} onChange={handlePercent("custosOperacionais")} />
                 </div>
               </div>
-
-              {/* Resumo do fluxo */}
-              <div className="bg-white border rounded-2xl p-4 shadow-sm text-sm">
-                <p className="font-semibold text-emerald-800 mb-2">Resumo</p>
-                <ul className="space-y-1">
-                  <li>
-                  {valores.entradaParcelas === 1
-                    ? <>Entrada (ato): <strong>{brl(valores.entradaValor)}</strong></>
-                    : <>Entrada: <strong>{brl(valores.entradaValor)}</strong> em <strong>{valores.entradaParcelas}x</strong> ({brl(valores.entradaParcela)}/parcela) — {pct(valores.entradaPercent)}</>
-                  }
-                  </li>
-                  <li>Durante a obra: <strong>{brl(valores.duranteObraTotal)}</strong> em <strong>{valores.duranteObraParcelas}x</strong> ({brl(valores.duranteObraParcela)}/mês) — {pct(valores.duranteObraPercent)}</li>
-                  <li>Reforços: <strong>{brl(valores.reforcosTotal)}</strong> {valores.qRef ? `(${valores.qRef} reforços de ${brl(valores.vRef)} a cada ${valores.freqRef}m)` : ''}</li>
-                  <li>Chaves: {data.chavesForma === 'financiamento' ? <strong>(financ. banco)</strong> : <><strong>{brl(valores.chavesTotal)}</strong> {data.chavesForma === 'posConstrutora' ? `em ${data.chavesPosParcelas || 0}x` : '(à vista)'}</>}</li>
-                </ul>
-                <div className="mt-3 rounded-xl bg-slate-50 border p-3">
-                  Investimento real: <strong>{brl(valores.valorInvestidoReal)}</strong><br />
-                  Saldo a compor: <strong className="text-rose-700\">{brl(valores.saldoACompor)}</strong>
-                </div>
-                <div className="mt-3 rounded-xl bg-white border p-3\">
-                  <p className="font-semibold mb-1\">Totais do fluxo</p>
-                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2\">
-                    <div>Fluxo total (sem financiamento): <strong>{brl(valores.totalFluxoSemFin)}</strong></div>
-                    {data.chavesForma === 'posConstrutora' && (<div>Pós-chaves (total): <strong>{brl(valores.totalPosChaves)}</strong></div>)}
-                    {data.chavesForma === 'financiamento' && (<div>Total financiado (banco): <strong>{brl(valores.totalFinanciado)}</strong></div>)}
-                    <div>Subtotal até chaves: <strong>{brl(valores.totalAteChaves)}</strong></div>
-                  </div>
-                </div>
-              </div>
             </div>
           </Card>
 
-          <div className="flex justify-end">
-            <button onClick={gerarProposta} className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm">Gerar Proposta</button>
+          <div className="bg-white border rounded-2xl p-5 shadow-sm text-sm">
+            <p className="font-semibold text-emerald-800 mb-3">Resumo do fluxo</p>
+            <ul className="space-y-1">
+              <li>
+                {valores.entradaParcelas === 1 ? (
+                  <>
+                    Entrada (ato): <strong>{brl(valores.entradaValor)}</strong>
+                  </>
+                ) : (
+                  <>
+                    Entrada: <strong>{brl(valores.entradaValor)}</strong> em <strong>{valores.entradaParcelas}x</strong> ({brl(valores.entradaParcela)}/parcela) — {pct(valores.entradaPercent)}
+                  </>
+                )}
+              </li>
+              <li>
+                Durante a obra: <strong>{brl(valores.duranteObraTotal)}</strong> em <strong>{valores.duranteObraParcelas}x</strong> ({brl(valores.duranteObraParcela)}/mês) — {pct(valores.duranteObraPercent)}
+              </li>
+              <li>
+                Reforços: <strong>{brl(valores.reforcosTotal)}</strong>{" "}
+                {valores.qRef ? `(${valores.qRef} reforços de ${brl(valores.vRef)} a cada ${valores.freqRef}m)` : ""}
+              </li>
+              <li>
+                Chaves: {data.chavesForma === "financiamento" ? (
+                  <strong>(financ. banco)</strong>
+                ) : (
+                  <>
+                    <strong>{brl(valores.chavesTotal)}</strong>{" "}
+                    {data.chavesForma === "posConstrutora" ? `em ${data.chavesPosParcelas || 0}x` : "(à vista)"}
+                  </>
+                )}
+              </li>
+            </ul>
+            <div className="mt-3 rounded-xl bg-slate-50 border p-3">
+              Investimento real: <strong>{brl(valores.valorInvestidoReal)}</strong>
+              <br />
+              Saldo a compor: <strong className="text-rose-700">{brl(valores.saldoACompor)}</strong>
+            </div>
+            <div className="mt-3 rounded-xl bg-white border p-3">
+              <p className="font-semibold mb-1">Totais do fluxo</p>
+              <ul className="text-xs space-y-1">
+                <li>Entrada: {brl(valores.totalEntrada)}</li>
+                <li>Durante a obra: {brl(valores.totalObra)}</li>
+                <li>Reforços: {brl(valores.totalReforcos)}</li>
+                {data.chavesForma === "posConstrutora" && <li>Pós-chaves: {brl(valores.totalPosChaves)}</li>}
+                {data.chavesForma === "financiamento" && <li>Financiado (banco): {brl(valores.totalFinanciado)}</li>}
+                {data.chavesForma === "avista" && <li>Chaves à vista: {brl(valores.chavesTotal)}</li>}
+                <li>Fluxo total (sem financiamento): {brl(valores.totalFluxoSemFin)}</li>
+                <li>Total até chaves: {brl(valores.totalAteChaves)}</li>
+              </ul>
+            </div>
           </div>
         </div>
       ) : (
-        /* ---------- RESULTADO: BLOCOS SIMÉTRICOS (vai para o PDF) ---------- */
-        <div className="mx-auto max-w-7xl p-6">
-          <div ref={resultRef} className="paper mx-auto bg-white shadow-md rounded-2xl overflow-hidden ring-1 ring-slate-200">
-            {/* capa */}
-            <section className="p-12 page">
-              <div className="flex items-center justify-between">
-                <div>
-                  <h2 className="text-2xl font-extrabold tracking-tight">Proposta Comercial</h2>
-                  <p className="text-xs text-gray-500">{data.company}</p>
-                  <p className="text-xs text-gray-500">{data.date} · {data.consultor}</p>
-                  <p className="text-xs text-gray-500">{data.phone} · {data.email}</p>
-                  {data.siteUrl && <a href={data.siteUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 underline break-all">{data.siteUrl}</a>}
+        <div className="mx-auto max-w-7xl px-6 py-10">
+          <div ref={resultRef} className="paper mx-auto rounded-3xl bg-white shadow-2xl overflow-hidden">
+            <section className="page px-12 py-10 space-y-10">
+              <header className="flex flex-col gap-6">
+                <div className="flex items-start justify-between gap-6">
+                  <div>
+                    <p className="text-xs uppercase tracking-wide text-gray-500">Proposta de Investimento Imobiliário</p>
+                    <h2 className="text-3xl font-semibold text-slate-900">
+                      {data.empreendimento || "Empreendimento"}
+                    </h2>
+                    <p className="text-sm text-gray-500">Emitido em {data.date || "—"}</p>
+                  </div>
+                  <AlvoLogo size={72} />
                 </div>
-                <AlvoLogo size={64} />
-              </div>
-              <p className="mt-4 text-[13px] text-gray-700 leading-6">A <strong>Alvo BR</strong> é especializada em curadoria de investimentos imobiliários, unindo dados, método e resultado.</p>
-              <p className="mt-4 text-[11px] text-gray-500">Validade desta proposta: <strong>{data.validade}</strong></p>
-            </section>
-
-            {/* Resumo Executivo */}
-            <section className="p-12 page page-break\">
-              <h3 className="font-semibold text-lg mb-3\">Resumo Executivo</h3>
-              <div className="grid grid-cols-2 gap-8 text-[13px]\">
-                <div className="grid grid-cols-2 gap-3\">
-                  <KPI title=\"Valor do imóvel\" value={brl(valores.total)} />
-                  <KPI title=\"Investimento real\" value={brl(valores.valorInvestidoReal)} />
-                  <KPI title=\"Fluxo total (sem financiamento)\" value={brl(valores.totalFluxoSemFin)} />
-                  {data.chavesForma === 'posConstrutora' && (<KPI title=\"Pós-chaves (total)\" value={brl(valores.totalPosChaves)} />)}
-                  {data.chavesForma === 'financiamento' && (<KPI title=\"Financiado (banco)\" value={brl(valores.totalFinanciado)} />)}
-                  <KPI title=\"Saldo a compor\" value={brl(valores.saldoACompor)} highlight />
+                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
+                  <div className="rounded-2xl border p-4 bg-slate-50">
+                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Consultoria</p>
+                    <p className="font-semibold text-slate-900">{data.company || "—"}</p>
+                    <p>{data.consultor || "—"}</p>
+                    <p>{data.phone || "—"}</p>
+                    <p>{data.email || "—"}</p>
+                    {data.siteUrl && <p className="text-emerald-700">{data.siteUrl}</p>}
+                  </div>
+                  <div className="rounded-2xl border p-4 bg-white">
+                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Cliente</p>
+                    <p className="font-semibold text-slate-900">{data.cliente || "—"}</p>
+                    <p>{data.clientePhone || "—"}</p>
+                    <p>{data.clienteEmail || "—"}</p>
+                  </div>
                 </div>
-                <div className="rounded-xl border p-4 bg-white\">
-                  <p className="font-semibold mb-2\">Resumo do fluxo</p>
-                  <ul className="space-y-1\">
-                    <li>Entrada: {valores.entradaParcelas === 1 ? brl(valores.entradaValor) : `${brl(valores.entradaValor)} em ${valores.entradaParcelas}x de ${brl(valores.entradaParcela)}`}</li>
-                    <li>Durante a obra: {brl(valores.duranteObraTotal)} em {valores.duranteObraParcelas}x de {brl(valores.duranteObraParcela)}</li>
-                    <li>Reforços: {brl(valores.reforcosTotal)} {valores.qRef ? `(${valores.qRef}× de ${brl(valores.vRef)} a cada ${valores.freqRef}m)` : ''}</li>
-                    <li>Chaves: {data.chavesForma === 'financiamento' ? <strong>(financ. banco)</strong> : <><strong>{brl(valores.chavesTotal)}</strong> {data.chavesForma === 'posConstrutora' ? `em ${data.chavesPosParcelas || 0}x` : '(à vista)'}</>}</li>
-                  </ul>
+              </header>
+
+              <div className="space-y-4">
+                <h3 className="text-lg font-semibold">Resumo Executivo</h3>
+                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
+                  <KPI title="Valor do imóvel" value={brl(valores.total)} />
+                  <KPI title="Investimento real" value={brl(valores.valorInvestidoReal)} />
+                  <KPI title="Fluxo total (sem financiamento)" value={brl(valores.totalFluxoSemFin)} />
+                  {data.chavesForma === "posConstrutora" && <KPI title="Pós-chaves (total)" value={brl(valores.totalPosChaves)} />}
+                  {data.chavesForma === "financiamento" && <KPI title="Financiado (banco)" value={brl(valores.totalFinanciado)} />}
+                  <KPI title="Saldo a compor" value={brl(valores.saldoACompor)} highlight />
                 </div>
               </div>
             </section>
 
-            {/* Bloco 1: Empresa & Cliente */}
-            <section className="p-12 page page-break">
-              <h3 className="font-semibold text-lg mb-3">1. Dados Gerais</h3>
-              <div className="grid grid-cols-2 gap-8 text-[13px]">
+            <section className="page page-break px-12 py-10 space-y-6 text-sm">
+              <h3 className="text-lg font-semibold">1. Dados Gerais</h3>
+              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                   <p className="font-semibold mb-2">Imobiliária / Corretor</p>
                   <DataRow k="Empresa" v={data.company} />
                   <DataRow k="Consultor" v={data.consultor} />
                   <DataRow k="Telefone" v={data.phone} />
                   <DataRow k="E-mail" v={data.email} />
+                  <DataRow k="Site" v={data.siteUrl} />
                 </div>
                 <div>
                   <p className="font-semibold mb-2">Cliente</p>
                   <DataRow k="Nome" v={data.cliente} />
                   <DataRow k="Telefone" v={data.clientePhone} />
                   <DataRow k="E-mail" v={data.clienteEmail} />
-                  </div>
+                </div>
               </div>
             </section>
 
-            {/* Bloco 2: Empreendimento */}
-            <section className="p-12 page page-break">
-              <h3 className="font-semibold text-lg mb-3">2. Empreendimento</h3>
-              <div className="grid grid-cols-2 gap-8 text-[13px]">
+            <section className="page page-break px-12 py-10 space-y-6 text-sm">
+              <h3 className="text-lg font-semibold">2. Empreendimento</h3>
+              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                   <DataRow k="Nome" v={data.empreendimento} />
                   <DataRow k="Local" v={data.endereco} />
                   <DataRow k="Construtora" v={data.construtora} />
                   <DataRow k="Entrega" v={data.entrega} />
                 </div>
                 <div>
                   <DataRow k="Tipo" v={data.tipo} />
                   <DataRow k="Área" v={data.area ? `${data.area} m²` : ""} />
                   <DataRow k="Vagas de garagem" v={data.vagas ? String(data.vagas) : ""} />
                   <DataRow k="Valor do m² (aprox.)" v={valores.precoM2 ? brl(valores.precoM2) : "—"} />
                 </div>
               </div>
             </section>
 
-            {/* Bloco 3: Condições Comerciais com resumo simples (Entrada → Obra → Reforços → Chaves) */}
-            <section className="p-12 page page-break">
-              <h3 className="font-semibold text-lg mb-3">3. Condições Comerciais</h3>
-              <div className="grid grid-cols-2 gap-8 text-[13px]">
+            <section className="page page-break px-12 py-10 space-y-6 text-sm">
+              <h3 className="text-lg font-semibold">3. Condições Comerciais</h3>
+              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                   <DataRow k="Valor total" v={brl(valores.total)} />
-                  <DataRow k={valores.entradaParcelas === 1 ? "Entrada (ato)" : "Entrada"}
-                          v={valores.entradaParcelas === 1
-                            ? `${brl(valores.entradaValor)}`
-                            : `${brl(valores.entradaValor)} em ${valores.entradaParcelas}x (${brl(valores.entradaParcela)}/parcela)`} />
-                  <DataRow k="Durante a obra" v={`${brl(valores.duranteObraTotal)} em ${valores.duranteObraParcelas || 0}x (${brl(valores.duranteObraParcela)}/mês)`} />
-                  <DataRow k="Reforços" v={`${brl(valores.reforcosTotal)}${valores.qRef ? ` · ${valores.qRef}x de ${brl(valores.vRef)} a cada ${valores.freqRef}m` : ''}`} />
-                  {data.chavesForma === 'financiamento' ? (
-                  <DataRow k="Financiado (banco)" v={brl(valores.chavesTotal)} />
-                ) : (
-                  <DataRow k="Chaves" v={`${brl(valores.chavesTotal)}${data.chavesForma === 'posConstrutora' ? ` em ${data.chavesPosParcelas || 0}x` : ' (à vista)'}`} />
-                )}
+                  <DataRow
+                    k={valores.entradaParcelas === 1 ? "Entrada (ato)" : "Entrada"}
+                    v={
+                      valores.entradaParcelas === 1
+                        ? `${brl(valores.entradaValor)}`
+                        : `${brl(valores.entradaValor)} em ${valores.entradaParcelas}x (${brl(valores.entradaParcela)}/parcela)`
+                    }
+                  />
+                  <DataRow
+                    k="Durante a obra"
+                    v={`${brl(valores.duranteObraTotal)} em ${valores.duranteObraParcelas || 0}x (${brl(valores.duranteObraParcela)}/mês)`}
+                  />
+                  <DataRow
+                    k="Reforços"
+                    v={`${brl(valores.reforcosTotal)}${valores.qRef ? ` · ${valores.qRef}x de ${brl(valores.vRef)} a cada ${valores.freqRef}m` : ""}`}
+                  />
+                  {data.chavesForma === "financiamento" ? (
+                    <DataRow k="Financiado (banco)" v={brl(valores.chavesTotal)} />
+                  ) : (
+                    <DataRow
+                      k="Chaves"
+                      v={`${brl(valores.chavesTotal)}${
+                        data.chavesForma === "posConstrutora" ? ` em ${data.chavesPosParcelas || 0}x` : " (à vista)"
+                      }`}
+                    />
+                  )}
                 </div>
                 <div>
                   <p className="font-semibold mb-2">Resumo Financeiro</p>
                   <DataRow k="Investimento real" v={brl(valores.valorInvestidoReal)} />
                   <DataRow k="Saldo a compor" v={brl(valores.saldoACompor)} />
-
-                  <div className="mt-4"><p className="font-semibold mb-2">Totais do Fluxo</p>
+                  <div className="mt-4">
+                    <p className="font-semibold mb-2">Totais do fluxo</p>
                     <DataRow k="Total entrada" v={brl(valores.totalEntrada)} />
                     <DataRow k="Total durante a obra" v={brl(valores.totalObra)} />
                     <DataRow k="Total reforços" v={brl(valores.totalReforcos)} />
-                    {data.chavesForma === 'posConstrutora' && (<DataRow k="Pós-chaves (total)" v={brl(valores.totalPosChaves)} />)}
-                    {data.chavesForma === 'financiamento' && (<DataRow k="Total financiado (banco)" v={brl(valores.totalFinanciado)} />)}
-                    {data.chavesForma === 'avista' && (<DataRow k="Chaves à vista" v={brl(valores.chavesTotal)} />)}
+                    {data.chavesForma === "posConstrutora" && <DataRow k="Pós-chaves (total)" v={brl(valores.totalPosChaves)} />}
+                    {data.chavesForma === "financiamento" && <DataRow k="Total financiado (banco)" v={brl(valores.totalFinanciado)} />}
+                    {data.chavesForma === "avista" && <DataRow k="Chaves à vista" v={brl(valores.chavesTotal)} />}
                     <DataRow k="TOTAL do fluxo (sem financiamento)" v={brl(valores.totalFluxoSemFin)} />
                     <DataRow k="Subtotal até chaves" v={brl(valores.totalAteChaves)} />
                   </div>
                 </div>
               </div>
-
               <details className="mt-4">
-                <summary className="cursor-pointer text-[13px] font-medium">Ver cronograma detalhado</summary>
+                <summary className="cursor-pointer text-[13px] font-medium">Ver cronograma resumido</summary>
                 <div className="mt-2 max-h-72 overflow-auto text-[12px]">
                   <table className="w-full">
-                    <thead><tr className="text-left text-gray-500 border-b"><th className="py-2">Parcela</th><th>Data</th><th>Valor</th></tr></thead>
+                    <thead>
+                      <tr className="text-left text-gray-500 border-b">
+                        <th className="py-2">Parcela</th>
+                        <th>Data</th>
+                        <th className="text-right">Valor</th>
+                      </tr>
+                    </thead>
                     <tbody>
-                      {valores.schedule
-                        .sort((a,b)=>a.data - b.data)
-                        .map((p, i) => (
-                        <tr key={i} className="border-b last:border-0">
+                      {valores.schedule.map((p) => (
+                        <tr key={p.index} className="border-b last:border-0">
                           <td className="py-2">{p.tipo}</td>
                           <td>{p.data.toLocaleDateString("pt-BR")}</td>
-                          <td className="font-medium">{brl(p.valor)}</td>
+                          <td className="text-right font-medium">{brl(p.valor)}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </details>
             </section>
 
-            {/* 4. Fluxo de Pagamento (planilha) */}
-            <section className="p-12 page page-break">
-              <h3 className="font-semibold text-lg mb-3">4. Fluxo de Pagamento (planilha)</h3>
-              <div className="rounded-xl border overflow-hidden">
-                <table className="w-full text-[12px]">
-                  <thead>
-                    <tr className="bg-slate-50 border-b text-gray-600">
-                      <th className="p-2 text-left">#</th>
-                      <th className="p-2 text-left">Mês</th>
-                      <th className="p-2 text-left">Tipo</th>
-                      <th className="p-2 text-right">Valor</th>
-                      <th className="p-2 text-right">Acumulado</th>
-                      <th className="p-2 text-right">% do fluxo</th>
-                    </tr>
-                  </thead>
-                  <tbody>
-                    {valores.schedule
-                      .sort((a,b)=>a.data-b.data)
-                      .map((p,i,arr)=>{
-                        const valor = p.valor;
-                        const acumulado = arr.slice(0,i+1).reduce((s,r)=>s+r.valor,0);
-                        const perc = valores.totalFluxoSemFin>0 ? (acumulado/valores.totalFluxoSemFin)*100 : 0;
-                        return (
-                          <tr key={i} className="border-b last:border-0">
-                            <td className="p-2">{i+1}</td>
-                            <td className="p-2">{p.data.toLocaleDateString('pt-BR')}</td>
-                            <td className="p-2">{p.tipo}</td>
-                            <td className="p-2 text-right">{brl(valor)}</td>
-                            <td className="p-2 text-right">{brl(acumulado)}</td>
-                            <td className="p-2 text-right">{perc.toFixed(2)}%</td>
-                          </tr>
-                        )
-                      })}
-                  </tbody>
-                </table>
-              </div>
-              <p className="mt-2 text-[11px] text-gray-500">Fórmulas: Valor total do fluxo = SOMA(Entrada + Obra + Reforços + (Chaves à vista ou Pós-chaves)). Acumulado(i) = Acumulado(i-1) + Valor(i). % do fluxo(i) = Acumulado(i) / Total do fluxo.</p>
-            </section>
-
-            {/* Bloco 4: Cenários */}
-            <section className="p-12 page page-break">
-              <h3 className="font-semibold text-lg mb-2">4. Cenário 1 — Revenda</h3>
-              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-[13px]">
-                <table className="w-full">
-                  <tbody>
-                    <TR label="Prazo (anos)" value={String(data.prazoObraAnos || 0)} />
-                    <TR label="Valorização anual" value={pct(data.apreciacao)} />
-                    <TR label="Valor hoje" value={brl(valores.total)} />
-                    <TR label="Valor final" value={brl(cenario1.valorFinal)} />
-                    <TR label="Lucro" value={brl(cenario1.lucro)} />
-                    <tr className="border-t-2 border-emerald-600"><td className="p-3 font-bold text-emerald-800">ROI</td><td className="p-3 font-bold text-emerald-800">{pct(cenario1.roi)}</td></tr>
-                    <tr className="bg-emerald-100"><td className="p-3 font-bold text-emerald-900">ROAS</td><td className="p-3 font-bold text-emerald-900">{pct(cenario1.roas)}</td></tr>
-                    <TR label="TIR (a.a.)" value={pct(cenario1.tir)} />
-                  </tbody>
-                </table>
-              </div>
-            </section>
-
-            <section className="p-12 page page-break">
-              <h3 className="font-semibold text-lg mb-2">5. Cenário 2 — Short Stay (5 anos após entrega)</h3>
-              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-[13px]">
-                <div className="mb-3 p-3 bg-white rounded border text-[12px] leading-6">
-                  <p className="font-semibold mb-1">Parâmetros</p>
-                  <ul className="space-y-1">
-                    <li>• ADR: {brl(cenario2.adrDiaria)}</li>
-                    <li>• Ocupação: {data.ocupacao}% ≈ {Math.round((data.ocupacao || 0) * 30 / 100)} diárias/mês</li>
-                    <li>• Receita bruta: {brl(cenario2.receitaMensalBruta)}/mês</li>
-                    <li>• Custos: {data.custosOperacionais}%</li>
-                    <li>• <strong>Líquido: {brl(cenario2.aluguelLiquido)}/mês</strong></li>
-                  </ul>
-                </div>
-                <table className="w-full">
-                  <tbody>
-                    <TR label="Renda em 5 anos" value={brl(cenario2.rendaAcumulada)} />
-                    <TR label="Valorização até entrega" value={brl(cenario2.patrimonioAcrescido)} />
-                    <TR label="Valor final" value={brl(cenario2.valorFinal)} />
-                    <tr className="border-t-2 bg-blue-200"><td className="p-3 font-bold">RETORNO TOTAL</td><td className="p-3 font-bold">{brl(cenario2.retornoTotal)}</td></tr>
-                    <tr className="border-t-2 bg-emerald-50"><td className="p-3 font-bold text-emerald-800">ROI</td><td className="p-3 font-bold text-emerald-800">{pct(cenario2.roi)}</td></tr>
-                    <tr className="bg-emerald-100"><td className="p-3 font-bold text-emerald-900">ROAS</td><td className="p-3 font-bold text-emerald-900">{pct(cenario2.roas)}</td></tr>
-                    <TR label="TIR (a.a.)" value={pct(cenario2.tir)} />
-                  </tbody>
-                </table>
-              </div>
-            </section>
-
-            {/* rodapé / letras pequenas */}
-            <section className="p-12 page page-break">
-              <p className="text-[11px] text-gray-500 italic leading-5">
-                * Estimativas baseadas em projeções de mercado. ROI = retorno sobre o valor total; ROAS = retorno sobre o investimento real.
-              </p>
-              <p className="text-[11px] text-gray-500 mt-3 leading-5">
-                * Formas de pagamento sujeitas a atualização por <strong>CUB (período de obras)</strong> e <strong>IGP-M + 1%</strong> após a entrega das chaves.
-              </p>
-              <p className="text-[11px] text-gray-500 mt-3 leading-5">
-                © {new Date().getFullYear()} Alvo BR — {data.company} · {data.phone} · {data.email}
-              </p>
-            </section>
-          </div>
-        </div>
-      )}
-
-      {/* CSS */}
-      <style>{`
-        .paper { width: 100%; max-width: 1100px; }
-        .page { page-break-inside: avoid; }
-        .page-break { page-break-before: always; margin-top: 8px; }
-        .paper img { max-width: 100%; height: auto; }
-        .paper * { line-height: 1.45; word-break: break-word; }
-        @media print {
-          @page { size: A4 portrait; margin: 14mm; }
-          .sticky { display: none !important; }
-          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
-          .bg-emerald-50 { background-color: #ecfdf5 !important; }
-          .bg-emerald-100 { background-color: #d1fae5 !important; }
-          .bg-blue-50 { background-color: #eff6ff !important; }
-          .bg-blue-100 { background-color: #dbeafe !important; }
-          .bg-blue-200 { background-color: #bfdbfe !important; }
-        }
-      `}</style>
-    </div>
-  );
-}
-
-/********************
- * UI bits
- ********************/
-function Card({ title, children }) {
-  return (
-    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden ring-1 ring-slate-200">
-      <div className="px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-white">
-        <h4 className="font-semibold tracking-tight">{title}</h4>
-      </div>
-      <div className="p-4 space-y-2">{children}</div>
-    </div>
-  );
-}
-function Input({ label, value, onChange, placeholder }) {
-  return (
-    <label className="block">
-      <div className="text-xs text-gray-600 mb-1">{label}</div>
-      <input
-        className="w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
-        value={value ?? ""}
-        onChange={onChange}
-        placeholder={placeholder}
-      />
-    </label>
-  );
-}
-function DataRow({ k, v }) {
-  return (
-    <div className="flex gap-2 py-2 border-b border-dashed border-gray-100">
-      <div className="w-44 text-gray-500">{k}</div>
-      <div className="flex-1 font-medium">{v || "—"}</div>
-    </div>
-  );
-}
-function KPI({ title, value, highlight }) {
-  return (
-    <div className={"rounded-xl border p-3 " + (highlight ? "bg-emerald-50 border-emerald-200" : "bg-white") }>
-      <div className="text-xs text-gray-600 mb-1">{title}</div>
-      <div className="text-lg font-bold">{value}</div>
-    </div>
-  );
-}
-
-function TR({ label, value }) {
-  return (
-    <tr>
-      <td className="p-3 text-gray-600">{label}</td>
-      <td className="p-3 font-medium">{value || "—"}</td>
-    </tr>
-  );
-}
-            {/* 4. Fluxo de Pagamento (planilha) */}
-            <section className="p-12 page page-break">
-              <h3 className="font-semibold text-lg mb-3">4. Fluxo de Pagamento (planilha)</h3>
+            <section className="page page-break px-12 py-10 text-sm">
+              <h3 className="text-lg font-semibold mb-3">4. Fluxo de Pagamento (planilha)</h3>
               <div className="rounded-xl border overflow-hidden">
                 <table className="w-full text-[12px]">
                   <thead>
                     <tr className="bg-slate-50 border-b text-gray-600">
                       <th className="p-2 text-left">#</th>
                       <th className="p-2 text-left">Mês</th>
                       <th className="p-2 text-left">Tipo</th>
                       <th className="p-2 text-right">Valor</th>
                       <th className="p-2 text-right">Acumulado</th>
                       <th className="p-2 text-right">% do fluxo</th>
                     </tr>
                   </thead>
                   <tbody>
-                    {valores.schedule
-                      .sort((a, b) => a.data - b.data)
-                      .map((p, i, arr) => {
-                        const valor = p.valor;
-                        const acumulado = arr.slice(0, i + 1).reduce((s, r) => s + r.valor, 0);
-                        const perc =
-                          valores.totalFluxoSemFin > 0
-                            ? (acumulado / valores.totalFluxoSemFin) * 100
-                            : 0;
-                        return (
-                          <tr key={i} className="border-b last:border-0">
-                            <td className="p-2">{i + 1}</td>
-                            <td className="p-2">{p.data.toLocaleDateString("pt-BR")}</td>
-                            <td className="p-2">{p.tipo}</td>
-                            <td className="p-2 text-right">{brl(valor)}</td>
-                            <td className="p-2 text-right">{brl(acumulado)}</td>
-                            <td className="p-2 text-right">{perc.toFixed(2)}%</td>
-                          </tr>
-                        );
-                      })}
+                    {valores.schedule.map((p) => (
+                      <tr key={p.index} className="border-b last:border-0">
+                        <td className="p-2">{p.index}</td>
+                        <td className="p-2">{p.data.toLocaleDateString("pt-BR")}</td>
+                        <td className="p-2">{p.tipo}</td>
+                        <td className="p-2 text-right">{brl(p.valor)}</td>
+                        <td className="p-2 text-right">{brl(p.acumulado)}</td>
+                        <td className="p-2 text-right">{p.perc.toFixed(2)}%</td>
+                      </tr>
+                    ))}
                   </tbody>
                 </table>
               </div>
               <p className="mt-2 text-[11px] text-gray-500">
-                Fórmulas: Valor total = SOMA(Entrada + Obra + Reforços + (Chaves à vista ou
-                Pós-chaves)). Acumulado(i) = Acumulado(i-1) + Valor(i). % do fluxo(i) =
-                Acumulado(i) / Total do fluxo.
+                Fórmulas: Valor total do fluxo = SOMA(Entrada + Obra + Reforços + (Chaves à vista ou Pós-chaves)). Acumulado(i) =
+                Acumulado(i-1) + Valor(i). % do fluxo(i) = Acumulado(i) ÷ TotalFluxo × 100.
               </p>
             </section>
 
-            {/* 5. Cenários de Retorno */}
-            <section className="p-12 page page-break">
-              <h3 className="font-semibold text-lg mb-2">5. Cenário 1 — Revenda</h3>
+            <section className="page page-break px-12 py-10 space-y-6 text-sm">
+              <h3 className="text-lg font-semibold">5. Cenário 1 — Revenda</h3>
               <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-[13px]">
                 <table className="w-full">
                   <tbody>
                     <TR label="Prazo (anos)" value={String(data.prazoObraAnos || 0)} />
                     <TR label="Valorização anual" value={pct(data.apreciacao)} />
-                    <TR label="Valor atual" value={brl(valores.total)} />
+                    <TR label="Valor hoje" value={brl(valores.total)} />
                     <TR label="Valor final" value={brl(cenario1.valorFinal)} />
-                    <TR label="Lucro líquido" value={brl(cenario1.lucro)} />
+                    <TR label="Lucro" value={brl(cenario1.lucro)} />
                     <tr className="border-t-2 border-emerald-600">
                       <td className="p-3 font-bold text-emerald-800">ROI</td>
                       <td className="p-3 font-bold text-emerald-800">{pct(cenario1.roi)}</td>
                     </tr>
                     <tr className="bg-emerald-100">
                       <td className="p-3 font-bold text-emerald-900">ROAS</td>
                       <td className="p-3 font-bold text-emerald-900">{pct(cenario1.roas)}</td>
                     </tr>
-                    <TR label="TIR anualizada" value={pct(cenario1.tir)} />
+                    <TR label="TIR (a.a.)" value={pct(cenario1.tir)} />
                   </tbody>
                 </table>
               </div>
             </section>
 
-            <section className="p-12 page page-break">
-              <h3 className="font-semibold text-lg mb-2">
-                6. Cenário 2 — Short Stay (5 anos após entrega)
-              </h3>
+            <section className="page page-break px-12 py-10 space-y-6 text-sm">
+              <h3 className="text-lg font-semibold">6. Cenário 2 — Short Stay (5 anos após entrega)</h3>
               <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-[13px]">
                 <div className="mb-3 p-3 bg-white rounded border text-[12px] leading-6">
                   <p className="font-semibold mb-1">Parâmetros</p>
                   <ul className="space-y-1">
                     <li>• ADR: {brl(cenario2.adrDiaria)}</li>
-                    <li>
-                      • Ocupação: {data.ocupacao}% ≈{" "}
-                      {Math.round(((data.ocupacao || 0) * 30) / 100)} diárias/mês
-                    </li>
+                    <li>• Ocupação: {data.ocupacao}% ≈ {Math.round(((data.ocupacao || 0) * 30) / 100)} diárias/mês</li>
                     <li>• Receita bruta: {brl(cenario2.receitaMensalBruta)}/mês</li>
                     <li>• Custos: {data.custosOperacionais}%</li>
                     <li>
                       • <strong>Líquido: {brl(cenario2.aluguelLiquido)}/mês</strong>
                     </li>
                   </ul>
                 </div>
                 <table className="w-full">
                   <tbody>
-                    <TR label="Renda acumulada (5 anos)" value={brl(cenario2.rendaAcumulada)} />
+                    <TR label="Renda em 5 anos" value={brl(cenario2.rendaAcumulada)} />
                     <TR label="Valorização até entrega" value={brl(cenario2.patrimonioAcrescido)} />
-                    <TR label="Valor final de revenda" value={brl(cenario2.valorFinal)} />
+                    <TR label="Valor final" value={brl(cenario2.valorFinal)} />
                     <tr className="border-t-2 bg-blue-200">
                       <td className="p-3 font-bold">RETORNO TOTAL</td>
                       <td className="p-3 font-bold">{brl(cenario2.retornoTotal)}</td>
                     </tr>
                     <tr className="bg-emerald-50">
                       <td className="p-3 font-bold text-emerald-800">ROI</td>
                       <td className="p-3 font-bold text-emerald-800">{pct(cenario2.roi)}</td>
                     </tr>
                     <tr className="bg-emerald-100">
                       <td className="p-3 font-bold text-emerald-900">ROAS</td>
                       <td className="p-3 font-bold text-emerald-900">{pct(cenario2.roas)}</td>
                     </tr>
-                    <TR label="TIR anualizada" value={pct(cenario2.tir)} />
+                    <TR label="TIR (a.a.)" value={pct(cenario2.tir)} />
                   </tbody>
                 </table>
               </div>
             </section>
 
-            {/* Rodapé */}
-            <section className="p-12 page page-break">
+            <section className="page page-break px-12 py-10 text-sm">
               <p className="text-[11px] text-gray-500 italic leading-5">
-                * Estimativas baseadas em projeções de mercado. ROI = retorno sobre o valor
-                total; ROAS = retorno sobre o investimento real.
+                * Estimativas baseadas em projeções de mercado. ROI = retorno sobre o valor total; ROAS = retorno sobre o investimento real.
               </p>
               <p className="text-[11px] text-gray-500 mt-3 leading-5">
-                * Formas de pagamento sujeitas a atualização por{" "}
-                <strong>CUB (período de obras)</strong> e <strong>IGP-M + 1%</strong> após a
-                entrega das chaves.
+                * Formas de pagamento sujeitas a atualização por <strong>CUB (período de obras)</strong> e <strong>IGP-M + 1%</strong> após a entrega das chaves.
               </p>
               <p className="text-[11px] text-gray-500 mt-3 leading-5">
-                © {new Date().getFullYear()} Alvo BR — {data.company} · {data.phone} ·{" "}
-                {data.email}
+                © {new Date().getFullYear()} Alvo BR — {data.company} · {data.phone} · {data.email}
               </p>
             </section>
           </div>
         </div>
       )}
 
       <style>{`
         .paper { width: 100%; max-width: 1100px; }
         .page { page-break-inside: avoid; }
         .page-break { page-break-before: always; margin-top: 8px; }
+        .paper img { max-width: 100%; height: auto; }
         .paper * { line-height: 1.45; word-break: break-word; }
         @media print {
           @page { size: A4 portrait; margin: 14mm; }
           .sticky { display: none !important; }
+          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
+          .bg-emerald-50 { background-color: #ecfdf5 !important; }
+          .bg-emerald-100 { background-color: #d1fae5 !important; }
+          .bg-blue-50 { background-color: #eff6ff !important; }
+          .bg-blue-100 { background-color: #dbeafe !important; }
+          .bg-blue-200 { background-color: #bfdbfe !important; }
         }
       `}</style>
     </div>
   );
 }
 
 /********************
  * UI bits
  ********************/
 function Card({ title, children }) {
   return (
     <div className="bg-white rounded-2xl shadow-sm border overflow-hidden ring-1 ring-slate-200">
       <div className="px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-white">
         <h4 className="font-semibold tracking-tight">{title}</h4>
       </div>
       <div className="p-4 space-y-2">{children}</div>
     </div>
   );
 }
 function Input({ label, value, onChange, placeholder }) {
   return (
     <label className="block">
       <div className="text-xs text-gray-600 mb-1">{label}</div>
       <input
         className="w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
         value={value ?? ""}
         onChange={onChange}
         placeholder={placeholder}
+        min={0}
       />
     </label>
   );
 }
 function DataRow({ k, v }) {
   return (
     <div className="flex gap-2 py-2 border-b border-dashed border-gray-100">
       <div className="w-44 text-gray-500">{k}</div>
       <div className="flex-1 font-medium">{v || "—"}</div>
     </div>
   );
 }
 function KPI({ title, value, highlight }) {
   return (
     <div className={`rounded-xl border p-3 ${highlight ? "bg-emerald-50 border-emerald-200" : "bg-white"}`}>
       <div className="text-xs text-gray-600 mb-1">{title}</div>
       <div className="text-lg font-bold">{value}</div>
     </div>
   );
 }
 function TR({ label, value }) {
   return (
     <tr>
       <td className="p-3 text-gray-600">{label}</td>
       <td className="p-3 font-medium">{value || "—"}</td>
