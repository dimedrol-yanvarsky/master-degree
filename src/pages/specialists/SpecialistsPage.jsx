import { SpecialistCatalog } from '../../widgets/specialist-catalog';

export default function SpecialistsPage({ isAuth = false, status = null }) {
    return <SpecialistCatalog isAuth={isAuth} status={status} />;
}
