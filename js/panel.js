/* =========================================================
   კითხვების პანელი — questionarySECR.html
   კითხვები იკითხება Supabase-იდან
   ========================================================= */
(function () {
  'use strict';

  var listEl    = document.getElementById('qlist');
  var emptyBox  = document.getElementById('emptyBox');
  var emptyText = document.getElementById('emptyText');
  var loading   = document.getElementById('loadingBox');
  var searchBox = document.getElementById('searchBox');
  var statusEl  = document.getElementById('panelStatus');
  var countNew  = document.getElementById('countNew');
  var countDone = document.getElementById('countDone');
  var tabNew    = document.getElementById('tab-new');
  var tabDone   = document.getElementById('tab-done');
  var refreshBtn= document.getElementById('refreshBtn');

  // მოდალის ელემენტები
  var modal      = document.getElementById('modal');
  var modalId    = document.getElementById('modalId');
  var modalName  = document.getElementById('modalTitle');
  var modalPhone = document.getElementById('modalPhone');
  var modalPhoneT= document.getElementById('modalPhoneText');
  var modalCat   = document.getElementById('modalCat');
  var modalDate  = document.getElementById('modalDate');
  var modalQ     = document.getElementById('modalQuestion');
  var readCheck  = document.getElementById('readCheck');

  var rows = [];          // ყველა კითხვა ბაზიდან
  var tab  = 'new';       // 'new' | 'done'
  var openRow = null;     // ამჟამად გახსნილი
  var lastFocus = null;   // ფოკუსის დასაბრუნებლად
  var db = null;

  /* ---------- Supabase ---------- */
  function connect() {
    if (db) return db;
    if (!window.supabase || !window.SUPABASE_URL ||
        window.SUPABASE_URL.indexOf('PASTE_') === 0) return null;
    db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    return db;
  }

  /* ---------- ჩატვირთვა ---------- */
  function load() {
    var client = connect();

    if (!client) {
      loading.hidden = true;
      emptyBox.hidden = false;
      emptyText.textContent = 'Supabase არ არის კონფიგურირებული — შეავსეთ js/config.js.';
      return;
    }

    loading.hidden = false;
    emptyBox.hidden = true;
    listEl.innerHTML = '';

    client.from('questions')
      .select('*')
      .order('created_at', { ascending: false })   // ახლიდან ძველისკენ
      .then(function (res) {
        loading.hidden = true;

        if (res.error) {
          emptyBox.hidden = false;
          emptyText.textContent = 'ჩატვირთვა ვერ მოხერხდა: ' + res.error.message;
          console.error('[panel]', res.error);
          return;
        }

        rows = res.data || [];
        render();
        statusEl.textContent = rows.length + ' კითხვა ჩაიტვირთა.';
      });
  }

  /* ---------- ნომერი: QN + id ---------- */
  function qn(row) {
    return 'QN' + row.id;
  }

  /* ---------- თარიღი ქართულად ---------- */
  var MONTHS = ['იანვარი','თებერვალი','მარტი','აპრილი','მაისი','ივნისი',
                'ივლისი','აგვისტო','სექტემბერი','ოქტომბერი','ნოემბერი','დეკემბერი'];

  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var h = d.getHours(), m = d.getMinutes();
    var ampm = h < 12 ? 'AM' : 'PM';
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' +
           h12 + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
  }

  function fullName(row) {
    return ((row.first_name || '') + ' ' + (row.last_name || '')).trim() || '—';
  }

  /* ---------- ფილტრი ---------- */
  function visible() {
    var q = (searchBox.value || '').trim().toLowerCase();

    return rows.filter(function (r) {
      // ტაბი
      if (tab === 'new'  && r.is_read) return false;
      if (tab === 'done' && !r.is_read) return false;

      if (!q) return true;

      // ძებნა სახელით, ნომრით, ტექსტით, QN-ით
      return (fullName(r) + ' ' + (r.phone || '') + ' ' +
              (r.question || '') + ' ' + qn(r)).toLowerCase().indexOf(q) !== -1;
    });
  }

  /* ---------- სიის დახატვა ---------- */
  function render() {
    var items = visible();

    countNew.textContent  = rows.filter(function (r) { return !r.is_read; }).length;
    countDone.textContent = rows.filter(function (r) { return r.is_read; }).length;

    listEl.innerHTML = '';

    if (!items.length) {
      emptyBox.hidden = false;
      emptyText.textContent = searchBox.value.trim()
        ? 'ძებნის შედეგი ვერ მოიძებნა.'
        : (tab === 'new' ? 'ახალი კითხვები არ არის.' : 'პასუხგაცემული კითხვები არ არის.');
      return;
    }
    emptyBox.hidden = true;

    items.forEach(function (row) {
      var li = document.createElement('li');

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'qitem' + (row.is_read ? ' is-read' : '');

      // წაუკითხავის წერტილი
      var dot = document.createElement('span');
      dot.className = 'qitem__dot';
      dot.setAttribute('aria-hidden', 'true');

      var main = document.createElement('div');
      main.className = 'qitem__main';

      // ზედა ხაზი: QN31 — კითხვის დასაწყისი
      var top = document.createElement('div');
      top.className = 'qitem__top';

      var idEl = document.createElement('span');
      idEl.className = 'qitem__id';
      idEl.textContent = qn(row);

      var txt = document.createElement('span');
      txt.className = 'qitem__text';
      txt.textContent = row.question || '';

      top.appendChild(idEl);
      top.appendChild(txt);

      // ქვედა ხაზი: თარიღი · სახელი
      var sub = document.createElement('div');
      sub.className = 'qitem__sub';
      sub.appendChild(document.createTextNode(fmtDate(row.created_at)));

      var sep = document.createElement('span');
      sep.className = 'qitem__sep';
      sep.textContent = '·';
      sub.appendChild(sep);
      sub.appendChild(document.createTextNode(fullName(row)));

      main.appendChild(top);
      main.appendChild(sub);

      // ისარი
      var arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      arrow.setAttribute('class', 'qitem__arrow');
      arrow.setAttribute('width', '17');
      arrow.setAttribute('height', '17');
      arrow.setAttribute('viewBox', '0 0 24 24');
      arrow.setAttribute('fill', 'none');
      arrow.setAttribute('stroke', 'currentColor');
      arrow.setAttribute('stroke-width', '2.2');
      arrow.setAttribute('stroke-linecap', 'round');
      arrow.setAttribute('aria-hidden', 'true');
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', 'M9 6l6 6-6 6');
      arrow.appendChild(p);

      btn.appendChild(dot);
      btn.appendChild(main);
      btn.appendChild(arrow);

      btn.addEventListener('click', function () { openModal(row, btn); });

      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  /* ---------- მოდალი ---------- */
  function openModal(row, trigger) {
    openRow = row;
    lastFocus = trigger || null;

    modalId.textContent   = qn(row);
    modalName.textContent = fullName(row);
    modalQ.textContent    = row.question || '';
    modalDate.textContent = fmtDate(row.created_at);

    modalPhoneT.textContent = row.phone || '—';
    modalPhone.href = row.phone ? 'tel:' + row.phone.replace(/\s/g, '') : '#';

    if (row.category) {
      modalCat.textContent = row.category;
      modalCat.hidden = false;
    } else {
      modalCat.hidden = true;
    }

    readCheck.checked = !!row.is_read;

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    document.getElementById('modalClose').focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    openRow = null;
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', closeModal);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  /* ---------- წაკითხულად მონიშვნა ---------- */
  readCheck.addEventListener('change', function () {
    if (!openRow) return;

    var client = connect();
    var val = readCheck.checked;
    var row = openRow;

    // ოპტიმისტური განახლება — ინტერფეისი მაშინვე რეაგირებს
    row.is_read = val;
    render();

    if (!client) return;

    client.from('questions')
      .update({ is_read: val })
      .eq('id', row.id)
      .then(function (res) {
        if (res.error) {
          // ვაბრუნებთ უკან, თუ ვერ შეინახა
          row.is_read = !val;
          readCheck.checked = !val;
          render();
          console.error('[panel] განახლება ვერ მოხერხდა:', res.error);
          statusEl.textContent = 'შენახვა ვერ მოხერხდა.';
        } else {
          statusEl.textContent = val ? 'მონიშნულია პასუხგაცემულად.' : 'დაბრუნდა კითხვებში.';
        }
      });
  });

  /* ---------- ტაბები ---------- */
  function setTab(next) {
    tab = next;
    var isNew = next === 'new';

    tabNew.classList.toggle('is-active', isNew);
    tabDone.classList.toggle('is-active', !isNew);
    tabNew.setAttribute('aria-selected', String(isNew));
    tabDone.setAttribute('aria-selected', String(!isNew));
    tabNew.tabIndex = isNew ? 0 : -1;
    tabDone.tabIndex = isNew ? -1 : 0;

    render();
  }

  tabNew.addEventListener('click', function () { setTab('new'); });
  tabDone.addEventListener('click', function () { setTab('done'); });

  // ისრებით ტაბებზე გადაადგილება
  [tabNew, tabDone].forEach(function (t) {
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { setTab('done'); tabDone.focus(); }
      if (e.key === 'ArrowLeft')  { setTab('new');  tabNew.focus(); }
    });
  });

  /* ---------- ძებნა ---------- */
  var t;
  searchBox.addEventListener('input', function () {
    clearTimeout(t);
    t = setTimeout(render, 160);
  });

  /* ---------- განახლება ---------- */
  refreshBtn.addEventListener('click', function () {
    refreshBtn.classList.add('is-spinning');
    load();
    setTimeout(function () { refreshBtn.classList.remove('is-spinning'); }, 700);
  });

  /* ---------- გაშვება ----------
     ჩატვირთვას იწყებს gate.js შესვლის შემდეგ,
     რომ მონაცემები არ მოითხოვოს ავტორიზაციამდე. */
  window.PanelStart = load;

})();
