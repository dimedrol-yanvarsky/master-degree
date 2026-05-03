import { Button } from "../Button";
import { KitIcon } from "../Icon";
import { cn } from "../_utils";
import styles from "./DialogPreview.module.css";
export function DialogPreview({ tone = "default" }) {
    const isDanger = tone === "danger";
    const isSuccess = tone === "success";
    return (
        <section className={cn(styles.root, styles[tone])}>
            <div className={styles.icon}>
                <KitIcon
                    name={isDanger ? "warning" : isSuccess ? "check" : "spark"}
                />
            </div>
            <div>
                <h3>
                    {isDanger
                        ? "Удалить проект?"
                        : isSuccess
                          ? "Готово к публикации"
                          : "Опубликовать изменения"}
                </h3>
                <p>
                    {isDanger
                        ? "После подтверждения это действие нельзя будет отменить."
                        : isSuccess
                          ? "Все обязательные проверки пройдены."
                          : "Проверьте видимость и уведомите команду."}
                </p>
            </div>
            <div className={styles.actions}>
                <Button variant="secondary" size="sm">
                    Отмена
                </Button>
                <Button
                    variant={isDanger ? "destructive" : "primary"}
                    size="sm"
                >
                    Продолжить
                </Button>
            </div>
        </section>
    );
}
