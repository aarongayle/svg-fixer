# SVG-Fixer

A simple Node.js tool to convert class-based styles in SVG files to inline styles and optionally convert SVGs to React Native SVG format.

## Purpose

This tool helps optimize SVG files by moving styles from the `<defs>` section directly into the elements as inline styles. It can also convert standard SVGs to React Native SVG format by capitalizing element names. This can be beneficial when:

- You want to manually edit SVGs and prefer having styles directly on elements
- You need SVGs that work in environments with limited CSS support
- You're integrating SVGs into systems that don't properly handle style definitions
- You want to reduce complexity in your SVG files
- You need to use SVGs in React Native applications (with the `--react-native` flag)

## Installation

1. Clone this repository or download the files
2. Install dependencies:

```bash
npm install
```

## Usage

Run the tool with:

```bash
node index.js <input-svg-path> [output-svg-path] [--react-native]
```

### Arguments

- `input-svg-path`: Path to the SVG file you want to process (required)
- `output-svg-path`: Path where the processed SVG will be saved (optional)
  - If not provided, the output will be saved with a suffix in the same directory
  - For standard conversion: `[original-name]-inline.svg`
  - For React Native conversion: `[original-name]-rn.svg`
- `--react-native`: Flag to enable React Native SVG conversion (optional)

### Examples

Process a single SVG file with default output naming:

```bash
node index.js src/my-icon.svg
```

Process a file with custom output path:

```bash
node index.js src/my-icon.svg dist/optimized-icon.svg
```

Convert to React Native SVG format:

```bash
node index.js src/my-icon.svg --react-native
```

Convert to React Native SVG format with custom output path:

```bash
node index.js src/my-icon.svg dist/react-native-icon.svg --react-native
```

## How It Works

### Standard Conversion (Inline Styles)

1. The tool parses the SVG file using JSDOM
2. It extracts all CSS class-based style rules from the `<defs><style>` section
3. For each element that uses these classes, it:
   - Applies the style properties directly as inline styles
   - Removes the class attributes
4. It removes the style element from `<defs>` (and removes `<defs>` if it's now empty)
5. Saves the modified SVG to the output path

### React Native Conversion

When the `--react-native` flag is used, the tool also:

1. Capitalizes all SVG element names to match React Native SVG component names
   - For example: `<svg>` becomes `<Svg>`, `<path>` becomes `<Path>`, etc.
2. This makes the SVG file compatible with libraries like `react-native-svg`
3. This conversion can be combined with the inline style conversion

## Benefits

- Simplified SVG structure
- Better compatibility with tools that don't support CSS in SVGs
- Easier manual editing
- Self-contained styles that won't be affected by external CSS
- Easy conversion for React Native applications

## Limitations

- If an SVG reuses the same styles across many elements, this tool will increase file size by duplicating style information
- The tool only processes class-based styles and doesn't handle other types of CSS selectors
- Style inheritance and cascading effects will be lost
