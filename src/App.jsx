import React, { useEffect, useMemo, useRef, useState } from "react";

/********************
 * Utils
 ********************/
const brl = (n) =>
  Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (n) =>
  (isFinite(Number(n)) ? Number(n) : 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  }) + "%";
const currencyToNumber = (s) => {
  if (typeof s === "number") return s;
  if (!s) return 0;
  const clean = s.toString().replace(/[R$\s\.]/g, "").replace(",", ".");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};
const calcularTIR = (fluxos, chute = 0.1) => {
  let taxa = chute,
    iter = 0;
  const max = 1000,
    eps = 1e-4;
  while (iter < max) {
    let vpl = 0,
      der = 0;
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
const ALVO_LOGO =
  "data:image/svg+xml,%3Csvg width='1200' height='400' viewBox='0 0 1200 400' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50' y='300' font-family='Arial' font-size='280' font-weight='900' fill='%233A3A3A' letter-spacing='-10'%3EALVO%3C/text%3E%3Ccircle cx='950' cy='200' r='140' stroke='%233A3A3A' stroke-width='28' fill='none'/%3E%3Ccircle cx='950' cy='200' r='85' stroke='%233A3A3A' stroke-width='20' fill='none'/%3E%3Ctext x='1050' y='235' font-family='Arial' font-size='95' font-weight='700' fill='%2334747E'%3EBR%3C/text%3E%3C/svg%3E";
const AlvoLogo = ({ size = 48 }) => (
  <img src={ALVO_LOGO} alt="Alvo BR" style={{ height: size, width: "auto" }} />
);

/********************
 * PDF libs
 ********************/
async function ensurePdfLibs() {
  const needH2C = typeof window !== "undefined" && !window.html2canvas;
  const needJSPDF =
    typeof window !== "undefined" && !(window.jspdf && window.jspdf.jsPDF);
  const loaders = [];
  if (needH2C)
    loaders.push(
      loadScript(
        "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"
      )
    );
  if (needJSPDF)
    loaders.push(
      loadScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js")
    );
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
  empreendimento: "Nome do Empreendimento",
  endereco: "Endereço completo — Itajaí/SC",
  construtora: "Nome da Construtora",
  tipo: "Apartamento 2 suítes",
  area: 74,
  vagas: 2,
  entrega: "Dezembro/2029",
  valorTotal: 980000,
  // Fluxo (nominal), porcentagem apenas para CHAVES
  entradaValor: 98000,
  entradaParcelas: 1,
  obraParcelaValor: 3000,
  duranteObraParcelas: 60,
  chavesPercent: 45,
  chavesForma: "financiamento", // financiamento | avista | posConstrutora
  chavesPosParcelas: 24,
  // Reforços (ex-Balões)
  balaoValor: 20000,
  balaoQuantidade: 6,
  balaoFrequenciaMeses: 12,
  prazoObraAnos: 3,
  apreciacao: 18, // % a.a.
  adrDiaria: 350,
  ocupacao: 70,
  custosOperacionais: 30,
  validade: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
};

/********************
 * App
 ********************/
export default function App() {
  const [step, setStep] = useState("setup"); // setup | resultado
  const [data, setData] = useState(sample);
  const resultRef = useRef(null);

  // Prazo de obra governa nº de parcelas e anos de valorização
  useEffect(() => {
    setData((d) => {
      const anos = Number(d.prazoObraAnos || 0);
      if (!anos) return d;
      const alvoParcelas = anos * 12;
      const aindaPadrao =
        !d.duranteObraParcelas ||
        d.duranteObraParcelas === sample.prazoObraAnos * 12;
      return {
        ...d,
        duranteObraParcelas: aindaPadrao ? alvoParcelas : d.duranteObraParcelas,
      };
    });
  }, [data.prazoObraAnos]);

  // Cálculos
  const valores = useMemo(() => {
    const total = Number(data.valorTotal || 0);

    // Entrada NOMINAL
    const entradaValor = Number(data.entradaValor || 0);
    const entradaParcelas = Math.max(1, Number(data.entradaParcelas || 1));
    const entradaParcela = entradaValor / entradaParcelas;

    // Obra NOMINAL
    const parcelasObra = Number(data.duranteObraParcelas || 0);
    const duranteObraParcela = Number(data.obraParcelaValor || 0);
    const duranteObraTotal = duranteObraParcela * Math.max(0, parcelasObra);

    // Chaves (%)
    const chavesTotal = (total * Number(data.chavesPercent || 0)) / 100;
    const chavesFinanciado = data.chavesForma === "financiamento";

    // Reforços (ex-Balões)
    const qRef = Math.max(0, Number(data.balaoQuantidade || 0));
    const vRef = Math.max(0, Number(data.balaoValor || 0));
    const freqRef = Math.max(1, Number(data.balaoFrequenciaMeses || 1));
    const reforcosTotal = qRef * vRef;

    // Investimento real (cliente) — inclui tudo, exceto chaves financiadas
    const valorInvestidoReal =
      entradaValor +
      duranteObraTotal +
      reforcosTotal +
      (chavesFinanciado ? 0 : chavesTotal);

    // Saldo a compor (retirado "recursos do cliente")
    const recursosCliente = 0;
    const saldoACompor = Math.max(0, valorInvestidoReal);

    const precoM2 = Number(data.area || 0) > 0 ? total / Number(data.area) : 0;

    // Cronograma: Entrada → Obra → Reforços (durante a obra) → Chaves
    const hoje = new Date();
    const schedule = [];

    // Entrada
    for (let i = 1; i <= entradaParcelas; i++) {
      const d = new Date(hoje);
      d.setMonth(d.getMonth() + (i - 1));
      schedule.push({
        tipo: entradaParcelas === 1 ? `Entrada (ato)` : `Entrada ${i}/${entradaParcelas}`,
        data: d,
        valor: entradaParcela,
      });
    }
    // Obra
    for (let i = 1; i <= parcelasObra; i++) {
      const d = new Date(hoje);
      d.setMonth(d.getMonth() + i);
      schedule.push({ tipo: `Obra ${i}/${parcelasObra}`, data: d, valor: duranteObraParcela });
    }
    // Reforços (intercalados na obra)
    for (let i = 1; i <= qRef; i++) {
      const d = new Date(hoje);
      d.setMonth(d.getMonth() + i * freqRef);
      schedule.push({ tipo: `Reforço ${i}/${qRef}`, data: d, valor: vRef });
    }
    // Chaves (à vista, pós-construtora ou banco)
    if (data.chavesForma === "avista") {
      const dChaves = new Date(hoje);
      dChaves.setMonth(dChaves.getMonth() + parcelasObra);
      schedule.push({ tipo: "Chaves (à vista)", data: dChaves, valor: chavesTotal });
    } else if (data.chavesForma === "posConstrutora") {
      const nPosChaves = Math.max(1, Number(data.chavesPosParcelas || 1));
      const valorPorParcela = chavesTotal / nPosChaves;
      for (let i = 1; i <= nPosChaves; i++) {
        const d = new Date(hoje);
        d.setMonth(d.getMonth() + parcelasObra + i);
        schedule.push({ tipo: `Pós-chaves ${i}/${nPosChaves}`, data: d, valor: valorPorParcela });
      }
    }

    // Totalizadores
    const totalEntrada = entradaValor;
    const totalObra = duranteObraTotal;
    const totalReforcos = reforcosTotal;
    const totalPosChaves =
      data.chavesForma === "posConstrutora" ? chavesTotal : 0;
    const totalFinanciado = chavesFinanciado ? chavesTotal : 0;
    const totalFluxoSemFin =
      totalEntrada + totalObra + totalReforcos + totalPosChaves;
    const totalAteChaves =
      totalEntrada +
      totalObra +
      totalReforcos +
      (data.chavesForma === "avista" ? chavesTotal : 0);

    return {
      total,
      entradaValor,
      entradaParcelas,
      entradaParcela,
      duranteObraParcela,
      duranteObraTotal,
      chavesTotal,
      chavesFinanciado,
      reforcosTotal,
      valorInvestidoReal,
      recursosCliente,
      saldoACompor,
      precoM2,
      schedule,
      totalEntrada,
      totalObra,
      totalReforcos,
      totalPosChaves,
      totalFinanciado,
      totalFluxoSemFin,
      totalAteChaves,
    };
  }, [data]);

  // Cenários
  const cenario1 = useMemo(() => {
    const anos = Number(data.prazoObraAnos || 0);
    const apr = Number(data.apreciacao || 0) / 100;
    const valorFinal = valores.total * Math.pow(1 + apr, anos);
    const lucro = valorFinal - valores.total;
    const roi = valores.total > 0 ? (lucro / valores.total) * 100 : 0;
    const roas =
      valores.valorInvestidoReal > 0
        ? (lucro / valores.valorInvestidoReal) * 100
        : 0;
    const fluxos = [-valores.valorInvestidoReal, valorFinal];
    const tir = calcularTIR(fluxos);
    return { valorFinal, lucro, roi, roas, tir };
  }, [data, valores]);

  const cenario2 = useMemo(() => {
    const adrDiaria = Number(data.adrDiaria || 0);
    const ocupacao = Number(data.ocupacao || 0) / 100;
    const diasMes = ocupacao * 30;
    const receitaMensalBruta = adrDiaria * diasMes;
    const custos = Number(data.custosOperacionais || 0) / 100;
    const aluguelLiquido = receitaMensalBruta * (1 - custos);
    const meses5anos = 60;
    const rendaAcumulada = aluguelLiquido * meses5anos;
    const anosObra = Number(data.prazoObraAnos || 0);
    const apr = Number(data.apreciacao || 0) / 100;
    const patrimonioAcrescido = valores.total * (Math.pow(1 + apr, anosObra) - 1);
    const valorFinal =
      valores.total * Math.pow(1 + apr, anosObra) + rendaAcumulada;
    const retornoTotal = patrimonioAcrescido + rendaAcumulada;
    const roi = valores.total > 0 ? (retornoTotal / valores.total) * 100 : 0;
    const roas =
      valores.valorInvestidoReal > 0
        ? (retornoTotal / valores.valorInvestidoReal) * 100
        : 0;
    const anosTotal = anosObra + 5;
    const fluxosC2 = [-valores.valorInvestidoReal];
    for (let m = 1; m <= anosTotal * 12; m++) fluxosC2.push(aluguelLiquido);
    fluxosC2[fluxosC2.length - 1] += valores.total * Math.pow(1 + apr, anosObra);
    const tir = calcularTIR(fluxosC2);
    return {
      adrDiaria,
      receitaMensalBruta,
      aluguelLiquido,
      rendaAcumulada,
      patrimonioAcrescido,
      valorFinal,
      retornoTotal,
      roi,
      roas,
      tir,
    };
  }, [data, valores]);

  // PDF
  const handleDownloadPDF = async () => {
    if (!resultRef.current) return;
    try {
      await ensurePdfLibs();
      const canvas = await window.html2canvas(resultRef.current, { scale: 2 });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      const imgW = w;
      const imgH = (canvas.height * imgW) / canvas.width;
      let y = 0;
      while (y < imgH) {
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        const slice = Math.min(canvas.height - (y * canvas.width) / imgW, (h * canvas.width) / imgW);
        pageCanvas.height = slice;
        const ctx = pageCanvas.getContext("2d");
        ctx.drawImage(
          canvas,
          0,
          (y * canvas.width) / imgW,
          canvas.width,
          slice,
          0,
          0,
          canvas.width,
          slice
        );
        const pageData = pageCanvas.toDataURL("image/png");
        if (y > 0) pdf.addPage();
        pdf.addImage(pageData, "PNG", 0, 0, imgW, (slice * imgW) / canvas.width);
        y += h;
      }
      pdf.save(`Analise_${data.cliente || "Cliente"}_${data.empreendimento || "Empreendimento"}.pdf`);
    } catch (err) {
      alert("Erro ao gerar PDF: " + err.message);
    }
  };

  const u = (k, v) => setData((d) => ({ ...d, [k]: v }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {step === "setup" && (
        <div className="max-w-5xl mx-auto p-6">
          <div className="text-center mb-8 pt-6">
            <AlvoLogo size={64} />
            <h1 className="text-3xl font-bold mt-4 text-slate-800">
              Análise de Investimento Imobiliário
            </h1>
            <p className="text-slate-600 mt-2">Preencha as informações abaixo</p>
          </div>

          <div className="space-y-4">
            <Card title="Dados da Empresa">
              <Input label="Empresa" value={data.company} onChange={(e) => u("company", e.target.value)} />
              <Input label="Consultor" value={data.consultor} onChange={(e) => u("consultor", e.target.value)} />
              <Input label="Telefone" value={data.phone} onChange={(e) => u("phone", e.target.value)} />
              <Input label="E-mail" value={data.email} onChange={(e) => u("email", e.target.value)} />
              <Input label="Site" value={data.siteUrl} onChange={(e) => u("siteUrl", e.target.value)} />
            </Card>

            <Card title="Dados do Cliente">
              <Input label="Nome do Cliente" value={data.cliente} onChange={(e) => u("cliente", e.target.value)} />
              <Input label="Telefone" value={data.clientePhone} onChange={(e) => u("clientePhone", e.target.value)} />
              <Input label="E-mail" value={data.clienteEmail} onChange={(e) => u("clienteEmail", e.target.value)} />
            </Card>

            <Card title="Dados do Empreendimento">
              <Input label="Nome do Empreendimento" value={data.empreendimento} onChange={(e) => u("empreendimento", e.target.value)} />
              <Input label="Endereço" value={data.endereco} onChange={(e) => u("endereco", e.target.value)} />
              <Input label="Construtora" value={data.construtora} onChange={(e) => u("construtora", e.target.value)} />
              <Input label="Tipo de Unidade" value={data.tipo} onChange={(e) => u("tipo", e.target.value)} />
              <Input label="Área (m²)" value={data.area} onChange={(e) => u("area", e.target.value)} />
              <Input label="Vagas" value={data.vagas} onChange={(e) => u("vagas", e.target.value)} />
              <Input label="Previsão de Entrega" value={data.entrega} onChange={(e) => u("entrega", e.target.value)} />
            </Card>

            <Card title="Valor e Forma de Pagamento">
              <Input label="Valor Total (R$)" value={data.valorTotal} onChange={(e) => u("valorTotal", e.target.value)} />
              <Input label="Entrada (R$)" value={data.entradaValor} onChange={(e) => u("entradaValor", e.target.value)} />
              <Input label="Nº de Parcelas da Entrada" value={data.entradaParcelas} onChange={(e) => u("entradaParcelas", e.target.value)} />
              <Input label="Valor da Parcela na Obra (R$)" value={data.obraParcelaValor} onChange={(e) => u("obraParcelaValor", e.target.value)} />
              <Input label="Prazo de Obra (anos)" value={data.prazoObraAnos} onChange={(e) => u("prazoObraAnos", e.target.value)} />
              <Input label="Nº de Parcelas Durante a Obra" value={data.duranteObraParcelas} onChange={(e) => u("duranteObraParcelas", e.target.value)} />

              <label className="block">
                <div className="text-xs text-gray-600 mb-1">Forma de Pagamento das Chaves</div>
                <select
                  className="w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  value={data.chavesForma}
                  onChange={(e) => u("chavesForma", e.target.value)}
                >
                  <option value="financiamento">Financiamento Bancário</option>
                  <option value="avista">À Vista</option>
                  <option value="posConstrutora">Parcelado (Pós-Construtora)</option>
                </select>
              </label>

              <Input label="Chaves (% do valor total)" value={data.chavesPercent} onChange={(e) => u("chavesPercent", e.target.value)} />

              {data.chavesForma === "posConstrutora" && (
                <Input label="Nº de Parcelas Pós-Chaves" value={data.chavesPosParcelas} onChange={(e) => u("chavesPosParcelas", e.target.value)} />
              )}
            </Card>

            <Card title="Reforços (Pagamentos Extras)">
              <Input label="Valor de cada Reforço (R$)" value={data.balaoValor} onChange={(e) => u("balaoValor", e.target.value)} />
              <Input label="Quantidade de Reforços" value={data.balaoQuantidade} onChange={(e) => u("balaoQuantidade", e.target.value)} />
              <Input label="Frequência (a cada X meses)" value={data.balaoFrequenciaMeses} onChange={(e) => u("balaoFrequenciaMeses", e.target.value)} />
            </Card>

            <Card title="Projeções de Mercado">
              <Input label="Valorização anual (%)" value={data.apreciacao} onChange={(e) => u("apreciacao", e.target.value)} />
              <Input label="ADR (diária) - Short Stay (R$)" value={data.adrDiaria} onChange={(e) => u("adrDiaria", e.target.value)} />
              <Input label="Ocupação (%)" value={data.ocupacao} onChange={(e) => u("ocupacao", e.target.value)} />
              <Input label="Custos Operacionais (%)" value={data.custosOperacionais} onChange={(e) => u("custosOperacionais", e.target.value)} />
            </Card>

            <Card title="Validade">
              <Input label="Validade da Proposta" value={data.validade} onChange={(e) => u("validade", e.target.value)} />
            </Card>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => setStep("resultado")}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg transition"
            >
              Gerar Análise
            </button>
          </div>
        </div>
      )}

      {step === "resultado" && (
        <div className="relative">
          <div className="sticky top-0 z-50 bg-white border-b shadow-sm px-6 py-3 flex justify-between items-center">
            <button
              onClick={() => setStep("setup")}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-medium transition"
            >
              ← Voltar
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition"
            >
              Baixar PDF
            </button>
          </div>

          <div ref={resultRef} className="paper mx-auto bg-white my-8 shadow-2xl">
            {/* Capa */}
            <section className="p-12 page page-break flex flex-col justify-between min-h-[1050px]">
              <div>
                <AlvoLogo size={80} />
                <h1 className="text-4xl font-bold mt-8 text-slate-800 leading-tight">
                  Análise de Investimento
                </h1>
                <h2 className="text-2xl font-semibold mt-3 text-emerald-700">
                  {data.empreendimento}
                </h2>
                <div className="mt-8 space-y-2 text-[14px]">
                  <p>
                    <strong>Cliente:</strong> {data.cliente}
                  </p>
                  <p>
                    <strong>Consultor:</strong> {data.consultor}
                  </p>
                  <p>
                    <strong>Data:</strong> {new Date(data.date).toLocaleDateString("pt-BR")}
                  </p>
                  <p>
                    <strong>Validade:</strong> {new Date(data.validade).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="text-[11px] text-gray-500 space-y-1">
                <p>{data.company}</p>
                <p>{data.phone} · {data.email}</p>
                <p>{data.siteUrl}</p>
              </div>
            </section>

            {/* 1. Empreendimento */}
            <section className="p-12 page page-break">
              <h3 className="font-semibold text-lg mb-3">1. Dados do Empreendimento</h3>
              <div className="space-y-3 text-[13px]">
                <DataRow k="Nome" v={data.empreendimento} />
                <DataRow k="Endereço" v={data.endereco} />
                <DataRow k="Construtora" v={data.construtora} />
                <DataRow k="Tipo" v={data.tipo} />
                <DataRow k="Área privativa" v={`${data.area} m²`} />
                <DataRow k="Vagas de garagem" v={data.vagas} />
                <DataRow k="Previsão de entrega" v={data.entrega} />
                <DataRow k="Valor total" v={brl(valores.total)} />
                <DataRow k="Preço por m²" v={brl(valores.precoM2)} />
              </div>
            </section>

            {/* 2. KPIs */}
            <section className="p-12 page page-break">
              <h3 className="font-semibold text-lg mb-3">2. Resumo Executivo</h3>
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <KPI title="Valor Total" value={brl(valores.total)} />
                <KPI title="Entrada" value={brl(valores.entradaValor)} />
                <KPI title="Durante a Obra" value={brl(valores.duranteObraTotal)} />
                <KPI title="Reforços" value={brl(valores.reforcosTotal)} />
                <KPI title="Chaves" value={brl(valores.chavesTotal)} />
                <KPI title="Investimento Real" value={brl(valores.valorInvestidoReal)} highlight />
                <KPI title="ROI Revenda" value={pct(cenario1.roi)} highlight />
                <KPI title="ROI Short Stay (5a)" value={pct(cenario2.roi)} highlight />
              </div>
            </section>

            {/* 3. Fluxo */}
            <section className="p-12 page page-break">
              <h3 className="font-semibold text-lg mb-3">3. Fluxo de Pagamento</h3>
              <div className="text-[13px]">
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="font-semibold mb-2">Entrada</p>
                    <DataRow k="Valor" v={brl(valores.entradaValor)} />
                    <DataRow k="Parcelas" v={`${data.entradaParcelas}x de ${brl(valores.entradaParcela)}`} />
                  </div>

                  <div>
                    <p className="font-semibold mb-2">Durante a Obra</p>
                    <DataRow k="Parcelas mensais" v={`${data.duranteObraParcelas}x de ${brl(valores.duranteObraParcela)}`} />
                    <DataRow k="Total" v={brl(valores.duranteObraTotal)} />
                  </div>

                  <div>
                    <p className="font-semibold mb-2">Reforços</p>
                    <DataRow k="Quantidade" v={data.balaoQuantidade} />
                    <DataRow k="Valor unitário" v={brl(data.balaoValor)} />
                    <DataRow k="Frequência" v={`A cada ${data.balaoFrequenciaMeses} meses`} />
                    <DataRow k="Total" v={brl(valores.reforcosTotal)} />
                  </div>

                  <div>
                    <p className="font-semibold mb-2">Chaves</p>
                    <DataRow k="Percentual" v={`${data.chavesPercent}%`} />
                    <DataRow k="Valor" v={brl(valores.chavesTotal)} />
                    <DataRow
                      k="Forma"
                      v={
                        data.chavesForma === "financiamento"
                          ? "Financiamento Bancário"
                          : data.chavesForma === "avista"
                          ? "À Vista"
                          : `${data.chavesPosParcelas}x Pós-Construtora`
                      }
                    />
                  </div>

                  <div className="mt-4">
                    <p className="font-semibold mb-2">Totais do Fluxo</p>
                    <DataRow k="Total entrada" v={brl(valores.totalEntrada)} />
                    <DataRow k="Total durante a obra" v={brl(valores.totalObra)} />
                    <DataRow k="Total reforços" v={brl(valores.totalReforcos)} />
                    {data.chavesForma === "posConstrutora" && (
                      <DataRow k="Pós-chaves (total)" v={brl(valores.totalPosChaves)} />
                    )}
                    {data.chavesForma === "financiamento" && (
                      <DataRow k="Total financiado (banco)" v={brl(valores.totalFinanciado)} />
                    )}
                    {data.chavesForma === "avista" && (
                      <DataRow k="Chaves à vista" v={brl(valores.chavesTotal)} />
                    )}
                    <DataRow k="TOTAL do fluxo (sem financiamento)" v={brl(valores.totalFluxoSemFin)} />
                    <DataRow k="Subtotal até chaves" v={brl(valores.totalAteChaves)} />
                  </div>
                </div>
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-[13px] font-medium">Ver cronograma detalhado</summary>
                <div className="mt-2 max-h-72 overflow-auto text-[12px]">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="py-2">Parcela</th>
                        <th>Data</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {valores.schedule
                        .sort((a, b) => a.data - b.data)
                        .map((p, i) => (
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

            {/* 4. Cenários */}
            <section className="p-12 page page-break">
              <h3 className="font-semibold text-lg mb-2">4. Cenário 1 — Revenda</h3>
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

            <section className="p-12 page page-break">
              <h3 className="font-semibold text-lg mb-2">5. Cenário 2 — Short Stay (5 anos após entrega)</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-[13px]">
                <div className="mb-3 p-3 bg-white rounded border text-[12px] leading-6">
                  <p className="font-semibold mb-1">Parâmetros</p>
                  <ul className="space-y-1">
                    <li>• ADR: {brl(cenario2.adrDiaria)}</li>
                    <li>• Ocupação: {data.ocupacao}% ≈ {Math.round(((data.ocupacao || 0) * 30) / 100)} diárias/mês</li>
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
                    <tr className="border-t-2 bg-emerald-50">
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

            {/* rodapé */}
            <section className="p-12 page page-break">
              <p className="text-[11px] text-gray-500 italic leading-5">
                * Estimativas baseadas em projeções de mercado. ROI = retorno sobre o valor total; ROAS = retorno sobre o investimento real.
              </p>
              <p className="text-[11px] text-gray-500 mt-3 leading-5">
                * Formas de pagamento sujeitas a atualização por <strong>CUB (período de obras)</strong> e <strong>IGP-M + 1%</strong> após a entrega das chaves.
              </p>
              <p className="text-[11px] text-gray-500 mt-3 leading-5">
                © {new Date().getFullYear()} Alvo BR — {data.company} · {data.phone} · {data.email}
              </p>
            </section>
          </div>
        </div>
      )}

      {/* CSS */}
      <style>{`
        .paper { width: 794px; }
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
    <div className={"rounded-xl border p-3 " + (highlight ? "bg-emerald-50 border-emerald-200" : "bg-white")}>
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
    </tr>
  );
}
