# Changelog

## 1.0.0

Initial release.

- `RichGradient`: a serializable gradient with up to 32 color keys and 32 alpha keys.
- `Blend`, `Fixed`, and `PerceptualBlend` (OKLab) gradient modes.
- Custom Inspector swatch and gradient editor window.
- `FromGradient` / `ToGradient` conversion with Unity's built-in `Gradient`.
- No render-pipeline dependency. Tested in Unity 2022.3, 2023.2, and 6000.0, in the Built-in and Universal Render Pipelines, in Linear and Gamma color space.
