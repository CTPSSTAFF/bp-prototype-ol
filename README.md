# bp-prototype-ol
Next-gen bicycle / pedestrian traffic count web application.

## Data Sources

### Bike-ped Traffic Count Locations

### Bike-ped Traffic Counts

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

## Colophon
Author: B. Krepp  
Date: 4 August 2023  
Place: cyberspace  