import clsx from 'clsx';
import { Skeleton } from './Skeleton';

function Skeleton({ className, ...props }) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-md bg-slate-200',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
export default Skeleton;