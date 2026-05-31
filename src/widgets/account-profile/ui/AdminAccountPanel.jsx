import { useState } from 'react';
import { Badge, Button, Input, KitIcon, Select } from '../../../shared/ui/kit';
import { adminAccounts, statusInfo } from '../../../entities/user';

export function AdminAccountPanel({ notify, styles }) {
    const [accounts, setAccounts] = useState(adminAccounts);
    const [createdStatus, setCreatedStatus] = useState('client');

    const handleCreateAccount = (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const name = String(formData.get('accountName') || '').trim();

        if (!name) {
            notify?.({
                tone: 'danger',
                title: 'Аккаунт не создан',
                description: 'Введите имя или почту учетной записи.',
            });
            return;
        }

        setAccounts((current) => [...current, { name, status: createdStatus, condition: 'Активна' }]);
        notify?.({
            tone: 'success',
            title: 'Аккаунт создан',
            description: 'Учетная запись добавлена в клиентском прототипе.',
        });
        event.currentTarget.reset();
        setCreatedStatus('client');
    };

    const handleBlockAccount = (targetName) => {
        setAccounts((current) => current.map((account) => (
            account.name === targetName ? { ...account, condition: 'Заблокирована' } : account
        )));
        notify?.({
            tone: 'warning',
            title: 'Аккаунт заблокирован',
            description: `Учетная запись "${targetName}" переведена в статус блокировки.`,
        });
    };

    const handleDeleteAccount = (targetName) => {
        setAccounts((current) => current.filter((account) => account.name !== targetName));
        notify?.({
            tone: 'danger',
            title: 'Аккаунт удален',
            description: `Учетная запись "${targetName}" удалена из списка.`,
        });
    };

    return (
        <div className={styles.rolePanel}>
            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Учетные записи</h2>
                        <p>Создание, блокировка и удаление пользователей.</p>
                    </div>
                </div>
                <div className={styles.adminList}>
                    {accounts.map((account) => (
                        <article className={styles.roleCard} key={account.name}>
                            <div>
                                <strong>{account.name}</strong>
                                <p>{statusInfo[account.status]?.label || account.status} · {account.condition}</p>
                            </div>
                            <div className={styles.roleActions}>
                                <Button variant="secondary" size="sm" iconRight={<KitIcon name="shield" />} onClick={() => handleBlockAccount(account.name)}>
                                    Блокировать
                                </Button>
                                <Button variant="destructive" size="sm" iconRight={<KitIcon name="trash" />} onClick={() => handleDeleteAccount(account.name)}>
                                    Удалить
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Создать аккаунт</h2>
                        <p>Администратор может завести пользователя с нужным статусом.</p>
                    </div>
                </div>
                <form className={styles.compactForm} onSubmit={handleCreateAccount}>
                    <Input name="accountName" label="Имя или почта" placeholder="new-user@example.com" required />
                    <Select
                        label="Статус"
                        options={[
                            { value: 'client', label: 'Клиент' },
                            { value: 'specialist', label: 'Специалист' },
                            { value: 'admin', label: 'Администратор' },
                        ]}
                        value={createdStatus}
                        onChange={setCreatedStatus}
                    />
                    <Button type="submit" variant="gradient" gradient="radial" iconRight={<KitIcon name="plus" />}>
                        Создать
                    </Button>
                </form>
            </section>

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Модерация</h2>
                        <p>Контроль корректности пользовательских записей и рекомендаций.</p>
                    </div>
                    <Badge tone="warning">2 на проверке</Badge>
                </div>
                <div className={styles.roleGrid}>
                    <article className={styles.roleCard}>
                        <div>
                            <strong>Жалоба на рекомендацию</strong>
                            <p>Проверить формулировку специалиста перед публикацией.</p>
                        </div>
                        <Button variant="secondary" iconRight={<KitIcon name="check" />}>Одобрить</Button>
                    </article>
                    <article className={styles.roleCard}>
                        <div>
                            <strong>Запись клиента</strong>
                            <p>Отметка о кризисном состоянии требует внимания администратора.</p>
                        </div>
                        <Button variant="ghost" iconRight={<KitIcon name="warning" />}>Проверить</Button>
                    </article>
                </div>
            </section>
        </div>
    );
}
