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

var counts4countloc = []	// counts for current count location
    count_ids =       [];	// count_id's for these counts
	
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
// parameters: 	loc_lat - latitude of count location
//              loc_lon - longitude of count location
function initialize_map(loc_lat, loc_lon) {
	// Create OpenStreetMap base layer
	const osm_basemap_layer = new ol.layer.Tile({ source: new ol.source.OSM() });
	osm_basemap_layer.setVisible(true);
	
	// Create WMS layer[s]
	var bp_countlocs_wms = new ol.layer.Tile({	source: new ol.source.TileWMS({ url		: szWMSserverRoot,
																				params	: { 'LAYERS': 'postgis:ctps_bp_count_locations_pt', 
																							'STYLES': 'a_point_blue',
																							'TRANSPARENT': 'true'
																				  }
																	}),
										title: 'Bike-Ped Count Locations',	
										visible: true
									});	
									
	var mapCenter = ol.proj.fromLonLat([loc_lon, loc_lat]);
	var mapZoom = 17; // Best guess, for now
    var mapView =  new ol.View({ center: mapCenter, zoom:  mapZoom });
	
	var vSource, feature, geom, props;
	
	vSource = selected_countlocs_layer.getSource();
	vSource.clear();
	geom = {};
	props = {}; // TBD
	geom =  new ol.geom.Point(ol.proj.fromLonLat([loc_lon, loc_lat]));
	// props = JSON.parse(JSON.stringify(cur_countloc.properties));
	feature = new ol.Feature({geometry: geom, properties: props});
	vSource.addFeature(feature);
	selected_countlocs_layer.setSource(vSource);
	
	ol_map = new ol.Map({ layers: [	osm_basemap_layer,
									// mgis_basemap_layers['topo_features'],
									// mgis_basemap_layers['structures'],
									// mgis_basemap_layers['basemap_features'],
									bp_countlocs_wms,
									selected_countlocs_layer	// this is an OL Vector layer
								],
					   target: 'map',
					   view:   mapView
					});
} // initialize_map

// prepare_count_data_for_viz: 
// given a count_id, return a data structure containing the count's data
// packaged in a form suitable for input to the Plotly bar-chard visualization engine.
// This is a JavaScript object of the form:
// 		{	'am' :  { 'times' : [], 'counts' : [] },
//			'pm1' : { 'times' : [], 'counts' : [] }, -- covers 12:00 noon to 5:45
//          'pm2' : { 'times' : [], 'counts' : [] }  -- covers 5:45 to 8:45
//      }
function prepare_count_data_for_viz(count_id) {
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
				
	// *** TBD: Populate the 'counts' element of the 'am', 'pm1', and 'pm2'
	//          properties of the 'retval' object
	return retval;
}

// Appends a <div> with a report for the given count_id into the report_div
// Question: Parameterize <div> into which the report is appended?
function report4countId(count_id) {
	console.log('Report for ' + count_id);
	
	var main_div_id    = 'report_count_' + count_id,
	    am_viz_div_id  = 'viz_' + count_id  + '_am',
		pm1_viz_div_id = 'viz' + count_id + '_pm1',
		pm2_viz_div_id = 'viz' + count_id + '_pm';
	var html;
	
	// Set up the framework - the main container <div> for everything
	html = '<div ' + 'id=' + main_div_id + '>';
	html += '<h4>Report for count #' + count_id + '</h4>';
	// *** TBD: header info - date, location, etc.
	html += '</div>';
	$('#report_div').append(html);
	
	var o = prepare_count_data_for_viz(count_id);
	// *** TBD: Generate bar-chart viz'es for the am, pm1, and pm2 periods
	//          and append them into the approrpiate <div>s.
} // report4countId


function initialize() {
	var loc_id = getURLParameter('loc_id');
	var loc_lat = getURLParameter('loc_lat');
	var loc_lon = getURLParameter('loc_lon');
	
	var _DEBUG_HOOK = 0;
	
	// Temp stuff, for now
	var s = '<h3>Reports for counts at count location # ' + loc_id + '<h3>';
	$('#report_div').html(s);
	
	// Load count data from CSV file
	d3.csv(countsURL, rowConverter).then(
		function(data){
			initialize_map(loc_lat, loc_lon);
			// Extract the counts for the current countloc
			counts4countloc = _.filter(data, function(rec) { return rec.bp_loc_id == loc_id; });
			// Get count_id's of these counts
			count_ids = _.map(counts4countloc, function(rec) { return rec.count_id; });
			count_ids.forEach(function(count_id) {
				report4countId(count_id);
			});
			_DEBUG_HOOK = 1;
	});
	_DEBUG_HOOK = 2;
}