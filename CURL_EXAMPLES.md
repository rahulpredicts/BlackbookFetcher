# API Endpoint Examples

## Pricing Cards Endpoint with Auction Data

### Endpoint: `/api/pricing-cards`
Fetches vehicle data and pricing for all Canadian provinces and territories including auction data.

### Request

```bash
curl -X POST http://localhost:5000/api/pricing-cards \
  -H "Content-Type: application/json" \
  -d '{
    "vin": "5J8YE1H45RL800260",
    "mileage": 85000
  }'
```

### Response

```json
{
  "cards": [
    {
      "province": "Ontario",
      "vin": "5J8YE1H45RL800260",
      "mileage": 85000,
      "uvc": "2024020001",
      "year": "2024",
      "make": "Acura",
      "model": "MDX",
      "publish_date": "10/28/2025",
      "adjusted_wholesale_auction_clean": 46125,
      "adjusted_retail_clean": 52450,
      "adjusted_tradein_clean": 46815
    },
    {
      "province": "Quebec",
      "vin": "5J8YE1H45RL800260",
      "mileage": 85000,
      "uvc": "2024020001",
      "year": "2024",
      "make": "Acura",
      "model": "MDX",
      "publish_date": "10/28/2025",
      "adjusted_wholesale_auction_clean": 45597,
      "adjusted_retail_clean": 51859,
      "adjusted_tradein_clean": 46280
    }
  ]
}
```

### Postman Request

1. **Method**: POST
2. **URL**: `http://localhost:5000/api/pricing-cards`
3. **Headers**: 
   - Content-Type: application/json
4. **Body** (raw JSON):
```json
{
  "vin": "5J8YE1H45RL800260",
  "mileage": 85000
}
```

### Error Response

```json
{
  "success": false,
  "error": "VIN is required"
}
```

### How It Works

1. **Step 1**: Calls BlackBook GraphQL `usedvehicles(vin: ...)` query
   - Extracts: uvc, model_year, make, model, publish_date
   
2. **Step 2**: Calls BlackBook Used Car Adjustment Pricing API **13 times**
   - Once for each Canadian province and territory:
     - Alberta, British Columbia, Manitoba, New Brunswick
     - Newfoundland and Labrador, Northwest Territories, Nova Scotia
     - Nunavut, Ontario, Prince Edward Island, Quebec
     - Saskatchewan, Yukon
   - Uses VIN + Mileage for each call
   
3. **Step 3**: Returns JSON with 13 cards containing all required fields including auction data

### Pricing Fields Explained

- **adjusted_wholesale_auction_clean**: The wholesale/auction value in clean condition (what dealers pay at auctions)
- **adjusted_retail_clean**: The retail value in clean condition (what dealers sell for)
- **adjusted_tradein_clean**: The trade-in value in clean condition (what dealers offer for trade-ins)

### Notes

- **Auction Data**: The `adjusted_wholesale_auction_clean` field represents recent auction pricing data
- Wholesale values in BlackBook represent what vehicles sell for at dealer auctions
- Mileage affects all adjusted values
- Pricing values change based on province (regional pricing)
- VIN must be exactly 17 characters
- Mileage must be a positive integer
- All values are mileage-adjusted and province-specific
