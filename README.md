# bp-prototype-ol
Next-gen bicycle / pedestrian traffic count web application.

## Motivation and Rationale
### Motivation
The __motivation__ for the application in this repository was the funding of Boston Region MPO 
UPWP project 13803 for Federal Fiscal Year 2023: 'Update Bicycle/Pedestrian Count Database'.
While the bike-ped count database was in need of some internal reorganiation and 'cleaning'
of vestigial records that had crept into the data, the primary motivation was to update 
the bike-ped traffic counts _web application_. 

The bike-ped traffic count application was first written in 2008-2009. It employs an 
arcitecture which may have been relatively up-to-date at that time, but antiquated
by current /(2023\) standards. In particular:
* It uses Cold Fusion Markup Language \(__CFML__\) as the 'middleware' or 'glue' between
the client code running in a web browser and the backing database running on a server
* Since some time in the mid-2010s CTPS has used __Railo__ as its CFML 'engine'.
* Railo is an open-source implementation of CFML 
* Work on the Railo project was suspended sometime in the late 2010s; the project is
no longer supported, and it is no longer possible to even obtain an 'install image' for it
* It uses the Google Maps API to implement the 'mapping' functionality in the web client
* Code in the web client was written in 'early 2000s style' JavaScript: for example, it makes
no use of JavaScript support libraries, even libraries such as __jQuery__ which are regarded
as fundamental.
* Several user-interface/user-experience issues were reported with the application
which would have been very difficult to address in the existing architecture.

### Rationale
The __rationale__ for the approach taken here was as follows:
* Delivery of an updated version of the application was required by the end of 
Federal Fiscal Year 2023, i.e., September 30, 2023.
* Work on this project was begun in late June 2023.
* Ideally, a new version of the app would implement improvements in both the 'middleware'
software and the client-side software.
* In particular, the 'middleware' would be implemented afresh using a more modern 
'middleware' language such as PHP, or perhaps Ruby.
* However, CTPS has only minimal in-house expertise in PHP and none whatsoever in Ruby.
* The client-side code would be implemented using a more modern and more flexible 'mapping'
library than Google Maps, either leaflet.js or OpenLayers.
* The client-side code would use JavaScript libraries to streamline the code, such as
__jQuery__ to streamlne access to the DOM.
* CTPS has some in-house expertise with OpenLayers and leaflet.js.
* Prototyping revealed performance and memory consumption issues with the frequent addition and removal
of 'marker' objects in leaflet.js, as happens when multiple queries are run on the underlying data.
Leaflet.js does not support toggling the visibility of 'marker' objects on-and-off, for example 
depending upon whether they satisfy the critieria of a query. The only means available is to 
create-and-remove 'marker' objects afresh after each query. This operation was observed to 
cause a dramatic amount of RAM consumption in a browser running the client application.
* The current bike-ped traffic count locations spatial table is quite small; it contains fewer
than 300 features. When convereted to GeoJSON format, only about 100 KB is required to store it.
* The current bike-ped traffic counts table is also quite small; it contains fewwer
than 9,000 records. When converted to CSV format, only about 1.6 MB is required to store it.

### The Approach Taken in the Near-term
With these points in mind, the decision was taken in early July 2023 to implement an 
updated bike-ped traffic counts application __for the Federal Fiscal Year ending Septebmer 30, 2023__
using the following approach:
* The application will run entirely in the client. A backing database will not be used; 
consequently no 'middleware' code will be needed.
* The application will load all data from local files: a GeoJSON file containing the 
bike-ped traffic count location data, and a CSV file containing the bike-ped traffic counts.
* 'Mapping' functionality will be impelemted in the client using the OpenLayers library.
* Other JavaScript support libraries, such as __jQuery__ and __lodash__ will be used to
streamline implementation of the client-side code.

### The Future
The approach taken for this version of the application is admitedly an interim one,
it is a 'placeholder' that will serve for September 30, 2023 and the immediatly following weeks and months.
The intention is that in Federal Fiscal Year 2024 work on the application will resume,
focused on making it __scalable__ to many more count locations, and a vastly 
larger table of bike-ped counts \(including automated counts.\) This will entail 
some restructuring of the client-side code in order to implement a 'middleware' layer 
between the client and a backing database. The choice of implementaiton lanaguage for 
the 'middleware' layer is currently TBD, but PHP is a likely candidate.

Even though this implementation stores all data in-core, querying the underlying data has been
isloated in a few functions to facilitate migrating the application to a client-server 
architecture with a 'middleware' layer in between. These functions are:
* initialize_town_pick_list
* initialize_year_pick_list
* town_pick_list_handler
* year_pick_list_handler

and the _initialize_ function.
When the application is converted to use a 'middleware' layer to mediate between the client 
and a backing database, these functions will require reworking.

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
* a 'count-location detail' page, __countlocDetail.html__

Data structures and functions common to both pages is found in __js\/common.js__.   
Data structures and functions specific to 'main' page is found in __js\/prototype2.js__.
Data structures and fuctnions specific to the 'count-location detail' is found in __js\/countlocDetail.js__.

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

All libraries are loaded locally rather than from a CDN as they were during development.

## Organization of this Repository
The top-level of this repository contains the HTML files for the 'main' and 'detail' pages:
* index.html - HTML file for the 'main' a.k.a. 'search' page
* countlocDetail.html - HTML file for the 'count location detail' page

The remaining conents of the repository are found in the followign subdirectories:
* css - CSS styling rules
* data - data files read by the application
* img - PNG file for CTPS 'branding'
* js - JavaScript code for the application itself
* libs - JavaScript support libraries
* sld - styled layer descriptors (SLDs) for WMS layers used by the application
* sql - SQL scripts to create database tables for data used in the application

### 'css' Directory
This directory contains the following files:
* bike_ped_app.css - CSS rules for styling the 'main' page and 'count location detail' page

### 'data' Directory
This directory contains the following files:
* csv/
  * bp_counts.csv
* json/
  * ctps_bp_count_locations_pt.geo.json
  
### 'js' Directory
This directory contains the following files:
* prototype2.js - JavaScript code for the application 'main' page
* countlodDetail.js - JavaScript code for the 'count location detail' page
* common.js -- JavaScript data structures and functions used by both pages of the application

### 'libs' Directory
* d3-7.8.5.min.js - D3 JavaScript library version 7.8.5, used to load and parse CSV data \(minified form\)
* download.js - JavaScript library supporting 'download data' functionality
* download.min.js - JavaScript library supporting 'download data' functionality \(minified form\)
* jquery-3.7.0.min.js - jQuery JavaScript library version 3.7.0, used for DOM management \(minified form\)
* jsgrid-1.5.3.min.js - jsGrid JavaScript library version 1.5.3, used to display tabular output \(minified form\)
* jsgrid-1.5.3.min.css and jsgrid-1.5.3-jsgrid-theme.min.css - minified CSS files for use with jsGrid library
* lodash-4.17.21.js - lodash JavaScript library version 4.17.21, a functional programming library in JS
* ol-layerswitcher.js - JavaScript library supporting OpenLayers 'layer switcher' add-on control
* ol-layerswitcher.css - CSS for OpenLayers 'layer switcher' control
* openlayers-6.14.1-ol.js - JavaScript OpenLayers library, version 6.14.1
* openlayers-6.14.1-ol-css - CSS for OpenLayers library, version 6.14.1
* plotly-2.24.1.min.js - Plotly JavaScript data-viz library version 2.24.1 \(minified form\)

### 'sld' Directory
This directory contains the following files:
* a_point_blue.sld - SLD to style WMS layer of bike-ped count Locations
* lrse_bikes_on_road_bike_lane.sld - SLD to style subset of features in 'LRSE_Bikes' WMS layer for on-road bike lanes
* lrse_bikes_protected_bike_lane.sld - SLD to style subset of features in 'LRSE_Bikes' WMS layer for protected bike lanes
* lrse_bikes_shared_use_path.sld -- SLD to style subset of features in 'LRSE_Bikes' WMS layer for shared use paths
* lrse_bikes_bp_priority_roadway.sld - SLD to style subset of features in 'LRSE_Bikes' WMS layer for bicycle/pedestrian priority roadways

### 'sql' Directory
This directory contains the following files:
* create_ctps_bp_count_locations_pt.sql - SQL to create the bike-ped count locations spatial table in PostGIS/PostgreSQL
* create_bp_counts.sql -- SQL to create the bike-ped counts table in PostgreSQL
* create_ctps_ma_wo_prmpo_poly.sql - SQL to create the spatial table for a polygon layer representing
the parts of Massachusetts outside the Boston Region MPO area
* create_lrse_bikes_2023_0804.sql - SQL to create the spatial table for MassDOT's 'bike facilities' layer in PostGIS/PostgreSQL

## Colophon
Author: B. Krepp  
Date: 4-23 August 2023  
Location: cyberspace  