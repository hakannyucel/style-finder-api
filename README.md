# Style Finder API

Style Finder API is an open-source tool that allows you to analyze typography styles of websites. This API extracts and analyzes all typography properties (font family, size, weight, line height, etc.) from a specified website.

## 🚀 Features

- Automatically extract all typography styles from websites
- Analyze properties such as font family, size, weight, line height, letter spacing
- Automatically group duplicate styles
- Provide CSS meta information (external CSS count, inline CSS count, typography rules count)
- Present usage statistics of HTML tags

## 📋 Requirements

- Node.js (v14 or higher)
- npm or yarn

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

3. Start the application:
```bash
npm start
```

The application will run on port 3000 by default. You can change the port number by setting the `PORT` environment variable.

## 🔍 Usage

### Typography Analysis

```
GET /scrape?url=https://example.com
```

#### Parameters:

- `url`: URL of the website to be analyzed (required)

#### Example Response:

```json
{
  "url": "https://example.com",
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