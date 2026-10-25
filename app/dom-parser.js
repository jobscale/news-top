import { JSDOM } from 'jsdom';

export class DOMParser {
  parseFromString(html, contentType = 'text/html') {
    return new JSDOM(html, { contentType }).window.document;
  }
}
