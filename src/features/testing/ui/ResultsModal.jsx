import { useState } from 'react';
import { Badge, KitIcon } from '../../../shared/ui/kit';
import { hasCompletedTest } from '../../../entities/user';
import { getStoredResult } from '../model/testResultStatus';
import { AttemptDetail } from './AttemptDetail';
import { CompletedAttemptCard } from './CompletedAttemptCard';

export function ResultsModal({ availableTests, testStatus, onClose, styles }) {
    const [activeTestId, setActiveTestId] = useState(null);
    const completedTests = availableTests.filter((test) => hasCompletedTest(testStatus, test.id));
    const activeTest = completedTests.find((test) => test.id === activeTestId) || null;

    return (
        <div className={styles.modalLayer} role="presentation" onMouseDown={onClose}>
            <section
                className={[styles.modal, styles.resultsModal].join(' ')}
                role="dialog"
                aria-modal="true"
                aria-label="Пройденные тесты"
                onMouseDown={(event) => event.stopPropagation()}>
                <button className={styles.closeButton} type="button" aria-label="Закрыть" onClick={onClose}>
                    <KitIcon name="close" />
                </button>

                {activeTest ? (
                    <AttemptDetail
                        test={activeTest}
                        result={getStoredResult(testStatus, activeTest.id)}
                        onBack={() => setActiveTestId(null)}
                        styles={styles}
                    />
                ) : (
                    <>
                        <Badge tone="accent">История прохождений</Badge>
                        <h2>Пройденные тесты</h2>
                        {completedTests.length > 0 ? (
                            <div className={styles.attemptList}>
                                {completedTests.map((test) => (
                                    <CompletedAttemptCard
                                        key={test.id}
                                        test={test}
                                        result={getStoredResult(testStatus, test.id)}
                                        onView={(target) => setActiveTestId(target.id)}
                                        styles={styles}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className={styles.attemptEmpty}>
                                Пока нет пройденных тестов. Завершите тест — и он появится здесь вместе с ответами.
                            </p>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}
