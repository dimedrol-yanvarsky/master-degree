/*
  Скрипт mongosh для развёртывания БД веб-приложения контроля эмоционального состояния человека.
  Источник структуры: даталогическая модель (draw.io). Источник данных: реальные данные приложения
  (клиентские модели проекта). Там, где у приложения нет данных (отзывы) — добавлены тестовые записи
  и это явно помечено.

  Запуск из Windows PowerShell:
    mongosh --file .\mongo_emotional_state_control.js

  По умолчанию скрипт создаёт/обновляет коллекции с валидаторами и индексами и заполняет их данными.
  Перед заполнением данные в 8 целевых коллекциях очищаются (deleteMany), поэтому повторный запуск
  идемпотентен (без дублей и без конфликтов уникальных индексов). При необходимости меняйте флаги ниже.
*/

const DB_NAME = "emotional_state_control";
const DROP_EXISTING_DATABASE = false;
const SEED_DEMO_DATA = true;

const database = db.getSiblingDB(DB_NAME);

if (DROP_EXISTING_DATABASE) {
  database.dropDatabase();
  print(`База данных '${DB_NAME}' удалена перед повторным созданием.`);
}

function createOrUpdateCollection(collectionName, validator) {
  const options = {
    validator,
    validationLevel: "strict",
    validationAction: "error"
  };

  // Чтобы повторный запуск полностью заменял старую версию (с прежней схемой),
  // существующую коллекцию пересоздаём: старый вариант удаляется вместе с
  // валидатором, затем создаётся коллекция с актуальной схемой.
  if (database.getCollectionNames().includes(collectionName)) {
    database.getCollection(collectionName).drop();
    print(`Коллекция '${collectionName}' пересоздаётся (старая версия удалена).`);
  }

  database.createCollection(collectionName, options);
  print(`Коллекция '${collectionName}' создана.`);
}

function objectId(description) {
  return { bsonType: "objectId", description };
}

function nullableObjectId(description) {
  return { bsonType: ["objectId", "null"], description };
}

function stringField(description) {
  return { bsonType: "string", description };
}

function nullableStringField(description) {
  return { bsonType: ["string", "null"], description };
}

function dateField(description) {
  return { bsonType: "date", description };
}

function boolField(description) {
  return { bsonType: "bool", description };
}

function intField(description) {
  return { bsonType: ["int", "long"], description };
}

function nullableIntField(description) {
  return { bsonType: ["int", "long", "null"], description };
}

function arrayField(description) {
  return { bsonType: "array", description };
}

function objectField(description) {
  return { bsonType: "object", description };
}

const schemas = {
  // Пользователи
  users: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "_id",
        "first_name",
        "last_name",
        "patronymic",
        "email",
        "account_status",
        "password_hash",
        "role",
        "created_at",
        "is_yandex_linked",
        "description",
        "experience",
        "sessions",
        "collaboration_id"
      ],
      additionalProperties: false,
      properties: {
        _id: objectId("PK. Идентификатор пользователя."),
        first_name: stringField("Имя."),
        last_name: stringField("Фамилия."),
        patronymic: stringField("Отчество. Если отчества нет, хранится пустая строка."),
        email: stringField("Почтовый адрес / адрес электронной почты пользователя."),
        account_status: stringField("Статус аккаунта."),
        password_hash: stringField("Хэш пароля."),
        role: stringField("Роль пользователя: клиент, специалист, администратор и т. п."),
        created_at: dateField("Дата создания аккаунта."),
        is_yandex_linked: boolField("Признак привязки Яндекс-аккаунта."),
        description: stringField("Описание пользователя."),
        experience: nullableIntField("Стаж специалиста в годах (целое число). Для клиента и администратора — null."),
        sessions: arrayField("Сессии пользователя. Внутренняя структура массива в модели не раскрыта."),
        collaboration_id: nullableObjectId("FK -> collaborations._id. Текущая или выбранная связь сотрудничества; допускается null.")
      }
    }
  },

  // Отзывы
  reviews: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "user_id", "text", "created_at", "status"],
      additionalProperties: false,
      properties: {
        _id: objectId("PK. Идентификатор отзыва."),
        user_id: objectId("FK -> users._id. Пользователь, оставивший отзыв."),
        text: stringField("Формулировка отзыва."),
        created_at: dateField("Дата добавления отзыва."),
        status: stringField("Статус отзыва.")
      }
    }
  },

  // Сотрудничество
  collaborations: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "specialist_id", "client_id", "started_at", "status"],
      additionalProperties: false,
      properties: {
        _id: objectId("PK. Идентификатор сотрудничества."),
        specialist_id: objectId("FK -> users._id. Специалист."),
        client_id: objectId("FK -> users._id. Клиент."),
        started_at: dateField("Дата начала сотрудничества."),
        status: stringField("Статус связи.")
      }
    }
  },

  // Графы эмоционального состояния
  emotional_state_graphs: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "user_id", "levels"],
      additionalProperties: false,
      properties: {
        _id: objectId("PK. Идентификатор графа эмоционального состояния."),
        user_id: objectId("FK -> users._id. Пользователь, которому принадлежит граф."),
        levels: arrayField("Уровни эмоционального состояния. Внутренняя структура массива в модели не раскрыта.")
      }
    }
  },

  // Рекомендации
  recommendations: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "_id",
        "parent_block_id",
        "section_title",
        "section_number",
        "recommendation_text",
        "author_id",
        "block_status",
        "sort_order"
      ],
      additionalProperties: false,
      properties: {
        _id: objectId("PK. Идентификатор блока рекомендации."),
        parent_block_id: nullableObjectId("FK -> recommendations._id. Родительский блок; допускается null."),
        section_title: nullableStringField("Название раздела; допускается null."),
        section_number: nullableStringField("Номер раздела; допускается null."),
        recommendation_text: nullableStringField("Формулировка рекомендации; допускается null."),
        author_id: objectId("FK -> users._id. Автор рекомендации."),
        block_status: stringField("Статус блока."),
        sort_order: intField("Порядковый номер блока.")
      }
    }
  },

  // Персональные рекомендации
  personal_recommendations: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "recommendation_id", "collaboration_id", "assigned_at", "status"],
      additionalProperties: false,
      properties: {
        _id: objectId("PK. Идентификатор персональной рекомендации."),
        recommendation_id: objectId("FK -> recommendations._id. Назначенная рекомендация."),
        collaboration_id: objectId("FK -> collaborations._id. Сотрудничество, в рамках которого дана рекомендация."),
        assigned_at: dateField("Дата назначения."),
        status: stringField("Статус рекомендации.")
      }
    }
  },

  // Тесты
  tests: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "_id",
        "title",
        "author_id",
        "question_count",
        "created_at",
        "description",
        "status",
        "result_logic",
        "questions",
        "passing_time"
      ],
      additionalProperties: false,
      properties: {
        _id: objectId("PK. Идентификатор теста."),
        title: stringField("Название теста."),
        author_id: objectId("FK -> users._id. Автор теста."),
        question_count: intField("Количество вопросов."),
        created_at: dateField("Дата создания теста."),
        description: stringField("Описание теста."),
        status: stringField("Статус теста."),
        result_logic: objectField("Логика результата. Внутренняя структура объекта в модели не раскрыта."),
        questions: arrayField("Вопросы теста. Внутренняя структура массива в модели не раскрыта."),
        passing_time: dateField("Время прохождения теста. В модели задан тип Date.")
      }
    }
  },

  // Результаты тестов
  test_results: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "test_id", "user_id", "verdict", "completed_at", "answers"],
      additionalProperties: false,
      properties: {
        _id: objectId("PK. Идентификатор результата теста."),
        test_id: objectId("FK -> tests._id. Пройденный тест."),
        user_id: objectId("FK -> users._id. Пользователь, прошедший тест."),
        verdict: objectField("Вердикт / рассчитанный результат. Внутренняя структура объекта в модели не раскрыта."),
        completed_at: dateField("Дата прохождения теста."),
        answers: arrayField("Ответы пользователя. Внутренняя структура массива в модели не раскрыта.")
      }
    }
  }
};

Object.entries(schemas).forEach(([collectionName, validator]) => {
  createOrUpdateCollection(collectionName, validator);
});

// Индексы. Они ускоряют переходы по связям из даталогической модели.
database.users.createIndex({ email: 1 }, { unique: true, name: "ux_users_email" });
database.users.createIndex({ role: 1, account_status: 1 }, { name: "ix_users_role_status" });
database.users.createIndex({ collaboration_id: 1 }, { name: "ix_users_collaboration_id" });

database.reviews.createIndex({ user_id: 1, created_at: -1 }, { name: "ix_reviews_user_created_at" });
database.reviews.createIndex({ status: 1, created_at: -1 }, { name: "ix_reviews_status_created_at" });

database.collaborations.createIndex({ specialist_id: 1, status: 1 }, { name: "ix_collaborations_specialist_status" });
database.collaborations.createIndex({ client_id: 1, status: 1 }, { name: "ix_collaborations_client_status" });
database.collaborations.createIndex({ specialist_id: 1, client_id: 1, started_at: -1 }, { name: "ix_collaborations_pair_started_at" });

database.emotional_state_graphs.createIndex({ user_id: 1 }, { unique: true, name: "ux_emotional_state_graphs_user_id" });

database.recommendations.createIndex({ author_id: 1, block_status: 1 }, { name: "ix_recommendations_author_status" });
database.recommendations.createIndex({ parent_block_id: 1, sort_order: 1 }, { name: "ix_recommendations_parent_sort_order" });
database.recommendations.createIndex(
  { section_title: "text", recommendation_text: "text" },
  { name: "tx_recommendations_section_text" }
);

database.personal_recommendations.createIndex({ collaboration_id: 1, assigned_at: -1 }, { name: "ix_personal_recommendations_collaboration_assigned_at" });
database.personal_recommendations.createIndex({ recommendation_id: 1 }, { name: "ix_personal_recommendations_recommendation_id" });
database.personal_recommendations.createIndex({ status: 1, assigned_at: -1 }, { name: "ix_personal_recommendations_status_assigned_at" });

database.tests.createIndex({ author_id: 1, created_at: -1 }, { name: "ix_tests_author_created_at" });
database.tests.createIndex({ status: 1, created_at: -1 }, { name: "ix_tests_status_created_at" });
database.tests.createIndex({ title: "text", description: "text" }, { name: "tx_tests_title_description" });

database.test_results.createIndex({ user_id: 1, completed_at: -1 }, { name: "ix_test_results_user_completed_at" });
database.test_results.createIndex({ test_id: 1, completed_at: -1 }, { name: "ix_test_results_test_completed_at" });
database.test_results.createIndex({ test_id: 1, user_id: 1, completed_at: -1 }, { name: "ix_test_results_test_user_completed_at" });

/* =====================================================================================
   ДАННЫЕ ПРИЛОЖЕНИЯ
   Ниже — реальные данные проекта (клиентские модели). Пароли в проекте хранятся в открытом
   виде (демо), здесь они заменены на placeholder хэша: реальный хэш должен формировать бэкенд.
   ===================================================================================== */

// ---- Шкалы ответов тестов (entities/test/model/testingData.js) ----
const BFI2_SCALE = [
  { value: 1, label: "Совершенно не согласен" },
  { value: 2, label: "Немного не согласен" },
  { value: 3, label: "Нейтрально; нет мнения" },
  { value: 4, label: "Немного согласен" },
  { value: 5, label: "Совершенно согласен" }
];

const BDS_SCALE = [
  { value: 1, label: "Совсем нет" },
  { value: 2, label: "Немного" },
  { value: 3, label: "Довольно сильно" },
  { value: 4, label: "Очень сильно" }
];

// ---- Вопросы BFI-2 (60) ----
const BFI2_QUESTIONS = [
  "Я общительный и открытый человек.",
  "Я сопереживающий и добросердечный человек.",
  "Я склонен быть неорганизованным.",
  "Я расслаблен и хорошо справляюсь со стрессом.",
  "Я мало интересуюсь искусством.",
  "Я напористый человек.",
  "Я отношусь к другим людям с уважением.",
  "Я предпочитаю отдыхать, а не работать.",
  "В случае неудачи я не теряю оптимизма.",
  "Я интеллектуал.",
  "Я часто чувствую себя уставшим.",
  "Я склонен искать ошибки в поступках других людей.",
  "Я заслуживаю доверия и постоянен.",
  "Я человек настроения, с эмоциональными «взлётами» и «падениями».",
  "Я изобретателен и нахожу нестандартные решения.",
  "Я склонен быть молчаливым.",
  "Я мало сочувствую другим людям.",
  "Я собранный и люблю во всём порядок.",
  "Я нервничаю по любому поводу.",
  "Я увлечён живописью, музыкой или литературой.",
  "Я доминирую и веду себя как лидер.",
  "Я бестактен в общении.",
  "Я с трудом приступаю к работе.",
  "Я гармоничен и доволен жизнью.",
  "Я избегаю интеллектуальных и философских разговоров.",
  "Я пассивный и вялый.",
  "В целом я доверяю другим людям.",
  "Я нарушаю обязательства.",
  "Я эмоционально стабилен.",
  "Я мыслю шаблонно и стереотипно.",
  "Порой я застенчив и погружён в себя.",
  "Я отзывчивый и бескорыстный человек.",
  "Я прилежный и аккуратный человек.",
  "Я часто волнуюсь и обо всём переживаю.",
  "Я ценю искусство и красоту.",
  "Я считаю, что мне трудно влиять на людей.",
  "Порой я бываю груб с окружающими.",
  "Я продуктивен и выполняю задуманное.",
  "Я часто грущу.",
  "Я сложный и глубоко мыслящий человек.",
  "Я полон энергии.",
  "Я подозрителен к намерениям других людей.",
  "Я надёжен, на меня всегда можно рассчитывать.",
  "Я держу эмоции под контролем.",
  "Я неизобретателен.",
  "Я разговорчивый человек.",
  "Я помогаю, только если мне это выгодно.",
  "Я оставляю за собой беспорядок и не люблю убираться.",
  "Я редко тревожусь или боюсь.",
  "Я считаю, что театр и поэзия — это скучно.",
  "Я предпочитаю, чтобы решения принимали другие.",
  "Я вежлив и учтив в общении с другими.",
  "Я настойчив и довожу дело до конца.",
  "Я склонен к печали и подавленности.",
  "Я мало интересуюсь абстрактными идеями.",
  "Я излучаю энтузиазм и заражаю им окружающих.",
  "Я склонен видеть в других людях только хорошее.",
  "Я часто веду себя безответственно.",
  "Я эмоциональный и неуравновешенный.",
  "Я генерирую новые идеи и мыслю оригинально."
];

// ---- Вопросы BDS (16) ----
const BDS_QUESTIONS = [
  "Мысли о бывшем партнере мешают мне заниматься обычными делами.",
  "Воспоминания о человеке вызывают сильные переживания.",
  "Мне трудно принять факт расставания.",
  "Меня тянет к местам или вещам, связанным с этим человеком.",
  "Я чувствую злость из-за расставания.",
  "Я испытываю выраженное напряжение из-за произошедшего.",
  "Иногда я ощущаю оцепенение или растерянность от случившегося.",
  "После расставания мне стало труднее доверять людям.",
  "Я чувствую дистанцию от людей, которые мне дороги.",
  "После расставания я ощущаю эмоциональную или телесную боль.",
  "Я стараюсь избегать напоминаний об этом человеке.",
  "Жизнь кажется пустой без этого человека.",
  "Я чувствую горечь из-за разрыва.",
  "Мне тяжело смотреть на людей, которые не переживали похожий разрыв.",
  "С момента расставания я часто чувствую одиночество.",
  "Когда я думаю об этом человеке, мне хочется плакать."
];

// ---- Логика подсчёта доменов BFI-2 (features/testing/model/testResults.js); R = обратный пункт ----
const BFI2_DOMAIN_KEYS = [
  { label: "Экстраверсия", items: ["1", "6", "11R", "16R", "21", "26R", "31R", "36R", "41", "46", "51R", "56"] },
  { label: "Доброжелательность", items: ["2", "7", "12R", "17R", "22R", "27", "32", "37R", "42R", "47R", "52", "57"] },
  { label: "Добросовестность", items: ["3R", "8R", "13", "18", "23R", "28R", "33", "38", "43", "48R", "53", "58R"] },
  { label: "Негативная эмоциональность", items: ["4R", "9R", "14", "19", "24R", "29R", "34", "39", "44R", "49R", "54", "59"] },
  { label: "Открытость опыту", items: ["5R", "10", "15", "20", "25R", "30R", "35", "40", "45R", "50R", "55R", "60"] }
];

// ---- База рекомендаций (entities/recommendation/model/recommendationBase.js) ----
const RECOMMENDATION_TREE = [
  {
    title: "Острый период после расставания",
    description: "Упражнения на первые дни и недели, когда много тревоги, импульса написать и телесного напряжения.",
    blocks: [
      { title: "Серфинг импульса написать", content: "Поставьте таймер на 10 минут. Назовите импульс: «Сейчас есть желание написать». Оцените силу от 0 до 10, отметьте, где она ощущается в теле, и наблюдайте, как волна меняется, не действуя сразу. После таймера снова оцените силу импульса и выберите действие без контакта: душ, прогулка, звонок другу или запись в дневник." },
      { title: "Контракт на 24 часа без контакта", content: "Запишите короткий договор: «В ближайшие 24 часа я не пишу и не звоню первым/первой. Если мне захочется, я сохраняю текст в заметках и возвращаюсь к нему завтра». Добавьте 2 поддерживающих действия на это время: прогулка, еда, сон, разговор с безопасным человеком." },
      { title: "Заземление 5-4-3-2-1", content: "Назовите 5 предметов, которые видите, 4 звука, 3 телесных ощущения, 2 запаха и 1 вкус. Затем сделайте три длинных выдоха. Задача упражнения не убрать боль полностью, а вернуть внимание в настоящий момент." }
    ],
    children: [
      {
        title: "Телесная регуляция",
        description: "Практики, которые помогают снизить физиологическое возбуждение и напряжение.",
        blocks: [
          { title: "Дыхание с удлиненным выдохом", content: "Вдохните через нос на 3 счета и выдохните на 6 счетов. Повторите 8 циклов. Если появляется головокружение, вернитесь к обычному дыханию. В конце отметьте одно телесное ощущение, которое стало чуть мягче." },
          { title: "Напряжение и отпускание", content: "По очереди напрягайте на 5 секунд и расслабляйте стопы, бедра, живот, плечи, кисти и лицо. После каждой группы мышц делайте один медленный выдох. Это помогает телу отличить реальную опасность от эмоциональной активации." }
        ],
        children: [
          {
            title: "Сон в период переживаний",
            description: "Практики для вечера, когда мысли возвращаются к отношениям и мешают уснуть.",
            blocks: [
              { title: "Окно для переживаний", content: "За 2-3 часа до сна выделите 15 минут и выпишите все мысли о расставании. Рядом с каждой мыслью отметьте: «могу сделать сейчас», «сделаю завтра», «не контролирую». После окна закройте заметку и возвращайтесь к ней только на следующий день." },
              { title: "Сканирование тела перед сном", content: "Лягте удобно и последовательно отмечайте ощущения в стопах, голенях, бедрах, животе, плечах, шее и лице. Не оценивайте ощущения и не пытайтесь расслабиться идеально. Просто называйте: тепло, тяжесть, покалывание, пустота, напряжение." }
            ],
            children: []
          }
        ]
      }
    ]
  },
  {
    title: "Проживание утраты отношений",
    description: "Упражнения для признания боли, работы с незавершенными словами и постепенного возвращения опоры.",
    blocks: [
      { title: "Письмо, которое не нужно отправлять", content: "Напишите письмо бывшему партнеру без задачи отправить его. Используйте три части: «Я злюсь/мне больно из-за...», «Мне важно признать...», «Я выбираю позаботиться о себе так...». После письма сделайте паузу и уберите текст в отдельную папку минимум на сутки." },
      { title: "Две правды одновременно", content: "Запишите две колонки: «Что в этих отношениях было ценным» и «Что причиняло боль или не подходило». Найдите по 5 пунктов в каждой колонке. Завершите фразой: «Я могу скучать по хорошему и одновременно признавать причины завершения»." },
      { title: "Контейнер для воспоминаний", content: "Выберите коробку или папку для фото, подарков и переписок. Не уничтожайте вещи в остром состоянии. Сложите их в одно место и назначьте дату пересмотра через 2-4 недели. Так память остается признанной, но не атакует вас весь день." }
    ],
    children: [
      {
        title: "Работа с мыслями и самокритикой",
        description: "Техники для навязчивых мыслей, чувства вины и внутреннего обвинения.",
        blocks: [
          { title: "Маркировка мыслей", content: "Когда появляется мысль «Я больше никого не встречу» или «Это только моя вина», добавьте перед ней фразу: «У меня появилась мысль, что...». Повторите 3 раза и отметьте, стала ли мысль чуть менее абсолютной." },
          { title: "Круг ответственности", content: "Нарисуйте круг и распределите доли влияния: ваши действия, действия партнера, несовпадение потребностей, обстоятельства, усталость, коммуникация, внешние факторы. Задача — увидеть сложность ситуации, а не найти виноватого." },
          { title: "Фраза заботливого друга", content: "Представьте, что близкий друг переживает такое же расставание и говорит о себе жесткими словами. Запишите 3 фразы поддержки, которые вы сказали бы ему. Затем прочитайте их от первого лица: «Мне сейчас больно, и я могу быть к себе мягче»." }
        ],
        children: []
      }
    ]
  },
  {
    title: "Возвращение к жизни и новым опорам",
    description: "Практические шаги для восстановления режима, социальных связей и личной идентичности вне отношений.",
    blocks: [
      { title: "План трех малых действий", content: "На завтра выберите три действия до 15 минут: одно для тела, одно для быта, одно для контакта с миром. Например: душ, убрать стол, выйти за кофе. Важно не настроение после, а сам факт возвращения движения." },
      { title: "Карта поддержки", content: "Разделите лист на 4 сектора: «выслушать», «погулять», «помочь с бытом», «профессиональная помощь». Впишите людей или сервисы в каждый сектор и подготовьте одну короткую просьбу: «Можешь 20 минут просто послушать меня сегодня?»" },
      { title: "Перезапуск ценностей", content: "Выберите 5 ценностей, которые важны вне отношений: здоровье, учеба, творчество, дружба, развитие, честность, свобода. Для каждой напишите одно действие на неделю. Не нужно чувствовать вдохновение — достаточно маленького шага." }
    ],
    children: [
      {
        title: "Цифровые границы",
        description: "Настройки и ритуалы, которые уменьшают болезненные триггеры в телефоне и соцсетях.",
        blocks: [
          { title: "Пауза в просмотре соцсетей", content: "На 7 дней скройте обновления бывшего партнера и общие триггерные аккаунты. Это не наказание и не слабость, а временная защита нервной системы. В конце недели решите, продлить ли паузу." },
          { title: "План на случай триггера", content: "Запишите план из трех шагов: 1) назвать триггер, 2) сделать телесное действие на 60 секунд, 3) написать одну фразу поддержки. Например: «Это фото активировало боль, но я сейчас в безопасности»." }
        ],
        children: []
      }
    ]
  }
];

// ---- Каталог специалистов (entities/specialist/model/specialists.js).
// Для примера берём 9 специалистов; десятым специалистом выступает уже заведённая Марина Игоревна
// (учётка specialist@lumen.local), поэтому всего специалистов в базе — 10. ----
const SPECIALIST_CATALOG = [
  { name: "Алексей Павлович Орлов", focus: "Тревога и саморегуляция", format: "Онлайн и очно", experience: "11 лет", rating: "4.8", description: "Я помогаю справляться с тревожными мыслями, телесным напряжением и страхом неопределенности после разрыва." },
  { name: "Елена Викторовна Морозова", focus: "Самооценка и личные границы", format: "Онлайн", experience: "7 лет", rating: "4.7", description: "Я помогаю вернуть устойчивую самооценку, выстроить личные границы и мягко выйти из самообвинения." },
  { name: "Дмитрий Андреевич Волков", focus: "Эмоциональное выгорание", format: "Онлайн", experience: "10 лет", rating: "4.9", description: "Я помогаю распознавать признаки эмоционального истощения и возвращать силы через понятные ежедневные шаги." },
  { name: "Ольга Сергеевна Лебедева", focus: "Созависимость и отношения", format: "Онлайн и очно", experience: "9 лет", rating: "4.8", description: "Я помогаю разбираться с созависимыми сценариями, страхом одиночества и трудностью отпускать отношения." },
  { name: "Павел Николаевич Кузнецов", focus: "Панические состояния", format: "Онлайн", experience: "12 лет", rating: "4.9", description: "Я помогаю проживать панические реакции, стабилизировать дыхание и снижать избегание триггеров." },
  { name: "Анна Романовна Белова", focus: "Адаптация после разрыва", format: "Онлайн", experience: "6 лет", rating: "4.6", description: "Я помогаю адаптироваться после разрыва, выстраивать новый ритм дня и поддерживать себя без давления." },
  { name: "Илья Максимович Федоров", focus: "Навязчивые мысли", format: "Онлайн", experience: "8 лет", rating: "4.7", description: "Я помогаю работать с навязчивыми мыслями, руминациями и постоянным желанием пересматривать прошлое." },
  { name: "Наталья Олеговна Егорова", focus: "Чувство одиночества", format: "Онлайн и очно", experience: "13 лет", rating: "5.0", description: "Я помогаю выдерживать одиночество, возвращать контакт с собой и находить безопасные формы поддержки." },
  { name: "Сергей Валерьевич Никитин", focus: "Конфликты в паре", format: "Онлайн", experience: "15 лет", rating: "4.8", description: "Я помогаю анализировать конфликты, завершать незакрытые диалоги и восстанавливать спокойную коммуникацию." }
];

// Однотипные учётные данные для специалистов из каталога (по требованию — в открытом виде).
const CATALOG_SPECIALIST_PASSWORD = "specialist123";

// ---- Граф эмоционального состояния (entities/emotion/model/emotionGraph.js) ----
const EMOTION_GRAPH_COLUMNS = [
  { label: "20.09.2025", supportNeedLevel: 3, secondarySupportNeedLevel: 2, score: 56, secondaryScore: 44, truth: 0.52 },
  { label: "23.09.2025", supportNeedLevel: 2, secondarySupportNeedLevel: 3, score: 62, secondaryScore: 38, truth: 0.59 },
  { label: "26.09.2025", supportNeedLevel: 1, secondarySupportNeedLevel: 2, score: 71, secondaryScore: 29, truth: 0.67 },
  { label: "29.09.2025", supportNeedLevel: 2, secondarySupportNeedLevel: 1, score: 64, secondaryScore: 36, truth: 0.61 },
  { label: "02.10.2025", supportNeedLevel: 2, secondarySupportNeedLevel: 3, score: 60, secondaryScore: 40, truth: 0.57 }
];

// Пароли по требованию хранятся в открытом виде (в проде в этом поле должен быть bcrypt-хэш).
const DEMO_PASSWORD = "lumen123";

function ddmmyyyyToDate(value) {
  const [day, month, year] = value.split(".").map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day, 9, 0, 0));
}

function buildPresetAnswers(count, pattern) {
  // Тот же детерминированный паттерн ответов демо-аккаунта, что и в клиенте (userStatus.js).
  const answers = [];
  for (let index = 0; index < count; index += 1) {
    answers.push({ question_number: NumberInt(index + 1), value: NumberInt(pattern[index % pattern.length]) });
  }
  return answers;
}

function buildQuestions(questionTexts, scale) {
  return questionTexts.map((text, index) => ({
    order: NumberInt(index + 1),
    text,
    type: "scale",
    scale
  }));
}

function seedApplicationData() {
  // Идемпотентность: очищаем целевые коллекции, чтобы повторный запуск не плодил дубли.
  Object.keys(schemas).forEach((collectionName) => database.getCollection(collectionName).deleteMany({}));

  const now = new Date();
  const testsCreatedAt = new Date("2025-09-01T00:00:00Z");

  // -------------------- Пользователи (реальные учётные записи приложения) --------------------
  // role: client | specialist | admin (как в приложении).
  // account_status: active | blocked | deleted (существует / заблокирована / удалена).
  const adminId = new ObjectId();
  const specialistId = new ObjectId();    // Марина Игоревна (specialist@lumen.local)
  const clientDmitryId = new ObjectId();  // Голубев Дмитрий Викторович (completed@demo.local)
  const clientTestId = new ObjectId();    // Тестовый пользователь (test@lumen.local)
  const clientYandexId = new ObjectId();  // Яндекс Пользователь
  const clientBlockedId = new ObjectId(); // Заблокированный демо-клиент (demo@blocked.local)

  const coreUsers = [
    {
      _id: clientTestId,
      first_name: "Тестовый",
      last_name: "",
      patronymic: "Демо",
      email: "test@lumen.local",
      account_status: "active",
      password_hash: DEMO_PASSWORD,
      role: "client",
      created_at: now,
      is_yandex_linked: false,
      description: "Демонстрационный клиентский аккаунт приложения.",
      experience: null,
      sessions: [],
      collaboration_id: null
    },
    {
      _id: clientDmitryId,
      first_name: "Дмитрий",
      last_name: "Голубев",
      patronymic: "Викторович",
      email: "completed@demo.local",
      account_status: "active",
      password_hash: DEMO_PASSWORD,
      role: "client",
      created_at: now,
      is_yandex_linked: false,
      description: "Клиент с пройденными тестами BFI-2 и BDS.",
      experience: null,
      sessions: [],
      collaboration_id: null // проставим после создания сотрудничества
    },
    {
      _id: specialistId,
      first_name: "Марина",
      last_name: "",
      patronymic: "Игоревна",
      email: "specialist@lumen.local",
      account_status: "active",
      password_hash: DEMO_PASSWORD,
      role: "specialist",
      created_at: now,
      is_yandex_linked: false,
      description: "Специалист по теме горевания и эмоциональной саморегуляции.",
      experience: NumberInt(8),
      sessions: [],
      collaboration_id: null
    },
    {
      _id: adminId,
      first_name: "Администратор",
      last_name: "",
      patronymic: "Системы",
      email: "admin@lumen.local",
      account_status: "active",
      password_hash: DEMO_PASSWORD,
      role: "admin",
      created_at: now,
      is_yandex_linked: false,
      description: "Системный администратор приложения.",
      experience: null,
      sessions: [],
      collaboration_id: null
    },
    {
      _id: clientYandexId,
      first_name: "Яндекс",
      last_name: "",
      patronymic: "Пользователь",
      email: "yandex.user@yandex.local",
      account_status: "active",
      password_hash: "", // вход через Яндекс, пароль не задаётся
      role: "client",
      created_at: now,
      is_yandex_linked: true,
      description: "Аккаунт, привязанный через Яндекс.",
      experience: null,
      sessions: [],
      collaboration_id: null
    },
    {
      _id: clientBlockedId,
      first_name: "Демо",
      last_name: "",
      patronymic: "Заблокированный",
      email: "demo@blocked.local",
      account_status: "blocked", // пример заблокированной учётной записи (adminAccounts)
      password_hash: DEMO_PASSWORD,
      role: "client",
      created_at: now,
      is_yandex_linked: false,
      description: "Заблокированный демонстрационный клиент.",
      experience: null,
      sessions: [],
      collaboration_id: null
    }
  ];

  // Каталог специалистов как учётные записи. Имена/фокус/опыт/рейтинг — реальные данные приложения;
  // e-mail и пароль в приложении для каталога отсутствуют, поэтому заданы однотипно (тестовые данные).
  const catalogUsers = SPECIALIST_CATALOG.map((specialist, index) => {
    const [firstName, patronymic, ...lastNameParts] = specialist.name.split(" ");

    return {
      _id: new ObjectId(),
      first_name: firstName,
      last_name: lastNameParts.join(" "),
      patronymic: patronymic || "",
      email: `specialist${index + 1}@lumen.local`,
      account_status: "active",
      password_hash: CATALOG_SPECIALIST_PASSWORD,
      role: "specialist",
      created_at: now,
      is_yandex_linked: false,
      description: `${specialist.description} Фокус: ${specialist.focus}. Формат: ${specialist.format}. Рейтинг: ${specialist.rating}.`,
      experience: NumberInt(parseInt(specialist.experience, 10)),
      sessions: [],
      collaboration_id: null
    };
  });

  database.users.insertMany([...coreUsers, ...catalogUsers]);

  // -------------------- Сотрудничество (специалист Марина <-> клиент Дмитрий) --------------------
  const collaborationId = new ObjectId();
  database.collaborations.insertOne({
    _id: collaborationId,
    specialist_id: specialistId,
    client_id: clientDmitryId,
    started_at: new Date("2026-05-18T10:00:00Z"),
    status: "active"
  });
  database.users.updateOne({ _id: clientDmitryId }, { $set: { collaboration_id: collaborationId } });

  // -------------------- Граф эмоционального состояния клиента Дмитрия --------------------
  database.emotional_state_graphs.insertOne({
    _id: new ObjectId(),
    user_id: clientDmitryId,
    levels: EMOTION_GRAPH_COLUMNS.map((column) => ({
      measured_at: ddmmyyyyToDate(column.label),
      label: column.label,
      score: NumberInt(column.score),
      secondary_score: NumberInt(column.secondaryScore),
      support_need_level: NumberInt(column.supportNeedLevel),
      secondary_support_need_level: NumberInt(column.secondarySupportNeedLevel),
      truth: column.truth
    }))
  });

  // -------------------- Тесты (BFI-2, BDS) --------------------
  const bfiTestId = new ObjectId();
  const bdsTestId = new ObjectId();

  database.tests.insertMany([
    {
      _id: bfiTestId,
      title: "Big Five Inventory-2 (BFI-2)",
      author_id: adminId,
      question_count: NumberInt(BFI2_QUESTIONS.length),
      created_at: testsCreatedAt,
      description: "Опросник самооценки по модели Большой пятерки: экстраверсия, доброжелательность, добросовестность, негативная эмоциональность и открытость опыту.",
      status: "active",
      result_logic: {
        method: "average",
        item_prefix: "Я - человек, который...",
        scale: BFI2_SCALE,
        levels: [
          { max_average: 2.3, verdict: "Низкая средняя выраженность признаков" },
          { max_average: 3.6, verdict: "Сбалансированный профиль ответов" },
          { max_average: 5, verdict: "Высокая средняя выраженность признаков" }
        ],
        domains: BFI2_DOMAIN_KEYS,
        source: "Русская форма BFI-2 (Colby Personality Lab), пункты © 2015 Oliver P. John, Christopher J. Soto."
      },
      questions: buildQuestions(BFI2_QUESTIONS, BFI2_SCALE),
      passing_time: new Date("1970-01-01T00:06:00Z")
    },
    {
      _id: bdsTestId,
      title: "Breakup Distress Scale (BDS)",
      author_id: adminId,
      question_count: NumberInt(BDS_QUESTIONS.length),
      created_at: testsCreatedAt,
      description: "Шкала помогает бережно оценить выраженность переживаний после расставания: навязчивые мысли, одиночество, злость, боль, избегание напоминаний и трудность принятия.",
      status: "active",
      result_logic: {
        method: "sum",
        scale: BDS_SCALE,
        max_answer_value: NumberInt(4),
        levels: [
          { max_average: 1.75, verdict: "Низкая выраженность дистресса" },
          { max_average: 2.5, verdict: "Умеренная выраженность дистресса" },
          { max_average: 3.25, verdict: "Высокая выраженность дистресса" },
          { max_average: 4, verdict: "Очень высокая выраженность дистресса" }
        ],
        source: "Русскоязычная адаптация формулировок по описанию шкалы Field et al."
      },
      questions: buildQuestions(BDS_QUESTIONS, BDS_SCALE),
      passing_time: new Date("1970-01-01T00:04:00Z")
    }
  ]);

  // -------------------- Результаты тестов клиента Дмитрия (entities/user/model/userStatus.js) --------------------
  database.test_results.insertMany([
    {
      _id: new ObjectId(),
      test_id: bfiTestId,
      user_id: clientDmitryId,
      verdict: {
        score: 3.6,
        score_label: "3.6 из 5",
        level: "Сбалансированный профиль ответов",
        summary: "Профиль показывает выраженную способность к саморегуляции и восстановлению опоры.",
        domains: [
          { label: "Экстраверсия", score: 3.8 },
          { label: "Доброжелательность", score: 4.2 },
          { label: "Добросовестность", score: 3.5 },
          { label: "Негативная эмоциональность", score: 2.4 },
          { label: "Открытость опыту", score: 4.0 }
        ]
      },
      completed_at: new Date("2026-05-20T10:00:00Z"),
      answers: buildPresetAnswers(BFI2_QUESTIONS.length, [4, 3, 2, 4, 5, 3, 4, 2, 4, 3])
    },
    {
      _id: new ObjectId(),
      test_id: bdsTestId,
      user_id: clientDmitryId,
      verdict: {
        score: 1.9,
        score_label: "30 из 64",
        level: "Умеренная выраженность дистресса",
        summary: "Состояние остается чувствительным, но уже достаточно стабилизированным для мягких практик восстановления."
      },
      completed_at: new Date("2026-05-21T10:00:00Z"),
      answers: buildPresetAnswers(BDS_QUESTIONS.length, [2, 1, 2, 3, 2, 1, 2, 2])
    }
  ]);

  // -------------------- База рекомендаций (плоское дерево разделов и блоков) --------------------
  const recommendationDocuments = [];
  const leafRecommendationIds = [];

  function walkRecommendationTree(nodes, parentId, prefix) {
    nodes.forEach((node, nodeIndex) => {
      const sectionNumber = prefix ? `${prefix}.${nodeIndex + 1}` : String(nodeIndex + 1);
      const sectionId = new ObjectId();

      // Раздел: section_title + section_number, recommendation_text = null.
      recommendationDocuments.push({
        _id: sectionId,
        parent_block_id: parentId,
        section_title: node.title,
        section_number: sectionNumber,
        recommendation_text: null,
        author_id: specialistId,
        block_status: "active",
        sort_order: NumberInt(nodeIndex + 1)
      });

      // Рекомендации раздела (листья): recommendation_text заполнен, section_* = null.
      (node.blocks || []).forEach((block, blockIndex) => {
        const blockId = new ObjectId();
        recommendationDocuments.push({
          _id: blockId,
          parent_block_id: sectionId,
          section_title: null,
          section_number: null,
          recommendation_text: `${block.title}. ${block.content}`,
          author_id: specialistId,
          block_status: "active",
          sort_order: NumberInt(blockIndex + 1)
        });
        leafRecommendationIds.push(blockId);
      });

      walkRecommendationTree(node.children || [], sectionId, sectionNumber);
    });
  }

  walkRecommendationTree(RECOMMENDATION_TREE, null, "");
  database.recommendations.insertMany(recommendationDocuments);

  // -------------------- Персональные рекомендации (назначены клиенту Дмитрию) --------------------
  const personalRecommendations = leafRecommendationIds.slice(0, 3).map((recommendationId, index) => ({
    _id: new ObjectId(),
    recommendation_id: recommendationId,
    collaboration_id: collaborationId,
    assigned_at: new Date(`2026-05-2${2 + index}T12:00:00Z`),
    status: "active"
  }));
  database.personal_recommendations.insertMany(personalRecommendations);

  // -------------------- Отзывы (в приложении данных нет — тестовые записи) --------------------
  database.reviews.insertMany([
    {
      _id: new ObjectId(),
      user_id: clientDmitryId,
      text: "Тестовый отзыв: граф эмоционального состояния помогает отслеживать динамику между тестами.",
      created_at: new Date("2026-05-23T08:30:00Z"),
      status: "active"
    },
    {
      _id: new ObjectId(),
      user_id: clientTestId,
      text: "Тестовый отзыв: удобно, что рекомендации собраны по разделам и их можно проходить постепенно.",
      created_at: new Date("2026-05-24T19:10:00Z"),
      status: "active"
    }
  ]);

  print("Данные приложения загружены.");
}

function printDeploymentSummary() {
  print("\nГотово. Структура БД развёрнута.");
  print(`База данных: ${DB_NAME}`);
  print("Коллекции и количество документов:");
  Object.keys(schemas).sort().forEach((collectionName) => {
    print(`  ${collectionName}: ${database.getCollection(collectionName).countDocuments()}`);
  });
}

if (SEED_DEMO_DATA) {
  seedApplicationData();
}

printDeploymentSummary();
