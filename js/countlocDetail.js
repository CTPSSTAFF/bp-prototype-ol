// Prototype of next-gen bike-ped counts web application 'count location detail page' logic
//
// Data: 'all count locations' map data from WMS service
//       'selected count locations' - OpenLayers vector layer
//		 'counts' data - CSV file
// Mapping platform: OpenLayers
// Basemap: Open Street Map
//
// Author: Ben Krepp, bkrepp@ctps.org

// Data source: count data
var countsURL = 'data/csv/bp_counts.csv';

// Data source: count locations 
var countlocsURL = 'data/json/ctps_bp_count_locations_pt.geo.json';

var counts4countloc = []	// counts for current count location
    count_ids =       [];	// count_id's for these counts
	
// *** TBD: Delete this declaration; not needed
// Data record for 'this countloc', i.e., the countloc passed as a URL parameter to this page
var this_countloc = {};

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
var mgis_basemap_layers = { 'topo_features'     : null,     // bottom layer
                            'structures'        : null,     
                            'basemap_features'  : null,     // on top of 'structures' so labels aren't obscured
                            'parcels'           : null      // unused; not populated
};

// OpenLayers layer for OpenStreetMap basesmap layer
var osm_basemap_layer = null; 

// OpenLayers layer for Stamen basemap layer
var stamen_basemap_layer = null;

	
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

// Vector point layer for selected count location
var selected_countlocs_style = new ol.style.Style({ image: new ol.style.Circle({ radius: 7.0,
                                                                                 fill: new ol.style.Fill({color: 'gold'}),
																				 stroke: new ol.style.Stroke({color: 'black', width: 1.0})
																				}) 
                                                                             });
var selected_countlocs_layer = new ol.layer.Vector({ title: 'Selected Count Locations',
								                     source	: new ol.source.Vector({ wrapX: false }),
								                     style: selected_countlocs_style
								                   });											   
// Function to toggle basemap
function toggle_basemap(basemap_name) {
    switch(basemap_name) {
        case 'massgis_basemap':
			stamen_basemap_layer.setVisible(false);
            osm_basemap_layer.setVisible(false); 
            mgis_basemap_layers['topo_features'].setVisible(true);
            mgis_basemap_layers['structures'].setVisible(true);
            mgis_basemap_layers['basemap_features'].setVisible(true);
            break; 
        case 'osm_basemap':
            mgis_basemap_layers['topo_features'].setVisible(false);
            mgis_basemap_layers['structures'].setVisible(false);
            mgis_basemap_layers['basemap_features'].setVisible(false);
			stamen_basemap_layer.setVisible(false);
            osm_basemap_layer.setVisible(true);   
            break;
		case 'stamen_basemap':
            mgis_basemap_layers['topo_features'].setVisible(false);
            mgis_basemap_layers['structures'].setVisible(false);
            mgis_basemap_layers['basemap_features'].setVisible(false);
			osm_basemap_layer.setVisible(false);
			stamen_basemap_layer.setVisible(true);
			break;

        default:
            break;
    }
	$('#' + basemap_name).prop("checked", true);
} 
// On-change event handler for radio buttons to chose basemap
function toggle_basemap_handler (e) {
	var basemap_name = $(this).val();
	toggle_basemap(basemap_name);
}


// Utility function to return the value of the parameter named 'sParam' from the window's URL
function getURLParameter(sParam) {
	var sPageURL = window.location.search.substring(1);
	var sURLVariables = sPageURL.split('&');
	var i;
	for (i = 0; i < sURLVariables.length; i++ ) {
		var sParameterName = sURLVariables[i].split('=');
		if (sParameterName[0] == sParam) {
			return sParameterName[1];
		}
	}
	// If we get here, parameter not found
	return('');
} // gtetURLParameter()

// initialize_map
// parameter: this_countloc  - record for count location
//
function initialize_map(this_countloc) {
    $.ajax({ url: mgis_serviceUrls['topo_features'], jsonp: 'callback', dataType: 'jsonp', data: { f: 'json' }, 
             success: function(config) {     
        // Body of "success" handler starts here.
        // Get resolutions
        var tileInfo = config.tileInfo;
        var resolutions = [];
        for (var i = 0, ii = tileInfo.lods.length; i < ii; ++i) {
            resolutions.push(tileInfo.lods[i].resolution);
        }               
        // Get projection
        var epsg = 'EPSG:' + config.spatialReference.wkid;
        var units = config.units === 'esriMeters' ? 'm' : 'degrees';
        var projection = ol.proj.get(epsg) ? ol.proj.get(epsg) : new ol.proj.Projection({ code: epsg, units: units });                              
        // Get attribution
        var attribution = new ol.control.Attribution({ html: config.copyrightText });               
        // Get full extent
        var fullExtent = [config.fullExtent.xmin, config.fullExtent.ymin, config.fullExtent.xmax, config.fullExtent.ymax];
        
        var tileInfo = config.tileInfo;
        var tileSize = [tileInfo.width || tileInfo.cols, tileInfo.height || tileInfo.rows];
        var tileOrigin = [tileInfo.origin.x, tileInfo.origin.y];
        var urls;
        var suffix = '/tile/{z}/{y}/{x}';
        urls = [mgis_serviceUrls['topo_features'] += suffix];               
        var width = tileSize[0] * resolutions[0];
        var height = tileSize[1] * resolutions[0];     
        var tileUrlFunction, extent, tileGrid;               
        if (projection.getCode() === 'EPSG:4326') {
            tileUrlFunction = function tileUrlFunction(tileCoord) {
                var url = urls.length === 1 ? urls[0] : urls[Math.floor(Math.random() * (urls.length - 0 + 1)) + 0];
                return url.replace('{z}', (tileCoord[0] - 1).toString()).replace('{x}', tileCoord[1].toString()).replace('{y}', (-tileCoord[2] - 1).toString());
            };
        } else {
            extent = [tileOrigin[0], tileOrigin[1] - height, tileOrigin[0] + width, tileOrigin[1]];
            tileGrid = new ol.tilegrid.TileGrid({ origin: tileOrigin, extent: extent, resolutions: resolutions });
        }     


        // MassGIS basemap Layer 1 - topographic features
        var layerSource;
        layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                          tileSize: tileSize, tileGrid: tileGrid,
                                          tileUrlFunction: tileUrlFunction, urls: urls });
                          
        mgis_basemap_layers['topo_features'] = new ol.layer.Tile();
        mgis_basemap_layers['topo_features'].setSource(layerSource);
        mgis_basemap_layers['topo_features'].setVisible(true);
        
        // We make the rash assumption that since this set of tiled basemap layers were designed to overlay one another,
        // their projection, extent, and resolutions are the same.
        
         // MassGIS basemap Layer 2 - structures
        urls = [mgis_serviceUrls['structures'] += suffix];  
        layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                          tileSize: tileSize, tileGrid: tileGrid,
                                          tileUrlFunction: tileUrlFunction, urls: urls });;
        mgis_basemap_layers['structures'] = new ol.layer.Tile();
        mgis_basemap_layers['structures'].setSource(layerSource); 
        mgis_basemap_layers['structures'].setVisible(true);
        
        // MassGIS basemap Layer 3 - "detailed" features - these include labels
        urls = [mgis_serviceUrls['basemap_features'] += suffix];  
        layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                          tileSize: tileSize, tileGrid: tileGrid,
                                          tileUrlFunction: tileUrlFunction, urls: urls });
        mgis_basemap_layers['basemap_features'] = new ol.layer.Tile();
        mgis_basemap_layers['basemap_features'].setSource(layerSource);
        mgis_basemap_layers['basemap_features'].setVisible(true);

                       
        // MassGIS basemap Layer 4 - parcels - WE (CURRENTLY) DO NOT USE THIS LAYER
        // Code retained for reference purposes only
	/*
        urls = [mgis_serviceUrls['parcels'] += suffix];
        layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                          tileSize: tileSize, tileGrid: tileGrid,
                                          tileUrlFunction: tileUrlFunction, urls: urls });;
        mgis_basemap_layers['parcels'] = new ol.layer.Tile();
        mgis_basemap_layers['parcels'].setSource(layerSource);  
        mgis_basemap_layers['parcels'].setVisible(true);
	*/	
	
		// Create OpenStreetMap base layer
		osm_basemap_layer = new ol.layer.Tile({ source: new ol.source.OSM() });
		osm_basemap_layer.setVisible(false);
		
		// Create Stamen 'toner-lite' base layer
	    stamen_basemap_layer = new ol.layer.Tile({ source: new ol.source.Stamen({layer: 'toner-lite',
		                                                                          url: "https://stamen-tiles.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png" }) });
		stamen_basemap_layer.setVisible(false);
	
		// Create WMS layers
		var lrse_bikes_wms = new ol.layer.Tile({ source: new ol.source.TileWMS({ url		: szWMSserverRoot,
																				params	: { 'LAYERS': 'postgis:massdot_lrse_bikes_20230719', 
																							// 'STYLES': 'polygon_gray_for_non_mpo_area',
																							'TRANSPARENT': 'true'
																					  }
																		}),
											title: 'Bicycle Facilities (MassDOT)',	
											visible: true
										});
		var ma_wo_brmpo_poly_wms = new ol.layer.Tile({	source: new ol.source.TileWMS({ url		: szWMSserverRoot,
																					params	: { 'LAYERS': 'postgis:ctps_ma_wo_brmpo_poly', 
																								'STYLES': 'polygon_gray_for_non_mpo_area',
																								'TRANSPARENT': 'true'
																					  }
																		}),
											title: 'Bike-Ped Count Locations',	
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
										
		var mapCenter = ol.proj.fromLonLat([this_countloc.properties.longitude, this_countloc.properties.latitude]);
		var mapZoom = 17; // Best guess, for now
		var mapView =  new ol.View({ center: mapCenter, zoom:  mapZoom });
		
		var vSource, feature, geom, props;
		
		vSource = selected_countlocs_layer.getSource();
		vSource.clear();
		geom = {};
		props = {}; // TBD
		geom =  new ol.geom.Point(ol.proj.fromLonLat([this_countloc.properties.longitude, this_countloc.properties.latitude]));
		// props = JSON.parse(JSON.stringify(cur_countloc.properties));
		feature = new ol.Feature({geometry: geom, properties: props});
		vSource.addFeature(feature);
		selected_countlocs_layer.setSource(vSource);
		
		ol_map = new ol.Map({ layers: [	mgis_basemap_layers['topo_features'],
										mgis_basemap_layers['structures'],
										mgis_basemap_layers['basemap_features'],
										osm_basemap_layer,
										stamen_basemap_layer,
										lrse_bikes_wms,
										ma_wo_brmpo_poly_wms,
										bp_countlocs_wms,
										selected_countlocs_layer	// this is an OL Vector layer
									],
						   target: 'map',
						   view:   mapView
						});
	}});			
} // initialize_map

// prepare_count_data_for_viz: 
// given a count record 'count_rec', return a data structure containing the count record's 
// da apackaged in a form suitable for input to the Plotly bar-chard visualization engine.
// This is a JavaScript object of the form:
// 		{	'am' :  { 'times' : [], 'counts' : [] },
//			'pm1' : { 'times' : [], 'counts' : [] }, -- covers 12:00 noon to 5:45
//          'pm2' : { 'times' : [], 'counts' : [] }  -- covers 5:45 to 8:45
//      }
function prepare_count_data_for_viz(rec) {
	var retval = {	'am' : { 'times' : [' 6:00', '6:15', ' 6:30', ' 6:45', 
	                                    ' 7:00', ' 7:15', ' 7:30', ' 7:45',
										' 8:00', ' 8:15', ' 8:30', ' 8:45',
										' 9:00', ' 9:15', ' 9:30', ' 9:45',
										'10:00', '10:15', '10:30', '10:45',
										'10100', '11:15', '11:30', '11:45'],
							 'counts' 	: [] 
							},
					'pm1' : { 'times' 	: ['12:00', '12:15', '12:30', '12:45',
										   ' 1:00', ' 1:15', ' 1:30', ' 1:45',
										   ' 2:00', ' 2:15', ' 2:30', ' 2:45',
										   ' 3:00', ' 3:15', ' 3:30', ' 3:45',
										   ' 4:00', ' 4:15', ' 4:30', ' 4:45',
										   ' 5:00', ' 5:15', ' 5:30', ' 5:45'],
					          'counts'  : [] 
							},
					'pm2' : { 'times' 	: [' 6:00', '6:15', ' 6:30', ' 6:45',
										   ' 7:00', ' 7:15', ' 7:30', ' 7:45',
										   ' 8:00', ' 8:15', ' 8:30', ' 8:45'],
							 'counts'   : [] }
				};
				
	// Populate the 'counts' element of the 'am', 'pm1', and 'pm2'
	// properties of the 'retval' object
	retval.am.counts.push(null); // at least right now, we never have any data for 0600
	retval.am.counts.push(null); // at least right now, we never have any data for 0615
	retval.am.counts.push(rec.cnt_0630);
	retval.am.counts.push(rec.cnt_0645);
	retval.am.counts.push(rec.cnt_0700);
	retval.am.counts.push(rec.cnt_0715);
	retval.am.counts.push(rec.cnt_0730);
	retval.am.counts.push(rec.cnt_0745);
	retval.am.counts.push(rec.cnt_0800);
	retval.am.counts.push(rec.cnt_0815);
	retval.am.counts.push(rec.cnt_0830);
	retval.am.counts.push(rec.cnt_0845);
	retval.am.counts.push(rec.cnt_0900);
	retval.am.counts.push(rec.cnt_0915);
	retval.am.counts.push(rec.cnt_0930);
	retval.am.counts.push(rec.cnt_0945);
	retval.am.counts.push(rec.cnt_1000);
	retval.am.counts.push(rec.cnt_1015);
	retval.am.counts.push(rec.cnt_1030);
	retval.am.counts.push(rec.cnt_1045);
	retval.am.counts.push(rec.cnt_1100);
	retval.am.counts.push(rec.cnt_1115);
	retval.am.counts.push(rec.cnt_1130);
	retval.am.counts.push(rec.cnt_1145);
	
	retval.pm1.counts.push(rec.cnt_1200);
	retval.pm1.counts.push(rec.cnt_1215);
	retval.pm1.counts.push(rec.cnt_1230);
	retval.pm1.counts.push(rec.cnt_1245);
	retval.pm1.counts.push(rec.cnt_1300);
	retval.pm1.counts.push(rec.cnt_1315);
	retval.pm1.counts.push(rec.cnt_1330);
	retval.pm1.counts.push(rec.cnt_1345);
	retval.pm1.counts.push(rec.cnt_1400);
	retval.pm1.counts.push(rec.cnt_1415);
	retval.pm1.counts.push(rec.cnt_1430);
	retval.pm1.counts.push(rec.cnt_1445);
	retval.pm1.counts.push(rec.cnt_1500);
	retval.pm1.counts.push(rec.cnt_1515);
	retval.pm1.counts.push(rec.cnt_1530);
	retval.pm1.counts.push(rec.cnt_1545);
	retval.pm1.counts.push(rec.cnt_1600);
	retval.pm1.counts.push(rec.cnt_1615);
	retval.pm1.counts.push(rec.cnt_1630);
	retval.pm1.counts.push(rec.cnt_1645);
	retval.pm1.counts.push(rec.cnt_1700);
	retval.pm1.counts.push(rec.cnt_1715);
	retval.pm1.counts.push(rec.cnt_1730);
	retval.pm1.counts.push(rec.cnt_1745);
	
	retval.pm2.counts.push(rec.cnt_1800);
	retval.pm2.counts.push(rec.cnt_1815);
	retval.pm2.counts.push(rec.cnt_1830);
	retval.pm2.counts.push(rec.cnt_1845);
	retval.pm2.counts.push(rec.cnt_1900);
	retval.pm2.counts.push(rec.cnt_1915);
	retval.pm2.counts.push(rec.cnt_1930);
	retval.pm2.counts.push(rec.cnt_1945);
	retval.pm2.counts.push(rec.cnt_2000);
	retval.pm2.counts.push(rec.cnt_2015);
	retval.pm2.counts.push(rec.cnt_2030);
	retval.pm2.counts.push(rec.cnt_2045);
	
	return retval;
} // prepare_count_data_for_viz


// report4countId:
// Appends a <div> with a report for the given count_id into the report_div.
// This function calls report4count to create the report for each 'count'
// associated with the given count_id.
function report4countId(count_id) {
	console.log('Report for ' + count_id);
	var main_div_id    = 'report_count_' + count_id;
	var html;
	
	// Set up the framework - the main container <div> for everything
	html = '<div ' + 'id=' + main_div_id + '>';
	html += '<h4>Report for count #' + count_id + '</h4>';
	// *** TBD: header info - date, location, etc.
	html += '</div>';
	$('#report_div').append(html);
	
	// Generate a report for each 'count record' associated with the given count_id
	var count_recs = _.filter(counts4countloc, function(rec) { return rec.count_id == count_id; });
	count_recs.forEach(function(rec) {
		var rec_id, rec_div_id, html, o;
		rec_id = rec.id;
		rec_div_id = main_div_id + '_' + rec_id;
		
		// Create and append a <div> for the count rec
		html = '<div ' + 'id=' + rec_div_id + '>';
		html += '<p>Report for record id # ' + rec.id + '</p>';
		html += '</div>';
		$('#report_div').append(html);
		
		// *** TBD: Append <div>s for the bar charts for 'am', 'pm1', and 'pm2' periods,
		//          and insert the bar chart for each
		var am_viz_div_id  = 'viz_' + count_id + '_' + rec_id + '_am',
		    pm1_viz_div_id = 'viz_' + count_id + '_' + rec_id + '_pm1',
		    pm2_viz_div_id = 'viz_' + count_id + '_' + rec_id + '_pm2';
			
		o = prepare_count_data_for_viz(rec);
			
		// *** TBD
	}); // forEach count_rec
	
	var _DEBUG_HOOK = 0;
} // report4countId


function initialize() {
	var loc_id = getURLParameter('loc_id');	
	var _DEBUG_HOOK = 0;
	
	// Temp stuff, for now
	var s = '<h3>Reports for counts at count location # ' + loc_id + '<h3>';
	$('#report_div').html(s);
	
	// Load count data from CSV file
	d3.csv(countsURL, rowConverter).then(
		function(counts_data){
			// Load GeoJSON for count locations
			// Use local file for now, WFS request in production
			// For WFS request - remember to reproject to EPSG:4326!
			$.when(getJson(countlocsURL).done(function(bp_countlocs) {
				var ok = arguments[1] === 'success'; 
				if (ok === false) {
					alert("Failed to load GeoJSON for count locations successfully.");
					return; 
				} 
				var temp = _.filter(bp_countlocs.features, function(rec) { return rec.properties.loc_id == loc_id; });
				var this_countloc = temp[0];
				_DEBUG_HOOK = 1;
				
				// Extract the counts for the current countloc
				counts4countloc = _.filter(counts_data, function(rec) { return rec.bp_loc_id == loc_id; });
				// Get list of unique count_id's of these counts
				count_ids = _.map(counts4countloc, function(rec) { return rec.count_id; });
				count_ids = _.uniqBy(count_ids, 'count_id');
				_DEBUG_HOOK = 2;
				
				initialize_map(this_countloc);
				// Arm event handler for basemap selection
				$(".basemap_radio").change(toggle_basemap_handler);
				_DEBUG_HOOK = 3;
				
				count_ids.forEach(function(count_id) {
					report4countId(count_id);
				});
				_DEBUG_HOOK = 4;
			}));
	_DEBUG_HOOK = 5;
	});
} // initialize