import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Tags, Sun, Moon } from 'lucide-react';
import './TraitsPage.css';

const HeaderLogo = () => (
    <svg viewBox="-30 -30 60 60" className="traits-page__logo">
        <polygon points="25,-12.5 0,0 0,25 25,12.5" fill="currentColor" transform="translate(1, 0.5)" />
        <polygon points="-25,-12.5 0,0 0,25 -25,12.5" fill="currentColor" transform="translate(-1, 0.5)" />
        <g transform="translate(0, -1)">
            <polygon points="-25,-12.5 0,0 12.5,-6.25 -12.5,-18.75" fill="currentColor" />
            <polygon points="0,-25 25,-12.5 14.5,-7.25 -10.5,-19.5" fill="currentColor" />
        </g>
    </svg>
)

// No static mapping required for dynamic on-chain traits
const traitsMapping = {};

function TraitsPage({ onNavigateToCollection }) {
    const [allCats, setAllCats] = useState([]);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        fetch('/all-traits.json')
            .then(res => res.json())
            .then(data => setAllCats(data))
            .catch(err => console.error('Error loading traits:', err));
    }, []);

    const traitGroups = useMemo(() => {
        if (!allCats.length) return {};

        const groups = {};

        allCats.forEach(cat => {
            Object.entries(cat.traits).forEach(([category, value]) => {
                if (!groups[category]) {
                    groups[category] = {};
                }
                groups[category][value] = (groups[category][value] || 0) + 1;
            });
        });

        const sortedGroups = {};
        Object.entries(groups).forEach(([category, values]) => {
            sortedGroups[category] = Object.entries(values)
                .map(([name, count]) => {
                    return {
                        name,
                        count,
                        percentage: ((count / allCats.length) * 100).toFixed(1)
                    };
                })
                .sort((a, b) => b.count - a.count);
        });

        return sortedGroups;
    }, [allCats]);

    return (
        <div className={`traits-page ${theme}`}>
            <header className="traits-page__header">
                <div className="traits-page__header-left">
                    <a href="#/collection" className="traits-page__back-btn">
                        <ChevronLeft size={20} />
                        <span>Gallery</span>
                    </a>
                    <div className="traits-page__brand">
                        <HeaderLogo />
                        <span className="traits-page__title">Traits Library</span>
                    </div>
                </div>
                <div className="traits-page__header-right">
                    <div className="traits-page__stats">
                        <span className="traits-page__count">{allCats.length || '---'} Items</span>
                    </div>
                </div>
            </header>

            <main className="traits-page__content">
                {!allCats.length ? (
                    <div className="traits-page__loading">
                        <div className="traits-page__loading-text">Loading Traits...</div>
                    </div>
                ) : (
                    <div className="traits-page__grid">
                        {Object.entries(traitGroups).map(([category, traits]) => (
                            <section key={category} className="traits-page__category">
                                <h2 className="traits-page__category-title">
                                    {category.charAt(0).toUpperCase() + category.slice(1)}
                                    <span className="traits-page__category-count">{traits.length}</span>
                                </h2>
                                <div className="traits-page__trait-grid">
                                    {traits.map(trait => (
                                         <div key={trait.name} className="traits-page__trait-card-visual" style={{ width: '100%' }}>
                                             <div className="traits-page__trait-image-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '120px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                                                 <div className="traits-page__trait-badge" style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                                     {trait.percentage}%
                                                 </div>
                                                 <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                                     <div style={{ fontSize: '15px', fontWeight: '600', color: '#fff', marginBottom: '6px' }}>{trait.name}</div>
                                                     <div style={{ fontSize: '12px', color: '#888' }}>{trait.count} pcs</div>
                                                 </div>
                                             </div>
                                         </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </main>

            <footer className="traits-page__footer">
                <div className="traits-page__footer-content">
                    <div className="traits-page__footer-left">
                        <Tags size={16} />
                        <span>Library Statistics</span>
                    </div>
                    <div className="traits-page__footer-actions">
                        <button
                            className="traits-page__theme-toggle"
                            onClick={() => {
                                const newTheme = theme === 'dark' ? 'light' : 'dark';
                                setTheme(newTheme);
                                localStorage.setItem('theme', newTheme);
                            }}
                        >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default TraitsPage;
