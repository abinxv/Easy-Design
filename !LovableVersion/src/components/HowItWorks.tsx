import { motion } from "framer-motion";
import { Upload, Cpu, Palette, Lightbulb } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload Your Room",
    description: "Take a photo of any room and upload it to our platform.",
  },
  {
    icon: Cpu,
    title: "AI Analysis",
    description: "Our AI identifies furniture, colors, lighting, and room type.",
  },
  {
    icon: Palette,
    title: "Get Recommendations",
    description: "Receive personalized color palettes, furniture, and style ideas.",
  },
  {
    icon: Lightbulb,
    title: "Visualize & Apply",
    description: "Browse curated suggestions and bring your vision to life.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            How It <span className="text-gradient-warm">Works</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto font-body">
            Four simple steps to transform your space with AI-powered design intelligence.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative group"
            >
              <div className="bg-card rounded-2xl p-8 shadow-card hover:shadow-elevated transition-shadow duration-300 h-full border border-border">
                <div className="w-14 h-14 rounded-xl gradient-warm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="text-sm font-bold text-primary mb-2 font-body">Step {index + 1}</div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground font-body leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
