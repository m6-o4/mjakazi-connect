"use client";

import { motion } from "motion/react";
import { ReactNode } from "react";

// defines the props for the template component, expecting only children elements.
const template = ({ children }: { children: ReactNode }) => {
	return (
		// motion.div applies animation context to the children elements.
		<motion.div
			// sets the initial state: completely transparent (hidden).
			initial={{ opacity: 0 }}
			// defines the final state: fully visible.
			animate={{ opacity: 1 }}
			// controls the speed and timing curve of the animation.
			transition={{ ease: "easeInOut", duration: 0.75 }}
		>
			{children}
		</motion.div>
	);
};

export { template as default };
