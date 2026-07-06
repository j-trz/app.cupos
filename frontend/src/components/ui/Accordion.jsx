import React, { useState } from 'react';
import clsx from 'clsx';

const Accordion = ({ type = 'single', children, className, ...props }) => {
  const [activeItems, setActiveItems] = useState([]);

  const toggleItem = (value) => {
    if (type === 'single') {
      setActiveItems(prev => prev[0] === value ? [] : [value]);
    } else {
      setActiveItems(prev => 
        prev.includes(value) 
          ? prev.filter(item => item !== value) 
          : [...prev, value]
      );
    }
  };

  const contextValue = {
    activeItems,
    toggleItem
  };

  return (
    <div className={clsx('w-full', className)} {...props}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { ...child.props, accordionContext: contextValue })
      )}
    </div>
  );
};

const AccordionItem = ({ value, children, className, ...props }) => {
  return (
    <div className={clsx('border-b', className)} {...props}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { ...child.props, itemValue: value })
      )}
    </div>
  );
};

const AccordionTrigger = ({ children, className, accordionContext, itemValue, ...props }) => {
  const { activeItems, toggleItem } = accordionContext;

  const handleClick = () => {
    toggleItem(itemValue);
  };

  return (
    <div
      className={clsx(
        'flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180',
        className
      )}
      onClick={handleClick}
      data-state={activeItems.includes(itemValue) ? 'open' : 'closed'}
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
    </div>
  );
};

const AccordionContent = ({ children, className, accordionContext, itemValue, ...props }) => {
  const { activeItems } = accordionContext;

  const isOpen = activeItems.includes(itemValue);

  return (
    <div
      className={clsx(
        'overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
        className
      )}
      data-state={isOpen ? 'open' : 'closed'}
      {...props}
    >
      <div className="pb-4 pt-0">
        {isOpen && children}
      </div>
    </div>
  );
};

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };