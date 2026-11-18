import { scanImage } from './recognition.js';
self.onmessage = ({ data }) => {
  try {
    self.postMessage({ result: scanImage(data.image, data.corners) });
  } catch (err) {
    self.postMessage({ error: err.message || 'The board could not be read.' });
  }
};
