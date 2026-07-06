import clsx from 'clsx';

const Label = ({ className, htmlFor, ...props }) => {
  return (
    <label
      htmlFor={htmlFor}
      className={clsx(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    />
  );
};

export { Label };
export default Label;