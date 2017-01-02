function SearchFile(container) {
	this.container = container;

	// return dictionary containing unavco attribute names and values converted from user input
	this.getSearchAttributes = function() {

		var attributes = {};	// dictionary of all attributes
		var searchAttributes = {};	// dictionary of attributes specificied by user to search datasets by
		var numSearchAttributes = 0;	// counter to track how many attributes user specified in search

	  	// Input name -> Unavco name:
	  	// input-satellite -> mission, input-relative-orbit -> relative_orbit, input-first-frame -> first_frame, 
	  	// input-mode -> beam_mode, flight-direction -> flight_direction

	  	// * NOTE: If we need to search for more attributes, add them here and make matching buttons in map.blade.php
	  	attributes["mission"] = $("#input-satellite").val();
	  	attributes["relative_orbit"] = $("#input-relative-orbit").val();
	  	attributes["first_frame"] = $("#input-first-frame").val();
	  	attributes["beam_mode"] = $("#input-mode").val();
	  	attributes["flight_direction"] = $("#input-flight-direction").val();
	  
	  	// check attributes dictionary for non-null values and add them to searchAttributes dictionary
	  	for (var key in attributes) {
	  		if (attributes[key].length != 0) {
	  			numSearchAttributes++;
	  			searchAttributes[key] = attributes[key]
	  		}
	 	}

		// return null if user inputs no attributes to search by and we get empty dictionary
	 	if (numSearchAttributes == 0) {
	 		return null;
	 	}

	  	return searchAttributes;
	}
}


$(window).load(function() {
	var searcher = new SearchFile("search-form");

	// given a set of user inputted attribute names and values, 
	// return an array containing areas with all attributes matching user input
	$("#enter-button-search-attributes").click(function() {
		// array of areas with attributes matching those specified by user input
		var matchingAreas = [];

		// special case if user inputs no attributes to search by, we get null instead of a dictionary
		var searchAttributes = searcher.getSearchAttributes();
		if (searchAttributes == null) {
			alert("Please enter parameters before searching for a dataset");
			return;
		} 

		// get array of all areas on map
		var attributesController = new AreaAttributesController(myMap, myMap.areaFeatures[0]);
		var areas = myMap.areaFeatures;
		var fileAttributes = null;
		var attributesMatch = null;

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

		// DOUBLE CHECK that search returned datasets with correct attributes
		/*
		for (var i = 0; i < matchingAreas.length; i++) {
			console.log(matchingAreas[i].properties.attributekeys);
			console.log(matchingAreas[i].properties.attributevalues);
		}
		console.log(matchingAreas.length);
		*/

		return matchingAreas;
	});

});