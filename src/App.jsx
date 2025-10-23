import React, { useEffect, useMemo, useRef, useState } from "react";
import alvoLogo from "./assets/alvo-logo.svg";

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

/********************
 * Logo
 ********************/
const AlvoLogo = ({ size = 48 }) => {
  return <img src={alvoLogo} alt="Alvo BR" style={{ height: size, width: "auto" }} />;
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
const generateInvestimentoId = () => `inv-${Math.random().toString(36).slice(2, 10)}`;

const baseInvestimentos = [
  {
    nome: "CDI (12 meses)",
    taxaAnual: 13.15,
    observacoes: "Projeção considerando CDI atual e aportes mensais iguais ao fluxo.",
  },
  {
    nome: "Tesouro Selic",
    taxaAnual: 12,
    observacoes: "Título público pós-fixado com liquidez diária.",
  },
];

const createInvestimento = (overrides = {}) => ({
  id: generateInvestimentoId(),
  nome: "",
  taxaAnual: 10,
  observacoes: "",
  highlight: false,
  ...overrides,
});

const withInvestimentoIds = (lista = []) => lista.map((item) => createInvestimento(item));

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
  arquivoOriginal: null,
  imagem1: null,
  imagem2: null,
  imagem3: null,
  imagem4: null,
  chavesExtraValor: 0,
  chavesExtraQuando: "na_entrega",
  investimentos: baseInvestimentos,
};

/********************
 * App
 ********************/
export default function App() {
  const [step, setStep] = useState("setup");
  const [data, setData] = useState(() => ({
    ...sample,
    investimentos: withInvestimentoIds(sample.investimentos),
  }));
  const [showFluxoDetalhado, setShowFluxoDetalhado] = useState(false);
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
      if (current.chavesForma === "financiamento") {
        if ((current.chavesExtraValor || 0) === 0 && current.chavesExtraQuando === "na_entrega") {
          return current;
        }
        return { ...current, chavesExtraValor: 0, chavesExtraQuando: "na_entrega" };
      }
      if (current.chavesForma === "posConstrutora" && current.chavesExtraQuando !== "pos_chaves") {
        return { ...current, chavesExtraQuando: "pos_chaves" };
      }
      if (current.chavesForma !== "posConstrutora" && current.chavesExtraQuando === "pos_chaves") {
        return { ...current, chavesExtraQuando: "na_entrega" };
      }
      return current;
    });
  }, [data.chavesForma]);

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

    const chavesExtraValor = Math.max(0, Number(data.chavesExtraValor || 0));
    const chavesExtraQuando = data.chavesExtraQuando === "pos_chaves" ? "pos_chaves" : "na_entrega";
    const chavesExtraAtiva = !chavesFinanciado && chavesExtraValor > 0;
    const chavesExtraNaEntrega = chavesExtraAtiva && chavesExtraQuando !== "pos_chaves";
    const chavesExtraPos = chavesExtraAtiva && chavesExtraQuando === "pos_chaves";

    const qRef = Math.max(0, Math.floor(Number(data.balaoQuantidade || 0)));
    const vRef = Math.max(0, Number(data.balaoValor || 0));
    const freqRef = Math.max(1, Math.floor(Number(data.balaoFrequenciaMeses || 1)));
    const reforcosTotal = qRef * vRef;

    const totalChavesEntregaBase = !chavesFinanciado && data.chavesForma === "avista" ? chavesTotal : 0;
    const totalPosChavesBase = data.chavesForma === "posConstrutora" ? chavesTotal : 0;
    const totalChavesEntrega = totalChavesEntregaBase + (chavesExtraNaEntrega ? chavesExtraValor : 0);
    const totalPosChaves = totalPosChavesBase + (chavesExtraPos ? chavesExtraValor : 0);
    const totalFinanciado = chavesFinanciado ? chavesTotal : 0;
    const totalFluxoCliente = entradaValor + duranteObraTotal + reforcosTotal + totalChavesEntrega;
    const totalFluxoSemFin = totalFluxoCliente;
    const totalShortStay = totalPosChaves;
    const totalAteChaves = entradaValor + duranteObraTotal + reforcosTotal + totalChavesEntrega;

    const valorInvestidoReal = totalFluxoCliente;
    const totalCoberto = valorInvestidoReal + totalFinanciado + totalShortStay;
    const saldoACompor = total - totalCoberto;
    const totalJaSomado = totalCoberto;

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
        offset: i,
        responsavel: "cliente",
      });
    }

    for (let i = 0; i < parcelasObra; i++) {
      schedule.push({
        tipo: `Obra ${i + 1}/${parcelasObra}`,
        data: addMonths(baseDate, entradaParcelas + i),
        valor: duranteObraParcela,
        offset: entradaParcelas + i,
        responsavel: "cliente",
      });
    }

    if (qRef > 0 && vRef > 0) {
      for (let i = 0; i < qRef; i++) {
        const deslocamento = entradaParcelas + Math.min(Math.max(parcelasObra - 1, 0), i * freqRef);
        schedule.push({
          tipo: `Reforço ${i + 1}/${qRef}`,
          data: addMonths(baseDate, deslocamento),
          valor: vRef,
          offset: deslocamento,
          responsavel: "cliente",
        });
      }
    }

    if (data.chavesForma === "avista" && chavesTotal > 0) {
      schedule.push({
        tipo: "Chaves (à vista)",
        data: addMonths(baseDate, entradaParcelas + parcelasObra),
        valor: chavesTotal,
        offset: entradaParcelas + parcelasObra,
        responsavel: "cliente",
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
          offset: entradaParcelas + parcelasObra + i + 1,
          responsavel: "short_stay",
        });
      }
    }

    if (chavesExtraNaEntrega) {
      schedule.push({
        tipo: "Parcela de chaves (construtora)",
        data: addMonths(baseDate, entradaParcelas + parcelasObra),
        valor: chavesExtraValor,
        offset: entradaParcelas + parcelasObra,
        responsavel: "cliente",
      });
    }

    if (chavesExtraPos) {
      schedule.push({
        tipo: "Parcela pós-chaves (construtora)",
        data: addMonths(baseDate, entradaParcelas + parcelasObra + 1),
        valor: chavesExtraValor,
        offset: entradaParcelas + parcelasObra + 1,
        responsavel: "short_stay",
      });
    }

    const scheduleOrdenado = schedule.sort((a, b) => a.data - b.data);
    let acumuladoCliente = 0;
    let acumuladoTotal = 0;
    const denominadorCliente = totalFluxoCliente > 0 ? totalFluxoCliente : 0;
    const denominadorTotal = totalFluxoCliente + totalShortStay;
    const scheduleDetalhado = scheduleOrdenado.map((item) => {
      acumuladoTotal += item.valor;
      if (item.responsavel !== "short_stay") {
        acumuladoCliente += item.valor;
      }
      const percentualCliente = denominadorCliente > 0 ? (acumuladoCliente / denominadorCliente) * 100 : 0;
      const percentualTotal = denominadorTotal > 0 ? (acumuladoTotal / denominadorTotal) * 100 : 0;
      return {
        ...item,
        acumuladoCliente,
        acumuladoTotal,
        percentualCliente,
        percentualTotal,
      };
    });

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
      totalCoberto,
      totalJaSomado,
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
      totalChavesEntrega,
      totalFluxoCliente,
      totalShortStay,
      chavesExtraValor,
      chavesExtraNaEntrega,
      chavesExtraPos,
      schedule: scheduleDetalhado,
      entradaPercent: total > 0 ? (entradaValor / total) * 100 : 0,
      duranteObraPercent: total > 0 ? (duranteObraTotal / total) * 100 : 0,
    };
  }, [data]);

  const cenario1 = useMemo(() => {
    const anos = Math.max(0, Number(data.prazoObraAnos || 0));
    const taxa = Math.max(0, Number(data.apreciacao || 0)) / 100;
    const valorFinal = valores.total * Math.pow(1 + taxa, anos);
    const lucro = valorFinal - valores.total;
    const roi = valores.total > 0 ? (lucro / valores.total) * 100 : 0;
    const roas = valores.valorInvestidoReal > 0 ? (lucro / valores.valorInvestidoReal) * 100 : 0;
    return { valorFinal, lucro, roi, roas, prazo: anos };
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
      prazoTotal: anosEntrega + 5,
    };
  }, [valores, data]);

  const handle = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }));
  const handleNumeric = (k) => (e) => {
    const raw = e.target.value;
    if (raw.trim() === "") {
      setData((d) => ({ ...d, [k]: "" }));
      return;
    }
    const sanitized = raw.replace(/\s/g, "");
    const usesComma = sanitized.includes(",");
    const usesDot = sanitized.includes(".");
    let normalizedString = sanitized;
    if (usesComma && usesDot) {
      normalizedString = sanitized.replace(/\./g, "").replace(",", ".");
    } else if (usesComma) {
      normalizedString = sanitized.replace(",", ".");
    }
    const normalized = parseFloat(normalizedString);
    const num = Number.isFinite(normalized) ? Math.max(0, normalized) : 0;
    setData((d) => ({ ...d, [k]: num }));
  };
  const handleCurrency = (k) => (e) => {
    const raw = e.target.value;
    if (raw.trim() === "") {
      setData((d) => ({ ...d, [k]: "" }));
      return;
    }
    const num = Math.max(0, currencyToNumber(raw));
    setData((d) => ({ ...d, [k]: num }));
  };
  const handlePercent = (k) => (e) => {
    const raw = parseFloat((e.target.value + "").replace(",", "."));
    const num = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    setData((d) => ({ ...d, [k]: num }));
  };

  const recalc = () => setData((d) => ({ ...d }));
  const setFile = (k) => (file) => setData((d) => ({ ...d, [k]: file }));

  const savePDF = async () => {
    if (!resultRef.current) return;
    await ensurePdfLibs();
    const { jsPDF } = window.jspdf;
    const node = resultRef.current;
    const orientation = pdfOrientation === "landscape" ? "l" : "p";
    const pdf = new jsPDF(orientation, "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pxPerMm = 96 / 25.4;

    const exportWidthPx = Math.floor(pageWidth * pxPerMm);
    const pages = Array.from(node.querySelectorAll(".page"));
    if (!pages.length) return;

    for (let index = 0; index < pages.length; index++) {
      const page = pages[index];
      const originalWidth = page.style.width;
      const originalMaxWidth = page.style.maxWidth;
      const originalBoxShadow = page.style.boxShadow;
      page.style.width = `${exportWidthPx}px`;
      page.style.maxWidth = `${exportWidthPx}px`;
      page.style.boxShadow = "none";

      const canvas = await window.html2canvas(page, {
        scale: Math.min(window.devicePixelRatio || 1.5, 1.6),
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      page.style.width = originalWidth || "";
      page.style.maxWidth = originalMaxWidth || "";
      page.style.boxShadow = originalBoxShadow || "";

      const imgData = canvas.toDataURL("image/jpeg", 0.82);
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const renderWidth = canvas.width * ratio;
      const renderHeight = canvas.height * ratio;
      const offsetX = (pageWidth - renderWidth) / 2;
      const offsetY = (pageHeight - renderHeight) / 2;

      if (index > 0) {
        pdf.addPage(undefined, orientation);
      }
      pdf.addImage(imgData, "JPEG", offsetX, offsetY, renderWidth, renderHeight);
    }
    const file = `Proposta_Alvo_${(data.cliente || "cliente").replace(/\s+/g, "_")}.pdf`;
    pdf.save(file);
  };

  const gerarProposta = () => {
    setShowFluxoDetalhado(false);
    setStep("resultado");
  };
  const fillExample = () =>
    setData({
      ...sample,
      investimentos: withInvestimentoIds(sample.investimentos),
    });
  const clearAll = () =>
    setData({
      ...sample,
      investimentos: [],
      arquivoOriginal: null,
      imagem1: null,
      imagem2: null,
      imagem3: null,
      imagem4: null,
    });

  const imagensGaleria = [data.imagem1, data.imagem2, data.imagem3, data.imagem4].filter(Boolean);
  const investimentosForm = Array.isArray(data.investimentos) ? data.investimentos : [];

  const addInvestimento = () =>
    setData((d) => {
      const lista = Array.isArray(d.investimentos) ? d.investimentos : [];
      if (lista.length >= 4) return d;
      return { ...d, investimentos: [...lista, createInvestimento()] };
    });

  const removeInvestimento = (id) =>
    setData((d) => {
      const lista = Array.isArray(d.investimentos) ? d.investimentos : [];
      const filtrado = lista.filter((item) => item.id !== id);
      return { ...d, investimentos: filtrado };
    });

  const updateInvestimento = (id, key, value) =>
    setData((d) => {
      const lista = Array.isArray(d.investimentos) ? d.investimentos : [];
      const atualizada = lista.map((item) => (item.id === id ? { ...item, [key]: value } : item));
      return { ...d, investimentos: atualizada };
    });
  const fluxoResumo = useMemo(() => {
    const totalCliente = valores.totalFluxoSemFin;
    const totalGeral = valores.totalJaSomado;
    const itens = [];

    if (valores.totalEntrada > 0) {
      itens.push({
        key: "entrada",
        label: "Entrada",
        valor: valores.totalEntrada,
        percentual: totalCliente > 0 ? (valores.totalEntrada / totalCliente) * 100 : 0,
        contexto: "fluxo do cliente",
        detalhe:
          valores.entradaParcelas > 1
            ? `${valores.entradaParcelas}x de ${brl(valores.entradaParcela)}`
            : valores.entradaParcelas === 1
            ? "Pagamento no ato"
            : null,
      });
    }

    if (valores.totalObra > 0) {
      itens.push({
        key: "obra",
        label: "Durante a obra",
        valor: valores.totalObra,
        percentual: totalCliente > 0 ? (valores.totalObra / totalCliente) * 100 : 0,
        contexto: "fluxo do cliente",
        detalhe:
          valores.duranteObraParcelas > 0
            ? `${valores.duranteObraParcelas}x de ${brl(valores.duranteObraParcela)}`
            : null,
      });
    }

    if (valores.totalReforcos > 0) {
      itens.push({
        key: "reforcos",
        label: "Reforços",
        valor: valores.totalReforcos,
        percentual: totalCliente > 0 ? (valores.totalReforcos / totalCliente) * 100 : 0,
        contexto: "fluxo do cliente",
        detalhe:
          valores.qRef > 0
            ? `${valores.qRef}x de ${brl(valores.vRef)} a cada ${valores.freqRef}m`
            : null,
      });
    }

    if (valores.totalChavesEntrega > 0) {
      itens.push({
        key: "chaves_entrega",
        label: "Chaves na entrega",
        valor: valores.totalChavesEntrega,
        percentual: totalCliente > 0 ? (valores.totalChavesEntrega / totalCliente) * 100 : 0,
        contexto: "fluxo do cliente",
        detalhe:
          data.chavesForma === "posConstrutora"
            ? "Quitação na entrega"
            : valores.chavesExtraNaEntrega
            ? "Inclui parcela adicional da construtora"
            : "Pagamento no recebimento",
      });
    }

    if (valores.totalPosChaves > 0) {
      itens.push({
        key: "pos_chaves",
        label: "Pós-obra (short stay)",
        valor: valores.totalPosChaves,
        percentual: totalGeral > 0 ? (valores.totalPosChaves / totalGeral) * 100 : 0,
        contexto: "coberto pela operação",
        detalhe:
          data.chavesForma === "posConstrutora"
            ? `${Math.max(1, Number(data.chavesPosParcelas || 0))}x de ${brl(
                valores.chavesTotal / Math.max(1, Number(data.chavesPosParcelas || 1))
              )}`
            : "Quitado com renda operacional",
      });
    }

    if (valores.totalFinanciado > 0) {
      itens.push({
        key: "financiamento",
        label: "Financiamento (banco)",
        valor: valores.totalFinanciado,
        percentual: totalGeral > 0 ? (valores.totalFinanciado / totalGeral) * 100 : 0,
        contexto: "cliente + parceiros",
        destaque: true,
        detalhe: "Valor previsto para financiamento bancário",
      });
    }

    return { itens, totalCliente, totalGeral };
  }, [
    valores,
    data.chavesForma,
    data.chavesPosParcelas,
    data.balaoQuantidade,
    data.balaoValor,
    data.balaoFrequenciaMeses,
  ]);
  const resumoFluxo = fluxoResumo.itens;
  const totalFluxoCliente = fluxoResumo.totalCliente;
  const totalFluxoGeral = fluxoResumo.totalGeral;
  const totalChavesCliente = valores.totalChavesEntrega;
  const totalShortStay = valores.totalShortStay;

  const scheduleCliente = useMemo(
    () =>
      Array.isArray(valores.schedule)
        ? valores.schedule.filter((item) => item.responsavel !== "short_stay")
        : [],
    [valores.schedule]
  );

  const horizonteMeses = useMemo(() => {
    if (!scheduleCliente.length) return 0;
    return scheduleCliente.reduce((max, item) => Math.max(max, Number(item.offset || 0)), 0);
  }, [scheduleCliente]);

  const investimentosDetalhados = useMemo(() => {
    const lista = Array.isArray(data.investimentos) ? data.investimentos : [];
    const aporteTotal = valores.totalFluxoSemFin;
    return lista
      .map((item, index) => {
        const id = item.id || `inv-${index}`;
        const nome = (item.nome || "").trim();
        const taxaAnual = Math.max(0, Number(item.taxaAnual || 0));
        const observacoes = (item.observacoes || "").trim();

        if (!nome && aporteTotal <= 0) {
          return null;
        }

        const taxaMensal = Math.pow(1 + taxaAnual / 100, 1 / 12) - 1;
        let montanteProjetado = 0;

        if (aporteTotal > 0 && scheduleCliente.length > 0) {
          scheduleCliente.forEach((parcela) => {
            const offset = Math.max(0, Number(parcela.offset || 0));
            const mesesRestantes = Math.max(0, horizonteMeses - offset);
            const fator = Math.pow(1 + taxaMensal, mesesRestantes);
            montanteProjetado += parcela.valor * fator;
          });
        }

        const ganho = montanteProjetado - aporteTotal;
        const rentabilidade = aporteTotal > 0 ? (ganho / aporteTotal) * 100 : 0;

        return {
          id,
          nome: nome || `Investimento ${index + 1}`,
          taxaAnual,
          observacoes,
          highlight: Boolean(item.highlight),
          aporteTotal,
          montanteProjetado: montanteProjetado || aporteTotal,
          ganho: ganho || 0,
          rentabilidade,
        };
      })
      .filter(Boolean);
  }, [data.investimentos, horizonteMeses, scheduleCliente, valores.totalFluxoSemFin]);

  const investimentosResumo = useMemo(() => {
    if (!investimentosDetalhados.length) return null;
    const ordenado = [...investimentosDetalhados].sort((a, b) => b.montanteProjetado - a.montanteProjetado);
    return {
      melhor: ordenado[0],
      aporte: valores.totalFluxoSemFin,
    };
  }, [investimentosDetalhados, valores.totalFluxoSemFin]);

  const saldoTitle = valores.saldoACompor > 0.5
    ? "Saldo a compor"
    : valores.saldoACompor < -0.5
    ? "Excedente (sobra)"
    : "Saldo em aberto";
  const pagamentoTotalTitulo =
    valores.totalFinanciado > 0 || valores.totalShortStay > 0
      ? "Pagamento total (cliente + parceiros)"
      : null;
  const pagamentoCliente = valores.valorInvestidoReal;
  const pagamentoBanco = valores.totalFinanciado;
  const pagamentoShortStay = valores.totalShortStay;
  const pagamentoDetalhe = (
    <>
      <span className="block">Pagamento total: {brl(valores.totalJaSomado)}</span>
      <span className="block">
        Pagamento do cliente: {brl(pagamentoCliente)}
        {pagamentoBanco > 0 ? <span> · Banco: {brl(pagamentoBanco)}</span> : null}
        {pagamentoShortStay > 0 ? <span> · Short stay: {brl(pagamentoShortStay)}</span> : null}
      </span>
    </>
  );

  const resumoKPIs = [
    { title: "Valor do imóvel", value: brl(valores.total) },
    { title: "Investimento real (cliente)", value: brl(valores.valorInvestidoReal) },
    { title: "Pagamento do cliente", value: brl(valores.totalFluxoSemFin) },
    valores.totalShortStay
      ? { title: "Coberto pelo short stay", value: brl(valores.totalShortStay) }
      : null,
    valores.totalFinanciado ? { title: "Financiado (banco)", value: brl(valores.totalFinanciado) } : null,
    pagamentoTotalTitulo ? { title: pagamentoTotalTitulo, value: brl(valores.totalJaSomado) } : null,
    {
      title: saldoTitle,
      value: brl(valores.saldoACompor),
      highlight: true,
      subValue: pagamentoDetalhe,
    },
  ].filter(Boolean);

  return (
    <div className="min-h-screen theme-wrapper">
      <header className="sticky top-0 z-40 theme-header">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <AlvoLogo size={36} />
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-tight text-white">Alvo Propostas</h1>
            <p className="text-xs text-white/80">
              Página {step === "setup" ? "de Edição" : "da Proposta"} · PDF multipágina A4
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fillExample}
              className="btn-secondary"
            >
              Exemplo
            </button>
            <button
              onClick={clearAll}
              className="btn-secondary"
            >
              Limpar
            </button>
            {step === "setup" && (
              <button
                onClick={recalc}
                className="btn-secondary"
              >
                Recalcular
              </button>
            )}
            {step === "resultado" ? (
              <>
                <select
                  value={pdfOrientation}
                  onChange={(event) => setPdfOrientation(event.target.value)}
                  className="select-secondary"
                >
                  <option value="portrait" className="text-slate-900">
                    PDF em retrato (A4)
                  </option>
                  <option value="landscape" className="text-slate-900">
                    PDF em paisagem (A4)
                  </option>
                </select>
                <button
                  onClick={() => setStep("setup")}
                  className="btn-secondary"
                >
                  Voltar ao Setup
                </button>
                <button
                  onClick={savePDF}
                  className="btn-primary"
                >
                  Baixar PDF
                </button>
              </>
            ) : (
              <button
                onClick={gerarProposta}
                className="btn-primary"
              >
                Gerar Proposta
              </button>
            )}
          </div>
        </div>
      </header>

      {step === "setup" ? (
        <main className="mx-auto max-w-7xl p-6 space-y-6 text-[color:var(--petrol-black)]">
          <Card title="1) Empresa">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Empresa" value={data.company || ""} onChange={handle("company")} />
              <Input label="Data" value={data.date || ""} onChange={handle("date")} />
              <Input label="Consultor" value={data.consultor || ""} onChange={handle("consultor")} />
              <Input label="Telefone" value={data.phone || ""} onChange={handle("phone")} />
              <Input label="E-mail" value={data.email || ""} onChange={handle("email")} />
            </div>
          </Card>

          <Card title="2) Cliente">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Nome" value={data.cliente || ""} onChange={handle("cliente")} />
              <Input label="Telefone" value={data.clientePhone || ""} onChange={handle("clientePhone")} />
              <Input label="E-mail" value={data.clienteEmail || ""} onChange={handle("clienteEmail")} />
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
                  onChange={handleCurrency("valorTotal")}
                  currency
                />
              </div>

              <div className="rounded-xl border p-3 bg-slate-50">
                <p className="text-sm font-semibold mb-2">Entrada</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <Input
                    label="Total de entrada (R$)"
                    value={data.entradaValor ?? ""}
                    onChange={handleCurrency("entradaValor")}
                    currency
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
                    onChange={handleCurrency("obraParcelaValor")}
                    currency
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
                    onChange={handleCurrency("balaoValor")}
                    currency
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
                {!valores.chavesFinanciado && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <Input
                      label="Parcela adicional de chaves (R$)"
                      value={data.chavesExtraValor ?? ""}
                      onChange={handleCurrency("chavesExtraValor")}
                      currency
                    />
                    <label className="block">
                      <div className="text-xs text-gray-600 mb-1">Quando ocorre?</div>
                      <select
                        className="w-full px-3 py-2 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={data.chavesExtraQuando || "na_entrega"}
                        onChange={(e) => setData((d) => ({ ...d, chavesExtraQuando: e.target.value }))}
                      >
                        <option value="na_entrega">Na entrega das chaves</option>
                        <option value="pos_chaves">Após a entrega (pós-chaves)</option>
                      </select>
                    </label>
                  </div>
                )}
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
                  {!valores.chavesFinanciado && valores.chavesExtraValor > 0 && (
                    <div>
                      Parcela adicional ({valores.chavesExtraPos ? "pós-chaves" : "na entrega"}):{" "}
                      <strong>{brl(valores.chavesExtraValor)}</strong>
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
                    onChange={handleCurrency("adrDiaria")}
                    currency
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
                      <strong>{brl(valores.chavesTotal)}</strong> (na entrega)
                    </>
                  )}
                  {!valores.chavesFinanciado && valores.chavesExtraValor > 0 && (
                    <div className="text-xs text-gray-600">
                      Parcela adicional: {brl(valores.chavesExtraValor)} · {valores.chavesExtraPos ? "pós-chaves" : "na entrega"}
                    </div>
                  )}
                </li>
              </ul>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 border p-3">
                  Investimento real: <strong>{brl(valores.valorInvestidoReal)}</strong>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                  <div className="font-semibold text-emerald-800">{saldoTitle}</div>
                  <div>
                    <strong className="text-emerald-700">{brl(valores.saldoACompor)}</strong>
                  </div>
                  <div className="text-[11px] text-emerald-700/80 mt-1 space-y-1">
                    <div>Pagamento total: {brl(valores.totalJaSomado)}</div>
                    <div>
                      Pagamento do cliente: {brl(valores.valorInvestidoReal)}
                      {valores.totalFinanciado > 0 ? ` · Banco: ${brl(valores.totalFinanciado)}` : ""}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-white border p-3">
                <p className="font-semibold mb-2">Resumo do fluxo de pagamento</p>
                <FluxoResumoCards items={resumoFluxo} />
                <div className="mt-3 text-xs text-gray-600 space-y-1">
                  <div>
                    Pagamento do cliente: <strong>{brl(totalFluxoCliente)}</strong>
                  </div>
                  {totalShortStay > 0 && (
                    <div>
                      Pós-obra coberta pelo short stay: <strong>{brl(totalShortStay)}</strong>
                    </div>
                  )}
                  {valores.totalFinanciado > 0 && (
                    <div>
                      Financiamento (banco): <strong>{brl(valores.totalFinanciado)}</strong>
                    </div>
                  )}
                  <div>
                    Pagamento total (cliente + parceiros): <strong>{brl(totalFluxoGeral)}</strong>
                  </div>
                </div>
              </div>
              {investimentosDetalhados.length > 0 && (
                <div className="mt-4 rounded-xl bg-white border p-3 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="font-semibold">Comparativo com outros investimentos</p>
                    {investimentosResumo ? (
                      <span className="text-[11px] text-gray-500">
                        Mesmo fluxo aplicado em {investimentosResumo.melhor.nome} pode projetar {brl(
                          investimentosResumo.melhor.montanteProjetado
                        )}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-500">
                        Ajuste as taxas anuais para analisar o retorno de alternativas como CDI.
                      </span>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {investimentosDetalhados.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-2xl border p-4 space-y-3 shadow-sm ${
                          item.highlight
                            ? "bg-emerald-50/80 border-emerald-200"
                            : "bg-slate-50/80 border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h6 className="text-sm font-semibold text-slate-700">{item.nome}</h6>
                            <p className="text-xs text-gray-500">
                              Taxa anual projetada: <strong>{pct(item.taxaAnual)}</strong>
                            </p>
                          </div>
                          {item.observacoes ? (
                            <p className="text-xs text-right text-gray-500 max-w-[160px]">
                              {item.observacoes}
                            </p>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-white/70 border border-white/80 p-2">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500">Aporte total</p>
                            <p className="text-sm font-semibold text-slate-700">{brl(item.aporteTotal)}</p>
                          </div>
                          <div className="rounded-lg bg-white/70 border border-white/80 p-2">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500">Montante projetado</p>
                            <p className="text-sm font-semibold text-slate-700">{brl(item.montanteProjetado)}</p>
                          </div>
                          <div className="rounded-lg bg-white/70 border border-white/80 p-2">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500">Ganho vs aporte</p>
                            <p className="text-sm font-semibold text-emerald-700">{brl(item.ganho)}</p>
                          </div>
                          <div className="rounded-lg bg-white/70 border border-white/80 p-2">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500">Rentabilidade</p>
                            <p className="text-sm font-semibold text-emerald-700">{pct(item.rentabilidade)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card title="5) Materiais e mídias">
            <div className="space-y-4">
              <FileInput
                label="Arquivo original do projeto"
                file={data.arquivoOriginal}
                accept="application/pdf,image/*"
                helper="Anexe o PDF ou imagem-base entregue pela construtora para manter a proposta completa."
                onFileChange={setFile("arquivoOriginal")}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "imagem1", label: "Imagem 1" },
                  { key: "imagem2", label: "Imagem 2" },
                  { key: "imagem3", label: "Imagem 3" },
                  { key: "imagem4", label: "Imagem 4" },
                ].map((item) => (
                  <FileInput
                    key={item.key}
                    label={`${item.label} do empreendimento`}
                    file={data[item.key]}
                    accept="image/*"
                    helper="Use imagens em alta resolução para o PDF."
                    onFileChange={setFile(item.key)}
                  />
                ))}
              </div>
            </div>
          </Card>

          <Card title="6) Comparativos de investimentos">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Projete quanto o mesmo fluxo de pagamento renderia em outras alternativas financeiras (ex.: CDI, Tesouro,
                fundos). Informe a taxa anual estimada e um comentário para contextualizar a análise.
              </p>
              {investimentosForm.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Clique em <strong>Adicionar comparativo</strong> para incluir um investimento de referência.
                </p>
              ) : null}
              {investimentosForm.map((item, index) => (
                <div
                  key={item.id || index}
                  className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm p-4 space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h5 className="text-sm font-semibold text-slate-700">Comparativo {index + 1}</h5>
                      {item.nome ? <p className="text-xs text-gray-500">{item.nome}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateInvestimento(item.id, "highlight", !item.highlight)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                          item.highlight
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 text-gray-500 hover:border-emerald-200 hover:text-emerald-700"
                        }`}
                      >
                        {item.highlight ? "Destacado" : "Destacar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeInvestimento(item.id)}
                        className="px-3 py-1.5 rounded-full border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nome do investimento"
                      value={item.nome || ""}
                      onChange={(event) => updateInvestimento(item.id, "nome", event.target.value)}
                      placeholder="CDI (12m)"
                    />
                    <Input
                      label="Taxa anual projetada (%)"
                      value={item.taxaAnual ?? ""}
                      onChange={(event) =>
                        updateInvestimento(item.id, "taxaAnual", Number((event.target.value || "").replace(/,/g, ".")))
                      }
                      placeholder="13.15"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-600">Observações</label>
                    <textarea
                      value={item.observacoes || ""}
                      onChange={(event) => updateInvestimento(item.id, "observacoes", event.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                      placeholder="Fonte, premissas, risco ou horizonte considerado"
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addInvestimento}
                  className="px-4 py-2 rounded-2xl border border-emerald-300 bg-emerald-50 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50"
                  disabled={investimentosForm.length >= 4}
                >
                  Adicionar comparativo
                </button>
              </div>
            </div>
          </Card>
        </main>
      ) : (
        <main className="mx-auto max-w-7xl p-6 text-[color:var(--petrol-black)]">
          <div ref={resultRef} className="paper mx-auto space-y-8">
            <section className="page bg-white/95 border border-slate-200 rounded-3xl shadow-xl p-10 space-y-6">
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
              <div className="pt-4 border-t border-dashed border-slate-200 space-y-4">
                <h3 className="text-lg font-semibold text-slate-700">Resumo Executivo</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {resumoKPIs.map((kpi) => (
                    <KPI
                      key={kpi.title}
                      title={kpi.title}
                      value={kpi.value}
                      highlight={kpi.highlight}
                      subValue={kpi.subValue}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="page bg-white/95 border border-slate-200 rounded-3xl shadow-xl p-10 space-y-5">
              <h3 className="text-lg font-semibold text-slate-700">Condições Comerciais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="rounded-2xl border bg-white p-4 space-y-3 text-sm shadow-sm">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Resumo do fluxo de pagamento
                  </h4>
                  <FluxoResumoCards items={resumoFluxo} />
                  <div className="p-3 rounded-xl bg-slate-50 text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Pagamento do cliente</span>
                      <span className="font-semibold">{brl(totalFluxoCliente)}</span>
                    </div>
                    {totalShortStay > 0 && (
                      <div className="flex justify-between">
                        <span>Short stay (pós-obra)</span>
                        <span className="font-semibold">{brl(totalShortStay)}</span>
                      </div>
                    )}
                    {valores.totalFinanciado > 0 && (
                      <div className="flex justify-between">
                        <span>Financiamento (banco)</span>
                        <span className="font-semibold">{brl(valores.totalFinanciado)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Pagamento total (cliente + parceiros)</span>
                      <span className="font-semibold">{brl(totalFluxoGeral)}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border bg-white p-4 space-y-2 text-sm shadow-sm">
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
                  {totalShortStay > 0 && (
                    <div className="flex justify-between">
                      <span>Short stay (pós-obra)</span>
                      <strong>{brl(totalShortStay)}</strong>
                    </div>
                  )}
                  {valores.totalFinanciado > 0 && (
                    <div className="flex justify-between">
                      <span>Financiado (banco)</span>
                      <strong>{brl(valores.totalFinanciado)}</strong>
                    </div>
                  )}
                  {valores.totalFinanciado > 0 && (
                    <div className="flex justify-between">
                      <span>Pagamento total</span>
                      <strong>{brl(valores.totalJaSomado)}</strong>
                    </div>
                  )}
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>{saldoTitle}</span>
                    <span>{brl(valores.saldoACompor)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>Pagamento total</span>
                    <span>{brl(valores.totalJaSomado)}</span>
                  </div>
                </div>
              </div>
              {(data.arquivoOriginal || imagensGaleria.length > 0) && (
                <div className="pt-4 border-t border-dashed border-slate-200 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-700">Materiais do Empreendimento</h4>
                  {data.arquivoOriginal && (
                    <div className="rounded-2xl border bg-slate-50 p-4 flex flex-wrap items-center justify-between gap-3 text-sm shadow-sm">
                      <div>
                        <p className="font-semibold text-slate-700">Arquivo original</p>
                        <p className="text-xs text-gray-500">{data.arquivoOriginal.name}</p>
                      </div>
                      <a
                        href={data.arquivoOriginal.dataUrl}
                        download={data.arquivoOriginal.name || "arquivo-original"}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-full border bg-white text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition"
                      >
                        Abrir arquivo
                      </a>
                    </div>
                  )}
                  {imagensGaleria.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {imagensGaleria.map((img, index) => (
                        <figure
                          key={`${img.name}-${index}`}
                          className="border rounded-2xl overflow-hidden bg-white shadow-sm"
                        >
                          <img
                            src={img.dataUrl}
                            alt={img.name || `Imagem ${index + 1}`}
                            className="w-full h-52 object-contain bg-slate-900/5"
                          />
                          <figcaption className="px-3 py-2 text-[11px] text-gray-500 truncate">
                            {img.name || `Imagem ${index + 1}`}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <p className="text-[11px] text-gray-500">
                Fórmulas: Valor total = SOMA(Entrada + Obra + Reforços + (Chaves à vista ou Pós-chaves)). Acumulado(i) =
                Acumulado(i-1) + Valor(i). % do fluxo(i) = Acumulado(i) / Total do fluxo.
              </p>
            </section>
            

            <section className="page bg-white/95 border border-slate-200 rounded-3xl shadow-xl p-10 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-700">Fluxo de Pagamento</h3>
                <button
                  onClick={() => setShowFluxoDetalhado((prev) => !prev)}
                  className="px-3 py-1.5 rounded-full border text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                  type="button"
                  aria-expanded={showFluxoDetalhado}
                >
                  {showFluxoDetalhado ? "Ocultar parcelas" : "Ver fluxo mês a mês"}
                </button>
              </div>
              <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
                <FluxoResumoCards items={resumoFluxo} columns="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Pagamento do cliente</span>
                      <strong>{brl(valores.totalFluxoSemFin)}</strong>
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
                      <span>{saldoTitle}</span>
                      <span>{brl(valores.saldoACompor)}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Valor do imóvel</span>
                      <strong>{brl(valores.total)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Pagamento total</span>
                      <strong>{brl(valores.totalJaSomado)}</strong>
                    </div>
                    {valores.totalFinanciado > 0 && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Banco</span>
                        <span>{brl(valores.totalFinanciado)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Investimento real</span>
                      <span>{brl(valores.valorInvestidoReal)}</span>
                    </div>
                  </div>
                </div>
              </div>
              {investimentosDetalhados.length > 0 && (
                <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700">Mesmo fluxo em investimentos alternativos</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 text-slate-600 uppercase tracking-wide">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Investimento</th>
                          <th className="px-3 py-2 text-left font-semibold">Taxa anual</th>
                          <th className="px-3 py-2 text-left font-semibold">Aporte total</th>
                          <th className="px-3 py-2 text-left font-semibold">Montante projetado</th>
                          <th className="px-3 py-2 text-left font-semibold">Ganho</th>
                          <th className="px-3 py-2 text-left font-semibold">Rentabilidade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {investimentosDetalhados.map((item) => (
                          <tr key={item.id} className="bg-white/70">
                            <td className="px-3 py-2 font-medium text-slate-600">{item.nome}</td>
                            <td className="px-3 py-2">{pct(item.taxaAnual)}</td>
                            <td className="px-3 py-2">{brl(item.aporteTotal)}</td>
                            <td className="px-3 py-2">{brl(item.montanteProjetado)}</td>
                            <td className="px-3 py-2 text-emerald-700 font-semibold">{brl(item.ganho)}</td>
                            <td className="px-3 py-2 text-emerald-700 font-semibold">{pct(item.rentabilidade)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {showFluxoDetalhado && (
                <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600 uppercase tracking-wide">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">#</th>
                        <th className="px-3 py-2 text-left font-semibold">Mês</th>
                        <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                        <th className="px-3 py-2 text-right font-semibold">Valor</th>
                        <th className="px-3 py-2 text-right font-semibold">Acumulado</th>
                        <th className="px-3 py-2 text-right font-semibold">% do fluxo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {valores.schedule.map((item, index) => (
                        <tr key={`${item.tipo}-${index}`} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="px-3 py-2">{index + 1}</td>
                          <td className="px-3 py-2">{item.data.toLocaleDateString("pt-BR")}</td>
                          <td className="px-3 py-2">{item.tipo}</td>
                          <td className="px-3 py-2 text-right">{brl(item.valor)}</td>
                          <td className="px-3 py-2 text-right">{brl(item.acumulado)}</td>
                          <td className="px-3 py-2 text-right">{pct(item.percentual)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="pt-4 border-t border-dashed border-slate-200 space-y-4">
                <h3 className="text-lg font-semibold text-slate-700">Cenários de Retorno</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-[13px] shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-emerald-900">Cenário 1 — Revenda</h4>
                      <span className="text-xs text-emerald-700">Prazo: {data.prazoObraAnos || 0} anos</span>
                    </div>
                    <table className="w-full">
                      <tbody>
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
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-[13px] shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-blue-900">Cenário 2 — Short Stay (5 anos)</h4>
                      <span className="text-xs text-blue-700">Operação: 5 anos</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border text-[12px] leading-6">
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
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-dashed border-slate-200 space-y-2 text-[11px] text-gray-500">
                <p className="italic leading-5">
                  * Estimativas baseadas em projeções de mercado. ROI = retorno sobre o valor total; ROAS = retorno sobre o
                  investimento real.
                </p>
                <p className="leading-5">
                  * Formas de pagamento sujeitas a atualização por <strong>CUB (período de obras)</strong> e <strong>IGP-M + 1%</strong>
                  após a entrega das chaves.
                </p>
                <p className="leading-5">
                  © {new Date().getFullYear()} Alvo BR — {data.company} · {data.phone} · {data.email}
                </p>
              </div>
            </section>

            

            
          </div>
        </main>
      )}

      <style>{`
        :root {
          --petrol-blue: ${palette.petrolBlue};
          --petrol-blue-dark: ${palette.petrolBlueDark};
          --petrol-green: ${palette.petrolGreen};
          --petrol-green-light: ${palette.petrolGreenLight};
          --petrol-black: ${palette.black};
          --petrol-white: ${palette.white};
        }
        .theme-wrapper {
          background: radial-gradient(circle at top left, rgba(0, 124, 123, 0.18), transparent 55%), linear-gradient(135deg, var(--petrol-blue-dark), var(--petrol-blue));
          color: var(--petrol-white);
        }
        .theme-header {
          backdrop-filter: blur(18px);
          background: linear-gradient(90deg, rgba(2, 31, 38, 0.9), rgba(0, 59, 70, 0.75));
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        }
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.5rem 0.85rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.18);
          transition: all 0.2s ease;
        }
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.16);
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.55rem 1rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--petrol-white);
          background: linear-gradient(135deg, var(--petrol-green), var(--petrol-green-light));
          box-shadow: 0 18px 38px rgba(14, 124, 123, 0.32);
          border: 1px solid rgba(14, 124, 123, 0.65);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 22px 42px rgba(14, 124, 123, 0.42);
        }
        .select-secondary {
          padding: 0.45rem 0.9rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(14px);
          transition: all 0.2s ease;
        }
        .select-secondary:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.45);
          box-shadow: 0 0 0 2px rgba(14, 124, 123, 0.35);
        }
        .select-secondary option {
          color: var(--petrol-black);
        }
        .theme-card {
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(0, 59, 70, 0.14);
          border-radius: 1.75rem;
          box-shadow: 0 26px 60px rgba(2, 31, 38, 0.28);
          backdrop-filter: blur(16px);
          overflow: hidden;
        }
        .theme-card__header {
          padding: 0.8rem 1.4rem;
          border-bottom: 1px solid rgba(0, 59, 70, 0.12);
          background: linear-gradient(120deg, rgba(0, 59, 70, 0.08), rgba(14, 124, 123, 0.08));
        }
        .theme-mini-card {
          border-radius: 0.95rem;
          border: 1px solid rgba(0, 59, 70, 0.15);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 20px 30px rgba(2, 31, 38, 0.1);
          padding: 0.9rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .theme-mini-card--highlight {
          background: linear-gradient(135deg, rgba(14, 124, 123, 0.15), rgba(0, 59, 70, 0.08));
          border-color: rgba(14, 124, 123, 0.45);
        }
        .theme-mini-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 26px 45px rgba(2, 31, 38, 0.18);
        }
        .paper { width: 100%; max-width: 1200px; }
        .page { page-break-inside: avoid; }
        .page-break { page-break-before: always; margin-top: 8px; }
        .paper img { max-width: 100%; height: auto; }
        .paper * { line-height: 1.45; word-break: break-word; }
        .text-slate-700, .text-slate-800, .text-slate-900 {
          color: var(--petrol-black) !important;
        }
        .text-slate-200\/80 { color: rgba(255, 255, 255, 0.8) !important; }
        .text-gray-600 { color: rgba(0, 59, 70, 0.6) !important; }
        .text-gray-500 { color: rgba(0, 59, 70, 0.55) !important; }
        .text-gray-400 { color: rgba(0, 59, 70, 0.45) !important; }
        .border-slate-200, .border-slate-300 {
          border-color: rgba(0, 59, 70, 0.2) !important;
        }
        .border-gray-200, .border-gray-300 {
          border-color: rgba(0, 59, 70, 0.16) !important;
        }
        .bg-slate-50 { background-color: rgba(0, 59, 70, 0.06) !important; }
        .bg-slate-100 { background-color: rgba(0, 59, 70, 0.1) !important; }
        .bg-white\/95 { background-color: rgba(255, 255, 255, 0.95) !important; }
        .text-emerald-700,
        .text-emerald-800,
        .text-emerald-900,
        .hover\:text-emerald-700:hover,
        .text-emerald-700\/80 {
          color: var(--petrol-green) !important;
        }
        .text-emerald-700\/80 { color: rgba(14, 124, 123, 0.8) !important; }
        .bg-emerald-50 { background-color: rgba(14, 124, 123, 0.12) !important; }
        .bg-emerald-100 { background-color: rgba(14, 124, 123, 0.2) !important; }
        .bg-blue-50 { background-color: rgba(0, 59, 70, 0.12) !important; }
        .bg-blue-100 { background-color: rgba(0, 59, 70, 0.18) !important; }
        .bg-blue-200 { background-color: rgba(0, 59, 70, 0.26) !important; }
        .border-emerald-200, .border-emerald-300, .border-emerald-600 {
          border-color: rgba(14, 124, 123, 0.45) !important;
        }
        .hover\:bg-emerald-100:hover { background-color: rgba(14, 124, 123, 0.25) !important; }
        .hover\:border-emerald-200:hover { border-color: rgba(14, 124, 123, 0.45) !important; }
        .focus\:ring-emerald-500:focus, .focus\:ring-emerald-100:focus {
          --tw-ring-color: rgba(14, 124, 123, 0.35) !important;
        }
        .focus\:border-emerald-300:focus { border-color: rgba(14, 124, 123, 0.55) !important; }
        .file\:bg-emerald-50::file-selector-button {
          background-color: rgba(14, 124, 123, 0.12) !important;
          color: var(--petrol-green) !important;
        }
        .file\:text-emerald-700::file-selector-button {
          color: var(--petrol-green) !important;
        }
        .text-emerald-700.font-medium:hover { color: var(--petrol-green) !important; }
        @media print {
          @page { size: A4 ${pdfOrientation === "landscape" ? "landscape" : "portrait"}; margin: 14mm; }
          .sticky { display: none !important; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .bg-emerald-50 { background-color: rgba(14, 124, 123, 0.12) !important; }
          .bg-emerald-100 { background-color: rgba(14, 124, 123, 0.2) !important; }
          .bg-blue-50 { background-color: rgba(0, 59, 70, 0.12) !important; }
          .bg-blue-100 { background-color: rgba(0, 59, 70, 0.18) !important; }
          .bg-blue-200 { background-color: rgba(0, 59, 70, 0.26) !important; }
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

function FluxoResumoCards({ items, columns = "grid grid-cols-1 sm:grid-cols-2 gap-2" }) {
  if (!items || items.length === 0) return null;
  return (
    <div className={columns}>
      {items.map((item) => (
        <div
          key={item.key}
          className={`theme-mini-card ${item.destaque ? "theme-mini-card--highlight" : ""}`}
        >
          <div className="text-[11px] uppercase tracking-wide font-semibold">{item.label}</div>
          <div className="text-base font-semibold">{brl(item.valor)}</div>
          <div
            className="text-[11px]"
            style={{ color: item.destaque ? "var(--petrol-green)" : "rgba(0, 59, 70, 0.65)" }}
          >
            {pct(item.percentual)} {item.contexto ? `do ${item.contexto}` : "do total"}
          </div>
          {item.detalhe ? (
            <div
              className="text-[11px]"
              style={{ color: item.destaque ? "rgba(14, 124, 123, 0.85)" : "rgba(0, 59, 70, 0.55)" }}
            >
              {item.detalhe}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="theme-card">
      <div className="theme-card__header">
        <h4 className="font-semibold tracking-tight text-[color:var(--petrol-blue)]">{title}</h4>
      </div>
      <div className="p-5 space-y-3">{children}</div>
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
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <input
        className="w-full px-3 py-2 rounded-xl border border-[rgba(0,59,70,0.2)] bg-white text-[color:var(--petrol-black)] focus:outline-none focus:ring-2 focus:ring-[rgba(14,124,123,0.35)] focus:border-[rgba(14,124,123,0.55)]"
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

function FileInput({ label, file, accept, helper, onFileChange }) {
  const handleChange = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) {
      onFileChange(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onFileChange({ name: selected.name, type: selected.type, dataUrl: reader.result });
    };
    reader.onerror = () => onFileChange(null);
    reader.readAsDataURL(selected);
    event.target.value = "";
  };

  return (
    <div className="space-y-2">
      <label className="block">
        <div className="text-xs text-gray-600 mb-1">{label}</div>
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="block w-full text-xs text-gray-600 file:mr-3 file:rounded-full file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-emerald-700 file:font-medium"
        />
      </label>
      {helper && <p className="text-[11px] text-gray-500">{helper}</p>}
      {file ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-xs text-gray-600">
            <span className="truncate pr-3">{file.name}</span>
            <button
              type="button"
              onClick={() => onFileChange(null)}
              className="text-emerald-700 font-medium hover:underline"
            >
              Remover
            </button>
          </div>
          {file.type?.startsWith("image/") ? (
            <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
              <img
                src={file.dataUrl}
                alt={file.name}
                className="w-full h-40 object-contain bg-slate-900/5"
              />
            </div>
          ) : (
            <p className="text-[11px] text-gray-500">Arquivo anexado pronto para o PDF.</p>
          )}
        </div>
      ) : null}
    </div>
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
    <div className={`theme-mini-card ${highlight ? "theme-mini-card--highlight" : ""}`}>
      <div className="text-xs text-gray-600 mb-1">{title}</div>
      <div className="text-lg font-bold text-[color:var(--petrol-blue)]">{value}</div>
      {subValue && <div className="text-[11px] text-gray-500 mt-1">{subValue}</div>}
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
