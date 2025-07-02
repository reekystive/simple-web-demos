import { motion } from 'motion/react';
import { FC, useId } from 'react';

/** cspell:disable */
const LOREM_IPSUM = `
Cupidatat aute aliqua laborum proident laborum consectetur exercitation. Voluptate anim laboris mollit esse nulla quis duis anim voluptate magna id amet labore sit elit. Ea dolor nulla tempor aute excepteur eu tempor. Nisi veniam sunt non proident exercitation dolor occaecat dolore duis magna reprehenderit nisi sit. Irure cillum magna non magna est ullamco nisi in qui velit nulla ullamco. Eiusmod velit voluptate enim cillum duis quis ea mollit qui eiusmod anim exercitation non id minim. Excepteur consectetur dolore aliquip consequat enim cupidatat elit do aute incididunt excepteur.
Ex ad adipisicing esse et voluptate velit. Dolor amet ullamco cillum elit non duis laboris. Qui ipsum sint dolor Lorem dolore esse sunt elit aute reprehenderit in. Exercitation consequat incididunt adipisicing aute consequat ex ullamco elit. Aliquip dolore exercitation occaecat labore aute non culpa aute. Mollit occaecat aliqua ullamco nulla dolor culpa ea officia veniam do adipisicing. Proident est deserunt laboris cupidatat labore velit qui pariatur proident enim dolore.
Eu incididunt nulla officia culpa voluptate enim. Elit consequat proident dolor eu minim aute exercitation eiusmod ex voluptate laboris. Cillum id ullamco ipsum qui et qui velit aute ipsum excepteur deserunt. Do cillum deserunt eiusmod velit voluptate minim. Est cillum id nulla minim. Ea et ipsum voluptate esse magna.
Aliquip anim do nulla et ipsum quis fugiat cupidatat deserunt tempor elit. Anim incididunt cupidatat mollit. Est aliqua non tempor fugiat exercitation Lorem ea cupidatat. Id irure cupidatat sit id velit culpa. Dolore quis est id id incididunt veniam dolore adipisicing commodo pariatur ullamco mollit reprehenderit id. Et esse elit adipisicing. Sint duis elit amet do elit labore consequat consequat dolore.
Eiusmod nisi proident nostrud Lorem voluptate. Exercitation elit labore tempor exercitation qui in mollit nulla sunt anim magna nulla dolor. Sit culpa non adipisicing exercitation do ut do nulla elit esse in consequat fugiat in est. Cupidatat eiusmod nisi ipsum duis culpa commodo culpa. Aute tempor nulla commodo. Sint do cupidatat occaecat occaecat labore dolore et Lorem qui reprehenderit elit pariatur enim duis nostrud. Ipsum ad tempor cillum velit pariatur amet et ad sit eiusmod magna anim laborum cillum est. Eiusmod eiusmod eiusmod nisi Lorem id fugiat fugiat pariatur quis officia commodo.
`;
/** cspell:enable */

export const SvgGradientMask: FC = () => {
  const id = useId();
  const gradientId = `${id}-gradient`;
  const maskId = `${id}-mask`;

  const animatedGradientId = `${id}-animated-gradient`;
  const animatedMaskId = `${id}-animated-mask`;
  const invertFilterId = `${id}-invert-filter`;
  const invertMaskId = `${id}-invert-mask`;
  const invertAnimatedMaskId = `${id}-invert-animated-mask`;

  return (
    <div className="items-center-safe flex min-h-screen flex-col justify-center gap-6 py-6">
      {/* static svg mask */}
      <h2 className="-mb-2 text-lg font-bold uppercase">Static Svg Mask</h2>
      <div className="relative flex flex-row items-center justify-center gap-4 bg-neutral-900 p-8">
        <svg className="absolute size-20" viewBox="0 0 1 1">
          <defs>
            <linearGradient gradientUnits="objectBoundingBox" id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="40%" stopColor="white" />
              <stop offset="60%" stopColor="black" />
            </linearGradient>

            <mask maskContentUnits="objectBoundingBox" id={maskId}>
              <rect width="100%" height="100%" fill={`url(#${gradientId})`} />
            </mask>
          </defs>
        </svg>

        <svg className="h-[400px] w-[200px]" viewBox="0 0 100 200">
          <rect width="100%" height="100%" fill={`url(#${gradientId})`} />
        </svg>

        <svg className="h-[400px] w-[200px]" viewBox="0 0 100 200">
          <rect width="100%" height="100%" className="fill-amber-600" mask={`url(#${maskId})`} />
        </svg>

        <div
          className="h-[400px] w-[200px] overflow-hidden bg-red-200 p-2 dark:bg-red-900"
          style={{ maskImage: `url(#${maskId})` }}
        >
          {LOREM_IPSUM}
        </div>
      </div>

      {/* static svg mask with invert filter */}
      <h2 className="-mb-2 text-lg font-bold uppercase">Static Svg Mask with Invert Filter</h2>
      <div className="relative flex flex-row items-center justify-center gap-4 bg-neutral-900 p-8">
        <svg className="absolute size-20" viewBox="0 0 1 1">
          <defs>
            <filter id={invertFilterId} colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="
              -1 0 0 0 1
              0 -1 0 0 1
              0 0 -1 0 1
              0 0 0 1 0"
              />
            </filter>

            <mask maskContentUnits="objectBoundingBox" id={invertMaskId}>
              <rect width="100%" height="100%" fill={`url(#${gradientId})`} filter={`url(#${invertFilterId})`} />
            </mask>
          </defs>
        </svg>

        <svg className="h-[400px] w-[200px]" viewBox="0 0 100 200">
          <rect width="100%" height="100%" className="fill-amber-600" mask={`url(#${maskId})`} />
        </svg>

        <svg className="h-[400px] w-[200px]" viewBox="0 0 100 200">
          <rect width="100%" height="100%" className="fill-amber-600" mask={`url(#${invertMaskId})`} />
        </svg>

        <div
          className="h-[400px] w-[200px] overflow-hidden bg-red-200 p-2 dark:bg-red-900"
          style={{ maskImage: `url(#${invertMaskId})` }}
        >
          {LOREM_IPSUM}
        </div>
      </div>

      {/* animated svg mask (animate stops) */}
      <h2 className="-mb-2 text-lg font-bold uppercase">Animated Svg Mask (Animate stops)</h2>
      <div className="relative flex flex-row items-center justify-center gap-4 bg-neutral-900 p-8">
        <svg className="absolute size-20" viewBox="0 0 1 1">
          <defs>
            <linearGradient gradientUnits="objectBoundingBox" id={animatedGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <motion.stop
                initial={{ offset: '-20%' }}
                animate={{ offset: '100%' }}
                transition={{ type: 'tween', ease: 'linear', duration: 3, repeat: Infinity, repeatDelay: 1 }}
                stopColor="white"
              />
              <motion.stop
                initial={{ offset: '0%' }}
                animate={{ offset: '120%' }}
                transition={{ type: 'tween', ease: 'linear', duration: 3, repeat: Infinity, repeatDelay: 1 }}
                stopColor="black"
              />
            </linearGradient>

            <mask maskContentUnits="objectBoundingBox" id={animatedMaskId}>
              <rect width="100%" height="100%" fill={`url(#${animatedGradientId})`} />
            </mask>

            <mask maskContentUnits="objectBoundingBox" id={invertAnimatedMaskId}>
              <rect
                width="100%"
                height="100%"
                fill={`url(#${animatedGradientId})`}
                filter={`url(#${invertFilterId})`}
              />
            </mask>
          </defs>
        </svg>

        <div
          className="h-[400px] w-[200px] overflow-hidden bg-red-200 p-2 dark:bg-red-900"
          style={{ maskImage: `url(#${animatedMaskId})` }}
        >
          {LOREM_IPSUM}
        </div>

        <div
          className="h-[400px] w-[200px] overflow-hidden bg-red-200 p-2 dark:bg-red-900"
          style={{ maskImage: `url(#${invertAnimatedMaskId})` }}
        >
          {LOREM_IPSUM}
        </div>

        <div className="h-[400px] w-[200px] overflow-hidden" style={{ maskImage: `url(#${animatedMaskId})` }}>
          {LOREM_IPSUM}
        </div>

        <div className="relative h-[400px] w-[200px] overflow-hidden">
          <div className="size-full" style={{ maskImage: `url(#${animatedMaskId})` }}>
            {LOREM_IPSUM}
          </div>
          <div
            className="absolute inset-0 bg-red-200 p-2 dark:bg-red-900"
            style={{ maskImage: `url(#${invertAnimatedMaskId})` }}
          />
        </div>
      </div>
    </div>
  );
};
