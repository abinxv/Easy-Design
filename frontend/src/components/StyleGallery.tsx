import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import styleMinimalist from "@/assets/style-minimalist.jpg";
import styleScandinavian from "@/assets/style-scandinavian.jpg";
import styleIndustrial from "@/assets/style-industrial.jpg";
import styleBohemian from "@/assets/style-bohemian.jpg";
import styleMidcentury from "@/assets/style-midcentury.jpg";
import styleContemporary from "@/assets/style-contemporary.jpg";

const styles = [
  { name: "Minimalist", image: styleMinimalist, description: "Clean lines, neutral tones, and purposeful simplicity." },
  { name: "Scandinavian", image: styleScandinavian, description: "Light woods, cozy textiles, and warm functionality." },
  { name: "Industrial", image: styleIndustrial, description: "Raw materials, exposed elements, and urban character." },
  { name: "Bohemian", image: styleBohemian, description: "Eclectic patterns, natural textures, and free spirit." },
  { name: "Mid-Century", image: styleMidcentury, description: "Retro elegance with iconic forms and warm woods." },
  { name: "Contemporary", image: styleContemporary, description: "Sophisticated luxury with bold accents and marble." },
];

const StyleGallery = () => {
  return (
    <section className="py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Explore Design <span className="text-gradient-warm">Styles</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto font-body">
            Discover aesthetics that resonate with your personality and lifestyle.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {styles.map((style, index) => (
            <motion.div
              key={style.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="group cursor-pointer"
            >
              <div className="relative overflow-hidden rounded-2xl shadow-card hover:shadow-elevated transition-all duration-500">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={style.image}
                    alt={`${style.name} interior design`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <h3 className="font-display text-2xl font-bold text-primary-foreground mb-1">{style.name}</h3>
                  <p className="text-primary-foreground/80 text-sm font-body">{style.description}</p>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm p-4 group-hover:translate-y-full transition-transform duration-300">
                  <h3 className="font-display text-lg font-semibold text-foreground">{style.name}</h3>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Link
            to="/styles"
            className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all duration-200"
          >
            View all styles
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default StyleGallery;
