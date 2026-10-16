require("dotenv").config();
const fastify = require("fastify")({ logger: true });
const { Telegraf } = require("telegraf");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

// --- ДАННЫЕ РАСПИСАНИЯ ---
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
    // ИОМ
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
    // ИУПСиБК
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
    // ИИС
    { id: "iis-bi-1", c: 3, i: "iis", n: "БИ-1", e: "💻", f: "Бизнес-информатика", s: {
      "ПН": { o: [{ t: "14:35-16:05", s: "Программная инженерия (Л 2-15 н)", y: "Л", p: "Гузеев А.В.", r: "ПА-115" }, { t: "16:15-17:45", s: "Проектирование информационных систем (Л 2-14 н)", y: "Л", p: "Слуцков Д.Н.", r: "У-429" }] },
      "ВТ": { o: [{ t: "10:40-12:10", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "12:55-14:25", s: "Анализ и моделирование бизнес-процессов (Л 1-13 н)", y: "Л", p: "Терехова А.Е.", r: "ПА-115" }, { t: "14:35-16:05", s: "Базы данных (ПЗ 1-13 н)", y: "ПЗ", p: "Белоусова М.Н.", r: "ЛК-101" }, { t: "16:15-17:45", s: "Паттерны проектирования (ЛЗ 1-13 н)", y: "ЛЗ", p: "Шпонарский И.В.", r: "ЛК-104" }] },
      "СР": { o: [{ t: "10:40-12:10", s: "Базы данных (ПЗ 1-11 н)", y: "ПЗ", p: "Белоусова М.Н.", r: "ЛК-101" }, { t: "12:55-14:25", s: "Программная инженерия (ЛЗ 1-12 н)", y: "ЛЗ", p: "Гузеев А.В.", r: "ЛК-105" }, { t: "14:35-16:05", s: "Паттерны проектирования (ЛЗ 1-9 н)", y: "ЛЗ", p: "Шпонарский И.В.", r: "ЛК-107" }] },
      "ЧТ": { o: [{ t: "09:00-17:45", s: "Проектное обучение", y: "ПЗ", r: "" }] },
      "ПТ": { o: [{ t: "09:00-10:30", s: "Иностранный язык (ПЗ 1-12 н)", y: "ПЗ", r: "ЛК-6" }, { t: "10:40-12:10", s: "Иностранный язык (ПЗ 1-13 н)", y: "ПЗ", r: "ЛК-6" }, { t: "12:55-14:25", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "14:35-16:05", s: "Базы данных (Л 1-14 н)", y: "Л", p: "Белоусова М.Н.", r: "ПА-115" }, { t: "16:15-17:45", s: "Базы данных (ПЗ 1-16 н)", y: "ПЗ", p: "Белоусова М.Н.", r: "ЛК-101" }] },
      "СБ": { o: [{ t: "09:00-10:30", s: "Машинное обучение (Л 1-11 н)", y: "Л", p: "Денисова А.И.", r: "ЛК-128" }, { t: "10:40-12:10", s: "Паттерны проектирования (Л 14 н)", y: "Л", p: "Глазков А.В.", r: "ПА-119" }] }
    }},
    // ИМ
    { id: "im-bm-1", c: 3, i: "im", n: "БМ-1", e: "🏷️", f: "Бренд-менеджмент", s: {
      "ПН": { o: [{ t: "09:00-10:30", s: "Маркетинговые коммуникации (Л 2-14 н)", y: "Л", p: "Конкс В.Я.", r: "А-514" }, { t: "10:40-12:10", s: "Управление продуктом (Л 2-14 н)", y: "Л", p: "Орлова Н.А.", r: "А-333" }, { t: "12:55-14:25", s: "Управление продуктом (ПЗ 2-10 н)", y: "ПЗ", p: "Орлова Н.А.", r: "А-410" }, { t: "14:35-16:05", s: "Управление продуктом (ПЗ 2-9 н)", y: "ПЗ", p: "Орлова Н.А.", r: "А-410" }] },
      "ВТ": { o: [{ t: "09:00-10:30", s: "Иностранный язык (ПЗ 1-11 н)", y: "ПЗ", r: "" }, { t: "10:40-12:10", s: "Иностранный язык (ПЗ 1-15 н)", y: "ПЗ", r: "" }, { t: "12:55-14:25", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "14:35-16:05", s: "Маркетинговые коммуникации (ПЗ 1-16 н)", y: "ПЗ", p: "Конкс В.Я.", r: "А-512" }] },
      "СР": { o: [{ t: "09:00-10:30", s: "Ценообразование (Л 2-12 н)", y: "Л", p: "Ларина О.И.", r: "ПА-109" }, { t: "10:40-12:10", s: "Организационный дизайн (Л 1-11 н)", y: "Л", p: "Денисова И.В.", r: "ПА-203" }, { t: "12:55-14:25", s: "Ценообразование (ПЗ 1-11 н)", y: "ПЗ", p: "Ларина О.И.", r: "А-512" }, { t: "14:35-16:05", s: "Ценообразование (ПЗ 1-11 н)", y: "ПЗ", p: "Ларина О.И.", r: "А-512" }] },
      "ЧТ": { o: [{ t: "09:00-17:45", s: "Проектное обучение", y: "ПЗ", r: "" }] },
      "ПТ": { o: [{ t: "10:40-12:10", s: "Бухгалтерский учет (ПЗ 1-13 н)", y: "ПЗ", p: "Адамова Г.А.", r: "А-508" }, { t: "12:55-14:25", s: "Организационный дизайн (ПЗ 1-13 н)", y: "ПЗ", p: "Денисова И.В.", r: "А-410" }, { t: "14:35-16:05", s: "Интеллектуальные системы (ПЗ 1-13 н)", y: "ПЗ", p: "Крамаренко И.В.", r: "ЛК-128" }, { t: "16:15-17:45", s: "Бухгалтерский учет (Л 1-11 н)", y: "Л", p: "Адамова Г.А.", r: "ПА-119" }] },
      "СБ": { o: [{ t: "09:00-10:30", s: "Управление продуктом (Л 1-15 н)", y: "Л", p: "Алешникова В.И.", r: "ПА-119" }, { t: "10:40-12:10", s: "Управление продуктом (ПЗ 1-14,16 н)", y: "ПЗ", p: "Алешникова В.И.", r: "А-514" }, { t: "12:55-14:25", s: "Организация и планирование маркетинга (ПЗ 1-13 н)", y: "ПЗ", p: "Семенов И.В.", r: "А-433" }, { t: "14:35-16:05", s: "Управление продуктом (ПЗ 12-13 н)", y: "ПЗ", p: "Алешникова В.И.", r: "А-514" }] }
    }},
    // ИЭиФ
    { id: "ief-e-1", c: 3, i: "ief", n: "Э-1", e: "💰", f: "Экономика", s: {
      "ПН": { o: [{ t: "12:55-14:25", s: "Статистика (Л 2-14 н)", y: "Л", p: "Хабиб М.Д.", r: "У-429" }, { t: "14:35-16:05", s: "Иностранный язык (ПЗ 1-11 н)", y: "ПЗ", r: "" }, { t: "16:15-17:45", s: "Иностранный язык", y: "ПЗ", r: "" }] },
      "ВТ": { o: [{ t: "10:40-12:10", s: "Государственные закупки (ПЗ 1-13 н)", y: "ПЗ", p: "Гизатулина И.В.", r: "ЛК-230" }, { t: "12:55-14:25", s: "Мировая экономика (Л 1-13 н)", y: "Л", p: "Иванова В.И.", r: "У-345" }, { t: "14:35-16:05", s: "Мировая экономика (ПЗ 1-13 н)", y: "ПЗ", p: "Канунникова А.М.", r: "У-407" }, { t: "16:15-17:45", s: "Планирование труда и ЗП (Л 1-15 н)", y: "Л", p: "Остапенко В.А.", r: "У-253" }, { t: "17:55-19:25", s: "Планирование труда и ЗП (ПЗ 1-16 н)", y: "ПЗ", p: "Остапенко В.А.", r: "" }] },
      "СР": { o: [{ t: "09:00-10:30", s: "Эконометрика (Л 1-14 н)", y: "Л", p: "Черников Г.В.", r: "ПА-215" }, { t: "10:40-12:10", s: "Физическая культура", y: "ПЗ", r: "Спортзал" }, { t: "12:55-14:25", s: "Эконометрика (ПЗ 1-9 н)", y: "ПЗ", p: "Путилов К.С.", r: "У-219" }, { t: "14:35-16:05", s: "Статистика (ПЗ 1-13 н)", y: "ПЗ", p: "Хабиб М.Д.", r: "ЛК-408" }, { t: "16:15-17:45", s: "Эконометрика (ПЗ 1-9 н)", y: "ПЗ", p: "Путилов К.С.", r: "ЛК-407" }] },
      "ЧТ": { o: [{ t: "09:00-17:45", s: "Проектное обучение", y: "ПЗ", r: "" }] },
      "ПТ": { o: [{ t: "12:55-14:25", s: "Финансы (Л 1-13 н)", y: "Л", p: "Ревзон О.А.", r: "У-347" }, { t: "14:35-16:05", s: "Финансы (ПЗ 1-13 н)", y: "ПЗ", p: "Ревзон О.А.", r: "У-318" }, { t: "16:15-17:45", s: "Финансы (ПЗ 1-11 н)", y: "ПЗ", p: "Ревзон О.А.", r: "У-318" }] },
      "СБ": { o: [{ t: "10:40-12:10", s: "Государственные закупки (Л 1-13 н)", y: "Л", p: "Казанцева Н.В.", r: "У-452" }, { t: "12:55-14:25", s: "Государственные закупки (Л 1-13 н)", y: "Л", p: "Казанцева Н.В.", r: "У-452" }] }
    }},
    // ИГУиП
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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#0a0a14;--glass:rgba(255,255,255,0.04);--glass-strong:rgba(255,255,255,0.08);
  --border:rgba(255,255,255,0.1);--text:#ffffff;--dim:#9ca3af;
  --v:#8b5cf6;--v2:#a78bfa;--c:#06b6d4;--p:#ec4899;--g:#10b981;--o:#f59e0b;--r:#ef4444;
  --grad:linear-gradient(135deg,#8b5cf6 0%,#ec4899 50%,#06b6d4 100%);
  --grad-soft:linear-gradient(135deg,rgba(139,92,246,0.15),rgba(236,72,153,0.1));
  --glow:0 0 40px rgba(139,92,246,0.3);
  --radius:20px;--radius-sm:14px;--radius-xs:10px;
}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;font-family:'Inter',-apple-system,sans-serif}
html,body{background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased}

/* === ANIMATED BACKGROUND === */
.bg{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none}
.orb{position:absolute;border-radius:50%;filter:blur(100px);opacity:0.4;animation:drift 25s infinite ease-in-out}
.orb-1{width:400px;height:400px;background:radial-gradient(circle,#8b5cf6,transparent);top:-100px;left:-100px}
.orb-2{width:350px;height:350px;background:radial-gradient(circle,#ec4899,transparent);bottom:-50px;right:-100px;animation-delay:-8s;animation-duration:30s}
.orb-3{width:300px;height:300px;background:radial-gradient(circle,#06b6d4,transparent);top:40%;left:50%;animation-delay:-15s;animation-duration:35s}
@keyframes drift{
  0%,100%{transform:translate(0,0) scale(1)}
  25%{transform:translate(50px,-30px) scale(1.1)}
  50%{transform:translate(-30px,50px) scale(0.9)}
  75%{transform:translate(-50px,-20px) scale(1.05)}
}
.noise{position:fixed;inset:0;z-index:1;pointer-events:none;opacity:0.03;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}

.app{position:relative;z-index:2;max-width:480px;margin:0 auto;padding:20px 16px 100px}

/* === HEADER === */
.header{text-align:center;padding:20px 0 30px;position:relative}
.logo-wrap{display:inline-block;position:relative;margin-bottom:16px}
.logo{width:90px;height:90px;background:var(--grad);border-radius:28px;display:flex;align-items:center;justify-content:center;font-size:44px;box-shadow:var(--glow),inset 0 1px 0 rgba(255,255,255,0.2);animation:float 6s ease-in-out infinite;position:relative;overflow:hidden}
.logo::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.3) 50%,transparent 60%);animation:shine 3s infinite}
@keyframes shine{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
h1{font-size:32px;font-weight:900;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:6px;letter-spacing:-0.5px}
.sub{color:var(--dim);font-size:14px;font-weight:500}
.week-badge{display:inline-flex;align-items:center;gap:8px;margin-top:14px;padding:8px 16px;background:var(--glass);border:1px solid var(--border);border-radius:100px;font-size:12px;font-weight:700;color:var(--v2);backdrop-filter:blur(20px)}
.week-dot{width:8px;height:8px;border-radius:50%;background:var(--g);box-shadow:0 0 12px var(--g);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.8)}}

/* === NAVIGATION === */
.nav{display:flex;gap:6px;margin:24px 0;padding:6px;background:var(--glass);border:1px solid var(--border);border-radius:var(--radius);backdrop-filter:blur(20px);box-shadow:0 8px 32px rgba(0,0,0,0.2)}
.nav-btn{flex:1;padding:12px 8px;text-align:center;border-radius:var(--radius-sm);font-size:11px;font-weight:700;color:var(--dim);cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);text-transform:uppercase;letter-spacing:0.5px;position:relative;overflow:hidden}
.nav-btn .ico{font-size:22px;display:block;margin-bottom:4px;transition:transform 0.3s}
.nav-btn.active{background:var(--grad);color:white;box-shadow:0 4px 20px rgba(139,92,246,0.4)}
.nav-btn.active .ico{transform:scale(1.15)}
.nav-btn:active{transform:scale(0.95)}

/* === SECTIONS === */
.section{margin-top:24px;animation:fadeUp 0.5s ease both}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.title{font-size:11px;font-weight:800;color:var(--dim);text-transform:uppercase;margin-bottom:12px;letter-spacing:1.5px;display:flex;align-items:center;gap:10px}
.title::before{content:'';width:4px;height:14px;background:var(--grad);border-radius:2px;box-shadow:0 0 10px rgba(139,92,246,0.5)}

/* === CHIPS === */
.chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.chips::-webkit-scrollbar{display:none}
.chip{padding:10px 18px;background:var(--glass);border:1px solid var(--border);border-radius:100px;font-size:13px;font-weight:600;white-space:nowrap;cursor:pointer;color:var(--dim);transition:all 0.25s cubic-bezier(0.4,0,0.2,1);backdrop-filter:blur(10px)}
.chip.active{background:var(--grad);color:white;border-color:transparent;box-shadow:0 4px 16px rgba(139,92,246,0.4);transform:translateY(-2px)}
.chip:active{transform:scale(0.95)}

/* === SEARCH === */
.search-wrap{position:relative;margin:16px 0}
.search{width:100%;padding:14px 18px 14px 48px;background:var(--glass);border:1px solid var(--border);border-radius:var(--radius-sm);color:white;font-size:14px;font-weight:500;backdrop-filter:blur(10px);transition:all 0.25s}
.search:focus{border-color:var(--v);box-shadow:0 0 0 4px rgba(139,92,246,0.15);outline:none}
.search::placeholder{color:var(--dim)}
.search-icon{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--dim);pointer-events:none}

/* === CARDS === */
.list{display:flex;flex-direction:column;gap:10px}
.card{padding:16px;background:var(--glass);border:1px solid var(--border);border-radius:var(--radius);display:flex;align-items:center;gap:14px;cursor:pointer;transition:all 0.25s cubic-bezier(0.4,0,0.2,1);backdrop-filter:blur(10px);position:relative;overflow:hidden}
.card::before{content:'';position:absolute;inset:0;background:var(--grad-soft);opacity:0;transition:opacity 0.3s}
.card:active{transform:scale(0.98)}
.card:active::before{opacity:1}
.card-icon{font-size:32px;position:relative;z-index:1;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.3))}
.card-info{flex:1;min-width:0;position:relative;z-index:1}
.card-info h3{font-size:16px;font-weight:700;margin-bottom:3px;letter-spacing:-0.2px}
.card-info p{font-size:12px;color:var(--dim);line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card-arrow{color:var(--dim);font-size:20px;position:relative;z-index:1;transition:transform 0.3s}
.card:active .card-arrow{transform:translateX(4px);color:var(--v2)}

/* === SCHEDULE VIEW === */
.top-bar{display:flex;align-items:center;gap:14px;margin-bottom:20px}
.back-btn{width:42px;height:42px;background:var(--glass);border:1px solid var(--border);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:20px;transition:all 0.25s;backdrop-filter:blur(10px)}
.back-btn:active{transform:scale(0.9);background:var(--glass-strong)}
.group-title{flex:1;min-width:0}
.group-title h2{font-size:20px;font-weight:800;letter-spacing:-0.3px;margin-bottom:2px}
.group-title p{font-size:12px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.days{display:flex;gap:8px;overflow-x:auto;margin-bottom:20px;padding-bottom:4px;scrollbar-width:none}
.days::-webkit-scrollbar{display:none}
.day{min-width:60px;padding:12px 8px;background:var(--glass);border:1px solid var(--border);border-radius:var(--radius-sm);text-align:center;cursor:pointer;transition:all 0.25s cubic-bezier(0.4,0,0.2,1);backdrop-filter:blur(10px)}
.day-name{font-size:14px;font-weight:700;color:var(--dim);margin-bottom:2px}
.day-sub{font-size:10px;color:var(--dim);opacity:0.7;text-transform:uppercase;letter-spacing:0.5px}
.day.active{background:var(--grad);border-color:transparent;box-shadow:0 4px 16px rgba(139,92,246,0.4);transform:translateY(-2px)}
.day.active .day-name,.day.active .day-sub{color:white;opacity:1}
.day.today{border-color:var(--c)}
.day.today .day-name{color:var(--c)}
.day:active{transform:scale(0.95)}

.lesson{padding:16px;background:var(--glass);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:12px;position:relative;overflow:hidden;backdrop-filter:blur(10px);transition:all 0.25s}
.lesson::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--grad)}
.lesson.prac::before{background:linear-gradient(180deg,var(--c),#22d3ee)}
.lesson.lab::before{background:linear-gradient(180deg,var(--o),#fbbf24)}
.lesson:active{transform:scale(0.99)}
.l-time{font-size:13px;color:var(--v2);font-weight:800;margin-bottom:6px;letter-spacing:0.3px}
.l-name{font-size:16px;font-weight:700;margin-bottom:8px;line-height:1.4;letter-spacing:-0.2px}
.l-meta{font-size:13px;color:var(--dim);display:flex;flex-wrap:wrap;gap:12px}
.l-meta span{display:flex;align-items:center;gap:4px}

.empty{text-align:center;padding:60px 20px;color:var(--dim)}
.empty-icon{font-size:64px;margin-bottom:16px;opacity:0.5}
.empty-text{font-size:15px;font-weight:600}

/* === TASKS === */
.task-form{background:var(--glass);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:20px;backdrop-filter:blur(10px);position:relative;overflow:hidden}
.task-form::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--grad)}
.task-form-title{font-size:15px;font-weight:800;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.input{width:100%;padding:14px 16px;background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:var(--radius-sm);color:white;font-size:14px;font-family:inherit;margin-bottom:10px;transition:all 0.25s}
.input:focus{border-color:var(--v);box-shadow:0 0 0 3px rgba(139,92,246,0.15);outline:none}
.input::placeholder{color:var(--dim)}
.btn{width:100%;padding:14px;background:var(--grad);border:none;border-radius:var(--radius-sm);color:white;font-size:15px;font-weight:800;cursor:pointer;transition:all 0.25s;box-shadow:0 4px 16px rgba(139,92,246,0.3);letter-spacing:0.3px}
.btn:active{transform:scale(0.98);box-shadow:0 2px 8px rgba(139,92,246,0.3)}

.task-item{padding:14px 16px;background:var(--glass);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;backdrop-filter:blur(10px);transition:all 0.25s}
.task-item:active{transform:scale(0.98)}
.task-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px}
.task-title{font-size:14px;font-weight:700;flex:1;line-height:1.4}
.task-del{color:var(--dim);cursor:pointer;font-size:18px;padding:0 4px;transition:color 0.2s}
.task-del:active{color:var(--r)}
.task-date{font-size:12px;color:var(--dim);display:flex;align-items:center;gap:6px}
.task-date.urgent{color:var(--r);font-weight:700}
.task-date.soon{color:var(--o);font-weight:600}

/* === FITNESS === */
.fit-card{background:var(--glass);border:1px solid var(--border);border-radius:var(--radius);padding:30px 20px;text-align:center;backdrop-filter:blur(10px);position:relative;overflow:hidden;margin-bottom:20px}
.fit-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--g),var(--c))}
.fit-icon{font-size:56px;margin-bottom:12px;animation:float 4s ease-in-out infinite}
.fit-score{font-size:56px;font-weight:900;background:linear-gradient(135deg,var(--g),var(--c));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-2px;margin-bottom:4px}
.fit-label{font-size:14px;color:var(--dim);font-weight:600;margin-bottom:24px}
.fit-bar{height:10px;background:rgba(255,255,255,0.06);border-radius:10px;overflow:hidden;margin-bottom:24px}
.fit-fill{height:100%;background:linear-gradient(90deg,var(--g),var(--c));border-radius:10px;transition:width 0.6s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden}
.fit-fill::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent);animation:shimmer 2s infinite}
@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
.fit-btn{width:100%;padding:16px;background:linear-gradient(135deg,var(--g),#059669);border:none;border-radius:var(--radius-sm);color:white;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 4px 16px rgba(16,185,129,0.3);transition:all 0.25s}
.fit-btn:active{transform:scale(0.98)}

/* === TOAST === */
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);background:var(--grad);color:white;padding:14px 28px;border-radius:100px;font-size:14px;font-weight:700;opacity:0;transition:all 0.4s cubic-bezier(0.4,0,0.2,1);pointer-events:none;box-shadow:0 8px 32px rgba(139,92,246,0.4);z-index:1000;white-space:nowrap}
.toast.show{transform:translateX(-50%) translateY(0);opacity:1}

/* === SCREENS === */
.screen{display:none;animation:fadeIn 0.4s ease}
.screen.active{display:block}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
</style>
</head>
<body>
<div class="bg"><div class="orb orb-1"></div><div class="orb orb-2"></div><div class="orb orb-3"></div></div>
<div class="noise"></div>

<div class="app">
  <div id="home" class="screen active">
    <div class="header">
      <div class="logo-wrap"><div class="logo">🎓</div></div>
      <h1>Расписание ГУУ</h1>
      <div class="sub">3 курс · Осень 2026/27</div>
      <div class="week-badge"><span class="week-dot"></span><span id="weekBadge">Загрузка...</span></div>
    </div>

    <div class="nav">
      <div class="nav-btn active" onclick="tab('schedule')"><span class="ico">📅</span>Пары</div>
      <div class="nav-btn" onclick="tab('tasks')"><span class="ico">📝</span>Задачи</div>
      <div class="nav-btn" onclick="tab('fit')"><span class="ico">🏃</span>Физра</div>
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
      <div class="search-wrap">
        <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search" id="search" placeholder="Поиск группы...">
      </div>
      <div class="section">
        <div class="title">Группы</div>
        <div class="list" id="groupList"></div>
      </div>
    </div>

    <div id="view-tasks" style="display:none">
      <div class="task-form">
        <div class="task-form-title">✏️ Новое задание</div>
        <input class="input" id="taskTitle" placeholder="Что нужно сделать?">
        <input type="datetime-local" class="input" id="taskDate">
        <button class="btn" onclick="addTask()">➕ Добавить задание</button>
      </div>
      <div class="section">
        <div class="title">Мои задачи</div>
        <div id="taskList"></div>
      </div>
    </div>

    <div id="view-fit" style="display:none">
      <div class="fit-card">
        <div class="fit-icon">💪</div>
        <div class="fit-score" id="fitScore">0/72</div>
        <div class="fit-label">часов физкультуры</div>
        <div class="fit-bar"><div class="fit-fill" id="fitFill" style="width:0%"></div></div>
        <button class="fit-btn" onclick="addFit()">+2 часа (отметить пару)</button>
      </div>
    </div>
  </div>

  <div id="sched" class="screen">
    <div class="top-bar">
      <div class="back-btn" onclick="back()">←</div>
      <div class="group-title">
        <h2 id="sName">Группа</h2>
        <p id="sFac">Институт</p>
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
try { tg.setHeaderColor('#0a0a14'); tg.setBackgroundColor('#0a0a14'); } catch(e){}

let DATA, COURSE=3, INST="iom", DAY=0, GROUP=null;
const DAYS = ["ПН","ВТ","СР","ЧТ","ПТ","СБ"];
const DAYS_FULL = {"ПН":"Понедельник","ВТ":"Вторник","СР":"Среда","ЧТ":"Четверг","ПТ":"Пятница","СБ":"Суббота"};

async function init() {
  try {
    const res = await fetch('/api/data');
    if(!res.ok) throw new Error("Server error");
    DATA = await res.json();
    
    const start = new Date(2026, 8, 1);
    const now = new Date();
    const week = Math.floor((now - start) / (604800000)) + 1;
    document.getElementById('weekBadge').innerText = week + " учебная неделя";
    
    renderFilters();
    loadTasks();
    updateFit();
  } catch(e) {
    console.error(e);
    toast("Ошибка загрузки данных");
  }
}

function renderFilters() {
  document.getElementById('courseList').innerHTML = DATA.courses.map(c => 
    '<div class="chip ' + (c.id===COURSE?'active':'') + '" onclick="setCourse(' + c.id + ')">' + c.name + '</div>'
  ).join('');
  
  document.getElementById('instList').innerHTML = DATA.institutes.map(i => 
    '<div class="chip ' + (i.id===INST?'active':'') + '" onclick="setInst(\\'' + i.id + '\\')">' + i.emoji + ' ' + i.name + '</div>'
  ).join('');
  
  renderGroups();
}

function setCourse(id) { COURSE=id; renderFilters(); }
function setInst(id) { INST=id; renderFilters(); }

function renderGroups() {
  const q = document.getElementById('search').value.toLowerCase();
  const list = DATA.groups.filter(g => g.c===COURSE && g.i===INST && (g.n.toLowerCase().includes(q) || g.f.toLowerCase().includes(q)));
  
  if (list.length === 0) {
    document.getElementById('groupList').innerHTML = '<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">Ничего не найдено</div></div>';
    return;
  }
  
  document.getElementById('groupList').innerHTML = list.map((g,i) => 
    '<div class="card" style="animation-delay:' + (i*0.05) + 's" onclick="openGroup(\\'' + g.id + '\\')">' +
      '<div class="card-icon">' + g.e + '</div>' +
      '<div class="card-info"><h3>' + g.n + '</h3><p>' + g.f + '</p></div>' +
      '<div class="card-arrow">›</div>' +
    '</div>'
  ).join('');
}
document.getElementById('search').addEventListener('input', renderGroups);

function openGroup(id) {
  GROUP = DATA.groups.find(g => g.id === id);
  if(!GROUP) return;
  document.getElementById('sName').innerText = GROUP.e + ' ' + GROUP.n;
  document.getElementById('sFac').innerText = GROUP.f;
  document.getElementById('home').classList.remove('active');
  document.getElementById('sched').classList.add('active');
  
  const today = new Date().getDay();
  DAY = today === 0 ? 5 : today - 1;
  renderDays();
}

function back() {
  document.getElementById('sched').classList.remove('active');
  document.getElementById('home').classList.add('active');
}

function renderDays() {
  const today = new Date().getDay();
  const todayIdx = today === 0 ? -1 : today - 1;
  
  document.getElementById('dayTabs').innerHTML = DAYS.map((d,i) => 
    '<div class="day ' + (i===DAY?'active':'') + (i===todayIdx?' today':'') + '" onclick="setDay(' + i + ')">' +
      '<div class="day-name">' + d + '</div>' +
      '<div class="day-sub">' + DAYS_FULL[d].slice(0,2) + '</div>' +
    '</div>'
  ).join('');
  
  setTimeout(() => {
    const active = document.querySelector('.day.active');
    if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, 100);
  
  renderLessons();
}

function setDay(i) { DAY=i; renderDays(); }

function checkWeek(text, currentWeek) {
  const match = text.match(/\\(([^)]+)\\s*н\\)/);
  if (!match) return true;
  const content = match[1];
  const nums = content.replace(/[А-Яа-яA-Za-z]/g, '').trim();
  if (nums.includes('-')) {
    const parts = nums.split('-');
    const start = parseInt(parts[0]);
    const end = parseInt(parts[1]);
    return currentWeek >= start && currentWeek <= end;
  } else {
    return currentWeek === parseInt(nums);
  }
}

function renderLessons() {
  if (!GROUP) return;
  const dayName = DAYS[DAY];
  const data = GROUP.s[dayName];
  
  if (!data) { 
    document.getElementById('lessonList').innerHTML = '<div class="empty"><div class="empty-icon">😴</div><div class="empty-text">Нет занятий</div></div>';
    return; 
  }
  
  const start = new Date(2026, 8, 1);
  const now = new Date();
  const weekNum = Math.floor((now - start) / (604800000)) + 1;
  const isEven = weekNum % 2 === 0;
  
  let lessons = isEven ? (data.e || data.o) : data.o;
  if (!lessons) lessons = [];
  lessons = lessons.filter(l => checkWeek(l.s + ' ' + l.y, weekNum));
  
  if (lessons.length === 0) {
    document.getElementById('lessonList').innerHTML = '<div class="empty"><div class="empty-icon">🎉</div><div class="empty-text">На этой неделе пар нет</div></div>';
    return;
  }
  
  document.getElementById('lessonList').innerHTML = lessons.map((l,i) => {
    const type = l.y && l.y.includes('ПЗ') ? 'prac' : (l.y && l.y.includes('ЛЗ') ? 'lab' : '');
    return '<div class="lesson ' + type + '" style="animation-delay:' + (i*0.05) + 's">' +
      '<div class="l-time">' + l.t + '</div>' +
      '<div class="l-name">' + l.s + '</div>' +
      '<div class="l-meta">' +
        (l.r ? '<span>📍 ' + l.r + '</span>' : '') +
        (l.p ? '<span>👤 ' + l.p + '</span>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}

// === TASKS ===
let tasks = [];
async function loadTasks() {
  try {
    const r = await fetch('/api/tasks');
    tasks = await r.json();
    renderTasks();
  } catch(e) {}
}

function renderTasks() {
  const list = document.getElementById('taskList');
  if (tasks.length === 0) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">📭</div><div class="empty-text">Нет активных задач</div></div>';
    return;
  }
  
  const now = new Date();
  list.innerHTML = tasks.sort((a,b) => new Date(a.deadline) - new Date(b.deadline)).map(t => {
    const dl = new Date(t.deadline);
    const diff = (dl - now) / (1000*60*60*24);
    let cls = '', label = '';
    if (diff < 0) { cls = 'urgent'; label = '⚠️ Просрочено'; }
    else if (diff < 1) { cls = 'urgent'; label = '⏰ Сегодня'; }
    else if (diff < 2) { cls = 'soon'; label = '🔥 Завтра'; }
    else if (diff < 7) { cls = 'soon'; label = '📅 ' + Math.ceil(diff) + ' дн'; }
    else label = '📅 ' + dl.toLocaleDateString('ru-RU', {day:'numeric',month:'short'});
    
    return '<div class="task-item">' +
      '<div class="task-head">' +
        '<div class="task-title">' + escapeHtml(t.title) + '</div>' +
        '<span class="task-del" onclick="delTask(\\'' + t.id + '\\')">✕</span>' +
      '</div>' +
      '<div class="task-date ' + cls + '">' + label + ' · ' + dl.toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'}) + '</div>' +
    '</div>';
  }).join('');
}

function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function addTask() {
  const title = document.getElementById('taskTitle').value.trim();
  const date = document.getElementById('taskDate').value;
  if (!title || !date) return toast("Заполните все поля");
  
  const userId = tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : 0;
  
  try {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ userId, title, deadline: date })
    });
    document.getElementById('taskTitle').value = "";
    document.getElementById('taskDate').value = "";
    loadTasks();
    toast("✓ Задание добавлено");
  } catch(e) { toast("Ошибка сохранения"); }
}

async function delTask(id) {
  try {
    await fetch('/api/tasks/'+id, { method: 'DELETE' });
    loadTasks();
    toast("Удалено");
  } catch(e) { toast("Ошибка удаления"); }
}

// === FITNESS ===
function updateFit() {
  const fit = JSON.parse(localStorage.getItem('fit') || '{"h":0,"target":72}');
  const percent = Math.min(100, Math.round((fit.h / fit.target) * 100));
  document.getElementById('fitScore').innerText = fit.h + '/' + fit.target;
  document.getElementById('fitFill').style.width = percent + '%';
}

function addFit() {
  const fit = JSON.parse(localStorage.getItem('fit') || '{"h":0,"target":72}');
  fit.h += 2;
  localStorage.setItem('fit', JSON.stringify(fit));
  updateFit();
  toast("✓ +2 часа добавлено");
}

// === NAVIGATION ===
function tab(name) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  event.currentTarget.classList.add('active');
  ['schedule','tasks','fit'].forEach(v => {
    document.getElementById('view-'+v).style.display = v===name ? 'block' : 'none';
  });
  if (name === 'tasks') loadTasks();
  if (name === 'fit') updateFit();
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

init();
<\/script>
</body>
</html>`;

// --- СЕРВЕРНАЯ ЧАСТЬ ---
fastify.get("/", (req, reply) => reply.type("text/html").send(HTML));
fastify.get("/api/data", async () => DATA);

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
  ctx.reply("🎓 *Расписание ГУУ готово\\!*\n\nОткрой мини\\-приложение 👇", {
    parse_mode: "MarkdownV2",
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
        await bot.telegram.sendMessage(t.userId, `⏰ *Напоминание\\!*\n\n📝 ${t.title.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')}\nДо пары меньше часа\\!`, { parse_mode: "MarkdownV2" });
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
  if (BOT_TOKEN) bot.launch().then(() => console.log("✅ Bot started"));
});
