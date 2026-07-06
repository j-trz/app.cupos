import React, { createContext, useContext } from 'react';
import clsx from 'clsx';

const AccordionContext = createContext();

// Componente principal del accordion
const Accordion = ({ children, type = "single", collapsible = true, className, ...props }) => {
  return (
    <div className={className} {...props}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, {
          type,
          collapsible,
        })
      )}
    </div>
  );
};

// Componente del item del accordion
const AccordionItem = ({ children, className, ...props }) => {
  return (
    <div className={clsx("border-b", className)} {...props}>
      {children}
    </div>
  );
};

// Componente del trigger del accordion
const AccordionTrigger = ({ children, onClick, className, ...props }) => {
  return (
    <h3 className="flex">
      <button
        className={clsx(
          "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
          className
        )}
        onClick={onClick}
        {...props}
      >
        {children}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0 transition-transform duration-200"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </h3>
  );
};

// Componente del contenido del accordion
const AccordionContent = ({ children, className, ...props }) => {
  return (
    <div className={clsx("pb-4 pt-0", className)} {...props}>
      <div>
        {children}
      </div>
    </div>
  );
};

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
export default Accordion;