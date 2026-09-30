(function () {
  'use strict';

  var STORAGE_KEY = 'workbench-exact-public-demo-v2';
  var TABLES = ['submitters', 'customers', 'recognition_records', 'requirements', 'import_batches', 'customer_aliases', 'customer_metric_snapshots', 'customer_events', 'abnormal_import_batches', 'abnormal_reviews', 'conversion_periods', 'crm_audit_logs'];
  var listeners = [];
  var session = {user: {id: '00000000-0000-4000-8000-000000000099', email: 'demo@example.invalid'}};
  var member = {user_id: session.user.id, display_name: '演示专员', submitter_id: id(1), submitter_name: '演示专员'};

  function id(number) {
    return '00000000-0000-4000-8000-' + String(number).padStart(12, '0');
  }

  function newId() {
    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    var hex = Array.from(bytes, function (value) { return value.toString(16).padStart(2, '0'); }).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
  }

  function iso() {
    return new Date().toISOString();
  }

  function shanghaiToday() {
    var parts = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(new Date());
    var values = {};
    parts.forEach(function (part) { values[part.type] = part.value; });
    return values.year + '-' + values.month + '-' + values.day;
  }

  function addDays(date, offset) {
    var value = new Date(date + 'T00:00:00Z');
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
  }

  function seed() {
    var today = shanghaiToday();
    var dayOfWeek = new Date(today + 'T00:00:00Z').getUTCDay();
    var currentSaturday = addDays(today, -((dayOfWeek + 1) % 7));
    var previousSaturday = addDays(currentSaturday, -7);
    var reportOffset = -((dayOfWeek + 1) % 7) - 7;
    var reportEnd = addDays(previousSaturday, 6);
    var abnormalEnd = addDays(currentSaturday, -2);
    var abnormalStart = addDays(abnormalEnd, -6);
    var stamp = iso();
    var submitters = [
      {id: id(1), name: '演示专员', created_at: stamp},
      {id: id(2), name: '林同事', created_at: stamp},
      {id: id(3), name: '周同事', created_at: stamp}
    ];
    function customer(number, name, owner, status, startOffset, endOffset, rateReason, paymentOffset, amount, architecture) {
      return {
        id: id(100 + number), customer_name: name, owner_submitter_id: id(owner), submitter: submitters[owner - 1].name,
        status: status, trial_start_date: startOffset === null ? null : addDays(today, startOffset),
        trial_end_date: endOffset === null ? null : addDays(today, endOffset), abnormal_reason: rateReason || null,
        payment_date: paymentOffset === null ? null : addDays(today, paymentOffset), payment_amount: amount,
        handover_date: paymentOffset === null ? null : addDays(today, paymentOffset), online_date: null,
        product_architecture: architecture || null, created_at: stamp, updated_at: stamp
      };
    }
    var customers = [
      customer(1, '青禾餐配（演示）', 1, '试用中', -5, 1, null, null, null, null),
      customer(2, '云杉食集（演示）', 2, '试用中', -6, 0, '菜单别名尚未全部补齐', null, null, null),
      customer(3, '稻香供应链（演示）', 1, '潜在转化', -4, 2, null, null, null, null),
      customer(4, '北岸餐饮（演示）', 3, '异常', -7, -1, '商品规格与包装单位不一致，识别率下降', null, null, null),
      customer(5, '橙谷鲜配（演示）', 2, '潜在转化', -3, 3, null, null, null, null),
      customer(6, '林间膳房（演示）', 1, '已充值待上线', reportOffset - 7, reportOffset - 1, null, reportOffset, 12800, '新架构'),
      customer(7, '麦田配餐（演示）', 3, '已充值待上线', reportOffset - 6, reportOffset, '上线前需要补充历史样本', reportOffset + 1, 9600, '老架构'),
      customer(8, '海盐食配（演示）', 2, '正式上线', -55, -49, null, -35, 16800, '新架构'),
      customer(9, '星野团膳（演示）', 1, '已充值待上线', reportOffset - 5, reportOffset + 1, null, reportOffset + 2, 16800, '新架构'),
      customer(10, '清禾食堂（演示）', 2, '已充值待上线', reportOffset - 4, reportOffset + 2, '新门店商品资料待补齐', reportOffset + 3, 7200, '老架构'),
      customer(11, '远山鲜配（演示）', 1, '已充值待上线', reportOffset - 3, reportOffset + 3, null, reportOffset + 4, 24000, '新架构'),
      customer(12, '禾木供应链（演示）', 2, '已充值待上线', reportOffset - 2, reportOffset + 4, '包装规格需要完成二次核验', reportOffset + 5, 15000, '新架构'),
      customer(13, '春屿餐饮（演示）', 1, '已充值待上线', reportOffset - 1, reportOffset + 5, null, reportOffset + 6, 8800, '老架构'),
      customer(14, '知味团膳（演示）', 1, '已充值待上线', reportOffset, reportOffset + 6, '等待多门店上线前联调', reportOffset + 6, 19800, '新架构'),
      customer(15, '南风餐配（演示）', 1, '异常', -6, 0, '多门店共用菜单，部分商品别名相互冲突', null, null, null),
      customer(16, '清川餐服（演示）', 1, '异常', -5, 1, '手写订单中箱、包单位混用，需补充训练样本', null, null, null),
      customer(17, '松果食集（演示）', 2, '异常', -4, 2, '账号已开通但尚未提交订单，需确认使用排期', null, null, null)
    ];
    customers[7].online_date = addDays(today, -3);
    var currentRecognition = [
      [1, -2, 82.6, 42], [2, -1, 75.4, 18], [3, -1, 88.2, 53], [4, -2, 61.5, 19],
      [5, -1, 85.1, 31], [6, -1, 91.3, 68], [7, -1, 73.6, 47], [8, -1, 94.3, 112],
      [9, -1, 89.4, 86], [10, -1, 77.8, 33], [11, -1, 95.2, 124], [12, -1, 78.1, 58],
      [13, -1, 86.7, 41], [14, -1, 82.5, 72], [15, -1, 66.2, 24], [16, -1, 71.9, 35], [17, -1, 0, 0]
    ];
    var recognitionRecords = currentRecognition.map(function (values, index) {
      return {id: id(200 + index), customer_id: id(100 + values[0]), record_date: addDays(today, values[1]),
        recognition_rate: values[2], order_count: values[3], recorded_by: '演示专员', created_at: stamp};
    });
    currentRecognition.forEach(function (values, index) {
      var sourceCustomer = customers[values[0] - 1];
      var historyDate = addDays(reportEnd, -1);
      if (sourceCustomer.trial_start_date > historyDate) return;
      recognitionRecords.push({id: id(240 + index), customer_id: id(100 + values[0]), record_date: historyDate,
        recognition_rate: values[2], order_count: values[3], recorded_by: sourceCustomer.submitter, created_at: stamp});
    });
    var batch = {id: id(300), file_name: '虚构异常客户演示.xlsx', file_hash: 'demo-seed', period_type: '上周',
      period_start: abnormalStart, period_end: abnormalEnd, imported_by: '演示专员', created_at: stamp};
    var abnormalReviews = [
      {name: '北岸餐饮（演示）', customer: id(104), owner: id(3), rate: 61.5, orders: 19, type: '识别率低', status: '试用中', reason: '规格单位配置冲突，散装和整箱商品被混用', result: '已收集失败样本并建立单位映射，明日复测'},
      {name: '云杉食集（演示）', customer: id(102), owner: id(2), rate: 75.4, orders: 18, type: '识别率低', status: '试用中', reason: '客户菜单别名不完整，新商品识别不稳定', result: '已补录12个高频别名，等待下一批订单验证'},
      {name: '竹里鲜食（演示）', customer: null, owner: id(1), rate: 0, orders: 0, type: '未使用', status: null, reason: '本周期未提交订单，需确认接入情况', result: '已联系负责人，约定明日完成首批订单体验'},
      {name: '翠庭餐配（演示）', customer: null, owner: id(1), rate: 68.3, orders: 46, type: '识别率低', status: '已付费未上线', reason: '纸质订单照片倾斜，数量列与备注列容易串行', result: '已提供拍摄规范并回放10张样本，继续观察'},
      {name: '山川食材（演示）', customer: null, owner: id(3), rate: 72.1, orders: 32, type: '识别率低', status: '待报上线', reason: '同名商品存在多个包装规格，默认规格不一致', result: '客户已确认常用规格，已提交配置变更'},
      {name: '青禾餐配（演示）', customer: id(101), owner: id(1), rate: 76.2, orders: 42, type: '识别率低', status: '试用中', reason: '历史菜单中一斤、500克等表述缺少统一换算', result: '已完成单位换算配置，最新人工识别率回升至82.6%'},
      {name: '稻香供应链（演示）', customer: id(103), owner: id(1), rate: 73.5, orders: 53, type: '识别率低', status: '试用中', reason: '导入周期早期商品字典未完善，拉低周均识别率', result: '已补齐商品字典，最新人工识别率88.2%，推进转化'},
      {name: '橙谷鲜配（演示）', customer: id(105), owner: id(2), rate: 78.6, orders: 31, type: '识别率低', status: '试用中', reason: '门店习惯使用缩写，部分数量文本无法准确关联', result: '已录入缩写别名，人工复测85.1%，客户反馈良好'},
      {name: '林间膳房（演示）', customer: id(106), owner: id(1), rate: 79.4, orders: 68, type: '识别率低', status: '已付费未上线', reason: '充值前几批订单中存在小数重量识别偏差', result: '已调整小数重量解析，人工复测91.3%，准备上线资料'},
      {name: '麦田配餐（演示）', customer: id(107), owner: id(3), rate: 73.6, orders: 47, type: '识别率低', status: '已付费未上线', reason: '老架构历史数据存在重复商品编码', result: '已整理重复编码清单，待客户确认保留项'},
      {name: '南风餐配（演示）', customer: id(115), owner: id(1), rate: 66.2, orders: 24, type: '识别率低', status: '试用中', reason: '多门店共用菜单导致商品别名冲突', result: '已拆分门店商品映射，安排次日联调'},
      {name: '清川餐服（演示）', customer: id(116), owner: id(1), rate: 71.9, orders: 35, type: '识别率低', status: '试用中', reason: '手写订单中箱、包单位混用，数量边界不清晰', result: '已提交15张典型样本，跟进识别优化进度'},
      {name: '松果食集（演示）', customer: id(117), owner: id(2), rate: 0, orders: 0, type: '未使用', status: '试用中', reason: '账号开通后未使用，负责人尚未组织门店培训', result: '已预约远程培训，培训后检查首单提交'},
      {name: '荷风餐饮（演示）', customer: null, owner: id(1), rate: 64.8, orders: 57, type: '识别率低', status: '待报上线', reason: '长菜单跨页，第二页数量与第一页面单混淆', result: '已规范分页上传方式，补充跨页回归样本'},
      {name: '青岚鲜配（演示）', customer: null, owner: id(1), rate: 77.3, orders: 29, type: '识别率低', status: '已付费未上线', reason: '商品备注中的加工要求被误判为数量', result: '已补充备注规则，等待客户再次提交验证'},
      {name: '星河团膳（演示）', customer: null, owner: id(1), rate: 69.7, orders: 81, type: '识别率低', status: '待报上线', reason: '订单图片压缩较重，小字号数量无法稳定读取', result: '已调整图片提交方式并对比原图识别效果'},
      {name: '榆森食材（演示）', customer: null, owner: id(1), rate: 74.2, orders: 38, type: '识别率低', status: '已付费未上线', reason: '门店SKU与总部商品字典名称存在差异', result: '已对齐26个常用SKU，剩余低频商品继续维护'},
      {name: '晨露餐配（演示）', customer: null, owner: id(1), rate: 0, orders: 0, type: '未使用', status: null, reason: '门店本周停业，未产生订单', result: '已确认下周恢复营业，恢复后跟进首批订单'},
      {name: '原野膳食（演示）', customer: null, owner: id(2), rate: 79.8, orders: 63, type: '识别率低', status: '待报上线', reason: '组合套餐与单品混排，套餐数量未正确展开', result: '已整理套餐展开规则，等待产品评估'},
      {name: '晴川供应链（演示）', customer: null, owner: id(3), rate: 70.5, orders: 44, type: '识别率低', status: '已付费未上线', reason: '旧模板数量列位置变化，导入映射未同步', result: '已更新模板映射并完成首轮回归'}
    ].map(function (value, index) {
      return {id: id(310 + index), batch_id: batch.id, customer_name: value.name, trial_customer_id: value.customer,
        owner_submitter_id: value.owner, submitter: '演示专员', period_type: '上周', period_start: abnormalStart,
        period_end: abnormalEnd, recognition_rate: value.rate, order_count: value.orders, abnormal_type: value.type,
        online_status: value.status, abnormal_reason: value.reason, follow_up_result: value.result,
        work_order_url: index % 3 === 0 ? 'https://example.invalid/demo/tickets/WO-' + String(1001 + index) : null,
        archived_at: null, created_at: stamp, updated_at: stamp};
    });
    var requirements = [
      {id: id(400), type: '客户需求', description: '支持按门店批量维护商品别名', submitter: '林同事', customer_name: customers[1].customer_name, status: '处理中', created_at: stamp, updated_at: stamp},
      {id: id(401), type: 'Admin运营需求', description: '异常列表增加按负责人筛选', submitter: '演示专员', customer_name: null, status: '待处理', created_at: stamp, updated_at: stamp},
      {id: id(402), type: '客户需求', description: '多门店商品别名支持分店维护，避免共用菜单冲突', submitter: '演示专员', customer_name: customers[14].customer_name, status: '处理中', created_at: stamp, updated_at: stamp},
      {id: id(403), type: '客户需求', description: '纸质订单识别失败时显示对应的原始数量区域', submitter: '演示专员', customer_name: customers[15].customer_name, status: '待处理', created_at: stamp, updated_at: stamp},
      {id: id(404), type: '客户需求', description: '上线前支持批量回放历史订单并导出识别率摘要', submitter: '周同事', customer_name: customers[6].customer_name, status: '处理中', created_at: stamp, updated_at: stamp},
      {id: id(405), type: '客户需求', description: '商品单位不一致时增加显式提醒', submitter: '演示专员', customer_name: customers[0].customer_name, status: '已完成', created_at: stamp, updated_at: stamp},
      {id: id(406), type: 'Admin运营需求', description: '每日跟进结果支持按工单状态整理，方便会议复盘', submitter: '演示专员', customer_name: null, status: '处理中', created_at: stamp, updated_at: stamp},
      {id: id(407), type: 'Admin运营需求', description: '新客户首单培训增加标准检查清单', submitter: '林同事', customer_name: null, status: '待处理', created_at: stamp, updated_at: stamp}
    ];
    var events = [
      {id: id(500), customer_id: customers[0].id, event_type: 'trial_started', event_date: addDays(today, -5), details: {note: '开始七天试用'}, actor: '演示专员', created_at: stamp},
      {id: id(501), customer_id: customers[5].id, event_type: 'payment_confirmed', event_date: customers[5].payment_date, details: {note: '确认充值'}, actor: '演示专员', created_at: stamp}
    ];
    return {submitters: submitters, customers: customers, recognition_records: recognitionRecords, requirements: requirements,
      import_batches: [], customer_aliases: [], customer_metric_snapshots: [], customer_events: events,
      abnormal_import_batches: [batch], abnormal_reviews: abnormalReviews, conversion_periods: [], crm_audit_logs: [],
      demo: true, seedVersion: 2, previousSaturday: previousSaturday};
  }

  function read() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return seed();
    try {
      var state = JSON.parse(saved);
      if (state.demo === true && state.seedVersion === 2 && TABLES.every(function (table) { return Array.isArray(state[table]); })) return state;
    } catch (error) { /* Rebuild a corrupt local demo, never access production data. */ }
    return seed();
  }

  var lastState = read();

  function errorResult(error) {
    return {data: null, error: {message: error.message || String(error), code: error.code || 'DEMO_ERROR'}};
  }

  function fail(message, code) {
    var error = new Error(message);
    error.code = code || 'DEMO_ERROR';
    throw error;
  }

  function notify(table, eventType, row) {
    listeners.forEach(function (listener) {
      listener.handlers.forEach(function (handler) {
        if (handler.filter.table === table) handler.callback({eventType: eventType, new: eventType === 'DELETE' ? null : row, old: eventType === 'DELETE' ? row : null});
      });
    });
  }

  function transact(action) {
    var state = read();
    var result = action(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    lastState = state;
    if (result && result.events) result.events.forEach(function (event) { notify(event.table, event.type, event.row); });
    return result && result.data;
  }

  function addRow(state, table, input) {
    var row = Object.assign({id: newId(), created_at: iso()}, input);
    if (table === 'customers' || table === 'requirements' || table === 'abnormal_reviews' || table === 'conversion_periods') row.updated_at = iso();
    if (table === 'submitters' && state.submitters.some(function (item) { return item.name === row.name; })) fail('该人员已存在', '23505');
    if (table === 'recognition_records') {
      if (!Number.isFinite(Number(row.recognition_rate)) || row.recognition_rate < 0 || row.recognition_rate > 100 ||
          !Number.isInteger(Number(row.order_count)) || row.order_count < 0 || row.order_count > 10000000) fail('指标超出允许范围');
      if (state.recognition_records.some(function (item) { return item.customer_id === row.customer_id && item.record_date === row.record_date; })) fail('同一客户同一天已有记录', '23505');
    }
    state[table].push(row);
    return row;
  }

  function removeCustomerDependents(state, customerId) {
    ['recognition_records', 'customer_aliases', 'customer_metric_snapshots', 'customer_events'].forEach(function (table) {
      state[table] = state[table].filter(function (item) { return item.customer_id !== customerId; });
    });
    state.abnormal_reviews.forEach(function (review) { if (review.trial_customer_id === customerId) review.trial_customer_id = null; });
  }

  function query(table) {
    var operation = 'read';
    var payload = null;
    var filters = [];
    var sorts = [];
    var start = 0;
    var end = Infinity;
    var one = false;
    var executed = false;
    var cached;
    var builder = {
      select: function () { return builder; },
      insert: function (value) { operation = 'insert'; payload = value; return builder; },
      update: function (value) { operation = 'update'; payload = value; return builder; },
      delete: function () { operation = 'delete'; return builder; },
      eq: function (field, value) { filters.push([field, value]); return builder; },
      order: function (field, options) { sorts.push([field, !options || options.ascending !== false]); return builder; },
      range: function (first, last) { start = first; end = last + 1; return builder; },
      single: function () { one = true; return builder; },
      then: function (resolve, reject) { return Promise.resolve().then(execute).then(resolve, reject); }
    };
    function execute() {
      if (executed) return cached;
      executed = true;
      try {
        if (TABLES.indexOf(table) === -1) fail('演示版不支持此数据表');
        if (operation === 'read') {
          var rows = read()[table].filter(function (item) {
            return filters.every(function (filter) { return item[filter[0]] === filter[1]; });
          });
          rows.sort(function (left, right) {
            for (var index = 0; index < sorts.length; index++) {
              var field = sorts[index][0];
              var direction = sorts[index][1] ? 1 : -1;
              var comparison = String(left[field] == null ? '' : left[field]).localeCompare(String(right[field] == null ? '' : right[field]));
              if (comparison) return comparison * direction;
            }
            return 0;
          });
          rows = rows.slice(start, end);
          cached = {data: one ? rows[0] || null : rows, error: null};
          return cached;
        }
        var data = transact(function (state) {
          var events = [];
          var rows = state[table];
          if (operation === 'insert') {
            var inputs = Array.isArray(payload) ? payload : [payload];
            var inserted = inputs.map(function (input) {
              var row = addRow(state, table, input);
              events.push({table: table, type: 'INSERT', row: row});
              return row;
            });
            return {data: one ? inserted[0] : inserted, events: events};
          }
          var matches = rows.filter(function (row) { return filters.every(function (filter) { return row[filter[0]] === filter[1]; }); });
          if (operation === 'update') {
            matches.forEach(function (row) {
              Object.assign(row, payload);
              if ('updated_at' in row) row.updated_at = iso();
              events.push({table: table, type: 'UPDATE', row: row});
            });
          } else {
            var deletedIds = new Set(matches.map(function (row) { return row.id; }));
            state[table] = rows.filter(function (row) { return !deletedIds.has(row.id); });
            if (table === 'customers') matches.forEach(function (row) { removeCustomerDependents(state, row.id); });
            matches.forEach(function (row) { events.push({table: table, type: 'DELETE', row: row}); });
          }
          return {data: one ? matches[0] || null : matches, events: events};
        });
        cached = {data: data, error: null};
      } catch (error) { cached = errorResult(error); }
      return cached;
    }
    return builder;
  }

  function commitRows(state, table, updates, deletes) {
    var saved = [];
    var events = [];
    updates.forEach(function (entry) {
      var row = state[table].find(function (item) { return item.id === entry.id; });
      if (!row || row.updated_at !== entry.expected_updated_at) fail('CRM_CONFLICT:记录已在另一窗口修改', 'CRM_CONFLICT');
      Object.assign(row, entry.changes);
      row.updated_at = iso();
      saved.push({id: row.id, updated_at: row.updated_at});
      events.push({table: table, type: 'UPDATE', row: row});
    });
    deletes.forEach(function (entry) {
      var row = state[table].find(function (item) { return item.id === entry.id; });
      if (!row || row.updated_at !== entry.expected_updated_at) fail('CRM_CONFLICT:记录已在另一窗口修改', 'CRM_CONFLICT');
      state[table] = state[table].filter(function (item) { return item.id !== row.id; });
      if (table === 'customers') removeCustomerDependents(state, row.id);
      events.push({table: table, type: 'DELETE', row: row});
    });
    return {data: {saved: saved.length, deleted: deletes.length, items: saved}, events: events};
  }

  function rpc(name, args) {
    return Promise.resolve().then(function () {
      try {
        if (name === 'crm_security_version') return {data: 14, error: null};
        if (name === 'is_crm_member') return {data: true, error: null};
        if (name === 'crm_current_member') return {data: member, error: null};
        if (name === 'crm_restore_backup') fail('公开演示版禁用 JSON 恢复，避免导入真实客户数据');
        var data = transact(function (state) {
          if (name === 'crm_commit_customers') return commitRows(state, 'customers', args.p_updates, args.p_deletes);
          if (name === 'crm_commit_abnormal_reviews') return commitRows(state, 'abnormal_reviews', args.p_updates, args.p_deletes);
          if (name === 'crm_archive_abnormal_period') {
            var rows = state.abnormal_reviews.filter(function (item) { return item.period_start === args.p_period_start && item.period_end === args.p_period_end && !item.archived_at; });
            if (!rows.length) fail('该周期已经存档');
            var archivedAt = iso();
            rows.forEach(function (row) { row.archived_at = archivedAt; row.updated_at = archivedAt; });
            return {data: {archived: rows.length, archived_at: archivedAt}, events: rows.map(function (row) { return {table: 'abnormal_reviews', type: 'UPDATE', row: row}; })};
          }
          if (name === 'crm_archive_conversion_period') {
            var existing = state.conversion_periods.find(function (item) { return item.period_start === args.p_period_start && item.period_end === args.p_period_end; });
            if (existing) return {data: existing};
            var period = addRow(state, 'conversion_periods', {period_start: args.p_period_start, period_end: args.p_period_end, archived_at: iso(), archived_by: member.submitter_name});
            return {data: period, events: [{table: 'conversion_periods', type: 'INSERT', row: period}]};
          }
          if (name === 'crm_add_abnormal_review') {
            var input = args.p_item;
            if (state.abnormal_reviews.some(function (item) { return item.customer_name === input.customer_name && item.period_start === input.period_start && item.period_end === input.period_end; })) fail('本周期已有同名客户');
            var batch = state.abnormal_import_batches.find(function (item) { return item.period_start === input.period_start && item.period_end === input.period_end; });
            if (!batch) fail('请先导入该异常盘点周期');
            var row = addRow(state, 'abnormal_reviews', Object.assign({batch_id: batch.id, submitter: member.submitter_name,
              period_type: '上周', abnormal_type: '其他', recognition_rate: null, order_count: null, archived_at: null}, input));
            return {data: row, events: [{table: 'abnormal_reviews', type: 'INSERT', row: row}]};
          }
          if (name === 'crm_import_abnormal_reviews') {
            if (state.abnormal_reviews.some(function (item) { return !item.archived_at; })) fail('请先存档当前异常周期');
            var batchInput = args.p_batch;
            var batch = addRow(state, 'abnormal_import_batches', Object.assign({}, batchInput, {imported_by: member.submitter_name}));
            var imported = args.p_rows.map(function (item) {
              return addRow(state, 'abnormal_reviews', {batch_id: batch.id, customer_name: item.tenant, trial_customer_id: item.trial_customer_id || null,
                owner_submitter_id: member.submitter_id, submitter: null, period_type: '上周', period_start: batch.period_start,
                period_end: batch.period_end, recognition_rate: item.recognition_rate, order_count: item.order_count,
                abnormal_type: item.abnormal_type, online_status: null, abnormal_reason: null, follow_up_result: null,
                work_order_url: null, archived_at: null});
            });
            return {data: {batch_id: batch.id, reviews: imported.length}, events: imported.map(function (row) { return {table: 'abnormal_reviews', type: 'INSERT', row: row}; })};
          }
          if (name === 'crm_import_metrics') {
            var metricBatch = addRow(state, 'import_batches', args.p_batch);
            var metricCount = 0;
            var newCustomers = 0;
            args.p_rows.forEach(function (item) {
              var customer = state.customers.find(function (candidate) { return candidate.id === item.customer_id || candidate.customer_name === item.tenant; });
              if (!customer) {
                customer = addRow(state, 'customers', {customer_name: item.tenant, owner_submitter_id: member.submitter_id,
                  submitter: member.submitter_name, status: '试用中', trial_start_date: shanghaiToday(), trial_end_date: addDays(shanghaiToday(), 6),
                  payment_date: null, payment_amount: null, handover_date: null, online_date: null, abnormal_reason: null});
                newCustomers++;
              }
              if (!state.customer_aliases.some(function (alias) { return alias.alias_name === item.tenant; })) addRow(state, 'customer_aliases', {customer_id: customer.id, alias_name: item.tenant});
              Object.keys(item.metrics).forEach(function (code) {
                addRow(state, 'customer_metric_snapshots', {customer_id: customer.id, batch_id: metricBatch.id, metric_code: code,
                  metric_value: item.metrics[code], sample_size: item.sample_size, period_type: metricBatch.period_type,
                  period_start: metricBatch.period_start, period_end: metricBatch.period_end,
                  data_cutoff_date: metricBatch.data_cutoff_date, imported_by: metricBatch.imported_by});
                metricCount++;
              });
            });
            return {data: {batch_id: metricBatch.id, customers: args.p_rows.length, new_customers: newCustomers, metrics: metricCount}};
          }
          fail('演示版尚不支持此操作：' + name);
        });
        return {data: data, error: null};
      } catch (error) { return errorResult(error); }
    });
  }

  function channel(name) {
    var listener = {name: name, handlers: []};
    return {
      on: function (event, filter, callback) { listener.handlers.push({filter: filter, callback: callback}); return this; },
      subscribe: function (callback) { listeners.push(listener); if (callback) Promise.resolve().then(function () { callback('SUBSCRIBED'); }); return this; },
      remove: function () { listeners = listeners.filter(function (item) { return item !== listener; }); }
    };
  }

  window.addEventListener('storage', function (event) {
    if (event.key !== STORAGE_KEY) return;
    var nextState = read();
    TABLES.forEach(function (table) {
      var previous = new Map(lastState[table].map(function (row) { return [row.id, row]; }));
      var current = new Map(nextState[table].map(function (row) { return [row.id, row]; }));
      previous.forEach(function (row, rowId) { if (!current.has(rowId)) notify(table, 'DELETE', row); });
      current.forEach(function (row, rowId) {
        if (!previous.has(rowId) || JSON.stringify(previous.get(rowId)) !== JSON.stringify(row)) notify(table, previous.has(rowId) ? 'UPDATE' : 'INSERT', row);
      });
    });
    lastState = nextState;
  });

  window.WorkbenchDemo = {
    reset: function () { localStorage.removeItem(STORAGE_KEY); location.reload(); },
    storageKey: STORAGE_KEY
  };
  window.supabase = {
    createClient: function () {
      return {
        from: query,
        rpc: rpc,
        channel: channel,
        removeChannel: function (listener) { if (listener && listener.remove) listener.remove(); },
        auth: {
          getSession: function () { return Promise.resolve({data: {session: session}, error: null}); },
          onAuthStateChange: function () { return {data: {subscription: {unsubscribe: function () {}}}}; },
          signOut: function () { return Promise.resolve({error: null}); },
          signInWithPassword: function () { return Promise.resolve({data: {session: session}, error: null}); }
        }
      };
    }
  };
})();
