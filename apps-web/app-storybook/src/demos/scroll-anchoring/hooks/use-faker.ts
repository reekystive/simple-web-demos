import { Faker, en } from '@faker-js/faker';
import { useMemo } from 'react';

export const useFaker = () => {
  const seed = useMemo(() => Math.floor(Math.random() * 1000000), []);
  const fakerWithSeed = useMemo(() => new Faker({ locale: [en], seed }), [seed]);
  const faker = useMemo(() => new Faker({ locale: [en] }), []);
  return {
    faker,
    fakerWithSeed,
    reset: () => {
      fakerWithSeed.seed(seed);
    },
  };
};
