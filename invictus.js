/* =====================================================================
   PLACAR INVICTUS — lógica (não é preciso editar; configure em config.js)
   ===================================================================== */
(function () {
  "use strict";

  var CFG = window.INVICTUS_CONFIG;
  var canvas = document.getElementById("placar");
  var ctx = canvas.getContext("2d");
  var statusEl = document.getElementById("status");
  var params = new URLSearchParams(location.search);

  /* ---------------- Geometria da arte (pixels do fundo 1728x910) ---------------- */
  var LARG = 1728, ALT = 910;
  var COLS = [575, 900, 1228, 1549];          // centro: Meta, Realizado, Falta, Meta dia
  var COL_W = 295;                             // largura útil de cada célula
  var ROWS = [364, 446, 524, 603, 682];        // centro vertical de cada linha
  var CORES = { branco: "#ffffff", amarelo: "#fff21a", vermelho: "#ff2323", verde: "#35e05a" };
  var MESES = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO",
               "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];

  /* ---------------- Datas e dias úteis ---------------- */
  function hoje() {
    var p = params.get("data");
    if (p) { var a = p.split("-"); return new Date(+a[0], +a[1] - 1, +a[2]); }
    var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function iso(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function pascoa(ano) { // algoritmo de Meeus/Jones/Butcher
    var a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4,
        f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
        i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7,
        m = Math.floor((a + 11 * h + 22 * l) / 451), mes = Math.floor((h + l - 7 * m + 114) / 31),
        dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(ano, mes - 1, dia);
  }
  function feriados(ano) {
    var set = {};
    ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"]
      .forEach(function (md) { set[ano + "-" + md] = true; });
    var p = pascoa(ano);
    function mais(n) { var d = new Date(p); d.setDate(d.getDate() + n); set[iso(d)] = true; }
    mais(-2);                                  // Sexta-feira Santa
    if (CFG.considerarCarnaval) { mais(-48); mais(-47); }
    if (CFG.considerarCorpusChristi) { mais(60); }
    (CFG.feriadosExtras || []).forEach(function (s) { set[s] = true; });
    return set;
  }
  function calendario() {
    var h = hoje(), ano = h.getFullYear(), mes = h.getMonth();
    if (CFG.mesReferencia) { var a = CFG.mesReferencia.split("-"); ano = +a[0]; mes = +a[1] - 1; }
    var fer = feriados(ano), total = 0, decorridos = 0, restantes = 0;
    var ultimo = new Date(ano, mes + 1, 0).getDate();
    for (var dia = 1; dia <= ultimo; dia++) {
      var d = new Date(ano, mes, dia), sem = d.getDay();
      if (sem === 0 || sem === 6 || fer[iso(d)]) continue;
      total++;
      if (d < h || (CFG.contarHojeComoDecorrido && d.getTime() === h.getTime())) decorridos++;
      if (d >= h) restantes++;                 // dias úteis de hoje (inclusive) até o fim do mês
    }
    return { ano: ano, mes: mes, total: total, decorridos: decorridos, restantes: restantes, ultimo: ultimo };
  }
  function serialQlik(d) { // nº de dias desde 30/12/1899, como no Qlik
    return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 864e5);
  }
  function montarExpr(expr, cal) {
    var times = (CFG.times || []).map(function (t) { return "'" + t.replace(/'/g, "''") + "'"; }).join(",");
    var e = expr
      .replace(/@TIMES/g, times)
      .replace(/@ANO/g, cal.ano)
      .replace(/@MES/g, cal.mes + 1)
      .replace(/@INICIO/g, serialQlik(new Date(cal.ano, cal.mes, 1)))
      .replace(/@FIM/g, serialQlik(new Date(cal.ano, cal.mes, cal.ultimo)))
      .replace(/@HOJE/g, serialQlik(hoje()));
    return e.charAt(0) === "=" ? e : "=" + e;
  }

  /* ---------------- Formatação ---------------- */
  var fmtInt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  var fmtMoeda = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function fmt(v, formato) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    return formato === "moeda" ? "R$ " + fmtMoeda.format(v) : fmtInt.format(Math.round(v));
  }

  /* ---------------- Desenho ---------------- */
  var fundo = new Image();
  var fundoPronto = new Promise(function (ok) { fundo.onload = ok; });
  fundo.src = "fundo.png";

  function textoAjustado(txt, x, y, largura, tamanho, cor) {
    var t = tamanho;
    do { ctx.font = "600 " + t + "px Oswald"; t -= 1; } while (ctx.measureText(txt).width > largura && t > 16);
    ctx.fillStyle = "rgba(0,0,0,.85)";
    ctx.fillText(txt, x + 2, y + 3);            // sombra
    ctx.fillStyle = cor;
    ctx.fillText(txt, x, y);
  }

  function desenharTitulo(texto) {
    ctx.save();
    var t = 96;
    do { ctx.font = "700 " + t + "px Oswald"; t -= 2; } while (ctx.measureText(texto).width > 1040);
    ctx.translate(815, 113);
    ctx.transform(1, 0, -0.2, 1, 0, 0);         // itálico
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    var g = ctx.createLinearGradient(0, -78, 0, 4);
    g.addColorStop(0, "#fff7c2"); g.addColorStop(0.35, "#ffd84a");
    g.addColorStop(0.6, "#f0a800"); g.addColorStop(1, "#a86400");
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(0,0,0,.9)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
    ctx.lineWidth = 9; ctx.strokeStyle = "#1a0e00"; ctx.strokeText(texto, 0, 0);
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 3; ctx.strokeStyle = "#5a3500"; ctx.strokeText(texto, 0, 0);
    ctx.fillStyle = g; ctx.fillText(texto, 0, 0);
    ctx.restore();
  }

  function desenhar(dados, cal) {
    ctx.drawImage(fundo, 0, 0, LARG, ALT);
    desenharTitulo("RESULTADOS PARCIAIS -- " + MESES[cal.mes]);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    dados.forEach(function (d, i) {
      var y = ROWS[i];
      var falta = (d.meta == null || d.realizado == null) ? null : d.meta - d.realizado;
      // Meta dia = o que falta ÷ dias úteis restantes (seg-sex, sem feriados, contando hoje)
      var metaDia = null;
      if (falta != null && falta > 0 && cal.restantes > 0) {
        metaDia = falta / cal.restantes;
        if (d.formato !== "moeda") metaDia = Math.ceil(metaDia);
      }

      textoAjustado(fmt(d.meta, d.formato), COLS[0], y, COL_W, 52, CORES.branco);
      textoAjustado(fmt(d.realizado, d.formato), COLS[1], y, COL_W, 52, CORES.amarelo);
      if (falta != null && falta <= 0) {
        textoAjustado("META BATIDA!", COLS[2], y, COL_W, 46, CORES.verde);
        textoAjustado("—", COLS[3], y, COL_W, 52, CORES.verde);
      } else {
        textoAjustado(fmt(falta, d.formato), COLS[2], y, COL_W, 52, CORES.vermelho);
        textoAjustado(fmt(metaDia, d.formato), COLS[3], y, COL_W, 52, CORES.branco);
      }
    });

    // rodapé com data de atualização
    var agora = new Date();
    var rod = "Atualizado em " + (window.__atualizadoEm ||
      (agora.toLocaleDateString("pt-BR") + " às " + agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }))) +
      "  ·  " + cal.restantes + " dias úteis restantes de " + cal.total;
    ctx.font = "600 17px Oswald";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(0,0,0,.7)"; ctx.fillText(rod, 19, 903);
    ctx.fillStyle = "#d8c07a"; ctx.fillText(rod, 18, 902);
  }

  /* ---------------- Estado e renderização ---------------- */
  var cal = calendario();
  var estado = CFG.indicadores.map(function (ind) {
    return {
      formato: ind.formato,
      meta: typeof ind.meta === "number" ? ind.meta : null,
      partes: new Array(ind.realizado.length).fill(null),
      realizado: null
    };
  });
  var agendado = false;
  function render() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(function () {
      agendado = false;
      estado.forEach(function (e) {
        e.realizado = e.partes.some(function (p) { return p === null; }) ? null :
          e.partes.reduce(function (a, b) { return a + b; }, 0);
      });
      desenhar(estado, cal);
    });
  }
  function status(msg, erro) {
    statusEl.textContent = msg;
    statusEl.className = erro ? "erro" : "";
  }

  /* ---------------- Conexão com o Qlik Cloud (@qlik/api + OAuth) ---------------- */
  function conectarQlik() {
    var Q = window.QlikAPI;
    Q.setDefaultHostConfig({
      authType: "oauth2",
      host: CFG.qlik.host,
      clientId: CFG.qlik.clientId,
      redirectUri: CFG.qlik.redirectUri ||
        (location.origin + location.pathname.replace(/\/$/, "/index.html")),
      accessTokenStorage: "local",
      autoRedirect: true
    });

    // agrupa todas as consultas por app, para abrir cada app uma vez só
    var porApp = {};
    function registrar(appId, expr, aplicar) {
      (porApp[appId] = porApp[appId] || []).push({ expr: expr, aplicar: aplicar });
    }
    CFG.indicadores.forEach(function (ind, i) {
      ind.realizado.forEach(function (f, j) {
        registrar(f.app, f.expr, function (v) { estado[i].partes[j] = v; });
      });
      var chaveMes = cal.ano + "-" + String(cal.mes + 1).padStart(2, "0");
      var fixa = ind.metaFixaPorMes && ind.metaFixaPorMes[chaveMes];
      if (fixa != null) {
        estado[i].meta = fixa;
      } else if (ind.meta && typeof ind.meta === "object") {
        registrar(ind.meta.app, ind.meta.expr, function (v) {
          if (v == null) { estado[i].meta = null; return; }
          var m = v * (ind.meta.fator || 1);
          estado[i].meta = ind.formato === "moeda" ? m : Math.round(m);
        });
      }
    });

    async function consultarApp(appId, itens) {
      var sessao = Q.openAppSession({ appId: appId, identity: "placar-invictus" });
      try {
        var doc = await sessao.getDoc();
        for (var k = 0; k < itens.length; k++) {
          var r = await doc.evaluateEx(montarExpr(itens[k].expr, cal).replace(/^=/, ""));
          itens[k].aplicar(r && r.qIsNumeric && !isNaN(r.qNumber) ? r.qNumber : null);
        }
      } finally {
        try { await sessao.close(); } catch (e) { /* ignora */ }
      }
    }

    var rodando = false;
    async function ciclo() {
      if (rodando) return;
      rodando = true;
      status("Buscando dados no Qlik…");
      var erros = [];
      await Promise.all(Object.keys(porApp).map(function (id) {
        return consultarApp(id, porApp[id]).catch(function (e) {
          erros.push("app " + id.slice(0, 8) + "…: " + (e && e.message ? e.message : e));
        });
      }));
      render();
      rodando = false;
      if (erros.length) status("Erro: " + erros.join(" | "), true);
      else status("Atualizado às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) +
                  " · próxima em " + CFG.buscarDadosMinutos + " min");
    }

    ciclo();
    setInterval(ciclo, (CFG.buscarDadosMinutos || 5) * 60000);
  }

  function aplicarMetasFixas() {
    var chaveMes = cal.ano + "-" + String(cal.mes + 1).padStart(2, "0");
    CFG.indicadores.forEach(function (ind, i) {
      var fixa = ind.metaFixaPorMes && ind.metaFixaPorMes[chaveMes];
      if (fixa != null) estado[i].meta = fixa;
    });
  }

  /* ---------------- Dados publicados pelo programa (criptografados com a senha do painel) ---------------- */
  var CHAVE_SENHA = "placarInvictusSenha";
  var senhaAtual = null;
  function b64(x) { return Uint8Array.from(atob(x), function (c) { return c.charCodeAt(0); }); }
  async function decifrar(p, senha) {
    var base = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveKey"]);
    var k = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(p.salt), iterations: p.iter, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    var claro = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(p.iv) }, k, b64(p.dados));
    return JSON.parse(new TextDecoder().decode(claro));
  }
  function telaSenha(erro) {
    var d = document.getElementById("cofre");
    if (!d) { d = document.createElement("div"); d.id = "cofre"; document.body.appendChild(d); }
    d.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;z-index:9";
    d.innerHTML = '<form id="fSenha" style="background:#15110a;border:1px solid #b8860b;border-radius:14px;padding:24px;width:320px;font-family:system-ui;color:#eee">' +
      '<div style="font-size:18px;font-weight:700;color:#ffd84a;margin-bottom:6px">🔒 Placar Invictus</div>' +
      '<div style="font-size:12px;color:#bbb;margin-bottom:14px">Digite a senha do painel.</div>' +
      '<input id="cSenha" type="password" style="width:100%;box-sizing:border-box;padding:9px;border-radius:8px;border:1px solid #555;background:#000;color:#fff">' +
      '<label style="display:flex;gap:6px;font-size:12px;margin:10px 0 14px"><input id="cLembrar" type="checkbox"> Lembrar neste computador</label>' +
      '<button style="width:100%;padding:9px;border:0;border-radius:8px;background:linear-gradient(#ffe27a,#d99a00);font-weight:700">Entrar</button>' +
      (erro ? '<div style="color:#ff6b6b;font-size:12px;margin-top:10px">' + erro + '</div>' : '') + '</form>';
    document.getElementById("fSenha").onsubmit = function (ev) {
      ev.preventDefault();
      var s = document.getElementById("cSenha").value;
      if (document.getElementById("cLembrar").checked) { try { localStorage.setItem(CHAVE_SENHA, s); } catch (e) {} }
      abrirCofre(s);
    };
    setTimeout(function () { var c = document.getElementById("cSenha"); if (c) c.focus(); }, 50);
  }
  async function abrirCofre(senha) {
    var pacote, dados;
    try {
      var r = await fetch("dados.enc.json?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      pacote = await r.json();
    } catch (e) { telaSenha("Os números ainda não foram publicados pelo programa. Tente de novo mais tarde."); return; }
    try { dados = await decifrar(pacote, senha); }
    catch (e) { try { localStorage.removeItem(CHAVE_SENHA); } catch (x) {} senhaAtual = null; telaSenha("Senha incorreta."); return; }
    senhaAtual = senha;
    var c = document.getElementById("cofre"); if (c) c.remove();
    cal = calendario();
    cal.mes = dados.mes - 1; cal.ano = dados.ano;
    dados.indicadores.forEach(function (ind, i) {
      if (!estado[i]) return;
      estado[i].meta = ind.meta;
      estado[i].partes = [ind.realizado];
    });
    window.__atualizadoEm = dados.atualizado;
    status("Atualizado em " + dados.atualizado + " · a página busca a versão nova a cada 10 min");
    render();
  }
  function modoCofre() {
    var salva = null;
    try { salva = localStorage.getItem(CHAVE_SENHA); } catch (e) {}
    if (salva) abrirCofre(salva); else telaSenha();
    setInterval(function () { if (senhaAtual) abrirCofre(senhaAtual); }, 10 * 60 * 1000);
  }

  function modoDemo() {
    aplicarMetasFixas();
    CFG.indicadores.forEach(function (ind, i) {
      estado[i].partes = [ind.demo];
      if (estado[i].meta == null && ind.demoMeta != null) estado[i].meta = ind.demoMeta;
    });
    status("Modo demonstração (dados de exemplo)");
    render();
  }

  /* ---------------- Botões ---------------- */
  function nomeArquivo() {
    return "invictus-parcial-" + iso(new Date()) + ".png";
  }
  document.getElementById("btnBaixar").onclick = function () {
    var a = document.createElement("a");
    a.download = nomeArquivo();
    a.href = canvas.toDataURL("image/png");
    a.click();
  };
  document.getElementById("btnCopiar").onclick = function () {
    canvas.toBlob(function (blob) {
      if (!navigator.clipboard || !window.ClipboardItem) {
        status("Seu navegador não permite copiar; use Baixar PNG.", true); return;
      }
      navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
        .then(function () { status("Imagem copiada! Cole com Ctrl+V."); })
        .catch(function (e) { status("Falha ao copiar: " + e, true); });
    }, "image/png");
  };

  /* ---------------- Início ---------------- */
  if (CFG.recarregarPaginaMinutos > 0) {
    setTimeout(function () { location.reload(); }, CFG.recarregarPaginaMinutos * 60000);
  }
  var fontes = Promise.all([
    document.fonts.load("600 40px Oswald"),
    document.fonts.load("700 80px Oswald")
  ]).catch(function () {});

  Promise.all([fundoPronto, fontes]).then(function () {
    render();                                   // desenha o fundo já com metas
    if (params.get("demo") === "1") modoDemo(); else modoCofre();
  });
})();
