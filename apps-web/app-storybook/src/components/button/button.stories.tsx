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
      <div style={containerStyles}>
        {sizes.map((size) =>
          colors.map((color) => (
            <Button key={`${color}-${size}`} color={color ?? undefined} size={size}>
              {color} {size}
            </Button>
          ))
        )}
      </div>
    );
  },
};
