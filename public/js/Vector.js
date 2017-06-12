// all input and output from this class is in degrees, period.

function Vector(x, y) {
	this.x = x;
	this.y = y;
	this.mag = 0;
	this.angle = 0;

	this.magnitudeFromComponents = function(x, y) {
		return Math.sqrt(x * x + y * y);
	};

	this.angleFromComponents = function(x, y) {
		return ((Math.atan2(y, x)) % (2 * Math.PI)) * Vector.RAD_TO_DEG;
	};

	this.add = function(vector) {
		var x = this.x + vector.x;
        var y = this.y + vector.y;
        
        return new Vector(x, y);
	};

	// subtraction is -addition, but that would require making new temp vector or multiplying
	// twice by -1... prefer a couple lines extra
	this.subtract = function(vector) {
		var x = this.x - vector.x;
		var y = this.y - vector.y;

		return new Vector(x, y);
	};

	this.setup = function() {
		this.mag = this.magnitudeFromComponents(x, y);
		this.angle = this.angleFromComponents(x, y);
	};

	this.setup();
}

Vector.RAD_TO_DEG = 180.0 / Math.PI;
Vector.DEG_TO_RAD = Math.PI / 180.0;

Vector.newVectorFromMagAndAngle = function(mag, angle) {
	angle *= Vector.DEG_TO_RAD;
	var x = mag * Math.cos(angle);
	var y = mag * Math.sin(angle);

	return new Vector(x, y);
};
