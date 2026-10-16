/**
 * MOLA-45: react-native-shiki-engine's autolinked codegen references
 * `facebook::react::TurboModule::createScanner` etc. — methods that don't
 * exist in React Native 0.86.3 (they lived in older TurboModule headers).
 * The package's lib/markdown/shiki.ts already has a graceful fallback
 * (`isNativeEngineAvailable()` returns false → plain text), so removing
 * the autolink only loses syntax highlighting in code blocks (mvp scope
 * accepts that trade-off; full fix is upstream shiki-engine@>=0.4).
 *
 * Other dependencies stay linked as before.
 */
module.exports = {
  dependencies: {
    "react-native-shiki-engine": {
      platforms: {
        android: null,
      },
    },
  },
};
