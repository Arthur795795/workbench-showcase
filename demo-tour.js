(function () {
  'use strict';

  var SEEN_KEY = 'workbench-demo-tour-seen-v2';
  var step = -1;
  var ready = false;
  var originalSearch = '';
  var originalOwner = '';
  var locked = new Map();
  var highlight = null;
  var stage, evidence, panel, welcome;
  var titles = ['把分散信息变成今日行动', '自动找出需要关注的客户', '让异常跟进有统一的清单', '让处理进展可以接续和追踪', '把日常记录汇总成周报'];

  function escape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char];
    });
  }

  function element(id) { return document.getElementById(id); }
  function source() { return window.WorkbenchDemo.tourSource; }
  function mainRow() {
    var data = source();
    return data.rows.find(function (row) { return row.reviewId === data.mainReviewId; }) || data.rows.find(function (row) { return row.recognitionRate < 80; });
  }
  function setSeen() { try { localStorage.setItem(SEEN_KEY, '1'); } catch (error) { /* Viewing remains available without storage. */ } }
  function hasSeen() { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (error) { return false; } }
  function button(id, text, primary) { return '<button type="button" id="' + id + '" class="demo-tour-button' + (primary ? ' primary' : '') + '">' + text + '</button>'; }

  function selectViewWithoutScroll(view) {
    var business = element('business');
    var originalScrollIntoView = business.scrollIntoView;
    business.scrollIntoView = function () {};
    try { document.querySelector('.side-nav [data-view-target="' + view + '"]').click(); }
    finally { business.scrollIntoView = originalScrollIntoView; }
  }

  function switchPane(name) {
    selectViewWithoutScroll('crm');
    document.querySelector('.crm-main-tabs [data-crm-pane="' + name + '"]').click();
  }

  function updateFilter(id, value, eventName) {
    var control = element(id);
    control.value = value;
    control.dispatchEvent(new Event(eventName, {bubbles: true}));
  }

  function lockRows() {
    document.querySelectorAll('#crmAbnormalTableBody textarea, #crmAbnormalTableBody select, #crmAbnormalTableBody input, #crmAbnormalTableBody button').forEach(function (control) {
      if (locked.has(control)) return;
      var textarea = control.tagName === 'TEXTAREA';
      locked.set(control, {textarea: textarea, value: textarea ? control.readOnly : control.disabled});
      if (textarea) control.readOnly = true;
      else control.disabled = true;
    });
  }

  function unlockRows() {
    locked.forEach(function (value, control) {
      if (value.textarea) control.readOnly = value.value;
      else control.disabled = value.value;
    });
    locked.clear();
  }

  function mark(target) {
    if (highlight) highlight.classList.remove('demo-tour-highlight');
    highlight = typeof target === 'string' ? document.querySelector(target) : target;
    if (highlight) highlight.classList.add('demo-tour-highlight');
  }

  function showEvidence(html, onlyEvidence) {
    evidence.innerHTML = html;
    evidence.hidden = false;
    stage.querySelectorAll('.crm-pane').forEach(function (pane) { pane.hidden = !!onlyEvidence; });
  }

  function hideEvidence() {
    evidence.hidden = true;
    stage.querySelectorAll('.crm-pane').forEach(function (pane) { pane.hidden = false; });
  }

  function sourceTable() {
    var data = source();
    return '<h3>已导入的全量使用数据</h3><p>来源是系统导出的客户使用数据。运营人员完成导入后，Workbench 按商品数量识别率低于 80% 筛选；这里查看已经准备好的虚构批次。</p>' +
      '<div class="demo-evidence-summary"><div><strong>' + data.totalCount + '</strong><span>全量客户使用记录</span></div><div><strong>' + data.abnormalCount + '</strong><span>进入异常盘点</span></div><div><strong>' + (data.totalCount - data.abnormalCount) + '</strong><span>未进入异常盘点</span></div></div>' +
      '<p>统计周期：' + escape(data.periodStart) + ' 至 ' + escape(data.periodEnd) + '。恰好 80% 的记录不满足“低于 80%”条件。</p>' +
      '<div class="demo-evidence-scroll"><table aria-label="虚构全量客户使用数据"><thead><tr><th>客户</th><th>商品数量识别率</th><th>订单数</th><th>筛选结果</th></tr></thead><tbody id="demoTourImportRows">' + data.rows.map(function (row) {
        var low = row.recognitionRate < data.threshold;
        return '<tr data-demo-tour-import-row><td>' + escape(row.customerName) + '</td><td class="' + (low ? 'demo-low-rate' : 'demo-normal-rate') + '">' + Number(row.recognitionRate).toFixed(1) + '%</td><td>' + row.orderCount + '</td><td>' + (low ? '进入异常盘点' : '不进入异常盘点') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function savedCard(row) {
    return '<h3>一条记录，接续整个处理过程</h3><p>把异常原因、已做措施、下一步应对和相关工单放在一起，同事接手时不用重新翻找聊天和表格。</p><dl>' +
      '<div><dt>原因与已做措施</dt><dd>知道问题为什么发生，也知道已经处理到哪里。</dd></div>' +
      '<div><dt>下一步应对与相关工单</dt><dd>明确后续动作；属于 Bug 的问题关联工单，方便持续跟进。</dd></div></dl>' +
      '<details id="demoTourRecordDetails"><summary>查看一条已填写的示例记录</summary><p>' + escape(row.customerName) + '。以下内容来自同一条已保存的虚构记录。</p><dl>' +
      '<div><dt>异常原因 / 今日需关注问题</dt><dd>' + escape(row.abnormalReason) + '</dd></div>' +
      '<div><dt>已做措施与跟进结果</dt><dd>' + escape(row.followUpResult) + '</dd></div>' +
      '<div><dt>下一步应对操作</dt><dd>' + escape(row.nextAction) + '</dd></div>' +
      '<div><dt>Bug 工单链接</dt><dd>' + (row.workOrderUrl ? '<button class="demo-tour-button" type="button" data-demo-ticket="' + escape(row.workOrderUrl) + '">查看演示工单 ' + escape(row.workOrderUrl.split('/').pop()) + '</button>' : '此记录尚无 Bug 工单；配置或培训问题按对应措施跟进。') + '</dd></div></dl></details>' +
      '<p class="demo-evidence-note">原因由运营人员在后台确认后填写。参观只需查看，无需完成运营操作。</p>';
  }

  function renderStep() {
    unlockRows();
    hideEvidence();
    var row = mainRow();
    var data = source();
    var content = '';
    if (step === 0) {
      switchPane('overview');
      content = '<p>运营人员每天要判断哪些客户即将到期、需要转化或持续跟进。今日驾驶舱把这些信息集中到同一个入口，减少跨表查找。</p><p>接下来看看 Workbench 如何自动筛选异常、留存处理进展，再生成周报。</p><p class="demo-tour-role">查看页面，点击“下一步”即可。</p>';
      mark('.crm-overview-grid');
    } else if (step === 1) {
      switchPane('abnormal');
      showEvidence(sourceTable(), true);
      content = '<p>导入系统全量客户使用数据后，Workbench 自动筛出商品数量识别率低于 80% 的客户，省去逐行人工查表。</p><p>这个虚构批次从 ' + data.totalCount + ' 条记录中筛出 ' + data.abnormalCount + ' 条需要关注的记录；系统提供线索，原因由运营确认。</p><p class="demo-tour-role">查看已准备好的筛选结果，无需上传文件。</p>';
      mark(evidence);
    } else if (step === 2) {
      switchPane('abnormal');
      updateFilter('crmAbnormalOwnerFilter', '', 'change');
      updateFilter('crmAbnormalSearch', '', 'input');
      lockRows();
      content = '<p>筛选结果进入统一的异常清单，可以按负责人和统计周期查看，减少客户跟进遗漏。</p><p>客户指标与后续处理记录放在同一处，运营同事能快速找到需要继续跟进的客户。</p><p class="demo-tour-role">查看异常清单，无需填写处理记录。</p>';
      mark('#crmAbnormalTable');
    } else if (step === 3) {
      switchPane('abnormal');
      updateFilter('crmAbnormalOwnerFilter', '', 'change');
      updateFilter('crmAbnormalSearch', row.customerName, 'input');
      lockRows();
      showEvidence(savedCard(row), true);
      content = '<p>异常原因、已做措施和下一步应对集中记录，解决处理进展散落在聊天和表格中、同事接手困难的问题。</p><p>属于 Bug 的问题关联工单，后续修复和复测有据可追。</p><p class="demo-tour-role">可展开示例，也可直接点击“下一步”。</p>';
      mark(evidence);
    } else {
      switchPane('weekly');
      var end = new Date(data.periodEnd + 'T00:00:00Z');
      end.setUTCDate(end.getUTCDate() + 1);
      element('crmWeeklyDate').value = end.toISOString().slice(0, 10);
      element('crmWeeklyOwner').value = row.ownerId;
      window.generateWeeklyReport();
      content = '<p>日常记录直接按统计周期与负责专员汇总成周报，并检查数据完整性，减少每周重复统计与复制粘贴。</p><p>试用、转化、异常和处理进展保持同一口径；生成后仍可编辑和复制。</p><p class="demo-tour-role">查看生成结果。完成后可自由探索全部模块。</p>';
      mark('#crmWeeklyQuality');
    }
    element('demoTourTitle').textContent = titles[step];
    element('demoTourContent').innerHTML = content;
    element('demoTourProgress').textContent = '参观进度 ' + (step + 1) + ' / ' + titles.length;
    element('demoTourPrev').disabled = step === 0;
    element('demoTourNext').textContent = step === titles.length - 1 ? '完成参观' : '下一步';
    panel.scrollIntoView({behavior: 'instant', block: 'start'});
    element('demoTourTitle').focus({preventScroll: true});
  }

  function start() {
    if (!ready) return;
    if (!source().available || !mainRow()) {
      welcome.hidden = false;
      element('demoTourRestart').hidden = true;
      welcome.querySelector('p').textContent = '当前浏览器中的示例批次已被修改或删除。点击“重置演示”恢复完整参观数据，或继续自由探索。';
      selectViewWithoutScroll('crm');
      welcome.scrollIntoView({behavior: 'smooth', block: 'start'});
      return;
    }
    if (step === -1) {
      originalSearch = element('crmAbnormalSearch').value;
      originalOwner = element('crmAbnormalOwnerFilter').value;
    }
    setSeen();
    welcome.hidden = true;
    element('demoTourRestart').hidden = false;
    panel.hidden = false;
    document.body.classList.add('demo-tour-active');
    step = 0;
    renderStep();
  }

  function close() {
    if (!ready || step === -1) return;
    var wasEvidenceOnly = step === 1 || step === 3;
    step = -1;
    unlockRows();
    hideEvidence();
    mark(null);
    panel.hidden = true;
    document.body.classList.remove('demo-tour-active');
    updateFilter('crmAbnormalOwnerFilter', originalOwner, 'change');
    updateFilter('crmAbnormalSearch', originalSearch, 'input');
    if (wasEvidenceOnly) switchPane('abnormal');
    element('demoTourRestart').focus({preventScroll: true});
  }

  function ticket(url) {
    var dialog = element('demoTicketDialog');
    var data = source();
    var row = data.rows.find(function (item) { return item.workOrderUrl === url; });
    var parsed = new URL(url);
    element('demoTicketTitle').textContent = '虚构 Bug 工单 ' + parsed.pathname.split('/').pop();
    element('demoTicketContent').innerHTML = '<p class="demo-ticket-meta">本地演示工单，展示运营如何关联排查与后续处理。</p>' + (row ? '<p><strong>客户：</strong>' + escape(row.customerName) + '</p><p><strong>问题：</strong>' + escape(row.abnormalReason) + '</p><p><strong>处理记录：</strong>' + escape(row.followUpResult) + '</p><p><strong>下一步：</strong>' + escape(row.nextAction) + '</p>' : '<p>此链接为虚构工单示例。实际工作中，运营人员在确认 Bug 后关联研发工单并持续跟进。</p>');
    if (!dialog.open) dialog.showModal();
  }

  function labelNavigation() {
    var navigation = document.querySelector('.side-nav');
    var names = {crm: '客户运营', home: '功能中心', price: '单价修改', randomizer: '测试表格', merge: '表格拼接'};
    ['crm', 'home', 'price', 'randomizer', 'merge'].forEach(function (view) {
      var trigger = navigation.querySelector('[data-view-target="' + view + '"]');
      navigation.appendChild(trigger);
      trigger.setAttribute('aria-label', names[view]);
      trigger.title = names[view];
      var label = document.createElement('span');
      label.textContent = names[view];
      trigger.appendChild(label);
    });
    var group = document.createElement('div');
    group.className = 'side-nav-group';
    group.textContent = 'Excel 辅助工具';
    navigation.insertBefore(group, navigation.querySelector('[data-view-target="price"]'));
    var launcher = document.querySelector('.launcher-row [data-view-target="crm"]');
    launcher.parentNode.prepend(launcher);
    launcher.querySelector('span:last-child').textContent = '客户运营';
    var customerRow = Array.from(document.querySelectorAll('.function-table tbody tr')).find(function (row) { return row.cells[0].textContent === '客户盘点'; });
    customerRow.parentNode.prepend(customerRow);
    customerRow.cells[0].textContent = '客户运营驾驶舱';
    document.querySelector('.product-name h1').textContent = '客户运营 Workbench';
    document.querySelector('#view-crm [data-view-target="home"]').textContent = '功能中心';
    var heroLinks = document.querySelector('.hero-links');
    var heroCrm = heroLinks.querySelector('[data-view-target="crm"]');
    heroCrm.textContent = '客户运营';
    heroLinks.prepend(heroCrm);
    heroLinks.querySelector('[data-view-target="home"]').textContent = '功能中心';
    var heroAction = document.querySelector('.hero-action');
    heroAction.insertAdjacentHTML('beforebegin', '<button type="button" id="demoHeroTour" class="demo-hero-cta">开始 2 分钟产品导览</button>');
    element('demoHeroTour').addEventListener('click', start);
    heroAction.setAttribute('aria-label', '进入客户运营工作台');
    heroAction.insertAdjacentHTML('beforeend', '<span>直接进入工作台</span>');
    heroAction.addEventListener('click', function () { navigation.querySelector('[data-view-target="crm"]').click(); });
  }

  function initialize() {
    var auth = element('crmAuthButton');
    if (!auth || auth.textContent !== '重置演示' || !element('crmConnection').classList.contains('online')) return false;
    ready = true;
    labelNavigation();
    document.body.classList.add('demo-showcase');
    if (document.querySelector('.portfolio-demo-nav')) document.body.classList.add('demo-in-portfolio');
    var masthead = document.createElement('div');
    masthead.className = 'demo-masthead';
    masthead.setAttribute('role', 'note');
    masthead.innerHTML = '<strong>产品演示环境</strong><p>数据均为虚构，操作仅保存在当前浏览器</p>';
    document.body.prepend(masthead);
    document.querySelector('.demo-ribbon').remove();

    var shell = element('view-crm');
    welcome = document.createElement('section');
    welcome.id = 'demoTourWelcome';
    welcome.className = 'demo-tour-welcome';
    welcome.setAttribute('aria-label', '首次体验指引');
    welcome.innerHTML = '<div><strong>第一次体验 Workbench？</strong><p>用 2 分钟看懂今天该处理谁、异常如何筛出，以及周报怎样一键生成。只需查看和点击下一步。</p></div><div class="demo-tour-welcome-actions">' + button('demoTourStart', '开始参观', true) + button('demoTourSkip', '先自由探索', false) + '</div>';
    welcome.hidden = hasSeen();
    shell.insertBefore(welcome, shell.querySelector('.crm-commandbar'));

    var layout = document.createElement('div');
    layout.className = 'demo-tour-layout';
    stage = document.createElement('div');
    stage.className = 'demo-tour-stage';
    Array.from(shell.querySelectorAll(':scope > .crm-pane')).forEach(function (pane) { stage.appendChild(pane); });
    evidence = document.createElement('section');
    evidence.id = 'demoTourEvidence';
    evidence.className = 'demo-evidence';
    evidence.hidden = true;
    stage.prepend(evidence);
    panel = document.createElement('aside');
    panel.id = 'demoTourPanel';
    panel.className = 'demo-tour-panel';
    panel.hidden = true;
    panel.setAttribute('aria-label', '产品参观指引');
    panel.innerHTML = '<div class="demo-tour-panel-header"><span id="demoTourProgress"></span><button type="button" id="demoTourClose">结束参观</button></div><h3 id="demoTourTitle" tabindex="-1"></h3><div id="demoTourContent" aria-live="polite"></div><div class="demo-tour-controls">' + button('demoTourPrev', '上一步', false) + button('demoTourNext', '下一步', true) + '</div>';
    layout.append(stage, panel);
    shell.appendChild(layout);
    shell.querySelector('.header-actions').insertAdjacentHTML('afterbegin', button('demoTourRestart', '参观指引', false));
    element('demoTourRestart').hidden = !welcome.hidden;
    document.body.insertAdjacentHTML('beforeend', '<dialog class="demo-ticket-dialog" id="demoTicketDialog" aria-labelledby="demoTicketTitle"><h3 id="demoTicketTitle"></h3><div id="demoTicketContent"></div><div class="demo-ticket-footer">' + button('demoTicketClose', '关闭工单', false) + '</div></dialog>');

    element('demoTourStart').addEventListener('click', start);
    element('demoTourRestart').addEventListener('click', start);
    element('demoTourSkip').addEventListener('click', function () { setSeen(); welcome.hidden = true; element('demoTourRestart').hidden = false; });
    element('demoTourClose').addEventListener('click', close);
    element('demoTourPrev').addEventListener('click', previous);
    element('demoTourNext').addEventListener('click', next);
    element('demoTicketClose').addEventListener('click', function () { element('demoTicketDialog').close(); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !element('demoTicketDialog').open) close();
    });
    document.addEventListener('click', function (event) {
      var target = event.target.closest('[data-demo-ticket], a[href]');
      if (!target) return;
      var url = target.getAttribute('data-demo-ticket') || target.getAttribute('href');
      try {
        var parsed = new URL(url, location.href);
        if (parsed.hostname !== 'example.invalid' || !parsed.pathname.startsWith('/demo/tickets/')) return;
        event.preventDefault();
        ticket(parsed.href);
      } catch (error) { /* Normal links remain native. */ }
    });
    var requested = new URLSearchParams(location.search).get('view');
    var route = ['home', 'price', 'randomizer', 'merge'].includes(requested) ? requested : 'crm';
    // Select the working view without letting its smooth scroll hide the original visual homepage.
    selectViewWithoutScroll(route);
    window.scrollTo({top: 0, left: 0, behavior: 'instant'});
    return true;
  }

  function next() { if (step < 0) return; if (step === titles.length - 1) close(); else { step += 1; renderStep(); } }
  function previous() { if (step > 0) { step -= 1; renderStep(); } }
  window.WorkbenchTour = {start: start, next: next, previous: previous, close: close, currentStep: function () { return step; }};
  if (!initialize()) {
    var observer = new MutationObserver(function () {
      if (ready) return;
      if (initialize()) observer.disconnect();
    });
    observer.observe(document.body, {childList: true, subtree: true, characterData: true});
  }
})();
