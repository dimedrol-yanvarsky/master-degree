import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Avatar, Badge, Button, KitIcon } from '../../shared/ui/kit';
import { getSpecialistsPage, specialists } from '../../entities/specialist';
import { SpecialistWorkButton } from '../../features/specialist-work-request';
import styles from './SpecialistCatalog.module.css';

export function SpecialistCatalog({ isAuth = false, status = null }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const pageParam = searchParams.get('page');
    const requestedPage = Number(pageParam || 1);

    const catalogPage = useMemo(
        () => getSpecialistsPage(specialists, requestedPage),
        [requestedPage]
    );

    useEffect(() => {
        if (pageParam !== String(catalogPage.page)) {
            setSearchParams({ page: String(catalogPage.page) }, { replace: true });
        }
    }, [catalogPage.page, pageParam, setSearchParams]);

    const goToPage = (page) => {
        const nextPage = Math.min(catalogPage.pageCount, Math.max(1, page));
        setSearchParams({ page: String(nextPage) });
    };

    return (
        <section className={styles.root}>
            <header className={styles.heading}>
                <div>
                    <h1>Специалисты</h1>
                    <p>Выберите понравившегося специалиста</p>
                </div>
                <div className={styles.summary}>
                    <KitIcon name="user" size={18} />
                    <span>{specialists.length} специалистов</span>
                </div>
            </header>

            <div className={styles.grid}>
                {catalogPage.items.map((specialist) => (
                    <article className={styles.card} key={specialist.name}>
                        <div className={styles.cardTop}>
                            <Avatar
                                name={specialist.name}
                                size="lg"
                                variant="ring"
                                color={specialist.color}
                            />
                            <div className={styles.specialistHead}>
                                <h2>{specialist.name}</h2>
                                <div className={styles.tags}>
                                    {specialist.tags.map((tag) => (
                                        <Badge key={tag} tone="accent" appearance="glass">{tag}</Badge>
                                    ))}
                                    <Badge tone="accent" appearance="glass">стаж: {specialist.experience}</Badge>
                                </div>
                            </div>
                        </div>

                        <p className={styles.description}>{specialist.description}</p>

                        <div className={styles.cardFooter}>
                            <SpecialistWorkButton isAuth={isAuth} status={status} />
                        </div>
                    </article>
                ))}
            </div>

            <nav className={styles.pagination} aria-label="Пагинация специалистов">
                <Button
                    variant="ghost"
                    iconLeft={<KitIcon name="arrowLeft" size={16} />}
                    disabled={catalogPage.page === 1}
                    onClick={() => goToPage(catalogPage.page - 1)}>
                    Назад
                </Button>

                <div className={styles.pageButtons}>
                    {Array.from({ length: catalogPage.pageCount }, (_, index) => {
                        const page = index + 1;
                        const isCurrent = page === catalogPage.page;

                        return (
                            <Button
                                key={page}
                                variant={isCurrent ? 'primary' : 'secondary'}
                                iconOnly
                                iconLeft={<span>{page}</span>}
                                aria-label={`Страница ${page}`}
                                aria-current={isCurrent ? 'page' : undefined}
                                onClick={() => goToPage(page)}
                            />
                        );
                    })}
                </div>

                <Button
                    variant="ghost"
                    iconRight={<KitIcon name="arrowRight" size={16} />}
                    disabled={catalogPage.page === catalogPage.pageCount}
                    onClick={() => goToPage(catalogPage.page + 1)}>
                    Вперед
                </Button>
            </nav>
        </section>
    );
}
