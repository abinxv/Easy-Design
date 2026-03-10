import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import styleMinimalist from "@/assets/style-minimalist.jpg";
import styleScandinavian from "@/assets/style-scandinavian.jpg";
import styleIndustrial from "@/assets/style-industrial.jpg";
import styleBohemian from "@/assets/style-bohemian.jpg";
import styleMidcentury from "@/assets/style-midcentury.jpg";
import styleContemporary from "@/assets/style-contemporary.jpg";

const allStyles = [
  {
    name: "Minimalist",
    image: styleMinimalist,
    description: "Clean lines, neutral tones, and purposeful simplicity. Every piece serves a function.",
    colors: ["#F5F0EB", "#D4C5B0", "#8B8178", "#3D3D3D"],
    keywords: ["Clean", "Functional", "Neutral", "Calm"],
  },
  {
    name: "Scandinavian",
    image: styleScandinavian,
    description: "Light woods, cozy textiles, and warm functionality. Hygge meets design.",
    colors: ["#F5F0EB", "#C4A77D", "#8BA888", "#5C4B3A"],
    keywords: ["Cozy", "Light", "Natural", "Hygge"],
  },
  {
    name: "Industrial",
    image: styleIndustrial,
    description: "Raw materials, exposed elements, and urban character. Bold and unrefined.",
    colors: ["#3D3D3D", "#8B4513", "#B8B8B8", "#2C1810"],
    keywords: ["Raw", "Urban", "Bold", "Exposed"],
  },
  {
    name: "Bohemian",
    image: styleBohemian,
    description: "Eclectic patterns, natural textures, and free spirit. Express your individuality.",
    colors: ["#C4703F", "#8BA888", "#C5A55A", "#6B4E3D"],
    keywords: ["Eclectic", "Colorful", "Textured", "Free"],
  },
  {
    name: "Mid-Century Modern",
    image: styleMidcentury,
    description: "Retro elegance with iconic forms and warm woods. Timeless appeal from the 1950s-60s.",
    colors: ["#C4703F", "#6B4E3D", "#D4B896", "#3D6B5A"],
    keywords: ["Retro", "Iconic", "Warm", "Timeless"],
  },
  {
    name: "Contemporary Luxury",
    image: styleContemporary,
    description: "Sophisticated luxury with bold accents, marble, and precious metals.",
    colors: ["#1A3A4A", "#C5A55A", "#F5F0EB", "#3D3D3D"],
    keywords: ["Luxury", "Marble", "Gold", "Elegant"],
  },
];

const StylesPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Interior Design <span className="text-gradient-warm">Styles</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto font-body">
              Explore popular design aesthetics to find what resonates with you.
            </p>
          </motion.div>

          <div className="space-y-16">
            {allStyles.map((style, index) => (
              <motion.div
                key={style.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className={`flex flex-col ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                } gap-8 items-center`}
              >
                <div className="w-full md:w-1/2">
                  <div className="rounded-2xl overflow-hidden shadow-elevated">
                    <img
                      src={style.image}
                      alt={`${style.name} interior design`}
                      className="w-full aspect-[4/3] object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
                <div className="w-full md:w-1/2 space-y-6">
                  <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                    {style.name}
                  </h2>
                  <p className="text-muted-foreground font-body text-lg leading-relaxed">
                    {style.description}
                  </p>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-3 font-body">Typical Color Palette</p>
                    <div className="flex gap-3">
                      {style.colors.map((hex) => (
                        <div
                          key={hex}
                          className="w-12 h-12 rounded-xl shadow-card border border-border"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {style.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-3 py-1 rounded-full bg-muted text-sm font-medium text-muted-foreground font-body"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StylesPage;
