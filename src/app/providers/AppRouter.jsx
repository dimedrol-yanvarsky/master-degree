import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from '../../pages/home';
import { UIKitPage } from '../../pages/ui-kit';
import { NAV } from '../../pages/ui-kit/config';
import { ButtonsPage } from '../../pages/ui-kit/pages/ButtonsPage';
import { GalleryPage } from '../../pages/ui-kit/pages/GalleryPage';

/* Known page components by id; everything else uses the shared gallery page. */
const KNOWN_PAGES = {
    buttons: ButtonsPage,
};

export function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />

                <Route path="/ui-kit" element={<UIKitPage />}>
                    <Route index element={<Navigate to="buttons" replace />} />
                    {NAV.flatMap(sec => sec.items.map(item => {
                        const Component = KNOWN_PAGES[item.id] || GalleryPage;
                        return (
                            <Route
                                key={item.id}
                                path={item.id}
                                element={
                                    item.id in KNOWN_PAGES
                                        ? <Component />
                                        : <Component id={item.id} group={sec.group} label={item.label} />
                                }
                            />
                        );
                    }))}
                </Route>

                <Route path="*" element={<HomePage />} />
            </Routes>
        </BrowserRouter>
    );
}
