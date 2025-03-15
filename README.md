# SEO Fibonacci Analysis Tool

A web-based tool that analyzes keyword ranking volatility using Fibonacci retracement levels. This tool helps SEO professionals identify patterns in keyword ranking fluctuations and predict potential support and resistance levels.

## Features

- Upload and process SEMrush position tracking exports
- Calculate keyword ranking volatility
- Identify volatile keywords based on configurable thresholds
- Analyze ranking patterns using Fibonacci retracement levels
- Visualize keyword ranking history with interactive charts
- Predict potential support and resistance levels
- Mobile-responsive design

## Setup

1. Clone this repository to your GitHub account
2. Enable GitHub Pages for your repository:
   - Go to repository Settings
   - Navigate to Pages section
   - Select main branch as source
   - Save changes

The tool will be available at `https://[your-username].github.io/seo-fibonacci-tool/`

## Usage

1. Export your keyword rankings from SEMrush:
   - Go to Position Tracking
   - Select your project
   - Click Export
   - Choose CSV format
   - Select "Overview" report type

2. Use the tool:
   - Open the tool in your browser
   - Click "Choose File" and select your SEMrush CSV export
   - Click "Process Data" to analyze the rankings
   - Select keywords you want to analyze in detail
   - Click "Analyze Selected Keywords" to view charts and predictions

## Data Format

The tool expects a SEMrush position tracking export in CSV format with the following columns:
- Keyword
- Search Volume
- Position tracking data columns (format: domain_YYYYMMDD)

## Configuration

You can customize the tool's behavior by modifying `js/config.js`:
- Fibonacci levels
- Volatility threshold
- Pattern matching tolerance
- Chart colors and settings
- CSV parsing options

## Dependencies

The tool uses the following external libraries (loaded via CDN):
- Chart.js for data visualization
- PapaParse for CSV parsing
- Lodash for data manipulation

## Browser Support

The tool supports all modern browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT License - feel free to use and modify as needed.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 