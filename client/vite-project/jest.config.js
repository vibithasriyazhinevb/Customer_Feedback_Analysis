export default {
  testEnvironment: "jsdom",

  transform: {
    "^.+\\.jsx?$": [
      "babel-jest",
      {
        configFile: "./babel.config.cjs"
      }
    ]
  },

  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"]
};