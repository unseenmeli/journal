/* =========================================================
   ექიმთან დიალოგი — მთავარი სკრიპტი
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 1. მობილური მენიუ ---------- */
  var burger = document.getElementById('burger');
  var nav    = document.getElementById('nav');

  if (burger && nav) {
    var setMenu = function (open) {
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'მენიუს დახურვა' : 'მენიუს გახსნა');
    };

    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      setMenu(!nav.classList.contains('is-open'));
    });

    // ბმულზე დაჭერისას მენიუ იხურება
    nav.addEventListener('click', function (e) {
      if (e.target.closest('.nav__link')) setMenu(false);
    });

    // გარეთ დაჭერისას იხურება
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') &&
          !nav.contains(e.target) && !burger.contains(e.target)) {
        setMenu(false);
      }
    });

    // Escape კლავიშით იხურება
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenu(false);
        burger.focus();
      }
    });

    // დესკტოპზე გადასვლისას მდგომარეობა იწმინდება
    var mq = window.matchMedia('(min-width: 941px)');
    var onChange = function (ev) { if (ev.matches) setMenu(false); };
    mq.addEventListener ? mq.addEventListener('change', onChange)
                        : mq.addListener(onChange);
  }

  /* ---------- 2. ჰედერის ჩრდილი გადაფურცვლისას ---------- */
  var header = document.getElementById('header');
  if (header) {
    var ticking = false;
    var update = function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- 3. გამოჩენის ანიმაცია ---------- */
  var items = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    // ძველი ბრაუზერი — უბრალოდ ვაჩვენებთ
    Array.prototype.forEach.call(items, function (el) {
      el.classList.add('is-visible');
    });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // მსუბუქი კასკადი მეზობელ ელემენტებს შორის
        var siblings = el.parentNode ? el.parentNode.children : [el];
        var idx = Array.prototype.indexOf.call(siblings, el);
        el.style.transitionDelay = Math.min(idx, 6) * 70 + 'ms';
        el.classList.add('is-visible');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    Array.prototype.forEach.call(items, function (el) { io.observe(el); });
  }

  /* ---------- 4. მიმდინარე წელი ფუტერში ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

})();
