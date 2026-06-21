import './About.css';

export default function About() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="container">
          <img src="/images/logo.png" alt="Nayakar Pure" className="about-logo" />
          <h1>About Nayakar Pure</h1>
          <p className="about-tagline">Nature's Goodness in Every Bite</p>
        </div>
      </section>

      <section className="container about-content">
        <div className="about-grid">
          <div className="about-text">
            <h2>Our Story</h2>
            <p>
              Nayakar Pure was born from a simple belief — that food should be pure, honest, and nourishing.
              We started with a passion for creating the finest natural peanut butter, made from handpicked
              quality peanuts and nothing else.
            </p>
            <p>
              Every jar of Nayakar Pure peanut butter is crafted with care, roasted to perfection, and
              packed with protein and healthy fats. We never use preservatives, artificial additives, or
              refined sugars. Just real ingredients for real nutrition.
            </p>
          </div>
          <div className="about-image card">
            <img src="/images/banner.png" alt="Nayakar Pure Products" />
          </div>
        </div>

        <div className="values-section">
          <h2 className="section-title">What We Stand For</h2>
          <div className="values-grid">
            <div className="value-card card">
              <span className="value-icon">🌱</span>
              <h3>100% Natural</h3>
              <p>Made from quality peanuts with no artificial ingredients. Simple ingredients, true nutrition.</p>
            </div>
            <div className="value-card card">
              <span className="value-icon">💪</span>
              <h3>Rich in Protein</h3>
              <p>Packed with plant-based protein and healthy fats to fuel your active lifestyle.</p>
            </div>
            <div className="value-card card">
              <span className="value-icon">🛡️</span>
              <h3>Zero Compromise</h3>
              <p>No preservatives, no shortcuts. Pure goodness in every spoonful — that's our promise.</p>
            </div>
            <div className="value-card card">
              <span className="value-icon">❤️</span>
              <h3>Made with Love</h3>
              <p>Every batch is made with the same care we'd give our own family. Eat natural, live healthy.</p>
            </div>
          </div>
        </div>

        <div className="mission-section card">
          <h2>Our Mission</h2>
          <p className="mission-text">
            "Eat Natural. Live Healthy. Stay Pure."
          </p>
          <p>
            We aim to bring wholesome, natural food to every Indian household. Whether it's creamy,
            crunchy, or chocolate peanut butter — Nayakar Pure is your trusted partner for clean,
            nutritious eating.
          </p>
        </div>
      </section>
    </div>
  );
}
