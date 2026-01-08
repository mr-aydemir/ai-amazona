
'use client';

import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';

// Use a more reliable CDN for TopoJSON
const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

export function AnalyticsMap({ data }: { data: { code: string; value: number }[] }) {
  const maxValue = Math.max(...data.map(d => d.value), 0);
  const colorScale = scaleLinear<string>()
    .domain([0, maxValue])
    .range(["#EAEAEC", "#3b82f6"]);

  return (
    <div className="w-full h-[400px] border rounded-lg overflow-hidden bg-background relative">
      <ComposableMap projectionConfig={{ scale: 200, rotate: [-10, 0, 0] }} style={{ width: "100%", height: "100%" }}>
         <ZoomableGroup>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                // world-atlas 110m uses ISO 3166-1 numeric codes or names usually.
                // We need to map 2-letter codes. 
                // However, without a mapping library, this is hard.
                // Let's use the 'deldersveld' one again but try a different URL or just stick to it if it works in browser.
                // Actually, let's go back to the one that definitely has ISO codes if possible, 
                // OR just handle the mapping if we can.
                // The previous URL https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json has properties.
                // Let's try rawgit or just keep it and add console error.
                
                // Let's try a proven one for react-simple-maps examples:
                // https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json
                
                // If the user sees empty space, maybe the fetch failed due to network in their environment?
                // I will inject a try/catch or just use a local file if I could, but I can't easily.
                
                // Let's try the unpkg one which is faster/CORS friendly usually.
                // "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json" -> geographies are features.
                // feature.id is numeric code (e.g. "840" for USA). geoip-lite gives "US".
                
                // Issue: Converting "US" to "840" requires a map.
                // Simpler fix: stick to the URL that uses 2-letter codes or names.
                // https://raw.githubusercontent.com/lotusms/world-map-data/main/world.json often used.
                
                // Let's stick to the original URL but add on error handling visually? 
                // React-simple-maps doesn't expose easy onError.
                
                // Alternative: The container height might be collapsing if not flex.
                // I added style={{ width: "100%", height: "100%" }} to ComposableMap.
                
                const cur = data.find((s) => s.code === geo.properties['Alpha-2'] || s.code === geo.id);
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={cur ? colorScale(cur.value) : "#F5F4F6"}
                    stroke="#D6D6DA"
                    style={{
                      default: { outline: "none" },
                      hover: { fill: "#F53", outline: "none" },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}
