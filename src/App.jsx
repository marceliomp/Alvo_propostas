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
  return isNaN(num) ? 0 : num;
};
const calcularTIR = (fluxos, chute = 0.1) => {
  let taxa = chute, iter = 0;
  const max = 1000, eps = 1e-4;
  while (iter < max) {
    let vpl = 0, der = 0;
    for (let i = 0; i < fluxos.length; i++) {
      vpl += fluxos[i] / Math.pow(1 + taxa, i);
      der -= (i * fluxos[i]) / Math.pow(1 + taxa, i + 1);
    }
    if (Math.abs(vpl) < eps || der === 0) break;
    taxa = taxa - vpl / der;
    iter++;
  }
  return iter < max ? taxa * 100 : 0;
};

/********************
 * Logo
 ********************/
const ALVO_LOGO = "data:image/svg+xml,%3Csvg width='1200' height='400' viewBox='0 0 1200 400' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50' y='300' font-family='Arial' font-size='280' font-weight='900' fill='%233A3A3A' letter-spacing='-10'%3EALVO%3C/text%3E%3Ccircle cx='950' cy='200' r='140' stroke='%233A3A3A' stroke-width='28' fill='none'/%3E%3Ccircle cx='950' cy='200' r='85' stroke='%233A3A3A' stroke-width='20' fill='none'/%3E%3Ctext x='1050' y='235' font-family='Arial' font-size='95' font-weight='700' fill='%2334747E'%3EBR%3C/text%3E%3C/svg%3E";
const AlvoLogo = ({ size = 48 }) => <img src={ALVO_LOGO} alt="Alvo BR" style={{ height: size, width: "auto" }} />;

/********************
 * PDF libs
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
    s.src = src; s.async = true;
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
  splitPreset: "10-45-45",
  entradaValor: 98000,
  entradaPercent: 10,
  obraParcelaValor: 12250,
  duranteObraParcelas: 36,
  duranteObraPercent: 45,
  chavesPercent: 45,
  chavesForma: "financiamento",
  chavesPosParcelas: 0,
  balaoValor: 0,
  balaoQuantidade: 0,
  balaoFrequenciaMeses: 6,
  prazoObraAnos: 3,      // vira o prazo padrão de valorização
  apreciacao: 18,        // % a.a.
  adrDiaria: 350, ocupacao: 70, custosOperacionais: 30,
  validade: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
};

/********************
 * App (duas páginas)
 ********************/
export default function App() {
  const [step, setStep] = useState("setup"); // "setup" | "resultado"
  const [data, setData] = useState(sample);
  const resultRef = useRef(null); // aponta para a "folha" .paper

  // Preset
  useEffect(() => {
    if (!data.splitPreset || data.splitPreset === "custom") return;
    const [e, o, c] = data.splitPreset.split("-").map(Number);
    setData((d) => ({
      ...d,
      entradaPercent: e,
      duranteObraPercent: o,
      chavesPercent: c,
      entradaValor: d.valorTotal ? (d.valorTotal * e) / 100 : d.entradaValor,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.splitPreset]);

  // Prazo de obra governa valorização padrão e (se ainda padrão) nº de parcelas
  useEffect(() => {
    setData((d) => {
      const anos = Number(d.prazoObraAnos || 0);
      if (!anos) return d;
      const alvoParcelas = anos * 12;
      const aindaPadrao = !d.duranteObraParcelas || d.duranteObraParcelas === sample.prazoObraAnos * 12;
      return {
        ...d,
        prazoEntrega: anos,
        duranteObraParcelas: aindaPadrao ? alvoParcelas : d.duranteObraParcelas,
      };
    });
  }, [data.prazoObraAnos]);

  // Cálculos
  const valores = useMemo(() => {
    const total = Number(data.valorTotal || 0);
    const entradaValor = Number(data.entradaValor || 0) || (total * Number(data.entradaPercent || 0)) / 100;
    const entradaPercent = total > 0 ? (entradaValor / total) * 100 : 0;

    const parcelasObra = Number(data.duranteObraParcelas || 0);
    let duranteObraParcela = Number(data.obraParcelaValor || 0);
    let duranteObraTotal;
    if (duranteObraParcela > 0 && parcelasObra > 0) {
      duranteObraTotal = duranteObraParcela * parcelasObra;
    } else {
      const pctObra = Number(data.duranteObraPercent || 0);
      duranteObraTotal = (total * pctObra) / 100;
      duranteObraParcela = parcelasObra > 0 ? duranteObraTotal / parcelasObra : 0;
    }
    const duranteObraPercentCalc = total > 0 ? (100 * duranteObraTotal) / total : 0;

    const chavesTotal = (total * Number(data.chavesPercent || 0)) / 100;
    const chavesFinanciado = data.chavesForma === "financiamento";
    const valorInvestidoReal = chavesFinanciado
      ? entradaValor + duranteObraTotal
      : entradaValor + duranteObraTotal + chavesTotal;

    const recursosCliente = Number(data.recursosCliente || 0);
    const saldoACompor = Math.max(0, valorInvestidoReal - recursosCliente);

    const precoM2 = (Number(data.area || 0) > 0) ? total / Number(data.area) : 0;

    // cronograma (datas)
    const hoje = new Date();
    const schedule = [];
    if (entradaValor > 0) schedule.push({ tipo: "Entrada", data: hoje, valor: entradaValor });
    for (let i = 1; i <= parcelasObra; i++) {
      const d = new Date(hoje); d.setMonth(d.getMonth() + i);
      schedule.push({ tipo: `Obra ${i}/${parcelasObra}`, data: d, valor: duranteObraParcela });
    }
    if (data.chavesForma === "avista" && chavesTotal > 0) {
      const d = new Date(hoje); d.setMonth(d.getMonth() + parcelasObra + 1);
      schedule.push({ tipo: "Chaves (à vista)", data: d, valor: chavesTotal });
    }
    if (data.chavesForma === "posConstrutora" && chavesTotal > 0) {
      const pcs = Number(data.chavesPosParcelas || 0);
      for (let i = 1; i <= pcs; i++) {
        const d = new Date(hoje); d.setMonth(d.getMonth() + parcelasObra + i);
        schedule.push({ tipo: `Pós-chaves ${i}/${pcs}`, data: d, valor: chavesTotal / Math.max(pcs, 1) });
      }
    }
    // balões
    const q = Math.max(0, Number(data.balaoQuantidade || 0));
    const vBalao = Math.max(0, Number(data.balaoValor || 0));
    const freq = Math.max(1, Number(data.balaoFrequenciaMeses || 1));
    if (q > 0 && vBalao > 0) {
      let startOffset = parcelasObra + 1;
      if (data.chavesForma === "posConstrutora") startOffset = parcelasObra + Number(data.chavesPosParcelas || 0) + 1;
      for (let i = 0; i < q; i++) {
        const d = new Date(hoje); d.setMonth(d.getMonth() + startOffset + i * freq);
        schedule.push({ tipo: `Balão ${i + 1}/${q}`, data: d, valor: vBalao });
      }
    }

    return {
      total, entradaValor, entradaPercent,
      duranteObraTotal, duranteObraParcela, duranteObraPercent: duranteObraPercentCalc,
      chavesTotal, valorInvestidoReal, recursosCliente, saldoACompor, schedule,
      precoM2
    };
  }, [data]);

  // Fluxos p/ TIR
  const buildFluxosBase = (incluirChaves = true) => {
    const fluxos = [];
    fluxos.push(-valores.entradaValor);
    const mesesObra = Number(data.duranteObraParcelas || 0);
    for (let i = 0; i < mesesObra; i++) fluxos.push(-valores.duranteObraParcela);
    if (incluirChaves) {
      if (data.chavesForma === "avista") fluxos.push(-valores.chavesTotal);
      else if (data.chavesForma === "posConstrutora") {
        const pcs = Number(data.chavesPosParcelas || 0);
        for (let i = 0; i < pcs; i++) fluxos.push(-(valores.chavesTotal / Math.max(pcs, 1)));
      } else {
        for (let i = 0; i < 12; i++) fluxos.push(0);
      }
    }
    // balões
    const q = Math.max(0, Number(data.balaoQuantidade || 0));
    const vBalao = Math.max(0, Number(data.balaoValor || 0));
    const freq = Math.max(1, Number(data.balaoFrequenciaMeses || 1));
    if (q > 0 && vBalao > 0) {
      let startAfter = mesesObra + 1;
      if (data.chavesForma === "posConstrutora") startAfter = mesesObra + Number(data.chavesPosParcelas || 0) + 1;
      for (let i = 0; i < q; i++) {
        const target = startAfter + i * freq;
        while (fluxos.length < target) fluxos.push(0);
        fluxos.push(-vBalao);
      }
    }
    return fluxos;
  };

  // Cenários
  const cenario1 = useMemo(() => {
    const anos = Number(data.prazoEntrega || data.prazoObraAnos || 0);
    const taxa = Number(data.apreciacao || 0) / 100;
    const valorFinal = valores.total * Math.pow(1 + taxa, anos);
    const lucro = valorFinal - valores.total;
    const roi = (lucro / valores.total) * 100;
    const roas = (lucro / valores.valorInvestidoReal) * 100;
    const fluxos = buildFluxosBase(true);
    fluxos.push(valorFinal);
    const tir = calcularTIR(fluxos);
    const tirAnual = (Math.pow(1 + tir / 100, 12) - 1) * 100;
    return { valorFinal, lucro, roi, roas, tir: tirAnual, prazo: anos };
  }, [valores, data]);

  const cenario2 = useMemo(() => {
    const anosEntrega = Number(data.prazoEntrega || data.prazoObraAnos || 0);
    const taxa = Number(data.apreciacao || 0) / 100;
    const valorFinal = valores.total * Math.pow(1 + taxa, anosEntrega);
    const patrimonioAcrescido = valorFinal - valores.total;

    const adrDiaria = Number(data.adrDiaria || 0);
    const ocupacao = Number(data.ocupacao || 0) / 100;
    const custos = Number(data.custosOperacionais || 0) / 100;
    const receitaMensalBruta = adrDiaria * ocupacao * 30;
    const aluguelLiquido = receitaMensalBruta * (1 - custos);

    const mesesOperacao = 5 * 12; // fixo 5 anos
    const rendaAcumulada = aluguelLiquido * mesesOperacao;

    const retornoTotal = patrimonioAcrescido + rendaAcumulada;
    const roi = (retornoTotal / valores.total) * 100;
    const roas = (retornoTotal / valores.valorInvestidoReal) * 100;

    const fluxos = buildFluxosBase(true);
    for (let i = 0; i < mesesOperacao; i++) fluxos.push(aluguelLiquido);
    fluxos.push(valorFinal);

    const tir = calcularTIR(fluxos);
    const tirAnual = (Math.pow(1 + tir / 100, 12) - 1) * 100;

    return { valorFinal, patrimonioAcrescido, adrDiaria, receitaMensalBruta, aluguelLiquido, rendaAcumulada, retornoTotal, roi, roas, tir: tirAnual, prazoTotal: anosEntrega + 5 };
  }, [valores, data]);

  // Handlers
  const handle = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }));
  const handleNumeric = (k) => (e) => setData((d) => ({ ...d, [k]: currencyToNumber(e.target.value) }));
  const handlePercent = (k) => (e) => {
    const num = parseFloat((e.target.value + "").replace(",", "."));
    setData((d) => ({ ...d, [k]: isNaN(num) ? 0 : num }));
  };

  // PDF multipágina (somente quando clicar em Baixar PDF)
  const savePDF = async () => {
    await ensurePdfLibs();
    const { jsPDF } = window.jspdf;
    const node = resultRef.current;
    const pdf = new jsPDF("p", "mm", "a4");
    await pdf.html(node, {
      margin: [10, 10, 12, 10],
      autoPaging: "text",
      html2canvas: { scale: 2, useCORS: true },
      x: 0, y: 0, width: 190,
      windowWidth: 794, // largura da .paper
    });
    const file = `Proposta_Alvo_${(data.cliente || "cliente").replace(/\s+/g, "_")}.pdf`;
    pdf.save(file);
  };

  const gerarProposta = () => setStep("resultado"); // NÃO baixa PDF automaticamente
  const fillExample = () => setData(sample);
  const clearAll = () => setData({});

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Topbar */}
      <div className="sticky top-0 z-40 backdrop-blur border-b bg-white/80">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <AlvoLogo size={36} />
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Alvo Propostas</h1>
            <p className="text-xs text-gray-500">Página {step === "setup" ? "de Edição" : "da Proposta"} · PDF multipágina</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fillExample} className="px-3 py-2 rounded-2xl bg-white shadow-sm border text-sm">Exemplo</button>
            <button onClick={clearAll} className="px-3 py-2 rounded-2xl bg-white shadow-sm border text-sm">Limpar</button>
            {step === "resultado" ? (
              <>
                <button onClick={() => setStep("setup")} className="px-3 py-2 rounded-2xl bg-white shadow-sm border text-sm">Voltar ao Setup</button>
                <button onClick={savePDF} className="px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm">Baixar PDF</button>
              </>
            ) : (
              <button onClick={gerarProposta} className="px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm">Gerar Proposta</button>
            )}
          </div>
        </div>
      </div>

      {step === "setup" ? (
        /* ---------- PÁGINA 1: SETUP ---------- */
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-5 gap-6 p-4">
          {/* esquerda */}
          <div className="lg:col-span-2 space-y-4">
            <Card title="Empresa">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Empresa" value={data.company || ""} onChange={handle("company")} />
                <Input label="Data" value={data.date || ""} onChange={handle("date")} />
                <Input label="Consultor" value={data.consultor || ""} onChange={handle("consultor")} />
                <Input label="Telefone" value={data.phone || ""} onChange={handle("phone")} />
                <Input label="E-mail" value={data.email || ""} onChange={handle("email")} />
                <Input label="Site (URL)" value={data.siteUrl || ""} onChange={handle("siteUrl")} placeholder="https://alvobr.com.br" />
              </div>
            </Card>

            <Card title="Cliente">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nome" value={data.cliente || ""} onChange={handle("cliente")} />
                <Input label="Telefone" value={data.clientePhone || ""} onChange={handle("clientePhone")} />
                <Input label="E-mail" value={data.clienteEmail || ""} onChange={handle("clienteEmail")} />
                <Input label="Recursos disponíveis (R$)" value={data.recursosCliente ?? ""} onChange={handleNumeric("recursosCliente")} />
              </div>
            </Card>

            <Card title="Empreendimento">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nome" value={data.empreendimento || ""} onChange={handle("empreendimento")} />
                <Input label="Endereço" value={data.endereco || ""} onChange={handle("endereco")} />
                <Input label="Construtora" value={data.construtora || ""} onChange={handle("construtora")} />
                <Input label="Tipo" value={data.tipo || ""} onChange={handle("tipo")} />
                <Input label="Área (m²)" value={data.area ?? ""} onChange={handleNumeric("area")} />
                <Input label="Vagas de garagem" value={data.vagas ?? ""} onChange={handleNumeric("vagas")} />
                <Input label="Entrega (texto)" value={data.entrega || ""} onChange={handle("entrega")} />
              </div>
            </Card>

            <Card title="Short Stay / Prazo">
              <div className="grid grid-cols-2 gap-3">
                <Input label="ADR (R$)" value={data.adrDiaria ?? ""} onChange={handleNumeric("adrDiaria")} />
                <Input label="Ocupação (%)" value={data.ocupacao ?? ""} onChange={handlePercent("ocupacao")} />
                <Input label="Custos operacionais (%)" value={data.custosOperacionais ?? ""} onChange={handlePercent("custosOperacionais")} />
                <Input label="Prazo de obra (anos)" value={data.prazoObraAnos ?? ""} onChange={handleNumeric("prazoObraAnos")} />
              </div>
              <p className="text-xs text-gray-500 mt-2">Short stay considerado por <strong>5 anos</strong> após a entrega.</p>
            </Card>
          </div>

          {/* direita - fluxo simples */}
          <div className="lg:col-span-3 space-y-4">
            <Card title="Fluxo de Pagamento (simples)">
              <div className="space-y-4">
                {/* Entrada */}
                <div className="rounded-xl border p-3 bg-slate-50">
                  <p className="text-sm font-semibold mb-2">1) Entrada</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Valor total do imóvel (R$)" value={data.valorTotal ?? ""} onChange={handleNumeric("valorTotal")} />
                    <select className="w-full px-3 py-2 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={data.splitPreset} onChange={(e)=>setData(d=>({...d, splitPreset: e.target.value}))}>
                      <option value="10-45-45">Preset 10 / 45 / 45</option>
                      <option value="20-40-40">Preset 20 / 40 / 40</option>
                      <option value="30-40-30">Preset 30 / 40 / 30</option>
                      <option value="custom">Customizar</option>
                    </select>
                    <Input label="Entrada (%)" value={data.entradaPercent ?? ""} onChange={handlePercent("entradaPercent")} />
                    <Input label="Entrada (R$)" value={data.entradaValor ?? ""} onChange={handleNumeric("entradaValor")} />
                  </div>
                </div>

                {/* Obra */}
                <div className="rounded-xl border p-3 bg-slate-50">
                  <p className="text-sm font-semibold mb-2">2) Durante a obra</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Parcela de obra (R$)" value={data.obraParcelaValor ?? ""} onChange={handleNumeric("obraParcelaValor")} />
                    <Input label="Nº de parcelas de obra" value={data.duranteObraParcelas ?? ""} onChange={handleNumeric("duranteObraParcelas")} />
                    <Input label="Obra (% do total) — opcional" value={data.duranteObraPercent ?? ""} onChange={handlePercent("duranteObraPercent")} />
                  </div>
                </div>

                {/* Chaves */}
                <div className="rounded-xl border p-3 bg-slate-50">
                  <p className="text-sm font-semibold mb-2">3) Na entrega das chaves</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <div className="text-xs text-gray-600 mb-1">Forma</div>
                      <select className="w-full px-3 py-2 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={data.chavesForma} onChange={(e)=>setData(d=>({...d, chavesForma: e.target.value}))}>
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
                </div>

                {/* Balões */}
                <div className="grid grid-cols-3 gap-3">
                  <Input label="Balões (R$)" value={data.balaoValor ?? ""} onChange={handleNumeric("balaoValor")} />
                  <Input label="Qtde de balões" value={data.balaoQuantidade ?? ""} onChange={handleNumeric("balaoQuantidade")} />
                  <Input label="Frequência (meses)" value={data.balaoFrequenciaMeses ?? ""} onChange={handleNumeric("balaoFrequenciaMeses")} />
                </div>

                {/* Resumo do fluxo */}
                <div className="bg-white border rounded-2xl p-4 shadow-sm text-sm">
                  <p className="font-semibold text-emerald-800 mb-2">Resumo</p>
                  <ul className="space-y-1">
                    <li>Entrada: <strong>{brl(valores.entradaValor)} ({pct(valores.entradaPercent)})</strong></li>
                    <li>Obra: <strong>{brl(valores.duranteObraTotal)}</strong> em <strong>{data.duranteObraParcelas}x</strong> ({brl(valores.duranteObraParcela)}/mês) — {pct(valores.duranteObraPercent)}</li>
                    <li>Chaves: <strong>{brl(valores.chavesTotal)}</strong> {data.chavesForma === "financiamento" ? "(financ.)" : data.chavesForma === "posConstrutora" ? `em ${data.chavesPosParcelas || 0}x` : ""}</li>
                  </ul>
                  <div className="mt-3 rounded-xl bg-slate-50 border p-3">
                    Investimento real: <strong>{brl(valores.valorInvestidoReal)}</strong><br />
                    Recursos do cliente: <strong>{brl(valores.recursosCliente)}</strong><br />
                    Saldo a compor: <strong className="text-rose-700">{brl(valores.saldoACompor)}</strong>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* ---------- PÁGINA 2: RESULTADO (vai para o PDF) ---------- */
        <div className="mx-auto max-w-4xl p-4">
          <div ref={resultRef} className="paper mx-auto bg-white shadow-md rounded-2xl overflow-hidden ring-1 ring-slate-200">
            {/* capa */}
            <section className="p-8 page">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight">Proposta Comercial</h2>
                  <p className="text-xs text-gray-500">{data.company}</p>
                  <p className="text-xs text-gray-500">{data.date} · {data.consultor}</p>
                  <p className="text-xs text-gray-500">{data.phone} · {data.email}</p>
                  {data.siteUrl && <a href={data.siteUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 underline break-all">{data.siteUrl}</a>}
                </div>
                <AlvoLogo size={64} />
              </div>
              <p className="mt-4 text-[13px] text-gray-700">A <strong>Alvo BR</strong> é especializada em curadoria de investimentos imobiliários, unindo dados, método e resultado.</p>
              <p className="mt-4 text-[11px] text-gray-500">Validade desta proposta: <strong>{data.validade}</strong></p>
            </section>

            {/* dados */}
            <section className="p-8 page page-break">
              <h3 className="font-semibold text-lg mb-2">1. Dados</h3>
              <div className="grid grid-cols-2 gap-6 text-[13px]">
                <div>
                  <p className="font-semibold mb-1">Cliente</p>
                  <DataRow k="Nome" v={data.cliente} />
                  <DataRow k="Telefone" v={data.clientePhone} />
                  <DataRow k="E-mail" v={data.clienteEmail} />
                </div>
                <div>
                  <p className="font-semibold mb-1">Empreendimento</p>
                  <DataRow k="Nome" v={data.empreendimento} />
                  <DataRow k="Local" v={data.endereco} />
                  <DataRow k="Construtora" v={data.construtora} />
                  <DataRow k="Tipo" v={data.tipo} />
                  <DataRow k="Área" v={data.area ? `${data.area} m²` : ""} />
                  <DataRow k="Vagas de garagem" v={data.vagas ? String(data.vagas) : ""} />
                  <DataRow k="Valor do m² (aprox.)" v={valores.precoM2 ? brl(valores.precoM2) : "—"} />
                  <DataRow k="Entrega" v={data.entrega} />
                </div>
              </div>
            </section>

            {/* condições */}
            <section className="p-8 page page-break">
              <h3 className="font-semibold text-lg mb-2">2. Condições Comerciais</h3>
              <div className="grid grid-cols-2 gap-6 text-[13px]">
                <div>
                  <DataRow k="Valor total" v={brl(valores.total)} />
                  <DataRow k="Entrada" v={`${brl(valores.entradaValor)} (${pct(valores.entradaPercent)})`} />
                  <DataRow k="Obra" v={`${brl(valores.duranteObraTotal)} em ${data.duranteObraParcelas || 0}x (${brl(valores.duranteObraParcela)}/mês)`} />
                  <DataRow k="Chaves" v={`${brl(valores.chavesTotal)}${data.chavesForma === "financiamento" ? " (Financ.)" : data.chavesForma === "posConstrutora" ? ` em ${data.chavesPosParcelas || 0}x` : ""}`} />
                </div>
                <div>
                  <p className="font-semibold mb-1">Resumo Financeiro</p>
                  <DataRow k="Investimento real" v={brl(valores.valorInvestidoReal)} />
                  <DataRow k="Recursos do cliente" v={brl(valores.recursosCliente)} />
                  <DataRow k="Saldo a compor" v={brl(valores.saldoACompor)} />
                </div>
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-[13px] font-medium">Ver cronograma detalhado</summary>
                <div className="mt-2 max-h-72 overflow-auto text-[12px]">
                  <table className="w-full">
                    <thead><tr className="text-left text-gray-500 border-b"><th className="py-2">Parcela</th><th>Data</th><th>Valor</th></tr></thead>
                    <tbody>
                      {valores.schedule.map((p, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2">{p.tipo}</td>
                          <td>{p.data.toLocaleDateString("pt-BR")}</td>
                          <td className="font-medium">{brl(p.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>

            {/* cenários */}
            <section className="p-8 page page-break">
              <h3 className="font-semibold text-lg mb-2">3. Cenário 1 — Revenda</h3>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-[13px]">
                <table className="w-full">
                  <tbody>
                    <TR label="Prazo (anos)" value={String(data.prazoEntrega || data.prazoObraAnos || 0)} />
                    <TR label="Valorização anual" value={pct(data.apreciacao)} />
                    <TR label="Valor hoje" value={brl(valores.total)} />
                    <TR label="Valor final" value={brl(cenario1.valorFinal)} />
                    <TR label="Lucro" value={brl(cenario1.lucro)} />
                    <tr className="border-t-2 border-emerald-600"><td className="p-3 font-bold text-emerald-800">ROI</td><td className="p-3 font-bold text-emerald-800">{pct(cenario1.roi)}</td></tr>
                    <tr className="bg-emerald-100"><td className="p-3 font-bold text-emerald-900">ROAS</td><td className="p-3 font-bold text-emerald-900">{pct(cenario1.roas)}</td></tr>
                    <TR label="TIR (a.a.)" value={pct(cenario1.tir)} />
                  </tbody>
                </table>
              </div>
            </section>

            <section className="p-8 page page-break">
              <h3 className="font-semibold text-lg mb-2">4. Cenário 2 — Short Stay (5 anos após entrega)</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-[13px]">
                <div className="mb-3 p-3 bg-white rounded border text-[12px]">
                  <p className="font-semibold mb-1">Parâmetros</p>
                  <ul className="space-y-1">
                    <li>• ADR: {brl(cenario2.adrDiaria)}</li>
                    <li>• Ocupação: {data.ocupacao}% ≈ {Math.round((data.ocupacao || 0) * 30 / 100)} diárias/mês</li>
                    <li>• Receita bruta: {brl(cenario2.receitaMensalBruta)}/mês</li>
                    <li>• Custos: {data.custosOperacionais}%</li>
                    <li>• <strong>Líquido: {brl(cenario2.aluguelLiquido)}/mês</strong></li>
                  </ul>
                </div>
                <table className="w-full">
                  <tbody>
                    <TR label="Renda em 5 anos" value={brl(cenario2.rendaAcumulada)} />
                    <TR label="Valorização até entrega" value={brl(cenario2.patrimonioAcrescido)} />
                    <TR label="Valor final" value={brl(cenario2.valorFinal)} />
                    <tr className="border-t-2 bg-blue-200"><td className="p-3 font-bold">RETORNO TOTAL</td><td className="p-3 font-bold">{brl(cenario2.retornoTotal)}</td></tr>
                    <tr className="border-t-2 bg-emerald-50"><td className="p-3 font-bold text-emerald-800">ROI</td><td className="p-3 font-bold text-emerald-800">{pct(cenario2.roi)}</td></tr>
                    <tr className="bg-emerald-100"><td className="p-3 font-bold text-emerald-900">ROAS</td><td className="p-3 font-bold text-emerald-900">{pct(cenario2.roas)}</td></tr>
                    <TR label="TIR (a.a.)" value={pct(cenario2.tir)} />
                  </tbody>
                </table>
              </div>
            </section>

            {/* rodapé / letras pequenas */}
            <section className="p-8 page page-break">
              <p className="text-[11px] text-gray-500 italic">
                * Estimativas baseadas em projeções de mercado. ROI = retorno sobre o valor total; ROAS = retorno sobre o investimento real.
              </p>
              <p className="text-[11px] text-gray-500 mt-2">
                * Formas de pagamento sujeitas a atualização por <strong>CUB (período de obras)</strong> e <strong>IGP-M + 1%</strong> após a entrega das chaves.
              </p>
              <p className="text-[11px] text-gray-500 mt-2">
                © {new Date().getFullYear()} Alvo BR — {data.company} · {data.phone} · {data.email}
              </p>
            </section>
          </div>
        </div>
      )}

      {/* CSS de layout de página */}
      <style>{`
        /* Largura fixa de "folha" para o PDF ficar enquadrado */
        .paper { width: 794px; } /* ~A4 a 96dpi */
        .page { page-break-inside: avoid; }
        .page-break { page-break-before: always; }
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          .sticky { display: none !important; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .bg-emerald-50 { background-color: #ecfdf5 !important; }
          .bg-emerald-100 { background-color: #d1fae5 !important; }
          .bg-blue-50 { background-color: #eff6ff !important; }
          .bg-blue-100 { background-color: #dbeafe !important; }
          .bg-blue-200 { background-color: #bfdbfe !important; }
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
      <div className="p-4">{children}</div>
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
function TR({ label, value }) {
  return (
    <tr>
      <td className="p-3 text-gray-600">{label}</td>
      <td className="p-3 font-medium">{value || "—"}</td>
    </tr>
  );
}
