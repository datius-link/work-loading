const { getDefaultConfig } = require("expo/metro-config");

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  config.transformer.babelTransformerPath = require.resolve(
    "react-native-svg-transformer"
  );

  config.resolver.assetExts = config.resolver.assetExts.filter(
    (ext) => ext !== "svg"
  );
  config.resolver.sourceExts = [
    ...config.resolver.sourceExts,
    "svg"
  ];

  config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    buffer: require.resolve("buffer"),
  };

  return config;
})();
