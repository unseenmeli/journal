/* =========================================================
   შესვლის ეკრანი — questionarySECR.html
   ---------------------------------------------------------
   ⚠️  ეს არ არის ნამდვილი ავთენტიფიკაცია.
   შემოწმება ხდება ბრაუზერში, ამიტომ ვისაც გვერდის კოდის
   ნახვა შეუძლია, მას ბაზასთან პირდაპირი წვდომაც აქვს.
   ეს იცავს შემთხვევითი მნახველისგან — არა მიზანმიმართულისგან.

   ნამდვილი დაცვისთვის საჭიროა Supabase Auth (იხ. SETUP.md).
   ========================================================= */
(function (global) {
  'use strict';

  var KEY = 'qsecr_session';
  var TTL = 8 * 60 * 60 * 1000;   // 8 საათი

  var gate     = document.getElementById('gate');
  var form     = document.getElementById('gateForm');
  var userEl   = document.getElementById('user');
  var passEl   = document.getElementById('pass');
  var errEl    = document.getElementById('gateErr');
  var btn      = document.getElementById('gateBtn');
  var btnLabel = document.getElementById('gateBtnLabel');

  var head   = document.getElementById('panelHead');
  var main   = document.getElementById('main');
  var foot   = document.getElementById('panelFooter');
  var whoami = document.getElementById('whoami');

  /* ---------- SHA-256 ---------- */
  function sha256(text) {
    var bytes = new TextEncoder().encode(text);
    return crypto.subtle.digest('SHA-256', bytes).then(function (buf) {
      return Array.prototype.map
        .call(new Uint8Array(buf), function (b) {
          return ('00' + b.toString(16)).slice(-2);
        })
        .join('');
    });
  }

  /* ---------- სესია ---------- */
  function saveSession(admin) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        name: admin.display_name || admin.username,
        until: Date.now() + TTL
      }));
    } catch (e) { /* private mode — სესია არ შეინახება */ }
  }

  function readSession() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.until || Date.now() > s.until) {
        localStorage.removeItem(KEY);
        return null;
      }
      return s;
    } catch (e) { return null; }
  }

  function clearSession() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  /* ---------- ინტერფეისის გადართვა ---------- */
  function showPanel(name) {
    gate.hidden = true;
    head.hidden = false;
    main.hidden = false;
    if (foot) foot.hidden = false;
    if (whoami) whoami.textContent = name || '';

    document.body.classList.remove('is-locked');

    // პანელს ვატყობინებთ, რომ შეიძლება ჩატვირთვა
    if (typeof global.PanelStart === 'function') global.PanelStart();
  }

  function showGate() {
    gate.hidden = false;
    head.hidden = true;
    main.hidden = true;
    if (foot) foot.hidden = true;
    document.body.classList.add('is-locked');
    userEl.focus();
  }

  function showError(msg) {
    errEl.textContent = msg;
    errEl.hidden = false;
  }

  /* ---------- შესვლა ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errEl.hidden = true;

    var u = userEl.value.trim().toLowerCase();
    var p = passEl.value;

    if (!u || !p) {
      showError('შეავსეთ ორივე ველი.');
      return;
    }

    if (!global.supabase || !global.SUPABASE_URL ||
        global.SUPABASE_URL.indexOf('PASTE_') === 0) {
      showError('ბაზა არ არის კონფიგურირებული (js/config.js).');
      return;
    }

    btn.disabled = true;
    btnLabel.textContent = 'მოწმდება…';

    var client = global.supabase.createClient(global.SUPABASE_URL, global.SUPABASE_ANON_KEY);

    sha256(p)
      .then(function (hash) {
        return client.from('admins')
          .select('username, pass_hash, display_name, is_active')
          .eq('username', u)
          .eq('is_active', true)
          .maybeSingle()
          .then(function (res) {
            if (res.error) throw res.error;

            // ერთი და იგივე შეტყობინება — არ ვამხელთ, არსებობს თუ არა მომხმარებელი
            if (!res.data || res.data.pass_hash !== hash) {
              showError('მომხმარებელი ან პაროლი არასწორია.');
              passEl.value = '';
              passEl.focus();
              return;
            }

            saveSession(res.data);
            showPanel(res.data.display_name || res.data.username);
          });
      })
      .catch(function (err) {
        console.error('[gate]', err);
        showError('შემოწმება ვერ მოხერხდა: ' +
                  (err && err.message ? err.message : 'უცნობი შეცდომა'));
      })
      .then(function () {
        btn.disabled = false;
        btnLabel.textContent = 'შესვლა';
      });
  });

  /* ---------- გასვლა ---------- */
  var logout = document.getElementById('logoutBtn');
  if (logout) {
    logout.addEventListener('click', function () {
      clearSession();
      location.reload();
    });
  }

  /* ---------- გაშვება ---------- */
  var session = readSession();
  if (session) showPanel(session.name);
  else showGate();

})(window);
