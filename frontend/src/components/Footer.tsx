import { Home, Github } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-foreground py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-warm flex items-center justify-center">
              <Home className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-semibold text-background">
              Easy<span className="text-primary">Design</span>
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-background/60 font-body">
            <Link to="/" className="hover:text-background transition-colors">Home</Link>
            <Link to="/analyze" className="hover:text-background transition-colors">Analyze</Link>
            <Link to="/room-shop" className="hover:text-background transition-colors">Room Shop</Link>
            <Link to="/room-cart" className="hover:text-background transition-colors">Room Cart</Link>
            <Link to="/ai-chatbot" className="hover:text-background transition-colors">AI Chatbot</Link>
            <Link to="/styles" className="hover:text-background transition-colors">Styles</Link>
          </div>

          <div className="flex items-center gap-4">
            <a
              href={"https://github.com/abinxv/Easy-Design/"}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open GitHub repository"
              className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
            >
              <Github className="w-4 h-4 text-background/70" />
            </a>
          </div>
        </div>

        <div className="border-t border-background/10 mt-8 pt-8 text-center">
          <p className="text-sm text-background/40 font-body">
            EasyDesign - AI-powered interior design recommendations.            
          </p>
      
        </div>
      </div>
    </footer>
  );
};

export default Footer;
