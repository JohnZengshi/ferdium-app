const storage = {};

module.exports = {
  getItem: jest.fn(key => storage[key] ?? null),
  setItem: jest.fn((key, value) => {
    storage[key] = value;
  }),
  removeItem: jest.fn(key => {
    delete storage[key];
  }),
  clear: jest.fn(() => {
    for (const key of Object.keys(storage)) {
      delete storage[key];
    }
  }),
};
