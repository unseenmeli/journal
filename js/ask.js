/* =========================================================
   კითხვა ექიმს — ფორმის ლოგიკა
   ---------------------------------------------------------
   ვალიდაცია, ინტერფეისი და Supabase-ში გაგზავნა.
   კონფიგურაცია: js/config.js
   ========================================================= */
(function () {
  'use strict';

  var form = document.getElementById('askForm');
  if (!form) return;

  var sentBox   = document.getElementById('sentBox');
  var againBtn  = document.getElementById('againBtn');
  var submitBtn = document.getElementById('submitBtn');
  var statusEl  = document.getElementById('formStatus');
  var qField    = document.getElementById('question');
  var qCount    = document.getElementById('qCount');
  var countWrap = document.getElementById('count-question');
  var phone     = document.getElementById('phone');

  var MAX = 1500;

  /* ---------- 1. სიმბოლოების მთვლელი ---------- */
  function updateCount() {
    var n = qField.value.length;
    qCount.textContent = n;
    countWrap.classList.toggle('is-near', n > MAX - 150);
  }
  qField.addEventListener('input', updateCount);
  updateCount();

  /* ---------- 2. ტელეფონის ფორმატირება ----------
     ვტოვებთ მხოლოდ ციფრებს და ვაჯგუფებთ: 5XX XX XX XX  */
  phone.addEventListener('input', function () {
    var digits = phone.value.replace(/\D/g, '').slice(0, 9);
    var out = digits;
    if (digits.length > 3) out = digits.slice(0, 3) + ' ' + digits.slice(3);
    if (digits.length > 5) out = digits.slice(0, 3) + ' ' + digits.slice(3, 5) + ' ' + digits.slice(5);
    if (digits.length > 7) out = digits.slice(0, 3) + ' ' + digits.slice(3, 5) + ' ' +
                                 digits.slice(5, 7) + ' ' + digits.slice(7);
    phone.value = out;
    clearError(phone);
  });

  /* ---------- 3. ვალიდაცია ---------- */
  var RULES = {
    firstName: {
      test: function (v) { return v.trim().length >= 2; },
      msg:  'გთხოვთ, მიუთითოთ სახელი (მინიმუმ 2 სიმბოლო).'
    },
    lastName: {
      test: function (v) { return v.trim().length >= 2; },
      msg:  'გთხოვთ, მიუთითოთ გვარი (მინიმუმ 2 სიმბოლო).'
    },
    phone: {
      // ქართული მობილური: 9 ციფრი, იწყება 5-ით
      test: function (v) {
        var d = v.replace(/\D/g, '');
        return d.length === 9 && d.charAt(0) === '5';
      },
      msg:  'შეიყვანეთ 9-ნიშნა მობილურის ნომერი (იწყება 5-ით).'
    },
    question: {
      test: function (v) { return v.trim().length >= 15; },
      msg:  'გთხოვთ, აღწეროთ კითხვა ოდნავ დეტალურად (მინიმუმ 15 სიმბოლო).'
    },
    consent: {
      test: function (v, el) { return el.checked; },
      msg:  'გაგზავნისთვის საჭიროა თანხმობა.'
    }
  };

  function showError(el, msg) {
    var err = document.getElementById('err-' + el.id);
    el.setAttribute('aria-invalid', 'true');
    if (err) { err.textContent = msg; err.hidden = false; }
  }

  function clearError(el) {
    var err = document.getElementById('err-' + el.id);
    el.removeAttribute('aria-invalid');
    if (err) { err.hidden = true; err.textContent = ''; }
  }

  /** ამოწმებს ერთ ველს; აბრუნებს true თუ სწორია */
  function validateField(id) {
    var el = document.getElementById(id);
    var rule = RULES[id];
    if (!el || !rule) return true;

    if (rule.test(el.value, el)) { clearError(el); return true; }
    showError(el, rule.msg);
    return false;
  }

  // ველიდან გასვლისას ვამოწმებთ, შეყვანისას შეცდომას ვშლით
  Object.keys(RULES).forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('blur', function () {
      // ცარიელ ველს ხელახლა არ ვაწითლებთ სანამ არ სცადეს გაგზავნა
      if (el.type !== 'checkbox' && el.value === '') return;
      validateField(id);
    });

    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', function () {
      if (el.getAttribute('aria-invalid') === 'true') validateField(id);
    });
  });

  /* ---------- 4. გაგზავნა ---------- */

  /**
   * მონაცემების გაგზავნა Supabase-ში.
   * კონფიგურაცია: js/config.js
   */
  function sendToBackend(data) {
    if (!window.supabase || !window.SUPABASE_URL ||
        window.SUPABASE_URL.indexOf('PASTE_') === 0) {
      return Promise.reject(new Error('Supabase არ არის კონფიგურირებული (js/config.js)'));
    }

    var client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    return client.from('questions').insert({
      first_name: data.firstName,
      last_name:  data.lastName,
      phone:      data.phone,
      category:   data.category || null,
      question:   data.question
    }).then(function (res) {
      // Supabase შეცდომას აბრუნებს res.error-ში და არა throw-ით
      if (res.error) throw res.error;
      return res;
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // ყველა ველის შემოწმება
    var firstBad = null;
    Object.keys(RULES).forEach(function (id) {
      if (!validateField(id) && !firstBad) firstBad = document.getElementById(id);
    });

    if (firstBad) {
      statusEl.textContent = 'ფორმაში არის შეცდომები. გთხოვთ, შეამოწმოთ მონიშნული ველები.';
      firstBad.focus();
      if (firstBad.scrollIntoView) {
        firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      return;
    }

    var data = {
      firstName: document.getElementById('firstName').value.trim(),
      lastName:  document.getElementById('lastName').value.trim(),
      phone:     '+995' + phone.value.replace(/\D/g, ''),
      category:  document.getElementById('category').value || '',
      question:  qField.value.trim(),
      createdAt: new Date().toISOString()
    };

    // ღილაკის ჩაკეტვა ორმაგი გაგზავნის თავიდან ასაცილებლად
    submitBtn.disabled = true;
    submitBtn.querySelector('.form__submit-label').textContent = 'იგზავნება…';
    statusEl.textContent = 'კითხვა იგზავნება…';

    sendToBackend(data)
      .then(function () {
        form.hidden = true;
        sentBox.hidden = false;
        statusEl.textContent = 'კითხვა წარმატებით გაიგზავნა.';
        sentBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
      })
      .catch(function (err) {
        console.error('[ask] გაგზავნა ვერ მოხერხდა:', err);
        statusEl.textContent = 'გაგზავნა ვერ მოხერხდა.';
        alertInline('გაგზავნა ვერ მოხერხდა: ' +
                    (err && err.message ? err.message : 'უცნობი შეცდომა') +
                    '. გთხოვთ, სცადოთ ხელახლა.');
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.querySelector('.form__submit-label').textContent = 'კითხვის გაგზავნა';
      });
  });

  /** შეცდომის შეტყობინება ფორმის ბოლოში (alert() ბლოკავს გვერდს) */
  function alertInline(msg) {
    var box = document.getElementById('sendError');
    if (!box) {
      box = document.createElement('p');
      box.id = 'sendError';
      box.className = 'field__err';
      submitBtn.parentNode.insertBefore(box, submitBtn.nextSibling);
    }
    box.textContent = msg;
    box.hidden = false;
  }

  /* ---------- 5. თავიდან დაწყება ---------- */
  againBtn.addEventListener('click', function () {
    form.reset();
    Object.keys(RULES).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) clearError(el);
    });
    updateCount();
    sentBox.hidden = true;
    form.hidden = false;
    document.getElementById('firstName').focus();
    form.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

})();
