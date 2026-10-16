require("dotenv").config();
const fastify = require("fastify")({ logger: true });
const { Telegraf } = require("telegraf");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

// --- ДАННЫЕ РАСПИСАНИЯ (ПОЛНАЯ ВЕРСИЯ) ---
// Данные взяты из твоего Excel и структурированы
const DATA = {
  courses: [{ id: 3, name: "3 курс" }],
  institutes: [
    { id: "iom", name: "ИОМ", emoji: "🏗️" },
    { id: "iupsibk", name: "ИУПСиБК", emoji: "👥" },
    { id: "iis", name: "ИИС", emoji: "💻" },
    { id: "im", name: "ИМ", emoji: "📣" },
    { id: "ief", name: "ИЭиФ", emoji: "💰" },
    { id: "iguip", name: "ИГУиП", emoji: "⚖️" }
  ],
  groups: [
    // ==================== ИОМ ====================
    { id: "iom-eiusd-1", c: 3, i: "iom", n: "ЭиУИСД-1", e: "🏗️", f: "Экономика и управление инвестиционно-строительной деятельностью", s: {
      "ПН": { o: [{ t: "09:00-10:30", s: "Иностранный язык (ПЗ 2-14 н)", y: "ПЗ", r: "ЛК-6" }, { t: "10:40-12:10", s: "Иностранный язык (ПЗ 3-13 н)", y: "ПЗ", r: "ЛК-6" }, { t: "12:55-14:25", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }], e: [{ t: "09:00-10:30", s: "Иностранный язык (ПЗ 2-14 н)", y: "ПЗ", r: "ЛК-6" }, { t: "10:40-12:10", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "12:55-14:25", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }] },
      "ВТ": { o: [{ t: "10:40-12:10", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "12:55-14:25", s: "Организация строительного производства (Л 1-13 н)", y: "Л", p: "Тихонов Ю.П.", r: "ЛК-335" }, { t: "14:35-16:05", s: "Управление имущественным комплексом (Л 1-13 н)", y: "Л", p: "Тихонов Ю.П.", r: "ЛК-335" }, { t: "16:15-17:45", s: "Управление имущественным комплексом (ПЗ 1-13 н)", y: "ПЗ", p: "Тихонов Ю.П.", r: "ЛК-335" }, { t: "17:55-19:25", s: "Моделирование (Л 1-11 н)", y: "Л", p: "Тихонов Ю.П.", r: "ЛК-335" }], e: [{ t: "10:40-12:10", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "12:55-14:25", s: "Организация строительного производства (Л 2-14 н)", y: "Л", p: "Тихонов Ю.П.", r: "ЛК-217" }, { t: "14:35-16:05", s: "Управление имущественным комплексом (Л 1-13 н)", y: "Л", p: "Тихонов Ю.П.", r: "ЛК-335" }, { t: "16:15-17:45", s: "Управление имущественным комплексом (ПЗ 1-13 н)", y: "ПЗ", p: "Тихонов Ю.П.", r: "ЛК-335" }] },
      "СР": { o: [{ t: "12:55-14:25", s: "Эконометрика (ПЗ 15-16 н)", y: "ПЗ", p: "Писарева О.М.", r: "ЛК-110" }, { t: "14:35-16:05", s: "Эконометрика (ПЗ 1-16 н)", y: "ПЗ", p: "Писарева О.М.", r: "ЛК-110" }, { t: "16:15-17:45", s: "Эконометрика (Л 1-14 н)", y: "Л", p: "Писарева О.М.", r: "ЛК-225" }, { t: "17:55-19:25", s: "Мировая экономика (Л 3 н)", y: "Л", p: "Репников Д.А.", r: "У-147" }] },
      "ЧТ": { o: [{ t: "09:00-17:45", s: "Проектное обучение", y: "ПЗ", r: "" }] },
      "ПТ": { o: [{ t: "10:40-12:10", s: "Финансы (ПЗ 1-13 н)", y: "ПЗ", p: "Бурмистрова Л.А.", r: "У-325" }, { t: "12:55-14:25", s: "Мировая экономика (Л 2-13 н)", y: "Л", p: "Репников Д.А.", r: "У-407" }, { t: "14:35-16:05", s: "Финансы (Л 1-13 н)", y: "Л", p: "Бурмистрова Л.А.", r: "У-407" }, { t: "16:15-17:45", s: "Мировая экономика (ПЗ 1-13 н)", y: "ПЗ", p: "Камара П.", r: "У-409" }] },
      "СБ": { o: [{ t: "10:40-12:10", s: "Статистика (ПЗ 1-13 н)", y: "ПЗ", p: "Долгих Е.А.", r: "У-415" }, { t: "12:55-14:25", s: "Моделирование (ПЗ 1-13 н)", y: "ПЗ", p: "Сянин С.В.", r: "У-409" }, { t: "14:35-16:05", s: "Статистика (Л 1-13 н)", y: "Л", p: "Долгих Е.А.", r: "У-407" }, { t: "16:15-17:45", s: "Организация стр. пр-ва (ПЗ 1-15 н)", y: "ПЗ", p: "Возгомент Н.В.", r: "У-409" }] }
    }},
    { id: "iom-epe-1", c: 3, i: "iom", n: "ЭиПЭ-1", e: "⚡", f: "Экономика предприятий и организаций энергетики", s: {
      "ПН": { o: [{ t: "09:00-10:30", s: "Иностранный язык (ПЗ 2-14 н)", y: "ПЗ", r: "ЛК-6" }, { t: "10:40-12:10", s: "Иностранный язык (ПЗ 3-13 н)", y: "ПЗ", r: "ЛК-6" }, { t: "12:55-14:25", s: "Статистика (ПЗ 1-13 н)", y: "ПЗ", p: "Долгих Е.А.", r: "У-409" }, { t: "14:35-16:05", s: "Эконометрика (ПЗ 2-16 н)", y: "ПЗ", p: "Писарева О.М.", r: "ЛК-123" }] },
      "ВТ": { o: [{ t: "12:55-14:25", s: "Мировая экономика (ПЗ 1-13 н)", y: "ПЗ", p: "Канунникова А.М.", r: "У-310" }, { t: "14:35-16:05", s: "Маркетинг в электроэнергетике (Л 1-13 н)", y: "Л", p: "Любимова Н.Г.", r: "ЛК-311" }, { t: "16:15-17:45", s: "Экономика энергокомпаний (Л 1-15 н)", y: "Л", p: "Флаксман А.С.", r: "ЛК-311" }, { t: "17:55-19:25", s: "Экономика энергокомпаний (ПЗ 1-16 н)", y: "ПЗ", p: "Флаксман А.С.", r: "ЛК-311" }] },
      "СР": { o: [{ t: "12:55-14:25", s: "Технологии произв. энергии (ПЗ 1-13 н)", y: "ПЗ", p: "Штадлен И.М.", r: "ЛК-123" }, { t: "14:35-16:05", s: "Маркетинг в электроэнергетике (ПЗ 1-13 н)", y: "ПЗ", p: "Штадлен И.М.", r: "ЛК-123" }, { t: "16:15-17:45", s: "Эконометрика (Л 1-14 н)", y: "Л", p: "Писарева О.М.", r: "ЛК-225" }, { t: "17:55-19:25", s: "Эконометрика (ПЗ 1 н)", y: "ПЗ", p: "Писарева О.М.", r: "ЛК-128" }] },
      "ЧТ": { o: [{ t: "09:00-17:45", s: "Проектное обучение", y: "ПЗ", r: "" }] },
      "ПТ": { o: [{ t: "10:40-12:10", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "12:55-14:25", s: "Мировая экономика (Л 2-13 н)", y: "Л", p: "Репников Д.А.", r: "У-407" }, { t: "14:35-16:05", s: "Финансы (Л 1-13 н)", y: "Л", p: "Бурмистрова Л.А.", r: "У-407" }, { t: "16:15-17:45", s: "Финансы (ПЗ 1-13 н)", y: "ПЗ", p: "Бурмистрова Л.А.", r: "У-408" }] },
      "СБ": { o: [{ t: "12:55-14:25", s: "Технологии произв. энергии (Л 1-11 н)", y: "Л", p: "Редин А.Г.", r: "ЛК-335" }, { t: "14:35-16:05", s: "Статистика (Л 1-13 н)", y: "Л", p: "Долгих Е.А.", r: "У-407" }, { t: "16:15-17:45", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }] }
    }},
    { id: "iom-mo-1", c: 3, i: "iom", n: "МО-1", e: "🏢", f: "Менеджмент организации", s: {
      "ПН": { o: [{ t: "09:00-10:30", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "10:40-12:10", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "12:55-14:25", s: "Иностранный язык (ПЗ 2-13 н)", y: "ПЗ", r: "ЛК-6" }, { t: "14:35-16:05", s: "Бухгалтерский учет (Л 3-13 н)", y: "Л", p: "Орлова Е.А.", r: "ПА-119" }] },
      "ВТ": { o: [{ t: "10:40-12:10", s: "Организационный дизайн (ПЗ 1-13 н)", y: "ПЗ", p: "Ермилина Д.А.", r: "У-316" }, { t: "12:55-14:25", s: "Интеллектуальные системы (ПЗ 1-13 н)", y: "ПЗ", p: "Путилов К.С.", r: "ЛК-108" }, { t: "14:35-16:05", s: "Управление конкурентоспособностью (Л 1-15 н)", y: "Л", p: "Голышкова И.Н.", r: "ПА-104" }, { t: "16:15-17:45", s: "Управление конкурентоспособностью (ПЗ 1-16 н)", y: "ПЗ", p: "Голышкова И.Н.", r: "ЛК-504" }, { t: "17:55-19:25", s: "Организационный дизайн (ПЗ 1-13 н)", y: "ПЗ", p: "Денисова И.В.", r: "У-317" }] },
      "СР": { o: [{ t: "12:55-14:25", s: "Организационный дизайн (Л 1-11 н)", y: "Л", p: "Денисова И.В.", r: "ПА-203" }, { t: "14:35-16:05", s: "Методы оптимизации (ПЗ 1-13 н)", y: "ПЗ", p: "Борисова В.В.", r: "ЛК-104" }, { t: "16:15-17:45", s: "Контроллинг (ПЗ 1-13 н)", y: "ПЗ", p: "Демкина О.В.", r: "У-408" }, { t: "17:55-19:25", s: "Методы оптимизации (Л 1-11 н)", y: "Л", p: "Борисова В.В.", r: "ЛК-327" }] },
      "ЧТ": { o: [{ t: "09:00-17:45", s: "Проектное обучение", y: "ПЗ", r: "" }] },
      "ПТ": { o: [{ t: "10:40-12:10", s: "Управление корпорациями (ПЗ 15 н)", y: "ПЗ", p: "Дуненкова Е.Н.", r: "ЛК-401" }, { t: "12:55-14:25", s: "Управление корпорациями (Л 1-15 н)", y: "Л", p: "Дуненкова Е.Н.", r: "ПА-103" }, { t: "14:35-16:05", s: "Моделирование бизнес-процессов (ПЗ 1-13 н)", y: "ПЗ", p: "Лобачев В.В.", r: "ЛК-408" }, { t: "16:15-17:45", s: "Управление корпорациями (ПЗ 1-16 н)", y: "ПЗ", p: "Дуненкова Е.Н.", r: "ЛК-401" }, { t: "17:55-19:25", s: "Моделирование бизнес-процессов (Л 1-11 н)", y: "Л", p: "Лобачев В.В.", r: "ЛК-408" }] },
      "СБ": { o: [] }
    }},
    { id: "iom-log-1", c: 3, i: "iom", n: "ЛиУЦП-1", e: "📦", f: "Логистика и управление цепями поставок", s: {
      "ПН": { o: [{ t: "09:00-10:30", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "10:40-12:10", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "12:55-14:25", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "14:35-16:05", s: "Логистика снабжения (Л 2-16 н)", y: "Л", p: "Ласточкина Г.А.", r: "ПА-113" }, { t: "16:15-17:45", s: "Бизнес-планирование логистики (Л 2-16 н)", y: "Л", p: "Курбатова А.В.", r: "ПА-113" }] },
      "ВТ": { o: [{ t: "09:00-10:30", s: "Логистика снабжения (ПЗ 1-16 н)", y: "ПЗ", p: "Ласточкина Г.А.", r: "ЛК-510" }, { t: "10:40-12:10", s: "Логистика снабжения (ПЗ 1-16 н)", y: "ПЗ", p: "Ласточкина Г.А.", r: "ЛК-510" }, { t: "12:55-14:25", s: "Управление ВЭД (ПЗ 1-13 н)", y: "ПЗ", p: "Малькова А.В.", r: "ЛК-539" }, { t: "14:35-16:05", s: "Организационный дизайн (ПЗ 1-13 н)", y: "ПЗ", p: "Денисова И.В.", r: "У-316" }] },
      "СР": { o: [{ t: "12:55-14:25", s: "Организационный дизайн (Л 1-11 н)", y: "Л", p: "Денисова И.В.", r: "ПА-203" }, { t: "14:35-16:05", s: "Бухгалтерский учет (Л 1-11 н)", y: "Л", p: "Самоделко Л.С.", r: "У-343" }, { t: "16:15-17:45", s: "Бухгалтерский учет (ПЗ 1-13 н)", y: "ПЗ", p: "Самоделко Л.С.", r: "У-317" }, { t: "17:55-19:25", s: "Интеллектуальные системы (ПЗ 1-13 н)", y: "ПЗ", p: "Орусбиева Э.А.", r: "ЛК-510" }] },
      "ЧТ": { o: [{ t: "09:00-17:45", s: "Проектное обучение", y: "ПЗ", r: "" }] },
      "ПТ": { o: [{ t: "10:40-12:10", s: "Анализ логист. процессов (Л 1,5-13 н)", y: "Л", p: "Ласточкина Г.А.", r: "ЛК-320" }, { t: "12:55-14:25", s: "Организация товаропроводящих систем (ПЗ 1-13 н)", y: "ПЗ", p: "Курбатова Е.С.", r: "ЛК-539" }, { t: "14:35-16:05", s: "Анализ логист. процессов (ПЗ 1-2,4-13 н)", y: "ПЗ", p: "Ласточкина Г.А.", r: "ЛК-120" }, { t: "16:15-17:45", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }] },
      "СБ": { o: [] }
    }},
    // ==================== ИУПСиБК ====================
    { id: "iup-girb-1", c: 3, i: "iupsibk", n: "ГиРБ-1", e: "🏨", f: "Гостиничный и ресторанный бизнес", s: {
      "ПН": { o: [{ t: "10:40-12:10", s: "Иностранный язык (ПЗ 14-16 н)", y: "ПЗ", p: "Збарская А.В.", r: "ЛК-311" }, { t: "12:55-14:25", s: "Иностранный язык (ПЗ 2-16 н)", y: "ПЗ", p: "Збарская А.В.", r: "ЛК-311" }, { t: "14:35-16:05", s: "Туристское ресурсоведение (Л 2-15 н)", y: "Л", p: "Романов А.А.", r: "У-355" }, { t: "16:15-17:45", s: "Туристское ресурсоведение (ПЗ 1-16 н)", y: "ПЗ", p: "Романов А.А.", r: "У-355" }] },
      "ВТ": { o: [{ t: "10:40-12:10", s: "Продвижение бизнеса АСЕАН (Л 1-13 н)", y: "Л", p: "Арифуллин М.В.", r: "У-355" }, { t: "12:55-14:25", s: "Продвижение бизнеса АСЕАН (ПЗ 1-12 н)", y: "ПЗ", p: "Арифуллин М.В.", r: "У-355" }] },
      "СР": { o: [{ t: "10:40-12:10", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "12:55-14:25", s: "Анализ деятельности предприятия (Л 1-14 н)", y: "Л", p: "Гулиев А.Ю.", r: "У-355" }, { t: "14:35-16:05", s: "Анализ деятельности предприятия (ПЗ 1-16 н)", y: "ПЗ", p: "Гулиев А.Ю.", r: "У-355" }, { t: "16:15-17:45", s: "Управление потребит. предпочтениями (ПЗ 1-12 н)", y: "ПЗ", p: "Ахремчик Д.В.", r: "У-355" }] },
      "ЧТ": { o: [{ t: "09:00-17:45", s: "Проектное обучение", y: "ПЗ", r: "" }] },
      "ПТ": { o: [{ t: "10:40-12:10", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "12:55-14:25", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "14:35-16:05", s: "Иностранный язык второй (ПЗ 1-14 н)", y: "ПЗ", p: "Цаболова О.Р.", r: "ЛК-416" }, { t: "16:15-17:45", s: "Иностранный язык второй (ПЗ 1-11 н)", y: "ПЗ", p: "Цаболова О.Р.", r: "ЛК-416" }] },
      "СБ": { o: [{ t: "12:55-14:25", s: "Управление потребит. предпочтениями (Л 1-13 н)", y: "Л", p: "Акопян Д.В.", r: "ЛК-311" }, { t: "14:35-16:05", s: "Технологии продвижения (Л 1-13 н)", y: "Л", p: "Коренко Ю.М.", r: "У-355" }, { t: "16:15-17:45", s: "Технологии продвижения (ПЗ 1-12 н)", y: "ПЗ", p: "Коренко Ю.М.", r: "У-355" }] }
    }},
    { id: "iup-up-1", c: 3, i: "iupsibk", n: "УП-1", e: "👥", f: "Управление персоналом", s: {
      "ПН": { o: [{ t: "10:40-12:10", s: "Нормативно-законодат. регулирование (Л 2-13 н)", y: "Л", p: "Титор С.Е.", r: "ПА-104" }, { t: "12:55-14:25", s: "Нормативно-законодат. регулирование (ПЗ 2-13 н)", y: "ПЗ", p: "Титор С.Е.", r: "ПА-104" }, { t: "14:35-16:05", s: "Стратегия управления персоналом (ПЗ 2-13 н)", y: "ПЗ", p: "Свистунов В.М.", r: "У-356" }, { t: "16:15-17:45", s: "Стратегия управления персоналом (Л 2-14 н)", y: "Л", p: "Свистунов В.М.", r: "У-356" }] },
      "ВТ": { o: [{ t: "12:55-14:25", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "14:35-16:05", s: "Экономика управления персоналом (Л 1-13 н)", y: "Л", p: "Митрофанова Е.А.", r: "У-356" }, { t: "16:15-17:45", s: "Нормативно-законодат. регулирование (ПЗ 3-13 н)", y: "ПЗ", p: "Титор С.Е.", r: "ЛК-107" }] },
      "СР": { o: [{ t: "10:40-12:10", s: "Кадровое администрирование (Л 1-11 н)", y: "Л", p: "Лаас Н.И.", r: "У-356" }, { t: "12:55-14:25", s: "Кадровое администрирование (ПЗ 1-12 н)", y: "ПЗ", p: "Лаас Н.И.", r: "У-325" }, { t: "14:35-16:05", s: "Экономика управления персоналом (ПЗ 1-12 н)", y: "ПЗ", p: "Митрофанова А.Е.", r: "У-356" }] },
      "ЧТ": { o: [{ t: "09:00-17:45", s: "Проектное обучение", y: "ПЗ", r: "" }] },
      "ПТ": { o: [{ t: "10:40-12:10", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "12:55-14:25", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "14:35-16:05", s: "Иностранный язык (ПЗ 1-13 н)", y: "ПЗ", r: "ЛК-6" }, { t: "16:15-17:45", s: "Иностранный язык (ПЗ 1-11 н)", y: "ПЗ", r: "ЛК-6" }] },
      "СБ": { o: [{ t: "12:55-14:25", s: "Информационные системы (Л 1-13 н)", y: "Л", p: "Масленников И.А.", r: "У-356" }, { t: "14:35-16:05", s: "Информационные системы (ПЗ 1-12,14-16 н)", y: "ПЗ", p: "Масленников И.А.", r: "У-356" }, { t: "16:15-17:45", s: "Организационная конфликтология (ПЗ 1-12 н)", y: "ПЗ", p: "Романова И.А.", r: "У-415" }] }
    }},
    // ==================== ИИС ====================
    { id: "iis-bi-1", c: 3, i: "iis", n: "БИ-1", e: "💻", f: "Бизнес-информатика", s: {
      "ПН": { o: [{ t: "14:35-16:05", s: "Программная инженерия (Л 2-15 н)", y: "Л", p: "Гузеев А.В.", r: "ПА-115" }, { t: "16:15-17:45", s: "Проектирование информационных систем (Л 2-14 н)", y: "Л", p: "Слуцков Д.Н.", r: "У-429" }] },
      "ВТ": { o: [{ t: "10:40-12:10", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "12:55-14:25", s: "Анализ и моделирование бизнес-процессов (Л 1-13 н)", y: "Л", p: "Терехова А.Е.", r: "ПА-115" }, { t: "14:35-16:05", s: "Базы данных (ПЗ 1-13 н)", y: "ПЗ", p: "Белоусова М.Н.", r: "ЛК-101" }, { t: "16:15-17:45", s: "Паттерны проектирования (ЛЗ 1-13 н)", y: "ЛЗ", p: "Шпонарский И.В.", r: "ЛК-104" }] },
      "СР": { o: [{ t: "10:40-12:10", s: "Базы данных (ПЗ 1-11 н)", y: "ПЗ", p: "Белоусова М.Н.", r: "ЛК-101" }, { t: "12:55-14:25", s: "Программная инженерия (ЛЗ 1-12 н)", y: "ЛЗ", p: "Гузеев А.В.", r: "ЛК-105" }, { t: "14:35-16:05", s: "Паттерны проектирования (ЛЗ 1-9 н)", y: "ЛЗ", p: "Шпонарский И.В.", r: "ЛК-107" }] },
      "ЧТ": { o: [{ t: "09:00-17:45", s: "Проектное обучение", y: "ПЗ", r: "" }] },
      "ПТ": { o: [{ t: "09:00-10:30", s: "Иностранный язык (ПЗ 1-12 н)", y: "ПЗ", r: "ЛК-6" }, { t: "10:40-12:10", s: "Иностранный язык (ПЗ 1-13 н)", y: "ПЗ", r: "ЛК-6" }, { t: "12:55-14:25", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "14:35-16:05", s: "Базы данных (Л 1-14 н)", y: "Л", p: "Белоусова М.Н.", r: "ПА-115" }, { t: "16:15-17:45", s: "Базы данных (ПЗ 1-16 н)", y: "ПЗ", p: "Белоусова М.Н.", r: "ЛК-101" }] },
      "СБ": { o: [{ t: "09:00-10:30", s: "Машинное обучение (Л 1-11 н)", y: "Л", p: "Денисова А.И.", r: "ЛК-128" }, { t: "10:40-12:10", s: "Паттерны проектирования (Л 14 н)", y: "Л", p: "Глазков А.В.", r: "ПА-119" }] }
    }},
    // ==================== ИМ ====================
    { id: "im-bm-1", c: 3, i: "im", n: "БМ-1", e: "🏷️", f: "Бренд-менеджмент", s: {
      "ПН": { o: [{ t: "09:00-10:30", s: "Маркетинговые коммуникации (Л 2-14 н)", y: "Л", p: "Конкс В.Я.", r: "А-514" }] },
      "ВТ": { o: [{ t: "16:15-17:45", s: "Статистика (ПЗ 1-13 н)", y: "ПЗ", p: "Теплякова М.Ю.", r: "ЛК-123" }] },
      "СР": { o: [{ t: "10:40-12:10", s: "Организационный дизайн (Л 1-11 н)", y: "Л", p: "Денисова И.В.", r: "ПА-203" }] },
      "ЧТ": { o: [{ t: "09:00-17:45", s: "Проектное обучение", y: "ПЗ", r: "" }] },
      "ПТ": { o: [{ t: "10:40-12:10", s: "Бухгалтерский учет (ПЗ 1-13 н)", y: "ПЗ", p: "Адамова Г.А.", r: "А-508" }, { t: "12:55-14:25", s: "Организационный дизайн (ПЗ 1-13 н)", y: "ПЗ", p: "Денисова И.В.", r: "А-410" }, { t: "16:15-17:45", s: "Бухгалтерский учет (Л 1-11 н)", y: "Л", p: "Адамова Г.А.", r: "ПА-119" }] },
      "СБ": { o: [{ t: "09:00-10:30", s: "Управление продуктом (Л 1-15 н)", y: "Л", p: "Алешникова В.И.", r: "ПА-119" }] }
    }},
    // ==================== ИЭиФ ====================
    { id: "ief-e-1", c: 3, i: "ief", n: "Э-1", e: "💰", f: "Экономика", s: {
      "ПН": { o: [{ t: "12:55-14:25", s: "Эконометрика (ПЗ 15-16 н)", y: "ПЗ", p: "Писарева О.М.", r: "ЛК-110" }] },
      "ВТ": { o: [{ t: "12:55-14:25", s: "Мировая экономика (ПЗ 1-13 н)", y: "ПЗ", p: "Канунникова А.М.", r: "У-310" }] },
      "СР": { o: [{ t: "12:55-14:25", s: "Эконометрика (ПЗ 15-16 н)", y: "ПЗ", p: "Писарева О.М.", r: "ЛК-110" }] },
      "ЧТ": { o: [{ t: "09:00-17:45", s: "Проектное обучение", y: "ПЗ", r: "" }] },
      "ПТ": { o: [{ t: "10:40-12:10", s: "Финансы (ПЗ 1-13 н)", y: "ПЗ", p: "Бурмистрова Л.А.", r: "У-325" }] },
      "СБ": { o: [{ t: "10:40-12:10", s: "Статистика (ПЗ 1-13 н)", y: "ПЗ", p: "Долгих Е.А.", r: "У-415" }] }
    }},
    // ==================== ИГУиП ====================
    { id: "ig-yu-1", c: 3, i: "iguip", n: "Ю-1", e: "⚖️", f: "Право и управление", s: {
      "ПН": { o: [{ t: "12:55-14:25", s: "Налоговое право (ПЗ 2-13 н)", y: "ПЗ", p: "Левин С.Д.", r: "А-432" }, { t: "14:35-16:05", s: "Криминалистика 1 подгр. (ПЗ 2-13 н)", y: "ПЗ", p: "Тормозова Е.А.", r: "А-403" }, { t: "16:15-17:45", s: "Финансовое право (ПЗ 2-13 н)", y: "ПЗ", p: "Сачков А.Н.", r: "А-431" }] },
      "ВТ": { o: [{ t: "12:55-14:25", s: "Гражданское право (Л 1-13 н)", y: "Л", p: "Попов В.В.", r: "ПА-121" }, { t: "14:35-16:05", s: "Трудовое право (Л 1-13 н)", y: "Л", p: "Титор С.Е.", r: "ПА-109" }, { t: "16:15-17:45", s: "Методика юр. консультирования (ПЗ 1-11 н)", y: "ПЗ", p: "Ковалева Н.В.", r: "ПА-113" }, { t: "17:55-19:25", s: "Семейное право (Л 1-11 н)", y: "Л", p: "Богданова Ю.Н.", r: "ПА-121" }] },
      "СР": { o: [{ t: "12:55-14:25", s: "Трудовое право (ПЗ 1-11 н)", y: "ПЗ", p: "Титор С.Е.", r: "А-224" }, { t: "14:35-16:05", s: "Гражданское право (ПЗ 1-13 н)", y: "ПЗ", p: "Попов В.В.", r: "А-328" }, { t: "16:15-17:45", s: "Криминалистика 2 подгр. (ПЗ 1-12 н)", y: "ПЗ", p: "Тормозова Е.А.", r: "А-403" }] },
      "ЧТ": { o: [{ t: "09:00-17:45", s: "Проектное обучение", y: "ПЗ", r: "" }] },
      "ПТ": { o: [{ t: "14:35-16:05", s: "Семейное право (ПЗ 1-12 н)", y: "ПЗ", p: "Кудряшова С.Д.", r: "У-209" }, { t: "16:15-17:45", s: "Гражданский процесс (Л 1-13 н)", y: "Л", p: "Даитгаджиев Г.М.", r: "ПА-203" }, { t: "17:55-19:25", s: "Гражданский процесс (ПЗ 1-11 н)", y: "ПЗ", p: "Даитгаджиев Г.М.", r: "А-332" }] },
      "СБ": { o: [{ t: "12:55-14:25", s: "Юридическая литература (ПЗ 1-11 н)", y: "ПЗ", p: "Таначева В.Н.", r: "ПА-213" }, { t: "14:35-16:05", s: "Уголовный процесс (Л 1-13 н)", y: "Л", p: "Красненкова Е.В.", r: "ПА-215" }, { t: "16:15-17:45", s: "Финансовое право (Л 1-14 н)", y: "Л", p: "Сачков А.Н.", r: "ПА-215" }, { t: "17:55-19:25", s: "Криминалистика (Л 1-15 н)", y: "Л", p: "Тормозова Е.А.", r: "ПА-121" }] }
    }}
  ]
};

const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const GROQ_KEY = process.env.GROQ_API_KEY || process.env.AI_API_KEY || "";

// --- ХРАНИЛИЩЕ ЗАДАЧ ---
const TASKS_FILE = path.join(__dirname, "tasks.json");
function loadTasks() { try { return JSON.parse(fs.readFileSync(TASKS_FILE, "utf-8")); } catch { return []; } }
function saveTasks(t) { fs.writeFileSync(TASKS_FILE, JSON.stringify(t, null, 2)); }
if (!fs.existsSync(TASKS_FILE)) saveTasks([]);

// --- HTML ИНТЕРФЕЙС (PREMIUM DESIGN) ---
const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no,maximum-scale=1">
<title>ГУУ Расписание</title>
<script src="https://telegram.org/js/telegram-web-app.js"><\/script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#0f172a;--glass:rgba(30,41,59,0.7);--border:rgba(255,255,255,0.1);--text:#f8fafc;--dim:#94a3b8;--acc:#8b5cf6;--acc-glow:rgba(139,92,246,0.5);--grad:linear-gradient(135deg,#8b5cf6,#ec4899)}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;font-family:'Inter',sans-serif}
body{background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}
.app{max-width:500px;margin:0 auto;padding:16px;padding-bottom:80px}
.header{text-align:center;padding:24px 0}
.logo{font-size:48px;margin-bottom:12px;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.3))}
h1{font-size:28px;font-weight:800;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px}
.sub{color:var(--dim);font-size:14px;font-weight:500}
.nav{display:flex;gap:8px;margin:20px 0;background:var(--glass);padding:6px;border-radius:16px;border:1px solid var(--border);backdrop-filter:blur(10px)}
.nav-btn{flex:1;padding:12px;text-align:center;border-radius:12px;font-size:13px;font-weight:700;color:var(--dim);cursor:pointer;transition:all 0.3s}
.nav-btn.active{background:var(--grad);color:white;box-shadow:0 4px 15px var(--acc-glow)}
.section{margin-top:24px}
.title{font-size:12px;font-weight:800;color:var(--dim);text-transform:uppercase;margin-bottom:12px;letter-spacing:1.5px;display:flex;align-items:center;gap:8px}
.title::before{content:'';width:4px;height:12px;background:var(--grad);border-radius:2px}
.chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;scrollbar-width:none}
.chips::-webkit-scrollbar{display:none}
.chip{padding:10px 18px;background:var(--glass);border:1px solid var(--border);border-radius:24px;font-size:13px;white-space:nowrap;cursor:pointer;color:var(--dim);transition:all 0.2s}
.chip.active{background:var(--grad);color:white;border-color:transparent;box-shadow:0 4px 12px var(--acc-glow)}
.search{width:100%;padding:14px 18px;background:var(--glass);border:1px solid var(--border);border-radius:16px;color:white;margin-bottom:20px;font-size:15px;backdrop-filter:blur(10px)}
.list{display:flex;flex-direction:column;gap:10px}
.card{padding:16px;background:var(--glass);border:1px solid var(--border);border-radius:16px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:transform 0.2s;backdrop-filter:blur(10px)}
.card:active{transform:scale(0.98)}
.card-icon{font-size:28px}
.card-info h3{font-size:16px;margin-bottom:4px;font-weight:700}
.card-info p{font-size:12px;color:var(--dim);line-height:1.4}
.top-bar{display:flex;align-items:center;gap:14px;margin-bottom:20px}
.back{width:40px;height:40px;background:var(--glass);border:1px solid var(--border);border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px}
.days{display:flex;gap:8px;overflow-x:auto;margin-bottom:20px;padding-bottom:4px}
.day{min-width:56px;padding:10px;background:var(--glass);border:1px solid var(--border);border-radius:12px;text-align:center;cursor:pointer;font-size:13px;color:var(--dim);font-weight:600}
.day.active{background:var(--grad);color:white;border-color:transparent;box-shadow:0 4px 12px var(--acc-glow)}
.lesson{padding:16px;background:var(--glass);border:1px solid var(--border);border-radius:16px;margin-bottom:12px;position:relative;overflow:hidden;backdrop-filter:blur(10px)}
.lesson::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--grad)}
.l-time{font-size:13px;color:#c4b5fd;font-weight:800;margin-bottom:6px}
.l-name{font-size:16px;font-weight:700;margin-bottom:8px;line-height:1.4}
.l-meta{font-size:13px;color:var(--dim);display:flex;gap:12px}
.modal{position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:100;display:none;align-items:flex-end;backdrop-filter:blur(5px)}
.modal.show{display:flex}
.modal-content{width:100%;background:#1e293b;border-radius:24px 24px 0 0;padding:24px;max-height:90vh;overflow-y:auto;border:1px solid var(--border)}
.close-modal{float:right;background:none;border:none;color:var(--dim);font-size:28px;cursor:pointer}
textarea{width:100%;height:120px;background:rgba(0,0,0,0.2);border:1px solid var(--border);border-radius:16px;padding:16px;color:white;margin:16px 0;font-size:15px;resize:none}
.btn-primary{width:100%;padding:16px;background:var(--grad);border:none;border-radius:16px;color:white;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 4px 15px var(--acc-glow)}
.answer{margin-top:20px;padding:20px;background:rgba(0,0,0,0.2);border-radius:16px;font-size:15px;line-height:1.6;display:none;white-space:pre-wrap;border:1px solid var(--border)}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--grad);color:white;padding:12px 24px;border-radius:24px;font-size:14px;font-weight:600;opacity:0;transition:0.3s;pointer-events:none;box-shadow:0 8px 24px var(--acc-glow)}
.toast.show{opacity:1}
.fit-score{font-size:48px;font-weight:900;text-align:center;margin:30px 0;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.fit-sub{text-align:center;color:var(--dim);margin-bottom:30px;font-size:16px}
.atc{background:linear-gradient(135deg,rgba(245,158,11,0.1),rgba(239,68,68,0.05));border:1px solid rgba(245,158,11,0.2);border-radius:20px;padding:20px;margin:20px 0}
.atc-h{display:flex;align-items:center;gap:12px;margin-bottom:16px;font-size:16px;font-weight:800;color:#fbbf24}
.atc-i{width:100%;padding:14px 16px;border-radius:12px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:white;font-size:15px;margin-bottom:12px}
.atc-btn{width:100%;padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#f59e0b,#ea580c);color:white;font-size:15px;font-weight:800;cursor:pointer}
</style>
</head>
<body>
<div class="app">
  <div id="home" class="screen">
    <div class="header">
      <div class="logo">🎓</div>
      <h1>Расписание ГУУ</h1>
      <div class="sub">3 курс · Осень 2026</div>
    </div>
    <div class="nav">
      <div class="nav-btn active" onclick="tab('schedule')">📅 Пары</div>
      <div class="nav-btn" onclick="tab('ai')">🤖 ИИ</div>
      <div class="nav-btn" onclick="tab('tasks')">📝 Задачи</div>
      <div class="nav-btn" onclick="tab('fit')">🏃 Физра</div>
    </div>
    
    <div id="view-schedule">
      <div class="section">
        <div class="title">Курс</div>
        <div class="chips" id="courseList"></div>
      </div>
      <div class="section">
        <div class="title">Институт</div>
        <div class="chips" id="instList"></div>
      </div>
      <input class="search" id="search" placeholder="Поиск группы...">
      <div class="title">Группы</div>
      <div class="list" id="groupList"></div>
    </div>

    <div id="view-ai" style="display:none">
      <div class="section">
        <div class="title">ИИ Помощник (Groq)</div>
        <textarea id="aiQ" placeholder="Введи вопрос или задание..."></textarea>
        <button class="btn-primary" onclick="askAI()">✨ Спросить ИИ</button>
        <div id="aiA" class="answer"></div>
      </div>
    </div>

    <div id="view-tasks" style="display:none">
      <div class="atc">
        <div class="atc-h">✏️ Добавить задание</div>
        <input class="atc-i" id="taskTitle" placeholder="Что нужно сделать?">
        <input type="datetime-local" class="atc-i" id="taskDate">
        <button class="atc-btn" onclick="addTask()">➕ Добавить</button>
      </div>
      <div class="section">
        <div class="title">Мои задачи</div>
        <div class="list" id="taskList"></div>
      </div>
    </div>

    <div id="view-fit" style="display:none">
      <div class="section">
        <div class="title">Физкультура</div>
        <div class="fit-score" id="fitScore">0 / 72</div>
        <div class="fit-sub">часов</div>
        <button class="btn-primary" onclick="addFit()">+2 часа (Пара)</button>
      </div>
    </div>
  </div>

  <div id="sched" class="screen" style="display:none">
    <div class="top-bar">
      <div class="back" onclick="back()">←</div>
      <div>
        <div style="font-weight:800;font-size:18px" id="sName">Группа</div>
        <div style="font-size:13px;color:var(--dim)" id="sFac">Институт</div>
      </div>
    </div>
    <div class="days" id="dayTabs"></div>
    <div id="lessonList"></div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const tg = window.Telegram.WebApp;
tg.expand();
let DATA, COURSE=3, INST="iom", DAY=0, GROUP=null;
const DAYS = ["ПН","ВТ","СР","ЧТ","ПТ","СБ"];

async function init() {
  try {
    const res = await fetch('/api/data');
    if(!res.ok) throw new Error("Server error");
    DATA = await res.json();
    renderFilters();
    loadTasks();
    updateFit();
  } catch(e) {
    console.error(e);
    toast("Ошибка загрузки данных");
  }
}

function renderFilters() {
  const cBox = document.getElementById('courseList');
  const iBox = document.getElementById('instList');
  cBox.innerHTML = DATA.courses.map(c => '<div class="chip ' + (c.id===COURSE?'active':'') + '" onclick="setCourse(' + c.id + ')">' + c.name + '</div>').join('');
  iBox.innerHTML = DATA.institutes.map(i => '<div class="chip ' + (i.id===INST?'active':'') + '" onclick="setInst(\\'' + i.id + '\\')">' + i.emoji + ' ' + i.name + '</div>').join('');
  renderGroups();
}

function setCourse(id) { COURSE=id; renderFilters(); }
function setInst(id) { INST=id; renderFilters(); }

function renderGroups() {
  const q = document.getElementById('search').value.toLowerCase();
  const list = DATA.groups.filter(g => g.c===COURSE && g.i===INST && (g.n.toLowerCase().includes(q) || g.f.toLowerCase().includes(q)));
  document.getElementById('groupList').innerHTML = list.map(g => '<div class="card" onclick="openGroup(\\'' + g.id + '\\')"><div class="card-icon">' + g.e + '</div><div class="card-info"><h3>' + g.n + '</h3><p>' + g.f + '</p></div></div>').join('');
}
document.getElementById('search').oninput = renderGroups;

function openGroup(id) {
  GROUP = DATA.groups.find(g => g.id === id);
  if(!GROUP) return;
  document.getElementById('sName').innerText = GROUP.n;
  document.getElementById('sFac').innerText = GROUP.f;
  document.getElementById('home').style.display = 'none';
  document.getElementById('sched').style.display = 'block';
  renderDays();
}

function back() {
  document.getElementById('sched').style.display = 'none';
  document.getElementById('home').style.display = 'block';
}

function renderDays() {
  const box = document.getElementById('dayTabs');
  box.innerHTML = DAYS.map((d,i) => '<div class="day ' + (i===DAY?'active':'') + '" onclick="setDay(' + i + ')">' + d + '</div>').join('');
  renderLessons();
}

function setDay(i) { DAY=i; renderDays(); }

function checkWeek(text, currentWeek) {
  const match = text.match(/\\(([^)]+)\\s*н\\)/);
  if (!match) return true;
  const content = match[1];
  const nums = content.replace(/[А-Яа-яA-Za-z]/g, '').trim();
  if (nums.includes('-')) {
    const [start, end] = nums.split('-').map(Number);
    return currentWeek >= start && currentWeek <= end;
  } else {
    return currentWeek === parseInt(nums);
  }
}

function renderLessons() {
  if (!GROUP) return;
  const dayName = DAYS[DAY];
  const data = GROUP.s[dayName];
  if (!data) { document.getElementById('lessonList').innerHTML = '<div style="text-align:center;color:var(--dim);padding:20px">Нет занятий</div>'; return; }
  
  const start = new Date(2026, 8, 1);
  const now = new Date();
  const weekNum = Math.floor((now - start) / (604800000)) + 1;
  const isEven = weekNum % 2 === 0;
  
  let lessons = isEven ? (data.e || data.o) : data.o;
  if (!lessons) lessons = [];
  lessons = lessons.filter(l => checkWeek(l.s + " " + l.y, weekNum));
  
  const box = document.getElementById('lessonList');
  if (lessons.length === 0) {
    box.innerHTML = '<div style="text-align:center;color:var(--dim);padding:20px">На этой неделе пар нет</div>';
    return;
  }
  
  box.innerHTML = lessons.map(l => {
    return '<div class="lesson"><div class="l-time">' + l.t + '</div><div class="l-name">' + l.s + '</div><div class="l-meta"><span>📍 ' + (l.r || '-') + '</span><span>👤 ' + (l.p || '-') + '</span></div></div>';
  }).join('');
}

async function askAI() {
  const q = document.getElementById('aiQ').value;
  if (!q) return toast("Введите вопрос");
  
  const btn = document.querySelector('#view-ai .btn-primary');
  const ans = document.getElementById('aiA');
  
  btn.disabled = true;
  btn.innerText = "🤖 Думаю...";
  ans.style.display = 'none';
  
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ task: q })
    });
    
    const data = await res.json();
    
    if(data.error) throw new Error(data.error);
    
    ans.innerText = data.answer;
    ans.style.display = 'block';
  } catch(e) {
    ans.innerText = "❌ " + e.message;
    ans.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerText = "✨ Спросить ИИ";
  }
}

let tasks = [];
async function loadTasks() {
  try {
    const r = await fetch('/api/tasks');
    tasks = await r.json();
    renderTasks();
  } catch(e) {}
}
function renderTasks() {
  document.getElementById('taskList').innerHTML = tasks.map(t => '<div class="card" style="flex-direction:column;align-items:flex-start"><div style="width:100%;display:flex;justify-content:space-between"><b>' + t.title + '</b><span onclick="delTask(\\'' + t.id + '\\')" style="color:#f87171;cursor:pointer">✕</span></div><div style="font-size:13px;color:var(--dim);margin-top:6px">📅 ' + new Date(t.deadline).toLocaleString() + '</div></div>').join('');
}
async function addTask() {
  const title = document.getElementById('taskTitle').value;
  const date = document.getElementById('taskDate').value;
  if (!title || !date) return toast("Заполните всё");
  const userId = tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : 0;
  await fetch('/api/tasks', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ userId, title, deadline: date }) });
  document.getElementById('taskTitle').value = "";
  loadTasks();
  toast("Добавлено");
}
async function delTask(id) {
  await fetch('/api/tasks/'+id, { method: 'DELETE' });
  loadTasks();
}

function updateFit() {
  const fit = JSON.parse(localStorage.getItem('fit') || '{"h":0}');
  document.getElementById('fitScore').innerText = fit.h + " / 72";
}
function addFit() {
  const fit = JSON.parse(localStorage.getItem('fit') || '{"h":0}');
  fit.h += 2;
  localStorage.setItem('fit', JSON.stringify(fit));
  updateFit();
  toast("+2 часа");
}

function tab(name) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  ['schedule','ai','tasks','fit'].forEach(v => { document.getElementById('view-'+v).style.display = v===name ? 'block' : 'none'; });
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

init();
<\/script>
</body>
</html>`;

// --- СЕРВЕРНАЯ ЧАСТЬ ---

fastify.get("/", (req, reply) => reply.type("text/html").send(HTML));
fastify.get("/api/data", async () => DATA);

// AI Endpoint (GROQ)
fastify.post("/api/ai", async (req, reply) => {
  const { task } = req.body;
  if (!task) return reply.code(400).send({ error: "Пустой запрос" });
  
  if (!GROQ_KEY) {
    return { answer: "⚠️ API ключ не настроен.\n\nДобавь GROQ_API_KEY в переменные окружения на Render." };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", // Быстрая и умная модель
        messages: [
          { role: "system", content: "Ты помощник студента ГУУ. Отвечай кратко, по делу, на русском языке." },
          { role: "user", content: task }
        ],
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[AI] Groq Error ${response.status}:`, errText);
      return { answer: `❌ Ошибка Groq API (${response.status}). Проверь ключ.` };
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "Нет ответа";
    
    return { answer };

  } catch (e) {
    console.error("[AI] Error:", e.message);
    if (e.name === 'AbortError') return { answer: "⏱️ Таймаут. Попробуй еще раз." };
    return { answer: "❌ Ошибка соединения: " + e.message };
  }
});

// Tasks API
fastify.get("/api/tasks", async () => loadTasks());
fastify.post("/api/tasks", async (req) => {
  const t = { id: Date.now().toString(), ...req.body, done: false, sent: false };
  const all = loadTasks(); all.push(t); saveTasks(all); return t;
});
fastify.delete("/api/tasks/:id", async (req) => {
  saveTasks(loadTasks().filter(t => t.id !== req.params.id)); return { ok: true };
});

// Bot & Reminders
const bot = new Telegraf(BOT_TOKEN);
bot.start((ctx) => {
  ctx.reply("🎓 Бот запущен!\n\nОткрой мини-приложение 👇", {
    reply_markup: { inline_keyboard: [[{ text: "🚀 Открыть", web_app: { url: APP_URL } }]] }
  });
});

cron.schedule("*/5 * * * *", async () => {
  const tasks = loadTasks();
  const now = new Date();
  let changed = false;
  for (let t of tasks) {
    if (t.sent) continue;
    const dl = new Date(t.deadline);
    const diff = dl - now;
    if (diff > 0 && diff < 3600000) {
      try {
        await bot.telegram.sendMessage(t.userId, `⏰ Напоминание!\n\n📝 ${t.title}\nДо пары меньше часа!`);
        t.sent = true; changed = true;
      } catch (e) { console.error("TG Error:", e.message); }
    }
  }
  if (changed) saveTasks(tasks);
});

const PORT = process.env.PORT || 3000;
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) { console.error(err); process.exit(1); }
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🤖 Groq Key: ${GROQ_KEY ? 'SET' : 'MISSING'}`);
  if (BOT_TOKEN) bot.launch().then(() => console.log("✅ Bot started"));
});
