import React, { useEffect, useMemo, useRef, useState } from "react";
import alvoLogo from "./assets/alvo-logo.png";

// Adicione isto no seu public/index.html na tag <head>:
// <link rel="icon" href="%PUBLIC_URL%/favicon.png" />

const palette = {
  petrolBlue: "#003B46",
  petrolBlueDark: "#021F26",
  petrolGreen: "#0E7C7B",
  petrolGreenLight: "#139C95",
  black: "#0B0D0E",
  white: "#FFFFFF",
};

/********************
 * Utils
 ********************/
const brl = (n) => Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("pt-BR") : "—";
};

/********************
 * Logo Real da Alvo BR
 ********************/
const AlvoLogo = ({ size = 100, className = "" }) => {
  const classes = ["alvo-logo", className].filter(Boolean).join(" ");
  return (
    <img
      src={alvoLogo}
      className={classes}
      style={{ height: size, width: "auto", maxWidth: "100%", objectFit: "contain", display: "inline-block" }}
      alt="Alvo BR"
      loading="eager"
    />
  );
};

const PageHeader = ({ data, title = "Proposta de Investimento Imobiliário", subtitle }) => {
  const company = data.company || "—";
  const consultor = data.consultor || "Consultor";
  const headerSubtitle = subtitle || `Elaborada por ${company} · ${consultor}`;

  return (
    <header className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b border-slate-200">
      <div className="flex items-start gap-4 flex-1 min-w-[220px]">
        <AlvoLogo size={80} />
        <div>
          <h2 className="text-xl font-semibold text-slate-800 leading-tight">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{headerSubtitle}</p>
        </div>
      </div>
      <div className="text-sm text-right text-gray-500 space-y-1 min-w-[180px]">
        <p>Data: {formatDate(data.date)}</p>
        <p>Validade: {formatDate(data.validade)}</p>
        <p>Telefone: {data.phone || "—"}</p>
        <p>E-mail: {data.email || "—"}</p>
      </div>
    </header>
  );
};

const PageFooter = ({ data, children }) => {
  const company = data.company || "Alvo BR";
  const phone = data.phone ? ` · ${data.phone}` : "";
  const email = data.email ? ` · ${data.email}` : "";  // 


  return (
    <footer className="pt-6 mt-6 border-t border-dashed border-slate-200 space-y-2 text-[11px] text-gray-500 leading-5">
      {children}
      <p>
        * Formas de pagamento sujeitas a atualização por <strong>CUB (período de obras)</strong> e <strong>IGP-M + 1%</strong>
        após a entrega das chaves.
      </p>
      <p>© {new Date().getFullYear()} Alvo BR — {company}{phone}{email}</p>
    </footer>
  );
};

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
const generateComparativoId = () => `cmp-${Math.random().toString(36).slice(2, 10)}`;

const createComparativo = (overrides = {}) => ({
  id: generateComparativoId(),
  nome: "",
  taxaAnual: 12,
  descricao: "",
  highlight: false,
  ...overrides,
});

const withComparativoIds = (lista = []) => lista.map((item) => createComparativo(item));

const sample = {
  company: "Alvo BR Imobiliária",
  date: new Date().toISOString().slice(0, 10),
  consultor: "Nome do Consultor",
  phone: "(47) 9 9999-9999",
  email: "contato@alvobr.com.br",
  cliente: "Nome do Cliente",
  clientePhone: "(47) 9 8888-8888",
  clienteEmail: "cliente@email.com",
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
  chavesValor: 441000,
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
  chavesExtraValor: 0,
  chavesExtraQuando: "na_entrega",
  posBalaoValor: 0,
  posBalaoQuantidade: 0,
  posBalaoFrequenciaMeses: 6,
  comparativos: [],
};

/********************
 * App
 ********************/
export default function App() {
  const [step, setStep] = useState("setup");
  const [data, setData] = useState(() => ({
    ...sample,
    comparativos: withComparativoIds(sample.comparativos),
  }));
  const [showFluxoDetalhado, setShowFluxoDetalhado] = useState(false);
  const [showAnaliseAnual, setShowAnaliseAnual] = useState(true);
  const [pdfOrientation, setPdfOrientation] = useState("landscape");
  const resultRef = useRef(null);

  useEffect(() => {
    setData((d) => {
      const anos = Number(d.prazoObraAnos || 0);
      if (!anos) return d;
      const parcelasEsperadas = anos * 12;
      const aindaPadrao =
        !d.duranteObraParcelas ||
        d.duranteObraParcelas === Math.max(1, Math.floor(Number(d.__ultimaSugestaoParcelas || sample.prazoObraAnos * 12)));
      if (!aindaPadrao) return d;
      return {
        ...d,
        duranteObraParcelas: parcelasEsperadas,
        __ultimaSugestaoParcelas: parcelasEsperadas,
      };
    });
  }, [data.prazoObraAnos]);

  useEffect(() => {
    setData((current) => {
      let next = current;
      if (current.chavesForma === "financiamento") {
        if ((current.chavesExtraValor || 0) !== 0 || current.chavesExtraQuando !== "na_entrega") {
          next = { ...next, chavesExtraValor: 0, chavesExtraQuando: "na_entrega" };
        }
        if (current.posBalaoValor || current.posBalaoQuantidade) {
          if (next === current) next = { ...current };
          next.posBalaoValor = 0;
          next.posBalaoQuantidade = 0;
          next.posBalaoFrequenciaMeses = current.posBalaoFrequenciaMeses || sample.posBalaoFrequenciaMeses;
        }
        return next;
      }
      if (current.chavesForma === "posConstrutora") {
        if (current.chavesExtraQuando !== "pos_chaves") {
          next = { ...next, chavesExtraQuando: "pos_chaves" };
        }
      }
      return next;
    });
  }, [data.chavesForma]);

  const calc = useMemo(() => {
    const total = Number(data.valorTotal) || 0;
    const entradaValor = Number(data.entradaValor) || 0;
    const entradaParcelas = Number(data.entradaParcelas) || 1;
    const duranteObraValor = Number(data.obraParcelaValor) || 0;
    const duranteObraParcelas = Number(data.duranteObraParcelas) || 0;
    const duranteObraTotal = duranteObraValor * duranteObraParcelas;
    const balaoValor = Number(data.balaoValor) || 0;
    const balaoQuantidade = Number(data.balaoQuantidade) || 0;
    const reforcosTotal = balaoValor * balaoQuantidade;

    const posBalaoValor = Number(data.posBalaoValor) || 0;
    const posBalaoQuantidade = Number(data.posBalaoQuantidade) || 0;
    const posBalaoTotal = posBalaoValor * posBalaoQuantidade;

    const chavesValor = Number(data.chavesValor) || 0;
    const chavesPercent = total > 0 ? (chavesValor / total) * 100 : 0;

    const totalChavesEntrega =
      data.chavesExtraQuando === "na_entrega" ? Number(data.chavesExtraValor) || 0 : 0;
    
    const totalShortStay =
      data.chavesExtraQuando === "pos_chaves" ? Number(data.chavesExtraValor) || 0 : 0;

    const totalCliente = entradaValor + duranteObraTotal + reforcosTotal + totalChavesEntrega;

    const totalFinanciado = data.chavesForma === "financiamento" ? chavesValor : 0;
    const totalPosConstrutora = data.chavesForma === "posConstrutora" ? chavesValor : 0;

    const totalAteChaves = entradaValor + duranteObraTotal + reforcosTotal + totalChavesEntrega;

    const valorInvestidoReal = totalCliente;
    const totalCoberto = totalCliente + totalShortStay + chavesValor;
    const saldoACompor = total - totalCoberto;

    const precoM2 = Number(data.area) > 0 ? total / Number(data.area) : 0;

    const baseDateRaw = data.date ? new Date(data.date) : new Date();
    const baseDate = Number.isFinite(baseDateRaw.getTime()) ? baseDateRaw : new Date();
    const addMonths = (date, months) => {
      const d = new Date(date.getTime());
      d.setMonth(d.getMonth() + months);
      return d;
    };

    const entregaDate = addMonths(baseDate, (Number(data.prazoObraAnos) || 0) * 12);

    const posChavesParcelas = Number(data.chavesPosParcelas) || 0;
    const posChavesValor = posChavesParcelas > 0 ? (totalPosConstrutora - posBalaoTotal) / posChavesParcelas : 0;

    const prazoObra = Number(data.prazoObraAnos) || 0;
    const apreciacao = Number(data.apreciacao) || 0;
    const valorEntrega = total * (1 + apreciacao / 100);
    const investimento = totalAteChaves;
    const entregaLiq = valorEntrega - totalFinanciado - totalShortStay - posBalaoTotal - totalPosConstrutora;
    const lucro = entregaLiq - investimento;
    const roi = investimento > 0 ? (lucro / investimento) * 100 : 0;
    const adrDia = Number(data.adrDiaria) || 0;
    const ocupacao = Number(data.ocupacao) || 0;
    const custosOp = Number(data.custosOperacionais) || 0;
    const receitaMes = adrDia * 30 * (ocupacao / 100);
    const receitaMensalLiq = receitaMes * (1 - custosOp / 100);
    const yieldy = valorEntrega > 0 ? ((receitaMensalLiq * 12) / valorEntrega) * 100 : 0;

    // Análise Ano a Ano
    const analiseAnual = [];
    const prazoObraAnos = Number(data.prazoObraAnos) || 0;
    
    for (let ano = 1; ano <= prazoObraAnos; ano++) {
      const mesesNoAno = 12;
      const parcelasEntradaAno = Math.min(entradaParcelas, Math.max(0, entradaParcelas - (ano - 1) * 12));
      const parcelasObraAno = Math.min(mesesNoAno, Math.max(0, duranteObraParcelas - (ano - 1) * 12));
      
      const valorEntrada = ano === 1 ? entradaValor : 0;
      const valorObra = parcelasObraAno * duranteObraValor;
      const valorBalao = ano === prazoObraAnos ? reforcosTotal : 0;
      
      const totalAno = valorEntrada + valorObra + valorBalao;
      const percentualDoTotal = total > 0 ? (totalAno / total) * 100 : 0;
      const acumulado = analiseAnual.reduce((acc, item) => acc + item.totalAno, 0) + totalAno;
      const percentualAcumulado = total > 0 ? (acumulado / total) * 100 : 0;
      
      analiseAnual.push({
        ano,
        valorEntrada,
        valorObra,
        valorBalao,
        totalAno,
        percentualDoTotal,
        acumulado,
        percentualAcumulado,
      });
    }

    return {
      total,
      entradaValor,
      entradaParcelas,
      duranteObraTotal,
      reforcosTotal,
      totalChavesEntrega,
      totalCliente,
      totalFinanciado,
      totalPosConstrutora,
      totalShortStay,
      totalAteChaves,
      valorInvestidoReal,
      saldoACompor,
      totalCoberto,
      precoM2,
      entregaDate,
      posChavesParcelas,
      posChavesValor,
      posBalaoTotal,
      valorEntrega,
      investimento,
      lucro,
      roi,
      yieldy,
      receitaMensalLiq,
      chavesValor,
      chavesPercent,
      analiseAnual,
    };
  }, [data]);

  const handleDownloadPDF = async () => {
    await ensurePdfLibs();
    const { jsPDF } = window.jspdf;
    const html2canvas = window.html2canvas;
    if (!html2canvas || !jsPDF) {
      alert("Erro ao carregar bibliotecas de PDF");
      return;
    }
    const el = resultRef.current;
    if (!el) return;
    const sections = el.querySelectorAll(".paper");
    const isLandscape = pdfOrientation === "landscape";
    const pdfWidth = isLandscape ? 297 : 210;
    const pdfHeight = isLandscape ? 210 : 297;
    const pdf = new jsPDF({ orientation: isLandscape ? "l" : "p", unit: "mm", format: "a4" });
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const canvas = await html2canvas(section, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const imgW = pdfWidth - 20;
      const imgH = (canvas.height * imgW) / canvas.width;
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 10, 10, imgW, imgH);
    }
    pdf.save(`proposta-${data.empreendimento || "imovel"}.pdf`);
  };

  if (step === "setup") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center space-y-3 py-6">
            <AlvoLogo size={120} />
            <h1 className="text-4xl font-bold text-[#003B46]">Simulador de Proposta Imobiliária</h1>
            <p className="text-lg text-[#0E7C7B]">Preencha os dados abaixo e gere a proposta completa em PDF</p>
          </div>

          <Card title="Dados da Empresa" icon="📋">
            <Input
              label="Nome da Empresa"
              value={data.company}
              onChange={(e) => setData({ ...data, company: e.target.value })}
            />
            <Input
              label="Nome do Consultor"
              value={data.consultor}
              onChange={(e) => setData({ ...data, consultor: e.target.value })}
            />
            <Input label="Telefone" value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} />
            <Input label="E-mail" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
          </Card>

          <Card title="Dados do Cliente" icon="👤">
            <Input
              label="Nome do Cliente"
              value={data.cliente}
              onChange={(e) => setData({ ...data, cliente: e.target.value })}
            />
            <Input
              label="Telefone do Cliente"
              value={data.clientePhone}
              onChange={(e) => setData({ ...data, clientePhone: e.target.value })}
            />
            <Input
              label="E-mail do Cliente"
              value={data.clienteEmail}
              onChange={(e) => setData({ ...data, clienteEmail: e.target.value })}
            />
          </Card>

          <Card title="Dados do Empreendimento" icon="🏢">
            <Input
              label="Nome do Empreendimento"
              value={data.empreendimento}
              onChange={(e) => setData({ ...data, empreendimento: e.target.value })}
            />
            <Input
              label="Endereço"
              value={data.endereco}
              onChange={(e) => setData({ ...data, endereco: e.target.value })}
            />
            <Input
              label="Construtora"
              value={data.construtora}
              onChange={(e) => setData({ ...data, construtora: e.target.value })}
            />
            <Input label="Tipo" value={data.tipo} onChange={(e) => setData({ ...data, tipo: e.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Área (m²)"
                value={data.area}
                onChange={(e) => setData({ ...data, area: e.target.value })}
              />
              <Input
                label="Vagas"
                value={data.vagas}
                onChange={(e) => setData({ ...data, vagas: e.target.value })}
              />
              <Input
                label="Entrega"
                value={data.entrega}
                onChange={(e) => setData({ ...data, entrega: e.target.value })}
              />
            </div>
          </Card>

{/* ===================== */}
{/* 💰 FLUXO DE PAGAMENTO INTELIGENTE */}
{/* ===================== */}
<Card title="Pagamento Durante a Obra" icon="💰">
  <Input
    label="Valor Total do Imóvel (R$)"
    value={data.valorTotal}
    onChange={(e) =>
      setData({ ...data, valorTotal: currencyToNumber(e.target.value) })
    }
    currency
  />

  <div className="grid grid-cols-2 gap-3 mt-3">
    <Input
      label="Ato / Entrada (R$)"
      value={data.entradaValor}
      onChange={(e) =>
        setData({ ...data, entradaValor: currencyToNumber(e.target.value) })
      }
      currency
    />
    <Input
      label="Parcelas da Entrada"
      value={data.entradaParcelas}
      onChange={(e) => setData({ ...data, entradaParcelas: e.target.value })}
    />
  </div>

  <div className="grid grid-cols-2 gap-3 mt-4">
    <Input
      label="Parcela Durante Obra (R$)"
      value={data.obraParcelaValor}
      onChange={(e) =>
        setData({ ...data, obraParcelaValor: currencyToNumber(e.target.value) })
      }
      currency
    />
    <Input
      label="Nº de Parcelas Durante Obra"
      value={data.duranteObraParcelas}
      onChange={(e) =>
        setData({ ...data, duranteObraParcelas: e.target.value })
      }
    />
  </div>

  <div className="grid grid-cols-3 gap-3 mt-4">
    <Input
      label="Balão Durante Obra (R$)"
      value={data.balaoValor}
      onChange={(e) =>
        setData({ ...data, balaoValor: currencyToNumber(e.target.value) })
      }
      currency
    />
    <Input
      label="Quantidade de Balões"
      value={data.balaoQuantidade}
      onChange={(e) =>
        setData({ ...data, balaoQuantidade: e.target.value })
      }
    />
    <Input
      label="Frequência (meses)"
      value={data.balaoFrequenciaMeses}
      onChange={(e) =>
        setData({ ...data, balaoFrequenciaMeses: e.target.value })
      }
    />
  </div>
</Card>

{/* ===================== */}
{/* 🔑 FINANCIAMENTO OU DIRETO COM CONSTRUTORA */}
{/* ===================== */}
<Card title="🔑 Financiamento ou Direto com Construtora" icon="🔑">
  <label className="block">
    <div className="text-sm font-medium text-[#003B46] mb-2">
      Forma de Pagamento
    </div>
    <select
      className="w-full px-4 py-3 rounded-lg border-2 border-[#0E7C7B]/30 bg-white text-[#003B46] focus:outline-none focus:ring-2 focus:ring-[#0E7C7B] transition-all"
      value={data.chavesForma}
      onChange={(e) => setData({ ...data, chavesForma: e.target.value })}
    >
      <option value="financiamento">Financiamento Bancário</option>
      <option value="diretoConstrutora">Direto com Construtora</option>
    </select>
  </label>

  {data.chavesForma === "financiamento" && (
    <div className="grid grid-cols-1 gap-3 mt-4">
      <Input
        label="Valor Financiado Total (R$)"
        value={data.valorFinanciado}
        onChange={(e) =>
          setData({
            ...data,
            valorFinanciado: currencyToNumber(e.target.value),
          })
        }
        currency
      />
    </div>
  )}

  {data.chavesForma === "diretoConstrutora" && (
    <div className="mt-4 p-4 border-2 border-[#0E7C7B]/20 bg-[#0E7C7B]/5 rounded-lg">
      <p className="text-sm text-[#003B46]">
        💡 O saldo restante será automaticamente calculado e mostrado no
        card "Pagamento Pós-Obra".
      </p>
    </div>
  )}
</Card>

{/* ===================== */}
{/* 🧾 PAGAMENTO PÓS-OBRA (DINÂMICO) */}
{/* ===================== */}
{data.chavesForma === "diretoConstrutora" && (
  <Card title="📆 Pagamento Pós-Obra (Direto com Construtora)" icon="📆">
    {(() => {
      const total = Number(data.valorTotal) || 0;
      const ato = Number(data.entradaValor) || 0;
      const parcelas =
        (Number(data.obraParcelaValor) || 0) *
        (Number(data.duranteObraParcelas) || 0);
      const baloes =
        (Number(data.balaoValor) || 0) * (Number(data.balaoQuantidade) || 0);
      const totalPago = ato + parcelas + baloes;

      const saldoRestante = Math.max(0, total - totalPago);

      return (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Saldo Restante (calculado)"
              value={brl(saldoRestante)}
              readOnly
            />
            <Input
              label="Parcelas Pós-Obra"
              value={data.chavesPosParcelas}
              onChange={(e) =>
                setData({ ...data, chavesPosParcelas: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <Input
              label="Balão Pós-Obra (R$)"
              value={data.posBalaoValor}
              onChange={(e) =>
                setData({
                  ...data,
                  posBalaoValor: currencyToNumber(e.target.value),
                })
              }
              currency
            />
            <Input
              label="Qtd. de Balões"
              value={data.posBalaoQuantidade}
              onChange={(e) =>
                setData({
                  ...data,
                  posBalaoQuantidade: e.target.value,
                })
              }
            />
            <Input
              label="Frequência (meses)"
              value={data.posBalaoFrequenciaMeses}
              onChange={(e) =>
                setData({
                  ...data,
                  posBalaoFrequenciaMeses: e.target.value,
                })
              }
            />
          </div>

          <div className="mt-6 p-4 bg-slate-50 border rounded-xl">
            <p className="text-sm text-gray-600">
              💬 Valor restante calculado automaticamente com base no total do
              imóvel e nos pagamentos feitos durante a obra.
            </p>
          </div>
        </>
      );
    })()}
  </Card>
)}

          <Card title="Análise de Investimento" icon="📊">
            <Input
              label="Apreciação Esperada (%)"
              value={data.apreciacao}
              onChange={(e) => setData({ ...data, apreciacao: e.target.value })}
            />
            <Input
              label="ADR Diária (R$)"
              value={data.adrDiaria}
              onChange={(e) => setData({ ...data, adrDiaria: e.target.value })}
            />
            <Input
              label="Taxa de Ocupação (%)"
              value={data.ocupacao}
              onChange={(e) => setData({ ...data, ocupacao: e.target.value })}
            />
            <Input
              label="Custos Operacionais (%)"
              value={data.custosOperacionais}
              onChange={(e) => setData({ ...data, custosOperacionais: e.target.value })}
            />
          </Card>

          <Card title="Validade e Data" icon="📆">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Data da Proposta"
                value={data.date}
                onChange={(e) => setData({ ...data, date: e.target.value })}
              />
              <Input
                label="Validade"
                value={data.validade}
                onChange={(e) => setData({ ...data, validade: e.target.value })}
              />
            </div>
          </Card>

          <Card title="Comparativos de Investimento" icon="📈">
            <div className="space-y-4">
              {data.comparativos?.map((cmp, idx) => (
                <div key={cmp.id} className="p-4 border-2 border-[#0E7C7B]/20 rounded-lg bg-white/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-semibold text-[#003B46]">Comparativo {idx + 1}</h5>
                    <button
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      onClick={() => {
                        const updated = data.comparativos.filter((c) => c.id !== cmp.id);
                        setData({ ...data, comparativos: updated });
                      }}
                    >
                      Remover
                    </button>
                  </div>
                  <Input
                    label="Nome do Investimento"
                    value={cmp.nome}
                    onChange={(e) => {
                      const updated = data.comparativos.map((c) =>
                        c.id === cmp.id ? { ...c, nome: e.target.value } : c
                      );
                      setData({ ...data, comparativos: updated });
                    }}
                  />
                  <Input
                    label="Taxa de Retorno Anual (%)"
                    value={cmp.taxaAnual}
                    onChange={(e) => {
                      const updated = data.comparativos.map((c) =>
                        c.id === cmp.id ? { ...c, taxaAnual: e.target.value } : c
                      );
                      setData({ ...data, comparativos: updated });
                    }}
                  />
                  <Input
                    label="Descrição"
                    value={cmp.descricao}
                    onChange={(e) => {
                      const updated = data.comparativos.map((c) =>
                        c.id === cmp.id ? { ...c, descricao: e.target.value } : c
                      );
                      setData({ ...data, comparativos: updated });
                    }}
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={cmp.highlight || false}
                      onChange={(e) => {
                        const updated = data.comparativos.map((c) =>
                          c.id === cmp.id ? { ...c, highlight: e.target.checked } : c
                        );
                        setData({ ...data, comparativos: updated });
                      }}
                      className="w-4 h-4 accent-[#0E7C7B]"
                    />
                    <span className="text-sm text-[#003B46]">Destacar este investimento</span>
                  </label>
                </div>
              ))}
              <button
                className="w-full px-4 py-3 bg-[#0E7C7B]/10 text-[#0E7C7B] rounded-lg hover:bg-[#0E7C7B]/20 font-semibold transition-colors border-2 border-[#0E7C7B]/30"
                onClick={() => {
                  setData({
                    ...data,
                    comparativos: [...data.comparativos, createComparativo()],
                  });
                }}
              >
                + Adicionar Comparativo
              </button>
            </div>
          </Card>

          <div className="flex gap-3">
            <button
              className="flex-1 px-8 py-4 bg-gradient-to-r from-[#0E7C7B] to-[#139C95] text-white rounded-xl font-bold text-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              onClick={() => setStep("result")}
            >
              ✨ Gerar Proposta
            </button>
          </div>
        </div>
        <style>{`
          :root {
            --petrol-blue: ${palette.petrolBlue};
            --petrol-blue-dark: ${palette.petrolBlueDark};
            --petrol-green: ${palette.petrolGreen};
            --petrol-green-light: ${palette.petrolGreenLight};
            --petrol-black: ${palette.black};
            --petrol-white: ${palette.white};
          }
          body { 
            font-family: Inter, system-ui, -apple-system, sans-serif; 
            color: var(--petrol-black);
            background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 50%, #80cbc4 100%);
          }
        `}</style>
      </div>
    );
  }

  const fluxoItems = [];
  if (calc.entradaValor > 0) {
    fluxoItems.push({
      key: "entrada",
      label: "ENTRADA",
      valor: calc.entradaValor,
      percentual: (calc.entradaValor / calc.total) * 100,
      detalhe: data.entradaParcelas > 1 ? `${data.entradaParcelas}x` : "À vista",
    });
  }
  if (calc.duranteObraTotal > 0) {
    fluxoItems.push({
      key: "obra",
      label: "DURANTE A OBRA",
      valor: calc.duranteObraTotal,
      percentual: (calc.duranteObraTotal / calc.total) * 100,
      detalhe: `${data.duranteObraParcelas}x de ${brl(data.obraParcelaValor)}`,
    });
  }
  if (calc.reforcosTotal > 0) {
    fluxoItems.push({
      key: "balao",
      label: "BALÃO (OBRA)",
      valor: calc.reforcosTotal,
      percentual: (calc.reforcosTotal / calc.total) * 100,
      detalhe: `${data.balaoQuantidade}x de ${brl(data.balaoValor)}`,
    });
  }
  if (calc.totalChavesEntrega > 0) {
    fluxoItems.push({
      key: "chavesExtra",
      label: "NA ENTREGA",
      valor: calc.totalChavesEntrega,
      percentual: (calc.totalChavesEntrega / calc.total) * 100,
      detalhe: "Pagamento extra",
    });
  }
  if (calc.totalFinanciado > 0) {
    fluxoItems.push({
      key: "financiamento",
      label: "FINANCIAMENTO",
      valor: calc.totalFinanciado,
      percentual: (calc.totalFinanciado / calc.total) * 100,
      contexto: "valor total",
      detalhe: "Banco",
      destaque: true,
    });
  }
  if (calc.totalPosConstrutora > 0) {
    const parcelasPos = Number(data.chavesPosParcelas) || 0;
    const valorParcelaPos = parcelasPos > 0 ? (calc.totalPosConstrutora - calc.posBalaoTotal) / parcelasPos : 0;
    if (valorParcelaPos > 0) {
      fluxoItems.push({
        key: "posChaves",
        label: "PÓS-CHAVES (CONSTRUTORA)",
        valor: calc.totalPosConstrutora - calc.posBalaoTotal,
        percentual: ((calc.totalPosConstrutora - calc.posBalaoTotal) / calc.total) * 100,
        contexto: "valor total",
        detalhe: `${parcelasPos}x de ${brl(valorParcelaPos)}`,
        destaque: true,
      });
    }
    if (calc.posBalaoTotal > 0) {
      fluxoItems.push({
        key: "posBalao",
        label: "BALÃO PÓS-CHAVES",
        valor: calc.posBalaoTotal,
        percentual: (calc.posBalaoTotal / calc.total) * 100,
        detalhe: `${data.posBalaoQuantidade}x de ${brl(data.posBalaoValor)}`,
      });
    }
  }

  const comparativosCalc = (data.comparativos || []).map((cmp) => {
    const taxa = Number(cmp.taxaAnual) || 0;
    const prazo = Number(data.prazoObraAnos) || 0;
    const investimento = calc.investimento;
    const fv = investimento * Math.pow(1 + taxa / 100, prazo);
    const lucro = fv - investimento;
    const roi = investimento > 0 ? (lucro / investimento) * 100 : 0;
    return { ...cmp, valorFinal: fv, lucro, roi };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium"
            onClick={() => setStep("setup")}
          >
            ← Voltar
          </button>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showFluxoDetalhado}
                onChange={(e) => setShowFluxoDetalhado(e.target.checked)}
                className="w-4 h-4"
              />
              Fluxo Detalhado
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showAnaliseAnual}
                onChange={(e) => setShowAnaliseAnual(e.target.checked)}
                className="w-4 h-4"
              />
              Análise Ano a Ano
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <span>Orientação:</span>
              <select
                value={pdfOrientation}
                onChange={(e) => setPdfOrientation(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded-lg"
              >
                <option value="landscape">Paisagem</option>
                <option value="portrait">Retrato</option>
              </select>
            </label>
            <button
              className="px-6 py-2 bg-gradient-to-r from-emerald-700 to-emerald-800 text-white rounded-xl font-semibold hover:from-emerald-800 hover:to-emerald-900"
              onClick={handleDownloadPDF}
            >
              💾 Baixar PDF
            </button>
          </div>
        </div>

        <div ref={resultRef} className="space-y-8">
          <div className="paper bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <PageHeader data={data} />
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[color:var(--petrol-blue)] mb-3 pb-2 border-b-2 border-emerald-200">
                  📍 Dados do Cliente
                </h3>
                <DataRow k="Nome" v={data.cliente} />
                <DataRow k="Telefone" v={data.clientePhone} />
                <DataRow k="E-mail" v={data.clienteEmail} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[color:var(--petrol-blue)] mb-3 pb-2 border-b-2 border-emerald-200">
                  🏢 Dados do Empreendimento
                </h3>
                <DataRow k="Empreendimento" v={data.empreendimento} />
                <DataRow k="Endereço" v={data.endereco} />
                <DataRow k="Construtora" v={data.construtora} />
                <DataRow k="Tipo" v={data.tipo} />
                <DataRow k="Área Privativa" v={`${data.area} m²`} />
                <DataRow k="Vagas de Garagem" v={data.vagas} />
                <DataRow k="Previsão de Entrega" v={data.entrega} />
                <DataRow k="Preço por m²" v={brl(calc.precoM2)} />
              </div>
            </div>
            <PageFooter data={data} />
          </div>

          <div className="paper bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <h3 className="text-xl font-bold text-[color:var(--petrol-blue)] mb-4 pb-3 border-b-2 border-emerald-200">
              💰 Resumo Financeiro
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KPI title="Valor Total" value={brl(calc.total)} />
              <KPI title="Investimento Cliente" value={brl(calc.totalCliente)} highlight />
              <KPI title="Saldo nas Chaves" value={brl(calc.chavesValor)} subValue={calc.chavesPercent > 0 ? `${pct(calc.chavesPercent)} do valor total` : ""} />
              <KPI
                title="Diferença"
                value={brl(calc.saldoACompor)}
                subValue={calc.saldoACompor !== 0 ? "(Verificar valores)" : "✓ Valores conferem"}
              />
            </div>
            <div>
              <h4 className="text-base font-bold text-[color:var(--petrol-blue)] mb-3">Fluxo de Pagamento</h4>
              <FluxoResumoCards items={fluxoItems} columns="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" />
            </div>
            {showFluxoDetalhado && (
              <div>
                <h4 className="text-base font-bold text-[color:var(--petrol-blue)] mb-3">Fluxo Detalhado</h4>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="p-3 text-left font-semibold">Etapa</th>
                      <th className="p-3 text-right font-semibold">Valor</th>
                      <th className="p-3 text-right font-semibold">%</th>
                      <th className="p-3 text-left font-semibold">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fluxoItems.map((item) => (
                      <tr key={item.key} className="border-b border-slate-200">
                        <td className="p-3">{item.label}</td>
                        <td className="p-3 text-right font-medium">{brl(item.valor)}</td>
                        <td className="p-3 text-right">{pct(item.percentual)}</td>
                        <td className="p-3 text-gray-600">{item.detalhe || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {showAnaliseAnual && (
              <div>
                <h4 className="text-base font-bold text-[color:var(--petrol-blue)] mb-3">📊 Análise Ano a Ano</h4>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="p-3 text-center font-semibold">Ano</th>
                      <th className="p-3 text-right font-semibold">Entrada</th>
                      <th className="p-3 text-right font-semibold">Obra</th>
                      <th className="p-3 text-right font-semibold">Balões</th>
                      <th className="p-3 text-right font-semibold">Total Ano</th>
                      <th className="p-3 text-right font-semibold">% do Total</th>
                      <th className="p-3 text-right font-semibold">Acumulado</th>
                      <th className="p-3 text-right font-semibold">% Acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc.analiseAnual.map((item) => (
                      <tr key={item.ano} className="border-b border-slate-200">
                        <td className="p-3 text-center font-medium">Ano {item.ano}</td>
                        <td className="p-3 text-right">{item.valorEntrada > 0 ? brl(item.valorEntrada) : "—"}</td>
                        <td className="p-3 text-right">{item.valorObra > 0 ? brl(item.valorObra) : "—"}</td>
                        <td className="p-3 text-right">{item.valorBalao > 0 ? brl(item.valorBalao) : "—"}</td>
                        <td className="p-3 text-right font-semibold">{brl(item.totalAno)}</td>
                        <td className="p-3 text-right text-emerald-700">{pct(item.percentualDoTotal)}</td>
                        <td className="p-3 text-right font-medium">{brl(item.acumulado)}</td>
                        <td className="p-3 text-right text-emerald-700 font-medium">{pct(item.percentualAcumulado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <PageFooter data={data} />
          </div>

          <div className="paper bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <h3 className="text-xl font-bold text-[color:var(--petrol-blue)] mb-4 pb-3 border-b-2 border-emerald-200">
              📊 Análise de Investimento
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KPI title="Valor na Entrega" value={brl(calc.valorEntrega)} highlight />
              <KPI title="Lucro Estimado" value={brl(calc.lucro)} />
              <KPI title="ROI" value={pct(calc.roi)} />
              <KPI title="Yield Anual" value={pct(calc.yieldy)} />
            </div>
            <div>
              <h4 className="text-base font-bold text-[color:var(--petrol-blue)] mb-3">Premissas</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DataRow k="Apreciação" v={pct(data.apreciacao)} />
                <DataRow k="ADR Diária" v={brl(data.adrDiaria)} />
                <DataRow k="Ocupação" v={pct(data.ocupacao)} />
                <DataRow k="Custos Operacionais" v={pct(data.custosOperacionais)} />
              </div>
            </div>
            <div>
              <h4 className="text-base font-bold text-[color:var(--petrol-blue)] mb-3">Receita Estimada</h4>
              <KPI title="Receita Mensal Líquida" value={brl(calc.receitaMensalLiq)} highlight />
            </div>
            <PageFooter data={data} />
          </div>

          {comparativosCalc.length > 0 && (
            <div className="paper bg-white rounded-2xl shadow-xl p-8 space-y-6">
              <h3 className="text-xl font-bold text-[color:var(--petrol-blue)] mb-4 pb-3 border-b-2 border-emerald-200">
                📈 Comparativo de Investimentos
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Comparação do retorno do investimento no imóvel versus outras opções de investimento, considerando o
                mesmo capital inicial ({brl(calc.investimento)}) e prazo de {data.prazoObraAnos} anos.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="p-3 text-left font-semibold">Investimento</th>
                      <th className="p-3 text-center font-semibold">Taxa Anual</th>
                      <th className="p-3 text-right font-semibold">Valor Final</th>
                      <th className="p-3 text-right font-semibold">Lucro</th>
                      <th className="p-3 text-right font-semibold">ROI</th>
                      <th className="p-3 text-left font-semibold">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-emerald-50 font-semibold border-b-2 border-emerald-200">
                      <td className="p-3">{data.empreendimento || "Este Imóvel"}</td>
                      <td className="p-3 text-center">{pct(calc.roi / Number(data.prazoObraAnos || 1))}</td>
                      <td className="p-3 text-right">{brl(calc.valorEntrega - calc.totalFinanciado - calc.totalShortStay - calc.posBalaoTotal - calc.totalPosConstrutora)}</td>
                      <td className="p-3 text-right">{brl(calc.lucro)}</td>
                      <td className="p-3 text-right">{pct(calc.roi)}</td>
                      <td className="p-3 text-gray-600">Investimento imobiliário</td>
                    </tr>
                    {comparativosCalc.map((cmp) => (
                      <tr
                        key={cmp.id}
                        className={`border-b border-slate-200 ${cmp.highlight ? "bg-blue-50 font-medium" : ""}`}
                      >
                        <td className="p-3">{cmp.nome || "—"}</td>
                        <td className="p-3 text-center">{pct(cmp.taxaAnual)}</td>
                        <td className="p-3 text-right">{brl(cmp.valorFinal)}</td>
                        <td className="p-3 text-right">{brl(cmp.lucro)}</td>
                        <td className="p-3 text-right">{pct(cmp.roi)}</td>
                        <td className="p-3 text-gray-600">{cmp.descricao || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                * Os valores são estimativas e não constituem garantia de rentabilidade. Consulte um especialista
                financeiro para análises mais detalhadas.
              </p>
              <PageFooter data={data} />
            </div>
          )}
        </div>
      </div>
      <style>{`
        :root {
          --petrol-blue: ${palette.petrolBlue};
          --petrol-blue-dark: ${palette.petrolBlueDark};
          --petrol-green: ${palette.petrolGreen};
          --petrol-green-light: ${palette.petrolGreenLight};
          --petrol-black: ${palette.black};
          --petrol-white: ${palette.white};
        }
        body { 
          font-family: Inter, system-ui, -apple-system, sans-serif; 
          color: var(--petrol-black);
        }
        .page-break { page-break-before: always; margin-top: 8px; }
        .paper img { max-width: 100%; height: auto; }
        .paper * { line-height: 1.45; word-break: break-word; }
      `}</style>
    </div>
  );
}

// Componentes auxiliares
function Card({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-[#0E7C7B]/20 overflow-hidden">
      <div className="bg-gradient-to-r from-[#003B46] to-[#0E7C7B] px-6 py-4">
        <h4 className="font-bold text-white text-lg flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {title}
        </h4>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, currency = false }) {
  const formatCurrency = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    return brl(val);
  };
  const formatCurrencyPlain = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    const numeric = typeof val === "number" ? val : Number(val);
    if (!Number.isFinite(numeric)) return "";
    return numeric.toFixed(2).replace(".", ",");
  };

  const [isFocused, setIsFocused] = useState(false);
  const [typedValue, setTypedValue] = useState(() => (currency ? formatCurrency(value) : value ?? ""));

  useEffect(() => {
    if (!currency) {
      setTypedValue(value ?? "");
      return;
    }
    if (!isFocused) {
      setTypedValue(formatCurrency(value));
    }
  }, [value, currency, isFocused]);

  const handleFocus = (event) => {
    setIsFocused(true);
    if (currency) {
      setTypedValue(formatCurrencyPlain(value));
    }
    requestAnimationFrame(() => event.target.select());
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (currency) {
      setTypedValue(formatCurrency(value));
    }
  };

  const handleChangeInternal = (event) => {
    setTypedValue(event.target.value);
    onChange?.(event);
  };

  const displayValue = currency ? typedValue : typedValue;
  return (
    <label className="block">
      <div className="text-sm font-medium text-[#003B46] mb-2">{label}</div>
      <input
        className="w-full px-4 py-3 rounded-lg border-2 border-[#0E7C7B]/30 bg-white text-[#003B46] focus:outline-none focus:ring-2 focus:ring-[#0E7C7B] focus:border-[#0E7C7B] transition-all"
        value={displayValue}
        onChange={handleChangeInternal}
        placeholder={placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        inputMode={currency ? "decimal" : undefined}
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

function KPI({ title, value, highlight, subValue }) {
  return (
    <div className={`p-4 rounded-lg border-2 ${highlight ? 'bg-gradient-to-br from-[#0E7C7B]/10 to-[#139C95]/10 border-[#0E7C7B]' : 'bg-slate-50 border-slate-200'}`}>
      <div className="text-xs text-gray-600 mb-1 uppercase tracking-wide font-semibold">{title}</div>
      <div className="text-xl font-bold text-[#003B46]">{value}</div>
      {subValue && <div className="text-[11px] text-gray-500 mt-1">{subValue}</div>}
    </div>
  );
}

function FluxoResumoCards({ items, columns = "grid grid-cols-1 sm:grid-cols-2 gap-2" }) {
  if (!items || items.length === 0) return null;
  return (
    <div className={columns}>
      {items.map((item) => (
        <div key={item.key} className={`p-4 rounded-lg border-2 ${item.destaque ? 'bg-gradient-to-br from-[#0E7C7B]/10 to-[#139C95]/10 border-[#0E7C7B]' : 'bg-slate-50 border-slate-200'}`}>
          <div className="text-[11px] uppercase tracking-wide font-bold text-[#003B46]">{item.label}</div>
          <div className="text-lg font-bold text-[#003B46]">{brl(item.valor)}</div>
          <div className="text-xs" style={{ color: item.destaque ? "#0E7C7B" : "#6B7280" }}>
            {pct(item.percentual)} {item.contexto ? `do ${item.contexto}` : "do total"}
          </div>
          {item.detalhe ? (
            <div className="text-xs" style={{ color: item.destaque ? "#0E7C7B" : "#9CA3AF" }}>
              {item.detalhe}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
