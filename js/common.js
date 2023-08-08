// common.js
// Data structures used in both the 'main' and 'detail' pages, each of which is a separate 'single page app'.
// Many of these pertain to the OpenLayers map used in each page.

// Data source: count data
var countsURL = 'data/csv/bp_counts.csv';

// Data source: count locations 
var countlocsURL = 'data/json/ctps_bp_count_locations_pt.geo.json';

// Array of GeoJSON features for ALL count locations
var all_countlocs = [];

// Array of 'all counts' and 'selected counts'
var all_counts = [],
    selected_counts = [];
	
	///////////////////////////////////////////////////////////////////////////////
// Stuff for OpenLayers mapping
//

// URLs for MassGIS basemap layer services
var mgis_serviceUrls = { 
    'topo_features'     :  "https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Topographic_Features_for_Basemap/MapServer",
    'basemap_features'  :  "https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Basemap_Detailed_Features/MapServer",
    'structures'        :  "https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Structures/MapServer",
    'parcels'           :  "https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Level3_Parcels/MapServer"
};

// OpenLayers layers for MassGIS basemap layers used in our map
// NOTE: This is populated in initialize_map
var mgis_basemap_layers = { 'topo_features'     : null,     // bottom layer
                            'structures'        : null,     
                            'basemap_features'  : null,     // on top of 'structures' so labels aren't obscured
                            'parcels'           : null      // unused; not populated
};

// OpenLayers layer for OpenStreetMap basesmap layer
var osm_basemap_layer = new ol.layer.Tile({ source: new ol.source.OSM(),
											type: 'base',
											title: 'Open Street Map',
											visible: false }); 

// OpenLayers layer for Stamen basemap layer
var stamen_basemap_layer = new ol.layer.Tile({ source: new ol.source.Stamen({layer: 'toner-lite',
		                                                                     url: "https://stamen-tiles.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png" }), 
											   type: 'base',
											   title: 'Stamen',
											   visible: false });
											   
// Varioius things for WMS and WFS layers
// First, folderol to allow the app to run on appsrvr3 as well as "in the wild"
var szServerRoot = location.protocol + '//' + location.hostname;
var nameSpace;
if (location.hostname.includes('appsrvr3')) {   
    szServerRoot += ':8080/geoserver/';  
	nameSpace = 'ctps_pg';
} else {
	// Temp hack to allow working from home
    // szServerRoot += '/maploc/';
	szServerRoot = 'https://www.ctps.org/maploc/';
	nameSpace = 'postgis';
}
var szWMSserverRoot = szServerRoot + '/wms'; 
var szWFSserverRoot = szServerRoot + '/wfs'; 

// Create WMS layers
var lrse_bikes_shared_use_wms = new ol.layer.Tile({ source: new ol.source.TileWMS({ url		: szWMSserverRoot,
																					params	: { 'LAYERS': 'postgis:massdot_lrse_bikes_20230804', 
																								'STYLES': 'lrse_bikes_shared_use_path',
																								'TRANSPARENT': 'true'
																			  }
															}),
													title: 'Shared Use Bicycle Paths',	
													visible: true
												});

var lrse_bikes_protected_lane_wms = new ol.layer.Tile({ source: new ol.source.TileWMS({ url		: szWMSserverRoot,
																					    params	: { 'LAYERS': 'postgis:massdot_lrse_bikes_202300804', 
																									'STYLES': 'lrse_bikes_protected_bike_lane',
																									'TRANSPARENT': 'true'
																			  }
																}),
														title: 'On-road Protected Bicycle Lanes',	
													visible: true
												});	

var lrse_bikes_on_road_lane_wms = new ol.layer.Tile({ source: new ol.source.TileWMS({ url		: szWMSserverRoot,
																					  params	: { 'LAYERS': 'postgis:massdot_lrse_bikes_202300804', 
																									'STYLES': 'lrse_bikes_on_road_bike_lane',
																									'TRANSPARENT': 'true'
																			  }
																}),
													title: 'On-road Unprotected Bicycle Lanes',	
													visible: true
												});
												
var lrse_bikes_bp_priority_roadway_wms = new ol.layer.Tile({ source: new ol.source.TileWMS({ url		: szWMSserverRoot,
																					  params	: { 'LAYERS': 'postgis:massdot_lrse_bikes_20230804', 
																									'STYLES': 'lrse_bikes_bp_priority_roadway',
																									'TRANSPARENT': 'true'
																			  }
																}),
													title: 'Bicycle/Pedestrian Priority Roadway',	
													visible: true
												});

var bike_layer_group = new ol.layer.Group({ title: 'Bicycle Facilities (MassDOT)', 
											fold: 'open',
											layers: [lrse_bikes_shared_use_wms,
													 lrse_bikes_protected_lane_wms,
													 lrse_bikes_on_road_lane_wms,
													 lrse_bikes_bp_priority_roadway_wms
													 ] 
										});

var ma_wo_brmpo_poly_wms = new ol.layer.Tile({	source: new ol.source.TileWMS({ url		: szWMSserverRoot,
																				params	: { 'LAYERS': 'postgis:ctps_ma_wo_brmpo_poly', 
																							'STYLES': 'polygon_gray_for_non_mpo_area',
																						   'TRANSPARENT': 'true'
																			  }
																}),
												title: 'Area Outside Boston Region MPO',	
												visible: true
											});

var bp_countlocs_wms = new ol.layer.Tile({	source: new ol.source.TileWMS({ url		: szWMSserverRoot,
																			params	: { 'LAYERS': 'postgis:ctps_bp_count_locations_pt', 
																						'STYLES': 'a_point_blue',
																						'TRANSPARENT': 'true'
																			  }
																}),
											title: 'Bike-Ped Count Locations',	
											visible: true
										});	

// Vector point layer for selected count locations
var selected_countlocs_style = new ol.style.Style({ image: new ol.style.Circle({ radius: 7.0,
                                                                                 fill: new ol.style.Fill({color: 'gold'}),
																				 stroke: new ol.style.Stroke({color: 'black', width: 1.0})
																				}) 
                                                                             });
var selected_countlocs_layer = new ol.layer.Vector({ title: 'Selected Count Locations',
								                     source	: new ol.source.Vector({ wrapX: false }),
								                     style: selected_countlocs_style
								                   });

// Varioius things for WMS and WFS layers
// First, folderol to allow the app to run on appsrvr3 as well as "in the wild"
var szServerRoot = location.protocol + '//' + location.hostname;
var nameSpace;
if (location.hostname.includes('appsrvr3')) {   
    szServerRoot += ':8080/geoserver/';  
	nameSpace = 'ctps_pg';
} else {
	// Temp hack to allow working from home
    // szServerRoot += '/maploc/';
	szServerRoot = 'https://www.ctps.org/maploc/';
	nameSpace = 'postgis';
}
var szWMSserverRoot = szServerRoot + '/wms'; 
var szWFSserverRoot = szServerRoot + '/wfs'; 


// OpenLayers 'map' object:
var ol_map = null;

// Elements that make up an OpenLayers popup 'overlay'
var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');

// Add a click handler to hide the popup
closer.onclick = function () { 
	overlay.setPosition(undefined);
	closer.blur();
	return false;
};

// Create an overlay to anchor the popup to the map
var overlay = new ol.Overlay({ element: container,
                               autoPan: { animation: { duration: 250 } }
                             });

// End of stuff for OpenLayers mapping  
///////////////////////////////////////////////////////////////////////////////


function make_popup_content(feature) {
	var props, loc_id, counts, 
	    oldest_count_date, newest_count_date, 
	    newest_counts = [], newest_count_summary = {}, 
	    am_peak = 0,  pm_peak = 0;
		
	props = feature.getProperties().properties;
	loc_id = props.loc_id;
	counts = _.filter(all_counts, function(c) { return c.bp_loc_id == loc_id; });
	
	// Defensive programming:
	// Believe it or not, there are some count locations with no counts!
	if (counts.length == 0) {
		content = 'No counts with count loc_id == ' + loc_id + ' found.';
		return content;
	}
	
	counts = _.sortBy(counts, [function(o) { return o.count_date.substr(0,10); }]);
	oldest_count_date = counts[0].count_date.substr(0,10);
	newest_count_date = counts[counts.length-1].count_date.substr(0,10);
	newest_counts = _.filter(counts, function(c) { return c.count_date.substr(0,10) == newest_count_date; });
	
	newest_count_summary = summarize_set_of_counts_by_quarter_hour(newest_counts);
	// AM and PM peak for newest count
	am_peak = calc_am_peak(newest_count_summary);
	pm_peak = calc_pm_peak(newest_count_summary);
		  
	content = 'Location ID ' + loc_id + '</br>';
    content += props.description + '</br>';
	content += 'Most recent count : ' + newest_count_date + '</br>';
	content += 'Total volume AM peak : ' + am_peak + '</br>';
	content += 'Total volume PM peak : ' + pm_peak + '</br>';
	content += 'Oldest count : ' + oldest_count_date + '</br>';		
	
	return content;
} // make_popup_content

// onclick_handler: on-click event handler for OpenLayers map
//
// If there is a feature at the clicked location, calls
// make_popup_content to generate content for an OpenLayers
// popup, and then sets the popup's position on the map.
var onclick_handler = function(evt) {
	var pixel = evt.pixel,
	    features = [], feature, content, coordinate;
	const hitTolerance = 100;	// hit-test tolerance, in pixels
		
	if (ol_map.hasFeatureAtPixel(pixel, { 'hitTolerance': hitTolerance }) === true) {
		ol_map.forEachFeatureAtPixel(pixel, function(feature, layer) {
			features.push(feature);
		}, { 'hitTolerance': hitTolerance } );
		
		// At least for now, we'll just work with the 1st feature
		feature = features[0];
		content = document.getElementById('popup-content');
		coordinate = evt.coordinate;
		content.innerHTML = make_popup_content(feature);
		overlay.setPosition(coordinate);
	} else {
		overlay.setPosition(undefined);
		closer.blur();
	}
	return; 
} // onclick_handler