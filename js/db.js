/* =========================================================
   ექიმთან დიალოგი — მონაცემთა ბაზის შრე (Supabase)
   ---------------------------------------------------------
   ეს ფაილი ჯერ არ არის ჩართული index.html-ში.
   გასააქტიურებლად იხილეთ SETUP.md.

   რატომ ცალკე ფაილი: ინტერფეისის კოდმა არ უნდა იცოდეს
   რომელ ბაზას ვიყენებთ. თუ ოდესმე Supabase-ს შევცვლით,
   იცვლება მხოლოდ ეს ფაილი.
   ========================================================= */
(function (global) {
  'use strict';

  /* ---------- კონფიგურაცია ----------
     ჩაანაცვლეთ თქვენი პროექტის მონაცემებით.
     anon key საჯაროა და უსაფრთხოა ბრაუზერში —
     დაცვას უზრუნველყოფს Row Level Security (RLS).
     არასოდეს ჩასვათ აქ service_role key.                    */
  var SUPABASE_URL      = 'https://YOUR-PROJECT.supabase.co';
  var SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';

  var client = null;

  /** ბაზასთან კავშირის შექმნა (ერთხელ) */
  function connect() {
    if (client) return client;

    if (!global.supabase || typeof global.supabase.createClient !== 'function') {
      console.warn('[db] Supabase SDK არ არის ჩატვირთული. დაამატეთ CDN <script> index.html-ში.');
      return null;
    }
    if (SUPABASE_URL.indexOf('YOUR-PROJECT') !== -1) {
      console.warn('[db] კონფიგურაცია არ არის შევსებული — იხილეთ js/db.js.');
      return null;
    }

    client = global.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return client;
  }


  /* =======================================================
     კითხვები ექიმს  (მომავალი შეტყობინებების სისტემის საფუძველი)
     ======================================================= */

  /**
   * ახალი კითხვის გაგზავნა.
   * @param {{name:string, email:string, category:string, body:string}} q
   * @returns {Promise<{data:object|null, error:object|null}>}
   */
  function submitQuestion(q) {
    var db = connect();
    if (!db) return Promise.resolve({ data: null, error: { message: 'ბაზა მიუწვდომელია' } });

    return db.from('questions').insert({
      name:     q.name,
      email:    q.email,
      category: q.category,
      body:     q.body,
      status:   'new'
    }).select().single();
  }

  /**
   * ერთი კითხვის საუბრის წაკითხვა.
   * @param {string} questionId
   */
  function fetchMessages(questionId) {
    var db = connect();
    if (!db) return Promise.resolve({ data: [], error: null });

    return db.from('messages')
             .select('*')
             .eq('question_id', questionId)
             .order('created_at', { ascending: true });
  }

  /**
   * პასუხის გაგზავნა საუბარში.
   * @param {string} questionId
   * @param {string} body
   * @param {string} senderRole  'patient' | 'doctor'
   */
  function sendMessage(questionId, body, senderRole) {
    var db = connect();
    if (!db) return Promise.resolve({ data: null, error: { message: 'ბაზა მიუწვდომელია' } });

    return db.from('messages').insert({
      question_id: questionId,
      body:        body,
      sender_role: senderRole
    }).select().single();
  }

  /**
   * რეალურ დროში ახალი შეტყობინებების მოსმენა.
   * ეს არის ის, რაც InstantDB-ს ჩაანაცვლებს — WebSocket გამოწერა.
   *
   * @param {string}   questionId
   * @param {Function} onMessage  გამოიძახება ყოველ ახალ შეტყობინებაზე
   * @returns {{unsubscribe: Function}}
   */
  function subscribeToMessages(questionId, onMessage) {
    var db = connect();
    if (!db) return { unsubscribe: function () {} };

    var channel = db
      .channel('messages:' + questionId)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: 'question_id=eq.' + questionId
      }, function (payload) { onMessage(payload.new); })
      .subscribe();

    return {
      unsubscribe: function () { db.removeChannel(channel); }
    };
  }


  /* =======================================================
     სტატიები
     ======================================================= */

  /** გამოქვეყნებული სტატიების სია, სურვილისამებრ კატეგორიით */
  function fetchArticles(category, limit) {
    var db = connect();
    if (!db) return Promise.resolve({ data: [], error: null });

    var query = db.from('articles')
                  .select('id, slug, title, excerpt, cover_url, category, published_at')
                  .eq('published', true)
                  .order('published_at', { ascending: false })
                  .limit(limit || 12);

    if (category) query = query.eq('category', category);
    return query;
  }

  /** ერთი სტატია slug-ით */
  function fetchArticle(slug) {
    var db = connect();
    if (!db) return Promise.resolve({ data: null, error: null });

    return db.from('articles')
             .select('*')
             .eq('slug', slug)
             .eq('published', true)
             .single();
  }


  /* ---------- საჯარო ინტერფეისი ---------- */
  global.DB = {
    connect:              connect,
    submitQuestion:       submitQuestion,
    fetchMessages:        fetchMessages,
    sendMessage:          sendMessage,
    subscribeToMessages:  subscribeToMessages,
    fetchArticles:        fetchArticles,
    fetchArticle:         fetchArticle
  };

})(window);
