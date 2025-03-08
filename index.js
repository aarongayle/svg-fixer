#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

/**
 * Converts class-based styles in SVG files to inline styles
 * @param {string} inputPath - Path to the SVG file to process
 * @param {string} outputPath - Path to save the processed SVG file
 * @param {boolean} reactNative - Whether to convert to React Native SVG format
 */
function convertSvgStylesToInline(inputPath, outputPath, reactNative = false) {
  try {
    // Read the SVG file
    const svgContent = fs.readFileSync(inputPath, "utf8");

    // First sanitize problematic attributes with spaces in their values
    const sanitizedContent = svgContent.replace(
      /data-name="([^"]+)"/g,
      (match, p1) => {
        return `data-name="${p1.replace(/\s+/g, "_")}"`;
      }
    );

    // Parse the SVG using JSDOM
    const dom = new JSDOM(sanitizedContent, { contentType: "image/svg+xml" });
    const document = dom.window.document;

    // Find the style element in defs
    const styleElement = document.querySelector("defs style");

    if (!styleElement) {
      console.log("No style element found in defs. No conversion needed.");
      // Still proceed if React Native conversion is needed
      if (!reactNative) {
        return;
      }
    }

    // Extract style rules if style element exists
    if (styleElement) {
      const styleText = styleElement.textContent;
      const classStyles = {};

      // Parse the CSS rules
      const styleRegex = /\.([^{]+){([^}]+)}/g;
      let match;

      while ((match = styleRegex.exec(styleText)) !== null) {
        const className = match[1].trim();
        const styleDeclaration = match[2].trim();
        classStyles[className] = styleDeclaration;
      }

      // Find all elements with classes and apply inline styles
      Object.keys(classStyles).forEach((className) => {
        const selector = `.${className}`;
        const elements = document.querySelectorAll(selector);

        elements.forEach((element) => {
          // Get the style properties
          const styleProps = classStyles[className]
            .split(";")
            .map((prop) => prop.trim())
            .filter((prop) => prop.length > 0);

          // Apply each style property inline
          styleProps.forEach((prop) => {
            const [name, value] = prop.split(":").map((part) => part.trim());
            element.style[name] = value;
          });

          // Remove the class attribute
          element.classList.remove(className);
          if (element.classList.length === 0) {
            element.removeAttribute("class");
          }
        });
      });

      // Remove the style element from defs
      styleElement.remove();

      // If defs is now empty, remove it too
      const defsElement = document.querySelector("defs");
      if (defsElement && !defsElement.children.length) {
        defsElement.remove();
      }
    }

    // Convert to React Native SVG format if requested
    if (reactNative) {
      convertToReactNativeSvg(document);
    }

    // Get the modified SVG content
    const modifiedSvg = dom.serialize();

    // Write the modified SVG to the output file
    fs.writeFileSync(outputPath, modifiedSvg);

    const message = reactNative
      ? `Successfully converted SVG to React Native format: ${outputPath}`
      : `Successfully converted SVG styles to inline: ${outputPath}`;

    console.log(message);
  } catch (error) {
    console.error("Error converting SVG:", error);

    // Try a fallback approach for problematic SVGs
    try {
      console.log("Attempting fallback conversion method...");
      const svgContent = fs.readFileSync(inputPath, "utf8");

      // Use regex to extract and apply styles without relying on DOM manipulation
      let modifiedSvg = svgContent;

      // Extract styles using regex
      const styleRegex = /<style>\s*([\s\S]*?)\s*<\/style>/g;
      const styleMatch = styleRegex.exec(svgContent);

      if (styleMatch && styleMatch[1]) {
        const styleContent = styleMatch[1];
        const classRegex = /\.([^{]+){([^}]+)}/g;
        let classMatch;

        // Process each class style
        while ((classMatch = classRegex.exec(styleContent)) !== null) {
          const className = classMatch[1].trim();
          const styleDeclaration = classMatch[2].trim();

          // Convert style declaration to inline style format
          const inlineStyle = styleDeclaration
            .split(";")
            .filter((prop) => prop.trim().length > 0)
            .map((prop) => {
              const [name, value] = prop.split(":").map((part) => part.trim());
              return `${name}:${value}`;
            })
            .join(";");

          // Find elements with this class and add inline style
          const classRegexInSvg = new RegExp(
            `class="[^"]*\\b${className}\\b[^"]*"`,
            "g"
          );
          modifiedSvg = modifiedSvg.replace(classRegexInSvg, (match) => {
            // Extract existing class attribute
            const existingClasses = match
              .match(/class="([^"]*)"/)[1]
              .split(/\s+/);
            const filteredClasses = existingClasses
              .filter((c) => c !== className)
              .join(" ");

            // Add style attribute
            const styleAttr = filteredClasses
              ? `class="${filteredClasses}" style="${inlineStyle}"`
              : `style="${inlineStyle}"`;

            return styleAttr;
          });
        }

        // Remove the style element
        modifiedSvg = modifiedSvg.replace(/<style>[\s\S]*?<\/style>/g, "");

        // Clean up empty defs if present
        modifiedSvg = modifiedSvg.replace(/<defs>\s*<\/defs>/g, "");

        // If React Native format is requested, replace tag names
        if (reactNative) {
          const svgElements = [
            "svg",
            "circle",
            "ellipse",
            "g",
            "text",
            "tspan",
            "line",
            "path",
            "polygon",
            "polyline",
            "rect",
            "use",
            "defs",
            "stop",
            "linearGradient",
            "radialGradient",
            "mask",
            "pattern",
            "clipPath",
            "filter",
            "feGaussianBlur",
            "feOffset",
            "feBlend",
            "feColorMatrix",
          ];

          svgElements.forEach((el) => {
            const capitalizedName = el.charAt(0).toUpperCase() + el.slice(1);
            const openTagRegex = new RegExp(`<${el}(\\s|>)`, "g");
            const closeTagRegex = new RegExp(`</${el}>`, "g");

            modifiedSvg = modifiedSvg
              .replace(openTagRegex, `<${capitalizedName}$1`)
              .replace(closeTagRegex, `</${capitalizedName}>`);
          });
        }

        // Write the modified SVG to the output file
        fs.writeFileSync(outputPath, modifiedSvg);

        const message = reactNative
          ? `Successfully converted SVG to React Native format using fallback method: ${outputPath}`
          : `Successfully converted SVG styles to inline using fallback method: ${outputPath}`;

        console.log(message);
      } else {
        if (reactNative) {
          // If no styles but React Native conversion is needed
          let rnSvg = svgContent;
          const svgElements = [
            "svg",
            "circle",
            "ellipse",
            "g",
            "text",
            "tspan",
            "line",
            "path",
            "polygon",
            "polyline",
            "rect",
            "use",
            "defs",
            "stop",
            "linearGradient",
            "radialGradient",
            "mask",
            "pattern",
            "clipPath",
            "filter",
            "feGaussianBlur",
            "feOffset",
            "feBlend",
            "feColorMatrix",
          ];

          svgElements.forEach((el) => {
            const capitalizedName = el.charAt(0).toUpperCase() + el.slice(1);
            const openTagRegex = new RegExp(`<${el}(\\s|>)`, "g");
            const closeTagRegex = new RegExp(`</${el}>`, "g");

            rnSvg = rnSvg
              .replace(openTagRegex, `<${capitalizedName}$1`)
              .replace(closeTagRegex, `</${capitalizedName}>`);
          });

          fs.writeFileSync(outputPath, rnSvg);
          console.log(
            `Successfully converted SVG to React Native format using fallback method: ${outputPath}`
          );
        } else {
          console.log("No style element found in SVG. No conversion needed.");
          fs.copyFileSync(inputPath, outputPath);
        }
      }
    } catch (fallbackError) {
      console.error("Fallback conversion also failed:", fallbackError);
    }
  }
}

/**
 * Converts SVG elements to React Native SVG format by capitalizing tag names
 * @param {Document} document - The JSDOM document containing SVG
 */
function convertToReactNativeSvg(document) {
  // List of SVG element names that need to be capitalized for React Native
  const svgElements = [
    "svg",
    "circle",
    "ellipse",
    "g",
    "text",
    "tspan",
    "line",
    "path",
    "polygon",
    "polyline",
    "rect",
    "use",
    "defs",
    "stop",
    "linearGradient",
    "radialGradient",
    "mask",
    "pattern",
    "clipPath",
    "filter",
    "feGaussianBlur",
    "feOffset",
    "feBlend",
    "feColorMatrix",
  ];

  // For each SVG element type, find and rename all instances
  svgElements.forEach((elementName) => {
    const elements = document.querySelectorAll(elementName);

    elements.forEach((element) => {
      // Create new element with capitalized name
      const capitalizedName =
        elementName.charAt(0).toUpperCase() + elementName.slice(1);
      const newElement = document.createElement(capitalizedName);

      // Copy all attributes
      for (const attr of element.attributes) {
        newElement.setAttribute(attr.name, attr.value);
      }

      // Copy all children
      while (element.firstChild) {
        newElement.appendChild(element.firstChild);
      }

      // Replace old element with new one
      element.parentNode.replaceChild(newElement, element);
    });
  });
}

// Command line interface
function main() {
  const args = process.argv.slice(2);
  let reactNative = false;
  let inputPath, outputPath;

  // Check for React Native flag
  const rnFlagIndex = args.indexOf("--react-native");
  if (rnFlagIndex !== -1) {
    reactNative = true;
    args.splice(rnFlagIndex, 1); // Remove the flag from args
  }

  if (args.length < 1) {
    console.log(
      "Usage: node index.js <input-svg-path> [output-svg-path] [--react-native]"
    );
    console.log(
      "  --react-native: Convert SVG to React Native format (capitalize element names)"
    );
    return;
  }

  inputPath = args[0];

  // If output path is not provided, use the input path with a suffix
  const suffix = reactNative ? "-rn" : "-inline";
  outputPath =
    args[1] ||
    path.join(
      path.dirname(inputPath),
      `${path.basename(inputPath, ".svg")}${suffix}.svg`
    );

  convertSvgStylesToInline(inputPath, outputPath, reactNative);
}

main();
