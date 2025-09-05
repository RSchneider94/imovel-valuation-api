import { MergeDeep } from 'type-fest';
import { Database as DatabaseGenerated } from './database';
import { ZonevalStatsGroup } from '../services/zoneval';

// Re-export the Json type and helper types from the generated types
export {
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from './database';

// Define custom JSON types for better type safety
export type Database = MergeDeep<
  DatabaseGenerated,
  {
    public: {
      Tables: {
        property_market_cache: {
          Row: {
            zipcode_stats: ZonevalStatsGroup;
            neighbourhood_stats: ZonevalStatsGroup;
            city_stats: ZonevalStatsGroup;
            state_stats: ZonevalStatsGroup;
          };
          Insert: {
            zipcode_stats: ZonevalStatsGroup;
            neighbourhood_stats: ZonevalStatsGroup;
            city_stats: ZonevalStatsGroup;
            state_stats: ZonevalStatsGroup;
          };
          Update: {
            zipcode_stats?: ZonevalStatsGroup;
            neighbourhood_stats?: ZonevalStatsGroup;
            city_stats?: ZonevalStatsGroup;
            state_stats?: ZonevalStatsGroup;
          };
        };
      };
    };
  }
>;
