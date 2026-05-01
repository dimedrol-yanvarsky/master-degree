import { NavLink } from 'react-router-dom';
import { NAV } from './config';

export function Sidebar() {
    return (
        <aside className="kit-nav">
            {NAV.map(sec => (
                <div key={sec.group}>
                    <div className="kit-nav-group">{sec.group}</div>
                    {sec.items.map(item => (
                        <NavLink
                            key={item.id}
                            to={item.id}
                            className={({ isActive }) => (isActive ? 'active' : '')}>
                            {item.label}
                        </NavLink>
                    ))}
                </div>
            ))}
        </aside>
    );
}
