const original = { ...process.env };
afterEach(() => { process.env = { ...original }; jest.resetModules(); });
test('all API clients default to the production backend', () => {
  delete process.env.REACT_APP_API_BASE_URL;
  delete process.env.REACT_APP_API_URL;
  expect(require('./urls').API_BASE_URL).toBe('https://api.nuvanata.io/api/v1');
});
test('primary API setting wins and trailing slashes are removed', () => {
  process.env.REACT_APP_API_BASE_URL = 'https://api.nuvanata.io/api/v1/';
  process.env.REACT_APP_API_URL = 'https://legacy.example/api/v1';
  expect(require('./urls').API_BASE_URL).toBe('https://api.nuvanata.io/api/v1');
});
test('frontend assets and login redirects preserve /my deployment prefix', () => {
  process.env.PUBLIC_URL = '/my';
  const { APP_BASENAME, appUrl, publicAsset } = require('./urls');
  expect(APP_BASENAME).toBe('/my');
  expect(appUrl('/login')).toBe('/my/login');
  expect(publicAsset('se-logo.png')).toBe('/my/se-logo.png');
});
test('local root deployment remains configurable', () => {
  process.env.PUBLIC_URL = '';
  process.env.REACT_APP_API_BASE_URL = 'http://localhost:5000/api/v1';
  const { API_BASE_URL, APP_BASENAME, appUrl } = require('./urls');
  expect(API_BASE_URL).toBe('http://localhost:5000/api/v1');
  expect(APP_BASENAME).toBe('');
  expect(appUrl('login')).toBe('/login');
});


test('production root URL has no deployment prefix', () => {
  process.env.PUBLIC_URL = '/';
  const { APP_BASENAME, appUrl, publicAsset } = require('./urls');
  expect(APP_BASENAME).toBe('');
  expect(appUrl('login')).toBe('/login');
  expect(publicAsset('se-logo.png')).toBe('/se-logo.png');
});
