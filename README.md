# bp-prototype-ol
B-P prototype app using OpenLayers library

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

## Software Dependencies

## Colophon
Author: B. Krepp
Date: 4 August 2023
Place: cyberspace