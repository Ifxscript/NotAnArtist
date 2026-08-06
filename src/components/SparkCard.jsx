import './SparkCard.css';

function SparkCard({ title, imageUrl, traits, onClick }) {
    // Extract token number if present (e.g. "MOTOR #001")
    const match = title ? title.match(/(#\d+)/) : null;
    const tokenNum = match ? match[1] : '';
    const cleanTitle = match ? title.replace(/(#\d+)/, '').trim() : title;

    return (
        <div className="spark-card" onClick={onClick}>
            <div className="spark-card__image-container">
                <img
                    src={imageUrl}
                    alt={title}
                    loading="lazy"
                    decoding="async"
                    className="spark-card__image"
                />
            </div>
            <div className="spark-card__info-box">
                <div className="spark-card__header">
                    <span className="spark-card__title">{cleanTitle || title}</span>
                    {tokenNum && <span className="spark-card__token-id">{tokenNum}</span>}
                </div>

                {traits && Object.keys(traits).length > 0 && (
                    <div className="spark-card__traits">
                        {Object.entries(traits).map(([trait, value]) => (
                            <span key={trait} className="spark-card__trait-pill">
                                {value}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default SparkCard;

