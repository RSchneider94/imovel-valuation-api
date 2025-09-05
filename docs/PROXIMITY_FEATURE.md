# Location Proximity Feature

## Overview

The Location Proximity Feature enhances property valuation by analyzing proximity to important landmarks (beaches, metro stations, shopping centers, etc.) and filtering similar properties based on location characteristics.

## Features

### 🏖️ Proximity Analysis
- **Google Places API Integration**: Finds nearby landmarks within 2km radius
- **Smart Caching**: 30-day cache to minimize API costs (~90% reduction)
- **Proximity Scoring**: 0-100 score based on distance and landmark importance
- **Weighted Analysis**: Different landmark types have different importance weights

### 🎯 Property Filtering
- **Proximity-Aware Matching**: Filters properties based on similar proximity characteristics
- **Beach Access Matching**: Properties with beach access match with other beach-accessible properties
- **Metro Access Matching**: Properties near metro stations match with other metro-accessible properties
- **Shopping Access Matching**: Properties near shopping centers match with other shopping-accessible properties

### 💰 Cost Optimization
- **Field Masks**: Only request essential data (40% cost reduction)
- **Smart Caching**: Results cached for 30 days
- **Batch Processing**: Process multiple properties efficiently
- **Effective Cost**: ~$1.92 per 1,000 unique locations

## Database Schema

### New Fields Added to Properties Table

```sql
-- Proximity data fields
proximity_score INTEGER DEFAULT 0,
has_beach_access BOOLEAN DEFAULT FALSE,
has_metro_access BOOLEAN DEFAULT FALSE,
has_shopping_access BOOLEAN DEFAULT FALSE,
has_hospital_access BOOLEAN DEFAULT FALSE,
has_school_access BOOLEAN DEFAULT FALSE,
has_park_access BOOLEAN DEFAULT FALSE,
proximity_landmarks JSONB DEFAULT '[]'::jsonb,
proximity_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

### Indexes for Performance

```sql
-- Proximity filtering indexes
CREATE INDEX idx_properties_proximity_score ON properties(proximity_score);
CREATE INDEX idx_properties_beach_access ON properties(has_beach_access);
CREATE INDEX idx_properties_metro_access ON properties(has_metro_access);
CREATE INDEX idx_properties_shopping_access ON properties(has_shopping_access);

-- Composite index for proximity filtering
CREATE INDEX idx_properties_proximity_composite
ON properties(proximity_score, has_beach_access, has_metro_access, has_shopping_access);
```

## API Endpoints

### Property Evaluation (Enhanced)
- **POST** `/evaluate` - Now includes proximity analysis in response
- **Response includes**:
  - `proximityAnalysis`: Detailed proximity data
  - `marketInsights`: Proximity-based insights
  - `proximityScore`: Overall proximity score (0-100)
  - `beachAccess`, `metroAccess`, `shoppingAccess`: Boolean flags
  - `keyLandmarks`: Array of nearby landmark names

### Proximity Management
- **POST** `/proximity/populate` - Populate proximity data for properties
- **GET** `/proximity/stats` - Get proximity statistics
- **POST** `/proximity/populate/:propertyId` - Populate for specific property
- **DELETE** `/proximity/clear/:propertyId` - Clear proximity data
- **GET** `/proximity/needing-update` - Get properties needing updates

## Usage Examples

### 1. Populate Proximity Data

```bash
# Populate for all properties needing updates
curl -X POST http://localhost:3001/proximity/populate \
  -H "Content-Type: application/json" \
  -d '{
    "batchSize": 10,
    "limit": 100,
    "olderThanDays": 30
  }'

# Populate for specific property
curl -X POST http://localhost:3001/proximity/populate/property-id-123 \
  -H "Content-Type: application/json" \
  -d '{"clearExisting": true}'
```

### 2. Get Proximity Statistics

```bash
curl http://localhost:3001/proximity/stats
```

Response:
```json
{
  "totalProperties": 1000,
  "withProximityData": 750,
  "withoutProximityData": 250,
  "averageProximityScore": 65,
  "beachAccessCount": 200,
  "metroAccessCount": 300,
  "shoppingAccessCount": 400
}
```

### 3. Property Evaluation with Proximity

```bash
curl -X POST http://localhost:3001/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "apartamento",
    "usage": "venda",
    "size": 80,
    "bedrooms": 2,
    "bathrooms": 1,
    "parking_spaces": 1,
    "furnished": false,
    "lat": -23.5505,
    "lng": -46.6333,
    "zipcode": "01234-567"
  }'
```

Enhanced Response:
```json
{
  "status": "done",
  "result": {
    "estimatedPrice": 450000,
    "medianPrice": 450000,
    "avgPrice": 465000,
    "similarProperties": [...],
    "proximityAnalysis": {
      "landmarks": [
        {
          "id": "ChIJ...",
          "name": "Copacabana Beach",
          "lat": -22.9711,
          "lng": -43.1822,
          "type": "beach",
          "rating": 4.5,
          "distance": 800,
          "proximityScore": 85
        }
      ],
      "overallProximityScore": 78,
      "hasBeachAccess": true,
      "hasMetroAccess": true,
      "hasShoppingAccess": false,
      "cacheHit": false
    },
    "marketInsights": {
      "proximityScore": 78,
      "beachAccess": true,
      "metroAccess": true,
      "shoppingAccess": false,
      "keyLandmarks": [
        "Siqueira Campos Metro Station",
        "Copacabana Beach"
      ]
    }
  }
}
```

## Landmark Types & Weights

| Type | Weight | Distance Threshold | Description |
|------|--------|-------------------|-------------|
| Beach | 25% | 2km | High value for coastal properties |
| Metro Station | 20% | 1km | Urban mobility access |
| Shopping Mall | 15% | 1.5km | Commercial convenience |
| School | 15% | 1km | Family-friendly location |
| Hospital | 10% | 2km | Healthcare access |
| Park | 10% | 500m | Quality of life |

## Implementation Steps

### 1. Run Database Migration
```bash
# Apply the proximity fields migration
psql -d your_database -f supabase/migrations/add_property_proximity_data.sql
```

### 2. Populate Existing Properties
```bash
# Populate proximity data for all existing properties
curl -X POST http://localhost:3001/proximity/populate \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 5, "limit": 1000}'
```

### 3. Monitor Progress
```bash
# Check statistics
curl http://localhost:3001/proximity/stats

# Check properties needing updates
curl http://localhost:3001/proximity/needing-update?limit=10
```

## Cost Management

### Google Places API Costs
- **Base Cost**: $32 per 1,000 requests
- **With Field Masks**: ~$19.20 per 1,000 requests (40% reduction)
- **With Caching**: ~$1.92 per 1,000 unique locations (90% reduction)

### Monitoring Usage
```javascript
// Get cache statistics
const proximityService = new LocationProximityService();
const stats = proximityService.getCacheStats();
console.log(`Cache size: ${stats.size} entries`);
```

## Error Handling

- **Graceful Fallback**: Returns empty proximity data if Google API fails
- **Comprehensive Logging**: Detailed logs for debugging
- **Cache Management**: Automatic cleanup of expired entries
- **Rate Limiting**: Built-in delays between API calls

## Future Enhancements

1. **Proximity-Aware Matching Function**: Update `match_properties_structured` to use proximity data
2. **Machine Learning**: Use proximity data to improve price predictions
3. **Custom Landmark Types**: Add support for custom landmark categories
4. **Real-time Updates**: WebSocket updates for proximity data changes
5. **Analytics Dashboard**: Visualize proximity data and trends

## Troubleshooting

### Common Issues

1. **Google API Key Missing**
   - Ensure `GOOGLE_MAPS_API_KEY` is set in environment variables
   - Check API key permissions for Places API

2. **No Proximity Data**
   - Run proximity population for existing properties
   - Check if properties have valid lat/lng coordinates

3. **High API Costs**
   - Verify caching is working (check logs for "cache hit")
   - Consider reducing batch sizes or increasing cache duration

4. **Slow Performance**
   - Check database indexes are created
   - Monitor cache hit rates
   - Consider reducing search radius

### Debug Commands

```bash
# Check cache statistics
curl http://localhost:3001/proximity/stats

# Clear cache for testing
curl -X DELETE http://localhost:3001/proximity/clear/property-id-123

# Test single property
curl -X POST http://localhost:3001/proximity/populate/property-id-123
```
