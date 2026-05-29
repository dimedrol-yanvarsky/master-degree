import { RecommendationBase } from '../../widgets/recommendation-base';

export default function RecommendationsPage({ status = null }) {
    return <RecommendationBase status={status} />;
}
