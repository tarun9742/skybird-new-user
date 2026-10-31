import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { pageTransition } from "../lib/motion";
import SiteSEO from "./SiteSEO";
import FloatingContactButtons from "./FloatingContactButtons";

export default function Layout() {
  const location = useLocation();
  const outlet = useOutlet();
  // Learning area uses its own dashboard/course navigation, not the public-site navbar/footer.
  const isLearningArea = location.pathname === "/dashboard" || location.pathname.startsWith("/watch/");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteSEO />
      {!isLearningArea && <Navbar />}

      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            exit={pageTransition.exit}
            transition={pageTransition.transition} 
            className="h-full"
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>

      {!isLearningArea && <Footer />}
      {!isLearningArea && <FloatingContactButtons />}
    </div>
  );
}
