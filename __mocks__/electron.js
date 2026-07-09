// Mock for electron main process module
const mockElectron = {
  clipboard: {
    readText: jest.fn(() => ''),
    writeText: jest.fn(),
  },
};

module.exports = mockElectron;
