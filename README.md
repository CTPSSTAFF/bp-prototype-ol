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

## Application Structure
The application consists of two 'single-page apps':
* a 'main' or 'search' page, __index.html__
* a 'count-location' detail page, __countlocDetail.html__

Logic common to both pages is found in __js\/common.js__; common 'utility' functions are found in __js\/utils.js__.  
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