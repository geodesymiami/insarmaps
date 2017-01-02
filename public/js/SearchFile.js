function SearchFile(container) {
	this.container = container;

	// return dictionary containing unavco attribute names and values converted from user input
	this.getSearchAttributes = function() {
	  var options = {};

	  // Input name -> Unavco name:
	  // input-satellite -> mission, input-relative-orbit -> relative_orbit, input-first-frame -> first_frame, 
	  // input-mode -> beam_mode, flight-direction -> flight_direction

	  // * NOTE: If we needs to search for more attributes, add them here and make matching buttons in map.blade.php
	  options["mission"] = $("#input-satellite").val();
	  options["relative_orbit"] = $("#input-relative-orbit").val();
	  options["first_frame"] = $("#input-first-frame").val();
	  options["beam_mode"] = $("#input-mode").val();
	  options["flight_direction"] = $("#input-flight-direction").val();
	  
	  // TODO: Check for null values - if null, remove attribute (key, value) pair from dictionary
	  // only search by non-null attributes
	  // special case is if entire dictonary is empty (contains null values) - in that case return no areas
	  return options;
	}
}


$(window).load(function() {
	var searcher = new SearchFile("search-form");

	// given a set of user inputted attribute names and values, 
	// return an array containing areas with all attributes matching user input
	$("#enter-button-search-attributes").click(function() {
		console.log("clicked enter-button-seach-attributes");
		var searchAttributes = searcher.getSearchAttributes();

		// get list of areas on map
		var attributesController = new AreaAttributesController(myMap, myMap.areaFeatures[0]);
		var areas = myMap.areaFeatures;
		var fileAttributes = null;
		var attributesMatch = null;

		// list of areas with attributes matching those specified by user input
		var matchingAreas = [];

		// for each area, get attributes
		for (var i = 0; i < areas.length; i++) {
			attributesController.setArea(areas[i]);
			fileAttributes = attributesController.getAllAttributes();
			attributesMatch = true;

			// for each attribute inputted by user, compare to attribute of same name in area
			// if attribute values do not match, break
			for (var key in searchAttributes) {
				if (fileAttributes[key].toLowerCase() != searchAttributes[key].toLowerCase()) {
					attributesMatch = false;
					break;
				}
			} 

			// if all attributes match, add area to array matchingAreas
			if (attributesMatch) {
				matchingAreas.push(areas[i]);
			}
		}
		// console.log(matchingAreas);
		return matchingAreas;
	});

});