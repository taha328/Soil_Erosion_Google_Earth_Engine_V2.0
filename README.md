# **Soil Erosion Prediction using RUSLE in Google Earth Engine**  
**Predicting soil loss due to water erosion with satellite data and the Revised Universal Soil Loss Equation (RUSLE).**  

---

## **📌 Table of Contents**  
1. [Project Overview](#-project-overview)  
2. [Datasets Used](#-datasets-used)  
3. [Methodology](#-methodology)  
4. [Results](#-results)  
5. [How to Run the Code](#-how-to-run-the-code)  
6. [Limitations & Future Work](#-limitations--future-work)  
7. [References](#-references)  

---

## **🌍 Project Overview**  
This project estimates **soil erosion risk** using the **Revised Universal Soil Loss Equation (RUSLE)** in **Google Earth Engine (GEE)**. It calculates annual soil loss (tons/ha/year) by analyzing:  
- **Rainfall erosivity (R)**  
- **Soil erodibility (K)**  
- **Slope length & steepness (LS)**  
- **Land cover (C)**  
- **Conservation practices (P)**  

**Use Case:**  
- Land management & conservation planning  
- Watershed erosion risk assessment  
- Agricultural sustainability studies  

---

## **📂 Datasets Used**  
| **Dataset** | **Source** | **Purpose** | **Resolution** |  
|------------|-----------|------------|--------------|  
| Soil Texture | `OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02` | K Factor (Soil Erodibility) | 250m |  
| Elevation (DEM) | `USGS/SRTMGL1_003` | LS Factor (Slope) | 30m |  
| Land Cover | `MODIS/006/MCD12Q1` | C & P Factors | 500m |  
| NDVI | `MODIS/006/MOD13A2` | Vegetation Cover (C Factor) | 1km |  
| Watershed Boundaries | `WWF/HydroSHEDS/v1/Basins/hybas_12` | Study Area (AOI) | Vector |  

---

## **📊 Methodology**  
### **1. RUSLE Equation**  
\[
A = R * K * LS * C * P
\]  
- **A** = Annual soil loss (t/ha/yr)  
- **R** = Rainfall erosivity (MJ·mm/ha·h/yr)  
- **K** = Soil erodibility (t·ha·h/ha·MJ·mm)  
- **LS** = Slope length & steepness (unitless)  
- **C** = Cover management (0–1)  
- **P** = Support practices (0–1)  

### **2. Workflow**  
1. **Define AOI** (HydroSHEDS basin).  
2. **Calculate R Factor** from rainfall data.  
3. **Derive K Factor** from soil texture.  
4. **Compute LS Factor** from SRTM DEM.  
5. **Estimate C Factor** from MODIS NDVI.  
6. **Assign P Factor** based on land cover & slope.  
7. **Predict soil loss** and classify severity.  

---

## **📈 Results**  
### **Output Maps**  
- **R, K, LS, C, P Factor Maps**  
- **Soil Loss (Continuous)**  
- **Soil Loss Classification**:  
  - **Slight (<5 t/ha/yr)**  
  - **Moderate (5–10)**  
  - **High (10–20)**  
  - **Very High (20–40)**  
  - **Severe (≥40)**  
![Map Output](https://github.com/taha328/Soil_Erosion_Google_Earth_Engine_V2.0/blob/main/Capture.PNG?raw=true)
### **Statistics**  
- Mean soil loss for AOI (e.g., `12.5 t/ha/yr`).  
- Area distribution by erosion class (pie chart).  

---

## **🚀 How to Run the Code**  
1. **Open Google Earth Engine (GEE) Code Editor**: [https://code.earthengine.google.com/](https://code.earthengine.google.com/)  
2. **Paste the script** ( in `.js` file).  
3. **Adjust parameters**:  
   - Change `mainID` for a different watershed.  
   - Modify dates (`date1`, `date2`) for temporal analysis.  
4. **Run & Visualize**:  
   - Toggle layers in the **Map** panel.  
   - Check **Console** for mean soil loss.  

---

## **⚠️ Limitations & Future Work**  
### **Limitations**  
- **Resolution**: MODIS (500m) may miss small-scale erosion.  
- **Static R Factor**: Assumes constant rainfall erosivity.  
- **Simplified LS**: Uses fixed flow accumulation (500m).  

### **Improvements**   
- Incorporate **local rainfall data** for dynamic R Factor.  
- Validate with ground-truth soil loss measurements.  

---

## **📚 References**  
1. Wischmeier, W.H., & Smith, D.D. (1978). *Predicting Rainfall Erosion Losses*. USDA Handbook 537.  
2. Renard, K.G., et al. (1997). *Predicting Soil Erosion by Water: A Guide to Conservation Planning with RUSLE*.
3. Salhi, A., El Hasnaoui, Y., Pérez Cutillas, P. et al. Soil erosion and hydroclimatic hazards in major African port cities: the case study of Tangier. Sci Rep 13, 13158 (2023).[https://doi.org/10.1038/s41598-023-40135-3](https://doi.org/10.1038/s41598-023-40135-3) 
4. Google Earth Engine Docs: [https://developers.google.com/earth-engine/](https://developers.google.com/earth-engine/)  

---

## **💡 Contact**  
For questions or collaborations:  
- **Email**: tahaelouali2016@gmail.com
- **Email**: allali.mohamedamine89@gmail.com  
