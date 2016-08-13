// subclass of square selector
function LineSelector(map) {
	SquareSelector.call(this, map);
}

LineSelector.prototype = new SquareSelector(myMap);
