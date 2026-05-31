import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Checkbox, Input, KitIcon, Select, Textarea } from '../../../shared/ui/kit';
import { apiMe, validateRegistrationValues } from '../../../entities/user';
import { setAccessToken, yandexLoginUrl } from '../../../shared/api';
import { apiConfirmPasswordReset, apiLogin, apiRegister, apiRequestPasswordReset } from '../api';
import { ROUTES } from '../../../shared/routes';
import { accountTypeOptions } from '../model/accountTypeOptions';
import { navigateWithTransition, shouldUseDefaultNavigation } from '../model/navigateWithTransition';
import { generateStrongPassword } from '../model/passwordGenerator';
import { AccountIllustration } from './AccountIllustration';
import { PasswordInput } from './PasswordInput';

export function AuthAccess({ mode, onAuthSuccess, notify, styles, authImages }) {
    const isRegister = mode === 'register';
    const navigate = useNavigate();
    const targetPath = isRegister ? ROUTES.login : ROUTES.register;
    const [formValues, setFormValues] = useState({
        surname: '',
        name: '',
        patronymic: '',
        email: '',
        password: '',
        accountType: 'client',
        about: '',
        experience: '',
        acceptedTerms: false,
        acceptedPersonalData: false,
        remember: true,
    });
    const [formErrors, setFormErrors] = useState({});
    const [resetMode, setResetMode] = useState(false);
    const [resetPending, setResetPending] = useState(false);
    const [resetValues, setResetValues] = useState({
        email: '',
        token: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [resetErrors, setResetErrors] = useState({});
    const cardClassName = [
        styles.card,
        isRegister ? styles.register : styles.login,
    ].join(' ');
    const isPasswordReset = !isRegister && resetMode;
    const hasResetToken = Boolean(resetValues.token);
    const isSpecialistAccount = formValues.accountType === 'specialist';
    const aboutPlaceholder = isSpecialistAccount ? 'Опишите свой опыт' : 'Расскажите о своей проблеме';

    useEffect(() => {
        setFormValues({
            surname: '',
            name: '',
            patronymic: '',
            email: '',
            password: '',
            accountType: 'client',
            about: '',
            experience: '',
            acceptedTerms: false,
            acceptedPersonalData: false,
            remember: true,
        });
        setFormErrors({});
        setResetMode(false);
        setResetPending(false);
        setResetValues({
            email: '',
            token: '',
            newPassword: '',
            confirmPassword: '',
        });
        setResetErrors({});
    }, [mode]);

    // Возврат из серверного OAuth-потока: токен приходит во фрагменте URL
    // (#access_token=...), ошибка — в query (?oauth_error=...).
    useEffect(() => {
        if (isRegister) return undefined;

        const query = new URLSearchParams(window.location.search);
        if (query.get('oauth_error')) {
            window.history.replaceState(null, '', window.location.pathname);
            notify?.({
                tone: 'danger',
                title: 'Вход через Яндекс не выполнен',
                description: 'Не удалось завершить авторизацию. Попробуйте ещё раз.',
            });
            return undefined;
        }

        const hash = window.location.hash || '';
        if (!hash.includes('access_token=')) return undefined;

        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const token = params.get('access_token');
        if (!token) return undefined;

        setAccessToken(token);
        window.history.replaceState(null, '', window.location.pathname);

        let active = true;
        (async () => {
            try {
                const user = await apiMe();
                if (!active) return;
                onAuthSuccess?.(user, { persist: true });
                navigateWithTransition(navigate, ROUTES.account, { replace: true });
            } catch (error) {
                if (active) {
                    notify?.({ tone: 'danger', title: 'Вход через Яндекс не выполнен', description: error.message });
                }
            }
        })();

        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (isRegister) return;

        const query = new URLSearchParams(window.location.search);
        const token = query.get('reset_token');
        if (!token) return;

        setResetMode(true);
        setResetValues((currentValues) => ({
            ...currentValues,
            token,
        }));
        setResetErrors({});
    }, [isRegister]);

    const handleFieldChange = (field) => (event) => {
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        setFormValues((currentValues) => ({
            ...currentValues,
            [field]: value,
        }));
        setFormErrors((currentErrors) => ({
            ...currentErrors,
            [field]: '',
        }));
    };

    const handleValueChange = (field) => (value) => {
        setFormValues((currentValues) => ({
            ...currentValues,
            [field]: value,
            ...(field === 'accountType' && value !== 'specialist' ? { experience: '' } : {}),
        }));
        setFormErrors((currentErrors) => ({
            ...currentErrors,
            [field]: '',
            ...(field === 'accountType' ? { about: '', experience: '' } : {}),
        }));
    };

    const handleResetFieldChange = (field) => (event) => {
        setResetValues((currentValues) => ({
            ...currentValues,
            [field]: event.target.value,
        }));
        setResetErrors((currentErrors) => ({
            ...currentErrors,
            [field]: '',
        }));
    };

    const handleStartPasswordReset = () => {
        setResetMode(true);
        setResetValues((currentValues) => ({
            ...currentValues,
            email: formValues.email,
        }));
        setResetErrors({});
    };

    const handleCancelPasswordReset = () => {
        setResetMode(false);
        setResetPending(false);
        setResetValues({
            email: '',
            token: '',
            newPassword: '',
            confirmPassword: '',
        });
        setResetErrors({});
        if (new URLSearchParams(window.location.search).has('reset_token')) {
            window.history.replaceState(null, '', window.location.pathname);
        }
    };

    const handleGeneratePassword = () => {
        setFormValues((currentValues) => ({
            ...currentValues,
            password: generateStrongPassword(),
        }));
        setFormErrors((currentErrors) => ({
            ...currentErrors,
            password: '',
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isRegister) {
            const validation = validateRegistrationValues(formValues);
            setFormErrors(validation.errors);

            if (!validation.ok) {
                notify?.({
                    tone: 'danger',
                    title: 'Регистрация не выполнена',
                    description: validation.message,
                });
                return;
            }
        }

        try {
            const result = isRegister
                ? await apiRegister(formValues)
                : await apiLogin(formValues);

            onAuthSuccess?.(result.user, { persist: true });
            navigateWithTransition(navigate, ROUTES.account, { replace: true });
        } catch (error) {
            notify?.({
                tone: 'danger',
                title: isRegister ? 'Регистрация не выполнена' : 'Вход не выполнен',
                description: error.message,
            });
        }
    };

    const handleResetSubmit = async (event) => {
        event.preventDefault();

        if (!hasResetToken) {
            const email = resetValues.email.trim();
            if (!email) {
                setResetErrors({ email: 'Укажите почту аккаунта.' });
                return;
            }

            setResetPending(true);
            try {
                await apiRequestPasswordReset(email);
                notify?.({
                    tone: 'success',
                    title: 'Инструкция подготовлена',
                    description: 'Если аккаунт существует, ссылка отправлена на почту. Без SMTP она появится в логе сервера.',
                });
                handleCancelPasswordReset();
            } catch (error) {
                notify?.({
                    tone: 'danger',
                    title: 'Восстановление не выполнено',
                    description: error.message,
                });
            } finally {
                setResetPending(false);
            }
            return;
        }

        const newPassword = resetValues.newPassword;
        const confirmPassword = resetValues.confirmPassword;
        const errors = {};
        if (newPassword.length < 8) {
            errors.newPassword = 'Пароль должен быть не короче 8 символов.';
        }
        if (newPassword !== confirmPassword) {
            errors.confirmPassword = 'Пароли не совпадают.';
        }
        setResetErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setResetPending(true);
        try {
            await apiConfirmPasswordReset({ token: resetValues.token, newPassword });
            notify?.({
                tone: 'success',
                title: 'Пароль обновлён',
                description: 'Теперь можно войти с новым паролем.',
            });
            handleCancelPasswordReset();
        } catch (error) {
            notify?.({
                tone: 'danger',
                title: 'Пароль не обновлён',
                description: error.message,
            });
        } finally {
            setResetPending(false);
        }
    };

    const handleModeLinkClick = (event) => {
        if (shouldUseDefaultNavigation(event)) return;

        event.preventDefault();

        navigateWithTransition(navigate, targetPath);
    };

    const handleYandexSignIn = () => {
        if (isRegister && (!formValues.acceptedTerms || !formValues.acceptedPersonalData)) {
            notify?.({
                tone: 'danger',
                title: 'Регистрация не выполнена',
                description: 'Подтвердите пользовательское соглашение и обработку персональных данных.',
            });
            return;
        }

        // Полноценный серверный OAuth-поток: уходим на бэкенд, тот — к Яндексу,
        // а затем возвращает нас на страницу входа с токеном во фрагменте URL.
        window.location.assign(yandexLoginUrl());
    };

    return (
        <section className={styles.root}>
            <form className={cardClassName} onSubmit={isPasswordReset ? handleResetSubmit : handleSubmit} noValidate>
                {!isRegister && <AccountIllustration mode={mode} styles={styles} authImages={authImages} />}
                <div className={styles.formPanel}>
                    <div className={styles.header}>
                        <h1>
                            {isPasswordReset
                                ? (hasResetToken ? 'Новый пароль' : 'Восстановить пароль')
                                : (isRegister ? 'Создать аккаунт' : 'Войти в аккаунт')}
                        </h1>
                        <p>
                            {isPasswordReset
                                ? (hasResetToken
                                    ? 'Введите новый пароль для своей учётной записи.'
                                    : 'Укажите почту аккаунта, и система подготовит ссылку для сброса пароля.')
                                : isRegister
                                ? 'Создайте профиль, чтобы сохранять эмоциональные записи и получать персональные рекомендации.'
                                : 'Авторизуйтесь, чтобы перейти к личным рекомендациям и графу эмоций.'}
                        </p>
                    </div>

                    <div className={styles.fields}>
                        {isPasswordReset ? (
                            hasResetToken ? (
                                <>
                                    <PasswordInput
                                        label="Новый пароль"
                                        placeholder="Введите новый пароль"
                                        autoComplete="new-password"
                                        value={resetValues.newPassword}
                                        onChange={handleResetFieldChange('newPassword')}
                                        error={resetErrors.newPassword}
                                        required
                                        size="lg"
                                        iconLeft={<KitIcon name="lock" />}
                                    />
                                    <PasswordInput
                                        label="Повторите пароль"
                                        placeholder="Повторите новый пароль"
                                        autoComplete="new-password"
                                        value={resetValues.confirmPassword}
                                        onChange={handleResetFieldChange('confirmPassword')}
                                        error={resetErrors.confirmPassword}
                                        required
                                        size="lg"
                                        iconLeft={<KitIcon name="lock" />}
                                    />
                                </>
                            ) : (
                                <Input
                                    label="Почта"
                                    type="email"
                                    placeholder="name@example.com"
                                    autoComplete="email"
                                    value={resetValues.email}
                                    onChange={handleResetFieldChange('email')}
                                    error={resetErrors.email}
                                    required
                                    size="lg"
                                    iconLeft={<KitIcon name="mail" />}
                                />
                            )
                        ) : (
                            <>
                        {isRegister && (
                            <>
                                <Input
                                    label="Фамилия"
                                    placeholder="Иванова"
                                    autoComplete="family-name"
                                    value={formValues.surname}
                                    onChange={handleFieldChange('surname')}
                                    error={formErrors.surname}
                                    required
                                    size="lg"
                                    iconLeft={<KitIcon name="user" />}
                                />
                                <Input
                                    label="Имя"
                                    placeholder="Анна"
                                    autoComplete="given-name"
                                    value={formValues.name}
                                    onChange={handleFieldChange('name')}
                                    error={formErrors.name}
                                    required
                                    size="lg"
                                    iconLeft={<KitIcon name="user" />}
                                />
                                <Input
                                    label="Отчество"
                                    placeholder="Сергеевна"
                                    autoComplete="additional-name"
                                    value={formValues.patronymic}
                                    onChange={handleFieldChange('patronymic')}
                                    error={formErrors.patronymic}
                                    required
                                    size="lg"
                                    iconLeft={<KitIcon name="user" />}
                                />
                                <Select
                                    label="Тип аккаунта"
                                    options={accountTypeOptions}
                                    value={formValues.accountType}
                                    onChange={handleValueChange('accountType')}
                                    error={formErrors.accountType}
                                    size="lg"
                                />
                                <Textarea
                                    label="Расскажите о себе"
                                    placeholder={aboutPlaceholder}
                                    className={styles.aboutTextarea}
                                    value={formValues.about}
                                    onChange={handleFieldChange('about')}
                                    error={formErrors.about}
                                    maxLength={320}
                                    showCount
                                    resize="vertical"
                                    required
                                />
                                {isSpecialistAccount && (
                                    <Input
                                        label="Стаж"
                                        type="number"
                                        placeholder="Например, 5"
                                        min="1"
                                        max="80"
                                        inputMode="numeric"
                                        value={formValues.experience}
                                        onChange={handleFieldChange('experience')}
                                        error={formErrors.experience}
                                        required
                                        size="lg"
                                        iconLeft={<KitIcon name="clock" />}
                                    />
                                )}
                            </>
                        )}
                        <Input
                            label="Почта"
                            type="email"
                            placeholder="name@example.com"
                            autoComplete="email"
                            value={formValues.email}
                            onChange={handleFieldChange('email')}
                            error={formErrors.email}
                            required
                            size="lg"
                            iconLeft={<KitIcon name="mail" />}
                        />
                        <div className={styles.passwordField}>
                            {isRegister ? (
                                <>
                                    <div className={styles.passwordHeader}>
                                        <label className={styles.passwordLabel} htmlFor="register-password">
                                            Пароль<span className={styles.passwordRequired}>*</span>
                                        </label>
                                        <button type="button" onClick={handleGeneratePassword}>
                                            Сгенерировать
                                        </button>
                                    </div>
                                    <PasswordInput
                                        id="register-password"
                                        placeholder="Введите пароль"
                                        autoComplete="new-password"
                                        value={formValues.password}
                                        onChange={handleFieldChange('password')}
                                        error={formErrors.password}
                                        required
                                        size="lg"
                                        iconLeft={<KitIcon name="lock" />}
                                    />
                                </>
                            ) : (
                                <PasswordInput
                                    label="Пароль"
                                    placeholder="Введите пароль"
                                    autoComplete="current-password"
                                    value={formValues.password}
                                    onChange={handleFieldChange('password')}
                                    required
                                    size="lg"
                                    iconLeft={<KitIcon name="lock" />}
                                />
                            )}
                        </div>
                            </>
                        )}
                    </div>

                    {!isRegister && !isPasswordReset && (
                        <div className={styles.options}>
                            <Checkbox
                                label="Запомнить меня"
                                checked={formValues.remember}
                                onChange={handleFieldChange('remember')}
                            />
                            <button className={styles.textButton} type="button" onClick={handleStartPasswordReset}>
                                Забыли пароль?
                            </button>
                        </div>
                    )}

                    {isRegister && (
                        <div className={styles.consentGroup}>
                            <Checkbox
                                checked={formValues.acceptedTerms}
                                onChange={handleFieldChange('acceptedTerms')}
                                required
                                label={(
                                    <>
                                        Я принимаю{' '}
                                        <a
                                            href={ROUTES.userAgreement}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(event) => event.stopPropagation()}>
                                            пользовательское соглашение
                                        </a>
                                    </>
                                )}
                            />
                            <Checkbox
                                checked={formValues.acceptedPersonalData}
                                onChange={handleFieldChange('acceptedPersonalData')}
                                required
                                label="Я даю согласие на обработку персональных данных"
                            />
                            {(formErrors.acceptedTerms || formErrors.acceptedPersonalData) && (
                                <p className={styles.formError}>
                                    {formErrors.acceptedTerms || formErrors.acceptedPersonalData}
                                </p>
                            )}
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="gradient"
                        gradient="radial"
                        size="lg"
                        fullWidth
                        disabled={resetPending}
                        iconRight={<KitIcon name="arrowRight" />}>
                        {isPasswordReset
                            ? (hasResetToken
                                ? (resetPending ? 'Сохраняем...' : 'Сохранить пароль')
                                : (resetPending ? 'Отправляем...' : 'Получить ссылку'))
                            : (isRegister ? 'Зарегистрироваться' : 'Войти')}
                    </Button>

                    <p className={styles.footer}>
                        {isPasswordReset ? 'Вспомнили пароль?' : (isRegister ? 'Уже есть аккаунт?' : 'Нет аккаунта?')}{' '}
                        {isPasswordReset ? (
                            <button className={styles.textButton} type="button" onClick={handleCancelPasswordReset}>
                                Войти
                            </button>
                        ) : (
                            <Link to={targetPath} onClick={handleModeLinkClick}>
                                {isRegister ? 'Войти' : 'Зарегистрироваться'}
                            </Link>
                        )}
                    </p>

                    {!isRegister && !isPasswordReset && (
                        <div className={styles.authProviderGroup}>
                            <div className={styles.authDivider} aria-hidden="true">
                                <span>или</span>
                            </div>
                            <Button
                                className={styles.yandexButton}
                                variant="secondary"
                                size="lg"
                                fullWidth
                                iconLeft={<span className={styles.yandexIcon}>Я</span>}
                                onClick={handleYandexSignIn}>
                                Войти через Яндекс
                            </Button>
                        </div>
                    )}
                </div>
            </form>
        </section>
    );
}
