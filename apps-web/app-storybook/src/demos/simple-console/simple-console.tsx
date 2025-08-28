import { cn } from '@monorepo/utils';
import { throttle } from 'es-toolkit';
import { FC, useCallback, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { SimpleConsoleLogger } from './simple-console-logger.js';

export const SimpleConsoleRender: FC<{ console: SimpleConsoleLogger; className?: string }> = ({
  console,
  className,
}) => {
  const logs = useSyncExternalStore(console.subscribe, console.getLogs);
  const containerRef = useRef<HTMLDivElement>(null);

  const atBottom = useRef<boolean>(true);

  const updateAtBottom = useCallback((container: HTMLDivElement) => {
    const scrollHeight = container.scrollHeight;
    const scrollTop = container.scrollTop;
    const isAtBottom = scrollTop + container.clientHeight >= scrollHeight - 1.0;
    atBottom.current = isAtBottom;
  }, []);

  useLayoutEffect(() => {
    if (containerRef.current) {
      updateAtBottom(containerRef.current);
    }
  }, [updateAtBottom]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (atBottom.current) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [logs, updateAtBottom]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleScroll = useCallback(
    throttle<React.UIEventHandler<HTMLDivElement>>(
      () => {
        if (containerRef.current) {
          updateAtBottom(containerRef.current);
        }
      },
      100,
      { edges: ['leading', 'trailing'] }
    ),
    [updateAtBottom]
  );

  return (
    <div
      className={cn(
        `
          grid h-[10lh] grid-cols-[auto_1fr] content-start items-stretch gap-x-2 gap-y-1 overflow-x-clip overflow-y-auto
          rounded-sm border border-neutral-500/30 p-2 font-mono text-sm whitespace-pre-wrap
        `,
        className
      )}
      onWheel={handleScroll}
      onTouchMove={handleScroll}
      ref={containerRef}
    >
      {logs.map((log, index) => (
        <>
          <span className="min-w-0 self-start justify-self-end opacity-70">
            {new Date(log.timestamp).toLocaleTimeString()}
          </span>
          <div className="min-w-0" key={index}>
            {log.message}
          </div>
        </>
      ))}
    </div>
  );
};
