const RECOMMENDATION_STORAGE_KEY = 'psychology_recommendation_base_v2';
export const RECOMMENDATION_BLOCKS_PER_PAGE = 10;

export const defaultRecommendationBase = [
    {
        id: 'section-acute-support',
        title: 'Острый период после расставания',
        description: 'Упражнения на первые дни и недели, когда много тревоги, импульса написать и телесного напряжения.',
        blocks: [
            {
                id: 'block-urge-surfing',
                title: 'Серфинг импульса написать',
                summary: 'Техника на 10 минут, чтобы пережить волну желания написать бывшему партнеру.',
                content: 'Поставьте таймер на 10 минут. Назовите импульс: «Сейчас есть желание написать». Оцените силу от 0 до 10, отметьте, где она ощущается в теле, и наблюдайте, как волна меняется, не действуя сразу. После таймера снова оцените силу импульса и выберите действие без контакта: душ, прогулка, звонок другу или запись в дневник.',
                tags: ['импульс', 'контакт', 'саморегуляция'],
            },
            {
                id: 'block-24-hour-no-contact',
                title: 'Контракт на 24 часа без контакта',
                summary: 'Мягкая граница, которая снижает риск импульсивных сообщений и звонков.',
                content: 'Запишите короткий договор: «В ближайшие 24 часа я не пишу и не звоню первым/первой. Если мне захочется, я сохраняю текст в заметках и возвращаюсь к нему завтра». Добавьте 2 поддерживающих действия на это время: прогулка, еда, сон, разговор с безопасным человеком.',
                tags: ['границы', 'расставание', 'контакт'],
            },
            {
                id: 'block-grounding-5-4-3-2-1',
                title: 'Заземление 5-4-3-2-1',
                summary: 'Быстрая техника при панике, сильной тоске или навязчивых мыслях.',
                content: 'Назовите 5 предметов, которые видите, 4 звука, 3 телесных ощущения, 2 запаха и 1 вкус. Затем сделайте три длинных выдоха. Задача упражнения не убрать боль полностью, а вернуть внимание в настоящий момент.',
                tags: ['тревога', 'заземление', 'тело'],
            },
        ],
        children: [
            {
                id: 'section-body-regulation',
                title: 'Телесная регуляция',
                description: 'Практики, которые помогают снизить физиологическое возбуждение и напряжение.',
                blocks: [
                    {
                        id: 'block-extended-exhale',
                        title: 'Дыхание с удлиненным выдохом',
                        summary: 'Простая дыхательная техника, когда тело находится в режиме тревоги.',
                        content: 'Вдохните через нос на 3 счета и выдохните на 6 счетов. Повторите 8 циклов. Если появляется головокружение, вернитесь к обычному дыханию. В конце отметьте одно телесное ощущение, которое стало чуть мягче.',
                        tags: ['дыхание', 'тревога', 'тело'],
                    },
                    {
                        id: 'block-progressive-release',
                        title: 'Напряжение и отпускание',
                        summary: 'Короткая версия прогрессивной мышечной релаксации.',
                        content: 'По очереди напрягайте на 5 секунд и расслабляйте стопы, бедра, живот, плечи, кисти и лицо. После каждой группы мышц делайте один медленный выдох. Это помогает телу отличить реальную опасность от эмоциональной активации.',
                        tags: ['релаксация', 'тело', 'напряжение'],
                    },
                ],
                children: [
                    {
                        id: 'section-sleep-after-breakup',
                        title: 'Сон в период переживаний',
                        description: 'Практики для вечера, когда мысли возвращаются к отношениям и мешают уснуть.',
                        blocks: [
                            {
                                id: 'block-worry-window',
                                title: 'Окно для переживаний',
                                summary: 'Способ не переносить весь поток мыслей в кровать.',
                                content: 'За 2-3 часа до сна выделите 15 минут и выпишите все мысли о расставании. Рядом с каждой мыслью отметьте: «могу сделать сейчас», «сделаю завтра», «не контролирую». После окна закройте заметку и возвращайтесь к ней только на следующий день.',
                                tags: ['сон', 'руминации', 'дневник'],
                            },
                            {
                                id: 'block-evening-body-scan',
                                title: 'Сканирование тела перед сном',
                                summary: 'Пяти-семиминутная практика для переключения внимания с мыслей на ощущения.',
                                content: 'Лягте удобно и последовательно отмечайте ощущения в стопах, голенях, бедрах, животе, плечах, шее и лице. Не оценивайте ощущения и не пытайтесь расслабиться идеально. Просто называйте: тепло, тяжесть, покалывание, пустота, напряжение.',
                                tags: ['сон', 'тело', 'внимание'],
                            },
                        ],
                        children: [],
                    },
                ],
            },
        ],
    },
    {
        id: 'section-grief-and-meaning',
        title: 'Проживание утраты отношений',
        description: 'Упражнения для признания боли, работы с незавершенными словами и постепенного возвращения опоры.',
        blocks: [
            {
                id: 'block-unsent-letter',
                title: 'Письмо, которое не нужно отправлять',
                summary: 'Безопасный способ выразить злость, тоску, благодарность или обиду.',
                content: 'Напишите письмо бывшему партнеру без задачи отправить его. Используйте три части: «Я злюсь/мне больно из-за...», «Мне важно признать...», «Я выбираю позаботиться о себе так...». После письма сделайте паузу и уберите текст в отдельную папку минимум на сутки.',
                tags: ['письмо', 'горевание', 'злость'],
            },
            {
                id: 'block-dual-awareness',
                title: 'Две правды одновременно',
                summary: 'Упражнение против черно-белого восприятия отношений.',
                content: 'Запишите две колонки: «Что в этих отношениях было ценным» и «Что причиняло боль или не подходило». Найдите по 5 пунктов в каждой колонке. Завершите фразой: «Я могу скучать по хорошему и одновременно признавать причины завершения».',
                tags: ['амбивалентность', 'принятие', 'дневник'],
            },
            {
                id: 'block-memory-container',
                title: 'Контейнер для воспоминаний',
                summary: 'Ритуал, который помогает снизить постоянное столкновение с напоминаниями.',
                content: 'Выберите коробку или папку для фото, подарков и переписок. Не уничтожайте вещи в остром состоянии. Сложите их в одно место и назначьте дату пересмотра через 2-4 недели. Так память остается признанной, но не атакует вас весь день.',
                tags: ['воспоминания', 'ритуал', 'границы'],
            },
        ],
        children: [
            {
                id: 'section-thoughts',
                title: 'Работа с мыслями и самокритикой',
                description: 'Техники для навязчивых мыслей, чувства вины и внутреннего обвинения.',
                blocks: [
                    {
                        id: 'block-thought-labeling',
                        title: 'Маркировка мыслей',
                        summary: 'Техника ACT, которая помогает отделить факт от болезненной интерпретации.',
                        content: 'Когда появляется мысль «Я больше никого не встречу» или «Это только моя вина», добавьте перед ней фразу: «У меня появилась мысль, что...». Повторите 3 раза и отметьте, стала ли мысль чуть менее абсолютной.',
                        tags: ['ACT', 'мысли', 'самокритика'],
                    },
                    {
                        id: 'block-guilt-pie',
                        title: 'Круг ответственности',
                        summary: 'Упражнение, чтобы не брать на себя 100% ответственности за разрыв.',
                        content: 'Нарисуйте круг и распределите доли влияния: ваши действия, действия партнера, несовпадение потребностей, обстоятельства, усталость, коммуникация, внешние факторы. Задача — увидеть сложность ситуации, а не найти виноватого.',
                        tags: ['вина', 'ответственность', 'КПТ'],
                    },
                    {
                        id: 'block-compassionate-friend',
                        title: 'Фраза заботливого друга',
                        summary: 'Практика самосострадания в момент стыда или самообвинения.',
                        content: 'Представьте, что близкий друг переживает такое же расставание и говорит о себе жесткими словами. Запишите 3 фразы поддержки, которые вы сказали бы ему. Затем прочитайте их от первого лица: «Мне сейчас больно, и я могу быть к себе мягче».',
                        tags: ['самосострадание', 'стыд', 'поддержка'],
                    },
                ],
                children: [],
            },
        ],
    },
    {
        id: 'section-rebuilding-life',
        title: 'Возвращение к жизни и новым опорам',
        description: 'Практические шаги для восстановления режима, социальных связей и личной идентичности вне отношений.',
        blocks: [
            {
                id: 'block-behavioral-activation',
                title: 'План трех малых действий',
                summary: 'Поведенческая активация, когда нет сил и хочется только лежать.',
                content: 'На завтра выберите три действия до 15 минут: одно для тела, одно для быта, одно для контакта с миром. Например: душ, убрать стол, выйти за кофе. Важно не настроение после, а сам факт возвращения движения.',
                tags: ['поведенческая активация', 'апатия', 'режим'],
            },
            {
                id: 'block-support-map',
                title: 'Карта поддержки',
                summary: 'Помогает не оставаться одному с переживаниями и просить конкретную помощь.',
                content: 'Разделите лист на 4 сектора: «выслушать», «погулять», «помочь с бытом», «профессиональная помощь». Впишите людей или сервисы в каждый сектор и подготовьте одну короткую просьбу: «Можешь 20 минут просто послушать меня сегодня?»',
                tags: ['поддержка', 'социальные связи', 'кризис'],
            },
            {
                id: 'block-values-restart',
                title: 'Перезапуск ценностей',
                summary: 'Упражнение для возвращения личного направления после завершения отношений.',
                content: 'Выберите 5 ценностей, которые важны вне отношений: здоровье, учеба, творчество, дружба, развитие, честность, свобода. Для каждой напишите одно действие на неделю. Не нужно чувствовать вдохновение — достаточно маленького шага.',
                tags: ['ценности', 'идентичность', 'план'],
            },
        ],
        children: [
            {
                id: 'section-digital-boundaries',
                title: 'Цифровые границы',
                description: 'Настройки и ритуалы, которые уменьшают болезненные триггеры в телефоне и соцсетях.',
                blocks: [
                    {
                        id: 'block-social-media-pause',
                        title: 'Пауза в просмотре соцсетей',
                        summary: 'Снижает повторное эмоциональное травмирование через сторис, фото и статусы.',
                        content: 'На 7 дней скройте обновления бывшего партнера и общие триггерные аккаунты. Это не наказание и не слабость, а временная защита нервной системы. В конце недели решите, продлить ли паузу.',
                        tags: ['соцсети', 'триггеры', 'границы'],
                    },
                    {
                        id: 'block-trigger-plan',
                        title: 'План на случай триггера',
                        summary: 'Заранее подготовленная последовательность действий после внезапного напоминания.',
                        content: 'Запишите план из трех шагов: 1) назвать триггер, 2) сделать телесное действие на 60 секунд, 3) написать одну фразу поддержки. Например: «Это фото активировало боль, но я сейчас в безопасности».',
                        tags: ['триггеры', 'план', 'безопасность'],
                    },
                ],
                children: [],
            },
        ],
    },
];

function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeTags(tags) {
    if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean);
    return String(tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function createSection(draft) {
    return {
        id: createId('section'),
        title: String(draft.title || '').trim(),
        description: String(draft.description || '').trim(),
        blocks: [],
        children: [],
    };
}

function createBlock(draft) {
    return {
        id: createId('block'),
        title: String(draft.title || '').trim(),
        summary: String(draft.summary || '').trim(),
        content: String(draft.content || '').trim(),
        tags: normalizeTags(draft.tags),
    };
}

function mapSections(sections, sectionId, mapper) {
    return sections.map((section) => {
        if (section.id === sectionId) return mapper(section);

        return {
            ...section,
            children: mapSections(section.children || [], sectionId, mapper),
        };
    });
}

export function readRecommendationBase() {
    if (typeof window === 'undefined') return defaultRecommendationBase;

    try {
        const storedBase = window.localStorage.getItem(RECOMMENDATION_STORAGE_KEY);
        const parsedBase = storedBase ? JSON.parse(storedBase) : null;
        return Array.isArray(parsedBase) ? parsedBase : defaultRecommendationBase;
    } catch {
        return defaultRecommendationBase;
    }
}

export function saveRecommendationBase(sections) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(RECOMMENDATION_STORAGE_KEY, JSON.stringify(sections));
}

export function addRecommendationSection(sections, parentId, draft) {
    const nextSection = createSection(draft);
    if (!parentId || parentId === 'root') return [...sections, nextSection];

    return mapSections(sections, parentId, (section) => ({
        ...section,
        children: [...(section.children || []), nextSection],
    }));
}

export function updateRecommendationSection(sections, sectionId, draft) {
    return mapSections(sections, sectionId, (section) => ({
        ...section,
        title: String(draft.title || '').trim(),
        description: String(draft.description || '').trim(),
    }));
}

export function deleteRecommendationSection(sections, sectionId) {
    return sections
        .filter((section) => section.id !== sectionId)
        .map((section) => ({
            ...section,
            children: deleteRecommendationSection(section.children || [], sectionId),
        }));
}

export function addRecommendationBlock(sections, sectionId, draft) {
    const nextBlock = createBlock(draft);

    return mapSections(sections, sectionId, (section) => ({
        ...section,
        blocks: [...(section.blocks || []), nextBlock],
    }));
}

export function updateRecommendationBlock(sections, blockId, draft) {
    return sections.map((section) => ({
        ...section,
        blocks: (section.blocks || []).map((block) => (
            block.id === blockId
                ? {
                    ...block,
                    title: String(draft.title || '').trim(),
                    summary: String(draft.summary || '').trim(),
                    content: String(draft.content || '').trim(),
                    tags: normalizeTags(draft.tags),
                }
                : block
        )),
        children: updateRecommendationBlock(section.children || [], blockId, draft),
    }));
}

export function deleteRecommendationBlock(sections, blockId) {
    return sections.map((section) => ({
        ...section,
        blocks: (section.blocks || []).filter((block) => block.id !== blockId),
        children: deleteRecommendationBlock(section.children || [], blockId),
    }));
}

export function getRecommendationSectionOptions(sections, prefix = '') {
    return sections.flatMap((section, index) => {
        const path = prefix ? `${prefix}.${index + 1}` : String(index + 1);
        const option = {
            value: section.id,
            label: `${path}. ${section.title}`,
            description: section.description,
        };

        return [
            option,
            ...getRecommendationSectionOptions(section.children || [], path),
        ];
    });
}

export function getRecommendationBaseStats(sections) {
    return sections.reduce((stats, section) => {
        const childStats = getRecommendationBaseStats(section.children || []);

        return {
            sections: stats.sections + 1 + childStats.sections,
            blocks: stats.blocks + (section.blocks || []).length + childStats.blocks,
        };
    }, { sections: 0, blocks: 0 });
}

function collectRecommendationBlockIds(sections) {
    return sections.flatMap((section) => [
        ...(section.blocks || []).map((block) => block.id),
        ...collectRecommendationBlockIds(section.children || []),
    ]);
}

function filterSectionsByBlockIds(sections, visibleBlockIds) {
    return sections
        .map((section) => {
            const blocks = (section.blocks || []).filter((block) => visibleBlockIds.has(block.id));
            const children = filterSectionsByBlockIds(section.children || [], visibleBlockIds);

            if (!blocks.length && !children.length) return null;

            return {
                ...section,
                blocks,
                children,
            };
        })
        .filter(Boolean);
}

export function paginateRecommendationBase(sections, page = 1, perPage = RECOMMENDATION_BLOCKS_PER_PAGE) {
    const allBlockIds = collectRecommendationBlockIds(sections);
    const totalBlocks = allBlockIds.length;
    const pageCount = Math.max(1, Math.ceil(totalBlocks / perPage));
    const currentPage = Math.min(pageCount, Math.max(1, Number(page) || 1));
    const startIndex = (currentPage - 1) * perPage;
    const visibleBlockIds = new Set(allBlockIds.slice(startIndex, startIndex + perPage));

    return {
        sections: filterSectionsByBlockIds(sections, visibleBlockIds),
        page: currentPage,
        pageCount,
        totalBlocks,
        startBlock: totalBlocks ? startIndex + 1 : 0,
        endBlock: Math.min(totalBlocks, startIndex + perPage),
        perPage,
    };
}
