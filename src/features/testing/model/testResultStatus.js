import { getTestStatusKey } from '../../../entities/user';

export function getStoredResult(testStatus, testId) {
    return testStatus?.[`${getTestStatusKey(testId)}Result`] || null;
}
