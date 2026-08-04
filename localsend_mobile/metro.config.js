const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Support Buffer polyfill needed by react-native-udp / tcp-socket
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve("buffer"),
  stream: require.resolve("stream-browserify"),
  events: require.resolve("events"),
};

config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "svg",
);
config.resolver.sourceExts.push("svg");
config.transformer = {
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
  ...config.transformer,
};

module.exports = config;
