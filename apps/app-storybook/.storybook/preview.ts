import '#src/global.css';
import type { Preview } from '@storybook/react-vite';
import { scan } from 'react-scan';
import './preview.css';

const preview: Preview = {};

export default preview;

if (import.meta.env.DEV) {
  scan({ enabled: true });
}
