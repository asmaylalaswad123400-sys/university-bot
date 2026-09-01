const TelegramBot = require("node-telegram-bot-api");
const { courses } = require("./courses");
const { labPrograms } = require("./labPrograms");
const { uniRequirements } = require("./uniRequirements");
const courseCodes = require("./courseCodes");
const path = require("path");

const token = "8515128167:AAGRskapdCNiU-wVosktdc-hFLrvBuBUc8o";
const bot = new TelegramBot(token, { polling: true });

const userState = {};
const processedCallbacks = new Set();

const ADMIN_ID = 5687891184;

require("./data/rating")(bot, userState);
const utils = require("./data/utils");

// جهات التواصل
const contacts = {
  "القبول والتسجيل": [
    { name: "د. زهير الكردي", phone: "+970599332109" },
    { name: "أ. توفيق حرز الله", phone: "+972599167405" },
    { name: "أ. ألفت أبو صفية", phone: "+970599946275" },
    { name: "أ. إيمان علي", phone: "+972599623259" }
  ],
  "شؤون الطلبة": [
    { name: "رقم 1", phone: "+972595630401" },
    { name: "رقم 2", phone: "+972598923793" },
    { name: "رقم 3", phone: "+972599332109" }
  ],
  "الشؤون الأكاديمية": [
    { name: "أ. مصطفى بروخ", phone: "+972597246896" }
  ],
  "الشؤون المالية": [
    { name: "أ. إبراهيم فرحات", phone: "+970594702230" },
    { name: "أ. خالد طبش", phone: "+972599834582" },
    { name: "أ. هاني مطر", phone: "+972599261992" }
  ],
  "المنح": [
    { name: "أ. محمد أبو قضامة", phone: "+972592628297" },
    { name: "م. علاء الهاشيم", phone: "+970599403090" },
    { name: "رقم إضافي", phone: "+972599489703" }
  ],
  "الدعم الفني": [
    { name: "أ. محمد حرز الله", phone: "+970599051274" },
    { name: "م. محمد الحلو", phone: "+90598066646" }
  ],
  "سكرتير كلية الهندسة": [
    { name: "أ. بسام نصار", phone: "+972599465605" }
  ],
  "رقم الجامعة تركيا": [
    { name: "الجامعة", phone: "+905014613767" }
  ],
  "التدريب الميداني": [
    { name: "م. رنا عبده", phone: "+972599630429" }
  ]
};

// القائمة الرئيسية
function showMainMenu(chatId, name = "طالب") {
  bot.sendMessage(chatId, "مرحباً " + name + "!\nاختر من القائمة التالية أو أرسل اسم/كود المادة مباشرة للبحث:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔍 البحث عن مادة / كود مساق", callback_data: "start_search" }],
        [{ text: "🏛️ متطلبات الجامعة الاسلامية", callback_data: "show_uni_reqs" }],
        [{ text: "📚 عرض كل السنوات", callback_data: "show_years" }],
        [{ text: "🧪 روابط تنزيل برامج المختبرات للمواد ", callback_data: "open_lab_programs" }],
        [{ text: "📊 احسب معدلك الفصلي والتراكمي", callback_data: "gpa_file" }],
        [{ text: "📞 جهات التواصل المهمة", callback_data: "show_contacts" }],
        [{ text: "📷 عرض المواد المعتمدة على بعض", callback_data: "show_prerequisites" }],
        [{ text: "📄 خطة هندسة الحاسوب 5 سنوات", callback_data: "plan5" }],
        [{ text: "🖼 خطة هندسة الحاسوب 4 سنوات", callback_data: "plan4" }]
      ]
    }
  });
}

// أمر البدء /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "طالب";
  userState[chatId] = { name: name };
  showMainMenu(chatId, name);
});

// التعامل مع جميع أزرار Callback Queries
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (processedCallbacks.has(query.id)) return;
  processedCallbacks.add(query.id);

  bot.answerCallbackQuery(query.id);
  setTimeout(() => processedCallbacks.delete(query.id), 5000);

  // القائمة الرئيسية
  if (data === "main_menu") {
    const name = userState[chatId]?.name || "طالب";
    showMainMenu(chatId, name);
    return;
  }

  // زر البدء بالبحث
  if (data === "start_search") {
    bot.sendMessage(chatId, "🔍 أرسل اسم المادة أو كود المساق (مثل: `ECOM 2401` أو `برمجة`):", {
      parse_mode: "Markdown"
    });
    return;
  }

  // عرض قائمة متطلبات الجامعة
  if (data === "show_uni_reqs") {
    const buttons = Object.keys(uniRequirements).map((sub) => [
      { text: "📖 " + sub, callback_data: "req_" + sub }
    ]);
    buttons.push([{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]);

    bot.sendMessage(chatId, "🏛️ اختر مساق متطلبات الجامعة المطلوب:", {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // اختيار مادة من متطلبات الجامعة
  if (data.startsWith("req_")) {
    const subjectName = data.replace("req_", "");
    const item = uniRequirements[subjectName];

    if (!item) {
      bot.sendMessage(chatId, "❌ حدث خطأ، المادة غير موجودة");
      return;
    }

    const buttons = [
      [
        { text: "📁 ملفات المادة (Drive)", url: item.drive },
        { text: "🎬 المحاضرات (YouTube)", url: item.youtube }
      ],
      [{ text: "🔙 رجوع لمتطلبات الجامعة", callback_data: "show_uni_reqs" }],
      [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
    ];

    bot.sendMessage(chatId, `📖 *${subjectName}*\n\nاختر نوع المصدر المطلوب من الأزرار أدناه:`, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // ملف المعدل
  if (data === "gpa_file") {
    const filePath = path.join(__dirname, "gpa_calculator.xlsx");
    bot.sendDocument(chatId, filePath, {
      caption: "📊 ملف حساب المعدل الفصلي والتراكمي"
    });
    return;
  }

  // خطة 5 سنوات
  if (data === "plan5") {
    const filePath = path.join(__dirname, "plan_5years.pdf");
    bot.sendDocument(chatId, filePath, {
      caption: "📄 خطة هندسة الحاسوب - نظام 5 سنوات"
    });
    return;
  }

  // خطة 4 سنوات
  if (data === "plan4") {
    const img1 = path.join(__dirname, "plan4_1.png");
    const img2 = path.join(__dirname, "plan4_2.png");
    bot.sendPhoto(chatId, img1);
    bot.sendPhoto(chatId, img2);
    return;
  }

  // المتطلبات المعتمدة
  if (data === "show_prerequisites") {
    const imagePath = path.join(__dirname, "prerequisites.png");
    bot.sendPhoto(chatId, imagePath, {
      caption: "📷 المواد المعتمدة على بعضها"
    });
    return;
  }

  // عرض السنوات
  if (data === "show_years" || data === "back_years") {
    const buttons = Object.keys(courses).map((year) => [
      { text: year, callback_data: "year_" + year }
    ]);
    buttons.push([{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]);

    bot.sendMessage(chatId, "اختر السنة:", {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // جهات الاتصال
  if (data === "show_contacts") {
    const buttons = Object.keys(contacts).map((c) => [
      { text: c, callback_data: "contact_" + c }
    ]);
    buttons.push([{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]);

    bot.sendMessage(chatId, "اختر الجهة:", {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // عرض مواد المختبرات
  if (data === "open_lab_programs") {
    const buttons = Object.keys(labPrograms).map((name) => [
      { text: name, callback_data: "labItem_" + name }
    ]);
    buttons.push([{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]);

    bot.sendMessage(chatId, "🧪 اختر المادة:", {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // اختيار مادة من المختبر
  if (data.startsWith("labItem_")) {
    const name = data.replace("labItem_", "");
    const item = labPrograms[name];

    if (!item) {
      bot.sendMessage(chatId, "❌ حدث خطأ، المادة غير موجودة");
      return;
    }

    let message = "📚 " + name + "\n\n" + item.text;

    if (item.link) {
      bot.sendMessage(chatId, message + "\n\n" + item.link);
    } else if (item.links) {
      const buttons = item.links.map(l => [
        { text: l.name, url: l.url }
      ]);
      buttons.push([{ text: "🔙 رجوع", callback_data: "open_lab_programs" }]);

      bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    } else if (item.file) {
      const filePath = path.join(__dirname, item.file);
      bot.sendDocument(chatId, filePath, { caption: message });
    }
    return;
  }

  // تفاصيل جهة الاتصال
  if (data.startsWith("contact_")) {
    const name = data.replace("contact_", "");
    const buttons = contacts[name].map((c) => [
      { text: c.name, url: "https://wa.me/" + c.phone.replace(/\D/g, "") }
    ]);
    buttons.push(
      [{ text: "🔙 رجوع لجهات الاتصال", callback_data: "show_contacts" }],
      [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
    );

    bot.sendMessage(chatId, "📞 " + name + "\nاضغط على الاسم للتواصل:", {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // اختيار السنة
  if (data.startsWith("year_")) {
    const year = data.replace("year_", "");
    userState[chatId] = { year: year };

    const semesters = Object.keys(courses[year]).map((s) => [
      { text: s, callback_data: "semester_" + s }
    ]);
    semesters.push(
      [{ text: "🔙 رجوع للسنوات", callback_data: "back_years" }],
      [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
    );

    bot.sendMessage(chatId, "اختر الفصل:", {
      reply_markup: { inline_keyboard: semesters }
    });
    return;
  }

  // الرجوع للفصول
  if (data === "back_semesters") {
    const year = userState[chatId]?.year;
    if (!year) return;

    const semesters = Object.keys(courses[year]).map((s) => [
      { text: s, callback_data: "semester_" + s }
    ]);
    semesters.push(
      [{ text: "🔙 رجوع للسنوات", callback_data: "back_years" }],
      [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
    );

    bot.sendMessage(chatId, "اختر الفصل:", {
      reply_markup: { inline_keyboard: semesters }
    });
    return;
  }

  // اختيار فصل
  if (data.startsWith("semester_")) {
    const semester = data.replace("semester_", "");
    const year = userState[chatId]?.year;

    if (!year) {
      bot.sendMessage(chatId, "حدث خطأ، اختر السنة أولاً.");
      return;
    }

    userState[chatId].semester = semester;

    const subjects = Object.keys(courses[year][semester]).map((sub) => [
      { text: sub, callback_data: "subject_" + sub }
    ]);
    subjects.push(
      [{ text: "🔙 رجوع للفصول", callback_data: "back_semesters" }],
      [{ text: "🏠 العودة للقائمة الرئيسية", callback_data: "main_menu" }]
    );

    bot.sendMessage(chatId, "اختر المادة:", {
      reply_markup: { inline_keyboard: subjects }
    });
    return;
  }

  // اختيار مادة من شجرة السنوات
  if (data.startsWith("subject_")) {
    const subject = data.replace("subject_", "");
    const state = userState[chatId];

    if (!state?.year || !state?.semester) {
      bot.sendMessage(chatId, "حدث خطأ. اختر السنة والفصل أولاً.");
      return;
    }
    state.currentSubject = subject;

    const links = courses[state.year][state.semester][subject];
    let reply = "📚 " + subject + "\n━━━━━━━━━━━━━━\n\n";

    for (const key in links) {
      const value = links[key];

      if (!value || value === "لا توجد روابط") {
        reply += "⚠️ " + key + "\nلا توجد روابط\n\n";
        continue;
      }

      reply += "🔗 " + key + "\n";
      if (typeof value === "string") {
        reply += value + "\n\n";
      } else if (typeof value === "object") {
        for (const sub in value) {
          reply += "• " + sub + "\n" + value[sub] + "\n";
        }
        reply += "\n";
      }
    }

    const keyboard = [
      [{ text: "📤 ارفع ملفاتك المهمة للمادة لكي يستفيد غيرنا", url: "https://t.me/+lUyeZmUh7KpjM2Fi" }],
      [{ text: "🔙 رجوع للفصول", callback_data: "back_semesters" }],
      [{ text: "🏠 العودة للقائمة الرئيسية", callback_data: "main_menu" }]
    ];

    bot.sendMessage(chatId, reply, { reply_markup: { inline_keyboard: keyboard } });
    return;
  }

  // التعامل مع نتائج البحث المباشر للمواد
  if (data.startsWith("find_subject_")) {
    const subjectName = data.replace("find_subject_", "");

    for (const year in courses) {
      for (const semester in courses[year]) {
        if (courses[year][semester][subjectName]) {
          userState[chatId] = { year, semester, currentSubject: subjectName };
          const links = courses[year][semester][subjectName];
          let reply = "📚 " + subjectName + "\n━━━━━━━━━━━━━━\n\n";

          for (const key in links) {
            const value = links[key];
            if (!value || value === "لا توجد روابط") {
              reply += "⚠️ " + key + "\nلا توجد روابط\n\n";
              continue;
            }
            reply += "🔗 " + key + "\n";
            if (typeof value === "string") {
              reply += value + "\n\n";
            } else if (typeof value === "object") {
              for (const sub in value) {
                reply += "• " + sub + "\n" + value[sub] + "\n";
              }
              reply += "\n";
            }
          }

          const keyboard = [
            [{ text: "📤 ارفع ملفاتك المهمة للمادة", url: "https://t.me/+lUyeZmUh7KpjM2Fi" }],
            [{ text: "🏠 العودة للقائمة الرئيسية", callback_data: "main_menu" }]
          ];

          bot.sendMessage(chatId, reply, { reply_markup: { inline_keyboard: keyboard } });
          return;
        }
      }
    }
  }
});

// معالج البحث التفاعلي للنصوص (الرسائل المباشرة)
bot.on("text", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text.trim();

  // تجاهل الأوامر الرسمية مثل /start
  if (text.startsWith("/")) return;

  const results = [];
  const cleanSearchTerm = text.toLowerCase().replace(/\s+/g, "");

  // 1. البحث حسب كود المساق المباشر
  for (const [code, subjectName] of Object.entries(courseCodes)) {
    if (code.toLowerCase().replace(/\s+/g, "").includes(cleanSearchTerm)) {
      results.push({ name: subjectName, type: "course", code: code });
    }
  }

  // 2. البحث داخل مواد السنوات (courses)
  for (const year in courses) {
    for (const semester in courses[year]) {
      for (const subject in courses[year][semester]) {
        if (subject.toLowerCase().includes(text.toLowerCase())) {
          if (!results.some((r) => r.name === subject)) {
            results.push({ name: subject, type: "course", year, semester });
          }
        }
      }
    }
  }

  // 3. البحث داخل متطلبات الجامعة (uniRequirements)
  for (const reqSubject in uniRequirements) {
    if (reqSubject.toLowerCase().includes(text.toLowerCase())) {
      if (!results.some((r) => r.name === reqSubject)) {
        results.push({ name: reqSubject, type: "uni_req" });
      }
    }
  }

  // 4. البحث داخل برامج المختبرات (labPrograms)
  for (const labSubject in labPrograms) {
    if (labSubject.toLowerCase().includes(text.toLowerCase())) {
      if (!results.some((r) => r.name === labSubject)) {
        results.push({ name: labSubject, type: "lab" });
      }
    }
  }

  // طباعة النتائج
  if (results.length === 0) {
    bot.sendMessage(
      chatId,
      `❌ لم يتم العثور على أي نتائج لـ "${text}".\nجرب كتابة الكود مثل \`ECOM 2401\` أو جزء من اسم المادة.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const buttons = results.slice(0, 10).map((res) => {
    if (res.type === "uni_req") {
      return [{ text: "🏛️ " + res.name, callback_data: "req_" + res.name }];
    } else if (res.type === "lab") {
      return [{ text: "🧪 " + res.name, callback_data: "labItem_" + res.name }];
    } else {
      return [
        {
          text: "📚 " + res.name + (res.code ? ` (${res.code})` : ""),
          callback_data: "find_subject_" + res.name
        }
      ];
    }
  });

  buttons.push([{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]);

  bot.sendMessage(chatId, `🔍 نتائج البحث عن "${text}":`, {
    reply_markup: { inline_keyboard: buttons }
  });
});

// التعامل مع الأخطاء
bot.on("polling_error", (err) => {
  console.log(err.message);
});