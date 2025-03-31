// Define Data Sources
var soilTextureImage = ee.Image("OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02"),
    elevationImage = ee.Image("USGS/SRTMGL1_003"),
    modisLandCoverCollection = ee.ImageCollection("MODIS/006/MCD12Q1");

// Define Study Area from HydroSHEDS Basins
var dataset = ee.FeatureCollection("WWF/HydroSHEDS/v1/Basins/hybas_12");
var mainID = 1120029800;
var main = dataset.filter(ee.Filter.eq('MAIN_BAS', mainID));
var aoi = main;

// Define Dates for time-series data (MODIS NDVI, LULC)
// Note: Check MCD12Q1 (LULC) availability for the latest possible year
var date1 = '2020-01-01'; // Start of year
var date2 = '2021-01-01'; // Start of next year (covers full 'date1' year)

Map.addLayer(aoi, {'color':'grey', 'fillColor': 'rgba(0,0,0,0)'}, 'AOI Outline', true, 0.7);
Map.centerObject(aoi);

// --- R Factor Calculation (Constant based on input values) ---
var P_value = 780;        // Mean Annual Precipitation (mm)
var P1_value = 648;       // Average Max 24h Precipitation (mm)
var SCALE_FACTOR_NEG6 = 1e-6;
var CONSTANT_143 = 143;
var CONSTANT_89_7 = 89.7;
var P1_squared = Math.pow(P1_value, 2);
var PP1_squared = P_value * P1_squared;
var PP1_squared_scaled = PP1_squared * SCALE_FACTOR_NEG6;
var log_value = Math.log(PP1_squared_scaled) / Math.log(10); // log base 10
var multiplied_log_value = CONSTANT_143 * log_value;
var rFactorValue = multiplied_log_value + CONSTANT_89_7;
var R = ee.Image.constant(rFactorValue).rename('R');
Map.addLayer(R.clip(aoi), {min: 300, max: 900, palette: ['ffffcc','ffeda0','fed976','feb24c','fd8d3c','fc4e2a','e31a1c','bd0026','800026']}, 'R Factor Map', false); // Initially hidden

// --- K Factor Calculation (from OpenLandMap Soil Texture) ---
var soil_raw = soilTextureImage.select('b0').clip(aoi).rename('soil');
// Map.addLayer(soil_raw, {min: 1, max: 12}, 'Soil Types (Raw USDA Code)', false); // Optional display
var K = soil_raw.expression( // USDA TT Codes to K values
    "(b('soil') == 12) ? 0.0053" + // Clay
      ": (b('soil') == 11) ? 0.0170" + // Silty clay
        ": (b('soil') == 10) ? 0.045" +  // Sandy clay
           ": (b('soil') == 9) ? 0.050" +  // Clay loam
            ": (b('soil') == 8) ? 0.0499" + // Silty clay loam
            ": (b('soil') == 7) ? 0.0394" + // Sandy clay loam
            ": (b('soil') == 6) ? 0.0264" + // Loam
            ": (b('soil') == 5) ? 0.0423" + // Silt loam
            ": (b('soil') == 4) ? 0.0394" + // Silt
            ": (b('soil') == 3) ? 0.036" +  // Sandy loam
            ": (b('soil') == 2) ? 0.0341" + // Loamy sand
            ": (b('soil') == 1) ? 0.0288" + // Sand
             ": 0")
             .rename('K').clip(aoi);
Map.addLayer(K, {min: 0.005, max: 0.05, palette: ['fff7ec','fee8c8','fdd49e','fdbb84','fc8d59','ef6548','d7301f','b30000','7f0000']}, 'K Factor Map', false); // Initially hidden

// --- LS Factor Calculation (from SRTM DEM) ---
var elevation = elevationImage.select('elevation');
var slope_deg = ee.Terrain.slope(elevation);
var slope = slope_deg.divide(180).multiply(Math.PI).tan().multiply(100).clip(aoi); // Slope in percent
// Map.addLayer(slope, {min: 0, max: 25}, 'Slope (%)', false); // Optional display

var LS4 = Math.sqrt(500/100); // Ensure '500' flow accumulation factor is appropriate
var LS3 = slope.multiply(0.53);
var LS2 = slope.multiply(slope).multiply(0.076); // slope^2 * 0.076
var LS1 = LS3.add(LS2).add(0.76);
var LS = LS1.multiply(LS4).rename("LS").clip(aoi);
Map.addLayer(LS, {min: 0, max: 20, palette: ['ffffe5','fff7bc','fee391','fec44f','fe9929','ec7014','cc4c02','993404','662506']}, 'LS Factor Map', false); // Initially hidden

// --- C Factor Calculation (from MODIS NDVI) ---
var ndvi_median = ee.ImageCollection("MODIS/006/MOD13A2")
    .filterDate(date1, date2)
    .median()
    .multiply(0.0001) // Apply scale factor
    .select('NDVI')
    .clip(aoi);
// Map.addLayer(ndvi_median, {min: 0.1, max: 0.85}, 'MODIS NDVI (Median)', false); // Optional display

// Using original C Factor formula provided by user
var C = ndvi_median.expression(
    '0.1 * (((- NDVI + 1) / (2)))', {'NDVI': ndvi_median})
    .rename('C_Factor_MODIS')
    .unmask(0.5); // Unmask gaps with a mid-range C value (adjust if needed)
Map.addLayer(C, {min: 0, max: 0.5, palette: ['006400', '32CD32', 'FFFF00', 'FFA500', 'FF0000', '8B0000']}, 'C Factor Map', false); // Initially hidden

// --- P Factor Calculation (from MODIS LULC & Slope) ---
var lulc = modisLandCoverCollection.filterDate(date1, date2).select('LC_Type1')
        .first() // Gets the LULC map for the year defined by date1/date2
        .clip(aoi).rename('lulc');
// Map.addLayer (lulc, {}, 'LULC (MODIS)', false); // Optional display
var lulc_slope = lulc.addBands(slope);
var P = lulc_slope.expression( // Based on LULC type and slope ranges
     "(b('lulc') < 11) ? 0.8" + // Forests/Shrubs etc.
      ": (b('lulc') == 11) ? 1.0" + // Wetlands (assume P=1)
      ": (b('lulc') == 13) ? 1.0" + // Urban
      ": (b('lulc') > 14) ? 1.0" + // Barren/Water etc. (assume P=1)
      // Cropland/Mosaic P-values based on slope: Adjust these based on local practices/literature if known
      ": (b('slope') <= 2) and ((b('lulc')==12) or (b('lulc')==14)) ? 0.6" +
    ": (b('slope') > 2 and b('slope') <= 5) and ((b('lulc')==12) or (b('lulc')==14)) ? 0.5" +
    ": (b('slope') > 5 and b('slope') <= 8) and ((b('lulc')==12) or (b('lulc')==14)) ? 0.5" +
    ": (b('slope') > 8 and b('slope') <= 12) and ((b('lulc')==12) or (b('lulc')==14)) ? 0.6" +
    ": (b('slope') > 12 and b('slope') <= 16) and ((b('lulc')==12) or (b('lulc')==14)) ? 0.7" +
    ": (b('slope') > 16 and b('slope') <= 20) and ((b('lulc')==12) or (b('lulc')==14)) ? 0.8" +
    ": (b('slope') > 20) and ((b('lulc')==12) or (b('lulc')==14)) ? 0.9" +
    ": 1" // Default
).rename('P').clip(aoi);
Map.addLayer (P, {min:0.5, max:1.0, palette: ['00FF00', 'FFFF00', 'FFA500', 'FF0000']}, 'P Factor Map', false); // Initially hidden

// --- Estimating Soil Loss (RUSLE: A = R * K * LS * C * P) ---
var soil_loss = ee.Image(R.multiply(K).multiply(LS).multiply(C).multiply(P)).rename("Soil Loss"); // t/ha/yr

// --- Visualization Setup ---
var style = ['00FF00', 'FFFF00', 'FF7F00', 'FF0000', '8B0000']; // Green -> Yellow -> Orange -> Red -> DarkRed

// Add Continuous Soil Loss Layer (raw values, hidden by default)
Map.addLayer(soil_loss, {
    min: 0,
    max: 75,  // Adjust based on observed max values in AOI (use Inspector)
    palette: style
}, 'Soil Loss (Continuous)', false);

// --- Soil Loss Classification ---
var SL_class = soil_loss.expression(
    "(b('Soil Loss') < 5) ? 1" +   // Class 1
    ": (b('Soil Loss') < 10) ? 2" +  // Class 2
    ": (b('Soil Loss') < 20) ? 3" +  // Class 3
    ": (b('Soil Loss') < 40) ? 4" +  // Class 4
    ": 5")                         // Class 5 (>= 40)
    .rename('SL_class').clip(aoi);

// Add Classified Soil Loss Layer (Visible by Default)
Map.addLayer(SL_class, {
    min: 1, // Classes start at 1
    max: 5,
    palette: style
}, 'Soil Loss Class', true);

// --- Area Calculation per Class (for Chart) ---
var areaImage = ee.Image.pixelArea().addBands(SL_class); // Area in m^2
var areas = areaImage.reduceRegion({
      reducer: ee.Reducer.sum().group({ groupField: 1, groupName: 'class' }),
      geometry: aoi.geometry(),
      scale: 500, // Match scale of dominant input data (MODIS)
      maxPixels: 1e10
    });
// print('Raw area calculation result (m^2):', areas); // Optional print

// --- Chart Data Preparation ---
var classAreasRaw = ee.List(areas.get('groups'));
var areaDictHa = ee.Dictionary(classAreasRaw.iterate(function(item, dict) {
  item = ee.Dictionary(item);
  var classNumStr = ee.Number(item.get('class')).format('%d');
  var areaHa = ee.Number(item.get('sum')).divide(1e4); // Convert m^2 to Hectares
  return ee.Dictionary(dict).set(classNumStr, areaHa);
}, ee.Dictionary()));
// print('Area Dictionary (Class: Hectares):', areaDictHa); // Optional print

// Define Class Info (Labels match classification ranges, Colors match style)
var classInfo = [
  {label: "Slight (<5 t/ha/yr)", number: 1, color: style[0]},
  {label: "Moderate (5-10 t/ha/yr)", number: 2, color: style[1]},
  {label: "High (10-20 t/ha/yr)", number: 3, color: style[2]},
  {label: "Very high (20-40 t/ha/yr)", number: 4, color: style[3]},
  {label: "Severe (>=40 t/ha/yr)", number: 5, color: style[4]}
];

// Prepare ordered data for the chart, handling potentially missing classes
var chartLabels = [];
var chartAreas = []; // Server-side list of numbers initially
var chartColors = [];
classInfo.forEach(function(info) {
  chartLabels.push(info.label);
  // Retrieve area for this class number (as string), default to 0 if absent
  var areaForClass = ee.Number(areaDictHa.get(String(info.number), 0));
  chartAreas.push(areaForClass);
  chartColors.push(info.color);
});

// --- Generate Pie Chart ---
// Evaluate server-side numbers to get client-side values for chart library
ee.List(chartAreas).evaluate(function(clientAreas) {
   // Optional: Round client-side values for cleaner display
   var clientAreasRounded = clientAreas.map(function(a){ return Math.round(a * 10) / 10; });

  print(ui.Chart.array.values(clientAreasRounded, 0, chartLabels)
      .setChartType('PieChart')
      .setOptions({
          title: 'Soil Loss Area by Class (Hectares)',
          pieSliceText: 'percentage',
           slices: { // Apply colors explicitly by index for certainty
             0: { color: chartColors[0] }, 1: { color: chartColors[1] },
             2: { color: chartColors[2] }, 3: { color: chartColors[3] },
             4: { color: chartColors[4] }
            },
           legend: {position: 'right'},
           pieHole: 0.3 // Make it a Donut chart
      }));
});

// --- Calculate Mean Soil Loss for the whole AOI ---
var meanSoilLossValue = soil_loss.reduceRegion({ // <---- CORRECTED: Use 'soil_loss'
    reducer: ee.Reducer.mean(),
    geometry: aoi.geometry(), // Use the combined geometry of all features in aoi
    scale: 500,               // Match the dominant analysis scale
    maxPixels: 1e10           // Allow for large regions
}).get('Soil Loss');          // Extract the value from the dictionary

// --- Print ONLY the Mean Soil Erosion ---
print('Mean Soil Loss (t/ha/yr):', meanSoilLossValue);

// --- Legend Panel ---
var legend = ui.Panel({ style: { position: 'bottom-left', padding: '8px 15px', backgroundColor: 'rgba(255, 255, 255, 0.8)' }});
var legendTitle = ui.Label({ value: 'Soil Loss (t/ha/yr)', style: { fontWeight: 'bold', fontSize: '16px', margin: '0 0 4px 0', padding: '0'} });
legend.add(legendTitle);

// Function to create one row of the legend
var makeRow = function(color, name) {
  var colorBox = ui.Label({ style: { backgroundColor: '#' + color, padding: '8px', margin: '0 0 4px 0', border: '1px solid grey'} });
  var description = ui.Label({ value: name, style: { margin: '0 0 4px 6px', fontSize: '12px'} });
  return ui.Panel({ widgets: [colorBox, description], layout: ui.Panel.Layout.Flow('horizontal') });
};

// Add legend rows using the consistent classInfo
classInfo.forEach(function(info){
   legend.add(makeRow(info.color, info.label));
});
Map.add(legend);

