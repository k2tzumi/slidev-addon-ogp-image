# Slidev OGP Image Add-on

A powerful add-on for Slidev that automatically fetches OGP (Open Graph Protocol) data from URLs and displays them as interactive cards in your slides.

## Features

- **Automatic OGP Data Fetching**: Extracts Open Graph meta tags from any URL
- **Interactive Cards**: Clean, clickable cards displaying page information
- **Vue Component Integration**: Easy-to-use Vue component for Slidev
- **Error Handling**: Graceful fallbacks and error states
- **Click-to-Open**: Interactive components that open URLs in new tabs
- **CORS Proxy**: Built-in proxy support for cross-origin requests

## Example

[example.md](./example.md)
![screenshot](example-export/001.png)

## Installation

### 1. Install the Add-on

```bash
npm i @katzumi/slidev-addon-ogp-image
```

### 2. Configure Slidev

Add the add-on to your `slides.md` frontmatter:

```yaml
---
addons:
  - "@katzumi/slidev-addon-ogp-image"
---
```

## Basic Usage

```vue
<OgpImage url="https://github.com/k2tzumi/slidev-addon-ogp-image" />
```

## Advanced Configuration

```vue
<OgpImage 
  url="https://github.com/k2tzumi/slidev-addon-ogp-image"
  :width="800"
  :height="400"
  :generate-image="false"
/>
```

## Component Properties

- **url** (required): URL to fetch OGP data from
- **width**: Display width for generated images (default: 1200)
- **height**: Display height for generated images (default: 630)
- **template**: Custom template image path (server-side only)
- **generateImage**: Whether to generate custom images (default: false, browser compatibility)

## Project Structure

```
slidev-addon-ogp-image/
├── index.ts              # Main addon entry (FIXED)
├── setup/
│   └── main.ts          # Client setup
├── lib/
│   └── ogp-generator.ts # OGP fetching and image generation
├── components/
│   └── OgpImage.vue     # Vue component
└── assets/
    ├── ogp-template.png # Optional template
    └── NotoSansJP-Bold.ttf # Optional font
```

## Error Fix Details

The main errors were fixed:

1. **Removed Invalid SlidevAddon Import**: The `@slidev/types` package doesn't export `SlidevAddon`
2. **Simplified index.ts**: Now exports addon name and components directly
3. **Updated package.json**: Removed invalid `components` configuration
4. **Local Addon Structure**: Designed to work as a local addon in your project

## Examples in Slides

```markdown
---
addons:
  - "@katzumi/slidev-addon-ogp-image"
---

# Check out these resources

<OgpImage url="https://docs.microsoft.com/en-us/azure/" />

<OgpImage url="https://nodejs.org/" />

---

# Multiple Links

<div class="grid grid-cols-2 gap-4">
  <OgpImage url="https://vuejs.org/" />
  <OgpImage url="https://react.dev/" />
</div>

---
```

## Browser Limitations

Due to browser security restrictions:

- **Image Generation**: Disabled by default (requires Node.js environment)
- **CORS**: Uses proxy service for cross-origin requests
- **Canvas API**: Limited to server-side rendering scenarios

## Development

```bash
# Install dependencies
make install

# Build the addon
make publish

# Watch mode for development
make dev
```

## Error Resolution

The original error was caused by incorrect export format in `setup/main.ts`. The fix ensures:

- Proper `defineAppSetup` usage
- Correct default export syntax
- Safe client-side component registration
- Browser-compatible OGP fetching
