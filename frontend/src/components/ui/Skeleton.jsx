import clsx from 'clsx';

const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-md bg-slate-200',
        className
      )}
      {...props}
    />
  );
};

export { Skeleton };
export default Skeleton;