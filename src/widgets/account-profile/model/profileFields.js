export function getProfileFields(user, isSpecialist) {
    return [
        { key: 'surname', label: 'Фамилия', value: user?.surname || '', type: 'text', icon: 'user', placeholder: 'Иванова', autoComplete: 'family-name' },
        { key: 'name', label: 'Имя', value: user?.name || '', type: 'text', icon: 'user', placeholder: 'Анна', autoComplete: 'given-name' },
        { key: 'patronymic', label: 'Отчество', value: user?.patronymic || '', type: 'text', icon: 'user', placeholder: 'Сергеевна', autoComplete: 'additional-name' },
        { key: 'email', label: 'Электронная почта', value: user?.email || '', type: 'email', icon: 'mail', placeholder: 'name@example.com', autoComplete: 'email' },
        ...(isSpecialist ? [{ key: 'experience', label: 'Стаж', value: user?.experience || '', type: 'number', icon: 'clock', placeholder: 'Например, 5' }] : []),
        { key: 'about', label: 'Обо мне', value: user?.about || '', type: 'textarea', icon: 'info', placeholder: isSpecialist ? 'Опишите свой опыт' : 'Расскажите о себе' },
    ];
}
