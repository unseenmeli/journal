/* =========================================================
   სტატიის გაზიარება
   ---------------------------------------------------------
   Facebook სურათსა და სათაურს იღებს გვერდის og: მეტა-თეგებიდან,
   და არა აქედან. ამიტომ:
     • og:image და og:url უნდა იყოს აბსოლუტური მისამართები;
     • გვერდი უნდა იყოს საჯაროდ ხელმისაწვდომი —
       localhost-ს Facebook ვერ ხედავს.
   იხილეთ SETUP.md → "Facebook share".
   ========================================================= */
(function () {
  'use strict';

  /** გვერდის კანონიკური მისამართი og:url-იდან, თუ არსებობს */
  function shareUrl() {
    var og = document.querySelector('meta[property="og:url"]');
    var url = og && og.getAttribute('content');

    // ლოკალურად og:url ჯერ არ არსებობს ბრაუზერში — ვიყენებთ მიმდინარეს
    if (!url) return location.href;

    // თუ ლოკალურად ვტესტავთ, ვაფრთხილებთ კონსოლში
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      console.warn('[share] ლოკალურად Facebook ვერ წაიკითხავს og: თეგებს. ' +
                   'გაზიარება გამოიყენებს: ' + url);
    }
    return url;
  }

  /* ---------- Facebook ---------- */
  var fb = document.getElementById('shareFb');
  if (fb) {
    fb.addEventListener('click', function () {
      var u = 'https://www.facebook.com/sharer/sharer.php?u=' +
              encodeURIComponent(shareUrl());

      // ცენტრირებული პოპ-აპი; თუ ბრაუზერმა დაბლოკა — ახალი ჩანართი
      var w = 620, h = 640;
      var left = Math.max(0, (screen.width  - w) / 2);
      var top  = Math.max(0, (screen.height - h) / 2);

      var win = window.open(u, 'fbshare',
        'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top +
        ',toolbar=0,menubar=0,scrollbars=1,resizable=1');

      if (!win) window.open(u, '_blank', 'noopener');
    });
  }

  /* ---------- ბმულის კოპირება ---------- */
  var copy  = document.getElementById('copyLink');
  var label = document.getElementById('copyLabel');
  var status= document.getElementById('shareStatus');

  if (copy) {
    var resetTimer = null;

    // სწრაფი განმეორებითი დაჭერისას ძველი ტაიმერი უნდა გაუქმდეს,
    // თორემ წინა დაჭერის ტაიმერი ახალ მდგომარეობას ნაადრევად შლის
    var scheduleReset = function () {
      clearTimeout(resetTimer);
      resetTimer = setTimeout(function () {
        copy.classList.remove('is-done');
        label.textContent = 'ბმულის კოპირება';
      }, 2000);
    };

    copy.addEventListener('click', function () {
      var url = shareUrl();

      var done = function () {
        copy.classList.add('is-done');
        label.textContent = 'დაკოპირდა';
        if (status) status.textContent = 'ბმული დაკოპირდა.';
        scheduleReset();
      };

      var fail = function () {
        copy.classList.remove('is-done');
        label.textContent = 'კოპირება ვერ მოხერხდა';
        if (status) status.textContent = 'კოპირება ვერ მოხერხდა.';
        scheduleReset();
      };

      // Clipboard API მხოლოდ https-ზე და localhost-ზე მუშაობს
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, fail);
        return;
      }

      // ძველი ბრაუზერების სარეზერვო გზა
      try {
        var t = document.createElement('textarea');
        t.value = url;
        t.setAttribute('readonly', '');
        t.style.position = 'fixed';
        t.style.opacity = '0';
        document.body.appendChild(t);
        t.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(t);
        ok ? done() : fail();
      } catch (e) { fail(); }
    });
  }

})();
