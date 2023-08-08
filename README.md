# bp-prototype-ol
Next-gen bicycle / pedestrian traffic count web application.

## Data Sources
The data sources for this application are:
* CTPS's database of bicycle / pedestrian traffic Counts
* CTPS's geographic point feature class of bicycle / pedestrian traffic count Locations
* MassDOT's 'bicycle facility layer' (LRSE_Bikes), an 'event layer' in the MassDOT Road Inventory

### Bicyle / Pedestrian Traffic Counts
CTPS's database of bicycle / pedestrian traffic counts resides in a table in a CTPS PostgreSQL database.
This table was expored in CSV format, and stored locally to the application in __data\/csv\/bp_counts.csv__.

### Bicyle / Pedestrian Traffic Count Locations
CTPS's geographic point feature class of bicycle / pedestrian traffic count locations is stored as a table
in a PostGIS-extension-enabled PostgreSQL database. 
This table is:
* Published as a WMS (and WFS) service by CTPS's GeoServer
* Exported in GeoJSON format, and stored locally to the application in __\/data\/json\/ctps_bp_count_locations_pt.geo.json__.

### MassDOT Bicycle Facilities (from Road Inventory)
The following command was issued to extract the bike data ('LRSE_Bikes') from the MassDOT Road Inventory:
```
arcpy.management.Append(
    inputs=r"'C:\Users\KnudsenD\AppData\Roaming\Esri\ArcGISPro\Favorites\PRD_RH as self BRANCH.sde\DBO.ALRS\DBO.LRSE_Bike'",
    target=r"C:\Users\KnudsenD\Documents\ArcGIS\Projects\MS2-TMC-attachment\bikes-MassDOT.gdb\LRSE_Bike",
    schema_type="TEST", # meaning source and target schemas must match for command to execute
    field_mapping=None, # source and target schemas will match so mapping is irrelevant
    subtype="",
    expression="To_Date IS NULL And Fac_Type IS NOT NULL",  # [unretired bike events] AND [those that exist (not planned only)]
    match_fields=None,
    update_geometry="NOT_UPDATE_GEOMETRY"
)
```
#### Facility Type Attribute
The __fac\_type__ attribute in the LRSE_Bikes feature class indicates the 'type' of each bicycle facility:
| fac_type | Meaning |
|----------|---------|
| 1 | on-road bicycle lane (unprotected) |
| 2 | on-road protected bicycle lane |
| 5 | shared-use path |
| 7 | bicycle\/pedestrian priority roadway |

### Area Outside the Boston Region MPO Area
The polygon from the MassGIS layer TOWNSSURVEY_POLYM for the towns outside
of the Boston Region MPO area were dissolved on 'all fields'; the resulting
table was named 'ctps_ma_wo_brmpo_poly'. This \(geographic\) table was
exported to the PostGIS-enabled PostgreSQL database on the MPO's external
webserver, and published by the GeoServer running there as the 
layer named 'postgis:ctps_ma_wo_brmpo_poly'.

## WMS Layers and Their Symbolization
This application uses 3 WMS layers published by the CTPS GeoServer:
| Layer | Contents |
| postgis:ctps_ma_wo_brmpo_poly | Area outside the Boston Reion MPO area |
| postgis:ctps_bp_count_locations_pt | CTPS bike-ped traffic count locations |
| postgis:massdot_lrse_bikes_20230804 | MassDOT bike facilities layer |

The 'area outside the MPO region' layer is symbolized by the SLD __polygon\_gray\_for\_non\_mpo.sld__.
The 'bike-ped count locations' layer is symbolized by the SLD __a\_point\_blue.sld__.

The 'lrse_bikes' layer is rendered by __four__ OpenLayers layers, each symbolizing only those
features of 'lrse_bikes' with a particular facility type, i.e., __fac\_type__:
| fac_type | SLD |
|----------|-----|
| 1 | lrse_bikes_on_road_bike_lane.sld |
| 2 | lrse_bikes_protected_bike_lane.sld |
| 5 | lrse_bikes_shared_use_path.sld |
| 7 | lrse_bikes_bp_priority_roadway.sld |

## Application Structure
The application consists of two 'single-page apps':
* a 'main' or 'search' page, __index.html__
* a 'count-location' detail page, __countlocDetail.html__

Logic common to both pages is found in __js\/common.js__. 
A  variety of'utility' functions are found in __js\/utils.js__.  
Logic for the 'main' page is \(currently\) found in __js\/prototype2.js__; logic for the 'detail' page is found in __js\/countlocDetail.js__.

## Software Dependencies
These single-page apps depend upon the following software libraries:  
| Library | Function |
| --------| -------- |
| jquery | DOM management |
| lodash | functional programming library |
| Open Layers | web mapping |
| Open Layers layer switcher | extension to Open Layers |
| D3 | CSV loader |
| Plotly | data visualization |
| download | data download functionality |
| jsGrid | tabular data display |

At the time of writing, __jquery__, __lodash__, and  __d3__ are loaded from a Content 
Delivery Network (CDN); the others are loaded locally. In production, all libraries will
probably be loaded from local files.

## Colophon
Author: B. Krepp  
Date: 4 August 2023  
Location: cyberspace  