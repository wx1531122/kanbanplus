/* globals beforeAll, afterEach, afterAll */
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest'; // Note the /vitest import

import { server } from './mocks/server.js';

// Establish API mocking before all tests.
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' })); // Warn on unhandled requests

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());

// Optional: if you need to mock localStorage or other browser APIs
// const localStorageMock = (function() {
//   let store = {};
//   return {
//     getItem(key) {
//       return store[key] || null;
//     },
//     setItem(key, value) {
//       store[key] = value.toString();
//     },
//     removeItem(key) {
//       delete store[key];
//     },
//     clear() {
//       store = {};
//     }
//   };
// })();
// Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// You might also want to mock react-router-dom navigations if they are not part of component logic
// vi.mock('react-router-dom', async () => {
//   const actual = await vi.importActual('react-router-dom');
//   return {
//     ...actual,
//     useNavigate: () => vi.fn((to) => console.log(`Mocked navigate to: ${to}`)),
//     Link: ({ children, to }) => <a href={to}>{children}</a>, // Simple Link mock
//     // useParams: () => ({ projectId: '1', taskId: '1' }) // Mock params if needed globally
//   };
// });
