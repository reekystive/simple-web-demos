import type { Meta, StoryObj } from '@storybook/react-vite';
import { CSSProperties, useMemo } from 'react';
import { Button, ButtonVariants } from './button.js';

const meta: Meta = {
  title: 'Components/Button',
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => {
    const colors: ButtonVariants['color'][] = useMemo(() => ['blue', 'red', 'yellow', 'green'], []);
    const sizes: ButtonVariants['size'][] = useMemo(() => ['sm', 'md'], []);
    const disabled = useMemo(() => [false, true], []);

    const containerStyles = useMemo<CSSProperties>(() => {
      return {
        display: 'grid',
        gridTemplateColumns: `repeat(${colors.length}, 1fr)`,
        gap: '0.5rem',
        justifyItems: 'center',
        alignItems: 'center',
      };
    }, [colors]);

    return (
      <div className="flex flex-col items-center gap-6">
        {sizes.map((size) => (
          <div key={size} className="flex flex-col items-center gap-2">
            <h1 className="font-mono text-sm">size: {size}</h1>
            <div style={containerStyles}>
              {disabled.map((isDisabled) =>
                colors.map((color) => (
                  <Button
                    key={`${color}-${size}-${isDisabled}`}
                    color={color ?? undefined}
                    size={size}
                    disabled={isDisabled}
                  >
                    {color} {isDisabled ? 'disabled' : ''}
                  </Button>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    );
  },
};
