import { useState } from 'react';
import { Badge, Button, Input, KitIcon, Select } from '../../../shared/ui/kit';
import { specialistClients } from '../../../entities/user';

export function SpecialistAccountPanel({ notify, styles }) {
    const [assignedClient, setAssignedClient] = useState(specialistClients[0].name);

    const handleRecommendationSubmit = (event) => {
        event.preventDefault();
        notify?.({
            tone: 'success',
            title: 'Рекомендация назначена',
            description: `Рекомендация для клиента "${assignedClient}" сохранена.`,
        });
        event.currentTarget.reset();
    };

    return (
        <div className={styles.rolePanel}>
            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Все клиенты</h2>
                        <p>Просмотр клиентов, состояния и последнего тестирования.</p>
                    </div>
                </div>
                <div className={styles.roleGrid}>
                    {specialistClients.map((client) => (
                        <article className={styles.roleCard} key={client.name}>
                            <div>
                                <strong>{client.name}</strong>
                                <p>{client.lastTest}</p>
                            </div>
                            <Badge tone={client.state === 'Высокая потребность' ? 'warning' : 'accent'}>{client.state}</Badge>
                        </article>
                    ))}
                </div>
            </section>

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Выбранные клиенты</h2>
                        <p>Клиенты, с которыми специалист ведет работу.</p>
                    </div>
                </div>
                <ul className={styles.roleList}>
                    {specialistClients.slice(0, 2).map((client) => (
                        <li key={client.name}>
                            <KitIcon name="user" size={16} />
                            <span>{client.name}: план сопровождения активен</span>
                        </li>
                    ))}
                </ul>
            </section>

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Назначить рекомендацию</h2>
                        <p>Специалист может выбрать клиента и добавить персональный шаг.</p>
                    </div>
                </div>
                <form className={styles.compactForm} onSubmit={handleRecommendationSubmit}>
                    <Select
                        label="Клиент"
                        options={specialistClients.map((client) => ({ value: client.name, label: client.name, description: client.state }))}
                        value={assignedClient}
                        onChange={setAssignedClient}
                    />
                    <Input label="Рекомендация" placeholder="Например: вести дневник состояния 7 дней" required />
                    <Button type="submit" variant="gradient" gradient="radial" iconRight={<KitIcon name="check" />}>
                        Назначить
                    </Button>
                </form>
            </section>
        </div>
    );
}
