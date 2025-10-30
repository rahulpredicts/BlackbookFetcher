# Blackbook GraphQL Fetcher

## Overview
A secure Python Flask web application that connects to the Blackbook GraphQL API to fetch vehicle data based on VIN and odometer readings.

## Project Structure
- `app.py` - Main Flask application with API endpoints
- `blackbook_service.py` - GraphQL client for Blackbook API integration
- `templates/` - HTML templates for frontend
- `static/` - CSS and JavaScript files
- `.env` - Environment variables (not committed to git)
- `.env.example` - Template for environment variables

## Features
- Secure credential storage using environment variables
- POST `/api/fetch-vehicle` - Fetch vehicle data by VIN and odometer
- POST `/api/test-credentials` - Validate Blackbook API credentials
- Admin settings page for credential configuration
- Rate limiting on API endpoints
- VIN validation (17 characters)
- Comprehensive error handling
- Clean, modern user interface

## Setup Instructions
1. Copy `.env.example` to `.env`
2. Update `.env` with your Blackbook credentials
3. Run the application
4. Access the admin page to test credentials
5. Use the main form to fetch vehicle data

## API Endpoints

### POST /api/fetch-vehicle
Fetch vehicle data from Blackbook API.

**Request Body:**
```json
{
  "vin": "1HGBH41JXMN109186",
  "odometer": 50000
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "vehicle": {...}
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message here"
}
```

### POST /api/test-credentials
Test Blackbook API credentials.

**Response:**
```json
{
  "success": true,
  "message": "Credentials are valid"
}
```

## Security
- Credentials stored in environment variables
- Rate limiting enabled
- CORS configured
- Session secret for CSRF protection
- No plaintext credentials in code

## Important Notes

### Odometer Field & Mileage Adjustment
The odometer field is used for client-side mileage-based depreciation calculations. Since the Blackbook GraphQL API does not accept odometer as a parameter, the application applies custom mileage adjustments:
- **Standard Reference Mileage**: 60,000 miles
- **Depreciation Rate**: $0.15 per mile
- **Calculation**: Adjustment = (Odometer - 60,000) × $0.15
- Values are adjusted from the API's base values to reflect the actual odometer reading

### GraphQL Query Structure
The Blackbook API uses the `usedvehicles` query and accepts only the VIN as a parameter. The response structure uses a nested `usedvehicles` field (not `used_vehicle_list`). The response includes:
- Vehicle identification (VIN, year, make, model, series, style)
- Multiple pricing tiers (wholesale, retail, trade-in)
- Condition-based values (extra clean, clean, average, rough)
- Mileage adjustments pre-calculated
- Error and warning messages

## Deployment Configuration

**Ready to Publish! 🚀**

Your app is configured for production deployment with:
- **Deployment Type:** Autoscale (stateless web application)
- **Production Server:** Gunicorn with 2 workers
- **Port:** 5000 (automatically configured)
- **Timeout:** 120 seconds for long-running API calls
- **Auto-scaling:** Scales automatically based on traffic

**To Publish Your App:**
1. Click the **"Deploy"** button in the top-right corner of Replit
2. Review the deployment settings
3. Click **"Deploy"** to publish to production
4. You'll get a public URL to share with users

**Environment Variables Needed for Production:**
- Make sure to set `SESSION_SECRET` in your deployment secrets
- The web scraper integration is already configured

## Recent Changes
- 2025-10-28: **Added Buying Price Analysis** - New optional "Your Buying Price" input field allows users to enter their actual purchase price. The system analyzes whether it's a good deal by comparing to wholesale/retail values, shows deal quality (Excellent/Fair/Overpaying), calculates actual profit potential, and provides color-coded indicators (green = below wholesale, red = above wholesale). Works with province selector to show market-specific analysis.
- 2025-10-28: **Compact Layout Update** - Made data display more compact with reduced padding, margins, and font sizes throughout. Cards now have 15px padding (down from 30px), grids have smaller gaps (12px), font sizes reduced by 15-25%, and max-width increased to 1200px. This allows more information to be visible on screen at once while maintaining readability.
- 2025-10-28: **Added Province Selector for Auction Recommendations** - Added dropdown menu for province selection in the auction recommendation section with Ontario as the default. Recommendations now calculate based on buying at auction in the selected province and reselling in the best market, with province-specific wholesale pricing and profit analysis.
- 2025-10-28: **Simplified to Raw Rough Condition Pricing** - Removed market adjustment slider and calculations. Now showing unmodified rough condition values directly from Blackbook API. This provides the most conservative, lower-end book valuations without any client-side modifications.
  - **KM/Miles Conversion Fix**: Fixed critical bug where Canadian km readings were being sent to US-based Blackbook API as miles, causing inflated pricing. API now correctly converts km→miles server-side
  - **Real Market Data First**: UI shows AutoTrader Canada listings FIRST with green priority styling and "✨ REAL MARKET DATA" badge. Blackbook "book values" shown below with warning banners
  - **Clear Disclaimers**: Added warnings explaining Blackbook = "theoretical book value" ≠ "real market value"
  - **Market Statistics Dashboard**: AutoTrader section calculates and displays average, median, min/max prices, and delta vs Blackbook with actionable insights (e.g., "$X,XXX below book value confirms inflation")
  - **Dynamic Price Display**: All Blackbook prices update in real-time as slider moves. Stored raw values ensure consistent recalculation without re-fetching API data
  - **KM-First Display**: Changed odometer display to show km first (primary) with miles secondary for Canadian users. All conversions accurate and consistent
- 2025-10-28: **Enhanced Trim Decoding** - VIN decoder now shows comprehensive trim information including Series/Grade and Trim Level with highlighted display. Combines multiple NHTSA fields (Series, Series2, Trim, Trim2) for complete trim description. Also shows transmission speeds, engine configuration, seat rows, and other detailed specs.
- 2025-10-28: **Available Cars in the Market** - Shows real AutoTrader Canada listings for similar vehicles with price comparisons vs Blackbook values. Color-coded indicators show which listings are below/above book value. Successfully scrapes real market data including prices, mileage, locations, and direct links to listings.
- 2025-10-28: **Alternative Listings Province-by-Province** - Each provincial pricing card now shows opportunity badges (Best Buy, Best Sell, Best Buy & Sell), comparison to national averages, profit potential, and ranked indicators (#1 Highest Retail, etc.)
- 2025-10-28: **Added VIN Decoder** - Automatically decodes VIN using NHTSA API to show complete vehicle details (year, make, model, trim, engine, transmission, drive type, fuel type, etc.)
- 2025-10-28: **Trimmed API Data** - Cleaned up display to show only essential pricing information, removed debug fields
- 2025-10-28: **Added Auction Buy Recommendation Engine** - AI-powered buy/no-buy recommendations based on profit margins, market spread, and regional opportunities with detailed strategy guidance
- 2025-10-28: **Added Market Trends Analysis** - Displays comprehensive market statistics including highest/lowest markets, national averages, price ranges, and market spreads
- 2025-10-28: **Expanded to all Canadian provinces** - Now fetches pricing data for all 13 provinces/territories instead of just Ontario and Quebec
- 2025-10-28: **Added auction data** to pricing cards endpoint - renamed `adjusted_whole_clean` to `adjusted_wholesale_auction_clean` to clarify this represents auction pricing
- 2025-10-28: Updated query to use correct response structure (`used_vehicle_list`)
- 2025-10-28: Updated field names to match API (e.g., `adjusted_whole_clean` instead of `adjusted_whole_xclean`)
- 2025-10-28: Added UVC (Used Vehicle Code) field to display
- 2025-10-27: Removed postal code lookup feature
- 2025-10-27: Successfully deployed BlackbookFetcher application on Replit
- 2025-10-27: Installed all Python dependencies (Flask, Flask-CORS, Flask-Limiter, gql, python-dotenv, requests, requests-toolbelt)
- 2025-10-27: Configured workflow to run Flask server on port 5000
- 2025-10-27: Verified web interface is fully functional with Vehicle Lookup and Admin Settings pages
- 2025-10-26: Initial project setup with Flask backend and GraphQL integration
- 2025-10-26: Fixed GraphQL query to use correct Blackbook API schema (`usedvehicles` instead of `vehicle`)
- 2025-10-26: Updated field mappings to match actual Blackbook API response structure
- 2025-10-26: Added enhanced error handling with detailed console logging for debugging

## Deployment Status
✅ **Application is live and running on port 5000**
- Flask server running in development mode
- Web interface accessible at the root URL
- Admin settings page available at `/admin`
- All API endpoints operational
- Blackbook API credentials configured via environment variables
