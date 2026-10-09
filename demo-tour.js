(function () {
  'use strict';

  var step = -1;
  var ready = false;
  var reminderHandled = false;
  var selectingTourView = false;
  var paused = false;
  var locked = new Map();
  var highlight = null;
  var switchingTourPane = false;
  var stage, evidence, panel, welcome;
  var steps = [
    {pane: 'overview', name: '今日驾驶舱', title: '今天应该优先跟进谁？', target: '.crm-overview-grid', content: '<p>到期提醒、待转化和待上线客户集中在同一个入口，运营人员每天打开就能判断行动优先级。</p><p>点击客户可查看详情，减少跨表查找和跟进遗漏。</p>'},
    {pane: 'customers', name: '试用客户盘点', title: '把试用过程变成持续跟进', target: '#crmTable', content: '<p>客户负责人、试用期限、人工录入的识别效果和下一步行动放在一起，帮助运营持续跟进试用，而不是等到到期才回头查记录。</p><p>可以按状态、负责人筛选或搜索客户，再打开详情查看历史记录。</p>'},
    {pane: 'conversion', name: '转化客户盘点', title: '充值之后，继续追踪上线', target: '#crmConversionTable', content: '<p>已经充值的客户仍需要跟进上线进展。按周期集中查看待上线与正式上线客户，让转化后的交接和推进有据可查。</p><p>客户归属、充值记录和下一步保持在同一处。</p>'},
    {pane: 'abnormal', name: '异常客户盘点', title: '自动筛出异常，接续处理进展', target: '#crmAbnormalTable', content: '<p>导入系统全量使用数据后，Workbench 自动筛出商品数量识别率低于 80% 的客户，省去逐行人工查表。</p><p>运营人员到后台确认原因后，记录已做措施和下一步应对；属于 Bug 的问题关联工单，让同事接手时知道处理到哪里。</p>'},
    {pane: 'requirements', name: '需求管理', title: '让需求有来源，也有处理状态', target: '[data-crm-pane-content="requirements"]', content: '<p>客户反馈与内部运营需求统一记录，保留提报人、优先级和处理状态，减少需求散落在聊天中、后续无人跟进的问题。</p><p>客户需求关联对应客户，内部运营需求单独管理。</p>'},
    {pane: 'weekly', name: '周报生成', title: '把日常记录汇总成周报', target: '#crmWeeklyQuality', content: '<p>按统计周期与负责专员汇总试用、转化、异常和关键记录，并在生成前检查数据完整性，减少每周重复统计与复制粘贴。</p><p>周报仍可编辑和复制。切换到这里后，可以使用页面中的“生成周报”查看结果。</p>'}
  ];

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
  function button(id, text, primary) { return '<button type="button" id="' + id + '" class="demo-tour-button' + (primary ? ' primary' : '') + '">' + text + '</button>'; }

  function selectViewWithoutScroll(view) {
    var business = element('business');
    var originalScrollIntoView = business.scrollIntoView;
    business.scrollIntoView = function () {};
    selectingTourView = true;
    try { document.querySelector('.side-nav [data-view-target="' + view + '"]').click(); }
    finally { business.scrollIntoView = originalScrollIntoView; selectingTourView = false; }
  }

  function switchPane(name) {
    selectViewWithoutScroll('crm');
    switchingTourPane = true;
    try { document.querySelector('.crm-main-tabs [data-crm-pane="' + name + '"]').click(); }
    finally { switchingTourPane = false; }
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

  function showEvidence(html) {
    evidence.innerHTML = html;
    evidence.hidden = false;
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

  function activeStep() {
    var tab = document.querySelector('.crm-main-tabs [data-crm-pane].active');
    var pane = tab && tab.getAttribute('data-crm-pane');
    var index = steps.findIndex(function (item) { return item.pane === pane; });
    return index < 0 ? 0 : index;
  }

  function keepGuideVisible() {
    requestAnimationFrame(function () {
      if (step === -1 || paused) return;
      var bounds = panel.getBoundingClientRect();
      var offset = parseFloat(getComputedStyle(document.body).getPropertyValue('--demo-offset')) || 0;
      if (bounds.top < offset || bounds.bottom > innerHeight) {
        panel.scrollIntoView({behavior: 'instant', block: 'start'});
      }
    });
  }

  // Rendering an explanation never changes the visitor's filters or selected records.
  function renderGuide(scrollToGuide) {
    unlockRows();
    hideEvidence();
    var item = steps[step];
    if (item.pane === 'abnormal') {
      lockRows();
      if (source().available && mainRow()) showEvidence('<details id="demoTourExamples"><summary>按需查看：全量筛选结果与已填写的示例</summary>' + sourceTable() + savedCard(mainRow()) + '</details>');
    }
    panel.hidden = false;
    mark(item.target);
    element('demoTourTitle').textContent = item.title;
    element('demoTourContent').innerHTML = item.content + '<p class="demo-tour-role">当前模块：' + item.name + '。可点击其他模块，讲解会同步切换；无需填写运营记录。</p>';
    element('demoTourProgress').textContent = '产品导览 ' + (step + 1) + ' / ' + steps.length + ' · ' + item.name;
    element('demoTourPrev').disabled = step === 0;
    element('demoTourNext').textContent = step === steps.length - 1 ? '完成参观' : '下一步';
    if (scrollToGuide) {
      panel.scrollIntoView({behavior: 'instant', block: 'start'});
      element('demoTourTitle').focus({preventScroll: true});
    } else keepGuideVisible();
  }

  function goToStep(index) {
    step = index;
    paused = false;
    document.body.classList.add('demo-tour-active');
    switchPane(steps[step].pane);
    if (steps[step].pane === 'weekly') window.generateWeeklyReport();
    renderGuide(true);
  }

  function dismissWelcome() {
    reminderHandled = true;
    if (welcome.open) welcome.close();
    welcome.hidden = true;
  }

  function showWelcome() {
    if (reminderHandled || step !== -1 || welcome.open) return;
    welcome.hidden = false;
    welcome.showModal();
  }

  function syncManualPane() {
    if (step === -1 || paused || switchingTourPane) return;
    step = activeStep();
    renderGuide(false);
  }

  function pauseGuide() {
    if (step === -1) return;
    paused = true;
    unlockRows();
    hideEvidence();
    mark(null);
    panel.hidden = true;
    document.body.classList.remove('demo-tour-active');
  }

  function resumeGuide() {
    paused = false;
    step = activeStep();
    document.body.classList.add('demo-tour-active');
    renderGuide(false);
  }

  function start() {
    if (!ready) return;
    if (!source().available || !mainRow()) {
      element('demoTourWelcomeDescription').textContent = '当前浏览器中的示例批次已被修改或删除。点击“重置演示”恢复完整参观数据，或继续自由探索。';
      reminderHandled = false;
      selectViewWithoutScroll('crm');
      showWelcome();
      return;
    }
    dismissWelcome();
    goToStep(0);
  }

  function close() {
    if (!ready || step === -1) return;
    step = -1;
    paused = false;
    unlockRows();
    hideEvidence();
    mark(null);
    panel.hidden = true;
    document.body.classList.remove('demo-tour-active');
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
    welcome = document.createElement('dialog');
    welcome.id = 'demoTourWelcome';
    welcome.className = 'demo-tour-welcome';
    welcome.setAttribute('aria-labelledby', 'demoTourWelcomeTitle');
    welcome.setAttribute('aria-describedby', 'demoTourWelcomeDescription');
    welcome.innerHTML = '<span class="demo-tour-welcome-label">Workbench 产品导览</span><h2 id="demoTourWelcomeTitle">从这里，看懂客户运营如何提效</h2><p id="demoTourWelcomeDescription">用 2 分钟了解 Workbench 如何把客户跟进、异常盘点和周报汇总串起来。查看六个模块，了解每一步解决的问题。</p><div class="demo-tour-welcome-route" aria-label="主要工作流"><span>客户跟进</span><span aria-hidden="true">→</span><span>异常处理</span><span aria-hidden="true">→</span><span>一键周报</span></div><div class="demo-tour-welcome-actions">' + button('demoTourStart', '开始 2 分钟产品导览', true) + button('demoTourSkip', '自由探索', false) + '</div>';
    welcome.hidden = true;
    document.body.appendChild(welcome);

    var layout = document.createElement('div');
    layout.className = 'demo-tour-layout';
    stage = document.createElement('div');
    stage.className = 'demo-tour-stage';
    Array.from(shell.querySelectorAll(':scope > .crm-pane')).forEach(function (pane) { stage.appendChild(pane); });
    evidence = document.createElement('section');
    evidence.id = 'demoTourEvidence';
    evidence.className = 'demo-evidence';
    evidence.hidden = true;
    stage.appendChild(evidence);
    panel = document.createElement('aside');
    panel.id = 'demoTourPanel';
    panel.className = 'demo-tour-panel';
    panel.hidden = true;
    panel.setAttribute('aria-label', '产品参观指引');
    panel.innerHTML = '<div class="demo-tour-panel-header"><span id="demoTourProgress"></span><button type="button" id="demoTourClose">结束参观</button></div><h3 id="demoTourTitle" tabindex="-1"></h3><div id="demoTourContent" aria-live="polite"></div><div class="demo-tour-controls">' + button('demoTourPrev', '上一步', false) + button('demoTourNext', '下一步', true) + '</div>';
    layout.append(stage, panel);
    shell.appendChild(layout);
    shell.querySelector('.header-actions').insertAdjacentHTML('afterbegin', button('demoTourRestart', '产品导览', true));
    document.body.insertAdjacentHTML('beforeend', '<dialog class="demo-ticket-dialog" id="demoTicketDialog" aria-labelledby="demoTicketTitle"><h3 id="demoTicketTitle"></h3><div id="demoTicketContent"></div><div class="demo-ticket-footer">' + button('demoTicketClose', '关闭工单', false) + '</div></dialog>');

    element('demoTourStart').addEventListener('click', start);
    element('demoTourRestart').addEventListener('click', start);
    element('demoTourSkip').addEventListener('click', dismissWelcome);
    welcome.addEventListener('cancel', function (event) { event.preventDefault(); dismissWelcome(); });
    element('demoTourClose').addEventListener('click', close);
    element('demoTourPrev').addEventListener('click', previous);
    element('demoTourNext').addEventListener('click', next);
    shell.querySelectorAll('.crm-main-tabs [data-crm-pane]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        if (step === -1 || switchingTourPane) return;
        syncManualPane();
      });
    });
    document.querySelectorAll('[data-view-target]').forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        if (selectingTourView || trigger.disabled) return;
        if (trigger.getAttribute('data-view-target') !== 'crm') { pauseGuide(); return; }
        if (step !== -1) resumeGuide();
        else showWelcome();
      });
    });
    // The original workflow can also change modules through dashboard shortcuts.
    var navigationObserver = new MutationObserver(function () {
      if (step === -1) return;
      if (!shell.classList.contains('active')) { if (!paused) pauseGuide(); return; }
      if (paused) resumeGuide();
      else if (activeStep() !== step) syncManualPane();
    });
    navigationObserver.observe(shell, {attributes: true, attributeFilter: ['class']});
    shell.querySelectorAll('.crm-main-tabs [data-crm-pane]').forEach(function (tab) {
      navigationObserver.observe(tab, {attributes: true, attributeFilter: ['class']});
    });
    // Scrolling past the homepage is also a real entrance to the cockpit.
    var entranceObserver = new IntersectionObserver(function (entries) {
      if (shell.classList.contains('active') && entries.some(function (entry) { return entry.isIntersecting; })) showWelcome();
    }, {threshold: 0.5});
    entranceObserver.observe(shell.querySelector(':scope > .header'));
    entranceObserver.observe(shell.querySelector('.crm-commandbar'));
    var abnormalRowsObserver = new MutationObserver(function () {
      if (step >= 0 && !paused && steps[step].pane === 'abnormal') {
        unlockRows();
        lockRows();
      }
    });
    abnormalRowsObserver.observe(element('crmAbnormalTableBody'), {childList: true});
    element('demoTicketClose').addEventListener('click', function () { element('demoTicketDialog').close(); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !welcome.open && !element('demoTicketDialog').open && !paused) close();
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

  function next() { if (step < 0 || paused) return; if (step === steps.length - 1) close(); else goToStep(step + 1); }
  function previous() { if (step > 0 && !paused) goToStep(step - 1); }
  window.WorkbenchTour = {start: start, next: next, previous: previous, close: close, currentStep: function () { return step; }};
  if (!initialize()) {
    var observer = new MutationObserver(function () {
      if (ready) return;
      if (initialize()) observer.disconnect();
    });
    observer.observe(document.body, {childList: true, subtree: true, characterData: true});
  }
})();
