@extends('app')
@section('js-includes')
<script type="text/javascript" src="js/webServicesUI.js"></script>
@endsection
@section('content')
<div class="container-fluid">

	<div id="webservice-explanation-paragraph">
		<h4>Acceptable Values for Parameters:</h4>

		<br>Longitude should be between -180.0 and 180.0. Ex: 131.67.
		<br>Latitude should be between -90.0 and 90.0. Ex: 32.53
		<br>Satellite - ex: Alos
		<br>Relative Orbit - ex: 73
		<br>First Frame - ex: 2950
		<br>Mode - ex: SM
		<br>Flight Direction - ex: D
		<br>startTime should be in yyyy-mm-dd format. Ex: 1990-12-20.
		<br>endTime should be in yyyy-mm-dd format. Ex: 2020-12-20.
		<br>outputType should be json, plot, or dataset.</br>
		<br>Example webservice url: http://homestead.app/WebServices?longitude=131.67&latitude=32.53&satellite=Alos&relativeOrbit=73&firstFrame=2950&mode=SM&flightDirection=D& endTime=2020-12-20&outputType=json
		<br>
	</div>

	<!-- TODO: delete webServicesDataset code - should be 4 of them in php, blade, js, and routes -->
	<div class="input-group">
		Longitude (required)
		<input type="text" class="form-control" placeholder="131.67" id="input-longitude">
	</div>
	<div class="input-group">
		Latitude (required):
		<input type="text" class="form-control" placeholder="32.53" id="input-latitude">
	</div>
	<div class="input-group">
		Satellite (optional)
		<input type="text" class="form-control" placeholder="Alos" id="input-satellite">
	</div>
	<div class="input-group">
		Relative Orbit (optional):
		<input type="text" class="form-control" placeholder="73" id="input-relativeOrbit">
	</div>
	<div class="input-group">
		First Frame (optional):
		<input type="text" class="form-control" placeholder="2950" id="input-firstFrame">
	</div>
	<div class="input-group">
		Mode (optional):
		<input type="text" class="form-control" placeholder="SM" id="input-mode">
	</div>
	<div class="input-group">
		Flight Direction (optional):
		<input type="text" class="form-control" placeholder="D" id="input-flightDirection">
	</div>
	<div class="input-group">
		Start Time (optional):
		<input type="text" class="form-control" placeholder="1990-12-20" id="input-startTime">
	</div>
	<div class="input-group">
		End Time (optional):
		<input type="text" class="form-control" placeholder="2020-12-20" id="input-endTime">
	</div>
	<div class="input-group">
		outputType (optional):
		<input type="text" class="form-control" placeholder="plot" id="input-outputType">
	</div>

    <div class="form-group">
		webservice url:
		<input type="text" class="form-control" placeholder="http://homestead.app/WebServices?longitude=131.67&latitude=32.53&satellite=Alos&relativeOrbit=73&firstFrame=2950&mode=SM&flightDirection=D& endTime=2020-12-20&outputType=json" id="form-webservice-url">
	</div>
</div>
@endsection