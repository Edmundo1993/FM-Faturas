// ===== Util =====
const $ = (id) => document.getElementById(id);
const KZ = new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' });

// ===== Estado =====
let itens = []; // {ref, descricao, qtd, preco, descPct, taxaPct, regime}

// ===== Cálculos =====
const calcLinha = (l) => {
  const qtd = +l.qtd || 0;
  const pu = +l.preco || 0;
  const d  = (+l.descPct || 0) / 100;
  const t  = (+l.taxaPct || 0) / 100;
  const base = qtd * pu * (1 - d);
  return { base, total: base * (1 + t) };
};

const sumTotals = () => {
  const iliq = itens.reduce((acc, l) => acc + calcLinha(l).total, 0);
  const descFin = +$('desconto_fin').value || 0;
  const imp = +$('tax_valor').value || 0;
  const total = Math.max(0, iliq - descFin + imp);
  $('sum_iliquido_view').textContent = KZ.format(iliq);
  $('desconto_fin_view').textContent = KZ.format(descFin);
  $('sum_impostos_view').textContent = KZ.format(imp);
  $('sum_total_view').textContent = 'KZ ' + total.toFixed(2).replace('.', ',');
  return { iliq, descFin, imp, total };
};

// ===== Render =====
const renderItensTabela = () => {
  const tbody = $('itens_tbody');
  tbody.innerHTML = '';
  itens.forEach((l) => {
    const { total } = calcLinha(l);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${l.ref || ''}</td>
      <td>${l.descricao || ''}${l.regime ? `<div class="sub">${l.regime}</div>` : ''}</td>
      <td class="col-qtd">${l.qtd || 0}</td>
      <td class="col-prec">${KZ.format(+l.preco || 0)}</td>
      <td class="col-disc">${(+l.descPct || 0).toFixed(2)}</td>
      <td class="col-taxa">${(+l.taxaPct || 0).toFixed(2)}</td>
      <td class="col-tot">${KZ.format(total)}</td>
    `;
    tbody.appendChild(tr);
  });
};

const renderItensForm = () => {
  const cont = $('itens_form');
  cont.innerHTML = '';
  itens.forEach((l, i) => {
    const row = document.createElement('div');
    row.className = 'item';
    row.innerHTML = `
      <input placeholder="Ref" value="${l.ref || ''}" data-i="${i}" data-k="ref">
      <input placeholder="Descrição" value="${l.descricao || ''}" data-i="${i}" data-k="descricao">
      <input type="number" step="0.01" placeholder="Qtd" value="${l.qtd || 0}" data-i="${i}" data-k="qtd">
      <input type="number" step="0.01" placeholder="Preço" value="${l.preco || 0}" data-i="${i}" data-k="preco">
      <input type="number" step="0.01" placeholder="Desc%" value="${l.descPct || 0}" data-i="${i}" data-k="descPct">
      <input type="number" step="0.01" placeholder="Taxa%" value="${l.taxaPct || 0}" data-i="${i}" data-k="taxaPct">
      <button type="button" data-del="${i}">🗑</button>
    `;
    cont.appendChild(row);
  });

  cont.querySelectorAll('input').forEach((inp) => {
    inp.addEventListener('input', (e) => {
      const i = +e.target.dataset.i;
      const k = e.target.dataset.k;
      itens[i][k] = e.target.value;
      updateAll();
    });
  });

  cont.querySelectorAll('button[data-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.del;
      itens.splice(i, 1);
      renderItensForm();
      updateAll();
    });
  });
};

// ===== UI Mirrors =====
const mirror = (inputId, viewId, tr) => {
  const apply = () => {
    const v = $(inputId).value;
    $(viewId).textContent = tr ? tr(v) : (v || (inputId === 'doc_obs' ? '-' : ''));
  };
  $(inputId).addEventListener('input', apply);
  apply();
};

// ===== Ações =====
const enviarWhatsApp = () => {
  const fone = ($('cli_tel').value || '').replace(/\D/g, '');
  if (!fone) return alert('Informe o telefone do cliente com DDI.');
  const tot = sumTotals().total;
  const num = $('doc_num').value || '';
  const msg = `Factura Proforma ${num}%0AValor total: ${KZ.format(tot)}%0AObrigado pela preferência.`;
  window.open('https://wa.me/' + fone + '?text=' + msg, '_blank');
};

const enviarEmail = () => {
  const para = $('cli_email').value;
  const cc = $('cli_cc').value;
  if (!para) return alert('Informe o e-mail do cliente.');
  const num = $('doc_num').value || '';
  const assunto = 'Factura Proforma ' + num;
  const corpo = `Segue a factura proforma ${num}. Total: ${$('sum_total_view').textContent}.`;
  const url = `mailto:${encodeURIComponent(para)}?subject=${encodeURIComponent(assunto)}&cc=${encodeURIComponent(cc)}&body=${encodeURIComponent(corpo)}`;
  window.location.href = url;
};

const exportarJSON = () => {
  const data = {
    empresa: { nome: $('empresa_nome').value, nif: $('empresa_nif').value, tel: $('empresa_tel').value, email: $('empresa_email').value, end: $('empresa_end').value },
    documento: { num: $('doc_num').value, emissao: $('doc_emissao').value, exp: $('doc_exp').value, vendedor: $('doc_vendedor').value, obs: $('doc_obs').value },
    cliente: { nome: $('cli_nome').value, nif: $('cli_nif').value, tel: $('cli_tel').value, end: $('cli_end').value, email: $('cli_email').value, cc: $('cli_cc').value },
    itens,
    desconto_fin: +$('desconto_fin').value || 0,
    impostos: { desc: $('tax_desc').value, taxa: +$('tax_taxa').value || 0, base: +$('tax_base').value || 0, valor: +$('tax_valor').value || 0 },
    banco: { nome: $('banco_nome').value, modalidade: $('banco_modalidade').value, iban: $('banco_iban').value, titular: $('banco_titular').value }
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (data.documento.num || 'proforma') + '.json';
  a.click();
};

const importarJSON = (file) => {
  const r = new FileReader();
  r.onload = () => {
    try {
      const o = JSON.parse(r.result);
      $('empresa_nome').value = o.empresa?.nome || ''; $('empresa_nif').value = o.empresa?.nif || ''; $('empresa_tel').value = o.empresa?.tel || ''; $('empresa_email').value = o.empresa?.email || ''; $('empresa_end').value = o.empresa?.end || '';
      $('doc_num').value = o.documento?.num || ''; $('doc_emissao').value = o.documento?.emissao || ''; $('doc_exp').value = o.documento?.exp || ''; $('doc_vendedor').value = o.documento?.vendedor || ''; $('doc_obs').value = o.documento?.obs || '';
      $('cli_nome').value = o.cliente?.nome || ''; $('cli_nif').value = o.cliente?.nif || ''; $('cli_tel').value = o.cliente?.tel || ''; $('cli_end').value = o.cliente?.end || ''; $('cli_email').value = o.cliente?.email || ''; $('cli_cc').value = o.cliente?.cc || '';
      $('desconto_fin').value = o.desconto_fin || 0;
      $('tax_desc').value = o.impostos?.desc || ''; $('tax_taxa').value = o.impostos?.taxa || 0; $('tax_base').value = o.impostos?.base || 0; $('tax_valor').value = o.impostos?.valor || 0;
      $('banco_nome').value = o.banco?.nome || ''; $('banco_modalidade').value = o.banco?.modalidade || ''; $('banco_iban').value = o.banco?.iban || ''; $('banco_titular').value = o.banco?.titular || '';
      // Compatibilidade: mapeia itens antigos (desc/texto conflitantes)
      const raw = o.itens || [];
      itens = raw.map(x => ({
        ref: x.ref || '',
        descricao: x.descricao ?? (typeof x.desc === 'string' ? x.desc : ''),
        qtd: +x.qtd || 0,
        preco: +x.preco || 0,
        descPct: (typeof x.desc === 'number' ? x.desc : (x.descPct || 0)),
        taxaPct: +((x.taxaPct ?? x.taxa) || 0),
        regime: x.regime || 'Regime de Exclusão'
      }));
      renderItensForm(); updateAll();
    } catch (e) {
      alert('Arquivo inválido.');
    }
  };
  r.readAsText(file);
};

// ===== Logo =====
const setLogoSrc = (src) => {
  $('logo_img').src = src || '';
  try { localStorage.setItem('proforma_logo', src || ''); } catch {}
};

// ===== Init =====
window.addEventListener('DOMContentLoaded', () => {
  // Datas padrão
  const hoje = new Date();
  const fmt = d => d.toISOString().slice(0, 10);
  $('doc_emissao').value = fmt(hoje);
  $('doc_exp').value = fmt(new Date(hoje.getTime() + 7 * 86400000));

  // Exemplo (igual à foto)
  const ex = [
    { ref:'#2', descricao:'Cabo utp cat 6', qtd:2, preco:60531.49 },
    { ref:'#2', descricao:'Camera com som color vu', qtd:4, preco:29237.92 },
    { ref:'#2', descricao:'Camera sem som hikvision', qtd:4, preco:21318.00 },
    { ref:'#2', descricao:'Conectores p4 macho', qtd:8, preco:1000.00 },
    { ref:'#2', descricao:'Fonte de alimentação', qtd:1, preco:14312.70 },
    { ref:'#2', descricao:'Vídeo balum', qtd:8, preco:3297.10 },
    { ref:'#2', descricao:'Dvr 8 canais', qtd:1, preco:89321.00 },
    { ref:'#3', descricao:'Caixa de derivação', qtd:8, preco:1980.00 },
    { ref:'#2', descricao:'Mão de obra', qtd:1, preco:232000.00 },
  ];
  itens = ex.map(x => ({ ...x, descPct: 0, taxaPct: 0, regime: 'Regime de Exclusão' }));

  // Binds espelho
  [
    ['empresa_nome','empresa_nome_view'],
    ['empresa_nif','empresa_nif_view'],
    ['empresa_tel','empresa_tel_view'],
    ['empresa_email','empresa_email_view'],
    ['empresa_end','empresa_end_view'],
    ['doc_num','doc_num_view'],
    ['doc_vendedor','doc_vendedor_view'],
    ['doc_obs','doc_obs_view'],
    ['cli_nome','cli_nome_view'],
    ['cli_nif','cli_nif_view'],
    ['cli_tel','cli_tel_view'],
    ['cli_end','cli_end_view'],
    ['tax_desc','tax_desc_view']
  ].forEach(([a,b]) => mirror(a,b));

  // Troca datas
  const fmtView = (v) => v ? v.split('-').reverse().join('-') : '-';
  $('doc_emissao').addEventListener('input', () => $('doc_emissao_view').textContent = fmtView($('doc_emissao').value));
  $('doc_exp').addEventListener('input', () => $('doc_exp_view').textContent = fmtView($('doc_exp').value));
  $('doc_emissao_view').textContent = fmtView($('doc_emissao').value);
  $('doc_exp_view').textContent = fmtView($('doc_exp').value);

  // Eventos de botões (IDs explícitos)
  $('add_item').addEventListener('click', () => { itens.push({ ref:'#2', descricao:'', qtd:1, preco:0, descPct:0, taxaPct:0, regime:'Regime de Exclusão' }); renderItensForm(); updateAll(); });
  $('btnPrint').addEventListener('click', () => window.print());
  $('btnWhats').addEventListener('click', enviarWhatsApp);
  $('btnEmail').addEventListener('click', enviarEmail);
  $('btnExport').addEventListener('click', exportarJSON);
  $('btnImport').addEventListener('click', () => $('fileImport').click());
  $('fileImport').addEventListener('change', (e) => importarJSON(e.target.files[0]));

  // Recalcular quando valores de totais mudarem
  ['desconto_fin','tax_valor','tax_taxa','tax_base'].forEach(id => $(id).addEventListener('input', () => updateAll()));

  // Logo: recupera salvo e permite arquivo/URL
  try {
    const saved = localStorage.getItem('proforma_logo');
    if (saved) $('logo_img').src = saved;
  } catch {}
  $('logo_file').addEventListener('change', (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => setLogoSrc(r.result);
    r.readAsDataURL(f);
  });
  $('btnLogoURL').addEventListener('click', () => {
    const u = $('logo_url').value.trim();
    if (!u) return alert('Informe a URL do logo.');
    setLogoSrc(u);
  });
  $('btnLogoReset').addEventListener('click', () => setLogoSrc(''));

  // Primeira renderização
  renderItensForm();
  updateAll();
});

// ===== Ciclo principal =====
const updateAll = () => {
  renderItensTabela();
  // Atualiza blocos de impostos e totais
  $('tax_taxa_view').textContent = (+$('tax_taxa').value || 0).toFixed(2);
  $('tax_base_view').textContent = (+$('tax_base').value || 0).toFixed(2);
  $('tax_valor_view').textContent = (+$('tax_valor').value || 0).toFixed(2);
  sumTotals();
};
