import { cn } from '@monorepo/utils';
import { FC } from 'react';
import { ContentControlsPanel } from './content-controls-panel.js';
import { MetricsPanel } from './metrics-panel.js';
import { ParamsPanel } from './params-panel.js';
import { RenderArea } from './render-area.js';
import { SpringBufferProvider } from './spring-buffer-provider.js';

export const SpringBufferRenderer: FC = () => {
  return (
    <SpringBufferProvider>
      <div className={cn('mx-auto flex max-w-5xl flex-col items-stretch gap-4 px-3 py-6')}>
        <ParamsPanel />
        <ContentControlsPanel />
        <MetricsPanel />
        <RenderArea />
      </div>
    </SpringBufferProvider>
  );
};
