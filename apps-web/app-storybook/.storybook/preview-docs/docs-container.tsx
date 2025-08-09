import { DocsContainer } from '@storybook/addon-docs/blocks';
import { ComponentProps, FC } from 'react';

type DocsContainerProps = ComponentProps<typeof DocsContainer>;

export const CustomDocsContainer: FC<DocsContainerProps> = ({ children, ...props }) => {
  return <DocsContainer {...props}>{children}</DocsContainer>;
};
