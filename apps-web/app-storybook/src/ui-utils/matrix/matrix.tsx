import { cn } from '@monorepo/utils';
import { ComponentType, Fragment, ReactNode } from 'react';

type InferComponentProps<T> = T extends ComponentType<infer P> ? P : T extends (props: infer P) => unknown ? P : never;

interface ComponentPropsContext<
  TMatrix extends Record<string, readonly unknown[]>,
  TSections extends Record<string, readonly unknown[]>,
> {
  matrixProps: CartesianProduct<TMatrix>;
  sectionProps: CartesianProduct<TSections>;
  cellIndex: number;
  sectionIndex: number;
}

type ComponentPropsValue<
  TComponent extends ComponentType<Record<string, unknown>>,
  TMatrix extends Record<string, readonly unknown[]>,
  TSections extends Record<string, readonly unknown[]>,
> = {
  [K in keyof InferComponentProps<TComponent>]?:
    | InferComponentProps<TComponent>[K]
    | ((context: ComponentPropsContext<TMatrix, TSections>) => InferComponentProps<TComponent>[K]);
};

type MatrixDefinition<TComponent extends ComponentType<Record<string, unknown>>> = {
  [K in keyof InferComponentProps<TComponent>]?: readonly InferComponentProps<TComponent>[K][];
} & Record<string, readonly unknown[]>;

// Explicit mapping to ensure type inference works
type SectionsDefinition<TComponent extends ComponentType<Record<string, unknown>>> = {
  [K in keyof InferComponentProps<TComponent>]?: readonly InferComponentProps<TComponent>[K][];
} & Record<string, readonly unknown[]>;

interface MatrixProps<
  TComponent extends ComponentType<Record<string, unknown>>,
  TMatrix extends MatrixDefinition<TComponent>,
  TSections extends SectionsDefinition<TComponent>,
> {
  component: TComponent;
  matrix: TMatrix;
  sections: TSections;
  componentProps?: ComponentPropsValue<TComponent, TMatrix, TSections>;
  render?: (props: Expand<CartesianProduct<TMatrix> & CartesianProduct<TSections>>) => ReactNode;
  className?: string;
  classNames?: {
    matrix?: string;
    section?: string;
  };
  gridSize?: {
    column?: 'identical' | 'fit';
    row?: 'identical' | 'fit';
  };
}

type CartesianProduct<T extends Record<string, readonly unknown[]>> = {
  [K in keyof T]: T[K][number];
};

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

function cartesianProduct<T extends Record<string, readonly unknown[]>>(obj: T): CartesianProduct<T>[] {
  const keys = Object.keys(obj) as (keyof T)[];

  if (keys.length === 0) return [{}] as CartesianProduct<T>[];

  const values = keys.map((key) => obj[key]);

  function generate(index: number, current: Partial<CartesianProduct<T>>): CartesianProduct<T>[] {
    if (index === keys.length) {
      return [current as CartesianProduct<T>];
    }

    const result: CartesianProduct<T>[] = [];
    const key = keys[index];
    const currentValues = values[index];

    if (key && currentValues) {
      for (const value of currentValues) {
        result.push(...generate(index + 1, { ...current, [key as string]: value }));
      }
    }

    return result;
  }

  return generate(0, {});
}

// eslint-disable-next-line react-refresh/only-export-components
export function createMatrixFor<TComponent extends ComponentType<Record<string, unknown>>>(component: TComponent) {
  return function <TMatrix extends MatrixDefinition<TComponent>, TSections extends SectionsDefinition<TComponent>>(
    props: Omit<MatrixProps<TComponent, TMatrix, TSections>, 'component'>
  ) {
    return Matrix({ ...props, component });
  };
}

export function Matrix<
  TComponent extends ComponentType<Record<string, unknown>>,
  TMatrix extends MatrixDefinition<TComponent>,
  TSections extends SectionsDefinition<TComponent>,
>({
  component: Component,
  matrix,
  sections = {} as TSections,
  componentProps = {},
  render,
  className,
  classNames,
  gridSize = {
    column: 'identical',
    row: 'fit',
  },
}: MatrixProps<TComponent, TMatrix, TSections>) {
  const matrixKeys = Object.keys(matrix);
  const [firstKey, secondKey, ...otherKeys] = matrixKeys;

  if (matrixKeys.length < 2) {
    throw new Error('Matrix requires exactly 2 prop dimensions');
  }

  if (otherKeys.length > 0) {
    console.warn(
      `Matrix only uses first 2 props for grid layout. Additional props [${otherKeys.join(', ')}] will be applied to all cells.`
    );
  }

  if (!firstKey || !secondKey) {
    throw new Error('Matrix requires at least 2 prop dimensions');
  }

  const firstValues = matrix[firstKey];
  const secondValues = matrix[secondKey];
  const baseProps = otherKeys.reduce<Partial<CartesianProduct<TMatrix>>>(
    (acc, key) => ({ ...acc, [key]: matrix[key]?.[0] }),
    {}
  );

  const sectionCombinations = cartesianProduct(sections);

  if (sectionCombinations.length === 0) {
    sectionCombinations.push({} as CartesianProduct<TSections>);
  }

  return (
    <div className={cn('flex w-full flex-col items-stretch gap-4 contain-inline-size', className)}>
      {sectionCombinations.map((sectionProps, sectionIndex) => {
        const sectionTitle = Object.entries(sectionProps)
          .map(([key, value]) => `${key}: ${String(value)}`)
          .join(', ');

        return (
          <div key={sectionIndex} className={cn('flex flex-col items-stretch gap-2', classNames?.section)}>
            {sectionTitle && <h3 className="self-center font-mono text-xs">{sectionTitle}</h3>}

            <div
              className={cn(
                'grid place-items-center gap-2 self-center rounded-sm border-[0.5px] border-neutral-500/40 p-2',
                '[background-image:repeating-linear-gradient(45deg,rgba(127,127,127,0.03)_0,rgba(127,127,127,0.03)_10px,transparent_10px,transparent_20px)]',
                classNames?.matrix
              )}
              style={{
                gridTemplateColumns:
                  gridSize.column === 'identical'
                    ? `repeat(${secondValues?.length ?? 0}, 1fr)`
                    : `repeat(${secondValues?.length ?? 0}, auto)`,
                gridTemplateRows:
                  gridSize.row === 'identical'
                    ? `repeat(${firstValues?.length ?? 0}, 1fr)`
                    : `repeat(${firstValues?.length ?? 0}, auto)`,
              }}
            >
              {firstValues?.map((firstValue, firstIndex: number) =>
                secondValues?.map((secondValue, secondIndex: number) => {
                  const cellIndex = firstIndex * secondValues.length + secondIndex;
                  const matrixProps = {
                    ...baseProps,
                    [firstKey]: firstValue,
                    [secondKey]: secondValue,
                  } as CartesianProduct<TMatrix>;

                  // Resolve component props (values or functions)
                  const resolvedComponentProps = Object.entries(componentProps).reduce<
                    Partial<InferComponentProps<TComponent>>
                  >((acc, [key, value]) => {
                    if (typeof value === 'function') {
                      const resolvedValue = (
                        value as (
                          context: ComponentPropsContext<TMatrix, TSections>
                        ) => InferComponentProps<TComponent>[keyof InferComponentProps<TComponent>]
                      )({
                        matrixProps,
                        sectionProps: sectionProps,
                        cellIndex,
                        sectionIndex,
                      });
                      acc[key as keyof InferComponentProps<TComponent>] = resolvedValue;
                    } else {
                      acc[key as keyof InferComponentProps<TComponent>] =
                        value as InferComponentProps<TComponent>[keyof InferComponentProps<TComponent>];
                    }
                    return acc;
                  }, {});

                  const cellProps = {
                    ...matrixProps,
                    ...sectionProps,
                    ...resolvedComponentProps,
                  } as InferComponentProps<TComponent> &
                    Expand<CartesianProduct<TMatrix> & CartesianProduct<TSections>>;

                  if (render) {
                    return (
                      <Fragment key={`${String(firstValue)}-${String(secondValue)}`}>{render(cellProps)}</Fragment>
                    );
                  }

                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  return <Component key={`${String(firstValue)}-${String(secondValue)}`} {...(cellProps as any)} />;
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
