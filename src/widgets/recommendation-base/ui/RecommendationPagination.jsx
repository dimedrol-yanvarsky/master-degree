import { Button, KitIcon } from '../../../shared/ui/kit';
import styles from '../RecommendationBase.module.css';

export function RecommendationPagination({ page, pageCount, onPageChange }) {
    if (pageCount <= 1) return null;

    return (
        <nav className={styles.pagination} aria-label="Пагинация рекомендательных блоков">
            <Button
                variant="secondary"
                iconLeft={<KitIcon name="arrowLeft" size={16} />}
                disabled={page === 1}
                onClick={() => onPageChange(Math.max(1, page - 1))}>
                Назад
            </Button>
            <div className={styles.pageButtons}>
                {Array.from({ length: pageCount }, (_, index) => {
                    const targetPage = index + 1;
                    const isCurrent = targetPage === page;

                    return (
                        <Button
                            key={targetPage}
                            variant={isCurrent ? 'gradient' : 'secondary'}
                            gradient="radial"
                            size="sm"
                            aria-current={isCurrent ? 'page' : undefined}
                            onClick={() => onPageChange(targetPage)}>
                            {targetPage}
                        </Button>
                    );
                })}
            </div>
            <Button
                variant="secondary"
                iconRight={<KitIcon name="arrowRight" size={16} />}
                disabled={page === pageCount}
                onClick={() => onPageChange(Math.min(pageCount, page + 1))}>
                Вперед
            </Button>
        </nav>
    );
}
