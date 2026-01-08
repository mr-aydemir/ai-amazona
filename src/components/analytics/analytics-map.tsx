
'use client';

import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';

const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json";

export function AnalyticsMap({ data }: { data: { code: string; value: number }[] }) {
  const maxValue = Math.max(...data.map(d => d.value), 0);
  const colorScale = scaleLinear<string>()
    .domain([0, maxValue])
    .range(["#EAEAEC", "#3b82f6"]);

  return (
    <div className="w-full h-[400px] border rounded-lg overflow-hidden bg-background">
      <ComposableMap projectionConfig={{ scale: 200 }}>
         <ZoomableGroup>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const cur = data.find((s) => s.code === geo.properties['Alpha-2'] || s.code === geo.properties['ISO_A2']); // Try to match ISO code
                // geoip-lite returns 2 letter country code (US, TR, etc.)
                // world-countries.json usually has properties like "name" and "Alpha-2" possibly?
                // Let's assume standard ISO 3166-1 alpha-2 codes.
                // NOTE: The json structure varies. "deldersveld" one usually has "Alpha-2". 
                // We'll try to match whatever we can.
                // If not found, just gray.
                
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
