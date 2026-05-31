import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AccountPage } from '../../pages/account';
import { AppPlaceholderPage } from '../../pages/app-placeholder';
import { MyEmotionsPage } from '../../pages/my-emotions';
import { NotFoundPage } from '../../pages/not-found';
import { RecommendationsPage } from '../../pages/recommendations';
import { SpecialistsPage } from '../../pages/specialists';
import { TestingPage } from '../../pages/testing';
import UIKitPage from '../../pages/ui-kit/UIKitPage';
import { NAV } from '../../pages/ui-kit/config';
import { ButtonsPage } from '../../pages/ui-kit/pages/ButtonsPage';
import { GalleryPage } from '../../pages/ui-kit/pages/GalleryPage';
import { AppShell } from '../../widgets/app-shell';

const KNOWN_PAGES = {
    buttons: ButtonsPage,
};

function RequireAuth({ isAuth, children }) {
    return isAuth ? children : <Navigate to="/login" replace />;
}

function GuestOnly({ isAuth, children }) {
    return isAuth ? <Navigate to="/account" replace /> : children;
}

export function AppRouter({
    isAuth = false,
    user = null,
    userRole = null,
    status = null,
    testStatus = null,
    onAuthSuccess,
    onLogout,
    onUserUpdate,
    onAccountDelete,
    onTestComplete,
}) {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<AppShell isAuth={isAuth} status={status} user={user} />}>
                    <Route index element={<MyEmotionsPage isAuth={isAuth} status={status} testStatus={testStatus} />} />
                    <Route path="my-emotions" element={<MyEmotionsPage isAuth={isAuth} status={status} testStatus={testStatus} />} />
                    <Route
                        path="account"
                        element={
                            <RequireAuth isAuth={isAuth}>
                                <AccountPage
                                    user={user}
                                    status={status}
                                    testStatus={testStatus}
                                    onLogout={onLogout}
                                    onUserUpdate={onUserUpdate}
                                    onAccountDelete={onAccountDelete}
                                />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="login"
                        element={
                            <GuestOnly isAuth={isAuth}>
                                <AccountPage mode="login" onAuthSuccess={onAuthSuccess} />
                            </GuestOnly>
                        }
                    />
                    <Route
                        path="register"
                        element={
                            <GuestOnly isAuth={isAuth}>
                                <AccountPage mode="register" onAuthSuccess={onAuthSuccess} />
                            </GuestOnly>
                        }
                    />
                    <Route path="recommendations" element={<RecommendationsPage status={status} />} />
                    <Route path="specialists" element={<SpecialistsPage isAuth={isAuth} status={status} />} />
                    <Route path="reviews" element={<AppPlaceholderPage kind="reviews" />} />
                    <Route path="user-agreement" element={<AppPlaceholderPage kind="userAgreement" />} />
                    <Route
                        path="testing"
                        element={<TestingPage isAuth={isAuth} userRole={userRole} status={status} testStatus={testStatus} onTestComplete={onTestComplete} />}
                    />
                    <Route
                        path="testing/:testId"
                        element={<TestingPage isAuth={isAuth} userRole={userRole} status={status} testStatus={testStatus} onTestComplete={onTestComplete} />}
                    />
                    <Route path="benchmark" element={<AppPlaceholderPage kind="benchmark" />} />
                    <Route path="components" element={<Navigate to="/ui-kit" replace />} />

                    <Route path="ui-kit" element={<UIKitPage />}>
                        <Route index element={<Navigate to="buttons" replace />} />
                        {NAV.flatMap((section) => section.items.map((item) => {
                            const Component = KNOWN_PAGES[item.id] || GalleryPage;

                            return (
                                <Route
                                    key={item.id}
                                    path={item.id}
                                    element={
                                        item.id in KNOWN_PAGES
                                            ? <Component />
                                            : <Component id={item.id} group={section.group} label={item.label} />
                                    }
                                />
                            );
                        }))}
                    </Route>

                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
