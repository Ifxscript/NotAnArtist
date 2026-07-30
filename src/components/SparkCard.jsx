import './SparkCard.css';

function SparkCard({ title, imageUrl, traits, onClick }) {
    const traitColors = {
        "Palette": 'rgba(255, 84, 0, 0.7)',
        "Art Mode": 'rgba(191, 146, 63, 0.7)',
        "Gear Layout Mode": 'rgba(90, 115, 2, 0.7)'
    };

    return (
        <div className="spark-card" onClick={onClick}>
            <div className="spark-card__image">
                <img
                    src={imageUrl}
                    alt={title}
                    loading="lazy"
                    decoding="async"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div className="spark-card__info">
                    <span className="spark-card__title">{title}</span>

                    <div className="spark-card__traits">
                        {Object.entries(traits).map(([trait, value]) => (
                            <span
                                key={trait}
                                className="spark-card__trait"
                                style={{ backgroundColor: traitColors[trait] }}
                            >
                                {value}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SparkCard;
