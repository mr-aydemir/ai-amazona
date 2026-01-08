
'use client';

import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';

countries.registerLocale(enLocale);

// Use a more reliable CDN for TopoJSON
const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

export function AnalyticsMap({ data, cityData }: { 
    data: { code: string; value: number }[],
    cityData?: { name: string; coordinates: [number, number]; value: number }[] 
}) {
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
                // Convert stored Alpha-2 code (e.g. TR) to Numeric (e.g. 792) to match TopoJSON
                const cur = data.find((s) => {
                    const numericCode = countries.alpha2ToNumeric(s.code);
                    // geo.id is usually a string "792", numericCode returns "792"
                    // Also check directly against properties if available
                    return numericCode === geo.id || s.code === geo.properties?.['Alpha-2'];
                });
                
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
          {cityData && cityData.map((city, index) => (
            <Marker key={index} coordinates={city.coordinates}>
              <circle r={4} fill="#F53" stroke="#fff" strokeWidth={2} />
              <text
                textAnchor="middle"
                y={-10}
                style={{ fontFamily: "system-ui", fill: "#5D5A6D", fontSize: "10px", fontWeight: "bold" }}
              >
                {city.name} ({city.value})
              </text>
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}
