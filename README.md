# Style Finder API

Style Finder API is an open-source tool that allows you to analyze typography styles and colors of websites. This API extracts and analyzes typography properties (font family, size, weight, line height, etc.), colors, and gradients from a specified website.

## 🚀 Features

- Extract all typography styles from websites
- Analyze typography properties such as font family, size, weight, line height, letter spacing
- Extract and categorize all colors used on the website
- Identify and analyze gradients used in the design
- Retrieve the page title of the analyzed website
- Group duplicate styles automatically
- Provide CSS meta information (external CSS count, inline CSS count, typography rules count)
- Present usage statistics of HTML tags
- Cache results to improve performance and reduce scraping frequency
- Stealth mode to avoid being blocked by websites
- Comprehensive error handling with detailed error messages

## 📋 Requirements

- Node.js (v14 or higher)
- npm or yarn
- Chrome/Chromium (for production environments)

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/hakannyucel/style-finder-api.git
cd style-finder-api
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```
# Create a .env file with the following variables
PORT=3000
NODE_ENV=development
STEALTH_MODE=true
SERVER_TIMEOUT=120000
PUPPETEER_TIMEOUT=60000
MAX_RETRIES=3
RETRY_DELAY=2000
```

4. Start the application:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The application will run on port 3000 by default (or as configured in your .env file).

## 🐳 Docker Support

You can also run the application using Docker:

```bash
# Build the Docker image
docker build -t style-finder-api .

# Run the container
docker run -p 3000:3000 --env-file .env style-finder-api
```

## 🔍 Usage

### Website Style Analysis

```
GET /scrape?url=https://example.com
```

#### Parameters:

- `url`: URL of the website to be analyzed (required)
- `nocache`: Set to 'true' to bypass cache and force a new scrape (optional)

#### Example Success Response:

```json
{
  "status": "success",
  "url": "https://example.com",
  "title": "Example Domain",
  "typography": [
    {
      "tag": "h1",
      "className": "header",
      "font-family": "Roboto",
      "font-size": "32px",
      "font-weight": "700",
      "line-height": "1.2",
      "letter-spacing": "normal",
      "text-transform": "none",
      "font-style": "normal",
      "text-decoration": "none"
    },
    // ... other typography styles
  ],
  "colors": [
    {
      "name": "Black",
      "hex": "#000000",
      "rgb": "rgb(0, 0, 0)",
      "count": 15
    },
    // ... other colors
  ],
  "gradients": [
    {
      "type": "linear-gradient",
      "angle": "45deg",
      "colors": [
        {
          "position": "0%",
          "color": "#ff0000",
          "colorName": "Red"
        },
        {
          "position": "100%",
          "color": "#0000ff",
          "colorName": "Blue"
        }
      ],
      "count": 3
    },
    // ... other gradients
  ],
  "meta": {
    "externalCSSCount": 2,
    "inlineCSSCount": 5,
    "typographyRulesCount": 120,
    "duplicatesRemoved": 45,
    "tagCounts": {
      "div": 78,
      "p": 24,
      "h1": 1,
      // ... other tags
    },
    "totalTagsFound": 15
  }
}
```

#### Error Response Format:

The API provides detailed error responses when issues occur:

```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": "Detailed explanation about the error",
  "url": "https://example.com",
  "timestamp": "2023-06-15T10:30:00.000Z"
}
```

#### Common Error Codes:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| MISSING_URL | 400 | URL parameter is missing in the request |
| INVALID_URL_FORMAT | 400 | The provided URL has an invalid format |
| DOMAIN_NOT_FOUND | 400 | The domain couldn't be resolved |
| PAGE_NOT_FOUND | 404 | The requested page doesn't exist (404) |
| ACCESS_FORBIDDEN | 403 | Access to the page is forbidden (403) |
| CONNECTION_REFUSED | 503 | The server refused the connection |
| CONNECTION_TIMEOUT | 504 | The connection to the server timed out |
| GATEWAY_TIMEOUT | 504 | Navigation timeout occurred |
| NETWORK_CHANGED | 503 | Network connection changed during request |
| SSL_ERROR | 526 | The website has an invalid SSL certificate |
| REQUEST_ABORTED | 500 | The request was aborted |
| PROTOCOL_ERROR | 500 | A protocol error occurred |
| INTERNAL_ERROR | 500 | Generic internal server error |

## ⚙️ Project Structure

```
style-finder-api/
├── .env                    # Environment variables
├── Dockerfile              # Docker configuration
├── package.json            # Project dependencies and scripts
├── server.js               # Main server entry point
├── src/
│   ├── controllers/
│   │   └── scrapeController.js   # Main endpoint controller
│   ├── services/
│   │   ├── colorService.js       # Color extraction logic
│   │   ├── gradientService.js    # Gradient extraction logic
│   │   ├── titleService.js       # Page title extraction
│   │   └── typographyService.js  # Typography extraction logic
│   └── utils/
│       ├── colorUtils.js         # Color manipulation utilities
│       └── memoryUtils.js        # Memory management utilities
```

## 🤝 Contributing

We welcome your contributions! To contribute:

1. Fork this repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License. See the `LICENSE` file for more information.

## 📞 Contact

For questions or suggestions, you can open an issue or fork the project and submit a pull request.

---

⭐️ Don't forget to give this project a star if you liked it! ⭐️ 