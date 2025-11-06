import { Button } from '#src/components/button/button.js';
import { base, en, Faker } from '@faker-js/faker';
import { FC, useCallback, useMemo } from 'react';
import { useSpringBufferContext } from './spring-buffer-provider.js';

export const ContentControlsPanel: FC = () => {
  const { append, clear, flush, contentMV } = useSpringBufferContext();

  const faker = useMemo(() => new Faker({ locale: [base, en] }), []);

  const appendSentences = useCallback(
    (count: number) => {
      let suffix = '';
      const currentContent = contentMV.get();
      if (!['\n', ' '].includes(currentContent.at(-1) ?? 'NULL') && currentContent.length > 0) {
        suffix = ' ';
      }
      append(suffix + faker.lorem.sentences(count, ' '));
    },
    [append, contentMV, faker.lorem]
  );

  const appendEmojis = useCallback(
    (count: number) => {
      let suffix = '';
      const currentContent = contentMV.get();
      if (!['\n', ' '].includes(currentContent.at(-1) ?? 'NULL') && currentContent.length > 0) {
        suffix = ' ';
      }
      const emojis = Array.from({ length: count }, () => faker.internet.emoji());
      append(suffix + emojis.join(''));
    },
    [append, contentMV, faker.internet]
  );

  const appendParagraph = useCallback(() => {
    let suffix = '';
    const currentContent = contentMV.get();
    if (!['\n'].includes(currentContent.at(-1) ?? 'NULL') && currentContent.length > 0) {
      suffix = '\n\n';
    }
    const paragraph = faker.lorem.paragraph(1);
    append(suffix + paragraph);
  }, [append, contentMV, faker.lorem]);

  return (
    <div className="flex flex-row flex-wrap justify-center gap-2">
      <Button size="sm" color="blue" onClick={appendParagraph}>
        Append paragraph
      </Button>

      {[1, 3, 10].map((count, i) => (
        <Button key={i} size="sm" color="blue" onClick={() => appendSentences(count)}>
          Append {count} sentences
        </Button>
      ))}

      {[1, 20].map((count, i) => (
        <Button key={i} size="sm" color="blue" onClick={() => appendEmojis(count)}>
          Append {count} emojis
        </Button>
      ))}

      <Button size="sm" color="yellow" onClick={flush}>
        Flush
      </Button>

      <Button size="sm" color="red" onClick={clear}>
        Clear
      </Button>
    </div>
  );
};
