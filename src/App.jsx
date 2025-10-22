import React, { useEffect, useMemo, useRef, useState } from "react";
import alvoLogo from "./assets/alvo-logo.svg";

/********************
 * Utils
 ********************/
const brl = (n) => Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatCurrencyInput = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return brl(num);
};
const pct = (n) => {
  const num = Number.isFinite(Number(n)) ? Number(n) : 0;
  return num.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%";
};
const currencyToNumber = (s) => {
  if (typeof s === "number") return s;
  if (!s) return 0;
  const clean = s.toString().replace(/[R$\s\.]/g, "").replace(",", ".");
  const num = parseFloat(clean);
  return Number.isFinite(num) ? num : 0;
};
const calcularTIR = (fluxos, chute = 0.1) => {
  let taxa = chute;
  const max = 1000;
  const eps = 1e-4;
  for (let iter = 0; iter < max; iter++) {
    let vpl = 0;
    let der = 0;
    for (let i = 0; i < fluxos.length; i++) {
      const fator = Math.pow(1 + taxa, i);
      vpl += fluxos[i] / fator;
      der -= (i * fluxos[i]) / (fator * (1 + taxa));
    }
    if (Math.abs(vpl) < eps || der === 0) return taxa * 100;
    taxa -= vpl / der;
  }
  return 0;
};

/********************
 * Logo
 ********************/
const AlvoLogo = ({ size = 48 }) => <img src={alvoLogo} alt="Alvo BR" style={{ height: size, width: "auto" }} />;

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
    s.src = src;
    s.async = true;
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
  entradaValor: 98000,
  entradaParcelas: 1,
  obraParcelaValor: 12250,
  duranteObraParcelas: 36,
  chavesPercent: 45,
  chavesForma: "financiamento",
  chavesPosParcelas: 0,
  balaoValor: 0,
  balaoQuantidade: 0,
  balaoFrequenciaMeses: 6,
  prazoObraAnos: 3,
  apreciacao: 18,
  adrDiaria: 350,
  ocupacao: 70,
  custosOperacionais: 30,
  validade: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
};

/********************
 * App
 ********************/
export default function App() {
  const [step, setStep] = useState("setup");
  const [data, setData] = useState(sample);
  const resultRef = useRef(null);
  const [scheduleExpanded, setScheduleExpanded] = useState(false);

  useEffect(() => {
    setData((d) => {
      const anos = Number(d.prazoObraAnos || 0);
      if (!anos) return d;
      const parcelasEsperadas = anos * 12;
      const aindaPadrao = !d.duranteObraParcelas || d.duranteObraParcelas === sample.prazoObraAnos * 12;
      if (!aindaPadrao) return d;
      return {
        ...d,
        duranteObraParcelas: parcelasEsperadas,
      };
    });
  }, [data.prazoObraAnos]);

  useEffect(() => {
    if (step !== "resultado") {
      setScheduleExpanded(false);
    }
  }, [step]);

  const valores = useMemo(() => {
    const total = Math.max(0, Number(data.valorTotal || 0));

    const entradaValor = Math.max(0, Number(data.entradaValor || 0));
    const entradaParcelas = Math.max(1, Math.floor(Number(data.entradaParcelas || 1)));
    const entradaParcela = entradaParcelas > 0 ? entradaValor / entradaParcelas : 0;

    const parcelasObra = Math.max(0, Math.floor(Number(data.duranteObraParcelas || 0)));
    const duranteObraParcela = Math.max(0, Number(data.obraParcelaValor || 0));
    const duranteObraTotal = duranteObraParcela * parcelasObra;

    const chavesPercent = Math.max(0, Number(data.chavesPercent || 0));
    const chavesTotal = (total * chavesPercent) / 100;
    const chavesFinanciado = data.chavesForma === "financiamento";

    const qRef = Math.max(0, Math.floor(Number(data.balaoQuantidade || 0)));
    const vRef = Math.max(0, Number(data.balaoValor || 0));
    const freqRef = Math.max(1, Math.floor(Number(data.balaoFrequenciaMeses || 1)));
    const reforcosTotal = qRef * vRef;

    const totalPosChaves = data.chavesForma === "posConstrutora" ? chavesTotal : 0;
    const totalFinanciado = chavesFinanciado ? chavesTotal : 0;
    const totalFluxoSemFin = entradaValor + duranteObraTotal + reforcosTotal + (chavesFinanciado ? 0 : chavesTotal);
    const totalAteChaves = entradaValor + duranteObraTotal + reforcosTotal;

    const valorInvestidoReal = totalFluxoSemFin;
    const totalCoberto = valorInvestidoReal + totalFinanciado;
    const saldoACompor = Math.max(0, total - totalCoberto);

    const precoM2 = Number(data.area) > 0 ? total / Number(data.area) : 0;

    const baseDateRaw = data.date ? new Date(data.date) : new Date();
    const baseDate = Number.isFinite(baseDateRaw.getTime()) ? baseDateRaw : new Date();
    const addMonths = (date, months) => {
      const d = new Date(date.getTime());
      d.setMonth(d.getMonth() + months);
      return d;
    };

    const schedule = [];
    for (let i = 0; i < entradaParcelas; i++) {
      schedule.push({
        tipo: entradaParcelas === 1 ? "Entrada (ato)" : `Entrada ${i + 1}/${entradaParcelas}`,
        data: addMonths(baseDate, i),
        valor: entradaParcela,
      });
    }

    for (let i = 0; i < parcelasObra; i++) {
      schedule.push({
        tipo: `Obra ${i + 1}/${parcelasObra}`,
        data: addMonths(baseDate, entradaParcelas + i),
        valor: duranteObraParcela,
      });
    }

    if (qRef > 0 && vRef > 0) {
      for (let i = 0; i < qRef; i++) {
        const deslocamento = entradaParcelas + Math.min(Math.max(parcelasObra - 1, 0), i * freqRef);
        schedule.push({
          tipo: `Reforço ${i + 1}/${qRef}`,
          data: addMonths(baseDate, deslocamento),
          valor: vRef,
        });
      }
    }

    if (data.chavesForma === "avista" && chavesTotal > 0) {
      schedule.push({
        tipo: "Chaves (à vista)",
        data: addMonths(baseDate, entradaParcelas + parcelasObra),
        valor: chavesTotal,
      });
    }

    if (data.chavesForma === "posConstrutora" && chavesTotal > 0) {
      const pcs = Math.max(1, Math.floor(Number(data.chavesPosParcelas || 0)));
      const parcelaPos = chavesTotal / pcs;
      for (let i = 0; i < pcs; i++) {
        schedule.push({
          tipo: `Pós-chaves ${i + 1}/${pcs}`,
          data: addMonths(baseDate, entradaParcelas + parcelasObra + i + 1),
          valor: parcelaPos,
        });
      }
    }

    const scheduleOrdenado = schedule.sort((a, b) => a.data - b.data);

    return {
      total,
      entradaValor,
      entradaParcelas,
      entradaParcela,
      duranteObraTotal,
      duranteObraParcela,
      duranteObraParcelas: parcelasObra,
      chavesTotal,
      chavesFinanciado,
      reforcosTotal,
      valorInvestidoReal,
      saldoACompor,
      precoM2,
      qRef,
      vRef,
      freqRef,
      totalEntrada: entradaValor,
      totalObra: duranteObraTotal,
      totalReforcos: reforcosTotal,
      totalPosChaves,
      totalFinanciado,
      totalFluxoSemFin,
      totalAteChaves,
      totalCoberto,
      schedule: scheduleOrdenado,
      entradaPercent: total > 0 ? (entradaValor / total) * 100 : 0,
      duranteObraPercent: total > 0 ? (duranteObraTotal / total) * 100 : 0,
    };
  }, [data]);

  const buildFluxosBase = (incluirChaves = true) => {
    const fluxos = [];

    for (let i = 0; i < valores.entradaParcelas; i++) fluxos.push(-valores.entradaParcela);
    for (let i = 0; i < valores.duranteObraParcelas; i++) fluxos.push(-valores.duranteObraParcela);

    if (valores.qRef > 0 && valores.vRef > 0) {
      for (let i = 0; i < valores.qRef; i++) {
        const idx = valores.entradaParcelas + Math.min(Math.max(valores.duranteObraParcelas - 1, 0), i * valores.freqRef);
        while (fluxos.length <= idx) fluxos.push(0);
        fluxos[idx] -= valores.vRef;
      }
    }

    if (incluirChaves) {
      if (data.chavesForma === "avista") {
        fluxos.push(-valores.chavesTotal);
      } else if (data.chavesForma === "posConstrutora") {
        const pcs = Math.max(1, Math.floor(Number(data.chavesPosParcelas || 0)));
        const parcelaPos = valores.chavesTotal / pcs;
        for (let i = 0; i < pcs; i++) fluxos.push(-parcelaPos);
      } else {
        for (let i = 0; i < 12; i++) fluxos.push(0);
      }
    }

    return fluxos;
  };

  const cenario1 = useMemo(() => {
    const anos = Math.max(0, Number(data.prazoObraAnos || 0));
    const taxa = Math.max(0, Number(data.apreciacao || 0)) / 100;
    const valorFinal = valores.total * Math.pow(1 + taxa, anos);
    const lucro = valorFinal - valores.total;
    const roi = valores.total > 0 ? (lucro / valores.total) * 100 : 0;
    const roas = valores.valorInvestidoReal > 0 ? (lucro / valores.valorInvestidoReal) * 100 : 0;
    const fluxos = buildFluxosBase(true);
    fluxos.push(valorFinal);
    const tirMensal = calcularTIR(fluxos);
    const tirAnual = tirMensal ? (Math.pow(1 + tirMensal / 100, 12) - 1) * 100 : 0;
    return { valorFinal, lucro, roi, roas, tir: tirAnual, prazo: anos };
  }, [valores, data]);

  const cenario2 = useMemo(() => {
    const anosEntrega = Math.max(0, Number(data.prazoObraAnos || 0));
    const taxa = Math.max(0, Number(data.apreciacao || 0)) / 100;
    const valorFinal = valores.total * Math.pow(1 + taxa, anosEntrega);
    const patrimonioAcrescido = valorFinal - valores.total;

    const adrDiaria = Math.max(0, Number(data.adrDiaria || 0));
    const ocupacao = Math.max(0, Number(data.ocupacao || 0)) / 100;
    const custos = Math.max(0, Number(data.custosOperacionais || 0)) / 100;
    const receitaMensalBruta = adrDiaria * ocupacao * 30;
    const aluguelLiquido = receitaMensalBruta * (1 - custos);

    const mesesOperacao = 5 * 12;
    const rendaAcumulada = aluguelLiquido * mesesOperacao;
    const retornoTotal = patrimonioAcrescido + rendaAcumulada;
    const roi = valores.total > 0 ? (retornoTotal / valores.total) * 100 : 0;
    const roas = valores.valorInvestidoReal > 0 ? (retornoTotal / valores.valorInvestidoReal) * 100 : 0;

    const fluxos = buildFluxosBase(true);
    for (let i = 0; i < mesesOperacao; i++) fluxos.push(aluguelLiquido);
    fluxos.push(valorFinal);
    const tirMensal = calcularTIR(fluxos);
    const tirAnual = tirMensal ? (Math.pow(1 + tirMensal / 100, 12) - 1) * 100 : 0;

    return {
      valorFinal,
      patrimonioAcrescido,
      adrDiaria,
      receitaMensalBruta,
      aluguelLiquido,
      rendaAcumulada,
      retornoTotal,
      roi,
      roas,
      tir: tirAnual,
      prazoTotal: anosEntrega + 5,
    };
  }, [valores, data]);

  const handle = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }));
  const handleNumeric = (k) => (e) => {
    const rawValue = e.target.value;
    if (rawValue === undefined) return;
    if (rawValue.trim() === "") {
      setData((d) => ({ ...d, [k]: "" }));
      return;
    }
    const num = Math.max(0, currencyToNumber(rawValue));
    setData((d) => ({ ...d, [k]: num }));
  };
  const handlePercent = (k) => (e) => {
    const text = e.target.value ?? "";
    if (text.trim() === "") {
      setData((d) => ({ ...d, [k]: "" }));
      return;
    }
    const raw = parseFloat(text.replace(",", "."));
    const num = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    setData((d) => ({ ...d, [k]: num }));
  };

  const recalc = () => setData((d) => ({ ...d }));

  const savePDF = async () => {
    await ensurePdfLibs();
    const { jsPDF } = window.jspdf;
    const node = resultRef.current;
    const originalWidth = node.style.width;
    node.style.width = "794px";

    const canvas = await window.html2canvas(node, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const pageHeightPx = (canvas.width * pageHeight) / pageWidth;

    let position = 0;
    let pageIndex = 0;
    while (position < canvas.height) {
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.min(pageHeightPx, canvas.height - position);
      const sliceCtx = sliceCanvas.getContext("2d");
      sliceCtx.drawImage(
        canvas,
        0,
        position,
        canvas.width,
        sliceCanvas.height,
        0,
        0,
        canvas.width,
        sliceCanvas.height
      );
      const sliceData = sliceCanvas.toDataURL("image/png");
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(sliceData, "PNG", 0, 0, imgWidth, (sliceCanvas.height * imgWidth) / canvas.width);
      position += pageHeightPx;
      pageIndex++;
    }

    node.style.width = originalWidth || "";
    const file = `Proposta_Alvo_${(data.cliente || "cliente").replace(/\s+/g, "_")}.pdf`;
    pdf.save(file);
  };

  const gerarProposta = () => setStep("resultado");
  const fillExample = () => setData(sample);
  const clearAll = () => setData({});

  const resumoFluxo = [
    { label: "Entrada", valor: valores.totalEntrada },
    { label: "Durante a obra", valor: valores.totalObra },
    { label: "Reforços", valor: valores.totalReforcos },
    data.chavesForma === "avista"
      ? { label: "Chaves (à vista)", valor: valores.chavesTotal }
      : data.chavesForma === "posConstrutora"
      ? { label: "Pós-chaves", valor: valores.totalPosChaves }
      : null,
  ].filter(Boolean);

  const resumoKPIs = [
    { title: "Valor do imóvel", value: brl(valores.total) },
    { title: "Investimento real", value: brl(valores.valorInvestidoReal) },
    { title: "Fluxo total (cliente)", value: brl(valores.totalFluxoSemFin) },
    valores.totalPosChaves ? { title: "Pós-chaves", value: brl(valores.totalPosChaves) } : null,
    valores.totalFinanciado ? { title: "Financiado (banco)", value: brl(valores.totalFinanciado) } : null,
    {
      title: "Saldo a compor",
      value: brl(valores.saldoACompor),
      highlight: true,
      subtitle: `Coberto até agora: ${brl(valores.totalCoberto)}`,
    },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="sticky top-0 z-40 backdrop-blur border-b bg-white/80">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <AlvoLogo size={36} />
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Alvo Propostas</h1>
            <p className="text-xs text-gray-500">
              Página {step === "setup" ? "de Edição" : "da Proposta"} · PDF multipágina A4
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fillExample} className="px-3 py-2 rounded-2xl bg-white shadow-sm border text-sm">
              Exemplo
            </button>
            <button onClick={clearAll} className="px-3 py-2 rounded-2xl bg-white shadow-sm border text-sm">
              Limpar
            </button>
            {step === "setup" && (
              <button onClick={recalc} className="px-3 py-2 rounded-2xl bg-white shadow-sm border text-sm">
                Recalcular
              </button>
            )}
            {step === "resultado" ? (
              <>
                <button
                  onClick={() => setStep("setup")}
                  className="px-3 py-2 rounded-2xl bg-white shadow-sm border text-sm"
                >
                  Voltar ao Setup
                </button>
                <button
                  onClick={savePDF}
                  className="px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                >
                  Baixar PDF
                </button>
              </>
            ) : (
              <button
                onClick={gerarProposta}
                className="px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
              >
                Gerar Proposta
              </button>
            )}
          </div>
        </div>
      </header>

      {step === "setup" ? (
        <main className="mx-auto max-w-7xl p-6 space-y-6">
          <Card title="1) Empresa">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Empresa" value={data.company || ""} onChange={handle("company")} />
              <Input label="Data" value={data.date || ""} onChange={handle("date")} />
              <Input label="Consultor" value={data.consultor || ""} onChange={handle("consultor")} />
              <Input label="Telefone" value={data.phone || ""} onChange={handle("phone")} />
              <Input label="E-mail" value={data.email || ""} onChange={handle("email")} />
              <Input
                label="Site (URL)"
                value={data.siteUrl || ""}
                onChange={handle("siteUrl")}
                placeholder="https://alvobr.com.br"
              />
            </div>
          </Card>

          <Card title="2) Cliente">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Nome" value={data.cliente || ""} onChange={handle("cliente")} />
              <Input label="Telefone" value={data.clientePhone || ""} onChange={handle("clientePhone")} />
              <Input label="E-mail" value={data.clienteEmail || ""} onChange={handle("clienteEmail")} />
              <Input
                label="Recursos próprios (R$)"
                value={data.recursosCliente ?? ""}
                onChange={handleNumeric("recursosCliente")}
                formatAsCurrency
                inputMode="decimal"
              />
            </div>
          </Card>

          <Card title="3) Empreendimento">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Nome" value={data.empreendimento || ""} onChange={handle("empreendimento")} />
              <Input label="Endereço" value={data.endereco || ""} onChange={handle("endereco")} />
              <Input label="Construtora" value={data.construtora || ""} onChange={handle("construtora")} />
              <Input label="Tipo" value={data.tipo || ""} onChange={handle("tipo")} />
              <Input label="Área (m²)" value={data.area ?? ""} onChange={handleNumeric("area")} />
              <Input label="Vagas" value={data.vagas ?? ""} onChange={handleNumeric("vagas")} />
              <Input label="Entrega" value={data.entrega || ""} onChange={handle("entrega")} />
            </div>
          </Card>

          <Card title="4) Fluxo de Pagamento (nominal)">
            <div className="space-y-4">
              <div className="rounded-xl border p-3 bg-slate-50">
                <p className="text-sm font-semibold mb-2">Valor do imóvel</p>
                <Input
                  label="Valor total (R$)"
                  value={data.valorTotal ?? ""}
                  onChange={handleNumeric("valorTotal")}
                  formatAsCurrency
                  inputMode="decimal"
                />
              </div>

              <div className="rounded-xl border p-3 bg-slate-50">
                <p className="text-sm font-semibold mb-2">Entrada</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <Input
                      label="Total de entrada (R$)"
                      value={data.entradaValor ?? ""}
                      onChange={handleNumeric("entradaValor")}
                      formatAsCurrency
                      inputMode="decimal"
                    />
                  <Input
                    label="Parcelas de entrada"
                    value={data.entradaParcelas ?? ""}
                    onChange={handleNumeric("entradaParcelas")}
                  />
                  <div className="text-xs text-gray-600">
                    Parcela estimada:<br />
                    <strong>{brl(valores.entradaParcela)}</strong>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-3 bg-slate-50">
                <p className="text-sm font-semibold mb-2">Durante a obra</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <Input
                    label="Parcela de obra (R$)"
                    value={data.obraParcelaValor ?? ""}
                    onChange={handleNumeric("obraParcelaValor")}
                    formatAsCurrency
                    inputMode="decimal"
                  />
                  <Input
                    label="Nº de parcelas"
                    value={data.duranteObraParcelas ?? ""}
                    onChange={handleNumeric("duranteObraParcelas")}
                  />
                  <div className="text-xs text-gray-600">
                    Total em obra:<br />
                    <strong>{brl(valores.duranteObraTotal)}</strong>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-3 bg-slate-50">
                <p className="text-sm font-semibold mb-2">Reforços</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <Input
                      label="Valor do reforço (R$)"
                      value={data.balaoValor ?? ""}
                      onChange={handleNumeric("balaoValor")}
                      formatAsCurrency
                      inputMode="decimal"
                    />
                  <Input
                    label="Quantidade"
                    value={data.balaoQuantidade ?? ""}
                    onChange={handleNumeric("balaoQuantidade")}
                  />
                  <Input
                    label="Frequência (meses)"
                    value={data.balaoFrequenciaMeses ?? ""}
                    onChange={handleNumeric("balaoFrequenciaMeses")}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Total em reforços: <strong>{brl(valores.reforcosTotal)}</strong>
                </div>
              </div>

              <div className="rounded-xl border p-3 bg-slate-50">
                <p className="text-sm font-semibold mb-2">Entrega das chaves</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <label className="block">
                    <div className="text-xs text-gray-600 mb-1">Forma</div>
                    <select
                      className="w-full px-3 py-2 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={data.chavesForma || "financiamento"}
                      onChange={(e) => setData((d) => ({ ...d, chavesForma: e.target.value }))}
                    >
                      <option value="financiamento">Financiamento bancário</option>
                      <option value="avista">À vista na entrega</option>
                      <option value="posConstrutora">Parcelado (pós-chaves)</option>
                    </select>
                  </label>
                  <Input
                    label="Chaves (% do total)"
                    value={data.chavesPercent ?? ""}
                    onChange={handlePercent("chavesPercent")}
                  />
                  {data.chavesForma === "posConstrutora" && (
                    <Input
                      label="Parcelas pós-chaves"
                      value={data.chavesPosParcelas ?? ""}
                      onChange={handleNumeric("chavesPosParcelas")}
                    />
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-600 space-y-1">
                  {data.chavesForma !== "financiamento" && (
                    <div>
                      Valor das chaves: <strong>{brl(valores.chavesTotal)}</strong>
                    </div>
                  )}
                  {data.chavesForma === "financiamento" && (
                    <div>
                      Valor a financiar (banco): <strong>{brl(valores.chavesTotal)}</strong>
                    </div>
                  )}
                  {data.chavesForma === "posConstrutora" && (
                    <div>
                      Pós-chaves em {Math.max(1, Number(data.chavesPosParcelas || 0))}x de {" "}
                      <strong>{brl(valores.chavesTotal / Math.max(1, Number(data.chavesPosParcelas || 1)))}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border p-3 bg-slate-50">
                <p className="text-sm font-semibold mb-2">Prazos e parâmetros</p>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <Input label="Prazo de obra (anos)" value={data.prazoObraAnos ?? ""} onChange={handleNumeric("prazoObraAnos")} />
                  <Input label="Valorização a.a. (%)" value={data.apreciacao ?? ""} onChange={handlePercent("apreciacao")} />
                    <Input
                      label="ADR (R$)"
                      value={data.adrDiaria ?? ""}
                      onChange={handleNumeric("adrDiaria")}
                      formatAsCurrency
                      inputMode="decimal"
                    />
                  <Input label="Ocupação (%)" value={data.ocupacao ?? ""} onChange={handlePercent("ocupacao")} />
                  <Input
                    label="Custos operacionais (%)"
                    value={data.custosOperacionais ?? ""}
                    onChange={handlePercent("custosOperacionais")}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-2xl p-4 shadow-sm text-sm mt-4">
              <p className="font-semibold text-emerald-800 mb-2">Resumo</p>
              <ul className="space-y-1">
                <li>
                  {valores.entradaParcelas === 1 ? (
                    <>
                      Entrada (ato): <strong>{brl(valores.entradaValor)}</strong>
                    </>
                  ) : (
                    <>
                      Entrada: <strong>{brl(valores.entradaValor)}</strong> em <strong>{valores.entradaParcelas}x</strong> ({" "}
                      {brl(valores.entradaParcela)}/parcela)
                    </>
                  )}
                </li>
                <li>
                  Durante a obra: <strong>{brl(valores.duranteObraTotal)}</strong> em <strong>{valores.duranteObraParcelas}x</strong>{" "}
                  ({brl(valores.duranteObraParcela)}/mês)
                </li>
                <li>
                  Reforços: <strong>{brl(valores.reforcosTotal)}</strong>
                  {valores.qRef ? ` (${valores.qRef} reforços de ${brl(valores.vRef)} a cada ${valores.freqRef}m)` : ""}
                </li>
                <li>
                  Chaves: {data.chavesForma === "financiamento" ? (
                    <strong>(financiado pelo banco)</strong>
                  ) : data.chavesForma === "posConstrutora" ? (
                    <>
                      <strong>{brl(valores.chavesTotal)}</strong> em {Math.max(1, Number(data.chavesPosParcelas || 0))}x
                    </>
                  ) : (
                    <>
                      <strong>{brl(valores.chavesTotal)}</strong> (à vista)
                    </>
                  )}
                </li>
              </ul>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 border p-3">
                    Investimento real: <strong>{brl(valores.valorInvestidoReal)}</strong>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                    Saldo a compor: <strong className="text-emerald-700">{brl(valores.saldoACompor)}</strong>
                    <div className="text-[11px] text-emerald-700 mt-1">
                      Total coberto até agora: <strong>{brl(valores.totalCoberto)}</strong>
                    </div>
                  </div>
                </div>
              <div className="mt-3 rounded-xl bg-white border p-3">
                <p className="font-semibold mb-1">Totais do fluxo</p>
                <ul className="text-xs space-y-1">
                  {resumoFluxo.map((item) => (
                    <li key={item.label} className="flex justify-between">
                      <span>{item.label}</span>
                      <span className="font-medium">{brl(item.valor)}</span>
                    </li>
                  ))}
                  {valores.totalFinanciado > 0 && (
                    <li className="flex justify-between text-emerald-700">
                      <span>Financiado (banco)</span>
                      <span className="font-semibold">{brl(valores.totalFinanciado)}</span>
                    </li>
                  )}
                </ul>
                <div className="mt-2 text-xs text-gray-600">
                  Fluxo total (cliente): <strong>{brl(valores.totalFluxoSemFin)}</strong>
                </div>
              </div>
            </div>
          </Card>
        </main>
      ) : (
        <main className="mx-auto max-w-7xl p-6">
          <div ref={resultRef} className="paper mx-auto space-y-10">
            <section className="page bg-white border rounded-3xl shadow-sm p-12 space-y-8">
              <div className="flex flex-wrap items-start gap-6">
                <AlvoLogo size={72} />
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold text-slate-800">Proposta de Investimento Imobiliário</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Elaborada por {data.company || "—"} · {data.consultor || "Consultor"}
                  </p>
                </div>
                <div className="text-sm text-right text-gray-500">
                  <p>Data: {formatDate(data.date)}</p>
                  <p>Validade: {formatDate(data.validade)}</p>
                  <p>Telefone: {data.phone || "—"}</p>
                  <p>E-mail: {data.email || "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-600 mb-3">Cliente</h3>
                  <DataRow k="Nome" v={data.cliente} />
                  <DataRow k="Telefone" v={data.clientePhone} />
                  <DataRow k="E-mail" v={data.clienteEmail} />
                  <DataRow k="Recursos próprios" v={brl(data.recursosCliente)} />
                </div>
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-600 mb-3">Empreendimento</h3>
                  <DataRow k="Nome" v={data.empreendimento} />
                  <DataRow k="Endereço" v={data.endereco} />
                  <DataRow k="Construtora" v={data.construtora} />
                  <DataRow k="Tipologia" v={data.tipo} />
                  <DataRow k="Área privativa" v={data.area ? `${data.area} m²` : "—"} />
                  <DataRow k="Vagas" v={data.vagas ? `${data.vagas}` : "—"} />
                  <DataRow k="Entrega" v={data.entrega} />
                  <DataRow k="Preço/m²" v={valores.precoM2 ? brl(valores.precoM2) : "—"} />
                </div>
              </div>
            </section>

            <section className="page bg-white border rounded-3xl shadow-sm p-12 space-y-6">
              <h3 className="text-lg font-semibold text-slate-700">Resumo Executivo</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {resumoKPIs.map((kpi) => (
                  <KPI key={kpi.title} title={kpi.title} value={kpi.value} highlight={kpi.highlight} />
                ))}
              </div>
            </section>

            <section className="page bg-white border rounded-3xl shadow-sm p-12 space-y-6">
              <h3 className="text-lg font-semibold text-slate-700">Condições Comerciais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border bg-slate-50 p-4 space-y-2 text-sm">
                  {resumoFluxo.map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span>{item.label}</span>
                      <span className="font-semibold">{brl(item.valor)}</span>
                    </div>
                  ))}
                  {valores.totalFinanciado > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Financiado (banco)</span>
                      <span>{brl(valores.totalFinanciado)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t text-sm text-gray-600 flex justify-between">
                    <span>Fluxo total (cliente)</span>
                    <span className="font-semibold">{brl(valores.totalFluxoSemFin)}</span>
                  </div>
                </div>
                <div className="rounded-2xl border bg-slate-50 p-4 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Investimento até as chaves</span>
                    <strong>{brl(valores.totalAteChaves)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Investimento real</span>
                    <strong>{brl(valores.valorInvestidoReal)}</strong>
                  </div>
                  {valores.totalPosChaves > 0 && (
                    <div className="flex justify-between">
                      <span>Parcelas pós-chaves</span>
                      <strong>{brl(valores.totalPosChaves)}</strong>
                    </div>
                  )}
                  {valores.totalFinanciado > 0 && (
                    <div className="flex justify-between">
                      <span>Financiado (banco)</span>
                      <strong>{brl(valores.totalFinanciado)}</strong>
                    </div>
                  )}
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Saldo a compor</span>
                    <span>{brl(valores.saldoACompor)}</span>
                  </div>
                  <div className="text-xs text-emerald-700">
                    Total coberto até agora: <strong>{brl(valores.totalCoberto)}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="page bg-white border rounded-3xl shadow-sm p-12 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-700">Fluxo de Pagamento</h3>
                <button
                  onClick={() => setScheduleExpanded((prev) => !prev)}
                  className="px-3 py-2 text-xs font-medium rounded-full border border-emerald-500 text-emerald-600 hover:bg-emerald-50 transition"
                >
                  {scheduleExpanded
                    ? "Ocultar cronograma mensal"
                    : `Ver cronograma mensal (${valores.schedule.length} lançamentos)`}
                </button>
              </div>

              {!scheduleExpanded ? (
                <div className="rounded-xl border bg-slate-50 p-4 text-sm space-y-3">
                  <div className="space-y-1">
                    {resumoFluxo.map((item) => (
                      <div key={item.label} className="flex justify-between">
                        <span>{item.label}</span>
                        <span className="font-semibold">{brl(item.valor)}</span>
                      </div>
                    ))}
                    {valores.totalFinanciado > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Financiado (banco)</span>
                        <span>{brl(valores.totalFinanciado)}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t text-sm flex justify-between text-slate-700">
                    <span>Fluxo total (cliente)</span>
                    <span className="font-semibold">{brl(valores.totalFluxoSemFin)}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {valores.schedule.length} lançamentos considerados até as chaves. Clique para ver o detalhamento
                    mensal.
                  </p>
                </div>
              ) : (
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
                      {(() => {
                        let acumulado = 0;
                        return valores.schedule.map((p, i) => {
                          acumulado += p.valor;
                          const perc = valores.totalFluxoSemFin > 0 ? (acumulado / valores.totalFluxoSemFin) * 100 : 0;
                          return (
                            <tr key={`${p.tipo}-${i}`} className="border-b last:border-0">
                              <td className="p-2">{i + 1}</td>
                              <td className="p-2">{p.data.toLocaleDateString("pt-BR")}</td>
                              <td className="p-2">{p.tipo}</td>
                              <td className="p-2 text-right">{brl(p.valor)}</td>
                              <td className="p-2 text-right">{brl(acumulado)}</td>
                              <td className="p-2 text-right">{perc.toFixed(2)}%</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[11px] text-gray-500">
                Fórmulas: Valor total = SOMA(Entrada + Obra + Reforços + (Chaves à vista ou Pós-chaves)). Acumulado(i) =
                Acumulado(i-1) + Valor(i). % do fluxo(i) = Acumulado(i) / Total do fluxo.
              </p>
            </section>

            <section className="page bg-white border rounded-3xl shadow-sm p-12 space-y-6">
              <h3 className="text-lg font-semibold text-slate-700">Cenário 1 — Revenda</h3>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-[13px]">
                <table className="w-full">
                  <tbody>
                    <TR label="Prazo (anos)" value={String(data.prazoObraAnos || 0)} />
                    <TR label="Valorização anual" value={pct(data.apreciacao)} />
                    <TR label="Valor hoje" value={brl(valores.total)} />
                    <TR label="Valor final" value={brl(cenario1.valorFinal)} />
                    <TR label="Lucro" value={brl(cenario1.lucro)} />
                    <tr className="border-t-2 border-emerald-600">
                      <td className="p-3 font-bold text-emerald-800">ROI</td>
                      <td className="p-3 font-bold text-emerald-800">{pct(cenario1.roi)}</td>
                    </tr>
                    <tr className="bg-emerald-100">
                      <td className="p-3 font-bold text-emerald-900">ROAS</td>
                      <td className="p-3 font-bold text-emerald-900">{pct(cenario1.roas)}</td>
                    </tr>
                    <TR label="TIR (a.a.)" value={pct(cenario1.tir)} />
                  </tbody>
                </table>
              </div>
            </section>

            <section className="page bg-white border rounded-3xl shadow-sm p-12 space-y-6">
              <h3 className="text-lg font-semibold text-slate-700">Cenário 2 — Short Stay (5 anos)</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-[13px] space-y-3">
                <div className="p-3 bg-white rounded border text-[12px] leading-6">
                  <p className="font-semibold mb-1">Parâmetros</p>
                  <ul className="space-y-1">
                    <li>• ADR: {brl(cenario2.adrDiaria)}</li>
                    <li>
                      • Ocupação: {data.ocupacao}% ≈ {Math.round(((data.ocupacao || 0) * 30) / 100)} diárias/mês
                    </li>
                    <li>• Receita bruta: {brl(cenario2.receitaMensalBruta)}/mês</li>
                    <li>• Custos: {data.custosOperacionais}%</li>
                    <li>
                      • <strong>Líquido: {brl(cenario2.aluguelLiquido)}/mês</strong>
                    </li>
                  </ul>
                </div>
                <table className="w-full">
                  <tbody>
                    <TR label="Renda em 5 anos" value={brl(cenario2.rendaAcumulada)} />
                    <TR label="Valorização até entrega" value={brl(cenario2.patrimonioAcrescido)} />
                    <TR label="Valor final" value={brl(cenario2.valorFinal)} />
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
                    <TR label="TIR (a.a.)" value={pct(cenario2.tir)} />
                  </tbody>
                </table>
              </div>
            </section>

            <section className="page bg-white border rounded-3xl shadow-sm p-12 space-y-3">
              <p className="text-[11px] text-gray-500 italic leading-5">
                * Estimativas baseadas em projeções de mercado. ROI = retorno sobre o valor total; ROAS = retorno sobre o
                investimento real.
              </p>
              <p className="text-[11px] text-gray-500 leading-5">
                * Formas de pagamento sujeitas a atualização por <strong>CUB (período de obras)</strong> e <strong>IGP-M + 1%</strong>
                após a entrega das chaves.
              </p>
              <p className="text-[11px] text-gray-500 leading-5">
                © {new Date().getFullYear()} Alvo BR — {data.company} · {data.phone} · {data.email}
              </p>
            </section>
          </div>
        </main>
      )}

      <style>{`
        .paper { width: 100%; max-width: 1100px; }
        .page { page-break-inside: avoid; }
        .page-break { page-break-before: always; margin-top: 8px; }
        .paper img { max-width: 100%; height: auto; }
        .paper * { line-height: 1.45; word-break: break-word; }
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
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
 * Helpers & UI
 ********************/
const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("pt-BR") : "—";
};

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

function Input({ label, value, onChange, placeholder, formatAsCurrency = false, inputMode, ...rest }) {
  const displayValue =
    formatAsCurrency && value !== null && value !== undefined && value !== ""
      ? formatCurrencyInput(value)
      : value ?? "";
  return (
    <label className="block">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <input
        className="w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        value={displayValue}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={inputMode}
        {...rest}
      />
    </label>
  );
}

function DataRow({ k, v }) {
  return (
    <div className="flex gap-2 py-2 border-b border-dashed border-gray-200 text-sm">
      <div className="w-36 text-gray-500">{k}</div>
      <div className="flex-1 font-medium">{v || "—"}</div>
    </div>
  );
}

function KPI({ title, value, highlight, subtitle }) {
  return (
    <div className={`rounded-xl border p-3 space-y-1 ${highlight ? "bg-emerald-50 border-emerald-200" : "bg-white"}`}>
      <div className="text-xs text-gray-600 mb-1">{title}</div>
      <div className="text-lg font-bold">{value}</div>
      {subtitle && (
        <div className={`text-xs ${highlight ? "text-emerald-700" : "text-gray-500"}`}>{subtitle}</div>
      )}
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
