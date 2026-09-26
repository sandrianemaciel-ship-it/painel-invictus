/* =====================================================================
   PLACAR INVICTUS — CONFIGURAÇÃO (versão GitHub Pages + login do Qlik)
   Este é o ÚNICO arquivo que você precisa editar.
   Não há senha nem chave aqui: cada pessoa entra com a própria conta do Qlik.
   ===================================================================== */
window.INVICTUS_CONFIG = {

  /* ---------- CONEXÃO COM O QLIK CLOUD ---------- */
  qlik: {
    host: "dellasense.us.qlikcloud.com",
    clientId: "COLE-AQUI-O-CLIENT-ID-DO-OAUTH",   // fornecido pela TI (Administração → Integração → OAuth)
    redirectUri: null   // null = endereço desta página terminando em /index.html
  },

  /* ---------- CALENDÁRIO ---------- */
  mesReferencia: null,           // null = mês atual. Para fixar: "2026-09"
  contarHojeComoDecorrido: true,
  considerarCarnaval: true,
  considerarCorpusChristi: true,
  feriadosExtras: [              // "AAAA-MM-DD"
  ],

  /* ---------- ATUALIZAÇÃO ---------- */
  buscarDadosMinutos: 10,
  recarregarPaginaMinutos: 240,

  /* ---------- TIMES (campo "Time" do Qlik) — vira @TIMES nas expressões ---------- */
  times: [
    "Líder de Vendas Sandriane",
    "Líder de Vendas Sandriane - INATIVO",
    "Líder de Vendas Leonardo",
    "Líder de Vendas Leonardo - Inativo",
    "Líder de Vendas Jessica",
    "Líder de Vendas Jessica - INATIVO",
    "Líder de Vendas Luisa Tiscoski Abreu",
    "Líder de Vendas Luisa Tiscoski Abreu - INATIVO",
    "Líder de Vendas Fabio",
    "Líder de Vendas Fabio - INATIVO",
    "Líder de Vendas Balboa",
    "Líder de Vendas Balboa  - Inativos"      // dois espaços antes do hífen, como no Qlik
  ],

  /* ---------- INDICADORES (na ordem da imagem) ----------
     meta: número fixo (atualize todo mês) OU { app, expr, fator } buscada no Qlik
     metaFixaPorMes: { "AAAA-MM": valor } substitui a meta naquele mês
     Marcadores: @ANO @MES @INICIO @FIM @HOJE @TIMES
     ------------------------------------------------------ */
  indicadores: [
    {
      nome: "Ligações",                 // pasta Pontuação de Telefonia
      formato: "inteiro",
      meta: 10500,                      // <- informe todo mês
      demo: 7772.5,
      realizado: [{
        app: "c4afa8c1-1f3b-4444-b9f8-9f4d82e516e1",
        expr: "Sum({<Ano={@ANO}, Mês={\"$(=Month(MakeDate(@ANO,@MES)))\"}, Time={@TIMES}>} [Pontuacao Ligacao])"
      }]
    },
    {
      nome: "Vendas em geral",          // pasta Vendas/Faturamento Times - Agrupada
      formato: "moeda",
      meta: {
        app: "c4afa8c1-1f3b-4444-b9f8-9f4d82e516e1",
        expr: "Sum({<Ano={@ANO}, Mês={\"$(=Month(MakeDate(@ANO,@MES)))\"}, Time={@TIMES}>} Valor_Meta)"
      },
      demo: 4921769.59, demoMeta: 9600000,
      realizado: [{
        app: "c4afa8c1-1f3b-4444-b9f8-9f4d82e516e1",
        expr: "Sum({<Ano={@ANO}, Mês={\"$(=Month(MakeDate(@ANO,@MES)))\"}, Time={@TIMES}, COD_TIPO_REP-={'Z2'}>} VL_TOTAL)"
      }]
    },
    {
      nome: "Vendas Ortho",
      formato: "moeda",
      meta: 800000,                     // <- informe todo mês
      demo: 163613.23,
      realizado: [{
        app: "c4afa8c1-1f3b-4444-b9f8-9f4d82e516e1",
        expr: "Sum({<Ano={@ANO}, Mês={\"$(=Month(MakeDate(@ANO,@MES)))\"}, Time={@TIMES}, LINHA_ITEM={'ORTHOCARE'}, COD_TIPO_REP-={'Z2'}>} VL_TOTAL)"
      }]
    },
    {
      nome: "Clientes que inativam",    // pasta Lista de Clientes (Data de Inativação no mês)
      formato: "inteiro",
      meta: {                           // 70% dos grupos com data de inativação no mês
        app: "c4afa8c1-1f3b-4444-b9f8-9f4d82e516e1",
        fator: 0.7,
        expr: "Count(DISTINCT {<Ano=, Mês=, Time={@TIMES}, DT_INATIVACAO={\">=$(=Date(MakeDate(@ANO,@MES,1)))<=$(=Date(MonthEnd(MakeDate(@ANO,@MES))))\"}>} CODGRUPO)"
      },
      metaFixaPorMes: { "2026-09": 175 },   // <- recomendo fixar todo mês (veja LEIA-ME)
      demo: 28,
      realizado: [{                     // grupos da base que fizeram pedido no mês
        app: "c4afa8c1-1f3b-4444-b9f8-9f4d82e516e1",
        expr: "Count(DISTINCT {<Ano=, Mês=, Time={@TIMES}, DT_INATIVACAO={\">=$(=Date(MakeDate(@ANO,@MES,1)))<=$(=Date(MonthEnd(MakeDate(@ANO,@MES))))\"}, CODGRUPO=P({<TIPO_OPER={'11.Pedidos'}, Ano={@ANO}, Mês={\"$(=Month(MakeDate(@ANO,@MES)))\"}, SITUACAO_PEDIDO-={'TOTALMENTE CANCELADO'}>} CODGRUPO)>} CODGRUPO)"
      }]
    },
    {
      nome: "Clientes novos",           // pasta Análise de 1º Faturamento
      formato: "inteiro",
      meta: 120,                        // <- informe todo mês
      demo: 62,
      realizado: [{
        app: "c4afa8c1-1f3b-4444-b9f8-9f4d82e516e1",
        expr: "Count({<Ano={@ANO}, Mês={\"$(=Month(MakeDate(@ANO,@MES)))\"}, seqfat={'1'}, Time={@TIMES}>} DISTINCT CODGRUPO)"
      }]
    }
  ]
};
