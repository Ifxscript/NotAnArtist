import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Menu, Terminal, Sun, Moon, Info, Square, LayoutGrid, Grid } from 'lucide-react'
import SparkCard from '../components/SparkCard'
import SparkModal from '../components/SparkModal'
import FilterSidebar from '../components/FilterSidebar'
import TerminalSearch from '../components/TerminalSearch'
import './CollectionPage.css'
import imageUrls from '../image-urls.json'
import imageUrlsV2 from '../image-urls-v2.json'

const HeaderLogo = () => (
    <svg viewBox="-30 -30 60 60" className="collection-page__logo">
        <polygon points="25,-12.5 0,0 0,25 25,12.5" fill="currentColor" transform="translate(1, 0.5)" />
        <polygon points="-25,-12.5 0,0 0,25 -25,12.5" fill="currentColor" transform="translate(-1, 0.5)" />
        <g transform="translate(0, -1)">
            <polygon points="-25,-12.5 0,0 12.5,-6.25 -12.5,-18.75" fill="currentColor" />
            <polygon points="0,-25 25,-12.5 14.5,-7.25 -10.5,-19.5" fill="currentColor" />
        </g>
    </svg>
)

function CollectionPage({ onNavigateToTraits }) {
    const [allCats, setAllCats] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [btcPrice, setBtcPrice] = useState(null);
    const [ethPrice, setEthPrice] = useState(null);
    const [displayCount, setDisplayCount] = useState(30);
    const [mobileGridCols, setMobileGridCols] = useState(2);
    const theme = 'dark';

    // Filter state
    const [filters, setFilters] = useState({
        "Palette": '',
        "Art Mode": '',
        "Position": ''
    });

    const [searchResult, setSearchResult] = useState(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);

    // Load traits data for 456 curated seeds
    useEffect(() => {
        fetch('/all-traits.json')
            .then(res => res.json())
            .then(data => {
                setAllCats(data);
                setSearchResult(null);
                setFilters({
                    "Palette": '',
                    "Art Mode": '',
                    "Position": ''
                });
            })
            .catch(err => console.error('Error loading traits:', err));
    }, []);

    // Fetch Crypto prices
    useEffect(() => {
        const fetchPrices = () => {
            fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd')
                .then(res => res.json())
                .then(data => {
                    if (data.bitcoin?.usd) {
                        setBtcPrice(data.bitcoin.usd);
                    }
                    if (data.ethereum?.usd) {
                        setEthPrice(data.ethereum.usd);
                    }
                })
                .catch(err => console.error('Error fetching crypto prices:', err));
        };

        fetchPrices();
        const interval = setInterval(fetchPrices, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    // Get unique values for each trait
    const traitOptions = useMemo(() => {
        const options = {
            "Palette": new Set(),
            "Art Mode": new Set(),
            "Position": new Set()
        };

        allCats.forEach(cat => {
            Object.keys(options).forEach(trait => {
                if (cat.traits && cat.traits[trait]) {
                    options[trait].add(cat.traits[trait]);
                }
            });
        });

        return {
            "Palette": Array.from(options["Palette"]).sort(),
            "Art Mode": Array.from(options["Art Mode"]).sort(),
            "Position": Array.from(options["Position"]).sort()
        };
    }, [allCats]);

    // Filter cats based on selected filters (AND logic)
    const filteredCats = useMemo(() => {
        return allCats.filter(cat => {
            return Object.entries(filters).every(([trait, value]) => {
                if (!value) return true; // No filter selected for this trait
                return cat.traits[trait] === value;
            });
        });
    }, [allCats, filters]);

    // Only display first N cats (pagination) OR the search result
    const displayedCats = useMemo(() => {
        if (searchResult) {
            return [searchResult];
        }
        return filteredCats.slice(0, displayCount);
    }, [filteredCats, displayCount, searchResult]);

    const hasMore = displayCount < filteredCats.length;

    // Infinite scroll - load more when sentinel is visible
    const sentinelRef = useRef(null);
    const loadMore = useCallback(() => {
        setDisplayCount(prev => Math.min(prev + 30, filteredCats.length));
    }, [filteredCats.length]);

    useEffect(() => {
        if (!sentinelRef.current || !hasMore || searchResult) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMore();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, loadMore, searchResult]);

    const handleCardClick = (cat, index) => {
        // Store the actual cat for the search result case
        if (searchResult) {
            // Find the index in allCats for proper modal data
            const allCatsIndex = allCats.findIndex(c => c.inscriptionId === cat.inscriptionId);
            setSelectedIndex(allCatsIndex);
        } else {
            // Find the actual index in filteredCats
            const filteredIndex = filteredCats.findIndex(c => c.inscriptionId === cat.inscriptionId);
            setSelectedIndex(filteredIndex);
        }
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedIndex(null);
    };

    const handleNavigate = (newIndex) => {
        if (newIndex >= 0 && newIndex < filteredCats.length) {
            setSelectedIndex(newIndex);
        }
    };

    const handleFilterChange = (trait, value) => {
        setFilters(prev => ({ ...prev, [trait]: value }));
    };

    const clearFilters = () => {
        setFilters({
            "Palette": '',
            "Art Mode": '',
            "Position": ''
        });
    };

    // Build current data from index
    const getCurrentData = () => {
        if (selectedIndex === null) return null;

        // When using search result, use allCats
        const catsArray = searchResult ? allCats : filteredCats;
        const cat = catsArray[selectedIndex];

        if (!cat) return null;

        const originalIndex = allCats.findIndex(c => c.inscriptionId === cat.inscriptionId);
        return {
            title: `Motor #${String(originalIndex + 1).padStart(3, '0')}`,
            inscriptionId: cat.inscriptionId,
            traits: cat.traits,
            imageUrl: `/images-v2/${cat.inscriptionId}.jpg`,
            iframeUrl: `/motor/index.html?seed=${cat.seed}`
        };
    };

    const activeFiltersCount = Object.values(filters).filter(v => v).length;

    // Terminal search - by cat number (like '023') or inscription ID
    const handleTerminalSearch = (query) => {
        // Check if query is a number (cat number search)
        const numMatch = query.match(/^(\d+)$/);

        if (numMatch) {
            // Search by cat number - must match exactly with leading zeros
            const catNumber = parseInt(numMatch[1], 10);
            const paddedQuery = query.padStart(3, '0');

            // Cat numbers are 1-indexed (purrbang001 is index 0)
            if (catNumber >= 1 && catNumber <= allCats.length) {
                // Check if the query matches the expected format
                const expectedName = `Motor #${paddedQuery}`;
                const catIndex = catNumber - 1;
                const cat = allCats[catIndex];

                if (cat) {
                    setSearchResult(cat);
                    return { found: true, message: `${expectedName} found` };
                }
            }
            return { found: false };
        } else {
            // Search by inscription ID (exact match)
            const cat = allCats.find(c =>
                c.inscriptionId.toLowerCase() === query.toLowerCase()
            );

            if (cat) {
                const originalIndex = allCats.findIndex(c => c.inscriptionId === cat.inscriptionId);
                const catName = `Motor #${String(originalIndex + 1).padStart(3, '0')}`;
                setSearchResult(cat);
                return { found: true, message: `${catName} found` };
            }
            return { found: false };
        }
    };

    // Clear terminal search
    const handleSearchClear = () => {
        setSearchResult(null);
    };

    return (
        <div className={`collection-page ${theme}`}>
            {sidebarOpen && (
                <FilterSidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    filters={filters}
                    traitOptions={traitOptions}
                    onFilterChange={handleFilterChange}
                    onClearFilters={clearFilters}
                    activeFiltersCount={activeFiltersCount}
                />
            )}

            {/* Fixed Header - outside content so it positions correctly */}
            <header className={`collection-page__header ${sidebarOpen ? 'sidebar-open' : ''}`}>
                <div className="collection-page__header-row">
                    <button
                        className="collection-page__filter-btn"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        <Menu size={20} />
                    </button>
                    <div className="collection-page__header-center">
                        <h1 className="collection-page__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            NOT AN ARTIST <HeaderLogo />
                        </h1>
                        <p className="collection-page__subtitle">{filteredCats.length} items</p>
                    </div>
                    <div className="collection-page__header-actions">
                        <button 
                            className="collection-page__grid-toggle-btn-mobile" 
                            onClick={() => setMobileGridCols(prev => prev === 1 ? 2 : prev === 2 ? 3 : 1)}
                            title="Toggle Grid Layout"
                        >
                            {mobileGridCols === 1 ? <Square size={16} /> : mobileGridCols === 2 ? <LayoutGrid size={16} /> : <Grid size={16} />}
                        </button>
                        <button
                            className={`collection-page__search-toggle ${searchOpen ? 'active' : ''}`}
                            onClick={() => {
                                  setSearchOpen(!searchOpen);
                                  if (aboutOpen) setAboutOpen(false); // Close about if search is opened
                            }}
                        >
                            <span className="collection-page__search-toggle-icon">&gt;</span>
                        </button>
                    </div>
                </div>

                {/* Search overlay - always mounted to preserve state, hidden via CSS */}
                <div className={`collection-page__search-container ${!searchOpen ? 'is-hidden' : ''}`}>
                    <TerminalSearch onSearch={handleTerminalSearch} onClear={handleSearchClear} />
                </div>
            </header>

            {/* Main Content */}
            <div className={`collection-page__content ${sidebarOpen ? 'sidebar-open' : ''}`}>
                <main className={`collection-page__grid ${sidebarOpen ? 'sidebar-open' : ''} mobile-cols-${mobileGridCols}`}>
                    {displayedCats.map((cat, index) => {
                        const originalIndex = allCats.findIndex(c => c.inscriptionId === cat.inscriptionId);
                        return (
                            <SparkCard
                                key={cat.inscriptionId}
                                title={`Motor #${String(originalIndex + 1).padStart(3, '0')}`}
                                imageUrl={`/images-v2/${cat.inscriptionId}.jpg`}
                                traits={cat.traits}
                                onClick={() => handleCardClick(cat, index)}
                            />
                        );
                    })}
                </main>

                {/* Infinite scroll sentinel */}
                {hasMore && !searchResult && (
                    <div ref={sentinelRef} className="collection-page__sentinel" />
                )}
            </div>

            <SparkModal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                data={getCurrentData()}
                allCats={filteredCats}
                currentIndex={selectedIndex}
                onNavigate={handleNavigate}
                theme={theme}
            />

            {/* Fixed Footer */}
            <footer
                className={`collection-page__footer ${sidebarOpen ? 'sidebar-open' : ''}`}
            >
                <div className="collection-page__footer-content">
                    <div className="collection-page__btc-price" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="collection-page__btc-icon">₿</span>
                            <span className="collection-page__btc-value">
                                ${btcPrice ? btcPrice.toLocaleString() : '---'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px' }}>
                            <span style={{ color: '#627EEA', fontWeight: 'bold', fontSize: '14px' }}>Ξ</span>
                            <span className="collection-page__btc-value">
                                ${ethPrice ? ethPrice.toLocaleString() : '---'}
                            </span>
                        </div>
                    </div>

                    <div className="collection-page__footer-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            className={`collection-page__info-toggle ${aboutOpen ? 'active' : ''}`}
                            onClick={() => {
                                setAboutOpen(!aboutOpen);
                                if (searchOpen) setSearchOpen(false);
                            }}
                            title="About Collection"
                        >
                            <span className="collection-page__info-toggle-icon">&lt;</span>
                        </button>
                    </div>
                </div>

                {/* About Section overlay - moved to footer for slide-up effect */}
                <div className={`collection-page__about-section ${!aboutOpen ? 'is-hidden' : ''}`}>
                    <div className="collection-page__about-content">
                        <h2 className="collection-page__about-title">About Not An Artist</h2>
                        <p className="collection-page__about-description">
                            Not An Artist is a generative art collection pushing the limits of what's possible on-chain.
                        </p>

                    </div>
                </div>
            </footer >
        </div >
    )
}

export default CollectionPage
