import { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, X, ChevronLeft, ChevronRight, ChevronDown, ArrowRight } from 'lucide-react';
import './SparkModal.css';
import imageUrls from '../image-urls.json';
import imageUrlsV2 from '../image-urls-v2.json';

function SparkModal({ isOpen, onClose, data, allCats, currentIndex, onNavigate, theme }) {
    const [inscriptionData, setInscriptionData] = useState(null);
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [iframeKey, setIframeKey] = useState(0);

    // Collapsible sections state
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [traitsOpen, setTraitsOpen] = useState(true);
    const [activityOpen, setActivityOpen] = useState(false);

    // Copy feedback state
    const [copiedField, setCopiedField] = useState(null);
    const [exportingMp4, setExportingMp4] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [exportingImg, setExportingImg] = useState(false);
    const [exportingGif, setExportingGif] = useState(false);

    const isMobileDevice = () => {
        return typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    };

    const mobileShareFile = async (url, fileName, mimeType) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Fetch failed');
            const blob = await response.blob();
            const file = new File([blob], fileName, { type: mimeType });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file] });
                return true;
            }
        } catch (err) {
            // AbortError means user dismissed share sheet — not a real error
            if (err.name === 'AbortError') return true;
            console.warn('Share failed, falling back:', err);
        }
        return false;
    };

    const handleDownloadImage = async () => {
        if (exportingImg) return;
        setExportingImg(true);
        const imageUrl = `https://pub-1c9aac54d246404cb44afe546cc7a9d2.r2.dev/images-1350x1800/${data.inscriptionId}.jpg`;
        const fileName = `motor-nft-${data.inscriptionId}.jpg`;

        try {
            if (isMobileDevice()) {
                const shared = await mobileShareFile(imageUrl, fileName, 'image/jpeg');
                if (!shared) {
                    // Fallback: open image directly so user can long-press to save
                    window.open(imageUrl, '_blank');
                }
                return;
            }

            // Desktop: fetch blob and trigger download
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error('Failed to fetch image');
            const rawBlob = await response.blob();
            const jpegBlob = new Blob([rawBlob], { type: 'image/jpeg' });
            const blobUrl = window.URL.createObjectURL(jpegBlob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
        } catch (err) {
            console.error('Error downloading image:', err);
            window.open(imageUrl, '_blank');
        } finally {
            setExportingImg(false);
        }
    };

    const handleDownloadMp4 = async () => {
        if (exportingMp4) return;
        setExportingMp4(true);
        setDownloadProgress(0);
        const videoUrl = `https://pub-1c9aac54d246404cb44afe546cc7a9d2.r2.dev/videos-v2/${data.inscriptionId}.mp4`;
        const fileName = `motor-nft-${data.inscriptionId}.mp4`;

        try {
            if (isMobileDevice()) {
                // Mobile: simple fetch (no streaming getReader — breaks on iOS Safari)
                setDownloadProgress(30);
                const response = await fetch(videoUrl, { mode: 'cors' });
                if (!response.ok) throw new Error('Failed to fetch video');
                setDownloadProgress(60);
                const blob = await response.blob();
                setDownloadProgress(90);
                const mp4Blob = new Blob([blob], { type: 'video/mp4' });
                const file = new File([mp4Blob], fileName, { type: 'video/mp4' });

                // Try Web Share API first (enables Save Video to Photos + Share to X)
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    setDownloadProgress(100);
                    await navigator.share({ files: [file] });
                } else {
                    // Fallback: blob download
                    const blobUrl = window.URL.createObjectURL(mp4Blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
                }
                return;
            }

            // Desktop: stream with progress
            const response = await fetch(videoUrl);
            if (!response.ok) throw new Error('Failed to fetch video');

            const contentLength = response.headers.get('content-length');
            const total = contentLength ? parseInt(contentLength, 10) : 0;
            let loaded = 0;

            const reader = response.body.getReader();
            const chunks = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                loaded += value.length;
                if (total) {
                    setDownloadProgress(Math.round((loaded / total) * 100));
                }
            }

            const blob = new Blob(chunks, { type: 'video/mp4' });
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error downloading video:', err);
                // Last resort: open video URL directly
                window.open(videoUrl, '_blank');
            }
        } finally {
            setExportingMp4(false);
            setDownloadProgress(0);
        }
    };




    const handleDownloadGif = async () => {
        if (exportingGif) return;
        setExportingGif(true);
        // Direct GIF URL if available on R2, or fallback to MP4 video format
        const gifUrl = `https://pub-1c9aac54d246404cb44afe546cc7a9d2.r2.dev/videos-v2/${data.inscriptionId}.gif`;
        const fallbackMp4Url = `https://pub-1c9aac54d246404cb44afe546cc7a9d2.r2.dev/videos-v2/${data.inscriptionId}.mp4`;

        if (isMobileDevice()) {
            window.open(gifUrl, '_blank');
            setExportingGif(false);
            return;
        }

        try {
            const res = await fetch(gifUrl);
            if (!res.ok) throw new Error('GIF not available');
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `motor-nft-${data.inscriptionId}.gif`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch (err) {
            console.warn('GIF direct download unavailable, opening media:', err);
            window.open(fallbackMp4Url, '_blank');
        } finally {
            setExportingGif(false);
        }
    };

    // Mobile portrait detection - immediate check to prevent layout shift
    const [isMobilePortrait, setIsMobilePortrait] = useState(() => {
        const width = typeof window !== 'undefined' ? window.innerWidth : 1100;
        const height = typeof window !== 'undefined' ? window.innerHeight : 0;
        return width < 1100 && height > width;
    });

    const [loadInteractive, setLoadInteractive] = useState(false);

    useEffect(() => {
        const handleMessage = (e) => {
            if (e.data && e.data.type === 'DOWNLOAD_MEDIA') {
                const link = document.createElement('a');
                link.href = e.data.dataUrl;
                link.download = e.data.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setExportingGif(false);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        const checkMobilePortrait = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            setIsMobilePortrait(width < 1100 && height > width);
        };

        window.addEventListener('resize', checkMobilePortrait);
        return () => window.removeEventListener('resize', checkMobilePortrait);
    }, []);

    // Fetch data when modal opens or data changes
    useEffect(() => {
        if (isOpen && data) {
            setLoading(true);
            setTransfers([]);

            // Fetch inscription details from ordinals.com
            const fetchOrdinals = fetch(`https://ordinals.com/r/inscription/${data.inscriptionId}`)
                .then(res => res.json());

            // Fetch transfer history from Hiro API
            const fetchTransfers = fetch(`https://api.hiro.so/ordinals/v1/inscriptions/${data.inscriptionId}/transfers`)
                .then(res => res.json());

            Promise.all([fetchOrdinals, fetchTransfers])
                .then(([inscData, transferData]) => {
                    setInscriptionData(inscData);
                    setTransfers(transferData.results || []);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Error fetching data:', err);
                    setLoading(false);
                });
            
            // Always reset interactive state when switching cards or opening
            setLoadInteractive(false);
        }
    }, [isOpen, data?.inscriptionId]);

    if (!isOpen || !data) return null;

    // Trait inscription mapping for loading images
    const traitsData = {
        pet: [
            { name: "pepe", inscriptionId: "0c468dc10886b2bdd9a07d64faa9d416a16913ae451b86e7a105eb22655b288ei0" },
            { name: "Gizmo", inscriptionId: "d761251b9eb961a7d0e1e2b235fd40311867ac75804b2da1f0f672184ec64381i0" },
            { name: "Puppet", inscriptionId: "954410fdd7ed60bf6cfdb88c729d4efbad3f55d7b7eda1dae05aec541eaadecei0" },
            { name: "Weirdos", inscriptionId: "dc69638099fa86b68fc32b23a08e98c6cadf2532f3d67dc28494a9586a2d3a80i0" }
        ],
        ears: [
            { name: "Ear1", inscriptionId: "c8d8dabdc82e0287121725027f3b0b4870f58854694c87920ab0e791510109f1i0" },
            { name: "Ear2", inscriptionId: "7e93d485a67137f252db722ed157ca11bfe758ef5d0fb62d96ac808403a4a8d2i0" },
            { name: "Ear3", inscriptionId: "ad682a9ffaa79d4fe10354b096deefa57b7bf629d91b8af647bf519ffa10e078i0" },
            { name: "Ear4", inscriptionId: "fcfc44ce4713572b781ff1d23aca7774799ca8b6f1aaf54a3a1b2bc1547c7965i0" },
            { name: "Ear5", inscriptionId: "0834a972aaec679b0fbd0a9b9857561e78952f0ef4b20fb1687b951c68dfaf46i0" }
        ],
        eyes: [
            { name: "Eyes1", inscriptionId: "47b18c592399aaf87c3cc2e63034002853057fa4ac50c3c29d5b15812a816015i0" },
            { name: "Eyes2", inscriptionId: "af4a33e5412662b7af85767662d73bb43df8374ff7da36d148443f7f0f464384i0" },
            { name: "Eyes3", inscriptionId: "fd8ad3da0cc297f04d25fcc84ae6f49d1e7f662b2fbbefb059e0f22a2deab758i0" },
            { name: "Eyes4", inscriptionId: "79eb8bf35c705bcae0bd093a74420a917e5c8f6174ec943b153aa5e8c40392d7i0" },
            { name: "Eyes5", inscriptionId: "de1fa1adc444e0e31874f9271130fa85e0f458b1da1b4b7ddbc7b7c092583074i0" },
            { name: "Eyesr", inscriptionId: "811262cfa5e536193cef7f6513048b41efbce022b49e620342fe3fa4067deb21i0" }
        ],
        head: [
            { name: "Body1", inscriptionId: "a24035442498fad226c889d18adcfd2bcd7e3a18d0284f48ae70645a8fffae97i0" },
            { name: "Body2", inscriptionId: "e9a34afd0c71608e09ad5c9fdba29d42670d1532d34dc98f898866adbdeeeed4i0" },
            { name: "Body3", inscriptionId: "0c6d62a486c7f9fabb7d1f178d635c34d62f81b09278680a454c392db3d36a96i0" },
            { name: "Body4", inscriptionId: "22d7acd678665ff0182788d6433884f6fa910a80d766c92a6770e2a9e00c4d0di0" }
        ],
        mouth: [
            { name: "Mouth1", inscriptionId: "a784de5819e052709389590fa6c41fb679cb921364c5819967eef9ec26e3db9di0" },
            { name: "Mouth2", inscriptionId: "6ff511ea33c8e3081ffcdc71706bce139d218b95abf9c0bf367e48f7e15456c1i0" },
            { name: "Mouth3", inscriptionId: "11bb889a1dd6726c2d77daf7c0069c3aee8b63d4ec65c322351d100758e28553i0" },
            { name: "Mouth4", inscriptionId: "d97f22b5addada477933f49aa36f3eb15ca67ae0e363212557a337fb1a1f6bf5i0" },
            { name: "Mouth5", inscriptionId: "19ae2693fec97015ca7ea99e3f3b21c0e5bf422373c1355f5dd1525519638dfai0" }
        ],
        outfit: [
            { name: "Greenshirt", inscriptionId: "2449cc4d078d80141a91997097d1e28738320fee90e49cf630805708fa482839i0" },
            { name: "Hoodie", inscriptionId: "a8dd265c8ad9e0d63f08c50cae7a57b54a41e3f3723985d1f1ffd43a46972f25i0" },
            { name: "Rockstar", inscriptionId: "ab6db5c7d5455fced3bf744aa13ae2d7a1ceab7533fa211fc4f6112e106fa99ai0" },
            { name: "Suit", inscriptionId: "725a97374ab963f1ef6a6dbc0bdc000cc24ea934c1ec6e828a097132c364fbdei0" },
            { name: "Vest", inscriptionId: "7f97b7406ca9015257d8371f7338a910a578002db1ea5fdb68990e2c371555bdi0" }
        ]
    };

    // Get inscription ID for a trait value
    const getTraitInscriptionId = (traitType, traitValue) => {
        const traits = traitsData[traitType];
        if (!traits) return null;
        const trait = traits.find(t => t.name.toLowerCase() === traitValue.toLowerCase());
        return trait ? trait.inscriptionId : null;
    };

    // Format timestamp to readable date
    const formatDate = (timestamp) => {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Shorten address for display
    const shortenAddress = (addr) => {
        if (!addr) return 'Unknown';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    // Shorten ID for display (longer truncation)
    const shortenId = (id) => {
        if (!id) return 'Unknown';
        return `${id.slice(0, 12)}...${id.slice(-6)}`;
    };

    // Format relative time (e.g., "1 day ago")
    const formatRelativeTime = (timestamp) => {
        if (!timestamp) return '';
        const now = Date.now();
        const date = new Date(timestamp * 1000);
        const diffMs = now - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'today';
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 30) return `${diffDays} days ago`;
        if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return months === 1 ? '1 month ago' : `${months} months ago`;
        }
        const years = Math.floor(diffDays / 365);
        return years === 1 ? '1 year ago' : `${years} years ago`;
    };

    // Copy to clipboard with feedback
    const handleCopy = (value, fieldName) => {
        navigator.clipboard.writeText(value).then(() => {
            setCopiedField(fieldName);
            setTimeout(() => setCopiedField(null), 1500);
        });
    };

    // Get neighbor thumbnails (2 before, current, 2 after)
    const getNeighbors = () => {
        if (!allCats || currentIndex === null) return [];
        const neighbors = [];
        for (let i = -2; i <= 2; i++) {
            const idx = currentIndex + i;
            if (idx >= 0 && idx < allCats.length) {
                neighbors.push({
                    index: idx,
                    cat: allCats[idx],
                    isCurrent: i === 0
                });
            }
        }
        return neighbors;
    };

    // Refresh canvas (reload iframe)
    const handleRefresh = () => {
        setIframeKey(prev => prev + 1);
    };

    // Open on ordinals.com
    const handleOpenOrdinals = () => {
        window.open(`https://ordinals.com/inscription/${data.inscriptionId}`, '_blank');
    };

    const neighbors = getNeighbors();

    return (
        <div className={`spark-modal ${theme || 'dark'} ${isMobilePortrait ? 'mobile-portrait' : ''}`}>
            <div className="spark-modal__backdrop" onClick={onClose} />

            {/* Navigation Bar - Minimal on mobile */}
            <div className="spark-modal__navbar">
                {/* Left Icons */}
                <div className="spark-modal__navbar-left">
                    <button
                        className="spark-modal__navbar-icon"
                        onClick={handleRefresh}
                        title="Refresh Canvas"
                    >
                        ↻
                    </button>

                    <button
                        className="spark-modal__navbar-icon"
                        onClick={onClose}
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Right - Thumbnail Gallery (hidden on mobile portrait) */}
                {!isMobilePortrait && (
                    <div className="spark-modal__navbar-right">
                        <button
                            className="spark-modal__navbar-arrow"
                            onClick={() => onNavigate(currentIndex - 1)}
                            disabled={currentIndex <= 0}
                            title="Previous"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="spark-modal__thumbnails">
                            {neighbors.map(({ index, cat, isCurrent }) => (
                                <button
                                    key={index}
                                    className={`spark-modal__thumbnail ${isCurrent ? 'active' : ''}`}
                                    onClick={() => onNavigate(index)}
                                >
                                    <img
                                        src={`/images-v2/${cat.inscriptionId}.jpg`}
                                        alt={`Motor #${String(index + 1).padStart(3, '0')}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                </button>
                            ))}
                        </div>

                        <button
                            className="spark-modal__navbar-arrow"
                            onClick={() => onNavigate(currentIndex + 1)}
                            disabled={currentIndex >= allCats?.length - 1}
                            title="Next"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>

            <div className="spark-modal__canvas">
                {/* Image Panel - First on mobile */}
                <div className="spark-modal__image-container">
                    <iframe
                        key={data.inscriptionId}
                        src={data.iframeUrl}
                        title={data.title}
                        className="spark-modal__image"
                        sandbox="allow-scripts allow-same-origin allow-downloads"
                    />
                </div>

                {/* Thumbnail Strip - Only on mobile portrait, below image */}
                {isMobilePortrait && (
                    <div className="spark-modal__thumbnail-strip">
                        <button
                            className="spark-modal__navbar-arrow"
                            onClick={() => onNavigate(currentIndex - 1)}
                            disabled={currentIndex <= 0}
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="spark-modal__thumbnails">
                            {neighbors.map(({ index, cat, isCurrent }) => (
                                <button
                                    key={index}
                                    className={`spark-modal__thumbnail ${isCurrent ? 'active' : ''}`}
                                    onClick={() => onNavigate(index)}
                                >
                                    <img
                                        src={`/images-v2/${cat.inscriptionId}.jpg`}
                                        alt={`Motor #${String(index + 1).padStart(3, '0')}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                </button>
                            ))}
                        </div>

                        <button
                            className="spark-modal__navbar-arrow"
                            onClick={() => onNavigate(currentIndex + 1)}
                            disabled={currentIndex >= allCats?.length - 1}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}

                {/* Info Panel */}
                <div className="spark-modal__info">
                    <span className="spark-modal__title">{data.title}</span>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', marginTop: '8px', marginBottom: '24px', width: 'fit-content' }}>
                        <span style={{ fontSize: '11px', color: '#ffffff', fontFamily: 'monospace', fontWeight: '700', letterSpacing: '0.05em' }}>ID: {data.inscriptionId}</span>
                        <button
                            className={`spark-modal__copy-btn ${copiedField === 'id' ? 'copied' : ''}`}
                            onClick={() => handleCopy(data.inscriptionId, 'id')}
                            title="Copy ID"
                            style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: '0', display: 'inline-flex', alignItems: 'center', transition: 'color 0.2s' }}
                        >
                            {copiedField === 'id' ? <Check size={12} style={{ color: '#00e676' }} /> : <Copy size={12} />}
                        </button>
                    </div>

                    {/* Traits Section - Simple Collapsible Toggle List */}
                    <div className="spark-modal__section" style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '16px' }}>
                        <button
                            className={`spark-modal__section-header ${traitsOpen ? 'expanded' : ''}`}
                            onClick={() => setTraitsOpen(!traitsOpen)}
                            style={{ display: 'flex', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', padding: '0 0 12px 0', cursor: 'pointer', borderBottom: traitsOpen ? '1px solid rgba(255, 255, 255, 0.08)' : 'none', marginBottom: traitsOpen ? '16px' : '0', transition: 'all 0.3s ease' }}
                        >
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'monospace' }}>TRAITS</span>
                            <span style={{ color: '#888' }}>{traitsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                        </button>
                        {traitsOpen && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {Object.entries(data.traits).map(([traitType, traitValue]) => {
                                    let displayType = traitType;
                                    if (traitType === "Gear Layout Mode") displayType = "Layout";
                                    return (
                                        <div 
                                            key={traitType} 
                                            style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center', 
                                                padding: '10px 14px', 
                                                background: 'rgba(255, 255, 255, 0.02)', 
                                                borderRadius: '6px', 
                                                border: '1px solid rgba(255, 255, 255, 0.04)' 
                                            }}
                                            className="spark-modal__trait-row-hover"
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '20px' }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff', display: 'inline-block', flexShrink: 0 }}></span>
                                                <span style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.08em', fontFamily: 'monospace', lineHeight: '1' }}>{displayType}</span>
                                            </div>
                                            <span style={{ fontSize: '12px', color: '#fff', fontWeight: '700', fontFamily: 'monospace', lineHeight: '1', textAlign: 'right' }}>{traitValue}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                        <button
                            onClick={handleDownloadImage}
                            disabled={exportingImg}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                background: exportingImg 
                                    ? 'rgba(255, 255, 255, 0.4)' 
                                    : 'linear-gradient(135deg, #ffffff, #e0e0e0)',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#000000',
                                fontWeight: '700',
                                fontSize: '13px',
                                fontFamily: 'monospace',
                                cursor: exportingImg ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 14px rgba(255, 255, 255, 0.25)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {exportingImg ? 'Downloading High Res Image...' : 'Download High Res Image'}
                        </button>

                        <button
                            onClick={handleDownloadMp4}
                            disabled={exportingMp4}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '8px',
                                color: '#ffffff',
                                fontWeight: '700',
                                fontSize: '13px',
                                fontFamily: 'monospace',
                                cursor: exportingMp4 ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {exportingMp4 
                                ? (downloadProgress > 0 ? `Downloading 10s Video (${downloadProgress}%)...` : 'Downloading 10s Video...') 
                                : 'Download 10s Video'}
                        </button>
                    </div>


                </div>
            </div>
        </div>
    );
}

export default SparkModal;
